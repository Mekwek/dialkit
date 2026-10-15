/**
 * The background control's value: a solid color, a gradient or a media file.
 * Pure data helpers, with no DOM, shared by the store and the control.
 */

export interface BackgroundStop {
  /** Position along the gradient, 0..100 (%). */
  at: number;
  /** '#rrggbb', lowercase. */
  color: string;
  /** Opacity, 0..100 (%). */
  alpha: number;
}

export type GradientShape = 'linear' | 'radial' | 'angular' | 'diamond';

/** A point as a fraction of the canvas box: x 0 = left, 1 = right; y 0 = top, 1 = bottom. May go outside 0..1. */
export interface GradientPoint {
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
export interface GradientHandles {
  start: GradientPoint;
  end: GradientPoint;
  width: GradientPoint;
}

export interface BackgroundGradient {
  shape: GradientShape;
  handles: GradientHandles;
  /** 2..8 stops, kept sorted by `at`. */
  stops: BackgroundStop[];
}

export interface BackgroundMedia {
  /** The host's storage key, never a URL. */
  key: string;
  kind: 'image' | 'video';
}

export interface BackgroundMediaDisplay {
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

export interface BackgroundValue {
  /** The tab that is on. The key is `mode`, never `type`: DialKit reads `type` as a config type. */
  mode: 'solid' | 'gradient' | 'media';
  /** The Solid tab, '#rrggbb'. */
  color: string;
  gradient: BackgroundGradient;
  media: BackgroundMedia | null;
  /** How the media sits in its box. Replacing or removing the file keeps it. */
  mediaDisplay: BackgroundMediaDisplay;
}

export interface SavedGradient {
  id: string;
  gradient: BackgroundGradient;
}

export interface BackgroundConfig {
  type: 'background';
  default?: BackgroundValue;
}

export const BACKGROUND_MODES: BackgroundValue['mode'][] = ['solid', 'gradient', 'media'];
export const GRADIENT_SHAPES: GradientShape[] = ['linear', 'radial', 'angular', 'diamond'];
export const BACKGROUND_FITS: BackgroundMediaDisplay['fit'][] = ['fill', 'fit', 'stretch', 'tile'];
export const BACKGROUND_RATIOS: BackgroundMediaDisplay['ratio'][] = ['16:9', '4:3', '1:1', '4:5', '3:4', '9:16', 'source'];
export const BACKGROUND_MIN_STOPS = 2;
export const BACKGROUND_MAX_STOPS = 8;
export const BACKGROUND_ZOOM = { min: 1, max: 3, step: 0.1 } as const;
export const BACKGROUND_TILE_SCALE = { min: 0.05, max: 1, step: 0.01 } as const;

const PINS = [-1, 0, 1] as const;

export function defaultBackgroundValue(): BackgroundValue {
  return {
    mode: 'solid',
    color: '#000000',
    gradient: {
      shape: 'linear',
      handles: defaultGradientHandles(),
      stops: [{ at: 0, color: '#000000', alpha: 100 }, { at: 100, color: '#ffffff', alpha: 100 }],
    },
    media: null,
    mediaDisplay: defaultMediaDisplay(),
  };
}

/** The default handles: a top to bottom linear gradient, each handle 10% in from the canvas's edges. */
export function defaultGradientHandles(): GradientHandles {
  return { start: { x: 0.5, y: 0.1 }, end: { x: 0.5, y: 0.9 }, width: { x: 0.1, y: 0.5 } };
}

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
export function legacyGradientHandles(shape: 'linear' | 'radial', angle: number): GradientHandles {
  if (shape === 'radial') return { start: { x: 0.5, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0.5, y: 0 } };
  const theta = (Number.isFinite(angle) ? angle : 180) * Math.PI / 180;
  const d = { x: Math.sin(theta), y: -Math.cos(theta) };
  const h = (Math.abs(d.x) + Math.abs(d.y)) / 2;
  return {
    start: roundPoint({ x: 0.5 - d.x * h, y: 0.5 - d.y * h }),
    end: roundPoint({ x: 0.5 + d.x * h, y: 0.5 + d.y * h }),
    width: roundPoint({ x: 0.5 - d.y * h, y: 0.5 + d.x * h }),
  };
}

/** Points keep four decimals: enough for any canvas, and equal values stay equal. */
function roundPoint(point: GradientPoint): GradientPoint {
  const r = (n: number) => Math.round(n * 1e4) / 1e4 || 0;
  return { x: r(point.x), y: r(point.y) };
}

function normalizePoint(value: unknown): GradientPoint | null {
  if (!isRecord(value)) return null;
  const { x, y } = value;
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  // Far outside the box is no use, and keeps the maths finite.
  return roundPoint({ x: clamp(x, -10, 11), y: clamp(y, -10, 11) });
}

export function normalizeGradientHandles(value: unknown, fallback: GradientHandles = defaultGradientHandles()): GradientHandles {
  const input = isRecord(value) ? value : {};
  const start = normalizePoint(input.start);
  const end = normalizePoint(input.end);
  const width = normalizePoint(input.width);
  if (!start || !end) return cloneHandles(fallback);
  return { start, end, width: width ?? cloneHandles(fallback).width };
}

export function cloneHandles(handles: GradientHandles): GradientHandles {
  return { start: { ...handles.start }, end: { ...handles.end }, width: { ...handles.width } };
}

/**
 * The gradient's frame in pixels for a canvas of `width` x `height`.
 * Main axis: from start (the centre) to end, length r1, unit (ax, ay).
 * Cross axis: unit (nx, ny), perpendicular to the main axis on the side the
 * width point lies; r2 is the width point's distance from the main axis line
 * (so any width point gives an ellipse, Figma's default included).
 */
export interface GradientFrame { cx: number; cy: number; ax: number; ay: number; nx: number; ny: number; r1: number; r2: number }

export function gradientFrame(handles: GradientHandles, width: number, height: number): GradientFrame {
  const cx = handles.start.x * width;
  const cy = handles.start.y * height;
  let ex = handles.end.x * width - cx;
  let ey = handles.end.y * height - cy;
  let r1 = Math.hypot(ex, ey);
  if (r1 < 1e-6) { ex = 0; ey = 1; r1 = 1e-6; }
  const ax = ex / Math.hypot(ex, ey);
  const ay = ey / Math.hypot(ex, ey);
  const wx = handles.width.x * width - cx;
  const wy = handles.width.y * height - cy;
  // The cross product's sign says which side of the main axis the width point is on.
  const cross = ax * wy - ay * wx;
  const side = cross < 0 ? -1 : 1;
  return { cx, cy, ax, ay, nx: -ay * side, ny: ax * side, r1, r2: Math.max(Math.abs(cross), 1e-6) };
}

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
export function gradientParamAt(shape: GradientShape, frame: GradientFrame, px: number, py: number): number {
  const dx = px - frame.cx;
  const dy = py - frame.cy;
  const u = (dx * frame.ax + dy * frame.ay) / frame.r1;
  if (shape === 'linear') return u;
  const v = (dx * frame.nx + dy * frame.ny) / frame.r2;
  if (shape === 'radial') return Math.hypot(u, v);
  if (shape === 'diamond') return Math.abs(u) + Math.abs(v);
  const turn = Math.atan2(v, u) / (2 * Math.PI);
  return turn < 0 ? turn + 1 : turn;
}

export function defaultMediaDisplay(): BackgroundMediaDisplay {
  return { fit: 'fill', ratio: 'source', zoom: 1, tileScale: 0.25, pinX: 0, pinY: 0 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

/** '#rrggbb' lowercase for '#rgb' or '#rrggbb' input, or null. */
export function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const hex = match[1].length === 3 ? [...match[1]].map(c => c + c).join('') : match[1];
  return `#${hex.toLowerCase()}`;
}

/** Stable sort by `at`: stops at the same place keep their order. */
export function sortStops(stops: BackgroundStop[]): BackgroundStop[] {
  return stops.map((stop, i) => ({ stop, i }))
    .sort((a, b) => a.stop.at - b.stop.at || a.i - b.i)
    .map(({ stop }) => stop);
}

function normalizeStop(value: unknown): BackgroundStop | null {
  if (!isRecord(value)) return null;
  const color = normalizeHex(value.color);
  if (!color || typeof value.at !== 'number' || !Number.isFinite(value.at)) return null;
  const alpha = typeof value.alpha === 'number' && Number.isFinite(value.alpha) ? value.alpha : 100;
  return { at: round2(clamp(value.at, 0, 100)), color, alpha: round2(clamp(alpha, 0, 100)) };
}

export function normalizeGradient(value: unknown, fallback: BackgroundGradient = defaultBackgroundValue().gradient): BackgroundGradient {
  if (!isRecord(value)) return cloneGradient(fallback);
  const shape = GRADIENT_SHAPES.includes(value.shape as GradientShape) ? value.shape as GradientShape : fallback.shape;
  // A value saved before handles existed has `angle` instead: convert it.
  const handles = isRecord(value.handles)
    ? normalizeGradientHandles(value.handles, fallback.handles)
    : typeof value.angle === 'number' && Number.isFinite(value.angle) || value.shape === 'radial'
      ? legacyGradientHandles(value.shape === 'radial' ? 'radial' : 'linear', typeof value.angle === 'number' ? value.angle : 180)
      : cloneHandles(fallback.handles);
  const stops = Array.isArray(value.stops)
    ? value.stops.map(normalizeStop).filter((stop): stop is BackgroundStop => stop !== null)
    : [];
  return {
    shape,
    handles,
    stops: stops.length >= BACKGROUND_MIN_STOPS
      ? sortStops(stops).slice(0, BACKGROUND_MAX_STOPS)
      : fallback.stops.map(stop => ({ ...stop })),
  };
}

function normalizeMedia(value: unknown): BackgroundMedia | null {
  if (!isRecord(value)) return null;
  if (typeof value.key !== 'string' || !value.key) return null;
  if (value.kind !== 'image' && value.kind !== 'video') return null;
  return { key: value.key, kind: value.kind };
}

export function normalizeMediaDisplay(value: unknown, fallback: BackgroundMediaDisplay = defaultMediaDisplay()): BackgroundMediaDisplay {
  const input = isRecord(value) ? value : {};
  const zoom = typeof input.zoom === 'number' && Number.isFinite(input.zoom)
    ? Math.round(clamp(input.zoom, BACKGROUND_ZOOM.min, BACKGROUND_ZOOM.max) * 10) / 10
    : fallback.zoom;
  const tileScale = typeof input.tileScale === 'number' && Number.isFinite(input.tileScale)
    ? Math.round(clamp(input.tileScale, BACKGROUND_TILE_SCALE.min, BACKGROUND_TILE_SCALE.max) * 100) / 100
    : fallback.tileScale;
  return {
    fit: BACKGROUND_FITS.includes(input.fit as BackgroundMediaDisplay['fit']) ? input.fit as BackgroundMediaDisplay['fit'] : fallback.fit,
    ratio: BACKGROUND_RATIOS.includes(input.ratio as BackgroundMediaDisplay['ratio']) ? input.ratio as BackgroundMediaDisplay['ratio'] : fallback.ratio,
    zoom,
    tileScale,
    pinX: PINS.includes(input.pinX as -1 | 0 | 1) ? input.pinX as -1 | 0 | 1 : fallback.pinX,
    pinY: PINS.includes(input.pinY as -1 | 0 | 1) ? input.pinY as -1 | 0 | 1 : fallback.pinY,
  };
}

/**
 * A fresh, valid value. Each field that is missing or invalid falls back to
 * the same field of `fallback` (the control's default), so one bad field
 * never resets the rest.
 */
export function normalizeBackgroundValue(value: unknown, fallback: BackgroundValue = defaultBackgroundValue()): BackgroundValue {
  const base = fallback;
  if (!isRecord(value)) return cloneBackgroundValue(base);
  return {
    mode: BACKGROUND_MODES.includes(value.mode as BackgroundValue['mode']) ? value.mode as BackgroundValue['mode'] : base.mode,
    color: normalizeHex(value.color) ?? base.color,
    gradient: normalizeGradient(value.gradient, base.gradient),
    media: 'media' in value ? normalizeMedia(value.media) : base.media && { ...base.media },
    mediaDisplay: normalizeMediaDisplay(value.mediaDisplay, base.mediaDisplay),
  };
}

/** The config's default, made valid. */
export function backgroundConfigDefault(config?: Pick<BackgroundConfig, 'default'>): BackgroundValue {
  return normalizeBackgroundValue(config?.default, defaultBackgroundValue());
}

export function cloneGradient(gradient: BackgroundGradient): BackgroundGradient {
  return { shape: gradient.shape, handles: cloneHandles(gradient.handles), stops: gradient.stops.map(stop => ({ ...stop })) };
}

export function cloneBackgroundValue(value: BackgroundValue): BackgroundValue {
  return {
    mode: value.mode,
    color: value.color,
    gradient: cloneGradient(value.gradient),
    media: value.media && { ...value.media },
    mediaDisplay: { ...value.mediaDisplay },
  };
}

function sameStops(a: BackgroundStop[], b: BackgroundStop[]): boolean {
  return a.length === b.length && a.every((stop, i) => stop.at === b[i].at && stop.color === b[i].color && stop.alpha === b[i].alpha);
}

export function sameGradient(a: BackgroundGradient, b: BackgroundGradient): boolean {
  return a.shape === b.shape && sameHandles(a.handles, b.handles) && sameStops(a.stops, b.stops);
}

function samePoint(a: GradientPoint, b: GradientPoint): boolean {
  return !!a && !!b && a.x === b.x && a.y === b.y;
}

export function sameHandles(a: GradientHandles, b: GradientHandles): boolean {
  return isRecord(a) && isRecord(b) && samePoint(a.start, b.start) && samePoint(a.end, b.end) && samePoint(a.width, b.width);
}

export function sameBackgroundValue(a: unknown, b: unknown): boolean {
  if (!isRecord(a) || !isRecord(b)) return false;
  const x = a as unknown as BackgroundValue;
  const y = b as unknown as BackgroundValue;
  if (x.mode !== y.mode || x.color !== y.color) return false;
  if (!isRecord(x.gradient) || !isRecord(y.gradient) || !Array.isArray(x.gradient.stops) || !Array.isArray(y.gradient.stops)) return false;
  if (!isRecord(x.gradient.handles) || !isRecord(y.gradient.handles)) return false;
  if (!sameGradient(x.gradient, y.gradient)) return false;
  if ((x.media === null) !== (y.media === null)) return false;
  if (x.media && y.media && (x.media.key !== y.media.key || x.media.kind !== y.media.kind)) return false;
  const p = x.mediaDisplay;
  const q = y.mediaDisplay;
  if (!isRecord(p) || !isRecord(q)) return p === q;
  return p.fit === q.fit && p.ratio === q.ratio && p.zoom === q.zoom && p.tileScale === q.tileScale && p.pinX === q.pinX && p.pinY === q.pinY;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb: number[]): string {
  return `#${rgb.map(n => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0')).join('')}`;
}

/** The color and opacity a sorted gradient shows at `at` (0..100), interpolated in sRGB. */
export function gradientColorAt(stops: BackgroundStop[], at: number): { color: string; alpha: number } {
  if (stops.length === 0) return { color: '#000000', alpha: 100 };
  if (at <= stops[0].at) return { color: stops[0].color, alpha: stops[0].alpha };
  const last = stops[stops.length - 1];
  if (at >= last.at) return { color: last.color, alpha: last.alpha };
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (at < a.at || at > b.at) continue;
    const t = b.at === a.at ? 0 : (at - a.at) / (b.at - a.at);
    const ca = hexToRgb(a.color);
    const cb = hexToRgb(b.color);
    return {
      color: rgbToHex(ca.map((n, k) => n + (cb[k] - n) * t)),
      alpha: Math.round(a.alpha + (b.alpha - a.alpha) * t),
    };
  }
  return { color: last.color, alpha: last.alpha };
}

/** `list` with the item at `from` moved to `to`; the items between shift one place. A new array. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice();
  if (from < 0 || from >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(clamp(to, 0, next.length), 0, item);
  return next;
}

/**
 * Reorders stop rows: the positions stay with their slots in the sorted
 * list, and the colors and opacities move. The stop at `from` carries its
 * color and alpha to slot `to`; the stops between shift one slot. With
 * stops at 0/50/100 colored A/B/C, moving 0 to 2 gives 0 = B, 50 = C,
 * 100 = A. Returns new stop objects, still sorted.
 */
export function moveStopPayload(stops: readonly BackgroundStop[], from: number, to: number): BackgroundStop[] {
  const payload = moveItem(stops.map(({ color, alpha }) => ({ color, alpha })), from, to);
  return stops.map((stop, i) => ({ at: stop.at, ...payload[i] }));
}

/** The middle of the widest gap between two neighbouring stops. */
export function widestGapMiddle(stops: BackgroundStop[]): number {
  let best = 0;
  let middle = 50;
  for (let i = 0; i < stops.length - 1; i++) {
    const gap = stops[i + 1].at - stops[i].at;
    if (gap > best) { best = gap; middle = stops[i].at + gap / 2; }
  }
  return Math.round(middle * 100) / 100;
}

/** A stop as a CSS color, with its opacity. */
export function stopCssColor(stop: Pick<BackgroundStop, 'color' | 'alpha'>): string {
  const [r, g, b] = hexToRgb(stop.color);
  return `rgb(${r} ${g} ${b} / ${round2(stop.alpha / 100)})`;
}

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
export function backgroundGradientCss(gradient: BackgroundGradient, direction?: string): string {
  const list = (stops: { color: string; alpha: number; at: number }[]) => stops.map(stop => `${stopCssColor(stop)} ${round2(stop.at)}%`).join(', ');
  if (direction) return `linear-gradient(${direction}, ${list(gradient.stops)})`;
  const frame = gradientFrame(gradient.handles, 100, 100);
  const at = `${round2(frame.cx)}% ${round2(frame.cy)}%`;
  if (gradient.shape === 'linear') {
    // CSS's line runs through the centre along the angle, |sin| + |cos| long.
    const deg = Math.atan2(frame.ax, -frame.ay) * 180 / Math.PI;
    const length = Math.abs(frame.ax) + Math.abs(frame.ay);
    const onCss = (t: number) => {
      const x = frame.cx / 100 + frame.ax * frame.r1 / 100 * t - 0.5;
      const y = frame.cy / 100 + frame.ay * frame.r1 / 100 * t - 0.5;
      return ((x * frame.ax + y * frame.ay) / length + 0.5) * 100;
    };
    return `linear-gradient(${round2(deg)}deg, ${list(gradient.stops.map(stop => ({ ...stop, at: onCss(stop.at / 100) })))})`;
  }
  if (gradient.shape === 'angular') {
    const from = Math.atan2(frame.ax, -frame.ay) * 180 / Math.PI;
    // CSS turns clockwise on screen; ours turns towards the width side.
    const clockwise = frame.ax * frame.ny - frame.ay * frame.nx > 0;
    const stops = clockwise ? gradient.stops : [...gradient.stops].reverse().map(stop => ({ ...stop, at: 100 - stop.at }));
    return `conic-gradient(from ${round2(from)}deg at ${at}, ${list(stops)})`;
  }
  const along = Math.abs(frame.ax) >= Math.abs(frame.ay);
  const rx = round2(along ? frame.r1 : frame.r2);
  const ry = round2(along ? frame.r2 : frame.r1);
  return `radial-gradient(${rx}% ${ry}% at ${at}, ${list(gradient.stops)})`;
}
