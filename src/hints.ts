import { DialStore, type ControlMeta } from './store/DialStore';

type Listener = () => void;

/** `y` is the hint's edge that faces its row: its bottom when above, its top when below. */
export type HintPosition = { left: number; y: number; above: boolean };

type Box = { left: number; top: number; right?: number; bottom: number };

const HINT_KEY = 'h';
const TIP_KEY = 'dialkit-hint-tip-seen';
const GAP = 6;
const MARGIN = 8;
/** How long the dim takes to fade back. Matches theme.css. */
const FADE_MS = 120;
const FOCUSABLE = 'button, input, select, textarea, [tabindex]';
/** Buttons in one toolbar share its left edge, so the hint does not jump between them. */
const ALIGN = '.dialkit-panel-toolbar, .dialkit-panel-section-toolbar';

/**
 * The hints of DialKit's own parts. They show with no setup, like a
 * control's own hint.
 */
export const HINTS = {
  panel: 'Closes the panel to a small button. Click the button to open it again.',
  versions: 'Switches to another version. Delete a version from the list.',
  copy: "Copies the panel's values as text, ready to paste into code.",
  saveVersion: 'Saves the current values as a new version, with a picture of the page.',
  version: 'Switches to this version. Double-click its name to rename it.',
  deleteVersion: 'Deletes this version.',
  allVersions: 'Shows every version side by side. Click one to switch to it.',
  transitionType: 'Easing: a curve over a set duration. Time: a spring set by its duration and bounce. Physics: a spring set by its stiffness, damping and mass.',
  easingDuration: 'How long the curve takes, in seconds.',
  springDuration: 'How long the spring takes to settle, in seconds.',
  bounce: 'How far the motion overshoots and swings back. 0 has no bounce.',
  stiffness: 'How hard the spring pulls toward its target. Higher is faster.',
  damping: 'How fast the spring slows down. Lower swings more.',
  mass: 'How heavy the moving thing is. Higher is slower and swings more.',
  colorPlane: 'Drag to change how light and how strong the color is.',
  colorHue: 'Drag to change the hue.',
  colorOpacity: 'Drag to change how see-through the color is.',
  imageUpload: 'Adds an image from your computer.',
  imageClear: 'Removes the image.',
} as const;

/**
 * Whether this browser has seen a hint yet, shared by every panel. Until
 * then, every panel ends with a tip that points to the hint key.
 */
class HintStoreClass {
  private tipSeen = false;
  private listeners = new Set<Listener>();

  /** True once a hint has shown in this browser, and on the server. */
  isTipSeen(): boolean {
    if (this.tipSeen || typeof window === 'undefined') return true;
    try {
      return window.localStorage.getItem(TIP_KEY) === '1';
    } catch {
      return false;
    }
  }

