import { animateSpring } from './animation';
import {
  GRADIENT_SHAPES, MAX_GRADIENT_STOPS, MEDIA_FITS, MEDIA_RATIOS, MEDIA_TILE_SIZE, MEDIA_ZOOM, MIN_GRADIENT_STOPS,
  backgroundGradientCss, backgroundMediaCss, cloneGradient, colorOpacity, gradientColorAt, gradientStrip, moveStopColor, normalizeBackgroundValue, paintGradient,
  rotateGradient, sameBackgroundValue, sameGradient, switchGradientShape, widestGapMiddle, withOpacity,
  type BackgroundGradient, type BackgroundMediaDisplay, type BackgroundMode, type BackgroundValue, type GradientShape, type GradientStop,
} from './background';
import { clamp } from './color';
import { mountColorControl } from './color-control';
import { numberField, segmentedControl, type NumberFieldOptions } from './control-fields';
import { openDropdownOnKey } from './control-keyboard';
import { observeDropdownKeyboard } from './dropdown-keyboard';
import { getDialKitPortalRoot, getDropdownPosition, observeDropdownPosition } from './dropdown-position';
import { ICON_CHEVRON, ICON_CLOSE, ICON_PLUS } from './icons';
import { decimalsForStep, roundValue } from './numeric';
import { mountHints } from './hints';
import { DialStore } from './store/DialStore';
import { mountSlider } from './vanilla/controls';

export type BackgroundControlProps = {
  /** Saved gradients belong to this panel. */
  panelId: string;
  label: string;
  value: BackgroundValue;
  /** Stores a dropped or picked file and returns its URL. Without it, files up to 10 MB are read as data URLs. */
  upload?: (file: File) => Promise<string>;
  onChange: (value: BackgroundValue) => void;
};

const MODES: { value: BackgroundMode; label: string }[] = [{ value: 'solid', label: 'Solid' }, { value: 'gradient', label: 'Gradient' }, { value: 'media', label: 'Media' }];
const SHAPE_LABELS: Record<GradientShape, string> = { linear: 'Linear', radial: 'Radial', angular: 'Angular', diamond: 'Diamond' };
const FIT_LABELS: Record<BackgroundMediaDisplay['fit'], string> = { fill: 'Fill', fit: 'Fit', stretch: 'Stretch', tile: 'Tile' };
const COLUMNS = ['left', 'center', 'right'] as const;
const ROWS = ['top', 'center', 'bottom'] as const;
const COLUMN_NAMES = ['Left', 'Center', 'Right'];
const ROW_NAMES = ['Top', 'Middle', 'Bottom'];
const ICON_FLIP = ['M7 7h13', 'M16 3l4 4-4 4', 'M17 17H4', 'M8 13l-4 4 4 4'];
const ICON_ROTATE = ['M19.5 12a7.5 7.5 0 1 1-2.2-5.3', 'M19.5 4.5v3.75h-3.75'];
const ICON_MINUS = 'M5 12H19';
const ICON_GRIP = ['M12 5h.01', 'M12 12h.01', 'M12 19h.01'];
const ICON_UPLOAD = 'M12 16V3m-4 4 4-4 4 4M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5';
const ICON_SOURCE = ['M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M4 16l4.5-4.5 4 4 2.5-2.5L20 18', 'M15 9.5h.01'];
/** A stop dragged this far above or below the strip is removed on release. */
const REMOVE_DISTANCE = 24;
const DRAG_THRESHOLD = 3;
/** Where the strip centres a radial, angular or diamond gradient. */
const STRIP_HANDLES = { start: { x: 0.5, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0.5, y: 0 } };
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/** The hints of the control's parts, shown while the hint key (H) is held. */
const BG_HINTS = {
  mode: {
    solid: 'Fills the background with one color.',
    gradient: 'Fills the background with a gradient.',
    media: 'Fills the background with an image or a video.',
  } as Record<BackgroundMode, string>,
  shapeTrigger: 'Changes how the colors spread.',
  shape: {
    linear: 'The colors run along a straight line.',
    radial: 'The colors grow out from a point, in circles.',
    angular: 'The colors turn around a point.',
    diamond: 'The colors grow out from a point, as a diamond.',
  } as Record<GradientShape, string>,
  flip: 'Reverses the order of the stops.',
  rotate: 'Turns the gradient a quarter turn clockwise.',
  bar: 'Click to add a stop here.',
  handle: 'Drag to move this stop. Drag it off the bar to remove it. Double-click to change its color.',
  add: 'Adds a stop in the middle of the widest gap.',
  grip: 'Drag to change the order of the stops.',
  position: 'Where the stop sits along the gradient, from 0 to 100%.',
  save: 'Keeps this gradient in your list.',
  saved: 'Click to use this gradient.',
  savedDelete: 'Deletes this saved gradient.',
  drop: 'Drop an image or a video here, or click to pick one.',
  preview: 'Opens the options for how the media fills the background.',
  sizing: 'How the media fills the background.',
  fit: {
    fill: 'Covers the whole background. The media\'s edges may be cut off.',
    fit: 'Shows all of the media inside the background.',
    stretch: 'Fills the background and does not keep the media\'s shape.',
    tile: 'Repeats the media across the background.',
  } as Record<BackgroundMediaDisplay['fit'], string>,
  ratioSection: 'The shape the media is cropped to.',
  ratio: (ratio: string) => ratio === 'source' ? 'Keeps the media\'s own shape.' : `Crops the media to ${ratio}.`,
  tileSize: 'How large each repeated tile is.',
  zoom: 'Scales the media inside the background.',
  pin: 'Which part of the media stays in view when it is cut off.',
};
/** Gives a part its hint; the control keeps the hint listeners mounted. */
const hint = (part: HTMLElement, text: string) => { part.dataset.hint = text; };

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  if (el instanceof HTMLButtonElement) el.type = 'button';
  return el;
}

