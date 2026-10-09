/** The same [default, min, max, step?] notation used by sliders. */
type DialPadAxis = [number, number, number, number?];
type DialPadValue = {
    x: number;
    y: number;
};
type DialPadConfig = {
    type: 'pad';
    /** Defaults to [0, -1, 1, 0.01]. */
    x?: DialPadAxis;
    /** Positive Y points upward. Defaults to [0, -1, 1, 0.01]. */
    y?: DialPadAxis;
    labels?: {
        x?: string;
        y?: string;
    };
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
declare function padFraction(value: number, axis: PadAxis, mapping?: PadMapping): number;
/** The value at `fraction` (0 to 1) along the axis, before snapping. */
declare function padValueAt(fraction: number, axis: PadAxis, mapping?: PadMapping): number;
type PadAxis = {
    default: number;
    min: number;
    max: number;
    step: number;
};
declare const PAD_GRID_DIVISIONS = 6;
/** Pixel coordinates within the visible grid; both axes must be within 8px. */
declare function padGridIntersection(x: number, y: number, width: number, height: number): {
    x: number;
    y: number;
} | undefined;
declare function resolvePadAxis(config?: DialPadAxis): PadAxis;
declare function snapPadAxis(value: number, axis: PadAxis): number;
declare function normalizePadValue(value: unknown, config?: Pick<DialPadConfig, 'x' | 'y'>): DialPadValue;
/** Screen coordinates: left/bottom are the minima, right/top the maxima. */
declare function padValueFromPoint(x: number, y: number, config?: Pick<DialPadConfig, 'x' | 'y' | 'mapping'>): DialPadValue;
declare function padValueFromKey(value: DialPadValue, key: string, shift: boolean, config?: Pick<DialPadConfig, 'x' | 'y'>): DialPadValue | undefined;

export { type DialPadAxis, type DialPadConfig, type DialPadValue, PAD_GRID_DIVISIONS, type PadAxis, normalizePadValue, padFraction, padGridIntersection, padValueAt, padValueFromKey, padValueFromPoint, resolvePadAxis, snapPadAxis };
