const MODIFIERS = new Set(['Alt', 'Control', 'Meta', 'Shift']);

let observers = 0;
let fromPointer = false;
let unobserve: (() => void) | undefined;

/** A slider's number input fits what is typed in it; the font is monospaced. */
function fitSliderInput(target: EventTarget | null) {
  const input = target as HTMLInputElement | null;
  if (input?.classList?.contains('dialkit-slider-input')) input.style.width = `${Math.max(input.value.length, 1)}ch`;
}

/**
 * Text fields match :focus-visible however they are focused, so CSS alone cannot keep
 * their focus ring to the keyboard. While any root is mounted, a control inside a
 * `.dialkit-root` focused by a pointer carries `data-pointer-focus` until it blurs.
 *
 * A mouse click on a folder header also leaves it unfocused, so the next key press
 * neither shows its ring nor toggles the folder again; Enter and Space still toggle a
 * header reached with Tab, and the click they cause has no mouse (detail 0). The same
 * listeners fit a slider's number input to its text.
 */
export function observePointerFocus(): () => void {
  if (typeof document === 'undefined') return () => {};
  if (observers++ === 0) {
    const pointerDown = () => { fromPointer = true; };
    const keyDown = (event: KeyboardEvent) => { if (!MODIFIERS.has(event.key)) fromPointer = false; };
    const focusIn = (event: FocusEvent) => {
      const target = event.target as Element;
      if (fromPointer && target.closest?.('.dialkit-root')) target.setAttribute('data-pointer-focus', '');
      fitSliderInput(target);
    };
    const input = (event: Event) => fitSliderInput(event.target);
    // Capture: some adapters stop the header's click from bubbling.
    const click = (event: MouseEvent) => {
      const header = (event.target as Element).closest?.('.dialkit-root .dialkit-folder-header-top') as HTMLElement | null;
      if (event.detail > 0 && header && header === document.activeElement) header.blur();
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
    document.addEventListener('input', input, true);
    document.addEventListener('click', click, true);
    unobserve = () => {
      document.removeEventListener('pointerdown', pointerDown, true);
      document.removeEventListener('keydown', keyDown, true);
      document.removeEventListener('focusin', focusIn, true);
      document.removeEventListener('focusout', focusOut, true);
      document.removeEventListener('input', input, true);
      document.removeEventListener('click', click, true);
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
