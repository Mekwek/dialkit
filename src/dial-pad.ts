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
  /**
   * How a value maps to the square. "linear" spreads the range evenly.
   * "centered" puts each axis's default in the middle: min to default fills
   * one half, default to max the other. Defaults to "linear".
   */
  mapping?: 'linear' | 'centered';
  /** Hides the label box left of the X and Y fields. */
  hideLabel?: boolean;
  /** Lets the X and Y fields drag left and right to change their value. */
  dragFields?: boolean;
};

type PadMapping = DialPadConfig['mapping'];

/** Where `value` sits along the axis, from 0 (min) to 1 (max). */
export function padFraction(value: number, axis: PadAxis, mapping: PadMapping = 'linear'): number {
  const { min, max, default: middle } = axis;
  if (mapping === 'centered' && middle > min && middle < max) {
    return value <= middle ? 0.5 * (value - min) / (middle - min) : 0.5 + 0.5 * (value - middle) / (max - middle);
  }
  return (value - min) / (max - min);
}

/** The value at `fraction` (0 to 1) along the axis, before snapping. */
export function padValueAt(fraction: number, axis: PadAxis, mapping: PadMapping = 'linear'): number {
  const { min, max, default: middle } = axis;
  if (mapping === 'centered' && middle > min && middle < max) {
    return fraction <= 0.5 ? min + fraction * 2 * (middle - min) : middle + (fraction - 0.5) * 2 * (max - middle);
  }
  return min + fraction * (max - min);
}

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
export function padValueFromPoint(x: number, y: number, config: Pick<DialPadConfig, 'x' | 'y' | 'mapping'> = {}): DialPadValue {
  const horizontal = resolvePadAxis(config.x);
  const vertical = resolvePadAxis(config.y);
  return {
    x: snapPadAxis(padValueAt(x, horizontal, config.mapping), horizontal),
    y: snapPadAxis(padValueAt(1 - y, vertical, config.mapping), vertical),
  };
}

export function padValueFromKey(value: DialPadValue, key: string, shift: boolean, config: Pick<DialPadConfig, 'x' | 'y'> = {}): DialPadValue | undefined {
  const axis = key === 'ArrowLeft' || key === 'ArrowRight' ? 'x' : key === 'ArrowUp' || key === 'ArrowDown' ? 'y' : undefined;
  if (!axis) return undefined;
  const range = resolvePadAxis(config[axis]);
  const direction = key === 'ArrowRight' || key === 'ArrowUp' ? 1 : -1;
  return { ...value, [axis]: snapPadAxis(value[axis] + direction * range.step * (shift ? 10 : 1), range) };
}
