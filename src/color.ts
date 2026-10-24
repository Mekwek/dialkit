/** Dependency-free CSS color math. Matrices use the CSS Color 4 D65 reference white.
 * https://www.w3.org/TR/css-color-4/#color-conversion-code */
export type Color = { l: number; c: number; h: number; a: number };
export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'oklch' | 'p3';
type Triple = [number, number, number];
export const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
export const wrapHue = (h: number) => ((h % 360) + 360) % 360;
const multiply = (m: number[][], v: Triple): Triple => m.map(row => row.reduce((n, x, i) => n + x * v[i], 0)) as Triple;
const linearize = (v: number) => Math.abs(v) <= 0.04045 ? v / 12.92 : Math.sign(v) * ((Math.abs(v) + 0.055) / 1.055) ** 2.4;
const encode = (v: number) => Math.abs(v) <= 0.0031308 ? 12.92 * v : Math.sign(v) * (1.055 * Math.abs(v) ** (1 / 2.4) - 0.055);
const RGB_XYZ = [[0.4123907993, 0.3575843394, 0.1804807884], [0.2126390059, 0.7151686788, 0.0721923154], [0.0193308187, 0.1191947798, 0.9505321522]];
const P3_XYZ = [[0.4865709486, 0.2656676932, 0.1982172852], [0.2289745641, 0.6917385218, 0.0792869141], [0, 0.0451133819, 1.0439443689]];
const XYZ_RGB = [[3.2409699419, -1.5373831776, -0.4986107603], [-0.9692436363, 1.8759675015, 0.0415550574], [0.0556300797, -0.2039769589, 1.0569715142]];
const XYZ_P3 = [[2.4934969119, -0.9313836179, -0.4027107845], [-0.8294889696, 1.7626640603, 0.0236246858], [0.0358458302, -0.0761723893, 0.9568845240]];

export function rgbToColor(rgb: Triple, a = 1, space: 'srgb' | 'p3' = 'srgb'): Color {
  const xyz = multiply(space === 'p3' ? P3_XYZ : RGB_XYZ, rgb.map(linearize) as Triple);
  const [l, m, s] = multiply([[0.819022438, 0.3619062601, -0.1288737815], [0.0329836539, 0.9292868616, 0.0361446664], [0.0481771894, 0.2642395318, 0.6335478285]], xyz).map(Math.cbrt);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(A, B);
  return { l: clamp(L), c: c < 1e-7 ? 0 : c, h: c < 1e-7 ? 0 : wrapHue(Math.atan2(B, A) * 180 / Math.PI), a: clamp(a) };
}

export function colorToRgb(color: Color, space: 'srgb' | 'p3' = 'srgb'): Triple {
  const a = color.c * Math.cos(color.h * Math.PI / 180);
  const b = color.c * Math.sin(color.h * Math.PI / 180);
  const lms: Triple = [(color.l + 0.3963377774 * a + 0.2158037573 * b) ** 3,
    (color.l - 0.1055613458 * a - 0.0638541728 * b) ** 3,
    (color.l - 0.0894841775 * a - 1.291485548 * b) ** 3];
  const xyz = multiply([[1.2268798734, -0.5578149966, 0.2813910502], [-0.0405757626, 1.1122868294, -0.0717110667], [-0.0763729497, -0.421493324, 1.5869240244]], lms);
  return multiply(space === 'p3' ? XYZ_P3 : XYZ_RGB, xyz).map(encode) as Triple;
}

export function inGamut(color: Color, space: 'srgb' | 'p3' = 'srgb'): boolean {
  return colorToRgb(color, space).every(n => n >= -0.00001 && n <= 1.00001);
}

