type BackgroundMode = 'solid' | 'gradient' | 'media';
type GradientShape = 'linear' | 'radial' | 'angular' | 'diamond';
type GradientStop = {
    /** Position along the gradient, 0–100. */
    at: number;
    /** Any CSS color the color control accepts, opacity included. */
    color: string;
};
/** A point as a fraction of the box: x 0 is the left edge, y 0 the top edge. */
type GradientPoint = {
    x: number;
    y: number;
};
/**
 * A linear gradient runs from `start` to `end`. The other shapes are centred
 * on `start`; `end` sets the main radius and its direction, and `width` the
 * radius across it.
 */
type GradientHandles = {
    start: GradientPoint;
    end: GradientPoint;
    width: GradientPoint;
};
type BackgroundGradient = {
    shape: GradientShape;
    handles: GradientHandles;
    /** 2–8 stops, sorted by position. */
    stops: GradientStop[];
};
type BackgroundMedia = {
    /** Any URL the browser can show, including data URLs. */
    src: string;
    kind: 'image' | 'video';
};
type BackgroundMediaFit = 'fill' | 'fit' | 'stretch' | 'tile';
type BackgroundMediaRatio = '16:9' | '4:3' | '1:1' | '4:5' | '3:4' | '9:16' | 'source';
type BackgroundMediaDisplay = {
    /** Fill covers the box, Fit shows all of the media, Stretch ignores its shape, Tile repeats it. */
    fit: BackgroundMediaFit;
    /** The shape the media is cropped to; 'source' keeps its own. */
    ratio: BackgroundMediaRatio;
    /** 1–3. */
    zoom: number;
    /** One tile's height as a share of the box's height, 0.05–1. */
    tileSize: number;
    /** The part of the media that stays in view when it is cropped. */
    position: {
        x: 'left' | 'center' | 'right';
        y: 'top' | 'center' | 'bottom';
    };
};
type BackgroundValue = {
    mode: BackgroundMode;
    color: string;
    gradient: BackgroundGradient;
    media: BackgroundMedia | null;
    /** Kept when the media is replaced or removed. */
    mediaDisplay: BackgroundMediaDisplay;
};
/** A value with any field left out; missing fields keep their current value or the default. */
type BackgroundValueUpdate = {
    mode?: BackgroundMode;
    color?: string;
    gradient?: Partial<BackgroundGradient>;
    media?: BackgroundMedia | null;
    mediaDisplay?: Partial<BackgroundMediaDisplay>;
};
type BackgroundConfig = {
    type: 'background';
    default?: BackgroundValueUpdate;
    /** Stores a dropped or picked file and returns its URL. Without it, files up to 10 MB are read as data URLs. */
    upload?: (file: File) => Promise<string>;
};
type SavedGradient = {
    id: string;
    gradient: BackgroundGradient;
};
declare const GRADIENT_SHAPES: readonly GradientShape[];
declare const MEDIA_FITS: readonly BackgroundMediaFit[];
declare const MEDIA_RATIOS: readonly BackgroundMediaRatio[];
declare const MIN_GRADIENT_STOPS = 2;
declare const MAX_GRADIENT_STOPS = 8;
declare const MEDIA_ZOOM: {
    readonly min: 1;
    readonly max: 3;
    readonly step: 0.1;
};
declare const MEDIA_TILE_SIZE: {
    readonly min: 0.05;
    readonly max: 1;
    readonly step: 0.01;
};
/** Black to white, top to bottom, each end 10% in from the edge. */
declare function defaultBackgroundValue(): BackgroundValue;
/** Sorted by position; stops at the same position keep their order. */
declare function sortStops(stops: readonly GradientStop[]): GradientStop[];
/**
 * A complete, valid gradient, each missing or invalid field taken from
 * `fallback`. A new shape without handles moves the fallback's handles as
 * switching shape in the panel does, so a centred shape starts centred.
 */
declare function normalizeGradient(value: unknown, fallback?: BackgroundGradient): BackgroundGradient;
/**
 * A complete, valid value. Each missing or invalid field falls back to the
 * same field of `fallback` (the current value, or the default), so a partial
 * update such as `{ mode: 'gradient' }` keeps everything else.
 */
declare function normalizeBackgroundValue(value: unknown, fallback?: BackgroundValue): BackgroundValue;
declare function sameGradient(a: BackgroundGradient, b: BackgroundGradient): boolean;
/** Compares two normalized values. */
declare function sameBackgroundValue(a: BackgroundValue, b: BackgroundValue): boolean;
declare function cloneGradient(gradient: BackgroundGradient): BackgroundGradient;
/**
 * Switching between Linear and the centred shapes keeps the gradient in
 * place: the centre goes to the middle of the line, with the width point a
 * quarter turn from the end, and back again. Between the centred shapes the
 * handles stay as they are. The stops never change.
 */
