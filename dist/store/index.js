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
    const sat = clamp(s), light = clamp(l);
    const a = sat * Math.min(light, 1 - light);
    const f = (n) => {
      const k = (n + wrapHue(h) / 30) % 12;
      return light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return rgbToColor([f(0), f(8), f(4)], alpha);
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

// src/layers.ts
var ACTION_SEPARATOR = ":";
function layerAction(path, kind, id) {
  return id === void 0 ? `${path}${ACTION_SEPARATOR}${kind}` : `${path}${ACTION_SEPARATOR}${kind}${ACTION_SEPARATOR}${id}`;
}
function parseLayerAction(path, action) {
  const prefix = `${path}${ACTION_SEPARATOR}`;
  if (!action.startsWith(prefix)) return null;
  const rest = action.slice(prefix.length);
  const cut = rest.indexOf(ACTION_SEPARATOR);
  const kind = cut === -1 ? rest : rest.slice(0, cut);
  if (kind === "add") return cut === -1 ? { kind } : null;
  if ((kind === "duplicate" || kind === "delete") && cut !== -1 && cut < rest.length - 1) {
    return { kind, id: rest.slice(cut + 1) };
  }
  return null;
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeLayersValue(value, fallback = { items: [], selected: null }) {
  if (!isRecord2(value) || !Array.isArray(value.items)) return { items: fallback.items.map((item) => ({ ...item })), selected: fallback.selected };
  const seen = /* @__PURE__ */ new Set();
  const items = [];
  for (const raw of value.items) {
    if (!isRecord2(raw) || typeof raw.id !== "string" || raw.id === "" || typeof raw.label !== "string" || seen.has(raw.id)) continue;
    seen.add(raw.id);
    const item = { id: raw.id, label: raw.label };
    if (raw.hidden === true) item.hidden = true;
    if (typeof raw.offCanvas === "string" && raw.offCanvas !== "") item.offCanvas = raw.offCanvas;
    items.push(item);
  }
  const selected = typeof value.selected === "string" && seen.has(value.selected) ? value.selected : null;
  return { items, selected };
}
function sameLayersValue(a, b) {
  if (!isRecord2(a) || !isRecord2(b) || !Array.isArray(a.items) || !Array.isArray(b.items)) return false;
  if (a.selected !== b.selected || a.items.length !== b.items.length) return false;
  return a.items.every((item, i) => {
    const other = b.items[i];
    return isRecord2(item) && isRecord2(other) && item.id === other.id && item.label === other.label && !!item.hidden === !!other.hidden && (item.offCanvas ?? "") === (other.offCanvas ?? "");
  });
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
    const svg = `<svg xmlns="${SVG}" width="24" height="24" viewBox="0 0 24 24"><g transform="rotate(${step + 90} 12 12)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${arc}" stroke="#fff" stroke-width="4"/><path d="${heads}" stroke="#fff" stroke-width="4"/><path d="${arc}" stroke="#000" stroke-width="1.5"/><path d="${heads}" stroke="#000" stroke-width="1.5"/></g></svg>`;
    cursor = `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, grab`;
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
  const svg = svgElement("svg", { class: "dialkit-bg-gizmo-lines", "aria-hidden": "true" });
  const shadowLine = svgElement("line", { class: "dialkit-bg-gizmo-shadow" });
  const line = svgElement("line", { class: "dialkit-bg-gizmo-line" });
  const shadowRim = svgElement("ellipse", { class: "dialkit-bg-gizmo-shadow" });
  const rim = svgElement("ellipse", { class: "dialkit-bg-gizmo-line" });
  const band = svgElement("path", { class: "dialkit-bg-gizmo-hit", "fill-rule": "evenodd" });
  svg.append(shadowRim, rim, shadowLine, line, band);
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
  root.append(svg, swatchLayer, ghost, handles.width, handles.start, handles.end, tip);
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
  return Array.isArray(value) && value.length <= 5 && typeof value[0] === "number" || typeof value === "number" || typeof value === "boolean" || typeof value === "string" || isSpringConfigValue(value) || isEasingConfigValue(value) || isActionConfigValue(value) || isSelectConfigValue(value) || isColorConfigValue(value) || isImageConfigValue(value) || isTextConfigValue(value) || isPadConfigValue(value) || isBackgroundConfigValue(value) || isLayersConfigValue(value);
}
function configDefaultValue(value) {
  if (Array.isArray(value)) return value[0];
  if (isSelectConfigValue(value)) return value.default ?? getFirstOptionValue(value.options);
  if (isColorConfigValue(value)) return value.default ?? "#000000";
  if (isImageConfigValue(value)) return value.default ?? getFirstOptionValue(value.options ?? []);
  if (isTextConfigValue(value)) return value.default ?? "";
  if (isPadConfigValue(value)) return normalizePadValue(void 0, value);
  if (isBackgroundConfigValue(value)) return backgroundConfigDefault(value);
  if (isLayersConfigValue(value)) return normalizeLayersValue(value.default);
  return value;
}
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function backgroundWriteBase(current, configDefault) {
  if (!isRecord3(current)) return configDefault;
  return sameBackgroundValue(current, normalizeBackgroundValue(current, configDefault)) ? current : configDefault;
}
function sameControlValue(previous, next, control) {
  return Object.is(previous, next) || control?.type === "pad" && isRecord3(previous) && isRecord3(next) && previous.x === next.x && previous.y === next.y || control?.type === "background" && sameBackgroundValue(previous, next) || control?.type === "layers" && sameLayersValue(previous, next);
}
function sameValue(a, b) {
  if (a === b || Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => sameValue(item, b[i]));
  }
  if (isRecord3(a) && isRecord3(b)) return sameRecord(a, b);
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
function isLayersConfigValue(value) {
  return hasType(value, "layers");
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
      const next = control?.type === "pad" ? normalizePadValue(value, control.pad) : control?.type === "background" ? normalizeBackgroundValue(value, backgroundWriteBase(panel.values[path], control.background?.default)) : control?.type === "layers" ? normalizeLayersValue(value) : value;
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
      if (!isRecord3(parsed) || parsed.version !== 1) return null;
      const values = isRecord3(parsed.values) ? parsed.values : void 0;
      const presets = config.presets && Array.isArray(parsed.presets) ? parsed.presets.filter((preset) => isRecord3(preset) && typeof preset.id === "string" && typeof preset.name === "string" && isRecord3(preset.values)) : [];
      return {
        version: 1,
        values,
        baseValues: config.presets && isRecord3(parsed.baseValues) ? parsed.baseValues : values,
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
        } else if (isLayersConfigValue(value)) {
          control = { type: "layers", path, label, layers: { ...value, default: normalizeLayersValue(value.default) } };
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
      case "layers":
        return normalizeLayersValue(existingValue, control.layers?.default);
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
export {
  DialStore,
  GRADIENT_SHAPES,
  backgroundGradientCss,
  defaultBackgroundValue,
  defaultGradientHandles,
  dragGradientCentre,
  dragGradientEnd,
  dragGradientWidth,
  flattenDialValueUpdates,
  formatGizmoAngle,
  formatLabel,
  getBackgroundHost,
  getSavedGradients,
  gizmoAngle,
  gizmoPoints,
  gradientFrame,
  gradientParamAt,
  inferStep,
  isEasingConfigValue,
  isFolderMetaKey,
  isHexColor,
  isLeafConfigValue,
  isSpringConfigValue,
  layerAction,
  legacyGradientHandles,
  mountGradientGizmo,
  normalizeBackgroundValue,
  normalizeLayersValue,
  paintBackgroundPreview,
  parseLayerAction,
  resolveDialValues,
  rotateGradientHandles,
  setBackgroundHost,
  setSavedGradients,
  stopPlacement,
  stopPositionAt,
  subscribeBackgroundHost,
  switchGradientShape,
  unwrapVisibility,
  withVisibility
};
//# sourceMappingURL=index.js.map