  /** Called when the key is released after a hint: the tip has done its job. */
  markTipSeen(): void {
    if (this.tipSeen) return;
    this.tipSeen = true;
    try {
      window.localStorage.setItem(TIP_KEY, '1');
    } catch {
      // Without storage, the tip stays hidden for this page only.
    }
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const HintStore = /* @__PURE__ */ new HintStoreClass();

/** Whether any action button in the tree has a hint: those are ControlRenderer's own rows. */
export function hasActionHints(controls: ControlMeta[]): boolean {
  return controls.some((control) => (control.type === 'action' && !!control.hint) || (!!control.children && hasActionHints(control.children)));
}

function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
}

/**
 * Whether a key press holds the hint key, H. Typing in a field, a press with
 * a modifier, and a shortcut assigned to H all leave it alone.
 */
export function isHintKey(event: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'target'>): boolean {
  if (event.key?.toLowerCase() !== HINT_KEY) return false;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
  if (isEditable(event.target)) return false;
  return !DialStore.resolveShortcutTarget(HINT_KEY);
}

/**
 * Where a hint sits, relative to its root: above the row on its left edge,
 * below it when there is no room above, and inside the viewport. It is
 * placed by the edge that faces the row, so a sentence of another height
 * grows away from the row.
 */
export function getHintPosition(
  row: Box,
  root: Pick<Box, 'left' | 'top'>,
  size: { width: number; height: number },
  viewport: { width: number; height: number }
): HintPosition {
  const above = row.top - GAP - size.height >= MARGIN;
  const left = Math.max(MARGIN, Math.min(row.left, viewport.width - size.width - MARGIN));
  const y = above ? row.top - GAP : row.bottom + GAP;
  return { left: left - root.left, y: y - root.top, above };
}

/**
 * The areas a hint dims, nearest first: an open picker, the panel's outer
 * box (its root folder inside can be taller and scroll), the root folder.
 * Without one, the root of a custom layout dims.
 */
const DIM_AREAS = ['.dialkit-color-popover', '.dialkit-image-popover', '.dialkit-panel-inner', '.dialkit-folder-root'];

function areaOf(row: HTMLElement): HTMLElement | null {
  for (const selector of DIM_AREAS) {
    const area = row.closest<HTMLElement>(selector);
    if (area) return area;
  }
  // A row of an open menu, drawn away from its panel, that has a hint of its
  // own shows it with no dim. A list inside the panel, such as the version
  // thumbnails, dims the panel as other rows do.
  if (row.closest('[role="menu"], [role="listbox"]')) return null;
  return row.closest<HTMLElement>('.dialkit-root');
}

/** An element's corner radius, or the value of one of its radius variables. */
function radiusOf(element: Element, variable?: string): number {
  if (typeof getComputedStyle !== 'function') return 0;
  const style = getComputedStyle(element);
  return Number.parseFloat(variable ? style.getPropertyValue(variable) : style.borderTopLeftRadius) || 0;
}

/**
 * How much the transforms around an element scale it on screen, per axis,
 * such as a page that zooms the panel. A difference under a pixel is
 * rounding, not a scale.
 */
function scaleOf(element: HTMLElement): { x: number; y: number } {
  const box = element.getBoundingClientRect();
  const { offsetWidth: width, offsetHeight: height } = element;
  return {
    x: width && Math.abs(box.width - width) >= 1 ? box.width / width : 1,
    y: height && Math.abs(box.height - height) >= 1 ? box.height / height : 1,
  };
}

let users = 0;
let stop: (() => void) | undefined;

/**
 * Hold H over a control with a hint to read it. The rest of its panel dims,
 * and the control is described by the hint while it shows. Every control
 * with a hint mounts this, and they share one set of listeners, so any
 * number of panels or controls, with or without a DialRoot, handle the key
 * once.
 */
export function mountHints(): { destroy(): void } {
  if (typeof document === 'undefined') return { destroy() {} };
  if (users++ === 0) stop ??= listen();
  let destroyed = false;
  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      // Rows that remount in one go, such as a panel rebuilding its
      // controls, keep the listeners and a held key.
      if (--users === 0) queueMicrotask(() => {
        if (users > 0) return;
        stop?.();
        stop = undefined;
      });
    },
  };
}

const rows = new WeakMap<HTMLElement, { destroy(): void }>();

/**
 * Gives a row its hint, and keeps the hints mounted while it has one, so a
 * control shows its hint even without a ControlRenderer. Pass no hint when
 * the row goes away.
 */
export function setHint(row: HTMLElement, hint: string | undefined): void {
  if (hint) row.dataset.hint = hint;
  else delete row.dataset.hint;
  const hints = rows.get(row);
  if (hint && !hints) rows.set(row, mountHints());
  else if (!hint && hints) {
    hints.destroy();
    rows.delete(row);
  }
}

