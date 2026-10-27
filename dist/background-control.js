// src/transition-math.ts
import { isEasingConfigValue, isSpringConfigValue } from "dialkit/store";
function round2(value) {
  return Math.round(value * 100) / 100;
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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
  return round2(clamp(duration, 0.05, 10));
}

// src/animation.ts
function animateSpring(node, frame, visualDuration = 0.35, bounce = 0.1) {
  if (typeof node.animate !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return;
  const params = springParams({ type: "spring", visualDuration, bounce });
  const duration = springSettleDuration(params);
  const count = Math.max(2, Math.ceil(duration * 60));
  const frames = Array.from({ length: count + 1 }, (_, index) => frame(index === count ? 1 : springProgress(index / count * duration, params)));
  return node.animate(frames, { duration: duration * 1e3, easing: "linear" });
}

// src/color.ts
var clamp2 = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
var wrapHue = (h) => (h % 360 + 360) % 360;
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
  return { l: clamp2(L), c: c < 1e-7 ? 0 : c, h: c < 1e-7 ? 0 : wrapHue(Math.atan2(B, A) * 180 / Math.PI), a: clamp2(a) };
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
function maxChroma(l, h, space = "srgb") {
  if (l <= 0 || l >= 1) return 0;
  return fitGamut({ l, c: 0.5, h, a: 1 }, space).c;
}
function colorFormat(value) {
  const text = value.trim();
  return /^oklch\(/i.test(text) ? "oklch" : /^color\(display-p3\s/i.test(text) ? "p3" : /^rgba?\(/i.test(text) ? "rgb" : /^hsla?\(/i.test(text) ? "hsl" : "hex";
}
var formatGamut = (format) => format === "oklch" || format === "p3" ? "p3" : "srgb";
var round = (v, digits = 4) => Number(v.toFixed(digits));
function formatColor(color, format) {
  const alpha = color.a < 1 ? ` / ${round(color.a)}` : "";
  if (format === "oklch") return `oklch(${round(color.l)} ${round(color.c)} ${round(color.h, 2)}${alpha})`;
  if (format === "hsl") {
    const [h, s, l] = colorChannels(color, "hsl");
    return `hsl(${round(h, 2)} ${round(s, 2)}% ${round(l, 2)}%${alpha})`;
  }
  const rgb = colorToRgb(fitGamut(color, formatGamut(format)), formatGamut(format));
  if (format === "p3") return `color(display-p3 ${rgb.map((n) => round(clamp2(n), 5)).join(" ")}${alpha})`;
  const bytes = rgb.map((n) => Math.round(clamp2(n) * 255));
  if (format === "rgb") return `rgb(${bytes.join(" ")}${alpha})`;
  if (color.a < 1) bytes.push(Math.round(color.a * 255));
  return ("#" + bytes.map((n) => n.toString(16).padStart(2, "0")).join("")).toUpperCase();
}
var hueChannel = (digits) => ({ name: "H", label: "Hue", max: 360, step: 1, digits, wrap: true });
var rgbChannels = (max, step, digits) => ["Red", "Green", "Blue"].map((label) => ({ name: label[0], label, max, step, digits }));
var COLOR_CHANNELS = {
  rgb: rgbChannels(255, 1, 0),
  hsl: [hueChannel(0), { name: "S", label: "Saturation", max: 100, step: 1, digits: 0 }, { name: "L", label: "Lightness", max: 100, step: 1, digits: 0 }],
  oklch: [{ name: "L", label: "Lightness", max: 1, step: 0.01, digits: 3 }, { name: "C", label: "Chroma", max: Infinity, step: 5e-3, digits: 3 }, hueChannel(1)],
  p3: rgbChannels(1, 0.01, 3)
};
var clampChannel = (channel, n) => channel.wrap ? wrapHue(n) : clamp2(n, 0, channel.max);
function colorChannels(color, format) {
  if (format === "oklch") return [color.l, color.c, color.h];
  const rgb = colorToRgb(fitGamut(color, formatGamut(format)), formatGamut(format)).map((n) => clamp2(n));
  if (format === "p3") return rgb;
  if (format === "rgb") return rgb.map((n) => n * 255);
  const max = Math.max(...rgb), d = max - Math.min(...rgb), l = max - d / 2;
  if (d < 1e-6) return [color.h ? grayHslHue(color.h) : 0, 0, l * 100];
  return [rgbHue(rgb, max, d), Math.min(100, d / (1 - Math.abs(2 * l - 1)) * 100), l * 100];
}
function colorToHsv(color, space = "srgb") {
  const rgb = colorToRgb(fitGamut(color, space), space).map((n) => clamp2(n));
  const max = Math.max(...rgb), d = max - Math.min(...rgb);
  if (d < 1e-6) return [color.h ? grayHslHue(color.h) : 0, 0, max];
  return [rgbHue(rgb, max, d), d / max, max];
}
function hsvToColor(h, s, v, a = 1, space = "srgb") {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const color = rgbToColor([f(5), f(3), f(1)], a, space);
  return color.c ? color : { ...color, h: grayHue(h) };
}
function rgbHue([r, g, b], max, d) {
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return wrapHue(h * 60);
}
function channelsToColor(values, format, a = 1) {
  const [x, y, z] = values.map((n, i) => clampChannel(COLOR_CHANNELS[format][i], n));
  if (format === "oklch") return { l: x, c: y, h: z, a: clamp2(a) };
  if (format === "hsl") return hslToColor(x, y / 100, z / 100, a);
  return format === "rgb" ? rgbToColor([x / 255, y / 255, z / 255], a) : rgbToColor([x, y, z], a, "p3");
}
function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}
var grayHue = (h) => rgbToColor(hslToRgb(h, 0.5, 0.5)).h;
function grayHslHue(h) {
  const offset = grayHue(0), target = wrapHue(h - offset);
  let lo = 0, hi = 360;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (wrapHue(grayHue(mid) - offset) < target) lo = mid;
    else hi = mid;
  }
  return lo;
}
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
    return l === null || c === null || h === null ? null : { l: clamp2(l), c: Math.max(0, c), h: wrapHue(h), a: clamp2(alpha) };
  }
  if (kind.startsWith("hsl")) {
    const h = number(channels[0], 1, true);
    const s = number(channels[1]);
    const l = number(channels[2]);
    if (h === null || s === null || l === null || !channels[1].endsWith("%") || !channels[2].endsWith("%")) return null;
    return hslToColor(wrapHue(h), clamp2(s), clamp2(l), alpha);
  }
  const values = channels.map((c) => number(c, p3 ? 1 : 255));
  if (values.some((n) => n === null)) return null;
  return rgbToColor(values.map((n) => p3 ? n : clamp2(n / 255)), alpha, p3 ? "p3" : "srgb");
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
var oneOf = (options, value, fallback) => options.includes(value) ? value : fallback;
var finite = (value) => typeof value === "number" && Number.isFinite(value);
var round3 = (n, digits) => Number(n.toFixed(digits)) || 0;
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
  return { x: round3(clamp2(value.x, POINT_RANGE.min, POINT_RANGE.max), 6), y: round3(clamp2(value.y, POINT_RANGE.min, POINT_RANGE.max), 6) };
}
function sortStops(stops) {
  return stops.map((stop, i) => ({ stop, i })).sort((a, b) => a.stop.at - b.stop.at || a.i - b.i).map(({ stop }) => stop);
}
function normalizeGradient(value, fallback = defaultBackgroundValue().gradient) {
  const input = isRecord(value) ? value : {};
  const shape = oneOf(GRADIENT_SHAPES, input.shape, fallback.shape);
  const handles = isRecord(input.handles) ? input.handles : {};
  const base = isRecord(input.handles) ? fallback.handles : switchGradientShape(fallback, shape).handles;
  const stops = Array.isArray(input.stops) ? input.stops.filter((stop) => isRecord(stop) && finite(stop.at) && validColor(stop.color)).map((stop) => ({ at: round3(clamp2(stop.at, 0, 100), 2), color: stop.color.trim() })) : [];
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
    fit: oneOf(MEDIA_FITS, input.fit, fallback.fit),
    ratio: oneOf(MEDIA_RATIOS, input.ratio, fallback.ratio),
    zoom: finite(input.zoom) ? round3(clamp2(input.zoom, MEDIA_ZOOM.min, MEDIA_ZOOM.max), 1) : fallback.zoom,
    tileSize: finite(input.tileSize) ? round3(clamp2(input.tileSize, MEDIA_TILE_SIZE.min, MEDIA_TILE_SIZE.max), 2) : fallback.tileSize,
    position: { x: oneOf(COLUMNS, position.x, fallback.position.x), y: oneOf(ROWS, position.y, fallback.position.y) }
  };
}
function normalizeBackgroundValue(value, fallback = defaultBackgroundValue()) {
  const input = isRecord(value) ? value : {};
  const media = input.media;
  return {
    mode: oneOf(MODES, input.mode, fallback.mode),
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
  const point = (x, y) => ({ x: round3(x, 6), y: round3(y, 6) });
  if (gradient.shape === "linear") {
    const centre = point((start.x + end.x) / 2, (start.y + end.y) / 2);
    next.handles = { start: centre, end: { ...end }, width: point(centre.x - (end.y - centre.y), centre.y + (end.x - centre.x)) };
  } else {
    next.handles = { start: point(2 * start.x - end.x, 2 * start.y - end.y), end: { ...end }, width: { ...width } };
  }
  return next;
}
function rotateGradient(gradient) {
  const { start, end, width } = gradient.handles;
  const pivot = gradient.shape === "linear" ? { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 } : start;
  const turn = (p) => ({ x: round3(pivot.x - (p.y - pivot.y), 6), y: round3(pivot.y + (p.x - pivot.x), 6) });
  return { ...cloneGradient(gradient), handles: { start: turn(start), end: turn(end), width: turn(width) } };
}
function moveStopColor(stops, from, to) {
  const colors = stops.map((stop) => stop.color);
  const [color] = colors.splice(from, 1);
  colors.splice(clamp2(to, 0, colors.length), 0, color);
  return stops.map((stop, i) => ({ at: stop.at, color: colors[i] }));
}
function colorOpacity(color) {
  return (parseColor(color)?.a ?? 1) * 100;
}
function withOpacity(color, opacity) {
  const parsed = parseColor(color) ?? { l: 0, c: 0, h: 0, a: 1 };
  return formatColor({ ...parsed, a: clamp2(opacity / 100) }, colorFormat(color));
}
function widestGapMiddle(stops) {
  let widest = 0;
  let middle = 50;
  for (let i = 0; i < stops.length - 1; i++) {
    const gap = stops[i + 1].at - stops[i].at;
    if (gap > widest) {
      widest = gap;
      middle = stops[i].at + gap / 2;
    }
  }
  return round3(middle, 2);
}
var rgba = (value) => {
  const color = parseColor(value) ?? { l: 0, c: 0, h: 0, a: 1 };
  const [r, g, b] = colorToRgb(fitGamut(color)).map((n) => clamp2(n));
  return [r, g, b, color.a];
};
function gradientColorAt(stops, at) {
  const after = stops.findIndex((stop) => stop.at > at);
  if (after <= 0) return (after === 0 ? stops[0] : stops[stops.length - 1])?.color ?? "#000000";
  const a = stops[after - 1];
  const b = stops[after];
  if (a.at === at) return a.color;
  const t = (at - a.at) / (b.at - a.at);
  const [x, y] = [rgba(a.color), rgba(b.color)];
  const mix = x.map((n, i) => n + (y[i] - n) * t);
  return formatColor(rgbToColor([mix[0], mix[1], mix[2]], mix[3]), colorFormat(a.color));
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
  const cross = ax * (handles.width.y * height - cy) - ay * (handles.width.x * width - cx);
  const side = cross < 0 ? -1 : 1;
  return { cx, cy, ax, ay, nx: -ay * side, ny: ax * side, r1, r2: Math.max(Math.abs(cross), 1e-6) };
}
function gradientParamAt(shape, frame, x, y) {
  const dx = x - frame.cx;
  const dy = y - frame.cy;
  const u = (dx * frame.ax + dy * frame.ay) / frame.r1;
  if (shape === "linear") return u;
  const v = (dx * frame.nx + dy * frame.ny) / frame.r2;
  if (shape === "radial") return Math.hypot(u, v);
  if (shape === "diamond") return Math.abs(u) + Math.abs(v);
  const turn = Math.atan2(v, u) / (2 * Math.PI);
  return turn < 0 ? turn + 1 : turn;
}
function gradientStrip(stops) {
  return { shape: "linear", handles: { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0, y: 1 } }, stops: stops.map((stop) => ({ ...stop })) };
}
function paintGradient(canvas, gradient) {
  const context = canvas.getContext("2d");
  const { width, height } = canvas;
  if (!context || !width || !height) return;
  const table = Array.from({ length: 256 }, (_, i) => rgba(gradientColorAt(gradient.stops, i / 255 * 100)).map((n) => Math.round(n * 255)));
  const frame = gradientFrame(gradient.handles, width, height);
  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = table[Math.round(clamp2(gradientParamAt(gradient.shape, frame, x + 0.5, y + 0.5)) * 255)];
      image.data.set(color, (y * width + x) * 4);
    }
  }
  context.putImageData(image, 0, 0);
}
function backgroundGradientCss(gradient) {
  const list = (stops) => stops.map((stop) => `${stop.color} ${round3(stop.at, 2)}%`).join(", ");
  const frame = gradientFrame(gradient.handles, 100, 100);
  const at = `${round3(frame.cx, 2)}% ${round3(frame.cy, 2)}%`;
  const angle = Math.atan2(frame.ax, -frame.ay) * 180 / Math.PI;
  if (gradient.shape === "linear") {
    const length = Math.abs(frame.ax) + Math.abs(frame.ay);
    const along = (t) => {
      const x = (frame.cx + frame.ax * frame.r1 * t) / 100 - 0.5;
      const y = (frame.cy + frame.ay * frame.r1 * t) / 100 - 0.5;
      return ((x * frame.ax + y * frame.ay) / length + 0.5) * 100;
    };
    return `linear-gradient(${round3(angle, 2)}deg, ${list(gradient.stops.map((stop) => ({ ...stop, at: along(stop.at / 100) })))})`;
  }
  if (gradient.shape === "angular") {
    const clockwise = frame.ax * frame.ny - frame.ay * frame.nx > 0;
    const stops = clockwise ? gradient.stops : gradient.stops.map((stop) => ({ ...stop, at: 100 - stop.at })).reverse();
    return `conic-gradient(from ${round3(angle, 2)}deg at ${at}, ${list(stops)})`;
  }
  const horizontal = Math.abs(frame.ax) >= Math.abs(frame.ay);
  return `radial-gradient(${round3(horizontal ? frame.r1 : frame.r2, 2)}% ${round3(horizontal ? frame.r2 : frame.r1, 2)}% at ${at}, ${list(gradient.stops)})`;
}
function backgroundMediaCss(media, display) {
  const position = `${display.position.x} ${display.position.y}`;
  const zoom = { transform: `scale(${display.zoom})`, "transform-origin": position };
  if (media.kind === "video") {
    return { "object-fit": display.fit === "fit" ? "contain" : display.fit === "stretch" ? "fill" : "cover", "object-position": position, ...zoom };
  }
  const size = { fill: "cover", fit: "contain", stretch: "100% 100%", tile: `auto ${round3(display.tileSize * 100, 2)}%` }[display.fit];
  return { "background-image": `url(${JSON.stringify(media.src)})`, "background-position": position, "background-repeat": display.fit === "tile" ? "repeat" : "no-repeat", "background-size": size, ...zoom };
}

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
function handleSliderKey(event, value, min, max, step, change, edit) {
  if (event.target !== event.currentTarget || event.altKey || event.metaKey || event.ctrlKey) return;
  const next = sliderKeyValue(event.key, value, min, max, step, event.shiftKey);
  if (next === void 0 && event.key !== "Enter") return;
  event.preventDefault();
  event.stopPropagation();
  if (next === void 0) edit();
  else change(next);
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

// src/control-fields.ts
function element(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  if (el instanceof HTMLButtonElement) el.type = "button";
  return el;
}
function segmentedControl(className, label, options, pick, buttonClassName = "") {
  const root = element("div", `dialkit-segmented ${className}`);
  root.setAttribute("role", "radiogroup");
  root.setAttribute("aria-label", label);
  root.addEventListener("keydown", handleSegmentKey);
  const pill = element("div", "dialkit-segmented-pill");
  pill.setAttribute("aria-hidden", "true");
  root.append(pill);
  const buttons = options.map((option) => {
    const button = element("button", `dialkit-segmented-button ${buttonClassName}`.trim(), option.icon ? void 0 : option.label);
    button.setAttribute("role", "radio");
    if (option.icon) button.append(option.icon);
    const name = option.ariaLabel ?? (option.icon && option.label);
    if (name) button.setAttribute("aria-label", name);
    button.addEventListener("click", () => pick(option.value));
    root.append(button);
    return button;
  });
  const width = (button) => {
    const style = getComputedStyle(button);
    const inner = parseFloat(style.width);
    if (style.boxSizing === "border-box") return inner;
    return inner + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
  };
  const place = (slide) => {
    const index = buttons.findIndex((button) => button.dataset.active === "true");
    if (!buttons[index]?.offsetWidth) return;
    const row = getComputedStyle(root);
    const gap = parseFloat(row.columnGap) || 0;
    let left = parseFloat(row.paddingLeft);
    for (const button of buttons.slice(0, index)) left += width(button) + gap;
    if (!slide) pill.style.transition = "none";
    pill.style.left = `${left}px`;
    pill.style.width = `${width(buttons[index])}px`;
    if (!slide) {
      void pill.offsetWidth;
      pill.style.transition = "";
    }
  };
  const observer = new ResizeObserver(() => place(false));
  buttons.forEach((button) => observer.observe(button));
  let current;
  return {
    root,
    buttons,
    set(value) {
      options.forEach((option, i) => {
        const active = option.value === value;
        buttons[i].setAttribute("aria-checked", String(active));
        buttons[i].tabIndex = active ? 0 : -1;
        buttons[i].dataset.active = String(active);
      });
      if (value !== current) {
        current = value;
        place(true);
      }
    },
    disconnect: () => observer.disconnect()
  };
}
function textField(className, label, text, accept) {
  const root = element("label", className);
  const input = element("input", `${className}-input`);
  input.type = "text";
  input.spellcheck = false;
  input.autocomplete = "off";
  input.setAttribute("aria-label", label);
  root.append(input);
  let shown = "";
  const show = () => {
    input.value = shown = text();
    input.removeAttribute("aria-invalid");
  };
  const commit = () => {
    if (accept(input.value.trim())) show();
    else input.setAttribute("aria-invalid", "true");
  };
  input.addEventListener("change", commit);
  input.addEventListener("blur", () => {
    if (input.getAttribute("aria-invalid")) show();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
    if (e.key === "Escape" && input.value !== text()) {
      e.preventDefault();
      e.stopPropagation();
      show();
    }
  });
  const sync = () => {
    const focused = document.activeElement === input;
    if (focused && input.value !== shown) return;
    const all = input.selectionStart === 0 && input.selectionEnd === input.value.length;
    show();
    if (focused && all) input.select();
  };
  return { root, input, show, sync };
}
function numberField(options) {
  const { digits, step, read } = options;
  const suffix = options.unit ?? "%";
  const parse = (text) => text ? Number(text.endsWith(suffix) ? text.slice(0, -suffix.length) : text) : NaN;
  const set = (n) => {
    const next = options.limit(Number(n.toFixed(digits)));
    if (next !== Number(read().toFixed(digits))) options.write(next);
    field2.show();
  };
  const field2 = textField(options.className, options.label, () => read().toFixed(digits), (text) => {
    const n = parse(text);
    if (Number.isFinite(n)) set(n);
    return Number.isFinite(n);
  });
  const { input } = field2;
  input.setAttribute("role", "spinbutton");
  input.inputMode = "decimal";
  input.setAttribute("aria-valuemin", String(options.min));
  if (Number.isFinite(options.max)) input.setAttribute("aria-valuemax", String(options.max));
  input.addEventListener("keydown", (e) => {
    if (!["ArrowUp", "ArrowDown"].includes(e.key) || e.altKey || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    e.stopPropagation();
    const draft = parse(input.value.trim());
    const position = (Number.isFinite(draft) ? draft : read()) / step;
    const steps = e.shiftKey ? 10 : 1;
    set((e.key === "ArrowUp" ? Math.floor(position + 1e-9) + steps : Math.ceil(position - 1e-9) - steps) * step);
  });
  const grips = [options.name, options.unit].map((text) => {
    if (!text) return void 0;
    const grip = element("span", `${options.className}-name`, text);
    grip.setAttribute("aria-hidden", "true");
    let drag;
    let moved = false;
    grip.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      drag = { id: e.pointerId, x: e.clientX, start: read() };
      moved = false;
      grip.setPointerCapture(e.pointerId);
      options.onScrub?.(true);
    });
    grip.addEventListener("pointermove", (e) => {
      if (e.pointerId !== drag?.id) return;
      const dx = e.clientX - drag.x;
      if (!moved && Math.abs(dx) < 3) return;
      moved = true;
      set(drag.start + dx * step * (e.shiftKey ? 10 : 1));
    });
    const end = (e) => {
      if (e.pointerId !== drag?.id) return;
      drag = void 0;
      options.onScrub?.(false);
    };
    grip.addEventListener("pointerup", end);
    grip.addEventListener("lostpointercapture", end);
    grip.addEventListener("click", (e) => {
      if (moved) e.preventDefault();
    });
    return grip;
  });
  if (grips[0]) field2.root.prepend(grips[0]);
  if (grips[1]) field2.root.append(grips[1]);
  return { ...field2, sync: () => {
    input.setAttribute("aria-valuenow", read().toFixed(digits));
    field2.sync();
  } };
}

