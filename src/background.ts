import { clamp, colorFormat, colorToRgb, fitGamut, formatColor, parseColor, rgbToColor } from './color';

export type BackgroundMode = 'solid' | 'gradient' | 'media';
export type GradientShape = 'linear' | 'radial' | 'angular' | 'diamond';

export type GradientStop = {
  /** Position along the gradient, 0–100. */
  at: number;
  /** Any CSS color the color control accepts, opacity included. */
  color: string;
};

/** A point as a fraction of the box: x 0 is the left edge, y 0 the top edge. */
export type GradientPoint = { x: number; y: number };

/**
 * A linear gradient runs from `start` to `end`. The other shapes are centred
 * on `start`; `end` sets the main radius and its direction, and `width` the
 * radius across it.
 */
export type GradientHandles = { start: GradientPoint; end: GradientPoint; width: GradientPoint };

export type BackgroundGradient = {
  shape: GradientShape;
  handles: GradientHandles;
  /** 2–8 stops, sorted by position. */
  stops: GradientStop[];
};

export type BackgroundMedia = {
  /** Any URL the browser can show, including data URLs. */
  src: string;
  kind: 'image' | 'video';
};

export type BackgroundMediaFit = 'fill' | 'fit' | 'stretch' | 'tile';
export type BackgroundMediaRatio = '16:9' | '4:3' | '1:1' | '4:5' | '3:4' | '9:16' | 'source';

export type BackgroundMediaDisplay = {
  /** Fill covers the box, Fit shows all of the media, Stretch ignores its shape, Tile repeats it. */
  fit: BackgroundMediaFit;
  /** The shape the media is cropped to; 'source' keeps its own. */
  ratio: BackgroundMediaRatio;
  /** 1–3. */
  zoom: number;
  /** One tile's height as a share of the box's height, 0.05–1. */
  tileSize: number;
  /** The part of the media that stays in view when it is cropped. */
  position: { x: 'left' | 'center' | 'right'; y: 'top' | 'center' | 'bottom' };
};

export type BackgroundValue = {
  mode: BackgroundMode;
  color: string;
  gradient: BackgroundGradient;
  media: BackgroundMedia | null;
  /** Kept when the media is replaced or removed. */
  mediaDisplay: BackgroundMediaDisplay;
};

/** A value with any field left out; missing fields keep their current value or the default. */
export type BackgroundValueUpdate = {
  mode?: BackgroundMode;
  color?: string;
  gradient?: Partial<BackgroundGradient>;
  media?: BackgroundMedia | null;
  mediaDisplay?: Partial<BackgroundMediaDisplay>;
};

export type BackgroundConfig = {
  type: 'background';
  default?: BackgroundValueUpdate;
  /** Stores a dropped or picked file and returns its URL. Without it, files up to 10 MB are read as data URLs. */
  upload?: (file: File) => Promise<string>;
};

export type SavedGradient = { id: string; gradient: BackgroundGradient };

export const GRADIENT_SHAPES: readonly GradientShape[] = ['linear', 'radial', 'angular', 'diamond'];
export const MEDIA_FITS: readonly BackgroundMediaFit[] = ['fill', 'fit', 'stretch', 'tile'];
export const MEDIA_RATIOS: readonly BackgroundMediaRatio[] = ['16:9', '4:3', '1:1', '4:5', '3:4', '9:16', 'source'];
export const MIN_GRADIENT_STOPS = 2;
export const MAX_GRADIENT_STOPS = 8;
export const MEDIA_ZOOM = { min: 1, max: 3, step: 0.1 } as const;
export const MEDIA_TILE_SIZE = { min: 0.05, max: 1, step: 0.01 } as const;

