"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/store/DialStore.ts
var DialStore_exports = {};
__export(DialStore_exports, {
  DialStore: () => DialStore,
  flattenDialValueUpdates: () => flattenDialValueUpdates,
  formatLabel: () => formatLabel,
  inferStep: () => inferStep,
  isEasingConfigValue: () => isEasingConfigValue,
  isFolderMetaKey: () => isFolderMetaKey,
  isHexColor: () => isHexColor,
  isLeafConfigValue: () => isLeafConfigValue,
  isSpringConfigValue: () => isSpringConfigValue,
  resolveDialValues: () => resolveDialValues,
  unwrapVisibility: () => unwrapVisibility,
  withVisibility: () => withVisibility
});
module.exports = __toCommonJS(DialStore_exports);

// src/numeric.ts
function roundValue(value, step, min, max) {
  const lower = min ?? -Infinity;
  const upper = max ?? Infinity;
  const clamped = Math.max(lower, Math.min(upper, value));
  if (clamped === lower || clamped === upper || !Number.isFinite(step) || step <= 0) return clamped;
  const origin = min ?? 0;
  const snapped = origin + Math.round((clamped - origin) / step) * step;
  return Math.max(lower, Math.min(upper, Number(snapped.toPrecision(14))));
}

// src/color.ts
var clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
var wrapHue = (h) => (h % 360 + 360) % 360;
var multiply = (m, v) => m.map((row) => row.reduce((n, x, i) => n + x * v[i], 0));
var linearize = (v) => Math.abs(v) <= 0.04045 ? v / 12.92 : Math.sign(v) * ((Math.abs(v) + 0.055) / 1.055) ** 2.4;
var RGB_XYZ = [[0.4123907993, 0.3575843394, 0.1804807884], [0.2126390059, 0.7151686788, 0.0721923154], [0.0193308187, 0.1191947798, 0.9505321522]];
var P3_XYZ = [[0.4865709486, 0.2656676932, 0.1982172852], [0.2289745641, 0.6917385218, 0.0792869141], [0, 0.0451133819, 1.0439443689]];
function rgbToColor(rgb, a = 1, space = "srgb") {
  const xyz = multiply(space === "p3" ? P3_XYZ : RGB_XYZ, rgb.map(linearize));
  const [l, m, s] = multiply([[0.819022438, 0.3619062601, -0.1288737815], [0.0329836539, 0.9292868616, 0.0361446664], [0.0481771894, 0.2642395318, 0.6335478285]], xyz).map(Math.cbrt);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(A, B);
  return { l: clamp(L), c: c < 1e-7 ? 0 : c, h: c < 1e-7 ? 0 : wrapHue(Math.atan2(B, A) * 180 / Math.PI), a: clamp(a) };
}
var hueChannel = (digits) => ({ name: "H", label: "Hue", max: 360, step: 1, digits, wrap: true });
var rgbChannels = (max, step, digits) => ["Red", "Green", "Blue"].map((label) => ({ name: label[0], label, max, step, digits }));
var COLOR_CHANNELS = {
  rgb: rgbChannels(255, 1, 0),
  hsl: [hueChannel(0), { name: "S", label: "Saturation", max: 100, step: 1, digits: 0 }, { name: "L", label: "Lightness", max: 100, step: 1, digits: 0 }],
  oklch: [{ name: "L", label: "Lightness", max: 1, step: 0.01, digits: 3 }, { name: "C", label: "Chroma", max: Infinity, step: 5e-3, digits: 3 }, hueChannel(1)],
  p3: rgbChannels(1, 0.01, 3)
};
function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}
var grayHue = (h) => rgbToColor(hslToRgb(h, 0.5, 0.5)).h;
function hslToColor(h, s, l, a) {
  const color = rgbToColor(hslToRgb(h, s, l), a);
  return color.c ? color : { ...color, h: grayHue(h) };
}
var NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(%|deg|grad|rad|turn)?$/i;
function number(value, percentScale = 1, hue = false) {
  const match = value.match(NUMBER);
  if (!match) return null;
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return null;
  const unit = match[1]?.toLowerCase();
  if (hue) return unit === "rad" ? n * 180 / Math.PI : unit === "turn" ? n * 360 : unit === "grad" ? n * 0.9 : !unit || unit === "deg" ? n : null;
  return unit === "%" ? n * percentScale / 100 : !unit ? n : null;
}
function parseColor(value) {
  const text = value.trim().toLowerCase();
  if (text === "transparent") return { l: 0, c: 0, h: 0, a: 0 };
  if (/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/.test(text)) {
    let hex = text.slice(1);
    if (hex.length <= 4) hex = [...hex].map((c) => c + c).join("");
    const bytes = hex.match(/../g).map((c) => parseInt(c, 16) / 255);
    return rgbToColor(bytes.slice(0, 3), bytes[3] ?? 1);
  }
  const match = text.match(/^(oklch|rgb|rgba|hsl|hsla|color)\(([^()]*)\)$/);
  if (!match) return null;
  const kind = match[1];
  let body = match[2].trim();
  const p3 = kind === "color";
  if (p3) {
    if (!body.startsWith("display-p3 ")) return null;
    body = body.slice(11).trim();
  }
  const legacy = body.includes(",");
  if (legacy && (p3 || kind === "oklch" || body.includes("/"))) return null;
  const parts = legacy ? body.split(",").map((x) => x.trim()) : body.split(/\s*\/\s*/);
  if (!legacy && parts.length > 2) return null;
  const channels = legacy ? parts.slice(0, 3) : parts[0].split(/\s+/);
  if (channels.length !== 3 || legacy && parts.length !== 3 && parts.length !== 4) return null;
  if (legacy && kind.startsWith("rgb") && channels.some((c) => c.endsWith("%")) && !channels.every((c) => c.endsWith("%"))) return null;
  const alphaText = legacy ? parts[3] : parts[1];
  const alpha = alphaText === void 0 ? 1 : number(alphaText);
  if (alpha === null) return null;
  if (kind === "oklch") {
    const l = number(channels[0]);
    const c = number(channels[1], 0.4);
    const h = number(channels[2], 1, true);
    return l === null || c === null || h === null ? null : { l: clamp(l), c: Math.max(0, c), h: wrapHue(h), a: clamp(alpha) };
  }
  if (kind.startsWith("hsl")) {
    const h = number(channels[0], 1, true);
    const s = number(channels[1]);
    const l = number(channels[2]);
    if (h === null || s === null || l === null || !channels[1].endsWith("%") || !channels[2].endsWith("%")) return null;
    return hslToColor(wrapHue(h), clamp(s), clamp(l), alpha);
  }
  const values = channels.map((c) => number(c, p3 ? 1 : 255));
  if (values.some((n) => n === null)) return null;
  return rgbToColor(values.map((n) => p3 ? n : clamp(n / 255)), alpha, p3 ? "p3" : "srgb");
}

// src/dial-pad.ts
function resolvePadAxis(config = [0, -1, 1, 0.01]) {
  const [initial, min, max, suppliedStep] = config;
  const step = suppliedStep ?? (max - min) / 200;
  if (![initial, min, max, step, max - min].every(Number.isFinite) || max <= min || step <= 0) {
    throw new RangeError("DialPad axes need finite [default, min, max, step?] values, min < max, and a positive step.");
  }
  const axis = { default: initial, min, max, step };
  axis.default = snapPadAxis(initial, axis);
  return axis;
}
function snapPadAxis(value, axis) {
  if (!Number.isFinite(value)) return axis.default;
  const clamped = Math.max(axis.min, Math.min(axis.max, value));
  if (clamped === axis.min || clamped === axis.max) return clamped;
  const snapped = axis.min + Math.round((clamped - axis.min) / axis.step) * axis.step;
  return Math.max(axis.min, Math.min(axis.max, Number(snapped.toPrecision(12))));
}
function normalizePadValue(value, config = {}) {
  const axes = { x: resolvePadAxis(config.x), y: resolvePadAxis(config.y) };
  const input = typeof value === "object" && value !== null ? value : {};
  return {
    x: typeof input.x === "number" ? snapPadAxis(input.x, axes.x) : axes.x.default,
    y: typeof input.y === "number" ? snapPadAxis(input.y, axes.y) : axes.y.default
  };
}

