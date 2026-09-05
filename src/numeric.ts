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