// src/dropdown-position.ts
function getDropdownPosition(trigger, portalRoot, options = {}) {
  const scale = options.scale ?? 1;
  const dropdownHeight = (options.dropdownHeight ?? 0) * scale;
  const gap = (options.gap ?? 4) * scale;
  const { allowAbove = true } = options;
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
  let maxHeight = Math.min((options.maxHeight ?? 320) * scale, above ? spaceAbove : spaceBelow);
  const height = Math.min(dropdownHeight, maxHeight);
  const width = Math.min(options.width !== void 0 ? options.width * scale : triggerRect.width, Math.max(0, viewportWidth - margin * 2));
  let left = Math.max(viewportLeft + margin, Math.min(triggerRect.left, viewportLeft + viewportWidth - width - margin));
  let top = Math.max(viewportTop + margin, above ? triggerRect.top - height - gap : triggerRect.bottom + gap);
  if (options.preferSide) {
    const sideRect = trigger.closest(".dialkit-panel-inner")?.getBoundingClientRect() ?? triggerRect;
    const before = sideRect.left - width - gap;
    const after = sideRect.right + gap;
    const room = (width + gap) / scale;
    if (sideRect.left - room >= viewportLeft + margin) left = before;
    else if (sideRect.right + room <= viewportLeft + viewportWidth - margin) left = after;
    maxHeight = Math.min((options.maxHeight ?? 480) * scale, viewportHeight - margin * 2);
    top = Math.max(viewportTop + margin, Math.min(triggerRect.top - 32 * scale, viewportTop + viewportHeight - Math.min(dropdownHeight, maxHeight) - margin));
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

// src/color-control.ts
import { HINTS, isHintKey, setHint } from "./hints.js";
var FORMATS = [
  { value: "hex", label: "Hex" },
  { value: "rgb", label: "RGB" },
  { value: "hsl", label: "HSL" },
  { value: "oklch", label: "OKLCH" },
  { value: "p3", label: "P3", ariaLabel: "Display P3" }
];
var PICKER_HINTS = {
  format: "Shows the color as hex, RGB, HSL, OKLCH or P3.",
  fields: "Type a value, or drag a letter or the % to change it.",
  eyedropper: "Picks a color from anywhere on the screen."
};
var OPACITY = { name: "%", label: "Opacity", max: 100, step: 1, digits: 0 };
function element2(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  if (el instanceof HTMLButtonElement) el.type = "button";
  return el;
}
function eyedropperIcon() {
  const svg2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg2.setAttribute("viewBox", "0 0 24 24");
  svg2.setAttribute("fill", "none");
  svg2.setAttribute("stroke", "currentColor");
  svg2.setAttribute("stroke-width", "2");
  svg2.setAttribute("stroke-linecap", "round");
  svg2.setAttribute("stroke-linejoin", "round");
  svg2.setAttribute("aria-hidden", "true");
  for (const d of ["m2 22 1-1h3l9-9", "M3 21v-3l9-9", "m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"]) {
    const path = document.createElementNS(svg2.namespaceURI, "path");
    path.setAttribute("d", d);
    svg2.append(path);
  }
  return svg2;
}
function hsvChannels(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5), f(3), f(1)];
}
function hslChannels(h, s, l) {
  const k = s * Math.min(l, 1 - l);
  const f = (n) => {
    const t = (n + h / 30) % 12;
    return l - k * Math.max(-1, Math.min(t - 3, 9 - t, 1));
  };
  return [f(0), f(8), f(4)];
}
function mountColorControl(host, initial, presentation = "popover") {
  const inline = presentation === "inline";
  let props = initial;
  let color = parseColor(props.value) ?? { l: 0, c: 0, h: 0, a: 1 };
  let format = colorFormat(props.value);
  let lastEmitted;
  let popup;
  let stopPosition;
  let paintFrame = 0;
  let stopFormats;
  let eyedropperAbort;
  let updatePicker = () => {
  };
  const row = element2("div", "dialkit-color-control");
  const label = element2("span", "dialkit-color-label");
  const inputs = element2("div", "dialkit-color-inputs");
  const valueInput = element2("input", "dialkit-color-value");
  valueInput.type = "text";
  valueInput.spellcheck = false;
  valueInput.autocomplete = "off";
  const swatch = element2("button", "dialkit-color-swatch");
  swatch.setAttribute("aria-haspopup", "dialog");
  swatch.setAttribute("aria-expanded", "false");
  inputs.append(valueInput, swatch);
  row.append(label, inputs);
  host.append(row);
  if (inline) row.style.display = "none";
  const render = () => {
    label.textContent = props.label;
    setHint(row, props.hint);
    valueInput.setAttribute("aria-label", `${props.label} color value`);
    if (document.activeElement !== valueInput) valueInput.value = props.value;
    swatch.style.setProperty("--dial-color", props.value);
    swatch.setAttribute("aria-label", `Pick ${props.label.toLowerCase()} color`);
    updatePicker();
  };
  const commit = (next, nextFormat = format) => {
    format = nextFormat;
    color = format === "oklch" ? next : fitGamut(next, formatGamut(format));
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
    color = parsed;
    format = colorFormat(input.value);
    const value = input.value.trim();
    lastEmitted = value;
    props = { ...props, value };
    render();
    props.onChange(value);
    return true;
  };
  valueInput.addEventListener("focus", () => valueInput.select());
  valueInput.addEventListener("change", () => acceptText(valueInput));
  valueInput.addEventListener("blur", () => {
    if (valueInput.getAttribute("aria-invalid")) {
      valueInput.value = props.value;
      valueInput.removeAttribute("aria-invalid");
    }
  });
  valueInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      if (acceptText(valueInput)) valueInput.blur();
    }
    if (e.key === "Escape") {
      valueInput.value = props.value;
      valueInput.removeAttribute("aria-invalid");
      valueInput.blur();
    }
    e.stopPropagation();
  });
  const close = (restoreFocus = false) => {
    stopPosition?.();
    stopPosition = void 0;
    cancelAnimationFrame(paintFrame);
    if (popup) popup.querySelectorAll("[data-hint]").forEach((part) => setHint(part, void 0));
    stopFormats?.();
    stopFormats = void 0;
    eyedropperAbort?.abort();
    eyedropperAbort = void 0;
    popup?.remove();
    popup = void 0;
    updatePicker = () => {
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
  const open = () => {
    if (popup) {
      if (!inline) close();
      return;
    }
    const root = inline ? host : getDialKitPortalRoot(host) ?? host;
    popup = element2("div", "dialkit-color-popover");
    popup.dataset.presentation = presentation;
    popup.style.position = inline ? "static" : "fixed";
    popup.setAttribute("role", inline ? "group" : "dialog");
    popup.setAttribute("aria-label", `${props.label} color picker`);
    const plane = element2("div", "dialkit-color-plane");
    plane.setAttribute("role", "group");
    plane.tabIndex = 0;
    let canvas = element2("canvas", "dialkit-color-canvas");
    canvas.width = 252;
    canvas.height = 160;
    canvas.setAttribute("aria-hidden", "true");
    const marker = element2("span", "dialkit-color-marker");
    marker.setAttribute("aria-hidden", "true");
    plane.append(canvas, marker);
    setHint(plane, HINTS.colorPlane);
    const tracks = element2("div", "dialkit-color-tracks");
    function track(name, max, step, className, hint2) {
      const line = element2("label", "dialkit-color-track-row");
      const input = element2("input", `dialkit-color-track ${className}`);
      input.type = "range";
      input.min = "0";
      input.max = String(max);
      input.step = String(step);
      input.setAttribute("aria-label", name);
      line.append(input);
      tracks.append(line);
      setHint(line, hint2);
      return input;
    }
    const hue = track("Hue", 360, 0.1, "dialkit-color-hue", HINTS.colorHue);
    const opacity = track("Opacity", 100, 1, "dialkit-color-opacity", HINTS.colorOpacity);
    hue.addEventListener("input", () => {
      const at = handle();
      commit(colorAt(at.x, at.y, Number(hue.value)));
    });
    opacity.addEventListener("input", () => commit({ ...color, a: Number(opacity.value) / 100 }));
    const formatRow = element2("div", "dialkit-labeled-control dialkit-color-format-row");
    const formats = segmentedControl("dialkit-color-formats", "Color format", FORMATS, (f) => commit(color, f), "dialkit-color-format");
    formatRow.append(formats.root);
    stopFormats = formats.disconnect;
    setHint(formats.root, PICKER_HINTS.format);
    const fieldsRow = element2("div", "dialkit-color-fields-row");
    const fields = element2("div", "dialkit-color-fields");
    setHint(fields, PICKER_HINTS.fields);
    const EyeDropper = window.EyeDropper;
    if (EyeDropper) {
      const eyedropper = element2("button", "dialkit-color-eyedropper");
      eyedropper.setAttribute("aria-label", "Pick a color from the screen");
      setHint(eyedropper, PICKER_HINTS.eyedropper);
      eyedropper.append(eyedropperIcon());
      eyedropper.addEventListener("click", async () => {
        eyedropperAbort?.abort();
        const abort = eyedropperAbort = new AbortController();
        try {
          const picked = parseColor((await new EyeDropper().open({ signal: abort.signal })).sRGBHex);
          if (picked && !abort.signal.aborted) commit({ ...picked, a: color.a });
        } catch {
        }
        if (eyedropperAbort === abort) eyedropperAbort = void 0;
      });
      fieldsRow.append(eyedropper);
    }
    fieldsRow.append(fields);
    let fieldsFormat;
    let syncFields = [];
    let typed;
    const channelKey = () => formatColor({ ...color, a: 1 }, format);
    const channelValues = (f) => typed?.key === channelKey() ? typed.values : colorChannels(color, f);
    const channelField = (channel, label2, read, write) => {
      const field2 = numberField({
        className: "dialkit-color-field",
        label: label2,
        // Opacity's % follows its number; a channel's letter leads.
        ...channel === OPACITY ? { unit: channel.name } : { name: channel.name },
        min: 0,
        max: channel.max,
        step: channel.step,
        digits: channel.digits,
        limit: (n) => clampChannel(channel, n),
        read,
        write
      });
      field2.root.dataset.channel = channel.label.toLowerCase();
      return field2;
    };
    const hexField = () => {
      const field2 = textField("dialkit-color-field", "Hex value", () => formatColor({ ...color, a: 1 }, "hex"), (text) => {
        const hex = text.replace(/^#?/, "#");
        if (/^#[\da-f]+$/i.test(hex)) {
          const parsed2 = parseColor(hex);
          if (!parsed2) return false;
          const next = { ...parsed2, a: hex.length === 5 || hex.length === 9 ? parsed2.a : color.a };
          if (formatColor(next, "hex") !== formatColor(color, "hex")) commit(next);
          return true;
        }
        const parsed = parseColor(text);
        if (parsed) commit(parsed, colorFormat(text));
        return !!parsed;
      });
      field2.root.dataset.channel = "hex";
      return field2;
    };
    const opacityField = channelField(OPACITY, "Alpha percentage", () => color.a * 100, (n) => commit({ ...color, a: n / 100 }));
    fields.append(opacityField.root);
    let channelFields = [];
    const buildFields = () => {
      const f = format;
      const mode = FORMATS.find((option) => option.value === f);
      const channels = f === "hex" ? [hexField()] : COLOR_CHANNELS[f].map((channel, i) => channelField(channel, `${mode.ariaLabel ?? mode.label} ${channel.label}`, () => channelValues(f)[i], (n) => {
        const values = channelValues(f).slice();
        values[i] = n;
        const converted = channelsToColor(values, f, color.a);
        const next = f === "oklch" || f === "hsl" || converted.c > 1e-7 ? converted : { ...converted, h: color.h };
        typed = { key: formatColor({ ...next, a: 1 }, f), values };
        commit(next);
      }));
      fieldsFormat = f;
      syncFields = [...channels, opacityField].map((field2) => field2.sync);
      const focused = channelFields.findIndex((field2) => field2.input === document.activeElement);
      channelFields.forEach((field2) => field2.root.remove());
      opacityField.root.before(...channels.map((field2) => field2.root));
      channelFields = channels;
      if (focused >= 0) {
        const field2 = channels[focused] ?? channels[0];
        field2.show();
        field2.input.focus({ preventScroll: true });
        field2.input.select();
      }
    };
    const planeKind = () => format === "oklch" ? "oklch" : format === "hsl" ? "hsl" : "hsv";
    const gamut = () => formatGamut(format);
    const PLANE_LABEL = {
      hsv: "Color field; use arrow keys to adjust saturation and brightness",
      hsl: "Color field; use arrow keys to adjust saturation and lightness",
      oklch: "Color field; use arrow keys to adjust chroma and lightness"
    };
    let saturation = 0;
    const planeHue = () => planeKind() === "oklch" ? color.h : planeKind() === "hsl" ? colorChannels(color, "hsl")[0] : colorToHsv(color, gamut())[0];
    const handle = () => {
      if (planeKind() === "hsv") {
        const [, s, v] = colorToHsv(color, gamut());
        if (v > 0) saturation = s;
        return { x: saturation, y: 1 - v };
      }
      if (planeKind() === "hsl") {
        const [, s, l] = colorChannels(color, "hsl");
        if (l > 0 && l < 100) saturation = s / 100;
        return { x: saturation, y: 1 - l / 100 };
      }
      const max = maxChroma(color.l, color.h, gamut());
      if (max > 0) saturation = clamp2(color.c / max);
      return { x: saturation, y: 1 - color.l };
    };
    const colorAt = (x, y, h = planeHue()) => {
      saturation = x;
      if (planeKind() === "hsv") return hsvToColor(h, x, 1 - y, color.a, gamut());
      if (planeKind() === "hsl") return channelsToColor([h, x * 100, (1 - y) * 100], "hsl", color.a);
      return { ...color, l: 1 - y, c: x * maxChroma(1 - y, h, gamut()), h };
    };
    let lastPaint = "";
    let lastHueTrack = "";
    let ctx = null;
    let ctxGamut;
    let canvasSpace = "srgb";
    const context = (space) => {
      if (ctxGamut === space) return ctx;
      if (ctxGamut) {
        const next = canvas.cloneNode();
        canvas.replaceWith(next);
        canvas = next;
      }
      ctxGamut = space;
      ctx = canvas.getContext("2d", { colorSpace: space === "p3" ? "display-p3" : "srgb" });
      canvasSpace = ctx?.getContextAttributes?.().colorSpace === "display-p3" ? "p3" : "srgb";
      return ctx;
    };
    const paint = () => {
      const kind = planeKind(), space = gamut(), h = planeHue();
      const key = `${kind}:${space}:${h}`;
      if (key === lastPaint) return;
      const target = context(space);
      if (!target) return;
      lastPaint = key;
      const pixels = target.createImageData(canvas.width, canvas.height);
      for (let y = 0; y < canvas.height; y++) {
        const t = 1 - y / (canvas.height - 1);
        const max = kind === "oklch" ? maxChroma(t, h, space) : 0;
        for (let x = 0; x < canvas.width; x++) {
          const u = x / (canvas.width - 1);
          const rgb = kind === "hsv" && canvasSpace === space ? hsvChannels(h, u, t) : kind === "hsl" && canvasSpace === "srgb" ? hslChannels(h, u, t) : colorToRgb(kind === "hsv" ? hsvToColor(h, u, t, 1, space) : kind === "hsl" ? channelsToColor([h, u * 100, t * 100], "hsl") : { l: t, c: u * max, h, a: 1 }, canvasSpace);
          const index = (y * canvas.width + x) * 4;
          rgb.forEach((n, i) => {
            pixels.data[index + i] = Math.round(clamp2(n) * 255);
          });
          pixels.data[index + 3] = 255;
        }
      }
      target.putImageData(pixels, 0, 0);
    };
    const hueTrack = (at) => {
      const kind = planeKind(), space = gamut();
      const stops = Array.from({ length: 73 }, (_, i) => {
        const h = i * 5;
        if (kind === "hsl") return `hsl(${h} ${(at.x * 100).toFixed(2)}% ${((1 - at.y) * 100).toFixed(2)}%)`;
        if (kind === "hsv") return formatColor(hsvToColor(h, at.x, 1 - at.y, 1, space), space === "p3" ? "p3" : "rgb");
        return formatColor({ l: color.l, c: at.x * maxChroma(color.l, h, space), h, a: 1 }, "oklch");
      });
      const interpolation = kind === "oklch" ? " in oklab" : space === "p3" ? " in display-p3" : "";
      return `linear-gradient(to right${interpolation}, ${stops.join(", ")})`;
    };
    updatePicker = () => {
      popup?.setAttribute("aria-label", `${props.label} color picker`);
      plane.setAttribute("aria-label", PLANE_LABEL[planeKind()]);
      const at = handle();
      const h = planeHue();
      marker.style.left = `${at.x * 100}%`;
      marker.style.top = `${at.y * 100}%`;
      marker.style.background = formatColor({ ...color, a: 1 }, "oklch");
      hue.value = String(h);
      opacity.value = String(color.a * 100);
      hue.setAttribute("aria-valuetext", `${Math.round(h)} degrees`);
      opacity.setAttribute("aria-valuetext", `${Math.round(color.a * 100)} percent`);
      const hueTrackKey = `${planeKind()}:${gamut()}:${at.x.toFixed(5)}:${at.y.toFixed(5)}:${color.l.toFixed(5)}`;
      if (hueTrackKey !== lastHueTrack) {
        lastHueTrack = hueTrackKey;
        hue.style.setProperty("--dial-color-track-bg", hueTrack(at));
      }
      hue.style.setProperty("--dial-color-thumb", formatColor({ ...color, a: 1 }, "oklch"));
      opacity.style.setProperty("--dial-color-thumb", formatColor(color, "oklch"));
      opacity.style.setProperty("--dial-color-opaque", formatColor({ ...color, a: 1 }, "oklch"));
      formats.set(format);
      if (fieldsFormat !== format) buildFields();
      syncFields.forEach((sync) => sync());
      cancelAnimationFrame(paintFrame);
      paintFrame = requestAnimationFrame(paint);
    };
    const move = (e) => {
      const rect = plane.getBoundingClientRect();
      commit(colorAt(clamp2((e.clientX - rect.left) / rect.width), clamp2((e.clientY - rect.top) / rect.height)));
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
      const x = clamp2(at.x + (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0));
      const y = clamp2(at.y + (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0));
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
        const first = formats.buttons.find((button) => button.tabIndex === 0);
        if (e.shiftKey && document.activeElement === first || !e.shiftKey && document.activeElement === opacityField.input) {
          swatch.focus({ preventScroll: true });
          close();
        }
      }
      if (!isHintKey(e)) e.stopPropagation();
    });
    popup.append(formatRow, plane, tracks, fieldsRow);
    root.append(popup);
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
    formats.buttons.find((button) => button.getAttribute("aria-checked") === "true")?.focus({ preventScroll: true });
  };
  swatch.addEventListener("click", open);
  render();
  if (inline) open();
  return {
    update(next) {
      const parsed = parseColor(next.value);
      if (parsed && next.value !== lastEmitted && next.value !== props.value) {
        color = { ...parsed, h: parsed.c < 1e-7 && colorFormat(next.value) !== "hsl" ? color.h : parsed.h };
        format = colorFormat(next.value);
      }
      props = next;
      render();
    },
    /** Closes the popover picker. */
    close() {
      if (!inline) close();
    },
    destroy() {
      close();
      setHint(row, void 0);
      row.remove();
    }
  };
}

