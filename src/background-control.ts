import {
  BACKGROUND_FITS, BACKGROUND_MAX_STOPS, BACKGROUND_MIN_STOPS, BACKGROUND_RATIOS, BACKGROUND_TILE_SCALE, BACKGROUND_ZOOM,
  GRADIENT_SHAPES, backgroundGradientCss, switchGradientShape, cloneBackgroundValue, cloneGradient, gradientColorAt, normalizeBackgroundValue,
  moveItem, moveStopPayload, sameBackgroundValue, sameGradient, stopCssColor, widestGapMiddle,
  type BackgroundGradient, type BackgroundMedia, type BackgroundMediaDisplay, type BackgroundStop, type BackgroundValue, type GradientShape,
} from './background';
import { colorToRgb255, parseColor } from './color';
import { mountColorControl } from './color-control';
import { CONTROL_ANIM } from './components/control-motion';
import { animateSpring } from './vanilla/animation';
import { mountFolder } from './vanilla/controls';
import { handleSegmentKey, handleSliderKey, stepInputKey } from './control-keyboard';
import { getDialKitPortalRoot, getDropdownPosition, observeDropdownPosition } from './dropdown-position';
import { ICON_CHECK, ICON_CHEVRON, ICON_CLOSE, ICON_MORE, ICON_MORE_STROKE, ICON_PLUS } from './icons';
import { observeDropdownKeyboard } from './dropdown-keyboard';
import { mountGradientGizmo, rotateGradientQuarter } from './gradient-gizmo';
import { paintBackgroundPreview } from './background-paint';
import { getBackgroundHost, getSavedGradients, setSavedGradients, subscribeBackgroundHost } from './store/BackgroundHost';
import { HintStore } from './store/HintStore';

export type BackgroundControlProps = {
  label: string;
  value: BackgroundValue;
  onChange: (value: BackgroundValue) => void;
  /** False when the caller draws the folder named by the label itself (the
   *  React renderer does, with its own Folder); the control then mounts
   *  straight into the host. */
  folder?: boolean;
};

const MODE_OPTIONS = [
  { value: 'solid', label: 'Solid' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'media', label: 'Media' },
] as const;
const SHAPE_LABEL: Record<GradientShape, string> = { linear: 'Linear', radial: 'Radial', angular: 'Angular', diamond: 'Diamond' };
/** Turn clockwise: DialKit's reset arrow (ICON_RESET), mirrored. */
const ICON_ROTATE = ['M19.5 12a7.5 7.5 0 1 1-2.2-5.3', 'M19.5 4.5v3.75h-3.75'];
const FIT_LABEL: Record<BackgroundMediaDisplay['fit'], string> = { fill: 'Fill', fit: 'Fit', stretch: 'Stretch', tile: 'Tile' };
const RATIO_LABEL = (ratio: BackgroundMediaDisplay['ratio']) => ratio === 'source' ? 'Source' : ratio;
const PIN_COLUMNS = ['Left', 'Center', 'Right'];
const PIN_ROWS = ['Top', 'Middle', 'Bottom'];
const ICON_MINUS = 'M5 12H19';
/**
 * The row grip styles, chosen by `--dial-bg-grip-style` (1 to 4) on the
 * control or any ancestor; the list's `data-grip-style` carries the name the
 * theme keys off. 1 Row (no visible grip: the row itself drags, as in the
 * version list), 2 Margin (a timeline clip's resize grip, in the margin left
 * of the row, on hover), 3 Column (one column of three dots), 4 Column hover
 * (that column, in the margin, on hover).
 */
const GRIP_STYLES: Record<string, 'row' | 'margin' | 'column' | 'column-hover'> = { 1: 'row', 2: 'margin', 3: 'column', 4: 'column-hover' };
/** Parts of a row that keep their own press: typing, buttons, the swatch and the value scrubbers. */
const ROW_DRAG_EXCLUDE = 'input, textarea, button:not(.dialkit-bg-stop-grip), .dialkit-color-swatch, .dialkit-bg-field-unit, .dialkit-bg-field-grip';
/** The conditional rows' spring (CONTROL_ANIM): every height change in the control uses it. */
const LAYOUT_SPRING = CONTROL_ANIM.transition as { visualDuration: number; bounce: number };
/** Pointer travel before a press on a row's grip becomes a reorder drag, as in the version list. */
const DRAG_LIFT_PX = 4;
/**
 * The strip's paint: the gradient left to right over the strip's full width,
 * so each stop's colour sits under its stem. Like the timeline's playhead,
 * a stop's stem stands at its true place, edge to edge, and only the swatch
 * above it stops at the strip's ends so it draws whole (see the theme).
 */
function stripCss(gradient: BackgroundGradient): string {
  return backgroundGradientCss(gradient, 'to right');
}
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const ICON_REVERSE = ['M7 7h13', 'M16 3l4 4-4 4', 'M17 17H4', 'M8 13l-4 4 4 4'];
const ICON_UPLOAD = ['M12 16V3', 'M8 7l4-4 4 4', 'M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5'];

/** Pixels the pointer moves before a press becomes a drag. */
const DRAG_THRESHOLD = 3;

/** The hint key, pressed on a part that takes no typing, still reaches the hint layer. */
const isHintKey = (e: KeyboardEvent) => e.key.toLowerCase() === HintStore.getKey() && !(e.target instanceof HTMLInputElement);

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  if (el instanceof HTMLButtonElement) el.type = 'button';
  return el;
}

function strokeIcon(paths: string | readonly string[]): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of typeof paths === 'string' ? [paths] : paths) {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

function iconButton(className: string, label: string, paths: string | readonly string[]): HTMLButtonElement {
  const button = element('button', `dialkit-bg-icon-button ${className}`);
  button.setAttribute('aria-label', label);
  button.append(strokeIcon(paths));
  return button;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
/** A number with at most one decimal and no trailing zero. */
const formatNumber = (n: number) => String(Math.round(n * 10) / 10 || 0);
const errorMessage = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback;

/** A full-width segmented row (the fork's pill look), built in plain DOM. */
function segmented<T extends string>(options: readonly { value: T; label: string }[], ariaLabel: string, onPick: (value: T) => void) {
  const group = element('div', 'dialkit-segmented dialkit-bg-segmented');
  group.setAttribute('data-fill', '');
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', ariaLabel);
  group.addEventListener('keydown', handleSegmentKey);
  const pill = element('div', 'dialkit-segmented-pill');
  pill.setAttribute('aria-hidden', 'true');
  pill.style.width = `calc((100% - 8px) / ${options.length})`;
  group.append(pill);
  const buttons = options.map(option => {
    const button = element('button', 'dialkit-segmented-button');
    button.setAttribute('role', 'radio');
    button.append(element('span', 'dialkit-segmented-text', option.label));
    button.addEventListener('click', () => onPick(option.value));
    group.append(button);
    return button;
  });
  return {
    group,
    buttons,
    set(value: T) {
      options.forEach((option, i) => {
        const active = option.value === value;
        buttons[i].setAttribute('aria-checked', String(active));
        buttons[i].dataset.active = String(active);
        buttons[i].tabIndex = active ? 0 : -1;
        if (active) pill.style.transform = `translateX(${i * 100}%)`;
      });
    },
  };
}

type NumberFieldOptions = {
  className: string;
  /** The accessible name. */
  label: () => string;
  /** Visible text before the number; it drags the value. */
  grip?: string;
  /** Visible unit after the number; it drags the value too. */
  unit: string;
  min: number;
  max: number;
  step: number;
  wrap?: boolean;
  read: () => number;
  apply: (value: number) => void;
  /** Called when a drag on the grip or the unit starts (true) and ends (false). */
  onScrub?: (active: boolean) => void;
};

/**
 * A short number field in the X / Y / Z field look: type the number, use the
 * arrow keys (Shift for ten steps), or drag the grip or the unit left and
 * right. Enter and a blur keep the typed number, Escape drops it.
 */
function numberField(options: NumberFieldOptions) {
  const root = element('div', `dialkit-field dialkit-bg-field ${options.className}`);
  const input = element('input', 'dialkit-field-input dialkit-bg-field-input');
  input.type = 'text';
  input.inputMode = 'decimal';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('role', 'spinbutton');
  input.setAttribute('aria-valuemin', String(options.min));
  input.setAttribute('aria-valuemax', String(options.max));
  const grips: HTMLElement[] = [];
  if (options.grip) {
    const grip = element('span', 'dialkit-field-axis dialkit-bg-field-grip', options.grip);
    grip.setAttribute('aria-hidden', 'true');
    root.append(grip);
    grips.push(grip);
  }
  root.append(input);
  const unit = element('span', 'dialkit-bg-field-unit', options.unit);
  unit.setAttribute('aria-hidden', 'true');
  root.append(unit);
  grips.push(unit);

  const fit = (n: number) => {
    if (options.wrap) {
      const span = options.max - options.min;
      // The top of a wrapping range stays reachable (360°).
      return n === options.max ? n : ((n - options.min) % span + span) % span + options.min;
    }
    return clamp(n, options.min, options.max);
  };
  const readDraft = () => {
    const n = Number.parseFloat(input.value.replace(options.unit, '').trim());
    return Number.isFinite(n) ? n : null;
  };
  const sync = () => {
    const value = options.read();
    input.setAttribute('aria-label', options.label());
    input.setAttribute('aria-valuenow', String(value));
    input.setAttribute('aria-valuetext', `${formatNumber(value)}${options.unit}`);
    if (document.activeElement !== input) input.value = formatNumber(value);
  };
  let skipBlur = false;
  // While a value is applied, the field may lose the focus: a stop that
  // passes another moves to another row, and the focus follows it. That
  // blur must not apply the draft a second time, to the stop now in this row.
  let applying = false;
  const run = (n: number) => {
    applying = true;
    try { options.apply(n); } finally { applying = false; }
  };
  const commitDraft = () => {
    const n = readDraft();
    if (n !== null && n !== options.read()) run(fit(n));
    input.value = formatNumber(options.read());
  };
  input.addEventListener('focus', () => input.select());
  input.addEventListener('blur', () => {
    if (applying) return;
    if (skipBlur) { skipBlur = false; return; }
    commitDraft();
  });
  input.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      commitDraft();
      // select() would also take the focus back from a row the stop moved to.
      if (document.activeElement === input) input.select();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      input.value = formatNumber(options.read());
      skipBlur = true;
      input.blur();
      return;
    }
    const stepped = stepInputKey(event, input.value, options.read(), options.min, options.max, options.step, options.wrap);
    if (stepped === undefined) return;
    run(stepped);
    input.value = formatNumber(options.read());
  });
  for (const grip of grips) {
    let press: { id: number; x: number; start: number; moved: boolean } | undefined;
    grip.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      press = { id: event.pointerId, x: event.clientX, start: options.read(), moved: false };
      try { grip.setPointerCapture(event.pointerId); } catch { press = undefined; return; }
      // The field takes the focus, so it keeps it after the drag.
      if (document.activeElement !== input) input.focus({ preventScroll: true });
      options.onScrub?.(true);
    });
    grip.addEventListener('pointermove', event => {
      if (!press || event.pointerId !== press.id) return;
      const dx = event.clientX - press.x;
      if (!press.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
      press.moved = true;
      const next = fit(press.start + dx * options.step * (event.shiftKey ? 10 : 1));
      run(Math.round(next / options.step) * options.step);
      // The field holds the focus, so a render leaves its text alone: show the value here.
      input.value = formatNumber(options.read());
    });
    const end = (event: PointerEvent) => {
      if (!press || event.pointerId !== press.id) return;
      press = undefined;
      if (grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);
      options.onScrub?.(false);
    };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
    grip.addEventListener('lostpointercapture', end);
  }
  return { root, input, sync };
}

