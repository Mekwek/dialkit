/**
 * The background control's value: a solid color, a gradient or a media file.
 * Pure data helpers, with no DOM, shared by the store and the control.
 */
interface BackgroundStop {
    /** Position along the gradient, 0..100 (%). */
    at: number;
    /** '#rrggbb', lowercase. */
    color: string;
    /** Opacity, 0..100 (%). */
    alpha: number;
}
type GradientShape = 'linear' | 'radial' | 'angular' | 'diamond';
/** A point as a fraction of the canvas box: x 0 = left, 1 = right; y 0 = top, 1 = bottom. May go outside 0..1. */
interface GradientPoint {
    x: number;
    y: number;
}
/**
 * Figma's three gradient handles. Linear runs from `start` to `end` (`width`
 * is unused but kept). Radial, Diamond and Angular: `start` is the centre,
 * `end` sets the main radius and its direction, and `width` sets the radius
 * across it (an ellipse). Switching shape keeps all three. See
 * gradientFrame and gradientParamAt for the exact shading rule.
 */
interface GradientHandles {
    start: GradientPoint;
    end: GradientPoint;
    width: GradientPoint;
}
interface BackgroundGradient {
    shape: GradientShape;
    handles: GradientHandles;
    /** 2..8 stops, kept sorted by `at`. */
    stops: BackgroundStop[];
}
interface BackgroundMedia {
    /** The host's storage key, never a URL. */
    key: string;
    kind: 'image' | 'video';
}
interface BackgroundMediaDisplay {
    /** fill = CSS cover, fit = contain, stretch = fill the box ignoring the media's shape, tile = repeat. */
    fit: 'fill' | 'fit' | 'stretch' | 'tile';
    /** The media box's shape; 'source' is the file's own shape. */
    ratio: '16:9' | '4:3' | '1:1' | '4:5' | '3:4' | '9:16' | 'source';
    /** 1..3, step 0.1. */
    zoom: number;
    /** Tile mode: one tile's height as a share of the canvas height, 0.05..1, step 0.01. */
    tileScale: number;
    /** Left, center, right. */
    pinX: -1 | 0 | 1;
    /** Top, center, bottom. */
    pinY: -1 | 0 | 1;
}
interface BackgroundValue {
    /** The tab that is on. The key is `mode`, never `type`: DialKit reads `type` as a config type. */
    mode: 'solid' | 'gradient' | 'media';
    /** The Solid tab, '#rrggbb'. */
    color: string;
    gradient: BackgroundGradient;
    media: BackgroundMedia | null;
    /** How the media sits in its box. Replacing or removing the file keeps it. */
    mediaDisplay: BackgroundMediaDisplay;
}
interface SavedGradient {
    id: string;
    gradient: BackgroundGradient;
}
interface BackgroundConfig {
    type: 'background';
    default?: BackgroundValue;
}
declare const BACKGROUND_MODES: BackgroundValue['mode'][];
declare const GRADIENT_SHAPES: GradientShape[];
declare const BACKGROUND_FITS: BackgroundMediaDisplay['fit'][];
declare const BACKGROUND_RATIOS: BackgroundMediaDisplay['ratio'][];
declare const BACKGROUND_MIN_STOPS = 2;
declare const BACKGROUND_MAX_STOPS = 8;
declare const BACKGROUND_ZOOM: {
    readonly min: 1;
    readonly max: 3;
    readonly step: 0.1;
};
declare const BACKGROUND_TILE_SCALE: {
    readonly min: 0.05;
    readonly max: 1;
    readonly step: 0.01;
};
declare function defaultBackgroundValue(): BackgroundValue;
/** The default handles: a top to bottom linear gradient, each handle 10% in from the canvas's edges. */
declare function defaultGradientHandles(): GradientHandles;
/**
 * The handles for a value saved before handles existed (it had `angle`).
 *
 * Linear, CSS angle θ (0 points up, 90 right, 180 down): the line passes
 * through the centre (0.5, 0.5) along d = (sin θ, -cos θ), with half length
 * h = (|sin θ| + |cos θ|) / 2 in canvas fractions, which is CSS's own
 * gradient line, exact on a square canvas and close otherwise:
 *   start = centre - d * h, end = centre + d * h,
 *   width = centre + (-d.y, d.x) * h  (where Figma puts it: θ = 180 gives
 *   start (0.5, 0), end (0.5, 1), width (0, 0.5), edge to edge).
 * Radial (centred, as CSS's `radial-gradient(circle at center)`):
 *   start = (0.5, 0.5), end = (1, 0.5), width = (0.5, 0).
 * The theca engine converts old values with this same rule.
 */
declare function legacyGradientHandles(shape: 'linear' | 'radial', angle: number): GradientHandles;
/**
 * The gradient with its type switched, placed as Figma places it (measured
 * from a recording):
 * - Linear → Radial, Angular or Diamond: the centre moves to the middle of the
 *   line, the end stays, and the width point goes at the same distance a
 *   quarter turn clockwise on screen, in pixels of the canvas (`aspect` is its
 *   width / height), so the shape is a circle on screen, even on a wide canvas.
 * - Between Radial, Angular and Diamond: the three points stay.
 * - Radial, Angular or Diamond → Linear: start = 2 × centre − end, the end stays,
 *   so Linear → Radial → Linear gives back the same line.
 * The stops never change.
 */