// src/dropdown-keyboard.ts
import { isHintKey as isHintKey2 } from "./hints.js";
var dropdownId = 0;
var PRESET_MENU_MAX_WIDTH = 280;
function observeDropdownKeyboard(trigger, getPopup, close, kind = "select") {
  let frame = 0;
  let dispose;
  let stopped = false;
  const connect = () => {
    if (stopped) return;
    const popup = getPopup();
    if (!popup?.isConnected) {
      frame = requestAnimationFrame(connect);
      return;
    }
    popup.inert = false;
    popup.removeAttribute("aria-hidden");
    popup.id || (popup.id = `dialkit-dropdown-${++dropdownId}`);
    popup.setAttribute("role", kind === "select" ? "listbox" : kind === "presets" ? "menu" : "dialog");
    popup.setAttribute("aria-label", trigger.getAttribute("aria-label") || trigger.querySelector(".dialkit-select-label")?.textContent?.trim() || trigger.getAttribute("title") || trigger.textContent?.trim() || "Options");
    popup.tabIndex = -1;
    trigger.setAttribute("aria-controls", popup.id);
    const selector = kind === "select" ? ".dialkit-select-option" : ".dialkit-preset-name, .dialkit-preset-more, .dialkit-preset-rename, .dialkit-preset-lock, .dialkit-preset-delete, .dialkit-preset-create";
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
      if (active && !leaving && !popup.contains(document.activeElement)) focusItem(activeIndex);
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
      if (event.target instanceof HTMLInputElement && event.key !== "Tab") return;
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
      if (event.key.length === 1 && event.key !== " " && !isHintKey2(event)) {
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
      if (target && (target.classList.contains("dialkit-preset-lock") || !target.closest(".dialkit-preset-actions"))) restore();
    };
    const focusin = (event) => {
      const target = event.target;
      const index = items().indexOf(target);
      if (index >= 0) {
        active = target;
        activeIndex = index;
      }
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
        if (kind === "presets") {
          const maxWidth = Math.max(pos.width, Math.min(PRESET_MENU_MAX_WIDTH, window.innerWidth - pos.left - 8));
          Object.assign(popup.style, { width: "auto", minWidth: `${pos.width}px`, maxWidth: `${maxWidth}px` });
        } else Object.assign(popup.style, { width: `${pos.width}px`, minWidth: "0" });
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
  frame = requestAnimationFrame(connect);
  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
    dispose?.();
  };
}

// src/icons.ts
var ICON_CHEVRON = "M6 9.5L12 15.5L18 9.5";
var ICON_CLOSE = "M6 6L18 18M18 6L6 18";
var ICON_CLIPBOARD = {
  board: "M8 6C8 4.34315 9.34315 3 11 3H13C14.6569 3 16 4.34315 16 6V7H8V6Z",
  sparkle: "M19.2405 16.1852L18.5436 14.3733C18.4571 14.1484 18.241 14 18 14C17.759 14 17.5429 14.1484 17.4564 14.3733L16.7595 16.1852C16.658 16.4493 16.4493 16.658 16.1852 16.7595L14.3733 17.4564C14.1484 17.5429 14 17.759 14 18C14 18.241 14.1484 18.4571 14.3733 18.5436L16.1852 19.2405C16.4493 19.342 16.658 19.5507 16.7595 19.8148L17.4564 21.6267C17.5429 21.8516 17.759 22 18 22C18.241 22 18.4571 21.8516 18.5436 21.6267L19.2405 19.8148C19.342 19.5507 19.5507 19.342 19.8148 19.2405L21.6267 18.5436C21.8516 18.4571 22 18.241 22 18C22 17.759 21.8516 17.5429 21.6267 17.4564L19.8148 16.7595C19.5507 16.658 19.342 16.4493 19.2405 16.1852Z",
  body: "M16 5H17C18.6569 5 20 6.34315 20 8V11M8 5H7C5.34315 5 4 6.34315 4 8V18C4 19.6569 5.34315 21 7 21H12"
};
var ICON_CLIPBOARD_PLAIN = {
  board: ICON_CLIPBOARD.board,
  body: "M16 5H17C18.6569 5 20 6.34315 20 8V18C20 19.6569 18.6569 21 17 21H7C5.34315 21 4 19.6569 4 18V8C4 6.34315 5.34315 5 7 5H8"
};
var ICON_PLUS = ["M5 12H19M12 5V19"];
var ICON_LOCK = [
  "M6 11H18C18.5523 11 19 11.4477 19 12V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V12C5 11.4477 5.44772 11 6 11Z",
  "M7 11V7a5 5 0 0 1 10 0v4"
];
var ICON_LOCK_OPEN = [
  ICON_LOCK[0],
  "M7 11V7a5 5 0 0 1 9.9-1"
];

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
function isWordUnit(unit) {
  return /^\p{L}/u.test(unit);
}

// src/background-control.ts
import { isHintKey as isHintKey3, mountHints } from "./hints.js";
import { DialStore as DialStore2 } from "dialkit/store";

// src/shortcut-utils.ts
import { DialStore } from "dialkit/store";
function snapToDecile(rawValue, min, max) {
  const normalized = (rawValue - min) / (max - min);
  const nearest = Math.round(normalized * 10) / 10;
  if (Math.abs(normalized - nearest) <= 0.03125) {
    return min + nearest * (max - min);
  }
  return rawValue;
}
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

// src/vanilla/controls.ts
import { HINTS as HINTS2, setHint as setHint2 } from "./hints.js";

// src/vanilla/dom.ts
function element3(tag, className = "", text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== void 0)
    node.textContent = text;
  if (tag === "button")
    node.type = "button";
  return node;
}