/** '#rrggbb' plus an alpha byte when the stop is not fully opaque; the color picker's value. */
function stopPickerValue(stop: BackgroundStop): string {
  if (stop.alpha >= 100) return stop.color;
  return stop.color + Math.round(clamp(stop.alpha, 0, 100) / 100 * 255).toString(16).padStart(2, '0');
}

/** A picker value, in any of its formats, as '#rrggbb' and an opacity percent. */
function readPicked(raw: string): { color: string; alpha: number } | null {
  const parsed = parseColor(raw);
  if (!parsed) return null;
  const color = '#' + colorToRgb255(parsed).map(n => n.toString(16).padStart(2, '0')).join('');
  return { color, alpha: Math.round(clamp(parsed.a, 0, 1) * 100) };
}

type StopRow = {
  /** The row's own id: it stays with the stop's color through sorting and reordering. */
  id: number;
  root: HTMLDivElement;
  grip: HTMLButtonElement;
  /** The slide that carries the row from where it was drawn to its new place. */
  flip?: Animation;
  /** Where that slide ends: the row's place in the list (offsetTop), so a render that keeps it lets the slide run on. */
  flipTarget?: number;
  /** Removed: it fades out over the list, out of the layout. */
  leaving?: boolean;
  at: ReturnType<typeof numberField>;
  alpha: ReturnType<typeof numberField>;
  color: ReturnType<typeof mountColorControl>;
  remove: HTMLButtonElement;
  /** The last string the picker sent, so the picker keeps its own format and precision. */
  picked?: { raw: string; color: string; alpha: number };
};

/**
 * The background control: a solid color, a gradient with a stop editor, or a
 * media file the host uploads. One implementation for all five adapters.
 */
