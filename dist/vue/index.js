// src/vue/useDialKit.ts
import { computed, onMounted, onUnmounted, shallowRef, watch } from "vue";

// src/numeric.ts
function decimalsForStep(step, min = 0, max = 0) {
  return Math.min(100, Math.max(...[step, min, max].map((value) => {
    const [coefficient, exponent = "0"] = String(value).toLowerCase().split("e");
    return Math.max(0, (coefficient.split(".")[1]?.length ?? 0) - Number(exponent));
  })));
}
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
var fieldSpace = (format) => format === "hsl" ? "hsl" : format === "oklch" ? "oklch" : "hsv";
var clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
var wrapHue = (h25) => (h25 % 360 + 360) % 360;
var multiply = (m, v) => m.map((row) => row.reduce((n, x, i) => n + x * v[i], 0));
var linearize = (v) => Math.abs(v) <= 0.04045 ? v / 12.92 : Math.sign(v) * ((Math.abs(v) + 0.055) / 1.055) ** 2.4;
var encode = (v) => Math.abs(v) <= 31308e-7 ? 12.92 * v : Math.sign(v) * (1.055 * Math.abs(v) ** (1 / 2.4) - 0.055);
var RGB_XYZ = [[0.4123907993, 0.3575843394, 0.1804807884], [0.2126390059, 0.7151686788, 0.0721923154], [0.0193308187, 0.1191947798, 0.9505321522]];
var P3_XYZ = [[0.4865709486, 0.2656676932, 0.1982172852], [0.2289745641, 0.6917385218, 0.0792869141], [0, 0.0451133819, 1.0439443689]];
var XYZ_RGB = [[3.2409699419, -1.5373831776, -0.4986107603], [-0.9692436363, 1.8759675015, 0.0415550574], [0.0556300797, -0.2039769589, 1.0569715142]];
var XYZ_P3 = [[2.4934969119, -0.9313836179, -0.4027107845], [-0.8294889696, 1.7626640603, 0.0236246858], [0.0358458302, -0.0761723893, 0.956884524]];
function rgbToColor(rgb, a = 1, space = "srgb") {
  const xyz = multiply(space === "p3" ? P3_XYZ : RGB_XYZ, rgb.map(linearize));
  const [l, m, s] = multiply([[0.819022438, 0.3619062601, -0.1288737815], [0.0329836539, 0.9292868616, 0.0361446664], [0.0481771894, 0.2642395318, 0.6335478285]], xyz).map(Math.cbrt);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(A, B);
  return { l: clamp(L), c: c < 1e-7 ? 0 : c, h: c < 1e-7 ? 0 : wrapHue(Math.atan2(B, A) * 180 / Math.PI), a: clamp(a) };
}
function colorToRgb(color, space = "srgb") {
  const a = color.c * Math.cos(color.h * Math.PI / 180);
  const b = color.c * Math.sin(color.h * Math.PI / 180);
  const lms = [
    (color.l + 0.3963377774 * a + 0.2158037573 * b) ** 3,
    (color.l - 0.1055613458 * a - 0.0638541728 * b) ** 3,
    (color.l - 0.0894841775 * a - 1.291485548 * b) ** 3
  ];
  const xyz = multiply([[1.2268798734, -0.5578149966, 0.2813910502], [-0.0405757626, 1.1122868294, -0.0717110667], [-0.0763729497, -0.421493324, 1.5869240244]], lms);
  return multiply(space === "p3" ? XYZ_P3 : XYZ_RGB, xyz).map(encode);
}
function inGamut(color, space = "srgb") {
  return colorToRgb(color, space).every((n) => n >= -1e-5 && n <= 1.00001);
}
function fitGamut(color, space = "srgb") {
  if (inGamut(color, space)) return color;
  let lo = 0;
  let hi = color.c;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ ...color, c: mid }, space)) lo = mid;
    else hi = mid;
  }
  return { ...color, c: lo };
}
function maxChroma(l, h25, space = "srgb") {
  if (l <= 0 || l >= 1) return 0;
  return fitGamut({ l, c: 0.5, h: h25, a: 1 }, space).c;
}
function colorFormat(value) {
  const text = value.trim();
  if (/^oklch\(/i.test(text) || /^color\(display-p3\s/i.test(text)) return "oklch";
  if (/^rgba?\(/i.test(text)) return "rgb";
  if (/^hsla?\(/i.test(text)) return "hsl";
  return "hex";
}
var round = (v, digits = 4) => Number(v.toFixed(digits));
function formatColor(color, format) {
  const alpha = color.a < 1 ? ` / ${round(color.a)}` : "";
  if (format === "oklch") return `oklch(${round(color.l)} ${round(color.c)} ${round(color.h, 2)}${alpha})`;
  if (format === "hsl") {
    const { h: h25, s, l } = colorToHsl(color);
    return `hsl(${round(h25, 1)} ${round(s * 100, 1)}% ${round(l * 100, 1)}%${alpha})`;
  }
  const bytes = colorToRgb255(color);
  if (format === "rgb") return `rgb(${bytes.join(" ")}${alpha})`;
  if (color.a < 1) bytes.push(Math.round(color.a * 255));
  return "#" + bytes.map((n) => n.toString(16).padStart(2, "0")).join("");
}
function colorToRgb255(color) {
  return colorToRgb(fitGamut(color)).map((n) => Math.round(clamp(n) * 255));
}
function rgb255ToColor(r, g, b, a = 1) {
  return rgbToColor([clamp(r / 255), clamp(g / 255), clamp(b / 255)], a);
}
function colorToHexSix(color) {
  return ("#" + colorToRgb255(color).map((n) => n.toString(16).padStart(2, "0")).join("")).toUpperCase();
}
function colorToHsv(color, fallbackHue = 0) {
  const [r, g, b] = colorToRgb(fitGamut(color)).map((n) => clamp(n));
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const grey = d < 1e-6;
  return { h: grey ? fallbackHue : rgbHue(r, g, b, max, d), s: grey || max === 0 ? 0 : d / max, v: max };
}
function hsvToColor({ h: h25, s, v }, a = 1) {
  const f = (n) => {
    const k = (n + wrapHue(h25) / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return rgbToColor([f(5), f(3), f(1)], a);
}
function colorToHsl(color, fallbackHue = 0) {
  const [r, g, b] = colorToRgb(fitGamut(color)).map((n) => clamp(n));
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  const grey = d < 1e-6;
  const s = grey ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: grey ? fallbackHue : rgbHue(r, g, b, max, d), s: clamp(s), l };
}
function hslToColor({ h: h25, s, l }, a = 1) {
  const k = clamp(s) * Math.min(clamp(l), 1 - clamp(l));
  const f = (n) => {
    const t = (n + wrapHue(h25) / 30) % 12;
    return clamp(l) - k * Math.max(-1, Math.min(t - 3, 9 - t, 1));
  };
  return rgbToColor([f(0), f(8), f(4)], a);
}
function rgbHue(r, g, b, max, d) {
  const h25 = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return wrapHue(h25 * 60);
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
    const h25 = number(channels[2], 1, true);
    return l === null || c === null || h25 === null ? null : { l: clamp(l), c: Math.max(0, c), h: wrapHue(h25), a: clamp(alpha) };
  }
  if (kind.startsWith("hsl")) {
    const h25 = number(channels[0], 1, true);
    const s = number(channels[1]);
    const l = number(channels[2]);
    if (h25 === null || s === null || l === null || !channels[1].endsWith("%") || !channels[2].endsWith("%")) return null;
    const sat = clamp(s), light = clamp(l);
    const a = sat * Math.min(light, 1 - light);
    const f = (n) => {
      const k = (n + wrapHue(h25) / 30) % 12;
      return light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return rgbToColor([f(0), f(8), f(4)], alpha);
  }
  const values = channels.map((c) => number(c, p3 ? 1 : 255));
  if (values.some((n) => n === null)) return null;
  return rgbToColor(values.map((n) => p3 ? n : clamp(n / 255)), alpha, p3 ? "p3" : "srgb");
}

// src/dial-pad.ts
function padFraction(value, axis, mapping = "linear") {
  const { min, max, default: middle } = axis;
  if (mapping === "centered" && middle > min && middle < max) {
    return value <= middle ? 0.5 * (value - min) / (middle - min) : 0.5 + 0.5 * (value - middle) / (max - middle);
  }
  return (value - min) / (max - min);
}
function padValueAt(fraction, axis, mapping = "linear") {
  const { min, max, default: middle } = axis;
  if (mapping === "centered" && middle > min && middle < max) {
    return fraction <= 0.5 ? min + fraction * 2 * (middle - min) : middle + (fraction - 0.5) * 2 * (max - middle);
  }
  return min + fraction * (max - min);
}
var PAD_GRID_DIVISIONS = 6;
function padGridIntersection(x, y, width, height) {
  if (width <= 0 || height <= 0) return void 0;
  const column = Math.round(x / width * PAD_GRID_DIVISIONS);
  const row = Math.round(y / height * PAD_GRID_DIVISIONS);
  if (column < 1 || column >= PAD_GRID_DIVISIONS || row < 1 || row >= PAD_GRID_DIVISIONS) return void 0;
  const target = { x: column / PAD_GRID_DIVISIONS * width, y: row / PAD_GRID_DIVISIONS * height };
  return Math.abs(x - target.x) <= 8 && Math.abs(y - target.y) <= 8 ? target : void 0;
}
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
function padValueFromPoint(x, y, config = {}) {
  const horizontal = resolvePadAxis(config.x);
  const vertical = resolvePadAxis(config.y);
  return {
    x: snapPadAxis(padValueAt(x, horizontal, config.mapping), horizontal),
    y: snapPadAxis(padValueAt(1 - y, vertical, config.mapping), vertical)
  };
}
function padValueFromKey(value, key, shift, config = {}) {
  const axis = key === "ArrowLeft" || key === "ArrowRight" ? "x" : key === "ArrowUp" || key === "ArrowDown" ? "y" : void 0;
  if (!axis) return void 0;
  const range = resolvePadAxis(config[axis]);
  const direction = key === "ArrowRight" || key === "ArrowUp" ? 1 : -1;
  return { ...value, [axis]: snapPadAxis(value[axis] + direction * range.step * (shift ? 10 : 1), range) };
}

// src/background.ts
var BACKGROUND_MODES = ["solid", "gradient", "media"];
var GRADIENT_SHAPES = ["linear", "radial", "angular", "diamond"];
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
      handles: defaultGradientHandles(),
      stops: [{ at: 0, color: "#000000", alpha: 100 }, { at: 100, color: "#ffffff", alpha: 100 }]
    },
    media: null,
    mediaDisplay: defaultMediaDisplay()
  };
}
function defaultGradientHandles() {
  return { start: { x: 0.5, y: 0.1 }, end: { x: 0.5, y: 0.9 }, width: { x: 0.1, y: 0.5 } };
}
function legacyGradientHandles(shape, angle) {
  if (shape === "radial") return { start: { x: 0.5, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0.5, y: 0 } };
  const theta = (Number.isFinite(angle) ? angle : 180) * Math.PI / 180;
  const d = { x: Math.sin(theta), y: -Math.cos(theta) };
  const h25 = (Math.abs(d.x) + Math.abs(d.y)) / 2;
  return {
    start: roundPoint({ x: 0.5 - d.x * h25, y: 0.5 - d.y * h25 }),
    end: roundPoint({ x: 0.5 + d.x * h25, y: 0.5 + d.y * h25 }),
    width: roundPoint({ x: 0.5 - d.y * h25, y: 0.5 + d.x * h25 })
  };
}
function roundPoint(point) {
  const r = (n) => Math.round(n * 1e6) / 1e6 || 0;
  return { x: r(point.x), y: r(point.y) };
}
function switchGradientShape(gradient, next, aspect = 1) {
  const { shape, handles } = gradient;
  const result = cloneGradient(gradient);
  result.shape = next;
  if (shape === "linear" === (next === "linear")) return result;
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  if (shape === "linear") {
    const centre = { x: (handles.start.x + handles.end.x) / 2, y: (handles.start.y + handles.end.y) / 2 };
    const dx = (handles.end.x - centre.x) * a;
    const dy = handles.end.y - centre.y;
    result.handles = {
      start: roundPoint(centre),
      end: { ...handles.end },
      width: roundPoint({ x: centre.x - dy / a, y: centre.y + dx })
    };
  } else {
    result.handles = {
      start: roundPoint({ x: 2 * handles.start.x - handles.end.x, y: 2 * handles.start.y - handles.end.y }),
      end: { ...handles.end },
      width: { ...handles.width }
    };
  }
  return result;
}
function normalizePoint(value) {
  if (!isRecord(value)) return null;
  const { x, y } = value;
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return roundPoint({ x: clamp2(x, -10, 11), y: clamp2(y, -10, 11) });
}
function normalizeGradientHandles(value, fallback = defaultGradientHandles()) {
  const input = isRecord(value) ? value : {};
  const start = normalizePoint(input.start);
  const end = normalizePoint(input.end);
  const width = normalizePoint(input.width);
  if (!start || !end) return cloneHandles(fallback);
  return { start, end, width: width ?? cloneHandles(fallback).width };
}
function cloneHandles(handles) {
  return { start: { ...handles.start }, end: { ...handles.end }, width: { ...handles.width } };
}
function gradientFrame(handles, width, height) {
  const cx = handles.start.x * width;
  const cy = handles.start.y * height;
  let ex = handles.end.x * width - cx;
  let ey = handles.end.y * height - cy;
  let r1 = Math.hypot(ex, ey);
  if (r1 < 1e-6) {
    ex = 0;
    ey = 1;
    r1 = 1e-6;
  }
  const ax = ex / Math.hypot(ex, ey);
  const ay = ey / Math.hypot(ex, ey);
  const wx = handles.width.x * width - cx;
  const wy = handles.width.y * height - cy;
  const cross = ax * wy - ay * wx;
  const side = cross < 0 ? -1 : 1;
  return { cx, cy, ax, ay, nx: -ay * side, ny: ax * side, r1, r2: Math.max(Math.abs(cross), 1e-6) };
}
function gradientParamAt(shape, frame, px, py) {
  const dx = px - frame.cx;
  const dy = py - frame.cy;
  const u = (dx * frame.ax + dy * frame.ay) / frame.r1;
  if (shape === "linear") return u;
  const v = (dx * frame.nx + dy * frame.ny) / frame.r2;
  if (shape === "radial") return Math.hypot(u, v);
  if (shape === "diamond") return Math.abs(u) + Math.abs(v);
  const turn = Math.atan2(v, u) / (2 * Math.PI);
  return turn < 0 ? turn + 1 : turn;
}
function defaultMediaDisplay() {
  return { fit: "fill", ratio: "source", zoom: 1, tileScale: 0.25, pinX: 0, pinY: 0 };
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var clamp2 = (n, min, max) => Math.min(max, Math.max(min, n));
var round2 = (n) => Math.round(n * 100) / 100;
function normalizeHex(value) {
  if (typeof value !== "string") return null;
  const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join("") : match[1];
  return `#${hex.toLowerCase()}`;
}
function sortStops(stops) {
  return stops.map((stop, i) => ({ stop, i })).sort((a, b) => a.stop.at - b.stop.at || a.i - b.i).map(({ stop }) => stop);
}
function normalizeStop(value) {
  if (!isRecord(value)) return null;
  const color = normalizeHex(value.color);
  if (!color || typeof value.at !== "number" || !Number.isFinite(value.at)) return null;
  const alpha = typeof value.alpha === "number" && Number.isFinite(value.alpha) ? value.alpha : 100;
  return { at: round2(clamp2(value.at, 0, 100)), color, alpha: round2(clamp2(alpha, 0, 100)) };
}
function normalizeGradient(value, fallback = defaultBackgroundValue().gradient) {
  if (!isRecord(value)) return cloneGradient(fallback);
  const shape = GRADIENT_SHAPES.includes(value.shape) ? value.shape : fallback.shape;
  const handles = isRecord(value.handles) ? normalizeGradientHandles(value.handles, fallback.handles) : typeof value.angle === "number" && Number.isFinite(value.angle) || value.shape === "radial" ? legacyGradientHandles(value.shape === "radial" ? "radial" : "linear", typeof value.angle === "number" ? value.angle : 180) : cloneHandles(fallback.handles);
  const stops = Array.isArray(value.stops) ? value.stops.map(normalizeStop).filter((stop) => stop !== null) : [];
  return {
    shape,
    handles,
    stops: stops.length >= BACKGROUND_MIN_STOPS ? capStops(sortStops(stops)) : fallback.stops.map((stop) => ({ ...stop }))
  };
}
function capStops(sorted) {
  const n = sorted.length;
  if (n <= BACKGROUND_MAX_STOPS) return sorted;
  return Array.from({ length: BACKGROUND_MAX_STOPS }, (_, i) => sorted[Math.round(i * (n - 1) / (BACKGROUND_MAX_STOPS - 1))]);
}
function normalizeMedia(value) {
  if (!isRecord(value)) return null;
  if (typeof value.key !== "string" || !value.key) return null;
  if (value.kind !== "image" && value.kind !== "video") return null;
  return { key: value.key, kind: value.kind };
}
function normalizeMediaDisplay(value, fallback = defaultMediaDisplay()) {
  const input = isRecord(value) ? value : {};
  const zoom = typeof input.zoom === "number" && Number.isFinite(input.zoom) ? Math.round(clamp2(input.zoom, BACKGROUND_ZOOM.min, BACKGROUND_ZOOM.max) * 10) / 10 : fallback.zoom;
  const tileScale = typeof input.tileScale === "number" && Number.isFinite(input.tileScale) ? Math.round(clamp2(input.tileScale, BACKGROUND_TILE_SCALE.min, BACKGROUND_TILE_SCALE.max) * 100) / 100 : fallback.tileScale;
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
  return { shape: gradient.shape, handles: cloneHandles(gradient.handles), stops: gradient.stops.map((stop) => ({ ...stop })) };
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
  return a.shape === b.shape && sameHandles(a.handles, b.handles) && sameStops(a.stops, b.stops);
}
function samePoint(a, b) {
  return !!a && !!b && a.x === b.x && a.y === b.y;
}
function sameHandles(a, b) {
  return isRecord(a) && isRecord(b) && samePoint(a.start, b.start) && samePoint(a.end, b.end) && samePoint(a.width, b.width);
}
function sameBackgroundValue(a, b) {
  if (!isRecord(a) || !isRecord(b)) return false;
  const x = a;
  const y = b;
  if (x.mode !== y.mode || x.color !== y.color) return false;
  if (!isRecord(x.gradient) || !isRecord(y.gradient) || !Array.isArray(x.gradient.stops) || !Array.isArray(y.gradient.stops)) return false;
  if (!isRecord(x.gradient.handles) || !isRecord(y.gradient.handles)) return false;
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
  return `#${rgb.map((n) => Math.round(clamp2(n, 0, 255)).toString(16).padStart(2, "0")).join("")}`;
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
  next.splice(clamp2(to, 0, next.length), 0, item);
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
  const list = (stops) => stops.map((stop) => `${stopCssColor(stop)} ${round2(stop.at)}%`).join(", ");
  if (direction) return `linear-gradient(${direction}, ${list(gradient.stops)})`;
  const frame = gradientFrame(gradient.handles, 100, 100);
  const at = `${round2(frame.cx)}% ${round2(frame.cy)}%`;
  if (gradient.shape === "linear") {
    const deg = Math.atan2(frame.ax, -frame.ay) * 180 / Math.PI;
    const length = Math.abs(frame.ax) + Math.abs(frame.ay);
    const onCss = (t) => {
      const x = frame.cx / 100 + frame.ax * frame.r1 / 100 * t - 0.5;
      const y = frame.cy / 100 + frame.ay * frame.r1 / 100 * t - 0.5;
      return ((x * frame.ax + y * frame.ay) / length + 0.5) * 100;
    };
    return `linear-gradient(${round2(deg)}deg, ${list(gradient.stops.map((stop) => ({ ...stop, at: onCss(stop.at / 100) })))})`;
  }
  if (gradient.shape === "angular") {
    const from = Math.atan2(frame.ax, -frame.ay) * 180 / Math.PI;
    const clockwise = frame.ax * frame.ny - frame.ay * frame.nx > 0;
    const stops = clockwise ? gradient.stops : [...gradient.stops].reverse().map((stop) => ({ ...stop, at: 100 - stop.at }));
    return `conic-gradient(from ${round2(from)}deg at ${at}, ${list(stops)})`;
  }
  const along = Math.abs(frame.ax) >= Math.abs(frame.ay);
  const rx = round2(along ? frame.r1 : frame.r2);
  const ry = round2(along ? frame.r2 : frame.r1);
  return `radial-gradient(${rx}% ${ry}% at ${at}, ${list(gradient.stops)})`;
}

// src/input-modality.ts
var installed = false;
function trackInputModality() {
  if (installed || typeof document === "undefined" || typeof document.addEventListener !== "function") return;
  installed = true;
  let fromPointer = false;
  let handBack = false;
  document.addEventListener("pointerdown", () => {
    fromPointer = true;
    handBack = false;
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Shift" || event.key === "Meta" || event.key === "Control" || event.key === "Alt") return;
    const target = event.target;
    handBack = (event.key === "Enter" || event.key === "Escape") && target instanceof HTMLElement && target.dataset.dialFocus === "pointer";
    fromPointer = false;
  }, true);
  document.addEventListener("focusin", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.closest(".dialkit-root, .dialkit-bg-gizmo")) return;
    target.dataset.dialFocus = fromPointer || handBack ? "pointer" : "keyboard";
    handBack = false;
  }, true);
  const sizeSliderInput = (target) => {
    if (target instanceof HTMLInputElement && target.classList.contains("dialkit-slider-input")) {
      target.style.width = `${Math.max(target.value.length, 1)}ch`;
    }
  };
  document.addEventListener("focusin", (event) => sizeSliderInput(event.target), true);
  document.addEventListener("input", (event) => sizeSliderInput(event.target), true);
  document.addEventListener("focusout", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement) delete target.dataset.dialFocus;
  }, true);
}

// src/background-paint.ts
function sample(stops, t) {
  const { color, alpha } = gradientColorAt(stops, Math.min(100, Math.max(0, t * 100)));
  const n = parseInt(color.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255, alpha / 100];
}
function paintBackgroundPreview(canvas, value) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  if (value.mode === "solid") {
    ctx.fillStyle = value.color;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  if (value.mode !== "gradient" || width === 0 || height === 0) return;
  const { shape, handles, stops } = value.gradient;
  const size = 1024;
  const table = new Uint8ClampedArray(size * 4);
  for (let i = 0; i < size; i++) {
    const [r, g, b, a] = sample(stops, i / (size - 1));
    table.set([r, g, b, Math.round(a * 255)], i * 4);
  }
  const frame = gradientFrame(handles, width, height);
  const image = ctx.createImageData(width, height);
  const data = image.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = gradientParamAt(shape, frame, x + 0.5, y + 0.5);
      const index = Math.round(Math.min(1, Math.max(0, t)) * (size - 1)) * 4;
      const o = (y * width + x) * 4;
      data[o] = table[index];
      data[o + 1] = table[index + 1];
      data[o + 2] = table[index + 2];
      data[o + 3] = table[index + 3];
    }
  }
  ctx.putImageData(image, 0, 0);
}

// src/gradient-gizmo.ts
var toPx = (p, box) => ({ x: p.x * box.width, y: p.y * box.height });
var round4 = (n) => Math.round(n * 1e4) / 1e4 || 0;
var toFraction = (p, box) => ({
  x: round4(p.x / Math.max(box.width, 1e-6)),
  y: round4(p.y / Math.max(box.height, 1e-6))
});
function gizmoPoints(handles, box) {
  const f = gradientFrame(handles, box.width, box.height);
  return {
    start: { x: f.cx, y: f.cy },
    end: { x: f.cx + f.ax * f.r1, y: f.cy + f.ay * f.r1 },
    width: { x: f.cx + f.nx * f.r2, y: f.cy + f.ny * f.r2 }
  };
}
function sideOf(handles, box) {
  const f = gradientFrame(handles, box.width, box.height);
  return f.nx === -f.ay && f.ny === f.ax ? 1 : -1;
}
function fromFrame(start, end, r2, side, box) {
  let ax = end.x - start.x;
  let ay = end.y - start.y;
  const length = Math.hypot(ax, ay);
  if (length < 1e-6) {
    ax = 0;
    ay = 1;
  } else {
    ax /= length;
    ay /= length;
  }
  const width = { x: start.x - ay * side * r2, y: start.y + ax * side * r2 };
  return { start: toFraction(start, box), end: toFraction(end, box), width: toFraction(width, box) };
}
function rotateGradientHandles(handles, radians, box) {
  const p = gizmoPoints(handles, box);
  const f = gradientFrame(handles, box.width, box.height);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const turn = (v) => {
    const dx = v.x - p.start.x;
    const dy = v.y - p.start.y;
    return { x: p.start.x + dx * cos - dy * sin, y: p.start.y + dx * sin + dy * cos };
  };
  return fromFrame(p.start, turn(p.end), f.r2, sideOf(handles, box), box);
}
function rotateGradientQuarter(shape, handles, box) {
  if (shape !== "linear") return rotateGradientHandles(handles, Math.PI / 2, box);
  const { start, end, width } = handles;
  const near = (a, b) => Math.abs(a - b) < 1e-4;
  const evenInset = (a, b) => near(a + b, 1) && (near(Math.min(a, b), 0.1) || near(Math.min(a, b), 0));
  const atDefault = near(start.x, 0.5) && near(end.x, 0.5) && evenInset(start.y, end.y) || near(start.y, 0.5) && near(end.y, 0.5) && evenInset(start.x, end.x);
  if (atDefault) {
    const turn2 = (p) => ({ x: round4(1 - p.y), y: round4(p.x) });
    return { start: turn2(start), end: turn2(end), width: turn2(width) };
  }
  const s = toPx(start, box);
  const e = toPx(end, box);
  const mid = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
  const turn = (p) => {
    const v = toPx(p, box);
    return toFraction({ x: mid.x - (v.y - mid.y), y: mid.y + (v.x - mid.x) }, box);
  };
  return { start: turn(start), end: turn(end), width: turn(width) };
}
function dragGradientEnd(handles, pointer, box) {
  const f = gradientFrame(handles, box.width, box.height);
  const start = { x: f.cx, y: f.cy };
  const reach = Math.hypot(pointer.x - start.x, pointer.y - start.y);
  const end = reach >= 1 ? pointer : { x: start.x + f.ax, y: start.y + f.ay };
  const r1 = Math.max(reach, 1);
  return fromFrame(start, end, f.r2 * (r1 / f.r1), sideOf(handles, box), box);
}
function dragGradientCentre(handles, pointer, box) {
  const f = gradientFrame(handles, box.width, box.height);
  const end = { x: f.cx + f.ax * f.r1, y: f.cy + f.ay * f.r1 };
  const r1 = Math.hypot(end.x - pointer.x, end.y - pointer.y);
  return fromFrame(pointer, end, f.r2 * (r1 / f.r1), sideOf(handles, box), box);
}
function dragGradientWidth(handles, pointer, box) {
  const f = gradientFrame(handles, box.width, box.height);
  const start = { x: f.cx, y: f.cy };
  const end = { x: f.cx + f.ax * f.r1, y: f.cy + f.ay * f.r1 };
  const signed = (pointer.x - start.x) * -f.ay + (pointer.y - start.y) * f.ax;
  const r2 = Math.max(Math.abs(signed), 1);
  return fromFrame(start, end, r2, signed < 0 ? -1 : 1, box);
}
function stopPositionAt(shape, handles, pointer, box) {
  const f = gradientFrame(handles, box.width, box.height);
  const dx = pointer.x - f.cx;
  const dy = pointer.y - f.cy;
  const u = (dx * f.ax + dy * f.ay) / f.r1;
  if (shape !== "angular") return Math.min(100, Math.max(0, u * 100));
  const v = (dx * f.nx + dy * f.ny) / f.r2;
  const turn = Math.atan2(v, u) / (2 * Math.PI);
  return (turn < 0 ? turn + 1 : turn) * 100;
}
function ghostPositionAt(shape, handles, pointer, box) {
  if (shape !== "angular") return stopPositionAt(shape, handles, pointer, box);
  const f = gradientFrame(handles, box.width, box.height);
  const dx = pointer.x - f.cx;
  const dy = pointer.y - f.cy;
  const u = dx * f.ax + dy * f.ay;
  const v = dx * f.nx + dy * f.ny;
  let theta = Math.atan2(v / f.r2, u / f.r1);
  for (let i = 0; i < 8; i++) {
    const sin = Math.sin(theta);
    const cos = Math.cos(theta);
    const g = (f.r2 * f.r2 - f.r1 * f.r1) * sin * cos + u * f.r1 * sin - v * f.r2 * cos;
    const dg = (f.r2 * f.r2 - f.r1 * f.r1) * (cos * cos - sin * sin) + u * f.r1 * cos + v * f.r2 * sin;
    if (Math.abs(dg) < 1e-9) break;
    const step = g / dg;
    theta -= step;
    if (Math.abs(step) < 1e-7) break;
  }
  const turn = theta / (2 * Math.PI);
  return (turn - Math.floor(turn)) * 100;
}
function stopPlacement(shape, handles, at, box) {
  const f = gradientFrame(handles, box.width, box.height);
  const t = at / 100;
  let x;
  let y;
  let ox;
  let oy;
  if (shape === "angular") {
    const theta = t * 2 * Math.PI;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    x = f.cx + f.ax * f.r1 * cos + f.nx * f.r2 * sin;
    y = f.cy + f.ay * f.r1 * cos + f.ny * f.r2 * sin;
    const nx = f.ax * cos / f.r1 + f.nx * sin / f.r2;
    const ny = f.ay * cos / f.r1 + f.ny * sin / f.r2;
    const length = Math.hypot(nx, ny) || 1;
    ox = nx / length;
    oy = ny / length;
  } else {
    x = f.cx + f.ax * f.r1 * t;
    y = f.cy + f.ay * f.r1 * t;
    ox = f.ay;
    oy = -f.ax;
  }
  return { x, y, ox, oy, rotation: Math.atan2(ox, -oy) };
}
function gizmoAngle(handles, box) {
  const f = gradientFrame(handles, box.width, box.height);
  let degrees = Math.atan2(f.ay, f.ax) * 180 / Math.PI - 90;
  if (degrees <= -180) degrees += 360;
  if (degrees > 180) degrees -= 360;
  return Math.round(degrees) || 0;
}
var formatGizmoAngle = (degrees) => `${degrees}\xB0`;
var GIZMO_SWATCH_OFFSET = 18;
var GHOST_BAND_OUT = GIZMO_SWATCH_OFFSET + 10;
var GHOST_BAND_IN = 8;
function ghostBandPath(shape, handles, box) {
  const edge = (at, offset) => {
    const p = stopPlacement(shape, handles, at, box);
    return `${(p.x + p.ox * offset).toFixed(2)} ${(p.y + p.oy * offset).toFixed(2)}`;
  };
  if (shape !== "angular") return `M${edge(0, GHOST_BAND_OUT)}L${edge(100, GHOST_BAND_OUT)}L${edge(100, -GHOST_BAND_IN)}L${edge(0, -GHOST_BAND_IN)}Z`;
  const steps = 120;
  const outer = [];
  const inner = [];
  for (let i = 0; i < steps; i++) {
    outer.push(edge(i / steps * 100, GHOST_BAND_OUT));
    inner.push(edge((steps - i) / steps * 100, -GHOST_BAND_IN));
  }
  return `M${outer.join("L")}ZM${inner.join("L")}Z`;
}
var formatGizmoPercent = (at) => `${Math.round(at)}%`;
var SVG = "http://www.w3.org/2000/svg";
var MOVE_RADIUS = 7;
var SWATCH_OFFSET = GIZMO_SWATCH_OFFSET;
var STOP_STRIP = 2.5;
var TIP_EDGE = SWATCH_OFFSET + 10 + 6;
var DRAG_THRESHOLD = 3;
var ARROW_STEPS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
var cursors = /* @__PURE__ */ new Map();
function rotateCursor(degrees) {
  const step = Math.round(degrees / 15) * 15;
  let cursor = cursors.get(step);
  if (!cursor) {
    const arc = "M6 15a7.5 7.5 0 0 1 12 0";
    const heads = "M4 12.5 6 15l3-.5M20 12.5 18 15l-3-.5";
    const svg2 = `<svg xmlns="${SVG}" width="24" height="24" viewBox="0 0 24 24"><g transform="rotate(${step + 90} 12 12)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${arc}" stroke="#fff" stroke-width="4"/><path d="${heads}" stroke="#fff" stroke-width="4"/><path d="${arc}" stroke="#000" stroke-width="1.5"/><path d="${heads}" stroke="#000" stroke-width="1.5"/></g></svg>`;
    cursor = `url("data:image/svg+xml,${encodeURIComponent(svg2)}") 12 12, grab`;
    cursors.set(step, cursor);
  }
  return cursor;
}
function element(tag, className) {
  const el = document.createElement(tag);
  el.className = className;
  return el;
}
function svgElement(tag, attrs) {
  const el = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}
function mountGradientGizmo(target, initial, callbacks) {
  let props = initial;
  let box = { width: 1, height: 1 };
  let press;
  let hoverStop = -1;
  let destroyed = false;
  const root = element("div", "dialkit-bg-gizmo");
  const svg2 = svgElement("svg", { class: "dialkit-bg-gizmo-lines", "aria-hidden": "true" });
  const shadowLine = svgElement("line", { class: "dialkit-bg-gizmo-shadow" });
  const line = svgElement("line", { class: "dialkit-bg-gizmo-line" });
  const shadowRim = svgElement("ellipse", { class: "dialkit-bg-gizmo-shadow" });
  const rim = svgElement("ellipse", { class: "dialkit-bg-gizmo-line" });
  const band = svgElement("path", { class: "dialkit-bg-gizmo-hit", "fill-rule": "evenodd" });
  svg2.append(shadowRim, rim, shadowLine, line, band);
  const handles = {
    start: element("div", "dialkit-bg-gizmo-handle"),
    end: element("div", "dialkit-bg-gizmo-handle"),
    width: element("div", "dialkit-bg-gizmo-handle")
  };
  for (const [role, el] of Object.entries(handles)) {
    el.dataset.role = role;
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-keyshortcuts", "ArrowUp ArrowDown ArrowLeft ArrowRight");
    el.append(element("span", "dialkit-bg-gizmo-dot"));
  }
  const swatchLayer = element("div", "dialkit-bg-gizmo-stops");
  swatchLayer.setAttribute("aria-hidden", "true");
  const ghost = element("div", "dialkit-bg-gizmo-stop dialkit-bg-gizmo-ghost");
  ghost.setAttribute("aria-hidden", "true");
  ghost.hidden = true;
  const tip = element("div", "dialkit-bg-gizmo-tip");
  tip.setAttribute("aria-hidden", "true");
  tip.hidden = true;
  let swatches = [];
  root.append(svg2, swatchLayer, ghost, handles.width, handles.start, handles.end, tip);
  document.body.append(root);
  root.addEventListener("pointerdown", (event) => event.stopPropagation());
  root.addEventListener("focusin", (event) => event.stopPropagation());
  const local = (event) => {
    const rect = root.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const showTip = (text, x, y, place) => {
    tip.textContent = text;
    tip.hidden = false;
    tip.dataset.place = place;
    tip.style.transform = `translate(${x}px, ${y}px)`;
  };
  const hideTip = () => {
    tip.hidden = true;
  };
  const percentTipAt = (text, place) => {
    showTip(text, place.x, place.y, "center");
    const reach = TIP_EDGE + tip.offsetWidth / 2 * Math.abs(place.ox) + tip.offsetHeight / 2 * Math.abs(place.oy);
    tip.style.transform = `translate(${place.x + place.ox * reach}px, ${place.y + place.oy * reach}px)`;
  };
  const zone = (role, p) => {
    const point = gizmoPoints(props.gradient.handles, box)[role];
    return Math.hypot(p.x - point.x, p.y - point.y) <= MOVE_RADIUS ? "move" : "rotate";
  };
  const angleText = () => formatGizmoAngle(gizmoAngle(props.gradient.handles, box));
  for (const [key, el] of Object.entries(handles)) {
    const role = key;
    el.addEventListener("pointermove", (event) => {
      const p = local(event);
      if (press) {
        if (press.id !== event.pointerId) return;
        if (press.kind === "move") {
          const h25 = props.gradient.handles;
          callbacks.onHandles(role === "end" ? dragGradientEnd(h25, p, box) : role === "start" ? dragGradientCentre(h25, p, box) : dragGradientWidth(h25, p, box));
        } else if (press.kind === "rotate") {
          const centre = gizmoPoints(press.base, box).start;
          const angle = Math.atan2(p.y - centre.y, p.x - centre.x);
          callbacks.onHandles(rotateGradientHandles(press.base, angle - press.from, box));
          el.style.cursor = rotateCursor(angle * 180 / Math.PI);
          showTip(angleText(), p.x, p.y, "right");
        }
        return;
      }
      if (zone(role, p) === "move") {
        el.style.cursor = "move";
        hideTip();
      } else {
        const point = gizmoPoints(props.gradient.handles, box)[role];
        el.style.cursor = rotateCursor(Math.atan2(p.y - point.y, p.x - point.x) * 180 / Math.PI);
        showTip(angleText(), p.x, p.y, "right");
      }
    });
    el.addEventListener("pointerleave", () => {
      if (!press) hideTip();
    });
    el.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || press) return;
      event.preventDefault();
      const p = local(event);
      if (zone(role, p) === "move") {
        press = { kind: "move", role, id: event.pointerId };
        hideTip();
      } else {
        const centre = gizmoPoints(props.gradient.handles, box).start;
        press = { kind: "rotate", id: event.pointerId, from: Math.atan2(p.y - centre.y, p.x - centre.x), base: props.gradient.handles };
        showTip(angleText(), p.x, p.y, "right");
      }
      root.dataset.active = "true";
      try {
        el.setPointerCapture(event.pointerId);
      } catch {
        press = void 0;
      }
    });
    el.addEventListener("keydown", (event) => {
      const step = ARROW_STEPS[event.key];
      if (!step || press || event.altKey || event.metaKey || event.ctrlKey) return;
      event.preventDefault();
      event.stopPropagation();
      const share = event.shiftKey ? 0.1 : 0.01;
      const point = gizmoPoints(props.gradient.handles, box)[role];
      const p = { x: point.x + step[0] * share * box.width, y: point.y + step[1] * share * box.height };
      const h25 = props.gradient.handles;
      callbacks.onHandles(role === "end" ? dragGradientEnd(h25, p, box) : role === "start" ? dragGradientCentre(h25, p, box) : dragGradientWidth(h25, p, box));
    });
    const end = (event) => {
      if (!press || press.id !== event.pointerId || press.kind === "stop") return;
      press = void 0;
      delete root.dataset.active;
      if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
      hideTip();
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("lostpointercapture", end);
  }
  const percentTip = (index) => {
    const stop = props.gradient.stops[index];
    if (!stop) return;
    percentTipAt(formatGizmoPercent(stop.at), stopPlacement(props.gradient.shape, props.gradient.handles, stop.at, box));
  };
  const startStopDrag = (event, el, moved) => {
    const p = local(event);
    press = { kind: "stop", id: event.pointerId, x: p.x, y: p.y, moved };
    root.dataset.active = "true";
    try {
      el.setPointerCapture(event.pointerId);
    } catch {
      press = void 0;
    }
  };
  const stopMove = (event) => {
    if (!press || press.kind !== "stop" || press.id !== event.pointerId) return false;
    const p = local(event);
    if (!press.moved && Math.hypot(p.x - press.x, p.y - press.y) < DRAG_THRESHOLD) return true;
    press.moved = true;
    const at = Math.round(stopPositionAt(props.gradient.shape, props.gradient.handles, p, box));
    callbacks.onStopMove(props.selected, at);
    percentTip(props.selected);
    return true;
  };
  const stopEnd = (event, el) => {
    if (!press || press.kind !== "stop" || press.id !== event.pointerId) return;
    press = void 0;
    delete root.dataset.active;
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    if (hoverStop < 0) hideTip();
  };
  const buildSwatches = () => {
    swatchLayer.replaceChildren();
    swatches = props.gradient.stops.map((_, i) => {
      const el = element("div", "dialkit-bg-gizmo-stop");
      el.addEventListener("pointerenter", () => {
        hoverStop = i;
        if (!press) percentTip(i);
      });
      el.addEventListener("pointerleave", () => {
        hoverStop = -1;
        if (!press) hideTip();
      });
      el.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || press) return;
        event.preventDefault();
        callbacks.onSelect(i);
        startStopDrag(event, el, false);
        percentTip(props.selected);
      });
      el.addEventListener("pointermove", (event) => {
        stopMove(event);
      });
      el.addEventListener("pointerup", (event) => stopEnd(event, el));
      el.addEventListener("pointercancel", (event) => stopEnd(event, el));
      el.addEventListener("lostpointercapture", (event) => stopEnd(event, el));
      swatchLayer.append(el);
      return el;
    });
  };
  const stopUnder = (at) => {
    const { shape, handles: h25, stops } = props.gradient;
    const point = stopPlacement(shape, h25, at, box);
    let found = -1;
    let best = STOP_STRIP;
    stops.forEach((stop, i) => {
      const p = stopPlacement(shape, h25, stop.at, box);
      const d = Math.hypot(p.x - point.x, p.y - point.y);
      if (d <= best) {
        best = d;
        found = i;
      }
    });
    return found;
  };
  const hideGhost = () => {
    ghost.hidden = true;
    delete root.dataset.ghost;
  };
  band.addEventListener("pointermove", (event) => {
    if (stopMove(event)) {
      hideGhost();
      return;
    }
    if (press) return;
    const { shape, handles: h25, stops } = props.gradient;
    const at = ghostPositionAt(shape, h25, local(event), box);
    const under = stopUnder(at);
    if (under >= 0) {
      hideGhost();
      band.style.cursor = "move";
      percentTip(under);
      return;
    }
    band.style.cursor = "";
    const place = stopPlacement(shape, h25, at, box);
    ghost.hidden = false;
    root.dataset.ghost = "true";
    ghost.style.setProperty("--dial-bg-stop", stopCssColor(gradientColorAt(stops, at)));
    placeSwatch(ghost, place);
    percentTipAt(formatGizmoPercent(at), place);
  });
  band.addEventListener("pointerleave", () => {
    if (!press) {
      hideGhost();
      hideTip();
    }
  });
  band.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || press) return;
    event.preventDefault();
    hideGhost();
    const { shape, handles: h25 } = props.gradient;
    const at = ghostPositionAt(shape, h25, local(event), box);
    const under = stopUnder(at);
    if (under >= 0) callbacks.onSelect(under);
    else callbacks.onStopAdd(Math.round(at * 10) / 10);
    startStopDrag(event, band, false);
    percentTip(props.selected);
  });
  band.addEventListener("pointerup", (event) => stopEnd(event, band));
  band.addEventListener("pointercancel", (event) => stopEnd(event, band));
  band.addEventListener("lostpointercapture", (event) => stopEnd(event, band));
  let tokensFrom = "";
  function copyTokens() {
    const source = props.themeSource;
    const key = source ? `${source.dataset.theme ?? ""}` : "";
    if (!source || key === tokensFrom) return;
    tokensFrom = key;
    writeTokens(source);
  }
  function writeTokens(source) {
    const styles = getComputedStyle(source);
    for (const property of Array.from(styles)) {
      if (property.startsWith("--dial-")) root.style.setProperty(property, styles.getPropertyValue(property));
    }
  }
  let tokenFrame = 0;
  function refreshTokens() {
    if (tokenFrame || typeof requestAnimationFrame !== "function") return;
    tokenFrame = requestAnimationFrame(() => {
      tokenFrame = 0;
      if (!destroyed && props.themeSource) writeTokens(props.themeSource);
    });
  }
  function placeSwatch(el, place) {
    const x = place.x + place.ox * SWATCH_OFFSET;
    const y = place.y + place.oy * SWATCH_OFFSET;
    el.style.transform = `translate(${x}px, ${y}px) rotate(${place.rotation}rad)`;
  }
  const fit = () => {
    if (destroyed) return;
    const rect = target.getBoundingClientRect();
    Object.assign(root.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    const changed = rect.width !== box.width || rect.height !== box.height;
    box = { width: Math.max(rect.width, 1), height: Math.max(rect.height, 1) };
    if (changed) draw();
  };
  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : void 0;
  resize?.observe(target);
  window.addEventListener("scroll", fit, true);
  window.addEventListener("resize", fit);
  function draw() {
    const { shape, handles: h25, stops } = props.gradient;
    copyTokens();
    if (props.zIndex !== void 0) root.style.zIndex = String(props.zIndex);
    root.dataset.shape = shape;
    const p = gizmoPoints(h25, box);
    const f = gradientFrame(h25, box.width, box.height);
    for (const l of [shadowLine, line]) {
      l.setAttribute("x1", String(p.start.x));
      l.setAttribute("y1", String(p.start.y));
      l.setAttribute("x2", String(p.end.x));
      l.setAttribute("y2", String(p.end.y));
    }
    const turn = Math.atan2(f.ay, f.ax) * 180 / Math.PI;
    for (const e of [shadowRim, rim]) {
      e.setAttribute("cx", String(p.start.x));
      e.setAttribute("cy", String(p.start.y));
      e.setAttribute("rx", String(f.r1));
      e.setAttribute("ry", String(f.r2));
      e.setAttribute("transform", `rotate(${turn} ${p.start.x} ${p.start.y})`);
    }
    const angular = shape === "angular";
    shadowRim.style.display = rim.style.display = angular ? "" : "none";
    band.setAttribute("d", ghostBandPath(shape, h25, box));
    for (const [key, el] of Object.entries(handles)) {
      const point = p[key];
      el.style.transform = `translate(${point.x}px, ${point.y}px)`;
      const name = key === "start" ? shape === "linear" ? "start" : "centre" : key;
      el.setAttribute("aria-label", `Gradient ${name}, ${Math.round(point.x / box.width * 100)}% across, ${Math.round(point.y / box.height * 100)}% down`);
    }
    handles.width.hidden = shape === "linear";
    if (swatches.length !== stops.length) buildSwatches();
    stops.forEach((stop, i) => {
      const el = swatches[i];
      el.style.setProperty("--dial-bg-stop", stopCssColor(stop));
      el.toggleAttribute("data-selected", i === props.selected);
      el.style.zIndex = i === props.selected ? "3" : "2";
      placeSwatch(el, stopPlacement(shape, h25, stop.at, box));
    });
  }
  fit();
  draw();
  return {
    element: root,
    update(next) {
      props = next;
      fit();
      draw();
      refreshTokens();
      if (press?.kind === "stop" && press.moved) percentTip(props.selected);
      else if (press?.kind === "rotate") {
      } else if (hoverStop >= 0 && !press) percentTip(hoverStop);
    },
    destroy() {
      destroyed = true;
      if (tokenFrame) cancelAnimationFrame(tokenFrame);
      resize?.disconnect();
      window.removeEventListener("scroll", fit, true);
      window.removeEventListener("resize", fit);
      root.remove();
    }
  };
}

// src/store/BackgroundHost.ts
var STATE_KEY = /* @__PURE__ */ Symbol.for("dialkit.backgroundHost");
function state() {
  const scope = globalThis;
  let current = scope[STATE_KEY];
  if (!current) {
    current = { host: {}, saved: [], listeners: /* @__PURE__ */ new Set() };
    scope[STATE_KEY] = current;
  }
  return current;
}
function notify() {
  state().listeners.forEach((listener) => listener());
}
function cloneSaved(list) {
  return list.map((saved) => ({ id: saved.id, gradient: normalizeGradient(saved.gradient) }));
}
function setBackgroundHost(host) {
  state().host = { ...host };
  notify();
}
function getBackgroundHost() {
  return state().host;
}
function setSavedGradients(list) {
  state().saved = cloneSaved(list);
  notify();
}
function getSavedGradients() {
  return state().saved;
}
function subscribeBackgroundHost(listener) {
  const listeners = state().listeners;
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// src/store/DialStore.ts
trackInputModality();
function anchorConfigOf(value) {
  return value === true || typeof value === "object" && value !== null && !Array.isArray(value) ? {} : void 0;
}
function padGroupConfigOf(value) {
  if (value === true) return {};
  if (typeof value === "object" && value !== null && !Array.isArray(value)) return value;
  return void 0;
}
function fieldsConfigOf(value) {
  if (value === true) return {};
  if (typeof value === "object" && value !== null && !Array.isArray(value)) return value;
  return void 0;
}
function resetConfigOf(value, folderPath) {
  if (value === true) return true;
  if (typeof value === "string" && value) return `${folderPath}.${value}`;
  return void 0;
}
function textMapOf(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
  return Object.fromEntries(Object.entries(value).filter(([, hint]) => typeof hint === "string" && hint));
}
var FOLDER_META_KEYS = ["_anchor", "_collapsed", "_fields", "_hints", "_labels", "_pad", "_reset"];
function isFolderMetaKey(key) {
  return FOLDER_META_KEYS.includes(key);
}
function withVisibility(control, rule) {
  return { value: control, visibleWhen: rule };
}
function isVisibilityWrapper(raw) {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw) && "value" in raw && "visibleWhen" in raw;
}
function unwrapVisibility(raw) {
  return isVisibilityWrapper(raw) ? raw.value : raw;
}
var EMPTY_VALUES = Object.freeze({});
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
  for (const [key, rawConfigValue] of Object.entries(config)) {
    if (isFolderMetaKey(key)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    const configValue = unwrapVisibility(rawConfigValue);
    if (isLeafConfigValue(configValue)) {
      result[key] = flatValues[path] ?? configDefaultValue(configValue);
    } else if (typeof configValue === "object" && configValue !== null) {
      result[key] = resolveConfigValues(configValue, flatValues, path);
    }
  }
  return result;
}
function flattenConfigUpdates(config, updates, prefix, values) {
  for (const [key, rawConfigValue] of Object.entries(config)) {
    if (isFolderMetaKey(key) || !(key in updates)) continue;
    const nextValue = updates[key];
    if (nextValue === void 0) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    const configValue = unwrapVisibility(rawConfigValue);
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
function isLeafConfigValue(value) {
  return Array.isArray(value) && value.length <= 5 && typeof value[0] === "number" || typeof value === "number" || typeof value === "boolean" || typeof value === "string" || isSpringConfigValue(value) || isEasingConfigValue(value) || isActionConfigValue(value) || isSelectConfigValue(value) || isColorConfigValue(value) || isImageConfigValue(value) || isTextConfigValue(value) || isPadConfigValue(value) || isBackgroundConfigValue(value);
}
function configDefaultValue(value) {
  if (Array.isArray(value)) return value[0];
  if (isSelectConfigValue(value)) return value.default ?? getFirstOptionValue(value.options);
  if (isColorConfigValue(value)) return value.default ?? "#000000";
  if (isImageConfigValue(value)) return value.default ?? getFirstOptionValue(value.options ?? []);
  if (isTextConfigValue(value)) return value.default ?? "";
  if (isPadConfigValue(value)) return normalizePadValue(void 0, value);
  if (isBackgroundConfigValue(value)) return backgroundConfigDefault(value);
  return value;
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function backgroundWriteBase(current, configDefault) {
  if (!isRecord2(current)) return configDefault;
  return sameBackgroundValue(current, normalizeBackgroundValue(current, configDefault)) ? current : configDefault;
}
function sameControlValue(previous, next, control) {
  return Object.is(previous, next) || control?.type === "pad" && isRecord2(previous) && isRecord2(next) && previous.x === next.x && previous.y === next.y || control?.type === "background" && sameBackgroundValue(previous, next);
}
function sameValue(a, b) {
  if (a === b || Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => sameValue(item, b[i]));
  }
  if (isRecord2(a) && isRecord2(b)) return sameRecord(a, b);
  return false;
}
function sameRecord(a, b) {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => key in b && sameValue(a[key], b[key]));
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
function isBackgroundConfigValue(value) {
  return hasType(value, "background");
}
function getFirstOptionValue(options) {
  const first = options[0];
  if (first === void 0) return "";
  return typeof first === "string" ? first : first.value;
}
var PARSED_CONFIG_CACHE_LIMIT = 16;
var DialStoreClass = class {
  constructor() {
    this.panelOpenListeners = /* @__PURE__ */ new Set();
    this.panelOpenStates = /* @__PURE__ */ new Map();
    this.panels = /* @__PURE__ */ new Map();
    /** How many resets ran: a slider that sees it change springs to its new
     *  value instead of jumping (see getResetCount). */
    this.resetCount = 0;
    this.lastResetAt = -Infinity;
    this.controlsByPanel = /* @__PURE__ */ new WeakMap();
    this.panelsSnapshot = [];
    this.standardPanelsSnapshot = [];
    this.timelinePanelsSnapshot = [];
    this.listeners = /* @__PURE__ */ new Map();
    this.globalListeners = /* @__PURE__ */ new Set();
    this.snapshots = /* @__PURE__ */ new Map();
    this.actionListeners = /* @__PURE__ */ new Map();
    this.presets = /* @__PURE__ */ new Map();
    this.activePreset = /* @__PURE__ */ new Map();
    this.baseValues = /* @__PURE__ */ new Map();
    this.defaultValues = /* @__PURE__ */ new Map();
    /** Host values a reset returns to, over the defaults. See setResetValues. */
    this.hostResetValues = /* @__PURE__ */ new Map();
    this.registrationCounts = /* @__PURE__ */ new Map();
    this.retainedPanels = /* @__PURE__ */ new Set();
    this.persistConfigs = /* @__PURE__ */ new Map();
    /**
     * Full (unfiltered) control tree per panel. `panels[id].controls` holds the
     * tree with conditional-visibility controls already filtered out, which is
     * what the UI renders. We keep the unfiltered tree here so visibility can
     * flip back when a dependent value changes.
     */
    this.allControls = /* @__PURE__ */ new Map();
    /**
     * Parsed configs per panel id, keyed by the serialized config + shortcuts.
     * Hosts that swap between a few configs (layout presets) re-register the
     * same shape repeatedly; the parsed tree is immutable after parse (the
     * filtered tree and value maps are fresh copies), so it can be shared.
     */
    this.parsedConfigs = /* @__PURE__ */ new Map();
    /** Cache key of the config each registered panel currently holds. */
    this.panelConfigKeys = /* @__PURE__ */ new Map();
  }
  registerPanel(id, name, config, shortcuts, options = {}) {
    const { key, parsed: { controls: allControls, controlsByPath, defaultValues } } = this.parseCached(id, config, shortcuts);
    this.panelConfigKeys.set(id, key);
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
    this.allControls.set(id, allControls);
    const controls = filterByVisibility(allControls, values);
    const panel = {
      id,
      name,
      controls,
      values,
      shortcuts: shortcuts ?? {},
      kind: options.kind,
      group: options.group,
      presetsEditable: options.presetsEditable,
      presetsLockable: options.presetsLockable,
      hint: options.hint,
      groupHeader: options.groupHeader
    };
    this.panels.set(id, panel);
    this.controlsByPanel.set(panel, controlsByPath);
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
    const { key, parsed: { controls: allControls, controlsByPath, defaultValues } } = this.parseCached(id, config, shortcuts ?? existing.shortcuts);
    const unchanged = this.panelConfigKeys.get(id) === key && name === existing.name && (options.kind ?? existing.kind) === existing.kind && (options.group ?? existing.group) === existing.group && (options.presetsEditable ?? existing.presetsEditable) === existing.presetsEditable && (options.presetsLockable ?? existing.presetsLockable) === existing.presetsLockable && (options.hint ?? existing.hint) === existing.hint;
    this.configurePanelRetention(id, options);
    if (unchanged) {
      this.persistPanel(id);
      return;
    }
    this.panelConfigKeys.set(id, key);
    const nextValues = this.reconcileValues(defaultValues, existing.values, controlsByPath);
    this.allControls.set(id, allControls);
    const controls = filterByVisibility(allControls, nextValues);
    const nextPanel = {
      id,
      name,
      controls,
      values: nextValues,
      shortcuts: shortcuts ?? existing.shortcuts,
      kind: options.kind ?? existing.kind,
      group: options.group ?? existing.group,
      presetsEditable: options.presetsEditable ?? existing.presetsEditable,
      presetsLockable: options.presetsLockable ?? existing.presetsLockable,
      hint: options.hint ?? existing.hint,
      groupHeader: options.groupHeader ?? existing.groupHeader
    };
    this.panels.set(id, nextPanel);
    this.controlsByPanel.set(nextPanel, controlsByPath);
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
      this.defaultValues.delete(id);
      this.hostResetValues.delete(id);
      this.presets.delete(id);
      this.activePreset.delete(id);
      this.persistConfigs.delete(id);
      this.allControls.delete(id);
      this.parsedConfigs.delete(id);
      this.panelConfigKeys.delete(id);
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
    const target = activeId ? this.presets.get(panelId)?.find((preset) => preset.id === activeId)?.values : this.baseValues.get(panelId);
    for (const [path, value] of Object.entries(updates)) {
      if (!Object.prototype.hasOwnProperty.call(panel.values, path)) {
        continue;
      }
      const control = this.controlsByPanel.get(panel)?.get(path);
      if (control?.type === "action") {
        continue;
      }
      const next = control?.type === "pad" ? normalizePadValue(value, control.pad) : control?.type === "background" ? normalizeBackgroundValue(value, backgroundWriteBase(panel.values[path], control.background?.default)) : value;
      if (sameControlValue(panel.values[path], next, control) && (!target || sameControlValue(target[path], next, control))) continue;
      panel.values[path] = next;
      validUpdates[path] = next;
      if (control?.type === "transition") {
        const mode = transitionModeFor(next);
        if (mode) {
          panel.values[`${path}.__mode`] = mode;
          validUpdates[`${path}.__mode`] = mode;
        }
      }
    }
    if (Object.keys(validUpdates).length === 0) {
      return;
    }
    if (target) Object.assign(target, validUpdates);
    this.snapshots.set(panelId, { ...panel.values });
    this.persistPanel(panelId);
    this.notify(panelId);
    this.refilterVisibility(panelId);
  }
  resetValues(panelId) {
    const panel = this.panels.get(panelId);
    const defaults = this.defaultValues.get(panelId);
    if (!panel || !defaults) return;
    this.resetCount++;
    this.lastResetAt = performance.now();
    panel.values = { ...defaults };
    this.snapshots.set(panelId, { ...panel.values });
    this.baseValues.set(panelId, { ...defaults });
    this.activePreset.set(panelId, null);
    this.persistPanel(panelId);
    this.notify(panelId);
    this.refilterVisibility(panelId);
  }
  /**
   * The values a reset returns to, by path, when they are not the config's
   * defaults: for example when the host passes saved values as defaults, so
   * a panel opens on them, but a reset goes back to its own defaults. Each
   * call replaces the last. Once set, a reset and hasChanges use only these
   * paths: a path left out is one no reset returns to a default.
   */
  setResetValues(panelId, values) {
    const previous = this.hostResetValues.get(panelId);
    if (previous && sameRecord(previous, values)) return;
    this.hostResetValues.set(panelId, { ...values });
    this.notifyGlobal();
  }
  /** The value a reset puts at each path: setResetValues, else defaults. */
  resetTargets(panelId) {
    return this.hostResetValues.get(panelId) ?? this.defaultValues.get(panelId);
  }
  /**
   * Counts the resets so far (resetValues, resetPaths and so a section
   * reset). A value that changes in the same render as a new count came
   * from a reset, so a control can animate it; other outside changes, like
   * timeline playback, keep following the value at once.
   */
  getResetCount() {
    return this.resetCount;
  }
  /** When the last reset ran, in performance.now() time. */
  getLastResetAt() {
    return this.lastResetAt;
  }
  /** The value a reset puts at `path`. */
  getResetValue(panelId, path) {
    return this.resetTargets(panelId)?.[path];
  }
  /** Put the given paths back to their reset values. */
  resetPaths(panelId, paths) {
    const targets = this.resetTargets(panelId);
    if (!targets) return;
    this.resetCount++;
    this.lastResetAt = performance.now();
    const updates = {};
    for (const path of paths) {
      if (path in targets) updates[path] = targets[path];
    }
    this.updateValues(panelId, updates);
  }
  /**
   * Run a folder's section reset (see {@link ControlMeta.reset}): every
   * value inside goes back to its reset value. A folder with a reset action
   * runs the action first, so it can reset values its own way, for example
   * with an animation, and the values it did not reset follow. Nested
   * folders with their own reset go last, and find nothing left to change
   * where the action already reset them. Values inside a nested folder
   * without its own reset belong to the parent.
   */
  resetSection(panelId, path) {
    const panel = this.panels.get(panelId);
    const folder = panel ? this.controlsByPanel.get(panel)?.get(path) : void 0;
    if (folder?.type !== "folder" || !folder.reset) return;
    const own = [];
    const nested = [];
    const walk = (control) => {
      for (const child of control.children ?? []) {
        if (child.type === "folder") {
          if (child.reset) nested.push(child.path);
          else walk(child);
        } else if (child.type !== "action") {
          own.push(child.path);
        }
      }
    };
    walk(folder);
    if (folder.reset !== true) this.triggerAction(panelId, folder.reset);
    this.resetPaths(panelId, own);
    for (const child of nested) this.resetSection(panelId, child);
  }
  /**
   * True when a value the folder's section reset would return differs from
   * its reset value: every value inside, nested folders and hidden rows
   * included, the same values resetSection resets.
   */
  sectionHasChanges(panelId, path) {
    const panel = this.panels.get(panelId);
    const folder = panel ? this.controlsByPanel.get(panel)?.get(path) : void 0;
    if (!folder) return false;
    const paths = [];
    const walk = (control) => {
      for (const child of control.children ?? []) {
        if (child.type === "folder") walk(child);
        else if (child.type !== "action") paths.push(child.path);
      }
    };
    walk(folder);
    return this.hasChanges(panelId, paths);
  }
  /** True when a value at one of the paths differs from its reset value. */
  hasChanges(panelId, paths) {
    const panel = this.panels.get(panelId);
    const targets = this.resetTargets(panelId);
    if (!panel || !targets) return false;
    return paths.some((path) => path in targets && !sameValue(panel.values[path], targets[path]));
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
  getPanels(kind) {
    if (kind === "panel") return this.standardPanelsSnapshot;
    if (kind === "timeline") return this.timelinePanelsSnapshot;
    return this.panelsSnapshot;
  }
  getPanel(id) {
    return this.panels.get(id);
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
   * Saves the current values under the next free "<prefix> N" name. N is one
   * more than the highest number in use, so deleting a preset never lets two
   * share a name. The unsaved base counts as "<prefix> 1".
   */
  saveNewPreset(panelId, prefix = "Version") {
    const pattern = new RegExp(`^${prefix} (\\d+)$`);
    const highest = this.getPresets(panelId).reduce((max, preset) => {
      const match = pattern.exec(preset.name);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 1);
    return this.savePreset(panelId, `${prefix} ${highest + 1}`);
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
    this.activePreset.set(panelId, presetId);
    this.persistPanel(panelId);
    this.notify(panelId);
    this.refilterVisibility(panelId);
  }
  deletePreset(panelId, presetId) {
    const presets = this.presets.get(panelId) ?? [];
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
  renamePreset(panelId, presetId, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const presets = this.presets.get(panelId) ?? [];
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    this.presets.set(panelId, presets.map((p) => p.id === presetId ? { ...p, name: trimmed } : p));
    this.refreshPresetSnapshot(panelId);
  }
  setPresetLocked(panelId, presetId, locked) {
    const presets = this.presets.get(panelId) ?? [];
    const preset = presets.find((p) => p.id === presetId);
    if (!preset || !!preset.locked === locked) return;
    this.presets.set(panelId, presets.map((p) => p.id === presetId ? { ...p, locked } : p));
    this.refreshPresetSnapshot(panelId);
  }
  reorderPresets(panelId, orderedIds) {
    const presets = this.presets.get(panelId) ?? [];
    if (presets.length === 0) return;
    const byId = new Map(presets.map((p) => [p.id, p]));
    const ordered = [];
    for (const id of orderedIds) {
      const preset = byId.get(id);
      if (preset) {
        ordered.push(preset);
        byId.delete(id);
      }
    }
    for (const preset of presets) {
      if (byId.has(preset.id)) ordered.push(preset);
    }
    const unchanged = ordered.length === presets.length && ordered.every((p, i) => p.id === presets[i].id);
    if (unchanged) return;
    this.presets.set(panelId, ordered);
    this.refreshPresetSnapshot(panelId);
  }
  getPresets(panelId) {
    return this.presets.get(panelId) ?? [];
  }
  getActivePresetId(panelId) {
    return this.activePreset.get(panelId) ?? null;
  }
  isPresetsEditable(panelId) {
    return this.panels.get(panelId)?.presetsEditable ?? true;
  }
  isPresetsLockable(panelId) {
    return this.panels.get(panelId)?.presetsLockable ?? false;
  }
  clearActivePreset(panelId) {
    const panel = this.panels.get(panelId);
    const base = this.baseValues.get(panelId);
    if (panel && base) {
      panel.values = { ...base };
      this.snapshots.set(panelId, { ...panel.values });
    }
    this.activePreset.set(panelId, null);
    this.persistPanel(panelId);
    this.notify(panelId);
    if (panel && base) this.refilterVisibility(panelId);
  }
  /** Presets changed without a value change: bump the snapshot so subscribers re-render. */
  refreshPresetSnapshot(panelId) {
    const panel = this.panels.get(panelId);
    if (panel) {
      this.snapshots.set(panelId, { ...panel.values });
    }
    this.persistPanel(panelId);
    this.notify(panelId);
  }
  resolveShortcutTarget(key, modifier) {
    for (const panel of this.panels.values()) {
      for (const [path, shortcut] of Object.entries(panel.shortcuts)) {
        if (!shortcut.key) continue;
        if (shortcut.key.toLowerCase() !== key.toLowerCase()) continue;
        const scMod = shortcut.modifier ?? void 0;
        if (scMod !== modifier) continue;
        const control = this.controlsByPanel.get(panel)?.get(path);
        if (control) {
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
        if (control) {
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
      return {
        version: 1,
        values,
        baseValues: config.presets && isRecord2(parsed.baseValues) ? parsed.baseValues : values,
        presets,
        activePresetId: presets.some((preset) => preset.id === parsed.activePresetId) ? parsed.activePresetId : null
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
    const state2 = { version: 1, values };
    if (config.presets) {
      state2.baseValues = this.baseValues.get(id) ?? values;
      state2.presets = this.presets.get(id) ?? [];
      state2.activePresetId = this.activePreset.get(id) ?? null;
    }
    try {
      storage.setItem(config.key, JSON.stringify(state2));
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
  notify(panelId) {
    this.listeners.get(panelId)?.forEach((fn) => fn());
  }
  notifyGlobal() {
    this.panelsSnapshot = Array.from(this.panels.values());
    this.standardPanelsSnapshot = this.panelsSnapshot.filter((panel) => panel.kind !== "timeline");
    this.timelinePanelsSnapshot = this.panelsSnapshot.filter((panel) => panel.kind === "timeline");
    this.globalListeners.forEach((fn) => fn());
  }
  /**
   * Parse through the per-panel cache. The key is computed first and the
   * result is only stored after a successful parse, so an invalid config
   * still throws before any store mutation.
   */
  parseCached(id, config, shortcuts) {
    const key = JSON.stringify(config) + "\n" + JSON.stringify(shortcuts ?? {});
    let cache = this.parsedConfigs.get(id);
    const hit = cache?.get(key);
    if (cache && hit) {
      cache.delete(key);
      cache.set(key, hit);
      return { key, parsed: hit };
    }
    const parsed = this.parseConfig(config, shortcuts);
    if (!cache) {
      cache = /* @__PURE__ */ new Map();
      this.parsedConfigs.set(id, cache);
    }
    cache.set(key, parsed);
    if (cache.size > PARSED_CONFIG_CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      if (oldest !== void 0) cache.delete(oldest);
    }
    return { key, parsed };
  }
  /** Compile controls, defaults, and the lookup index in one walk. */
  parseConfig(config, shortcuts) {
    const defaultValues = {};
    const modes = {};
    const controlsByPath = /* @__PURE__ */ new Map();
    const visit = (config2, prefix) => {
      const controls2 = [];
      const hints = textMapOf(config2._hints);
      const labels = textMapOf(config2._labels);
      for (const [key, rawValue] of Object.entries(config2)) {
        if (isFolderMetaKey(key)) continue;
        const path = prefix ? `${prefix}.${key}` : key;
        const label = labels?.[key] ?? formatLabel(key);
        const shortcut = shortcuts?.[path];
        let control;
        const visibleWhen = isVisibilityWrapper(rawValue) ? rawValue.visibleWhen : void 0;
        const value = unwrapVisibility(rawValue);
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
          control = { type: "transition", path, label };
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
        } else if (isBackgroundConfigValue(value)) {
          control = { type: "background", path, label, background: { ...value, default: backgroundConfigDefault(value) } };
        } else if (typeof value === "string") {
          if (parseColor(value) && value !== "transparent") {
            control = { type: "color", path, label };
          } else {
            control = { type: "text", path, label };
          }
        } else if (typeof value === "object" && value !== null) {
          const folderConfig = value;
          const defaultOpen = "_collapsed" in folderConfig ? !folderConfig._collapsed : true;
          control = {
            type: "folder",
            path,
            label,
            defaultOpen,
            fields: fieldsConfigOf(folderConfig._fields),
            padGroup: padGroupConfigOf(folderConfig._pad),
            anchor: anchorConfigOf(folderConfig._anchor),
            reset: resetConfigOf(folderConfig._reset, path),
            children: visit(folderConfig, path)
          };
        }
        if (!control) continue;
        if (hints?.[key]) control.hint = hints[key];
        if (visibleWhen) tagVisibility(control, visibleWhen);
        controls2.push(control);
        controlsByPath.set(path, control);
        if (control.type === "folder") continue;
        defaultValues[path] = configDefaultValue(value);
        const mode = transitionModeFor(value);
        if (mode) modes[`${path}.__mode`] = mode;
      }
      return controls2;
    };
    const controls = visit(config, "");
    Object.assign(defaultValues, modes);
    return { controls, defaultValues, controlsByPath };
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
      case "background":
        return normalizeBackgroundValue(existingValue, control.background?.default);
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
        if (isSpringConfigValue(existingValue) || isEasingConfigValue(existingValue)) {
          return existingValue;
        }
        return defaultValue;
      case "action":
        return defaultValue;
      default:
        return defaultValue;
    }
  }
  // ─── Conditional visibility ──────────────────────────────────────
  /**
   * Rebuild the filtered control tree against the panel's current values.
   * When the set of visible paths changed, swap `panel.controls` and bump
   * the global listeners: `getPanels()` snapshots are cached by identity,
   * so a per-panel notify alone would leave DialRoot rendering the old tree.
   */
  refilterVisibility(panelId) {
    const panel = this.panels.get(panelId);
    const allControls = this.allControls.get(panelId);
    if (!panel || !allControls) return;
    const nextControls = filterByVisibility(allControls, panel.values);
    if (!sameControlPaths(panel.controls, nextControls)) {
      panel.controls = nextControls;
      this.notifyGlobal();
    }
  }
};
function tagVisibility(control, visibleWhen) {
  if (!control.visibleWhen) control.visibleWhen = visibleWhen;
  if (control.type === "folder" && control.children) {
    for (const child of control.children) tagVisibility(child, visibleWhen);
  }
}
function transitionModeFor(value) {
  if (isEasingConfigValue(value)) return "easing";
  if (isSpringConfigValue(value)) {
    const hasPhysics = value.stiffness !== void 0 || value.damping !== void 0 || value.mass !== void 0;
    const hasTime = value.visualDuration !== void 0 || value.bounce !== void 0;
    return hasPhysics && !hasTime ? "advanced" : "simple";
  }
  return null;
}
function isVisible(rule, values) {
  if (!rule) return true;
  const actual = values[rule.field];
  if (actual === void 0 && !(rule.field in values)) {
    console.warn(
      `[DialKit] visibleWhen references field "${rule.field}" which does not exist in the panel's values. The control will default to visible. Check for typos \u2014 field must be the full dot-delimited store path.`
    );
  }
  if (rule.is !== void 0) {
    const targets = Array.isArray(rule.is) ? rule.is : [rule.is];
    return targets.some((t) => t === actual);
  }
  if (rule.not !== void 0) {
    const targets = Array.isArray(rule.not) ? rule.not : [rule.not];
    return !targets.some((t) => t === actual);
  }
  return true;
}
function filterByVisibility(controls, values) {
  const result = [];
  for (const control of controls) {
    if (!isVisible(control.visibleWhen, values)) continue;
    if (control.type === "folder" && control.children) {
      const filteredChildren = filterByVisibility(control.children, values);
      if (filteredChildren.length === 0) continue;
      result.push({ ...control, children: filteredChildren });
    } else {
      result.push(control);
    }
  }
  return result;
}
function sameControlPaths(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ca = a[i];
    const cb = b[i];
    if (ca.path !== cb.path || ca.type !== cb.type) return false;
    if (ca.type === "folder" && !sameControlPaths(ca.children ?? [], cb.children ?? [])) return false;
  }
  return true;
}
var DialStore = /* @__PURE__ */ new DialStoreClass();

// src/vue/useDialKit.ts
var dialKitInstance = 0;
function useDialKit(name, config, options) {
  return useDialKitController(name, config, options).values;
}
function useDialKitController(name, config, options) {
  const hasStableId = options?.id !== void 0;
  const panelId = options?.id ?? `${name}-${++dialKitInstance}`;
  const flatValues = shallowRef(DialStore.getValues(panelId));
  let mounted = false;
  const serializedConfig = computed(() => JSON.stringify(config));
  const serializedShortcuts = computed(() => JSON.stringify(options?.shortcuts));
  const serializedPersist = computed(() => JSON.stringify(options?.persist));
  let unsubscribeValues;
  let unsubscribeActions;
  const register = () => {
    DialStore.registerPanel(panelId, name, config, options?.shortcuts, {
      retainOnUnmount: hasStableId,
      persist: options?.persist,
      defaultCollapsed: options?.defaultCollapsed
    });
    flatValues.value = DialStore.getValues(panelId);
    unsubscribeValues = DialStore.subscribe(panelId, () => {
      flatValues.value = DialStore.getValues(panelId);
    });
    unsubscribeActions = DialStore.subscribeActions(panelId, (action) => {
      options?.onAction?.(action);
    });
  };
  watch([serializedConfig, serializedShortcuts, serializedPersist], () => {
    if (mounted) {
      DialStore.updatePanel(panelId, name, config, options?.shortcuts, {
        retainOnUnmount: hasStableId,
        persist: options?.persist,
        defaultCollapsed: options?.defaultCollapsed
      });
      flatValues.value = DialStore.getValues(panelId);
    }
  });
  onMounted(() => {
    register();
    mounted = true;
  });
  onUnmounted(() => {
    mounted = false;
    unsubscribeValues?.();
    unsubscribeActions?.();
    DialStore.unregisterPanel(panelId);
  });
  const values = computed(() => resolveDialValues(config, flatValues.value));
  return {
    values,
    setOpen(open) {
      DialStore.setPanelOpen(panelId, open);
    },
    getOpen() {
      return DialStore.getPanelOpen(panelId);
    },
    setValue(path, value) {
      DialStore.updateValue(panelId, path, value);
    },
    setValues(nextValues) {
      DialStore.updateValues(panelId, flattenDialValueUpdates(config, nextValues));
    },
    resetValues() {
      DialStore.resetValues(panelId);
    },
    getValues() {
      return resolveDialValues(config, DialStore.getValues(panelId));
    }
  };
}

// src/vue/useDialTimeline.ts
import { computed as computed2, onMounted as onMounted2, onUnmounted as onUnmounted2, shallowRef as shallowRef2, watch as watch2 } from "vue";

// src/store/TimelineStore.ts
function loopSpan(duration, loopStart) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  if (!Number.isFinite(loopStart)) loopStart = 0;
  const start = Math.min(Math.max(0, loopStart), duration);
  return duration - start > 0 ? duration - start : duration;
}
function foldLoopTime(time, duration, loopStart = 0) {
  if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) {
    return { time: 0, wraps: 0 };
  }
  if (time < duration) return { time, wraps: 0 };
  const span = loopSpan(duration, loopStart);
  const base = duration - span;
  const over = time - base;
  return { time: base + over % span, wraps: Math.floor(over / span) };
}
var TIMELINE_CLIP_COLORS = [
  "#E8E8E8"
  // neutral white — slightly off-white so the pure-white selection ring still reads
];
var EMPTY_TRANSPORT = Object.freeze({ time: 0, playing: false, duration: 0, wraps: 0 });
var TimelineStoreClass = class {
  constructor() {
    this.timelines = /* @__PURE__ */ new Map();
    this.transports = /* @__PURE__ */ new Map();
    this.listeners = /* @__PURE__ */ new Map();
    this.globalListeners = /* @__PURE__ */ new Set();
    this.registrationCounts = /* @__PURE__ */ new Map();
    this.listCache = null;
    this.rafId = null;
    this.lastTick = 0;
    this.tick = (now) => {
      const dt = Math.max(0, (now - this.lastTick) / 1e3);
      this.lastTick = now;
      let anyPlaying = false;
      for (const [id, transport] of this.transports) {
        if (!transport.playing) continue;
        const meta = this.timelines.get(id);
        const duration = meta?.duration ?? transport.duration;
        if (!Number.isFinite(duration) || duration <= 0) {
          this.transports.set(id, { time: 0, playing: false, duration: 0, wraps: 0 });
          this.notify(id);
          continue;
        }
        let time = transport.time + dt;
        let playing = true;
        let wraps = transport.wraps;
        if (time >= duration) {
          if (meta?.loop) {
            const folded = foldLoopTime(time, duration, meta.loopStart);
            time = folded.time;
            wraps += folded.wraps;
          } else {
            time = duration;
            playing = false;
          }
        }
        this.transports.set(id, { time, playing, duration, wraps });
        if (playing) anyPlaying = true;
        this.notify(id);
      }
      this.rafId = anyPlaying ? window.requestAnimationFrame(this.tick) : null;
    };
  }
  register(meta, options) {
    const existing = this.timelines.get(meta.id);
    if (existing && existing.name !== meta.name) {
      console.warn(
        `[dialkit] Timeline id "${meta.id}" is already registered by "${existing.name}"; "${meta.name}" will share and overwrite that transport.`
      );
    }
    this.registrationCounts.set(meta.id, (this.registrationCounts.get(meta.id) ?? 0) + 1);
    this.applyMeta(meta, options.autoplay);
  }
  update(meta) {
    if (!this.timelines.has(meta.id)) return;
    this.applyMeta(meta, false);
  }
  unregister(id) {
    const nextCount = (this.registrationCounts.get(id) ?? 1) - 1;
    if (nextCount > 0) {
      this.registrationCounts.set(id, nextCount);
      return;
    }
    this.registrationCounts.delete(id);
    this.timelines.delete(id);
    this.transports.delete(id);
    if (this.listeners.get(id)?.size === 0) this.listeners.delete(id);
    this.listCache = null;
    this.notifyGlobal();
  }
  play(id) {
    const transport = this.transports.get(id);
    if (!transport || transport.duration <= 0 || transport.playing) return;
    const restart = transport.time >= transport.duration;
    this.transports.set(id, {
      ...transport,
      time: restart ? 0 : transport.time,
      wraps: restart ? 0 : transport.wraps,
      playing: true
    });
    this.notify(id);
    this.ensureLoop();
  }
  pause(id) {
    const transport = this.transports.get(id);
    if (!transport || !transport.playing) return;
    this.transports.set(id, { ...transport, playing: false });
    this.notify(id);
  }
  replay(id) {
    const transport = this.transports.get(id);
    if (!transport || transport.duration <= 0) return;
    this.transports.set(id, { ...transport, time: 0, wraps: 0, playing: true });
    this.notify(id);
    this.ensureLoop();
  }
  setLoop(id, loop) {
    const meta = this.timelines.get(id);
    if (!meta || meta.loop === loop) return;
    this.timelines.set(id, { ...meta, loop });
    this.listCache = null;
    this.notify(id);
    this.notifyGlobal();
  }
  /**
   * Name the clip the host is editing, or pass null to clear it. Store
   * state, not config state — `applyMeta` carries it across rebuilds.
   */
  setHighlight(id, clipKey) {
    const meta = this.timelines.get(id);
    if (!meta || (meta.highlightedClip ?? null) === clipKey) return;
    this.timelines.set(id, { ...meta, highlightedClip: clipKey });
    this.listCache = null;
    this.notify(id);
    this.notifyGlobal();
  }
  seek(id, time) {
    const transport = this.transports.get(id);
    if (!transport || !Number.isFinite(time)) return;
    const clamped = Math.min(transport.duration, Math.max(0, time));
    this.transports.set(id, { ...transport, time: clamped, wraps: 0 });
    this.notify(id);
  }
  getTransport(id) {
    return this.transports.get(id) ?? EMPTY_TRANSPORT;
  }
  getTimeline(id) {
    return this.timelines.get(id);
  }
  getTimelines() {
    if (!this.listCache) {
      this.listCache = Array.from(this.timelines.values());
    }
    return this.listCache;
  }
  subscribe(id, listener) {
    if (!this.listeners.has(id)) {
      this.listeners.set(id, /* @__PURE__ */ new Set());
    }
    this.listeners.get(id).add(listener);
    return () => {
      const listeners = this.listeners.get(id);
      listeners?.delete(listener);
      if (listeners?.size === 0 && !this.timelines.has(id)) {
        this.listeners.delete(id);
      }
    };
  }
  subscribeGlobal(listener) {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }
  applyMeta(meta, autoplay) {
    const duration = Number.isFinite(meta.duration) ? Math.max(0, meta.duration) : 0;
    const loopStart = Number.isFinite(meta.loopStart) ? Math.min(duration, Math.max(0, meta.loopStart)) : 0;
    const previous = this.timelines.get(meta.id);
    const highlightedClip = meta.highlightedClip !== void 0 ? meta.highlightedClip : previous?.highlightedClip ?? null;
    const safeMeta = { ...meta, duration, loopStart, highlightedClip };
    this.timelines.set(meta.id, safeMeta);
    const existing = this.transports.get(meta.id);
    if (existing) {
      this.transports.set(meta.id, {
        time: Math.min(existing.time, duration),
        playing: duration > 0 && existing.playing,
        duration,
        wraps: existing.wraps
      });
    } else {
      const playing = duration > 0 && autoplay;
      this.transports.set(meta.id, { time: 0, playing, duration, wraps: 0 });
      if (playing) this.ensureLoop();
    }
    this.listCache = null;
    this.notify(meta.id);
    this.notifyGlobal();
  }
  ensureLoop() {
    if (this.rafId !== null || typeof window === "undefined") return;
    this.lastTick = performance.now();
    this.rafId = window.requestAnimationFrame(this.tick);
  }
  notify(id) {
    this.listeners.get(id)?.forEach((fn) => fn());
  }
  notifyGlobal() {
    this.globalListeners.forEach((fn) => fn());
  }
};
var TimelineStore = /* @__PURE__ */ new TimelineStoreClass();

// src/transition-math.ts
function round22(value) {
  return Math.round(value * 100) / 100;
}
function clamp3(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function isTransitionConfig(value) {
  return isSpringConfigValue(value) || isEasingConfigValue(value);
}
function isPhysicsSpring(transition) {
  return transition.type === "spring" && (transition.stiffness !== void 0 || transition.damping !== void 0 || transition.mass !== void 0);
}
function springParams(spring) {
  if (isPhysicsSpring(spring)) {
    return { stiffness: spring.stiffness ?? 200, damping: spring.damping ?? 25, mass: spring.mass ?? 1 };
  }
  const visualDuration = Math.max(0.05, spring.visualDuration ?? 0.3);
  const bounce = spring.bounce ?? 0.3;
  const root = 2 * Math.PI / (visualDuration * 1.2);
  const stiffness = root * root;
  const damping = 2 * Math.min(1, Math.max(0.05, 1 - bounce)) * Math.sqrt(stiffness);
  return { stiffness, damping, mass: 1 };
}
function springProgress(t, { stiffness, damping, mass }) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 0.9999) {
    const wd2 = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd2 * t) + zeta * w0 / wd2 * Math.sin(wd2 * t));
  }
  if (zeta < 1.0001) {
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }
  const wd = w0 * Math.sqrt(zeta * zeta - 1);
  const r1 = -zeta * w0 + wd;
  const r2 = -zeta * w0 - wd;
  return 1 + (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r1 - r2);
}
function springSettleDuration(params) {
  const w0 = Math.sqrt(params.stiffness / params.mass);
  const zeta = params.damping / (2 * Math.sqrt(params.stiffness * params.mass));
  const decay = zeta >= 1 ? zeta * w0 - w0 * Math.sqrt(Math.max(0, zeta * zeta - 1)) : zeta * w0;
  const duration = Math.log(200) / Math.max(decay, 1e-6);
  return round22(clamp3(duration, 0.05, 10));
}
function cubicBezierProgress(p, [x1, y1, x2, y2]) {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const sampleX = (t2) => bezierAxis(t2, x1, x2);
  const sampleY = (t2) => bezierAxis(t2, y1, y2);
  let t = p;
  for (let i = 0; i < 8; i++) {
    const x = sampleX(t) - p;
    if (Math.abs(x) < 1e-5) return sampleY(t);
    const dx = bezierAxisDerivative(t, x1, x2);
    if (Math.abs(dx) < 1e-6) break;
    t -= x / dx;
  }
  let lo = 0;
  let hi = 1;
  t = p;
  while (hi - lo > 1e-5) {
    if (sampleX(t) < p) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return sampleY(t);
}
function bezierAxis(t, a1, a2) {
  return (1 - 3 * a2 + 3 * a1) * t * t * t + (3 * a2 - 6 * a1) * t * t + 3 * a1 * t;
}
function bezierAxisDerivative(t, a1, a2) {
  return 3 * (1 - 3 * a2 + 3 * a1) * t * t + 2 * (3 * a2 - 6 * a1) * t + 3 * a1;
}
function resolveClipTransition(raw, clipDuration) {
  const safeDuration = Math.max(0.05, clipDuration);
  if (raw.type === "easing") {
    return {
      transition: { ...raw, duration: safeDuration },
      duration: safeDuration,
      isPhysics: false
    };
  }
  if (isPhysicsSpring(raw)) {
    return {
      transition: raw,
      // An explicit stored duration wins — a host may deliberately reserve
      // a bar LONGER than the spring's motion (e.g. covering a staggered
      // wave's spread plus each particle's settle, so the bar's end means
      // "everything at rest"). The spring's own settle time is only the
      // default when no real duration was stored.
      duration: clipDuration > 0 ? safeDuration : springSettleDuration(springParams(raw)),
      isPhysics: true
    };
  }
  return {
    transition: { type: "spring", bounce: raw.bounce ?? 0.2, visualDuration: safeDuration },
    duration: safeDuration,
    isPhysics: false
  };
}

// src/timeline-core.ts
var CLIP_VALUE_STEP = 0.01;
var TIMELINE_MIN_CLIP_DURATION = 0.05;
var DEFAULT_STEP_DURATION = 0.3;
var DEFAULT_CLIP_TRANSITION = { type: "spring", bounce: 0.2 };
var RESERVED_KEYS = /* @__PURE__ */ new Set(["time", "playing", "duration", "play", "pause", "replay", "seek"]);
function isClipConfig(value) {
  return isPlainObject(value) && Number.isFinite(value.at);
}
function isGroupConfig(value) {
  if (!isPlainObject(value) || "at" in value) return false;
  const entries = Object.values(value);
  return entries.length > 0 && entries.some(isClipConfig);
}
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonNegativeFinite(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallback;
}
function animatedDuration(value, fallback = DEFAULT_STEP_DURATION) {
  return Math.max(TIMELINE_MIN_CLIP_DURATION, nonNegativeFinite(value, fallback));
}
function transitionDefaultDuration(transition) {
  if (transition.type === "easing") return animatedDuration(transition.duration);
  if (isPhysicsSpring(transition)) {
    return animatedDuration(springSettleDuration(springParams(transition)));
  }
  if (transition.visualDuration !== void 0) return animatedDuration(transition.visualDuration);
  return animatedDuration(springSettleDuration(springParams(transition)));
}
function defaultStepDuration(step, inheritedTransition) {
  if (step.duration !== void 0) return animatedDuration(step.duration);
  const curve = step.transition ?? inheritedTransition;
  if (curve && isPhysicsSpring(curve)) return transitionDefaultDuration(curve);
  if (step.transition) return transitionDefaultDuration(step.transition);
  return DEFAULT_STEP_DURATION;
}
function defaultTrackDuration(track, inheritedTransition) {
  const curve = track.transition ?? inheritedTransition;
  if (track.steps?.length) {
    return track.steps.reduce((sum, step) => sum + defaultStepDuration(step, curve), 0);
  }
  if (track.duration !== void 0) return animatedDuration(track.duration);
  if (curve && isPhysicsSpring(curve)) return transitionDefaultDuration(curve);
  if (track.transition) return transitionDefaultDuration(track.transition);
  return DEFAULT_STEP_DURATION;
}
function defaultClipDuration(clip) {
  const defaultCurve = isTransitionConfig(clip.transition) ? clip.transition : DEFAULT_CLIP_TRANSITION;
  if (clip.props) {
    return Object.values(clip.props).reduce(
      (max, track) => Math.max(
        max,
        nonNegativeFinite(track.delay) + defaultTrackDuration(track, defaultCurve)
      ),
      0
    );
  }
  if (clip.steps?.length) {
    return clip.steps.reduce((sum, step) => sum + defaultStepDuration(step, defaultCurve), 0);
  }
  const animating = Boolean(clip.transition || clip.from || clip.to);
  if (!animating) return nonNegativeFinite(clip.duration);
  if (clip.duration !== void 0) return animatedDuration(clip.duration);
  if (isPhysicsSpring(defaultCurve)) return transitionDefaultDuration(defaultCurve);
  if (isTransitionConfig(clip.transition)) return transitionDefaultDuration(clip.transition);
  return clip.from || clip.to ? transitionDefaultDuration(DEFAULT_CLIP_TRANSITION) : 0;
}
function parseClipSegments(value) {
  if (!isPlainObject(value)) return void 0;
  const segIn = nonNegativeFinite(value.in);
  const segOut = nonNegativeFinite(value.out);
  return segIn + segOut > 0 ? { in: segIn, out: segOut } : void 0;
}
function clipBarDuration(clip) {
  const base = defaultClipDuration(clip);
  const segments = parseClipSegments(clip.segments);
  return segments ? Math.max(base, segments.in + segments.out) : base;
}
function nonEmptyString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function normalizeLoopMode(value) {
  if (value === true || value === "mirror" || value === "repeat") return "repeat";
  return "off";
}
function normalizeStoredTransition(transition, clipDuration) {
  if (transition.type === "easing") {
    return { ...transition, duration: clipDuration };
  }
  if (isPhysicsSpring(transition)) {
    return transition;
  }
  return { type: "spring", bounce: transition.bounce ?? 0.2 };
}
function collectClipEntries(config) {
  const entries = [];
  for (const [key, value] of Object.entries(config)) {
    if (key === "duration") continue;
    if (RESERVED_KEYS.has(key)) {
      console.warn(`[dialkit] Timeline key "${key}" collides with a reserved key and was skipped.`);
      continue;
    }
    if (isClipConfig(value)) {
      entries.push({ path: key, childKey: key, clip: value });
    } else if (isGroupConfig(value)) {
      for (const [childKey, childClip] of Object.entries(value)) {
        if (isClipConfig(childClip)) {
          entries.push({ path: `${key}.${childKey}`, childKey, group: key, clip: childClip });
        } else {
          console.warn(
            `[dialkit] Timeline clip "${key}.${childKey}" is missing a numeric "at" and was skipped.`
          );
        }
      }
    } else {
      console.warn(
        `[dialkit] Timeline entry "${key}" is neither a clip (needs a numeric "at") nor a group of clips and was skipped.`
      );
    }
  }
  return entries;
}
function definedValues(values) {
  if (!values) return void 0;
  const result = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== void 0) result[key] = value;
  }
  return result;
}
function setDialPath(dialConfig, path, value) {
  const segments = path.split(".");
  let node = dialConfig;
  for (const segment of segments.slice(0, -1)) {
    node = node[segment] ?? (node[segment] = {});
  }
  node[segments[segments.length - 1]] = value;
}
function parseTimelineConfig(config) {
  const entries = collectClipEntries(config);
  let maxEnd = 0;
  for (const { clip } of entries) {
    maxEnd = Math.max(
      maxEnd,
      nonNegativeFinite(clip.at) + clipBarDuration(clip) + nonNegativeFinite(clip.tail)
    );
  }
  const duration = typeof config.duration === "number" && Number.isFinite(config.duration) && config.duration > 0 ? config.duration : maxEnd > 0 ? Math.ceil(maxEnd * 100 - 1e-4) / 100 : 1;
  const dialConfig = {};
  const clips = [];
  entries.forEach(({ path, childKey, group, clip }, index) => {
    const raw = clip;
    if (raw.props && (raw.steps?.length || raw.from || raw.to)) {
      console.warn(
        `[dialkit] Timeline clip "${path}": "props" is mutually exclusive with from/to/steps \u2014 using "props".`
      );
    } else if (raw.steps?.length && raw.to) {
      console.warn(
        `[dialkit] Timeline clip "${path}": "to" is ignored when "steps" is present \u2014 each leg's "to" defines its targets.`
      );
    }
    const hasSteps = Boolean(clip.steps?.length) && !clip.props;
    const hasProps = Boolean(clip.props);
    const single = isTransitionConfig(clip.transition) ? clip.transition : void 0;
    const total = clipBarDuration(clip);
    const defaultCurve = single ?? DEFAULT_CLIP_TRANSITION;
    const clipAt = nonNegativeFinite(clip.at);
    const clipDial = {
      at: [clipAt, 0, duration, CLIP_VALUE_STEP]
    };
    if (clip.hints) clipDial._hints = { ...clip.hints };
    if (!hasSteps && !hasProps) {
      clipDial.duration = [total, 0, duration, CLIP_VALUE_STEP];
    }
    if (!hasSteps && !hasProps && (clip.transition || clip.from || clip.to)) {
      clipDial.transition = normalizeStoredTransition(defaultCurve, total);
    }
    let tracks;
    if (clip.props) {
      tracks = [];
      for (const [prop, track] of Object.entries(clip.props)) {
        if (TRACK_RESERVED.has(prop) || /^step\d+$/.test(prop)) {
          console.warn(`[dialkit] Timeline property "${prop}" collides with a clip field and was skipped.`);
          continue;
        }
        const trackDuration = defaultTrackDuration(track, defaultCurve);
        const trackCurve = track.transition ?? defaultCurve;
        const hasTrackSteps = Boolean(track.steps?.length);
        const trackDial = {
          delay: [nonNegativeFinite(track.delay), 0, duration, CLIP_VALUE_STEP]
        };
        if (!hasTrackSteps) {
          trackDial.duration = [trackDuration, 0, duration, CLIP_VALUE_STEP];
          trackDial.transition = normalizeStoredTransition(trackCurve, trackDuration);
        }
        const fromValue = track.from ?? (hasTrackSteps ? void 0 : track.to);
        if (hasTrackSteps && fromValue === void 0) {
          console.warn(
            `[dialkit] Timeline clip "${path}": track "${prop}" has steps but no "from" \u2014 declare its starting value.`
          );
        }
        if (fromValue !== void 0) {
          trackDial.from = scalarDial(prop, fromValue, hasTrackSteps ? track.steps[0]?.to : track.to);
        }
        if (!hasTrackSteps && track.to !== void 0) {
          trackDial.to = scalarDial(prop, track.to, fromValue);
        }
        let trackStepKeys;
        if (hasTrackSteps) {
          trackStepKeys = [];
          let previous = fromValue;
          track.steps.forEach((step, stepIndex) => {
            const stepKey = `step${stepIndex + 1}`;
            trackStepKeys.push(stepKey);
            const stepDuration = defaultStepDuration(step, trackCurve);
            const stepDial = {
              duration: [stepDuration, 0, duration, CLIP_VALUE_STEP],
              transition: normalizeStoredTransition(step.transition ?? trackCurve, stepDuration)
            };
            if (step.to !== void 0) {
              stepDial.to = scalarDial(prop, step.to, previous);
              previous = step.to;
            }
            trackDial[stepKey] = stepDial;
          });
        }
        clipDial[prop] = trackDial;
        tracks.push({ prop, stepKeys: trackStepKeys });
      }
    }
    if (clip.from && !hasProps) {
      clipDial.from = withFromToRanges(
        clip.from,
        hasSteps ? definedValues(clip.steps[0]?.to) : clip.to
      );
    }
    if (!hasSteps && !hasProps && clip.to) {
      clipDial.to = withFromToRanges(clip.to, clip.from);
    }
    let stepKeys;
    if (hasSteps) {
      stepKeys = [];
      let running = clip.from;
      clip.steps.forEach((step, stepIndex) => {
        const stepKey = `step${stepIndex + 1}`;
        stepKeys.push(stepKey);
        const stepDuration = defaultStepDuration(step, defaultCurve);
        const stepDial = {
          duration: [stepDuration, 0, duration, CLIP_VALUE_STEP],
          transition: normalizeStoredTransition(step.transition ?? defaultCurve, stepDuration)
        };
        const stepTo = definedValues(step.to);
        if (stepTo) {
          for (const prop of Object.keys(stepTo)) {
            if (!running || !(prop in running)) {
              console.warn(
                `[dialkit] Timeline clip "${path}": property "${prop}" first animates in step ${stepIndex + 1} with no starting value \u2014 declare it in "from".`
              );
            }
          }
          stepDial.to = withFromToRanges(stepTo, running);
        }
        clipDial[stepKey] = stepDial;
        running = { ...running ?? {}, ...stepTo ?? {} };
      });
    }
    setDialPath(dialConfig, path, clipDial);
    const lane = nonEmptyString(raw.lane);
    const laneLabel = nonEmptyString(raw.laneLabel);
    const segments = parseClipSegments(raw.segments);
    clips.push({
      key: path,
      label: typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : formatLabel(childKey),
      color: TIMELINE_CLIP_COLORS[index % TIMELINE_CLIP_COLORS.length],
      loop: normalizeLoopMode(clip.loop),
      group,
      stepKeys,
      tracks,
      ...nonNegativeFinite(clip.tail) > 0 ? { tail: nonNegativeFinite(clip.tail) } : {},
      ...lane ? { lane } : {},
      ...lane && laneLabel ? { laneLabel } : {},
      ...segments ? { segments } : {},
      ...nonEmptyString(raw.hint) ? { hint: nonEmptyString(raw.hint) } : {}
    });
  });
  return { duration, dialConfig, clips };
}
var TRACK_RESERVED = /* @__PURE__ */ new Set(["at", "duration", "loop", "label", "from", "to", "transition", "delay"]);
function scalarDial(prop, value, counterpart) {
  const record = withFromToRanges(
    { [prop]: value },
    counterpart === void 0 ? void 0 : { [prop]: counterpart }
  );
  return record[prop];
}
var FROM_TO_RANGE_PRESETS = [
  [/^(x|y|z|tx|ty|offsetx|offsety|translatex|translatey)$/i, { min: -100, max: 100, step: 1 }],
  [/rotat|angle|skew/i, { min: -180, max: 180, step: 1 }],
  [/^scale/i, { min: 0, max: 2, step: 0.01 }],
  [/opacity|alpha/i, { min: 0, max: 1, step: 0.01 }],
  [/blur|radius|spread/i, { min: 0, max: 100, step: 1 }]
];
function inferFromToRange(key, value, counterpart) {
  const lo = Math.min(value, counterpart ?? value);
  const hi = Math.max(value, counterpart ?? value);
  const preset = FROM_TO_RANGE_PRESETS.find(([pattern]) => pattern.test(key))?.[1];
  if (preset) {
    return [value, Math.min(preset.min, lo), Math.max(preset.max, hi), preset.step];
  }
  if (lo >= 0 && hi <= 1) {
    return [value, 0, 1, 0.01];
  }
  const extent = Math.max(Math.abs(lo), Math.abs(hi), 1);
  const min = lo < 0 ? -extent * 2 : 0;
  const max = Math.max(extent * 2, hi);
  return [value, min, max, inferStep(min, max)];
}
function withFromToRanges(config, counterpart) {
  const result = {};
  for (const [key, value] of Object.entries(config)) {
    const other = counterpart?.[key];
    if (typeof value === "number") {
      result[key] = inferFromToRange(key, value, typeof other === "number" ? other : void 0);
    } else if (isPlainObject(value) && !("type" in value)) {
      result[key] = withFromToRanges(
        value,
        isPlainObject(other) && !("type" in other) ? other : void 0
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}
function curveStatic(transition, duration) {
  if (!transition) return { duration };
  if (transition.type === "easing") return { duration, ease: transition.ease };
  const spring = springParams(transition);
  return { duration, spring, settle: springSettleDuration(spring) };
}
function sampleCurve(curve, elapsed) {
  if (elapsed <= 0) return 0;
  if (curve.spring) {
    if (curve.settle !== void 0 && elapsed >= curve.settle) return 1;
    return springProgress(elapsed, curve.spring);
  }
  if (curve.ease) {
    return cubicBezierProgress(clamp3(curve.duration > 0 ? elapsed / curve.duration : 1, 0, 1), curve.ease);
  }
  return curve.duration > 0 ? Math.min(1, elapsed / curve.duration) : 1;
}
function resolvedAtPath(resolved, path) {
  let node = resolved;
  for (const segment of path.split(".")) {
    node = isPlainObject(node) ? node[segment] : void 0;
  }
  return isPlainObject(node) ? node : {};
}
function computeStaticClips(parsed, flatValues) {
  const resolved = resolveDialValues(parsed.dialConfig, flatValues);
  return parsed.clips.map(
    (clip) => buildClipStatic(resolvedAtPath(resolved, clip.key), clip, parsed.duration)
  );
}
function computeStaticTimeline(parsed, flatValues) {
  let clips = computeStaticClips(parsed, flatValues);
  const tailByKey = new Map(parsed.clips.map((clip) => [clip.key, clip.tail ?? 0]));
  const maxEnd = clips.reduce(
    (end, clip) => Math.max(end, clip.at + clip.duration + (tailByKey.get(clip.key) ?? 0)),
    parsed.duration
  );
  const duration = maxEnd > parsed.duration ? Math.ceil(maxEnd * 100 - 1e-4) / 100 : parsed.duration;
  if (duration !== parsed.duration) {
    clips = clips.map(
      (clip) => clip.loop === "repeat" ? { ...clip, end: duration } : clip
    );
  }
  return { duration, clips };
}
function computeClipStaticFromValues(values, clip, timelineDuration) {
  return buildClipStatic(unflattenClipValues(values, clip.key), clip, timelineDuration);
}
function buildClipStatic(clipResolved, clip, timelineDuration) {
  {
    const at = typeof clipResolved.at === "number" ? clipResolved.at : 0;
    const from = isPlainObject(clipResolved.from) ? clipResolved.from : void 0;
    const single = isTransitionConfig(clipResolved.transition) ? clipResolved.transition : void 0;
    const staticClip = {
      key: clip.key,
      childKey: clip.group ? clip.key.slice(clip.group.length + 1) : clip.key,
      group: clip.group,
      at,
      duration: 0,
      loop: "off",
      end: 0,
      isPhysics: false,
      from,
      tracks: [],
      explicitSteps: Boolean(clip.stepKeys?.length)
    };
    if (clip.tracks?.length) {
      const tracks = clip.tracks.map(({ prop, stepKeys }) => {
        const trackResolved = isPlainObject(clipResolved[prop]) ? clipResolved[prop] : {};
        const delay = typeof trackResolved.delay === "number" ? trackResolved.delay : 0;
        const fromValue = trackResolved.from;
        let steps;
        let trackDuration = 0;
        if (stepKeys?.length) {
          let running = fromValue;
          steps = stepKeys.map((stepKey) => {
            const stepResolved = isPlainObject(trackResolved[stepKey]) ? trackResolved[stepKey] : {};
            const storedDuration = typeof stepResolved.duration === "number" ? stepResolved.duration : 0;
            const raw = isTransitionConfig(stepResolved.transition) ? stepResolved.transition : void 0;
            const effective = raw ? resolveClipTransition(raw, storedDuration) : { transition: void 0, duration: storedDuration, isPhysics: false };
            const toValue = stepResolved.to;
            const step = {
              key: stepKey,
              offset: trackDuration,
              duration: effective.duration,
              isPhysics: effective.isPhysics,
              start: running === void 0 ? {} : { [prop]: running },
              to: toValue === void 0 ? {} : { [prop]: toValue },
              curve: curveStatic(effective.transition, effective.duration)
            };
            if (toValue !== void 0) running = toValue;
            trackDuration += effective.duration;
            return step;
          });
        } else {
          const storedDuration = typeof trackResolved.duration === "number" ? trackResolved.duration : 0;
          const raw = isTransitionConfig(trackResolved.transition) ? trackResolved.transition : void 0;
          const effective = raw ? resolveClipTransition(raw, storedDuration) : { transition: void 0, duration: storedDuration, isPhysics: false };
          const toValue = trackResolved.to;
          trackDuration = effective.duration;
          steps = [
            {
              key: null,
              offset: 0,
              duration: effective.duration,
              isPhysics: effective.isPhysics,
              start: fromValue === void 0 ? {} : { [prop]: fromValue },
              to: toValue === void 0 ? {} : { [prop]: toValue },
              curve: curveStatic(effective.transition, effective.duration)
            }
          ];
        }
        return { prop, delay, duration: trackDuration, steps };
      });
      staticClip.tracks = tracks;
      staticClip.props = tracks.map((track) => track.prop);
      staticClip.duration = tracks.reduce((max, track) => Math.max(max, track.delay + track.duration), 0);
      staticClip.from = Object.fromEntries(
        tracks.map((track) => [track.prop, track.steps[0].start[track.prop]])
      );
      staticClip.to = Object.fromEntries(
        tracks.map((track) => {
          const last = track.steps[track.steps.length - 1];
          return [track.prop, last.to[track.prop] ?? last.start[track.prop]];
        })
      );
      staticClip.loop = staticClip.duration > 0 ? clip.loop : "off";
      staticClip.end = staticClip.loop === "off" ? staticClip.at + staticClip.duration : timelineDuration;
      return staticClip;
    }
    if (clip.stepKeys?.length) {
      let running = { ...from ?? {} };
      let offset = 0;
      const steps = clip.stepKeys.map((stepKey) => {
        const stepResolved = isPlainObject(clipResolved[stepKey]) ? clipResolved[stepKey] : {};
        const storedDuration = typeof stepResolved.duration === "number" ? stepResolved.duration : 0;
        const raw = isTransitionConfig(stepResolved.transition) ? stepResolved.transition : void 0;
        const effective = raw ? resolveClipTransition(raw, storedDuration) : { transition: void 0, duration: storedDuration, isPhysics: false };
        const to = isPlainObject(stepResolved.to) ? stepResolved.to : {};
        const step = {
          key: stepKey,
          offset,
          duration: effective.duration,
          isPhysics: effective.isPhysics,
          start: running,
          to,
          curve: curveStatic(effective.transition, effective.duration)
        };
        running = { ...running, ...to };
        offset += effective.duration;
        return step;
      });
      staticClip.tracks = [{ delay: 0, duration: offset, steps }];
      staticClip.duration = offset;
      staticClip.to = running;
    } else {
      const storedDuration = typeof clipResolved.duration === "number" ? clipResolved.duration : 0;
      const to = isPlainObject(clipResolved.to) ? clipResolved.to : void 0;
      if (single) {
        const effective = resolveClipTransition(single, storedDuration);
        staticClip.duration = effective.duration;
        staticClip.isPhysics = effective.isPhysics;
        staticClip.transition = effective.transition;
        staticClip.css = transitionToCss(effective.transition);
        staticClip.to = to;
        if (from && to) {
          staticClip.tracks = [
            {
              delay: 0,
              duration: effective.duration,
              steps: [
                {
                  key: null,
                  offset: 0,
                  duration: effective.duration,
                  isPhysics: effective.isPhysics,
                  start: from,
                  to,
                  curve: curveStatic(effective.transition, effective.duration)
                }
              ]
            }
          ];
        }
      } else {
        staticClip.duration = storedDuration;
        staticClip.to = to;
        if (from && to) {
          const base = resolveClipTransition(DEFAULT_CLIP_TRANSITION, storedDuration);
          staticClip.duration = base.duration;
          staticClip.tracks = [
            {
              delay: 0,
              duration: base.duration,
              steps: [
                {
                  key: null,
                  offset: 0,
                  duration: base.duration,
                  isPhysics: false,
                  start: from,
                  to,
                  curve: curveStatic(base.transition, base.duration)
                }
              ]
            }
          ];
        }
      }
    }
    if (staticClip.tracks.length) {
      const props = new Set(Object.keys(from ?? {}));
      for (const track of staticClip.tracks) {
        for (const step of track.steps) {
          for (const prop of Object.keys(step.to)) props.add(prop);
        }
      }
      staticClip.props = Array.from(props);
    }
    staticClip.loop = staticClip.duration > 0 ? clip.loop : "off";
    staticClip.end = staticClip.loop === "off" ? staticClip.at + staticClip.duration : timelineDuration;
    return staticClip;
  }
}
function stepAtPosition(steps, pos) {
  for (const step of steps) {
    if (pos < step.offset + step.duration) return step;
  }
  return steps[steps.length - 1];
}
function evalPropAtPos(steps, prop, pos) {
  const step = stepAtPosition(steps, pos);
  const within = Math.max(0, pos - step.offset);
  if (prop in step.to) {
    const eased = sampleCurve(step.curve, within);
    return interpolateResolved(step.start[prop], step.to[prop], eased);
  }
  return step.start[prop];
}
function computeClipState(clip, time, cycleTime = time) {
  const total = clip.duration;
  const looping = clip.loop === "repeat" && total > 0;
  const started = time >= clip.at || looping && cycleTime > time;
  const done = time >= clip.end;
  const elapsed = time - clip.at;
  const phaseElapsed = looping ? cycleTime - clip.at : elapsed;
  const fold = (e) => looping ? e % total : e;
  const basePos = started ? fold(Math.max(0, phaseElapsed)) : 0;
  const progress = total > 0 ? clamp3(basePos / total, 0, 1) : started ? 1 : 0;
  let current;
  let stepIndex = 0;
  if (clip.tracks.length && clip.props?.length) {
    current = {};
    for (const track of clip.tracks) {
      const props = track.prop !== void 0 ? [track.prop] : clip.props;
      for (const prop of props) {
        const startValue = track.steps[0]?.start[prop];
        if (!started) {
          if (startValue !== void 0) current[prop] = startValue;
          continue;
        }
        const phase = phaseElapsed - track.delay;
        if (phase <= 0) {
          if (startValue !== void 0) current[prop] = startValue;
          continue;
        }
        const pos = looping && track.duration > 0 ? phase % track.duration : phase;
        const value = evalPropAtPos(track.steps, prop, pos);
        if (value !== void 0) current[prop] = value;
      }
    }
    const shared = clip.tracks[0];
    if (started && clip.explicitSteps && shared.prop === void 0) {
      stepIndex = shared.steps.indexOf(stepAtPosition(shared.steps, basePos));
    }
  }
  return {
    at: clip.at,
    duration: clip.duration,
    loop: clip.loop,
    started,
    active: started && !done,
    done,
    progress,
    step: clip.explicitSteps ? stepIndex : void 0,
    from: clip.from,
    to: clip.to,
    animate: started ? clip.to : clip.from,
    transition: clip.transition,
    css: clip.css,
    current
  };
}
function interpolateResolved(from, to, p) {
  if (typeof from === "number" && typeof to === "number") {
    return from + (to - from) * p;
  }
  if (typeof from === "string" && typeof to === "string") {
    const mixed = mixHexColors(from, to, p);
    if (mixed) return mixed;
  }
  if (isPlainObject(from) && isPlainObject(to)) {
    const result = {};
    for (const key of Object.keys(from)) {
      result[key] = key in to ? interpolateResolved(from[key], to[key], p) : from[key];
    }
    for (const key of Object.keys(to)) {
      if (!(key in from)) result[key] = to[key];
    }
    return result;
  }
  return p < 0.5 ? from : to;
}
function parseHex(hex) {
  if (!isHexColor(hex)) return null;
  let h25 = hex.slice(1);
  if (h25.length === 3) h25 = h25.split("").map((c) => c + c).join("");
  return [
    parseInt(h25.slice(0, 2), 16),
    parseInt(h25.slice(2, 4), 16),
    parseInt(h25.slice(4, 6), 16),
    h25.length === 8 ? parseInt(h25.slice(6, 8), 16) : 255
  ];
}
function mixHexColors(a, b, p) {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return null;
  const t = clamp3(p, 0, 1);
  const mixed = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  const hex = (n) => n.toString(16).padStart(2, "0");
  const rgb = `#${hex(mixed[0])}${hex(mixed[1])}${hex(mixed[2])}`;
  return mixed[3] === 255 ? rgb : `${rgb}${hex(mixed[3])}`;
}
function transitionToCss(transition) {
  if (!transition) return void 0;
  if (transition.type === "easing") {
    return {
      transitionDuration: `${round22(transition.duration)}s`,
      transitionTimingFunction: `cubic-bezier(${transition.ease.map((v) => round22(v)).join(", ")})`
    };
  }
  const params = springParams(transition);
  const dampingRatio = params.damping / (2 * Math.sqrt(params.stiffness * params.mass));
  const duration = transition.visualDuration ?? springSettleDuration(params);
  const bounce = transition.bounce ?? Math.max(0, round22(1 - dampingRatio));
  return {
    transitionDuration: `${round22(duration)}s`,
    transitionTimingFunction: bounce > 0.05 ? `cubic-bezier(0.34, ${round22(1.2 + bounce)}, 0.64, 1)` : "cubic-bezier(0.25, 0.6, 0.35, 1)"
  };
}
function timelinePopoverDisplayValues(values, clipKey, stepKeys, stepKey) {
  const display = { ...values };
  const swap = (path, duration) => {
    const raw = display[path];
    if (isTransitionConfig(raw)) display[path] = resolveClipTransition(raw, duration).transition;
  };
  if (stepKey) {
    swap(`${clipKey}.${stepKey}.transition`, numberValue(values[`${clipKey}.${stepKey}.duration`]));
    return display;
  }
  const cycle = stepKeys?.length ? stepKeys.reduce((sum, sk) => sum + numberValue(values[`${clipKey}.${sk}.duration`]), 0) : numberValue(values[`${clipKey}.duration`]);
  swap(`${clipKey}.transition`, cycle);
  return display;
}
function numberValue(value) {
  return typeof value === "number" ? value : 0;
}
function unflattenClipValues(values, clipKey) {
  const prefix = `${clipKey}.`;
  const result = {};
  const entries = Object.entries(values).filter(([path]) => path.startsWith(prefix)).map(([path, value]) => ({ segments: path.slice(prefix.length).split("."), value })).sort((a, b) => a.segments.length - b.segments.length);
  for (const { segments, value } of entries) {
    let node = result;
    for (let i = 0; i < segments.length - 1; i++) {
      const existing = node[segments[i]];
      node = isPlainObject(existing) ? existing : node[segments[i]] = {};
    }
    node[segments[segments.length - 1]] = cloneTimelineValue(value);
  }
  return result;
}
function cloneTimelineValue(value) {
  if (Array.isArray(value)) return value.map(cloneTimelineValue);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, cloneTimelineValue(nested)])
  );
}
function clampTrackDelay(delay, at, trackDuration, timelineDuration) {
  return clamp3(round22(delay), 0, Math.max(0, round22(timelineDuration - at - trackDuration)));
}
function clampClipMove(at, duration, timelineDuration) {
  return clamp3(round22(at), 0, Math.max(0, timelineDuration - duration));
}
function clampClipResizeEnd(duration, at, timelineDuration) {
  return clamp3(round22(duration), TIMELINE_MIN_CLIP_DURATION, timelineDuration - at);
}
function clampClipResizeStart(newAt, at, duration) {
  const clampedAt = clamp3(round22(newAt), 0, at + duration - TIMELINE_MIN_CLIP_DURATION);
  return { at: clampedAt, duration: round22(at + duration - clampedAt) };
}
function clampStepResize(duration, at, otherStepsTotal, timelineDuration) {
  const max = Math.max(TIMELINE_MIN_CLIP_DURATION, timelineDuration - at - otherStepsTotal);
  return clamp3(round22(duration), TIMELINE_MIN_CLIP_DURATION, max);
}
function normalizeTimelineValuesForCopy(values, clips) {
  const normalized = { ...values };
  for (const path of Object.keys(normalized)) {
    if (path.endsWith(".__mode")) delete normalized[path];
  }
  const normalizeTransitionAt = (transitionPath, durationPath) => {
    const raw = normalized[transitionPath];
    if (!isTransitionConfig(raw)) return;
    if (isPhysicsSpring(raw)) {
      normalized[durationPath] = transitionDefaultDuration(raw);
    }
    normalized[transitionPath] = normalizeStoredTransition(
      raw,
      numberValue(normalized[durationPath])
    );
  };
  for (const clip of clips) {
    for (const stepKey of clip.stepKeys ?? []) {
      normalizeTransitionAt(
        `${clip.key}.${stepKey}.transition`,
        `${clip.key}.${stepKey}.duration`
      );
    }
    normalizeTransitionAt(`${clip.key}.transition`, `${clip.key}.duration`);
    for (const track of clip.tracks ?? []) {
      const trackKey = `${clip.key}.${track.prop}`;
      for (const stepKey of track.stepKeys ?? []) {
        normalizeTransitionAt(
          `${trackKey}.${stepKey}.transition`,
          `${trackKey}.${stepKey}.duration`
        );
      }
      normalizeTransitionAt(`${trackKey}.transition`, `${trackKey}.duration`);
      if (normalized[`${trackKey}.delay`] === 0) {
        delete normalized[`${trackKey}.delay`];
      }
    }
    delete normalized[`${clip.key}.loop`];
  }
  return normalized;
}
function formatClock(time, tenths = false) {
  const safe = Math.max(0, time);
  const minutes = Math.floor(safe / 60);
  const seconds = safe - minutes * 60;
  const secondsText = tenths ? seconds.toFixed(1).padStart(4, "0") : String(Math.floor(seconds)).padStart(2, "0");
  return `${String(minutes).padStart(2, "0")}:${secondsText}`;
}
function formatSeconds(value) {
  return `${round22(value)}s`;
}
function formatStepLabel(stepKey) {
  const match = /^step(\d+)$/.exec(stepKey);
  return match ? `Step ${match[1]}` : formatLabel(stepKey);
}

// src/timeline/adapter.ts
function resolveTimelineLoop(loop) {
  if (typeof loop === "object" && loop !== null) {
    return {
      enabled: true,
      start: Number.isFinite(loop.from) ? Math.max(0, loop.from) : 0
    };
  }
  return { enabled: Boolean(loop), start: 0 };
}
function buildTimelineMeta(id, name, duration, parsed, loop, track, pinStart, onClipClick) {
  const resolvedLoop = resolveTimelineLoop(loop);
  return {
    id,
    name,
    duration,
    loop: resolvedLoop.enabled,
    loopStart: resolvedLoop.start,
    clips: parsed.clips,
    ...track === "single" ? { singleTrack: true } : {},
    ...track === "single" && pinStart ? { pinStart: true } : {},
    ...onClipClick ? { onClipClick } : {}
  };
}
function buildTimelineValues(staticClips, transport, timelineDuration, loopStart, actions) {
  var _a;
  const result = {
    time: transport.time,
    playing: transport.playing,
    duration: timelineDuration,
    ...actions
  };
  const span = loopSpan(transport.duration, loopStart);
  const cycleTime = (span > 0 ? transport.wraps * span : 0) + transport.time;
  for (const clip of staticClips) {
    const state2 = computeClipState(clip, transport.time, cycleTime);
    if (clip.group) {
      const bucket = result[_a = clip.group] ?? (result[_a] = {});
      bucket[clip.childKey] = state2;
    } else {
      result[clip.key] = state2;
    }
  }
  return result;
}

// src/store/TimelineUiStore.ts
var TimelineUiStoreClass = class {
  constructor() {
    this.visible = true;
    this.initialized = false;
    this.controllers = /* @__PURE__ */ new Map();
    this.listeners = /* @__PURE__ */ new Set();
  }
  getVisible() {
    for (const controller of this.controllers.values()) {
      if (controller.visible !== void 0) return controller.visible;
    }
    return this.visible;
  }
  registerController(id, controller) {
    const previous = this.getVisible();
    if (!this.initialized) {
      this.visible = controller.defaultVisible;
      this.initialized = true;
    }
    this.controllers.set(id, controller);
    if (previous !== this.getVisible()) this.notify();
    return () => {
      const before = this.getVisible();
      this.controllers.delete(id);
      if (this.controllers.size === 0) this.initialized = false;
      if (before !== this.getVisible()) this.notify();
    };
  }
  updateController(id, controller) {
    if (!this.controllers.has(id)) return;
    const previous = this.getVisible();
    this.controllers.set(id, controller);
    if (previous !== this.getVisible()) this.notify();
  }
  requestVisible(visible) {
    const current = this.getVisible();
    if (current === visible) return;
    const controlled = Array.from(this.controllers.values()).filter(
      (controller) => controller.visible !== void 0
    );
    if (controlled.length > 0) {
      controlled.forEach((controller) => controller.onVisibilityChange?.(visible));
      return;
    }
    this.visible = visible;
    this.controllers.forEach((controller) => controller.onVisibilityChange?.(visible));
    this.notify();
  }
  toggle() {
    this.requestVisible(!this.getVisible());
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  notify() {
    this.listeners.forEach((listener) => listener());
  }
};
var TimelineUiStore = /* @__PURE__ */ new TimelineUiStoreClass();

// src/copy-instruction.ts
function buildCopyInstruction(hookName, panelName, values) {
  const jsonStr = JSON.stringify(Object.fromEntries(
    Object.entries(values).filter(([path]) => !path.endsWith(".__mode"))
  ), null, 2);
  if (hookName === "useDialTimeline" || hookName === "createDialTimeline") {
    return `Update the ${hookName} configuration for "${panelName}" with these values:

\`\`\`json
${jsonStr}
\`\`\`

Apply these values as the new defaults in the ${hookName} call. Keep the existing \`clip.current\` bindings while this timeline is being authored; do not convert the animation or remove DialKit yet.

Add this comment immediately above the ${hookName} call as a production handoff note:

\`\`\`tsx
// TODO(production): DialKit's clip.current values are the scrubbable authoring preview.
// Replace them with equivalent real Motion animations using the tuned timeline
// timings and transitions, then remove ${hookName} and <DialTimeline />.
\`\`\``;
  }
  return `Update the ${hookName} configuration for "${panelName}" with these values:

\`\`\`json
${jsonStr}
\`\`\`

Apply these values as the new defaults in the ${hookName} call.`;
}

// src/env.ts
var isDevDefault = typeof process !== "undefined" && process?.env?.NODE_ENV ? process.env.NODE_ENV !== "production" : typeof import.meta !== "undefined" && import.meta.env?.MODE ? import.meta.env.MODE !== "production" : true;

// src/vue/useDialTimeline.ts
var timelineInstance = 0;
function useDialTimeline(name, config, options) {
  const hasStableId = options?.id !== void 0;
  const panelId = options?.id ?? `${name}-${++timelineInstance}`;
  const serializedConfig = computed2(() => JSON.stringify(config));
  const serializedPersist = computed2(() => JSON.stringify(options?.persist));
  const serializedLoop = computed2(() => JSON.stringify(options?.loop));
  const parsed = computed2(() => {
    serializedConfig.value;
    return parseTimelineConfig(config);
  });
  const flatValues = shallowRef2(DialStore.getValues(panelId));
  const transport = shallowRef2(TimelineStore.getTransport(panelId));
  const staticTimeline = computed2(() => computeStaticTimeline(parsed.value, flatValues.value));
  const meta = computed2(() => {
    serializedLoop.value;
    return buildTimelineMeta(
      panelId,
      name,
      staticTimeline.value.duration,
      parsed.value,
      options?.loop
    );
  });
  let mounted = false;
  let unsubscribeValues;
  let unsubscribeTransport;
  const play = () => TimelineStore.play(panelId);
  const pause = () => TimelineStore.pause(panelId);
  const replay = () => TimelineStore.replay(panelId);
  const seek = (time) => TimelineStore.seek(panelId, time);
  watch2([serializedConfig, serializedPersist], () => {
    if (!mounted) return;
    DialStore.updatePanel(panelId, name, parsed.value.dialConfig, void 0, {
      retainOnUnmount: hasStableId,
      persist: options?.persist,
      kind: "timeline"
    });
    flatValues.value = DialStore.getValues(panelId);
  });
  watch2(meta, (nextMeta) => {
    if (mounted) TimelineStore.update(nextMeta);
  });
  onMounted2(() => {
    unsubscribeValues = DialStore.subscribe(panelId, () => {
      flatValues.value = DialStore.getValues(panelId);
    });
    unsubscribeTransport = TimelineStore.subscribe(panelId, () => {
      transport.value = TimelineStore.getTransport(panelId);
    });
    DialStore.registerPanel(panelId, name, parsed.value.dialConfig, void 0, {
      retainOnUnmount: hasStableId,
      persist: options?.persist,
      kind: "timeline"
    });
    flatValues.value = DialStore.getValues(panelId);
    TimelineStore.register(meta.value, { autoplay: options?.autoplay ?? true });
    transport.value = TimelineStore.getTransport(panelId);
    mounted = true;
  });
  onUnmounted2(() => {
    mounted = false;
    unsubscribeValues?.();
    unsubscribeTransport?.();
    TimelineStore.unregister(panelId);
    DialStore.unregisterPanel(panelId);
  });
  return computed2(() => {
    const currentStatic = staticTimeline.value;
    return buildTimelineValues(
      currentStatic.clips,
      transport.value,
      currentStatic.duration,
      resolveTimelineLoop(options?.loop).start,
      { play, pause, replay, seek }
    );
  });
}

// src/vue/directives/dialkit.ts
import {
  createApp,
  defineComponent as defineComponent21,
  h as h21,
  shallowRef as shallowRef3
} from "vue";

// src/vue/components/DialRoot.ts
import { computed as computed7, defineComponent as defineComponent20, h as h20, nextTick as nextTick3, onMounted as onMounted18, onUnmounted as onUnmounted17, ref as ref17, Teleport as Teleport3 } from "vue";

// src/control-keyboard.ts
function sliderKeyValue(key, value, min, max, step, shift = false) {
  if (key === "Home") return min;
  if (key === "End") return max;
  const direction = ["ArrowRight", "ArrowUp", "PageUp"].includes(key) ? 1 : ["ArrowLeft", "ArrowDown", "PageDown"].includes(key) ? -1 : 0;
  if (!direction) return void 0;
  if (!(step > 0) || max <= min) return min;
  const amount = key.startsWith("Page") || shift ? 10 : 1;
  const position = (value - min) / step;
  const nextStep = direction > 0 ? Math.floor(position + 1e-9) + amount : Math.ceil(position - 1e-9) - amount;
  const next = min + nextStep * step;
  return Math.max(min, Math.min(max, Number(next.toPrecision(14))));
}
function stepInputKey(event, draft, value, min, max, step, wrap = false) {
  if (!["ArrowUp", "ArrowDown"].includes(event.key) || event.altKey || event.metaKey || event.ctrlKey) return void 0;
  event.preventDefault();
  const parsed = parseFloat(draft);
  const base = Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : value;
  const up = event.key === "ArrowUp";
  if (wrap && (up && base >= max || !up && base <= min)) return up ? min : max;
  return sliderKeyValue(event.key, base, min, max, step, event.shiftKey);
}
function handleSliderKey(event, value, min, max, step, change, edit) {
  if (event.target !== event.currentTarget || event.altKey || event.metaKey || event.ctrlKey) return;
  const next = sliderKeyValue(event.key, value, min, max, step, event.shiftKey);
  if (next === void 0 && event.key !== "Enter") return;
  event.preventDefault();
  event.stopPropagation();
  if (next === void 0) edit();
  else change(next);
}
function activateOnKey(event, activate) {
  if (event.target !== event.currentTarget || !["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  event.stopPropagation();
  activate();
}
function optionKeyIndex(key, index, count, wrap = false) {
  if (!count) return void 0;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  const delta = ["ArrowRight", "ArrowDown"].includes(key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(key) ? -1 : 0;
  if (!delta) return void 0;
  return wrap ? (index + delta + count) % count : Math.max(0, Math.min(count - 1, index + delta));
}
function handleSegmentKey(event) {
  if (event.altKey || event.metaKey || event.ctrlKey) return;
  const group = event.currentTarget;
  const buttons = Array.from(group.querySelectorAll(".dialkit-segmented-button:not(:disabled)"));
  const next = optionKeyIndex(event.key, buttons.indexOf(event.target), buttons.length, true);
  if (next === void 0) return;
  event.preventDefault();
  event.stopPropagation();
  buttons[next].focus({ preventScroll: true });
  buttons[next].click();
}
var labelId = 0;
function labelSegmentedControl(group) {
  if (group.hasAttribute("aria-label") || group.hasAttribute("aria-labelledby")) return;
  const label = group.closest(".dialkit-labeled-control")?.querySelector(".dialkit-labeled-control-label");
  if (!label) {
    group.setAttribute("aria-label", "Options");
    return;
  }
  label.id || (label.id = `dialkit-segment-label-${++labelId}`);
  group.setAttribute("aria-labelledby", label.id);
}
function openDropdownOnKey(event, open) {
  if (!["ArrowDown", "ArrowUp"].includes(event.key) || event.altKey || event.metaKey || event.ctrlKey) return;
  event.preventDefault();
  event.stopPropagation();
  open();
}
function adjacentTabStop(trigger, backwards = false) {
  const candidates = Array.from(trigger.ownerDocument.querySelectorAll('a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]'));
  const stops = candidates.filter((el) => el === trigger || el.tabIndex >= 0 && !el.matches(":disabled") && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden" && !el.closest('[inert], [aria-hidden="true"], .dialkit-select-dropdown, .dialkit-preset-dropdown, .dialkit-shortcuts-dropdown, .dialkit-color-popover'));
  const index = stops.indexOf(trigger);
  return index < 0 ? void 0 : stops[index + (backwards ? -1 : 1)];
}

// src/panel-size.ts
function measurePanelHeight(content) {
  const panel = content.parentElement;
  if (!panel) return content.offsetHeight;
  const style = getComputedStyle(panel);
  const chrome = style.boxSizing === "border-box" ? [style.paddingTop, style.paddingBottom, style.borderTopWidth, style.borderBottomWidth].reduce((total, value) => total + (parseFloat(value) || 0), 0) : 0;
  return content.offsetHeight + chrome;
}

// src/vue/components/Folder.ts
import { computed as computed3, defineComponent, h, onMounted as onMounted3, onUnmounted as onUnmounted3, ref } from "vue";
import { AnimatePresence, motion } from "motion-v";

// src/icons.ts
var ICON_CHEVRON = "M6 9.5L12 15.5L18 9.5";
var ICON_CLOSE = "M6 6L18 18M18 6L6 18";
var ICON_CHECK = "M5 12.75L10 19L19 5";
var ICON_PAUSE = [
  "M6.75 3C5.23122 3 4 4.23122 4 5.75V18.25C4 19.7688 5.23122 21 6.75 21H7.25C8.76878 21 10 19.7688 10 18.25V5.75C10 4.23122 8.76878 3 7.25 3H6.75Z",
  "M16.75 3C15.2312 3 14 4.23122 14 5.75V18.25C14 19.7688 15.2312 21 16.75 21H17.25C18.7688 21 20 19.7688 20 18.25V5.75C20 4.23122 18.7688 3 17.25 3H16.75Z"
];
var ICON_PLAY = "M9.24394 2.36758C7.41419 1.18362 5 2.49701 5 4.67639V19.3238C5 21.5032 7.41419 22.8166 9.24394 21.6326L20.5624 14.3089C22.2371 13.2253 22.2372 10.775 20.5624 9.69129L9.24394 2.36758Z";
var ICON_REPLAY = [
  "M12 2.5C17.2466 2.50016 21.5 6.7534 21.5 12C21.5 17.2466 17.2466 21.4998 12 21.5C7.52191 21.5 3.76987 18.4025 2.76465 14.2344C2.63517 13.6975 2.96508 13.1578 3.50195 13.0283C4.03883 12.8988 4.57851 13.2288 4.70801 13.7656C5.5016 17.0563 8.46701 19.5 12 19.5C16.142 19.4998 19.5 16.142 19.5 12C19.5 7.85796 16.142 4.50016 12 4.5C9.32981 4.5 6.98389 5.89541 5.6543 8H7.5C8.05228 8 8.5 8.44772 8.5 9C8.5 9.55228 8.05228 10 7.5 10H3.5C2.94772 10 2.5 9.55228 2.5 9V5C2.5 4.44772 2.94772 4 3.5 4C4.05228 4 4.5 4.44772 4.5 5V6.16797C6.2376 3.93677 8.95063 2.5 12 2.5Z",
  "M10 9.94043C10 9.33379 10.6826 8.97849 11.1797 9.32617L14.1221 11.3857C14.5486 11.6843 14.5486 12.3157 14.1221 12.6143L11.1797 14.6738C10.6826 15.0215 10 14.6662 10 14.0596V9.94043Z"
];
var ICON_TIMELINE = [
  "M18.868 10C20.8517 10.0003 22.2886 11.8914 21.7577 13.8027L20.369 18.8027C20.0083 20.1012 18.826 20.9999 17.4784 21H6.51941C5.17179 21 3.98948 20.1012 3.62878 18.8027L2.24011 13.8027C1.7092 11.8913 3.14603 10.0003 5.12976 10H18.868Z",
  "M18.9989 6.5C19.5511 6.50007 19.9989 6.94776 19.9989 7.5C19.9989 8.05224 19.5511 8.49993 18.9989 8.5H4.9989C4.44661 8.5 3.9989 8.05228 3.9989 7.5C3.9989 6.94772 4.44661 6.5 4.9989 6.5H18.9989Z",
  "M16.9989 3C17.5511 3.00007 17.9989 3.44776 17.9989 4C17.9989 4.55224 17.5511 4.99993 16.9989 5H6.9989C6.44661 5 5.9989 4.55228 5.9989 4C5.9989 3.44772 6.44661 3 6.9989 3H16.9989Z"
];
var ICON_CLIPBOARD = {
  board: "M8 6C8 4.34315 9.34315 3 11 3H13C14.6569 3 16 4.34315 16 6V7H8V6Z",
  sparkle: "M19.2405 16.1852L18.5436 14.3733C18.4571 14.1484 18.241 14 18 14C17.759 14 17.5429 14.1484 17.4564 14.3733L16.7595 16.1852C16.658 16.4493 16.4493 16.658 16.1852 16.7595L14.3733 17.4564C14.1484 17.5429 14 17.759 14 18C14 18.241 14.1484 18.4571 14.3733 18.5436L16.1852 19.2405C16.4493 19.342 16.658 19.5507 16.7595 19.8148L17.4564 21.6267C17.5429 21.8516 17.759 22 18 22C18.241 22 18.4571 21.8516 18.5436 21.6267L19.2405 19.8148C19.342 19.5507 19.5507 19.342 19.8148 19.2405L21.6267 18.5436C21.8516 18.4571 22 18.241 22 18C22 17.759 21.8516 17.5429 21.6267 17.4564L19.8148 16.7595C19.5507 16.658 19.342 16.4493 19.2405 16.1852Z",
  body: "M16 5H17C18.6569 5 20 6.34315 20 8V11M8 5H7C5.34315 5 4 6.34315 4 8V18C4 19.6569 5.34315 21 7 21H12"
};
var ICON_PLUS = ["M5 12H19M12 5V19"];
var ICON_ADD_PRESET = [
  "M4 6H20",
  "M4 12H10",
  "M15 15L21 15",
  "M18 12V18",
  "M4 18H10"
];
var ICON_TRASH = [
  "M5 6.5L5.80734 18.2064C5.91582 19.7794 7.22348 21 8.80023 21H15.1998C16.7765 21 18.0842 19.7794 18.1927 18.2064L19 6.5",
  "M10 11V16",
  "M14 11V16",
  "M3.5 6H20.5",
  "M8.07092 5.74621C8.42348 3.89745 10.0485 2.5 12 2.5C13.9515 2.5 15.5765 3.89745 15.9291 5.74621"
];
var ICON_PANEL = {
  path: "M6.84766 11.75C6.78583 11.9899 6.75 12.2408 6.75 12.5C6.75 12.7592 6.78583 13.0101 6.84766 13.25H2C1.58579 13.25 1.25 12.9142 1.25 12.5C1.25 12.0858 1.58579 11.75 2 11.75H6.84766ZM14 11.75C14.4142 11.75 14.75 12.0858 14.75 12.5C14.75 12.9142 14.4142 13.25 14 13.25H12.6523C12.7142 13.0101 12.75 12.7592 12.75 12.5C12.75 12.2408 12.7142 11.9899 12.6523 11.75H14ZM3.09766 7.25C3.03583 7.48994 3 7.74075 3 8C3 8.25925 3.03583 8.51006 3.09766 8.75H2C1.58579 8.75 1.25 8.41421 1.25 8C1.25 7.58579 1.58579 7.25 2 7.25H3.09766ZM14 7.25C14.4142 7.25 14.75 7.58579 14.75 8C14.75 8.41421 14.4142 8.75 14 8.75H8.90234C8.96417 8.51006 9 8.25925 9 8C9 7.74075 8.96417 7.48994 8.90234 7.25H14ZM7.59766 2.75C7.53583 2.98994 7.5 3.24075 7.5 3.5C7.5 3.75925 7.53583 4.01006 7.59766 4.25H2C1.58579 4.25 1.25 3.91421 1.25 3.5C1.25 3.08579 1.58579 2.75 2 2.75H7.59766ZM14 2.75C14.4142 2.75 14.75 3.08579 14.75 3.5C14.75 3.91421 14.4142 4.25 14 4.25H13.4023C13.4642 4.01006 13.5 3.75925 13.5 3.5C13.5 3.24075 13.4642 2.98994 13.4023 2.75H14Z",
  circles: [
    { cx: "6", cy: "8", r: "0.998596" },
    { cx: "10.4999", cy: "3.5", r: "0.998657" },
    { cx: "9.75015", cy: "12.5", r: "0.997986" }
  ]
};
var ICON_MORE = ["M5 12h.01", "M12 12h.01", "M19 12h.01"];
var ICON_MORE_STROKE = 3;

// src/vue/components/Folder.ts
var Folder = defineComponent({
  name: "DialKitFolder",
  props: {
    title: { type: String, required: true },
    open: { type: Boolean, default: void 0 },
    defaultOpen: { type: Boolean, default: true },
    isRoot: { type: Boolean, default: false },
    inline: { type: Boolean, default: false },
    toolbar: {
      type: null,
      required: false,
      default: null
    },
    panelHeightOffset: {
      type: Number,
      default: 0
    }
  },
  emits: ["openChange"],
  setup(props, { emit, slots }) {
    const localOpen = ref(props.defaultOpen);
    const isOpen = computed3(() => props.open ?? localOpen.value);
    const isCollapsed = computed3(() => !isOpen.value);
    const contentRef = ref(null);
    const contentHeight = ref(void 0);
    const windowHeight = ref(typeof window !== "undefined" ? window.innerHeight : 800);
    let resizeHandler = null;
    if (props.isRoot) {
      resizeHandler = () => {
        windowHeight.value = window.innerHeight;
      };
      window.addEventListener("resize", resizeHandler);
    }
    onUnmounted3(() => {
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
    });
    const handleToggle = () => {
      if (props.inline && props.isRoot) return;
      const next = !isOpen.value;
      localOpen.value = next;
      emit("openChange", next);
    };
    let ro = null;
    onMounted3(() => {
      if (!props.isRoot || typeof ResizeObserver === "undefined") return;
      const el = contentRef.value;
      if (!el) return;
      ro = new ResizeObserver(() => {
        if (isOpen.value) {
          const next = measurePanelHeight(el);
          if (contentHeight.value !== next) {
            contentHeight.value = next;
          }
        }
      });
      ro.observe(el);
      if (isOpen.value) {
        contentHeight.value = measurePanelHeight(el);
      }
    });
    onUnmounted3(() => {
      ro?.disconnect();
    });
    const renderHeader = () => h("div", {
      class: `dialkit-folder-header ${props.isRoot ? "dialkit-panel-header" : ""}`,
      onClick: handleToggle
    }, [
      h("div", { class: "dialkit-folder-header-top", role: props.inline && props.isRoot ? void 0 : "button", tabindex: props.inline && props.isRoot ? void 0 : 0, "aria-label": props.title, "aria-expanded": isOpen.value, onKeydown: (e) => activateOnKey(e, handleToggle) }, [
        props.isRoot ? isOpen.value ? h("div", { class: "dialkit-folder-title-row" }, [
          h("span", { class: "dialkit-folder-title dialkit-folder-title-root" }, props.title)
        ]) : null : h("div", { class: "dialkit-folder-title-row" }, [
          h("span", { class: "dialkit-folder-title" }, props.title)
        ]),
        props.isRoot && !props.inline ? h("svg", { class: "dialkit-panel-icon", viewBox: "0 0 16 16", fill: "none" }, [
          h("path", {
            opacity: "0.5",
            d: ICON_PANEL.path,
            fill: "currentColor"
          }),
          ...ICON_PANEL.circles.map((c) => h("circle", { cx: c.cx, cy: c.cy, r: c.r, fill: "currentColor", stroke: "currentColor", "stroke-width": "1.25" }))
        ]) : null,
        !props.isRoot ? h(motion.svg, {
          class: "dialkit-folder-icon",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2.5",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          initial: false,
          animate: { rotate: isOpen.value ? 0 : 180 },
          transition: { type: "spring", visualDuration: 0.35, bounce: 0.15 }
        }, [h("path", { d: ICON_CHEVRON })]) : null
      ]),
      props.isRoot && props.toolbar && isOpen.value ? h("div", { class: "dialkit-panel-toolbar", onClick: (event) => event.stopPropagation() }, [props.toolbar()]) : null
    ]);
    const renderChildren = () => h("div", { class: "dialkit-folder-inner" }, slots.default ? slots.default() : []);
    const renderContent = () => {
      if (props.isRoot) {
        return isOpen.value ? h("div", { class: "dialkit-folder-content" }, [renderChildren()]) : null;
      }
      return h(AnimatePresence, { initial: false }, {
        default: () => isOpen.value ? [h(motion.div, {
          key: "dialkit-folder-content",
          class: "dialkit-folder-content",
          initial: { height: 0, opacity: 0 },
          animate: { height: "auto", opacity: 1 },
          exit: { height: 0, opacity: 0 },
          transition: { type: "spring", visualDuration: 0.35, bounce: 0.1 },
          style: { clipPath: "inset(0 -20px)" }
        }, [renderChildren()])] : []
      });
    };
    const folderContent = () => h("div", {
      ref: props.isRoot ? contentRef : void 0,
      class: `dialkit-folder ${props.isRoot ? "dialkit-folder-root" : ""}`,
      "data-open": String(isOpen.value)
    }, [
      renderHeader(),
      renderContent()
    ]);
    return () => {
      if (props.isRoot) {
        if (props.inline) {
          return h("div", { class: "dialkit-panel-inner dialkit-panel-inline" }, [folderContent()]);
        }
        const panelStyle = isOpen.value ? {
          width: 280,
          height: contentHeight.value !== void 0 ? Math.min(contentHeight.value + props.panelHeightOffset, windowHeight.value - 32) : "auto",
          borderRadius: 14,
          boxShadow: "var(--dial-shadow)",
          cursor: void 0,
          overflowY: "auto"
        } : {
          width: 42,
          height: 42,
          borderRadius: 21,
          boxShadow: "var(--dial-shadow-collapsed)",
          overflow: "hidden",
          cursor: "pointer"
        };
        return h(motion.div, {
          class: "dialkit-panel-inner",
          tabindex: -1,
          style: panelStyle,
          onClick: !isOpen.value ? handleToggle : void 0,
          "data-collapsed": String(isCollapsed.value),
          whilePress: !isOpen.value ? { scale: 0.9 } : void 0,
          transition: { type: "spring", visualDuration: 0.15, bounce: 0.3 }
        }, [folderContent()]);
      }
      return folderContent();
    };
  }
});

// src/vue/components/Panel.ts
import { Fragment as Fragment2, computed as computed6, defineComponent as defineComponent18, h as h18, onMounted as onMounted16, onUnmounted as onUnmounted15, ref as ref15 } from "vue";
import { AnimatePresence as AnimatePresence4, motion as motion4 } from "motion-v";

// src/vue/components/ControlRenderer.ts
import { Fragment, defineComponent as defineComponent16, h as h16 } from "vue";

// src/vue/components/ColorControl.ts
import { defineComponent as defineComponent2, h as h2, onMounted as onMounted4, onUnmounted as onUnmounted4, ref as ref2, watchEffect } from "vue";

// src/dropdown-position.ts
function getDropdownPosition(trigger, portalRoot, options = {}) {
  const { dropdownHeight = 0, gap = 4, allowAbove = true } = options;
  const triggerRect = trigger.getBoundingClientRect();
  const rootRect = portalRoot.getBoundingClientRect();
  const viewport = window.visualViewport;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportLeft = viewport?.offsetLeft ?? 0;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const viewportWidth = viewport?.width ?? window.innerWidth;
  const margin = 8;
  const spaceBelow = Math.max(0, viewportTop + viewportHeight - triggerRect.bottom - gap - margin);
  const spaceAbove = Math.max(0, triggerRect.top - viewportTop - gap - margin);
  const above = allowAbove && spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
  let maxHeight = Math.min(options.maxHeight ?? 320, above ? spaceAbove : spaceBelow);
  const height = Math.min(dropdownHeight, maxHeight);
  const width = Math.min(options.width ?? triggerRect.width, Math.max(0, viewportWidth - margin * 2));
  let left = Math.max(viewportLeft + margin, Math.min(triggerRect.left, viewportLeft + viewportWidth - width - margin));
  let top = Math.max(viewportTop + margin, above ? triggerRect.top - height - gap : triggerRect.bottom + gap);
  if (options.preferSide) {
    const sideRect = trigger.closest(".dialkit-panel-inner")?.getBoundingClientRect() ?? triggerRect;
    const before = sideRect.left - width - gap;
    const after = sideRect.right + gap;
    if (before >= viewportLeft + margin) left = before;
    else if (after + width <= viewportLeft + viewportWidth - margin) left = after;
    maxHeight = Math.min(options.maxHeight ?? 480, viewportHeight - margin * 2);
    top = Math.max(viewportTop + margin, Math.min(triggerRect.top - 32, viewportTop + viewportHeight - Math.min(dropdownHeight, maxHeight) - margin));
  }
  return {
    top: options.fixed ? top : top - rootRect.top + portalRoot.scrollTop - portalRoot.clientTop,
    left: options.fixed ? left : left - rootRect.left + portalRoot.scrollLeft - portalRoot.clientLeft,
    width,
    above,
    maxHeight
  };
}
function observeDropdownPosition(trigger, update, popup) {
  let frame = 0;
  let disposed = false;
  let previous = "";
  const tick = () => {
    if (disposed) return;
    const floating = popup?.();
    if (floating?.isConnected && floating.style.position === "fixed" && typeof floating.showPopover === "function" && !floating.matches(":popover-open")) {
      floating.setAttribute("popover", "manual");
      floating.showPopover();
    }
    const rect = trigger.getBoundingClientRect();
    const root = getDialKitPortalRoot(trigger)?.getBoundingClientRect();
    const viewport = window.visualViewport;
    const next = [
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      root?.x,
      root?.y,
      popup?.()?.scrollHeight,
      window.innerWidth,
      window.innerHeight,
      viewport?.height,
      viewport?.offsetTop,
      viewport?.offsetLeft
    ].join(",");
    if (next !== previous) {
      previous = next;
      update();
    }
    if (!disposed) frame = requestAnimationFrame(tick);
  };
  tick();
  window.addEventListener("scroll", update, true);
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", update, true);
  };
}
function getDialKitPortalRoot(trigger) {
  return trigger?.closest(".dialkit-root") ?? null;
}

// src/store/HintStore.ts
var TIP_SEEN_KEY = "dialkit-hint-tip-seen";
function readTipSeen() {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(TIP_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}
function writeTipSeen() {
  try {
    localStorage.setItem(TIP_SEEN_KEY, "1");
  } catch {
  }
}
var HintStoreClass = class {
  constructor() {
    this.key = "h";
    this.keyHeld = false;
    /** Read from storage on first use; null until then. */
    this.tipSeen = null;
    this.shown = null;
    this.hovered = [];
    this.listeners = /* @__PURE__ */ new Set();
    this.subscribe = (listener) => {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    };
    /** The key held to show hints. */
    this.getKey = () => this.key;
    this.isKeyHeld = () => this.keyHeld;
    /**
     * Whether the user has pressed the hint key once. Until then, every open
     * panel shows a tip that says what the key does (HintTip).
     */
    this.isTipSeen = () => {
      if (this.tipSeen === null) this.tipSeen = readTipSeen();
      return this.tipSeen;
    };
    this.getShown = () => this.shown;
  }
  notify() {
    this.listeners.forEach((listener) => listener());
  }
  setKey(key) {
    this.key = key.toLowerCase();
    this.notify();
  }
  setKeyHeld(held) {
    if (held === this.keyHeld) return;
    this.keyHeld = held;
    if (held && !this.isTipSeen()) {
      this.tipSeen = true;
      writeTipSeen();
    }
    const top = this.hovered[this.hovered.length - 1];
    if (!held) this.shown = null;
    else if (top) this.shown = { text: top.text, anchor: top.anchor, box: top.anchor };
    this.notify();
  }
  /** The pointer entered `anchor`, a row with a hint. */
  enter(anchor, text) {
    this.hovered = this.hovered.filter((row) => row.anchor !== anchor);
    this.hovered.push({ anchor, text });
    if (this.keyHeld) this.show(text, anchor);
  }
  /**
   * The pointer left `anchor`. Its hint stays while the key is held, so the
   * gap between two rows does not flicker: the next row replaces it.
   */
  leave(anchor) {
    this.hovered = this.hovered.filter((row) => row.anchor !== anchor);
  }
  /** A hovered row's text changed. */
  retext(anchor, text) {
    const row = this.hovered.find((entry) => entry.anchor === anchor);
    if (!row) return;
    row.text = text;
    if (this.shown?.anchor === anchor) this.show(text, anchor);
  }
  /** Shows `text` above `box`, the row; `anchor` is the element that asked. */
  show(text, anchor, box = anchor) {
    if (this.shown?.anchor === anchor && this.shown.text === text) return;
    this.shown = { text, anchor, box };
    this.notify();
  }
  /** Hides the hint, if `anchor` is the one it points at. */
  hide(anchor) {
    if (!this.shown || anchor && this.shown.anchor !== anchor) return;
    this.shown = null;
    this.notify();
  }
};
var HintStore = new HintStoreClass();

// src/color-control.ts
var FORMATS = ["hex", "rgb", "hsl", "oklch"];
var FORMAT_LABEL = { hex: "Hex", rgb: "RGB", hsl: "HSL", oklch: "OKLCH" };
var MODE_KEY = "dialkit:color-mode";
var HEX_RE = /^#?([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;
var PICKER_HINTS = {
  plane: "Drag to change how light and how strong the color is.",
  hue: "Drag to change the hue.",
  opacity: "Drag to change how see-through the color is.",
  format: "Shows the color as hex, RGB, HSL or OKLCH.",
  fields: "Type a value, or drag a letter or the % to change it.",
  eyedropper: "Picks a color from anywhere on the screen."
};
var isHintKey = (e) => e.key.toLowerCase() === HintStore.getKey() && !(e.target instanceof HTMLInputElement);
var EYEDROPPER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg>';
var CHANNELS = {
  rgb: [
    { key: "r", label: "Red", min: 0, max: 255, step: 1, digits: 0, width: 4 },
    { key: "g", label: "Green", min: 0, max: 255, step: 1, digits: 0, width: 4 },
    { key: "b", label: "Blue", min: 0, max: 255, step: 1, digits: 0, width: 4 }
  ],
  hsl: [
    { key: "h", label: "Hue", min: 0, max: 360, step: 1, digits: 0, width: 4, wrap: true },
    { key: "s", label: "Saturation", min: 0, max: 100, step: 1, digits: 0, unit: "%", width: 4 },
    { key: "l", label: "Lightness", min: 0, max: 100, step: 1, digits: 0, unit: "%", width: 4 }
  ],
  oklch: [
    { key: "l", label: "Lightness", min: 0, max: 1, step: 0.01, digits: 3, width: 5 },
    { key: "c", label: "Chroma", min: 0, max: 0.4, step: 5e-3, digits: 3, width: 5 },
    { key: "h", label: "Hue", min: 0, max: 360, step: 1, digits: 1, width: 5, wrap: true }
  ]
};
function element2(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  if (el instanceof HTMLButtonElement) el.type = "button";
  return el;
}
function textInput(className, label, width) {
  const input = element2("input", className);
  input.type = "text";
  input.spellcheck = false;
  input.autocomplete = "off";
  input.setAttribute("aria-label", label);
  if (width) input.style.width = `${width}ch`;
  return input;
}
function readMode() {
  try {
    const stored = localStorage.getItem(MODE_KEY);
    return FORMATS.includes(stored) ? stored : null;
  } catch {
    return null;
  }
}
function writeMode(format) {
  try {
    localStorage.setItem(MODE_KEY, format);
  } catch {
  }
}
var percentByte = (n) => Math.round(clamp(n) * 100);
function hsvRgb(h25, s, v) {
  const f = (n) => {
    const k = (n + h25 / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5), f(3), f(1)];
}
function hslRgb(h25, s, l) {
  const k = s * Math.min(l, 1 - l);
  const f = (n) => {
    const t = (n + h25 / 30) % 12;
    return l - k * Math.max(-1, Math.min(t - 3, 9 - t, 1));
  };
  return [f(0), f(8), f(4)];
}
var cssRgb = (rgb) => `rgb(${rgb.map((n) => Math.round(clamp(n) * 255)).join(" ")})`;
function mountColorControl(host, initial, presentation = "popover") {
  const inline = presentation === "inline";
  let props = initial;
  let color = parseColor(props.value) ?? { l: 0, c: 0, h: 0, a: 1 };
  let format = readMode() ?? colorFormat(props.value);
  let srgbHue = colorToHsv(color).h;
  let lastEmitted;
  let popup;
  let stopPosition;
  let paintFrame = 0;
  let updatePicker = () => {
  };
  let rebuildFields = () => {
  };
  let hinted = [];
  const hint = (part, text) => {
    hinted.push(part);
    part.addEventListener("pointerenter", () => HintStore.enter(part, text));
    part.addEventListener("pointerleave", () => HintStore.leave(part));
  };
  const row = element2("div", "dialkit-color-control");
  const label = element2("span", "dialkit-color-label");
  const inputs = element2("div", "dialkit-color-inputs");
  const valueInput = textInput("dialkit-color-value", "color value");
  const swatch = element2("button", "dialkit-color-swatch");
  swatch.setAttribute("aria-haspopup", "dialog");
  swatch.setAttribute("aria-expanded", "false");
  inputs.append(valueInput, swatch);
  row.append(label, inputs);
  host.append(row);
  if (inline) row.style.display = "none";
  const rememberHue = (next) => {
    const hsv = colorToHsv(next, srgbHue);
    if (hsv.s > 1e-4 && hsv.v > 1e-4) srgbHue = hsv.h;
  };
  const render = () => {
    label.textContent = props.label;
    valueInput.setAttribute("aria-label", `${props.label} color value`);
    if (document.activeElement !== valueInput) valueInput.value = colorToHexSix(color);
    swatch.style.setProperty("--dial-color", formatColor(color, "hex"));
    swatch.setAttribute("aria-label", `Pick ${props.label.toLowerCase()} color`);
    updatePicker();
  };
  const commit = (next, nextFormat = format) => {
    format = nextFormat;
    color = format === "oklch" ? next : fitGamut(next);
    rememberHue(color);
    const value = formatColor(color, format);
    lastEmitted = value;
    props = { ...props, value };
    render();
    props.onChange(value);
  };
  const acceptText = (input) => {
    const parsed = parseColor(input.value);
    if (!parsed) {
      input.setAttribute("aria-invalid", "true");
      return false;
    }
    input.removeAttribute("aria-invalid");
    commit(parsed);
    return true;
  };
  valueInput.addEventListener("focus", () => {
    if (getComputedStyle(valueInput).getPropertyValue("--dial-hex-click").trim() !== "1") valueInput.select();
  });
  valueInput.addEventListener("change", () => acceptText(valueInput));
  valueInput.addEventListener("blur", () => {
    valueInput.value = colorToHexSix(color);
    valueInput.removeAttribute("aria-invalid");
  });
  valueInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      if (acceptText(valueInput)) valueInput.blur();
    }
    if (e.key === "Escape") {
      valueInput.value = colorToHexSix(color);
      valueInput.removeAttribute("aria-invalid");
      valueInput.blur();
    }
    e.stopPropagation();
  });
  const close = (restoreFocus = false) => {
    stopPosition?.();
    stopPosition = void 0;
    cancelAnimationFrame(paintFrame);
    popup?.remove();
    popup = void 0;
    hinted.forEach((part) => {
      HintStore.leave(part);
      HintStore.hide(part);
    });
    hinted = [];
    updatePicker = () => {
    };
    rebuildFields = () => {
    };
    delete row.dataset.open;
    swatch.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", outside);
    document.removeEventListener("focusin", focusOutside);
    if (restoreFocus) swatch.focus({ preventScroll: true });
  };
  const outside = (e) => {
    if (!popup?.contains(e.target) && !row.contains(e.target)) close();
  };
  const focusOutside = (e) => {
    if (!popup?.contains(e.target) && !row.contains(e.target)) close();
  };
  const open = (event) => {
    if (popup) {
      if (!inline) close();
      return;
    }
    const root = inline ? host : getDialKitPortalRoot(host) ?? host;
    popup = element2("div", "dialkit-color-popover");
    popup.tabIndex = -1;
    popup.dataset.presentation = presentation;
    popup.style.position = inline ? "static" : "fixed";
    popup.setAttribute("role", inline ? "group" : "dialog");
    popup.setAttribute("aria-label", `${props.label} color picker`);
    const plane = element2("div", "dialkit-color-plane");
    plane.setAttribute("role", "group");
    plane.tabIndex = 0;
    const canvas = element2("canvas", "dialkit-color-canvas");
    canvas.width = 252;
    canvas.height = 160;
    canvas.setAttribute("aria-hidden", "true");
    const marker = element2("span", "dialkit-color-marker");
    marker.setAttribute("aria-hidden", "true");
    plane.append(canvas, marker);
    hint(plane, PICKER_HINTS.plane);
    const tracks = element2("div", "dialkit-color-tracks");
    function track(name, max, step, className, hintText) {
      const line = element2("label", "dialkit-color-track-row");
      const input = element2("input", `dialkit-color-track ${className}`);
      input.type = "range";
      input.min = "0";
      input.max = String(max);
      input.step = String(step);
      input.setAttribute("aria-label", name);
      line.append(input);
      tracks.append(line);
      hint(line, hintText);
      return input;
    }
    const hue = track("Hue", 360, 0.1, "dialkit-color-hue", PICKER_HINTS.hue);
    const opacity = track("Opacity", 100, 1, "dialkit-color-opacity", PICKER_HINTS.opacity);
    const formatRow = element2("div", "dialkit-labeled-control dialkit-color-format-row");
    const formats = element2("div", "dialkit-segmented dialkit-color-formats");
    formatRow.append(formats);
    formats.setAttribute("role", "radiogroup");
    formats.addEventListener("keydown", handleSegmentKey);
    formats.setAttribute("aria-label", "Color format");
    hint(formats, PICKER_HINTS.format);
    const formatPill = element2("div", "dialkit-segmented-pill");
    formatPill.setAttribute("aria-hidden", "true");
    formats.append(formatPill);
    const formatButtons = FORMATS.map((f) => {
      const button = element2("button", "dialkit-segmented-button dialkit-color-format", FORMAT_LABEL[f]);
      button.setAttribute("role", "radio");
      button.addEventListener("click", () => {
        format = f;
        writeMode(f);
        rebuildFields();
        commit(color, f);
      });
      formats.append(button);
      return button;
    });
    const fieldsRow = element2("div", "dialkit-color-fields-row");
    const fields = element2("div", "dialkit-color-fields");
    const EyeDropperApi = window.EyeDropper;
    const eyedropper = element2("button", "dialkit-color-eyedropper");
    eyedropper.innerHTML = EYEDROPPER_ICON;
    eyedropper.setAttribute("aria-label", "Pick a color from the screen");
    eyedropper.addEventListener("click", async () => {
      if (!EyeDropperApi) return;
      try {
        const picked = await new EyeDropperApi().open();
        const parsed = parseColor(picked.sRGBHex);
        if (parsed) commit({ ...parsed, a: color.a });
      } catch {
      }
    });
    const channelBox = element2("div", "dialkit-color-channels");
    const alphaBox = element2("div", "dialkit-color-alpha");
    const alphaInput = textInput("dialkit-color-channel dialkit-color-alpha-input", "Alpha percentage", 3);
    const alphaUnit = element2("span", "dialkit-color-unit", "%");
    alphaBox.append(alphaInput, alphaUnit);
    if (EyeDropperApi) {
      fieldsRow.append(eyedropper);
      hint(eyedropper, PICKER_HINTS.eyedropper);
    }
    fields.append(channelBox, alphaBox);
    hint(fields, PICKER_HINTS.fields);
    fieldsRow.append(fields);
    let channelInputs = [];
    let syncChannels = () => {
    };
    const readNumber = (input, channel) => {
      const n = Number.parseFloat(input.value.replace("%", "").trim());
      return Number.isFinite(n) ? clamp(n, channel.min, channel.max) : null;
    };
    const commitChannels = () => {
      if (format === "hex") {
        const match = HEX_RE.exec(channelInputs[0].value.trim());
        if (!match) {
          channelInputs[0].setAttribute("aria-invalid", "true");
          return;
        }
        const parsed = parseColor(`#${match[1]}`);
        commit({ ...parsed, a: match[1].length === 4 || match[1].length === 8 ? parsed.a : color.a });
        return;
      }
      const values = CHANNELS[format].map((channel, i) => readNumber(channelInputs[i], channel));
      if (values.some((n) => n === null)) {
        channelInputs.forEach((input, i) => {
          if (values[i] === null) input.setAttribute("aria-invalid", "true");
        });
        return;
      }
      const [a, b, c] = values;
      if (format === "rgb") commit(rgb255ToColor(a, b, c, color.a));
      else if (format === "hsl") {
        srgbHue = wrapHue(a);
        commit(hslToColor({ h: a, s: b / 100, l: c / 100 }, color.a));
      } else commit({ l: a, c: b, h: wrapHue(c), a: color.a });
    };
    const bindField = (input, onCommit, range, current) => {
      input.addEventListener("change", onCommit);
      input.addEventListener("blur", () => {
        input.removeAttribute("aria-invalid");
        syncChannels();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit();
          input.blur();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          input.removeAttribute("aria-invalid");
          syncChannels();
          input.blur();
        }
        if (!range || !current) return;
        const stepped = stepInputKey(e, input.value.replace("%", ""), current(), range.min, range.max, range.step, range.wrap);
        if (stepped === void 0) return;
        input.value = stepped.toFixed(range.digits);
        input.removeAttribute("aria-invalid");
        onCommit();
      });
    };
    const scrub = (grip, range, read, apply) => {
      let press;
      grip.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        press = { id: e.pointerId, x: e.clientX, start: read(), moved: false };
        grip.setPointerCapture(e.pointerId);
      });
      grip.addEventListener("pointermove", (e) => {
        if (!press || e.pointerId !== press.id) return;
        const dx = e.clientX - press.x;
        if (!press.moved && Math.abs(dx) < 3) return;
        press.moved = true;
        const raw = press.start + dx * range.step * (e.shiftKey ? 10 : 1);
        const span = range.max - range.min;
        const n = range.wrap ? ((raw - range.min) % span + span) % span + range.min : clamp(raw, range.min, range.max);
        apply(Number(n.toFixed(range.digits)));
      });
      const end = (e) => {
        if (!press || e.pointerId !== press.id) return;
        press = void 0;
        if (grip.hasPointerCapture(e.pointerId)) grip.releasePointerCapture(e.pointerId);
      };
      grip.addEventListener("pointerup", end);
      grip.addEventListener("pointercancel", end);
      grip.addEventListener("click", (e) => e.preventDefault());
    };
    const channelValues = () => format === "hex" ? [] : format === "rgb" ? colorToRgb255(color) : format === "hsl" ? (({ h: h25, s, l }) => [h25, s * 100, l * 100])(colorToHsl(color, srgbHue)) : [color.l, color.c, color.h];
    rebuildFields = () => {
      channelBox.replaceChildren();
      if (format === "hex") {
        const input = textInput("dialkit-color-channel dialkit-color-hex-input", "Hex value", 8);
        channelInputs = [input];
        channelBox.append(input);
      } else {
        channelInputs = CHANNELS[format].map((channel) => {
          const cell = element2("label", "dialkit-color-channel-cell");
          const input = textInput("dialkit-color-channel", channel.label, channel.width);
          const name = element2("span", "dialkit-color-channel-name", channel.key.toUpperCase());
          cell.append(name, input);
          channelBox.append(cell);
          return input;
        });
        const mode = format;
        channelBox.querySelectorAll(".dialkit-color-channel-name").forEach((name, i) => {
          const channel = CHANNELS[mode][i];
          scrub(name, channel, () => channelValues()[i], (n) => {
            channelInputs[i].value = n.toFixed(channel.digits);
            channelInputs[i].removeAttribute("aria-invalid");
            commitChannels();
          });
        });
      }
      channelInputs.forEach((input, i) => {
        const channel = format === "hex" ? void 0 : CHANNELS[format][i];
        bindField(input, commitChannels, channel, channel && (() => channelValues()[i]));
      });
      syncChannels();
    };
    syncChannels = () => {
      if (channelInputs.length !== (format === "hex" ? 1 : 3)) return;
      const focused = document.activeElement;
      if (format === "hex") {
        if (focused !== channelInputs[0]) channelInputs[0].value = colorToHexSix(color);
      } else {
        const values = channelValues();
        CHANNELS[format].forEach((channel, i) => {
          if (focused !== channelInputs[i]) channelInputs[i].value = values[i].toFixed(channel.digits);
        });
      }
      if (focused !== alphaInput) alphaInput.value = String(percentByte(color.a));
    };
    bindField(alphaInput, () => {
      const percent = Number.parseFloat(alphaInput.value.replace("%", "").trim());
      if (!Number.isFinite(percent)) {
        alphaInput.setAttribute("aria-invalid", "true");
        return;
      }
      commit({ ...color, a: clamp(percent, 0, 100) / 100 });
    }, { min: 0, max: 100, step: 1, digits: 0 }, () => percentByte(color.a));
    scrub(alphaUnit, { min: 0, max: 100, step: 1, digits: 0 }, () => percentByte(color.a), (n) => commit({ ...color, a: n / 100 }));
    let space = fieldSpace(format);
    let lastPaintKey = "";
    let lastHueTrack = "";
    let saturation = 0;
    const fieldHue = () => space === "oklch" ? color.h : srgbHue;
    const handle = () => {
      if (space === "hsv") {
        const { s, v } = colorToHsv(color, srgbHue);
        return { x: s, y: 1 - v };
      }
      if (space === "hsl") {
        const { s, l } = colorToHsl(color, srgbHue);
        return { x: s, y: 1 - l };
      }
      const max = maxChroma(color.l, color.h);
      if (max > 0) saturation = clamp(color.c / max);
      return { x: saturation, y: 1 - color.l };
    };
    const colorAt = (x, y) => {
      if (space === "hsv") return hsvToColor({ h: srgbHue, s: x, v: 1 - y }, color.a);
      if (space === "hsl") return hslToColor({ h: srgbHue, s: x, l: 1 - y }, color.a);
      saturation = x;
      const l = 1 - y;
      return { ...color, l, c: x * maxChroma(l, color.h) };
    };
    const ctx = canvas.getContext("2d");
    const paint = () => {
      if (!ctx) return;
      const key = `${space}:${fieldHue().toFixed(2)}`;
      if (key === lastPaintKey) return;
      lastPaintKey = key;
      const h25 = fieldHue();
      const pixels = ctx.createImageData(canvas.width, canvas.height);
      for (let y = 0; y < canvas.height; y++) {
        const t = 1 - y / (canvas.height - 1);
        const max = space === "oklch" ? maxChroma(t, h25) : 0;
        for (let x = 0; x < canvas.width; x++) {
          const u = x / (canvas.width - 1);
          const rgb = space === "hsv" ? hsvRgb(h25, u, t) : space === "hsl" ? hslRgb(h25, u, t) : colorToRgb({ l: t, c: u * max, h: h25, a: 1 });
          const index = (y * canvas.width + x) * 4;
          rgb.forEach((n, i) => {
            pixels.data[index + i] = Math.round(clamp(n) * 255);
          });
          pixels.data[index + 3] = 255;
        }
      }
      ctx.putImageData(pixels, 0, 0);
    };
    const hueStops = () => {
      const at = handle();
      const stops = Array.from({ length: 73 }, (_, i) => {
        const h25 = i * 5;
        if (space === "hsv") return cssRgb(hsvRgb(h25, at.x, 1 - at.y));
        if (space === "hsl") return cssRgb(hslRgb(h25, at.x, 1 - at.y));
        return formatColor({ l: color.l, c: saturation * maxChroma(color.l, h25), h: h25, a: 1 }, "oklch");
      });
      return `linear-gradient(to right${space === "oklch" ? " in oklab" : ""}, ${stops.join(", ")})`;
    };
    updatePicker = () => {
      popup?.setAttribute("aria-label", `${props.label} color picker`);
      space = fieldSpace(format);
      plane.setAttribute("aria-label", space === "oklch" ? "Color field; use arrow keys to adjust chroma and lightness" : space === "hsl" ? "Color field; use arrow keys to adjust saturation and lightness" : "Color field; use arrow keys to adjust saturation and brightness");
      const at = handle();
      marker.style.left = `${at.x * 100}%`;
      marker.style.top = `${at.y * 100}%`;
      const opaque = formatColor({ ...color, a: 1 }, "hex");
      marker.style.background = opaque;
      hue.value = String(fieldHue());
      opacity.value = String(color.a * 100);
      hue.setAttribute("aria-valuetext", `${Math.round(fieldHue())} degrees`);
      opacity.setAttribute("aria-valuetext", `${percentByte(color.a)} percent`);
      const hueTrackKey = `${space}:${at.x.toFixed(4)}:${at.y.toFixed(4)}`;
      if (hueTrackKey !== lastHueTrack) {
        lastHueTrack = hueTrackKey;
        hue.style.setProperty("--dial-color-track-bg", hueStops());
      }
      hue.style.setProperty("--dial-color-thumb", opaque);
      opacity.style.setProperty("--dial-color-thumb", formatColor(color, "hex"));
      opacity.style.setProperty("--dial-color-opaque", opaque);
      formatButtons.forEach((button, i) => {
        const active = FORMATS[i] === format;
        button.setAttribute("aria-checked", String(active));
        button.tabIndex = active ? 0 : -1;
        button.dataset.active = String(active);
        if (active) formatPill.style.transform = `translateX(${i * 100}%)`;
      });
      syncChannels();
      cancelAnimationFrame(paintFrame);
      paintFrame = requestAnimationFrame(paint);
    };
    hue.addEventListener("input", () => {
      const h25 = Number(hue.value);
      const at = handle();
      if (space === "oklch") {
        commit({ ...color, h: h25, c: saturation * maxChroma(color.l, h25) });
      } else {
        srgbHue = wrapHue(h25);
        commit(colorAt(at.x, at.y));
      }
    });
    opacity.addEventListener("input", () => commit({ ...color, a: Number(opacity.value) / 100 }));
    const move = (e) => {
      const rect = plane.getBoundingClientRect();
      commit(colorAt(clamp((e.clientX - rect.left) / rect.width), clamp((e.clientY - rect.top) / rect.height)));
    };
    plane.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      plane.focus({ preventScroll: true });
      plane.setPointerCapture(e.pointerId);
      move(e);
    });
    plane.addEventListener("keydown", (e) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      e.preventDefault();
      const step = e.shiftKey ? 0.1 : 0.01;
      const at = handle();
      const x = clamp(at.x + (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0));
      const y = clamp(at.y + (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0));
      commit(colorAt(x, y));
    });
    plane.addEventListener("pointermove", (e) => {
      if (plane.hasPointerCapture(e.pointerId)) move(e);
    });
    plane.addEventListener("pointerup", (e) => {
      if (plane.hasPointerCapture(e.pointerId)) plane.releasePointerCapture(e.pointerId);
    });
    popup.addEventListener("keydown", (e) => {
      if (inline) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
      if (e.key === "Tab") {
        const first = formatButtons.find((button) => button.tabIndex === 0);
        if (e.shiftKey && document.activeElement === first || !e.shiftKey && document.activeElement === alphaInput) {
          swatch.focus({ preventScroll: true });
          close();
        }
      }
      if (!isHintKey(e)) e.stopPropagation();
    });
    popup.append(formatRow, plane, tracks, fieldsRow);
    root.append(popup);
    rebuildFields();
    const updatePosition = () => {
      if (!popup) return;
      if (!host.isConnected || row.getClientRects().length === 0) {
        close();
        return;
      }
      const p = getDropdownPosition(row, root, { dropdownHeight: popup.scrollHeight + 2, width: 280, maxHeight: 480, preferSide: true, fixed: true, gap: 8 });
      Object.assign(popup.style, { left: `${p.left}px`, top: `${p.top}px`, width: `${p.width}px`, maxHeight: `${p.maxHeight}px`, transformOrigin: p.above ? "bottom" : "top" });
    };
    updatePicker();
    if (inline) return;
    stopPosition = observeDropdownPosition(row, updatePosition, () => popup);
    row.dataset.open = "true";
    swatch.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focusOutside);
    if (event instanceof MouseEvent && event.detail > 0) popup.focus({ preventScroll: true });
    else formatButtons.find((button) => button.getAttribute("aria-checked") === "true")?.focus({ preventScroll: true });
  };
  swatch.addEventListener("click", open);
  render();
  if (inline) open();
  return {
    update(next) {
      const parsed = parseColor(next.value);
      if (parsed && next.value !== lastEmitted && next.value !== props.value) {
        color = { ...parsed, h: parsed.c < 1e-7 ? color.h : parsed.h };
        rememberHue(color);
      }
      props = next;
      render();
    },
    destroy() {
      close();
      row.remove();
    }
  };
}

// src/vue/components/ColorControl.ts
var ColorControl = defineComponent2({
  name: "DialKitColorControl",
  props: { label: { type: String, required: true }, value: { type: String, required: true } },
  emits: ["change"],
  setup(props, { emit }) {
    const host = ref2();
    let control;
    const options = () => ({ label: props.label, value: props.value, onChange: (value) => emit("change", value) });
    onMounted4(() => {
      control = mountColorControl(host.value, options());
    });
    watchEffect(() => {
      const next = options();
      control?.update(next);
    });
    onUnmounted4(() => control?.destroy());
    return () => h2("div", { ref: host, class: "dialkit-color-host" });
  }
});

// src/vue/components/ImageControl.ts
import { defineComponent as defineComponent3, h as h3, onMounted as onMounted5, onUnmounted as onUnmounted5, ref as ref3, watchEffect as watchEffect2 } from "vue";

// src/image-control.ts
var imageControlId = 0;
var MAX_FILE_SIZE = 10 * 1024 * 1024;
var PICKER_HINTS2 = {
  upload: "Adds an image from your computer.",
  clear: "Removes the image."
};
var isHintKey2 = (event) => event.key.toLowerCase() === HintStore.getKey() && !(event.target instanceof HTMLInputElement);
function element3(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  if (tag === "button") el.type = "button";
  return el;
}
function icon(kind) {
  const svg2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg2.setAttribute("viewBox", "0 0 24 24");
  svg2.setAttribute("fill", "none");
  svg2.setAttribute("stroke", "currentColor");
  svg2.setAttribute("stroke-width", "1.5");
  svg2.setAttribute("stroke-linecap", "round");
  svg2.setAttribute("stroke-linejoin", "round");
  svg2.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(svg2.namespaceURI, "path");
  path.setAttribute("d", kind === "upload" ? "M12 16V3m-4 4 4-4 4 4M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" : "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm-2 13 5-5 4 4 3-3 6 6M15 7h.01");
  svg2.append(path);
  return svg2;
}
function imageLabel(value) {
  if (!value) return "No image";
  if (value.startsWith("data:") || value.startsWith("blob:")) return "Uploaded image";
  const name = value.split(/[?#]/)[0].split("/").filter(Boolean).pop();
  try {
    return name ? decodeURIComponent(name) : "Image";
  } catch {
    return name || "Image";
  }
}
function imageOptions(options = [], uploaded = [], value = "") {
  const unique = /* @__PURE__ */ new Map();
  for (const option of [...options, ...uploaded]) {
    const item = typeof option === "string" ? { value: option, label: imageLabel(option) } : option;
    if (item.value && !unique.has(item.value)) unique.set(item.value, item);
  }
  if (value && !unique.has(value)) unique.set(value, { value, label: imageLabel(value) });
  return [...unique.values()];
}
function preview(className) {
  const frame = element3("span", `dialkit-image-frame ${className}`);
  const fallback = element3("span", "dialkit-image-fallback");
  fallback.append(icon("image"));
  const img = element3("img", "dialkit-image-img");
  img.alt = "";
  img.draggable = false;
  img.decoding = "async";
  img.hidden = true;
  frame.append(fallback, img);
  let current;
  img.addEventListener("load", () => {
    img.hidden = false;
    fallback.hidden = true;
  });
  img.addEventListener("error", () => {
    img.hidden = true;
    fallback.hidden = false;
  });
  return {
    frame,
    update(value) {
      if (value === current) return;
      current = value;
      img.hidden = true;
      fallback.hidden = false;
      if (value) img.src = value;
      else img.removeAttribute("src");
    }
  };
}
function mountImageControl(host, initial, presentation = "popover") {
  const inline = presentation === "inline";
  let props = initial;
  const uploaded = [];
  let popup;
  let stopPosition;
  let updatePicker = () => {
  };
  let resetUpload = () => {
  };
  let reader;
  let uploadRequest = 0;
  const popupId = `dialkit-image-picker-${++imageControlId}`;
  let hinted = [];
  const hint = (part, text) => {
    if (!text) return;
    hinted.push(part);
    part.addEventListener("pointerenter", () => HintStore.enter(part, text));
    part.addEventListener("pointerleave", () => HintStore.leave(part));
  };
  const unhint = (parts) => {
    parts.forEach((part) => {
      HintStore.leave(part);
      HintStore.hide(part);
    });
    hinted = hinted.filter((part) => !parts.includes(part));
  };
  const trigger = element3("button", "dialkit-image-control");
  const label = element3("span", "dialkit-image-label");
  const name = element3("span", "dialkit-image-value");
  const thumbnail = preview("dialkit-image-thumbnail");
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-expanded", "false");
  trigger.append(label, name, thumbnail.frame);
  const fileInput = element3("input", "dialkit-image-file");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.hidden = true;
  host.append(trigger, fileInput);
  if (inline) trigger.style.display = "none";
  const choices = () => imageOptions(props.options, uploaded, props.value);
  const render = () => {
    label.textContent = props.label;
    name.textContent = choices().find((item) => item.value === props.value)?.label ?? "No image";
    trigger.setAttribute("aria-label", `Choose ${props.label.toLowerCase()} image: ${name.textContent}`);
    thumbnail.update(props.value);
    updatePicker();
  };
  const commit = (value) => {
    props = { ...props, value };
    render();
    props.onChange(value);
  };
  const close = (restoreFocus = false) => {
    uploadRequest++;
    reader?.abort();
    reader = void 0;
    fileInput.onchange = null;
    stopPosition?.();
    stopPosition = void 0;
    popup?.remove();
    popup = void 0;
    unhint(hinted);
    updatePicker = () => {
    };
    resetUpload = () => {
    };
    delete trigger.dataset.open;
    trigger.setAttribute("aria-expanded", "false");
    trigger.removeAttribute("aria-controls");
    document.removeEventListener("pointerdown", outside);
    document.removeEventListener("focusin", focusOutside);
    if (restoreFocus) trigger.focus({ preventScroll: true });
  };
  const outside = (event) => {
    if (!popup?.contains(event.target) && !host.contains(event.target)) close();
  };
  const focusOutside = (event) => {
    if (!popup?.contains(event.target) && !host.contains(event.target)) close();
  };
  const open = (event) => {
    if (popup) {
      if (!inline) close();
      return;
    }
    const root = inline ? host : getDialKitPortalRoot(host) ?? host;
    popup = element3("div", "dialkit-image-popover");
    popup.tabIndex = -1;
    popup.dataset.presentation = presentation;
    popup.style.position = inline ? "static" : "fixed";
    popup.id = popupId;
    popup.setAttribute("role", inline ? "group" : "dialog");
    const heading = element3("div", "dialkit-image-heading");
    const title = element3("span", "dialkit-image-title");
    const clear = element3("button", "dialkit-image-clear", "Remove");
    clear.addEventListener("click", () => {
      commit("");
      if (!inline) close(true);
    });
    heading.append(title, clear);
    hint(clear, PICKER_HINTS2.clear);
    const grid = element3("div", "dialkit-image-grid");
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", "Available images");
    const empty = element3("div", "dialkit-image-empty", "Choose an image to get started.");
    const upload = element3("button", "dialkit-button dialkit-image-upload");
    const uploadText = element3("span", "", "Upload image");
    upload.append(icon("upload"), uploadText);
    hint(upload, PICKER_HINTS2.upload);
    const status = element3("div", "dialkit-image-status");
    status.setAttribute("role", "status");
    status.hidden = true;
    upload.addEventListener("click", () => {
      if (!busy) fileInput.click();
    });
    let buttons = [];
    let previousItems = [];
    let busy = false;
    const setBusy = (next) => {
      busy = next;
      upload.setAttribute("aria-disabled", String(next));
      uploadText.textContent = next ? "Loading image\u2026" : "Upload image";
      grid.setAttribute("aria-busy", String(next));
    };
    resetUpload = () => {
      uploadRequest++;
      reader?.abort();
      reader = void 0;
      setBusy(false);
      status.hidden = true;
    };
    const acceptFile = (file) => {
      if (busy) return;
      status.hidden = true;
      if (!file.type.startsWith("image/") || file.size > MAX_FILE_SIZE) {
        status.textContent = file.size > MAX_FILE_SIZE ? "Choose an image smaller than 10 MB." : "Choose an image file, such as PNG, JPG, WebP, GIF, or SVG.";
        status.hidden = false;
        return;
      }
      const request = ++uploadRequest;
      setBusy(true);
      const fail = () => {
        if (request !== uploadRequest) return;
        setBusy(false);
        status.textContent = "This image could not be opened. Try another file.";
        status.hidden = false;
      };
      reader = new FileReader();
      reader.addEventListener("error", fail);
      reader.addEventListener("load", () => {
        if (request !== uploadRequest) return;
        const value = reader?.result;
        reader = void 0;
        if (typeof value !== "string") {
          fail();
          return;
        }
        const check = new Image();
        check.onerror = fail;
        check.onload = () => {
          if (request !== uploadRequest) return;
          setBusy(false);
          if (!uploaded.some((item) => item.value === value)) uploaded.push({ value, label: file.name });
          commit(value);
          buttons.find((button) => button.getAttribute("aria-pressed") === "true")?.focus({ preventScroll: true });
        };
        check.src = value;
      });
      reader.readAsDataURL(file);
    };
    fileInput.onchange = () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (file) acceptFile(file);
    };
    popup.addEventListener("dragover", (event2) => {
      if (!event2.dataTransfer?.types.includes("Files")) return;
      event2.preventDefault();
      event2.dataTransfer.dropEffect = "copy";
      popup.dataset.dragging = "true";
    });
    popup.addEventListener("dragleave", (event2) => {
      if (!popup?.contains(event2.relatedTarget)) delete popup.dataset.dragging;
    });
    popup.addEventListener("drop", (event2) => {
      event2.preventDefault();
      delete popup.dataset.dragging;
      const file = event2.dataTransfer?.files[0];
      if (file) acceptFile(file);
    });
    grid.addEventListener("keydown", (event2) => {
      if (event2.metaKey || event2.ctrlKey || event2.altKey) return;
      const index = buttons.indexOf(document.activeElement);
      if (index < 0) return;
      const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
      const next = event2.key === "ArrowRight" ? index + 1 : event2.key === "ArrowLeft" ? index - 1 : event2.key === "ArrowDown" ? index + columns : event2.key === "ArrowUp" ? index - columns : event2.key === "Home" ? 0 : event2.key === "End" ? buttons.length - 1 : void 0;
      if (next === void 0) return;
      event2.preventDefault();
      const button = buttons[Math.max(0, Math.min(buttons.length - 1, next))];
      buttons.forEach((item) => {
        item.tabIndex = item === button ? 0 : -1;
      });
      button.focus({ preventScroll: true });
      button.scrollIntoView({ block: "nearest" });
    });
    popup.addEventListener("keydown", (event2) => {
      if (inline) return;
      if (!isHintKey2(event2)) event2.stopPropagation();
      if (event2.key === "Escape") {
        event2.preventDefault();
        close(true);
      }
      if (event2.key === "Tab") {
        const first = clear.hidden ? buttons.find((button) => button.tabIndex === 0) ?? upload : clear;
        if (event2.shiftKey && document.activeElement === first || !event2.shiftKey && document.activeElement === upload) {
          const next = adjacentTabStop(trigger, event2.shiftKey);
          close(true);
          if (next) {
            event2.preventDefault();
            next.focus();
          }
        }
      }
    });
    updatePicker = () => {
      popup?.setAttribute("aria-label", `${props.label} image picker`);
      title.textContent = props.label;
      clear.hidden = !props.value;
      if (clear.hidden) {
        HintStore.leave(clear);
        HintStore.hide(clear);
      }
      clear.setAttribute("aria-label", `Remove ${props.label.toLowerCase()} image`);
      const items = choices();
      empty.hidden = items.length > 0;
      grid.hidden = items.length === 0;
      if (items.length !== previousItems.length || items.some((item, i) => item.value !== previousItems[i].value || item.label !== previousItems[i].label)) {
        const focusedIndex = buttons.indexOf(document.activeElement);
        previousItems = items;
        unhint(buttons);
        buttons = items.map((item) => {
          const button = element3("button", "dialkit-image-option");
          button.setAttribute("aria-label", item.label);
          hint(button, item.label);
          const thumb = preview("dialkit-image-option-preview");
          thumb.update(item.value);
          button.append(thumb.frame);
          button.addEventListener("click", () => {
            resetUpload();
            commit(item.value);
          });
          return button;
        });
        grid.replaceChildren(...buttons);
        if (focusedIndex >= 0) buttons[Math.min(focusedIndex, buttons.length - 1)]?.focus({ preventScroll: true });
      }
      const selected = items.findIndex((item) => item.value === props.value);
      buttons.forEach((button, index) => {
        button.setAttribute("aria-pressed", String(index === selected));
        button.tabIndex = index === Math.max(0, selected) ? 0 : -1;
      });
    };
    popup.append(heading, grid, empty, upload, status);
    root.append(popup);
    render();
    const position = () => {
      if (!popup) return;
      if (!host.isConnected || trigger.getClientRects().length === 0) {
        close();
        return;
      }
      const p = getDropdownPosition(trigger, root, { dropdownHeight: popup.scrollHeight + 2, width: 320, maxHeight: 560, preferSide: true, fixed: true, gap: 8 });
      Object.assign(popup.style, { left: `${p.left}px`, top: `${p.top}px`, width: `${p.width}px`, maxHeight: `${p.maxHeight}px`, transformOrigin: p.above ? "bottom" : "top" });
    };
    if (inline) return;
    stopPosition = observeDropdownPosition(trigger, position, () => popup);
    trigger.dataset.open = "true";
    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute("aria-controls", popupId);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focusOutside);
    if (event instanceof MouseEvent && event.detail > 0) popup.focus({ preventScroll: true });
    else (buttons.find((button) => button.tabIndex === 0) ?? upload).focus({ preventScroll: true });
  };
  trigger.addEventListener("click", open);
  trigger.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
    if (event.key === "ArrowDown" && !popup) {
      event.preventDefault();
      open();
    }
  });
  render();
  if (inline) open();
  return {
    update(next) {
      if (next.value !== props.value) resetUpload();
      props = next;
      render();
    },
    destroy() {
      close();
      fileInput.onchange = null;
      trigger.remove();
      fileInput.remove();
    }
  };
}

// src/vue/components/ImageControl.ts
var ImageControl = defineComponent3({
  name: "DialKitImageControl",
  props: { options: Array, label: { type: String, required: true }, value: { type: String, required: true } },
  emits: ["change"],
  setup(props, { emit }) {
    const host = ref3();
    let control;
    const options = () => ({ label: props.label, value: props.value, options: props.options, onChange: (value) => emit("change", value) });
    onMounted5(() => {
      control = mountImageControl(host.value, options());
    });
    watchEffect2(() => {
      const next = options();
      control?.update(next);
    });
    onUnmounted5(() => control?.destroy());
    return () => h3("div", { ref: host, class: "dialkit-image-host" });
  }
});

// src/vue/components/DialPad.ts
import { defineComponent as defineComponent4, h as h4, onMounted as onMounted6, onUnmounted as onUnmounted6, ref as ref4, watchEffect as watchEffect3 } from "vue";

// src/dial-pad-control.ts
var nextId = 0;
function element4(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  return el;
}
function mountDialPad(host, initial) {
  let props = initial;
  let value = normalizePadValue(props.value, props);
  let drag;
  const root = element4("div", "dialkit-pad");
  const fields = element4("div", "dialkit-pad-fields");
  const caption = element4("div", "dialkit-pad-caption");
  const label = element4("span", "dialkit-pad-label");
  caption.append(label);
  fields.append(caption);
  const surface = element4("div", "dialkit-pad-surface");
  surface.tabIndex = 0;
  surface.setAttribute("role", "group");
  const plane = element4("div", "dialkit-pad-plane");
  plane.setAttribute("aria-hidden", "true");
  const grid = element4("div", "dialkit-pad-grid");
  grid.setAttribute("aria-hidden", "true");
  for (let index = 1; index < PAD_GRID_DIVISIONS; index++) {
    const vertical = element4("span", "dialkit-pad-grid-line dialkit-pad-grid-vertical");
    const horizontal = element4("span", "dialkit-pad-grid-line dialkit-pad-grid-horizontal");
    vertical.style.left = `${index / PAD_GRID_DIVISIONS * 100}%`;
    horizontal.style.top = `${index / PAD_GRID_DIVISIONS * 100}%`;
    grid.append(vertical, horizontal);
  }
  const center = element4("span", "dialkit-pad-center");
  const point = element4("span", "dialkit-pad-point");
  plane.append(center, point);
  surface.append(grid, plane);
  const instructions = element4("span", "dialkit-pad-instructions", "Arrow keys adjust each axis. Shift adjusts by ten steps. Home resets both axes. Hold Shift while dragging to lock an axis.");
  instructions.id = `dialkit-pad-help-${++nextId}`;
  surface.setAttribute("aria-describedby", instructions.id);
  const inputs = ["x", "y"].map((axis) => {
    const field = element4("label", "dialkit-pad-field");
    const name = element4("span", "dialkit-pad-axis");
    const input = element4("input", "dialkit-pad-value");
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.setAttribute("role", "spinbutton");
    field.append(name, input);
    fields.append(field);
    input.addEventListener("focus", () => input.select());
    let press;
    name.addEventListener("pointerdown", (event) => {
      if (!props.dragFields || event.button !== 0) return;
      event.preventDefault();
      press = { id: event.pointerId, x: event.clientX, start: value[axis] };
      name.setPointerCapture(event.pointerId);
    });
    name.addEventListener("pointermove", (event) => {
      if (!press || event.pointerId !== press.id) return;
      const dx = event.clientX - press.x;
      if (Math.abs(dx) < 3) return;
      const range = resolvePadAxis(props[axis]);
      commit({ ...value, [axis]: press.start + dx * range.step * (event.shiftKey ? 10 : 1) });
    });
    const endPress = (event) => {
      if (!press || event.pointerId !== press.id) return;
      press = void 0;
      if (name.hasPointerCapture(event.pointerId)) name.releasePointerCapture(event.pointerId);
    };
    name.addEventListener("click", (event) => {
      if (props.dragFields) event.preventDefault();
    });
    name.addEventListener("pointerup", endPress);
    name.addEventListener("pointercancel", endPress);
    input.addEventListener("blur", () => {
      const number2 = input.value.trim() === "" ? NaN : Number(input.value);
      if (Number.isFinite(number2)) commit({ ...value, [axis]: number2 });
      input.value = String(value[axis]);
    });
    input.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        if (event.key === "Escape") input.value = String(value[axis]);
        input.blur();
        surface.focus({ preventScroll: true });
      } else if (!event.altKey && !event.metaKey && !event.ctrlKey && ["ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const range = resolvePadAxis(props[axis]);
        const draft = input.value.trim() === "" ? NaN : Number(input.value);
        const current = Number.isFinite(draft) ? draft : value[axis];
        const direction = event.key === "ArrowUp" ? 1 : -1;
        commit({ ...value, [axis]: snapPadAxis(current + direction * range.step * (event.shiftKey ? 10 : 1), range) });
        input.value = String(value[axis]);
      }
    });
    return { axis, name, input };
  });
  root.append(fields, surface, instructions);
  host.append(root);
  function render() {
    label.textContent = props.label;
    caption.hidden = !!props.hideLabel;
    root.toggleAttribute("data-no-label", !!props.hideLabel);
    root.toggleAttribute("data-drag-fields", !!props.dragFields);
    const names = { x: props.labels?.x ?? "X", y: props.labels?.y ?? "Y" };
    surface.setAttribute("aria-label", `${props.label}: ${names.x} ${value.x}, ${names.y} ${value.y}`);
    inputs.forEach(({ axis, name, input }) => {
      const range = resolvePadAxis(props[axis]);
      name.textContent = names[axis];
      input.setAttribute("aria-label", `${props.label} ${names[axis]}`);
      input.setAttribute("aria-valuemin", String(range.min));
      input.setAttribute("aria-valuemax", String(range.max));
      input.setAttribute("aria-valuenow", String(value[axis]));
      if (document.activeElement !== input) input.value = String(value[axis]);
      const fraction = padFraction(value[axis], range, props.mapping);
      point.style[axis === "x" ? "left" : "top"] = `${(axis === "x" ? fraction : 1 - fraction) * 100}%`;
    });
  }
  function commit(next) {
    const normalized = normalizePadValue(next, props);
    if (normalized.x === value.x && normalized.y === value.y) return;
    value = normalized;
    render();
    props.onChange({ ...value });
  }
  function endDrag() {
    const id = drag?.id;
    drag = void 0;
    delete surface.dataset.dragging;
    if (id !== void 0 && surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
  }
  function move(event, released = false) {
    if (!drag || event.pointerId !== drag.id) return;
    if (Math.max(Math.abs(event.clientX - drag.start.x), Math.abs(event.clientY - drag.start.y)) >= 3) {
      drag.moved = true;
      surface.dataset.dragging = "true";
    }
    const bounds = plane.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    let x = event.clientX - drag.offset.x;
    let y = event.clientY - drag.offset.y;
    if (released && !drag.moved && !event.shiftKey) {
      const gridBounds = grid.getBoundingClientRect();
      const intersection = padGridIntersection(event.clientX - gridBounds.left, event.clientY - gridBounds.top, gridBounds.width, gridBounds.height);
      if (intersection) {
        x = gridBounds.left + intersection.x;
        y = gridBounds.top + intersection.y;
      }
    }
    const next = padValueFromPoint(
      (x - bounds.left) / bounds.width,
      (y - bounds.top) / bounds.height,
      props
    );
    if (event.shiftKey) {
      if (!drag.lock) {
        const dx = Math.abs(event.clientX - drag.start.x);
        const dy = Math.abs(event.clientY - drag.start.y);
        if (Math.max(dx, dy) < 3) return;
        drag.lock = dx >= dy ? "x" : "y";
        drag.lockValue = { ...value };
      }
      const fixed = drag.lock === "x" ? "y" : "x";
      next[fixed] = drag.lockValue[fixed];
    } else {
      drag.lock = void 0;
      drag.lockValue = void 0;
    }
    commit(next);
  }
  surface.addEventListener("dblclick", () => commit(normalizePadValue(void 0, props)));
  surface.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || drag) return;
    event.preventDefault();
    surface.focus({ preventScroll: true });
    const bounds = point.getBoundingClientRect();
    const onPoint = event.target === point;
    drag = {
      id: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      value: { ...value },
      offset: onPoint ? { x: event.clientX - bounds.left - bounds.width / 2, y: event.clientY - bounds.top - bounds.height / 2 } : { x: 0, y: 0 },
      moved: false
    };
    surface.setPointerCapture(event.pointerId);
    move(event);
  });
  surface.addEventListener("pointermove", move);
  surface.addEventListener("pointerup", (event) => {
    if (event.pointerId !== drag?.id) return;
    move(event, true);
    endDrag();
  });
  surface.addEventListener("pointercancel", (event) => {
    if (event.pointerId === drag?.id) endDrag();
  });
  surface.addEventListener("lostpointercapture", (event) => {
    if (event.pointerId === drag?.id) endDrag();
  });
  surface.addEventListener("keydown", (event) => {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    const next = padValueFromKey(value, event.key, event.shiftKey, props);
    if (next || event.key === "Home" || event.key === "Escape" && drag) {
      event.preventDefault();
      event.stopPropagation();
      if (next) commit(next);
      else if (event.key === "Home") {
        endDrag();
        commit(normalizePadValue(void 0, props));
      } else if (drag) {
        const start = drag.value;
        endDrag();
        commit(start);
      }
    }
  });
  render();
  return {
    update(next) {
      props = next;
      value = normalizePadValue(next.value, props);
      render();
    },
    destroy() {
      endDrag();
      root.remove();
    }
  };
}

// src/vue/components/DialPad.ts
var DialPad = defineComponent4({
  name: "DialPad",
  props: {
    label: { type: String, required: true },
    value: { type: Object, required: true },
    x: Array,
    y: Array,
    labels: Object
  },
  emits: ["change"],
  setup(props, { emit }) {
    const host = ref4();
    let control;
    const options = () => ({ label: props.label, value: props.value, x: props.x, y: props.y, labels: props.labels, onChange: (value) => emit("change", value) });
    onMounted6(() => {
      control = mountDialPad(host.value, options());
    });
    watchEffect3(() => {
      const next = options();
      control?.update(next);
    });
    onUnmounted6(() => control?.destroy());
    return () => h4("div", { ref: host, class: "dialkit-pad-host" });
  }
});

// src/vue/components/BackgroundControl.ts
import { defineComponent as defineComponent5, h as h5, onMounted as onMounted7, onUnmounted as onUnmounted7, ref as ref5, watchEffect as watchEffect4 } from "vue";

// src/components/control-motion.ts
var CONTROL_ANIM = {
  initial: { opacity: 0, height: 0, marginBottom: -6, overflowY: "clip" },
  animate: { opacity: 1, height: "auto", marginBottom: 0, transitionEnd: { overflowY: "visible" } },
  exit: { opacity: 0, height: 0, marginBottom: -6, overflowY: "clip" },
  transition: {
    type: "spring",
    visualDuration: 0.25,
    bounce: 0.1
  }
};

// src/vanilla/animation.ts
function animateSpring(node, frame, visualDuration = 0.35, bounce = 0.1) {
  if (typeof node.animate !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return;
  const params = springParams({ type: "spring", visualDuration, bounce });
  const duration = springSettleDuration(params);
  const count = Math.max(2, Math.ceil(duration * 60));
  const frames = Array.from({ length: count + 1 }, (_, index) => frame(index === count ? 1 : springProgress(index / count * duration, params)));
  return node.animate(frames, { duration: duration * 1e3, easing: "linear" });
}

// src/shortcut-utils.ts
function getEffectiveStep(control, shortcut) {
  const min = control.min ?? 0;
  const max = control.max ?? 1;
  const range = max - min;
  const mode = shortcut.mode ?? "normal";
  return mode === "fine" ? range * 0.01 : mode === "coarse" ? range * 0.1 : control.step ?? 1;
}
function applySliderDelta(panelId, path, control, effectiveStep, direction) {
  const currentValue = DialStore.getValue(panelId, path);
  const min = control.min ?? 0;
  const max = control.max ?? 1;
  const newValue = Math.max(min, Math.min(max, currentValue + direction * effectiveStep));
  DialStore.updateValue(panelId, path, roundValue(newValue, effectiveStep, min, max));
}
function snapToDecile(rawValue, min, max) {
  const normalized = (rawValue - min) / (max - min);
  const nearest = Math.round(normalized * 10) / 10;
  if (Math.abs(normalized - nearest) <= 0.03125) {
    return min + nearest * (max - min);
  }
  return rawValue;
}
function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  if (el.closest('select, button, [role="slider"], [role="radio"], [role="listbox"], [role="menu"], [role="menuitem"], [role="menuitemradio"], [role="button"]')) return true;
  if (el.contentEditable === "true") return true;
  return false;
}
function getActiveModifier(e) {
  if (e.altKey) return "alt";
  if (e.shiftKey) return "shift";
  if (e.metaKey) return "meta";
  return void 0;
}
function findControl(controls, path) {
  for (const control of controls) {
    if (control.path === path) return control;
    if (control.type === "folder" && control.children) {
      const found = findControl(control.children, path);
      if (found) return found;
    }
  }
  return null;
}
var DRAG_SENSITIVITY = 4;
function formatInteractionLabel(interaction) {
  switch (interaction) {
    case "drag":
      return "Drag";
    case "move":
      return "Move";
    case "scroll-only":
      return "Scroll";
    default:
      return "Scroll";
  }
}
function formatSliderShortcut(sc) {
  const interaction = sc.interaction ?? "scroll";
  const actionLabel = formatInteractionLabel(interaction);
  if (!sc.key) return actionLabel;
  const mod = formatModifier(sc.modifier);
  return `${mod}${sc.key.toUpperCase()}+${actionLabel}`;
}
function formatToggleShortcut(sc) {
  if (!sc.key) return "Press";
  const mod = formatModifier(sc.modifier);
  return `${mod}${sc.key.toUpperCase()}`;
}
function formatModifier(modifier) {
  return modifier === "alt" ? "\u2325" : modifier === "shift" ? "\u21E7" : modifier === "meta" ? "\u2318" : "";
}

// src/text-autosize.ts
function observeTextSize(input) {
  const row = input.parentElement;
  const mirror = input.ownerDocument.createElement("textarea");
  mirror.className = input.className;
  mirror.rows = 1;
  mirror.tabIndex = -1;
  mirror.readOnly = true;
  mirror.inert = true;
  mirror.setAttribute("aria-hidden", "true");
  Object.assign(mirror.style, {
    position: "absolute",
    visibility: "hidden",
    pointerEvents: "none",
    top: "0",
    left: "0",
    height: "0",
    minHeight: "0",
    maxHeight: "none",
    overflow: "hidden",
    transition: "none"
  });
  row.append(mirror);
  let frame = 0;
  let width = 0;
  let disposed = false;
  const update = () => {
    if (disposed || !input.isConnected || !input.offsetWidth) return;
    const style = getComputedStyle(input);
    const lineHeight = parseFloat(style.lineHeight);
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const gutter = Math.max(0, input.offsetWidth - input.clientWidth - border);
    row.style.setProperty("--dial-text-gutter", `${gutter}px`);
    mirror.style.width = style.width;
    mirror.value = input.value || input.placeholder;
    const minimum = lineHeight + padding + border;
    const maximum = lineHeight * 5 + padding + border;
    const contentHeight = mirror.scrollHeight + border;
    const height = Math.max(minimum, Math.min(maximum, contentHeight));
    input.style.height = `${height}px`;
    input.style.overflowY = contentHeight > maximum ? "auto" : "hidden";
    if (contentHeight <= maximum) input.scrollTop = 0;
    const rowStyle = getComputedStyle(row);
    const rowInsets = parseFloat(rowStyle.paddingTop) + parseFloat(rowStyle.paddingBottom) + parseFloat(rowStyle.borderTopWidth) + parseFloat(rowStyle.borderBottomWidth);
    row.style.height = `${height + rowInsets}px`;
    if (!row.hasAttribute("data-autosized")) {
      void row.offsetHeight;
      row.setAttribute("data-autosized", "true");
    }
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  };
  const resize = new ResizeObserver(() => {
    if (input.offsetWidth === width) return;
    width = input.offsetWidth;
    schedule();
  });
  resize.observe(input);
  input.addEventListener("input", update);
  input.ownerDocument.fonts?.addEventListener("loadingdone", schedule);
  update();
  return {
    update,
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      input.removeEventListener("input", update);
      input.ownerDocument.fonts?.removeEventListener("loadingdone", schedule);
      mirror.remove();
      row.removeAttribute("data-autosized");
      row.style.removeProperty("height");
      row.style.removeProperty("--dial-text-gutter");
    }
  };
}

// src/vanilla/dom.ts
function element5(tag, className = "", text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== void 0)
    node.textContent = text;
  if (tag === "button")
    node.type = "button";
  return node;
}
function svg(tag, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs))
    node.setAttribute(key, String(value));
  return node;
}
function icon2(paths, className = "", viewBox = "0 0 24 24") {
  const node = svg("svg", { class: className, viewBox, fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" });
  for (const d of typeof paths === "string" ? [paths] : paths)
    node.append(svg("path", { d }));
  return node;
}

// src/slider-edit-delay.ts
function sliderEditDelay(el) {
  if (!el || typeof getComputedStyle !== "function") return 800;
  const ms = Number.parseFloat(getComputedStyle(el).getPropertyValue("--dial-slider-edit-delay"));
  return Number.isFinite(ms) && ms >= 0 ? ms : 800;
}

// src/vanilla/controls.ts
function mountFolder(host, initial) {
  let props = initial;
  let open = props.open ?? props.defaultOpen ?? true;
  const folder = element5("div", `dialkit-folder${props.isRoot ? " dialkit-folder-root" : ""}`);
  const header = element5("div", `dialkit-folder-header${props.isRoot ? " dialkit-panel-header" : ""}`);
  const top = element5("div", "dialkit-folder-header-top");
  const titleRow = element5("div", "dialkit-folder-title-row");
  const title = element5("span", `dialkit-folder-title${props.isRoot ? " dialkit-folder-title-root" : ""}`);
  titleRow.append(title);
  top.append(titleRow);
  const glyph = props.isRoot ? svg("svg", { class: "dialkit-panel-icon", viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" }) : icon2(ICON_CHEVRON, "dialkit-folder-icon");
  if (props.isRoot) {
    glyph.append(svg("path", { d: ICON_PANEL.path, fill: "currentColor", opacity: 0.5 }));
    ICON_PANEL.circles.forEach((c) => glyph.append(svg("circle", { ...c, fill: "currentColor", stroke: "currentColor", "stroke-width": 1.25 })));
  }
  if (!props.inline || !props.isRoot)
    top.append(glyph);
  const toolbar = element5("div", "dialkit-panel-toolbar");
  toolbar.addEventListener("click", (event) => event.stopPropagation());
  header.append(top);
  if (props.isRoot)
    header.append(toolbar);
  const content = element5("div", "dialkit-folder-content");
  const body = element5("div", "dialkit-folder-inner");
  content.append(body);
  folder.append(header, content);
  const node = props.isRoot ? element5("div", `dialkit-panel-inner${props.inline ? " dialkit-panel-inline" : ""}`) : folder;
  if (props.isRoot) {
    node.tabIndex = -1;
    node.append(folder);
  }
  host.append(node);
  let renderedOpen = open;
  let animation;
  const render = () => {
    const changed = renderedOpen !== open;
    const before = (props.isRoot ? node : content).getBoundingClientRect();
    if (changed)
      animation?.cancel();
    const wasOpen = renderedOpen;
    renderedOpen = open;
    folder.dataset.open = String(open);
    title.textContent = props.title;
    top.setAttribute("aria-label", props.title);
    top.setAttribute("aria-expanded", String(open));
    if (!(props.inline && props.isRoot)) {
      top.setAttribute("role", "button");
      top.tabIndex = 0;
    }
    content.style.display = open ? "" : "none";
    content.inert = !open;
    if (props.isRoot) {
      toolbar.style.display = open ? "" : "none";
      titleRow.style.display = open ? "" : "none";
      node.dataset.collapsed = String(!open);
      if (!props.inline)
        Object.assign(node.style, open ? { width: "280px", height: "auto", maxHeight: "calc(100dvh - 32px)", borderRadius: "14px", boxShadow: "var(--dial-shadow)", overflowX: "hidden", overflowY: "auto", cursor: "" } : { width: "42px", height: "42px", maxHeight: "42px", borderRadius: "50%", boxShadow: "var(--dial-shadow-collapsed)", overflow: "hidden", cursor: "pointer" });
    } else {
      glyph.style.transform = open ? "" : "rotate(180deg)";
      glyph.style.transition = "transform 250ms ease";
    }
    if (changed && before.width > 0) {
      if (props.isRoot && !props.inline) {
        const after = node.getBoundingClientRect();
        node.style.maxHeight = "calc(100dvh - 32px)";
        animation = animateSpring(node, (p) => ({ width: `${before.width + (after.width - before.width) * p}px`, height: `${before.height + (after.height - before.height) * p}px`, borderRadius: `${(wasOpen ? 14 : 21) + (open ? -7 : 7) * p}px` }));
      } else if (!props.isRoot) {
        content.style.display = "";
        const targetHeight = open ? content.scrollHeight : 0;
        animation = animateSpring(content, (p) => ({ height: `${before.height + (targetHeight - before.height) * p}px`, opacity: wasOpen ? 1 - p : p, clipPath: "inset(0 -20px)" }));
        if (!open) {
          if (animation)
            animation.onfinish = () => {
              if (!open)
                content.style.display = "none";
            };
          else
            content.style.display = "none";
        }
      }
    }
  };
  const toggle = () => {
    if (props.inline && props.isRoot)
      return;
    open = !open;
    render();
    props.onOpenChange?.(open);
  };
  header.addEventListener("click", (event) => {
    event.stopPropagation();
    toggle();
  });
  top.addEventListener("keydown", (event) => activateOnKey(event, toggle));
  if (props.isRoot)
    node.addEventListener("click", () => {
      if (!open)
        toggle();
    });
  render();
  return {
    element: node,
    body,
    toolbar,
    update(next) {
      props = next;
      open = next.open ?? open;
      render();
    },
    destroy() {
      animation?.cancel();
      node.remove();
    }
  };
}

// src/dropdown-keyboard.ts
var dropdownId = 0;
function observeDropdownKeyboard(trigger, getPopup, close, kind = "select") {
  let frame = 0;
  let dispose;
  let stopped = false;
  const connect = () => {
    if (stopped || dispose) return;
    const popup = getPopup();
    if (!popup?.isConnected) {
      frame = requestAnimationFrame(() => connect());
      return;
    }
    popup.inert = false;
    popup.removeAttribute("aria-hidden");
    popup.id || (popup.id = `dialkit-dropdown-${++dropdownId}`);
    popup.setAttribute("role", kind === "select" ? "listbox" : kind === "presets" ? "menu" : "dialog");
    popup.setAttribute("aria-label", trigger.getAttribute("aria-label") || trigger.querySelector(".dialkit-select-label")?.textContent?.trim() || trigger.getAttribute("title") || trigger.textContent?.trim() || "Options");
    popup.tabIndex = -1;
    trigger.setAttribute("aria-controls", popup.id);
    const selector = kind === "select" ? ".dialkit-select-option" : ".dialkit-preset-name, .dialkit-preset-more, .dialkit-preset-actions > .dialkit-preset-lock, .dialkit-preset-actions-group > button, .dialkit-preset-direct, .dialkit-preset-create";
    let active;
    let activeIndex = 0;
    let query = "";
    let typedAt = 0;
    let leaving = false;
    const items = () => Array.from(popup.querySelectorAll(selector)).filter((el) => !el.hasAttribute("disabled"));
    const focusItem = (index) => {
      const options = items();
      activeIndex = Math.max(0, Math.min(options.length - 1, index));
      active = options[activeIndex];
      (active ?? popup).focus({ preventScroll: true });
      active?.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    const refresh = () => {
      if (trigger.matches(":disabled")) {
        leaving = true;
        const previous = adjacentTabStop(trigger, true);
        close();
        queueMicrotask(() => previous?.focus());
        return;
      }
      const options = items();
      options.forEach((el) => {
        el.tabIndex = -1;
        el.setAttribute("role", kind === "select" ? "option" : !el.classList.contains("dialkit-preset-name") ? "menuitem" : "menuitemradio");
        if (kind === "select") el.setAttribute("aria-selected", el.dataset.selected ?? "false");
        else if (el.classList.contains("dialkit-preset-name")) el.setAttribute("aria-checked", el.parentElement?.dataset.active ?? "false");
      });
      if (active && !active.isConnected && !leaving && !popup.contains(document.activeElement)) focusItem(activeIndex);
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(popup, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-active", "data-selected"] });
    const restore = () => {
      leaving = true;
      trigger.focus({ preventScroll: true });
    };
    const keydown = (event) => {
      if (event.altKey || event.metaKey || event.ctrlKey || event.isComposing) return;
      if (event.target.matches("input, textarea")) return;
      if (event.key === "Tab") {
        const next2 = adjacentTabStop(trigger, event.shiftKey);
        restore();
        close();
        if (next2) {
          event.preventDefault();
          event.stopPropagation();
          queueMicrotask(() => next2.focus());
        }
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        restore();
        close();
        return;
      }
      const options = items();
      const index = options.indexOf(document.activeElement);
      const next = optionKeyIndex(event.key, Math.max(0, index), options.length);
      if (next !== void 0) {
        event.preventDefault();
        event.stopPropagation();
        focusItem(next);
        return;
      }
      if (["Enter", " "].includes(event.key) && index >= 0) {
        event.preventDefault();
        event.stopPropagation();
        options[index].click();
        return;
      }
      if (event.key.length === 1 && event.key !== " " && event.key.toLowerCase() !== HintStore.getKey()) {
        const now = Date.now();
        query = now - typedAt < 700 ? query + event.key.toLocaleLowerCase() : event.key.toLocaleLowerCase();
        typedAt = now;
        const search = [...query].every((c) => c === query[0]) ? query[0] : query;
        for (let offset = search.length > 1 ? 0 : 1; offset <= options.length; offset++) {
          const candidate = (Math.max(0, index) + offset) % options.length;
          if (options[candidate]?.textContent?.trim().toLocaleLowerCase().startsWith(search)) {
            focusItem(candidate);
            break;
          }
        }
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const click = (event) => {
      const target = event.target.closest(selector);
      if (target && !target.classList.contains("dialkit-preset-delete")) restore();
    };
    const focusin = (event) => {
      const target = event.target;
      if (!leaving && !popup.contains(target) && !trigger.contains(target)) {
        leaving = true;
        close();
      }
    };
    popup.addEventListener("keydown", keydown);
    popup.addEventListener("click", click, true);
    document.addEventListener("focusin", focusin);
    let stopPosition;
    if (kind !== "select") {
      const root = getDialKitPortalRoot(trigger);
      if (root) {
        popup.dataset.theme = root.dataset.theme ?? "dark";
        const styles = getComputedStyle(root);
        for (const property of Array.from(styles)) {
          if (property.startsWith("--dial-")) popup.style.setProperty(property, styles.getPropertyValue(property));
        }
      }
      const position = () => {
        const pos = getDropdownPosition(trigger, root ?? document.body, { fixed: true, dropdownHeight: popup.scrollHeight + 2, width: kind === "help" ? 280 : trigger.getBoundingClientRect().width });
        Object.assign(popup.style, { position: "fixed", top: `${pos.top}px`, left: `${pos.left}px`, right: "auto", maxHeight: `${pos.maxHeight}px` });
        if (kind === "presets" && popup.style.maxWidth) Object.assign(popup.style, { width: "auto", minWidth: `${pos.width}px` });
        else Object.assign(popup.style, { width: `${pos.width}px`, minWidth: "0" });
      };
      stopPosition = observeDropdownPosition(trigger, position, () => popup);
    }
    const selected = items().findIndex((el) => el.dataset.selected === "true" || el.classList.contains("dialkit-preset-name") && el.parentElement?.dataset.active === "true");
    focusItem(Math.max(0, selected));
    dispose = () => {
      leaving = true;
      if (popup.contains(document.activeElement)) trigger.focus({ preventScroll: true });
      popup.inert = true;
      popup.setAttribute("aria-hidden", "true");
      observer.disconnect();
      stopPosition?.();
      popup.removeEventListener("keydown", keydown);
      popup.removeEventListener("click", click, true);
      document.removeEventListener("focusin", focusin);
      trigger.removeAttribute("aria-controls");
    };
  };
  frame = requestAnimationFrame(() => connect());
  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
    dispose?.();
  };
}

// src/vanilla/menus.ts
var MENU_SPRING = { visualDuration: 0.15, bounce: 0 };
var CHEVRON_SPRING = { visualDuration: 0.2, bounce: 0.15 };
var menuFrame = (above, shown) => ({
  opacity: shown,
  transform: `translateY(${(1 - shown) * (above ? 8 : -8)}px) scale(${0.95 + 0.05 * shown})`
});
function popupMenu(trigger, className, kind, populate) {
  let popup;
  let stopKeyboard, stopPosition;
  let above = false;
  let chevronTurn = 0;
  const turnChevron = (to) => {
    const chevron = trigger.querySelector(".dialkit-select-chevron");
    if (!chevron || to === chevronTurn) return;
    const from = chevronTurn;
    chevronTurn = to;
    chevron.style.transform = `rotate(${to}deg)`;
    animateSpring(chevron, (p) => ({ transform: `rotate(${from + (to - from) * p}deg)` }), CHEVRON_SPRING.visualDuration, CHEVRON_SPRING.bounce);
  };
  const outside = (event) => {
    if (!trigger.contains(event.target) && !popup?.contains(event.target))
      close();
  };
  function close() {
    stopKeyboard?.();
    stopPosition?.();
    stopKeyboard = stopPosition = void 0;
    const leaving = popup;
    popup = void 0;
    turnChevron(0);
    if (leaving) {
      leaving.inert = true;
      leaving.style.pointerEvents = "none";
      const from = above;
      const out = animateSpring(leaving, (p) => menuFrame(from, 1 - p), MENU_SPRING.visualDuration, MENU_SPRING.bounce);
      if (out) out.finished.then(() => leaving.remove(), () => leaving.remove());
      else leaving.remove();
    }
    trigger.dataset.open = "false";
    trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", outside);
  }
  function open() {
    if (popup || trigger.disabled)
      return;
    const root = getDialKitPortalRoot(trigger) ?? document.body;
    popup = element5("div", className);
    popup.style.position = "fixed";
    root.append(popup);
    populate(popup);
    trigger.dataset.open = "true";
    trigger.setAttribute("aria-expanded", "true");
    stopPosition = observeDropdownPosition(trigger, () => {
      if (!popup)
        return;
      if (!trigger.isConnected || !trigger.getClientRects().length) {
        close();
        return;
      }
      const p = getDropdownPosition(trigger, root, { fixed: true, dropdownHeight: popup.scrollHeight + 2, ...kind === "help" ? { width: 280 } : {} });
      above = p.above;
      Object.assign(popup.style, { top: `${p.top}px`, left: `${p.left}px`, width: `${p.width}px`, maxHeight: `${p.maxHeight}px`, transformOrigin: p.above ? "bottom" : "top" });
    }, () => popup);
    const entering = popup;
    animateSpring(entering, (p) => menuFrame(above, p), MENU_SPRING.visualDuration, MENU_SPRING.bounce);
    turnChevron(180);
    stopKeyboard = observeDropdownKeyboard(trigger, () => popup, close, kind);
    document.addEventListener("pointerdown", outside);
  }
  const click = () => {
    if (popup)
      close();
    else
      open();
  };
  const key = (e) => openDropdownOnKey(e, open);
  trigger.setAttribute("aria-haspopup", kind === "select" ? "listbox" : kind === "presets" ? "menu" : "dialog");
  trigger.setAttribute("aria-expanded", "false");
  trigger.addEventListener("click", click);
  trigger.addEventListener("keydown", key);
  return {
    close,
    refresh() {
      if (popup)
        populate(popup);
    },
    destroy() {
      close();
      trigger.removeEventListener("click", click);
      trigger.removeEventListener("keydown", key);
    }
  };
}

// src/background-control.ts
var MODE_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "gradient", label: "Gradient" },
  { value: "media", label: "Media" }
];
var SHAPE_LABEL = { linear: "Linear", radial: "Radial", angular: "Angular", diamond: "Diamond" };
var ICON_ROTATE = ["M19.5 12a7.5 7.5 0 1 1-2.2-5.3", "M19.5 4.5v3.75h-3.75"];
var FIT_LABEL = { fill: "Fill", fit: "Fit", stretch: "Stretch", tile: "Tile" };
var RATIO_LABEL = (ratio) => ratio === "source" ? "Source" : ratio;
var ICON_IMAGE = ["M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z", "M4 16l4.5-4.5 4 4 2.5-2.5L20 18", "M15 9.5h.01"];
var BG_HINTS = {
  mode: {
    solid: "Fills the background with one color.",
    gradient: "Fills the background with a gradient.",
    media: "Fills the background with an image or a video."
  },
  shapeTrigger: "Changes how the colors spread.",
  shape: {
    linear: "The colors run along a straight line.",
    radial: "The colors grow out from a point, in circles.",
    angular: "The colors turn around a point.",
    diamond: "The colors grow out from a point, as a diamond."
  },
  flip: "Reverses the order of the stops.",
  rotate: "Turns the gradient a quarter turn clockwise.",
  bar: "Click to add a stop here.",
  handle: "Drag to move this stop. Drag it off the bar to remove it. Double-click to change its color.",
  add: "Adds a stop in the middle of the widest gap.",
  grip: "Drag to change the order of the stops.",
  swatch: "Opens the color picker and shows the gradient's handles on the canvas.",
  position: "Where the stop sits along the gradient, from 0 to 100%.",
  save: "Keeps this gradient in your list, for any board.",
  saved: "Click to use this gradient.",
  savedDelete: "Deletes this saved gradient.",
  drop: "Drop an image or a video here, or click to pick one.",
  preview: "Opens the options for how the media fills the canvas.",
  sizing: "How the media fills the canvas.",
  fit: {
    fill: "Covers the whole canvas. The media's edges may be cut off.",
    fit: "Shows all of the media inside the canvas.",
    stretch: "Fills the canvas and does not keep the media's shape.",
    tile: "Repeats the media across the canvas."
  },
  ratioSection: "The shape the media is cropped to.",
  ratio: (ratio) => ratio === "source" ? "Keeps the media's own shape." : `Crops the media to ${ratio}.`,
  tileSize: "How large each repeated tile is.",
  zoom: "Scales the media inside the canvas.",
  pin: "Which part of the media stays in view when it is cut off."
};
var REMOVE_DISTANCE = 24;
var PIN_COLUMNS = ["Left", "Center", "Right"];
var PIN_ROWS = ["Top", "Middle", "Bottom"];
var ICON_MINUS = "M5 12H19";
var GRIP_STYLES = { 1: "row", 2: "margin", 3: "column", 4: "column-hover" };
var ROW_DRAG_EXCLUDE = "input, textarea, button:not(.dialkit-bg-stop-grip), .dialkit-color-swatch, .dialkit-bg-field-unit, .dialkit-bg-field-grip";
var LAYOUT_SPRING = CONTROL_ANIM.transition;
var DRAG_LIFT_PX = 4;
function stripCss(gradient) {
  return backgroundGradientCss(gradient, "to right");
}
var reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var ICON_REVERSE = ["M7 7h13", "M16 3l4 4-4 4", "M17 17H4", "M8 13l-4 4 4 4"];
var ICON_UPLOAD = ["M12 16V3", "M8 7l4-4 4 4", "M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"];
var DRAG_THRESHOLD2 = 3;
var isHintKey3 = (e) => e.key.toLowerCase() === HintStore.getKey() && !(e.target instanceof HTMLInputElement);
function element6(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  if (el instanceof HTMLButtonElement) el.type = "button";
  return el;
}
function strokeIcon(paths) {
  const ns = "http://www.w3.org/2000/svg";
  const svg2 = document.createElementNS(ns, "svg");
  svg2.setAttribute("viewBox", "0 0 24 24");
  svg2.setAttribute("fill", "none");
  svg2.setAttribute("stroke", "currentColor");
  svg2.setAttribute("stroke-width", "2");
  svg2.setAttribute("stroke-linecap", "round");
  svg2.setAttribute("stroke-linejoin", "round");
  svg2.setAttribute("aria-hidden", "true");
  for (const d of typeof paths === "string" ? [paths] : paths) {
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", d);
    svg2.append(path);
  }
  return svg2;
}
function iconButton(className, label, paths) {
  const button = element6("button", `dialkit-bg-icon-button ${className}`);
  button.setAttribute("aria-label", label);
  button.append(strokeIcon(paths));
  return button;
}
var clamp4 = (n, min, max) => Math.min(max, Math.max(min, n));
var formatNumber = (n) => String(Math.round(n * 10) / 10 || 0);
var errorMessage = (error, fallback) => error instanceof Error && error.message ? error.message : fallback;
function segmented(options, ariaLabel, onPick) {
  const group = element6("div", "dialkit-segmented dialkit-bg-segmented");
  group.setAttribute("data-fill", "");
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", ariaLabel);
  group.addEventListener("keydown", handleSegmentKey);
  const pill = element6("div", "dialkit-segmented-pill");
  pill.setAttribute("aria-hidden", "true");
  pill.style.width = `calc((100% - 8px) / ${options.length})`;
  group.append(pill);
  const buttons = options.map((option) => {
    const button = element6("button", "dialkit-segmented-button");
    button.setAttribute("role", "radio");
    button.append(element6("span", "dialkit-segmented-text", option.label));
    button.addEventListener("click", () => onPick(option.value));
    group.append(button);
    return button;
  });
  return {
    group,
    buttons,
    set(value) {
      options.forEach((option, i) => {
        const active = option.value === value;
        buttons[i].setAttribute("aria-checked", String(active));
        buttons[i].dataset.active = String(active);
        buttons[i].tabIndex = active ? 0 : -1;
        if (active) pill.style.transform = `translateX(${i * 100}%)`;
      });
    }
  };
}
function numberField(options) {
  const root = element6("div", `dialkit-field dialkit-bg-field ${options.className}`);
  const input = element6("input", "dialkit-field-input dialkit-bg-field-input");
  input.type = "text";
  input.inputMode = "decimal";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("role", "spinbutton");
  input.setAttribute("aria-valuemin", String(options.min));
  input.setAttribute("aria-valuemax", String(options.max));
  const grips = [];
  if (options.grip) {
    const grip = element6("span", "dialkit-field-axis dialkit-bg-field-grip", options.grip);
    grip.setAttribute("aria-hidden", "true");
    root.append(grip);
    grips.push(grip);
  }
  root.append(input);
  const unit = element6("span", "dialkit-bg-field-unit", options.unit);
  unit.setAttribute("aria-hidden", "true");
  root.append(unit);
  grips.push(unit);
  const fit = (n) => {
    if (options.wrap) {
      const span = options.max - options.min;
      return n === options.max ? n : ((n - options.min) % span + span) % span + options.min;
    }
    return clamp4(n, options.min, options.max);
  };
  const readDraft = () => {
    const n = Number.parseFloat(input.value.replace(options.unit, "").trim());
    return Number.isFinite(n) ? n : null;
  };
  const sync = () => {
    const value = options.read();
    input.setAttribute("aria-label", options.label());
    input.setAttribute("aria-valuenow", String(value));
    input.setAttribute("aria-valuetext", `${formatNumber(value)}${options.unit}`);
    if (document.activeElement !== input) input.value = formatNumber(value);
  };
  let skipBlur = false;
  let applying = false;
  const run = (n) => {
    applying = true;
    try {
      options.apply(n);
    } finally {
      applying = false;
    }
  };
  const commitDraft = () => {
    const n = readDraft();
    if (n !== null && n !== options.read()) run(fit(n));
    input.value = formatNumber(options.read());
  };
  input.addEventListener("focus", () => input.select());
  input.addEventListener("blur", () => {
    if (applying) return;
    if (skipBlur) {
      skipBlur = false;
      return;
    }
    commitDraft();
  });
  input.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
      if (document.activeElement === input) input.select();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      input.value = formatNumber(options.read());
      skipBlur = true;
      input.blur();
      return;
    }
    const stepped = stepInputKey(event, input.value, options.read(), options.min, options.max, options.step, options.wrap);
    if (stepped === void 0) return;
    run(stepped);
    input.value = formatNumber(options.read());
  });
  for (const grip of grips) {
    let press;
    grip.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      press = { id: event.pointerId, x: event.clientX, start: options.read(), moved: false };
      try {
        grip.setPointerCapture(event.pointerId);
      } catch {
        press = void 0;
        return;
      }
      if (document.activeElement !== input) input.focus({ preventScroll: true });
      options.onScrub?.(true);
    });
    grip.addEventListener("pointermove", (event) => {
      if (!press || event.pointerId !== press.id) return;
      const dx = event.clientX - press.x;
      if (!press.moved && Math.abs(dx) < DRAG_THRESHOLD2) return;
      press.moved = true;
      const next = fit(press.start + dx * options.step * (event.shiftKey ? 10 : 1));
      run(Math.round(next / options.step) * options.step);
      input.value = formatNumber(options.read());
    });
    const end = (event) => {
      if (!press || event.pointerId !== press.id) return;
      press = void 0;
      if (grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);
      options.onScrub?.(false);
    };
    grip.addEventListener("pointerup", end);
    grip.addEventListener("pointercancel", end);
    grip.addEventListener("lostpointercapture", end);
  }
  return { root, input, sync };
}
function stopPickerValue(stop) {
  if (stop.alpha >= 100) return stop.color;
  return stop.color + Math.round(clamp4(stop.alpha, 0, 100) / 100 * 255).toString(16).padStart(2, "0");
}
function readPicked(raw) {
  const parsed = parseColor(raw);
  if (!parsed) return null;
  const color = "#" + colorToRgb255(parsed).map((n) => n.toString(16).padStart(2, "0")).join("");
  return { color, alpha: Math.round(clamp4(parsed.a, 0, 1) * 100) };
}
function mountBackgroundControl(host, initial) {
  let props = initial;
  let value = normalizeBackgroundValue(props.value);
  let selected = 0;
  let destroyed = false;
  let saving = false;
  let uploading = false;
  let uploadRequest = 0;
  let gradientStatus = "";
  let mediaStatus = "";
  let mediaError = false;
  let hinted = [];
  const hint = (part, text) => {
    hinted.push(part);
    part.addEventListener("pointerenter", () => HintStore.enter(part, text));
    part.addEventListener("pointerleave", () => HintStore.leave(part));
  };
  const unhint = (parts) => {
    parts.forEach((part) => {
      HintStore.leave(part);
      HintStore.hide(part);
    });
    hinted = hinted.filter((part) => !parts.includes(part));
  };
  const emit = (next) => {
    if (sameBackgroundValue(next, value)) {
      render();
      return;
    }
    value = next;
    render();
    props.onChange(cloneBackgroundValue(value));
  };
  const setGradient = (gradient) => emit({ ...value, gradient });
  const folder = props.folder === false ? void 0 : mountFolder(host, { title: props.label });
  const root = element6("div", "dialkit-bg");
  const body = element6("div", "dialkit-bg-body");
  root.append(body);
  const modes = segmented(MODE_OPTIONS, "Background type", (mode) => emit({ ...value, mode }));
  modes.buttons.forEach((button, i) => hint(button, BG_HINTS.mode[MODE_OPTIONS[i].value]));
  body.append(modes.group);
  const solidPane = element6("div", "dialkit-bg-pane dialkit-bg-solid");
  const solidHost = element6("div", "dialkit-color-host");
  solidPane.append(solidHost);
  let solidPicked;
  const solidValue = () => solidPicked && solidPicked.color === value.color ? solidPicked.raw : value.color;
  const solid = mountColorControl(solidHost, {
    label: "Color",
    value: solidValue(),
    onChange: (raw) => {
      const picked = readPicked(raw);
      if (!picked) return;
      solidPicked = { raw, color: picked.color };
      emit({ ...value, color: picked.color });
    }
  });
  const gradientPane = element6("div", "dialkit-bg-pane dialkit-bg-gradient");
  const shapeRow = element6("div", "dialkit-bg-shape-row");
  const shapeTrigger = element6("button", "dialkit-select-trigger dialkit-bg-shape-trigger");
  shapeTrigger.setAttribute("aria-haspopup", "listbox");
  shapeTrigger.setAttribute("aria-expanded", "false");
  shapeTrigger.setAttribute("aria-label", "Gradient type");
  const shapeValue = element6("span", "dialkit-select-value");
  const shapeChevron = strokeIcon(ICON_CHEVRON);
  shapeChevron.classList.add("dialkit-select-chevron");
  shapeTrigger.append(shapeValue, shapeChevron);
  const flipButton = iconButton("dialkit-bg-flip", "Flip stops", ICON_REVERSE);
  const rotateButton = iconButton("dialkit-bg-rotate", "Rotate 90\xB0 clockwise", ICON_ROTATE);
  shapeRow.append(shapeTrigger, flipButton, rotateButton);
  hint(shapeTrigger, BG_HINTS.shapeTrigger);
  hint(flipButton, BG_HINTS.flip);
  hint(rotateButton, BG_HINTS.rotate);
  let shapeOptions = [];
  const shapeMenu = popupMenu(shapeTrigger, "dialkit-select-dropdown dialkit-bg-shape-menu", "select", (popup2) => {
    unhint(shapeOptions);
    shapeOptions = GRADIENT_SHAPES.map((shape) => {
      const option = element6("button", "dialkit-select-option", SHAPE_LABEL[shape]);
      option.dataset.selected = String(shape === value.gradient.shape);
      option.addEventListener("click", () => {
        shapeMenu.close();
        setGradient(switchGradientShape(value.gradient, shape, canvasAspect()));
        shapeTrigger.focus({ preventScroll: true });
      });
      hint(option, BG_HINTS.shape[shape]);
      return option;
    });
    popup2.replaceChildren(...shapeOptions);
    if (!popup2.dataset.gizmoAware) {
      popup2.dataset.gizmoAware = "true";
      popup2.addEventListener("pointerdown", (event) => {
        if (gizmoRowId !== void 0) event.stopPropagation();
      });
      popup2.addEventListener("focusin", (event) => {
        if (gizmoRowId !== void 0) event.stopPropagation();
      });
    }
  });
  const shapeMenuOpen = () => shapeTrigger.getAttribute("aria-expanded") === "true";
  const shapeMenuElement = () => shapeMenuOpen() ? getDialKitPortalRoot(host)?.querySelector(".dialkit-bg-shape-menu") ?? document.querySelector(".dialkit-bg-shape-menu") : null;
  const shapeMenuWatch = new MutationObserver(() => {
    if (!shapeMenuOpen()) {
      unhint(shapeOptions);
      shapeOptions = [];
    }
  });
  shapeMenuWatch.observe(shapeTrigger, { attributes: true, attributeFilter: ["aria-expanded"] });
  function canvasAspect() {
    const rect = getBackgroundHost().gizmoTarget?.()?.getBoundingClientRect();
    return rect && rect.width > 0 && rect.height > 0 ? rect.width / rect.height : 1;
  }
  flipButton.addEventListener("click", () => {
    commitEntries(entries().map(({ id, stop }) => ({ id, stop: { ...stop, at: Math.round((100 - stop.at) * 100) / 100 } })));
  });
  rotateButton.addEventListener("click", () => {
    setGradient({ ...value.gradient, handles: rotateGradientQuarter(value.gradient.shape, value.gradient.handles, { width: canvasAspect(), height: 1 }) });
  });
  const bar = element6("div", "dialkit-bg-bar");
  const track = element6("div", "dialkit-bg-track");
  const trackPaint = element6("div", "dialkit-bg-track-paint");
  track.append(trackPaint);
  const handlesLayer = element6("div", "dialkit-bg-handles");
  bar.append(track, handlesLayer);
  hint(bar, BG_HINTS.bar);
  const STRIP_HANDLES = { start: { x: 0.5, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0.5, y: 0 } };
  let trackCanvas;
  const followsType = () => bar.dataset.trackStyle === "type" && value.gradient.shape !== "linear";
  const paintTrack = () => {
    if (!followsType()) {
      trackCanvas?.remove();
      trackCanvas = void 0;
      trackPaint.style.backgroundImage = stripCss(value.gradient);
      return;
    }
    trackPaint.style.backgroundImage = "";
    if (!trackCanvas) {
      trackCanvas = document.createElement("canvas");
      trackCanvas.className = "dialkit-bg-track-canvas";
      trackPaint.append(trackCanvas);
    }
    const scale = Math.min(globalThis.devicePixelRatio || 1, 3);
    const width = Math.max(1, Math.round(track.clientWidth * scale));
    const height = Math.max(1, Math.round(track.clientHeight * scale));
    if (trackCanvas.width !== width) trackCanvas.width = width;
    if (trackCanvas.height !== height) trackCanvas.height = height;
    paintBackgroundPreview(trackCanvas, { ...value, mode: "gradient", gradient: { ...value.gradient, handles: STRIP_HANDLES } });
  };
  const syncTrackStyle = () => {
    const raw = getComputedStyle(bar).getPropertyValue("--dial-bg-track-style").trim();
    const name = raw === "1" ? "linear" : "type";
    if (bar.dataset.trackStyle !== name) bar.dataset.trackStyle = name;
  };
  const onTrackStyleTransition = (event) => {
    if (event.target === bar && event.propertyName === "--dial-bg-track-style") render();
  };
  bar.addEventListener("transitionrun", onTrackStyleTransition);
  bar.addEventListener("transitionend", onTrackStyleTransition);
  const trackResize = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
    if (trackCanvas) paintTrack();
  }) : void 0;
  trackResize?.observe(track);
  let handles = [];
  let stems = [];
  const stopsHeader = element6("div", "dialkit-bg-stops-header");
  const stopsTitle = element6("span", "dialkit-bg-stops-title", "Stops");
  const addButton = iconButton("dialkit-bg-add", "Add stop", ICON_PLUS);
  stopsHeader.append(stopsTitle, addButton);
  hint(addButton, BG_HINTS.add);
  const stopsList = element6("div", "dialkit-bg-stops");
  const syncGripStyle = () => {
    const styles = getComputedStyle(stopsList);
    const raw = styles.getPropertyValue("--dial-bg-grip-style").trim();
    const name = GRIP_STYLES[raw] ?? "column-hover";
    if (stopsList.dataset.gripStyle !== name) stopsList.dataset.gripStyle = name;
    const selectedStyle = styles.getPropertyValue("--dial-bg-stop-selected-style").trim() === "1" ? "row" : "fields";
    if (stopsList.dataset.selectedStyle !== selectedStyle) stopsList.dataset.selectedStyle = selectedStyle;
    const hoverStyle = styles.getPropertyValue("--dial-bg-stop-hover-style").trim() === "1" ? "field" : "row";
    if (stopsList.dataset.hoverStyle !== hoverStyle) stopsList.dataset.hoverStyle = hoverStyle;
  };
  const onGripStyleTransition = (event) => {
    if (event.target === stopsList && (event.propertyName === "--dial-bg-grip-style" || event.propertyName === "--dial-bg-stop-selected-style" || event.propertyName === "--dial-bg-stop-hover-style")) render();
  };
  stopsList.addEventListener("transitionrun", onGripStyleTransition);
  stopsList.addEventListener("transitionend", onGripStyleTransition);
  let nextStopId = 0;
  let stopIds = value.gradient.stops.map(() => ++nextStopId);
  const rowById = /* @__PURE__ */ new Map();
  const liveRows = () => stopIds.map((id) => rowById.get(id)).filter((row) => !!row);
  const reconcileIds = () => {
    const count = value.gradient.stops.length;
    if (stopIds.length > count) stopIds = stopIds.slice(0, count);
    while (stopIds.length < count) stopIds = [...stopIds, ++nextStopId];
  };
  const saveRow = element6("div", "dialkit-bg-save-row");
  const saveButton = element6("button", "dialkit-preset-save dialkit-bg-save", "Save gradient");
  saveRow.append(saveButton);
  hint(saveButton, BG_HINTS.save);
  const gradientStatusLine = element6("div", "dialkit-bg-status");
  gradientStatusLine.setAttribute("role", "status");
  gradientStatusLine.setAttribute("aria-live", "polite");
  const savedList = element6("div", "dialkit-bg-saved");
  savedList.setAttribute("role", "group");
  savedList.setAttribute("aria-label", "Saved gradients");
  let savedItems = [];
  let savedSignature = "";
  gradientPane.append(shapeRow, bar, stopsHeader, stopsList, saveRow, gradientStatusLine, savedList);
  const entries = () => value.gradient.stops.map((stop, i) => ({ stop, id: stopIds[i] }));
  const commitEntries = (list, selectId = stopIds[selected]) => {
    const sorted = list.map((entry, i) => ({ entry, i })).sort((a, b) => a.entry.stop.at - b.entry.stop.at || a.i - b.i).map(({ entry }) => entry);
    stopIds = sorted.map((entry) => entry.id);
    const index = stopIds.indexOf(selectId);
    selected = index >= 0 ? index : clamp4(selected, 0, sorted.length - 1);
    setGradient({ ...value.gradient, stops: sorted.map((entry) => entry.stop) });
  };
  const updateStop = (index, patch) => {
    const list = entries();
    const current = list[index];
    if (!current) return;
    list[index] = { id: current.id, stop: { ...current.stop, ...patch } };
    commitEntries(list, current.id);
  };
  const addStopAt = (at) => {
    if (value.gradient.stops.length >= BACKGROUND_MAX_STOPS) return;
    const position = Math.round(clamp4(at, 0, 100) * 100) / 100;
    const entry = { id: ++nextStopId, stop: { at: position, ...gradientColorAt(value.gradient.stops, position) } };
    commitEntries([...entries(), entry], entry.id);
  };
  const removeStop = (index) => {
    if (value.gradient.stops.length <= BACKGROUND_MIN_STOPS) return;
    const list = entries();
    const removed = list[index]?.id;
    const selectId = removed === stopIds[selected] ? (list[index - 1] ?? list[index + 1])?.id : stopIds[selected];
    commitEntries(list.filter((entry) => entry.id !== removed), selectId);
  };
  const reorderRows = (base, from, to, selectId) => {
    stopIds = moveItem(base.map((entry) => entry.id), from, to);
    selected = Math.max(0, stopIds.indexOf(selectId));
    setGradient({ ...value.gradient, stops: moveStopPayload(base.map((entry) => entry.stop), from, to) });
  };
  const select = (index) => {
    if (index === selected || index < 0) return;
    selected = index;
    renderSelection();
  };
  addButton.addEventListener("click", () => addStopAt(widestGapMiddle(value.gradient.stops)));
  let drag;
  const fractionAt = (clientX) => {
    const rect = handlesLayer.getBoundingClientRect();
    return rect.width ? clamp4((clientX - rect.left) / rect.width, 0, 1) : 0;
  };
  const startDrag = (event, index, moved) => {
    try {
      bar.setPointerCapture(event.pointerId);
    } catch {
      return false;
    }
    drag = { id: event.pointerId, index, x: event.clientX, y: event.clientY, moved, off: false };
    bar.dataset.dragging = "true";
    return true;
  };
  const endDrag = (event, drop2 = false) => {
    if (!drag || event && event.pointerId !== drag.id) return;
    const { id, index, off } = drag;
    drag = void 0;
    delete bar.dataset.dragging;
    handles.forEach((handle) => delete handle.dataset.off);
    if (bar.hasPointerCapture(id)) bar.releasePointerCapture(id);
    if (drop2 && off) removeStop(index);
  };
  const markPointer = () => {
    bar.dataset.input = "pointer";
  };
  const markKeyboard = () => {
    delete bar.dataset.input;
  };
  document.addEventListener("pointerdown", markPointer, true);
  document.addEventListener("keydown", markKeyboard, true);
  bar.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || drag) return;
    const handle = event.target.closest(".dialkit-bg-handle");
    event.preventDefault();
    if (handle) {
      const index = handles.indexOf(handle);
      if (index < 0) return;
      select(index);
      handle.focus({ preventScroll: true });
      startDrag(event, index, false);
      return;
    }
    if (value.gradient.stops.length >= BACKGROUND_MAX_STOPS) return;
    addStopAt(Math.round(fractionAt(event.clientX) * 100));
    handles[selected]?.focus({ preventScroll: true });
    startDrag(event, selected, true);
  });
  bar.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < DRAG_THRESHOLD2) return;
    drag.moved = true;
    const rect = bar.getBoundingClientRect();
    const away = Math.max(rect.top - event.clientY, event.clientY - rect.bottom);
    drag.off = away > REMOVE_DISTANCE && value.gradient.stops.length > BACKGROUND_MIN_STOPS;
    updateStop(drag.index, { at: Math.round(fractionAt(event.clientX) * 100) });
    drag.index = selected;
    handles.forEach((handle, i) => handle.toggleAttribute("data-off", drag?.off === true && i === selected));
    handles[selected]?.focus({ preventScroll: true });
  });
  bar.addEventListener("pointerup", (event) => endDrag(event, true));
  bar.addEventListener("pointercancel", (event) => endDrag(event));
  bar.addEventListener("dblclick", (event) => {
    const handle = document.elementsFromPoint(event.clientX, event.clientY).find((el) => el.classList.contains("dialkit-bg-handle"));
    const index = handle ? handles.indexOf(handle) : -1;
    const row = index >= 0 ? rowById.get(stopIds[index]) : void 0;
    const picker = row?.root.querySelector(".dialkit-color-control");
    if (!picker || picker.dataset.open) return;
    select(index);
    picker.querySelector(".dialkit-color-swatch")?.click();
  });
  bar.addEventListener("lostpointercapture", (event) => endDrag(event));
  const buildHandles = () => {
    unhint(handles);
    handlesLayer.replaceChildren();
    stems = value.gradient.stops.map(() => {
      const stem = element6("span", "dialkit-bg-stem");
      stem.setAttribute("aria-hidden", "true");
      handlesLayer.append(stem);
      return stem;
    });
    handles = value.gradient.stops.map((_, i) => {
      const handle = element6("button", "dialkit-bg-handle");
      handle.setAttribute("role", "slider");
      handle.setAttribute("aria-valuemin", "0");
      handle.setAttribute("aria-valuemax", "100");
      const chip = element6("span", "dialkit-bg-handle-chip");
      chip.setAttribute("aria-hidden", "true");
      handle.append(chip);
      hint(handle, BG_HINTS.handle);
      handle.addEventListener("focus", () => select(handles.indexOf(handle)));
      handle.addEventListener("keydown", (event) => {
        if (event.altKey || event.metaKey || event.ctrlKey) return;
        const index = handles.indexOf(handle);
        const stop = value.gradient.stops[index];
        if (!stop) return;
        let at;
        if (event.key === "ArrowLeft" || event.key === "ArrowDown") at = stop.at - (event.shiftKey ? 10 : 1);
        else if (event.key === "ArrowRight" || event.key === "ArrowUp") at = stop.at + (event.shiftKey ? 10 : 1);
        else if (event.key === "Home") at = 0;
        else if (event.key === "End") at = 100;
        else if ((event.key === "Delete" || event.key === "Backspace") && value.gradient.stops.length > BACKGROUND_MIN_STOPS) {
          event.preventDefault();
          event.stopPropagation();
          removeStop(index);
          handles[selected]?.focus({ preventScroll: true });
          return;
        } else return;
        event.preventDefault();
        event.stopPropagation();
        updateStop(index, { at: Math.round(clamp4(at, 0, 100)) });
        handles[selected]?.focus({ preventScroll: true });
      });
      handlesLayer.append(handle);
      return handle;
    });
  };
  const buildRow = (id) => {
    const index = () => stopIds.indexOf(id);
    const stop = () => value.gradient.stops[index()];
    const rowRoot = element6("div", "dialkit-bg-stop");
    rowRoot.addEventListener("pointerdown", () => select(index()));
    rowRoot.addEventListener("focusin", () => select(index()));
    const grip = element6("button", "dialkit-bg-icon-button dialkit-bg-stop-grip");
    grip.setAttribute("aria-label", "Reorder stop");
    grip.setAttribute("aria-keyshortcuts", "Alt+ArrowUp Alt+ArrowDown");
    const column = strokeIcon(ICON_MORE);
    column.setAttribute("viewBox", "9 0 6 24");
    column.setAttribute("stroke-width", String(ICON_MORE_STROKE));
    const upright = document.createElementNS("http://www.w3.org/2000/svg", "g");
    upright.setAttribute("transform", "rotate(90 12 12)");
    upright.append(...Array.from(column.childNodes));
    column.append(upright);
    grip.append(column);
    const at = numberField({
      className: "dialkit-bg-stop-at",
      label: () => `Stop ${index() + 1} position`,
      unit: "%",
      min: 0,
      max: 100,
      step: 1,
      read: () => stop()?.at ?? 0,
      apply: (n) => updateStop(index(), { at: Math.round(n * 100) / 100 }),
      onScrub: (active) => {
        scrubbingId = active ? id : void 0;
      }
    });
    const colorHost = element6("div", "dialkit-color-host dialkit-bg-stop-color");
    const row = {
      id,
      root: rowRoot,
      grip,
      at,
      alpha: numberField({
        className: "dialkit-bg-stop-alpha",
        label: () => `Stop ${index() + 1} opacity`,
        unit: "%",
        min: 0,
        max: 100,
        step: 1,
        read: () => stop()?.alpha ?? 100,
        apply: (n) => updateStop(index(), { alpha: Math.round(n * 100) / 100 }),
        onScrub: (active) => {
          scrubbingId = active ? id : void 0;
        }
      }),
      color: mountColorControl(colorHost, {
        label: `Stop ${index() + 1}`,
        value: stopPickerValue(stop()),
        onChange: (raw) => pickStopColor(row, raw)
      }),
      remove: iconButton("dialkit-bg-stop-remove", "Remove stop", ICON_MINUS)
    };
    row.remove.addEventListener("click", () => removeStop(index()));
    const pickerRow = colorHost.querySelector(".dialkit-color-control");
    if (pickerRow) pickerWatch.observe(pickerRow, { attributes: true, attributeFilter: ["data-open"] });
    bindRowDrag(row, index);
    rowRoot.append(grip, at.root, colorHost, row.alpha.root, row.remove);
    hint(grip, BG_HINTS.grip);
    hint(at.root, BG_HINTS.position);
    const rowSwatch = colorHost.querySelector(".dialkit-color-swatch");
    if (rowSwatch) hint(rowSwatch, BG_HINTS.swatch);
    return row;
  };
  const pickStopColor = (row, raw) => {
    const picked = readPicked(raw);
    if (!picked) return;
    row.picked = { raw, ...picked };
    updateStop(stopIds.indexOf(row.id), picked);
  };
  const dropRow = (row) => {
    unhint(hinted.filter((part) => row.root.contains(part)));
    row.flip?.cancel();
    row.color.destroy();
    row.root.remove();
  };
  let scrubbingId;
  let rowDrag;
  const paintRowDrag = () => {
    if (!rowDrag) return;
    const { id, from, to, offset, step, settling, base } = rowDrag;
    base.forEach((entry, k) => {
      const row = rowById.get(entry.id);
      if (!row) return;
      const shift = entry.id === id ? settling ? (to - from) * step : offset : from < to && k > from && k <= to ? -step : to < from && k >= to && k < from ? step : 0;
      row.root.style.transform = shift ? `translateY(${shift}px)` : "";
    });
  };
  const finishRowDrag = () => {
    if (!rowDrag) return;
    const { base } = rowDrag;
    rowDrag = void 0;
    delete stopsList.dataset.dragging;
    delete stopsList.dataset.settling;
    base.forEach((entry) => {
      const row = rowById.get(entry.id);
      if (!row) return;
      delete row.root.dataset.dragging;
      row.root.style.transform = "";
    });
    placeRows();
    render();
  };
  const cancelRowDrag = () => {
    if (!rowDrag) return;
    const { id, pointerId } = rowDrag;
    rowDrag = void 0;
    delete stopsList.dataset.dragging;
    delete stopsList.dataset.settling;
    stopsList.querySelectorAll(".dialkit-bg-stop").forEach((el) => {
      el.style.transform = "";
      delete el.dataset.dragging;
    });
    const held = rowById.get(id)?.root;
    if (held?.hasPointerCapture(pointerId)) held.releasePointerCapture(pointerId);
  };
  const bindRowDrag = (row, index) => {
    const { grip, root: rowRoot } = row;
    rowRoot.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || rowDrag || row.leaving) return;
      const target = event.target;
      const onGrip = !!target.closest(".dialkit-bg-stop-grip");
      if (!onGrip && (stopsList.dataset.gripStyle !== "row" || target.closest(ROW_DRAG_EXCLUDE))) return;
      event.preventDefault();
      const from = index();
      rowDrag = {
        id: row.id,
        pointerId: event.pointerId,
        startY: event.clientY,
        lifted: false,
        from,
        to: from,
        offset: 0,
        step: 0,
        settling: false,
        base: entries(),
        selectId: stopIds[selected]
      };
      try {
        rowRoot.setPointerCapture(event.pointerId);
      } catch {
        rowDrag = void 0;
      }
    });
    rowRoot.addEventListener("pointermove", (event) => {
      const drag2 = rowDrag;
      if (!drag2 || drag2.id !== row.id || drag2.pointerId !== event.pointerId || drag2.settling) return;
      const dy = event.clientY - drag2.startY;
      if (!drag2.lifted) {
        if (Math.abs(dy) <= DRAG_LIFT_PX) return;
        drag2.lifted = true;
        const rows = drag2.base.map((entry) => rowById.get(entry.id)).filter((r) => !!r);
        rows.forEach((r) => {
          r.flip?.cancel();
          r.flip = void 0;
        });
        const first = rows[0]?.root.getBoundingClientRect();
        const second = rows[1]?.root.getBoundingClientRect();
        drag2.step = first && second ? second.top - first.top : first?.height ?? 40;
        stopsList.dataset.dragging = "true";
        row.root.dataset.dragging = "true";
      }
      const n = drag2.base.length;
      drag2.offset = clamp4(dy, -drag2.from * drag2.step, (n - 1 - drag2.from) * drag2.step);
      const to = clamp4(Math.round(drag2.from + drag2.offset / drag2.step), 0, n - 1);
      if (to !== drag2.to) {
        drag2.to = to;
        reorderRows(drag2.base, drag2.from, to, drag2.selectId);
      }
      paintRowDrag();
    });
    const release = (event) => {
      const drag2 = rowDrag;
      if (!drag2 || drag2.id !== row.id || drag2.pointerId !== event.pointerId || drag2.settling) return;
      if (rowRoot.hasPointerCapture(event.pointerId)) rowRoot.releasePointerCapture(event.pointerId);
      if (!drag2.lifted) {
        rowDrag = void 0;
        return;
      }
      drag2.settling = true;
      stopsList.dataset.settling = "true";
      paintRowDrag();
      if (reducedMotion() || drag2.offset === (drag2.to - drag2.from) * drag2.step) {
        finishRowDrag();
        return;
      }
      let timer = 0;
      const done = (e) => {
        if (e && (e.target !== row.root || e.propertyName !== "transform")) return;
        row.root.removeEventListener("transitionend", done);
        clearTimeout(timer);
        if (rowDrag === drag2) finishRowDrag();
      };
      row.root.addEventListener("transitionend", done);
      timer = window.setTimeout(done, 400);
    };
    rowRoot.addEventListener("pointerup", release);
    rowRoot.addEventListener("pointercancel", release);
    rowRoot.addEventListener("lostpointercapture", release);
    grip.addEventListener("keydown", (event) => {
      if (!event.altKey || event.metaKey || event.ctrlKey || rowDrag) return;
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      event.stopPropagation();
      const from = index();
      const to = from + (event.key === "ArrowUp" ? -1 : 1);
      if (to < 0 || to >= stopIds.length) return;
      reorderRows(entries(), from, to, stopIds[selected]);
      if (document.activeElement !== grip) grip.focus({ preventScroll: true });
    });
  };
  const placeRows = () => {
    const active = document.activeElement;
    const rows = liveRows();
    if (rows.length === 0) return;
    const held = rows.find((row) => row.id === scrubbingId) ?? rows.find((row) => active instanceof Node && row.root.contains(active)) ?? rows[0];
    const at = rows.indexOf(held);
    if (!held.root.parentNode) stopsList.append(held.root);
    for (let i = at - 1, next = held.root; i >= 0; i--) {
      const el = rows[i].root;
      if (el.nextElementSibling !== next || el.parentNode !== stopsList) stopsList.insertBefore(el, next);
      next = el;
    }
    for (let i = at + 1, previous = held.root; i < rows.length; i++) {
      const el = rows[i].root;
      if (previous.nextElementSibling !== el) previous.after(el);
      previous = el;
    }
    if (active instanceof HTMLElement && active !== document.activeElement && active.isConnected && stopsList.contains(active)) {
      active.focus({ preventScroll: true });
    }
  };
  const syncRows = (before, listTop, animate3) => {
    const live = new Set(stopIds);
    const entering = [];
    for (const id of stopIds) {
      if (rowById.has(id)) continue;
      const row = buildRow(id);
      rowById.set(id, row);
      entering.push(row);
    }
    const leaving = [];
    for (const [id, row] of rowById) {
      if (live.has(id)) continue;
      rowById.delete(id);
      leaving.push(row);
    }
    if (entering.length || leaving.length) cancelRowDrag();
    if (!rowDrag) placeRows();
    for (const row of leaving) {
      row.leaving = true;
      row.root.inert = true;
      row.root.setAttribute("aria-hidden", "true");
      const top = before.get(row.id);
      if (!animate3 || top === void 0) {
        dropRow(row);
        continue;
      }
      row.flip?.cancel();
      row.root.dataset.leaving = "true";
      row.root.style.top = `${top - listTop}px`;
      stopsList.append(row.root);
      const fade = animateSpring(row.root, (p) => ({ opacity: String(clamp4(1 - p, 0, 1)), transform: `scale(${1 - 0.04 * clamp4(p, 0, 1)})` }), LAYOUT_SPRING.visualDuration, LAYOUT_SPRING.bounce);
      if (!fade) dropRow(row);
      else {
        row.flip = fade;
        fade.onfinish = () => dropRow(row);
      }
    }
    if (!animate3 || rowDrag) return;
    const running = (anim) => !!anim && (anim.playState === "running" || anim.pending);
    for (const row of liveRows()) {
      const target = row.root.offsetTop;
      if (entering.includes(row)) {
        row.flipTarget = target;
        row.flip = animateSpring(row.root, (p) => ({ opacity: String(clamp4(p, 0, 1)), transform: `scale(${0.96 + 0.04 * clamp4(p, 0, 1)})` }), LAYOUT_SPRING.visualDuration, LAYOUT_SPRING.bounce);
        continue;
      }
      if (running(row.flip) && row.flipTarget === target) continue;
      const from = before.get(row.id);
      if (from === void 0) continue;
      const delta = from - listTop - target;
      row.flip?.cancel();
      row.flip = void 0;
      row.flipTarget = void 0;
      if (Math.abs(delta) < 0.5) continue;
      row.flipTarget = target;
      const slide = animateSpring(row.root, (p) => ({ transform: `translateY(${delta * (1 - p)}px)` }), LAYOUT_SPRING.visualDuration, LAYOUT_SPRING.bounce);
      row.flip = slide;
      if (!slide) continue;
      row.root.dataset.moving = "true";
      const settle = () => {
        if (row.flip === slide || !running(row.flip)) delete row.root.dataset.moving;
      };
      slide.addEventListener("finish", settle);
      slide.addEventListener("cancel", settle);
    }
  };
  let gizmoRowId;
  let gizmo;
  let pressedSwatchRowId;
  const pickerOpen = (row) => row.root.querySelector(".dialkit-color-control")?.hasAttribute("data-open") ?? false;
  const toggleRowPicker = (row) => row.root.querySelector(".dialkit-color-swatch")?.click();
  const gizmoZIndex = () => {
    let highest = Number.NaN;
    for (let el = host; el; el = el.parentElement) {
      const z = Number.parseInt(getComputedStyle(el).zIndex, 10);
      if (Number.isFinite(z)) highest = Number.isFinite(highest) ? Math.max(highest, z) : z;
    }
    return Number.isFinite(highest) ? highest - 1 : 9998;
  };
  let gizmoZ;
  const gizmoProps = () => ({ gradient: value.gradient, selected, themeSource: getDialKitPortalRoot(host), zIndex: gizmoZ ?? (gizmoZ = gizmoZIndex()) });
  const ensureGizmo = () => {
    if (gizmo || gizmoRowId === void 0 || value.mode !== "gradient") return;
    const target = getBackgroundHost().gizmoTarget?.();
    if (!target) return;
    gizmo = mountGradientGizmo(target, gizmoProps(), {
      onHandles: (handles2) => setGradient({ ...value.gradient, handles: handles2 }),
      onSelect: (index) => {
        select(index);
        render();
        followSelection();
      },
      onStopMove: (index, at) => updateStop(index, { at }),
      onStopAdd: (at) => {
        addStopAt(at);
        followSelection();
      }
    });
  };
  const enterGizmo = (rowId) => {
    if (gizmoRowId === void 0) gizmoZ = gizmoZIndex();
    gizmoRowId = rowId;
    const index = stopIds.indexOf(rowId);
    if (index >= 0 && index !== selected) {
      selected = index;
      renderSelection();
    }
    root.dataset.gizmo = "true";
    document.addEventListener("keydown", gizmoEscape);
    document.addEventListener("pointerdown", gizmoPressElsewhere, true);
    ensureGizmo();
    gizmo?.update(gizmoProps());
  };
  const exitGizmo = () => {
    gizmoRowId = void 0;
    gizmoZ = void 0;
    delete root.dataset.gizmo;
    document.removeEventListener("keydown", gizmoEscape);
    document.removeEventListener("pointerdown", gizmoPressElsewhere, true);
    gizmo?.destroy();
    gizmo = void 0;
  };
  function gizmoEscape(event) {
    if (event.key !== "Escape" || event.defaultPrevented || gizmoRowId === void 0 || shapeMenuOpen()) return;
    const row = rowById.get(gizmoRowId);
    if (row && pickerOpen(row)) toggleRowPicker(row);
    else exitGizmo();
  }
  function gizmoPressElsewhere(event) {
    if (gizmoRowId === void 0) return;
    const target = event.target;
    const inside = gradientPane.contains(target) || !!gizmo?.element.contains(target) || !!shapeMenuElement()?.contains(target) || [...document.querySelectorAll(".dialkit-color-popover")].some((popover) => popover.contains(target));
    if (inside) return;
    const row = rowById.get(gizmoRowId);
    if (row && pickerOpen(row)) toggleRowPicker(row);
    else exitGizmo();
  }
  function followSelection() {
    if (gizmoRowId === void 0) return;
    const next = liveRows()[selected];
    if (!next || next.id === gizmoRowId) return;
    const previous = rowById.get(gizmoRowId);
    gizmoRowId = next.id;
    if (previous && pickerOpen(previous)) toggleRowPicker(previous);
    if (pressedSwatchRowId !== next.id && !pickerOpen(next)) toggleRowPicker(next);
  }
  const pickerWatch = new MutationObserver((records) => {
    for (const record of records) {
      const control = record.target;
      const row = [...rowById.values()].find((r) => r.root.contains(control));
      if (!row) continue;
      if (control.hasAttribute("data-open")) enterGizmo(row.id);
      else if (row.id === gizmoRowId) exitGizmo();
    }
  });
  gradientPane.addEventListener("pointerdown", (event) => {
    const swatchRow = event.target.closest(".dialkit-color-swatch") ? event.target.closest(".dialkit-bg-stop") : null;
    pressedSwatchRowId = swatchRow ? [...rowById.values()].find((r) => r.root === swatchRow)?.id : void 0;
    queueMicrotask(() => {
      if (pressedSwatchRowId !== void 0) setTimeout(() => {
        pressedSwatchRowId = void 0;
      }, 0);
    });
    if (gizmoRowId !== void 0) {
      event.stopPropagation();
      followSelection();
    }
  });
  gradientPane.addEventListener("focusin", (event) => {
    if (gizmoRowId !== void 0) event.stopPropagation();
  });
  const renderSelection = () => {
    handles.forEach((handle, i) => handle.toggleAttribute("data-selected", i === selected));
    stems.forEach((stem, i) => stem.toggleAttribute("data-selected", i === selected));
    liveRows().forEach((row, i) => row.root.toggleAttribute("data-selected", i === selected));
  };
  const buildSaved = () => {
    const list = getSavedGradients();
    const canDelete = !!getBackgroundHost().deleteGradient;
    const signature = JSON.stringify([list, canDelete]);
    if (signature === savedSignature) return;
    savedSignature = signature;
    unhint(hinted.filter((part) => savedList.contains(part)));
    savedList.replaceChildren();
    savedItems = list.map((saved, i) => {
      const item = element6("div", "dialkit-bg-saved-item");
      const swatch = element6("button", "dialkit-bg-saved-swatch");
      swatch.setAttribute("aria-label", `Apply saved gradient ${i + 1}`);
      swatch.style.setProperty("--dial-bg-gradient", backgroundGradientCss(saved.gradient));
      swatch.addEventListener("click", () => {
        selected = 0;
        emit({ ...value, mode: "gradient", gradient: cloneGradient(saved.gradient) });
      });
      item.append(swatch);
      hint(swatch, BG_HINTS.saved);
      if (canDelete) {
        const remove = iconButton("dialkit-bg-saved-delete", `Delete saved gradient ${i + 1}`, ICON_CLOSE);
        remove.addEventListener("click", async () => {
          const deleteGradient = getBackgroundHost().deleteGradient;
          if (!deleteGradient) return;
          remove.disabled = true;
          try {
            await deleteGradient(saved.id);
            if (getSavedGradients().some((entry) => entry.id === saved.id)) {
              setSavedGradients(getSavedGradients().filter((entry) => entry.id !== saved.id));
            }
            gradientStatus = "";
          } catch (error) {
            gradientStatus = errorMessage(error, "Could not delete the gradient.");
            remove.disabled = false;
          }
          if (!destroyed) render();
        });
        item.append(remove);
        hint(remove, BG_HINTS.savedDelete);
      }
      savedList.append(item);
      return { id: saved.id, gradient: saved.gradient, swatch };
    });
  };
  saveButton.addEventListener("click", async () => {
    const saveGradient = getBackgroundHost().saveGradient;
    if (!saveGradient || saving) return;
    saving = true;
    gradientStatus = "";
    render();
    try {
      const saved = await saveGradient(cloneGradient(value.gradient));
      if (saved && typeof saved.id === "string" && !getSavedGradients().some((entry) => entry.id === saved.id)) {
        setSavedGradients([...getSavedGradients(), saved]);
      }
    } catch (error) {
      gradientStatus = errorMessage(error, "Could not save the gradient.");
    } finally {
      saving = false;
      if (!destroyed) render();
    }
  });
  const mediaPane = element6("div", "dialkit-bg-pane dialkit-bg-media");
  const fileInput = element6("input", "dialkit-bg-file");
  fileInput.type = "file";
  fileInput.accept = "image/*,video/*";
  fileInput.tabIndex = -1;
  fileInput.setAttribute("aria-hidden", "true");
  const drop = element6("button", "dialkit-bg-drop");
  const dropText = element6("span", "dialkit-bg-drop-text");
  drop.append(strokeIcon(ICON_UPLOAD), dropText);
  const preview2 = element6("button", "dialkit-bg-media-preview");
  preview2.setAttribute("aria-label", "Media options");
  preview2.setAttribute("aria-haspopup", "dialog");
  preview2.setAttribute("aria-expanded", "false");
  const previewFrame = element6("span", "dialkit-bg-media-frame");
  const previewBadge = element6("span", "dialkit-bg-media-badge");
  previewBadge.setAttribute("aria-hidden", "true");
  preview2.append(previewFrame, previewBadge);
  let previewSignature = "";
  const actions = element6("div", "dialkit-bg-media-actions");
  const replaceButton = element6("button", "dialkit-button dialkit-bg-media-action", "Replace");
  const removeButton = element6("button", "dialkit-button dialkit-bg-media-action", "Remove");
  actions.append(replaceButton, removeButton);
  const mediaStatusLine = element6("div", "dialkit-bg-status");
  mediaStatusLine.setAttribute("role", "status");
  mediaStatusLine.setAttribute("aria-live", "polite");
  mediaPane.append(drop, preview2, actions, mediaStatusLine, fileInput);
  hint(drop, BG_HINTS.drop);
  hint(preview2, BG_HINTS.preview);
  const chooseFile = () => {
    if (!getBackgroundHost().upload || uploading) return;
    fileInput.value = "";
    fileInput.click();
  };
  const uploadFile = async (file) => {
    const upload = getBackgroundHost().upload;
    if (!file || !upload) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      mediaStatus = "Choose an image or a video file.";
      mediaError = true;
      render();
      return;
    }
    const request = ++uploadRequest;
    uploading = true;
    mediaStatus = `Uploading ${file.name}\u2026`;
    mediaError = false;
    render();
    try {
      const media = await upload(file);
      if (destroyed || request !== uploadRequest) return;
      if (!media || typeof media.key !== "string" || !media.key || media.kind !== "image" && media.kind !== "video") {
        throw new Error("The upload returned no file.");
      }
      mediaStatus = "";
      uploading = false;
      emit({ ...value, media: { key: media.key, kind: media.kind } });
    } catch (error) {
      if (destroyed || request !== uploadRequest) return;
      mediaStatus = errorMessage(error, "The upload failed.");
      mediaError = true;
    } finally {
      if (!destroyed && request === uploadRequest) {
        uploading = false;
        render();
      }
    }
  };
  drop.addEventListener("click", chooseFile);
  replaceButton.addEventListener("click", chooseFile);
  removeButton.addEventListener("click", () => {
    closeOptions();
    emit({ ...value, media: null });
    drop.focus({ preventScroll: true });
  });
  fileInput.addEventListener("change", () => {
    void uploadFile(fileInput.files?.[0]);
  });
  mediaPane.addEventListener("dragover", (event) => {
    if (!getBackgroundHost().upload || uploading) return;
    event.preventDefault();
    mediaPane.dataset.dragging = "true";
  });
  mediaPane.addEventListener("dragleave", (event) => {
    if (!mediaPane.contains(event.relatedTarget)) delete mediaPane.dataset.dragging;
  });
  mediaPane.addEventListener("drop", (event) => {
    delete mediaPane.dataset.dragging;
    if (!getBackgroundHost().upload || uploading) return;
    event.preventDefault();
    void uploadFile(event.dataTransfer?.files?.[0]);
  });
  const renderPreview = (media) => {
    const url = getBackgroundHost().mediaUrl?.(media) ?? "";
    const signature = `${media.kind}
${media.key}
${url}`;
    if (signature === previewSignature) return;
    previewSignature = signature;
    previewFrame.replaceChildren();
    if (!url) {
      previewFrame.append(element6("span", "dialkit-bg-media-key", media.key));
    } else if (media.kind === "video") {
      const video = element6("video", "dialkit-bg-media-el");
      video.muted = true;
      video.defaultMuted = true;
      video.setAttribute("muted", "");
      video.loop = true;
      video.playsInline = true;
      video.autoplay = true;
      video.preload = "metadata";
      video.src = url;
      previewFrame.append(video);
      void video.play?.()?.catch?.(() => {
      });
    } else {
      const img = element6("img", "dialkit-bg-media-el");
      img.alt = "";
      img.decoding = "async";
      img.draggable = false;
      img.src = url;
      previewFrame.append(img);
    }
  };
  const setDisplay = (patch) => emit({ ...value, mediaDisplay: { ...value.mediaDisplay, ...patch } });
  let popup;
  let stopPosition;
  let syncOptions = () => {
  };
  const closeOptions = (restoreFocus = false) => {
    if (popup) unhint(hinted.filter((part) => popup?.contains(part)));
    stopPosition?.();
    stopPosition = void 0;
    popup?.remove();
    popup = void 0;
    syncOptions = () => {
    };
    delete preview2.dataset.open;
    preview2.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", outside);
    document.removeEventListener("focusin", focusOutside);
    if (restoreFocus) preview2.focus({ preventScroll: true });
  };
  const outside = (event) => {
    if (!popup?.contains(event.target) && !preview2.contains(event.target)) closeOptions();
  };
  const focusOutside = (event) => {
    if (!popup?.contains(event.target) && !preview2.contains(event.target)) closeOptions();
  };
  const openOptions = (event) => {
    if (popup) {
      closeOptions();
      return;
    }
    const portal = getDialKitPortalRoot(host) ?? host;
    const shell = element6("div", "dialkit-bg-popover");
    popup = shell;
    shell.tabIndex = -1;
    shell.style.position = "fixed";
    shell.setAttribute("role", "dialog");
    shell.setAttribute("aria-label", `${props.label} media options`);
    const section = (title, control, hintText) => {
      const wrap = element6("div", "dialkit-bg-popover-section");
      const heading = element6("div", "dialkit-bg-popover-label", title);
      wrap.append(heading, control);
      shell.append(wrap);
      hint(wrap, hintText);
    };
    const fits = segmented(BACKGROUND_FITS.map((fit) => ({ value: fit, label: FIT_LABEL[fit] })), "Sizing", (fit) => setDisplay({ fit }));
    fits.buttons.forEach((button, i) => hint(button, BG_HINTS.fit[BACKGROUND_FITS[i]]));
    section("Sizing", fits.group, BG_HINTS.sizing);
    const tileWrap = element6("div", "dialkit-bg-tile-wrap");
    const tileSize = shellSlider({
      label: "Tile Size",
      ...BACKGROUND_TILE_SCALE,
      scale: 100,
      decimals: 0,
      unit: "%",
      read: () => value.mediaDisplay.tileScale,
      apply: (n) => setDisplay({ tileScale: n })
    });
    tileWrap.append(tileSize.root);
    hint(tileSize.root, BG_HINTS.tileSize);
    shell.append(tileWrap);
    const tileRow = conditionalRow(tileWrap, shell);
    const ratios = element6("div", "dialkit-bg-ratios");
    ratios.setAttribute("role", "radiogroup");
    ratios.setAttribute("aria-label", "Ratio");
    ratios.addEventListener("keydown", handleSegmentKey);
    const ratioButtons = BACKGROUND_RATIOS.map((ratio) => {
      const button = element6("button", "dialkit-segmented-button dialkit-bg-ratio");
      button.setAttribute("role", "radio");
      if (ratio === "source") {
        button.setAttribute("aria-label", RATIO_LABEL(ratio));
        button.append(strokeIcon(ICON_IMAGE));
      } else {
        button.append(element6("span", "dialkit-segmented-text", RATIO_LABEL(ratio)));
      }
      button.addEventListener("click", () => setDisplay({ ratio }));
      hint(button, BG_HINTS.ratio(ratio));
      ratios.append(button);
      return button;
    });
    section("Ratio", ratios, BG_HINTS.ratioSection);
    const zoom = shellSlider({
      label: "Zoom",
      ...BACKGROUND_ZOOM,
      scale: 1,
      decimals: 1,
      unit: "\xD7",
      read: () => value.mediaDisplay.zoom,
      apply: (n) => setDisplay({ zoom: n })
    });
    shell.append(zoom.root);
    hint(zoom.root, BG_HINTS.zoom);
    const anchor = element6("div", "dialkit-anchor dialkit-bg-pin");
    anchor.setAttribute("role", "radiogroup");
    anchor.setAttribute("aria-label", "Pin");
    anchor.style.setProperty("--dial-anchor-columns", "3");
    anchor.style.setProperty("--dial-anchor-rows", "3");
    const anchorPill = element6("span", "dialkit-anchor-pill dialkit-bg-pin-pill");
    anchorPill.setAttribute("aria-hidden", "true");
    anchor.append(anchorPill);
    const cells = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cell = element6("button", "dialkit-anchor-cell");
        cell.setAttribute("role", "radio");
        cell.setAttribute("aria-label", `${PIN_ROWS[r]}, ${PIN_COLUMNS[c]}`);
        cell.dataset.cell = `${c}-${r}`;
        cell.append(element6("span", "dialkit-anchor-dot"));
        cell.addEventListener("click", () => setDisplay({ pinX: c - 1, pinY: r - 1 }));
        anchor.append(cell);
        cells.push(cell);
      }
    }
    anchor.addEventListener("keydown", (e) => {
      const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const move = moves[e.key];
      if (!move) return;
      e.preventDefault();
      e.stopPropagation();
      const c = clamp4(value.mediaDisplay.pinX + 1 + move[0], 0, 2);
      const r = clamp4(value.mediaDisplay.pinY + 1 + move[1], 0, 2);
      setDisplay({ pinX: c - 1, pinY: r - 1 });
      cells[r * 3 + c].focus({ preventScroll: true });
    });
    section("Pin", anchor, BG_HINTS.pin);
    syncOptions = () => {
      const display = value.mediaDisplay;
      fits.set(display.fit);
      tileRow.set(display.fit === "tile");
      tileSize.sync();
      BACKGROUND_RATIOS.forEach((ratio, i) => {
        const active = ratio === display.ratio;
        ratioButtons[i].setAttribute("aria-checked", String(active));
        ratioButtons[i].dataset.active = String(active);
        ratioButtons[i].tabIndex = active ? 0 : -1;
      });
      zoom.sync();
      const col = display.pinX + 1;
      const row = display.pinY + 1;
      anchorPill.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
      cells.forEach((cell, i) => {
        const picked = i === row * 3 + col;
        cell.setAttribute("aria-checked", String(picked));
        cell.tabIndex = picked ? 0 : -1;
      });
    };
    shell.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeOptions(true);
        return;
      }
      if (e.key === "Tab") {
        const stops = Array.from(shell.querySelectorAll('button, input, [tabindex="0"]')).filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0);
        const first = stops[0];
        const last = stops[stops.length - 1];
        if (e.shiftKey && document.activeElement === first || !e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          closeOptions(true);
          return;
        }
      }
      if (!isHintKey3(e)) e.stopPropagation();
    });
    portal.append(shell);
    syncOptions();
    const updatePosition = () => {
      if (!popup) return;
      if (!host.isConnected || preview2.getClientRects().length === 0) {
        closeOptions();
        return;
      }
      const p = getDropdownPosition(preview2, portal, { dropdownHeight: popup.scrollHeight + 2, width: 280, maxHeight: 480, preferSide: true, fixed: true, gap: 8 });
      Object.assign(popup.style, { left: `${p.left}px`, top: `${p.top}px`, width: `${p.width}px`, maxHeight: `${p.maxHeight}px`, transformOrigin: p.above ? "bottom" : "top" });
    };
    stopPosition = observeDropdownPosition(preview2, updatePosition, () => popup);
    preview2.dataset.open = "true";
    preview2.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focusOutside);
    if (event instanceof MouseEvent && event.detail > 0) shell.focus({ preventScroll: true });
    else fits.buttons.find((button) => button.dataset.active === "true")?.focus({ preventScroll: true });
  };
  preview2.addEventListener("click", openOptions);
  body.append(solidPane, gradientPane, mediaPane);
  (folder?.body ?? host).append(root);
  let heightAnim;
  let heightTarget = -1;
  let built = false;
  let shownMode = value.mode;
  function render() {
    if (destroyed) return;
    const animate3 = built && root.isConnected && root.getClientRects().length > 0 && !reducedMotion();
    const beforeHeight = root.getBoundingClientRect().height;
    const listTop = stopsList.getBoundingClientRect().top;
    const before = /* @__PURE__ */ new Map();
    if (animate3 && stopsList.getClientRects().length > 0) {
      for (const row of rowById.values()) if (!row.leaving) before.set(row.id, row.root.getBoundingClientRect().top);
    }
    renderNow(before, listTop, animate3);
    built = true;
    if (!animate3) return;
    if (value.mode !== shownMode) {
      shownMode = value.mode;
      const pane = value.mode === "solid" ? solidPane : value.mode === "gradient" ? gradientPane : mediaPane;
      animateSpring(pane, (p) => ({ opacity: String(clamp4(p, 0, 1)) }), LAYOUT_SPRING.visualDuration, 0);
    }
    const after = body.getBoundingClientRect().height;
    if (heightAnim && Math.abs(after - heightTarget) < 0.5) return;
    if (Math.abs(after - beforeHeight) < 0.5) {
      heightAnim?.cancel();
      return;
    }
    heightAnim?.cancel();
    root.style.overflowY = "clip";
    heightTarget = after;
    const anim = animateSpring(root, (p) => ({ height: `${beforeHeight + (after - beforeHeight) * p}px` }), LAYOUT_SPRING.visualDuration, LAYOUT_SPRING.bounce);
    heightAnim = anim;
    if (!anim) {
      root.style.overflowY = "";
      heightTarget = -1;
      return;
    }
    const done = () => {
      if (heightAnim !== anim) return;
      heightAnim = void 0;
      heightTarget = -1;
      root.style.overflowY = "";
    };
    anim.onfinish = done;
    anim.oncancel = done;
  }
  function renderNow(before, listTop, animate3) {
    shownMode = animate3 ? shownMode : value.mode;
    const backgroundHost = getBackgroundHost();
    folder?.update({ title: props.label });
    modes.group.setAttribute("aria-label", `${props.label} type`);
    modes.set(value.mode);
    solidPane.hidden = value.mode !== "solid";
    gradientPane.hidden = value.mode !== "gradient";
    mediaPane.hidden = value.mode !== "media";
    if (value.mode !== "media" || !value.media) closeOptions();
    solid.update({ label: "Color", value: solidValue(), onChange: (raw) => {
      const picked = readPicked(raw);
      if (!picked) return;
      solidPicked = { raw, color: picked.color };
      emit({ ...value, color: picked.color });
    } });
    const gradient = value.gradient;
    const stops = gradient.stops;
    selected = clamp4(selected, 0, stops.length - 1);
    shapeValue.textContent = SHAPE_LABEL[gradient.shape];
    shapeMenu.refresh();
    if (gizmoRowId !== void 0 && !rowById.has(gizmoRowId)) exitGizmo();
    if (gizmoRowId !== void 0) {
      ensureGizmo();
      gizmo?.update(gizmoProps());
    }
    syncTrackStyle();
    paintTrack();
    if (handles.length !== stops.length) buildHandles();
    handles.forEach((handle, i) => {
      const stop = stops[i];
      handle.style.setProperty("--dial-bg-at", `${stop.at}%`);
      stems[i]?.style.setProperty("--dial-bg-at", `${stop.at}%`);
      handle.style.setProperty("--dial-bg-stop", stopCssColor(stop));
      handle.setAttribute("aria-label", `Stop ${i + 1} position`);
      handle.setAttribute("aria-valuenow", String(stop.at));
      handle.setAttribute("aria-valuetext", `${formatNumber(stop.at)}%, ${stop.color}`);
      handle.style.zIndex = i === selected ? "2" : "1";
    });
    syncGripStyle();
    reconcileIds();
    syncRows(before, listTop, animate3);
    liveRows().forEach((row, i) => {
      const stop = stops[i];
      row.at.sync();
      row.alpha.sync();
      const picked = row.picked && row.picked.color === stop.color && row.picked.alpha === stop.alpha ? row.picked.raw : stopPickerValue(stop);
      row.color.update({ label: `Stop ${i + 1}`, value: picked, onChange: (raw) => pickStopColor(row, raw) });
      row.remove.disabled = stops.length <= BACKGROUND_MIN_STOPS;
      row.remove.setAttribute("aria-label", `Remove stop ${i + 1}`);
      row.grip.setAttribute("aria-label", "Reorder stop");
      row.grip.setAttribute("aria-description", `Stop ${i + 1} of ${stops.length}. Drag, or press Alt with the up or down arrow, to move it.`);
    });
    renderSelection();
    addButton.disabled = stops.length >= BACKGROUND_MAX_STOPS;
    bar.toggleAttribute("data-full", stops.length >= BACKGROUND_MAX_STOPS);
    saveRow.hidden = !backgroundHost.saveGradient;
    saveButton.disabled = saving;
    saveButton.textContent = saving ? "Saving\u2026" : "Save gradient";
    gradientStatusLine.textContent = gradientStatus;
    gradientStatusLine.hidden = !gradientStatus;
    buildSaved();
    savedList.hidden = savedItems.length === 0;
    savedItems.forEach((item) => item.swatch.setAttribute("aria-pressed", String(sameGradient(item.gradient, gradient))));
    const canUpload = !!backgroundHost.upload;
    const media = value.media;
    drop.hidden = !!media;
    drop.disabled = !canUpload || uploading;
    drop.setAttribute("aria-busy", String(uploading));
    dropText.textContent = !canUpload ? "Uploads are not available here." : uploading ? "Uploading\u2026" : "Upload or drop an image or a video";
    preview2.hidden = !media;
    actions.hidden = !media;
    if (media) renderPreview(media);
    else previewSignature = "";
    const display = value.mediaDisplay;
    const fitText = display.fit === "tile" ? `Tile ${Math.round(display.tileScale * 100)}%` : FIT_LABEL[display.fit];
    previewBadge.textContent = `${fitText} \xB7 ${RATIO_LABEL(display.ratio)} \xB7 ${formatNumber(display.zoom)}\xD7`;
    replaceButton.disabled = !canUpload || uploading;
    replaceButton.setAttribute("aria-busy", String(uploading));
    replaceButton.textContent = uploading ? "Uploading\u2026" : "Replace";
    removeButton.disabled = uploading;
    mediaPane.toggleAttribute("data-busy", uploading);
    mediaStatusLine.textContent = mediaStatus;
    mediaStatusLine.hidden = !mediaStatus;
    mediaStatusLine.toggleAttribute("data-error", mediaError);
    syncOptions();
  }
  const unsubscribe = subscribeBackgroundHost(() => render());
  render();
  return {
    update(next) {
      props = next;
      const incoming = normalizeBackgroundValue(next.value);
      if (!sameBackgroundValue(incoming, value)) {
        cancelRowDrag();
        endDrag();
        value = incoming;
        reconcileIds();
      }
      render();
    },
    destroy() {
      destroyed = true;
      unhint([...hinted]);
      uploadRequest++;
      unsubscribe();
      endDrag();
      closeOptions();
      solid.destroy();
      heightAnim?.cancel();
      shapeMenu.destroy();
      shapeMenuWatch.disconnect();
      document.removeEventListener("pointerdown", markPointer, true);
      document.removeEventListener("keydown", markKeyboard, true);
      trackResize?.disconnect();
      pickerWatch.disconnect();
      exitGizmo();
      rowDrag = void 0;
      rowById.forEach((row) => dropRow(row));
      rowById.clear();
      root.remove();
      folder?.destroy();
    }
  };
}
function conditionalRow(row, parent) {
  const { visualDuration, bounce } = LAYOUT_SPRING;
  let shown;
  let animation;
  row.style.overflow = "clip";
  return {
    set(show) {
      if (show === shown) return;
      const first = shown === void 0;
      shown = show;
      animation?.cancel();
      animation = void 0;
      if (first || !row.isConnected) {
        row.hidden = !show;
        return;
      }
      const gap = Number.parseFloat(getComputedStyle(parent).rowGap) || 0;
      row.hidden = false;
      const size = show ? row.scrollHeight : row.offsetHeight;
      animation = animateSpring(row, (p) => {
        const t = show ? p : 1 - p;
        return { height: `${Math.max(0, size * t)}px`, opacity: String(clamp4(t, 0, 1)), marginBottom: `${-gap * (1 - clamp4(t, 0, 1))}px` };
      }, visualDuration, bounce);
      if (!show) {
        if (!animation) row.hidden = true;
        else animation.onfinish = () => {
          if (!shown) row.hidden = true;
        };
      }
    }
  };
}
function shellSlider(options) {
  const { min, max, step, scale, decimals, unit: unitText, read, apply } = options;
  const root = element6("div", "dialkit-slider-wrapper dialkit-bg-slider");
  const slider = element6("div", "dialkit-slider");
  slider.tabIndex = 0;
  slider.setAttribute("role", "slider");
  slider.setAttribute("aria-label", options.label);
  slider.setAttribute("aria-valuemin", String(min));
  slider.setAttribute("aria-valuemax", String(max));
  const fill = element6("div", "dialkit-slider-fill");
  const handle = element6("div", "dialkit-slider-handle dialkit-bg-slider-handle");
  const label = element6("span", "dialkit-slider-label", options.label);
  const valueText = element6("span", "dialkit-slider-value");
  const number2 = element6("span", "dialkit-bg-slider-number");
  const unit = element6("span", "dialkit-slider-unit", unitText);
  valueText.append(number2, unit);
  const input = element6("input", "dialkit-slider-input");
  input.type = "text";
  input.inputMode = "decimal";
  input.setAttribute("aria-label", `${options.label} value`);
  input.hidden = true;
  slider.append(fill, handle, label, valueText, input);
  root.append(slider);
  const digits = Math.max(0, Math.ceil(-Math.log10(step) - 1e-9));
  const set = (n) => {
    const snapped = min + Math.round((clamp4(n, min, max) - min) / step) * step;
    apply(Number(clamp4(snapped, min, max).toFixed(digits)));
  };
  const shown = (n) => (n * scale).toFixed(decimals);
  let press;
  const fromPointer = (clientX) => {
    const rect = root.getBoundingClientRect();
    return min + clamp4((clientX - rect.left) / (rect.width || 1), 0, 1) * (max - min);
  };
  let editing = false;
  const finishEdit = (keep) => {
    if (!editing) return;
    editing = false;
    const n = Number.parseFloat(input.value.replace(unitText, ""));
    if (keep && Number.isFinite(n)) set(n / scale);
    input.hidden = true;
    valueText.hidden = false;
    sync();
  };
  const edit = () => {
    editing = true;
    input.value = shown(read());
    input.hidden = false;
    valueText.hidden = true;
    input.focus();
    input.select();
  };
  slider.addEventListener("keydown", (event) => handleSliderKey(event, read(), min, max, step, set, edit));
  slider.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || editing) return;
    event.preventDefault();
    slider.focus({ preventScroll: true });
    try {
      slider.setPointerCapture(event.pointerId);
    } catch {
      return;
    }
    press = { id: event.pointerId };
    slider.classList.add("dialkit-slider-active");
    set(fromPointer(event.clientX));
  });
  slider.addEventListener("pointermove", (event) => {
    if (press?.id === event.pointerId) set(fromPointer(event.clientX));
  });
  const end = (event) => {
    if (press?.id !== event.pointerId) return;
    press = void 0;
    if (!slider.matches(":hover")) slider.classList.remove("dialkit-slider-active");
    if (slider.hasPointerCapture(event.pointerId)) slider.releasePointerCapture(event.pointerId);
  };
  slider.addEventListener("pointerup", end);
  slider.addEventListener("pointercancel", end);
  slider.addEventListener("lostpointercapture", end);
  slider.addEventListener("mouseenter", () => slider.classList.add("dialkit-slider-active"));
  slider.addEventListener("mouseleave", () => {
    if (!press) slider.classList.remove("dialkit-slider-active");
  });
  valueText.addEventListener("pointerdown", (event) => event.stopPropagation());
  valueText.addEventListener("click", edit);
  input.addEventListener("pointerdown", (event) => event.stopPropagation());
  input.addEventListener("keydown", (event) => {
    event.stopPropagation();
    const stepped = stepInputKey(event, input.value, read() * scale, min * scale, max * scale, step * scale);
    if (stepped !== void 0) {
      set(stepped / scale);
      input.value = shown(read());
      return;
    }
    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault();
      finishEdit(event.key === "Enter");
      slider.focus({ preventScroll: true });
    }
  });
  input.addEventListener("blur", () => finishEdit(true));
  function sync() {
    const n = read();
    const pct = (n - min) / (max - min) * 100;
    fill.style.width = `${pct}%`;
    handle.style.left = `max(5px, calc(${pct}% - 9px))`;
    if (!editing) number2.textContent = shown(n);
    slider.setAttribute("aria-valuenow", String(n));
    slider.setAttribute("aria-valuetext", `${shown(n)}${unitText}`);
  }
  sync();
  return { root, sync };
}

// src/vue/components/BackgroundControl.ts
var BackgroundControl = defineComponent5({
  name: "DialKitBackgroundControl",
  props: {
    label: { type: String, required: true },
    value: { type: Object, required: true }
  },
  emits: ["change"],
  setup(props, { emit }) {
    const host = ref5();
    let control;
    const options = () => ({ label: props.label, value: props.value, onChange: (value) => emit("change", value) });
    onMounted7(() => {
      control = mountBackgroundControl(host.value, options());
    });
    watchEffect4(() => {
      const next = options();
      control?.update(next);
    });
    onUnmounted7(() => control?.destroy());
    return () => h5("div", { ref: host, class: "dialkit-bg-host" });
  }
});

// src/vue/components/SelectControl.ts
import { Teleport, defineComponent as defineComponent6, h as h6, onMounted as onMounted8, ref as ref6, watch as watch3 } from "vue";
import { AnimatePresence as AnimatePresence2, motion as motion2 } from "motion-v";
function toTitleCase(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
function normalizeOptions(options) {
  return options.map(
    (option) => typeof option === "string" ? { value: option, label: toTitleCase(option) } : option
  );
}
var SelectControl = defineComponent6({
  name: "DialKitSelectControl",
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
    options: {
      type: Array,
      required: true
    }
  },
  emits: ["change"],
  setup(props, { emit }) {
    const isOpen = ref6(false);
    const pos = ref6(null);
    const portalTarget = ref6(null);
    const triggerRef = ref6(null);
    const dropdownRef = ref6(null);
    const normalizedOptions = () => normalizeOptions(props.options);
    const selectedLabel = () => normalizedOptions().find((option) => option.value === props.value)?.label ?? props.value;
    const updatePos = () => {
      if (!triggerRef.value || !portalTarget.value) return;
      const dropdownHeight = dropdownRef.value ? dropdownRef.value.scrollHeight + 2 : 10 + normalizedOptions().length * 36;
      pos.value = getDropdownPosition(triggerRef.value, portalTarget.value, { dropdownHeight, fixed: true });
    };
    const openDropdown = () => {
      updatePos();
      isOpen.value = true;
    };
    const closeDropdown = () => {
      isOpen.value = false;
    };
    const setDropdownRef = (node) => {
      if (node instanceof HTMLElement) {
        dropdownRef.value = node;
        return;
      }
      if (node && typeof node === "object" && "$el" in node) {
        const el = node.$el;
        dropdownRef.value = el instanceof HTMLElement ? el : null;
        return;
      }
      dropdownRef.value = null;
    };
    const toggleDropdown = () => {
      if (isOpen.value) closeDropdown();
      else openDropdown();
    };
    watch3(isOpen, (open, _, onCleanup) => {
      if (!open) return;
      const handleViewportChange = () => updatePos();
      const handleDocumentClick = (event) => {
        const target = event.target;
        if (triggerRef.value?.contains(target) || dropdownRef.value?.contains(target)) return;
        closeDropdown();
      };
      const stopPosition = observeDropdownPosition(triggerRef.value, updatePos, () => dropdownRef.value);
      const stopKeyboard = observeDropdownKeyboard(triggerRef.value, () => dropdownRef.value, closeDropdown);
      document.addEventListener("mousedown", handleDocumentClick);
      window.addEventListener("resize", handleViewportChange);
      window.addEventListener("scroll", handleViewportChange, true);
      onCleanup(() => {
        stopKeyboard();
        stopPosition();
        document.removeEventListener("mousedown", handleDocumentClick);
        window.removeEventListener("resize", handleViewportChange);
        window.removeEventListener("scroll", handleViewportChange, true);
      });
    });
    onMounted8(() => {
      portalTarget.value = getDialKitPortalRoot(triggerRef.value) ?? document.body;
    });
    return () => h6("div", { class: "dialkit-select-row" }, [
      h6("button", {
        ref: triggerRef,
        class: "dialkit-select-trigger",
        "data-open": String(isOpen.value),
        type: "button",
        "aria-haspopup": "listbox",
        "aria-expanded": isOpen.value,
        disabled: !props.options.length,
        onKeydown: (e) => openDropdownOnKey(e, openDropdown),
        onClick: toggleDropdown
      }, [
        h6("span", { class: "dialkit-select-label" }, props.label),
        h6("div", { class: "dialkit-select-right" }, [
          h6("span", { class: "dialkit-select-value" }, selectedLabel()),
          h6(motion2.svg, {
            class: "dialkit-select-chevron",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2.5",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            animate: { rotate: isOpen.value ? 180 : 0 },
            transition: { type: "spring", visualDuration: 0.2, bounce: 0.15 }
          }, [h6("path", { d: "M6 9.5L12 15.5L18 9.5" })])
        ])
      ]),
      portalTarget.value ? h6(Teleport, { to: portalTarget.value }, [
        h6(AnimatePresence2, null, {
          default: () => isOpen.value && pos.value ? [h6(motion2.div, {
            key: "dialkit-select-dropdown",
            ref: setDropdownRef,
            class: "dialkit-select-dropdown",
            initial: { opacity: 0, y: pos.value.above ? 8 : -8, scale: 0.95 },
            animate: { opacity: 1, y: 0, scale: 1 },
            exit: { opacity: 0, y: pos.value.above ? 8 : -8, scale: 0.95 },
            transition: { type: "spring", visualDuration: 0.15, bounce: 0 },
            style: {
              position: "fixed",
              left: `${pos.value.left}px`,
              top: `${pos.value.top}px`,
              width: `${pos.value.width}px`,
              maxHeight: `${pos.value.maxHeight}px`,
              transformOrigin: pos.value.above ? "bottom" : "top"
            }
          }, normalizedOptions().map((option) => h6("button", {
            key: option.value,
            class: "dialkit-select-option",
            "data-selected": String(option.value === props.value),
            onClick: () => {
              emit("change", option.value);
              closeDropdown();
            }
          }, option.label)))] : []
        })
      ]) : null
    ]);
  }
});

// src/vue/components/ShortcutListener.ts
import { defineComponent as defineComponent7, inject, onMounted as onMounted9, onUnmounted as onUnmounted8, provide, ref as ref7 } from "vue";
var ShortcutKey = /* @__PURE__ */ Symbol("DialKitShortcut");
function useShortcutContext() {
  return inject(ShortcutKey, {
    activePanelId: ref7(null),
    activePath: ref7(null)
  });
}
var ShortcutListener = defineComponent7({
  name: "DialKitShortcutListener",
  setup(_, { slots }) {
    const activePanelId = ref7(null);
    const activePath = ref7(null);
    const activeKeys = /* @__PURE__ */ new Set();
    let isDragging = false;
    let lastMouseX = null;
    let dragAccumulator = 0;
    provide(ShortcutKey, { activePanelId, activePath });
    const resolveActiveTarget = (interaction) => {
      for (const key of activeKeys) {
        const panels = DialStore.getPanels();
        for (const panel of panels) {
          for (const [path, shortcut] of Object.entries(panel.shortcuts)) {
            if (!shortcut.key) continue;
            if (shortcut.key.toLowerCase() !== key) continue;
            if ((shortcut.interaction ?? "scroll") !== interaction) continue;
            const control = DialStore.getPanel(panel.id)?.controls ? findControl(panel.controls, path) : null;
            if (control && control.type === "slider") {
              return { panelId: panel.id, path, control, shortcut };
            }
          }
        }
      }
      return null;
    };
    const handleKeyDown = (e) => {
      if (isInputFocused()) return;
      const key = e.key.toLowerCase();
      if (key === "arrowleft" || key === "arrowright" || key === "arrowup" || key === "arrowdown") {
        if (activeKeys.size > 0) {
          const target2 = resolveActiveTarget("scroll") || resolveActiveTarget("drag") || resolveActiveTarget("move");
          if (target2 && target2.control.type === "slider") {
            e.preventDefault();
            const direction = key === "arrowright" || key === "arrowup" ? 1 : -1;
            const effectiveStep = getEffectiveStep(target2.control, target2.shortcut);
            applySliderDelta(target2.panelId, target2.path, target2.control, effectiveStep, direction);
            return;
          }
        }
      }
      const wasAlreadyHeld = activeKeys.has(key);
      activeKeys.add(key);
      const modifier = getActiveModifier(e);
      const target = DialStore.resolveShortcutTarget(key, modifier);
      if (target) {
        activePanelId.value = target.panelId;
        activePath.value = target.path;
        if (!wasAlreadyHeld && target.control.type === "toggle") {
          const currentValue = DialStore.getValue(target.panelId, target.path);
          DialStore.updateValue(target.panelId, target.path, !currentValue);
        }
      }
      if (!wasAlreadyHeld) {
        lastMouseX = null;
        dragAccumulator = 0;
      }
    };
    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      activeKeys.delete(key);
      isDragging = false;
      lastMouseX = null;
      dragAccumulator = 0;
      if (activeKeys.size === 0) {
        activePanelId.value = null;
        activePath.value = null;
      } else {
        let found = false;
        for (const remainingKey of activeKeys) {
          const modifier = getActiveModifier(e);
          const target = DialStore.resolveShortcutTarget(remainingKey, modifier);
          if (target) {
            activePanelId.value = target.panelId;
            activePath.value = target.path;
            found = true;
            break;
          }
        }
        if (!found) {
          activePanelId.value = null;
          activePath.value = null;
        }
      }
    };
    const handleWheel = (e) => {
      if (isInputFocused()) return;
      const modifier = getActiveModifier(e);
      if (activeKeys.size > 0) {
        for (const key of activeKeys) {
          const target = DialStore.resolveShortcutTarget(key, modifier);
          if (!target) continue;
          const { panelId, path, control } = target;
          const interaction = control.shortcut?.interaction ?? "scroll";
          if (interaction !== "scroll" || control.type !== "slider") continue;
          e.preventDefault();
          const effectiveStep = getEffectiveStep(control, control.shortcut);
          const direction = e.deltaY > 0 ? -1 : 1;
          applySliderDelta(panelId, path, control, effectiveStep, direction);
          return;
        }
      }
      const scrollOnlyTargets = DialStore.resolveScrollOnlyTargets();
      for (const { panelId, path, control, shortcut } of scrollOnlyTargets) {
        if (control.type !== "slider") continue;
        e.preventDefault();
        const effectiveStep = getEffectiveStep(control, shortcut);
        const direction = e.deltaY > 0 ? -1 : 1;
        applySliderDelta(panelId, path, control, effectiveStep, direction);
        return;
      }
    };
    const handleMouseDown = (e) => {
      if (isInputFocused()) return;
      if (activeKeys.size === 0) return;
      const target = resolveActiveTarget("drag");
      if (target) {
        isDragging = true;
        lastMouseX = e.clientX;
        dragAccumulator = 0;
        e.preventDefault();
      }
    };
    const handleMouseUp = () => {
      isDragging = false;
      lastMouseX = null;
      dragAccumulator = 0;
    };
    const handleMouseMove = (e) => {
      if (isInputFocused()) return;
      if (activeKeys.size === 0) return;
      if (isDragging) {
        const target = resolveActiveTarget("drag");
        if (target && lastMouseX !== null) {
          const deltaX = e.clientX - lastMouseX;
          lastMouseX = e.clientX;
          dragAccumulator += deltaX;
          const effectiveStep = getEffectiveStep(target.control, target.shortcut);
          const steps = Math.trunc(dragAccumulator / DRAG_SENSITIVITY);
          if (steps !== 0) {
            dragAccumulator -= steps * DRAG_SENSITIVITY;
            applySliderDelta(target.panelId, target.path, target.control, effectiveStep, steps);
          }
        }
        return;
      }
      const moveTarget = resolveActiveTarget("move");
      if (moveTarget) {
        if (lastMouseX === null) {
          lastMouseX = e.clientX;
          return;
        }
        const deltaX = e.clientX - lastMouseX;
        lastMouseX = e.clientX;
        dragAccumulator += deltaX;
        const effectiveStep = getEffectiveStep(moveTarget.control, moveTarget.shortcut);
        const steps = Math.trunc(dragAccumulator / DRAG_SENSITIVITY);
        if (steps !== 0) {
          dragAccumulator -= steps * DRAG_SENSITIVITY;
          applySliderDelta(moveTarget.panelId, moveTarget.path, moveTarget.control, effectiveStep, steps);
        }
      }
    };
    const handleWindowBlur = () => {
      activeKeys.clear();
      isDragging = false;
      lastMouseX = null;
      dragAccumulator = 0;
      activePanelId.value = null;
      activePath.value = null;
    };
    onMounted9(() => {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      window.addEventListener("wheel", handleWheel, { passive: false });
      window.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("blur", handleWindowBlur);
    });
    onUnmounted8(() => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("blur", handleWindowBlur);
    });
    return () => slots.default?.();
  }
});

// src/vue/components/Slider.ts
import { defineComponent as defineComponent8, h as h8, computed as computed4, nextTick, onMounted as onMounted10, onUnmounted as onUnmounted9, ref as ref8, watch as watch4 } from "vue";
import { animate, motionValue } from "motion-v";
var CLICK_THRESHOLD = 3;
var DEAD_ZONE = 32;
var MAX_CURSOR_RANGE = 200;
var MAX_STRETCH = 8;
var Slider = defineComponent8({
  name: "DialKitSlider",
  props: {
    label: { type: String, required: true },
    value: { type: Number, required: true },
    min: { type: Number, required: false },
    max: { type: Number, required: false },
    step: { type: Number, required: false },
    unit: { type: String, required: false },
    shortcut: { type: Object, default: void 0 },
    shortcutActive: { type: Boolean, default: false }
  },
  emits: ["change"],
  setup(props, { emit }) {
    const min = computed4(() => props.min ?? 0);
    const max = computed4(() => props.max ?? 1);
    const step = computed4(() => props.step ?? 0.01);
    const wrapperRef = ref8(null);
    const trackRef = ref8(null);
    const fillRef = ref8(null);
    const handleRef = ref8(null);
    const labelRef = ref8(null);
    const valueSpanRef = ref8(null);
    const inputRef = ref8(null);
    const isInteracting = ref8(false);
    const isDragging = ref8(false);
    const isHovered = ref8(false);
    const isValueHovered = ref8(false);
    const isValueEditable = ref8(false);
    const showInput = ref8(false);
    const inputValue = ref8("");
    let editingEnded = false;
    const fillPercent = motionValue((props.value - min.value) / (max.value - min.value) * 100);
    const rubberStretchPx = motionValue(0);
    const handleOpacityMv = motionValue(0);
    const handleScaleXMv = motionValue(0.25);
    const handleScaleYMv = motionValue(1);
    const percentage = computed4(() => (props.value - min.value) / (max.value - min.value) * 100);
    const isActive = computed4(() => isInteracting.value || isHovered.value);
    const displayValue = computed4(() => props.value.toFixed(decimalsForStep(step.value, min.value, max.value)));
    let pointerDownPos = null;
    let isClickFlag = true;
    let wrapperRect = null;
    let scaleVal = 1;
    let hoverTimeout = null;
    let snapAnim = null;
    let rubberAnim = null;
    let handleOpacityAnim = null;
    let handleScaleXAnim = null;
    let handleScaleYAnim = null;
    const applyFillStyles = (pct) => {
      if (fillRef.value) fillRef.value.style.width = `${pct}%`;
      if (handleRef.value) handleRef.value.style.left = `max(5px, calc(${pct}% - 9px))`;
    };
    const applyRubberStyles = (stretch) => {
      if (!trackRef.value) return;
      trackRef.value.style.width = `calc(100% + ${Math.abs(stretch)}px)`;
      trackRef.value.style.transform = `translateX(${stretch < 0 ? stretch : 0}px)`;
    };
    const applyHandleVisualStyles = () => {
      if (!handleRef.value) return;
      handleRef.value.style.opacity = String(handleOpacityMv.get());
      handleRef.value.style.transform = `translateY(-50%) scaleX(${handleScaleXMv.get()}) scaleY(${handleScaleYMv.get()})`;
    };
    const positionToValue = (clientX) => {
      if (!wrapperRect) return props.value;
      const screenX = clientX - wrapperRect.left;
      const sceneX = screenX / scaleVal;
      const nativeWidth = wrapperRef.value ? wrapperRef.value.offsetWidth : wrapperRect.width;
      const pct = Math.max(0, Math.min(1, sceneX / nativeWidth));
      const rawValue = min.value + pct * (max.value - min.value);
      return Math.max(min.value, Math.min(max.value, rawValue));
    };
    const percentFromValue = (value) => (value - min.value) / (max.value - min.value) * 100;
    const computeRubberStretch = (clientX, sign) => {
      if (!wrapperRect) return 0;
      const distancePast = sign < 0 ? wrapperRect.left - clientX : clientX - wrapperRect.right;
      const overflow = Math.max(0, distancePast - DEAD_ZONE);
      return sign * MAX_STRETCH * Math.sqrt(Math.min(overflow / MAX_CURSOR_RANGE, 1));
    };
    const leftThreshold = () => {
      const HANDLE_BUFFER = 8;
      const LABEL_CSS_LEFT = 10;
      const trackWidth = wrapperRef.value?.offsetWidth;
      if (trackWidth && labelRef.value) {
        return (LABEL_CSS_LEFT + labelRef.value.offsetWidth + HANDLE_BUFFER) / trackWidth * 100;
      }
      return 30;
    };
    const rightThreshold = () => {
      const HANDLE_BUFFER = 8;
      const VALUE_CSS_RIGHT = 12;
      const trackWidth = wrapperRef.value?.offsetWidth;
      if (trackWidth && valueSpanRef.value) {
        return (trackWidth - VALUE_CSS_RIGHT - valueSpanRef.value.offsetWidth - HANDLE_BUFFER) / trackWidth * 100;
      }
      return 78;
    };
    const valueDodge = () => percentage.value < leftThreshold() || percentage.value > rightThreshold();
    const handleOpacity = () => {
      if (!isActive.value) return 0;
      if (valueDodge()) return 0.1;
      if (isDragging.value) return 0.9;
      return 0.5;
    };
    const animateHandleState = () => {
      const targetOpacity = handleOpacity();
      const targetScaleX = isActive.value ? 1 : 0.25;
      const targetScaleY = isActive.value && valueDodge() ? 0.75 : 1;
      handleOpacityAnim?.stop();
      handleScaleXAnim?.stop();
      handleScaleYAnim?.stop();
      handleOpacityAnim = animate(handleOpacityMv, targetOpacity, { duration: 0.15 });
      handleScaleXAnim = animate(handleScaleXMv, targetScaleX, {
        type: "spring",
        visualDuration: 0.25,
        bounce: 0.15
      });
      handleScaleYAnim = animate(handleScaleYMv, targetScaleY, {
        type: "spring",
        visualDuration: 0.2,
        bounce: 0.1
      });
    };
    const handlePointerDown = (event) => {
      if (showInput.value) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      pointerDownPos = { x: event.clientX, y: event.clientY };
      isClickFlag = true;
      isInteracting.value = true;
      if (wrapperRef.value) {
        wrapperRect = wrapperRef.value.getBoundingClientRect();
        scaleVal = wrapperRect.width / wrapperRef.value.offsetWidth;
      }
    };
    const handlePointerMove = (event) => {
      if (!isInteracting.value || !pointerDownPos) return;
      const dx = event.clientX - pointerDownPos.x;
      const dy = event.clientY - pointerDownPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (isClickFlag && distance > CLICK_THRESHOLD) {
        isClickFlag = false;
        isDragging.value = true;
      }
      if (!isClickFlag) {
        if (wrapperRect) {
          if (event.clientX < wrapperRect.left) {
            rubberStretchPx.jump(computeRubberStretch(event.clientX, -1));
          } else if (event.clientX > wrapperRect.right) {
            rubberStretchPx.jump(computeRubberStretch(event.clientX, 1));
          } else {
            rubberStretchPx.jump(0);
          }
        }
        const nextValue = positionToValue(event.clientX);
        const nextPct = percentFromValue(nextValue);
        if (snapAnim) {
          snapAnim.stop();
          snapAnim = null;
        }
        fillPercent.jump(nextPct);
        emit("change", roundValue(nextValue, step.value, min.value, max.value));
      }
    };
    const handlePointerUp = (event) => {
      if (!isInteracting.value) return;
      if (isClickFlag) {
        const rawValue = positionToValue(event.clientX);
        const discreteSteps2 = (max.value - min.value) / step.value;
        const snappedValue = discreteSteps2 <= 10 ? Math.max(min.value, Math.min(max.value, min.value + Math.round((rawValue - min.value) / step.value) * step.value)) : snapToDecile(rawValue, min.value, max.value);
        const nextPct = percentFromValue(snappedValue);
        snapAnim?.stop();
        snapAnim = animate(fillPercent, nextPct, {
          type: "spring",
          stiffness: 300,
          damping: 25,
          mass: 0.8,
          onComplete: () => {
            snapAnim = null;
          }
        });
        emit("change", roundValue(snappedValue, step.value, min.value, max.value));
      }
      if (rubberStretchPx.get() !== 0) {
        rubberAnim?.stop();
        rubberAnim = animate(rubberStretchPx, 0, {
          type: "spring",
          visualDuration: 0.35,
          bounce: 0.15
        });
      }
      isInteracting.value = false;
      isDragging.value = false;
      pointerDownPos = null;
    };
    const handlePointerCancel = () => {
      if (!isInteracting.value) return;
      isInteracting.value = false;
      isDragging.value = false;
      rubberStretchPx.jump(0);
      pointerDownPos = null;
    };
    const handleInputSubmit = () => {
      if (editingEnded) return;
      editingEnded = true;
      const parsed = parseFloat(inputValue.value);
      if (!Number.isNaN(parsed)) {
        const clamped = Math.max(min.value, Math.min(max.value, parsed));
        emit("change", roundValue(clamped, step.value, min.value, max.value));
      }
      showInput.value = false;
      isValueHovered.value = false;
      isValueEditable.value = false;
    };
    const handleValueClick = (event) => {
      if (!isValueEditable.value) return;
      event.stopPropagation();
      event.preventDefault();
      editingEnded = false;
      showInput.value = true;
      inputValue.value = props.value.toFixed(decimalsForStep(step.value, min.value, max.value));
    };
    const handleInputKeydown = (event) => {
      event.stopPropagation();
      const stepped = stepInputKey(event, inputValue.value, props.value, min.value, max.value, step.value);
      if (stepped !== void 0) {
        emit("change", stepped);
        inputValue.value = stepped.toFixed(decimalsForStep(step.value, min.value, max.value));
        return;
      }
      if (event.key !== "Enter" && event.key !== "Escape") return;
      event.preventDefault();
      if (event.key === "Enter") handleInputSubmit();
      else {
        editingEnded = true;
        showInput.value = false;
        isValueHovered.value = false;
      }
      queueMicrotask(() => trackRef.value?.focus({ preventScroll: true }));
    };
    watch4(() => props.value, () => {
      if (!isInteracting.value && !snapAnim) {
        fillPercent.jump(percentage.value);
      }
    });
    watch4([isInteracting, isHovered, isDragging, () => props.value], () => {
      animateHandleState();
    });
    watch4([isValueHovered, showInput, isValueEditable], () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }
      if (isValueHovered.value && !showInput.value && !isValueEditable.value) {
        hoverTimeout = setTimeout(() => {
          isValueEditable.value = true;
          animateHandleState();
        }, sliderEditDelay(valueSpanRef.value));
      } else if (!isValueHovered.value && !showInput.value) {
        isValueEditable.value = false;
      }
    });
    watch4(showInput, async (visible) => {
      if (!visible) return;
      await nextTick();
      inputRef.value?.focus();
      inputRef.value?.select();
    });
    const discreteSteps = computed4(() => (max.value - min.value) / step.value);
    const hashMarks = computed4(() => {
      const marks = [];
      if (discreteSteps.value <= 10) {
        const count = Math.max(0, Math.floor(discreteSteps.value) - 1);
        for (let i = 0; i < count; i += 1) {
          const pct = (i + 1) * step.value / (max.value - min.value) * 100;
          marks.push(h8("div", { class: "dialkit-slider-hashmark", style: { left: `${pct}%` } }));
        }
        return marks;
      }
      for (let i = 0; i < 9; i += 1) {
        const pct = (i + 1) * 10;
        marks.push(h8("div", { class: "dialkit-slider-hashmark", style: { left: `${pct}%` } }));
      }
      return marks;
    });
    let unsubFill = null;
    let unsubRubber = null;
    let unsubHandleOpacity = null;
    let unsubHandleScaleX = null;
    let unsubHandleScaleY = null;
    onMounted10(() => {
      unsubFill = fillPercent.on("change", applyFillStyles);
      unsubRubber = rubberStretchPx.on("change", applyRubberStyles);
      unsubHandleOpacity = handleOpacityMv.on("change", applyHandleVisualStyles);
      unsubHandleScaleX = handleScaleXMv.on("change", applyHandleVisualStyles);
      unsubHandleScaleY = handleScaleYMv.on("change", applyHandleVisualStyles);
      applyFillStyles(fillPercent.get());
      applyRubberStyles(rubberStretchPx.get());
      applyHandleVisualStyles();
      animateHandleState();
    });
    onUnmounted9(() => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      snapAnim?.stop();
      rubberAnim?.stop();
      handleOpacityAnim?.stop();
      handleScaleXAnim?.stop();
      handleScaleYAnim?.stop();
      unsubFill?.();
      unsubRubber?.();
      unsubHandleOpacity?.();
      unsubHandleScaleX?.();
      unsubHandleScaleY?.();
    });
    return () => h8("div", { ref: wrapperRef, class: "dialkit-slider-wrapper" }, [
      h8("div", {
        ref: trackRef,
        class: `dialkit-slider ${isActive.value ? "dialkit-slider-active" : ""}`,
        role: "slider",
        tabindex: showInput.value ? -1 : 0,
        "aria-label": props.label,
        "aria-valuemin": min.value,
        "aria-valuemax": max.value,
        "aria-valuenow": props.value,
        "aria-valuetext": `${displayValue.value}${props.unit ? ` ${props.unit}` : ""}`,
        onKeydown: (event) => handleSliderKey(event, props.value, min.value, max.value, step.value, (next) => {
          snapAnim?.stop();
          snapAnim = null;
          fillPercent.jump((next - min.value) / (max.value - min.value) * 100);
          emit("change", next);
        }, () => {
          editingEnded = false;
          inputValue.value = props.value.toFixed(decimalsForStep(step.value, min.value, max.value));
          showInput.value = true;
        }),
        onPointerdown: handlePointerDown,
        onPointermove: handlePointerMove,
        onPointerup: handlePointerUp,
        onPointercancel: handlePointerCancel,
        onMouseenter: () => {
          isHovered.value = true;
          animateHandleState();
        },
        onMouseleave: () => {
          isHovered.value = false;
          animateHandleState();
        }
      }, [
        h8("div", { class: "dialkit-slider-hashmarks" }, hashMarks.value),
        h8("div", {
          ref: fillRef,
          class: "dialkit-slider-fill",
          style: {
            width: `${fillPercent.get()}%`
          }
        }),
        h8("div", {
          ref: handleRef,
          class: "dialkit-slider-handle",
          style: {
            left: `max(5px, calc(${fillPercent.get()}% - 9px))`,
            transform: "translateY(-50%) scaleX(0.25) scaleY(1)",
            opacity: 0
          }
        }),
        h8("span", { ref: labelRef, class: "dialkit-slider-label" }, [
          props.label,
          props.shortcut ? h8("span", {
            class: `dialkit-shortcut-pill${props.shortcutActive ? " dialkit-shortcut-pill-active" : ""}`
          }, formatSliderShortcut(props.shortcut)) : null
        ]),
        showInput.value ? h8("input", {
          ref: inputRef,
          type: "text",
          class: "dialkit-slider-input",
          "aria-label": `${props.label} value`,
          value: inputValue.value,
          onInput: (event) => {
            inputValue.value = event.target.value;
          },
          onKeydown: handleInputKeydown,
          onBlur: handleInputSubmit,
          onPointerdown: (event) => event.stopPropagation(),
          onClick: (event) => event.stopPropagation(),
          onMousedown: (event) => event.stopPropagation()
        }) : h8("span", {
          ref: valueSpanRef,
          class: `dialkit-slider-value ${isValueEditable.value ? "dialkit-slider-value-editable" : ""}`,
          onMouseenter: () => {
            isValueHovered.value = true;
          },
          onMouseleave: () => {
            isValueHovered.value = false;
          },
          onClick: handleValueClick,
          onPointerdown: (event) => {
            if (isValueEditable.value) event.stopPropagation();
          },
          onMousedown: (event) => {
            if (isValueEditable.value) event.stopPropagation();
          },
          style: { cursor: isValueEditable.value ? "text" : "default" }
        }, displayValue.value)
      ])
    ]);
  }
});

// src/vue/components/SpringControl.ts
import { defineComponent as defineComponent11, h as h11, onMounted as onMounted12, onUnmounted as onUnmounted11, ref as ref10 } from "vue";

// src/vue/components/SegmentedControl.ts
import { defineComponent as defineComponent9, h as h9, nextTick as nextTick2, onMounted as onMounted11, onUnmounted as onUnmounted10, ref as ref9, watch as watch5 } from "vue";
import { animate as animate2 } from "motion";
var SegmentedControl = defineComponent9({
  name: "DialKitSegmentedControl",
  props: {
    options: {
      type: Array,
      required: true
    },
    value: {
      type: String,
      required: true
    }
  },
  emits: ["change"],
  setup(props, { emit }) {
    const containerRef = ref9(null);
    const pillRef = ref9(null);
    const buttonRefs = /* @__PURE__ */ new Map();
    const pillReady = ref9(false);
    let hasAnimated = false;
    let pillAnim = null;
    const measurePill = () => {
      const button = buttonRefs.get(props.value);
      const container = containerRef.value;
      if (!button || !container) return null;
      labelSegmentedControl(container);
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      return {
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width
      };
    };
    const setPillImmediate = (left, width) => {
      if (!pillRef.value) return;
      pillRef.value.style.left = `${left}px`;
      pillRef.value.style.width = `${width}px`;
      pillRef.value.style.visibility = "visible";
    };
    const updatePill = (shouldAnimate) => {
      const next = measurePill();
      if (!next) return;
      if (!pillReady.value) {
        setPillImmediate(next.left, next.width);
        pillReady.value = true;
        return;
      }
      if (!shouldAnimate || !hasAnimated || !pillRef.value) {
        pillAnim?.stop();
        pillAnim = null;
        setPillImmediate(next.left, next.width);
        return;
      }
      pillAnim?.stop();
      pillAnim = animate2(
        pillRef.value,
        {
          left: next.left,
          width: next.width
        },
        {
          type: "spring",
          visualDuration: 0.2,
          bounce: 0.15,
          onComplete: () => {
            pillAnim = null;
          }
        }
      );
    };
    let ro;
    onMounted11(() => {
      nextTick2(() => {
        updatePill(false);
        hasAnimated = true;
      });
      if (typeof ResizeObserver !== "undefined" && containerRef.value) {
        ro = new ResizeObserver(() => updatePill(false));
        ro.observe(containerRef.value);
      }
    });
    onUnmounted10(() => {
      pillAnim?.stop();
      ro?.disconnect();
    });
    watch5(
      () => props.value,
      () => {
        updatePill(true);
      },
      { flush: "post" }
    );
    return () => h9("div", { ref: containerRef, class: "dialkit-segmented", role: "radiogroup", onKeydown: handleSegmentKey }, [
      h9("div", {
        ref: pillRef,
        class: "dialkit-segmented-pill",
        style: {
          left: "0px",
          width: "0px",
          visibility: pillReady.value ? "visible" : "hidden"
        }
      }),
      ...props.options.map((option) => h9("button", {
        ref: ((el) => {
          if (el instanceof HTMLElement) {
            buttonRefs.set(option.value, el);
            return;
          }
          buttonRefs.delete(option.value);
        }),
        class: "dialkit-segmented-button",
        "data-active": String(props.value === option.value),
        type: "button",
        role: "radio",
        "aria-checked": props.value === option.value,
        tabindex: props.value === option.value ? 0 : -1,
        onClick: () => emit("change", option.value)
      }, option.label))
    ]);
  }
});

// src/vue/components/SpringVisualization.ts
import { defineComponent as defineComponent10, h as h10, computed as computed5 } from "vue";
function generateSpringCurve(stiffness, damping, mass, duration) {
  const points = [];
  const steps = 100;
  const dt = duration / steps;
  let position = 0;
  let velocity = 0;
  const target = 1;
  for (let i = 0; i <= steps; i += 1) {
    const time = i * dt;
    points.push([time, position]);
    const springForce = -stiffness * (position - target);
    const dampingForce = -damping * velocity;
    const acceleration = (springForce + dampingForce) / mass;
    velocity += acceleration * dt;
    position += velocity * dt;
  }
  return points;
}
var SpringVisualization = defineComponent10({
  name: "DialKitSpringVisualization",
  props: {
    spring: {
      type: Object,
      required: true
    },
    isSimpleMode: {
      type: Boolean,
      required: true
    }
  },
  setup(props) {
    const width = 256;
    const height = 140;
    const pathData = computed5(() => {
      let stiffness;
      let damping;
      let mass;
      if (props.isSimpleMode) {
        const visualDuration = props.spring.visualDuration ?? 0.3;
        const bounce = props.spring.bounce ?? 0.2;
        mass = 1;
        stiffness = (2 * Math.PI / visualDuration) ** 2;
        const dampingRatio = 1 - bounce;
        damping = 2 * dampingRatio * Math.sqrt(stiffness * mass);
      } else {
        stiffness = props.spring.stiffness ?? 400;
        damping = props.spring.damping ?? 17;
        mass = props.spring.mass ?? 1;
      }
      const duration = 2;
      const points = generateSpringCurve(stiffness, damping, mass, duration);
      const values = points.map(([, value]) => value);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const valueRange = maxValue - minValue;
      return points.map(([time, value], index) => {
        const x = time / duration * width;
        const normalizedValue = (value - minValue) / (valueRange || 1);
        const y = height - (normalizedValue * height * 0.6 + height * 0.2);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      }).join(" ");
    });
    return () => h10("svg", { viewBox: `0 0 ${width} ${height}`, class: "dialkit-spring-viz" }, [
      ...Array.from({ length: 3 }).flatMap((_, index) => {
        const lineIndex = index + 1;
        const x = width / 4 * lineIndex;
        const y = height / 4 * lineIndex;
        return [
          h10("line", { x1: x, y1: 0, x2: x, y2: height, stroke: "rgba(255, 255, 255, 0.08)", "stroke-width": 1 }),
          h10("line", { x1: 0, y1: y, x2: width, y2: y, stroke: "rgba(255, 255, 255, 0.08)", "stroke-width": 1 })
        ];
      }),
      h10("line", {
        x1: 0,
        y1: height / 2,
        x2: width,
        y2: height / 2,
        stroke: "rgba(255, 255, 255, 0.15)",
        "stroke-width": 1,
        "stroke-dasharray": "4,4"
      }),
      h10("path", {
        d: pathData.value,
        fill: "none",
        stroke: "rgba(255, 255, 255, 0.6)",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      })
    ]);
  }
});

// src/vue/components/SpringControl.ts
var SpringControl = defineComponent11({
  name: "DialKitSpringControl",
  props: {
    panelId: { type: String, required: true },
    path: { type: String, required: true },
    label: { type: String, required: true },
    spring: {
      type: Object,
      required: true
    }
  },
  emits: ["change"],
  setup(props, { emit }) {
    const mode = ref10(DialStore.getSpringMode(props.panelId, props.path));
    let unsub;
    onMounted12(() => {
      unsub = DialStore.subscribe(props.panelId, () => {
        mode.value = DialStore.getSpringMode(props.panelId, props.path);
      });
    });
    onUnmounted11(() => {
      unsub?.();
    });
    const isSimpleMode = () => mode.value === "simple";
    const cache = {
      simple: props.spring.visualDuration !== void 0 ? { ...props.spring } : { type: "spring", visualDuration: 0.3, bounce: 0.2 },
      advanced: props.spring.stiffness !== void 0 ? { ...props.spring } : { type: "spring", stiffness: 200, damping: 25, mass: 1 }
    };
    const handleModeChange = (nextMode) => {
      if (isSimpleMode()) {
        cache.simple = { ...props.spring };
      } else {
        cache.advanced = { ...props.spring };
      }
      DialStore.updateSpringMode(props.panelId, props.path, nextMode);
      if (nextMode === "simple") {
        emit("change", cache.simple);
      } else {
        emit("change", cache.advanced);
      }
    };
    const handleUpdate = (key, value) => {
      if (isSimpleMode()) {
        const { stiffness, damping, mass, ...rest } = props.spring;
        emit("change", { ...rest, [key]: value });
      } else {
        const { visualDuration, bounce, ...rest } = props.spring;
        emit("change", { ...rest, [key]: value });
      }
    };
    return () => h11(Folder, { title: props.label, defaultOpen: true }, {
      default: () => [
        h11("div", { style: { display: "flex", flexDirection: "column", gap: "6px" } }, [
          h11(SpringVisualization, { spring: props.spring, isSimpleMode: isSimpleMode() }),
          h11("div", { class: "dialkit-labeled-control" }, [
            h11("span", { class: "dialkit-labeled-control-label" }, "Type"),
            h11(SegmentedControl, {
              options: [
                { value: "simple", label: "Time" },
                { value: "advanced", label: "Physics" }
              ],
              value: mode.value,
              onChange: handleModeChange
            })
          ]),
          ...isSimpleMode() ? [
            h11(Slider, {
              label: "Duration",
              value: props.spring.visualDuration ?? 0.3,
              min: 0.1,
              max: 1,
              step: 0.05,
              unit: "s",
              onChange: (next) => handleUpdate("visualDuration", next)
            }),
            h11(Slider, {
              label: "Bounce",
              value: props.spring.bounce ?? 0.2,
              min: 0,
              max: 1,
              step: 0.05,
              onChange: (next) => handleUpdate("bounce", next)
            })
          ] : [
            h11(Slider, {
              label: "Stiffness",
              value: props.spring.stiffness ?? 400,
              min: 1,
              max: 1e3,
              step: 10,
              onChange: (next) => handleUpdate("stiffness", next)
            }),
            h11(Slider, {
              label: "Damping",
              value: props.spring.damping ?? 17,
              min: 1,
              max: 100,
              step: 1,
              onChange: (next) => handleUpdate("damping", next)
            }),
            h11(Slider, {
              label: "Mass",
              value: props.spring.mass ?? 1,
              min: 0.1,
              max: 10,
              step: 0.1,
              onChange: (next) => handleUpdate("mass", next)
            })
          ]
        ])
      ]
    });
  }
});

// src/vue/components/TextControl.ts
import { defineComponent as defineComponent12, h as h12, onMounted as onMounted13, onUnmounted as onUnmounted12, ref as ref11, watch as watch6 } from "vue";
var textControlInstance = 0;
var TextControl = defineComponent12({
  name: "DialKitTextControl",
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
    placeholder: { type: String, required: false }
  },
  emits: ["change"],
  setup(props, { emit }) {
    const inputId = ref11(`dialkit-text-${++textControlInstance}`);
    const inputRef = ref11();
    let size;
    onMounted13(() => {
      size = observeTextSize(inputRef.value);
    });
    onUnmounted12(() => size?.destroy());
    watch6(() => [props.value, props.placeholder], () => size?.update(), { flush: "post" });
    return () => h12("div", { class: "dialkit-text-control" }, [
      h12("label", { class: "dialkit-text-label", for: inputId.value }, props.label),
      h12("textarea", {
        ref: inputRef,
        id: inputId.value,
        rows: 1,
        class: "dialkit-text-input",
        value: props.value,
        placeholder: props.placeholder,
        onInput: (event) => emit("change", event.target.value)
      })
    ]);
  }
});

// src/vue/components/Toggle.ts
import { defineComponent as defineComponent13, h as h13 } from "vue";
var Toggle = defineComponent13({
  name: "DialKitToggle",
  props: {
    label: { type: String, required: true },
    checked: { type: Boolean, required: true },
    shortcut: { type: Object, default: void 0 },
    shortcutActive: { type: Boolean, default: false }
  },
  emits: ["change"],
  setup(props, { emit }) {
    return () => h13("div", { class: "dialkit-labeled-control" }, [
      h13("span", { class: "dialkit-labeled-control-label" }, [
        props.label,
        props.shortcut ? h13("span", {
          class: `dialkit-shortcut-pill${props.shortcutActive ? " dialkit-shortcut-pill-active" : ""}`
        }, formatToggleShortcut(props.shortcut)) : null
      ]),
      h13(SegmentedControl, {
        options: [
          { value: "off", label: "Off" },
          { value: "on", label: "On" }
        ],
        value: props.checked ? "on" : "off",
        onChange: (value) => emit("change", value === "on")
      })
    ]);
  }
});

// src/easing-geometry.ts
var clampY = (value) => Math.max(-1, Math.min(2, value));
function formatEase(ease) {
  return ease.join(", ");
}
function parseEase(text) {
  const parts = text.split(",").map((part) => part.trim());
  if (parts.length !== 4 || parts.some((part) => !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(part))) return null;
  const values = parts.map(Number);
  if (!values.every(Number.isFinite) || values[0] < 0 || values[0] > 1 || values[2] < 0 || values[2] > 1) return null;
  values[1] = clampY(values[1]);
  values[3] = clampY(values[3]);
  return values;
}
function normalizeEase(ease) {
  return ease.map((value, index) => {
    const finite = Number.isFinite(value) ? value : index < 2 ? 0 : 1;
    return index % 2 === 0 ? Math.max(0, Math.min(1, finite)) : finite;
  });
}
function fitEasingGraph(ease, width, height) {
  const value = normalizeEase(ease);
  const padding = Math.min(12, width / 4, height / 4);
  const radiusY = Math.max(0.5, Math.abs(value[1] - 0.5), Math.abs(value[3] - 0.5));
  const unit = Math.min(width - padding * 2, (height / 2 - padding) / radiusY);
  const scale = { x: unit, y: unit };
  const project = (x, y) => ({
    x: width / 2 + (x - 0.5) * scale.x,
    y: height / 2 - (y - 0.5) * scale.y
  });
  return { scale, start: project(0, 0), end: project(1, 1), handles: [project(value[0], value[1]), project(value[2], value[3])] };
}
function moveEasingHandle(ease, handle, dx, dy, scale) {
  const next = [...ease];
  if (!Number.isFinite(scale.x) || !Number.isFinite(scale.y) || scale.x <= 0 || scale.y <= 0) return next;
  const index = handle * 2;
  const x = ease[index] + dx / scale.x;
  const y = ease[index + 1] - dy / scale.y;
  if (dx !== 0) next[index] = Number(Math.max(0, Math.min(1, x)).toFixed(2));
  if (dy !== 0 && Number.isFinite(y)) next[index + 1] = Number(clampY(y).toFixed(2));
  return next;
}
function easingHandleFromKey(ease, handle, key, shift) {
  const delta = shift ? 0.1 : 0.01;
  const scale = { x: 1, y: 1 };
  if (key === "ArrowLeft") return moveEasingHandle(ease, handle, -delta, 0, scale);
  if (key === "ArrowRight") return moveEasingHandle(ease, handle, delta, 0, scale);
  if (key === "ArrowUp") return moveEasingHandle(ease, handle, 0, -delta, scale);
  if (key === "ArrowDown") return moveEasingHandle(ease, handle, 0, delta, scale);
}
function easingGuideEnd(start, handle, radius = 5) {
  const dx = handle.x - start.x;
  const dy = handle.y - start.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= radius) return { ...start };
  return { x: handle.x - dx / distance * radius, y: handle.y - dy / distance * radius };
}

// src/vue/components/TransitionControl.ts
import { defineComponent as defineComponent15, h as h15, onMounted as onMounted15, onUnmounted as onUnmounted14, ref as ref13 } from "vue";

// src/vue/components/EasingVisualization.ts
import { defineComponent as defineComponent14, h as h14, onMounted as onMounted14, onUnmounted as onUnmounted13, ref as ref12, watchEffect as watchEffect5 } from "vue";

// src/easing-control.ts
var nextId2 = 0;
function mountEasingVisualization(host, initial) {
  let props = initial;
  let value = normalizeEase(props.easing.ease);
  let width = 256;
  let height = 180;
  let drag;
  const root = document.createElement("div");
  root.className = "dialkit-easing-viz";
  root.setAttribute("aria-label", "B\xE9zier easing curve");
  const svg2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg2.setAttribute("aria-hidden", "true");
  const shape = (tag, className) => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    node.setAttribute("class", className);
    svg2.append(node);
    return node;
  };
  const reference = shape("line", "dialkit-easing-reference");
  const tangents = [shape("line", "dialkit-easing-tangent"), shape("line", "dialkit-easing-tangent")];
  const path = shape("path", "dialkit-easing-curve");
  const endpoints = [shape("circle", "dialkit-easing-endpoint"), shape("circle", "dialkit-easing-endpoint")];
  const help = document.createElement("span");
  help.className = "dialkit-easing-instructions";
  help.id = `dialkit-easing-help-${++nextId2}`;
  help.textContent = "Drag to adjust X from 0 to 1 and Y from -1 to 2. Arrow keys adjust by 0.01. Shift adjusts by 0.1. Escape cancels a drag.";
  root.append(svg2, help);
  const handles = [0, 1].map((handle) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dialkit-easing-handle";
    button.setAttribute("aria-describedby", help.id);
    button.addEventListener("pointerdown", (event) => {
      if (!props.onChange || event.button !== 0 || drag) return;
      event.preventDefault();
      event.stopPropagation();
      button.focus({ preventScroll: true });
      measure();
      const bounds = root.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      drag = { id: event.pointerId, handle, x: event.clientX, y: event.clientY, scale: fitEasingGraph(value, width, height).scale, ratioX: width / bounds.width, ratioY: height / bounds.height, value: [...value] };
      button.setPointerCapture(event.pointerId);
      button.dataset.dragging = "true";
    });
    button.addEventListener("pointermove", move);
    button.addEventListener("pointerup", (event) => {
      if (event.pointerId !== drag?.id) return;
      move(event);
      endDrag();
    });
    button.addEventListener("pointercancel", (event) => {
      if (event.pointerId === drag?.id) cancelDrag();
    });
    button.addEventListener("lostpointercapture", (event) => {
      if (event.pointerId === drag?.id) endDrag();
    });
    button.addEventListener("keydown", (event) => {
      if (!props.onChange || event.altKey || event.metaKey || event.ctrlKey) return;
      if (event.key === "Escape" && drag) {
        event.preventDefault();
        event.stopPropagation();
        cancelDrag();
        return;
      }
      const next = easingHandleFromKey(value, handle, event.key, event.shiftKey);
      if (next) {
        event.preventDefault();
        event.stopPropagation();
        endDrag();
        commit(next);
      }
    });
    root.append(button);
    return button;
  });
  host.append(root);
  function line(node, a, b) {
    node.setAttribute("x1", String(a.x));
    node.setAttribute("y1", String(a.y));
    node.setAttribute("x2", String(b.x));
    node.setAttribute("y2", String(b.y));
  }
  function render() {
    const graph = fitEasingGraph(value, width, height);
    svg2.setAttribute("viewBox", `0 0 ${width} ${height}`);
    line(reference, graph.start, graph.end);
    [graph.start, graph.end].forEach((point, index) => {
      line(tangents[index], point, easingGuideEnd(point, graph.handles[index]));
      endpoints[index].setAttribute("cx", String(point.x));
      endpoints[index].setAttribute("cy", String(point.y));
      endpoints[index].setAttribute("r", "2.5");
      const button = handles[index];
      button.style.left = `${graph.handles[index].x / width * 100}%`;
      button.style.top = `${graph.handles[index].y / height * 100}%`;
      button.disabled = !props.onChange;
      button.setAttribute("aria-label", `B\xE9zier handle ${index + 1}: X ${value[index * 2]}, Y ${value[index * 2 + 1]}`);
    });
    root.setAttribute("role", props.onChange ? "group" : "img");
    const { start, end, handles: [a, b] } = graph;
    path.setAttribute("d", `M ${start.x} ${start.y} C ${a.x} ${a.y}, ${b.x} ${b.y}, ${end.x} ${end.y}`);
  }
  function measure() {
    width = root.clientWidth || width;
    height = root.clientHeight || height;
    render();
  }
  function commit(next) {
    if (next.every((part, index) => part === value[index])) return;
    value = next;
    render();
    props.onChange?.([...value]);
  }
  function move(event) {
    if (!drag || event.pointerId !== drag.id) return;
    commit(moveEasingHandle(drag.value, drag.handle, (event.clientX - drag.x) * drag.ratioX, (event.clientY - drag.y) * drag.ratioY, drag.scale));
  }
  function endDrag() {
    if (!drag) return;
    const { id, handle } = drag;
    drag = void 0;
    delete handles[handle].dataset.dragging;
    if (handles[handle].hasPointerCapture(id)) handles[handle].releasePointerCapture(id);
  }
  function cancelDrag() {
    if (!drag) return;
    const original = drag.value;
    endDrag();
    commit(original);
  }
  const observer = new ResizeObserver(measure);
  observer.observe(root);
  measure();
  return {
    update(next) {
      const incoming = normalizeEase(next.easing.ease);
      if (!next.onChange || incoming.some((part, index) => part !== value[index])) endDrag();
      props = next;
      value = incoming;
      render();
    },
    destroy() {
      endDrag();
      observer.disconnect();
      root.remove();
    }
  };
}

// src/vue/components/EasingVisualization.ts
var EasingVisualization = defineComponent14({
  name: "DialKitEasingVisualization",
  props: {
    easing: { type: Object, required: true },
    onChange: Function
  },
  setup(props) {
    const host = ref12();
    let control;
    const options = () => ({ easing: props.easing, onChange: props.onChange });
    onMounted14(() => {
      control = mountEasingVisualization(host.value, options());
    });
    watchEffect5(() => {
      const next = options();
      control?.update(next);
    });
    onUnmounted13(() => control?.destroy());
    return () => h14("div", { ref: host, class: "dialkit-easing-host" });
  }
});

// src/vue/components/TransitionControl.ts
var EaseTextInput = defineComponent15({
  name: "DialKitEaseTextInput",
  props: {
    ease: {
      type: Array,
      required: true
    },
    onChange: {
      type: Function,
      required: true
    }
  },
  setup(props) {
    const editing = ref13(false);
    const draft = ref13("");
    const handleFocus = () => {
      draft.value = formatEase(props.ease);
      editing.value = true;
    };
    const handleBlur = () => {
      const parsed = parseEase(draft.value);
      if (parsed) props.onChange(parsed);
      editing.value = false;
    };
    const handleKeydown = (event) => {
      if (event.key === "Enter") {
        event.target.blur();
      }
    };
    return () => h15("div", { class: "dialkit-labeled-control" }, [
      h15("span", { class: "dialkit-labeled-control-label" }, "Ease"),
      h15("input", {
        type: "text",
        "aria-label": "B\xE9zier coordinates",
        class: "dialkit-text-input",
        value: editing.value ? draft.value : formatEase(props.ease),
        spellcheck: false,
        onInput: (event) => {
          draft.value = event.target.value;
        },
        onFocus: handleFocus,
        onBlur: handleBlur,
        onKeydown: handleKeydown
      })
    ]);
  }
});
var TransitionControl = defineComponent15({
  name: "DialKitTransitionControl",
  props: {
    panelId: { type: String, required: true },
    path: { type: String, required: true },
    label: { type: String, required: true },
    value: {
      type: Object,
      required: true
    },
    hideDuration: { type: Boolean, default: false },
    durationControl: Object
  },
  emits: ["change"],
  setup(props, { emit }) {
    const mode = ref13(DialStore.getTransitionMode(props.panelId, props.path));
    let unsub;
    onMounted15(() => {
      unsub = DialStore.subscribe(props.panelId, () => {
        mode.value = DialStore.getTransitionMode(props.panelId, props.path);
      });
    });
    onUnmounted14(() => unsub?.());
    const cache = {
      easing: props.value.type === "easing" ? { ...props.value } : { type: "easing", duration: 0.3, ease: [0.76, 0, 0.24, 1] },
      simple: props.value.type === "spring" && props.value.visualDuration !== void 0 ? { ...props.value } : { type: "spring", visualDuration: 0.3, bounce: 0.2 },
      advanced: props.value.type === "spring" && props.value.stiffness !== void 0 ? { ...props.value } : { type: "spring", stiffness: 200, damping: 25, mass: 1 }
    };
    const spring = () => {
      if (props.value.type === "spring") {
        if (mode.value === "simple") cache.simple = props.value;
        else if (mode.value === "advanced") cache.advanced = props.value;
        return props.value;
      }
      return cache.simple;
    };
    const easing = () => {
      if (props.value.type === "easing") {
        cache.easing = props.value;
        return props.value;
      }
      return cache.easing;
    };
    const handleModeChange = (nextMode) => {
      DialStore.updateTransitionMode(props.panelId, props.path, nextMode);
      if (nextMode === "easing") {
        emit("change", cache.easing);
      } else if (nextMode === "simple") {
        emit("change", cache.simple);
      } else {
        emit("change", cache.advanced);
      }
    };
    const handleSpringUpdate = (key, value) => {
      const current = spring();
      if (mode.value === "simple") {
        const { stiffness, damping, mass, ...rest } = current;
        emit("change", { ...rest, [key]: value });
      } else {
        const { visualDuration, bounce, ...rest } = current;
        emit("change", { ...rest, [key]: value });
      }
    };
    return () => {
      const isEasing = mode.value === "easing";
      const isSimpleSpring = mode.value === "simple";
      const currentSpring = spring();
      const currentEasing = easing();
      const durationSlider = !props.hideDuration && (isEasing || isSimpleSpring) ? h15(Slider, {
        label: "Duration",
        value: props.durationControl?.value ?? (isEasing ? currentEasing.duration : currentSpring.visualDuration ?? 0.3),
        min: props.durationControl?.min ?? 0.1,
        max: props.durationControl?.max ?? 5,
        step: props.durationControl?.step ?? 0.05,
        unit: "s",
        onChange: props.durationControl?.onChange ?? ((next) => {
          if (isEasing) emit("change", { ...currentEasing, duration: next });
          else handleSpringUpdate("visualDuration", next);
        })
      }) : null;
      return h15(Folder, { title: props.label, defaultOpen: true }, {
        default: () => [
          h15("div", { style: { display: "flex", flexDirection: "column", gap: "6px" } }, [
            isEasing ? h15(EasingVisualization, { easing: currentEasing, onChange: (ease) => emit("change", { ...currentEasing, ease }) }) : h15(SpringVisualization, { spring: currentSpring, isSimpleMode: isSimpleSpring }),
            h15("div", { class: "dialkit-labeled-control" }, [
              h15("span", { class: "dialkit-labeled-control-label" }, "Type"),
              h15(SegmentedControl, {
                options: [
                  { value: "easing", label: "Easing" },
                  { value: "simple", label: "Time" },
                  { value: "advanced", label: "Physics" }
                ],
                value: mode.value,
                onChange: handleModeChange
              })
            ]),
            ...isEasing ? [
              h15(EaseTextInput, {
                ease: currentEasing.ease,
                onChange: (next) => emit("change", { ...currentEasing, ease: next })
              })
            ] : isSimpleSpring ? [
              h15(Slider, {
                label: "Bounce",
                value: currentSpring.bounce ?? 0.2,
                min: 0,
                max: 1,
                step: 0.05,
                onChange: (next) => handleSpringUpdate("bounce", next)
              })
            ] : [
              h15(Slider, {
                label: "Stiffness",
                value: currentSpring.stiffness ?? 400,
                min: 1,
                max: 1e3,
                step: 10,
                onChange: (next) => handleSpringUpdate("stiffness", next)
              }),
              h15(Slider, {
                label: "Damping",
                value: currentSpring.damping ?? 17,
                min: 1,
                max: 100,
                step: 1,
                onChange: (next) => handleSpringUpdate("damping", next)
              }),
              h15(Slider, {
                label: "Mass",
                value: currentSpring.mass ?? 1,
                min: 0.1,
                max: 10,
                step: 0.1,
                onChange: (next) => handleSpringUpdate("mass", next)
              })
            ],
            durationSlider
          ])
        ]
      });
    };
  }
});

// src/vue/components/ControlRenderer.ts
import { inject as inject2 } from "vue";
var ControlRenderer = defineComponent16({
  name: "DialKitControlRenderer",
  props: {
    panelId: { type: String, required: true },
    controls: { type: Array, required: true },
    values: { type: Object, required: true },
    transitionDuration: Object
  },
  setup(props) {
    const shortcut = inject2(ShortcutKey, void 0);
    const renderControl = (control) => {
      const value = props.values[control.path];
      switch (control.type) {
        case "slider":
          return h16(Slider, {
            key: control.path,
            label: control.label,
            value,
            min: control.min,
            max: control.max,
            step: control.step,
            shortcut: control.shortcut,
            shortcutActive: shortcut?.activePanelId.value === props.panelId && shortcut.activePath.value === control.path,
            onChange: (next) => DialStore.updateValue(props.panelId, control.path, next)
          });
        case "toggle":
          return h16(Toggle, {
            key: control.path,
            label: control.label,
            checked: value,
            shortcut: control.shortcut,
            shortcutActive: shortcut?.activePanelId.value === props.panelId && shortcut.activePath.value === control.path,
            onChange: (next) => DialStore.updateValue(props.panelId, control.path, next)
          });
        case "spring":
          return h16(SpringControl, {
            key: control.path,
            panelId: props.panelId,
            path: control.path,
            label: control.label,
            spring: value,
            onChange: (next) => DialStore.updateValue(props.panelId, control.path, next)
          });
        case "transition":
          return h16(TransitionControl, {
            key: control.path,
            panelId: props.panelId,
            path: control.path,
            label: control.label,
            value,
            durationControl: props.transitionDuration,
            onChange: (next) => DialStore.updateValue(props.panelId, control.path, next)
          });
        case "folder":
          return h16(Folder, {
            key: control.path,
            title: control.label,
            defaultOpen: control.defaultOpen ?? true
          }, { default: () => (control.children ?? []).map(renderControl) });
        case "text":
          return h16(TextControl, {
            key: control.path,
            label: control.label,
            value,
            placeholder: control.placeholder,
            onChange: (next) => DialStore.updateValue(props.panelId, control.path, next)
          });
        case "select":
          return h16(SelectControl, {
            key: control.path,
            label: control.label,
            value,
            options: control.options ?? [],
            onChange: (next) => DialStore.updateValue(props.panelId, control.path, next)
          });
        case "color":
          return h16(ColorControl, {
            key: control.path,
            label: control.label,
            value,
            onChange: (next) => DialStore.updateValue(props.panelId, control.path, next)
          });
        case "image":
          return h16(ImageControl, {
            key: control.path,
            options: control.options,
            label: control.label,
            value,
            onChange: (next) => DialStore.updateValue(props.panelId, control.path, next)
          });
        case "pad":
          return h16(DialPad, {
            key: control.path,
            label: control.label,
            value,
            x: control.pad?.x,
            y: control.pad?.y,
            labels: control.pad?.labels,
            onChange: (next) => DialStore.updateValue(props.panelId, control.path, next)
          });
        case "background":
          return h16(BackgroundControl, {
            key: control.path,
            label: control.label,
            value,
            onChange: (next) => DialStore.updateValue(props.panelId, control.path, next)
          });
        case "action":
          return h16("button", {
            key: control.path,
            class: "dialkit-button",
            onClick: () => DialStore.triggerAction(props.panelId, control.path)
          }, control.label);
        default:
          return null;
      }
    };
    return () => h16(Fragment, null, props.controls.map(renderControl));
  }
});

// src/vue/components/PresetManager.ts
import { Teleport as Teleport2, defineComponent as defineComponent17, h as h17, ref as ref14, watch as watch7 } from "vue";
import { AnimatePresence as AnimatePresence3, motion as motion3 } from "motion-v";
var PresetManager = defineComponent17({
  name: "DialKitPresetManager",
  props: {
    panelId: { type: String, required: true },
    presets: {
      type: Array,
      required: true
    },
    activePresetId: {
      type: String,
      required: false,
      default: null
    }
  },
  setup(props) {
    const isOpen = ref14(false);
    const pos = ref14({ top: 0, left: 0, width: 0 });
    const triggerRef = ref14(null);
    const dropdownRef = ref14(null);
    const hasPresets = () => props.presets.length > 0;
    const activePreset = () => props.presets.find((preset) => preset.id === props.activePresetId);
    const open = () => {
      if (!hasPresets()) return;
      const rect = triggerRef.value?.getBoundingClientRect();
      if (rect) {
        pos.value = { top: rect.bottom + 4, left: rect.left, width: rect.width };
      }
      isOpen.value = true;
    };
    const close = () => {
      isOpen.value = false;
    };
    const setDropdownRef = (node) => {
      if (node instanceof HTMLElement) {
        dropdownRef.value = node;
        return;
      }
      if (node && typeof node === "object" && "$el" in node) {
        const el = node.$el;
        dropdownRef.value = el instanceof HTMLElement ? el : null;
        return;
      }
      dropdownRef.value = null;
    };
    const toggle = () => {
      if (isOpen.value) close();
      else open();
    };
    watch7(isOpen, (open2, _, onCleanup) => {
      if (!open2) return;
      const handler = (event) => {
        const target = event.target;
        if (triggerRef.value?.contains(target) || dropdownRef.value?.contains(target)) return;
        close();
      };
      const stopKeyboard = observeDropdownKeyboard(triggerRef.value, () => dropdownRef.value, close, "presets");
      document.addEventListener("mousedown", handler);
      onCleanup(() => {
        stopKeyboard();
        document.removeEventListener("mousedown", handler);
      });
    });
    const handleSelect = (presetId) => {
      if (presetId) {
        DialStore.loadPreset(props.panelId, presetId);
      } else {
        DialStore.clearActivePreset(props.panelId);
      }
      close();
    };
    const handleDelete = (event, presetId) => {
      event.stopPropagation();
      DialStore.deletePreset(props.panelId, presetId);
    };
    return () => h17("div", { class: "dialkit-preset-manager" }, [
      h17("button", {
        ref: triggerRef,
        class: "dialkit-preset-trigger",
        onClick: toggle,
        "data-open": String(isOpen.value),
        "data-has-preset": String(!!activePreset()),
        "data-disabled": String(!hasPresets()),
        type: "button",
        "aria-haspopup": "menu",
        "aria-expanded": isOpen.value,
        disabled: !hasPresets(),
        "aria-label": "Versions",
        onKeydown: (e) => openDropdownOnKey(e, open)
      }, [
        h17("span", { class: "dialkit-preset-label" }, activePreset()?.name ?? "Version 1"),
        h17(motion3.svg, {
          class: "dialkit-select-chevron",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2.5",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          animate: { rotate: isOpen.value ? 180 : 0, opacity: hasPresets() ? 0.6 : 0.25 },
          transition: { type: "spring", visualDuration: 0.2, bounce: 0.15 }
        }, [h17("path", { d: ICON_CHEVRON })])
      ]),
      h17(Teleport2, { to: "body" }, [
        h17(AnimatePresence3, null, {
          default: () => isOpen.value ? [h17(motion3.div, {
            key: "dialkit-preset-dropdown",
            ref: setDropdownRef,
            class: "dialkit-root dialkit-preset-dropdown",
            style: {
              position: "fixed",
              top: `${pos.value.top}px`,
              left: `${pos.value.left}px`,
              minWidth: `${pos.value.width}px`
            },
            initial: { opacity: 0, y: 4, scale: 0.97 },
            animate: { opacity: 1, y: 0, scale: 1 },
            exit: { opacity: 0, y: 4, scale: 0.97, pointerEvents: "none" },
            transition: { type: "spring", visualDuration: 0.15, bounce: 0 }
          }, [
            h17("div", {
              class: "dialkit-preset-item",
              "data-active": String(!props.activePresetId),
              onClick: () => handleSelect(null)
            }, [h17("button", { type: "button", class: "dialkit-preset-name" }, "Version 1")]),
            ...props.presets.map((preset) => h17("div", {
              key: preset.id,
              class: "dialkit-preset-item",
              "data-active": String(preset.id === props.activePresetId),
              onClick: () => handleSelect(preset.id)
            }, [
              h17("button", { type: "button", class: "dialkit-preset-name" }, preset.name),
              h17("button", {
                class: "dialkit-preset-delete",
                onClick: (event) => handleDelete(event, preset.id),
                type: "button",
                title: `Delete ${preset.name}`
              }, [
                h17("svg", {
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  "stroke-width": "2",
                  "stroke-linecap": "round",
                  "stroke-linejoin": "round"
                }, ICON_TRASH.map((d) => h17("path", { d })))
              ])
            ]))
          ])] : []
        })
      ])
    ]);
  }
});

// src/vue/components/Panel.ts
var Panel = defineComponent18({
  name: "DialKitPanel",
  props: {
    panel: {
      type: Object,
      required: true
    },
    defaultOpen: {
      type: Boolean,
      default: true
    },
    inline: {
      type: Boolean,
      default: false
    },
    variant: {
      type: String,
      default: "root"
    },
    toolbarExtra: Function
  },
  emits: ["openChange"],
  setup(props, { emit }) {
    const values = ref15(DialStore.getValues(props.panel.id));
    const presets = ref15(DialStore.getPresets(props.panel.id));
    const activePresetId = ref15(DialStore.getActivePresetId(props.panel.id));
    const copied = ref15(false);
    const storeOpen = ref15(DialStore.getPanelOpen(props.panel.id));
    const isOpen = computed6(() => storeOpen.value ?? props.defaultOpen);
    let unsubscribe;
    let copiedTimeout = null;
    onMounted16(() => {
      unsubscribe = DialStore.subscribe(props.panel.id, () => {
        values.value = DialStore.getValues(props.panel.id);
        presets.value = DialStore.getPresets(props.panel.id);
        activePresetId.value = DialStore.getActivePresetId(props.panel.id);
        storeOpen.value = DialStore.getPanelOpen(props.panel.id);
      });
      DialStore.initPanelOpen(props.panel.id, props.defaultOpen);
    });
    onUnmounted15(() => {
      unsubscribe?.();
      if (copiedTimeout) {
        window.clearTimeout(copiedTimeout);
      }
    });
    const handleAddPreset = () => {
      const nextNum = presets.value.length + 2;
      DialStore.savePreset(props.panel.id, `Version ${nextNum}`);
    };
    const handleCopy = async () => {
      const instruction = buildCopyInstruction("useDialKit", props.panel.name, values.value);
      try {
        await navigator.clipboard.writeText(instruction);
      } catch {
        return;
      }
      copied.value = true;
      if (copiedTimeout) {
        window.clearTimeout(copiedTimeout);
      }
      copiedTimeout = window.setTimeout(() => {
        copied.value = false;
      }, 1500);
    };
    const handleOpenChange = (open) => {
      DialStore.setPanelOpen(props.panel.id, open);
      emit("openChange", open);
    };
    return () => {
      const toolbarNode = h18(Fragment2, null, [
        h18(motion4.button, {
          class: "dialkit-toolbar-add",
          onClick: handleAddPreset,
          title: "Add preset",
          whilePress: { scale: 0.9 },
          transition: { type: "spring", visualDuration: 0.15, bounce: 0.3 }
        }, [
          h18("svg", {
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2.5",
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
          }, ICON_ADD_PRESET.map((d) => h18("path", { d })))
        ]),
        h18(PresetManager, {
          panelId: props.panel.id,
          presets: presets.value,
          activePresetId: activePresetId.value
        }),
        h18(motion4.button, {
          class: "dialkit-toolbar-copy",
          onClick: handleCopy,
          title: "Copy parameters",
          whilePress: { scale: 0.95 },
          transition: { type: "spring", visualDuration: 0.15, bounce: 0.3 }
        }, [
          h18("span", { class: "dialkit-toolbar-copy-icon-wrap" }, [
            h18("span", {
              class: "dialkit-toolbar-copy-icon",
              style: { opacity: copied.value ? 0 : 1, transition: "opacity 120ms ease" }
            }, [
              h18("svg", {
                viewBox: "0 0 24 24",
                fill: "none",
                width: 16,
                height: 16
              }, [
                h18("path", {
                  d: ICON_CLIPBOARD.board,
                  stroke: "currentColor",
                  "stroke-width": 2,
                  "stroke-linejoin": "round"
                }),
                h18("path", {
                  d: ICON_CLIPBOARD.sparkle,
                  fill: "currentColor"
                }),
                h18("path", {
                  d: ICON_CLIPBOARD.body,
                  stroke: "currentColor",
                  "stroke-width": 2,
                  "stroke-linecap": "round",
                  "stroke-linejoin": "round"
                })
              ])
            ]),
            h18(AnimatePresence4, { initial: false, mode: "popLayout" }, {
              default: () => copied.value ? [h18(motion4.span, {
                key: "check",
                class: "dialkit-toolbar-copy-icon",
                initial: { scale: 0.5, opacity: 0 },
                animate: { scale: 1, opacity: 1 },
                exit: { scale: 0.5, opacity: 0 },
                transition: { type: "spring", visualDuration: 0.3, bounce: 0.2 }
              }, [
                h18("svg", {
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  "stroke-width": 2,
                  "stroke-linecap": "round",
                  "stroke-linejoin": "round",
                  width: 16,
                  height: 16
                }, [h18("path", { d: ICON_CHECK })])
              ])] : []
            })
          ]),
          "Copy"
        ]),
        props.toolbarExtra?.()
      ]);
      if (props.variant === "section") {
        return h18(Folder, {
          title: props.panel.name,
          open: isOpen.value,
          onOpenChange: handleOpenChange
        }, {
          default: () => [
            h18("div", {
              class: "dialkit-panel-section-toolbar",
              onClick: (event) => event.stopPropagation()
            }, [toolbarNode]),
            h18(ControlRenderer, { panelId: props.panel.id, controls: props.panel.controls, values: values.value })
          ]
        });
      }
      return h18("div", { class: "dialkit-panel-wrapper" }, [
        h18(Folder, {
          title: props.panel.name,
          open: isOpen.value,
          isRoot: true,
          inline: props.inline,
          toolbar: () => toolbarNode,
          onOpenChange: handleOpenChange
        }, {
          default: () => h18(ControlRenderer, { panelId: props.panel.id, controls: props.panel.controls, values: values.value })
        })
      ]);
    };
  }
});

// src/vue/components/Timeline/TimelineToggleButton.ts
import { defineComponent as defineComponent19, h as h19, onMounted as onMounted17, onUnmounted as onUnmounted16, ref as ref16 } from "vue";
var TimelineToggleButton = defineComponent19({
  name: "DialKitTimelineToggleButton",
  setup() {
    const visible = ref16(TimelineUiStore.getVisible());
    let unsubscribe;
    onMounted17(() => {
      unsubscribe = TimelineUiStore.subscribe(() => {
        visible.value = TimelineUiStore.getVisible();
      });
    });
    onUnmounted16(() => unsubscribe?.());
    return () => {
      const label = visible.value ? "Hide timeline" : "Show timeline";
      return h19("button", {
        class: "dialkit-toolbar-add dialkit-timeline-toolbar-toggle",
        "data-active": visible.value || void 0,
        "aria-pressed": visible.value,
        "aria-label": label,
        title: label,
        onClick: () => TimelineUiStore.toggle()
      }, [
        h19(
          "svg",
          { viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" },
          ICON_TIMELINE.map((path) => h19("path", { d: path, fill: "currentColor" }))
        )
      ]);
    };
  }
});

// src/panel-drag.ts
var PANEL_DRAG_THRESHOLD = 8;
var COLLAPSED_PANEL_SIZE = 42;
var DRAG_EXCLUSION_SELECTOR = [
  ".dialkit-panel-icon",
  ".dialkit-panel-toolbar",
  "button",
  "input",
  "select",
  "textarea",
  "a",
  '[role="button"]',
  '[contenteditable="true"]'
].join(",");
function getPanelDragHandle(target, panel) {
  if (!(target instanceof Element) || !panel) return null;
  const inner = target.closest(".dialkit-panel-inner");
  if (!inner || !panel.contains(inner)) return null;
  if (inner.getAttribute("data-collapsed") === "true") {
    return inner;
  }
  const header = target.closest(".dialkit-panel-header");
  if (!header || !inner.contains(header)) return null;
  if (target.closest(DRAG_EXCLUSION_SELECTOR)) return null;
  return header;
}
function getPanelDragStart(pointerX, pointerY, panel) {
  const rect = panel.getBoundingClientRect();
  return {
    pointerX,
    pointerY,
    elX: rect.left,
    elY: rect.top
  };
}
function getPanelDragOffset(start, pointerX, pointerY) {
  return {
    x: start.elX + pointerX - start.pointerX,
    y: start.elY + pointerY - start.pointerY
  };
}
function hasPanelDragMoved(start, pointerX, pointerY) {
  const dx = pointerX - start.pointerX;
  const dy = pointerY - start.pointerY;
  return Math.hypot(dx, dy) >= PANEL_DRAG_THRESHOLD;
}
function getPanelOriginX(position, offset, viewportWidth = typeof window !== "undefined" ? window.innerWidth : void 0) {
  if (offset && viewportWidth) {
    return offset.x + COLLAPSED_PANEL_SIZE / 2 < viewportWidth / 2 ? "left" : "right";
  }
  return position.endsWith("left") ? "left" : "right";
}
function getPanelOriginY(position, offset, viewportHeight = typeof window !== "undefined" ? window.innerHeight : void 0) {
  if (offset && viewportHeight) {
    return offset.y + COLLAPSED_PANEL_SIZE / 2 < viewportHeight / 2 ? "top" : "bottom";
  }
  return position.startsWith("bottom") ? "bottom" : "top";
}
function getPanelCorner(position, offset, viewportWidth = typeof window !== "undefined" ? window.innerWidth : void 0, viewportHeight = typeof window !== "undefined" ? window.innerHeight : void 0) {
  return `${getPanelOriginY(position, offset, viewportHeight)}-${getPanelOriginX(position, offset, viewportWidth)}`;
}
function blockPanelDragClick(handle) {
  const blocker = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
  };
  handle.addEventListener("click", blocker, { capture: true, once: true });
  window.setTimeout(() => {
    handle.removeEventListener("click", blocker, true);
  }, 0);
}
function capturePanelPointer(handle, pointerId) {
  try {
    handle.setPointerCapture(pointerId);
  } catch (error) {
    if (!(error instanceof DOMException) || !["NotFoundError", "InvalidStateError"].includes(error.name)) throw error;
  }
}
function releasePanelPointer(handle, pointerId) {
  try {
    if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
  } catch (error) {
    if (!(error instanceof DOMException) || !["NotFoundError", "InvalidStateError"].includes(error.name)) throw error;
  }
}

// src/vue/components/DialRoot.ts
var isDevDefault2 = typeof process !== "undefined" && process?.env?.NODE_ENV ? process.env.NODE_ENV !== "production" : typeof import.meta !== "undefined" && import.meta.env?.MODE ? import.meta.env.MODE !== "production" : true;
var DialRoot = defineComponent20({
  name: "DialKitDialRoot",
  props: {
    position: {
      type: String,
      default: "top-right"
    },
    defaultOpen: {
      type: Boolean,
      default: true
    },
    mode: {
      type: String,
      default: "popover"
    },
    theme: {
      type: String,
      default: "system"
    },
    productionEnabled: {
      type: Boolean,
      default: isDevDefault2
    }
  },
  emits: ["openChange"],
  setup(props, { emit }) {
    const panels = ref17([]);
    const timelines = ref17([]);
    const mounted = ref17(false);
    const panelRef = ref17(null);
    const dragOffset = ref17(null);
    const activePosition = ref17(props.position);
    let unsubscribePanels;
    let unsubscribeTimelines;
    let observer;
    let lastDragOffset = null;
    let dragging = false;
    let dragStart = null;
    let didDrag = false;
    let dragTarget = null;
    let panelOpenStates = /* @__PURE__ */ new Map();
    const shellOpen = ref17(props.mode === "inline" || props.defaultOpen);
    let unsubscribeOpen;
    let rootOpen;
    const syncPanelOpenStates = () => {
      const fallbackOpen = props.mode === "inline" || props.defaultOpen;
      const nextStates = /* @__PURE__ */ new Map();
      for (const panel of panels.value) {
        nextStates.set(panel.id, panelOpenStates.get(panel.id) ?? DialStore.getPanelOpen(panel.id) ?? fallbackOpen);
      }
      panelOpenStates = nextStates;
      rootOpen = Array.from(nextStates.values()).some(Boolean);
    };
    const connectObserver = () => {
      if (observer || props.mode === "inline" || !panelRef.value) return;
      observer = new MutationObserver(() => {
        const inners = panelRef.value?.querySelectorAll(".dialkit-panel-inner");
        if (!inners || inners.length === 0) return;
        const collapsed = Array.from(inners).every((el) => el.getAttribute("data-collapsed") === "true");
        const currentDragOffset = dragOffset.value;
        if (!collapsed) {
          if (currentDragOffset) {
            lastDragOffset = currentDragOffset;
            activePosition.value = getPanelCorner(props.position, currentDragOffset);
          } else {
            activePosition.value = props.position;
          }
          dragOffset.value = null;
        } else if (currentDragOffset) {
          lastDragOffset = currentDragOffset;
        } else if (lastDragOffset) {
          dragOffset.value = lastDragOffset;
        }
      });
      observer.observe(panelRef.value, { subtree: true, attributes: true, attributeFilter: ["data-collapsed"] });
    };
    const handlePointerDown = (event) => {
      const panel = panelRef.value;
      const handle = getPanelDragHandle(event.target, panel);
      if (!panel || !handle) return;
      dragTarget = handle;
      dragStart = getPanelDragStart(event.clientX, event.clientY, panel);
      didDrag = false;
      dragging = true;
      capturePanelPointer(handle, event.pointerId);
    };
    const handlePointerMove = (event) => {
      if (!dragging || !dragStart) return;
      if (!didDrag && !hasPanelDragMoved(dragStart, event.clientX, event.clientY)) return;
      didDrag = true;
      dragOffset.value = getPanelDragOffset(dragStart, event.clientX, event.clientY);
    };
    const handlePointerUp = (event) => {
      if (!dragging) return;
      dragging = false;
      dragStart = null;
      const handle = dragTarget;
      if (handle?.hasPointerCapture(event.pointerId)) {
        releasePanelPointer(handle, event.pointerId);
      }
      if (didDrag) {
        event.stopPropagation();
        if (handle) {
          blockPanelDragClick(handle);
        }
      }
      dragTarget = null;
    };
    const handlePanelOpenChange = (panelId, open) => {
      panelOpenStates.set(panelId, open);
      const fallbackOpen = props.mode === "inline" || props.defaultOpen;
      const nextRootOpen = panels.value.some((panel) => panelOpenStates.get(panel.id) ?? fallbackOpen);
      if (rootOpen === nextRootOpen) return;
      rootOpen = nextRootOpen;
      emit("openChange", nextRootOpen);
    };
    const handleRootOpenChange = (open) => {
      shellOpen.value = open;
      if (rootOpen === open) return;
      rootOpen = open;
      emit("openChange", open);
    };
    const getDragStyle = () => dragOffset.value ? {
      top: `${dragOffset.value.y}px`,
      left: `${dragOffset.value.x}px`,
      right: "auto",
      bottom: "auto"
    } : void 0;
    const originX = computed7(() => props.mode === "inline" ? void 0 : getPanelOriginX(activePosition.value, dragOffset.value));
    const originY = computed7(() => props.mode === "inline" ? void 0 : getPanelOriginY(activePosition.value, dragOffset.value));
    onMounted18(() => {
      mounted.value = true;
      panels.value = DialStore.getPanels("panel");
      timelines.value = TimelineStore.getTimelines();
      syncPanelOpenStates();
      unsubscribePanels = DialStore.subscribeGlobal(() => {
        panels.value = DialStore.getPanels("panel");
        syncPanelOpenStates();
      });
      unsubscribeOpen = DialStore.subscribePanelOpen((id, open) => {
        if (!panels.value.some((panel) => panel.id === id)) return;
        if (panels.value.length > 1 && open) handleRootOpenChange(true);
        else if (panels.value.length === 1) handlePanelOpenChange(id, open);
      });
      unsubscribeTimelines = TimelineStore.subscribeGlobal(() => {
        timelines.value = TimelineStore.getTimelines();
      });
      nextTick3(connectObserver);
    });
    onUnmounted17(() => {
      unsubscribePanels?.();
      unsubscribeTimelines?.();
      unsubscribeOpen?.();
      observer?.disconnect();
    });
    const timelineToggle = () => timelines.value.length > 0 ? h20(TimelineToggleButton) : null;
    const renderPanels = () => {
      if (panels.value.length === 0) {
        return [h20("div", { class: "dialkit-panel-wrapper" }, [
          h20(Folder, {
            title: "DialKit",
            open: shellOpen.value,
            defaultOpen: props.mode === "inline" || props.defaultOpen,
            isRoot: true,
            inline: props.mode === "inline",
            toolbar: timelineToggle,
            onOpenChange: handleRootOpenChange
          }, { default: () => [h20("div", { class: "dialkit-timeline-toolkit-only" }, "Timeline")] })
        ])];
      }
      if (panels.value.length > 1) {
        return [h20("div", { class: "dialkit-panel-wrapper" }, [
          h20(Folder, {
            title: "DialKit",
            open: shellOpen.value,
            defaultOpen: props.mode === "inline" || props.defaultOpen,
            isRoot: true,
            inline: props.mode === "inline",
            toolbar: timelineToggle,
            onOpenChange: handleRootOpenChange
          }, {
            default: () => panels.value.map((panel) => h20(Panel, {
              key: panel.id,
              panel,
              defaultOpen: true,
              variant: "section"
            }))
          })
        ])];
      }
      return panels.value.map((panel) => h20(Panel, {
        key: panel.id,
        panel,
        defaultOpen: props.mode === "inline" || props.defaultOpen,
        inline: props.mode === "inline",
        toolbarExtra: timelineToggle,
        onOpenChange: (open) => handlePanelOpenChange(panel.id, open)
      }));
    };
    const renderContent = () => h20(ShortcutListener, null, {
      default: () => h20("div", { class: "dialkit-root", "data-mode": props.mode, "data-theme": props.theme }, [
        h20("div", {
          ref: (el) => {
            panelRef.value = el;
            connectObserver();
          },
          class: "dialkit-panel",
          "data-position": props.mode === "inline" ? void 0 : dragOffset.value ? void 0 : activePosition.value,
          "data-origin-x": originX.value,
          "data-origin-y": originY.value,
          "data-mode": props.mode,
          "data-multiple": panels.value.length > 1 ? "true" : void 0,
          style: getDragStyle(),
          onPointerdown: props.mode === "inline" ? void 0 : handlePointerDown,
          onPointermove: props.mode === "inline" ? void 0 : handlePointerMove,
          onPointerup: props.mode === "inline" ? void 0 : handlePointerUp,
          onPointercancel: props.mode === "inline" ? void 0 : handlePointerUp
        }, renderPanels())
      ])
    });
    return () => {
      if (!props.productionEnabled || !mounted.value || typeof window === "undefined" || panels.value.length === 0 && timelines.value.length === 0) {
        return null;
      }
      if (props.mode === "inline") {
        return renderContent();
      }
      return h20(Teleport3, { to: "body" }, renderContent());
    };
  }
});

// src/vue/directives/dialkit.ts
var states = /* @__PURE__ */ new WeakMap();
function normalizeDirectiveValue(value) {
  if (!value) return {};
  if (value === "inline" || value === "popover") {
    return { mode: value };
  }
  return value;
}
function mountDialRoot(el, value) {
  if (typeof window === "undefined") return;
  const host = document.createElement("div");
  el.appendChild(host);
  const props = shallowRef3(normalizeDirectiveValue(value));
  const RootHost = defineComponent21({
    name: "DialKitDirectiveHost",
    setup() {
      return () => h21(DialRoot, props.value);
    }
  });
  const app = createApp(RootHost);
  app.mount(host);
  states.set(el, { app, host, props });
}
function unmountDialRoot(el) {
  const state2 = states.get(el);
  if (!state2) return;
  state2.app.unmount();
  state2.host.remove();
  states.delete(el);
}
var vDialKit = {
  mounted(el, binding) {
    mountDialRoot(el, binding.value);
  },
  updated(el, binding) {
    const state2 = states.get(el);
    if (!state2) {
      mountDialRoot(el, binding.value);
      return;
    }
    state2.props.value = normalizeDirectiveValue(binding.value);
  },
  beforeUnmount(el) {
    unmountDialRoot(el);
  }
};

// src/vue/components/Timeline/DialTimeline.ts
import {
  Teleport as Teleport4,
  computed as computed8,
  defineComponent as defineComponent22,
  h as h22,
  nextTick as nextTick4,
  onMounted as onMounted19,
  onUnmounted as onUnmounted18,
  ref as ref18,
  watch as watch8
} from "vue";
var DRAG_THRESHOLD_PX = 3;
var MAJOR_TICK_TARGET_PX = 140;
var MILLISECOND_STEP = 1e-3;
var SECOND_TICK_STEPS = [
  1e-3,
  2e-3,
  5e-3,
  0.01,
  0.02,
  0.05,
  0.1,
  0.2,
  0.5,
  1,
  2,
  5,
  10,
  15,
  30,
  60,
  120,
  300,
  600
];
var MIN_TIMELINE_MAX_ZOOM = 8;
var PLAYHEAD_FLAG_WIDTH = 52;
var PLAYHEAD_FLAG_EDGE_OVERHANG = 1;
var POPOVER_WIDTH = 280;
var ZOOM_DRAG_DISTANCE = 180;
var DEFAULT_DOCK_MAX_HEIGHT = 400;
var MIN_DOCK_MAX_HEIGHT = 120;
var DialTimeline = defineComponent22({
  name: "DialKitTimeline",
  props: {
    theme: { type: String, default: "system" },
    defaultVisible: { type: Boolean, default: true },
    visible: {
      type: Boolean,
      default: void 0
    },
    onVisibilityChange: Function,
    defaultOpen: { type: Boolean, default: true },
    productionEnabled: { type: Boolean, default: isDevDefault }
  },
  setup(props) {
    const timelines = ref18(TimelineStore.getTimelines());
    const dockVisible = ref18(TimelineUiStore.getVisible());
    const mounted = ref18(false);
    const dockMaxHeight = ref18(DEFAULT_DOCK_MAX_HEIGHT);
    const dockRef = ref18(null);
    const controllerId = /* @__PURE__ */ Symbol("dialkit-timeline-visibility");
    let unsubscribeTimelines;
    let unsubscribeVisibility;
    let unregisterController;
    let resizeCleanup = null;
    const handleResizePointerDown = (event) => {
      if (!dockRef.value) return;
      event.preventDefault();
      event.stopPropagation();
      resizeCleanup?.();
      const pointerY = event.clientY;
      const startHeight = dockRef.value.getBoundingClientRect().height;
      const move = (next) => {
        next.preventDefault();
        const viewportMax = Math.max(MIN_DOCK_MAX_HEIGHT, window.innerHeight - 24);
        dockMaxHeight.value = clamp3(startHeight + pointerY - next.clientY, MIN_DOCK_MAX_HEIGHT, viewportMax);
      };
      const finish = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
        resizeCleanup = null;
      };
      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
      resizeCleanup = finish;
    };
    onMounted19(() => {
      mounted.value = true;
      unsubscribeVisibility = TimelineUiStore.subscribe(() => {
        dockVisible.value = TimelineUiStore.getVisible();
      });
      unregisterController = TimelineUiStore.registerController(controllerId, {
        visible: props.visible,
        defaultVisible: props.defaultVisible,
        onVisibilityChange: props.onVisibilityChange
      });
      dockVisible.value = TimelineUiStore.getVisible();
      unsubscribeTimelines = TimelineStore.subscribeGlobal(() => {
        timelines.value = TimelineStore.getTimelines();
      });
    });
    watch8(() => [props.visible, props.defaultVisible, props.onVisibilityChange], () => {
      TimelineUiStore.updateController(controllerId, {
        visible: props.visible,
        defaultVisible: props.defaultVisible,
        onVisibilityChange: props.onVisibilityChange
      });
    });
    onUnmounted18(() => {
      unregisterController?.();
      unsubscribeTimelines?.();
      unsubscribeVisibility?.();
      resizeCleanup?.();
    });
    return () => {
      if (!props.productionEnabled || !mounted.value || timelines.value.length === 0) return null;
      return h22(Teleport4, { to: "body" }, [
        h22("div", {
          class: "dialkit-root dialkit-timeline",
          "data-theme": props.theme,
          hidden: !dockVisible.value
        }, [
          h22("div", {
            class: "dialkit-timeline-resize-handle",
            role: "separator",
            "aria-label": "Resize timeline height",
            "aria-orientation": "horizontal",
            title: "Drag to resize timeline",
            onPointerdown: handleResizePointerDown
          }),
          h22("div", {
            ref: dockRef,
            class: "dialkit-timeline-dock",
            style: { maxHeight: `min(${dockMaxHeight.value}px, calc(100vh - 24px))` }
          }, timelines.value.map((meta) => h22(TimelineSection, {
            key: meta.id,
            meta,
            defaultOpen: props.defaultOpen,
            theme: props.theme,
            dockVisible: dockVisible.value
          })))
        ])
      ]);
    };
  }
});
var PlayPauseButton = defineComponent22({
  props: { id: { type: String, required: true } },
  setup(props) {
    const playing = ref18(TimelineStore.getTransport(props.id).playing);
    let unsubscribe;
    onMounted19(() => {
      unsubscribe = TimelineStore.subscribe(props.id, () => {
        playing.value = TimelineStore.getTransport(props.id).playing;
      });
    });
    onUnmounted18(() => unsubscribe?.());
    return () => {
      const label = playing.value ? "Pause" : "Play";
      const icon3 = playing.value ? h22(
        "svg",
        { viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", style: iconStyle },
        ICON_PAUSE.map((path) => h22("path", { d: path, fill: "currentColor" }))
      ) : h22("svg", { viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", style: iconStyle }, [
        h22("path", { d: ICON_PLAY, fill: "currentColor" })
      ]);
      return h22("button", {
        class: "dialkit-toolbar-add",
        title: label,
        "aria-label": label,
        onClick: () => playing.value ? TimelineStore.pause(props.id) : TimelineStore.play(props.id)
      }, [h22("span", { style: { position: "relative", width: "16px", height: "16px" } }, [icon3])]);
    };
  }
});
var ReplayButton = defineComponent22({
  props: { onReplay: { type: Function, required: true } },
  setup(props) {
    return () => h22("button", {
      class: "dialkit-toolbar-add",
      title: "Replay",
      "aria-label": "Replay",
      onClick: props.onReplay
    }, [
      h22(
        "svg",
        { viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" },
        ICON_REPLAY.map((path) => h22("path", { d: path, fill: "currentColor" }))
      )
    ]);
  }
});
var iconStyle = {
  position: "absolute",
  inset: 0,
  width: "16px",
  height: "16px",
  color: "var(--dial-text-label)"
};
var TimelineOverview = defineComponent22({
  props: {
    id: { type: String, required: true },
    duration: { type: Number, required: true },
    viewStart: { type: Number, required: true },
    viewEnd: { type: Number, required: true },
    onNavigate: { type: Function, required: true }
  },
  setup(props) {
    const time = ref18(TimelineStore.getTransport(props.id).time);
    let scrub = null;
    let unsubscribe;
    onMounted19(() => {
      unsubscribe = TimelineStore.subscribe(props.id, () => {
        time.value = TimelineStore.getTransport(props.id).time;
      });
    });
    onUnmounted18(() => unsubscribe?.());
    const seek = (clientX) => {
      if (!scrub || scrub.rect.width <= 0 || props.duration <= 0) return;
      const next = clamp3((clientX - scrub.rect.left) / scrub.rect.width * props.duration, 0, props.duration);
      TimelineStore.seek(props.id, next);
      props.onNavigate(next);
    };
    const finish = () => {
      if (scrub?.wasPlaying) TimelineStore.play(props.id);
      scrub = null;
    };
    return () => {
      const viewportWidth = props.duration > 0 ? (props.viewEnd - props.viewStart) / props.duration * 100 : 100;
      const playhead = props.duration > 0 ? time.value / props.duration * 100 : 0;
      return h22("div", {
        class: "dialkit-timeline-overview",
        title: "Drag to scrub the full timeline",
        onPointerdown: (event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          scrub = {
            wasPlaying: TimelineStore.getTransport(props.id).playing,
            rect: event.currentTarget.getBoundingClientRect()
          };
          TimelineStore.pause(props.id);
          seek(event.clientX);
        },
        onPointermove: (event) => scrub && seek(event.clientX),
        onPointerup: finish,
        onPointercancel: finish,
        onLostpointercapture: finish
      }, [
        h22("div", {
          class: "dialkit-timeline-overview-viewport",
          "data-zoomed": viewportWidth < 99.999 || void 0,
          style: { left: `${props.duration > 0 ? props.viewStart / props.duration * 100 : 0}%`, width: `${viewportWidth}%` }
        }),
        h22("div", { class: "dialkit-timeline-overview-progress", style: { width: `${playhead}%` } }),
        h22("div", { class: "dialkit-timeline-overview-playhead", style: { left: `${playhead}%` } })
      ]);
    };
  }
});
var TimelinePlayheadFlag = defineComponent22({
  props: {
    id: { type: String, required: true },
    duration: { type: Number, required: true },
    pxPerSecond: { type: Number, required: true },
    viewStart: { type: Number, required: true },
    viewEnd: { type: Number, required: true },
    laneWidth: { type: Number, required: true },
    ruler: Object,
    onResetView: { type: Function, required: true }
  },
  setup(props) {
    const time = ref18(TimelineStore.getTransport(props.id).time);
    let unsubscribe;
    let scrub = null;
    let cleanup = null;
    onMounted19(() => {
      unsubscribe = TimelineStore.subscribe(props.id, () => {
        time.value = TimelineStore.getTransport(props.id).time;
      });
    });
    onUnmounted18(() => {
      unsubscribe?.();
      cleanup?.();
    });
    const seek = (clientX) => {
      if (!scrub || scrub.rect.width <= 0) return;
      TimelineStore.seek(props.id, clamp3(
        scrub.viewStart + (clientX - scrub.rect.left) / scrub.rect.width * (scrub.viewEnd - scrub.viewStart),
        scrub.viewStart,
        scrub.viewEnd
      ));
    };
    return () => {
      if (time.value < props.viewStart || time.value > props.viewEnd || props.laneWidth <= 0) return null;
      const x = clamp3((time.value - props.viewStart) * props.pxPerSecond, 0, props.laneWidth);
      const flagCenter = clamp3(
        x,
        PLAYHEAD_FLAG_WIDTH / 2 - PLAYHEAD_FLAG_EDGE_OVERHANG,
        props.laneWidth - PLAYHEAD_FLAG_WIDTH / 2 + PLAYHEAD_FLAG_EDGE_OVERHANG
      );
      const flagOffset = flagCenter - x;
      const edge = flagOffset > 0.5 ? "start" : flagOffset < -0.5 ? "end" : "center";
      return h22("div", {
        class: "dialkit-timeline-playhead-control",
        "data-edge": edge,
        style: {
          left: `calc(var(--dial-timeline-label-w) + ${x}px)`,
          "--dial-timeline-playhead-flag-offset": `${flagOffset}px`
        },
        role: "slider",
        "aria-label": "Timeline current time",
        "aria-valuemin": 0,
        "aria-valuemax": props.duration,
        "aria-valuenow": time.value,
        title: "Drag to scrub the timeline",
        onPointerdown: (event) => {
          const rect = props.ruler?.getBoundingClientRect();
          if (!rect) return;
          event.preventDefault();
          event.stopPropagation();
          cleanup?.();
          const reset = event.shiftKey;
          scrub = {
            wasPlaying: TimelineStore.getTransport(props.id).playing,
            rect,
            viewStart: reset ? 0 : props.viewStart,
            viewEnd: reset ? props.duration : props.viewEnd
          };
          if (reset) props.onResetView();
          TimelineStore.pause(props.id);
          seek(event.clientX);
          const move = (next) => {
            next.preventDefault();
            seek(next.clientX);
          };
          const finish = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", finish);
            window.removeEventListener("pointercancel", finish);
            if (scrub?.wasPlaying) TimelineStore.play(props.id);
            scrub = null;
            cleanup = null;
          };
          window.addEventListener("pointermove", move, { passive: false });
          window.addEventListener("pointerup", finish);
          window.addEventListener("pointercancel", finish);
          cleanup = finish;
        }
      }, [
        h22("div", { class: "dialkit-timeline-playhead-stem" }),
        h22("div", { class: "dialkit-timeline-playhead-anchor" }, [
          h22("div", { class: "dialkit-timeline-playhead-flag" }, time.value.toFixed(2))
        ])
      ]);
    };
  }
});
function clampViewStart(start, duration, visibleDuration) {
  return clamp3(start, 0, Math.max(0, duration - visibleDuration));
}
function formatRulerSeconds(time, step) {
  if (step >= 1 && Number.isInteger(time)) return formatClock(time);
  const decimals = Math.min(3, Math.max(1, Math.ceil(-Math.log10(step))));
  return `${time.toFixed(decimals)}s`;
}
var TimelineSection = defineComponent22({
  props: {
    meta: { type: Object, required: true },
    defaultOpen: { type: Boolean, required: true },
    theme: { type: String, required: true },
    dockVisible: { type: Boolean, required: true }
  },
  setup(props) {
    const open = ref18(props.defaultOpen);
    const copied = ref18(false);
    const popover = ref18(null);
    const collapsedGroups = ref18(/* @__PURE__ */ new Set());
    const expandedTracks = ref18(/* @__PURE__ */ new Set());
    const zoom = ref18(1);
    const viewStart = ref18(0);
    const values = ref18(DialStore.getValues(props.meta.id));
    const presets = ref18(DialStore.getPresets(props.meta.id));
    const activePresetId = ref18(DialStore.getActivePresetId(props.meta.id));
    const laneAreaRef = ref18(null);
    const horizontalScrollRef = ref18(null);
    const laneWidth = ref18(0);
    let unsubscribeValues;
    let resizeObserver;
    const measure = () => {
      if (laneAreaRef.value) laneWidth.value = laneAreaRef.value.getBoundingClientRect().width;
    };
    const connectMeasure = async () => {
      resizeObserver?.disconnect();
      if (!open.value) return;
      await nextTick4();
      if (!laneAreaRef.value) return;
      measure();
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(laneAreaRef.value);
    };
    onMounted19(() => {
      unsubscribeValues = DialStore.subscribe(props.meta.id, () => {
        values.value = DialStore.getValues(props.meta.id);
        presets.value = DialStore.getPresets(props.meta.id);
        activePresetId.value = DialStore.getActivePresetId(props.meta.id);
      });
      void connectMeasure();
    });
    onUnmounted18(() => {
      unsubscribeValues?.();
      resizeObserver?.disconnect();
    });
    watch8(open, connectMeasure);
    watch8(() => props.dockVisible, (visible) => {
      if (!visible) popover.value = null;
    });
    const visibleDuration = computed8(() => props.meta.duration > 0 ? props.meta.duration / zoom.value : props.meta.duration);
    const safeViewStart = computed8(() => clampViewStart(viewStart.value, props.meta.duration, visibleDuration.value));
    const viewEnd = computed8(() => safeViewStart.value + visibleDuration.value);
    const pxPerSecond = computed8(() => visibleDuration.value > 0 && laneWidth.value > 0 ? laneWidth.value / visibleDuration.value : 0);
    const maxZoom = computed8(() => Math.max(
      MIN_TIMELINE_MAX_ZOOM,
      laneWidth.value > 0 && props.meta.duration > 0 ? MAJOR_TICK_TARGET_PX * props.meta.duration / (MILLISECOND_STEP * 10 * laneWidth.value) : MIN_TIMELINE_MAX_ZOOM
    ));
    watch8(maxZoom, (next) => {
      zoom.value = clamp3(zoom.value, 1, next);
    }, { immediate: true });
    watch8([() => props.meta.duration, zoom], () => {
      viewStart.value = clampViewStart(viewStart.value, props.meta.duration, props.meta.duration / zoom.value);
    });
    watch8([open, pxPerSecond, safeViewStart], async () => {
      await nextTick4();
      const scroller = horizontalScrollRef.value;
      if (!scroller || pxPerSecond.value <= 0) return;
      const next = safeViewStart.value * pxPerSecond.value;
      if (Math.abs(scroller.scrollLeft - next) > 0.5) scroller.scrollLeft = next;
    });
    const centerViewAt = (time) => {
      if (zoom.value <= 1 || props.meta.duration <= 0) return;
      const duration = props.meta.duration / zoom.value;
      viewStart.value = clampViewStart(time - duration / 2, props.meta.duration, duration);
    };
    const resetView = () => {
      zoom.value = 1;
      viewStart.value = 0;
    };
    const handleReplay = () => {
      viewStart.value = 0;
      TimelineStore.replay(props.meta.id);
    };
    const handleHorizontalScroll = (event) => {
      if (pxPerSecond.value <= 0) return;
      viewStart.value = clampViewStart(
        event.currentTarget.scrollLeft / pxPerSecond.value,
        props.meta.duration,
        visibleDuration.value
      );
    };
    const handleTimelineWheel = (event) => {
      const scroller = horizontalScrollRef.value;
      if (!scroller || zoom.value <= 1) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
      if (delta === 0) return;
      event.preventDefault();
      scroller.scrollLeft += delta;
    };
    let zoomDrag = null;
    let rulerScrub = null;
    let trackScrub = null;
    const seekRuler = (clientX) => {
      if (!rulerScrub || rulerScrub.rect.width <= 0) return;
      TimelineStore.seek(props.meta.id, clamp3(
        rulerScrub.viewStart + (clientX - rulerScrub.rect.left) / rulerScrub.rect.width * rulerScrub.visibleDuration,
        rulerScrub.viewStart,
        rulerScrub.viewStart + rulerScrub.visibleDuration
      ));
    };
    const seekTrack = (clientX) => {
      if (!trackScrub || trackScrub.rect.width <= 0) return;
      TimelineStore.seek(props.meta.id, clamp3(
        trackScrub.viewStart + (clientX - trackScrub.rect.left) / trackScrub.rect.width * trackScrub.visibleDuration,
        trackScrub.viewStart,
        trackScrub.viewStart + trackScrub.visibleDuration
      ));
    };
    const finishRuler = () => {
      if (rulerScrub?.wasPlaying) TimelineStore.play(props.meta.id);
      rulerScrub = null;
      zoomDrag = null;
    };
    const finishTrack = () => {
      if (trackScrub?.wasPlaying) TimelineStore.play(props.meta.id);
      trackScrub = null;
    };
    const handleCopy = () => {
      const normalized = normalizeTimelineValuesForCopy(DialStore.getValues(props.meta.id), props.meta.clips);
      void navigator.clipboard.writeText(buildCopyInstruction("useDialTimeline", props.meta.name, normalized));
      copied.value = true;
      window.setTimeout(() => {
        copied.value = false;
      }, 1500);
    };
    const closePopover = () => {
      popover.value = null;
    };
    const openClipPopover = (clip, rect, stepKey) => {
      const target = stepKey ? `${clip.key}.${stepKey}` : clip.key;
      if (getClipControls(props.meta.id, target, stepKey ? void 0 : clipPopoverExclusions(clip)).length === 0) return;
      popover.value = popover.value?.clip.key === clip.key && popover.value.stepKey === stepKey ? null : {
        clip,
        stepKey,
        anchor: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }
      };
    };
    const toggleSet = (state2, key) => {
      const next = new Set(state2.value);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      state2.value = next;
    };
    const toggleTracks = (key) => toggleSet(expandedTracks, key);
    const toggleGroup = (key) => toggleSet(collapsedGroups, key);
    const handleBarClick = (clip, rect, stepKey) => {
      if (!stepKey && clip.tracks?.length) toggleTracks(clip.key);
      else openClipPopover(clip, rect, stepKey);
    };
    const ticks = computed8(() => {
      const raw = pxPerSecond.value > 0 ? MAJOR_TICK_TARGET_PX / pxPerSecond.value : 1;
      const adaptive = SECOND_TICK_STEPS.find((step) => step >= raw) ?? SECOND_TICK_STEPS[SECOND_TICK_STEPS.length - 1];
      const majorStep = zoom.value < 1.5 && props.meta.duration >= 1 ? Math.max(1, adaptive) : adaptive;
      const fineStep = majorStep / 10;
      const major = [];
      const medium = [];
      const fine = [];
      for (let time = Math.ceil((safeViewStart.value - 1e-6) / majorStep) * majorStep; time <= viewEnd.value + 1e-6; time += majorStep) {
        major.push(Number(time.toFixed(4)));
      }
      const first = Math.ceil((safeViewStart.value - 1e-6) / fineStep);
      const last = Math.floor((viewEnd.value + 1e-6) / fineStep);
      for (let index = first; index <= last; index++) {
        if (index % 10 === 0) continue;
        const tick = Number((index * fineStep).toFixed(6));
        if (index % 5 === 0) medium.push(tick);
        else fine.push(tick);
      }
      return { major, medium, fine, majorStep };
    });
    const renderRows = () => {
      const rows = [];
      let lastGroup;
      for (const clip of props.meta.clips) {
        if (clip.group !== lastGroup) {
          lastGroup = clip.group;
          if (clip.group) {
            const group = clip.group;
            const collapsed = collapsedGroups.value.has(group);
            rows.push(h22("div", { key: `group:${group}`, class: "dialkit-timeline-row dialkit-timeline-group-row" }, [
              h22("div", { class: "dialkit-timeline-label" }, [
                h22("button", {
                  class: "dialkit-timeline-group-toggle",
                  "data-open": !collapsed,
                  title: collapsed ? "Expand layer" : "Collapse layer",
                  onClick: () => toggleGroup(group)
                }, [chevronIcon()]),
                h22("span", formatLabel(group))
              ]),
              h22("div", { class: "dialkit-timeline-lane" })
            ]));
          }
        }
        if (clip.group && collapsedGroups.value.has(clip.group)) continue;
        const isProps = Boolean(clip.tracks?.length);
        const tracksOpen = isProps && expandedTracks.value.has(clip.key);
        const stat = computeClipStaticFromValues(values.value, clip, props.meta.duration);
        const selected = popover.value?.clip.key === clip.key;
        rows.push(h22("div", { key: clip.key, class: "dialkit-timeline-row", "data-grouped": clip.group ? "" : void 0 }, [
          h22("div", { class: "dialkit-timeline-label" }, [
            isProps ? h22("button", {
              class: "dialkit-timeline-group-toggle",
              "data-open": tracksOpen,
              title: tracksOpen ? "Collapse properties" : "Expand properties",
              onClick: (event) => {
                event.stopPropagation();
                toggleTracks(clip.key);
              }
            }, [chevronIcon()]) : null,
            clip.label
          ]),
          h22("div", { class: "dialkit-timeline-lane" }, [h22(TimelineClip, {
            timelineId: props.meta.id,
            clip,
            at: stat.at,
            duration: stat.duration,
            loop: stat.loop,
            steps: clip.stepKeys?.length ? stat.tracks[0]?.steps : void 0,
            fixedDuration: isProps ? true : stat.isPhysics,
            composite: isProps,
            pxPerSecond: pxPerSecond.value,
            viewStart: safeViewStart.value,
            timelineDuration: props.meta.duration,
            selected,
            selectedStepKey: selected ? popover.value?.stepKey : void 0,
            onClick: handleBarClick,
            onDrag: closePopover
          })])
        ]));
        if (!tracksOpen) continue;
        for (const trackRef of clip.tracks ?? []) {
          const track = stat.tracks.find((candidate) => candidate.prop === trackRef.prop);
          if (!track) continue;
          const trackKey = `${clip.key}.${trackRef.prop}`;
          const trackMeta = {
            key: trackKey,
            label: `${clip.label} \xB7 ${formatLabel(trackRef.prop)}`,
            color: clip.color,
            loop: clip.loop,
            group: clip.group,
            stepKeys: trackRef.stepKeys
          };
          const trackSelected = popover.value?.clip.key === trackKey;
          rows.push(h22("div", { key: trackKey, class: "dialkit-timeline-row dialkit-timeline-track-row", "data-grouped": clip.group ? "" : void 0 }, [
            h22("div", { class: "dialkit-timeline-label" }, formatLabel(trackRef.prop)),
            h22("div", { class: "dialkit-timeline-lane" }, [h22(TimelineClip, {
              timelineId: props.meta.id,
              clip: trackMeta,
              at: stat.at + track.delay,
              duration: track.duration,
              loop: stat.loop,
              steps: trackRef.stepKeys?.length ? track.steps : void 0,
              fixedDuration: !trackRef.stepKeys?.length && track.steps[0]?.isPhysics === true,
              baseAt: stat.at,
              delayMode: true,
              pxPerSecond: pxPerSecond.value,
              viewStart: safeViewStart.value,
              timelineDuration: props.meta.duration,
              selected: trackSelected,
              selectedStepKey: trackSelected ? popover.value?.stepKey : void 0,
              onClick: openClipPopover,
              onDrag: closePopover
            })])
          ]));
        }
      }
      return rows;
    };
    return () => h22("div", { class: "dialkit-timeline-section" }, [
      h22("div", { class: "dialkit-timeline-header", "data-open": open.value || void 0 }, [
        h22("div", { class: "dialkit-timeline-identity" }, [
          h22("span", { class: "dialkit-timeline-title" }, props.meta.name)
        ]),
        !open.value ? h22(TimelineOverview, {
          id: props.meta.id,
          duration: props.meta.duration,
          viewStart: safeViewStart.value,
          viewEnd: viewEnd.value,
          onNavigate: centerViewAt
        }) : null,
        h22("div", { class: "dialkit-timeline-actions" }, [
          h22(PlayPauseButton, { id: props.meta.id }),
          h22(ReplayButton, { onReplay: handleReplay }),
          h22(PresetManager, { panelId: props.meta.id, presets: presets.value, activePresetId: activePresetId.value }),
          h22("button", {
            class: "dialkit-toolbar-add",
            title: "Copy parameters",
            "aria-label": copied.value ? "Copied parameters" : "Copy parameters",
            onClick: handleCopy
          }, [h22("span", { style: { position: "relative", width: "16px", height: "16px" } }, [
            copied.value ? h22("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", style: iconStyle }, [h22("path", { d: ICON_CHECK })]) : h22("svg", { viewBox: "0 0 24 24", fill: "none", style: iconStyle }, [
              h22("path", { d: ICON_CLIPBOARD.board, stroke: "currentColor", "stroke-width": "2", "stroke-linejoin": "round" }),
              h22("path", { d: ICON_CLIPBOARD.sparkle, fill: "currentColor" }),
              h22("path", { d: ICON_CLIPBOARD.body, stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" })
            ])
          ])]),
          h22("button", {
            class: "dialkit-timeline-chevron",
            "data-open": open.value,
            "aria-expanded": open.value,
            title: open.value ? "Collapse timeline" : "Expand timeline",
            onClick: () => {
              open.value = !open.value;
            }
          }, [chevronIcon()])
        ])
      ]),
      open.value ? h22("div", {
        class: "dialkit-timeline-body",
        onWheel: handleTimelineWheel,
        onPointerdown: (event) => {
          const target = event.target;
          if (target.closest(".dialkit-timeline-label, button")) return;
          if (!event.shiftKey && target.closest(".dialkit-timeline-clip")) return;
          const rect = laneAreaRef.value?.getBoundingClientRect();
          if (!rect) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          const reset = event.shiftKey;
          trackScrub = {
            wasPlaying: TimelineStore.getTransport(props.meta.id).playing,
            rect,
            viewStart: reset ? 0 : safeViewStart.value,
            visibleDuration: reset ? props.meta.duration : visibleDuration.value
          };
          if (reset) resetView();
          popover.value = null;
          TimelineStore.pause(props.meta.id);
          seekTrack(event.clientX);
        },
        onPointermove: (event) => trackScrub && seekTrack(event.clientX),
        onPointerup: finishTrack,
        onPointercancel: finishTrack,
        onLostpointercapture: finishTrack
      }, [h22("div", { class: "dialkit-timeline-grid" }, [
        h22("div", { class: "dialkit-timeline-row dialkit-timeline-ruler-row" }, [
          h22("div", { class: "dialkit-timeline-label" }),
          h22("div", {
            ref: laneAreaRef,
            class: "dialkit-timeline-ruler",
            title: "Drag to seek \xB7 Option-drag to zoom \xB7 Shift-click to reset zoom",
            onPointerdown: (event) => {
              event.preventDefault();
              event.stopPropagation();
              const rect = event.currentTarget.getBoundingClientRect();
              if (rect.width <= 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              if (!event.altKey) {
                const reset = event.shiftKey;
                rulerScrub = {
                  wasPlaying: TimelineStore.getTransport(props.meta.id).playing,
                  rect,
                  viewStart: reset ? 0 : safeViewStart.value,
                  visibleDuration: reset ? props.meta.duration : visibleDuration.value
                };
                if (reset) resetView();
                TimelineStore.pause(props.meta.id);
                seekRuler(event.clientX);
                return;
              }
              const ratio = clamp3((event.clientX - rect.left) / rect.width, 0, 1);
              zoomDrag = {
                pointerX: event.clientX,
                zoom: zoom.value,
                anchorRatio: ratio,
                anchorTime: safeViewStart.value + ratio * visibleDuration.value,
                moved: false
              };
            },
            onPointermove: (event) => {
              if (rulerScrub) {
                seekRuler(event.clientX);
                return;
              }
              if (!zoomDrag || props.meta.duration <= 0) return;
              const dx = event.clientX - zoomDrag.pointerX;
              if (!zoomDrag.moved && Math.abs(dx) <= DRAG_THRESHOLD_PX) return;
              zoomDrag.moved = true;
              const nextZoom = clamp3(zoomDrag.zoom * Math.exp(dx / ZOOM_DRAG_DISTANCE), 1, maxZoom.value);
              const duration = props.meta.duration / nextZoom;
              zoom.value = nextZoom;
              viewStart.value = clampViewStart(zoomDrag.anchorTime - zoomDrag.anchorRatio * duration, props.meta.duration, duration);
            },
            onPointerup: finishRuler,
            onPointercancel: finishRuler,
            onLostpointercapture: finishRuler
          }, [
            ...ticks.value.fine.map((time) => h22("div", { key: `fine:${time}`, class: "dialkit-timeline-tick dialkit-timeline-tick-fine", style: { left: `${(time - safeViewStart.value) * pxPerSecond.value}px` } })),
            ...ticks.value.medium.map((time) => h22("div", { key: `medium:${time}`, class: "dialkit-timeline-tick dialkit-timeline-tick-medium", style: { left: `${(time - safeViewStart.value) * pxPerSecond.value}px` } })),
            ...ticks.value.major.map((time) => h22("div", { key: time, class: "dialkit-timeline-tick", style: { left: `${(time - safeViewStart.value) * pxPerSecond.value}px` } }, [
              h22("span", { class: "dialkit-timeline-tick-label" }, formatRulerSeconds(time, ticks.value.majorStep))
            ]))
          ])
        ]),
        ...renderRows(),
        pxPerSecond.value > 0 ? h22(TimelinePlayheadFlag, {
          id: props.meta.id,
          duration: props.meta.duration,
          pxPerSecond: pxPerSecond.value,
          viewStart: safeViewStart.value,
          viewEnd: viewEnd.value,
          laneWidth: laneWidth.value,
          ruler: laneAreaRef.value ?? void 0,
          onResetView: resetView
        }) : null
      ]), zoom.value > 1 ? h22("div", { class: "dialkit-timeline-scroll-row" }, [
        h22("div", { class: "dialkit-timeline-label" }),
        h22("div", {
          ref: horizontalScrollRef,
          class: "dialkit-timeline-horizontal-scroll",
          "aria-label": "Timeline horizontal scroll",
          onScroll: handleHorizontalScroll
        }, [h22("div", { style: { width: `${laneWidth.value * zoom.value}px` } })])
      ]) : null]) : null,
      popover.value ? h22(ClipPopover, {
        panelId: props.meta.id,
        popover: popover.value,
        values: values.value,
        theme: props.theme,
        onClose: closePopover
      }) : null
    ]);
  }
});
function chevronIcon() {
  return h22("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.5", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
    h22("path", { d: ICON_CHEVRON })
  ]);
}
var ClipPopover = defineComponent22({
  props: {
    panelId: { type: String, required: true },
    popover: { type: Object, required: true },
    values: { type: Object, required: true },
    theme: { type: String, required: true },
    onClose: { type: Function, required: true }
  },
  setup(props) {
    const element7 = ref18(null);
    const naturalHeight = ref18(0);
    const viewport = ref18(readViewport());
    let observer;
    const measure = () => {
      if (element7.value) naturalHeight.value = element7.value.scrollHeight + 2;
    };
    const updateViewport = () => {
      viewport.value = readViewport();
    };
    const outside = (event) => {
      const target = event.target;
      if (element7.value?.contains(target) || target.closest?.(".dialkit-timeline-clip") || target.closest?.(".dialkit-timeline-label")) return;
      props.onClose();
    };
    const keydown = (event) => {
      if (event.key === "Escape") props.onClose();
    };
    onMounted19(() => {
      measure();
      observer = new ResizeObserver(measure);
      if (element7.value) observer.observe(element7.value.querySelector(".dialkit-timeline-popover-body") ?? element7.value);
      window.addEventListener("resize", updateViewport);
      window.visualViewport?.addEventListener("resize", updateViewport);
      window.visualViewport?.addEventListener("scroll", updateViewport);
      document.addEventListener("pointerdown", outside, true);
      document.addEventListener("keydown", keydown);
    });
    onUnmounted18(() => {
      observer?.disconnect();
      window.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", keydown);
    });
    return () => {
      const { clip, stepKey } = props.popover;
      let controls;
      let title;
      if (stepKey) {
        controls = getClipControls(props.panelId, `${clip.key}.${stepKey}`);
        if (stepKey === clip.stepKeys?.[0]) {
          const from = getControlAt(props.panelId, `${clip.key}.from`);
          if (from) {
            const index = controls.findIndex((control) => control.path === `${clip.key}.${stepKey}.to`);
            controls = index >= 0 ? [...controls.slice(0, index), from, ...controls.slice(index)] : [...controls, from];
          }
        }
        title = `${clip.label} \xB7 ${formatStepLabel(stepKey)}`;
      } else {
        controls = getClipControls(props.panelId, clip.key, clipPopoverExclusions(clip));
        title = clip.label;
      }
      if (controls.length === 0) return null;
      const target = stepKey ? `${clip.key}.${stepKey}` : clip.key;
      const durationMeta = getControlAt(props.panelId, `${target}.duration`);
      const durationValue = durationMeta ? props.values[durationMeta.path] : void 0;
      const transitionDuration = durationMeta?.type === "slider" && typeof durationValue === "number" ? {
        value: durationValue,
        onChange: (next) => DialStore.updateValue(props.panelId, durationMeta.path, next),
        min: Math.max(TIMELINE_MIN_CLIP_DURATION, durationMeta.min ?? 0),
        max: durationMeta.max,
        step: durationMeta.step
      } : void 0;
      const current = viewport.value;
      const right = current.offsetLeft + current.width;
      const bottom = current.offsetTop + current.height;
      const width = Math.min(POPOVER_WIDTH, Math.max(220, current.width - 24));
      const left = clamp3(props.popover.anchor.left + props.popover.anchor.width / 2 - width / 2, current.offsetLeft + 12, Math.max(current.offsetLeft + 12, right - width - 12));
      const above = Math.max(0, props.popover.anchor.top - current.offsetTop - 22);
      const below = Math.max(0, bottom - props.popover.anchor.bottom - 22);
      const placeAbove = naturalHeight.value === 0 ? above >= below : naturalHeight.value <= above || naturalHeight.value > below && above >= below;
      const availableHeight = placeAbove ? above : below;
      const renderedHeight = Math.min(naturalHeight.value || availableHeight, availableHeight);
      const rawTop = placeAbove ? props.popover.anchor.top - 10 - renderedHeight : props.popover.anchor.bottom + 10;
      const top = clamp3(rawTop, current.offsetTop + 12, Math.max(current.offsetTop + 12, bottom - renderedHeight - 12));
      return h22(Teleport4, { to: "body" }, [h22("div", { class: "dialkit-root", "data-theme": props.theme }, [
        h22("div", {
          ref: element7,
          class: "dialkit-timeline-popover",
          "data-placement": placeAbove ? "above" : "below",
          style: { left: `${left}px`, top: `${top}px`, width: `${width}px`, maxHeight: `${availableHeight}px`, visibility: naturalHeight.value > 0 ? "visible" : "hidden" },
          role: "dialog",
          "aria-label": `Edit ${title}`
        }, [
          h22("div", { class: "dialkit-timeline-popover-header" }, [
            h22("span", { class: "dialkit-timeline-popover-title" }, title),
            h22("button", { class: "dialkit-timeline-popover-close", title: "Close editor", "aria-label": "Close editor", onClick: props.onClose }, [
              h22("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round" }, [h22("path", { d: "M6 6L18 18M18 6L6 18" })])
            ])
          ]),
          h22("div", { class: "dialkit-timeline-popover-body" }, [h22(ControlRenderer, {
            panelId: props.panelId,
            controls,
            values: timelinePopoverDisplayValues(props.values, clip.key, clip.stepKeys, stepKey),
            transitionDuration
          })])
        ])
      ])]);
    };
  }
});
function readViewport() {
  return {
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
    offsetLeft: window.visualViewport?.offsetLeft ?? 0,
    offsetTop: window.visualViewport?.offsetTop ?? 0
  };
}
function clipPopoverExclusions(clip) {
  return /* @__PURE__ */ new Set([...clip.stepKeys ?? [], ...clip.tracks?.map((track) => track.prop) ?? []]);
}
function getClipControls(panelId, path, exclusions) {
  const panel = DialStore.getPanel(panelId);
  const folder = panel ? findControl(panel.controls, path) : null;
  if (!folder?.children) return [];
  return folder.children.filter((control) => {
    const key = control.path.slice(path.length + 1);
    return key !== "at" && key !== "duration" && !exclusions?.has(key);
  });
}
function getControlAt(panelId, path) {
  const panel = DialStore.getPanel(panelId);
  return panel ? findControl(panel.controls, path) : null;
}
var TimelineClip = defineComponent22({
  props: {
    timelineId: { type: String, required: true },
    clip: { type: Object, required: true },
    at: { type: Number, required: true },
    duration: { type: Number, required: true },
    loop: { type: String, required: true },
    steps: Array,
    fixedDuration: { type: Boolean, required: true },
    composite: Boolean,
    baseAt: { type: Number, default: 0 },
    delayMode: Boolean,
    pxPerSecond: { type: Number, required: true },
    viewStart: { type: Number, required: true },
    timelineDuration: { type: Number, required: true },
    selected: { type: Boolean, required: true },
    selectedStepKey: String,
    onClick: { type: Function, required: true },
    onDrag: { type: Function, required: true }
  },
  setup(props) {
    const dragging = ref18(false);
    let drag = null;
    const finish = (event) => {
      const previous = drag;
      drag = null;
      dragging.value = false;
      if (previous && !previous.moved && event) {
        const anchor = previous.clickEl ?? event.currentTarget;
        props.onClick(props.clip, anchor.getBoundingClientRect(), previous.clickEl?.dataset.step);
      }
    };
    return () => {
      const width = Math.max(props.duration * props.pxPerSecond, 14);
      const isSteps = Boolean(props.steps?.length);
      const looping = props.loop === "repeat" && props.duration > 0;
      const resizable = props.duration > 0 && !props.fixedDuration && !props.composite;
      const durationText = `${props.fixedDuration && !props.composite ? "~" : ""}${formatSeconds(props.duration)}`;
      const ghosts = [];
      if (looping) {
        const first = Math.max(1, Math.floor((props.viewStart - props.at) / props.duration));
        for (let offset = 0; offset < 256; offset++) {
          const index = first + offset;
          const start = props.at + props.duration * index;
          if (start >= props.timelineDuration - 1e-6) break;
          const duration = Math.min(props.duration, props.timelineDuration - start);
          ghosts.push(h22("div", {
            key: `ghost:${index}`,
            class: "dialkit-timeline-clip-ghost",
            "data-steps": isSteps || void 0,
            "aria-hidden": "true",
            style: { left: `${(start - props.viewStart) * props.pxPerSecond + 1}px`, width: `${Math.max(1, duration * props.pxPerSecond - 2)}px`, background: props.clip.color }
          }, props.steps?.map((step) => h22("span", { class: "dialkit-timeline-clip-ghost-segment", style: { width: `${step.duration * props.pxPerSecond}px` } }))));
        }
      }
      let cumulative = 0;
      const boundaries = props.steps?.map((step) => cumulative += step.duration) ?? [];
      const children = [];
      if (props.composite) {
        if (width > 56) children.push(h22("span", { class: "dialkit-timeline-clip-duration" }, durationText));
      } else if (isSteps) {
        for (const step of props.steps ?? []) {
          const segmentWidth = step.duration * props.pxPerSecond;
          children.push(h22("div", {
            key: step.key ?? "step",
            class: "dialkit-timeline-clip-segment",
            "data-step": step.key,
            "data-selected": props.selectedStepKey === step.key || void 0,
            style: { width: `${segmentWidth}px` }
          }, segmentWidth > 52 ? [h22("span", { class: "dialkit-timeline-clip-duration" }, formatSeconds(step.duration))] : []));
        }
        (props.steps ?? []).forEach((step, index) => {
          if (!step.isPhysics) children.push(h22("div", { key: `boundary:${step.key}`, class: "dialkit-timeline-clip-handle", "data-boundary": index, style: { left: `${boundaries[index] * props.pxPerSecond - 4}px` } }));
        });
        if (!props.steps?.[0]?.isPhysics) children.push(h22("div", { class: "dialkit-timeline-clip-handle", "data-edge": "start" }));
      } else {
        if (resizable) children.push(h22("div", { class: "dialkit-timeline-clip-handle", "data-edge": "start" }));
        if (width > 56) children.push(h22("span", { class: "dialkit-timeline-clip-duration" }, durationText));
        if (resizable) children.push(h22("div", { class: "dialkit-timeline-clip-handle", "data-edge": "end" }));
      }
      const title = props.composite ? `${props.clip.label} \u2014 composite of its property tracks${looping ? " \xB7 repeats through timeline" : ""} \xB7 click to expand` : `${props.clip.label} \u2014 ${formatSeconds(props.at)} for ${durationText}${props.fixedDuration ? " (duration set by spring physics)" : ""}${looping ? " \xB7 repeats through timeline" : ""}${props.delayMode ? " \xB7 drag to phase-shift" : ""}`;
      return [...ghosts, h22("div", {
        class: "dialkit-timeline-clip",
        "data-steps": isSteps || void 0,
        "data-composite": props.composite || void 0,
        "data-selected": props.selected || void 0,
        "data-dragging": dragging.value || void 0,
        style: { left: `${(props.at - props.viewStart) * props.pxPerSecond}px`, width: `${width}px`, background: props.composite ? `${props.clip.color}80` : props.clip.color },
        title,
        onPointerdown: (event) => {
          if (event.shiftKey) return;
          event.stopPropagation();
          const target = event.target;
          let mode = "move";
          let boundaryIndex;
          if (target.dataset.boundary !== void 0) {
            mode = "boundary";
            boundaryIndex = Number(target.dataset.boundary);
          } else if (!props.fixedDuration) {
            const edge = target.dataset.edge;
            if (edge) mode = edge;
          }
          drag = {
            mode,
            boundaryIndex,
            pointerX: event.clientX,
            at: props.at,
            duration: props.duration,
            stepDurations: props.steps?.map((step) => step.duration),
            clickEl: target.closest?.("[data-step]"),
            moved: false
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        },
        onPointermove: (event) => {
          if (!drag || props.pxPerSecond <= 0) return;
          const dx = event.clientX - drag.pointerX;
          if (!drag.moved) {
            if (Math.abs(dx) <= DRAG_THRESHOLD_PX) return;
            drag.moved = true;
            dragging.value = true;
            props.onDrag();
          }
          const dt = dx / props.pxPerSecond;
          if (drag.mode === "boundary" && props.steps && drag.stepDurations) {
            const index = drag.boundaryIndex ?? 0;
            const others = drag.stepDurations.reduce((sum, duration, stepIndex) => stepIndex === index ? sum : sum + duration, 0);
            DialStore.updateValue(props.timelineId, `${props.clip.key}.${props.steps[index].key ?? ""}.duration`, clampStepResize(drag.stepDurations[index] + dt, drag.at, others, props.timelineDuration));
          } else if (drag.mode === "move") {
            if (props.delayMode) DialStore.updateValue(props.timelineId, `${props.clip.key}.delay`, clampTrackDelay(drag.at + dt - props.baseAt, props.baseAt, drag.duration, props.timelineDuration));
            else DialStore.updateValue(props.timelineId, `${props.clip.key}.at`, clampClipMove(drag.at + dt, drag.duration, props.timelineDuration));
          } else if (drag.mode === "end") {
            DialStore.updateValue(props.timelineId, `${props.clip.key}.duration`, clampClipResizeEnd(drag.duration + dt, drag.at, props.timelineDuration));
          } else if (props.steps && drag.stepDurations) {
            const next = clampClipResizeStart(Math.max(drag.at + dt, Math.max(props.baseAt, 0)), drag.at, drag.stepDurations[0]);
            DialStore.updateValues(props.timelineId, {
              [props.delayMode ? `${props.clip.key}.delay` : `${props.clip.key}.at`]: props.delayMode ? Math.max(0, next.at - props.baseAt) : next.at,
              [`${props.clip.key}.${props.steps[0].key ?? ""}.duration`]: next.duration
            });
          } else {
            const next = clampClipResizeStart(Math.max(drag.at + dt, Math.max(props.baseAt, 0)), drag.at, drag.duration);
            DialStore.updateValues(props.timelineId, {
              [props.delayMode ? `${props.clip.key}.delay` : `${props.clip.key}.at`]: props.delayMode ? Math.max(0, next.at - props.baseAt) : next.at,
              [`${props.clip.key}.duration`]: next.duration
            });
          }
        },
        onPointerup: finish,
        onPointercancel: () => finish(),
        onLostpointercapture: () => finish()
      }, children), looping ? h22("span", { class: "dialkit-timeline-loop-infinity", "aria-hidden": "true", title: "Repeats indefinitely" }, "\u221E") : null];
    };
  }
});

// src/vue/components/ShortcutsMenu.ts
import { defineComponent as defineComponent23, h as h23, watch as watch9, onMounted as onMounted20, onUnmounted as onUnmounted19, ref as ref19, Teleport as Teleport5 } from "vue";
function formatShortcutKey(sc) {
  if (!sc.key) return "\u2014";
  const mod = sc.modifier === "alt" ? "\u2325" : sc.modifier === "shift" ? "\u21E7" : sc.modifier === "meta" ? "\u2318" : "";
  return `${mod}${sc.key.toUpperCase()}`;
}
function formatInteraction(sc) {
  const interaction = sc.interaction ?? "scroll";
  switch (interaction) {
    case "scroll":
      return sc.key ? "key+scroll" : "scroll";
    case "drag":
      return "key+drag";
    case "move":
      return "key+move";
    case "scroll-only":
      return "scroll";
  }
}
var ShortcutsMenu = defineComponent23({
  name: "DialKitShortcutsMenu",
  props: {
    panelId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const isOpen = ref19(false);
    const currentPanel = ref19(DialStore.getPanel(props.panelId));
    let stopPanels;
    onMounted20(() => {
      const update = () => {
        currentPanel.value = DialStore.getPanel(props.panelId);
      };
      stopPanels = DialStore.subscribeGlobal(update);
      update();
    });
    const triggerRef = ref19(null);
    const dropdownRef = ref19(null);
    const pos = ref19({ top: 0, right: 0 });
    const open = () => {
      const rect = triggerRef.value?.getBoundingClientRect();
      if (rect) {
        pos.value = { top: rect.bottom + 4, right: window.innerWidth - rect.right };
      }
      isOpen.value = true;
    };
    const close = () => {
      isOpen.value = false;
    };
    const toggle = () => {
      if (isOpen.value) close();
      else open();
    };
    watch9(isOpen, (open2, _, onCleanup) => {
      if (!open2) return;
      onCleanup(observeDropdownKeyboard(triggerRef.value, () => dropdownRef.value, close, "help"));
    });
    let mousedownHandler = null;
    const addOutsideClickListener = () => {
      mousedownHandler = (e) => {
        const target = e.target;
        if (triggerRef.value?.contains(target) || dropdownRef.value?.contains(target)) return;
        close();
      };
      document.addEventListener("mousedown", mousedownHandler);
    };
    const removeOutsideClickListener = () => {
      if (mousedownHandler) {
        document.removeEventListener("mousedown", mousedownHandler);
        mousedownHandler = null;
      }
    };
    onUnmounted19(() => {
      stopPanels?.();
      removeOutsideClickListener();
    });
    return () => {
      const panel = currentPanel.value;
      if (!panel) return null;
      const shortcuts = Object.entries(panel.shortcuts);
      if (shortcuts.length === 0) return null;
      const findLabel = (controls, path) => {
        for (const c of controls) {
          if (c.path === path) return c.label;
          if (c.type === "folder" && c.children) {
            const found = findLabel(c.children, path);
            if (found) return found;
          }
        }
        return path;
      };
      const rows = shortcuts.map(([path, shortcut]) => ({
        path,
        shortcut,
        label: findLabel(panel.controls, path)
      }));
      if (isOpen.value) {
        if (!mousedownHandler) addOutsideClickListener();
      } else {
        removeOutsideClickListener();
      }
      return [
        h23("button", {
          ref: triggerRef,
          class: "dialkit-shortcuts-trigger",
          onClick: toggle,
          title: "Keyboard shortcuts",
          type: "button",
          "aria-haspopup": "dialog",
          "aria-expanded": isOpen.value
        }, [
          h23("svg", {
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
          }, [
            h23("rect", { x: "2", y: "6", width: "20", height: "12", rx: "2" }),
            h23("path", { d: "M6 10H6.01" }),
            h23("path", { d: "M10 10H10.01" }),
            h23("path", { d: "M14 10H14.01" }),
            h23("path", { d: "M18 10H18.01" }),
            h23("path", { d: "M8 14H16" })
          ])
        ]),
        isOpen.value ? h23(Teleport5, { to: "body" }, [
          h23("div", {
            ref: dropdownRef,
            class: "dialkit-root dialkit-shortcuts-dropdown",
            style: {
              position: "fixed",
              top: `${pos.value.top}px`,
              right: `${pos.value.right}px`
            }
          }, [
            h23("div", { class: "dialkit-shortcuts-title" }, "Keyboard Shortcuts"),
            h23(
              "div",
              { class: "dialkit-shortcuts-list" },
              rows.map(
                (row) => h23("div", { key: row.path, class: "dialkit-shortcuts-row" }, [
                  h23("span", { class: "dialkit-shortcuts-row-key" }, formatShortcutKey(row.shortcut)),
                  h23("span", { class: "dialkit-shortcuts-row-label" }, row.label),
                  h23("span", { class: "dialkit-shortcuts-row-mode" }, formatInteraction(row.shortcut))
                ])
              )
            ),
            h23("div", { class: "dialkit-shortcuts-hint" }, "See pill badges on controls for keys")
          ])
        ]) : null
      ];
    };
  }
});

// src/vue/components/ButtonGroup.ts
import { defineComponent as defineComponent24, h as h24 } from "vue";
var ButtonGroup = defineComponent24({
  name: "DialKitButtonGroup",
  props: {
    buttons: {
      type: Array,
      required: true
    }
  },
  setup(props) {
    return () => h24(
      "div",
      { class: "dialkit-button-group" },
      props.buttons.map(
        (button) => h24("button", { class: "dialkit-button", onClick: button.onClick }, button.label)
      )
    );
  }
});
export {
  BackgroundControl,
  ButtonGroup,
  ColorControl,
  ControlRenderer,
  DialPad,
  DialRoot,
  DialStore,
  DialTimeline,
  EasingVisualization,
  Folder,
  GRADIENT_SHAPES,
  ImageControl,
  PresetManager,
  SelectControl,
  ShortcutKey,
  ShortcutListener,
  ShortcutsMenu,
  Slider,
  SpringControl,
  SpringVisualization,
  TextControl,
  Toggle,
  TransitionControl,
  backgroundGradientCss,
  defaultBackgroundValue,
  defaultGradientHandles,
  dragGradientCentre,
  dragGradientEnd,
  dragGradientWidth,
  formatGizmoAngle,
  getBackgroundHost,
  getSavedGradients,
  gizmoAngle,
  gizmoPoints,
  gradientFrame,
  gradientParamAt,
  legacyGradientHandles,
  mountGradientGizmo,
  normalizeBackgroundValue,
  paintBackgroundPreview,
  rotateGradientHandles,
  setBackgroundHost,
  setSavedGradients,
  stopPlacement,
  stopPositionAt,
  subscribeBackgroundHost,
  switchGradientShape,
  unwrapVisibility,
  useDialKit,
  useDialKitController,
  useDialTimeline,
  useShortcutContext,
  vDialKit,
  withVisibility
};
//# sourceMappingURL=index.js.map