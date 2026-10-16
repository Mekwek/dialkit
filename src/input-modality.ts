/**
 * Panel-wide input helpers, installed once: the focus marks below, and the
 * width of a slider's value input.
 *
 * Marks how each control inside a DialKit panel got its focus: from the
 * pointer or from the keyboard. Browsers treat every focus of a text input
 * as `:focus-visible` (typing follows), so CSS alone cannot tell a click from
 * a Tab there. A focused element inside a panel gets `data-dial-focus`
 * ("pointer" or "keyboard") until it loses the focus, and the theme draws the
 * keyboard ring only for "keyboard". Typing after a click keeps "pointer":
 * the mark is set once, when the focus arrives.
 */
let installed = false;

export function trackInputModality(): void {
  if (installed || typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
  installed = true;
  let fromPointer = false;
  // Enter or Escape in a field that was clicked into: the focus the control
  // then hands back (a slider's input returns it to the slider) still comes
  // from that click, so it keeps "pointer" and draws no ring.
  let handBack = false;
  document.addEventListener('pointerdown', () => { fromPointer = true; handBack = false; }, true);
  document.addEventListener('keydown', event => {
    // A modifier alone (Shift, Meta) is not a move with the keyboard.
    if (event.key === 'Shift' || event.key === 'Meta' || event.key === 'Control' || event.key === 'Alt') return;
    const target = event.target;
    handBack = (event.key === 'Enter' || event.key === 'Escape') &&
      target instanceof HTMLElement && target.dataset.dialFocus === 'pointer';
    fromPointer = false;
  }, true);
  document.addEventListener('focusin', event => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.closest('.dialkit-root, .dialkit-bg-gizmo')) return;
    target.dataset.dialFocus = fromPointer || handBack ? 'pointer' : 'keyboard';
    handBack = false;
  }, true);
  // A slider's value input grows with what is typed, in every framework's
  // slider: its width is its text's length in characters (a mono font).
  const sizeSliderInput = (target: EventTarget | null) => {
    if (target instanceof HTMLInputElement && target.classList.contains('dialkit-slider-input')) {
      target.style.width = `${Math.max(target.value.length, 1)}ch`;
    }
  };
  document.addEventListener('focusin', event => sizeSliderInput(event.target), true);
  document.addEventListener('input', event => sizeSliderInput(event.target), true);
  document.addEventListener('focusout', event => {
    const target = event.target;
    if (target instanceof HTMLElement) delete target.dataset.dialFocus;
  }, true);
}
