/** The same [default, min, max, step?] notation used by sliders. */
export type DialPadAxis = [number, number, number, number?];

export type DialPadValue = { x: number; y: number };

export type DialPadConfig = {
  type: 'pad';
  /** Defaults to [0, -1, 1, 0.01]. */
  x?: DialPadAxis;
  /** Positive Y points upward. Defaults to [0, -1, 1, 0.01]. */
  y?: DialPadAxis;
  labels?: { x?: string; y?: string };
};

export type PadAxis = { default: number; min: number; max: number; step: number };

export const PAD_GRID_DIVISIONS = 6;

/** Pixel coordinates within the visible grid; both axes must be within 8px. */
export function padGridIntersection(x: number, y: number, width: number, height: number): { x: number; y: number } | undefined {
  if (width <= 0 || height <= 0) return undefined;
  const column = Math.round(x / width * PAD_GRID_DIVISIONS);
  const row = Math.round(y / height * PAD_GRID_DIVISIONS);
  // Only the interior lines form visible intersections.
  if (column < 1 || column >= PAD_GRID_DIVISIONS || row < 1 || row >= PAD_GRID_DIVISIONS) return undefined;
  const target = { x: column / PAD_GRID_DIVISIONS * width, y: row / PAD_GRID_DIVISIONS * height };
  return Math.abs(x - target.x) <= 8 && Math.abs(y - target.y) <= 8 ? target : undefined;
}

export function resolvePadAxis(config: DialPadAxis = [0, -1, 1, 0.01]): PadAxis {
  const [initial, min, max, suppliedStep] = config;
  const step = suppliedStep ?? (max - min) / 200;
  if (![initial, min, max, step, max - min].every(Number.isFinite) || max <= min || step <= 0) {
    throw new RangeError('DialPad axes need finite [default, min, max, step?] values, min < max, and a positive step.');
  }
  const axis = { default: initial, min, max, step };
  axis.default = snapPadAxis(initial, axis);
  return axis;
}

export function snapPadAxis(value: number, axis: PadAxis): number {
  if (!Number.isFinite(value)) return axis.default;
  const clamped = Math.max(axis.min, Math.min(axis.max, value));
  // Endpoints remain reachable even when the step doesn't divide the range.
  if (clamped === axis.min || clamped === axis.max) return clamped;
  const snapped = axis.min + Math.round((clamped - axis.min) / axis.step) * axis.step;
  return Math.max(axis.min, Math.min(axis.max, Number(snapped.toPrecision(12))));
}

export function normalizePadValue(value: unknown, config: Pick<DialPadConfig, 'x' | 'y'> = {}): DialPadValue {
  const axes = { x: resolvePadAxis(config.x), y: resolvePadAxis(config.y) };
  const input = typeof value === 'object' && value !== null ? value as Partial<DialPadValue> : {};
  return {
    x: typeof input.x === 'number' ? snapPadAxis(input.x, axes.x) : axes.x.default,
    y: typeof input.y === 'number' ? snapPadAxis(input.y, axes.y) : axes.y.default,
  };
}

/** Screen coordinates: left/bottom are the minima, right/top the maxima. */
export function padValueFromPoint(x: number, y: number, config: Pick<DialPadConfig, 'x' | 'y'> = {}): DialPadValue {
  const horizontal = resolvePadAxis(config.x);
  const vertical = resolvePadAxis(config.y);
  return {
    x: snapPadAxis(horizontal.min + x * (horizontal.max - horizontal.min), horizontal),
    y: snapPadAxis(vertical.max - y * (vertical.max - vertical.min), vertical),
  };
}

export function padValueFromKey(value: DialPadValue, key: string, shift: boolean, config: Pick<DialPadConfig, 'x' | 'y'> = {}): DialPadValue | undefined {
  const axis = key === 'ArrowLeft' || key === 'ArrowRight' ? 'x' : key === 'ArrowUp' || key === 'ArrowDown' ? 'y' : undefined;
  if (!axis) return undefined;
  const range = resolvePadAxis(config[axis]);
  const direction = key === 'ArrowRight' || key === 'ArrowUp' ? 1 : -1;
  return { ...value, [axis]: snapPadAxis(value[axis] + direction * range.step * (shift ? 10 : 1), range) };
}