// src/anchor.ts
var ANCHOR_COLUMNS = ["left", "center", "right"];
var ANCHOR_ROWS = ["top", "center", "bottom"];
function oneOf(options, value, fallback) {
  return options.includes(value) ? value : fallback;
}
function normalizeAnchorValue(value, config = {}) {
  const input = typeof value === "object" && value !== null ? value : {};
  return {
    x: oneOf(ANCHOR_COLUMNS, input.x, oneOf(ANCHOR_COLUMNS, config.default?.x, "center")),
    y: oneOf(ANCHOR_ROWS, input.y, oneOf(ANCHOR_ROWS, config.default?.y, "center"))
  };
}

// src/easing-geometry.ts
var easingPresets = {
  linear: [0, 0, 1, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1]
};

// src/transition-presets.ts
var easingCurves = [
  // Named
  { name: "Glide", description: "Starts gently and glides to a long, soft stop.", ease: [0.33, 0, 0, 1] },
  { name: "Sweep", description: "Slow at both ends, with a fast sweep through the middle.", ease: [0.7, 0.101, 0.3, 0.899] },
  { name: "Settle", description: "Starts and ends softly, with a quick middle.", ease: [0.8, 0.27, 0.2, 0.75] },
  { name: "Flip", description: "A light ease in and out that arrives a little early.", ease: [0.333, 0, 0.571, 1] },
  { name: "Natural", description: "Slow at both ends and fast in the middle.", ease: [0.8, 0, 0.2, 1] },
  { name: "Coast", description: "Starts softly, then slows over a long, gentle stop.", ease: [0.4, 0, 0, 1] },
  { name: "Elastic", description: "Pulls back, overshoots the target and comes back.", ease: [0.6, -0.85, 0, 1.65] },
  { name: "Slow", description: "Fast at first, then a long, slow stop.", ease: [0, 0, 0, 1] },
  { name: "Vive", description: "Starts very slowly and speeds up to a sudden stop.", ease: [1, 0, 1, 1] },
  { name: "Anticipate", description: "Pulls back a little, then moves to the target.", ease: [1, -0.4, 0.35, 0.95] },
  { name: "Snappy Out", description: "Jumps out fast and settles slowly into place.", ease: [0.19, 1, 0.22, 1] },
  { name: "Swift Out", description: "Starts fast and overshoots the target a little.", ease: [0.175, 0.885, 0.32, 1.1] },
  // Classic
  { name: "Linear", description: "The same speed from start to end.", ease: easingPresets.linear },
  { name: "Ease In", description: "Starts slowly and speeds up.", ease: [0.33, 0, 1, 1] },
  { name: "Ease Out", description: "Starts fast and slows down to the end.", ease: [0, 0, 0.67, 1] },
  { name: "Ease In Out", description: "Slow at both ends, faster in the middle.", ease: [0.33, 0, 0.67, 1] },
  { name: "Sine In", description: "A light ease in.", ease: [0.36, 0, 0.64, 0.48] },
  { name: "Sine Out", description: "A light ease out.", ease: [0.33, 0.52, 0.64, 1] },
  { name: "Sine In Out", description: "A light ease in and out.", ease: [0.36, 0, 0.63, 1] },
  { name: "Quad In", description: "A soft ease in.", ease: [0.26, 0, 0.6, 0.2] },
  { name: "Quad Out", description: "A soft ease out.", ease: [0.4, 0.8, 0.74, 1] },
  { name: "Quad In Out", description: "A soft ease in and out.", ease: [0.48, 0.04, 0.52, 0.96] },
  { name: "Cubic In", description: "A medium ease in.", ease: [0.4, 0, 0.68, 0.06] },
  { name: "Cubic Out", description: "A medium ease out.", ease: [0.32, 0.94, 0.6, 1] },
  { name: "Cubic In Out", description: "A medium ease in and out.", ease: [0.66, 0, 0.34, 1] },
  { name: "Quart In", description: "A strong ease in.", ease: [0.52, 0, 0.74, 0] },
  { name: "Quart Out", description: "A strong ease out.", ease: [0.26, 1, 0.48, 1] },
  { name: "Quart In Out", description: "A strong ease in and out.", ease: [0.76, 0, 0.24, 1] },
  { name: "Quint In", description: "A very strong ease in.", ease: [0.64, 0, 0.78, 0] },
  { name: "Quint Out", description: "A very strong ease out.", ease: [0.22, 1, 0.36, 1] },
  { name: "Quint In Out", description: "A very strong ease in and out.", ease: [0.84, 0, 0.16, 1] },
  { name: "Expo In", description: "Almost still at first, then very fast.", ease: [0.66, 0, 0.86, 0] },
  { name: "Expo Out", description: "Very fast at first, then almost still.", ease: [0.14, 1, 0.34, 1] },
  { name: "Expo In Out", description: "Almost still at both ends, very fast in the middle.", ease: [0.9, 0, 0.1, 1] },
  { name: "Circ In", description: "Starts slowly and speeds up sharply at the end.", ease: [0.54, 0, 1, 0.44] },
  { name: "Circ Out", description: "Starts very fast and stops softly.", ease: [0, 0.56, 0.46, 1] },
  { name: "Circ In Out", description: "Slow at both ends, with a sharp middle.", ease: [0.88, 0.14, 0.12, 0.86] },
  { name: "Back In", description: "Pulls back a little before it moves.", ease: [0.6, -0.28, 0.73, 0.04] },
  { name: "Back Out", description: "Overshoots a little, then settles back.", ease: [0.17, 0.89, 0.32, 1.27] },
  { name: "Back In Out", description: "Pulls back at the start and overshoots at the end.", ease: [0.68, -0.55, 0.27, 1.55] }
];
var springPresets = [
  // React Spring
  { name: "Crisp", description: "Quick and firm, no bounce.", physics: { stiffness: 170, damping: 26, mass: 1 }, time: { visualDuration: 0.4, bounce: 0 } },
  { name: "Gentle", description: "Soft, with a little bounce.", physics: { stiffness: 120, damping: 14, mass: 1 }, time: { visualDuration: 0.5, bounce: 0.35 } },
  { name: "Wobbly", description: "Quick, with a lot of bounce.", physics: { stiffness: 180, damping: 12, mass: 1 }, time: { visualDuration: 0.4, bounce: 0.55 } },
  { name: "Stiff", description: "Fast and tight, with a short bounce.", physics: { stiffness: 210, damping: 20, mass: 1 }, time: { visualDuration: 0.35, bounce: 0.3 } },
  { name: "Slow", description: "Slow and smooth, no bounce.", physics: { stiffness: 280, damping: 60, mass: 1 }, time: { visualDuration: 1.05, bounce: 0 } },
  { name: "Molasses", description: "The slowest: about two seconds, no bounce.", physics: { stiffness: 125, damping: 55, mass: 1 }, time: { visualDuration: 2.2, bounce: 0 } },
  // More named springs
  { name: "Buoyant", description: "Heavy, with a large bounce.", physics: { stiffness: 900, damping: 80, mass: 10 }, time: { visualDuration: 0.52, bounce: 0.6 } },
  { name: "Elegant", description: "Smooth, with a small, soft bounce.", physics: { stiffness: 150, damping: 19, mass: 1.2 }, time: { visualDuration: 0.46, bounce: 0.3 } },
  { name: "Bob", description: "Very short and light, with a quick bounce.", physics: { stiffness: 131.1, damping: 2.3, mass: 0.1 }, time: { visualDuration: 0.14, bounce: 0.7 } },
  { name: "Fling", description: "Fast and heavy, with a small bounce.", physics: { stiffness: 800, damping: 80, mass: 4 }, time: { visualDuration: 0.37, bounce: 0.3 } },
  { name: "Swift", description: "Very fast, no bounce.", physics: { stiffness: 280, damping: 18, mass: 0.3 }, time: { visualDuration: 0.21, bounce: 0 } },
  { name: "Float", description: "Light, with a large bounce.", physics: { stiffness: 290, damping: 15, mass: 2 }, time: { visualDuration: 0.42, bounce: 0.7 } },
  { name: "Drift", description: "Loose and slow to settle, with almost no bounce.", physics: { stiffness: 26.7, damping: 4.1, mass: 0.2 }, time: { visualDuration: 0.46, bounce: 0.1 } },
  { name: "Snap", description: "Very fast, with a tiny bounce.", physics: { stiffness: 320, damping: 20, mass: 0.4 }, time: { visualDuration: 0.19, bounce: 0.1 } },
  { name: "Stern", description: "Fast and firm, with a clear bounce.", physics: { stiffness: 550, damping: 30, mass: 1.2 }, time: { visualDuration: 0.25, bounce: 0.4 } }
];
function defaultTransitionPresets(mode) {
  if (mode === "easing") {
    return easingCurves.map(({ name, description, ease }) => ({ name, description, value: { type: "easing", duration: 0.3, ease } }));
  }
  return springPresets.map(({ name, description, physics, time }) => ({
    name,
    description,
    value: { type: "spring", ...mode === "simple" ? time : physics }
  }));
}