/** Preserve lightness and hue when reducing chroma to an RGB gamut. */
export function fitGamut(color: Color, space: 'srgb' | 'p3' = 'srgb'): Color {
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

/** The right edge of the picker at a given lightness and hue. */
export function maxChroma(l: number, h: number, space: 'srgb' | 'p3' = 'srgb'): number {
  if (l <= 0 || l >= 1) return 0;
  return fitGamut({ l, c: 0.5, h, a: 1 }, space).c;
}

export function colorFormat(value: string): ColorFormat {
  const text = value.trim();
  return /^oklch\(/i.test(text) ? 'oklch' : /^color\(display-p3\s/i.test(text) ? 'p3'
    : /^rgba?\(/i.test(text) ? 'rgb' : /^hsla?\(/i.test(text) ? 'hsl' : 'hex';
}
/** The RGB gamut a format can express. OKLCH is unbounded; its picker field shows P3. */
export const formatGamut = (format: ColorFormat): 'srgb' | 'p3' => format === 'oklch' || format === 'p3' ? 'p3' : 'srgb';
const round = (v: number, digits = 4) => Number(v.toFixed(digits));
export function formatColor(color: Color, format: ColorFormat): string {
  const alpha = color.a < 1 ? ` / ${round(color.a)}` : '';
  if (format === 'oklch') return `oklch(${round(color.l)} ${round(color.c)} ${round(color.h, 2)}${alpha})`;
  if (format === 'hsl') {
    const [h, s, l] = colorChannels(color, 'hsl');
    return `hsl(${round(h, 2)} ${round(s, 2)}% ${round(l, 2)}%${alpha})`;
  }
  const rgb = colorToRgb(fitGamut(color, formatGamut(format)), formatGamut(format));
  if (format === 'p3') return `color(display-p3 ${rgb.map(n => round(clamp(n), 5)).join(' ')}${alpha})`;
  const bytes = rgb.map(n => Math.round(clamp(n) * 255));
  if (format === 'rgb') return `rgb(${bytes.join(' ')}${alpha})`;
  if (color.a < 1) bytes.push(Math.round(color.a * 255));
  return '#' + bytes.map(n => n.toString(16).padStart(2, '0')).join('');
}

export type ColorChannel = { name: string; label: string; max: number; step: number; digits: number; wrap?: boolean };
const hueChannel = (digits: number): ColorChannel => ({ name: 'H', label: 'Hue', max: 360, step: 1, digits, wrap: true });
const rgbChannels = (max: number, step: number, digits: number) => ['Red', 'Green', 'Blue'].map(label => ({ name: label[0], label, max, step, digits }));
/** The editable channels of each format, in the units its CSS uses. Ranges start at 0; hues wrap; OKLCH chroma has no upper bound. */
export const COLOR_CHANNELS: Record<Exclude<ColorFormat, 'hex'>, ColorChannel[]> = {
  rgb: rgbChannels(255, 1, 0),
  hsl: [hueChannel(0), { name: 'S', label: 'Saturation', max: 100, step: 1, digits: 0 }, { name: 'L', label: 'Lightness', max: 100, step: 1, digits: 0 }],
  oklch: [{ name: 'L', label: 'Lightness', max: 1, step: 0.01, digits: 3 }, { name: 'C', label: 'Chroma', max: Infinity, step: 0.005, digits: 3 }, hueChannel(1)],
  p3: rgbChannels(1, 0.01, 3),
};
export const clampChannel = (channel: ColorChannel, n: number) => channel.wrap ? wrapHue(n) : clamp(n, 0, channel.max);

/** A color's channel values in a format, gamut-fitted for the bounded ones. */
export function colorChannels(color: Color, format: Exclude<ColorFormat, 'hex'>): number[] {
  if (format === 'oklch') return [color.l, color.c, color.h];
  const rgb = colorToRgb(fitGamut(color, formatGamut(format)), formatGamut(format)).map(n => clamp(n));
  if (format === 'p3') return rgb;
  if (format === 'rgb') return rgb.map(n => n * 255);
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b), l = max - d / 2;
  if (d < 1e-6) return [color.h ? grayHslHue(color.h) : 0, 0, l * 100];
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [wrapHue(h * 60), Math.min(100, d / (1 - Math.abs(2 * l - 1)) * 100), l * 100];
}

/** The color of a format's channel values, each clamped to its range. */
export function channelsToColor(values: number[], format: Exclude<ColorFormat, 'hex'>, a = 1): Color {
  const [x, y, z] = values.map((n, i) => clampChannel(COLOR_CHANNELS[format][i], n));
  if (format === 'oklch') return { l: x, c: y, h: z, a: clamp(a) };
  if (format === 'hsl') return hslToColor(x, y / 100, z / 100, a);
  return format === 'rgb' ? rgbToColor([x / 255, y / 255, z / 255], a) : rgbToColor([x, y, z], a, 'p3');
}

function hslToRgb(h: number, s: number, l: number): Triple {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0), f(8), f(4)];
}

// A gray has no RGB hue, but its HSL text does. It keeps the OKLCH hue of that HSL
// hue at half saturation and lightness, where the mapping is one-to-one (at full
// saturation, a few blues share one OKLCH hue), so editing saturation does not jump to red.
const grayHue = (h: number) => rgbToColor(hslToRgb(h, 0.5, 0.5)).h;
/** The inverse of grayHue, by bisection: it increases from grayHue(0) around the circle. */
function grayHslHue(h: number): number {
  const offset = grayHue(0), target = wrapHue(h - offset);
  let lo = 0, hi = 360;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (wrapHue(grayHue(mid) - offset) < target) lo = mid;
    else hi = mid;
  }
  return lo;
}
function hslToColor(h: number, s: number, l: number, a: number): Color {
  const color = rgbToColor(hslToRgb(h, s, l), a);
  return color.c ? color : { ...color, h: grayHue(h) };
}

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(%|deg|grad|rad|turn)?$/i;
function number(value: string, percentScale = 1, hue = false): number | null {
  const match = value.match(NUMBER);
  if (!match) return null;
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return null;
  const unit = match[1]?.toLowerCase();
  if (hue) return unit === 'rad' ? n * 180 / Math.PI : unit === 'turn' ? n * 360 : unit === 'grad' ? n * 0.9 : !unit || unit === 'deg' ? n : null;
  return unit === '%' ? n * percentScale / 100 : !unit ? n : null;
}

/** Absolute hex, RGB, HSL, OKLCH and Display P3 colors; no browser/DOM dependency. */
export function parseColor(value: string): Color | null {
  const text = value.trim().toLowerCase();
  if (text === 'transparent') return { l: 0, c: 0, h: 0, a: 0 };
  if (/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/.test(text)) {
    let hex = text.slice(1);
    if (hex.length <= 4) hex = [...hex].map(c => c + c).join('');
    const bytes = hex.match(/../g)!.map(c => parseInt(c, 16) / 255);
    return rgbToColor(bytes.slice(0, 3) as Triple, bytes[3] ?? 1);
  }
  const match = text.match(/^(oklch|rgb|rgba|hsl|hsla|color)\(([^()]*)\)$/);
  if (!match) return null;
  const kind = match[1];
  let body = match[2].trim();
  const p3 = kind === 'color';
  if (p3) {
    if (!body.startsWith('display-p3 ')) return null;
    body = body.slice(11).trim();
  }
  const legacy = body.includes(',');
  if (legacy && (p3 || kind === 'oklch' || body.includes('/'))) return null;
  const parts = legacy ? body.split(',').map(x => x.trim()) : body.split(/\s*\/\s*/);
  if (!legacy && parts.length > 2) return null;
  const channels = legacy ? parts.slice(0, 3) : parts[0].split(/\s+/);
  if (channels.length !== 3 || (legacy && parts.length !== 3 && parts.length !== 4)) return null;
  if (legacy && kind.startsWith('rgb') && channels.some(c => c.endsWith('%')) && !channels.every(c => c.endsWith('%'))) return null;
  const alphaText = legacy ? parts[3] : parts[1];
  const alpha = alphaText === undefined ? 1 : number(alphaText);
  if (alpha === null) return null;
  if (kind === 'oklch') {
    const l = number(channels[0]);
    const c = number(channels[1], 0.4);
    const h = number(channels[2], 1, true);
    return l === null || c === null || h === null ? null : { l: clamp(l), c: Math.max(0, c), h: wrapHue(h), a: clamp(alpha) };
  }
  if (kind.startsWith('hsl')) {
    const h = number(channels[0], 1, true);
    const s = number(channels[1]);
    const l = number(channels[2]);
    if (h === null || s === null || l === null || !channels[1].endsWith('%') || !channels[2].endsWith('%')) return null;
    return hslToColor(wrapHue(h), clamp(s), clamp(l), alpha);
  }
  const values = channels.map(c => number(c, p3 ? 1 : 255));
  if (values.some(n => n === null)) return null;
  return rgbToColor(values.map(n => p3 ? n! : clamp(n! / 255)) as Triple, alpha, p3 ? 'p3' : 'srgb');
}