function listen(): () => void {
  const tooltip = document.createElement('div');
  tooltip.className = 'dialkit-hint';
  tooltip.id = 'dialkit-hint';
  tooltip.setAttribute('role', 'tooltip');
  // The rest of the area dims: a box over the row casts a shadow over
  // everything else in it (theme.css).
  const dim = document.createElement('div');
  dim.className = 'dialkit-hint-dim';
  dim.setAttribute('aria-hidden', 'true');
  const hole = document.createElement('div');
  hole.className = 'dialkit-hint-dim-hole';
  dim.append(hole);
  // The dim and the hint share one layer. In the top layer, they paint above
  // an open picker or menu, which is there too, and nothing clips them.
  const layer = document.createElement('div');
  layer.className = 'dialkit-hint-layer';
  layer.append(dim, tooltip);
  const topLayer = typeof layer.showPopover === 'function';
  if (topLayer) layer.setAttribute('popover', 'manual');
  const raise = () => {
    if (!topLayer || !layer.isConnected) return;
    if (layer.matches(':popover-open')) layer.hidePopover();
    layer.showPopover();
  };

  let held = false;
  let hinted = false;
  let hovered: HTMLElement | null = null;
  let shown: HTMLElement | null = null;
  let area: HTMLElement | null = null;
  let described: HTMLElement | null = null;
  // The dim of a hint that just hid, while it fades out.
  let fading: ReturnType<typeof setTimeout> | undefined;

  // Follows the shown row as the panel around it changes size, and notices
  // when the row goes away.
  const observer = new ResizeObserver(() => place());
  // Follows the shown row's hint when it changes or goes away.
  const mutations = new MutationObserver(() => (shown?.dataset.hint ? show(shown) : hide()));

  const rowOf = (target: EventTarget | null): HTMLElement | null => {
    if (!(target instanceof Element)) return null;
    const row = target.closest<HTMLElement>('[data-hint]');
    // An open menu's rows, portaled away from their panel, show the hint of
    // the button that opened the menu, unless a row has its own.
    const menu = target.closest<HTMLElement>('[role="menu"], [role="listbox"]');
    if (menu && !(row && menu.contains(row))) {
      const trigger = menu.id ? document.querySelector(`[aria-controls="${menu.id}"]`) : null;
      return trigger && !menu.contains(trigger) ? rowOf(trigger) : null;
    }
    return row?.closest('.dialkit-root') ? row : null;
  };

  const describe = (row: HTMLElement) => {
    const active = document.activeElement;
    const target = active instanceof HTMLElement && row.contains(active)
      ? active
      : row.matches(FOCUSABLE) ? row : row.querySelector<HTMLElement>(FOCUSABLE);
    if (!target) return;
    described = target;
    const ids = target.getAttribute('aria-describedby');
    target.setAttribute('aria-describedby', ids ? `${ids} ${tooltip.id}` : tooltip.id);
  };

  const undescribe = () => {
    if (!described) return;
    const ids = described.getAttribute('aria-describedby')?.split(' ').filter((id) => id !== tooltip.id).join(' ');
    if (ids) described.setAttribute('aria-describedby', ids);
    else described.removeAttribute('aria-describedby');
    described = null;
  };

  const place = () => {
    if (!shown) return;
    if (!shown.isConnected || !layer.parentElement) return hide();
    // In the top layer, the layer leaves behind the transforms around the
    // panel, such as a zoom: it takes their scale back, from its corner, so
    // the hint and the dim scale with the panel. Places below are measured
    // on screen and divided by it.
    const scale = topLayer ? scaleOf(area ?? shown) : { x: 1, y: 1 };
    layer.style.transform = scale.x === 1 && scale.y === 1 ? '' : `scale(${scale.x}, ${scale.y})`;
    // The layer sits at the window's corner, unless an ancestor's transform
    // moves it; places count from it.
    const origin = layer.getBoundingClientRect();
    const box = shown.getBoundingClientRect();
    const { left, y, above } = getHintPosition(
      { left: shown.closest(ALIGN)?.getBoundingClientRect().left ?? box.left, top: box.top, bottom: box.bottom },
      origin,
      { width: tooltip.offsetWidth * scale.x, height: tooltip.offsetHeight * scale.y },
      { width: window.innerWidth, height: window.innerHeight }
    );
    // translate, not transform: the hint's scale (theme.css) then applies
    // around its own corner rather than the layer's.
    const x = left / scale.x;
    const top = y / scale.y;
    tooltip.style.translate = above ? `${x}px calc(${top}px - 100%)` : `${x}px ${top}px`;
    tooltip.toggleAttribute('data-below', !above);
    if (!area) return;
    const outer = area.getBoundingClientRect();
    Object.assign(dim.style, {
      left: `${(outer.left - origin.left) / scale.x}px`,
      top: `${(outer.top - origin.top) / scale.y}px`,
      width: `${outer.width / scale.x}px`,
      height: `${outer.height / scale.y}px`,
      borderRadius: `${radiusOf(area)}px`,
    });
    Object.assign(hole.style, {
      transform: `translate(${(box.left - outer.left) / scale.x}px, ${(box.top - outer.top) / scale.y}px)`,
      width: `${box.width / scale.x}px`,
      height: `${box.height / scale.y}px`,
      // A row can be square while the control in it is rounded: then the
      // controls' radius.
      borderRadius: `${radiusOf(shown) || radiusOf(shown, '--dial-radius')}px`,
    });
  };

  const settleDim = () => {
    clearTimeout(fading);
    fading = undefined;
    dim.removeAttribute('data-leaving');
  };

  const show = (row: HTMLElement) => {
    const text = row.dataset.hint;
    if (!text) return;
    settleDim();
    if (row !== shown) {
      shown?.removeAttribute('data-hint-shown');
      undescribe();
      const root = row.closest<HTMLElement>('.dialkit-root')!;
      if (layer.parentElement !== root) {
        // A hint opens fresh in another root, rather than sliding across.
        tooltip.removeAttribute('data-open');
        dim.removeAttribute('data-open');
        root.append(layer);
        raise();
      }
      const next = areaOf(row);
      if (next !== area) {
        // The dim of another area opens fresh: its hole does not slide in.
        area?.removeAttribute('data-hinting');
        dim.removeAttribute('data-open');
      }
      area = next;
      shown = row;
      row.setAttribute('data-hint-shown', '');
      describe(row);
      observer.disconnect();
      mutations.disconnect();
      mutations.observe(row, { attributes: true, attributeFilter: ['data-hint'] });
      // The row also moves when its folders or the panel box resize.
      for (const box of [row, row.closest('.dialkit-folder-root') ?? root, row.closest('.dialkit-panel-inner'), area]) {
        if (box) observer.observe(box);
      }
    }
    tooltip.textContent = text;
    place();
    // Commit the places first so an opening hint and dim do not slide in.
    if (!tooltip.hasAttribute('data-open')) {
      tooltip.getBoundingClientRect();
      tooltip.setAttribute('data-open', '');
    }
    if (area && !dim.hasAttribute('data-open')) {
      hole.getBoundingClientRect();
      dim.setAttribute('data-open', '');
    }
    area?.setAttribute('data-hinting', '');
    hinted = true;
  };

  const hide = () => {
    if (!shown) return;
    shown.removeAttribute('data-hint-shown');
    undescribe();
    observer.disconnect();
    mutations.disconnect();
    tooltip.removeAttribute('data-open');
    if (dim.hasAttribute('data-open')) {
      // The dim fades out where it is (theme.css).
      dim.removeAttribute('data-open');
      dim.setAttribute('data-leaving', '');
      fading = setTimeout(settleDim, FADE_MS);
    }
    area?.removeAttribute('data-hinting');
    shown = null;
    area = null;
  };

  const release = () => {
    if (!held) return;
    held = false;
    hide();
    // The tip folds away once the key that showed a hint is released.
    if (hinted) HintStore.markTipSeen();
    hinted = false;
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (held || !isHintKey(event)) return;
    held = true;
    const row = (hovered?.isConnected ? hovered : null) ?? rowOf(document.activeElement);
    if (row) show(row);
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key?.toLowerCase() === HINT_KEY) release();
  };

  // While the key is held, a hint stays in the gaps between rows and goes
  // when the pointer leaves the panel.
  const handlePointerOver = (event: PointerEvent) => {
    hovered = rowOf(event.target);
    if (!held) return;
    if (hovered) show(hovered);
    else if (!(event.target instanceof Node && shown && (shown.closest('.dialkit-panel') ?? area)?.contains(event.target))) hide();
  };

  const handlePointerOut = (event: PointerEvent) => {
    if (event.relatedTarget) return;
    hovered = null;
    hide();
  };

  const handleFocusIn = (event: FocusEvent) => {
    const row = rowOf(event.target);
    if (held && row) show(row);
  };

  // A picker or menu that opens goes above the hint: raise the hint again.
  // A popover's toggle event does not bubble, so it is caught on the way down.
  const handleToggle = (event: Event) => {
    if (event.target !== layer && (event as ToggleEvent).newState === 'open' && layer.matches(':popover-open')) raise();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') release();
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', release);
  window.addEventListener('resize', place);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('pointerover', handlePointerOver);
  document.addEventListener('pointerout', handlePointerOut);
  document.addEventListener('focusin', handleFocusIn);
  document.addEventListener('scroll', place, { capture: true, passive: true });
  if (topLayer) document.addEventListener('toggle', handleToggle, true);

  return () => {
    release();
    settleDim();
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('blur', release);
    window.removeEventListener('resize', place);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('pointerover', handlePointerOver);
    document.removeEventListener('pointerout', handlePointerOut);
    document.removeEventListener('focusin', handleFocusIn);
    document.removeEventListener('scroll', place, { capture: true });
    document.removeEventListener('toggle', handleToggle, true);
    observer.disconnect();
    mutations.disconnect();
    layer.remove();
  };
}