// src/background.ts
var GRADIENT_SHAPES = ["linear", "radial", "angular", "diamond"];
var MEDIA_FITS = ["fill", "fit", "stretch", "tile"];
var MEDIA_RATIOS = ["16:9", "4:3", "1:1", "4:5", "3:4", "9:16", "source"];
var MIN_GRADIENT_STOPS = 2;
var MAX_GRADIENT_STOPS = 8;
var MEDIA_ZOOM = { min: 1, max: 3, step: 0.1 };
var MEDIA_TILE_SIZE = { min: 0.05, max: 1, step: 0.01 };
var MODES = ["solid", "gradient", "media"];
var POINT_RANGE = { min: -10, max: 11 };
var COLUMNS = ["left", "center", "right"];
var ROWS = ["top", "center", "bottom"];
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var oneOf2 = (options, value, fallback) => options.includes(value) ? value : fallback;
var finite = (value) => typeof value === "number" && Number.isFinite(value);
var round = (n, digits) => Number(n.toFixed(digits)) || 0;
var validColor = (value) => typeof value === "string" && parseColor(value) !== null;
function defaultBackgroundValue() {
  return {
    mode: "solid",
    color: "#000000",
    gradient: {
      shape: "linear",
      handles: { start: { x: 0.5, y: 0.1 }, end: { x: 0.5, y: 0.9 }, width: { x: 0.1, y: 0.5 } },
      stops: [{ at: 0, color: "#000000" }, { at: 100, color: "#ffffff" }]
    },
    media: null,
    mediaDisplay: { fit: "fill", ratio: "source", zoom: 1, tileSize: 0.25, position: { x: "center", y: "center" } }
  };
}
function normalizePoint(value, fallback) {
  if (!isRecord(value) || !finite(value.x) || !finite(value.y)) return { ...fallback };
  return { x: round(clamp(value.x, POINT_RANGE.min, POINT_RANGE.max), 6), y: round(clamp(value.y, POINT_RANGE.min, POINT_RANGE.max), 6) };
}
function sortStops(stops) {
  return stops.map((stop, i) => ({ stop, i })).sort((a, b) => a.stop.at - b.stop.at || a.i - b.i).map(({ stop }) => stop);
}
function normalizeGradient(value, fallback = defaultBackgroundValue().gradient) {
  const input = isRecord(value) ? value : {};
  const shape = oneOf2(GRADIENT_SHAPES, input.shape, fallback.shape);
  const handles = isRecord(input.handles) ? input.handles : {};
  const base = isRecord(input.handles) ? fallback.handles : switchGradientShape(fallback, shape).handles;
  const stops = Array.isArray(input.stops) ? input.stops.filter((stop) => isRecord(stop) && finite(stop.at) && validColor(stop.color)).map((stop) => ({ at: round(clamp(stop.at, 0, 100), 2), color: stop.color.trim() })) : [];
  return {
    shape,
    handles: {
      start: normalizePoint(handles.start, base.start),
      end: normalizePoint(handles.end, base.end),
      width: normalizePoint(handles.width, base.width)
    },
    stops: stops.length >= MIN_GRADIENT_STOPS ? capStops(sortStops(stops)) : fallback.stops.map((stop) => ({ ...stop }))
  };
}
function capStops(sorted) {
  const n = sorted.length;
  if (n <= MAX_GRADIENT_STOPS) return sorted;
  return Array.from({ length: MAX_GRADIENT_STOPS }, (_, i) => sorted[Math.round(i * (n - 1) / (MAX_GRADIENT_STOPS - 1))]);
}
function normalizeMediaDisplay(value, fallback) {
  const input = isRecord(value) ? value : {};
  const position = isRecord(input.position) ? input.position : {};
  return {
    fit: oneOf2(MEDIA_FITS, input.fit, fallback.fit),
    ratio: oneOf2(MEDIA_RATIOS, input.ratio, fallback.ratio),
    zoom: finite(input.zoom) ? round(clamp(input.zoom, MEDIA_ZOOM.min, MEDIA_ZOOM.max), 1) : fallback.zoom,
    tileSize: finite(input.tileSize) ? round(clamp(input.tileSize, MEDIA_TILE_SIZE.min, MEDIA_TILE_SIZE.max), 2) : fallback.tileSize,
    position: { x: oneOf2(COLUMNS, position.x, fallback.position.x), y: oneOf2(ROWS, position.y, fallback.position.y) }
  };
}
function normalizeBackgroundValue(value, fallback = defaultBackgroundValue()) {
  const input = isRecord(value) ? value : {};
  const media = input.media;
  return {
    mode: oneOf2(MODES, input.mode, fallback.mode),
    color: validColor(input.color) ? input.color.trim() : fallback.color,
    gradient: normalizeGradient(input.gradient, fallback.gradient),
    media: media === null ? null : isRecord(media) && typeof media.src === "string" && media.src && (media.kind === "image" || media.kind === "video") ? { src: media.src, kind: media.kind } : fallback.media && { ...fallback.media },
    mediaDisplay: normalizeMediaDisplay(input.mediaDisplay, fallback.mediaDisplay)
  };
}
function sameGradient(a, b) {
  const point = (p, q) => p.x === q.x && p.y === q.y;
  return a.shape === b.shape && point(a.handles.start, b.handles.start) && point(a.handles.end, b.handles.end) && point(a.handles.width, b.handles.width) && a.stops.length === b.stops.length && a.stops.every((stop, i) => stop.at === b.stops[i].at && stop.color === b.stops[i].color);
}
function sameBackgroundValue(a, b) {
  const p = a.mediaDisplay;
  const q = b.mediaDisplay;
  return a.mode === b.mode && a.color === b.color && sameGradient(a.gradient, b.gradient) && a.media?.src === b.media?.src && a.media?.kind === b.media?.kind && p.fit === q.fit && p.ratio === q.ratio && p.zoom === q.zoom && p.tileSize === q.tileSize && p.position.x === q.position.x && p.position.y === q.position.y;
}
function cloneGradient(gradient) {
  const { start, end, width } = gradient.handles;
  return { shape: gradient.shape, handles: { start: { ...start }, end: { ...end }, width: { ...width } }, stops: gradient.stops.map((stop) => ({ ...stop })) };
}
function switchGradientShape(gradient, shape) {
  const next = { ...cloneGradient(gradient), shape };
  if (gradient.shape === "linear" === (shape === "linear")) return next;
  const { start, end, width } = gradient.handles;
  const point = (x, y) => ({ x: round(x, 6), y: round(y, 6) });
  if (gradient.shape === "linear") {
    const centre = point((start.x + end.x) / 2, (start.y + end.y) / 2);
    next.handles = { start: centre, end: { ...end }, width: point(centre.x - (end.y - centre.y), centre.y + (end.x - centre.x)) };
  } else {
    next.handles = { start: point(2 * start.x - end.x, 2 * start.y - end.y), end: { ...end }, width: { ...width } };
  }
  return next;
}