const MODES: readonly BackgroundMode[] = ['solid', 'gradient', 'media'];
/** Handles may sit outside the box, up to ten boxes past either edge; farther ones add nothing and keep the maths finite. */
const POINT_RANGE = { min: -10, max: 11 } as const;
const COLUMNS = ['left', 'center', 'right'] as const;
const ROWS = ['top', 'center', 'bottom'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const oneOf = <T>(options: readonly T[], value: unknown, fallback: T): T => options.includes(value as T) ? value as T : fallback;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const round = (n: number, digits: number) => Number(n.toFixed(digits)) || 0;
const validColor = (value: unknown): value is string => typeof value === 'string' && parseColor(value) !== null;

/** Black to white, top to bottom, each end 10% in from the edge. */
export function defaultBackgroundValue(): BackgroundValue {
  return {
    mode: 'solid',
    color: '#000000',
    gradient: {
      shape: 'linear',
      handles: { start: { x: 0.5, y: 0.1 }, end: { x: 0.5, y: 0.9 }, width: { x: 0.1, y: 0.5 } },
      stops: [{ at: 0, color: '#000000' }, { at: 100, color: '#ffffff' }],
    },
    media: null,
    mediaDisplay: { fit: 'fill', ratio: 'source', zoom: 1, tileSize: 0.25, position: { x: 'center', y: 'center' } },
  };
}

function normalizePoint(value: unknown, fallback: GradientPoint): GradientPoint {
  if (!isRecord(value) || !finite(value.x) || !finite(value.y)) return { ...fallback };
  return { x: round(clamp(value.x, POINT_RANGE.min, POINT_RANGE.max), 6), y: round(clamp(value.y, POINT_RANGE.min, POINT_RANGE.max), 6) };
}

/** Sorted by position; stops at the same position keep their order. */
export function sortStops(stops: readonly GradientStop[]): GradientStop[] {
  return stops.map((stop, i) => ({ stop, i })).sort((a, b) => a.stop.at - b.stop.at || a.i - b.i).map(({ stop }) => stop);
}

/**
 * A complete, valid gradient, each missing or invalid field taken from
 * `fallback`. A new shape without handles moves the fallback's handles as
 * switching shape in the panel does, so a centred shape starts centred.
 */
export function normalizeGradient(value: unknown, fallback: BackgroundGradient = defaultBackgroundValue().gradient): BackgroundGradient {
  const input = isRecord(value) ? value : {};
  const shape = oneOf(GRADIENT_SHAPES, input.shape, fallback.shape);
  const handles = isRecord(input.handles) ? input.handles : {};
  const base = isRecord(input.handles) ? fallback.handles : switchGradientShape(fallback, shape).handles;
  const stops = Array.isArray(input.stops)
    ? input.stops.filter((stop): stop is GradientStop => isRecord(stop) && finite(stop.at) && validColor(stop.color))
      .map(stop => ({ at: round(clamp(stop.at, 0, 100), 2), color: stop.color.trim() }))
    : [];
  return {
    shape,
    handles: {
      start: normalizePoint(handles.start, base.start),
      end: normalizePoint(handles.end, base.end),
      width: normalizePoint(handles.width, base.width),
    },
    stops: stops.length >= MIN_GRADIENT_STOPS ? capStops(sortStops(stops)) : fallback.stops.map(stop => ({ ...stop })),
  };
}

/** Too many stops keep the first, the last, and an even spread between them. */
function capStops(sorted: GradientStop[]): GradientStop[] {
  const n = sorted.length;
  if (n <= MAX_GRADIENT_STOPS) return sorted;
  return Array.from({ length: MAX_GRADIENT_STOPS }, (_, i) => sorted[Math.round(i * (n - 1) / (MAX_GRADIENT_STOPS - 1))]);
}

function normalizeMediaDisplay(value: unknown, fallback: BackgroundMediaDisplay): BackgroundMediaDisplay {
  const input = isRecord(value) ? value : {};
  const position = isRecord(input.position) ? input.position : {};
  return {
    fit: oneOf(MEDIA_FITS, input.fit, fallback.fit),
    ratio: oneOf(MEDIA_RATIOS, input.ratio, fallback.ratio),
    zoom: finite(input.zoom) ? round(clamp(input.zoom, MEDIA_ZOOM.min, MEDIA_ZOOM.max), 1) : fallback.zoom,
    tileSize: finite(input.tileSize) ? round(clamp(input.tileSize, MEDIA_TILE_SIZE.min, MEDIA_TILE_SIZE.max), 2) : fallback.tileSize,
    position: { x: oneOf(COLUMNS, position.x, fallback.position.x), y: oneOf(ROWS, position.y, fallback.position.y) },
  };
}

/**
 * A complete, valid value. Each missing or invalid field falls back to the
 * same field of `fallback` (the current value, or the default), so a partial
 * update such as `{ mode: 'gradient' }` keeps everything else.
 */
export function normalizeBackgroundValue(value: unknown, fallback: BackgroundValue = defaultBackgroundValue()): BackgroundValue {
  const input = isRecord(value) ? value : {};
  const media = input.media;
  return {
    mode: oneOf(MODES, input.mode, fallback.mode),
    color: validColor(input.color) ? input.color.trim() : fallback.color,
    gradient: normalizeGradient(input.gradient, fallback.gradient),
    media: media === null ? null
      : isRecord(media) && typeof media.src === 'string' && media.src && (media.kind === 'image' || media.kind === 'video')
        ? { src: media.src, kind: media.kind }
        : fallback.media && { ...fallback.media },
    mediaDisplay: normalizeMediaDisplay(input.mediaDisplay, fallback.mediaDisplay),
  };
}

export function sameGradient(a: BackgroundGradient, b: BackgroundGradient): boolean {
  const point = (p: GradientPoint, q: GradientPoint) => p.x === q.x && p.y === q.y;
  return a.shape === b.shape && point(a.handles.start, b.handles.start) && point(a.handles.end, b.handles.end) &&
    point(a.handles.width, b.handles.width) && a.stops.length === b.stops.length &&
    a.stops.every((stop, i) => stop.at === b.stops[i].at && stop.color === b.stops[i].color);
}

/** Compares two normalized values. */
export function sameBackgroundValue(a: BackgroundValue, b: BackgroundValue): boolean {
  const p = a.mediaDisplay;
  const q = b.mediaDisplay;
  return a.mode === b.mode && a.color === b.color && sameGradient(a.gradient, b.gradient) &&
    a.media?.src === b.media?.src && a.media?.kind === b.media?.kind &&
    p.fit === q.fit && p.ratio === q.ratio && p.zoom === q.zoom && p.tileSize === q.tileSize &&
    p.position.x === q.position.x && p.position.y === q.position.y;
}

export function cloneGradient(gradient: BackgroundGradient): BackgroundGradient {
  const { start, end, width } = gradient.handles;
  return { shape: gradient.shape, handles: { start: { ...start }, end: { ...end }, width: { ...width } }, stops: gradient.stops.map(stop => ({ ...stop })) };
}

/**
 * Switching between Linear and the centred shapes keeps the gradient in
 * place: the centre goes to the middle of the line, with the width point a
 * quarter turn from the end, and back again. Between the centred shapes the
 * handles stay as they are. The stops never change.
 */
export function switchGradientShape(gradient: BackgroundGradient, shape: GradientShape): BackgroundGradient {
  const next = { ...cloneGradient(gradient), shape };
  if ((gradient.shape === 'linear') === (shape === 'linear')) return next;
  const { start, end, width } = gradient.handles;
  const point = (x: number, y: number) => ({ x: round(x, 6), y: round(y, 6) });
  if (gradient.shape === 'linear') {
    const centre = point((start.x + end.x) / 2, (start.y + end.y) / 2);
    next.handles = { start: centre, end: { ...end }, width: point(centre.x - (end.y - centre.y), centre.y + (end.x - centre.x)) };
  } else {
    next.handles = { start: point(2 * start.x - end.x, 2 * start.y - end.y), end: { ...end }, width: { ...width } };
  }
  return next;
}

/** A quarter turn clockwise, around the middle of a linear gradient's line or the centre of the others. */
export function rotateGradient(gradient: BackgroundGradient): BackgroundGradient {
  const { start, end, width } = gradient.handles;
  const pivot = gradient.shape === 'linear' ? { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 } : start;
  const turn = (p: GradientPoint) => ({ x: round(pivot.x - (p.y - pivot.y), 6), y: round(pivot.y + (p.x - pivot.x), 6) });
  return { ...cloneGradient(gradient), handles: { start: turn(start), end: turn(end), width: turn(width) } };
}

/**
 * Reorders the stops' colors and keeps their positions: the color at `from`
 * moves to the stop at `to`, and the colors between shift by one.
 */
export function moveStopColor(stops: readonly GradientStop[], from: number, to: number): GradientStop[] {
  const colors = stops.map(stop => stop.color);
  const [color] = colors.splice(from, 1);
  colors.splice(clamp(to, 0, colors.length), 0, color);
  return stops.map((stop, i) => ({ at: stop.at, color: colors[i] }));
}

/** The middle of the widest gap between two neighbouring stops. */
export function widestGapMiddle(stops: readonly GradientStop[]): number {
  let widest = 0;
  let middle = 50;
  for (let i = 0; i < stops.length - 1; i++) {
    const gap = stops[i + 1].at - stops[i].at;
    if (gap > widest) { widest = gap; middle = stops[i].at + gap / 2; }
  }
  return round(middle, 2);
}

const rgba = (value: string): [number, number, number, number] => {
  const color = parseColor(value) ?? { l: 0, c: 0, h: 0, a: 1 };
  const [r, g, b] = colorToRgb(fitGamut(color)).map(n => clamp(n));
  return [r, g, b, color.a];
};

/**
 * The color a sorted gradient shows at a position, mixed in sRGB as CSS
 * gradients mix by default, written in the format of the stop before it.
 */
export function gradientColorAt(stops: readonly GradientStop[], at: number): string {
  const after = stops.findIndex(stop => stop.at > at);
  if (after <= 0) return (after === 0 ? stops[0] : stops[stops.length - 1])?.color ?? '#000000';
  const a = stops[after - 1];
  const b = stops[after];
  if (a.at === at) return a.color;
  const t = (at - a.at) / (b.at - a.at);
  const [x, y] = [rgba(a.color), rgba(b.color)];
  const mix = x.map((n, i) => n + (y[i] - n) * t);
  return formatColor(rgbToColor([mix[0], mix[1], mix[2]], mix[3]), colorFormat(a.color));
}

/** The gradient's axes in pixels for a box of `width` × `height`. */
export type GradientFrame = { cx: number; cy: number; ax: number; ay: number; nx: number; ny: number; r1: number; r2: number };

export function gradientFrame(handles: GradientHandles, width: number, height: number): GradientFrame {
  const cx = handles.start.x * width;
  const cy = handles.start.y * height;
  let ex = handles.end.x * width - cx;
  let ey = handles.end.y * height - cy;
  let r1 = Math.hypot(ex, ey);
  if (r1 < 1e-6) { ex = 0; ey = 1; r1 = 1e-6; }
  const ax = ex / Math.hypot(ex, ey);
  const ay = ey / Math.hypot(ex, ey);
  // The cross axis points to the side of the main axis the width point is on.
  const cross = ax * (handles.width.y * height - cy) - ay * (handles.width.x * width - cx);
  const side = cross < 0 ? -1 : 1;
  return { cx, cy, ax, ay, nx: -ay * side, ny: ax * side, r1, r2: Math.max(Math.abs(cross), 1e-6) };
}

/**
 * Where a pixel falls on the gradient: 0 at the first position, 1 at the
 * last. With u and v the pixel's distance from the centre along each axis,
 * in radii: linear t = u, radial √(u² + v²), diamond |u| + |v|, and angular
 * the turn from the end handle towards the width side.
 */
export function gradientParamAt(shape: GradientShape, frame: GradientFrame, x: number, y: number): number {
  const dx = x - frame.cx;
  const dy = y - frame.cy;
  const u = (dx * frame.ax + dy * frame.ay) / frame.r1;
  if (shape === 'linear') return u;
  const v = (dx * frame.nx + dy * frame.ny) / frame.r2;
  if (shape === 'radial') return Math.hypot(u, v);
  if (shape === 'diamond') return Math.abs(u) + Math.abs(v);
  const turn = Math.atan2(v, u) / (2 * Math.PI);
  return turn < 0 ? turn + 1 : turn;
}

/** The stops laid flat as a linear gradient across the box, left to right, as the stop strip shows every shape. */
export function gradientStrip(stops: readonly GradientStop[]): BackgroundGradient {
  return { shape: 'linear', handles: { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0, y: 1 } }, stops: stops.map(stop => ({ ...stop })) };
}

