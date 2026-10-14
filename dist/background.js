// src/background.ts
var BACKGROUND_MODES = ["solid", "gradient", "media"];
var BACKGROUND_FITS = ["fill", "fit", "stretch", "tile"];
var BACKGROUND_RATIOS = ["16:9", "4:3", "1:1", "4:5", "3:4", "9:16", "source"];
var BACKGROUND_MIN_STOPS = 2;
var BACKGROUND_MAX_STOPS = 8;
var BACKGROUND_ZOOM = { min: 1, max: 3, step: 0.1 };
var BACKGROUND_TILE_SCALE = { min: 0.05, max: 1, step: 0.01 };
var PINS = [-1, 0, 1];
function defaultBackgroundValue() {
  return {
    mode: "solid",
    color: "#000000",
    gradient: {
      shape: "linear",
      angle: 180,
      stops: [{ at: 0, color: "#000000", alpha: 100 }, { at: 100, color: "#ffffff", alpha: 100 }]
    },
    media: null,
    mediaDisplay: defaultMediaDisplay()
  };
}
function defaultMediaDisplay() {
  return { fit: "fill", ratio: "source", zoom: 1, tileScale: 0.25, pinX: 0, pinY: 0 };
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var clamp = (n, min, max) => Math.min(max, Math.max(min, n));
var round2 = (n) => Math.round(n * 100) / 100;
function normalizeHex(value) {
  if (typeof value !== "string") return null;
  const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join("") : match[1];
  return `#${hex.toLowerCase()}`;
}
function normalizeAngle(value) {
  if (value === 360) return 360;
  return round2((value % 360 + 360) % 360);
}
function sortStops(stops) {
  return stops.map((stop, i) => ({ stop, i })).sort((a, b) => a.stop.at - b.stop.at || a.i - b.i).map(({ stop }) => stop);
}
function normalizeStop(value) {
  if (!isRecord(value)) return null;
  const color = normalizeHex(value.color);
  if (!color || typeof value.at !== "number" || !Number.isFinite(value.at)) return null;
  const alpha = typeof value.alpha === "number" && Number.isFinite(value.alpha) ? value.alpha : 100;
  return { at: round2(clamp(value.at, 0, 100)), color, alpha: round2(clamp(alpha, 0, 100)) };
}
function normalizeGradient(value, fallback = defaultBackgroundValue().gradient) {
  if (!isRecord(value)) return cloneGradient(fallback);
  const shape = value.shape === "linear" || value.shape === "radial" ? value.shape : fallback.shape;
  const angle = typeof value.angle === "number" && Number.isFinite(value.angle) ? normalizeAngle(value.angle) : fallback.angle;
  const stops = Array.isArray(value.stops) ? value.stops.map(normalizeStop).filter((stop) => stop !== null) : [];
  return {
    shape,
    angle,
    stops: stops.length >= BACKGROUND_MIN_STOPS ? sortStops(stops).slice(0, BACKGROUND_MAX_STOPS) : fallback.stops.map((stop) => ({ ...stop }))
  };
}
function normalizeMedia(value) {
  if (!isRecord(value)) return null;
  if (typeof value.key !== "string" || !value.key) return null;
  if (value.kind !== "image" && value.kind !== "video") return null;
  return { key: value.key, kind: value.kind };
}
function normalizeMediaDisplay(value, fallback = defaultMediaDisplay()) {
  const input = isRecord(value) ? value : {};
  const zoom = typeof input.zoom === "number" && Number.isFinite(input.zoom) ? Math.round(clamp(input.zoom, BACKGROUND_ZOOM.min, BACKGROUND_ZOOM.max) * 10) / 10 : fallback.zoom;
  const tileScale = typeof input.tileScale === "number" && Number.isFinite(input.tileScale) ? Math.round(clamp(input.tileScale, BACKGROUND_TILE_SCALE.min, BACKGROUND_TILE_SCALE.max) * 100) / 100 : fallback.tileScale;
  return {
    fit: BACKGROUND_FITS.includes(input.fit) ? input.fit : fallback.fit,
    ratio: BACKGROUND_RATIOS.includes(input.ratio) ? input.ratio : fallback.ratio,
    zoom,
    tileScale,
    pinX: PINS.includes(input.pinX) ? input.pinX : fallback.pinX,
    pinY: PINS.includes(input.pinY) ? input.pinY : fallback.pinY
  };
}
function normalizeBackgroundValue(value, fallback = defaultBackgroundValue()) {
  const base = fallback;
  if (!isRecord(value)) return cloneBackgroundValue(base);
  return {
    mode: BACKGROUND_MODES.includes(value.mode) ? value.mode : base.mode,
    color: normalizeHex(value.color) ?? base.color,
    gradient: normalizeGradient(value.gradient, base.gradient),
    media: "media" in value ? normalizeMedia(value.media) : base.media && { ...base.media },
    mediaDisplay: normalizeMediaDisplay(value.mediaDisplay, base.mediaDisplay)
  };
}
function backgroundConfigDefault(config) {
  return normalizeBackgroundValue(config?.default, defaultBackgroundValue());
}
function cloneGradient(gradient) {
  return { shape: gradient.shape, angle: gradient.angle, stops: gradient.stops.map((stop) => ({ ...stop })) };
}
function cloneBackgroundValue(value) {
  return {
    mode: value.mode,
    color: value.color,
    gradient: cloneGradient(value.gradient),
    media: value.media && { ...value.media },
    mediaDisplay: { ...value.mediaDisplay }
  };
}
function sameStops(a, b) {
  return a.length === b.length && a.every((stop, i) => stop.at === b[i].at && stop.color === b[i].color && stop.alpha === b[i].alpha);
}
function sameGradient(a, b) {
  return a.shape === b.shape && a.angle === b.angle && sameStops(a.stops, b.stops);
}
function sameBackgroundValue(a, b) {
  if (!isRecord(a) || !isRecord(b)) return false;
  const x = a;
  const y = b;
  if (x.mode !== y.mode || x.color !== y.color) return false;
  if (!isRecord(x.gradient) || !isRecord(y.gradient) || !Array.isArray(x.gradient.stops) || !Array.isArray(y.gradient.stops)) return false;
  if (!sameGradient(x.gradient, y.gradient)) return false;
  if (x.media === null !== (y.media === null)) return false;
  if (x.media && y.media && (x.media.key !== y.media.key || x.media.kind !== y.media.kind)) return false;
  const p = x.mediaDisplay;
  const q = y.mediaDisplay;
  if (!isRecord(p) || !isRecord(q)) return p === q;
  return p.fit === q.fit && p.ratio === q.ratio && p.zoom === q.zoom && p.tileScale === q.tileScale && p.pinX === q.pinX && p.pinY === q.pinY;
}
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function rgbToHex(rgb) {
  return `#${rgb.map((n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0")).join("")}`;
}
function gradientColorAt(stops, at) {
  if (stops.length === 0) return { color: "#000000", alpha: 100 };
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
      alpha: Math.round(a.alpha + (b.alpha - a.alpha) * t)
    };
  }
  return { color: last.color, alpha: last.alpha };
}
function moveItem(list, from, to) {
  const next = list.slice();
  if (from < 0 || from >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(clamp(to, 0, next.length), 0, item);
  return next;
}
function moveStopPayload(stops, from, to) {
  const payload = moveItem(stops.map(({ color, alpha }) => ({ color, alpha })), from, to);
  return stops.map((stop, i) => ({ at: stop.at, ...payload[i] }));
}
function widestGapMiddle(stops) {
  let best = 0;
  let middle = 50;
  for (let i = 0; i < stops.length - 1; i++) {
    const gap = stops[i + 1].at - stops[i].at;
    if (gap > best) {
      best = gap;
      middle = stops[i].at + gap / 2;
    }
  }
  return Math.round(middle * 100) / 100;
}
function stopCssColor(stop) {
  const [r, g, b] = hexToRgb(stop.color);
  return `rgb(${r} ${g} ${b} / ${round2(stop.alpha / 100)})`;
}
function backgroundGradientCss(gradient, direction) {
  const stops = gradient.stops.map((stop) => `${stopCssColor(stop)} ${stop.at}%`).join(", ");
  if (direction) return `linear-gradient(${direction}, ${stops})`;
  return gradient.shape === "radial" ? `radial-gradient(circle at center, ${stops})` : `linear-gradient(${gradient.angle}deg, ${stops})`;
}
export {
  BACKGROUND_FITS,
  BACKGROUND_MAX_STOPS,
  BACKGROUND_MIN_STOPS,
  BACKGROUND_MODES,
  BACKGROUND_RATIOS,
  BACKGROUND_TILE_SCALE,
  BACKGROUND_ZOOM,
  backgroundConfigDefault,
  backgroundGradientCss,
  cloneBackgroundValue,
  cloneGradient,
  defaultBackgroundValue,
  defaultMediaDisplay,
  gradientColorAt,
  moveItem,
  moveStopPayload,
  normalizeAngle,
  normalizeBackgroundValue,
  normalizeGradient,
  normalizeHex,
  normalizeMediaDisplay,
  sameBackgroundValue,
  sameGradient,
  sortStops,
  stopCssColor,
  widestGapMiddle
};
//# sourceMappingURL=background.js.map