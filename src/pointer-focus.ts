const MODIFIERS = new Set(['Alt', 'Control', 'Meta', 'Shift']);

let observers = 0;
let fromPointer = false;
let unobserve: (() => void) | undefined;

/**
 * Text fields match :focus-visible however they are focused, so CSS alone cannot keep
 * their focus ring to the keyboard. While any root is mounted, a control inside a
 * `.dialkit-root` focused by a pointer carries `data-pointer-focus` until it blurs.
 */
export function observePointerFocus(): () => void {
  if (typeof document === 'undefined') return () => {};
  if (observers++ === 0) {
    const pointerDown = () => { fromPointer = true; };
    const keyDown = (event: KeyboardEvent) => { if (!MODIFIERS.has(event.key)) fromPointer = false; };
    const focusIn = (event: FocusEvent) => {
      const target = event.target as Element;
      if (fromPointer && target.closest?.('.dialkit-root')) target.setAttribute('data-pointer-focus', '');
    };
    // Switching windows blurs without moving focus; keep the mark for its return.
    const focusOut = (event: FocusEvent) => {
      const target = event.target as Element;
      if (target !== document.activeElement) target.removeAttribute?.('data-pointer-focus');
    };
    document.addEventListener('pointerdown', pointerDown, true);
    document.addEventListener('keydown', keyDown, true);
    document.addEventListener('focusin', focusIn, true);
    document.addEventListener('focusout', focusOut, true);
    unobserve = () => {
      document.removeEventListener('pointerdown', pointerDown, true);
      document.removeEventListener('keydown', keyDown, true);
      document.removeEventListener('focusin', focusIn, true);
      document.removeEventListener('focusout', focusOut, true);
      fromPointer = false;
    };
  }
  let observing = true;
  return () => {
    if (!observing) return;
    observing = false;
    if (--observers === 0) { unobserve?.(); unobserve = undefined; }
  };
}