/** Draws a gradient into a canvas at the canvas's own size, every shape exactly. */
export function paintGradient(canvas: HTMLCanvasElement, gradient: BackgroundGradient): void {
  const context = canvas.getContext('2d');
  const { width, height } = canvas;
  if (!context || !width || !height) return;
  // A table of 256 colors, so each pixel is one lookup.
  const table = Array.from({ length: 256 }, (_, i) => rgba(gradientColorAt(gradient.stops, i / 255 * 100)).map(n => Math.round(n * 255)));
  const frame = gradientFrame(gradient.handles, width, height);
  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = table[Math.round(clamp(gradientParamAt(gradient.shape, frame, x + 0.5, y + 0.5)) * 255)];
      image.data.set(color, (y * width + x) * 4);
    }
  }
  context.putImageData(image, 0, 0);
}

/**
 * The gradient as a CSS image for a square box. Linear is exact; radial and
 * angular are exact while the handles keep to the box's axes, as the panel
 * keeps them. CSS has no diamond gradient, so a diamond is drawn as its
 * radial ellipse; use `paintGradient` to draw it exactly.
 */
export function backgroundGradientCss(gradient: BackgroundGradient): string {
  const list = (stops: readonly GradientStop[]) => stops.map(stop => `${stop.color} ${round(stop.at, 2)}%`).join(', ');
  const frame = gradientFrame(gradient.handles, 100, 100);
  const at = `${round(frame.cx, 2)}% ${round(frame.cy, 2)}%`;
  const angle = Math.atan2(frame.ax, -frame.ay) * 180 / Math.PI;
  if (gradient.shape === 'linear') {
    // CSS's line passes through the box's centre and is |sin| + |cos| long.
    const length = Math.abs(frame.ax) + Math.abs(frame.ay);
    const along = (t: number) => {
      const x = (frame.cx + frame.ax * frame.r1 * t) / 100 - 0.5;
      const y = (frame.cy + frame.ay * frame.r1 * t) / 100 - 0.5;
      return ((x * frame.ax + y * frame.ay) / length + 0.5) * 100;
    };
    return `linear-gradient(${round(angle, 2)}deg, ${list(gradient.stops.map(stop => ({ ...stop, at: along(stop.at / 100) })))})`;
  }
  if (gradient.shape === 'angular') {
    // CSS turns clockwise; the gradient turns towards its width side.
    const clockwise = frame.ax * frame.ny - frame.ay * frame.nx > 0;
    const stops = clockwise ? gradient.stops : gradient.stops.map(stop => ({ ...stop, at: 100 - stop.at })).reverse();
    return `conic-gradient(from ${round(angle, 2)}deg at ${at}, ${list(stops)})`;
  }
  const horizontal = Math.abs(frame.ax) >= Math.abs(frame.ay);
  return `radial-gradient(${round(horizontal ? frame.r1 : frame.r2, 2)}% ${round(horizontal ? frame.r2 : frame.r1, 2)}% at ${at}, ${list(gradient.stops)})`;
}

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
export function backgroundMediaCss(media: BackgroundMedia, display: BackgroundMediaDisplay): Partial<Record<MediaCssProperty, string>> {
  const position = `${display.position.x} ${display.position.y}`;
  const zoom = { transform: `scale(${display.zoom})`, 'transform-origin': position };
  if (media.kind === 'video') {
    return { 'object-fit': display.fit === 'fit' ? 'contain' : display.fit === 'stretch' ? 'fill' : 'cover', 'object-position': position, ...zoom };
  }
  const size = { fill: 'cover', fit: 'contain', stretch: '100% 100%', tile: `auto ${round(display.tileSize * 100, 2)}%` }[display.fit];
  return { 'background-image': `url(${JSON.stringify(media.src)})`, 'background-position': position, 'background-repeat': display.fit === 'tile' ? 'repeat' : 'no-repeat', 'background-size': size, ...zoom };
}
