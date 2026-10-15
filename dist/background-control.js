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
  const h = (Math.abs(d.x) + Math.abs(d.y)) / 2;
  return {
    start: roundPoint({ x: 0.5 - d.x * h, y: 0.5 - d.y * h }),
    end: roundPoint({ x: 0.5 + d.x * h, y: 0.5 + d.y * h }),
    width: roundPoint({ x: 0.5 - d.y * h, y: 0.5 + d.x * h })
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
  return roundPoint({ x: clamp(x, -10, 11), y: clamp(y, -10, 11) });
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
var clamp = (n, min, max) => Math.min(max, Math.max(min, n));
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
  return { at: round2(clamp(value.at, 0, 100)), color, alpha: round2(clamp(alpha, 0, 100)) };
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

// src/color.ts
var fieldSpace = (format) => format === "hsl" ? "hsl" : format === "oklch" ? "oklch" : "hsv";
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
    const { h, s, l } = colorToHsl(color);
    return `hsl(${round(h, 1)} ${round(s * 100, 1)}% ${round(l * 100, 1)}%${alpha})`;
  }
  const bytes = colorToRgb255(color);
  if (format === "rgb") return `rgb(${bytes.join(" ")}${alpha})`;
  if (color.a < 1) bytes.push(Math.round(color.a * 255));
  return "#" + bytes.map((n) => n.toString(16).padStart(2, "0")).join("");
}
function colorToRgb255(color) {
  return colorToRgb(fitGamut(color)).map((n) => Math.round(clamp2(n) * 255));
}
function rgb255ToColor(r, g, b, a = 1) {
  return rgbToColor([clamp2(r / 255), clamp2(g / 255), clamp2(b / 255)], a);
}
function colorToHexSix(color) {
  return ("#" + colorToRgb255(color).map((n) => n.toString(16).padStart(2, "0")).join("")).toUpperCase();
}
function colorToHsv(color, fallbackHue = 0) {
  const [r, g, b] = colorToRgb(fitGamut(color)).map((n) => clamp2(n));
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const grey = d < 1e-6;
  return { h: grey ? fallbackHue : rgbHue(r, g, b, max, d), s: grey || max === 0 ? 0 : d / max, v: max };
}
function hsvToColor({ h, s, v }, a = 1) {
  const f = (n) => {
    const k = (n + wrapHue(h) / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return rgbToColor([f(5), f(3), f(1)], a);
}
function colorToHsl(color, fallbackHue = 0) {
  const [r, g, b] = colorToRgb(fitGamut(color)).map((n) => clamp2(n));
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  const grey = d < 1e-6;
  const s = grey ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: grey ? fallbackHue : rgbHue(r, g, b, max, d), s: clamp2(s), l };
}
function hslToColor({ h, s, l }, a = 1) {
  const k = clamp2(s) * Math.min(clamp2(l), 1 - clamp2(l));
  const f = (n) => {
    const t = (n + wrapHue(h) / 30) % 12;
    return clamp2(l) - k * Math.max(-1, Math.min(t - 3, 9 - t, 1));
  };
  return rgbToColor([f(0), f(8), f(4)], a);
}
function rgbHue(r, g, b, max, d) {
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return wrapHue(h * 60);
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
    const sat = clamp2(s), light = clamp2(l);
    const a = sat * Math.min(light, 1 - light);
    const f = (n) => {
      const k = (n + wrapHue(h) / 30) % 12;
      return light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return rgbToColor([f(0), f(8), f(4)], alpha);
  }
  const values = channels.map((c) => number(c, p3 ? 1 : 255));
  if (values.some((n) => n === null)) return null;
  return rgbToColor(values.map((n) => p3 ? n : clamp2(n / 255)), alpha, p3 ? "p3" : "srgb");
}

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
function adjacentTabStop(trigger, backwards = false) {
  const candidates = Array.from(trigger.ownerDocument.querySelectorAll('a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]'));
  const stops = candidates.filter((el) => el === trigger || el.tabIndex >= 0 && !el.matches(":disabled") && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden" && !el.closest('[inert], [aria-hidden="true"], .dialkit-select-dropdown, .dialkit-preset-dropdown, .dialkit-shortcuts-dropdown, .dialkit-color-popover'));
  const index = stops.indexOf(trigger);
  return index < 0 ? void 0 : stops[index + (backwards ? -1 : 1)];
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
function element(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  if (el instanceof HTMLButtonElement) el.type = "button";
  return el;
}
function textInput(className, label, width) {
  const input = element("input", className);
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
var percentByte = (n) => Math.round(clamp2(n) * 100);
function hsvRgb(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5), f(3), f(1)];
}
function hslRgb(h, s, l) {
  const k = s * Math.min(l, 1 - l);
  const f = (n) => {
    const t = (n + h / 30) % 12;
    return l - k * Math.max(-1, Math.min(t - 3, 9 - t, 1));
  };
  return [f(0), f(8), f(4)];
}
var cssRgb = (rgb) => `rgb(${rgb.map((n) => Math.round(clamp2(n) * 255)).join(" ")})`;
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
  const row = element("div", "dialkit-color-control");
  const label = element("span", "dialkit-color-label");
  const inputs = element("div", "dialkit-color-inputs");
  const valueInput = textInput("dialkit-color-value", "color value");
  const swatch = element("button", "dialkit-color-swatch");
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
    popup = element("div", "dialkit-color-popover");
    popup.tabIndex = -1;
    popup.dataset.presentation = presentation;
    popup.style.position = inline ? "static" : "fixed";
    popup.setAttribute("role", inline ? "group" : "dialog");
    popup.setAttribute("aria-label", `${props.label} color picker`);
    const plane = element("div", "dialkit-color-plane");
    plane.setAttribute("role", "group");
    plane.tabIndex = 0;
    const canvas = element("canvas", "dialkit-color-canvas");
    canvas.width = 252;
    canvas.height = 160;
    canvas.setAttribute("aria-hidden", "true");
    const marker = element("span", "dialkit-color-marker");
    marker.setAttribute("aria-hidden", "true");
    plane.append(canvas, marker);
    hint(plane, PICKER_HINTS.plane);
    const tracks = element("div", "dialkit-color-tracks");
    function track(name, max, step, className, hintText) {
      const line = element("label", "dialkit-color-track-row");
      const input = element("input", `dialkit-color-track ${className}`);
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
    const formatRow = element("div", "dialkit-labeled-control dialkit-color-format-row");
    const formats = element("div", "dialkit-segmented dialkit-color-formats");
    formatRow.append(formats);
    formats.setAttribute("role", "radiogroup");
    formats.addEventListener("keydown", handleSegmentKey);
    formats.setAttribute("aria-label", "Color format");
    hint(formats, PICKER_HINTS.format);
    const formatPill = element("div", "dialkit-segmented-pill");
    formatPill.setAttribute("aria-hidden", "true");
    formats.append(formatPill);
    const formatButtons = FORMATS.map((f) => {
      const button = element("button", "dialkit-segmented-button dialkit-color-format", FORMAT_LABEL[f]);
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
    const fieldsRow = element("div", "dialkit-color-fields-row");
    const fields = element("div", "dialkit-color-fields");
    const EyeDropperApi = window.EyeDropper;
    const eyedropper = element("button", "dialkit-color-eyedropper");
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
    const channelBox = element("div", "dialkit-color-channels");
    const alphaBox = element("div", "dialkit-color-alpha");
    const alphaInput = textInput("dialkit-color-channel dialkit-color-alpha-input", "Alpha percentage", 3);
    const alphaUnit = element("span", "dialkit-color-unit", "%");
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
      return Number.isFinite(n) ? clamp2(n, channel.min, channel.max) : null;
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
        const n = range.wrap ? ((raw - range.min) % span + span) % span + range.min : clamp2(raw, range.min, range.max);
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
    const channelValues = () => format === "hex" ? [] : format === "rgb" ? colorToRgb255(color) : format === "hsl" ? (({ h, s, l }) => [h, s * 100, l * 100])(colorToHsl(color, srgbHue)) : [color.l, color.c, color.h];
    rebuildFields = () => {
      channelBox.replaceChildren();
      if (format === "hex") {
        const input = textInput("dialkit-color-channel dialkit-color-hex-input", "Hex value", 8);
        channelInputs = [input];
        channelBox.append(input);
      } else {
        channelInputs = CHANNELS[format].map((channel) => {
          const cell = element("label", "dialkit-color-channel-cell");
          const input = textInput("dialkit-color-channel", channel.label, channel.width);
          const name = element("span", "dialkit-color-channel-name", channel.key.toUpperCase());
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
      commit({ ...color, a: clamp2(percent, 0, 100) / 100 });
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
      if (max > 0) saturation = clamp2(color.c / max);
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
      const h = fieldHue();
      const pixels = ctx.createImageData(canvas.width, canvas.height);
      for (let y = 0; y < canvas.height; y++) {
        const t = 1 - y / (canvas.height - 1);
        const max = space === "oklch" ? maxChroma(t, h) : 0;
        for (let x = 0; x < canvas.width; x++) {
          const u = x / (canvas.width - 1);
          const rgb = space === "hsv" ? hsvRgb(h, u, t) : space === "hsl" ? hslRgb(h, u, t) : colorToRgb({ l: t, c: u * max, h, a: 1 });
          const index = (y * canvas.width + x) * 4;
          rgb.forEach((n, i) => {
            pixels.data[index + i] = Math.round(clamp2(n) * 255);
          });
          pixels.data[index + 3] = 255;
        }
      }
      ctx.putImageData(pixels, 0, 0);
    };
    const hueStops = () => {
      const at = handle();
      const stops = Array.from({ length: 73 }, (_, i) => {
        const h = i * 5;
        if (space === "hsv") return cssRgb(hsvRgb(h, at.x, 1 - at.y));
        if (space === "hsl") return cssRgb(hslRgb(h, at.x, 1 - at.y));
        return formatColor({ l: color.l, c: saturation * maxChroma(color.l, h), h, a: 1 }, "oklch");
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
      const h = Number(hue.value);
      const at = handle();
      if (space === "oklch") {
        commit({ ...color, h, c: saturation * maxChroma(color.l, h) });
      } else {
        srgbHue = wrapHue(h);
        commit(colorAt(at.x, at.y));
      }
    });
    opacity.addEventListener("input", () => commit({ ...color, a: Number(opacity.value) / 100 }));
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

// src/transition-math.ts
import { isEasingConfigValue, isSpringConfigValue } from "dialkit/store";
function round22(value) {
  return Math.round(value * 100) / 100;
}
function clamp3(value, min, max) {
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
  return round22(clamp3(duration, 0.05, 10));
}

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

// src/icons.ts
var ICON_CHEVRON = "M6 9.5L12 15.5L18 9.5";
var ICON_CLOSE = "M6 6L18 18M18 6L6 18";
var ICON_CHECK = "M5 12.75L10 19L19 5";
var ICON_PLUS = ["M5 12H19M12 5V19"];
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

// src/vanilla/dom.ts
function element2(tag, className = "", text) {
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
function icon(paths, className = "", viewBox = "0 0 24 24") {
  const node = svg("svg", { class: className, viewBox, fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" });
  for (const d of typeof paths === "string" ? [paths] : paths)
    node.append(svg("path", { d }));
  return node;
}

// src/vanilla/controls.ts
function mountFolder(host, initial) {
  let props = initial;
  let open = props.open ?? props.defaultOpen ?? true;
  const folder = element2("div", `dialkit-folder${props.isRoot ? " dialkit-folder-root" : ""}`);
  const header = element2("div", `dialkit-folder-header${props.isRoot ? " dialkit-panel-header" : ""}`);
  const top = element2("div", "dialkit-folder-header-top");
  const titleRow = element2("div", "dialkit-folder-title-row");
  const title = element2("span", `dialkit-folder-title${props.isRoot ? " dialkit-folder-title-root" : ""}`);
  titleRow.append(title);
  top.append(titleRow);
  const glyph = props.isRoot ? svg("svg", { class: "dialkit-panel-icon", viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" }) : icon(ICON_CHEVRON, "dialkit-folder-icon");
  if (props.isRoot) {
    glyph.append(svg("path", { d: ICON_PANEL.path, fill: "currentColor", opacity: 0.5 }));
    ICON_PANEL.circles.forEach((c) => glyph.append(svg("circle", { ...c, fill: "currentColor", stroke: "currentColor", "stroke-width": 1.25 })));
  }
  if (!props.inline || !props.isRoot)
    top.append(glyph);
  const toolbar = element2("div", "dialkit-panel-toolbar");
  toolbar.addEventListener("click", (event) => event.stopPropagation());
  header.append(top);
  if (props.isRoot)
    header.append(toolbar);
  const content = element2("div", "dialkit-folder-content");
  const body = element2("div", "dialkit-folder-inner");
  content.append(body);
  folder.append(header, content);
  const node = props.isRoot ? element2("div", `dialkit-panel-inner${props.inline ? " dialkit-panel-inline" : ""}`) : folder;
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
      if (event.key.length === 1 && event.key !== " ") {
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
function element3(tag, className) {
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
  const root = element3("div", "dialkit-bg-gizmo");
  const svg2 = svgElement("svg", { class: "dialkit-bg-gizmo-lines", "aria-hidden": "true" });
  const shadowLine = svgElement("line", { class: "dialkit-bg-gizmo-shadow" });
  const line = svgElement("line", { class: "dialkit-bg-gizmo-line" });
  const shadowRim = svgElement("ellipse", { class: "dialkit-bg-gizmo-shadow" });
  const rim = svgElement("ellipse", { class: "dialkit-bg-gizmo-line" });
  const band = svgElement("path", { class: "dialkit-bg-gizmo-hit", "fill-rule": "evenodd" });
  svg2.append(shadowRim, rim, shadowLine, line, band);
  const handles = {
    start: element3("div", "dialkit-bg-gizmo-handle"),
    end: element3("div", "dialkit-bg-gizmo-handle"),
    width: element3("div", "dialkit-bg-gizmo-handle")
  };
  for (const [role, el] of Object.entries(handles)) {
    el.dataset.role = role;
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-keyshortcuts", "ArrowUp ArrowDown ArrowLeft ArrowRight");
    el.append(element3("span", "dialkit-bg-gizmo-dot"));
  }
  const swatchLayer = element3("div", "dialkit-bg-gizmo-stops");
  swatchLayer.setAttribute("aria-hidden", "true");
  const ghost = element3("div", "dialkit-bg-gizmo-stop dialkit-bg-gizmo-ghost");
  ghost.setAttribute("aria-hidden", "true");
  ghost.hidden = true;
  const tip = element3("div", "dialkit-bg-gizmo-tip");
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
          const h = props.gradient.handles;
          callbacks.onHandles(role === "end" ? dragGradientEnd(h, p, box) : role === "start" ? dragGradientCentre(h, p, box) : dragGradientWidth(h, p, box));
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
      const h = props.gradient.handles;
      callbacks.onHandles(role === "end" ? dragGradientEnd(h, p, box) : role === "start" ? dragGradientCentre(h, p, box) : dragGradientWidth(h, p, box));
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
      const el = element3("div", "dialkit-bg-gizmo-stop");
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
    const { shape, handles: h, stops } = props.gradient;
    const point = stopPlacement(shape, h, at, box);
    let found = -1;
    let best = STOP_STRIP;
    stops.forEach((stop, i) => {
      const p = stopPlacement(shape, h, stop.at, box);
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
    const { shape, handles: h, stops } = props.gradient;
    const at = ghostPositionAt(shape, h, local(event), box);
    const under = stopUnder(at);
    if (under >= 0) {
      hideGhost();
      band.style.cursor = "move";
      percentTip(under);
      return;
    }
    band.style.cursor = "";
    const place = stopPlacement(shape, h, at, box);
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
    const { shape, handles: h } = props.gradient;
    const at = ghostPositionAt(shape, h, local(event), box);
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
    const { shape, handles: h, stops } = props.gradient;
    copyTokens();
    if (props.zIndex !== void 0) root.style.zIndex = String(props.zIndex);
    root.dataset.shape = shape;
    const p = gizmoPoints(h, box);
    const f = gradientFrame(h, box.width, box.height);
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
    band.setAttribute("d", ghostBandPath(shape, h, box));
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
      placeSwatch(el, stopPlacement(shape, h, stop.at, box));
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
var isHintKey2 = (e) => e.key.toLowerCase() === HintStore.getKey() && !(e.target instanceof HTMLInputElement);
function element4(tag, className, text) {
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
  const button = element4("button", `dialkit-bg-icon-button ${className}`);
  button.setAttribute("aria-label", label);
  button.append(strokeIcon(paths));
  return button;
}
var clamp4 = (n, min, max) => Math.min(max, Math.max(min, n));
var formatNumber = (n) => String(Math.round(n * 10) / 10 || 0);
var errorMessage = (error, fallback) => error instanceof Error && error.message ? error.message : fallback;
function segmented(options, ariaLabel, onPick) {
  const group = element4("div", "dialkit-segmented dialkit-bg-segmented");
  group.setAttribute("data-fill", "");
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", ariaLabel);
  group.addEventListener("keydown", handleSegmentKey);
  const pill = element4("div", "dialkit-segmented-pill");
  pill.setAttribute("aria-hidden", "true");
  pill.style.width = `calc((100% - 8px) / ${options.length})`;
  group.append(pill);
  const buttons = options.map((option) => {
    const button = element4("button", "dialkit-segmented-button");
    button.setAttribute("role", "radio");
    button.append(element4("span", "dialkit-segmented-text", option.label));
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
  const root = element4("div", `dialkit-field dialkit-bg-field ${options.className}`);
  const input = element4("input", "dialkit-field-input dialkit-bg-field-input");
  input.type = "text";
  input.inputMode = "decimal";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("role", "spinbutton");
  input.setAttribute("aria-valuemin", String(options.min));
  input.setAttribute("aria-valuemax", String(options.max));
  const grips = [];
  if (options.grip) {
    const grip = element4("span", "dialkit-field-axis dialkit-bg-field-grip", options.grip);
    grip.setAttribute("aria-hidden", "true");
    root.append(grip);
    grips.push(grip);
  }
  root.append(input);
  const unit = element4("span", "dialkit-bg-field-unit", options.unit);
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
  const root = element4("div", "dialkit-bg");
  const body = element4("div", "dialkit-bg-body");
  root.append(body);
  const modes = segmented(MODE_OPTIONS, "Background type", (mode) => emit({ ...value, mode }));
  body.append(modes.group);
  const solidPane = element4("div", "dialkit-bg-pane dialkit-bg-solid");
  const solidHost = element4("div", "dialkit-color-host");
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
  const gradientPane = element4("div", "dialkit-bg-pane dialkit-bg-gradient");
  const shapeRow = element4("div", "dialkit-bg-shape-row");
  const shapeTrigger = element4("button", "dialkit-select-trigger dialkit-bg-shape-trigger");
  shapeTrigger.setAttribute("aria-haspopup", "listbox");
  shapeTrigger.setAttribute("aria-expanded", "false");
  shapeTrigger.setAttribute("aria-label", "Gradient type");
  const shapeValue = element4("span", "dialkit-select-value");
  const shapeChevron = strokeIcon(ICON_CHEVRON);
  shapeChevron.classList.add("dialkit-select-chevron");
  shapeTrigger.append(shapeValue, shapeChevron);
  const flipButton = iconButton("dialkit-bg-flip", "Flip stops", ICON_REVERSE);
  const rotateButton = iconButton("dialkit-bg-rotate", "Rotate 90\xB0 clockwise", ICON_ROTATE);
  shapeRow.append(shapeTrigger, flipButton, rotateButton);
  let shapeMenu;
  let stopShapeKeys;
  const shapeOutside = (event) => {
    if (!shapeMenu?.contains(event.target) && !shapeTrigger.contains(event.target)) closeShapeMenu();
  };
  function closeShapeMenu() {
    stopShapeKeys?.();
    stopShapeKeys = void 0;
    shapeMenu?.remove();
    shapeMenu = void 0;
    shapeTrigger.dataset.open = "false";
    shapeTrigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", shapeOutside, true);
  }
  const placeShapeMenu = () => {
    if (!shapeMenu) return;
    const rect = shapeTrigger.getBoundingClientRect();
    const current = shapeMenu.querySelector('[data-selected="true"]');
    const offset = current ? current.offsetTop + current.offsetHeight / 2 : 0;
    const height = shapeMenu.offsetHeight;
    const top = Math.max(8, Math.min(rect.top + rect.height / 2 - offset, window.innerHeight - height - 8));
    Object.assign(shapeMenu.style, { left: `${rect.left}px`, top: `${top}px`, width: `${rect.width}px` });
  };
  const openShapeMenu = () => {
    if (shapeMenu) {
      closeShapeMenu();
      return;
    }
    const portal = getDialKitPortalRoot(host) ?? document.body;
    const menu = element4("div", "dialkit-select-dropdown dialkit-bg-shape-menu");
    menu.style.position = "fixed";
    for (const shape of GRADIENT_SHAPES) {
      const option = element4("button", "dialkit-select-option dialkit-bg-shape-option");
      option.dataset.selected = String(shape === value.gradient.shape);
      const check = strokeIcon(ICON_CHECK);
      check.classList.add("dialkit-bg-shape-check");
      option.append(check, element4("span", "dialkit-bg-shape-label", SHAPE_LABEL[shape]));
      option.addEventListener("click", () => {
        closeShapeMenu();
        setGradient(switchGradientShape(value.gradient, shape, canvasAspect()));
        shapeTrigger.focus({ preventScroll: true });
      });
      menu.append(option);
    }
    menu.addEventListener("pointerdown", (event) => {
      if (gizmoRowId !== void 0) event.stopPropagation();
    });
    menu.addEventListener("focusin", (event) => {
      if (gizmoRowId !== void 0) event.stopPropagation();
    });
    shapeMenu = menu;
    portal.append(menu);
    placeShapeMenu();
    shapeTrigger.dataset.open = "true";
    shapeTrigger.setAttribute("aria-expanded", "true");
    stopShapeKeys = observeDropdownKeyboard(shapeTrigger, () => shapeMenu, closeShapeMenu, "select");
    document.addEventListener("pointerdown", shapeOutside, true);
  };
  function canvasAspect() {
    const rect = getBackgroundHost().gizmoTarget?.()?.getBoundingClientRect();
    return rect && rect.width > 0 && rect.height > 0 ? rect.width / rect.height : 1;
  }
  shapeTrigger.addEventListener("click", openShapeMenu);
  shapeTrigger.addEventListener("keydown", (event) => {
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !event.altKey && !event.metaKey && !event.ctrlKey && !shapeMenu) {
      event.preventDefault();
      event.stopPropagation();
      openShapeMenu();
    }
  });
  flipButton.addEventListener("click", () => {
    commitEntries(entries().map(({ id, stop }) => ({ id, stop: { ...stop, at: Math.round((100 - stop.at) * 100) / 100 } })));
  });
  rotateButton.addEventListener("click", () => {
    setGradient({ ...value.gradient, handles: rotateGradientQuarter(value.gradient.shape, value.gradient.handles, { width: canvasAspect(), height: 1 }) });
  });
  const bar = element4("div", "dialkit-bg-bar");
  const track = element4("div", "dialkit-bg-track");
  const trackPaint = element4("div", "dialkit-bg-track-paint");
  track.append(trackPaint);
  const handlesLayer = element4("div", "dialkit-bg-handles");
  bar.append(track, handlesLayer);
  bar.title = "Click the bar to add a stop";
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
  const stopsHeader = element4("div", "dialkit-bg-stops-header");
  const stopsTitle = element4("span", "dialkit-bg-stops-title", "Stops");
  const addButton = iconButton("dialkit-bg-add", "Add stop", ICON_PLUS);
  stopsHeader.append(stopsTitle, addButton);
  const stopsList = element4("div", "dialkit-bg-stops");
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
  const saveRow = element4("div", "dialkit-bg-save-row");
  const saveButton = element4("button", "dialkit-preset-save dialkit-bg-save", "Save gradient");
  saveRow.append(saveButton);
  const gradientStatusLine = element4("div", "dialkit-bg-status");
  gradientStatusLine.setAttribute("role", "status");
  gradientStatusLine.setAttribute("aria-live", "polite");
  const savedList = element4("div", "dialkit-bg-saved");
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
    drag = { id: event.pointerId, index, x: event.clientX, moved };
    bar.dataset.dragging = "true";
    return true;
  };
  const endDrag = (event) => {
    if (!drag || event && event.pointerId !== drag.id) return;
    const id = drag.id;
    drag = void 0;
    delete bar.dataset.dragging;
    if (bar.hasPointerCapture(id)) bar.releasePointerCapture(id);
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
    if (!drag.moved && Math.abs(event.clientX - drag.x) < DRAG_THRESHOLD2) return;
    drag.moved = true;
    updateStop(drag.index, { at: Math.round(fractionAt(event.clientX) * 100) });
    drag.index = selected;
    handles[selected]?.focus({ preventScroll: true });
  });
  bar.addEventListener("pointerup", (event) => endDrag(event));
  bar.addEventListener("pointercancel", (event) => endDrag(event));
  bar.addEventListener("lostpointercapture", (event) => endDrag(event));
  const buildHandles = () => {
    handlesLayer.replaceChildren();
    stems = value.gradient.stops.map(() => {
      const stem = element4("span", "dialkit-bg-stem");
      stem.setAttribute("aria-hidden", "true");
      handlesLayer.append(stem);
      return stem;
    });
    handles = value.gradient.stops.map((_, i) => {
      const handle = element4("button", "dialkit-bg-handle");
      handle.setAttribute("role", "slider");
      handle.setAttribute("aria-valuemin", "0");
      handle.setAttribute("aria-valuemax", "100");
      const chip = element4("span", "dialkit-bg-handle-chip");
      chip.setAttribute("aria-hidden", "true");
      handle.append(chip);
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
    const rowRoot = element4("div", "dialkit-bg-stop");
    rowRoot.addEventListener("pointerdown", () => select(index()));
    rowRoot.addEventListener("focusin", () => select(index()));
    const grip = element4("button", "dialkit-bg-icon-button dialkit-bg-stop-grip");
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
    const colorHost = element4("div", "dialkit-color-host dialkit-bg-stop-color");
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
    return row;
  };
  const pickStopColor = (row, raw) => {
    const picked = readPicked(raw);
    if (!picked) return;
    row.picked = { raw, ...picked };
    updateStop(stopIds.indexOf(row.id), picked);
  };
  const dropRow = (row) => {
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
  const syncRows = (before, listTop, animate) => {
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
      if (!animate || top === void 0) {
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
    if (!animate || rowDrag) return;
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
    if (event.key !== "Escape" || event.defaultPrevented || gizmoRowId === void 0 || shapeMenu) return;
    const row = rowById.get(gizmoRowId);
    if (row && pickerOpen(row)) toggleRowPicker(row);
    else exitGizmo();
  }
  function gizmoPressElsewhere(event) {
    if (gizmoRowId === void 0) return;
    const target = event.target;
    const inside = gradientPane.contains(target) || !!gizmo?.element.contains(target) || !!shapeMenu?.contains(target) || [...document.querySelectorAll(".dialkit-color-popover")].some((popover) => popover.contains(target));
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
    savedList.replaceChildren();
    savedItems = list.map((saved, i) => {
      const item = element4("div", "dialkit-bg-saved-item");
      const swatch = element4("button", "dialkit-bg-saved-swatch");
      swatch.setAttribute("aria-label", `Apply saved gradient ${i + 1}`);
      swatch.style.setProperty("--dial-bg-gradient", backgroundGradientCss(saved.gradient));
      swatch.addEventListener("click", () => {
        selected = 0;
        emit({ ...value, mode: "gradient", gradient: cloneGradient(saved.gradient) });
      });
      item.append(swatch);
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
  const mediaPane = element4("div", "dialkit-bg-pane dialkit-bg-media");
  const fileInput = element4("input", "dialkit-bg-file");
  fileInput.type = "file";
  fileInput.accept = "image/*,video/*";
  fileInput.tabIndex = -1;
  fileInput.setAttribute("aria-hidden", "true");
  const drop = element4("button", "dialkit-bg-drop");
  const dropText = element4("span", "dialkit-bg-drop-text");
  drop.append(strokeIcon(ICON_UPLOAD), dropText);
  const preview = element4("button", "dialkit-bg-media-preview");
  preview.setAttribute("aria-label", "Media options");
  preview.setAttribute("aria-haspopup", "dialog");
  preview.setAttribute("aria-expanded", "false");
  const previewFrame = element4("span", "dialkit-bg-media-frame");
  const previewBadge = element4("span", "dialkit-bg-media-badge");
  previewBadge.setAttribute("aria-hidden", "true");
  preview.append(previewFrame, previewBadge);
  let previewSignature = "";
  const actions = element4("div", "dialkit-bg-media-actions");
  const replaceButton = element4("button", "dialkit-button dialkit-bg-media-action", "Replace");
  const removeButton = element4("button", "dialkit-button dialkit-bg-media-action", "Remove");
  actions.append(replaceButton, removeButton);
  const mediaStatusLine = element4("div", "dialkit-bg-status");
  mediaStatusLine.setAttribute("role", "status");
  mediaStatusLine.setAttribute("aria-live", "polite");
  mediaPane.append(drop, preview, actions, mediaStatusLine, fileInput);
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
      previewFrame.append(element4("span", "dialkit-bg-media-key", media.key));
    } else if (media.kind === "video") {
      const video = element4("video", "dialkit-bg-media-el");
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
      const img = element4("img", "dialkit-bg-media-el");
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
    stopPosition?.();
    stopPosition = void 0;
    popup?.remove();
    popup = void 0;
    syncOptions = () => {
    };
    delete preview.dataset.open;
    preview.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", outside);
    document.removeEventListener("focusin", focusOutside);
    if (restoreFocus) preview.focus({ preventScroll: true });
  };
  const outside = (event) => {
    if (!popup?.contains(event.target) && !preview.contains(event.target)) closeOptions();
  };
  const focusOutside = (event) => {
    if (!popup?.contains(event.target) && !preview.contains(event.target)) closeOptions();
  };
  const openOptions = (event) => {
    if (popup) {
      closeOptions();
      return;
    }
    const portal = getDialKitPortalRoot(host) ?? host;
    const shell = element4("div", "dialkit-bg-popover");
    popup = shell;
    shell.tabIndex = -1;
    shell.style.position = "fixed";
    shell.setAttribute("role", "dialog");
    shell.setAttribute("aria-label", `${props.label} media options`);
    const section = (title, control) => {
      const wrap = element4("div", "dialkit-bg-popover-section");
      const heading = element4("div", "dialkit-bg-popover-label", title);
      wrap.append(heading, control);
      shell.append(wrap);
    };
    const fits = segmented(BACKGROUND_FITS.map((fit) => ({ value: fit, label: FIT_LABEL[fit] })), "Fit", (fit) => setDisplay({ fit }));
    section("Fit", fits.group);
    const tileWrap = element4("div", "dialkit-bg-tile-wrap");
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
    shell.append(tileWrap);
    const tileRow = conditionalRow(tileWrap, shell);
    const ratios = element4("div", "dialkit-bg-ratios");
    ratios.setAttribute("role", "radiogroup");
    ratios.setAttribute("aria-label", "Ratio");
    ratios.addEventListener("keydown", handleSegmentKey);
    const ratioButtons = BACKGROUND_RATIOS.map((ratio) => {
      const button = element4("button", "dialkit-segmented-button dialkit-bg-ratio");
      button.setAttribute("role", "radio");
      button.append(element4("span", "dialkit-segmented-text", RATIO_LABEL(ratio)));
      button.addEventListener("click", () => setDisplay({ ratio }));
      ratios.append(button);
      return button;
    });
    section("Ratio", ratios);
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
    const anchor = element4("div", "dialkit-anchor dialkit-bg-pin");
    anchor.setAttribute("role", "radiogroup");
    anchor.setAttribute("aria-label", "Pin");
    anchor.style.setProperty("--dial-anchor-columns", "3");
    anchor.style.setProperty("--dial-anchor-rows", "3");
    const anchorPill = element4("span", "dialkit-anchor-pill dialkit-bg-pin-pill");
    anchorPill.setAttribute("aria-hidden", "true");
    anchor.append(anchorPill);
    const cells = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cell = element4("button", "dialkit-anchor-cell");
        cell.setAttribute("role", "radio");
        cell.setAttribute("aria-label", `${PIN_ROWS[r]}, ${PIN_COLUMNS[c]}`);
        cell.dataset.cell = `${c}-${r}`;
        cell.append(element4("span", "dialkit-anchor-dot"));
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
    section("Pin", anchor);
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
      if (!isHintKey2(e)) e.stopPropagation();
    });
    portal.append(shell);
    syncOptions();
    const updatePosition = () => {
      if (!popup) return;
      if (!host.isConnected || preview.getClientRects().length === 0) {
        closeOptions();
        return;
      }
      const p = getDropdownPosition(preview, portal, { dropdownHeight: popup.scrollHeight + 2, width: 280, maxHeight: 480, preferSide: true, fixed: true, gap: 8 });
      Object.assign(popup.style, { left: `${p.left}px`, top: `${p.top}px`, width: `${p.width}px`, maxHeight: `${p.maxHeight}px`, transformOrigin: p.above ? "bottom" : "top" });
    };
    stopPosition = observeDropdownPosition(preview, updatePosition, () => popup);
    preview.dataset.open = "true";
    preview.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focusOutside);
    if (event instanceof MouseEvent && event.detail > 0) shell.focus({ preventScroll: true });
    else fits.buttons.find((button) => button.dataset.active === "true")?.focus({ preventScroll: true });
  };
  preview.addEventListener("click", openOptions);
  body.append(solidPane, gradientPane, mediaPane);
  (folder?.body ?? host).append(root);
  let heightAnim;
  let heightTarget = -1;
  let built = false;
  let shownMode = value.mode;
  function render() {
    if (destroyed) return;
    const animate = built && root.isConnected && root.getClientRects().length > 0 && !reducedMotion();
    const beforeHeight = root.getBoundingClientRect().height;
    const listTop = stopsList.getBoundingClientRect().top;
    const before = /* @__PURE__ */ new Map();
    if (animate && stopsList.getClientRects().length > 0) {
      for (const row of rowById.values()) if (!row.leaving) before.set(row.id, row.root.getBoundingClientRect().top);
    }
    renderNow(before, listTop, animate);
    built = true;
    if (!animate) return;
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
  function renderNow(before, listTop, animate) {
    shownMode = animate ? shownMode : value.mode;
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
    placeShapeMenu();
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
    syncRows(before, listTop, animate);
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
    preview.hidden = !media;
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
      uploadRequest++;
      unsubscribe();
      endDrag();
      closeOptions();
      solid.destroy();
      heightAnim?.cancel();
      closeShapeMenu();
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
  const root = element4("div", "dialkit-slider-wrapper dialkit-bg-slider");
  const slider = element4("div", "dialkit-slider");
  slider.tabIndex = 0;
  slider.setAttribute("role", "slider");
  slider.setAttribute("aria-label", options.label);
  slider.setAttribute("aria-valuemin", String(min));
  slider.setAttribute("aria-valuemax", String(max));
  const fill = element4("div", "dialkit-slider-fill");
  const handle = element4("div", "dialkit-slider-handle dialkit-bg-slider-handle");
  const label = element4("span", "dialkit-slider-label", options.label);
  const valueText = element4("span", "dialkit-slider-value");
  const number2 = element4("span", "dialkit-bg-slider-number");
  const unit = element4("span", "dialkit-slider-unit", unitText);
  valueText.append(number2, unit);
  const input = element4("input", "dialkit-slider-input");
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
export {
  mountBackgroundControl
};
//# sourceMappingURL=background-control.js.map