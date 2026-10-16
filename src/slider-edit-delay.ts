/**
 * How long the pointer rests on a slider's value before the value takes
 * typing (a click on a slider moves it, so a click on its value can only
 * start typing once this wait is over). Read from --dial-slider-edit-delay,
 * in milliseconds, on the value itself, so a theme or a Look panel can set
 * it; 800 when it is unset or not a number.
 */
export function sliderEditDelay(el: Element | null | undefined): number {
  if (!el || typeof getComputedStyle !== 'function') return 800;
  const ms = Number.parseFloat(getComputedStyle(el).getPropertyValue('--dial-slider-edit-delay'));
  return Number.isFinite(ms) && ms >= 0 ? ms : 800;
}