export function mountBackgroundControl(host: HTMLElement, initial: BackgroundControlProps) {
  let props = initial;
  let value = normalizeBackgroundValue(props.value);
  let selected = 0;
  let destroyed = false;
  let saving = false;
  let uploading = false;
  let uploadRequest = 0;
  let gradientStatus = '';
  let mediaStatus = '';
  let mediaError = false;

  const emit = (next: BackgroundValue) => {
    if (sameBackgroundValue(next, value)) { render(); return; }
    value = next;
    render();
    props.onChange(cloneBackgroundValue(value));
  };
  const setGradient = (gradient: BackgroundGradient) => emit({ ...value, gradient });

  // A collapsible folder named by the label, as the transition control is;
  // the control sits inside it. The root's height animates between layouts;
  // the body holds the layout itself, so its height is always the height the
  // root is heading to.
  const folder = props.folder === false ? undefined : mountFolder(host, { title: props.label });
  const root = element('div', 'dialkit-bg');
  const body = element('div', 'dialkit-bg-body');
  root.append(body);
  const modes = segmented(MODE_OPTIONS, 'Background type', mode => emit({ ...value, mode }));
  body.append(modes.group);

  // ── Solid ────────────────────────────────────────────────────────────
  const solidPane = element('div', 'dialkit-bg-pane dialkit-bg-solid');
  const solidHost = element('div', 'dialkit-color-host');
  solidPane.append(solidHost);
  let solidPicked: { raw: string; color: string } | undefined;
  const solidValue = () => solidPicked && solidPicked.color === value.color ? solidPicked.raw : value.color;
  const solid = mountColorControl(solidHost, {
    label: 'Color',
    value: solidValue(),
    onChange: raw => {
      const picked = readPicked(raw);
      if (!picked) return;
      solidPicked = { raw, color: picked.color };
      emit({ ...value, color: picked.color });
    },
  });

  // ── Gradient ─────────────────────────────────────────────────────────
  const gradientPane = element('div', 'dialkit-bg-pane dialkit-bg-gradient');
  // The gradient type, as Figma has it: a dropdown, then flip and rotate.
  const shapeRow = element('div', 'dialkit-bg-shape-row');
  const shapeTrigger = element('button', 'dialkit-select-trigger dialkit-bg-shape-trigger');
  shapeTrigger.setAttribute('aria-haspopup', 'listbox');
  shapeTrigger.setAttribute('aria-expanded', 'false');
  shapeTrigger.setAttribute('aria-label', 'Gradient type');
  const shapeValue = element('span', 'dialkit-select-value');
  const shapeChevron = strokeIcon(ICON_CHEVRON);
  shapeChevron.classList.add('dialkit-select-chevron');
  shapeTrigger.append(shapeValue, shapeChevron);
  const flipButton = iconButton('dialkit-bg-flip', 'Flip stops', ICON_REVERSE);
  const rotateButton = iconButton('dialkit-bg-rotate', 'Rotate 90° clockwise', ICON_ROTATE);
  shapeRow.append(shapeTrigger, flipButton, rotateButton);
  let shapeMenu: HTMLDivElement | undefined;
  let stopShapeKeys: (() => void) | undefined;
  const shapeOutside = (event: Event) => {
    if (!shapeMenu?.contains(event.target as Node) && !shapeTrigger.contains(event.target as Node)) closeShapeMenu();
  };
  function closeShapeMenu() {
    stopShapeKeys?.();
    stopShapeKeys = undefined;
    shapeMenu?.remove();
    shapeMenu = undefined;
    shapeTrigger.dataset.open = 'false';
    shapeTrigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', shapeOutside, true);
  }
  /** The menu opens over the field, the current type on top of it, as in Figma. */
  const placeShapeMenu = () => {
    if (!shapeMenu) return;
    const rect = shapeTrigger.getBoundingClientRect();
    const current = shapeMenu.querySelector<HTMLElement>('[data-selected="true"]');
    const offset = current ? current.offsetTop + current.offsetHeight / 2 : 0;
    const height = shapeMenu.offsetHeight;
    const top = Math.max(8, Math.min(rect.top + rect.height / 2 - offset, window.innerHeight - height - 8));
    Object.assign(shapeMenu.style, { left: `${rect.left}px`, top: `${top}px`, width: `${rect.width}px` });
  };
  const openShapeMenu = () => {
    if (shapeMenu) { closeShapeMenu(); return; }
    const portal = getDialKitPortalRoot(host) ?? document.body;
    const menu = element('div', 'dialkit-select-dropdown dialkit-bg-shape-menu');
    menu.style.position = 'fixed';
    for (const shape of GRADIENT_SHAPES) {
      const option = element('button', 'dialkit-select-option dialkit-bg-shape-option');
      option.dataset.selected = String(shape === value.gradient.shape);
      const check = strokeIcon(ICON_CHECK);
      check.classList.add('dialkit-bg-shape-check');
      option.append(check, element('span', 'dialkit-bg-shape-label', SHAPE_LABEL[shape]));
      option.addEventListener('click', () => {
        closeShapeMenu();
        // Switching keeps all three handles and the stops.
        setGradient(switchGradientShape(value.gradient, shape, canvasAspect()));
        shapeTrigger.focus({ preventScroll: true });
      });
      menu.append(option);
    }
    // While the gizmo is on, a press or the focus in the menu is part of the gradient's editing.
    menu.addEventListener('pointerdown', event => { if (gizmoRowId !== undefined) event.stopPropagation(); });
    menu.addEventListener('focusin', event => { if (gizmoRowId !== undefined) event.stopPropagation(); });
    shapeMenu = menu;
    portal.append(menu);
    placeShapeMenu();
    shapeTrigger.dataset.open = 'true';
    shapeTrigger.setAttribute('aria-expanded', 'true');
    stopShapeKeys = observeDropdownKeyboard(shapeTrigger, () => shapeMenu, closeShapeMenu, 'select');
    document.addEventListener('pointerdown', shapeOutside, true);
  };
  /** The canvas's width / height: the gizmo target's box when the host gives one, else a square. */
  function canvasAspect(): number {
    const rect = getBackgroundHost().gizmoTarget?.()?.getBoundingClientRect();
    return rect && rect.width > 0 && rect.height > 0 ? rect.width / rect.height : 1;
  }
  shapeTrigger.addEventListener('click', openShapeMenu);
  shapeTrigger.addEventListener('keydown', event => {
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !event.altKey && !event.metaKey && !event.ctrlKey && !shapeMenu) {
      event.preventDefault();
      event.stopPropagation();
      openShapeMenu();
    }
  });
  flipButton.addEventListener('click', () => {
    commitEntries(entries().map(({ id, stop }) => ({ id, stop: { ...stop, at: Math.round((100 - stop.at) * 100) / 100 } })));
  });
  // Turns the three handles 90° clockwise around the start (the centre), in
  // the canvas's own shape when the host gives one.
  rotateButton.addEventListener('click', () => {
    setGradient({ ...value.gradient, handles: rotateGradientQuarter(value.gradient.shape, value.gradient.handles, { width: canvasAspect(), height: 1 }) });
  });

  // The bar paints the gradient left to right over a checkerboard; one handle per stop.
  const bar = element('div', 'dialkit-bg-bar');
  const track = element('div', 'dialkit-bg-track');
  const trackPaint = element('div', 'dialkit-bg-track-paint');
  track.append(trackPaint);
  const handlesLayer = element('div', 'dialkit-bg-handles');
  bar.append(track, handlesLayer);
  bar.title = 'Click the bar to add a stop';
  // The strip painted as the gradient's own type (--dial-bg-track-style: 2),
  // laid out in the strip's box: Radial, Diamond and Angular centred, their
  // main radius to the strip's ends, their cross radius its half height.
  const STRIP_HANDLES = { start: { x: 0.5, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0.5, y: 0 } };
  let trackCanvas: HTMLCanvasElement | undefined;
  const followsType = () => bar.dataset.trackStyle === 'type' && value.gradient.shape !== 'linear';
  const paintTrack = () => {
    if (!followsType()) {
      trackCanvas?.remove();
      trackCanvas = undefined;
      trackPaint.style.backgroundImage = stripCss(value.gradient);
      return;
    }
    trackPaint.style.backgroundImage = '';
    if (!trackCanvas) {
      trackCanvas = document.createElement('canvas');
      trackCanvas.className = 'dialkit-bg-track-canvas';
      trackPaint.append(trackCanvas);
    }
    const scale = Math.min(globalThis.devicePixelRatio || 1, 3);
    const width = Math.max(1, Math.round(track.clientWidth * scale));
    const height = Math.max(1, Math.round(track.clientHeight * scale));
    if (trackCanvas.width !== width) trackCanvas.width = width;
    if (trackCanvas.height !== height) trackCanvas.height = height;
    paintBackgroundPreview(trackCanvas, { ...value, mode: 'gradient', gradient: { ...value.gradient, handles: STRIP_HANDLES } });
  };
  /** Reads `--dial-bg-track-style` and puts its name on the bar. */
  const syncTrackStyle = () => {
    const raw = getComputedStyle(bar).getPropertyValue('--dial-bg-track-style').trim();
    const name = raw === '1' ? 'linear' : 'type';
    if (bar.dataset.trackStyle !== name) bar.dataset.trackStyle = name;
  };
  const onTrackStyleTransition = (event: TransitionEvent) => {
    if (event.target === bar && event.propertyName === '--dial-bg-track-style') render();
  };
  bar.addEventListener('transitionrun', onTrackStyleTransition);
  bar.addEventListener('transitionend', onTrackStyleTransition);
  // A strip that changes size repaints its canvas at the new size.
  const trackResize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (trackCanvas) paintTrack(); }) : undefined;
  trackResize?.observe(track);
  let handles: HTMLButtonElement[] = [];
  /** One stem per stop, at the stop's true place; the swatch above it may stop short of an end. */
  let stems: HTMLSpanElement[] = [];

  const stopsHeader = element('div', 'dialkit-bg-stops-header');
  const stopsTitle = element('span', 'dialkit-bg-stops-title', 'Stops');
  const addButton = iconButton('dialkit-bg-add', 'Add stop', ICON_PLUS);
  stopsHeader.append(stopsTitle, addButton);
  const stopsList = element('div', 'dialkit-bg-stops');
  /**
   * Reads `--dial-bg-grip-style` and `--dial-bg-stop-selected-style` and puts
   * their names on the list: the grip, and how the selected row shows
   * (1 a row highlight, 2 its fields only).
   */
  const syncGripStyle = () => {
    const styles = getComputedStyle(stopsList);
    const raw = styles.getPropertyValue('--dial-bg-grip-style').trim();
    const name = GRIP_STYLES[raw] ?? 'column-hover';
    if (stopsList.dataset.gripStyle !== name) stopsList.dataset.gripStyle = name;
    const selectedStyle = styles.getPropertyValue('--dial-bg-stop-selected-style').trim() === '1' ? 'row' : 'fields';
    if (stopsList.dataset.selectedStyle !== selectedStyle) stopsList.dataset.selectedStyle = selectedStyle;
  };
  // The theme registers --dial-bg-grip-style as an integer and transitions it
  // on the list for 1ms, so a change to it (a host's Look panel, a theme
  // switch) fires a transition here and the control re-renders. Without
  // @property support, the next render picks the change up.
  const onGripStyleTransition = (event: TransitionEvent) => {
    if (event.target === stopsList && (event.propertyName === '--dial-bg-grip-style' || event.propertyName === '--dial-bg-stop-selected-style')) render();
  };
  stopsList.addEventListener('transitionrun', onGripStyleTransition);
  stopsList.addEventListener('transitionend', onGripStyleTransition);
  // Rows are keyed by an id that travels with each stop, so a stop that
  // moves keeps its row (and its focus) and the row slides to its place.
  let nextStopId = 0;
  let stopIds: number[] = value.gradient.stops.map(() => ++nextStopId);
  const rowById = new Map<number, StopRow>();
  const liveRows = () => stopIds.map(id => rowById.get(id)).filter((row): row is StopRow => !!row);
  /** Ids for a value that came from outside: the same count keeps them; a new count adds or drops ids at the end. */
  const reconcileIds = () => {
    const count = value.gradient.stops.length;
    if (stopIds.length > count) stopIds = stopIds.slice(0, count);
    while (stopIds.length < count) stopIds = [...stopIds, ++nextStopId];
  };

  const saveRow = element('div', 'dialkit-bg-save-row');
  const saveButton = element('button', 'dialkit-preset-save dialkit-bg-save', 'Save gradient');
  saveRow.append(saveButton);
  const gradientStatusLine = element('div', 'dialkit-bg-status');
  gradientStatusLine.setAttribute('role', 'status');
  gradientStatusLine.setAttribute('aria-live', 'polite');
  const savedList = element('div', 'dialkit-bg-saved');
  savedList.setAttribute('role', 'group');
  savedList.setAttribute('aria-label', 'Saved gradients');
  let savedItems: { id: string; gradient: BackgroundGradient; swatch: HTMLButtonElement }[] = [];
  let savedSignature = '';

  gradientPane.append(shapeRow, bar, stopsHeader, stopsList, saveRow, gradientStatusLine, savedList);

  type Entry = { stop: BackgroundStop; id: number };
  const entries = (): Entry[] => value.gradient.stops.map((stop, i) => ({ stop, id: stopIds[i] }));
  /** Replaces the stops, keeps them sorted (ids with them), and selects `selectId` (by default the stop already selected). */
  const commitEntries = (list: Entry[], selectId = stopIds[selected]) => {
    const sorted = list.map((entry, i) => ({ entry, i }))
      .sort((a, b) => a.entry.stop.at - b.entry.stop.at || a.i - b.i)
      .map(({ entry }) => entry);
    stopIds = sorted.map(entry => entry.id);
    const index = stopIds.indexOf(selectId);
    selected = index >= 0 ? index : clamp(selected, 0, sorted.length - 1);
    setGradient({ ...value.gradient, stops: sorted.map(entry => entry.stop) });
  };
  const updateStop = (index: number, patch: Partial<BackgroundStop>) => {
    const list = entries();
    const current = list[index];
    if (!current) return;
    list[index] = { id: current.id, stop: { ...current.stop, ...patch } };
    commitEntries(list, current.id);
  };
  const addStopAt = (at: number) => {
    if (value.gradient.stops.length >= BACKGROUND_MAX_STOPS) return;
    const position = Math.round(clamp(at, 0, 100) * 100) / 100;
    const entry = { id: ++nextStopId, stop: { at: position, ...gradientColorAt(value.gradient.stops, position) } };
    commitEntries([...entries(), entry], entry.id);
  };
  const removeStop = (index: number) => {
    if (value.gradient.stops.length <= BACKGROUND_MIN_STOPS) return;
    const list = entries();
    const removed = list[index]?.id;
    // Removing the selected stop selects its neighbour.
    const selectId = removed === stopIds[selected] ? (list[index - 1] ?? list[index + 1])?.id : stopIds[selected];
    commitEntries(list.filter(entry => entry.id !== removed), selectId);
  };
  /** Moves row `from` to row `to` of `base`: positions stay in their slots, colors move. The selected row stays selected. */
  const reorderRows = (base: Entry[], from: number, to: number, selectId: number) => {
    stopIds = moveItem(base.map(entry => entry.id), from, to);
    selected = Math.max(0, stopIds.indexOf(selectId));
    setGradient({ ...value.gradient, stops: moveStopPayload(base.map(entry => entry.stop), from, to) });
  };
  const select = (index: number) => {
    if (index === selected || index < 0) return;
    selected = index;
    renderSelection();
  };

  addButton.addEventListener('click', () => addStopAt(widestGapMiddle(value.gradient.stops)));

  // Dragging a handle moves its stop; a press on the empty bar adds a stop there and drags it.
  let drag: { id: number; index: number; x: number; moved: boolean } | undefined;
  const fractionAt = (clientX: number) => {
    // The handles' range, not the strip: positions map to where the chips sit.
    const rect = handlesLayer.getBoundingClientRect();
    return rect.width ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0;
  };
  const startDrag = (event: PointerEvent, index: number, moved: boolean) => {
    drag = { id: event.pointerId, index, x: event.clientX, moved };
    bar.setPointerCapture(event.pointerId);
    bar.dataset.dragging = 'true';
  };
  const endDrag = (event?: PointerEvent) => {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const id = drag.id;
    drag = undefined;
    delete bar.dataset.dragging;
    if (bar.hasPointerCapture(id)) bar.releasePointerCapture(id);
  };
  // How the user last acted, for the strip's focus ring (see the theme): any
  // press marks the pointer, any key clears it. Kept for the whole document,
  // and in the capture phase, so it holds whatever the press did next: a chip
  // rebuilt by a new stop, a gizmo or a row press that moved the selection.
  const markPointer = () => { bar.dataset.input = 'pointer'; };
  const markKeyboard = () => { delete bar.dataset.input; };
  document.addEventListener('pointerdown', markPointer, true);
  document.addEventListener('keydown', markKeyboard, true);
  bar.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drag) return;
    const handle = (event.target as HTMLElement).closest<HTMLButtonElement>('.dialkit-bg-handle');
    event.preventDefault();
    if (handle) {
      const index = handles.indexOf(handle);
      if (index < 0) return;
      select(index);
      handle.focus({ preventScroll: true });
      startDrag(event, index, false);
      return;
    }
    if (value.gradient.stops.length >= BACKGROUND_MAX_STOPS) return;
    addStopAt(Math.round(fractionAt(event.clientX) * 100));
    handles[selected]?.focus({ preventScroll: true });
    startDrag(event, selected, true);
  });
  bar.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.moved && Math.abs(event.clientX - drag.x) < DRAG_THRESHOLD) return;
    drag.moved = true;
    updateStop(drag.index, { at: Math.round(fractionAt(event.clientX) * 100) });
    drag.index = selected;
    handles[selected]?.focus({ preventScroll: true });
  });
  bar.addEventListener('pointerup', event => endDrag(event));
  bar.addEventListener('pointercancel', event => endDrag(event));
  bar.addEventListener('lostpointercapture', event => endDrag(event));

  const buildHandles = () => {
    handlesLayer.replaceChildren();
    stems = value.gradient.stops.map(() => {
      const stem = element('span', 'dialkit-bg-stem');
      stem.setAttribute('aria-hidden', 'true');
      handlesLayer.append(stem);
      return stem;
    });
    handles = value.gradient.stops.map((_, i) => {
      const handle = element('button', 'dialkit-bg-handle');
      handle.setAttribute('role', 'slider');
      handle.setAttribute('aria-valuemin', '0');
      handle.setAttribute('aria-valuemax', '100');
      const chip = element('span', 'dialkit-bg-handle-chip');
      chip.setAttribute('aria-hidden', 'true');
      handle.append(chip);
      handle.addEventListener('focus', () => select(handles.indexOf(handle)));
      handle.addEventListener('keydown', event => {
        if (event.altKey || event.metaKey || event.ctrlKey) return;
        const index = handles.indexOf(handle);
        const stop = value.gradient.stops[index];
        if (!stop) return;
        let at: number | undefined;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') at = stop.at - (event.shiftKey ? 10 : 1);
        else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') at = stop.at + (event.shiftKey ? 10 : 1);
        else if (event.key === 'Home') at = 0;
        else if (event.key === 'End') at = 100;
        else if ((event.key === 'Delete' || event.key === 'Backspace') && value.gradient.stops.length > BACKGROUND_MIN_STOPS) {
          event.preventDefault();
          event.stopPropagation();
          removeStop(index);
          handles[selected]?.focus({ preventScroll: true });
          return;
        } else return;
        event.preventDefault();
        event.stopPropagation();
        updateStop(index, { at: Math.round(clamp(at, 0, 100)) });
        handles[selected]?.focus({ preventScroll: true });
      });
      handlesLayer.append(handle);
      return handle;
    });
  };

  const buildRow = (id: number): StopRow => {
    const index = () => stopIds.indexOf(id);
    const stop = () => value.gradient.stops[index()];
    const rowRoot = element('div', 'dialkit-bg-stop');
    rowRoot.addEventListener('pointerdown', () => select(index()));
    rowRoot.addEventListener('focusin', () => select(index()));
    const grip = element('button', 'dialkit-bg-icon-button dialkit-bg-stop-grip');
    grip.setAttribute('aria-label', 'Reorder stop');
    grip.setAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown');
    // The Column grip: the "···" of the Ease copy menu (ICON_MORE, the same
    // stroke), turned upright, its box cropped to the dots' width.
    const column = strokeIcon(ICON_MORE);
    column.setAttribute('viewBox', '9 0 6 24');
    column.setAttribute('stroke-width', String(ICON_MORE_STROKE));
    const upright = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    upright.setAttribute('transform', 'rotate(90 12 12)');
    upright.append(...Array.from(column.childNodes));
    column.append(upright);
    grip.append(column);
    const at = numberField({
      className: 'dialkit-bg-stop-at',
      label: () => `Stop ${index() + 1} position`,
      unit: '%',
      min: 0,
      max: 100,
      step: 1,
      read: () => stop()?.at ?? 0,
      apply: n => updateStop(index(), { at: Math.round(n * 100) / 100 }),
      onScrub: active => { scrubbingId = active ? id : undefined; },
    });
    const colorHost = element('div', 'dialkit-color-host dialkit-bg-stop-color');
    const row: StopRow = {
      id,
      root: rowRoot,
      grip,
      at,
      alpha: numberField({
        className: 'dialkit-bg-stop-alpha',
        label: () => `Stop ${index() + 1} opacity`,
        unit: '%',
        min: 0,
        max: 100,
        step: 1,
        read: () => stop()?.alpha ?? 100,
        apply: n => updateStop(index(), { alpha: Math.round(n * 100) / 100 }),
        onScrub: active => { scrubbingId = active ? id : undefined; },
      }),
      color: mountColorControl(colorHost, {
        label: `Stop ${index() + 1}`,
        value: stopPickerValue(stop()),
        onChange: raw => pickStopColor(row, raw),
      }),
      remove: iconButton('dialkit-bg-stop-remove', 'Remove stop', ICON_MINUS),
    };
    row.remove.addEventListener('click', () => removeStop(index()));
    const pickerRow = colorHost.querySelector('.dialkit-color-control');
    if (pickerRow) pickerWatch.observe(pickerRow, { attributes: true, attributeFilter: ['data-open'] });
    bindRowDrag(row, index);
    rowRoot.append(grip, at.root, colorHost, row.alpha.root, row.remove);
    return row;
  };
  const pickStopColor = (row: StopRow, raw: string) => {
    const picked = readPicked(raw);
    if (!picked) return;
    row.picked = { raw, ...picked };
    updateStop(stopIds.indexOf(row.id), picked);
  };
  const dropRow = (row: StopRow) => {
    row.flip?.cancel();
    row.color.destroy();
    row.root.remove();
  };

  // ── Reordering rows: the version list's drag (PresetManager), in plain DOM ──
  // The rows keep their DOM order while a row is dragged: the dragged row
  // follows the pointer, the rows it passes slide one row aside, and the
  // value (and the bar) follow live. On release the row glides into its
  // slot, and only then does the DOM take the new order, so nothing jumps.
  /** The row whose position or opacity field is being dragged; it keeps its place in the DOM. */
  let scrubbingId: number | undefined;
  let rowDrag: {
    id: number; pointerId: number; startY: number; lifted: boolean;
    from: number; to: number; offset: number; step: number; settling: boolean;
    base: Entry[]; selectId: number;
  } | undefined;
  const paintRowDrag = () => {
    if (!rowDrag) return;
    const { id, from, to, offset, step, settling, base } = rowDrag;
    base.forEach((entry, k) => {
      const row = rowById.get(entry.id);
      if (!row) return;
      const shift = entry.id === id ? (settling ? (to - from) * step : offset)
        : from < to && k > from && k <= to ? -step
        : to < from && k >= to && k < from ? step : 0;
      row.root.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  };
  const finishRowDrag = () => {
    if (!rowDrag) return;
    const { base } = rowDrag;
    rowDrag = undefined;
    // Transitions off first, so clearing the shifts draws the new order at once.
    delete stopsList.dataset.dragging;
    delete stopsList.dataset.settling;
    base.forEach(entry => {
      const row = rowById.get(entry.id);
      if (!row) return;
      delete row.root.dataset.dragging;
      row.root.style.transform = '';
    });
    placeRows();
    render();
  };
  const bindRowDrag = (row: StopRow, index: () => number) => {
    const { grip, root: rowRoot } = row;
    // The press starts on the grip, or, in the Row style, on any part of the
    // row that has no press of its own (its padding, the gaps, the fields'
    // edges), as a version row drags from anywhere. The row holds the
    // pointer, so every later event reaches the handlers below once.
    rowRoot.addEventListener('pointerdown', event => {
      if (event.button !== 0 || rowDrag || row.leaving) return;
      const target = event.target as Element;
      const onGrip = !!target.closest('.dialkit-bg-stop-grip');
      if (!onGrip && (stopsList.dataset.gripStyle !== 'row' || target.closest(ROW_DRAG_EXCLUDE))) return;
      // No focus from a press, as in the version list: no ring after a drag.
      event.preventDefault();
      const from = index();
      rowDrag = {
        id: row.id, pointerId: event.pointerId, startY: event.clientY, lifted: false,
        from, to: from, offset: 0, step: 0, settling: false, base: entries(), selectId: stopIds[selected],
      };
      // A pointer that is no longer active cannot be held: no drag then,
      // rather than a drag that never ends and blocks the next one.
      try { rowRoot.setPointerCapture(event.pointerId); } catch { rowDrag = undefined; }
    });
    rowRoot.addEventListener('pointermove', event => {
      const drag = rowDrag;
      if (!drag || drag.id !== row.id || drag.pointerId !== event.pointerId || drag.settling) return;
      const dy = event.clientY - drag.startY;
      if (!drag.lifted) {
        if (Math.abs(dy) <= DRAG_LIFT_PX) return;
        drag.lifted = true;
        // One row's travel: its height plus the gap, from the rows as they sit.
        const rows = drag.base.map(entry => rowById.get(entry.id)).filter((r): r is StopRow => !!r);
        rows.forEach(r => { r.flip?.cancel(); r.flip = undefined; });
        const first = rows[0]?.root.getBoundingClientRect();
        const second = rows[1]?.root.getBoundingClientRect();
        drag.step = first && second ? second.top - first.top : (first?.height ?? 40);
        stopsList.dataset.dragging = 'true';
        row.root.dataset.dragging = 'true';
      }
      const n = drag.base.length;
      // The row stays inside the list; its new place is the slot its centre is over.
      drag.offset = clamp(dy, -drag.from * drag.step, (n - 1 - drag.from) * drag.step);
      const to = clamp(Math.round(drag.from + drag.offset / drag.step), 0, n - 1);
      if (to !== drag.to) {
        drag.to = to;
        reorderRows(drag.base, drag.from, to, drag.selectId);
      }
      paintRowDrag();
    });
    const release = (event: PointerEvent) => {
      const drag = rowDrag;
      if (!drag || drag.id !== row.id || drag.pointerId !== event.pointerId || drag.settling) return;
      if (rowRoot.hasPointerCapture(event.pointerId)) rowRoot.releasePointerCapture(event.pointerId);
      if (!drag.lifted) { rowDrag = undefined; return; }
      drag.settling = true;
      stopsList.dataset.settling = 'true';
      paintRowDrag();
      // No glide to wait for: the row already sits in its slot, or reduced motion.
      if (reducedMotion() || drag.offset === (drag.to - drag.from) * drag.step) { finishRowDrag(); return; }
      let timer = 0;
      const done = (e?: TransitionEvent) => {
        if (e && (e.target !== row.root || e.propertyName !== 'transform')) return;
        row.root.removeEventListener('transitionend', done);
        clearTimeout(timer);
        finishRowDrag();
      };
      row.root.addEventListener('transitionend', done);
      // A safety net, in case no transitionend comes (the row was hidden).
      timer = window.setTimeout(done, 400);
    };
    rowRoot.addEventListener('pointerup', release);
    rowRoot.addEventListener('pointercancel', release);
    rowRoot.addEventListener('lostpointercapture', release);
    grip.addEventListener('keydown', event => {
      if (!event.altKey || event.metaKey || event.ctrlKey || rowDrag) return;
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      event.stopPropagation();
      const from = index();
      const to = from + (event.key === 'ArrowUp' ? -1 : 1);
      if (to < 0 || to >= stopIds.length) return;
      reorderRows(entries(), from, to, stopIds[selected]);
      if (document.activeElement !== grip) grip.focus({ preventScroll: true });
    });
  };

  /**
   * Puts the live rows in the stops' order by moving the other rows around
   * one row that stays in the DOM: the row being scrubbed, else the row
   * holding the focus. Moving a node drops its pointer capture and its
   * focus, so a scrub that carries its stop past a neighbour would lose the
   * drag. The rows still slide to their places (syncRows).
   */
  const placeRows = () => {
    const active = document.activeElement;
    const rows = liveRows();
    if (rows.length === 0) return;
    const held = rows.find(row => row.id === scrubbingId)
      ?? rows.find(row => active instanceof Node && row.root.contains(active))
      ?? rows[0];
    const at = rows.indexOf(held);
    if (!held.root.parentNode) stopsList.append(held.root);
    for (let i = at - 1, next: Element = held.root; i >= 0; i--) {
      const el = rows[i].root;
      if (el.nextElementSibling !== next || el.parentNode !== stopsList) stopsList.insertBefore(el, next);
      next = el;
    }
    for (let i = at + 1, previous: Element = held.root; i < rows.length; i++) {
      const el = rows[i].root;
      if (previous.nextElementSibling !== el) previous.after(el);
      previous = el;
    }
    if (active instanceof HTMLElement && active !== document.activeElement && active.isConnected && stopsList.contains(active)) {
      active.focus({ preventScroll: true });
    }
  };

  /**
   * Adds rows for new stops and takes away rows for removed ones. With
   * `animate`, a new row fades and grows in, a removed row fades and shrinks
   * out over the list, and the rows that changed place slide there from
   * where they were drawn (`before`, by id).
   */
  const syncRows = (before: Map<number, number>, listTop: number, animate: boolean) => {
    const live = new Set(stopIds);
    const entering: StopRow[] = [];
    for (const id of stopIds) {
      if (rowById.has(id)) continue;
      const row = buildRow(id);
      rowById.set(id, row);
      entering.push(row);
    }
    const leaving: StopRow[] = [];
    for (const [id, row] of rowById) {
      if (live.has(id)) continue;
      rowById.delete(id);
      leaving.push(row);
    }
    // A value from outside changed the stops under a drag: drop the drag.
    if (rowDrag && (entering.length || leaving.length)) {
      rowDrag = undefined;
      delete stopsList.dataset.dragging;
      delete stopsList.dataset.settling;
      stopsList.querySelectorAll<HTMLElement>('.dialkit-bg-stop').forEach(el => { el.style.transform = ''; delete el.dataset.dragging; });
    }
    if (!rowDrag) placeRows();
    for (const row of leaving) {
      row.leaving = true;
      row.root.inert = true;
      row.root.setAttribute('aria-hidden', 'true');
      const top = before.get(row.id);
      if (!animate || top === undefined) { dropRow(row); continue; }
      row.flip?.cancel();
      row.root.dataset.leaving = 'true';
      row.root.style.top = `${top - listTop}px`;
      stopsList.append(row.root);
      const fade = animateSpring(row.root, p => ({ opacity: String(clamp(1 - p, 0, 1)), transform: `scale(${1 - 0.04 * clamp(p, 0, 1)})` }), LAYOUT_SPRING.visualDuration, LAYOUT_SPRING.bounce);
      if (!fade) dropRow(row);
      else { row.flip = fade; fade.onfinish = () => dropRow(row); }
    }
    if (!animate || rowDrag) return;
    // Positions are measured from the list's top, so a change above the list
    // (which moves the list, rows and all) never reads as a row moving.
    const running = (anim?: Animation) => !!anim && (anim.playState === 'running' || anim.pending);
    for (const row of liveRows()) {
      const target = row.root.offsetTop;
      if (entering.includes(row)) {
        row.flipTarget = target;
        row.flip = animateSpring(row.root, p => ({ opacity: String(clamp(p, 0, 1)), transform: `scale(${0.96 + 0.04 * clamp(p, 0, 1)})` }), LAYOUT_SPRING.visualDuration, LAYOUT_SPRING.bounce);
        continue;
      }
      // Same place as the slide already heading there: let it run on. A
      // handle drag renders on every pointer move; restarting the slide each
      // time would hold the row near its old place and make it crawl.
      if (running(row.flip) && row.flipTarget === target) continue;
      const from = before.get(row.id);
      if (from === undefined) continue;
      // From where the row is drawn now, mid-slide included, to its new place.
      const delta = from - listTop - target;
      row.flip?.cancel();
      row.flip = undefined;
      row.flipTarget = undefined;
      if (Math.abs(delta) < 0.5) continue;
      row.flipTarget = target;
      const slide = animateSpring(row.root, p => ({ transform: `translateY(${delta * (1 - p)}px)` }), LAYOUT_SPRING.visualDuration, LAYOUT_SPRING.bounce);
      row.flip = slide;
      if (!slide) continue;
      // A sliding row is solid (the panel's colour) and above the still rows,
      // so two rows that pass each other never show through one another.
      row.root.dataset.moving = 'true';
      const settle = () => { if (row.flip === slide || !running(row.flip)) delete row.root.dataset.moving; };
      slide.addEventListener('finish', settle);
      slide.addEventListener('cancel', settle);
    }
  };

  // ── Gizmo mode ──
  // Opening a stop row's colour picker turns on the gizmo over the host's
  // canvas (BackgroundHost.gizmoTarget), with that stop selected, as in Figma.
  // The picker and the gizmo stay while the user works on the gradient: the
  // gizmo, the picker, and the gradient's own controls in the panel. A press
  // anywhere else closes the picker (its own rule), or Escape does, and the
  // gizmo goes with it. The picker follows the selected stop.
  /** The row whose colour picker is open; undefined when the gizmo is off. */
  let gizmoRowId: number | undefined;
  let gizmo: ReturnType<typeof mountGradientGizmo> | undefined;
  /** A press on a row's swatch, whose own click is about to open its picker. */
  let pressedSwatchRowId: number | undefined;
  const pickerOpen = (row: StopRow) => row.root.querySelector('.dialkit-color-control')?.hasAttribute('data-open') ?? false;
  const toggleRowPicker = (row: StopRow) => row.root.querySelector<HTMLButtonElement>('.dialkit-color-swatch')?.click();
  /** Under the panel: one less than the highest stacking order around the control. */
  const gizmoZIndex = () => {
    let highest = Number.NaN;
    for (let el: HTMLElement | null = host; el; el = el.parentElement) {
      const z = Number.parseInt(getComputedStyle(el).zIndex, 10);
      if (Number.isFinite(z)) highest = Number.isFinite(highest) ? Math.max(highest, z) : z;
    }
    return Number.isFinite(highest) ? highest - 1 : 9998;
  };
  const gizmoProps = () => ({ gradient: value.gradient, selected, themeSource: getDialKitPortalRoot(host), zIndex: gizmoZIndex() });
  const ensureGizmo = () => {
    if (gizmo || gizmoRowId === undefined || value.mode !== 'gradient') return;
    const target = getBackgroundHost().gizmoTarget?.();
    if (!target) return;
    gizmo = mountGradientGizmo(target, gizmoProps(), {
      onHandles: handles => setGradient({ ...value.gradient, handles }),
      onSelect: index => { select(index); render(); followSelection(); },
      onStopMove: (index, at) => updateStop(index, { at }),
      onStopAdd: at => { addStopAt(at); followSelection(); },
    });
  };
  const enterGizmo = (rowId: number) => {
    gizmoRowId = rowId;
    const index = stopIds.indexOf(rowId);
    if (index >= 0 && index !== selected) { selected = index; renderSelection(); }
    root.dataset.gizmo = 'true';
    document.addEventListener('keydown', gizmoEscape);
    document.addEventListener('pointerdown', gizmoPressElsewhere, true);
    ensureGizmo();
    gizmo?.update(gizmoProps());
  };
  const exitGizmo = () => {
    gizmoRowId = undefined;
    delete root.dataset.gizmo;
    document.removeEventListener('keydown', gizmoEscape);
    document.removeEventListener('pointerdown', gizmoPressElsewhere, true);
    gizmo?.destroy();
    gizmo = undefined;
  };
  /** Escape with the focus outside the picker: close the picker, and the gizmo with it. */
  function gizmoEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape' || event.defaultPrevented || gizmoRowId === undefined || shapeMenu) return;
    const row = rowById.get(gizmoRowId);
    if (row && pickerOpen(row)) toggleRowPicker(row);
    else exitGizmo();
  }
  /**
   * A press anywhere but the gizmo, the picker, or the gradient's own
   * controls closes the picker, and the gizmo with it. It listens before
   * anything else can stop the press (the capture phase), so a host button
   * that keeps its press to itself still ends the mode.
   */
  function gizmoPressElsewhere(event: PointerEvent) {
    if (gizmoRowId === undefined) return;
    const target = event.target as Node;
    const inside = gradientPane.contains(target)
      || !!gizmo?.element.contains(target)
      || !!shapeMenu?.contains(target)
      || [...document.querySelectorAll('.dialkit-color-popover')].some(popover => popover.contains(target));
    if (inside) return;
    const row = rowById.get(gizmoRowId);
    if (row && pickerOpen(row)) toggleRowPicker(row);
    else exitGizmo();
  }
  /** When the selection moves to another stop, its row's picker opens in place of the old one. */
  function followSelection() {
    if (gizmoRowId === undefined) return;
    const next = liveRows()[selected];
    if (!next || next.id === gizmoRowId) return;
    const previous = rowById.get(gizmoRowId);
    gizmoRowId = next.id;
    if (previous && pickerOpen(previous)) toggleRowPicker(previous);
    // A press on the new row's swatch opens it with its own click.
    if (pressedSwatchRowId !== next.id && !pickerOpen(next)) toggleRowPicker(next);
  }
  // A row's picker opening or closing turns the gizmo on or off.
  const pickerWatch = new MutationObserver(records => {
    for (const record of records) {
      const control = record.target as HTMLElement;
      const row = [...rowById.values()].find(r => r.root.contains(control));
      if (!row) continue;
      if (control.hasAttribute('data-open')) enterGizmo(row.id);
      else if (row.id === gizmoRowId) exitGizmo();
    }
  });
  // While the gizmo is on, presses and focus in the gradient's controls belong
  // to its editing: they stop here, so the picker's "elsewhere" never sees them.
  gradientPane.addEventListener('pointerdown', event => {
    const swatchRow = (event.target as Element).closest('.dialkit-color-swatch') ? (event.target as Element).closest('.dialkit-bg-stop') : null;
    pressedSwatchRowId = swatchRow ? [...rowById.values()].find(r => r.root === swatchRow)?.id : undefined;
    queueMicrotask(() => { if (pressedSwatchRowId !== undefined) setTimeout(() => { pressedSwatchRowId = undefined; }, 0); });
    if (gizmoRowId !== undefined) { event.stopPropagation(); followSelection(); }
  });
  gradientPane.addEventListener('focusin', event => { if (gizmoRowId !== undefined) event.stopPropagation(); });

  const renderSelection = () => {
    handles.forEach((handle, i) => handle.toggleAttribute('data-selected', i === selected));
    stems.forEach((stem, i) => stem.toggleAttribute('data-selected', i === selected));
    liveRows().forEach((row, i) => row.root.toggleAttribute('data-selected', i === selected));
  };

  const buildSaved = () => {
    const list = getSavedGradients();
    const canDelete = !!getBackgroundHost().deleteGradient;
    const signature = JSON.stringify([list, canDelete]);
    if (signature === savedSignature) return;
    savedSignature = signature;
    savedList.replaceChildren();
    savedItems = list.map((saved, i) => {
      const item = element('div', 'dialkit-bg-saved-item');
      const swatch = element('button', 'dialkit-bg-saved-swatch');
      swatch.setAttribute('aria-label', `Apply saved gradient ${i + 1}`);
      swatch.style.setProperty('--dial-bg-gradient', backgroundGradientCss(saved.gradient));
      swatch.addEventListener('click', () => {
        selected = 0;
        emit({ ...value, mode: 'gradient', gradient: cloneGradient(saved.gradient) });
      });
      item.append(swatch);
      if (canDelete) {
        const remove = iconButton('dialkit-bg-saved-delete', `Delete saved gradient ${i + 1}`, ICON_CLOSE);
        remove.addEventListener('click', async () => {
          const deleteGradient = getBackgroundHost().deleteGradient;
          if (!deleteGradient) return;
          remove.disabled = true;
          try {
            await deleteGradient(saved.id);
            if (getSavedGradients().some(entry => entry.id === saved.id)) {
              setSavedGradients(getSavedGradients().filter(entry => entry.id !== saved.id));
            }
            gradientStatus = '';
          } catch (error) {
            gradientStatus = errorMessage(error, 'Could not delete the gradient.');
            remove.disabled = false;
          }
          if (!destroyed) render();
        });
        item.append(remove);
      }
      savedList.append(item);
      return { id: saved.id, gradient: saved.gradient, swatch };
    });
  };

  saveButton.addEventListener('click', async () => {
    const saveGradient = getBackgroundHost().saveGradient;
    if (!saveGradient || saving) return;
    saving = true;
    gradientStatus = '';
    render();
    try {
      const saved = await saveGradient(cloneGradient(value.gradient));
      // The host may already have pushed its new list; add it only if it is missing.
      if (saved && typeof saved.id === 'string' && !getSavedGradients().some(entry => entry.id === saved.id)) {
        setSavedGradients([...getSavedGradients(), saved]);
      }
    } catch (error) {
      gradientStatus = errorMessage(error, 'Could not save the gradient.');
    } finally {
      saving = false;
      if (!destroyed) render();
    }
  });

  // ── Media ────────────────────────────────────────────────────────────
  const mediaPane = element('div', 'dialkit-bg-pane dialkit-bg-media');
  const fileInput = element('input', 'dialkit-bg-file');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,video/*';
  fileInput.tabIndex = -1;
  fileInput.setAttribute('aria-hidden', 'true');
  const drop = element('button', 'dialkit-bg-drop');
  const dropText = element('span', 'dialkit-bg-drop-text');
  drop.append(strokeIcon(ICON_UPLOAD), dropText);
  const preview = element('button', 'dialkit-bg-media-preview');
  preview.setAttribute('aria-label', 'Media options');
  preview.setAttribute('aria-haspopup', 'dialog');
  preview.setAttribute('aria-expanded', 'false');
  const previewFrame = element('span', 'dialkit-bg-media-frame');
  const previewBadge = element('span', 'dialkit-bg-media-badge');
  previewBadge.setAttribute('aria-hidden', 'true');
  preview.append(previewFrame, previewBadge);
  let previewSignature = '';
  const actions = element('div', 'dialkit-bg-media-actions');
  const replaceButton = element('button', 'dialkit-button dialkit-bg-media-action', 'Replace');
  const removeButton = element('button', 'dialkit-button dialkit-bg-media-action', 'Remove');
  actions.append(replaceButton, removeButton);
  const mediaStatusLine = element('div', 'dialkit-bg-status');
  mediaStatusLine.setAttribute('role', 'status');
  mediaStatusLine.setAttribute('aria-live', 'polite');
  mediaPane.append(drop, preview, actions, mediaStatusLine, fileInput);

  const chooseFile = () => {
    if (!getBackgroundHost().upload || uploading) return;
    fileInput.value = '';
    fileInput.click();
  };
  const uploadFile = async (file: File | undefined) => {
    const upload = getBackgroundHost().upload;
    if (!file || !upload) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      mediaStatus = 'Choose an image or a video file.';
      mediaError = true;
      render();
      return;
    }
    const request = ++uploadRequest;
    uploading = true;
    mediaStatus = `Uploading ${file.name}…`;
    mediaError = false;
    render();
    try {
      const media = await upload(file);
      if (destroyed || request !== uploadRequest) return;
      if (!media || typeof media.key !== 'string' || !media.key || (media.kind !== 'image' && media.kind !== 'video')) {
        throw new Error('The upload returned no file.');
      }
      mediaStatus = '';
      uploading = false;
      emit({ ...value, mode: 'media', media: { key: media.key, kind: media.kind } });
    } catch (error) {
      if (destroyed || request !== uploadRequest) return;
      mediaStatus = errorMessage(error, 'The upload failed.');
      mediaError = true;
    } finally {
      if (!destroyed && request === uploadRequest) {
        uploading = false;
        render();
      }
    }
  };
  drop.addEventListener('click', chooseFile);
  replaceButton.addEventListener('click', chooseFile);
  removeButton.addEventListener('click', () => {
    closeOptions();
    emit({ ...value, media: null });
    drop.focus({ preventScroll: true });
  });
  fileInput.addEventListener('change', () => { void uploadFile(fileInput.files?.[0]); });
  mediaPane.addEventListener('dragover', event => {
    if (!getBackgroundHost().upload || uploading) return;
    event.preventDefault();
    mediaPane.dataset.dragging = 'true';
  });
  mediaPane.addEventListener('dragleave', event => {
    if (!mediaPane.contains(event.relatedTarget as Node | null)) delete mediaPane.dataset.dragging;
  });
  mediaPane.addEventListener('drop', event => {
    delete mediaPane.dataset.dragging;
    if (!getBackgroundHost().upload || uploading) return;
    event.preventDefault();
    void uploadFile(event.dataTransfer?.files?.[0]);
  });

  const renderPreview = (media: BackgroundMedia) => {
    const url = getBackgroundHost().mediaUrl?.(media) ?? '';
    const signature = `${media.kind}\n${media.key}\n${url}`;
    if (signature === previewSignature) return;
    previewSignature = signature;
    previewFrame.replaceChildren();
    if (!url) {
      previewFrame.append(element('span', 'dialkit-bg-media-key', media.key));
    } else if (media.kind === 'video') {
      const video = element('video', 'dialkit-bg-media-el');
      video.muted = true;
      video.defaultMuted = true;
      video.setAttribute('muted', '');
      video.loop = true;
      video.playsInline = true;
      video.autoplay = true;
      video.preload = 'metadata';
      video.src = url;
      previewFrame.append(video);
      void video.play?.()?.catch?.(() => { /* autoplay refused: the first frame still shows */ });
    } else {
      const img = element('img', 'dialkit-bg-media-el');
      img.alt = '';
      img.decoding = 'async';
      img.draggable = false;
      img.src = url;
      previewFrame.append(img);
    }
  };

  // ── Media options shell ──────────────────────────────────────────────
  const setDisplay = (patch: Partial<BackgroundMediaDisplay>) => emit({ ...value, mediaDisplay: { ...value.mediaDisplay, ...patch } });
  let popup: HTMLDivElement | undefined;
  let stopPosition: (() => void) | undefined;
  let syncOptions = () => {};
  const closeOptions = (restoreFocus = false) => {
    stopPosition?.();
    stopPosition = undefined;
    popup?.remove();
    popup = undefined;
    syncOptions = () => {};
    delete preview.dataset.open;
    preview.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside);
    document.removeEventListener('focusin', focusOutside);
    if (restoreFocus) preview.focus({ preventScroll: true });
  };
  const outside = (event: PointerEvent) => {
    if (!popup?.contains(event.target as Node) && !preview.contains(event.target as Node)) closeOptions();
  };
  const focusOutside = (event: FocusEvent) => {
    if (!popup?.contains(event.target as Node) && !preview.contains(event.target as Node)) closeOptions();
  };
  const openOptions = (event?: Event) => {
    if (popup) { closeOptions(); return; }
    const portal = getDialKitPortalRoot(host) ?? host;
    const shell = element('div', 'dialkit-bg-popover');
    popup = shell;
    shell.tabIndex = -1;
    shell.style.position = 'fixed';
    shell.setAttribute('role', 'dialog');
    shell.setAttribute('aria-label', `${props.label} media options`);

    const section = (title: string, control: HTMLElement) => {
      const wrap = element('div', 'dialkit-bg-popover-section');
      const heading = element('div', 'dialkit-bg-popover-label', title);
      wrap.append(heading, control);
      shell.append(wrap);
    };

    const fits = segmented(BACKGROUND_FITS.map(fit => ({ value: fit, label: FIT_LABEL[fit] })), 'Fit', fit => setDisplay({ fit }));
    section('Fit', fits.group);

    // Tile Size shows only while Fit is Tile, with the conditional row animation.
    const tileWrap = element('div', 'dialkit-bg-tile-wrap');
    const tileSize = shellSlider({
      label: 'Tile Size',
      ...BACKGROUND_TILE_SCALE,
      scale: 100,
      decimals: 0,
      unit: '%',
      read: () => value.mediaDisplay.tileScale,
      apply: n => setDisplay({ tileScale: n }),
    });
    tileWrap.append(tileSize.root);
    shell.append(tileWrap);
    const tileRow = conditionalRow(tileWrap, shell);

    const ratios = element('div', 'dialkit-bg-ratios');
    ratios.setAttribute('role', 'radiogroup');
    ratios.setAttribute('aria-label', 'Ratio');
    ratios.addEventListener('keydown', handleSegmentKey);
    const ratioButtons = BACKGROUND_RATIOS.map(ratio => {
      const button = element('button', 'dialkit-segmented-button dialkit-bg-ratio');
      button.setAttribute('role', 'radio');
      button.append(element('span', 'dialkit-segmented-text', RATIO_LABEL(ratio)));
      button.addEventListener('click', () => setDisplay({ ratio }));
      ratios.append(button);
      return button;
    });
    section('Ratio', ratios);

    const zoom = shellSlider({
      label: 'Zoom',
      ...BACKGROUND_ZOOM,
      scale: 1,
      decimals: 1,
      unit: '×',
      read: () => value.mediaDisplay.zoom,
      apply: n => setDisplay({ zoom: n }),
    });
    shell.append(zoom.root);

    const anchor = element('div', 'dialkit-anchor dialkit-bg-pin');
    anchor.setAttribute('role', 'radiogroup');
    anchor.setAttribute('aria-label', 'Pin');
    anchor.style.setProperty('--dial-anchor-columns', '3');
    anchor.style.setProperty('--dial-anchor-rows', '3');
    const anchorPill = element('span', 'dialkit-anchor-pill dialkit-bg-pin-pill');
    anchorPill.setAttribute('aria-hidden', 'true');
    anchor.append(anchorPill);
    const cells: HTMLButtonElement[] = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cell = element('button', 'dialkit-anchor-cell');
        cell.setAttribute('role', 'radio');
        cell.setAttribute('aria-label', `${PIN_ROWS[r]}, ${PIN_COLUMNS[c]}`);
        cell.dataset.cell = `${c}-${r}`;
        cell.append(element('span', 'dialkit-anchor-dot'));
        cell.addEventListener('click', () => setDisplay({ pinX: (c - 1) as -1 | 0 | 1, pinY: (r - 1) as -1 | 0 | 1 }));
        anchor.append(cell);
        cells.push(cell);
      }
    }
    anchor.addEventListener('keydown', e => {
      const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const move = moves[e.key];
      if (!move) return;
      e.preventDefault();
      e.stopPropagation();
      const c = clamp(value.mediaDisplay.pinX + 1 + move[0], 0, 2);
      const r = clamp(value.mediaDisplay.pinY + 1 + move[1], 0, 2);
      setDisplay({ pinX: (c - 1) as -1 | 0 | 1, pinY: (r - 1) as -1 | 0 | 1 });
      cells[r * 3 + c].focus({ preventScroll: true });
    });
    section('Pin', anchor);

    syncOptions = () => {
      const display = value.mediaDisplay;
      fits.set(display.fit);
      tileRow.set(display.fit === 'tile');
      tileSize.sync();
      BACKGROUND_RATIOS.forEach((ratio, i) => {
        const active = ratio === display.ratio;
        ratioButtons[i].setAttribute('aria-checked', String(active));
        ratioButtons[i].dataset.active = String(active);
        ratioButtons[i].tabIndex = active ? 0 : -1;
      });
      zoom.sync();
      const col = display.pinX + 1;
      const row = display.pinY + 1;
      anchorPill.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
      cells.forEach((cell, i) => {
        const picked = i === row * 3 + col;
        cell.setAttribute('aria-checked', String(picked));
        cell.tabIndex = picked ? 0 : -1;
      });
    };

    shell.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeOptions(true); return; }
      if (e.key === 'Tab') {
        const stops = Array.from(shell.querySelectorAll<HTMLElement>('button, input, [tabindex="0"]'))
          .filter(el => el.tabIndex >= 0 && el.getClientRects().length > 0);
        const first = stops[0];
        const last = stops[stops.length - 1];
        if ((e.shiftKey && document.activeElement === first) || (!e.shiftKey && document.activeElement === last)) {
          e.preventDefault();
          closeOptions(true);
          return;
        }
      }
      if (!isHintKey(e)) e.stopPropagation();
    });
    portal.append(shell);
    syncOptions();
    const updatePosition = () => {
      if (!popup) return;
      if (!host.isConnected || preview.getClientRects().length === 0) { closeOptions(); return; }
      const p = getDropdownPosition(preview, portal, { dropdownHeight: popup.scrollHeight + 2, width: 280, maxHeight: 480, preferSide: true, fixed: true, gap: 8 });
      Object.assign(popup.style, { left: `${p.left}px`, top: `${p.top}px`, width: `${p.width}px`, maxHeight: `${p.maxHeight}px`, transformOrigin: p.above ? 'bottom' : 'top' });
    };
    stopPosition = observeDropdownPosition(preview, updatePosition, () => popup);
    preview.dataset.open = 'true';
    preview.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', focusOutside);
    // A mouse click focuses the shell itself; a keyboard open starts on the picked fit.
    if (event instanceof MouseEvent && event.detail > 0) shell.focus({ preventScroll: true });
    else fits.buttons.find(button => button.dataset.active === 'true')?.focus({ preventScroll: true });
  };
  preview.addEventListener('click', openOptions);

  // ── Render ───────────────────────────────────────────────────────────
  body.append(solidPane, gradientPane, mediaPane);
  (folder?.body ?? host).append(root);

  // The control's height never jumps: each render measures the height before
  // and after, and the root animates between them with the conditional rows'
  // spring, so the folder around it follows. Reduced motion: instant.
  let heightAnim: Animation | undefined;
  let heightTarget = -1;
  let built = false;
  let shownMode = value.mode;
  function render() {
    if (destroyed) return;
    const animate = built && root.isConnected && root.getClientRects().length > 0 && !reducedMotion();
    const beforeHeight = root.getBoundingClientRect().height;
    const listTop = stopsList.getBoundingClientRect().top;
    const before = new Map<number, number>();
    if (animate && stopsList.getClientRects().length > 0) {
      for (const row of rowById.values()) if (!row.leaving) before.set(row.id, row.root.getBoundingClientRect().top);
    }
    renderNow(before, listTop, animate);
    built = true;
    if (!animate) return;
    if (value.mode !== shownMode) {
      shownMode = value.mode;
      const pane = value.mode === 'solid' ? solidPane : value.mode === 'gradient' ? gradientPane : mediaPane;
      animateSpring(pane, p => ({ opacity: String(clamp(p, 0, 1)) }), LAYOUT_SPRING.visualDuration, 0);
    }
    const after = body.getBoundingClientRect().height;
    if (heightAnim && Math.abs(after - heightTarget) < 0.5) return;
    if (Math.abs(after - beforeHeight) < 0.5) { heightAnim?.cancel(); return; }
    heightAnim?.cancel();
    // Only vertically: the end swatches' rings and the margin grip stand past the sides.
    root.style.overflowY = 'clip';
    heightTarget = after;
    const anim = animateSpring(root, p => ({ height: `${beforeHeight + (after - beforeHeight) * p}px` }), LAYOUT_SPRING.visualDuration, LAYOUT_SPRING.bounce);
    heightAnim = anim;
    if (!anim) { root.style.overflowY = ''; heightTarget = -1; return; }
    const done = () => {
      if (heightAnim !== anim) return;
      heightAnim = undefined;
      heightTarget = -1;
      root.style.overflowY = '';
    };
    anim.onfinish = done;
    anim.oncancel = done;
  }

  function renderNow(before: Map<number, number>, listTop: number, animate: boolean) {
    shownMode = animate ? shownMode : value.mode;
    const backgroundHost = getBackgroundHost();
    folder?.update({ title: props.label });
    modes.group.setAttribute('aria-label', `${props.label} type`);
    modes.set(value.mode);
    solidPane.hidden = value.mode !== 'solid';
    gradientPane.hidden = value.mode !== 'gradient';
    mediaPane.hidden = value.mode !== 'media';
    if (value.mode !== 'media' || !value.media) closeOptions();

    // Solid
    solid.update({ label: 'Color', value: solidValue(), onChange: raw => {
      const picked = readPicked(raw);
      if (!picked) return;
      solidPicked = { raw, color: picked.color };
      emit({ ...value, color: picked.color });
    } });

    // Gradient
    const gradient = value.gradient;
    const stops = gradient.stops;
    selected = clamp(selected, 0, stops.length - 1);
    shapeValue.textContent = SHAPE_LABEL[gradient.shape];
    placeShapeMenu();
    if (gizmoRowId !== undefined && !rowById.has(gizmoRowId)) exitGizmo();
    if (gizmoRowId !== undefined) {
      ensureGizmo();
      gizmo?.update(gizmoProps());
    }
    syncTrackStyle();
    paintTrack();
    if (handles.length !== stops.length) buildHandles();
    handles.forEach((handle, i) => {
      const stop = stops[i];
      // The swatch's centre: its true place, stopped half a swatch from each end.
      handle.style.setProperty('--dial-bg-at', `${stop.at}%`);
      stems[i]?.style.setProperty('--dial-bg-at', `${stop.at}%`);
      handle.style.setProperty('--dial-bg-stop', stopCssColor(stop));
      handle.setAttribute('aria-label', `Stop ${i + 1} position`);
      handle.setAttribute('aria-valuenow', String(stop.at));
      handle.setAttribute('aria-valuetext', `${formatNumber(stop.at)}%, ${stop.color}`);
      // The selected handle draws on top of a neighbour at the same place.
      handle.style.zIndex = i === selected ? '2' : '1';
    });
    syncGripStyle();
    reconcileIds();
    syncRows(before, listTop, animate);
    liveRows().forEach((row, i) => {
      const stop = stops[i];
      row.at.sync();
      row.alpha.sync();
      const picked = row.picked && row.picked.color === stop.color && row.picked.alpha === stop.alpha ? row.picked.raw : stopPickerValue(stop);
      row.color.update({ label: `Stop ${i + 1}`, value: picked, onChange: raw => pickStopColor(row, raw) });
      row.remove.disabled = stops.length <= BACKGROUND_MIN_STOPS;
      row.remove.setAttribute('aria-label', `Remove stop ${i + 1}`);
      row.grip.setAttribute('aria-label', 'Reorder stop');
      row.grip.setAttribute('aria-description', `Stop ${i + 1} of ${stops.length}. Drag, or press Alt with the up or down arrow, to move it.`);
    });
    renderSelection();
    addButton.disabled = stops.length >= BACKGROUND_MAX_STOPS;
    bar.toggleAttribute('data-full', stops.length >= BACKGROUND_MAX_STOPS);
    saveRow.hidden = !backgroundHost.saveGradient;
    saveButton.disabled = saving;
    saveButton.textContent = saving ? 'Saving…' : 'Save gradient';
    gradientStatusLine.textContent = gradientStatus;
    gradientStatusLine.hidden = !gradientStatus;
    buildSaved();
    savedList.hidden = savedItems.length === 0;
    savedItems.forEach(item => item.swatch.setAttribute('aria-pressed', String(sameGradient(item.gradient, gradient))));

    // Media
    const canUpload = !!backgroundHost.upload;
    const media = value.media;
    drop.hidden = !!media;
    drop.disabled = !canUpload || uploading;
    drop.setAttribute('aria-busy', String(uploading));
    dropText.textContent = !canUpload ? 'Uploads are not available here.' : uploading ? 'Uploading…' : 'Upload or drop an image or a video';
    preview.hidden = !media;
    actions.hidden = !media;
    if (media) renderPreview(media);
    else previewSignature = '';
    const display = value.mediaDisplay;
    const fitText = display.fit === 'tile' ? `Tile ${Math.round(display.tileScale * 100)}%` : FIT_LABEL[display.fit];
    previewBadge.textContent = `${fitText} · ${RATIO_LABEL(display.ratio)} · ${formatNumber(display.zoom)}×`;
    replaceButton.disabled = !canUpload || uploading;
    replaceButton.setAttribute('aria-busy', String(uploading));
    replaceButton.textContent = uploading ? 'Uploading…' : 'Replace';
    removeButton.disabled = uploading;
    mediaPane.toggleAttribute('data-busy', uploading);
    mediaStatusLine.textContent = mediaStatus;
    mediaStatusLine.hidden = !mediaStatus;
    mediaStatusLine.toggleAttribute('data-error', mediaError);
    syncOptions();
  }

  const unsubscribe = subscribeBackgroundHost(() => render());
  render();

  return {
    update(next: BackgroundControlProps) {
      props = next;
      const incoming = normalizeBackgroundValue(next.value);
      if (!sameBackgroundValue(incoming, value)) {
        value = incoming;
        reconcileIds();
      }
      render();
    },
    destroy() {
      destroyed = true;
      uploadRequest++;
      unsubscribe();
      endDrag();
      closeOptions();
      solid.destroy();
      heightAnim?.cancel();
      closeShapeMenu();
      document.removeEventListener('pointerdown', markPointer, true);
      document.removeEventListener('keydown', markKeyboard, true);
      trackResize?.disconnect();
      pickerWatch.disconnect();
      exitGizmo();
      rowDrag = undefined;
      rowById.forEach(row => dropRow(row));
      rowById.clear();
      root.remove();
      folder?.destroy();
    },
  };
}

