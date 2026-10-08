/** Decimal places needed by a step or range endpoint, including scientific notation. */
export function decimalsForStep(step: number, min = 0, max = 0): number {
  return Math.min(100, Math.max(...[step, min, max].map(value => {
    const [coefficient, exponent = '0'] = String(value).toLowerCase().split('e');
    return Math.max(0, (coefficient.split('.')[1]?.length ?? 0) - Number(exponent));
  })));
}

/** Snap relative to the minimum and keep exact endpoints reachable. */
export function roundValue(value: number, step: number, min?: number, max?: number): number {
  const lower = min ?? -Infinity;
  const upper = max ?? Infinity;
  const clamped = Math.max(lower, Math.min(upper, value));
  if (clamped === lower || clamped === upper || !Number.isFinite(step) || step <= 0) return clamped;
  const origin = min ?? 0;
  const snapped = origin + Math.round((clamped - origin) / step) * step;
  return Math.max(lower, Math.min(upper, Number(snapped.toPrecision(14))));
}

/** A plain decimal number: optional sign, digits with an optional fraction
 *  (or a bare fraction), optional exponent. */
const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/**
 * The number typed in a field, or null when the entry is not a number (then
 * nothing is written). The field's unit may follow the number. Commas and
 * inner spaces are refused rather than guessed at ("1,5" could mean 1.5 or
 * 15), so a typo never lands as a wrong value.
 */
export function parseFieldInput(text: string, unit?: string): number | null {
  let entry = text.trim();
  if (unit && entry.endsWith(unit)) entry = entry.slice(0, -unit.length).trim();
  if (!NUMBER_PATTERN.test(entry)) return null;
  const value = Number(entry);
  return Number.isFinite(value) ? value : null;
}
