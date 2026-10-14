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
interface BackgroundGradient {
    shape: 'linear' | 'radial';
    /** Degrees 0..360, CSS convention: 0 points up, 90 right, 180 down. Unused for radial. */
    angle: number;
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
declare function defaultMediaDisplay(): BackgroundMediaDisplay;
/** '#rrggbb' lowercase for '#rgb' or '#rrggbb' input, or null. */
declare function normalizeHex(value: unknown): string | null;
/** Wraps any finite angle into 0..360 (360 itself stays 360). */
declare function normalizeAngle(value: number): number;
/** Stable sort by `at`: stops at the same place keep their order. */
declare function sortStops(stops: BackgroundStop[]): BackgroundStop[];
declare function normalizeGradient(value: unknown, fallback?: BackgroundGradient): BackgroundGradient;
declare function normalizeMediaDisplay(value: unknown, fallback?: BackgroundMediaDisplay): BackgroundMediaDisplay;
/**
 * A fresh, valid value. Each field that is missing or invalid falls back to
 * the same field of `fallback` (the control's default), so one bad field
 * never resets the rest.
 */
declare function normalizeBackgroundValue(value: unknown, fallback?: BackgroundValue): BackgroundValue;
/** The config's default, made valid. */
declare function backgroundConfigDefault(config?: Pick<BackgroundConfig, 'default'>): BackgroundValue;
declare function cloneGradient(gradient: BackgroundGradient): BackgroundGradient;
declare function cloneBackgroundValue(value: BackgroundValue): BackgroundValue;
declare function sameGradient(a: BackgroundGradient, b: BackgroundGradient): boolean;
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
/** The gradient as a CSS image, for previews and for hosts that paint with CSS. */
declare function backgroundGradientCss(gradient: BackgroundGradient, direction?: string): string;

export { BACKGROUND_FITS, BACKGROUND_MAX_STOPS, BACKGROUND_MIN_STOPS, BACKGROUND_MODES, BACKGROUND_RATIOS, BACKGROUND_TILE_SCALE, BACKGROUND_ZOOM, type BackgroundConfig, type BackgroundGradient, type BackgroundMedia, type BackgroundMediaDisplay, type BackgroundStop, type BackgroundValue, type SavedGradient, backgroundConfigDefault, backgroundGradientCss, cloneBackgroundValue, cloneGradient, defaultBackgroundValue, defaultMediaDisplay, gradientColorAt, moveItem, moveStopPayload, normalizeAngle, normalizeBackgroundValue, normalizeGradient, normalizeHex, normalizeMediaDisplay, sameBackgroundValue, sameGradient, sortStops, stopCssColor, widestGapMiddle };