// src/vanilla/controls.ts
function appendShortcut(label, shortcut, active = false, toggle = false) {
  if (!shortcut)
    return;
  label.append(element3("span", `dialkit-shortcut-pill${active ? " dialkit-shortcut-pill-active" : ""}`, toggle ? formatToggleShortcut(shortcut) : formatSliderShortcut(shortcut)));
}
function mountSlider(host, initial) {
  let props = initial;
  const wrapper = element3("div", "dialkit-slider-wrapper");
  const track = element3("div", "dialkit-slider");
  track.tabIndex = 0;
  track.setAttribute("role", "slider");
  const hashes = element3("div", "dialkit-slider-hashmarks");
  const fill = element3("div", "dialkit-slider-fill");
  const handle = element3("div", "dialkit-slider-handle");
  const label = element3("span", "dialkit-slider-label");
  const display = element3("span", "dialkit-slider-value");
  const unit = element3("span", "dialkit-slider-unit");
  const input = element3("input", "dialkit-slider-input");
  input.type = "text";
  input.inputMode = "decimal";
  input.style.display = "none";
  track.append(hashes, fill, handle, label, display, input);
  wrapper.append(track);
  host.append(wrapper);
  let drag;
  let editing = false, hovered = false, editable = false;
  let timer;
  let hashSignature = "";
  let clickAnimations = [];
  const cancelClick = () => {
    clickAnimations.forEach((animation) => animation?.cancel());
    clickAnimations = [];
  };
  const range = () => ({ min: props.min ?? 0, max: props.max ?? 1, step: props.step ?? 0.01 });
  const formatted = () => {
    const { min, max, step } = range();
    return props.value.toFixed(decimalsForStep(step, min, max));
  };
  function render() {
    const { min, max, step } = range();
    setHint2(wrapper, props.hint);
    const pct = max > min ? Math.max(0, Math.min(100, (props.value - min) / (max - min) * 100)) : 0;
    fill.style.width = `${pct}%`;
    handle.style.left = `max(5px, calc(${pct}% - 9px))`;
    const active = hovered || !!drag;
    const width = wrapper.offsetWidth;
    const dodge = width > 0 && (pct < (18 + label.offsetWidth) / width * 100 || pct > (width - 20 - display.offsetWidth) / width * 100);
    handle.style.opacity = active ? String(dodge ? 0.1 : drag?.moved ? 0.9 : 0.5) : "0";
    handle.style.transform = `translateY(-50%) scale(${active ? 1 : 0.25}, ${active && dodge ? 0.75 : 1})`;
    handle.style.transition = "opacity 150ms, transform 200ms";
    track.classList.toggle("dialkit-slider-active", active);
    track.setAttribute("aria-label", props.label);
    track.setAttribute("aria-valuemin", String(min));
    track.setAttribute("aria-valuemax", String(max));
    track.setAttribute("aria-valuenow", String(props.value));
    track.setAttribute("aria-valuetext", `${formatted()}${props.unit ? ` ${props.unit}` : ""}`);
    label.textContent = props.label;
    appendShortcut(label, props.shortcut, props.shortcutActive);
    display.textContent = formatted();
    if (props.unit) {
      unit.textContent = props.unit;
      if (isWordUnit(props.unit)) unit.dataset.spaced = "true";
      else delete unit.dataset.spaced;
      display.append(unit);
    }
    input.setAttribute("aria-label", `${props.label} value`);
    const signature = `${min}:${max}:${step}`;
    if (signature !== hashSignature) {
      hashSignature = signature;
      hashes.replaceChildren();
      const count = (max - min) / step;
      for (let i = 1; i < (count <= 10 ? count : 10); i++) {
        const hash = element3("div", "dialkit-slider-hashmark");
        hash.style.left = `${count <= 10 ? i / count * 100 : i * 10}%`;
        hashes.append(hash);
      }
    }
  }
  const commit = (value) => {
    props = { ...props, value };
    render();
    props.onChange(value);
  };
  const springFrom = (from) => {
    const { min, max } = range();
    if (max <= min)
      return;
    const startPct = (from - min) / (max - min) * 100;
    const endPct = (props.value - min) / (max - min) * 100;
    cancelClick();
    clickAnimations = [
      animateSpring(fill, (p) => ({ width: `${startPct + (endPct - startPct) * p}%` }), 0.25),
      animateSpring(handle, (p) => ({ left: `max(5px, calc(${startPct + (endPct - startPct) * p}% - 9px))` }), 0.25)
    ];
  };
  const position = (x) => {
    const { min, max } = range();
    const rect = drag?.rect ?? wrapper.getBoundingClientRect();
    return min + Math.max(0, Math.min(1, (x - rect.left) / (rect.width || 1))) * (max - min);
  };
  function endDrag() {
    const id = drag?.id;
    drag = void 0;
    track.style.width = "";
    track.style.transform = "";
    if (id !== void 0 && track.hasPointerCapture(id))
      track.releasePointerCapture(id);
    render();
  }
  function edit() {
    endDrag();
    editing = true;
    input.value = formatted();
    input.style.display = "";
    display.style.display = "none";
    track.tabIndex = -1;
    input.focus();
    input.select();
  }
  function finishEdit(cancel = false) {
    if (!editing)
      return;
    editing = false;
    const value = input.value.trim() ? Number(input.value) : NaN;
    if (!cancel && Number.isFinite(value)) {
      const { min, max, step } = range();
      commit(roundValue(Math.max(min, Math.min(max, value)), step, min, max));
    }
    input.style.display = "none";
    display.style.display = "";
    track.tabIndex = 0;
    editable = false;
    display.classList.remove("dialkit-slider-value-editable");
  }
  track.addEventListener("keydown", (event) => {
    const { min, max, step } = range();
    handleSliderKey(event, props.value, min, max, step, commit, edit);
  });
  track.addEventListener("pointerdown", (event) => {
    if (editing || event.button !== 0)
      return;
    event.preventDefault();
    cancelClick();
    track.focus({ preventScroll: true });
    track.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, rect: wrapper.getBoundingClientRect(), moved: false };
    if (props.seekOnPress) {
      const { min, max, step } = range();
      commit(roundValue(position(event.clientX), step, min, max));
    }
    render();
  });
  track.addEventListener("pointermove", (event) => {
    if (!drag || drag.id !== event.pointerId)
      return;
    drag.moved || (drag.moved = Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 3);
    if (!drag.moved)
      return;
    const { min, max, step } = range();
    const overflow = event.clientX < drag.rect.left ? event.clientX - drag.rect.left : event.clientX > drag.rect.right ? event.clientX - drag.rect.right : 0;
    const stretch = Math.sign(overflow) * 8 * Math.sqrt(Math.min(Math.max(0, Math.abs(overflow) - 32) / 200, 1));
    track.style.width = `calc(100% + ${Math.abs(stretch)}px)`;
    track.style.transform = `translateX(${Math.min(0, stretch)}px)`;
    commit(roundValue(position(event.clientX), step, min, max));
  });
  track.addEventListener("pointerup", (event) => {
    if (!drag || drag.id !== event.pointerId)
      return;
    if (!drag.moved && !props.seekOnPress) {
      const { min, max, step } = range();
      const raw = position(event.clientX);
      const next = (max - min) / step <= 10 ? min + Math.round((raw - min) / step) * step : snapToDecile(raw, min, max);
      const from = props.value;
      commit(roundValue(next, step, min, max));
      springFrom(from);
    }
    endDrag();
  });
  track.addEventListener("pointercancel", endDrag);
  track.addEventListener("lostpointercapture", endDrag);
  track.addEventListener("mouseenter", () => {
    hovered = true;
    render();
  });
  track.addEventListener("mouseleave", () => {
    hovered = false;
    render();
  });
  display.addEventListener("mouseenter", () => {
    timer = setTimeout(() => {
      editable = true;
      display.classList.add("dialkit-slider-value-editable");
    }, 800);
  });
  display.addEventListener("mouseleave", () => {
    clearTimeout(timer);
    editable = false;
    display.classList.remove("dialkit-slider-value-editable");
  });
  display.addEventListener("pointerdown", (event) => {
    if (editable)
      event.stopPropagation();
  });
  display.addEventListener("click", (event) => {
    if (editable) {
      event.stopPropagation();
      edit();
    }
  });
  input.addEventListener("pointerdown", (event) => event.stopPropagation());
  input.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault();
      finishEdit(event.key === "Escape");
      track.focus({ preventScroll: true });
    }
  });
  input.addEventListener("blur", () => finishEdit());
  render();
  return {
    update(next) {
      const from = props.value;
      const isReset = (next.resetCount ?? 0) !== (props.resetCount ?? 0);
      props = next;
      render();
      if (isReset && from !== props.value && !drag)
        springFrom(from);
    },
    destroy() {
      clearTimeout(timer);
      cancelClick();
      endDrag();
      setHint2(wrapper, void 0);
      wrapper.remove();
    }
  };
}

