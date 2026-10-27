import { E as EasingConfig } from './DialStore-CP5O0S4u.js';
import './dial-pad.js';
import './anchor.js';
import './background.js';

type BezierPoints = EasingConfig['ease'];
type GraphPoint = {
    x: number;
    y: number;
};
declare const easingPresets: Record<string, BezierPoints>;
declare function parseEase(text: string): BezierPoints | null;
/** Defensive rendering for externally supplied values; valid overshoot is never clamped. */
declare function normalizeEase(ease: BezierPoints): BezierPoints;
/** Fit both axes equally so the 0→1 reference stays at 45°, including during overshoot. */
declare function fitEasingGraph(ease: BezierPoints, width: number, height: number): {
    scale: {
        x: number;
        y: number;
    };
    start: GraphPoint;
    end: GraphPoint;
    handles: GraphPoint[];
};
/** Deltas use the pointer-down scale so refitting the display cannot amplify a drag. */
declare function moveEasingHandle(ease: BezierPoints, handle: 0 | 1, dx: number, dy: number, scale: GraphPoint): BezierPoints;
declare function easingHandleFromKey(ease: BezierPoints, handle: 0 | 1, key: string, shift: boolean): BezierPoints | undefined;
/** Stop the tangent at the handle's outer radius, including when the handle meets an endpoint. */
declare function easingGuideEnd(start: GraphPoint, handle: GraphPoint, radius?: number): GraphPoint;
/**
 * Scales how far both handles reach from their endpoints: 0 is linear, 1 is
 * the curve itself, 2 doubles the reach. A coordinate that would leave the
 * editable range (X in 0–1, Y in -1–2) stops at its bound, so the result is
 * always a valid curve.
 */
declare function scaleEase(ease: BezierPoints, scale: number): BezierPoints;
/**
 * Tracks an Intensity slider over a curve, in percent: 50 is the curve it
 * started from, 0 is linear and 100 doubles the reach. Any other change to the
 * curve becomes the new 50%, so moving the slider back to 50 always returns
 * the exact curve it started from.
 */
declare function createEaseIntensity(): {
    read: (ease: BezierPoints) => number;
    /** The curve at `next` percent, each coordinate within its range. */
    apply(ease: BezierPoints, next: number): BezierPoints;
};

export { type BezierPoints, type GraphPoint, createEaseIntensity, easingGuideEnd, easingHandleFromKey, easingPresets, fitEasingGraph, moveEasingHandle, normalizeEase, parseEase, scaleEase };