declare function switchGradientShape(gradient: BackgroundGradient, next: GradientShape, aspect?: number): BackgroundGradient;
declare function normalizeGradientHandles(value: unknown, fallback?: GradientHandles): GradientHandles;
declare function cloneHandles(handles: GradientHandles): GradientHandles;
/**
 * The gradient's frame in pixels for a canvas of `width` x `height`.
 * Main axis: from start (the centre) to end, length r1, unit (ax, ay).
 * Cross axis: unit (nx, ny), perpendicular to the main axis on the side the
 * width point lies; r2 is the width point's distance from the main axis line
 * (so any width point gives an ellipse, Figma's default included).
 */
interface GradientFrame {
    cx: number;
    cy: number;
    ax: number;
    ay: number;
    nx: number;
    ny: number;
    r1: number;
    r2: number;
}
declare function gradientFrame(handles: GradientHandles, width: number, height: number): GradientFrame;
/**
 * Where a pixel falls on the gradient, as t: 0 at the first colour position
 * (0 %), 1 at the last (100 %). With d = pixel - centre, u = (d · a) / r1 and
 * v = (d · n) / r2 (see gradientFrame):
 *   linear: t = u            (beyond 0..1 the end colours continue)
 *   radial: t = sqrt(u² + v²)
 *   diamond: t = |u| + |v|
 *   angular: t = atan2(v, u) / 2π, wrapped into 0..1 (0 % on the end handle's
 *     direction, growing towards the width side, 360° = 100 %)
 */
declare function gradientParamAt(shape: GradientShape, frame: GradientFrame, px: number, py: number): number;
declare function defaultMediaDisplay(): BackgroundMediaDisplay;
/** '#rrggbb' lowercase for '#rgb' or '#rrggbb' input, or null. */
declare function normalizeHex(value: unknown): string | null;
/** Stable sort by `at`: stops at the same place keep their order. */
declare function sortStops(stops: BackgroundStop[]): BackgroundStop[];
declare function normalizeGradient(value: unknown, fallback?: BackgroundGradient): BackgroundGradient;
declare function normalizeMediaDisplay(value: unknown, fallback?: BackgroundMediaDisplay): BackgroundMediaDisplay;
/**
 * A fresh, valid value. Each field that is missing or invalid falls back to
 * the same field of `fallback` (the current value, or the control's default),
 * so one bad or missing field never resets the rest.
 */
declare function normalizeBackgroundValue(value: unknown, fallback?: BackgroundValue): BackgroundValue;
/** The config's default, made valid. */
declare function backgroundConfigDefault(config?: Pick<BackgroundConfig, 'default'>): BackgroundValue;
declare function cloneGradient(gradient: BackgroundGradient): BackgroundGradient;
declare function cloneBackgroundValue(value: BackgroundValue): BackgroundValue;
declare function sameGradient(a: BackgroundGradient, b: BackgroundGradient): boolean;
declare function sameHandles(a: GradientHandles, b: GradientHandles): boolean;
declare function sameBackgroundValue(a: unknown, b: unknown): boolean;
/** The color and opacity a sorted gradient shows at `at` (0..100), interpolated in sRGB. */
declare function gradientColorAt(stops: BackgroundStop[], at: number): {
    color: string;
    alpha: number;
};
/** `list` with the item at `from` moved to `to`; the items between shift one place. A new array. */
declare function moveItem<T>(list: readonly T[], from: number, to: number): T[];
/**
 * Reorders stop rows: the positions stay with their slots in the sorted
 * list, and the colors and opacities move. The stop at `from` carries its
 * color and alpha to slot `to`; the stops between shift one slot. With
 * stops at 0/50/100 colored A/B/C, moving 0 to 2 gives 0 = B, 50 = C,
 * 100 = A. Returns new stop objects, still sorted.
 */
declare function moveStopPayload(stops: readonly BackgroundStop[], from: number, to: number): BackgroundStop[];
/** The middle of the widest gap between two neighbouring stops. */
declare function widestGapMiddle(stops: BackgroundStop[]): number;
/** A stop as a CSS color, with its opacity. */
declare function stopCssColor(stop: Pick<BackgroundStop, 'color' | 'alpha'>): string;
/**
 * The gradient as a CSS image, for small previews (saved swatches) and the
 * panel's strip (`direction`, the stops left to right). CSS cannot draw every
 * Figma gradient, so this is close, not exact; it assumes a square box:
 *   linear: exact on a square box (the stops are placed along CSS's own line);
 *   radial and diamond: an ellipse at the centre, its radii on the nearest
 *     box axes (CSS ellipses cannot turn);
 *   angular: a conic gradient from the end handle's direction (round, not
 *     elliptical).
 * Hosts that draw the real thing use gradientFrame and gradientParamAt, or
 * paintBackgroundPreview.
 */
declare function backgroundGradientCss(gradient: BackgroundGradient, direction?: string): string;

export { BACKGROUND_FITS, BACKGROUND_MAX_STOPS, BACKGROUND_MIN_STOPS, BACKGROUND_MODES, BACKGROUND_RATIOS, BACKGROUND_TILE_SCALE, BACKGROUND_ZOOM, type BackgroundConfig, type BackgroundGradient, type BackgroundMedia, type BackgroundMediaDisplay, type BackgroundStop, type BackgroundValue, GRADIENT_SHAPES, type GradientFrame, type GradientHandles, type GradientPoint, type GradientShape, type SavedGradient, backgroundConfigDefault, backgroundGradientCss, cloneBackgroundValue, cloneGradient, cloneHandles, defaultBackgroundValue, defaultGradientHandles, defaultMediaDisplay, gradientColorAt, gradientFrame, gradientParamAt, legacyGradientHandles, moveItem, moveStopPayload, normalizeBackgroundValue, normalizeGradient, normalizeGradientHandles, normalizeHex, normalizeMediaDisplay, sameBackgroundValue, sameGradient, sameHandles, sortStops, stopCssColor, switchGradientShape, widestGapMiddle };
