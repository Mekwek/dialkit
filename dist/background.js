// src/color.ts
var clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
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
  if (format === "p3") return `color(display-p3 ${rgb.map((n) => round(clamp(n), 5)).join(" ")}${alpha})`;
  const bytes = rgb.map((n) => Math.round(clamp(n) * 255));
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
function colorChannels(color, format) {
  if (format === "oklch") return [color.l, color.c, color.h];
  const rgb = colorToRgb(fitGamut(color, formatGamut(format)), formatGamut(format)).map((n) => clamp(n));
  if (format === "p3") return rgb;
  if (format === "rgb") return rgb.map((n) => n * 255);
  const max = Math.max(...rgb), d = max - Math.min(...rgb), l = max - d / 2;
  if (d < 1e-6) return [color.h ? grayHslHue(color.h) : 0, 0, l * 100];
  return [rgbHue(rgb, max, d), Math.min(100, d / (1 - Math.abs(2 * l - 1)) * 100), l * 100];
}
function rgbHue([r, g, b], max, d) {
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return wrapHue(h * 60);
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
var round2 = (n, digits) => Number(n.toFixed(digits)) || 0;
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
  return { x: round2(clamp(value.x, POINT_RANGE.min, POINT_RANGE.max), 6), y: round2(clamp(value.y, POINT_RANGE.min, POINT_RANGE.max), 6) };
}
function sortStops(stops) {
  return stops.map((stop, i) => ({ stop, i })).sort((a, b) => a.stop.at - b.stop.at || a.i - b.i).map(({ stop }) => stop);
}
function normalizeGradient(value, fallback = defaultBackgroundValue().gradient) {
  const input = isRecord(value) ? value : {};
  const shape = oneOf(GRADIENT_SHAPES, input.shape, fallback.shape);
  const handles = isRecord(input.handles) ? input.handles : {};
  const base = isRecord(input.handles) ? fallback.handles : switchGradientShape(fallback, shape).handles;
  const stops = Array.isArray(input.stops) ? input.stops.filter((stop) => isRecord(stop) && finite(stop.at) && validColor(stop.color)).map((stop) => ({ at: round2(clamp(stop.at, 0, 100), 2), color: stop.color.trim() })) : [];
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
    zoom: finite(input.zoom) ? round2(clamp(input.zoom, MEDIA_ZOOM.min, MEDIA_ZOOM.max), 1) : fallback.zoom,
    tileSize: finite(input.tileSize) ? round2(clamp(input.tileSize, MEDIA_TILE_SIZE.min, MEDIA_TILE_SIZE.max), 2) : fallback.tileSize,
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
  const point = (x, y) => ({ x: round2(x, 6), y: round2(y, 6) });
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
  const turn = (p) => ({ x: round2(pivot.x - (p.y - pivot.y), 6), y: round2(pivot.y + (p.x - pivot.x), 6) });
  return { ...cloneGradient(gradient), handles: { start: turn(start), end: turn(end), width: turn(width) } };
}
function moveStopColor(stops, from, to) {
  const colors = stops.map((stop) => stop.color);
  const [color] = colors.splice(from, 1);
  colors.splice(clamp(to, 0, colors.length), 0, color);
  return stops.map((stop, i) => ({ at: stop.at, color: colors[i] }));
}
function colorOpacity(color) {
  return (parseColor(color)?.a ?? 1) * 100;
}
function withOpacity(color, opacity) {
  const parsed = parseColor(color) ?? { l: 0, c: 0, h: 0, a: 1 };
  return formatColor({ ...parsed, a: clamp(opacity / 100) }, colorFormat(color));
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
  return round2(middle, 2);
}
var rgba = (value) => {
  const color = parseColor(value) ?? { l: 0, c: 0, h: 0, a: 1 };
  const [r, g, b] = colorToRgb(fitGamut(color)).map((n) => clamp(n));
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
      const color = table[Math.round(clamp(gradientParamAt(gradient.shape, frame, x + 0.5, y + 0.5)) * 255)];
      image.data.set(color, (y * width + x) * 4);
    }
  }
  context.putImageData(image, 0, 0);
}
function backgroundGradientCss(gradient) {
  const list = (stops) => stops.map((stop) => `${stop.color} ${round2(stop.at, 2)}%`).join(", ");
  const frame = gradientFrame(gradient.handles, 100, 100);
  const at = `${round2(frame.cx, 2)}% ${round2(frame.cy, 2)}%`;
  const angle = Math.atan2(frame.ax, -frame.ay) * 180 / Math.PI;
  if (gradient.shape === "linear") {
    const length = Math.abs(frame.ax) + Math.abs(frame.ay);
    const along = (t) => {
      const x = (frame.cx + frame.ax * frame.r1 * t) / 100 - 0.5;
      const y = (frame.cy + frame.ay * frame.r1 * t) / 100 - 0.5;
      return ((x * frame.ax + y * frame.ay) / length + 0.5) * 100;
    };
    return `linear-gradient(${round2(angle, 2)}deg, ${list(gradient.stops.map((stop) => ({ ...stop, at: along(stop.at / 100) })))})`;
  }
  if (gradient.shape === "angular") {
    const clockwise = frame.ax * frame.ny - frame.ay * frame.nx > 0;
    const stops = clockwise ? gradient.stops : gradient.stops.map((stop) => ({ ...stop, at: 100 - stop.at })).reverse();
    return `conic-gradient(from ${round2(angle, 2)}deg at ${at}, ${list(stops)})`;
  }
  const horizontal = Math.abs(frame.ax) >= Math.abs(frame.ay);
  return `radial-gradient(${round2(horizontal ? frame.r1 : frame.r2, 2)}% ${round2(horizontal ? frame.r2 : frame.r1, 2)}% at ${at}, ${list(gradient.stops)})`;
}
function backgroundMediaCss(media, display) {
  const position = `${display.position.x} ${display.position.y}`;
  const zoom = { transform: `scale(${display.zoom})`, "transform-origin": position };
  if (media.kind === "video") {
    return { "object-fit": display.fit === "fit" ? "contain" : display.fit === "stretch" ? "fill" : "cover", "object-position": position, ...zoom };
  }
  const size = { fill: "cover", fit: "contain", stretch: "100% 100%", tile: `auto ${round2(display.tileSize * 100, 2)}%` }[display.fit];
  return { "background-image": `url(${JSON.stringify(media.src)})`, "background-position": position, "background-repeat": display.fit === "tile" ? "repeat" : "no-repeat", "background-size": size, ...zoom };
}
export {
  GRADIENT_SHAPES,
  MAX_GRADIENT_STOPS,
  MEDIA_FITS,
  MEDIA_RATIOS,
  MEDIA_TILE_SIZE,
  MEDIA_ZOOM,
  MIN_GRADIENT_STOPS,
  backgroundGradientCss,
  backgroundMediaCss,
  cloneGradient,
  colorOpacity,
  defaultBackgroundValue,
  gradientColorAt,
  gradientFrame,
  gradientParamAt,
  gradientStrip,
  moveStopColor,
  normalizeBackgroundValue,
  normalizeGradient,
  paintGradient,
  rotateGradient,
  sameBackgroundValue,
  sameGradient,
  sortStops,
  switchGradientShape,
  widestGapMiddle,
  withOpacity
};
//# sourceMappingURL=background.js.map