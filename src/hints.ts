import { DialStore, type ControlMeta } from './store/DialStore';

type Listener = () => void;

export type HintPosition = { left: number; top: number; above: boolean };

type Box = { left: number; top: number; right?: number; bottom: number };

const HINT_KEY = 'h';
const TIP_KEY = 'dialkit-hint-tip-seen';
const GAP = 6;
const MARGIN = 8;
const FOCUSABLE = 'button, input, select, textarea, [tabindex]';

/**
 * Whether this browser has seen a hint yet, shared by every panel. Until
 * then, panels with hints end with a tip that points to the hint key.
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

/** Whether any control in the tree has a hint. Panels show the tip only then. */
export function hasHints(controls: ControlMeta[]): boolean {
  return controls.some((control) => !!control.hint || (!!control.children && hasHints(control.children)));
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
 * below it when there is no room above, and inside the viewport.
 */
export function getHintPosition(
  row: Box,
  root: Pick<Box, 'left' | 'top'>,
  size: { width: number; height: number },
  viewport: { width: number; height: number }
): HintPosition {
  const above = row.top - GAP - size.height >= MARGIN;
  const left = Math.max(MARGIN, Math.min(row.left, viewport.width - size.width - MARGIN));
  const top = above ? row.top - GAP - size.height : row.bottom + GAP;
  return { left: left - root.left, top: top - root.top, above };
}

let hintId = 0;

/**
 * Hold H over a control with a hint to read it. The rest of the panel dims,
 * and the control is described by the hint while it shows. Each DialRoot
 * mounts this once on its root element.
 */
export function mountHints(root: HTMLElement): { destroy(): void } {
  const tooltip = document.createElement('div');
  tooltip.className = 'dialkit-hint';
  tooltip.id = `dialkit-hint-${++hintId}`;
  tooltip.setAttribute('role', 'tooltip');
  root.append(tooltip);

  let held = false;
  let hinted = false;
  let hovered: HTMLElement | null = null;
  let shown: HTMLElement | null = null;
  let described: HTMLElement | null = null;

  // Follows the shown row as the panel around it changes size, and notices
  // when the row goes away.
  const observer = new ResizeObserver(() => place());

  const rowOf = (target: EventTarget | null) => {
    const row = target instanceof Element ? target.closest<HTMLElement>('[data-hint]') : null;
    return row && root.contains(row) ? row : null;
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
    if (!shown.isConnected) return hide();
    const { left, top, above } = getHintPosition(
      shown.getBoundingClientRect(),
      root.getBoundingClientRect(),
      { width: tooltip.offsetWidth, height: tooltip.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight }
    );
    tooltip.style.transform = `translate(${left}px, ${top}px)`;
    tooltip.toggleAttribute('data-below', !above);
  };

  const show = (row: HTMLElement) => {
    const text = row.dataset.hint;
    if (!text) return;
    if (row !== shown) {
      shown?.removeAttribute('data-hint-shown');
      undescribe();
      shown = row;
      row.setAttribute('data-hint-shown', '');
      describe(row);
      observer.disconnect();
      observer.observe(row);
      observer.observe(row.closest('.dialkit-folder-root') ?? root);
    }
    tooltip.textContent = text;
    place();
    if (!tooltip.hasAttribute('data-open')) {
      // Commit the position first so an opening hint does not slide in.
      tooltip.getBoundingClientRect();
      tooltip.setAttribute('data-open', '');
    }
    root.setAttribute('data-hinting', '');
    hinted = true;
  };

  const hide = () => {
    if (!shown) return;
    shown.removeAttribute('data-hint-shown');
    undescribe();
    observer.disconnect();
    shown = null;
    tooltip.removeAttribute('data-open');
    root.removeAttribute('data-hinting');
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
    const row = hovered ?? rowOf(document.activeElement);
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
    else if (!(event.target instanceof Node && shown?.closest('.dialkit-panel')?.contains(event.target))) hide();
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

  return {
    destroy() {
      release();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', release);
      window.removeEventListener('resize', place);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointerout', handlePointerOut);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('scroll', place, { capture: true });
      tooltip.remove();
    },
  };
}