function icon(paths: string | readonly string[]) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of typeof paths === 'string' ? [paths] : paths) {
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

function iconButton(className: string, label: string, paths: string | readonly string[]) {
  const button = element('button', `dialkit-background-icon-button ${className}`);
  button.setAttribute('aria-label', label);
  button.title = label;
  button.append(icon(paths));
  return button;
}

/** A short number field in the control's style, snapped to its step. */
function field(options: Omit<NumberFieldOptions, 'className' | 'digits' | 'limit'>) {
  return numberField({
    ...options,
    className: 'dialkit-background-field',
    digits: decimalsForStep(options.step),
    limit: n => roundValue(n, options.step, options.min, options.max),
  });
}

type StopRow = {
  id: number;
  root: HTMLDivElement;
  grip: HTMLButtonElement;
  position: ReturnType<typeof field>;
  color: ReturnType<typeof mountColorControl>;
  opacity: ReturnType<typeof field>;
  remove: HTMLButtonElement;
};

/** A stop with the id its row keeps through sorting and reordering. */
type Entry = { id: number; stop: GradientStop };

/** Where each block of the control was drawn before a render, for the spring that follows it. */
type Layout = { height: number; mode: BackgroundMode; tops: Map<HTMLElement, number> };

/**
 * Shows and hides a row of a grid the way a folder opens and closes: its
 * height and opacity spring from nothing, and a negative margin takes back
 * the grid's gap while it is closed. The first call only places the row.
 */
/** Every layout change in the control springs with this: a little quicker than a folder opening. */
const LAYOUT_SPRING = { visualDuration: 0.25, bounce: 0.1 } as const;
const layoutSpring = (node: HTMLElement, frame: (progress: number) => Keyframe, bounce: number = LAYOUT_SPRING.bounce) =>
  animateSpring(node, frame, LAYOUT_SPRING.visualDuration, bounce);

function revealRow(row: HTMLElement) {
  let shown: boolean | undefined;
  let animation: Animation | undefined;
  row.style.overflow = 'clip';
  const set = (show: boolean) => {
    if (show === shown) return;
    const first = shown === undefined;
    shown = show;
    if (first || !row.isConnected) { row.hidden = !show; return; }
    const from = row.hidden ? 0 : row.getBoundingClientRect().height;
    animation?.cancel();
    row.hidden = false;
    const full = row.offsetHeight;
    const to = show ? full : 0;
    const gap = Number.parseFloat(getComputedStyle(row.parentElement!).rowGap) || 0;
    animation = layoutSpring(row, p => {
      const open = clamp((from + (to - from) * p) / full, 0, 1);
      return { height: `${Math.max(0, from + (to - from) * p)}px`, opacity: String(open), marginBottom: `${-gap * (1 - open)}px` };
    });
    if (show) return;
    if (animation) animation.onfinish = () => { if (!shown) row.hidden = true; };
    else row.hidden = true;
  };
  return { set, cancel: () => animation?.cancel() };
}

/** Solid, gradient, and media backgrounds in one control, shared by every adapter. */
export function mountBackgroundControl(host: HTMLElement, initial: BackgroundControlProps) {
  let props = initial;
  let value = normalizeBackgroundValue(props.value);
  let destroyed = false;
  const emit = (next: BackgroundValue) => {
    if (sameBackgroundValue(next, value)) { render(); return; }
    value = next;
    render();
    props.onChange(value);
  };
  const setGradient = (gradient: BackgroundGradient) => emit({ ...value, gradient });

  const root = element('div', 'dialkit-background');
  // Every hinted part below is the control's own, so one mount serves them all.
  const hints = mountHints();
  const modes = segmentedControl('dialkit-background-modes', 'Background type', MODES, mode => emit({ ...value, mode }));
  modes.buttons.forEach((button, i) => hint(button, BG_HINTS.mode[MODES[i].value]));
  root.append(modes.root);

  // Solid
  const solidPane = element('div', 'dialkit-background-pane');
  const solidHost = element('div', 'dialkit-color-host');
  solidPane.append(solidHost);
  const solidProps = () => ({ label: 'Color', value: value.color, onChange: (color: string) => emit({ ...value, color }) });
  const solid = mountColorControl(solidHost, solidProps());

  // Gradient: the type and its two quick changes.
  const gradientPane = element('div', 'dialkit-background-pane');
  const shapeRow = element('div', 'dialkit-background-shape-row');
  const shapeTrigger = element('button', 'dialkit-select-trigger dialkit-background-shape-trigger');
  shapeTrigger.setAttribute('aria-label', 'Gradient type');
  shapeTrigger.setAttribute('aria-haspopup', 'listbox');
  shapeTrigger.setAttribute('aria-expanded', 'false');
  const shapeValue = element('span', 'dialkit-select-value');
  const chevron = icon(ICON_CHEVRON);
  chevron.classList.add('dialkit-select-chevron');
  shapeTrigger.append(shapeValue, chevron);
  const flipButton = iconButton('dialkit-background-flip', 'Flip stops', ICON_FLIP);
  const rotateButton = iconButton('dialkit-background-rotate', 'Rotate 90° clockwise', ICON_ROTATE);
  shapeRow.append(shapeTrigger, flipButton, rotateButton);
  hint(shapeTrigger, BG_HINTS.shapeTrigger);
  hint(flipButton, BG_HINTS.flip);
  hint(rotateButton, BG_HINTS.rotate);
  flipButton.addEventListener('click', () => commitEntries(entries().map(({ id, stop }) => ({ id, stop: { ...stop, at: Number((100 - stop.at).toFixed(2)) } }))));
  rotateButton.addEventListener('click', () => setGradient(rotateGradient(value.gradient)));

  let shapeMenu: HTMLDivElement | undefined;
  let stopShapeMenu: (() => void) | undefined;
  const outsideShapeMenu = (event: PointerEvent) => {
    if (!shapeMenu?.contains(event.target as Node) && !shapeTrigger.contains(event.target as Node)) closeShapeMenu();
  };
  function closeShapeMenu() {
    stopShapeMenu?.();
    stopShapeMenu = undefined;
    shapeMenu?.remove();
    shapeMenu = undefined;
    shapeTrigger.dataset.open = 'false';
    shapeTrigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outsideShapeMenu);
  }
  const openShapeMenu = () => {
    if (shapeMenu) return;
    const portal = getDialKitPortalRoot(host) ?? document.body;
    const menu = shapeMenu = element('div', 'dialkit-select-dropdown dialkit-background-shape-menu');
    menu.style.position = 'fixed';
    for (const shape of GRADIENT_SHAPES) {
      const option = element('button', 'dialkit-select-option', SHAPE_LABELS[shape]);
      option.dataset.selected = String(shape === value.gradient.shape);
      hint(option, BG_HINTS.shape[shape]);
      option.addEventListener('click', () => {
        closeShapeMenu();
        setGradient(switchGradientShape(value.gradient, shape));
      });
      menu.append(option);
    }
    portal.append(menu);
    shapeTrigger.dataset.open = 'true';
    shapeTrigger.setAttribute('aria-expanded', 'true');
    const stopPosition = observeDropdownPosition(shapeTrigger, () => {
      if (!shapeTrigger.isConnected || !shapeTrigger.getClientRects().length) { closeShapeMenu(); return; }
      const p = getDropdownPosition(shapeTrigger, portal, { fixed: true, dropdownHeight: menu.scrollHeight + 2 });
      Object.assign(menu.style, { top: `${p.top}px`, left: `${p.left}px`, width: `${p.width}px`, maxHeight: `${p.maxHeight}px` });
    }, () => shapeMenu);
    const stopKeyboard = observeDropdownKeyboard(shapeTrigger, () => shapeMenu, closeShapeMenu);
    stopShapeMenu = () => { stopPosition(); stopKeyboard(); };
    document.addEventListener('pointerdown', outsideShapeMenu);
  };
  shapeTrigger.addEventListener('click', () => { if (shapeMenu) closeShapeMenu(); else openShapeMenu(); });
  shapeTrigger.addEventListener('keydown', event => openDropdownOnKey(event, openShapeMenu));

  // The strip: the gradient over a checkerboard, with one handle per stop.
  // Linear lays its stops left to right, as a CSS gradient; Radial, Angular
  // and Diamond paint as their own shape on a canvas, centred in the strip,
  // the main radius out to its ends and the cross radius its half height.
  // The canvas is there only while it paints: the browser gives a canvas a
  // layer of its own, and the rows drawn after it would join that layer.
  const bar = element('div', 'dialkit-background-bar');
  const track = element('div', 'dialkit-background-track');
  const paint = element('div', 'dialkit-background-track-paint');
  paint.setAttribute('aria-hidden', 'true');
  track.append(paint);
  const handleLayer = element('div', 'dialkit-background-handles');
  bar.append(track, handleLayer);
  let canvas: HTMLCanvasElement | undefined;
  hint(bar, BG_HINTS.bar);
  let painted = '';
  const paintTrack = () => {
    const { shape, stops } = value.gradient;
    if (shape === 'linear') {
      canvas?.remove();
      canvas = undefined;
      painted = '';
      paint.style.backgroundImage = backgroundGradientCss(gradientStrip(stops));
      return;
    }
    paint.style.backgroundImage = '';
    const scale = Math.min(globalThis.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(track.clientWidth * scale));
    const height = Math.max(1, Math.round(track.clientHeight * scale));
    const key = JSON.stringify([width, height, shape, stops]);
    if (canvas && key === painted) return;
    painted = key;
    canvas ??= paint.appendChild(element('canvas', 'dialkit-background-track-canvas'));
    canvas.width = width;
    canvas.height = height;
    paintGradient(canvas, { shape, handles: STRIP_HANDLES, stops });
  };
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(paintTrack) : undefined;
  resize?.observe(track);

  const stopsHeader = element('div', 'dialkit-background-stops-header');
  const addButton = iconButton('dialkit-background-add', 'Add stop', ICON_PLUS);
  stopsHeader.append(element('span', 'dialkit-background-stops-title', 'Stops'), addButton);
  hint(addButton, BG_HINTS.add);
  const stopList = element('div', 'dialkit-background-stops');
  const saveButton = element('button', 'dialkit-background-save', 'Save gradient');
  hint(saveButton, BG_HINTS.save);
  const savedList = element('div', 'dialkit-background-saved');
  savedList.setAttribute('role', 'group');
  savedList.setAttribute('aria-label', 'Saved gradients');
  gradientPane.append(shapeRow, bar, stopsHeader, stopList, saveButton, savedList);

  // Each stop keeps an id, so its row, its handle's selection and a scrub
  // follow it when it moves past another stop.
  let nextId = 0;
  let ids = value.gradient.stops.map(() => ++nextId);
  let selectedId = ids[0];
  const reconcileIds = () => {
    const count = value.gradient.stops.length;
    if (ids.length > count) ids = ids.slice(0, count);
    while (ids.length < count) ids = [...ids, ++nextId];
    if (!ids.includes(selectedId)) selectedId = ids[0];
  };
  const entries = (): Entry[] => value.gradient.stops.map((stop, i) => ({ id: ids[i], stop }));
  const selectedIndex = () => Math.max(0, ids.indexOf(selectedId));
  /** Replaces the stops, sorted with their ids. */
  const commitEntries = (list: Entry[], select = selectedId) => {
    const sorted = list.map((entry, i) => ({ entry, i })).sort((a, b) => a.entry.stop.at - b.entry.stop.at || a.i - b.i).map(({ entry }) => entry);
    ids = sorted.map(entry => entry.id);
    selectedId = ids.includes(select) ? select : ids[0];
    setGradient({ ...value.gradient, stops: sorted.map(entry => entry.stop) });
  };
  const updateStop = (id: number, patch: Partial<GradientStop>) => {
    commitEntries(entries().map(entry => entry.id === id ? { id, stop: { ...entry.stop, ...patch } } : entry));
  };
  const addStop = (at: number) => {
    if (value.gradient.stops.length >= MAX_GRADIENT_STOPS) return;
    const position = Number(clamp(at, 0, 100).toFixed(2));
    const entry = { id: ++nextId, stop: { at: position, color: gradientColorAt(value.gradient.stops, position) } };
    commitEntries([...entries(), entry], entry.id);
  };
  const removeStop = (id: number) => {
    if (value.gradient.stops.length <= MIN_GRADIENT_STOPS) return;
    const list = entries();
    const index = list.findIndex(entry => entry.id === id);
    // Removing the selected stop selects its neighbour.
    const select = id === selectedId ? (list[index - 1] ?? list[index + 1]).id : selectedId;
    commitEntries(list.filter(entry => entry.id !== id), select);
  };
  const select = (id: number) => {
    if (id === selectedId) return;
    selectedId = id;
    renderSelection();
  };
  addButton.addEventListener('click', () => addStop(widestGapMiddle(value.gradient.stops)));

  // A press on a handle drags its stop; a press on the strip adds a stop there
  // and drags it. Pulled far enough off the strip, a stop is removed on release.
  let handles: HTMLButtonElement[] = [];
  let stems: HTMLSpanElement[] = [];
  let drag: { pointer: number; id: number; x: number; y: number; moved: boolean; off: boolean } | undefined;
  // Positions run across the handle layer, which the CSS insets as it does
  // the track, so a handle stands where a press would put its stop.
  const fractionAt = (clientX: number) => {
    const rect = handleLayer.getBoundingClientRect();
    return rect.width ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0;
  };
  const startDrag = (event: PointerEvent, moved: boolean) => {
    // A pointer that is no longer down cannot be held, so no drag starts.
    try { bar.setPointerCapture(event.pointerId); } catch { return; }
    drag = { pointer: event.pointerId, id: selectedId, x: event.clientX, y: event.clientY, moved, off: false };
    bar.dataset.dragging = 'true';
  };
  const endDrag = (event?: PointerEvent, release = false) => {
    if (!drag || (event && event.pointerId !== drag.pointer)) return;
    const { pointer, id, off } = drag;
    drag = undefined;
    delete bar.dataset.dragging;
    if (bar.hasPointerCapture(pointer)) bar.releasePointerCapture(pointer);
    if (release && off) removeStop(id);
    else render();
  };
  bar.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drag) return;
    event.preventDefault();
    const handle = (event.target as Element).closest<HTMLButtonElement>('.dialkit-background-handle');
    if (handle) {
      select(ids[handles.indexOf(handle)]);
      handle.focus({ preventScroll: true });
      startDrag(event, false);
      return;
    }
    if (value.gradient.stops.length >= MAX_GRADIENT_STOPS) return;
    addStop(Math.round(fractionAt(event.clientX) * 100));
    handles[selectedIndex()]?.focus({ preventScroll: true });
    startDrag(event, true);
  });
  bar.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const rect = bar.getBoundingClientRect();
    drag.off = Math.max(rect.top - event.clientY, event.clientY - rect.bottom) > REMOVE_DISTANCE && value.gradient.stops.length > MIN_GRADIENT_STOPS;
    updateStop(drag.id, { at: Math.round(fractionAt(event.clientX) * 100) });
    handles[selectedIndex()]?.focus({ preventScroll: true });
  });
  bar.addEventListener('pointerup', event => endDrag(event, true));
  bar.addEventListener('pointercancel', event => endDrag(event));
  bar.addEventListener('lostpointercapture', event => endDrag(event));
  // A double click on a handle opens its stop's color picker.
  bar.addEventListener('dblclick', event => {
    const handle = document.elementsFromPoint(event.clientX, event.clientY).find(el => el.classList.contains('dialkit-background-handle'));
    const row = handle ? rows.get(ids[handles.indexOf(handle as HTMLButtonElement)]) : undefined;
    row?.root.querySelector<HTMLButtonElement>('.dialkit-color-control:not([data-open]) .dialkit-color-swatch')?.click();
  });
  const buildHandles = () => {
    stems = value.gradient.stops.map(() => {
      const stem = element('span', 'dialkit-background-stem');
      stem.setAttribute('aria-hidden', 'true');
      return stem;
    });
    handles = value.gradient.stops.map(() => {
      const handle = element('button', 'dialkit-background-handle');
      handle.setAttribute('role', 'slider');
      handle.setAttribute('aria-valuemin', '0');
      handle.setAttribute('aria-valuemax', '100');
      handle.append(element('span', 'dialkit-background-handle-chip'));
      hint(handle, BG_HINTS.handle);
      handle.addEventListener('focus', () => select(ids[handles.indexOf(handle)]));
      handle.addEventListener('keydown', event => {
        if (event.altKey || event.metaKey || event.ctrlKey) return;
        const id = ids[handles.indexOf(handle)];
        const at = value.gradient.stops[handles.indexOf(handle)]?.at ?? 0;
        const step = event.shiftKey ? 10 : 1;
        const next = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? at - step
          : event.key === 'ArrowRight' || event.key === 'ArrowUp' ? at + step
            : event.key === 'Home' ? 0 : event.key === 'End' ? 100 : undefined;
        const remove = (event.key === 'Delete' || event.key === 'Backspace') && value.gradient.stops.length > MIN_GRADIENT_STOPS;
        if (next === undefined && !remove) return;
        event.preventDefault();
        event.stopPropagation();
        if (remove) removeStop(id);
        else updateStop(id, { at: clamp(Math.round(next!), 0, 100) });
        handles[selectedIndex()]?.focus({ preventScroll: true });
      });
      return handle;
    });
    handleLayer.replaceChildren(...stems, ...handles);
  };

  // Stop rows: a grip, the position, the color, its opacity, and a remove button.
  const rows = new Map<number, StopRow>();
  /** Removed rows, fading out where they stood. */
  const leaving = new Map<StopRow, Animation>();
  /** The slide or fade running on each block, and the place it heads to. */
  const slides = new Map<HTMLElement, { animation: Animation; to: number }>();
  /** The row whose position is being scrubbed keeps its place in the document. */
  let scrubbing: number | undefined;
  let rowDrag: { id: number; pointer: number; y: number; lifted: boolean; from: number; to: number; offset: number; step: number; base: Entry[] } | undefined;
  const buildRow = (id: number): StopRow => {
    const index = () => ids.indexOf(id);
    const stop = () => value.gradient.stops[index()];
    const rowRoot = element('div', 'dialkit-background-stop');
    rowRoot.addEventListener('pointerdown', () => select(id));
    rowRoot.addEventListener('focusin', () => select(id));
    const grip = iconButton('dialkit-background-stop-grip', `Reorder stop ${index() + 1}`, ICON_GRIP);
    grip.setAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown');
    // Just the dots, so the grip fits the margin left of the row.
    grip.firstElementChild!.setAttribute('viewBox', '9 0 6 24');
    grip.firstElementChild!.setAttribute('stroke-width', '3');
    hint(grip, BG_HINTS.grip);
    const position = field({
      unit: '%',
      label: `Stop ${index() + 1} position`,
      min: 0,
      max: 100,
      step: 1,
      read: () => stop()?.at ?? 0,
      write: at => updateStop(id, { at }),
      onScrub: active => { scrubbing = active ? id : undefined; },
    });
    position.root.classList.add('dialkit-background-stop-position');
    hint(position.root, BG_HINTS.position);
    const colorHost = element('div', 'dialkit-color-host dialkit-background-stop-color');
    const color = mountColorControl(colorHost, { label: `Stop ${index() + 1}`, value: stop().color, onChange: next => updateStop(id, { color: next }) });
    // The color's own opacity, so this field and the picker's Opacity track stay one value.
    const opacity = field({
      unit: '%',
      label: `Stop ${index() + 1} opacity`,
      min: 0,
      max: 100,
      step: 1,
      read: () => stop() ? colorOpacity(stop().color) : 100,
      write: n => updateStop(id, { color: withOpacity(stop().color, n) }),
    });
    opacity.root.classList.add('dialkit-background-stop-opacity');
    const remove = iconButton('dialkit-background-stop-remove', 'Remove stop', ICON_MINUS);
    remove.addEventListener('click', () => {
      removeStop(id);
      // Focus stays in the list, on the row now selected.
      const next = rows.get(selectedId);
      (next?.remove.disabled ? next.grip : next?.remove)?.focus({ preventScroll: true });
    });
    rowRoot.append(grip, position.root, colorHost, opacity.root, remove);
    const row = { id, root: rowRoot, grip, position, color, opacity, remove };
    bindRowDrag(row);
    return row;
  };

  // Rows reorder as the version list does: the dragged row follows the
  // pointer and the rows it passes slide aside. The positions stay where they
  // are and the colors move, live, so the strip follows the drag.
  const reorder = (base: Entry[], from: number, to: number) => {
    const moved = base.map(entry => entry.id);
    moved.splice(to, 0, ...moved.splice(from, 1));
    ids = moved;
    setGradient({ ...value.gradient, stops: moveStopColor(base.map(entry => entry.stop), from, to) });
  };
  const paintRowDrag = () => {
    if (!rowDrag) return;
    const { id, from, to, offset, step, base } = rowDrag;
    base.forEach((entry, k) => {
      const shift = entry.id === id ? offset
        : from < to && k > from && k <= to ? -step
          : to < from && k >= to && k < from ? step : 0;
      const row = rows.get(entry.id);
      if (row) row.root.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  };
  const finishRowDrag = () => {
    if (!rowDrag) return;
    rowDrag = undefined;
    delete stopList.dataset.dragging;
    // Rendered while the rows still stand where the drag drew them, so each slides home from there.
    render();
    rows.forEach(row => { row.root.style.transform = ''; delete row.root.dataset.dragging; });
  };
  function bindRowDrag(row: StopRow) {
    row.grip.addEventListener('pointerdown', event => {
      if (event.button !== 0 || rowDrag) return;
      event.preventDefault();
      rowDrag = { id: row.id, pointer: event.pointerId, y: event.clientY, lifted: false, from: ids.indexOf(row.id), to: ids.indexOf(row.id), offset: 0, step: 0, base: entries() };
      row.grip.setPointerCapture(event.pointerId);
    });
    row.grip.addEventListener('pointermove', event => {
      if (!rowDrag || rowDrag.id !== row.id || rowDrag.pointer !== event.pointerId) return;
      const dy = event.clientY - rowDrag.y;
      if (!rowDrag.lifted) {
        if (Math.abs(dy) <= DRAG_THRESHOLD) return;
        rowDrag.lifted = true;
        // The rows a drag moves stand at their places, with no slide left running.
        rowDrag.base.forEach(entry => stopSlide(rows.get(entry.id)!.root));
        const [first, second] = rowDrag.base.map(entry => rows.get(entry.id)!.root.getBoundingClientRect());
        rowDrag.step = second ? second.top - first.top : first.height;
        stopList.dataset.dragging = 'true';
        row.root.dataset.dragging = 'true';
      }
      const count = rowDrag.base.length;
      rowDrag.offset = clamp(dy, -rowDrag.from * rowDrag.step, (count - 1 - rowDrag.from) * rowDrag.step);
      const to = clamp(Math.round(rowDrag.from + rowDrag.offset / rowDrag.step), 0, count - 1);
      if (to !== rowDrag.to) {
        rowDrag.to = to;
        reorder(rowDrag.base, rowDrag.from, to);
      }
      paintRowDrag();
    });
    const release = (event: PointerEvent) => {
      if (rowDrag?.id === row.id && rowDrag.pointer === event.pointerId) finishRowDrag();
    };
    row.grip.addEventListener('pointerup', release);
    row.grip.addEventListener('pointercancel', release);
    row.grip.addEventListener('lostpointercapture', release);
    row.grip.addEventListener('keydown', event => {
      if (!event.altKey || event.metaKey || event.ctrlKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      const from = ids.indexOf(row.id);
      const to = from + (event.key === 'ArrowUp' ? -1 : 1);
      if (to < 0 || to >= ids.length) return;
      reorder(entries(), from, to);
      row.grip.focus({ preventScroll: true });
    });
  }
  /**
   * Puts the rows in the stops' order around one row that stays where it is:
   * the scrubbed row, else the focused one. Moving a node would drop its
   * pointer capture and its focus.
   */
  const placeRows = () => {
    const list = ids.map(id => rows.get(id)!);
    const active = document.activeElement;
    const held = list.find(row => row.id === scrubbing) ?? list.find(row => row.root.contains(active)) ?? list[0];
    if (!held.root.parentNode) stopList.append(held.root);
    const at = list.indexOf(held);
    for (let i = at - 1, next = held.root; i >= 0; next = list[i--].root) {
      if (list[i].root.nextElementSibling !== next) stopList.insertBefore(list[i].root, next);
    }
    for (let i = at + 1, previous = held.root; i < list.length; previous = list[i++].root) {
      if (previous.nextElementSibling !== list[i].root) previous.after(list[i].root);
    }
  };
  const dropRow = (row: StopRow) => {
    leaving.delete(row);
    slides.delete(row.root);
    row.color.destroy();
    row.root.remove();
  };
  /** Adds rows for new stops, and takes away the rows of removed ones; returns the new rows. */
  const syncRows = (before?: Layout) => {
    for (const [id, row] of rows) {
      if (ids.includes(id)) continue;
      rows.delete(id);
      const top = before?.tops.get(row.root);
      stopSlide(row.root);
      if (top === undefined) { dropRow(row); continue; }
      // A removed row fades out over the list where it stood, out of the
      // layout, with its color picker closed.
      row.color.close();
      row.root.inert = true;
      row.root.setAttribute('aria-hidden', 'true');
      row.root.dataset.leaving = 'true';
      row.root.style.top = `${top}px`;
      stopList.append(row.root);
      const fade = layoutSpring(row.root, p => ({ opacity: String(clamp(1 - p, 0, 1)), transform: `scale(${1 - 0.04 * clamp(p, 0, 1)})` }));
      if (!fade) { dropRow(row); continue; }
      leaving.set(row, fade);
      fade.onfinish = () => dropRow(row);
    }
    const entering: StopRow[] = [];
    for (const id of ids) {
      if (rows.has(id)) continue;
      const row = buildRow(id);
      rows.set(id, row);
      entering.push(row);
    }
    if (!rowDrag) placeRows();
    return entering;
  };
  const renderSelection = () => {
    const index = selectedIndex();
    // The selected handle stands above the others where they overlap.
    handles.forEach((handle, i) => {
      handle.toggleAttribute('data-selected', i === index);
      handle.style.zIndex = i === index ? '2' : '1';
    });
    stems.forEach((stem, i) => stem.toggleAttribute('data-selected', i === index));
    rows.forEach(row => row.root.toggleAttribute('data-selected', row.id === selectedId));
  };

  // Saved gradients belong to the panel; any background control in it shows them.
  let savedSignature = '';
  const renderSaved = () => {
    const saved = DialStore.getSavedGradients(props.panelId);
    const signature = JSON.stringify(saved);
    if (signature !== savedSignature) {
      savedSignature = signature;
      savedList.replaceChildren(...saved.map(({ id, gradient }, i) => {
        const item = element('div', 'dialkit-background-saved-item');
        const swatch = element('button', 'dialkit-background-saved-swatch');
        swatch.setAttribute('aria-label', `Use saved gradient ${i + 1}`);
        swatch.style.setProperty('--dial-gradient', backgroundGradientCss(gradient));
        swatch.addEventListener('click', () => emit({ ...value, mode: 'gradient', gradient: cloneGradient(gradient) }));
        hint(swatch, BG_HINTS.saved);
        const remove = iconButton('dialkit-background-saved-delete', `Delete saved gradient ${i + 1}`, ICON_CLOSE);
        hint(remove, BG_HINTS.savedDelete);
        remove.addEventListener('click', () => DialStore.deleteGradient(props.panelId, id));
        item.append(swatch, remove);
        return item;
      }));
    }
    savedList.hidden = saved.length === 0;
    saved.forEach(({ gradient }, i) => savedList.children[i]?.firstElementChild?.setAttribute('aria-pressed', String(sameGradient(gradient, value.gradient))));
  };
  saveButton.addEventListener('click', () => DialStore.saveGradient(props.panelId, value.gradient));
  // A saved gradient renders the whole control, so the row it adds or takes
  // away springs with the control's height.
  const onStore = () => {
    if (JSON.stringify(DialStore.getSavedGradients(props.panelId)) !== savedSignature) render();
  };
  let unsubscribe = DialStore.subscribe(props.panelId, onStore);

  // Media: a drop zone until a file is set, then its preview, which opens the options.
  const mediaPane = element('div', 'dialkit-background-pane dialkit-background-media');
  const fileInput = element('input', 'dialkit-background-file');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,video/*';
  fileInput.hidden = true;
  const drop = element('button', 'dialkit-background-drop');
  const dropText = element('span', '');
  drop.append(icon(ICON_UPLOAD), dropText);
  hint(drop, BG_HINTS.drop);
  const preview = element('button', 'dialkit-background-media-preview');
  preview.setAttribute('aria-label', 'Media options');
  preview.setAttribute('aria-haspopup', 'dialog');
  preview.setAttribute('aria-expanded', 'false');
  // The media's crop, as large as the preview's 16:9 box holds at its ratio.
  const frame = element('span', 'dialkit-background-media-frame');
  hint(preview, BG_HINTS.preview);
  const badge = element('span', 'dialkit-background-media-badge');
  badge.setAttribute('aria-hidden', 'true');
  preview.append(frame, badge);
  const actions = element('div', 'dialkit-background-media-actions');
  const replaceButton = element('button', 'dialkit-button', 'Replace');
  const removeButton = element('button', 'dialkit-button', 'Remove');
  actions.append(replaceButton, removeButton);
  const status = element('div', 'dialkit-background-status');
  status.setAttribute('role', 'status');
  mediaPane.append(drop, preview, actions, status, fileInput);

  let loading = false;
  let request = 0;
  let shownMedia = '';
  const setStatus = (text: string) => { status.textContent = text; status.hidden = !text; };
  const readFile = (file: File) => new Promise<string>((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) { reject(new Error('Choose a file smaller than 10 MB.')); return; }
    const reader = new FileReader();
    reader.addEventListener('load', () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error()));
    reader.addEventListener('error', () => reject(new Error()));
    reader.readAsDataURL(file);
  });
  const acceptFile = async (file: File | undefined) => {
    if (!file || loading) return;
    const kind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : undefined;
    if (!kind) { setStatus('Choose an image or a video file.'); return; }
    const current = ++request;
    loading = true;
    setStatus('');
    render();
    try {
      const src = await (props.upload ?? readFile)(file);
      if (current !== request) return;
      loading = false;
      // The file lands in the Media tab even if another tab was picked meanwhile.
      emit({ ...value, media: { src, kind } });
    } catch (error) {
      if (current !== request) return;
      setStatus(error instanceof Error && error.message ? error.message : 'This file could not be opened. Try another one.');
    } finally {
      if (current === request && !destroyed) { loading = false; render(); }
    }
  };
  const chooseFile = () => { if (!loading) fileInput.click(); };
  drop.addEventListener('click', chooseFile);
  replaceButton.addEventListener('click', chooseFile);
  removeButton.addEventListener('click', () => {
    closeOptions();
    emit({ ...value, media: null });
    drop.focus({ preventScroll: true });
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    void acceptFile(file);
  });
  mediaPane.addEventListener('dragover', event => {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    mediaPane.dataset.dragging = 'true';
  });
  mediaPane.addEventListener('dragleave', event => {
    if (!mediaPane.contains(event.relatedTarget as Node)) delete mediaPane.dataset.dragging;
  });
  mediaPane.addEventListener('drop', event => {
    event.preventDefault();
    delete mediaPane.dataset.dragging;
    void acceptFile(event.dataTransfer?.files[0]);
  });
  // The preview crops the media to its ratio and fills the crop with the
  // media as `backgroundMediaCss` writes it.
  let mediaElement: HTMLElement | undefined;
  // The media's own shape, for Source, once it has loaded.
  let sourceRatio: number | undefined;
  const renderMedia = () => {
    const media = value.media;
    const key = media ? `${media.kind}:${media.src}` : '';
    if (key !== shownMedia) {
      shownMedia = key;
      sourceRatio = undefined;
      mediaElement?.remove();
      mediaElement = undefined;
      const measured = (width: number, height: number) => {
        if (shownMedia !== key || !width || !height) return;
        sourceRatio = width / height;
        renderMedia();
      };
      if (media?.kind === 'video') {
        const video = mediaElement = element('video', 'dialkit-background-media-element');
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.autoplay = true;
        video.addEventListener('loadedmetadata', () => measured(video.videoWidth, video.videoHeight));
        video.src = media.src;
      } else if (media) {
        mediaElement = element('span', 'dialkit-background-media-element');
        const image = new Image();
        image.addEventListener('load', () => measured(image.naturalWidth, image.naturalHeight));
        image.src = media.src;
      }
      if (mediaElement) frame.append(mediaElement);
    }
    if (!media || !mediaElement) return;
    const { ratio } = value.mediaDisplay;
    const [w, h] = ratio === 'source' ? [sourceRatio ?? 16 / 9, 1] : ratio.split(':').map(Number);
    // Width and height as shares of the box inside the preview's border,
    // centred in it.
    const box = preview.clientWidth / preview.clientHeight || 16 / 9;
    const width = Math.min(1, (w / h) / box) * 100;
    const height = Math.min(1, box / (w / h)) * 100;
    Object.assign(frame.style, { width: `${width}%`, height: `${height}%`, left: `${(100 - width) / 2}%`, top: `${(100 - height) / 2}%` });
    mediaElement.removeAttribute('style');
    for (const [property, css] of Object.entries(backgroundMediaCss(media, value.mediaDisplay))) mediaElement.style.setProperty(property, css);
  };

  // The media options, placed and dismissed like the color picker.
  const setDisplay = (patch: Partial<BackgroundMediaDisplay>) => emit({ ...value, mediaDisplay: { ...value.mediaDisplay, ...patch } });
  let popup: HTMLDivElement | undefined;
  let stopOptions: (() => void) | undefined;
  let syncOptions = () => {};
  const outside = (event: Event) => {
    if (!popup?.contains(event.target as Node) && !preview.contains(event.target as Node)) closeOptions();
  };
  function closeOptions(restoreFocus = false) {
    stopOptions?.();
    stopOptions = undefined;
    popup?.remove();
    popup = undefined;
    syncOptions = () => {};
    delete preview.dataset.open;
    preview.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside);
    document.removeEventListener('focusin', outside);
    if (restoreFocus) preview.focus({ preventScroll: true });
  }
  const openOptions = (event: MouseEvent) => {
    if (popup) { closeOptions(); return; }
    const portal = getDialKitPortalRoot(host) ?? host;
    const shell = popup = element('div', 'dialkit-background-popover');
    shell.style.position = 'fixed';
    shell.tabIndex = -1;
    shell.setAttribute('role', 'dialog');
    shell.setAttribute('aria-label', `${props.label} media options`);
    const section = (title: string, control: HTMLElement) => {
      const wrap = element('div', 'dialkit-background-popover-section');
      wrap.append(element('div', 'dialkit-background-popover-label', title), control);
      shell.append(wrap);
      return wrap;
    };
    const fits = segmentedControl('dialkit-background-fits', 'Sizing', MEDIA_FITS.map(fit => ({ value: fit, label: FIT_LABELS[fit] })), fit => setDisplay({ fit }));
    fits.buttons.forEach((button, i) => hint(button, BG_HINTS.fit[MEDIA_FITS[i]]));
    hint(section('Sizing', fits.root), BG_HINTS.sizing);
    // Tile Size and Zoom are the panel's slider, as a range control draws it;
    // Tile Size reads as a percent of the box's height.
    const tileSizeWrap = element('div', 'dialkit-background-tile-size');
    const tileSizeProps = () => ({
      label: 'Tile Size',
      unit: '%',
      min: Math.round(MEDIA_TILE_SIZE.min * 100),
      max: Math.round(MEDIA_TILE_SIZE.max * 100),
      step: Math.round(MEDIA_TILE_SIZE.step * 100),
      value: Math.round(value.mediaDisplay.tileSize * 100),
      seekOnPress: true,
      hint: BG_HINTS.tileSize,
      onChange: (size: number) => setDisplay({ tileSize: size / 100 }),
    });
    const tileSize = mountSlider(tileSizeWrap, tileSizeProps());
    shell.append(tileSizeWrap);
    const tileSizeRow = revealRow(tileSizeWrap);
    const ratios = segmentedControl('dialkit-background-ratios', 'Ratio', MEDIA_RATIOS.map(ratio => ratio === 'source'
      ? { value: ratio, label: 'Source', icon: icon(ICON_SOURCE) }
      : { value: ratio, label: ratio }), ratio => setDisplay({ ratio }));
    ratios.buttons.forEach((button, i) => hint(button, BG_HINTS.ratio(MEDIA_RATIOS[i])));
    hint(section('Ratio', ratios.root), BG_HINTS.ratioSection);
    const zoomProps = () => ({ label: 'Zoom', unit: '×', ...MEDIA_ZOOM, value: value.mediaDisplay.zoom, seekOnPress: true, hint: BG_HINTS.zoom, onChange: (zoom: number) => setDisplay({ zoom }) });
    const zoom = mountSlider(shell, zoomProps());
    const grid = element('div', 'dialkit-background-position');
    grid.setAttribute('role', 'radiogroup');
    grid.setAttribute('aria-label', 'Pin');
    const pill = element('span', 'dialkit-background-position-pill');
    pill.setAttribute('aria-hidden', 'true');
    grid.append(pill);
    const cells = ROWS.flatMap((y, row) => COLUMNS.map((x, column) => {
      const cell = element('button', 'dialkit-background-position-cell');
      cell.setAttribute('role', 'radio');
      cell.setAttribute('aria-label', `${ROW_NAMES[row]}, ${COLUMN_NAMES[column]}`);
      cell.append(element('span', 'dialkit-background-position-dot'));
      cell.addEventListener('click', () => setDisplay({ position: { x, y } }));
      grid.append(cell);
      return cell;
    }));
    grid.addEventListener('keydown', event => {
      const move = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[event.key];
      if (!move || event.altKey || event.metaKey || event.ctrlKey) return;
      event.preventDefault();
      event.stopPropagation();
      const { x, y } = value.mediaDisplay.position;
      const column = clamp(COLUMNS.indexOf(x) + move[0], 0, 2);
      const row = clamp(ROWS.indexOf(y) + move[1], 0, 2);
      setDisplay({ position: { x: COLUMNS[column], y: ROWS[row] } });
      cells[row * 3 + column].focus({ preventScroll: true });
    });
    hint(section('Pin', grid), BG_HINTS.pin);
    syncOptions = () => {
      const display = value.mediaDisplay;
      fits.set(display.fit);
      tileSizeRow.set(display.fit === 'tile');
      tileSize.update(tileSizeProps());
      ratios.set(display.ratio);
      zoom.update(zoomProps());
      const picked = ROWS.indexOf(display.position.y) * 3 + COLUMNS.indexOf(display.position.x);
      pill.style.transform = `translate(${picked % 3 * 100}%, ${Math.floor(picked / 3) * 100}%)`;
      cells.forEach((cell, i) => {
        cell.setAttribute('aria-checked', String(i === picked));
        cell.tabIndex = i === picked ? 0 : -1;
      });
    };
    shell.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeOptions(true); return; }
      // Tab past either end closes the options onto the preview.
      if (event.key === 'Tab') {
        const stops = Array.from(shell.querySelectorAll<HTMLElement>('button, input, [tabindex="0"]')).filter(el => el.tabIndex >= 0 && el.getClientRects().length > 0);
        if ((event.shiftKey && document.activeElement === stops[0]) || (!event.shiftKey && document.activeElement === stops[stops.length - 1])) {
          event.preventDefault();
          closeOptions(true);
          return;
        }
      }
      event.stopPropagation();
    });
    portal.append(shell);
    syncOptions();
    const stopPosition = observeDropdownPosition(preview, () => {
      if (!popup) return;
      if (!host.isConnected || !preview.getClientRects().length) { closeOptions(); return; }
      // The options hang in the top layer, where a host's zoom (a scale on an
      // ancestor) does not reach them: they take the preview's scale on
      // screen, and dock beside the panel as drawn.
      const scale = preview.getBoundingClientRect().width / preview.offsetWidth || 1;
      const p = getDropdownPosition(preview, portal, { dropdownHeight: popup.scrollHeight + 2, width: 280, maxHeight: 480, preferSide: true, fixed: true, gap: 8, scale });
      Object.assign(popup.style, { width: `${p.width / scale}px`, maxHeight: `${p.maxHeight / scale}px`, scale: scale === 1 ? '' : String(scale), transformOrigin: p.above ? 'bottom' : 'top' });
      // The scale grows the box around its origin (the middle of its top or
      // bottom edge); place the box so the scaled one lands at p.
      const width = popup.offsetWidth;
      const height = popup.offsetHeight;
      Object.assign(popup.style, { left: `${p.left - width * (1 - scale) / 2}px`, top: `${p.top - (p.above ? height * (1 - scale) : 0)}px` });
    }, () => popup);
    stopOptions = () => { stopPosition(); tileSizeRow.cancel(); tileSize.destroy(); zoom.destroy(); fits.disconnect(); ratios.disconnect(); };
    preview.dataset.open = 'true';
    preview.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    // A click focuses the options themselves; a keyboard open starts on the picked sizing.
    if (event.detail > 0) shell.focus({ preventScroll: true });
    else shell.querySelector<HTMLElement>('.dialkit-background-fits [data-active="true"]')?.focus({ preventScroll: true });
  };
  preview.addEventListener('click', openOptions);

  root.append(solidPane, gradientPane, mediaPane);
  host.append(root);

  // Layout changes spring instead of jumping (LAYOUT_SPRING): the control's
  // height follows its content, a pane shown by a tab fades in, a new stop's
  // row fades in, a removed one fades out where it stood, and the rows and
  // blocks that change place slide there, a sliding row solid above the rest. Positions are read from
  // the control's top, so a change above it never reads as a move.
  const panes = { solid: solidPane, gradient: gradientPane, media: mediaPane };
  let shownMode: BackgroundMode | undefined;
  let height: { animation: Animation; to: number } | undefined;
  let paneFade: Animation | undefined;
  const blocks = () => [...Object.values(panes).flatMap(pane => [...pane.children] as HTMLElement[]).filter(el => el !== stopList), ...[...rows.values()].map(row => row.root)];
  // Layout positions, not screen ones: a scaled or zoomed ancestor changes
  // what a rect reads but not where a block sits, so neither reads as a move.
  // They also leave out the transforms of the slides already running.
  const topIn = (el: HTMLElement) => {
    let top = 0;
    let node: Element | null = el;
    while (node instanceof HTMLElement && node !== root) {
      top += node.offsetTop;
      node = node.offsetParent;
    }
    return top;
  };
  const measure = (): Layout | undefined => {
    if (!shownMode || !root.getClientRects().length) return;
    const tops = new Map<HTMLElement, number>();
    for (const el of blocks()) if (el.getClientRects().length) tops.set(el, topIn(el));
    return { height: root.offsetHeight, mode: shownMode, tops };
  };
  function stopSlide(el: HTMLElement) {
    slides.get(el)?.animation.cancel();
    slides.delete(el);
  }
  const slide = (el: HTMLElement, from: number) => {
    const to = topIn(el);
    // Already heading there: a drag renders on every move, and restarting the slide would make it crawl.
    const running = slides.get(el);
    if (running?.to === to && running.animation.playState === 'running') return;
    stopSlide(el);
    const offset = from - to;
    if (Math.abs(offset) < 0.5) return;
    const animation = layoutSpring(el, p => ({ transform: `translateY(${offset * (1 - p)}px)` }));
    if (!animation) return;
    slides.set(el, { animation, to });
    // A sliding row is solid and above the still ones, so rows that pass each
    // other, or a removed row fading where it stood, never show through it.
    if (!el.classList.contains('dialkit-background-stop')) return;
    el.dataset.moving = 'true';
    const settle = () => {
      const now = slides.get(el)?.animation;
      if (!now || now === animation || now.playState !== 'running') delete el.dataset.moving;
    };
    animation.addEventListener('finish', settle);
    animation.addEventListener('cancel', settle);
  };
  const springHeight = (from: number) => {
    const pane = panes[value.mode];
    const to = pane.offsetTop + pane.offsetHeight;
    if (height?.to === to && height.animation.playState === 'running') return;
    height?.animation.cancel();
    height = undefined;
    delete root.dataset.resizing;
    if (Math.abs(from - to) < 0.5) return;
    const animation = layoutSpring(root, p => ({ height: `${from + (to - from) * p}px` }));
    if (!animation) return;
    root.dataset.resizing = 'true';
    height = { animation, to };
    animation.onfinish = () => {
      if (height?.animation !== animation) return;
      height = undefined;
      delete root.dataset.resizing;
    };
  };
  const animateLayout = (before: Layout, entering: StopRow[]) => {
    if (value.mode !== before.mode) {
      paneFade?.cancel();
      paneFade = layoutSpring(panes[value.mode], p => ({ opacity: String(clamp(p, 0, 1)) }), 0);
    } else {
      if (!rowDrag) for (const el of blocks()) {
        const from = before.tops.get(el);
        if (from !== undefined && el.getClientRects().length) slide(el, from);
      }
      for (const row of entering) {
        const animation = layoutSpring(row.root, p => ({ opacity: String(clamp(p, 0, 1)), transform: `scale(${0.96 + 0.04 * clamp(p, 0, 1)})` }));
        if (animation) slides.set(row.root, { animation, to: topIn(row.root) });
      }
    }
    springHeight(before.height);
  };

  function render() {
    if (destroyed) return;
    const before = measure();
    modes.root.setAttribute('aria-label', `${props.label} type`);
    modes.set(value.mode);
    solidPane.hidden = value.mode !== 'solid';
    gradientPane.hidden = value.mode !== 'gradient';
    mediaPane.hidden = value.mode !== 'media';
    if (value.mode !== 'gradient') closeShapeMenu();
    if (value.mode !== 'media' || !value.media) closeOptions();
    solid.update(solidProps());

    const stops = value.gradient.stops;
    reconcileIds();
    shapeValue.textContent = SHAPE_LABELS[value.gradient.shape];
    shapeMenu?.querySelectorAll<HTMLElement>('.dialkit-select-option').forEach((option, i) => { option.dataset.selected = String(GRADIENT_SHAPES[i] === value.gradient.shape); });
    if (!gradientPane.hidden) paintTrack();
    if (handles.length !== stops.length) buildHandles();
    handles.forEach((handle, i) => {
      const stop = stops[i];
      handle.style.setProperty('--dial-stop-at', `${stop.at}%`);
      handle.style.setProperty('--dial-color', stop.color);
      stems[i].style.setProperty('--dial-stop-at', `${stop.at}%`);
      handle.setAttribute('aria-label', `Stop ${i + 1}`);
      handle.setAttribute('aria-valuenow', String(stop.at));
      handle.setAttribute('aria-valuetext', `${stop.at}%, ${stop.color}`);
      handle.toggleAttribute('data-off', drag?.off === true && ids[i] === drag.id);
    });
    bar.toggleAttribute('data-full', stops.length >= MAX_GRADIENT_STOPS);
    const entering = syncRows(before);
    ids.forEach((id, i) => {
      const row = rows.get(id)!;
      row.position.input.setAttribute('aria-label', `Stop ${i + 1} position`);
      row.position.sync();
      row.grip.setAttribute('aria-label', `Reorder stop ${i + 1}`);
      row.grip.title = `Reorder stop ${i + 1}`;
      row.color.update({ label: `Stop ${i + 1}`, value: stops[i].color, onChange: next => updateStop(id, { color: next }) });
      row.opacity.input.setAttribute('aria-label', `Stop ${i + 1} opacity`);
      row.opacity.sync();
      row.remove.disabled = stops.length <= MIN_GRADIENT_STOPS;
      row.remove.setAttribute('aria-label', `Remove stop ${i + 1}`);
    });
    renderSelection();
    addButton.disabled = stops.length >= MAX_GRADIENT_STOPS;
    renderSaved();

    const media = value.media;
    drop.hidden = !!media;
    drop.disabled = loading;
    dropText.textContent = loading ? 'Loading…' : 'Upload or drop an image or a video';
    preview.hidden = actions.hidden = !media;
    replaceButton.disabled = removeButton.disabled = loading;
    renderMedia();
    const display = value.mediaDisplay;
    const fit = display.fit === 'tile' ? `Tile ${Math.round(display.tileSize * 100)}%` : FIT_LABELS[display.fit];
    badge.textContent = `${fit} · ${display.ratio === 'source' ? 'Source' : display.ratio} · ${display.zoom}×`;
    if (!status.textContent) status.hidden = true;
    syncOptions();
    if (before) animateLayout(before, entering);
    shownMode = value.mode;
  }
  render();

  return {
    update(next: BackgroundControlProps) {
      if (next.panelId !== props.panelId) {
        unsubscribe();
        unsubscribe = DialStore.subscribe(next.panelId, onStore);
      }
      props = next;
      const incoming = normalizeBackgroundValue(next.value);
      if (!sameBackgroundValue(incoming, value)) {
        // An outside change under a drag ends the drag without writing.
        endDrag();
        finishRowDrag();
        value = incoming;
      }
      render();
    },
    destroy() {
      destroyed = true;
      request++;
      unsubscribe();
      resize?.disconnect();
      endDrag();
      closeShapeMenu();
      closeOptions();
      modes.disconnect();
      // Nothing left running calls back into a control that is gone.
      slides.forEach(({ animation }) => animation.cancel());
      height?.animation.cancel();
      paneFade?.cancel();
      solid.destroy();
      rows.forEach(row => row.color.destroy());
      leaving.forEach((fade, row) => { fade.cancel(); dropRow(row); });
      hints.destroy();
      root.remove();
    },
  };
}