/**
 * A row that shows and hides with the conditional control animation
 * (CONTROL_ANIM, the `visibleWhen` rows' spring): its height and opacity
 * grow from zero, and a negative bottom margin cancels the parent's gap
 * while it is closed. The first `set` only places it, with no animation.
 */
function conditionalRow(row: HTMLElement, parent: HTMLElement) {
  const { visualDuration, bounce } = LAYOUT_SPRING;
  let shown: boolean | undefined;
  let animation: Animation | undefined;
  row.style.overflow = 'clip';
  return {
    set(show: boolean) {
      if (show === shown) return;
      const first = shown === undefined;
      shown = show;
      animation?.cancel();
      animation = undefined;
      if (first || !row.isConnected) { row.hidden = !show; return; }
      const gap = Number.parseFloat(getComputedStyle(parent).rowGap) || 0;
      row.hidden = false;
      const size = show ? row.scrollHeight : row.offsetHeight;
      animation = animateSpring(row, p => {
        const t = show ? p : 1 - p;
        return { height: `${Math.max(0, size * t)}px`, opacity: String(clamp(t, 0, 1)), marginBottom: `${-gap * (1 - clamp(t, 0, 1))}px` };
      }, visualDuration, bounce);
      if (!show) {
        if (!animation) row.hidden = true;
        else animation.onfinish = () => { if (!shown) row.hidden = true; };
      }
    },
  };
}