// src/background-control.ts
var MODES2 = [{ value: "solid", label: "Solid" }, { value: "gradient", label: "Gradient" }, { value: "media", label: "Media" }];
var SHAPE_LABELS = { linear: "Linear", radial: "Radial", angular: "Angular", diamond: "Diamond" };
var FIT_LABELS = { fill: "Fill", fit: "Fit", stretch: "Stretch", tile: "Tile" };
var COLUMNS2 = ["left", "center", "right"];
var ROWS2 = ["top", "center", "bottom"];
var COLUMN_NAMES = ["Left", "Center", "Right"];
var ROW_NAMES = ["Top", "Middle", "Bottom"];
var ICON_FLIP = ["M7 7h13", "M16 3l4 4-4 4", "M17 17H4", "M8 13l-4 4 4 4"];
var ICON_ROTATE = ["M19.5 12a7.5 7.5 0 1 1-2.2-5.3", "M19.5 4.5v3.75h-3.75"];
var ICON_MINUS = "M5 12H19";
var ICON_GRIP = ["M12 5h.01", "M12 12h.01", "M12 19h.01"];
var ICON_UPLOAD = "M12 16V3m-4 4 4-4 4 4M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5";
var ICON_SOURCE = ["M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z", "M4 16l4.5-4.5 4 4 2.5-2.5L20 18", "M15 9.5h.01"];
var REMOVE_DISTANCE = 24;
var DRAG_THRESHOLD = 3;
var STRIP_HANDLES = { start: { x: 0.5, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0.5, y: 0 } };
var MAX_FILE_SIZE = 10 * 1024 * 1024;
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
  position: "Where the stop sits along the gradient, from 0 to 100%.",
  save: "Keeps this gradient in your list.",
  saved: "Click to use this gradient.",
  savedDelete: "Deletes this saved gradient.",
  drop: "Drop an image or a video here, or click to pick one.",
  preview: "Opens the options for how the media fills the background.",
  sizing: "How the media fills the background.",
  fit: {
    fill: "Covers the whole background. The media's edges may be cut off.",
    fit: "Shows all of the media inside the background.",
    stretch: "Fills the background and does not keep the media's shape.",
    tile: "Repeats the media across the background."
  },
  ratioSection: "The shape the media is cropped to.",
  ratio: (ratio) => ratio === "source" ? "Keeps the media's own shape." : `Crops the media to ${ratio}.`,
  tileSize: "How large each repeated tile is.",
  zoom: "Scales the media inside the background.",
  pin: "Which part of the media stays in view when it is cut off."
};
var hint = (part, text) => {
  part.dataset.hint = text;
};
function element4(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  if (el instanceof HTMLButtonElement) el.type = "button";
  return el;
}
function icon2(paths) {
  const svg2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg2.setAttribute("viewBox", "0 0 24 24");
  svg2.setAttribute("fill", "none");
  svg2.setAttribute("stroke", "currentColor");
  svg2.setAttribute("stroke-width", "2");
  svg2.setAttribute("stroke-linecap", "round");
  svg2.setAttribute("stroke-linejoin", "round");
  svg2.setAttribute("aria-hidden", "true");
  for (const d of typeof paths === "string" ? [paths] : paths) {
    const path = document.createElementNS(svg2.namespaceURI, "path");
    path.setAttribute("d", d);
    svg2.append(path);
  }
  return svg2;
}
function iconButton(className, label, paths) {
  const button = element4("button", `dialkit-background-icon-button ${className}`);
  button.setAttribute("aria-label", label);
  button.append(icon2(paths));
  return button;
}
function field(options) {
  return numberField({
    ...options,
    className: "dialkit-background-field",
    digits: decimalsForStep(options.step),
    limit: (n) => roundValue(n, options.step, options.min, options.max)
  });
}
var LAYOUT_SPRING = { visualDuration: 0.25, bounce: 0.1 };
var layoutSpring = (node, frame, bounce = LAYOUT_SPRING.bounce) => animateSpring(node, frame, LAYOUT_SPRING.visualDuration, bounce);
function revealRow(row) {
  let shown;
  let animation;
  row.style.overflow = "clip";
  const set = (show) => {
    if (show === shown) return;
    const first = shown === void 0;
    shown = show;
    if (first || !row.isConnected) {
      row.hidden = !show;
      return;
    }
    const from = row.hidden ? 0 : row.getBoundingClientRect().height;
    animation?.cancel();
    row.hidden = false;
    const full = row.offsetHeight;
    const to = show ? full : 0;
    const gap = Number.parseFloat(getComputedStyle(row.parentElement).rowGap) || 0;
    animation = layoutSpring(row, (p) => {
      const open = clamp2((from + (to - from) * p) / full, 0, 1);
      return { height: `${Math.max(0, from + (to - from) * p)}px`, opacity: String(open), marginBottom: `${-gap * (1 - open)}px` };
    });
    if (show) return;
    if (animation) animation.onfinish = () => {
      if (!shown) row.hidden = true;
    };
    else row.hidden = true;
  };
  return { set, cancel: () => animation?.cancel() };
}
function mountBackgroundControl(host, initial) {
  let props = initial;
  let value = normalizeBackgroundValue(props.value);
  let destroyed = false;
  const emit = (next) => {
    if (sameBackgroundValue(next, value)) {
      render();
      return;
    }
    value = next;
    render();
    props.onChange(value);
  };
  const setGradient = (gradient) => emit({ ...value, gradient });
  const root = element4("div", "dialkit-background");
  const hints = mountHints();
  const modes = segmentedControl("dialkit-background-modes", "Background type", MODES2, (mode) => emit({ ...value, mode }));
  modes.buttons.forEach((button, i) => hint(button, BG_HINTS.mode[MODES2[i].value]));
  root.append(modes.root);
  const solidPane = element4("div", "dialkit-background-pane");
  const solidHost = element4("div", "dialkit-color-host");
  solidPane.append(solidHost);
  const solidProps = () => ({ label: "Color", value: value.color, onChange: (color) => emit({ ...value, color }) });
  const solid = mountColorControl(solidHost, solidProps());
  const gradientPane = element4("div", "dialkit-background-pane");
  const shapeRow = element4("div", "dialkit-background-shape-row");
  const shapeTrigger = element4("button", "dialkit-select-trigger dialkit-background-shape-trigger");
  shapeTrigger.setAttribute("aria-label", "Gradient type");
  shapeTrigger.setAttribute("aria-haspopup", "listbox");
  shapeTrigger.setAttribute("aria-expanded", "false");
  const shapeValue = element4("span", "dialkit-select-value");
  const chevron = icon2(ICON_CHEVRON);
  chevron.classList.add("dialkit-select-chevron");
  shapeTrigger.append(shapeValue, chevron);
  const flipButton = iconButton("dialkit-background-flip", "Flip stops", ICON_FLIP);
  const rotateButton = iconButton("dialkit-background-rotate", "Rotate 90\xB0 clockwise", ICON_ROTATE);
  shapeRow.append(shapeTrigger, flipButton, rotateButton);
  hint(shapeTrigger, BG_HINTS.shapeTrigger);
  hint(flipButton, BG_HINTS.flip);
  hint(rotateButton, BG_HINTS.rotate);
  flipButton.addEventListener("click", () => commitEntries(entries().map(({ id, stop }) => ({ id, stop: { ...stop, at: Number((100 - stop.at).toFixed(2)) } }))));
  rotateButton.addEventListener("click", () => setGradient(rotateGradient(value.gradient)));
  let shapeMenu;
  let stopShapeMenu;
  const outsideShapeMenu = (event) => {
    if (!shapeMenu?.contains(event.target) && !shapeTrigger.contains(event.target)) closeShapeMenu();
  };
  function closeShapeMenu() {
    stopShapeMenu?.();
    stopShapeMenu = void 0;
    shapeMenu?.remove();
    shapeMenu = void 0;
    shapeTrigger.dataset.open = "false";
    shapeTrigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", outsideShapeMenu);
  }
  const openShapeMenu = () => {
    if (shapeMenu) return;
    const portal = getDialKitPortalRoot(host) ?? document.body;
    const menu = shapeMenu = element4("div", "dialkit-select-dropdown dialkit-background-shape-menu");
    menu.style.position = "fixed";
    for (const shape of GRADIENT_SHAPES) {
      const option = element4("button", "dialkit-select-option", SHAPE_LABELS[shape]);
      option.dataset.selected = String(shape === value.gradient.shape);
      hint(option, BG_HINTS.shape[shape]);
      option.addEventListener("click", () => {
        closeShapeMenu();
        setGradient(switchGradientShape(value.gradient, shape));
      });
      menu.append(option);
    }
    portal.append(menu);
    shapeTrigger.dataset.open = "true";
    shapeTrigger.setAttribute("aria-expanded", "true");
    const stopPosition = observeDropdownPosition(shapeTrigger, () => {
      if (!shapeTrigger.isConnected || !shapeTrigger.getClientRects().length) {
        closeShapeMenu();
        return;
      }
      const p = getDropdownPosition(shapeTrigger, portal, { fixed: true, dropdownHeight: menu.scrollHeight + 2 });
      Object.assign(menu.style, { top: `${p.top}px`, left: `${p.left}px`, width: `${p.width}px`, maxHeight: `${p.maxHeight}px` });
    }, () => shapeMenu);
    const stopKeyboard = observeDropdownKeyboard(shapeTrigger, () => shapeMenu, closeShapeMenu);
    stopShapeMenu = () => {
      stopPosition();
      stopKeyboard();
    };
    document.addEventListener("pointerdown", outsideShapeMenu);
  };
  shapeTrigger.addEventListener("click", () => {
    if (shapeMenu) closeShapeMenu();
    else openShapeMenu();
  });
  shapeTrigger.addEventListener("keydown", (event) => openDropdownOnKey(event, openShapeMenu));
  const bar = element4("div", "dialkit-background-bar");
  const track = element4("div", "dialkit-background-track");
  const paint = element4("div", "dialkit-background-track-paint");
  paint.setAttribute("aria-hidden", "true");
  track.append(paint);
  const handleLayer = element4("div", "dialkit-background-handles");
  bar.append(track, handleLayer);
  let canvas;
  hint(bar, BG_HINTS.bar);
  let painted = "";
  const paintTrack = () => {
    const { shape, stops } = value.gradient;
    if (shape === "linear") {
      canvas?.remove();
      canvas = void 0;
      painted = "";
      paint.style.backgroundImage = backgroundGradientCss(gradientStrip(stops));
      return;
    }
    paint.style.backgroundImage = "";
    const scale = Math.min(globalThis.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(track.clientWidth * scale));
    const height2 = Math.max(1, Math.round(track.clientHeight * scale));
    const key = JSON.stringify([width, height2, shape, stops]);
    if (canvas && key === painted) return;
    painted = key;
    canvas ?? (canvas = paint.appendChild(element4("canvas", "dialkit-background-track-canvas")));
    canvas.width = width;
    canvas.height = height2;
    paintGradient(canvas, { shape, handles: STRIP_HANDLES, stops });
  };
  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(paintTrack) : void 0;
  resize?.observe(track);
  const stopsHeader = element4("div", "dialkit-background-stops-header");
  const addButton = iconButton("dialkit-background-add", "Add stop", ICON_PLUS);
  stopsHeader.append(element4("span", "dialkit-background-stops-title", "Stops"), addButton);
  hint(addButton, BG_HINTS.add);
  const stopList = element4("div", "dialkit-background-stops");
  const saveButton = element4("button", "dialkit-background-save", "Save gradient");
  hint(saveButton, BG_HINTS.save);
  const savedList = element4("div", "dialkit-background-saved");
  savedList.setAttribute("role", "group");
  savedList.setAttribute("aria-label", "Saved gradients");
  gradientPane.append(shapeRow, bar, stopsHeader, stopList, saveButton, savedList);
  let nextId = 0;
  let ids = value.gradient.stops.map(() => ++nextId);
  let selectedId = ids[0];
  const reconcileIds = () => {
    const count = value.gradient.stops.length;
    if (ids.length > count) ids = ids.slice(0, count);
    while (ids.length < count) ids = [...ids, ++nextId];
    if (!ids.includes(selectedId)) selectedId = ids[0];
  };
  const entries = () => value.gradient.stops.map((stop, i) => ({ id: ids[i], stop }));
  const selectedIndex = () => Math.max(0, ids.indexOf(selectedId));
  const commitEntries = (list, select2 = selectedId) => {
    const sorted = list.map((entry, i) => ({ entry, i })).sort((a, b) => a.entry.stop.at - b.entry.stop.at || a.i - b.i).map(({ entry }) => entry);
    ids = sorted.map((entry) => entry.id);
    selectedId = ids.includes(select2) ? select2 : ids[0];
    setGradient({ ...value.gradient, stops: sorted.map((entry) => entry.stop) });
  };
  const updateStop = (id, patch) => {
    commitEntries(entries().map((entry) => entry.id === id ? { id, stop: { ...entry.stop, ...patch } } : entry));
  };
  const addStop = (at) => {
    if (value.gradient.stops.length >= MAX_GRADIENT_STOPS) return;
    const position = Number(clamp2(at, 0, 100).toFixed(2));
    const entry = { id: ++nextId, stop: { at: position, color: gradientColorAt(value.gradient.stops, position) } };
    commitEntries([...entries(), entry], entry.id);
  };
  const removeStop = (id) => {
    if (value.gradient.stops.length <= MIN_GRADIENT_STOPS) return;
    const list = entries();
    const index = list.findIndex((entry) => entry.id === id);
    const select2 = id === selectedId ? (list[index - 1] ?? list[index + 1]).id : selectedId;
    commitEntries(list.filter((entry) => entry.id !== id), select2);
  };
  const select = (id) => {
    if (id === selectedId) return;
    selectedId = id;
    renderSelection();
  };
  addButton.addEventListener("click", () => addStop(widestGapMiddle(value.gradient.stops)));
  let handles = [];
  let stems = [];
  let drag;
  const fractionAt = (clientX) => {
    const rect = handleLayer.getBoundingClientRect();
    return rect.width ? clamp2((clientX - rect.left) / rect.width, 0, 1) : 0;
  };
  const startDrag = (event, moved) => {
    try {
      bar.setPointerCapture(event.pointerId);
    } catch {
      return;
    }
    drag = { pointer: event.pointerId, id: selectedId, x: event.clientX, y: event.clientY, moved, off: false };
    bar.dataset.dragging = "true";
  };
  const endDrag = (event, release = false) => {
    if (!drag || event && event.pointerId !== drag.pointer) return;
    const { pointer, id, off } = drag;
    drag = void 0;
    delete bar.dataset.dragging;
    if (bar.hasPointerCapture(pointer)) bar.releasePointerCapture(pointer);
    if (release && off) removeStop(id);
    else render();
  };
  bar.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || drag) return;
    event.preventDefault();
    const handle = event.target.closest(".dialkit-background-handle");
    if (handle) {
      select(ids[handles.indexOf(handle)]);
      handle.focus({ preventScroll: true });
      startDrag(event, false);
      return;
    }
    if (value.gradient.stops.length >= MAX_GRADIENT_STOPS) return;
    addStop(Math.round(fractionAt(event.clientX) * 100));
    handles[selectedIndex()]?.focus({ preventScroll: true });
    startDrag(event, true);
  });
  bar.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointer) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const rect = bar.getBoundingClientRect();
    drag.off = Math.max(rect.top - event.clientY, event.clientY - rect.bottom) > REMOVE_DISTANCE && value.gradient.stops.length > MIN_GRADIENT_STOPS;
    updateStop(drag.id, { at: Math.round(fractionAt(event.clientX) * 100) });
    handles[selectedIndex()]?.focus({ preventScroll: true });
  });
  bar.addEventListener("pointerup", (event) => endDrag(event, true));
  bar.addEventListener("pointercancel", (event) => endDrag(event));
  bar.addEventListener("lostpointercapture", (event) => endDrag(event));
  bar.addEventListener("dblclick", (event) => {
    const handle = document.elementsFromPoint(event.clientX, event.clientY).find((el) => el.classList.contains("dialkit-background-handle"));
    const row = handle ? rows.get(ids[handles.indexOf(handle)]) : void 0;
    row?.root.querySelector(".dialkit-color-control:not([data-open]) .dialkit-color-swatch")?.click();
  });
  const buildHandles = () => {
    stems = value.gradient.stops.map(() => {
      const stem = element4("span", "dialkit-background-stem");
      stem.setAttribute("aria-hidden", "true");
      return stem;
    });
    handles = value.gradient.stops.map(() => {
      const handle = element4("button", "dialkit-background-handle");
      handle.setAttribute("role", "slider");
      handle.setAttribute("aria-valuemin", "0");
      handle.setAttribute("aria-valuemax", "100");
      handle.append(element4("span", "dialkit-background-handle-chip"));
      hint(handle, BG_HINTS.handle);
      handle.addEventListener("focus", () => select(ids[handles.indexOf(handle)]));
      handle.addEventListener("keydown", (event) => {
        if (event.altKey || event.metaKey || event.ctrlKey) return;
        const id = ids[handles.indexOf(handle)];
        const at = value.gradient.stops[handles.indexOf(handle)]?.at ?? 0;
        const step = event.shiftKey ? 10 : 1;
        const next = event.key === "ArrowLeft" || event.key === "ArrowDown" ? at - step : event.key === "ArrowRight" || event.key === "ArrowUp" ? at + step : event.key === "Home" ? 0 : event.key === "End" ? 100 : void 0;
        const remove = (event.key === "Delete" || event.key === "Backspace") && value.gradient.stops.length > MIN_GRADIENT_STOPS;
        if (next === void 0 && !remove) return;
        event.preventDefault();
        event.stopPropagation();
        if (remove) removeStop(id);
        else updateStop(id, { at: clamp2(Math.round(next), 0, 100) });
        handles[selectedIndex()]?.focus({ preventScroll: true });
      });
      return handle;
    });
    handleLayer.replaceChildren(...stems, ...handles);
  };
  const rows = /* @__PURE__ */ new Map();
  const leaving = /* @__PURE__ */ new Map();
  const slides = /* @__PURE__ */ new Map();
  let scrubbing;
  let rowDrag;
  const buildRow = (id) => {
    const index = () => ids.indexOf(id);
    const stop = () => value.gradient.stops[index()];
    const rowRoot = element4("div", "dialkit-background-stop");
    rowRoot.addEventListener("pointerdown", () => select(id));
    rowRoot.addEventListener("focusin", () => select(id));
    const grip = iconButton("dialkit-background-stop-grip", `Reorder stop ${index() + 1}`, ICON_GRIP);
    grip.setAttribute("aria-keyshortcuts", "Alt+ArrowUp Alt+ArrowDown");
    grip.firstElementChild.setAttribute("viewBox", "9 0 6 24");
    grip.firstElementChild.setAttribute("stroke-width", "3");
    hint(grip, BG_HINTS.grip);
    const position = field({
      unit: "%",
      label: `Stop ${index() + 1} position`,
      min: 0,
      max: 100,
      step: 1,
      read: () => stop()?.at ?? 0,
      write: (at) => updateStop(id, { at }),
      onScrub: (active) => {
        scrubbing = active ? id : void 0;
      }
    });
    position.root.classList.add("dialkit-background-stop-position");
    hint(position.root, BG_HINTS.position);
    const colorHost = element4("div", "dialkit-color-host dialkit-background-stop-color");
    const color = mountColorControl(colorHost, { label: `Stop ${index() + 1}`, value: stop().color, onChange: (next) => updateStop(id, { color: next }) });
    const opacity = field({
      unit: "%",
      label: `Stop ${index() + 1} opacity`,
      min: 0,
      max: 100,
      step: 1,
      read: () => stop() ? colorOpacity(stop().color) : 100,
      write: (n) => updateStop(id, { color: withOpacity(stop().color, n) })
    });
    opacity.root.classList.add("dialkit-background-stop-opacity");
    const remove = iconButton("dialkit-background-stop-remove", "Remove stop", ICON_MINUS);
    remove.addEventListener("click", () => {
      removeStop(id);
      const next = rows.get(selectedId);
      (next?.remove.disabled ? next.grip : next?.remove)?.focus({ preventScroll: true });
    });
    rowRoot.append(grip, position.root, colorHost, opacity.root, remove);
    const row = { id, root: rowRoot, grip, position, color, opacity, remove };
    bindRowDrag(row);
    return row;
  };
  const reorder = (base, from, to) => {
    const moved = base.map((entry) => entry.id);
    moved.splice(to, 0, ...moved.splice(from, 1));
    ids = moved;
    setGradient({ ...value.gradient, stops: moveStopColor(base.map((entry) => entry.stop), from, to) });
  };
  const paintRowDrag = () => {
    if (!rowDrag) return;
    const { id, from, to, offset, step, base } = rowDrag;
    base.forEach((entry, k) => {
      const shift = entry.id === id ? offset : from < to && k > from && k <= to ? -step : to < from && k >= to && k < from ? step : 0;
      const row = rows.get(entry.id);
      if (row) row.root.style.transform = shift ? `translateY(${shift}px)` : "";
    });
  };
  const finishRowDrag = () => {
    if (!rowDrag) return;
    rowDrag = void 0;
    delete stopList.dataset.dragging;
    render();
    rows.forEach((row) => {
      row.root.style.transform = "";
      delete row.root.dataset.dragging;
    });
  };
  function bindRowDrag(row) {
    row.grip.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || rowDrag) return;
      event.preventDefault();
      rowDrag = { id: row.id, pointer: event.pointerId, y: event.clientY, lifted: false, from: ids.indexOf(row.id), to: ids.indexOf(row.id), offset: 0, step: 0, base: entries() };
      row.grip.setPointerCapture(event.pointerId);
    });
    row.grip.addEventListener("pointermove", (event) => {
      if (!rowDrag || rowDrag.id !== row.id || rowDrag.pointer !== event.pointerId) return;
      const dy = event.clientY - rowDrag.y;
      if (!rowDrag.lifted) {
        if (Math.abs(dy) <= DRAG_THRESHOLD) return;
        rowDrag.lifted = true;
        rowDrag.base.forEach((entry) => stopSlide(rows.get(entry.id).root));
        const [first, second] = rowDrag.base.map((entry) => rows.get(entry.id).root.getBoundingClientRect());
        rowDrag.step = second ? second.top - first.top : first.height;
        stopList.dataset.dragging = "true";
        row.root.dataset.dragging = "true";
      }
      const count = rowDrag.base.length;
      rowDrag.offset = clamp2(dy, -rowDrag.from * rowDrag.step, (count - 1 - rowDrag.from) * rowDrag.step);
      const to = clamp2(Math.round(rowDrag.from + rowDrag.offset / rowDrag.step), 0, count - 1);
      if (to !== rowDrag.to) {
        rowDrag.to = to;
        reorder(rowDrag.base, rowDrag.from, to);
      }
      paintRowDrag();
    });
    const release = (event) => {
      if (rowDrag?.id === row.id && rowDrag.pointer === event.pointerId) finishRowDrag();
    };
    row.grip.addEventListener("pointerup", release);
    row.grip.addEventListener("pointercancel", release);
    row.grip.addEventListener("lostpointercapture", release);
    row.grip.addEventListener("keydown", (event) => {
      if (!event.altKey || event.metaKey || event.ctrlKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      const from = ids.indexOf(row.id);
      const to = from + (event.key === "ArrowUp" ? -1 : 1);
      if (to < 0 || to >= ids.length) return;
      reorder(entries(), from, to);
      row.grip.focus({ preventScroll: true });
    });
  }
  const placeRows = () => {
    const list = ids.map((id) => rows.get(id));
    const active = document.activeElement;
    const held = list.find((row) => row.id === scrubbing) ?? list.find((row) => row.root.contains(active)) ?? list[0];
    if (!held.root.parentNode) stopList.append(held.root);
    const at = list.indexOf(held);
    for (let i = at - 1, next = held.root; i >= 0; next = list[i--].root) {
      if (list[i].root.nextElementSibling !== next) stopList.insertBefore(list[i].root, next);
    }
    for (let i = at + 1, previous = held.root; i < list.length; previous = list[i++].root) {
      if (previous.nextElementSibling !== list[i].root) previous.after(list[i].root);
    }
  };
  const dropRow = (row) => {
    leaving.delete(row);
    slides.delete(row.root);
    row.color.destroy();
    row.root.remove();
  };
  const syncRows = (before) => {
    for (const [id, row] of rows) {
      if (ids.includes(id)) continue;
      rows.delete(id);
      const top = before?.tops.get(row.root);
      stopSlide(row.root);
      if (top === void 0) {
        dropRow(row);
        continue;
      }
      row.color.close();
      row.root.inert = true;
      row.root.setAttribute("aria-hidden", "true");
      row.root.dataset.leaving = "true";
      row.root.style.top = `${top}px`;
      stopList.append(row.root);
      const fade = layoutSpring(row.root, (p) => ({ opacity: String(clamp2(1 - p, 0, 1)), transform: `scale(${1 - 0.04 * clamp2(p, 0, 1)})` }));
      if (!fade) {
        dropRow(row);
        continue;
      }
      leaving.set(row, fade);
      fade.onfinish = () => dropRow(row);
    }
    const entering = [];
    for (const id of ids) {
      if (rows.has(id)) continue;
      const row = buildRow(id);
      rows.set(id, row);
      entering.push(row);
    }
    if (!rowDrag) placeRows();
    return entering;
  };
  const renderSelection = () => {
    const index = selectedIndex();
    handles.forEach((handle, i) => {
      handle.toggleAttribute("data-selected", i === index);
      handle.style.zIndex = i === index ? "2" : "1";
    });
    stems.forEach((stem, i) => stem.toggleAttribute("data-selected", i === index));
    rows.forEach((row) => row.root.toggleAttribute("data-selected", row.id === selectedId));
  };
  let savedSignature = "";
  const renderSaved = () => {
    const saved = DialStore2.getSavedGradients(props.panelId);
    const signature = JSON.stringify(saved);
    if (signature !== savedSignature) {
      savedSignature = signature;
      savedList.replaceChildren(...saved.map(({ id, gradient }, i) => {
        const item = element4("div", "dialkit-background-saved-item");
        const swatch = element4("button", "dialkit-background-saved-swatch");
        swatch.setAttribute("aria-label", `Use saved gradient ${i + 1}`);
        swatch.style.setProperty("--dial-gradient", backgroundGradientCss(gradient));
        swatch.addEventListener("click", () => emit({ ...value, mode: "gradient", gradient: cloneGradient(gradient) }));
        hint(swatch, BG_HINTS.saved);
        const remove = iconButton("dialkit-background-saved-delete", `Delete saved gradient ${i + 1}`, ICON_CLOSE);
        hint(remove, BG_HINTS.savedDelete);
        remove.addEventListener("click", () => DialStore2.deleteGradient(props.panelId, id));
        item.append(swatch, remove);
        return item;
      }));
    }
    savedList.hidden = saved.length === 0;
    saved.forEach(({ gradient }, i) => savedList.children[i]?.firstElementChild?.setAttribute("aria-pressed", String(sameGradient(gradient, value.gradient))));
  };
  saveButton.addEventListener("click", () => DialStore2.saveGradient(props.panelId, value.gradient));
  const onStore = () => {
    if (JSON.stringify(DialStore2.getSavedGradients(props.panelId)) !== savedSignature) render();
  };
  let unsubscribe = DialStore2.subscribe(props.panelId, onStore);
  const mediaPane = element4("div", "dialkit-background-pane dialkit-background-media");
  const fileInput = element4("input", "dialkit-background-file");
  fileInput.type = "file";
  fileInput.accept = "image/*,video/*";
  fileInput.hidden = true;
  const drop = element4("button", "dialkit-background-drop");
  const dropText = element4("span", "");
  drop.append(icon2(ICON_UPLOAD), dropText);
  hint(drop, BG_HINTS.drop);
  const preview = element4("button", "dialkit-background-media-preview");
  preview.setAttribute("aria-label", "Media options");
  preview.setAttribute("aria-haspopup", "dialog");
  preview.setAttribute("aria-expanded", "false");
  const frame = element4("span", "dialkit-background-media-frame");
  hint(preview, BG_HINTS.preview);
  const badge = element4("span", "dialkit-background-media-badge");
  badge.setAttribute("aria-hidden", "true");
  preview.append(frame, badge);
  const actions = element4("div", "dialkit-background-media-actions");
  const replaceButton = element4("button", "dialkit-button", "Replace");
  const removeButton = element4("button", "dialkit-button", "Remove");
  actions.append(replaceButton, removeButton);
  const status = element4("div", "dialkit-background-status");
  status.setAttribute("role", "status");
  mediaPane.append(drop, preview, actions, status, fileInput);
  let loading = false;
  let request = 0;
  let shownMedia = "";
  const setStatus = (text) => {
    status.textContent = text;
    status.hidden = !text;
  };
  const readFile = (file) => new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error("Choose a file smaller than 10 MB."));
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error()));
    reader.addEventListener("error", () => reject(new Error()));
    reader.readAsDataURL(file);
  });
  const acceptFile = async (file) => {
    if (!file || loading) return;
    const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : void 0;
    if (!kind) {
      setStatus("Choose an image or a video file.");
      return;
    }
    const current = ++request;
    loading = true;
    setStatus("");
    render();
    try {
      const src = await (props.upload ?? readFile)(file);
      if (current !== request) return;
      loading = false;
      emit({ ...value, media: { src, kind } });
    } catch (error) {
      if (current !== request) return;
      setStatus(error instanceof Error && error.message ? error.message : "This file could not be opened. Try another one.");
    } finally {
      if (current === request && !destroyed) {
        loading = false;
        render();
      }
    }
  };
  const chooseFile = () => {
    if (!loading) fileInput.click();
  };
  drop.addEventListener("click", chooseFile);
  replaceButton.addEventListener("click", chooseFile);
  removeButton.addEventListener("click", () => {
    closeOptions();
    emit({ ...value, media: null });
    drop.focus({ preventScroll: true });
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    void acceptFile(file);
  });
  mediaPane.addEventListener("dragover", (event) => {
    if (!event.dataTransfer?.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    mediaPane.dataset.dragging = "true";
  });
  mediaPane.addEventListener("dragleave", (event) => {
    if (!mediaPane.contains(event.relatedTarget)) delete mediaPane.dataset.dragging;
  });
  mediaPane.addEventListener("drop", (event) => {
    event.preventDefault();
    delete mediaPane.dataset.dragging;
    void acceptFile(event.dataTransfer?.files[0]);
  });
  let mediaElement;
  let sourceRatio;
  const renderMedia = () => {
    const media = value.media;
    const key = media ? `${media.kind}:${media.src}` : "";
    if (key !== shownMedia) {
      shownMedia = key;
      sourceRatio = void 0;
      mediaElement?.remove();
      mediaElement = void 0;
      const measured = (width2, height3) => {
        if (shownMedia !== key || !width2 || !height3) return;
        sourceRatio = width2 / height3;
        renderMedia();
      };
      if (media?.kind === "video") {
        const video = mediaElement = element4("video", "dialkit-background-media-element");
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.autoplay = true;
        video.addEventListener("loadedmetadata", () => measured(video.videoWidth, video.videoHeight));
        video.src = media.src;
      } else if (media) {
        mediaElement = element4("span", "dialkit-background-media-element");
        const image = new Image();
        image.addEventListener("load", () => measured(image.naturalWidth, image.naturalHeight));
        image.src = media.src;
      }
      if (mediaElement) frame.append(mediaElement);
    }
    if (!media || !mediaElement) return;
    const { ratio } = value.mediaDisplay;
    const [w, h] = ratio === "source" ? [sourceRatio ?? 16 / 9, 1] : ratio.split(":").map(Number);
    const box = preview.clientWidth / preview.clientHeight || 16 / 9;
    const width = Math.min(1, w / h / box) * 100;
    const height2 = Math.min(1, box / (w / h)) * 100;
    Object.assign(frame.style, { width: `${width}%`, height: `${height2}%`, left: `${(100 - width) / 2}%`, top: `${(100 - height2) / 2}%` });
    mediaElement.removeAttribute("style");
    for (const [property, css] of Object.entries(backgroundMediaCss(media, value.mediaDisplay))) mediaElement.style.setProperty(property, css);
  };
  const setDisplay = (patch) => emit({ ...value, mediaDisplay: { ...value.mediaDisplay, ...patch } });
  let popup;
  let stopOptions;
  let syncOptions = () => {
  };
  const outside = (event) => {
    if (!popup?.contains(event.target) && !preview.contains(event.target)) closeOptions();
  };
  function closeOptions(restoreFocus = false) {
    stopOptions?.();
    stopOptions = void 0;
    popup?.remove();
    popup = void 0;
    syncOptions = () => {
    };
    delete preview.dataset.open;
    preview.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", outside);
    document.removeEventListener("focusin", outside);
    if (restoreFocus) preview.focus({ preventScroll: true });
  }
  const openOptions = (event) => {
    if (popup) {
      closeOptions();
      return;
    }
    const portal = getDialKitPortalRoot(host) ?? host;
    const shell = popup = element4("div", "dialkit-background-popover");
    shell.style.position = "fixed";
    shell.tabIndex = -1;
    shell.setAttribute("role", "dialog");
    shell.setAttribute("aria-label", `${props.label} media options`);
    const section = (title, control) => {
      const wrap = element4("div", "dialkit-background-popover-section");
      wrap.append(element4("div", "dialkit-background-popover-label", title), control);
      shell.append(wrap);
      return wrap;
    };
    const fits = segmentedControl("dialkit-background-fits", "Sizing", MEDIA_FITS.map((fit) => ({ value: fit, label: FIT_LABELS[fit] })), (fit) => setDisplay({ fit }));
    fits.buttons.forEach((button, i) => hint(button, BG_HINTS.fit[MEDIA_FITS[i]]));
    hint(section("Sizing", fits.root), BG_HINTS.sizing);
    const tileSizeWrap = element4("div", "dialkit-background-tile-size");
    const tileSizeProps = () => ({
      label: "Tile Size",
      unit: "%",
      min: Math.round(MEDIA_TILE_SIZE.min * 100),
      max: Math.round(MEDIA_TILE_SIZE.max * 100),
      step: Math.round(MEDIA_TILE_SIZE.step * 100),
      value: Math.round(value.mediaDisplay.tileSize * 100),
      seekOnPress: true,
      hint: BG_HINTS.tileSize,
      onChange: (size) => setDisplay({ tileSize: size / 100 })
    });
    const tileSize = mountSlider(tileSizeWrap, tileSizeProps());
    shell.append(tileSizeWrap);
    const tileSizeRow = revealRow(tileSizeWrap);
    const ratios = segmentedControl("dialkit-background-ratios", "Ratio", MEDIA_RATIOS.map((ratio) => ratio === "source" ? { value: ratio, label: "Source", icon: icon2(ICON_SOURCE) } : { value: ratio, label: ratio }), (ratio) => setDisplay({ ratio }));
    ratios.buttons.forEach((button, i) => hint(button, BG_HINTS.ratio(MEDIA_RATIOS[i])));
    hint(section("Ratio", ratios.root), BG_HINTS.ratioSection);
    const zoomProps = () => ({ label: "Zoom", unit: "\xD7", ...MEDIA_ZOOM, value: value.mediaDisplay.zoom, seekOnPress: true, hint: BG_HINTS.zoom, onChange: (zoom2) => setDisplay({ zoom: zoom2 }) });
    const zoom = mountSlider(shell, zoomProps());
    const grid = element4("div", "dialkit-background-position");
    grid.setAttribute("role", "radiogroup");
    grid.setAttribute("aria-label", "Pin");
    const pill = element4("span", "dialkit-background-position-pill");
    pill.setAttribute("aria-hidden", "true");
    grid.append(pill);
    const cells = ROWS2.flatMap((y, row) => COLUMNS2.map((x, column) => {
      const cell = element4("button", "dialkit-background-position-cell");
      cell.setAttribute("role", "radio");
      cell.setAttribute("aria-label", `${ROW_NAMES[row]}, ${COLUMN_NAMES[column]}`);
      cell.append(element4("span", "dialkit-background-position-dot"));
      cell.addEventListener("click", () => setDisplay({ position: { x, y } }));
      grid.append(cell);
      return cell;
    }));
    grid.addEventListener("keydown", (event2) => {
      const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event2.key];
      if (!move || event2.altKey || event2.metaKey || event2.ctrlKey) return;
      event2.preventDefault();
      event2.stopPropagation();
      const { x, y } = value.mediaDisplay.position;
      const column = clamp2(COLUMNS2.indexOf(x) + move[0], 0, 2);
      const row = clamp2(ROWS2.indexOf(y) + move[1], 0, 2);
      setDisplay({ position: { x: COLUMNS2[column], y: ROWS2[row] } });
      cells[row * 3 + column].focus({ preventScroll: true });
    });
    hint(section("Pin", grid), BG_HINTS.pin);
    syncOptions = () => {
      const display = value.mediaDisplay;
      fits.set(display.fit);
      tileSizeRow.set(display.fit === "tile");
      tileSize.update(tileSizeProps());
      ratios.set(display.ratio);
      zoom.update(zoomProps());
      const picked = ROWS2.indexOf(display.position.y) * 3 + COLUMNS2.indexOf(display.position.x);
      pill.style.transform = `translate(${picked % 3 * 100}%, ${Math.floor(picked / 3) * 100}%)`;
      cells.forEach((cell, i) => {
        cell.setAttribute("aria-checked", String(i === picked));
        cell.tabIndex = i === picked ? 0 : -1;
      });
    };
    shell.addEventListener("keydown", (event2) => {
      if (event2.key === "Escape") {
        event2.preventDefault();
        event2.stopPropagation();
        closeOptions(true);
        return;
      }
      if (event2.key === "Tab") {
        const stops = Array.from(shell.querySelectorAll('button, input, [tabindex="0"]')).filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0);
        if (event2.shiftKey && document.activeElement === stops[0] || !event2.shiftKey && document.activeElement === stops[stops.length - 1]) {
          event2.preventDefault();
          closeOptions(true);
          return;
        }
      }
      if (!isHintKey3(event2)) event2.stopPropagation();
    });
    portal.append(shell);
    syncOptions();
    const stopPosition = observeDropdownPosition(preview, () => {
      if (!popup) return;
      if (!host.isConnected || !preview.getClientRects().length) {
        closeOptions();
        return;
      }
      const scale = preview.getBoundingClientRect().width / preview.offsetWidth || 1;
      const p = getDropdownPosition(preview, portal, { dropdownHeight: popup.scrollHeight + 2, width: 280, maxHeight: 480, preferSide: true, fixed: true, gap: 8, scale });
      Object.assign(popup.style, { width: `${p.width / scale}px`, maxHeight: `${p.maxHeight / scale}px`, scale: scale === 1 ? "" : String(scale), transformOrigin: p.above ? "bottom" : "top" });
      const width = popup.offsetWidth;
      const height2 = popup.offsetHeight;
      Object.assign(popup.style, { left: `${p.left - width * (1 - scale) / 2}px`, top: `${p.top - (p.above ? height2 * (1 - scale) : 0)}px` });
    }, () => popup);
    stopOptions = () => {
      stopPosition();
      tileSizeRow.cancel();
      tileSize.destroy();
      zoom.destroy();
      fits.disconnect();
      ratios.disconnect();
    };
    preview.dataset.open = "true";
    preview.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    if (event.detail > 0) shell.focus({ preventScroll: true });
    else shell.querySelector('.dialkit-background-fits [data-active="true"]')?.focus({ preventScroll: true });
  };
  preview.addEventListener("click", openOptions);
  root.append(solidPane, gradientPane, mediaPane);
  host.append(root);
  const panes = { solid: solidPane, gradient: gradientPane, media: mediaPane };
  let shownMode;
  let height;
  let paneFade;
  const blocks = () => [...Object.values(panes).flatMap((pane) => [...pane.children]).filter((el) => el !== stopList), ...[...rows.values()].map((row) => row.root)];
  const topIn = (el) => {
    let top = 0;
    let node = el;
    while (node instanceof HTMLElement && node !== root) {
      top += node.offsetTop;
      node = node.offsetParent;
    }
    return top;
  };
  const measure = () => {
    if (!shownMode || !root.getClientRects().length) return;
    const tops = /* @__PURE__ */ new Map();
    for (const el of blocks()) if (el.getClientRects().length) tops.set(el, topIn(el));
    return { height: root.offsetHeight, mode: shownMode, tops };
  };
  function stopSlide(el) {
    slides.get(el)?.animation.cancel();
    slides.delete(el);
  }
  const slide = (el, from) => {
    const to = topIn(el);
    const running = slides.get(el);
    if (running?.to === to && running.animation.playState === "running") return;
    stopSlide(el);
    const offset = from - to;
    if (Math.abs(offset) < 0.5) return;
    const animation = layoutSpring(el, (p) => ({ transform: `translateY(${offset * (1 - p)}px)` }));
    if (!animation) return;
    slides.set(el, { animation, to });
    if (!el.classList.contains("dialkit-background-stop")) return;
    el.dataset.moving = "true";
    const settle = () => {
      const now = slides.get(el)?.animation;
      if (!now || now === animation || now.playState !== "running") delete el.dataset.moving;
    };
    animation.addEventListener("finish", settle);
    animation.addEventListener("cancel", settle);
  };
  const springHeight = (from) => {
    const pane = panes[value.mode];
    const to = pane.offsetTop + pane.offsetHeight;
    if (height?.to === to && height.animation.playState === "running") return;
    height?.animation.cancel();
    height = void 0;
    delete root.dataset.resizing;
    if (Math.abs(from - to) < 0.5) return;
    const animation = layoutSpring(root, (p) => ({ height: `${from + (to - from) * p}px` }));
    if (!animation) return;
    root.dataset.resizing = "true";
    height = { animation, to };
    animation.onfinish = () => {
      if (height?.animation !== animation) return;
      height = void 0;
      delete root.dataset.resizing;
    };
  };
  const animateLayout = (before, entering) => {
    if (value.mode !== before.mode) {
      paneFade?.cancel();
      paneFade = layoutSpring(panes[value.mode], (p) => ({ opacity: String(clamp2(p, 0, 1)) }), 0);
    } else {
      if (!rowDrag) for (const el of blocks()) {
        const from = before.tops.get(el);
        if (from !== void 0 && el.getClientRects().length) slide(el, from);
      }
      for (const row of entering) {
        const animation = layoutSpring(row.root, (p) => ({ opacity: String(clamp2(p, 0, 1)), transform: `scale(${0.96 + 0.04 * clamp2(p, 0, 1)})` }));
        if (animation) slides.set(row.root, { animation, to: topIn(row.root) });
      }
    }
    springHeight(before.height);
  };
  function render() {
    if (destroyed) return;
    const before = measure();
    modes.root.setAttribute("aria-label", `${props.label} type`);
    modes.set(value.mode);
    solidPane.hidden = value.mode !== "solid";
    gradientPane.hidden = value.mode !== "gradient";
    mediaPane.hidden = value.mode !== "media";
    if (value.mode !== "gradient") closeShapeMenu();
    if (value.mode !== "media" || !value.media) closeOptions();
    solid.update(solidProps());
    const stops = value.gradient.stops;
    reconcileIds();
    shapeValue.textContent = SHAPE_LABELS[value.gradient.shape];
    shapeMenu?.querySelectorAll(".dialkit-select-option").forEach((option, i) => {
      option.dataset.selected = String(GRADIENT_SHAPES[i] === value.gradient.shape);
    });
    if (!gradientPane.hidden) paintTrack();
    if (handles.length !== stops.length) buildHandles();
    handles.forEach((handle, i) => {
      const stop = stops[i];
      handle.style.setProperty("--dial-stop-at", `${stop.at}%`);
      handle.style.setProperty("--dial-color", stop.color);
      stems[i].style.setProperty("--dial-stop-at", `${stop.at}%`);
      handle.setAttribute("aria-label", `Stop ${i + 1}`);
      handle.setAttribute("aria-valuenow", String(stop.at));
      handle.setAttribute("aria-valuetext", `${stop.at}%, ${stop.color}`);
      handle.toggleAttribute("data-off", drag?.off === true && ids[i] === drag.id);
    });
    bar.toggleAttribute("data-full", stops.length >= MAX_GRADIENT_STOPS);
    const entering = syncRows(before);
    ids.forEach((id, i) => {
      const row = rows.get(id);
      row.position.input.setAttribute("aria-label", `Stop ${i + 1} position`);
      row.position.sync();
      row.grip.setAttribute("aria-label", `Reorder stop ${i + 1}`);
      row.color.update({ label: `Stop ${i + 1}`, value: stops[i].color, onChange: (next) => updateStop(id, { color: next }) });
      row.opacity.input.setAttribute("aria-label", `Stop ${i + 1} opacity`);
      row.opacity.sync();
      row.remove.disabled = stops.length <= MIN_GRADIENT_STOPS;
      row.remove.setAttribute("aria-label", `Remove stop ${i + 1}`);
    });
    renderSelection();
    addButton.disabled = stops.length >= MAX_GRADIENT_STOPS;
    renderSaved();
    const media = value.media;
    drop.hidden = !!media;
    drop.disabled = loading;
    dropText.textContent = loading ? "Loading\u2026" : "Upload or drop an image or a video";
    preview.hidden = actions.hidden = !media;
    replaceButton.disabled = removeButton.disabled = loading;
    renderMedia();
    const display = value.mediaDisplay;
    const fit = display.fit === "tile" ? `Tile ${Math.round(display.tileSize * 100)}%` : FIT_LABELS[display.fit];
    badge.textContent = `${fit} \xB7 ${display.ratio === "source" ? "Source" : display.ratio} \xB7 ${display.zoom}\xD7`;
    if (!status.textContent) status.hidden = true;
    syncOptions();
    if (before) animateLayout(before, entering);
    shownMode = value.mode;
  }
  render();
  return {
    update(next) {
      if (next.panelId !== props.panelId) {
        unsubscribe();
        unsubscribe = DialStore2.subscribe(next.panelId, onStore);
      }
      props = next;
      const incoming = normalizeBackgroundValue(next.value);
      if (!sameBackgroundValue(incoming, value)) {
        endDrag();
        finishRowDrag();
        value = incoming;
      }
      render();
    },
    destroy() {
      destroyed = true;
      request++;
      unsubscribe();
      resize?.disconnect();
      endDrag();
      closeShapeMenu();
      closeOptions();
      modes.disconnect();
      slides.forEach(({ animation }) => animation.cancel());
      height?.animation.cancel();
      paneFade?.cancel();
      solid.destroy();
      rows.forEach((row) => row.color.destroy());
      leaving.forEach((fade, row) => {
        fade.cancel();
        dropRow(row);
      });
      hints.destroy();
      root.remove();
    }
  };
}
export {
  mountBackgroundControl
};
//# sourceMappingURL=background-control.js.map