declare function switchGradientShape(gradient: BackgroundGradient, shape: GradientShape): BackgroundGradient;
/** A quarter turn clockwise, around the middle of a linear gradient's line or the centre of the others. */
declare function rotateGradient(gradient: BackgroundGradient): BackgroundGradient;
/**
 * Reorders the stops' colors and keeps their positions: the color at `from`
 * moves to the stop at `to`, and the colors between shift by one.
 */
declare function moveStopColor(stops: readonly GradientStop[], from: number, to: number): GradientStop[];
/** A color's opacity, 0–100. */
declare function colorOpacity(color: string): number;
/** The color at another opacity, 0–100, written in its own format. */
declare function withOpacity(color: string, opacity: number): string;
/** The middle of the widest gap between two neighbouring stops. */
declare function widestGapMiddle(stops: readonly GradientStop[]): number;
/**
 * The color a sorted gradient shows at a position, mixed in sRGB as CSS
 * gradients mix by default, written in the format of the stop before it.
 */
declare function gradientColorAt(stops: readonly GradientStop[], at: number): string;
/** The gradient's axes in pixels for a box of `width` × `height`. */
type GradientFrame = {
    cx: number;
    cy: number;
    ax: number;
    ay: number;
    nx: number;
    ny: number;
    r1: number;
    r2: number;
};
declare function gradientFrame(handles: GradientHandles, width: number, height: number): GradientFrame;
/**
 * Where a pixel falls on the gradient: 0 at the first position, 1 at the
 * last. With u and v the pixel's distance from the centre along each axis,
 * in radii: linear t = u, radial √(u² + v²), diamond |u| + |v|, and angular
 * the turn from the end handle towards the width side.
 */
declare function gradientParamAt(shape: GradientShape, frame: GradientFrame, x: number, y: number): number;
/** The stops laid flat as a linear gradient across the box, left to right, as the stop strip shows every shape. */
declare function gradientStrip(stops: readonly GradientStop[]): BackgroundGradient;
/** Draws a gradient into a canvas at the canvas's own size, every shape exactly. */
declare function paintGradient(canvas: HTMLCanvasElement, gradient: BackgroundGradient): void;
/**
 * The gradient as a CSS image for a square box. Linear is exact; radial and
 * angular are exact while the handles keep to the box's axes, as the panel
 * keeps them. CSS has no diamond gradient, so a diamond is drawn as its
 * radial ellipse; use `paintGradient` to draw it exactly.
 */
declare function backgroundGradientCss(gradient: BackgroundGradient): string;
type MediaCssProperty = 'background-image' | 'background-position' | 'background-repeat' | 'background-size' | 'object-fit' | 'object-position' | 'transform' | 'transform-origin';
/**
 * The media as CSS properties, as the panel's preview draws it, keyed by CSS
 * property name. Give them to an element that fills a box with
 * `overflow: hidden`: any element for an image, which becomes its background,
 * or the `<video>` itself. Zoom scales the media around the part kept in view.
 * Tile repeats an image; a video fills its box instead. The ratio is the box's
 * shape, so set the box's `aspect-ratio` to it (or to the media's own for
 * `"source"`).
 */
declare function backgroundMediaCss(media: BackgroundMedia, display: BackgroundMediaDisplay): Partial<Record<MediaCssProperty, string>>;

export { type BackgroundConfig, type BackgroundGradient, type BackgroundMedia, type BackgroundMediaDisplay, type BackgroundMediaFit, type BackgroundMediaRatio, type BackgroundMode, type BackgroundValue, type BackgroundValueUpdate, GRADIENT_SHAPES, type GradientFrame, type GradientHandles, type GradientPoint, type GradientShape, type GradientStop, MAX_GRADIENT_STOPS, MEDIA_FITS, MEDIA_RATIOS, MEDIA_TILE_SIZE, MEDIA_ZOOM, MIN_GRADIENT_STOPS, type SavedGradient, backgroundGradientCss, backgroundMediaCss, cloneGradient, colorOpacity, defaultBackgroundValue, gradientColorAt, gradientFrame, gradientParamAt, gradientStrip, moveStopColor, normalizeBackgroundValue, normalizeGradient, paintGradient, rotateGradient, sameBackgroundValue, sameGradient, sortStops, switchGradientShape, widestGapMiddle, withOpacity };