// src/store/DialStore.ts
function withVisibility(control, rule) {
  return { value: control, visibleWhen: rule };
}
function isVisibilityWrapper(value) {
  return isRecord2(value) && "value" in value && isRecord2(value.visibleWhen) && typeof value.visibleWhen.field === "string";
}
function unwrapVisibility(value) {
  return isVisibilityWrapper(value) ? value.value : value;
}
var EMPTY_VALUES = Object.freeze({});
var TRANSITION_PRESETS_KEY = "dialkit:transition-presets";
function copyTransitionValue(value) {
  return value.type === "easing" ? { ...value, ease: [...value.ease] } : { ...value };
}
function nextTransitionPresetName(presets, mode) {
  const highest = presets.reduce((max, preset) => {
    const match = /^Custom (\d+)$/.exec(preset.name);
    return preset.mode === mode && match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `Custom ${highest + 1}`;
}
function isStoredTransitionPreset(preset) {
  if (!isRecord2(preset) || typeof preset.id !== "string" || typeof preset.name !== "string" || !isRecord2(preset.value)) return false;
  const value = preset.value;
  const finite2 = (...keys) => keys.every((key) => Number.isFinite(value[key]));
  switch (preset.mode) {
    case "easing":
      return value.type === "easing" && finite2("duration") && Array.isArray(value.ease) && value.ease.length === 4 && value.ease.every((n, index) => Number.isFinite(n) && (index % 2 === 1 || n >= 0 && n <= 1));
    case "simple":
      return value.type === "spring" && finite2("visualDuration", "bounce");
    case "advanced":
      return value.type === "spring" && finite2("stiffness", "damping", "mass");
    default:
      return false;
  }
}
function resolveDialValues(config, flatValues) {
  return resolveConfigValues(config, flatValues, "");
}
function flattenDialValueUpdates(config, updates) {
  const values = {};
  if (typeof updates === "object" && updates !== null) {
    flattenConfigUpdates(config, updates, "", values);
  }
  return values;
}
function resolveConfigValues(config, flatValues, prefix) {
  const result = {};
  for (const [key, rawValue] of Object.entries(config)) {
    if (isFolderMetaKey(key)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    const configValue = unwrapVisibility(rawValue);
    if (isLeafConfigValue(configValue)) {
      result[key] = flatValues[path] ?? configDefaultValue(configValue);
    } else if (typeof configValue === "object" && configValue !== null) {
      result[key] = resolveConfigValues(configValue, flatValues, path);
    }
  }
  return result;
}
function flattenConfigUpdates(config, updates, prefix, values) {
  for (const [key, rawValue] of Object.entries(config)) {
    if (isFolderMetaKey(key) || !(key in updates)) continue;
    const nextValue = updates[key];
    if (nextValue === void 0) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    const configValue = unwrapVisibility(rawValue);
    if (isActionConfigValue(configValue)) {
      continue;
    }
    if (isLeafConfigValue(configValue)) {
      values[path] = nextValue;
      continue;
    }
    if (typeof configValue === "object" && configValue !== null && typeof nextValue === "object" && nextValue !== null && !Array.isArray(nextValue)) {
      flattenConfigUpdates(configValue, nextValue, path, values);
    }
  }
}
function isFolderMetaKey(key) {
  return key === "_collapsed" || key === "_fields" || key === "_reset" || key === "_hints";
}
function canShowFields(children) {
  const axes = children.filter((child) => child.type === "slider").length;
  const locks = children.filter((child) => child.type === "toggle").length;
  return axes >= 2 && axes <= 4 && locks <= 1 && axes + locks === children.length;
}
function isLeafConfigValue(value) {
  return Array.isArray(value) && value.length <= 5 && typeof value[0] === "number" || typeof value === "number" || typeof value === "boolean" || typeof value === "string" || isSpringConfigValue(value) || isEasingConfigValue(value) || isActionConfigValue(value) || isSelectConfigValue(value) || isColorConfigValue(value) || isImageConfigValue(value) || isTextConfigValue(value) || isPadConfigValue(value) || isBackgroundConfigValue(value) || isAnchorConfigValue(value);
}
function configDefaultValue(value) {
  if (Array.isArray(value)) return value[0];
  if (isSelectConfigValue(value)) return value.default ?? getFirstOptionValue(value.options);
  if (isColorConfigValue(value)) return value.default ?? "#000000";
  if (isImageConfigValue(value)) return value.default ?? getFirstOptionValue(value.options ?? []);
  if (isTextConfigValue(value)) return value.default ?? "";
  if (isPadConfigValue(value)) return normalizePadValue(void 0, value);
  if (isAnchorConfigValue(value)) return normalizeAnchorValue(void 0, value);
  if (isBackgroundConfigValue(value)) return normalizeBackgroundValue(value.default);
  return value;
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function sameControlValue(previous, next, control) {
  if (Object.is(previous, next)) return true;
  if (control?.type === "background") {
    return isRecord2(previous) && isRecord2(next) && sameBackgroundValue(previous, next);
  }
  return (control?.type === "pad" || control?.type === "anchor") && isRecord2(previous) && isRecord2(next) && previous.x === next.x && previous.y === next.y;
}
function sameValue(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => sameValue(a[key], b[key]));
}
function hasType(value, type) {
  return typeof value === "object" && value !== null && "type" in value && value.type === type;
}
function isSpringConfigValue(value) {
  return hasType(value, "spring");
}
function isEasingConfigValue(value) {
  return hasType(value, "easing");
}
function isHexColor(value) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value);
}
function formatLabel(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();
}
function inferStep(min, max) {
  const range = max - min;
  if (range <= 1) return 0.01;
  if (range <= 10) return 0.1;
  if (range <= 100) return 1;
  return 10;
}
function isActionConfigValue(value) {
  return hasType(value, "action");
}
function isSelectConfigValue(value) {
  return hasType(value, "select") && "options" in value && Array.isArray(value.options);
}
function isColorConfigValue(value) {
  return hasType(value, "color");
}
function isImageConfigValue(value) {
  return hasType(value, "image");
}
function isTextConfigValue(value) {
  return hasType(value, "text");
}
function isPadConfigValue(value) {
  return hasType(value, "pad");
}
function isAnchorConfigValue(value) {
  return hasType(value, "anchor");
}
function isBackgroundConfigValue(value) {
  return hasType(value, "background");
}
function getFirstOptionValue(options) {
  const first = options[0];
  if (first === void 0) return "";
  return typeof first === "string" ? first : first.value;
}
var DialStoreClass = class {
  constructor() {
    this.panelOpenListeners = /* @__PURE__ */ new Set();
    this.panelOpenStates = /* @__PURE__ */ new Map();
    this.panels = /* @__PURE__ */ new Map();
    this.controlsByPanel = /* @__PURE__ */ new WeakMap();
    this.resetKeysByPanel = /* @__PURE__ */ new WeakMap();
    // Full control trees of panels with visibility rules; `panel.controls` holds the visible part.
    this.allControls = /* @__PURE__ */ new WeakMap();
    this.panelsSnapshot = [];
    this.standardPanelsSnapshot = [];
    this.timelinePanelsSnapshot = [];
    this.listeners = /* @__PURE__ */ new Map();
    this.globalListeners = /* @__PURE__ */ new Set();
    this.snapshots = /* @__PURE__ */ new Map();
    this.actionListeners = /* @__PURE__ */ new Map();
    this.presets = /* @__PURE__ */ new Map();
    this.activePreset = /* @__PURE__ */ new Map();
    this.gradients = /* @__PURE__ */ new Map();
    this.baseValues = /* @__PURE__ */ new Map();
    this.baseNames = /* @__PURE__ */ new Map();
    this.defaultValues = /* @__PURE__ */ new Map();
    this.registrationCounts = /* @__PURE__ */ new Map();
    this.retainedPanels = /* @__PURE__ */ new Set();
    this.persistConfigs = /* @__PURE__ */ new Map();
    this.transitionPresets = [];
    this.transitionStorageLoaded = /* @__PURE__ */ new Set();
    this.copiedTransition = null;
    this.transitionListeners = /* @__PURE__ */ new Set();
  }
  registerPanel(id, name, config, shortcuts, options = {}) {
    const { controls, controlsByPath, defaultValues, resetKeys, conditional } = this.parseConfig(id, config, shortcuts);
    if (!this.panelOpenStates.has(id) && options.defaultCollapsed !== void 0) {
      this.panelOpenStates.set(id, !options.defaultCollapsed);
    }
    const existingPanel = this.panels.get(id);
    if (existingPanel && existingPanel.kind !== options.kind) {
      console.warn(
        `[dialkit] Panel id "${id}" cannot be shared by a timeline and a standard panel; the most recent registration controls where it renders.`
      );
    }
    this.configurePanelRetention(id, options);
    this.registrationCounts.set(id, (this.registrationCounts.get(id) ?? 0) + 1);
    const persisted = this.loadPersistedPanel(id);
    const previousValues = this.panels.get(id)?.values ?? this.snapshots.get(id) ?? persisted?.values ?? {};
    const values = this.reconcileValues(defaultValues, previousValues, controlsByPath);
    const previousBaseValues = this.baseValues.get(id) ?? persisted?.baseValues ?? persisted?.values ?? {};
    const baseValues = this.reconcileValues(defaultValues, previousBaseValues, controlsByPath);
    const panel = { id, name, controls, values, shortcuts: shortcuts ?? {}, kind: options.kind };
    this.panels.set(id, panel);
    this.controlsByPanel.set(panel, controlsByPath);
    this.resetKeysByPanel.set(panel, resetKeys);
    if (conditional) this.setVisibleControls(panel, controls);
    this.snapshots.set(id, { ...values });
    this.baseValues.set(id, baseValues);
    this.defaultValues.set(id, { ...defaultValues });
    const existingPresets = this.presets.get(id) ?? persisted?.presets;
    if (existingPresets) {
      this.presets.set(id, this.reconcilePresets(existingPresets, defaultValues, controlsByPath));
    }
    if (!this.activePreset.has(id) && persisted?.activePresetId !== void 0) {
      this.activePreset.set(id, persisted.activePresetId);
    }
    if (!this.baseNames.has(id) && persisted?.baseName) {
      this.baseNames.set(id, persisted.baseName);
    }
    if (!this.gradients.has(id) && persisted?.gradients) {
      this.gradients.set(id, persisted.gradients);
    }
    this.persistPanel(id);
    this.notify(id);
    this.notifyGlobal();
  }
  updatePanel(id, name, config, shortcuts, options = {}) {
    const existing = this.panels.get(id);
    if (!existing) {
      this.registerPanel(id, name, config, shortcuts, options);
      return;
    }
    const { controls, controlsByPath, defaultValues, resetKeys, conditional } = this.parseConfig(id, config, shortcuts ?? existing.shortcuts);
    this.configurePanelRetention(id, options);
    const nextValues = this.reconcileValues(defaultValues, existing.values, controlsByPath);
    const nextPanel = { id, name, controls, values: nextValues, shortcuts: shortcuts ?? existing.shortcuts, kind: options.kind ?? existing.kind };
    this.panels.set(id, nextPanel);
    this.controlsByPanel.set(nextPanel, controlsByPath);
    this.resetKeysByPanel.set(nextPanel, resetKeys);
    if (conditional) this.setVisibleControls(nextPanel, controls);
    this.snapshots.set(id, { ...nextValues });
    const previousBaseValues = this.baseValues.get(id) ?? {};
    const nextBaseValues = this.reconcileValues(defaultValues, previousBaseValues, controlsByPath);
    for (const [path, value] of Object.entries(nextValues)) {
      if (path.endsWith(".__mode")) {
        nextBaseValues[path] = value;
      }
    }
    this.baseValues.set(id, nextBaseValues);
    this.defaultValues.set(id, { ...defaultValues });
    this.presets.set(id, this.reconcilePresets(this.presets.get(id) ?? [], defaultValues, controlsByPath));
    this.persistPanel(id);
    this.notify(id);
    this.notifyGlobal();
  }
  unregisterPanel(id) {
    const nextCount = (this.registrationCounts.get(id) ?? 1) - 1;
    if (nextCount > 0) {
      this.registrationCounts.set(id, nextCount);
      return;
    }
    this.registrationCounts.delete(id);
    this.panels.delete(id);
    if (this.listeners.get(id)?.size === 0) this.listeners.delete(id);
    if (this.actionListeners.get(id)?.size === 0) this.actionListeners.delete(id);
    if (!this.retainedPanels.has(id)) {
      this.panelOpenStates.delete(id);
      this.snapshots.delete(id);
      this.baseValues.delete(id);
      this.baseNames.delete(id);
      this.defaultValues.delete(id);
      this.presets.delete(id);
      this.activePreset.delete(id);
      this.gradients.delete(id);
      this.persistConfigs.delete(id);
    }
    this.notifyGlobal();
  }
  /** Undefined delegates the initial state to DialRoot.defaultOpen. */
  getPanelOpen(panelId) {
    return this.panelOpenStates.get(panelId);
  }
  isPanelOpen(panelId) {
    return this.panelOpenStates.get(panelId) ?? true;
  }
  togglePanelOpen(panelId) {
    this.setPanelOpen(panelId, !this.isPanelOpen(panelId));
  }
  /** Applies a host component's own default; no-op once the panel has state. */
  initPanelOpen(panelId, open) {
    if (this.panelOpenStates.has(panelId)) return;
    this.panelOpenStates.set(panelId, open);
    this.notify(panelId);
  }
  /** Observe open requests so a containing toolkit can reveal its requested panel. */
  subscribePanelOpen(listener) {
    this.panelOpenListeners.add(listener);
    return () => {
      this.panelOpenListeners.delete(listener);
    };
  }
  setPanelOpen(panelId, open) {
    if (!this.panels.has(panelId)) return;
    if (this.panelOpenStates.get(panelId) !== open) {
      this.panelOpenStates.set(panelId, open);
      this.notify(panelId);
    }
    this.panelOpenListeners.forEach((listener) => listener(panelId, open));
  }
  updateValue(panelId, path, value) {
    this.updateValues(panelId, { [path]: value });
  }
  updateValues(panelId, updates) {
    const panel = this.panels.get(panelId);
    if (!panel) return;
    const validUpdates = {};
    const activeId = this.activePreset.get(panelId);
    const active = activeId ? this.presets.get(panelId)?.find((preset) => preset.id === activeId) : void 0;
    const target = activeId ? active?.locked ? void 0 : active?.values : this.baseValues.get(panelId);
    for (const [path, value] of Object.entries(updates)) {
      if (!Object.prototype.hasOwnProperty.call(panel.values, path)) {
        continue;
      }
      const control = this.controlsByPanel.get(panel)?.get(path);
      if (control?.type === "action") {
        continue;
      }
      const next = control?.type === "pad" ? normalizePadValue(value, control.pad) : control?.type === "anchor" ? normalizeAnchorValue(value, control.anchor) : control?.type === "background" ? normalizeBackgroundValue(value, panel.values[path]) : value;
      if (sameControlValue(panel.values[path], next, control) && (!target || sameControlValue(target[path], next, control))) continue;
      panel.values[path] = next;
      validUpdates[path] = next;
    }
    if (Object.keys(validUpdates).length === 0) {
      return;
    }
    if (target) Object.assign(target, validUpdates);
    this.snapshots.set(panelId, { ...panel.values });
    this.updateVisibility(panel);
    this.persistPanel(panelId);
    this.notify(panelId);
  }
  resetValues(panelId) {
    const panel = this.panels.get(panelId);
    const defaults = this.defaultValues.get(panelId);
    if (!panel || !defaults) return;
    panel.values = { ...defaults };
    this.snapshots.set(panelId, { ...panel.values });
    this.updateVisibility(panel);
    this.baseValues.set(panelId, { ...defaults });
    this.activePreset.set(panelId, null);
    this.persistPanel(panelId);
    this.notify(panelId);
  }
  /**
   * Restore the defaults behind a folder's reset button: every value inside a
   * `_reset` folder, nested folders included, or a spring, transition or
   * background's own value. Saves like any other edit.
   */
  resetFolder(panelId, path) {
    const panel = this.panels.get(panelId);
    const keys = panel && this.resetKeysByPanel.get(panel)?.get(path);
    const defaults = this.defaultValues.get(panelId);
    if (!keys || !defaults) return;
    this.updateValues(panelId, Object.fromEntries(keys.map((key) => [key, defaults[key]])));
  }
  /** True when a value that `resetFolder` restores differs from its default, so the reset button shows. */
  isFolderChanged(panelId, path) {
    const panel = this.panels.get(panelId);
    const keys = panel && this.resetKeysByPanel.get(panel)?.get(path);
    const defaults = this.defaultValues.get(panelId);
    if (!panel || !keys || !defaults) return false;
    return keys.some((key) => !sameValue(panel.values[key], defaults[key]));
  }
  updateSpringMode(panelId, path, mode) {
    this.updateTransitionMode(panelId, path, mode);
  }
  getSpringMode(panelId, path) {
    const mode = this.getTransitionMode(panelId, path);
    if (mode === "easing") return "simple";
    return mode;
  }
  updateTransitionMode(panelId, path, mode) {
    const panel = this.panels.get(panelId);
    if (!panel) return;
    if (panel.values[`${path}.__mode`] === mode) return;
    panel.values[`${path}.__mode`] = mode;
    this.snapshots.set(panelId, { ...panel.values });
    this.persistPanel(panelId);
    this.notify(panelId);
  }
  getTransitionMode(panelId, path) {
    const panel = this.panels.get(panelId);
    if (!panel) return "simple";
    return panel.values[`${path}.__mode`] || "simple";
  }
  getValue(panelId, path) {
    const panel = this.panels.get(panelId);
    return panel?.values[path];
  }
  getValues(panelId) {
    return this.snapshots.get(panelId) ?? EMPTY_VALUES;
  }
  getDefaultValues(panelId) {
    return this.defaultValues.get(panelId) ?? EMPTY_VALUES;
  }
  getPanels(kind) {
    if (kind === "panel") return this.standardPanelsSnapshot;
    if (kind === "timeline") return this.timelinePanelsSnapshot;
    return this.panelsSnapshot;
  }
  getPanel(id) {
    return this.panels.get(id);
  }
  /** Looks up a control by path, including one its visibility rule hides. */
  getControl(panelId, path) {
    const panel = this.panels.get(panelId);
    return panel ? this.controlsByPanel.get(panel)?.get(path) : void 0;
  }
  subscribe(panelId, listener) {
    if (!this.listeners.has(panelId)) {
      this.listeners.set(panelId, /* @__PURE__ */ new Set());
    }
    this.listeners.get(panelId).add(listener);
    return () => {
      const listeners = this.listeners.get(panelId);
      listeners?.delete(listener);
      if (listeners?.size === 0 && !this.panels.has(panelId)) {
        this.listeners.delete(panelId);
      }
    };
  }
  subscribeGlobal(listener) {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }
  subscribeActions(panelId, listener) {
    if (!this.actionListeners.has(panelId)) {
      this.actionListeners.set(panelId, /* @__PURE__ */ new Set());
    }
    this.actionListeners.get(panelId).add(listener);
    return () => {
      const listeners = this.actionListeners.get(panelId);
      listeners?.delete(listener);
      if (listeners?.size === 0 && !this.panels.has(panelId)) {
        this.actionListeners.delete(panelId);
      }
    };
  }
  triggerAction(panelId, path) {
    this.actionListeners.get(panelId)?.forEach((fn) => fn(path));
  }
  /**
   * Saves the current values as the next numbered version: "V2", "V3"…, or under its own
   * `prefix` ("Sequence 2" in a timeline). Older saves used "Version N"; both count toward the next V.
   */
  saveNewPreset(panelId, prefix) {
    const pattern = prefix ? new RegExp(`^${prefix} (\\d+)$`) : /^(?:V|Version )(\d+)$/;
    const highest = this.getPresets(panelId).reduce((max, preset) => {
      const match = pattern.exec(preset.name);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 1);
    return this.savePreset(panelId, prefix ? `${prefix} ${highest + 1}` : `V${highest + 1}`);
  }
  savePreset(panelId, name) {
    const panel = this.panels.get(panelId);
    if (!panel) throw new Error(`Panel ${panelId} not found`);
    const id = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const preset = {
      id,
      name,
      values: { ...panel.values }
    };
    const existing = this.presets.get(panelId) ?? [];
    this.presets.set(panelId, [...existing, preset]);
    this.activePreset.set(panelId, id);
    this.snapshots.set(panelId, { ...panel.values });
    this.persistPanel(panelId);
    this.notify(panelId);
    return id;
  }
  loadPreset(panelId, presetId) {
    const panel = this.panels.get(panelId);
    if (!panel) return;
    const presets = this.presets.get(panelId) ?? [];
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    panel.values = { ...preset.values };
    this.snapshots.set(panelId, { ...panel.values });
    this.updateVisibility(panel);
    this.activePreset.set(panelId, presetId);
    this.persistPanel(panelId);
    this.notify(panelId);
  }
  deletePreset(panelId, presetId) {
    const presets = this.presets.get(panelId) ?? [];
    if (presets.find((p) => p.id === presetId)?.locked) return;
    this.presets.set(panelId, presets.filter((p) => p.id !== presetId));
    if (this.activePreset.get(panelId) === presetId) {
      this.activePreset.set(panelId, null);
    }
    const panel = this.panels.get(panelId);
    if (panel) {
      this.snapshots.set(panelId, { ...panel.values });
    }
    this.persistPanel(panelId);
    this.notify(panelId);
  }
  /** Rename a saved version. A null presetId renames the base version. */
  renamePreset(panelId, presetId, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (presetId === null) {
      this.baseNames.set(panelId, trimmed);
    } else {
      const presets = this.presets.get(panelId) ?? [];
      if (!presets.some((p) => p.id === presetId)) return;
      this.presets.set(panelId, presets.map((p) => p.id === presetId ? { ...p, name: trimmed } : p));
    }
    const panel = this.panels.get(panelId);
    if (panel) this.snapshots.set(panelId, { ...panel.values });
    this.persistPanel(panelId);
    this.notify(panelId);
  }
  /** Where a panel's saved versions persist, if they do. */
  getPresetStorage(panelId) {
    const config = this.persistConfigs.get(panelId);
    return config?.presets ? { key: config.key, storage: config.storage } : null;
  }
  /** Display name of the base version (the values before any saved preset). */
  getBaseName(panelId) {
    return this.baseNames.get(panelId) ?? "V1";
  }
  setPresetLocked(panelId, presetId, locked) {
    const presets = this.presets.get(panelId) ?? [];
    const preset = presets.find((p) => p.id === presetId);
    if (!preset || !!preset.locked === locked) return;
    this.setPresets(panelId, presets.map((p) => p.id === presetId ? { ...p, locked } : p));
  }
  reorderPresets(panelId, presetIds) {
    const presets = this.presets.get(panelId) ?? [];
    const rank = new Map(presetIds.map((id, index) => [id, index]));
    const ordered = presets.map((preset, index) => ({ preset, rank: rank.get(preset.id) ?? presetIds.length + index })).sort((a, b) => a.rank - b.rank).map(({ preset }) => preset);
    if (ordered.every((preset, index) => preset === presets[index])) return;
    this.setPresets(panelId, ordered);
  }
  getPresets(panelId) {
    return this.presets.get(panelId) ?? [];
  }
  /** Saved gradients belong to the panel, and persist with it when it opts in. */
  saveGradient(panelId, gradient) {
    const id = `gradient-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.gradients.set(panelId, [...this.getSavedGradients(panelId), { id, gradient: cloneGradient(gradient) }]);
    this.persistPanel(panelId);
    this.notify(panelId);
    return id;
  }
  deleteGradient(panelId, gradientId) {
    const gradients = this.getSavedGradients(panelId);
    if (!gradients.some((saved) => saved.id === gradientId)) return;
    this.gradients.set(panelId, gradients.filter((saved) => saved.id !== gradientId));
    this.persistPanel(panelId);
    this.notify(panelId);
  }
  getSavedGradients(panelId) {
    return this.gradients.get(panelId) ?? [];
  }
  getActivePresetId(panelId) {
    return this.activePreset.get(panelId) ?? null;
  }
  clearActivePreset(panelId) {
    const panel = this.panels.get(panelId);
    const base = this.baseValues.get(panelId);
    if (panel && base) {
      panel.values = { ...base };
      this.snapshots.set(panelId, { ...panel.values });
      this.updateVisibility(panel);
    }
    this.activePreset.set(panelId, null);
    this.persistPanel(panelId);
    this.notify(panelId);
  }
  /** Saved curves and springs, shared by every transition control. */
  getTransitionPresets() {
    return this.transitionPresets;
  }
  /** The built-in curves (Easing) or springs (Time and Physics) for a mode, each with a short description of how it moves. */
  getDefaultTransitionPresets(mode) {
    return defaultTransitionPresets(mode);
  }
  /** Saves a transition for its mode as "Custom N" and returns the new preset's id. */
  saveTransitionPreset(value, mode) {
    const presets = this.getTransitionPresets();
    const id = `transition-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.setTransitionPresets([...presets, { id, name: nextTransitionPresetName(presets, mode), mode, value: copyTransitionValue(value) }]);
    return id;
  }
  deleteTransitionPreset(id) {
    this.setTransitionPresets(this.getTransitionPresets().filter((preset) => preset.id !== id));
  }
  copyTransition(value, mode) {
    this.copiedTransition = { value: copyTransitionValue(value), mode };
    this.notifyTransitions();
  }
  /** A copy of the copied transition, so applying it never changes what was copied. */
  getCopiedTransition() {
    return this.copiedTransition && { value: copyTransitionValue(this.copiedTransition.value), mode: this.copiedTransition.mode };
  }
  clearCopiedTransition() {
    if (!this.copiedTransition) return;
    this.copiedTransition = null;
    this.notifyTransitions();
  }
  /** Notifies when saved transitions or the copied transition change. */
  subscribeTransitions(listener) {
    this.transitionListeners.add(listener);
    return () => this.transitionListeners.delete(listener);
  }
  resolveShortcutTarget(key, modifier) {
    for (const panel of this.panels.values()) {
      for (const [path, shortcut] of Object.entries(panel.shortcuts)) {
        if (!shortcut.key) continue;
        if (shortcut.key.toLowerCase() !== key.toLowerCase()) continue;
        const scMod = shortcut.modifier ?? void 0;
        if (scMod !== modifier) continue;
        const control = this.controlsByPanel.get(panel)?.get(path);
        if (control && this.isShown(panel, path)) {
          return { panelId: panel.id, path, control };
        }
      }
    }
    return null;
  }
  resolveScrollOnlyTargets() {
    const results = [];
    for (const panel of this.panels.values()) {
      for (const [path, shortcut] of Object.entries(panel.shortcuts)) {
        if ((shortcut.interaction ?? "scroll") !== "scroll-only") continue;
        const control = this.controlsByPanel.get(panel)?.get(path);
        if (control && this.isShown(panel, path)) {
          results.push({ panelId: panel.id, path, control, shortcut });
        }
      }
    }
    return results;
  }
  configurePanelRetention(id, options) {
    if (options.retainOnUnmount) {
      this.retainedPanels.add(id);
    }
    const persistConfig = this.normalizePersistConfig(id, options.persist);
    if (persistConfig) {
      this.persistConfigs.set(id, persistConfig);
      this.retainedPanels.add(id);
      if (persistConfig.presets) this.loadTransitionPresets(persistConfig.storage);
    } else if (options.persist === false) {
      this.persistConfigs.delete(id);
    }
  }
  reconcileValues(defaultValues, previousValues, controlsByPath) {
    const nextValues = {};
    for (const [path, defaultValue] of Object.entries(defaultValues)) {
      if (path.endsWith(".__mode")) {
        const transitionPath = path.slice(0, -".__mode".length);
        const transitionControl = controlsByPath.get(transitionPath);
        const mode = previousValues[path];
        nextValues[path] = transitionControl?.type === "transition" && (mode === "easing" || mode === "simple" || mode === "advanced") ? mode : defaultValue;
        continue;
      }
      nextValues[path] = this.normalizePreservedValue(
        previousValues[path],
        defaultValue,
        controlsByPath.get(path)
      );
    }
    return nextValues;
  }
  setPresets(panelId, presets) {
    this.presets.set(panelId, presets);
    const panel = this.panels.get(panelId);
    if (panel) {
      this.snapshots.set(panelId, { ...panel.values });
    }
    this.persistPanel(panelId);
    this.notify(panelId);
  }
  reconcilePresets(presets, defaultValues, controlsByPath) {
    return presets.map((preset) => ({
      ...preset,
      values: this.reconcileValues(defaultValues, preset.values, controlsByPath)
    }));
  }
  normalizePersistConfig(id, persist) {
    if (!persist) return null;
    const options = typeof persist === "object" ? persist : {};
    return {
      key: options.key ?? `dialkit:${id}`,
      storage: options.storage ?? "localStorage",
      presets: options.presets ?? true
    };
  }
  loadPersistedPanel(id) {
    const config = this.persistConfigs.get(id);
    if (!config) return null;
    const storage = this.getStorage(config.storage);
    if (!storage) return null;
    try {
      const raw = storage.getItem(config.key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!isRecord2(parsed) || parsed.version !== 1) return null;
      const values = isRecord2(parsed.values) ? parsed.values : void 0;
      const presets = config.presets && Array.isArray(parsed.presets) ? parsed.presets.filter((preset) => isRecord2(preset) && typeof preset.id === "string" && typeof preset.name === "string" && isRecord2(preset.values)) : [];
      const gradients = Array.isArray(parsed.gradients) ? parsed.gradients.filter((saved) => isRecord2(saved) && typeof saved.id === "string" && isRecord2(saved.gradient)).map((saved) => ({ id: saved.id, gradient: normalizeGradient(saved.gradient) })) : void 0;
      return {
        version: 1,
        values,
        baseValues: config.presets && isRecord2(parsed.baseValues) ? parsed.baseValues : values,
        presets,
        activePresetId: presets.some((preset) => preset.id === parsed.activePresetId) ? parsed.activePresetId : null,
        baseName: config.presets && typeof parsed.baseName === "string" ? parsed.baseName : void 0,
        gradients
      };
    } catch {
      return null;
    }
  }
  persistPanel(id) {
    const config = this.persistConfigs.get(id);
    if (!config) return;
    const storage = this.getStorage(config.storage);
    if (!storage) return;
    const values = this.snapshots.get(id) ?? this.panels.get(id)?.values;
    if (!values) return;
    const state = { version: 1, values };
    if (config.presets) {
      state.baseValues = this.baseValues.get(id) ?? values;
      state.presets = this.presets.get(id) ?? [];
      state.activePresetId = this.activePreset.get(id) ?? null;
      const baseName = this.baseNames.get(id);
      if (baseName) state.baseName = baseName;
    }
    const gradients = this.gradients.get(id);
    if (gradients?.length) state.gradients = gradients;
    try {
      storage.setItem(config.key, JSON.stringify(state));
    } catch {
    }
  }
  getStorage(kind) {
    if (typeof globalThis === "undefined" || !("window" in globalThis)) {
      return null;
    }
    try {
      return kind === "sessionStorage" ? globalThis.window?.sessionStorage ?? null : globalThis.window?.localStorage ?? null;
    } catch {
      return null;
    }
  }
  setTransitionPresets(presets) {
    this.transitionPresets = presets;
    this.transitionStorageKinds().forEach((kind) => this.persistTransitionPresets(kind));
    this.notifyTransitions();
  }
  /** Saved transitions follow panel persistence: they are stored wherever a panel persists its presets. */
  transitionStorageKinds() {
    const kinds = /* @__PURE__ */ new Set();
    this.persistConfigs.forEach((config) => {
      if (config.presets) kinds.add(config.storage);
    });
    return kinds;
  }
  /** Merges the transitions saved in a storage the first time a persisted panel uses it. */
  loadTransitionPresets(kind) {
    if (this.transitionStorageLoaded.has(kind)) return;
    const storage = this.getStorage(kind);
    if (!storage) return;
    this.transitionStorageLoaded.add(kind);
    let stored = [];
    try {
      const parsed = JSON.parse(storage.getItem(TRANSITION_PRESETS_KEY) ?? "null");
      if (isRecord2(parsed) && parsed.version === 1 && Array.isArray(parsed.presets)) {
        stored = parsed.presets.filter(isStoredTransitionPreset);
      }
    } catch {
    }
    const known = new Set(this.transitionPresets.map((preset) => preset.id));
    const added = [];
    let renamed = false;
    stored.forEach((preset) => {
      if (known.has(preset.id)) return;
      known.add(preset.id);
      const presets = [...added, ...this.transitionPresets];
      const taken = presets.some((other) => other.mode === preset.mode && other.name === preset.name);
      added.push(taken ? { ...preset, name: nextTransitionPresetName(presets, preset.mode) } : preset);
      renamed || (renamed = taken);
    });
    if (added.length) {
      this.transitionPresets = [...added, ...this.transitionPresets];
      this.notifyTransitions();
    }
    if (renamed || added.length < this.transitionPresets.length) this.persistTransitionPresets(kind);
  }
  persistTransitionPresets(kind) {
    try {
      this.getStorage(kind)?.setItem(TRANSITION_PRESETS_KEY, JSON.stringify({ version: 1, presets: this.transitionPresets }));
    } catch {
    }
  }
  notifyTransitions() {
    this.transitionListeners.forEach((fn) => fn());
  }
  /** Keeps the full tree aside and shows the controls whose rules hold. */
  setVisibleControls(panel, controls) {
    this.allControls.set(panel, controls);
    panel.controls = filterVisibleControls(controls, panel.values);
  }
  /** Re-applies visibility rules after a write. `getPanels()` snapshots are cached, so a changed tree refreshes them too. */
  updateVisibility(panel) {
    const all = this.allControls.get(panel);
    if (!all) return;
    const controls = filterVisibleControls(all, panel.values);
    if (sameControlPaths(controls, panel.controls)) return;
    panel.controls = controls;
    this.notifyGlobal();
  }
  /** Hidden controls ignore shortcuts. */
  isShown(panel, path) {
    return !this.allControls.has(panel) || hasControlPath(panel.controls, path);
  }
  notify(panelId) {
    this.listeners.get(panelId)?.forEach((fn) => fn());
  }
  notifyGlobal() {
    this.panelsSnapshot = Array.from(this.panels.values());
    this.standardPanelsSnapshot = this.panelsSnapshot.filter((panel) => panel.kind !== "timeline");
    this.timelinePanelsSnapshot = this.panelsSnapshot.filter((panel) => panel.kind === "timeline");
    this.globalListeners.forEach((fn) => fn());
  }
  /** Compile controls, defaults, and the lookup index in one walk. */
  parseConfig(panelId, config, shortcuts) {
    const defaultValues = {};
    const modes = {};
    const controlsByPath = /* @__PURE__ */ new Map();
    const rules = [];
    const visit = (config2, prefix) => {
      const controls2 = [];
      const hints = config2._hints;
      for (const [key, rawValue] of Object.entries(config2)) {
        if (isFolderMetaKey(key)) continue;
        const value = unwrapVisibility(rawValue);
        const path = prefix ? `${prefix}.${key}` : key;
        const label = formatLabel(key);
        const shortcut = shortcuts?.[path];
        let control;
        if (Array.isArray(value) && value.length <= 5 && typeof value[0] === "number") {
          control = {
            type: "slider",
            path,
            label,
            min: value[1],
            max: value[2],
            step: value[3] ?? inferStep(value[1], value[2]),
            unit: value[4],
            shortcut
          };
        } else if (typeof value === "number") {
          const { min, max, step } = this.inferRange(value);
          control = { type: "slider", path, label, min, max, step, shortcut };
        } else if (typeof value === "boolean") {
          control = { type: "toggle", path, label, shortcut };
        } else if (isSpringConfigValue(value) || isEasingConfigValue(value)) {
          control = { type: "transition", path, label, reset: true };
        } else if (isActionConfigValue(value)) {
          control = { type: "action", path, label: value.label || label };
        } else if (isSelectConfigValue(value)) {
          control = { type: "select", path, label, options: value.options, display: value.display, hideLabel: value.hideLabel };
        } else if (isColorConfigValue(value)) {
          control = { type: "color", path, label };
        } else if (isImageConfigValue(value)) {
          control = { type: "image", path, label, options: value.options };
        } else if (isTextConfigValue(value)) {
          control = { type: "text", path, label, placeholder: value.placeholder };
        } else if (isPadConfigValue(value)) {
          control = { type: "pad", path, label, pad: value };
        } else if (isAnchorConfigValue(value)) {
          control = { type: "anchor", path, label, anchor: value };
        } else if (isBackgroundConfigValue(value)) {
          control = { type: "background", path, label, background: value, reset: true };
        } else if (typeof value === "string") {
          if (parseColor(value) && value !== "transparent") {
            control = { type: "color", path, label };
          } else {
            control = { type: "text", path, label };
          }
        } else if (typeof value === "object" && value !== null) {
          const folderConfig = value;
          const defaultOpen = "_collapsed" in folderConfig ? !folderConfig._collapsed : true;
          const children = visit(folderConfig, path);
          control = {
            type: "folder",
            path,
            label,
            defaultOpen,
            reset: folderConfig._reset === true,
            children
          };
          if (folderConfig._fields === true) {
            if (canShowFields(children)) {
              control.fields = true;
            } else {
              console.warn(`[dialkit] "${path}" sets _fields but needs two to four numbers and at most one boolean; showing it as a folder.`);
            }
          }
        }
        if (!control) continue;
        if (isVisibilityWrapper(rawValue)) {
          control.visibleWhen = rawValue.visibleWhen;
          rules.push([path, rawValue.visibleWhen]);
        }
        const hint = hints?.[key];
        if (typeof hint === "string" && hint) control.hint = hint;
        controls2.push(control);
        controlsByPath.set(path, control);
        if (control.type === "folder") continue;
        defaultValues[path] = configDefaultValue(value);
        if (isEasingConfigValue(value)) {
          modes[`${path}.__mode`] = "easing";
        } else if (isSpringConfigValue(value)) {
          const hasPhysics = value.stiffness !== void 0 || value.damping !== void 0 || value.mass !== void 0;
          const hasTime = value.visualDuration !== void 0 || value.bounce !== void 0;
          modes[`${path}.__mode`] = hasPhysics && !hasTime ? "advanced" : "simple";
        }
      }
      return controls2;
    };
    const controls = visit(config, "");
    Object.assign(defaultValues, modes);
    const resetKeys = /* @__PURE__ */ new Map();
    for (const control of controlsByPath.values()) {
      if (!control.reset) continue;
      const prefix = `${control.path}.`;
      resetKeys.set(control.path, Object.keys(defaultValues).filter((key) => key === control.path || key.startsWith(prefix)));
    }
    for (const [path, rule] of rules) {
      if (!(rule.field in defaultValues)) {
        console.warn(`[dialkit] "${path}" in panel "${panelId}" depends on "${rule.field}", which is not a control in that panel.`);
      }
    }
    return { controls, defaultValues, controlsByPath, resetKeys, conditional: rules.length > 0 };
  }
  inferRange(value) {
    if (value >= 0 && value <= 1) {
      return { min: 0, max: 1, step: 0.01 };
    } else if (value >= 0 && value <= 10) {
      return { min: 0, max: value * 3 || 10, step: 0.1 };
    } else if (value >= 0 && value <= 100) {
      return { min: 0, max: value * 3 || 100, step: 1 };
    } else if (value >= 0) {
      return { min: 0, max: value * 3 || 1e3, step: 10 };
    } else {
      return { min: value * 3, max: -value * 3, step: 1 };
    }
  }
  normalizePreservedValue(existingValue, defaultValue, control) {
    if (existingValue === void 0 || !control) {
      return defaultValue;
    }
    switch (control.type) {
      case "slider": {
        if (typeof existingValue !== "number" || !Number.isFinite(existingValue) || typeof defaultValue !== "number") {
          return defaultValue;
        }
        const min = control.min ?? Number.NEGATIVE_INFINITY;
        const max = control.max ?? Number.POSITIVE_INFINITY;
        const clamped = Math.min(max, Math.max(min, existingValue));
        if (typeof control.step !== "number" || control.step <= 0) {
          return clamped;
        }
        return roundValue(clamped, control.step, min, max);
      }
      case "toggle":
        return typeof existingValue === "boolean" ? existingValue : defaultValue;
      case "pad":
        return normalizePadValue(existingValue, control.pad);
      case "anchor":
        return normalizeAnchorValue(existingValue, control.anchor);
      case "background":
        return normalizeBackgroundValue(existingValue, defaultValue);
      case "select": {
        if (typeof existingValue !== "string") {
          return defaultValue;
        }
        const options = control.options ?? [];
        const validValues = new Set(options.map((option) => typeof option === "string" ? option : option.value));
        return validValues.has(existingValue) ? existingValue : defaultValue;
      }
      case "color":
      case "image":
      case "text":
        return typeof existingValue === "string" ? existingValue : defaultValue;
      case "transition":
        if (isSpringConfigValue(defaultValue)) {
          return isSpringConfigValue(existingValue) ? existingValue : defaultValue;
        }
        if (isEasingConfigValue(defaultValue)) {
          return isEasingConfigValue(existingValue) ? existingValue : defaultValue;
        }
        return defaultValue;
      case "action":
        return defaultValue;
      default:
        return defaultValue;
    }
  }
};
function isVisible(rule, values) {
  if (!rule) return true;
  const value = values[rule.field];
  const matches = (targets) => (Array.isArray(targets) ? targets : [targets]).some((target) => target === value);
  return rule.is !== void 0 ? matches(rule.is) : !matches(rule.not);
}
function filterVisibleControls(controls, values) {
  const visible = [];
  for (const control of controls) {
    if (!isVisible(control.visibleWhen, values)) continue;
    const children = control.type === "folder" ? control.children ?? [] : [];
    if (children.length === 0) {
      visible.push(control);
      continue;
    }
    const shown = filterVisibleControls(children, values);
    if (shown.length === 0) continue;
    const unchanged = shown.length === children.length && shown.every((child, index) => child === children[index]);
    visible.push(unchanged ? control : { ...control, children: shown });
  }
  return visible;
}
function hasControlPath(controls, path) {
  return controls.some((control) => control.path === path || hasControlPath(control.children ?? [], path));
}
function sameControlPaths(a, b) {
  return a.length === b.length && a.every((control, index) => control.path === b[index].path && sameControlPaths(control.children ?? [], b[index].children ?? []));
}
var DialStore = /* @__PURE__ */ new DialStoreClass();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DialStore,
  flattenDialValueUpdates,
  formatLabel,
  inferStep,
  isEasingConfigValue,
  isFolderMetaKey,
  isHexColor,
  isLeafConfigValue,
  isSpringConfigValue,
  resolveDialValues,
  unwrapVisibility,
  withVisibility
});
//# sourceMappingURL=index.cjs.map