type ShellSliderOptions = {
  label: string;
  min: number;
  max: number;
  step: number;
  /** What the shown number is the value times: 100 shows a share as a percent. */
  scale: number;
  decimals: number;
  unit: string;
  read: () => number;
  apply: (n: number) => void;
};

/** A slider in the media shell: the fork's slider look, with its unit after the number. */
function shellSlider(options: ShellSliderOptions) {
  const { min, max, step, scale, decimals, unit: unitText, read, apply } = options;
  const root = element('div', 'dialkit-slider-wrapper dialkit-bg-slider');
  const slider = element('div', 'dialkit-slider');
  slider.tabIndex = 0;
  slider.setAttribute('role', 'slider');
  slider.setAttribute('aria-label', options.label);
  slider.setAttribute('aria-valuemin', String(min));
  slider.setAttribute('aria-valuemax', String(max));
  const fill = element('div', 'dialkit-slider-fill');
  const handle = element('div', 'dialkit-slider-handle dialkit-bg-slider-handle');
  const label = element('span', 'dialkit-slider-label', options.label);
  const valueText = element('span', 'dialkit-slider-value');
  const number = element('span', 'dialkit-bg-slider-number');
  const unit = element('span', 'dialkit-slider-unit', unitText);
  valueText.append(number, unit);
  const input = element('input', 'dialkit-slider-input');
  input.type = 'text';
  input.inputMode = 'decimal';
  input.setAttribute('aria-label', `${options.label} value`);
  input.hidden = true;
  slider.append(fill, handle, label, valueText, input);
  root.append(slider);

  const digits = Math.max(0, Math.ceil(-Math.log10(step) - 1e-9));
  const set = (n: number) => {
    const snapped = min + Math.round((clamp(n, min, max) - min) / step) * step;
    apply(Number(clamp(snapped, min, max).toFixed(digits)));
  };
  const shown = (n: number) => (n * scale).toFixed(decimals);
  let press: { id: number } | undefined;
  const fromPointer = (clientX: number) => {
    const rect = root.getBoundingClientRect();
    return min + clamp((clientX - rect.left) / (rect.width || 1), 0, 1) * (max - min);
  };
  let editing = false;
  const finishEdit = (keep: boolean) => {
    if (!editing) return;
    editing = false;
    const n = Number.parseFloat(input.value.replace(unitText, ''));
    if (keep && Number.isFinite(n)) set(n / scale);
    input.hidden = true;
    valueText.hidden = false;
    sync();
  };
  const edit = () => {
    editing = true;
    input.value = shown(read());
    input.hidden = false;
    valueText.hidden = true;
    input.focus();
    input.select();
  };
  slider.addEventListener('keydown', event => handleSliderKey(event, read(), min, max, step, set, edit));
  slider.addEventListener('pointerdown', event => {
    if (event.button !== 0 || editing) return;
    event.preventDefault();
    slider.focus({ preventScroll: true });
    press = { id: event.pointerId };
    slider.setPointerCapture(event.pointerId);
    slider.classList.add('dialkit-slider-active');
    set(fromPointer(event.clientX));
  });
  slider.addEventListener('pointermove', event => {
    if (press?.id === event.pointerId) set(fromPointer(event.clientX));
  });
  const end = (event: PointerEvent) => {
    if (press?.id !== event.pointerId) return;
    press = undefined;
    if (!slider.matches(':hover')) slider.classList.remove('dialkit-slider-active');
    if (slider.hasPointerCapture(event.pointerId)) slider.releasePointerCapture(event.pointerId);
  };
  slider.addEventListener('pointerup', end);
  slider.addEventListener('pointercancel', end);
  slider.addEventListener('lostpointercapture', end);
  // A hover lights the slider up, as on the panel's sliders.
  slider.addEventListener('mouseenter', () => slider.classList.add('dialkit-slider-active'));
  slider.addEventListener('mouseleave', () => { if (!press) slider.classList.remove('dialkit-slider-active'); });
  valueText.addEventListener('pointerdown', event => event.stopPropagation());
  valueText.addEventListener('click', edit);
  input.addEventListener('pointerdown', event => event.stopPropagation());
  input.addEventListener('keydown', event => {
    event.stopPropagation();
    // The field shows the scaled number (a percent), so it steps in that scale.
    const stepped = stepInputKey(event, input.value, read() * scale, min * scale, max * scale, step * scale);
    if (stepped !== undefined) { set(stepped / scale); input.value = shown(read()); return; }
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      finishEdit(event.key === 'Enter');
      slider.focus({ preventScroll: true });
    }
  });
  input.addEventListener('blur', () => finishEdit(true));

  function sync() {
    const n = read();
    const pct = (n - min) / (max - min) * 100;
    fill.style.width = `${pct}%`;
    handle.style.left = `max(5px, calc(${pct}% - 9px))`;
    if (!editing) number.textContent = shown(n);
    slider.setAttribute('aria-valuenow', String(n));
    slider.setAttribute('aria-valuetext', `${shown(n)}${unitText}`);
  }
  sync();
  return { root, sync };
}
