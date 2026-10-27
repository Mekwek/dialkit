"use strict";
var DialKit = (() => {
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

  // src/vanilla/index.ts
  var vanilla_exports = {};
  __export(vanilla_exports, {
    AnchorControl: () => mountAnchorControl,
    BackgroundControl: () => mountBackgroundControl,
    ButtonGroup: () => mountButtonGroup,
    ColorControl: () => mountColorControl,
    ControlRenderer: () => mountControlRenderer,
    DialPad: () => mountDialPad,
    DialRoot: () => DialRoot,
    DialStore: () => DialStore,
    DialTimeline: () => DialTimeline,
    EasingVisualization: () => mountEasingVisualization,
    Folder: () => mountFolder,
    ImageControl: () => mountImageControl,
    PresetManager: () => mountPresetManager,
    SegmentedControl: () => mountSegmentedControl,
    SelectControl: () => mountSelectControl,
    ShortcutsMenu: () => mountShortcutsMenu,
    Slider: () => mountSlider,
    SpringControl: () => mountSpringControl,
    SpringVisualization: () => mountSpringVisualization,
    TextControl: () => mountTextControl,
    TimelineStore: () => TimelineStore,
    Toggle: () => mountToggle,
    TransitionControl: () => mountTransitionControl,
    VersionGallery: () => mountVersionGallery,
    backgroundGradientCss: () => backgroundGradientCss,
    backgroundMediaCss: () => backgroundMediaCss,
    createDialKit: () => createDialKit,
    createDialKitController: () => createDialKitController,
    createDialRoot: () => createDialRoot,
    createDialTimeline: () => createDialTimeline,
    createDialTimelineRoot: () => createDialTimelineRoot,
    formatClock: () => formatClock,
    mountAnchorControl: () => mountAnchorControl,
    mountBackgroundControl: () => mountBackgroundControl,
    mountButtonGroup: () => mountButtonGroup,
    mountColorControl: () => mountColorControl,
    mountControlRenderer: () => mountControlRenderer,
    mountDialPad: () => mountDialPad,
    mountEasingVisualization: () => mountEasingVisualization,
    mountFolder: () => mountFolder,
    mountImageControl: () => mountImageControl,
    mountPresetManager: () => mountPresetManager,
    mountSegmentedControl: () => mountSegmentedControl,
    mountSelectControl: () => mountSelectControl,
    mountShortcutListener: () => mountShortcutListener,
    mountShortcutsMenu: () => mountShortcutsMenu,
    mountSlider: () => mountSlider,
    mountSpringControl: () => mountSpringControl,
    mountSpringVisualization: () => mountSpringVisualization,
    mountTextControl: () => mountTextControl,
    mountToggle: () => mountToggle,
    mountTransitionControl: () => mountTransitionControl,
    mountVersionGallery: () => mountVersionGallery,
    paintGradient: () => paintGradient,
    withVisibility: () => withVisibility
  });

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
  var clampChannel = (channel, n) => channel.wrap ? wrapHue(n) : clamp(n, 0, channel.max);
  function colorChannels(color, format) {
    if (format === "oklch") return [color.l, color.c, color.h];
    const rgb = colorToRgb(fitGamut(color, formatGamut(format)), formatGamut(format)).map((n) => clamp(n));
    if (format === "p3") return rgb;
    if (format === "rgb") return rgb.map((n) => n * 255);
    const max = Math.max(...rgb), d = max - Math.min(...rgb), l = max - d / 2;
    if (d < 1e-6) return [color.h ? grayHslHue(color.h) : 0, 0, l * 100];
    return [rgbHue(rgb, max, d), Math.min(100, d / (1 - Math.abs(2 * l - 1)) * 100), l * 100];
  }
  function colorToHsv(color, space = "srgb") {
    const rgb = colorToRgb(fitGamut(color, space), space).map((n) => clamp(n));
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
    if (format === "oklch") return { l: x, c: y, h: z, a: clamp(a) };
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
      x: snapPadAxis(horizontal.min + x * (horizontal.max - horizontal.min), horizontal),
      y: snapPadAxis(vertical.max - y * (vertical.max - vertical.min), vertical)
    };
  }
  function padValueFromKey(value, key, shift, config = {}) {
    const axis = key === "ArrowLeft" || key === "ArrowRight" ? "x" : key === "ArrowUp" || key === "ArrowDown" ? "y" : void 0;
    if (!axis) return void 0;
    const range = resolvePadAxis(config[axis]);
    const direction = key === "ArrowRight" || key === "ArrowUp" ? 1 : -1;
    return { ...value, [axis]: snapPadAxis(value[axis] + direction * range.step * (shift ? 10 : 1), range) };
  }
  function padValueFromDrag(value, distance, shift, config) {
    const axis = resolvePadAxis(config);
    return Math.max(axis.min, Math.min(axis.max, value + distance * axis.step * (shift ? 10 : 1)));
  }
  function padAxisLabel(label, name) {
    const axis = name.toLowerCase();
    const pad = label.toLowerCase();
    return axis === pad || axis.startsWith(`${pad} `) ? name : `${label} ${name}`;
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
  function anchorLabel({ x, y }) {
    const text = x === "center" && y === "center" ? "center" : `${y} ${x}`;
    return text[0].toUpperCase() + text.slice(1);
  }
  function anchorValueFromKey(value, key) {
    const column = ANCHOR_COLUMNS.indexOf(value.x);
    const row = ANCHOR_ROWS.indexOf(value.y);
    const vertical = key === "ArrowUp" || key === "ArrowDown";
    const horizontal = key === "ArrowLeft" || key === "ArrowRight";
    const nextColumn = vertical ? column : optionKeyIndex(key, column, ANCHOR_COLUMNS.length);
    const nextRow = horizontal ? row : optionKeyIndex(key, row, ANCHOR_ROWS.length);
    if (nextColumn === void 0 || nextRow === void 0) return void 0;
    return { x: ANCHOR_COLUMNS[nextColumn], y: ANCHOR_ROWS[nextRow] };
  }

  // src/easing-geometry.ts
  var clampY = (value) => Math.max(-1, Math.min(2, value));
  var easingPresets = {
    linear: [0, 0, 1, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1]
  };
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
      const finite2 = Number.isFinite(value) ? value : index < 2 ? 0 : 1;
      return index % 2 === 0 ? Math.max(0, Math.min(1, finite2)) : finite2;
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
  function scaleEase(ease, scale) {
    const k = Math.max(0, scale);
    if (k === 1) return [...ease];
    const [x1, y1, x2, y2] = ease;
    const x = (value) => Number(Math.max(0, Math.min(1, value)).toFixed(3));
    const y = (value) => Number(Math.max(-1, Math.min(2, value)).toFixed(3));
    return [x(k * x1), y(k * y1), x(1 + k * (x2 - 1)), y(1 + k * (y2 - 1))];
  }
  function createEaseIntensity() {
    let base = [0, 0, 1, 1];
    let shown;
    let percent = 50;
    const read = (ease) => {
      if (!shown || shown.some((part, index) => part !== ease[index])) {
        base = [...ease];
        shown = [...ease];
        percent = 50;
      }
      return percent;
    };
    return {
      read,
      /** The curve at `next` percent, each coordinate within its range. */
      apply(ease, next) {
        read(ease);
        percent = Math.max(0, Math.min(Math.round(next), 100));
        shown = scaleEase(base, percent / 50);
        return [...shown];
      }
    };
  }

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
  var TRANSITION_HINTS = {
    presets: "Ready-made curves to pick from, and the ones you saved.",
    intensity: "How strong the curve is. 50 is the curve itself, 0 is a straight line."
  };
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
  var close = (a, b) => a !== void 0 && b !== void 0 && Math.abs(a - b) < 5e-3;
  function sameTransition(a, b, mode) {
    if (mode === "easing") {
      return a.type === "easing" && b.type === "easing" && a.ease.every((part, index) => close(part, b.ease[index]));
    }
    if (a.type !== "spring" || b.type !== "spring") return false;
    const keys = mode === "simple" ? ["visualDuration", "bounce"] : ["stiffness", "damping", "mass"];
    return keys.every((key) => close(a[key], b[key]));
  }
  function transitionPresetName(value, mode, saved) {
    const matches = (preset) => sameTransition(preset.value, value, mode);
    return defaultTransitionPresets(mode).find(matches)?.name ?? saved.find((preset) => preset.mode === mode && matches(preset))?.name ?? "Custom";
  }
  function applyTransitionPreset(current2, preset, mode) {
    if (mode === "easing") {
      const duration = current2.type === "easing" ? current2.duration : 0.3;
      return { type: "easing", duration, ease: [...preset.ease] };
    }
    const spring = preset;
    return mode === "simple" ? { type: "spring", visualDuration: spring.visualDuration, bounce: spring.bounce } : { type: "spring", stiffness: spring.stiffness, damping: spring.damping, mass: spring.mass };
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
    return stops.map((stop3, i) => ({ stop: stop3, i })).sort((a, b) => a.stop.at - b.stop.at || a.i - b.i).map(({ stop: stop3 }) => stop3);
  }
  function normalizeGradient(value, fallback = defaultBackgroundValue().gradient) {
    const input = isRecord(value) ? value : {};
    const shape = oneOf2(GRADIENT_SHAPES, input.shape, fallback.shape);
    const handles = isRecord(input.handles) ? input.handles : {};
    const base = isRecord(input.handles) ? fallback.handles : switchGradientShape(fallback, shape).handles;
    const stops = Array.isArray(input.stops) ? input.stops.filter((stop3) => isRecord(stop3) && finite(stop3.at) && validColor(stop3.color)).map((stop3) => ({ at: round2(clamp(stop3.at, 0, 100), 2), color: stop3.color.trim() })) : [];
    return {
      shape,
      handles: {
        start: normalizePoint(handles.start, base.start),
        end: normalizePoint(handles.end, base.end),
        width: normalizePoint(handles.width, base.width)
      },
      stops: stops.length >= MIN_GRADIENT_STOPS ? capStops(sortStops(stops)) : fallback.stops.map((stop3) => ({ ...stop3 }))
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
      zoom: finite(input.zoom) ? round2(clamp(input.zoom, MEDIA_ZOOM.min, MEDIA_ZOOM.max), 1) : fallback.zoom,
      tileSize: finite(input.tileSize) ? round2(clamp(input.tileSize, MEDIA_TILE_SIZE.min, MEDIA_TILE_SIZE.max), 2) : fallback.tileSize,
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
    return a.shape === b.shape && point(a.handles.start, b.handles.start) && point(a.handles.end, b.handles.end) && point(a.handles.width, b.handles.width) && a.stops.length === b.stops.length && a.stops.every((stop3, i) => stop3.at === b.stops[i].at && stop3.color === b.stops[i].color);
  }
  function sameBackgroundValue(a, b) {
    const p = a.mediaDisplay;
    const q = b.mediaDisplay;
    return a.mode === b.mode && a.color === b.color && sameGradient(a.gradient, b.gradient) && a.media?.src === b.media?.src && a.media?.kind === b.media?.kind && p.fit === q.fit && p.ratio === q.ratio && p.zoom === q.zoom && p.tileSize === q.tileSize && p.position.x === q.position.x && p.position.y === q.position.y;
  }
  function cloneGradient(gradient) {
    const { start, end, width } = gradient.handles;
    return { shape: gradient.shape, handles: { start: { ...start }, end: { ...end }, width: { ...width } }, stops: gradient.stops.map((stop3) => ({ ...stop3 })) };
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
    const colors = stops.map((stop3) => stop3.color);
    const [color] = colors.splice(from, 1);
    colors.splice(clamp(to, 0, colors.length), 0, color);
    return stops.map((stop3, i) => ({ at: stop3.at, color: colors[i] }));
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
    const after = stops.findIndex((stop3) => stop3.at > at);
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
    return { shape: "linear", handles: { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0, y: 1 } }, stops: stops.map((stop3) => ({ ...stop3 })) };
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
    const list = (stops) => stops.map((stop3) => `${stop3.color} ${round2(stop3.at, 2)}%`).join(", ");
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
      return `linear-gradient(${round2(angle, 2)}deg, ${list(gradient.stops.map((stop3) => ({ ...stop3, at: along(stop3.at / 100) })))})`;
    }
    if (gradient.shape === "angular") {
      const clockwise = frame.ax * frame.ny - frame.ay * frame.nx > 0;
      const stops = clockwise ? gradient.stops : gradient.stops.map((stop3) => ({ ...stop3, at: 100 - stop3.at })).reverse();
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
      const active2 = activeId ? this.presets.get(panelId)?.find((preset) => preset.id === activeId) : void 0;
      const target = activeId ? active2?.locked ? void 0 : active2?.values : this.baseValues.get(panelId);
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
        const listeners2 = this.listeners.get(panelId);
        listeners2?.delete(listener);
        if (listeners2?.size === 0 && !this.panels.has(panelId)) {
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
        const listeners2 = this.actionListeners.get(panelId);
        listeners2?.delete(listener);
        if (listeners2?.size === 0 && !this.panels.has(panelId)) {
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
          const hint2 = hints?.[key];
          if (typeof hint2 === "string" && hint2) control.hint = hint2;
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

  // src/vanilla/createDialKit.ts
  var nextId = 0;
  function createDialKit(name, config, options = {}) {
    const id = options.id ?? `vanilla-${name}-${++nextId}`;
    let currentConfig = config;
    let destroyed = false;
    const subscriptions = /* @__PURE__ */ new Set();
    const registration = { retainOnUnmount: options.id !== void 0, persist: options.persist, defaultCollapsed: options.defaultCollapsed };
    const getValues = () => resolveDialValues(currentConfig, DialStore.getValues(id));
    DialStore.registerPanel(id, name, currentConfig, options.shortcuts, registration);
    const stopActions = options.onAction ? DialStore.subscribeActions(id, options.onAction) : void 0;
    return {
      id,
      get values() {
        return getValues();
      },
      getValues,
      setValue(path, value) {
        if (!destroyed)
          DialStore.updateValue(id, path, value);
      },
      setValues(values) {
        if (!destroyed)
          DialStore.updateValues(id, flattenDialValueUpdates(currentConfig, values));
      },
      resetValues() {
        if (!destroyed)
          DialStore.resetValues(id);
      },
      setOpen(open) {
        if (!destroyed)
          DialStore.setPanelOpen(id, open);
      },
      getOpen() {
        return DialStore.getPanelOpen(id);
      },
      subscribe(listener, immediate = true) {
        if (destroyed)
          return () => {
          };
        const stop3 = DialStore.subscribe(id, () => listener(getValues()));
        const unsubscribe = () => {
          stop3();
          subscriptions.delete(unsubscribe);
        };
        subscriptions.add(unsubscribe);
        if (immediate)
          listener(getValues());
        return unsubscribe;
      },
      updateConfig(next) {
        if (destroyed)
          return;
        currentConfig = next;
        DialStore.updatePanel(id, name, currentConfig, options.shortcuts, registration);
      },
      destroy() {
        if (destroyed)
          return;
        destroyed = true;
        subscriptions.forEach((stop3) => stop3());
        stopActions?.();
        DialStore.unregisterPanel(id);
      }
    };
  }
  var createDialKitController = createDialKit;

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
      /** Loop toggled in the dock, kept across updates until the authored
       * option turns looping on or off. */
      this.loopToggles = /* @__PURE__ */ new Map();
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
      this.loopToggles.delete(id);
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
    /** Turns looping on or off. A `{ from }` loop keeps its start, so turning
     * it back on wraps to the same time. */
    setLoop(id, loop) {
      const meta = this.timelines.get(id);
      if (!meta || meta.loop === loop) return;
      const authored = this.loopToggles.get(id)?.authored ?? meta.loop;
      if (loop === authored) this.loopToggles.delete(id);
      else this.loopToggles.set(id, { authored, loop });
      this.timelines.set(id, { ...meta, loop });
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
        const listeners2 = this.listeners.get(id);
        listeners2?.delete(listener);
        if (listeners2?.size === 0 && !this.timelines.has(id)) {
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
      const toggle = this.loopToggles.get(meta.id);
      if (toggle && toggle.authored !== meta.loop) this.loopToggles.delete(meta.id);
      const loop = this.loopToggles.get(meta.id)?.loop ?? meta.loop;
      const safeMeta = { ...meta, duration, loop, loopStart };
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
      const current2 = this.getVisible();
      if (current2 === visible) return;
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

  // src/pointer-focus.ts
  var MODIFIERS = /* @__PURE__ */ new Set(["Alt", "Control", "Meta", "Shift"]);
  var observers = 0;
  var fromPointer = false;
  var unobserve;
  function fitSliderInput(target) {
    const input = target;
    if (input?.classList?.contains("dialkit-slider-input")) input.style.width = `${Math.max(input.value.length, 1)}ch`;
  }
  function observePointerFocus() {
    if (typeof document === "undefined") return () => {
    };
    if (observers++ === 0) {
      const pointerDown = () => {
        fromPointer = true;
      };
      const keyDown = (event) => {
        if (!MODIFIERS.has(event.key)) fromPointer = false;
      };
      const focusIn = (event) => {
        const target = event.target;
        if (fromPointer && target.closest?.(".dialkit-root")) target.setAttribute("data-pointer-focus", "");
        fitSliderInput(target);
      };
      const input = (event) => fitSliderInput(event.target);
      const click = (event) => {
        const header = event.target.closest?.(".dialkit-root .dialkit-folder-header-top");
        if (event.detail > 0 && header && header === document.activeElement) header.blur();
      };
      const focusOut = (event) => {
        const target = event.target;
        if (target !== document.activeElement) target.removeAttribute?.("data-pointer-focus");
      };
      document.addEventListener("pointerdown", pointerDown, true);
      document.addEventListener("keydown", keyDown, true);
      document.addEventListener("focusin", focusIn, true);
      document.addEventListener("focusout", focusOut, true);
      document.addEventListener("input", input, true);
      document.addEventListener("click", click, true);
      unobserve = () => {
        document.removeEventListener("pointerdown", pointerDown, true);
        document.removeEventListener("keydown", keyDown, true);
        document.removeEventListener("focusin", focusIn, true);
        document.removeEventListener("focusout", focusOut, true);
        document.removeEventListener("input", input, true);
        document.removeEventListener("click", click, true);
        fromPointer = false;
      };
    }
    let observing = true;
    return () => {
      if (!observing) return;
      observing = false;
      if (--observers === 0) {
        unobserve?.();
        unobserve = void 0;
      }
    };
  }

  // src/accordion.ts
  function getDefaultOpenFolder(controls) {
    return controls.find((control) => control.type === "folder" && (control.defaultOpen ?? true))?.path ?? null;
  }
  function pruneOpenFolders(openFolders, ids) {
    const kept = Object.entries(openFolders).filter(([id]) => ids.includes(id));
    return kept.length === Object.keys(openFolders).length ? openFolders : Object.fromEntries(kept);
  }
  function resolveOpenFolder(controls, openFolder) {
    if (openFolder === null) return null;
    if (openFolder !== void 0 && controls.some((control) => control.type === "folder" && control.path === openFolder)) return openFolder;
    return getDefaultOpenFolder(controls);
  }

  // src/hints.ts
  var HINT_KEY = "h";
  var TIP_KEY = "dialkit-hint-tip-seen";
  var GAP = 6;
  var MARGIN = 8;
  var FADE_MS = 120;
  var FOCUSABLE = "button, input, select, textarea, [tabindex]";
  var ALIGN = ".dialkit-panel-toolbar, .dialkit-panel-section-toolbar";
  var HINTS = {
    panel: "Closes the panel to a small button. Click the button to open it again.",
    copy: "Copies the panel's values as text, ready to paste into code.",
    sectionReset: "Sets every control in this section back to its default.",
    saveVersion: "Saves the current values as a new version, with a picture of the page.",
    version: "Switches to this version. Double-click its name to rename it.",
    deleteVersion: "Deletes this version.",
    allVersions: "Shows every version side by side. Click one to switch to it.",
    transitionType: "Easing: a curve over a set duration. Time: a spring set by its duration and bounce. Physics: a spring set by its stiffness, damping and mass.",
    easingDuration: "How long the curve takes, in seconds.",
    springDuration: "How long the spring takes to settle, in seconds.",
    bounce: "How far the motion overshoots and swings back. 0 has no bounce.",
    stiffness: "How hard the spring pulls toward its target. Higher is faster.",
    damping: "How fast the spring slows down. Lower swings more.",
    mass: "How heavy the moving thing is. Higher is slower and swings more.",
    colorPlane: "Drag to change how light and how strong the color is.",
    colorHue: "Drag to change the hue.",
    colorOpacity: "Drag to change how see-through the color is.",
    imageUpload: "Adds an image from your computer.",
    imageClear: "Removes the image."
  };
  function versionHints(noun = "version") {
    return {
      versions: `Switches to another ${noun}. Rename, lock or delete a ${noun} from the list.`,
      versionActions: `Shows rename, lock and delete for this ${noun}.`
    };
  }
  var TIMELINE_HINTS = {
    play: "Plays or pauses the sequence.",
    replay: "Plays the sequence again from the start.",
    loop: "Loops the sequence endlessly.",
    toggle: "Opens or closes the timeline's tracks.",
    ruler: "Drag to move the playhead. Option-drag or Option-scroll to zoom. Shift-click resets the zoom.",
    playhead: "The current time. Drag to scrub.",
    copy: "Copies the sequence's values as text, ready to paste into code.",
    resize: "Drag to make the timeline taller or shorter.",
    overview: "Drag to move through the whole sequence.",
    closeEditor: "Closes the clip editor."
  };
  var HintStoreClass = class {
    constructor() {
      this.tipSeen = false;
      this.listeners = /* @__PURE__ */ new Set();
    }
    /** True once a hint has shown in this browser, and on the server. */
    isTipSeen() {
      if (this.tipSeen || typeof window === "undefined") return true;
      try {
        return window.localStorage.getItem(TIP_KEY) === "1";
      } catch {
        return false;
      }
    }
    /** Called when the key is released after a hint: the tip has done its job. */
    markTipSeen() {
      if (this.tipSeen) return;
      this.tipSeen = true;
      try {
        window.localStorage.setItem(TIP_KEY, "1");
      } catch {
      }
      this.notify();
    }
    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    notify() {
      this.listeners.forEach((listener) => listener());
    }
  };
  var HintStore = /* @__PURE__ */ new HintStoreClass();
  function isEditable(target) {
    const el = target;
    return !!el && (el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
  }
  function isHintKey(event) {
    if (event.key?.toLowerCase() !== HINT_KEY) return false;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
    if (isEditable(event.target)) return false;
    return !DialStore.resolveShortcutTarget(HINT_KEY);
  }
  function getHintPosition(row, root, size, viewport) {
    const above = row.top - GAP - size.height >= MARGIN;
    const left = Math.max(MARGIN, Math.min(row.left, viewport.width - size.width - MARGIN));
    const y = above ? row.top - GAP : row.bottom + GAP;
    return { left: left - root.left, y: y - root.top, above };
  }
  var DIM_AREAS = [
    ".dialkit-color-popover",
    ".dialkit-image-popover",
    ".dialkit-timeline-popover",
    ".dialkit-background-popover",
    ".dialkit-background-shape-menu",
    ".dialkit-panel-inner",
    ".dialkit-folder-root",
    ".dialkit-timeline-dock"
  ];
  function areaOf(row) {
    for (const selector of DIM_AREAS) {
      const area = row.closest(selector);
      if (area) return area;
    }
    if (row.closest('[role="menu"], [role="listbox"]')) return null;
    return row.closest(".dialkit-root");
  }
  function radiusOf(element10, variable) {
    if (typeof getComputedStyle !== "function") return 0;
    const style = getComputedStyle(element10);
    return Number.parseFloat(variable ? style.getPropertyValue(variable) : style.borderTopLeftRadius) || 0;
  }
  function scaleOf(element10) {
    const box = element10.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = element10;
    return {
      x: width && Math.abs(box.width - width) >= 1 ? box.width / width : 1,
      y: height && Math.abs(box.height - height) >= 1 ? box.height / height : 1
    };
  }
  var users = 0;
  var stop;
  function mountHints() {
    if (typeof document === "undefined") return { destroy() {
    } };
    if (users++ === 0) stop ?? (stop = listen());
    let destroyed = false;
    return {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        if (--users === 0) queueMicrotask(() => {
          if (users > 0) return;
          stop?.();
          stop = void 0;
        });
      }
    };
  }
  var rows = /* @__PURE__ */ new WeakMap();
  function setHint(row, hint2) {
    if (hint2) row.dataset.hint = hint2;
    else delete row.dataset.hint;
    const hints = rows.get(row);
    if (hint2 && !hints) rows.set(row, mountHints());
    else if (!hint2 && hints) {
      hints.destroy();
      rows.delete(row);
    }
  }
  function listen() {
    const tooltip = document.createElement("div");
    tooltip.className = "dialkit-hint";
    tooltip.id = "dialkit-hint";
    tooltip.setAttribute("role", "tooltip");
    const dim = document.createElement("div");
    dim.className = "dialkit-hint-dim";
    dim.setAttribute("aria-hidden", "true");
    const hole = document.createElement("div");
    hole.className = "dialkit-hint-dim-hole";
    dim.append(hole);
    const layer2 = document.createElement("div");
    layer2.className = "dialkit-hint-layer";
    layer2.append(dim, tooltip);
    const topLayer = typeof layer2.showPopover === "function";
    if (topLayer) layer2.setAttribute("popover", "manual");
    const raise = () => {
      if (!topLayer || !layer2.isConnected) return;
      if (layer2.matches(":popover-open")) layer2.hidePopover();
      layer2.showPopover();
    };
    let held = false;
    let hinted = false;
    let hovered = null;
    let shown = null;
    let area = null;
    let described = null;
    let fading;
    const observer = new ResizeObserver(() => place());
    const mutations = new MutationObserver(() => shown?.dataset.hint ? show(shown) : hide());
    const rowOf = (target) => {
      if (!(target instanceof Element)) return null;
      const row = target.closest("[data-hint]");
      const menu = target.closest('[role="menu"], [role="listbox"]');
      if (menu && !(row && menu.contains(row))) {
        const trigger = menu.id ? document.querySelector(`[aria-controls="${menu.id}"]`) : null;
        return trigger && !menu.contains(trigger) ? rowOf(trigger) : null;
      }
      return row?.closest(".dialkit-root") ? row : null;
    };
    const describe = (row) => {
      const active2 = document.activeElement;
      const target = active2 instanceof HTMLElement && row.contains(active2) ? active2 : row.matches(FOCUSABLE) ? row : row.querySelector(FOCUSABLE);
      if (!target) return;
      described = target;
      const ids = target.getAttribute("aria-describedby");
      target.setAttribute("aria-describedby", ids ? `${ids} ${tooltip.id}` : tooltip.id);
    };
    const undescribe = () => {
      if (!described) return;
      const ids = described.getAttribute("aria-describedby")?.split(" ").filter((id) => id !== tooltip.id).join(" ");
      if (ids) described.setAttribute("aria-describedby", ids);
      else described.removeAttribute("aria-describedby");
      described = null;
    };
    const place = () => {
      if (!shown) return;
      if (!shown.isConnected || !layer2.parentElement) return hide();
      const scale = topLayer ? scaleOf(area ?? shown) : { x: 1, y: 1 };
      layer2.style.transform = scale.x === 1 && scale.y === 1 ? "" : `scale(${scale.x}, ${scale.y})`;
      const origin = layer2.getBoundingClientRect();
      const box = shown.getBoundingClientRect();
      const { left, y, above } = getHintPosition(
        { left: shown.closest(ALIGN)?.getBoundingClientRect().left ?? box.left, top: box.top, bottom: box.bottom },
        origin,
        { width: tooltip.offsetWidth * scale.x, height: tooltip.offsetHeight * scale.y },
        { width: window.innerWidth, height: window.innerHeight }
      );
      const x = left / scale.x;
      const top = y / scale.y;
      tooltip.style.translate = above ? `${x}px calc(${top}px - 100%)` : `${x}px ${top}px`;
      tooltip.toggleAttribute("data-below", !above);
      if (!area) return;
      const outer = area.getBoundingClientRect();
      Object.assign(dim.style, {
        left: `${(outer.left - origin.left) / scale.x}px`,
        top: `${(outer.top - origin.top) / scale.y}px`,
        width: `${outer.width / scale.x}px`,
        height: `${outer.height / scale.y}px`,
        borderRadius: `${radiusOf(area)}px`
      });
      Object.assign(hole.style, {
        transform: `translate(${(box.left - outer.left) / scale.x}px, ${(box.top - outer.top) / scale.y}px)`,
        width: `${box.width / scale.x}px`,
        height: `${box.height / scale.y}px`,
        // A row can be square while the control in it is rounded: then the
        // controls' radius.
        borderRadius: `${radiusOf(shown) || radiusOf(shown, "--dial-radius")}px`
      });
    };
    const settleDim = () => {
      clearTimeout(fading);
      fading = void 0;
      dim.removeAttribute("data-leaving");
    };
    const show = (row) => {
      const text = row.dataset.hint;
      if (!text) return;
      settleDim();
      if (row !== shown) {
        shown?.removeAttribute("data-hint-shown");
        undescribe();
        const root = row.closest(".dialkit-root");
        if (layer2.parentElement !== root) {
          tooltip.removeAttribute("data-open");
          dim.removeAttribute("data-open");
          root.append(layer2);
          raise();
        }
        const next = areaOf(row);
        if (next !== area) {
          area?.removeAttribute("data-hinting");
          dim.removeAttribute("data-open");
        }
        area = next;
        shown = row;
        row.setAttribute("data-hint-shown", "");
        describe(row);
        observer.disconnect();
        mutations.disconnect();
        mutations.observe(row, { attributes: true, attributeFilter: ["data-hint"] });
        for (const box of [row, row.closest(".dialkit-folder-root") ?? root, row.closest(".dialkit-panel-inner"), area]) {
          if (box) observer.observe(box);
        }
      }
      tooltip.textContent = text;
      place();
      if (!tooltip.hasAttribute("data-open")) {
        tooltip.getBoundingClientRect();
        tooltip.setAttribute("data-open", "");
      }
      if (area && !dim.hasAttribute("data-open")) {
        hole.getBoundingClientRect();
        dim.setAttribute("data-open", "");
      }
      area?.setAttribute("data-hinting", "");
      hinted = true;
    };
    const hide = () => {
      if (!shown) return;
      shown.removeAttribute("data-hint-shown");
      undescribe();
      observer.disconnect();
      mutations.disconnect();
      tooltip.removeAttribute("data-open");
      if (dim.hasAttribute("data-open")) {
        dim.removeAttribute("data-open");
        dim.setAttribute("data-leaving", "");
        fading = setTimeout(settleDim, FADE_MS);
      }
      area?.removeAttribute("data-hinting");
      shown = null;
      area = null;
    };
    const release = () => {
      if (!held) return;
      held = false;
      hide();
      if (hinted) HintStore.markTipSeen();
      hinted = false;
    };
    const handleKeyDown = (event) => {
      if (held || !isHintKey(event)) return;
      held = true;
      const row = (hovered?.isConnected ? hovered : null) ?? rowOf(document.activeElement);
      if (row) show(row);
    };
    const handleKeyUp = (event) => {
      if (event.key?.toLowerCase() === HINT_KEY) release();
    };
    const handlePointerOver = (event) => {
      hovered = rowOf(event.target);
      if (!held) return;
      if (hovered) show(hovered);
      else if (!(event.target instanceof Node && shown && (shown.closest(".dialkit-panel") ?? area)?.contains(event.target))) hide();
    };
    const handlePointerOut = (event) => {
      if (event.relatedTarget) return;
      hovered = null;
      hide();
    };
    const handleFocusIn = (event) => {
      const row = rowOf(event.target);
      if (held && row) show(row);
    };
    const handleToggle = (event) => {
      if (event.target !== layer2 && event.newState === "open" && layer2.matches(":popover-open")) raise();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") release();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", release);
    window.addEventListener("resize", place);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("pointerover", handlePointerOver);
    document.addEventListener("pointerout", handlePointerOut);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("scroll", place, { capture: true, passive: true });
    if (topLayer) document.addEventListener("toggle", handleToggle, true);
    return () => {
      release();
      settleDim();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", release);
      window.removeEventListener("resize", place);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("pointerover", handlePointerOver);
      document.removeEventListener("pointerout", handlePointerOut);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("scroll", place, { capture: true });
      document.removeEventListener("toggle", handleToggle, true);
      observer.disconnect();
      mutations.disconnect();
      layer2.remove();
    };
  }

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
  var ICON_LOOP = [
    "M17 2L21 6L17 10",
    "M3 11V10C3 7.79086 4.79086 6 7 6H21",
    "M7 22L3 18L7 14",
    "M21 13V14C21 16.2091 19.2091 18 17 18H3"
  ];
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
  var ICON_COPY = [
    "M9 11a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2z",
    "M5 15a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2"
  ];
  var ICON_PASTE = [
    "M9 3h6v3H9z",
    "M15 4.5h2a2 2 0 0 1 2 2V10",
    "M9 4.5H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h4",
    "M14 16h7",
    "m18 13 3 3-3 3"
  ];
  var ICON_TRASH = [
    "M5 6.5L5.80734 18.2064C5.91582 19.7794 7.22348 21 8.80023 21H15.1998C16.7765 21 18.0842 19.7794 18.1927 18.2064L19 6.5",
    "M10 11V16",
    "M14 11V16",
    "M3.5 6H20.5",
    "M8.07092 5.74621C8.42348 3.89745 10.0485 2.5 12 2.5C13.9515 2.5 15.5765 3.89745 15.9291 5.74621"
  ];
  var ICON_MORE = ["M5 12h.01", "M12 12h.01", "M19 12h.01"];
  var ICON_PENCIL = [
    "M12 20H21",
    "M16.5 3.5C17.3284 2.67157 18.6716 2.67157 19.5 3.5C20.3284 4.32843 20.3284 5.67157 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
  ];
  var ICON_LOCK = [
    "M6 11H18C18.5523 11 19 11.4477 19 12V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V12C5 11.4477 5.44772 11 6 11Z",
    "M7 11V7a5 5 0 0 1 10 0v4"
  ];
  var ICON_LOCK_OPEN = [
    ICON_LOCK[0],
    "M7 11V7a5 5 0 0 1 9.9-1"
  ];
  var ICON_RESET = ["M4.5 12a7.5 7.5 0 1 0 2.2-5.3", "M4.5 4.5v3.75h3.75"];
  var ICON_PANEL = {
    path: "M6.84766 11.75C6.78583 11.9899 6.75 12.2408 6.75 12.5C6.75 12.7592 6.78583 13.0101 6.84766 13.25H2C1.58579 13.25 1.25 12.9142 1.25 12.5C1.25 12.0858 1.58579 11.75 2 11.75H6.84766ZM14 11.75C14.4142 11.75 14.75 12.0858 14.75 12.5C14.75 12.9142 14.4142 13.25 14 13.25H12.6523C12.7142 13.0101 12.75 12.7592 12.75 12.5C12.75 12.2408 12.7142 11.9899 12.6523 11.75H14ZM3.09766 7.25C3.03583 7.48994 3 7.74075 3 8C3 8.25925 3.03583 8.51006 3.09766 8.75H2C1.58579 8.75 1.25 8.41421 1.25 8C1.25 7.58579 1.58579 7.25 2 7.25H3.09766ZM14 7.25C14.4142 7.25 14.75 7.58579 14.75 8C14.75 8.41421 14.4142 8.75 14 8.75H8.90234C8.96417 8.51006 9 8.25925 9 8C9 7.74075 8.96417 7.48994 8.90234 7.25H14ZM7.59766 2.75C7.53583 2.98994 7.5 3.24075 7.5 3.5C7.5 3.75925 7.53583 4.01006 7.59766 4.25H2C1.58579 4.25 1.25 3.91421 1.25 3.5C1.25 3.08579 1.58579 2.75 2 2.75H7.59766ZM14 2.75C14.4142 2.75 14.75 3.08579 14.75 3.5C14.75 3.91421 14.4142 4.25 14 4.25H13.4023C13.4642 4.01006 13.5 3.75925 13.5 3.5C13.5 3.24075 13.4642 2.98994 13.4023 2.75H14Z",
    circles: [
      { cx: "6", cy: "8", r: "0.998596" },
      { cx: "10.4999", cy: "3.5", r: "0.998657" },
      { cx: "9.75015", cy: "12.5", r: "0.997986" }
    ]
  };
  var ICON_GRID = [
    "M4 6.5C4 5.11929 5.11929 4 6.5 4H8.5C9.88071 4 11 5.11929 11 6.5V8.5C11 9.88071 9.88071 11 8.5 11H6.5C5.11929 11 4 9.88071 4 8.5V6.5Z",
    "M13 6.5C13 5.11929 14.1193 4 15.5 4H17.5C18.8807 4 20 5.11929 20 6.5V8.5C20 9.88071 18.8807 11 17.5 11H15.5C14.1193 11 13 9.88071 13 8.5V6.5Z",
    "M4 15.5C4 14.1193 5.11929 13 6.5 13H8.5C9.88071 13 11 14.1193 11 15.5V17.5C11 18.8807 9.88071 20 8.5 20H6.5C5.11929 20 4 18.8807 4 17.5V15.5Z",
    "M13 15.5C13 14.1193 14.1193 13 15.5 13H17.5C18.8807 13 20 14.1193 20 15.5V17.5C20 18.8807 18.8807 20 17.5 20H15.5C14.1193 20 13 18.8807 13 17.5V15.5Z"
  ];
  var ICON_LINK = [
    "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1",
    "M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"
  ];

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
      const button2 = element("button", `dialkit-segmented-button ${buttonClassName}`.trim(), option.icon ? void 0 : option.label);
      button2.setAttribute("role", "radio");
      if (option.icon) button2.append(option.icon);
      const name = option.ariaLabel ?? (option.icon && option.label);
      if (name) button2.setAttribute("aria-label", name);
      button2.addEventListener("click", () => pick(option.value));
      root.append(button2);
      return button2;
    });
    const width = (button2) => {
      const style = getComputedStyle(button2);
      const inner = parseFloat(style.width);
      if (style.boxSizing === "border-box") return inner;
      return inner + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    };
    const place = (slide) => {
      const index = buttons.findIndex((button2) => button2.dataset.active === "true");
      if (!buttons[index]?.offsetWidth) return;
      const row = getComputedStyle(root);
      const gap = parseFloat(row.columnGap) || 0;
      let left = parseFloat(row.paddingLeft);
      for (const button2 of buttons.slice(0, index)) left += width(button2) + gap;
      if (!slide) pill.style.transition = "none";
      pill.style.left = `${left}px`;
      pill.style.width = `${width(buttons[index])}px`;
      if (!slide) {
        void pill.offsetWidth;
        pill.style.transition = "";
      }
    };
    const observer = new ResizeObserver(() => place(false));
    buttons.forEach((button2) => observer.observe(button2));
    let current2;
    return {
      root,
      buttons,
      set(value) {
        options.forEach((option, i) => {
          const active2 = option.value === value;
          buttons[i].setAttribute("aria-checked", String(active2));
          buttons[i].tabIndex = active2 ? 0 : -1;
          buttons[i].dataset.active = String(active2);
        });
        if (value !== current2) {
          current2 = value;
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
    const close2 = (restoreFocus = false) => {
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
      if (!popup?.contains(e.target) && !row.contains(e.target)) close2();
    };
    const focusOutside = (e) => {
      if (!popup?.contains(e.target) && !row.contains(e.target)) close2();
    };
    const open = () => {
      if (popup) {
        if (!inline) close2();
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
        if (max > 0) saturation = clamp(color.c / max);
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
              pixels.data[index + i] = Math.round(clamp(n) * 255);
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
          close2(true);
        }
        if (e.key === "Tab") {
          const first = formats.buttons.find((button2) => button2.tabIndex === 0);
          if (e.shiftKey && document.activeElement === first || !e.shiftKey && document.activeElement === opacityField.input) {
            swatch.focus({ preventScroll: true });
            close2();
          }
        }
        if (!isHintKey(e)) e.stopPropagation();
      });
      popup.append(formatRow, plane, tracks, fieldsRow);
      root.append(popup);
      const updatePosition = () => {
        if (!popup) return;
        if (!host.isConnected || row.getClientRects().length === 0) {
          close2();
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
      formats.buttons.find((button2) => button2.getAttribute("aria-checked") === "true")?.focus({ preventScroll: true });
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
        if (!inline) close2();
      },
      destroy() {
        close2();
        setHint(row, void 0);
        row.remove();
      }
    };
  }

  // src/image-control.ts
  var imageControlId = 0;
  var MAX_FILE_SIZE = 10 * 1024 * 1024;
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
    let current2;
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
        if (value === current2) return;
        current2 = value;
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
    const trigger = element3("button", "dialkit-image-control");
    const label = element3("span", "dialkit-image-label");
    const name = element3("span", "dialkit-image-value");
    const thumbnail2 = preview("dialkit-image-thumbnail");
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.append(label, name, thumbnail2.frame);
    const fileInput = element3("input", "dialkit-image-file");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.hidden = true;
    host.append(trigger, fileInput);
    if (inline) trigger.style.display = "none";
    const choices = () => imageOptions(props.options, uploaded, props.value);
    const render = () => {
      label.textContent = props.label;
      setHint(trigger, props.hint);
      name.textContent = choices().find((item) => item.value === props.value)?.label ?? "No image";
      trigger.setAttribute("aria-label", `Choose ${props.label.toLowerCase()} image: ${name.textContent}`);
      thumbnail2.update(props.value);
      updatePicker();
    };
    const commit = (value) => {
      props = { ...props, value };
      render();
      props.onChange(value);
    };
    const close2 = (restoreFocus = false) => {
      uploadRequest++;
      reader?.abort();
      reader = void 0;
      fileInput.onchange = null;
      stopPosition?.();
      stopPosition = void 0;
      if (popup) popup.querySelectorAll("[data-hint]").forEach((part) => setHint(part, void 0));
      popup?.remove();
      popup = void 0;
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
      if (!popup?.contains(event.target) && !host.contains(event.target)) close2();
    };
    const focusOutside = (event) => {
      if (!popup?.contains(event.target) && !host.contains(event.target)) close2();
    };
    const open = () => {
      if (popup) {
        if (!inline) close2();
        return;
      }
      const root = inline ? host : getDialKitPortalRoot(host) ?? host;
      popup = element3("div", "dialkit-image-popover");
      popup.dataset.presentation = presentation;
      popup.style.position = inline ? "static" : "fixed";
      popup.id = popupId;
      popup.setAttribute("role", inline ? "group" : "dialog");
      const heading = element3("div", "dialkit-image-heading");
      const title = element3("span", "dialkit-image-title");
      const clear = element3("button", "dialkit-image-clear", "Remove");
      clear.addEventListener("click", () => {
        commit("");
        if (!inline) close2(true);
      });
      heading.append(title, clear);
      setHint(clear, HINTS.imageClear);
      const grid = element3("div", "dialkit-image-grid");
      grid.setAttribute("role", "group");
      grid.setAttribute("aria-label", "Available images");
      const empty = element3("div", "dialkit-image-empty", "Choose an image to get started.");
      const upload = element3("button", "dialkit-button dialkit-image-upload");
      const uploadText = element3("span", "", "Upload image");
      upload.append(icon("upload"), uploadText);
      setHint(upload, HINTS.imageUpload);
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
            buttons.find((button2) => button2.getAttribute("aria-pressed") === "true")?.focus({ preventScroll: true });
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
      popup.addEventListener("dragover", (event) => {
        if (!event.dataTransfer?.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        popup.dataset.dragging = "true";
      });
      popup.addEventListener("dragleave", (event) => {
        if (!popup?.contains(event.relatedTarget)) delete popup.dataset.dragging;
      });
      popup.addEventListener("drop", (event) => {
        event.preventDefault();
        delete popup.dataset.dragging;
        const file = event.dataTransfer?.files[0];
        if (file) acceptFile(file);
      });
      grid.addEventListener("keydown", (event) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        const index = buttons.indexOf(document.activeElement);
        if (index < 0) return;
        const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
        const next = event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1 : event.key === "ArrowDown" ? index + columns : event.key === "ArrowUp" ? index - columns : event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : void 0;
        if (next === void 0) return;
        event.preventDefault();
        const button2 = buttons[Math.max(0, Math.min(buttons.length - 1, next))];
        buttons.forEach((item) => {
          item.tabIndex = item === button2 ? 0 : -1;
        });
        button2.focus({ preventScroll: true });
        button2.scrollIntoView({ block: "nearest" });
      });
      popup.addEventListener("keydown", (event) => {
        if (inline) return;
        if (!isHintKey(event)) event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          close2(true);
        }
        if (event.key === "Tab") {
          const first = clear.hidden ? buttons.find((button2) => button2.tabIndex === 0) ?? upload : clear;
          if (event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === upload) {
            const next = adjacentTabStop(trigger, event.shiftKey);
            close2(true);
            if (next) {
              event.preventDefault();
              next.focus();
            }
          }
        }
      });
      updatePicker = () => {
        popup?.setAttribute("aria-label", `${props.label} image picker`);
        title.textContent = props.label;
        clear.hidden = !props.value;
        clear.setAttribute("aria-label", `Remove ${props.label.toLowerCase()} image`);
        const items = choices();
        empty.hidden = items.length > 0;
        grid.hidden = items.length === 0;
        if (items.length !== previousItems.length || items.some((item, i) => item.value !== previousItems[i].value || item.label !== previousItems[i].label)) {
          const focusedIndex = buttons.indexOf(document.activeElement);
          previousItems = items;
          buttons = items.map((item) => {
            const button2 = element3("button", "dialkit-image-option");
            button2.setAttribute("aria-label", item.label);
            const thumb = preview("dialkit-image-option-preview");
            thumb.update(item.value);
            button2.append(thumb.frame);
            button2.addEventListener("click", () => {
              resetUpload();
              commit(item.value);
            });
            return button2;
          });
          grid.replaceChildren(...buttons);
          if (focusedIndex >= 0) buttons[Math.min(focusedIndex, buttons.length - 1)]?.focus({ preventScroll: true });
        }
        const selected = items.findIndex((item) => item.value === props.value);
        buttons.forEach((button2, index) => {
          button2.setAttribute("aria-pressed", String(index === selected));
          button2.tabIndex = index === Math.max(0, selected) ? 0 : -1;
        });
      };
      popup.append(heading, grid, empty, upload, status);
      root.append(popup);
      render();
      const position = () => {
        if (!popup) return;
        if (!host.isConnected || trigger.getClientRects().length === 0) {
          close2();
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
      (buttons.find((button2) => button2.tabIndex === 0) ?? upload).focus({ preventScroll: true });
    };
    trigger.addEventListener("click", open);
    trigger.addEventListener("keydown", (event) => {
      if (!isHintKey(event)) event.stopPropagation();
      if (event.key === "Escape") {
        event.preventDefault();
        close2();
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
        close2();
        fileInput.onchange = null;
        setHint(trigger, void 0);
        trigger.remove();
        fileInput.remove();
      }
    };
  }

  // src/dial-pad-control.ts
  var nextId2 = 0;
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
    let labelDrag;
    let suppressClick = false;
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
    instructions.id = `dialkit-pad-help-${++nextId2}`;
    surface.setAttribute("aria-describedby", instructions.id);
    const inputs = ["x", "y"].map((axis) => {
      const field2 = element4("label", "dialkit-pad-field");
      const name = element4("span", "dialkit-pad-axis");
      const input = element4("input", "dialkit-pad-value");
      input.type = "text";
      input.inputMode = "decimal";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.setAttribute("role", "spinbutton");
      field2.append(name, input);
      fields.append(field2);
      input.addEventListener("focus", () => input.select());
      name.addEventListener("pointerdown", (event) => {
        suppressClick = false;
        if (!props.dragLabels || event.button !== 0 || labelDrag) return;
        event.preventDefault();
        if (document.activeElement === input) input.blur();
        labelDrag = { axis, name, field: field2, id: event.pointerId, x: event.clientX, start: value[axis], value: value[axis], moved: false, cancelled: false };
        name.setPointerCapture(event.pointerId);
        window.addEventListener("keydown", cancelLabelDrag, true);
      });
      name.addEventListener("pointermove", (event) => {
        if (event.pointerId !== labelDrag?.id || labelDrag.cancelled) return;
        if (!labelDrag.moved && Math.abs(event.clientX - labelDrag.x) < 3) return;
        labelDrag.moved = true;
        field2.dataset.dragging = "true";
        labelDrag.value = padValueFromDrag(labelDrag.value, event.clientX - labelDrag.x, event.shiftKey, props[axis]);
        labelDrag.x = event.clientX;
        commit({ ...value, [axis]: labelDrag.value });
      });
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
        name.addEventListener(type, (event) => {
          if (event.pointerId === labelDrag?.id) endLabelDrag();
        });
      }
      name.addEventListener("click", (event) => {
        if (suppressClick) event.preventDefault();
        suppressClick = false;
      });
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
          const current2 = Number.isFinite(draft) ? draft : value[axis];
          const direction = event.key === "ArrowUp" ? 1 : -1;
          commit({ ...value, [axis]: snapPadAxis(current2 + direction * range.step * (event.shiftKey ? 10 : 1), range) });
          input.value = String(value[axis]);
        }
      });
      return { axis, name, input };
    });
    root.append(fields, surface, instructions);
    host.append(root);
    function render() {
      label.textContent = props.label;
      setHint(root, props.hint);
      if (props.hideLabel) root.dataset.hideLabel = "true";
      else delete root.dataset.hideLabel;
      if (props.dragLabels) root.dataset.dragLabels = "true";
      else delete root.dataset.dragLabels;
      const names = { x: props.labels?.x ?? "X", y: props.labels?.y ?? "Y" };
      const axes = `${names.x} ${value.x}, ${names.y} ${value.y}`;
      const named = padAxisLabel(props.label, names.x) === names.x && padAxisLabel(props.label, names.y) === names.y;
      surface.setAttribute("aria-label", named ? axes : `${props.label}: ${axes}`);
      inputs.forEach(({ axis, name, input }) => {
        const range = resolvePadAxis(props[axis]);
        name.textContent = names[axis];
        input.setAttribute("aria-label", padAxisLabel(props.label, names[axis]));
        input.setAttribute("aria-valuemin", String(range.min));
        input.setAttribute("aria-valuemax", String(range.max));
        input.setAttribute("aria-valuenow", String(value[axis]));
        if (document.activeElement !== input) input.value = String(value[axis]);
        const fraction = (value[axis] - range.min) / (range.max - range.min);
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
    function endLabelDrag() {
      if (!labelDrag) return;
      const { name, field: field2, id, moved, cancelled } = labelDrag;
      labelDrag = void 0;
      suppressClick = moved || cancelled;
      delete field2.dataset.dragging;
      window.removeEventListener("keydown", cancelLabelDrag, true);
      if (name.hasPointerCapture(id)) name.releasePointerCapture(id);
    }
    function cancelLabelDrag(event) {
      if (event.key !== "Escape" || !labelDrag) return;
      event.preventDefault();
      event.stopPropagation();
      labelDrag.cancelled = true;
      delete labelDrag.field.dataset.dragging;
      window.removeEventListener("keydown", cancelLabelDrag, true);
      commit({ ...value, [labelDrag.axis]: labelDrag.start });
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
        const incoming = normalizePadValue(next.value, props);
        if (labelDrag && !props.dragLabels) endLabelDrag();
        if (labelDrag && incoming[labelDrag.axis] !== value[labelDrag.axis]) {
          labelDrag.start = labelDrag.value = incoming[labelDrag.axis];
        }
        value = incoming;
        render();
      },
      destroy() {
        endDrag();
        endLabelDrag();
        setHint(root, void 0);
        root.remove();
      }
    };
  }

  // src/transition-math.ts
  function round22(value) {
    return Math.round(value * 100) / 100;
  }
  function clamp2(value, min, max) {
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
    return round22(clamp2(duration, 0.05, 10));
  }
  function springRestDuration(params, distance) {
    const size = Math.abs(distance);
    if (size === 0) return 0;
    const granular = size < 5;
    const restDelta = (granular ? 5e-3 : 0.5) / size;
    const restSpeed = (granular ? 0.01 : 2) / size;
    const bounces = params.damping < 2 * Math.sqrt(params.stiffness * params.mass);
    for (let t = 1e-3; t < 10; t += 1e-3) {
      const position = springProgress(t, params);
      if (Math.abs(1 - position) > restDelta) continue;
      if (!bounces || Math.abs(position - springProgress(t - 5e-3, params)) / 5e-3 <= restSpeed) return Math.round(t * 1e3) / 1e3;
    }
    return 10;
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
        duration: springSettleDuration(springParams(raw)),
        isPhysics: true
      };
    }
    return {
      transition: { type: "spring", bounce: raw.bounce ?? 0.2, visualDuration: safeDuration },
      duration: safeDuration,
      isPhysics: false
    };
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

  // src/dropdown-keyboard.ts
  var dropdownId = 0;
  var PRESET_MENU_MAX_WIDTH = 280;
  function observeDropdownKeyboard(trigger, getPopup, close2, kind = "select") {
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
      let active2;
      let activeIndex = 0;
      let query = "";
      let typedAt = 0;
      let leaving = false;
      const items = () => Array.from(popup.querySelectorAll(selector)).filter((el) => !el.hasAttribute("disabled"));
      const focusItem = (index) => {
        const options = items();
        activeIndex = Math.max(0, Math.min(options.length - 1, index));
        active2 = options[activeIndex];
        (active2 ?? popup).focus({ preventScroll: true });
        active2?.scrollIntoView({ block: "nearest", inline: "nearest" });
      };
      const refresh = () => {
        if (trigger.matches(":disabled")) {
          leaving = true;
          const previous = adjacentTabStop(trigger, true);
          close2();
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
        if (active2 && !leaving && !popup.contains(document.activeElement)) focusItem(activeIndex);
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
          close2();
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
          close2();
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
        if (event.key.length === 1 && event.key !== " " && !isHintKey(event)) {
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
          active2 = target;
          activeIndex = index;
        }
        if (!leaving && !popup.contains(target) && !trigger.contains(target)) {
          leaving = true;
          close2();
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

  // src/panel-size.ts
  function measurePanelHeight(content) {
    const panel = content.parentElement;
    if (!panel) return content.offsetHeight;
    const style = getComputedStyle(panel);
    const chrome = style.boxSizing === "border-box" ? [style.paddingTop, style.paddingBottom, style.borderTopWidth, style.borderBottomWidth].reduce((total, value) => total + (parseFloat(value) || 0), 0) : 0;
    return content.offsetHeight + chrome;
  }
  function observePanelHeader(folder) {
    const header = folder.firstElementChild;
    if (!header) return () => {
    };
    const update = () => {
      folder.style.setProperty("--dial-panel-header-height", `${header.offsetHeight}px`);
    };
    const observer = new ResizeObserver(update);
    observer.observe(header);
    update();
    return () => {
      observer.disconnect();
      folder.style.removeProperty("--dial-panel-header-height");
    };
  }
  function observeScrollFades(root) {
    const scroller = root.parentElement;
    if (!scroller || typeof CSS === "undefined" || CSS.supports("container-type", "scroll-state")) return () => {
    };
    let frame = 0;
    const update = () => {
      frame = 0;
      const headers = Array.from(root.querySelectorAll(".dialkit-folder-header"));
      const stuck = headers.map((header) => {
        if (header.parentElement === root) return scroller.scrollTop > 0;
        const folder = header.parentElement;
        return header.getBoundingClientRect().top - folder.getBoundingClientRect().top - folder.clientTop > 0.5;
      });
      const more = scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1;
      headers.forEach((header, index) => header.toggleAttribute("data-stuck", stuck[index]));
      scroller.toggleAttribute("data-more", more);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    resize.observe(scroller);
    scroller.addEventListener("scroll", schedule, { passive: true });
    schedule();
    return () => {
      resize.disconnect();
      scroller.removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
      for (const header of root.querySelectorAll("[data-stuck]")) header.removeAttribute("data-stuck");
      scroller.removeAttribute("data-more");
    };
  }
  var panelFolds = /* @__PURE__ */ new WeakMap();
  function finishSectionFold(section) {
    for (const element10 of [section.content, section.toolbar]) {
      element10.style.display = section.open ? "" : "none";
      element10.style.removeProperty("height");
      element10.inert = !section.open;
    }
  }
  function createPanelSectionTransition(folder, initiallyOpen) {
    const content = folder.querySelector(":scope > .dialkit-folder-content");
    const toolbar = folder.querySelector(":scope > .dialkit-folder-header > .dialkit-panel-section-toolbar-clip");
    let open = initiallyOpen;
    let panel = null;
    const stopHeader = observePanelHeader(folder);
    finishSectionFold({ content, toolbar, open });
    return {
      setOpen(next) {
        if (next === open) return;
        open = next;
        panel = folder.closest(".dialkit-panel-inner");
        if (!panel) {
          finishSectionFold({ content, toolbar, open });
          return;
        }
        const root = panel.querySelector(":scope > .dialkit-folder-root");
        const shell = panel.closest(".dialkit-panel");
        const inline = panel.classList.contains("dialkit-panel-inline");
        let group = panelFolds.get(panel);
        if (!group) {
          group = { sections: /* @__PURE__ */ new Map(), frame: 0 };
          panelFolds.set(panel, group);
        }
        cancelAnimationFrame(group.frame);
        const panelFrom = parseFloat(getComputedStyle(panel).height);
        const scrollFrom = panel.scrollTop;
        const section = group.sections.get(folder) ?? {
          content,
          toolbar,
          open,
          fromContent: 0,
          toContent: 0,
          fromToolbar: 0,
          toToolbar: 0
        };
        section.open = open;
        group.sections.set(folder, section);
        for (const fold of group.sections.values()) {
          fold.fromContent = fold.content.offsetHeight;
          fold.fromToolbar = fold.toolbar.offsetHeight;
          for (const [element10, height] of [[fold.content, fold.fromContent], [fold.toolbar, fold.fromToolbar]]) {
            element10.style.height = `${height}px`;
            element10.style.display = "";
            element10.inert = !fold.open;
          }
          fold.toContent = fold.open ? fold.content.firstElementChild.offsetHeight : 0;
          fold.toToolbar = fold.open ? fold.toolbar.firstElementChild.offsetHeight : 0;
        }
        const fullTarget = measurePanelHeight(root) + [...group.sections.values()].reduce(
          (delta, fold) => delta + fold.toContent - fold.fromContent + fold.toToolbar - fold.fromToolbar,
          0
        );
        const limits = [window.innerHeight - 32, parseFloat(getComputedStyle(panel).maxHeight)];
        if (shell) limits.push(parseFloat(getComputedStyle(shell).maxHeight));
        const panelTo = Math.min(fullTarget, ...limits.filter(Number.isFinite));
        const scrollTo = Math.min(scrollFrom, Math.max(0, fullTarget - panelTo));
        const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 260;
        const started = performance.now();
        const activePanel = panel;
        const activeGroup = group;
        const heightHost = activePanel.parentElement;
        activePanel.setAttribute("data-folding", "true");
        const tick = (now) => {
          const time = duration === 0 ? 1 : Math.min(1, Math.max(0, (now - started) / duration));
          const progress = 1 - (1 - time) ** 3;
          for (const fold of activeGroup.sections.values()) {
            fold.content.style.height = `${fold.fromContent + (fold.toContent - fold.fromContent) * progress}px`;
            fold.toolbar.style.height = `${fold.fromToolbar + (fold.toToolbar - fold.fromToolbar) * progress}px`;
          }
          if (!inline) {
            heightHost.style.setProperty("--dial-panel-fold-height", `${panelFrom + (panelTo - panelFrom) * progress}px`);
            activePanel.scrollTop = scrollFrom + (scrollTo - scrollFrom) * progress;
          }
          if (time < 1) {
            activeGroup.frame = requestAnimationFrame(tick);
            return;
          }
          for (const fold of activeGroup.sections.values()) finishSectionFold(fold);
          activeGroup.sections.clear();
          activeGroup.frame = requestAnimationFrame(() => {
            if (!inline && activePanel.dataset.collapsed !== "true") activePanel.style.height = `${panelTo}px`;
            activePanel.removeAttribute("data-folding");
            heightHost.style.removeProperty("--dial-panel-fold-height");
            panelFolds.delete(activePanel);
          });
        };
        tick(started);
      },
      destroy() {
        stopHeader();
        if (!panel) return;
        const group = panelFolds.get(panel);
        group?.sections.delete(folder);
        if (group && group.sections.size === 0) {
          cancelAnimationFrame(group.frame);
          panel.removeAttribute("data-folding");
          panel.parentElement?.style.removeProperty("--dial-panel-fold-height");
          panelFolds.delete(panel);
        }
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
  function button(title, paths, onClick) {
    const node = element5("button", "dialkit-toolbar-add");
    node.setAttribute("aria-label", title);
    node.append(icon2(paths));
    node.addEventListener("click", onClick);
    return node;
  }

  // src/vanilla/controls.ts
  function mountFolder(host, initial) {
    let props = initial;
    let open = props.open ?? props.defaultOpen ?? true;
    const folder = element5("div", `dialkit-folder${props.isRoot ? " dialkit-folder-root" : props.isSection ? " dialkit-folder-section" : ""}`);
    const header = element5("div", `dialkit-folder-header${props.isRoot ? " dialkit-panel-header" : ""}`);
    const top = element5("div", "dialkit-folder-header-top");
    const titleRow = element5("div", "dialkit-folder-title-row");
    const title = element5("span", `dialkit-folder-title${props.isRoot ? " dialkit-folder-title-root" : ""}`);
    const meta = element5("span", "dialkit-folder-meta");
    titleRow.append(title);
    top.append(titleRow);
    const glyph = props.isRoot ? svg("svg", { class: "dialkit-panel-icon", viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" }) : icon2(ICON_CHEVRON, "dialkit-folder-icon");
    if (!props.inline || !props.isRoot)
      top.append(glyph);
    const toolbar = element5("div", props.isRoot ? "dialkit-panel-toolbar" : "dialkit-panel-section-toolbar");
    toolbar.addEventListener("click", (event) => event.stopPropagation());
    header.append(top);
    const reset = props.onReset && !props.isRoot ? element5("button", "dialkit-folder-reset") : void 0;
    if (reset) {
      reset.append(icon2(ICON_RESET));
      reset.addEventListener("click", (event) => {
        event.stopPropagation();
        top.focus();
        props.onReset?.();
      });
      header.append(reset);
    }
    const renderReset = () => {
      reset?.setAttribute("aria-label", `Reset ${props.title}`);
      if (reset) setHint(reset, HINTS.sectionReset);
      reset?.setAttribute("data-changed", String(!!props.changed));
    };
    const actions = element5("div", "dialkit-folder-actions");
    if (props.actions && !props.isRoot)
      header.append(actions);
    if (props.isSection) {
      const toolbarClip = element5("div", "dialkit-panel-section-toolbar-clip");
      toolbarClip.append(toolbar);
      header.append(toolbarClip);
    } else if (props.isRoot)
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
    let sectionTransition;
    const render = () => {
      const changed = renderedOpen !== open;
      const before = (props.isRoot ? node : content).getBoundingClientRect();
      if (changed)
        animation?.cancel();
      const wasOpen = renderedOpen;
      renderedOpen = open;
      folder.dataset.open = String(open);
      title.textContent = props.title;
      meta.textContent = props.meta ?? "";
      if (props.meta && !props.isRoot)
        titleRow.append(meta);
      else
        meta.remove();
      top.setAttribute("aria-label", props.meta && !props.isRoot ? `${props.title}, ${props.meta}` : props.title);
      setHint(top, props.hint ?? (props.isRoot && !props.inline ? HINTS.panel : void 0));
      top.setAttribute("aria-expanded", String(open));
      if (!(props.inline && props.isRoot)) {
        top.setAttribute("role", "button");
        top.tabIndex = 0;
      }
      if (!props.isSection) {
        content.style.display = open ? "" : "none";
        content.inert = !open;
        toolbar.style.display = open ? "" : "none";
      }
      if (props.isRoot) {
        glyph.setAttribute("viewBox", open ? "0 0 24 24" : "0 0 16 16");
        glyph.replaceChildren();
        if (open) {
          glyph.append(svg("path", { d: ICON_CLOSE, stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round" }));
        } else {
          glyph.append(svg("path", { d: ICON_PANEL.path, fill: "currentColor", opacity: 0.5 }));
          ICON_PANEL.circles.forEach((c) => glyph.append(svg("circle", { ...c, fill: "currentColor", stroke: "currentColor", "stroke-width": 1.25 })));
        }
        titleRow.style.display = open ? "" : "none";
        node.dataset.collapsed = String(!open);
        if (!props.inline)
          Object.assign(node.style, open ? { width: "280px", height: "auto", maxHeight: "calc(100dvh - 32px)", borderRadius: "14px", boxShadow: "var(--dial-shadow)", overflowX: "hidden", overflowY: "auto", cursor: "" } : { width: "42px", height: "42px", maxHeight: "42px", borderRadius: "50%", boxShadow: "var(--dial-shadow-collapsed)", overflow: "hidden", cursor: "pointer" });
      } else {
        glyph.style.transform = open ? "rotate(180deg)" : "";
        glyph.style.transition = "transform 250ms ease";
      }
      if (changed && before.width > 0) {
        if (props.isRoot && !props.inline) {
          const after = node.getBoundingClientRect();
          node.style.maxHeight = "calc(100dvh - 32px)";
          animation = animateSpring(node, (p) => ({ width: `${before.width + (after.width - before.width) * p}px`, height: `${before.height + (after.height - before.height) * p}px`, borderRadius: `${(wasOpen ? 14 : 21) + (open ? -7 : 7) * p}px` }));
        } else if (!props.isRoot && !props.isSection) {
          content.style.display = "";
          const targetHeight = open ? content.scrollHeight : 0;
          animation = animateSpring(content, (p) => ({ height: `${before.height + (targetHeight - before.height) * p}px` }));
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
      sectionTransition?.setOpen(open);
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
    renderReset();
    render();
    if (props.isSection) sectionTransition = createPanelSectionTransition(folder, open);
    const stopHeader = props.isRoot ? observePanelHeader(folder) : void 0;
    const stopFades = props.isRoot ? observeScrollFades(folder) : void 0;
    return {
      element: node,
      body,
      toolbar,
      actions,
      update(next) {
        const previous = props;
        props = next;
        renderReset();
        if ((next.open ?? open) === open && next.title === previous.title && next.meta === previous.meta && next.hint === previous.hint)
          return;
        open = next.open ?? open;
        render();
      },
      destroy() {
        animation?.cancel();
        stopHeader?.();
        stopFades?.();
        sectionTransition?.destroy();
        setHint(top, void 0);
        if (reset) setHint(reset, void 0);
        node.remove();
      }
    };
  }
  function mountSegmentedControl(host, initial) {
    let props = initial;
    const group = element5("div", "dialkit-segmented");
    group.setAttribute("role", "radiogroup");
    group.addEventListener("keydown", handleSegmentKey);
    const pill = element5("div", "dialkit-segmented-pill");
    pill.style.transition = "left 200ms ease, width 200ms ease";
    pill.setAttribute("aria-hidden", "true");
    group.append(pill);
    host.append(group);
    labelSegmentedControl(group);
    let buttons = [];
    let signature = "";
    let named = false;
    function render() {
      if (props.label) {
        group.removeAttribute("aria-labelledby");
        group.setAttribute("aria-label", props.label);
      } else if (named) {
        group.removeAttribute("aria-label");
        labelSegmentedControl(group);
      }
      named = !!props.label;
      const nextSignature = JSON.stringify(props.options);
      if (signature !== nextSignature) {
        signature = nextSignature;
        buttons.forEach((b) => b.remove());
        buttons = props.options.map((option) => {
          const b = element5("button", "dialkit-segmented-button", option.icon ? void 0 : option.label);
          if (option.icon) {
            b.setAttribute("aria-label", option.label);
            b.append(icon2(option.icon, "dialkit-segmented-icon"));
          }
          b.setAttribute("role", "radio");
          b.addEventListener("click", () => props.onChange(option.value));
          group.append(b);
          return b;
        });
      }
      buttons.forEach((b, i) => {
        const active2 = props.options[i].value === props.value;
        b.dataset.active = String(active2);
        b.setAttribute("aria-checked", String(active2));
        b.tabIndex = active2 ? 0 : -1;
        if (active2) {
          const groupRect = group.getBoundingClientRect(), rect = b.getBoundingClientRect();
          if (!groupRect.width) return;
          pill.style.left = `${(rect.left - groupRect.left) / groupRect.width * 100}%`;
          pill.style.width = `${rect.width / groupRect.width * 100}%`;
        }
      });
    }
    const observer = new ResizeObserver(render);
    observer.observe(group);
    render();
    return {
      update(next) {
        props = next;
        render();
      },
      destroy() {
        observer.disconnect();
        group.remove();
      }
    };
  }
  function mountToggle(host, initial) {
    let props = initial;
    const row = element5("div", "dialkit-labeled-control");
    const label = element5("span", "dialkit-labeled-control-label");
    row.append(label);
    host.append(row);
    const segmentProps = () => ({ options: [{ value: "off", label: "Off" }, { value: "on", label: "On" }], value: props.checked ? "on" : "off", onChange: (value) => props.onChange(value === "on") });
    const segmented = mountSegmentedControl(row, segmentProps());
    function render() {
      label.textContent = props.label;
      setHint(row, props.hint);
      appendShortcut(label, props.shortcut, props.shortcutActive, true);
      segmented.update(segmentProps());
    }
    render();
    return {
      update(next) {
        props = next;
        render();
      },
      destroy() {
        segmented.destroy();
        setHint(row, void 0);
        row.remove();
      }
    };
  }
  function appendShortcut(label, shortcut, active2 = false, toggle = false) {
    if (!shortcut)
      return;
    label.append(element5("span", `dialkit-shortcut-pill${active2 ? " dialkit-shortcut-pill-active" : ""}`, toggle ? formatToggleShortcut(shortcut) : formatSliderShortcut(shortcut)));
  }
  function mountSlider(host, initial) {
    let props = initial;
    const wrapper = element5("div", "dialkit-slider-wrapper");
    const track = element5("div", "dialkit-slider");
    track.tabIndex = 0;
    track.setAttribute("role", "slider");
    const hashes = element5("div", "dialkit-slider-hashmarks");
    const fill = element5("div", "dialkit-slider-fill");
    const handle = element5("div", "dialkit-slider-handle");
    const label = element5("span", "dialkit-slider-label");
    const display = element5("span", "dialkit-slider-value");
    const unit = element5("span", "dialkit-slider-unit");
    const input = element5("input", "dialkit-slider-input");
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
      setHint(wrapper, props.hint);
      const pct = max > min ? Math.max(0, Math.min(100, (props.value - min) / (max - min) * 100)) : 0;
      fill.style.width = `${pct}%`;
      handle.style.left = `max(5px, calc(${pct}% - 9px))`;
      const active2 = hovered || !!drag;
      const width = wrapper.offsetWidth;
      const dodge = width > 0 && (pct < (18 + label.offsetWidth) / width * 100 || pct > (width - 20 - display.offsetWidth) / width * 100);
      handle.style.opacity = active2 ? String(dodge ? 0.1 : drag?.moved ? 0.9 : 0.5) : "0";
      handle.style.transform = `translateY(-50%) scale(${active2 ? 1 : 0.25}, ${active2 && dodge ? 0.75 : 1})`;
      handle.style.transition = "opacity 150ms, transform 200ms";
      track.classList.toggle("dialkit-slider-active", active2);
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
          const hash = element5("div", "dialkit-slider-hashmark");
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
        setHint(wrapper, void 0);
        wrapper.remove();
      }
    };
  }
  function mountTextControl(host, initial) {
    let props = initial;
    const row = element5("label", "dialkit-text-control");
    const label = element5("span", "dialkit-text-label");
    const input = element5("textarea", "dialkit-text-input");
    input.rows = 1;
    row.append(label, input);
    host.append(row);
    const size = observeTextSize(input);
    function render() {
      label.textContent = props.label;
      setHint(row, props.hint);
      if (input.value !== props.value)
        input.value = props.value;
      input.placeholder = props.placeholder ?? "";
      size.update();
    }
    input.addEventListener("input", () => {
      props = { ...props, value: input.value };
      size.update();
      props.onChange(input.value);
    });
    render();
    return {
      update(next) {
        props = next;
        render();
      },
      destroy() {
        size.destroy();
        setHint(row, void 0);
        row.remove();
      }
    };
  }
  function mountButtonGroup(host, initial) {
    const group = element5("div", "dialkit-button-group");
    host.append(group);
    function update(props) {
      group.replaceChildren(...props.buttons.map((item) => {
        const b = element5("button", "dialkit-button", item.label);
        b.addEventListener("click", item.onClick);
        return b;
      }));
    }
    update(initial);
    return {
      update,
      destroy() {
        group.remove();
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
  var MAX_FILE_SIZE2 = 10 * 1024 * 1024;
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
  function element6(tag, className, text) {
    const el = document.createElement(tag);
    el.className = className;
    if (text) el.textContent = text;
    if (el instanceof HTMLButtonElement) el.type = "button";
    return el;
  }
  function icon3(paths) {
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
    const button2 = element6("button", `dialkit-background-icon-button ${className}`);
    button2.setAttribute("aria-label", label);
    button2.append(icon3(paths));
    return button2;
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
        const open = clamp((from + (to - from) * p) / full, 0, 1);
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
    const root = element6("div", "dialkit-background");
    const hints = mountHints();
    const modes = segmentedControl("dialkit-background-modes", "Background type", MODES2, (mode) => emit({ ...value, mode }));
    modes.buttons.forEach((button2, i) => hint(button2, BG_HINTS.mode[MODES2[i].value]));
    root.append(modes.root);
    const solidPane = element6("div", "dialkit-background-pane");
    const solidHost = element6("div", "dialkit-color-host");
    solidPane.append(solidHost);
    const solidProps = () => ({ label: "Color", value: value.color, onChange: (color) => emit({ ...value, color }) });
    const solid = mountColorControl(solidHost, solidProps());
    const gradientPane = element6("div", "dialkit-background-pane");
    const shapeRow = element6("div", "dialkit-background-shape-row");
    const shapeTrigger = element6("button", "dialkit-select-trigger dialkit-background-shape-trigger");
    shapeTrigger.setAttribute("aria-label", "Gradient type");
    shapeTrigger.setAttribute("aria-haspopup", "listbox");
    shapeTrigger.setAttribute("aria-expanded", "false");
    const shapeValue = element6("span", "dialkit-select-value");
    const chevron = icon3(ICON_CHEVRON);
    chevron.classList.add("dialkit-select-chevron");
    shapeTrigger.append(shapeValue, chevron);
    const flipButton = iconButton("dialkit-background-flip", "Flip stops", ICON_FLIP);
    const rotateButton = iconButton("dialkit-background-rotate", "Rotate 90\xB0 clockwise", ICON_ROTATE);
    shapeRow.append(shapeTrigger, flipButton, rotateButton);
    hint(shapeTrigger, BG_HINTS.shapeTrigger);
    hint(flipButton, BG_HINTS.flip);
    hint(rotateButton, BG_HINTS.rotate);
    flipButton.addEventListener("click", () => commitEntries(entries().map(({ id, stop: stop3 }) => ({ id, stop: { ...stop3, at: Number((100 - stop3.at).toFixed(2)) } }))));
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
      const menu = shapeMenu = element6("div", "dialkit-select-dropdown dialkit-background-shape-menu");
      menu.style.position = "fixed";
      for (const shape of GRADIENT_SHAPES) {
        const option = element6("button", "dialkit-select-option", SHAPE_LABELS[shape]);
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
    const bar = element6("div", "dialkit-background-bar");
    const track = element6("div", "dialkit-background-track");
    const paint = element6("div", "dialkit-background-track-paint");
    paint.setAttribute("aria-hidden", "true");
    track.append(paint);
    const handleLayer = element6("div", "dialkit-background-handles");
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
      canvas ?? (canvas = paint.appendChild(element6("canvas", "dialkit-background-track-canvas")));
      canvas.width = width;
      canvas.height = height2;
      paintGradient(canvas, { shape, handles: STRIP_HANDLES, stops });
    };
    const resize = typeof ResizeObserver === "function" ? new ResizeObserver(paintTrack) : void 0;
    resize?.observe(track);
    const stopsHeader = element6("div", "dialkit-background-stops-header");
    const addButton = iconButton("dialkit-background-add", "Add stop", ICON_PLUS);
    stopsHeader.append(element6("span", "dialkit-background-stops-title", "Stops"), addButton);
    hint(addButton, BG_HINTS.add);
    const stopList = element6("div", "dialkit-background-stops");
    const saveButton = element6("button", "dialkit-background-save", "Save gradient");
    hint(saveButton, BG_HINTS.save);
    const savedList = element6("div", "dialkit-background-saved");
    savedList.setAttribute("role", "group");
    savedList.setAttribute("aria-label", "Saved gradients");
    gradientPane.append(shapeRow, bar, stopsHeader, stopList, saveButton, savedList);
    let nextId5 = 0;
    let ids = value.gradient.stops.map(() => ++nextId5);
    let selectedId = ids[0];
    const reconcileIds = () => {
      const count = value.gradient.stops.length;
      if (ids.length > count) ids = ids.slice(0, count);
      while (ids.length < count) ids = [...ids, ++nextId5];
      if (!ids.includes(selectedId)) selectedId = ids[0];
    };
    const entries = () => value.gradient.stops.map((stop3, i) => ({ id: ids[i], stop: stop3 }));
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
      const position = Number(clamp(at, 0, 100).toFixed(2));
      const entry = { id: ++nextId5, stop: { at: position, color: gradientColorAt(value.gradient.stops, position) } };
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
      return rect.width ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0;
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
      const row = handle ? rows2.get(ids[handles.indexOf(handle)]) : void 0;
      row?.root.querySelector(".dialkit-color-control:not([data-open]) .dialkit-color-swatch")?.click();
    });
    const buildHandles = () => {
      stems = value.gradient.stops.map(() => {
        const stem = element6("span", "dialkit-background-stem");
        stem.setAttribute("aria-hidden", "true");
        return stem;
      });
      handles = value.gradient.stops.map(() => {
        const handle = element6("button", "dialkit-background-handle");
        handle.setAttribute("role", "slider");
        handle.setAttribute("aria-valuemin", "0");
        handle.setAttribute("aria-valuemax", "100");
        handle.append(element6("span", "dialkit-background-handle-chip"));
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
          else updateStop(id, { at: clamp(Math.round(next), 0, 100) });
          handles[selectedIndex()]?.focus({ preventScroll: true });
        });
        return handle;
      });
      handleLayer.replaceChildren(...stems, ...handles);
    };
    const rows2 = /* @__PURE__ */ new Map();
    const leaving = /* @__PURE__ */ new Map();
    const slides = /* @__PURE__ */ new Map();
    let scrubbing;
    let rowDrag;
    const buildRow = (id) => {
      const index = () => ids.indexOf(id);
      const stop3 = () => value.gradient.stops[index()];
      const rowRoot = element6("div", "dialkit-background-stop");
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
        read: () => stop3()?.at ?? 0,
        write: (at) => updateStop(id, { at }),
        onScrub: (active2) => {
          scrubbing = active2 ? id : void 0;
        }
      });
      position.root.classList.add("dialkit-background-stop-position");
      hint(position.root, BG_HINTS.position);
      const colorHost = element6("div", "dialkit-color-host dialkit-background-stop-color");
      const color = mountColorControl(colorHost, { label: `Stop ${index() + 1}`, value: stop3().color, onChange: (next) => updateStop(id, { color: next }) });
      const opacity = field({
        unit: "%",
        label: `Stop ${index() + 1} opacity`,
        min: 0,
        max: 100,
        step: 1,
        read: () => stop3() ? colorOpacity(stop3().color) : 100,
        write: (n) => updateStop(id, { color: withOpacity(stop3().color, n) })
      });
      opacity.root.classList.add("dialkit-background-stop-opacity");
      const remove = iconButton("dialkit-background-stop-remove", "Remove stop", ICON_MINUS);
      remove.addEventListener("click", () => {
        removeStop(id);
        const next = rows2.get(selectedId);
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
        const row = rows2.get(entry.id);
        if (row) row.root.style.transform = shift ? `translateY(${shift}px)` : "";
      });
    };
    const finishRowDrag = () => {
      if (!rowDrag) return;
      rowDrag = void 0;
      delete stopList.dataset.dragging;
      render();
      rows2.forEach((row) => {
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
          rowDrag.base.forEach((entry) => stopSlide(rows2.get(entry.id).root));
          const [first, second] = rowDrag.base.map((entry) => rows2.get(entry.id).root.getBoundingClientRect());
          rowDrag.step = second ? second.top - first.top : first.height;
          stopList.dataset.dragging = "true";
          row.root.dataset.dragging = "true";
        }
        const count = rowDrag.base.length;
        rowDrag.offset = clamp(dy, -rowDrag.from * rowDrag.step, (count - 1 - rowDrag.from) * rowDrag.step);
        const to = clamp(Math.round(rowDrag.from + rowDrag.offset / rowDrag.step), 0, count - 1);
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
      const list = ids.map((id) => rows2.get(id));
      const active2 = document.activeElement;
      const held = list.find((row) => row.id === scrubbing) ?? list.find((row) => row.root.contains(active2)) ?? list[0];
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
      for (const [id, row] of rows2) {
        if (ids.includes(id)) continue;
        rows2.delete(id);
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
        const fade = layoutSpring(row.root, (p) => ({ opacity: String(clamp(1 - p, 0, 1)), transform: `scale(${1 - 0.04 * clamp(p, 0, 1)})` }));
        if (!fade) {
          dropRow(row);
          continue;
        }
        leaving.set(row, fade);
        fade.onfinish = () => dropRow(row);
      }
      const entering = [];
      for (const id of ids) {
        if (rows2.has(id)) continue;
        const row = buildRow(id);
        rows2.set(id, row);
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
      rows2.forEach((row) => row.root.toggleAttribute("data-selected", row.id === selectedId));
    };
    let savedSignature = "";
    const renderSaved = () => {
      const saved = DialStore.getSavedGradients(props.panelId);
      const signature = JSON.stringify(saved);
      if (signature !== savedSignature) {
        savedSignature = signature;
        savedList.replaceChildren(...saved.map(({ id, gradient }, i) => {
          const item = element6("div", "dialkit-background-saved-item");
          const swatch = element6("button", "dialkit-background-saved-swatch");
          swatch.setAttribute("aria-label", `Use saved gradient ${i + 1}`);
          swatch.style.setProperty("--dial-gradient", backgroundGradientCss(gradient));
          swatch.addEventListener("click", () => emit({ ...value, mode: "gradient", gradient: cloneGradient(gradient) }));
          hint(swatch, BG_HINTS.saved);
          const remove = iconButton("dialkit-background-saved-delete", `Delete saved gradient ${i + 1}`, ICON_CLOSE);
          hint(remove, BG_HINTS.savedDelete);
          remove.addEventListener("click", () => DialStore.deleteGradient(props.panelId, id));
          item.append(swatch, remove);
          return item;
        }));
      }
      savedList.hidden = saved.length === 0;
      saved.forEach(({ gradient }, i) => savedList.children[i]?.firstElementChild?.setAttribute("aria-pressed", String(sameGradient(gradient, value.gradient))));
    };
    saveButton.addEventListener("click", () => DialStore.saveGradient(props.panelId, value.gradient));
    const onStore = () => {
      if (JSON.stringify(DialStore.getSavedGradients(props.panelId)) !== savedSignature) render();
    };
    let unsubscribe = DialStore.subscribe(props.panelId, onStore);
    const mediaPane = element6("div", "dialkit-background-pane dialkit-background-media");
    const fileInput = element6("input", "dialkit-background-file");
    fileInput.type = "file";
    fileInput.accept = "image/*,video/*";
    fileInput.hidden = true;
    const drop = element6("button", "dialkit-background-drop");
    const dropText = element6("span", "");
    drop.append(icon3(ICON_UPLOAD), dropText);
    hint(drop, BG_HINTS.drop);
    const preview2 = element6("button", "dialkit-background-media-preview");
    preview2.setAttribute("aria-label", "Media options");
    preview2.setAttribute("aria-haspopup", "dialog");
    preview2.setAttribute("aria-expanded", "false");
    const frame = element6("span", "dialkit-background-media-frame");
    hint(preview2, BG_HINTS.preview);
    const badge = element6("span", "dialkit-background-media-badge");
    badge.setAttribute("aria-hidden", "true");
    preview2.append(frame, badge);
    const actions = element6("div", "dialkit-background-media-actions");
    const replaceButton = element6("button", "dialkit-button", "Replace");
    const removeButton = element6("button", "dialkit-button", "Remove");
    actions.append(replaceButton, removeButton);
    const status = element6("div", "dialkit-background-status");
    status.setAttribute("role", "status");
    mediaPane.append(drop, preview2, actions, status, fileInput);
    let loading = false;
    let request = 0;
    let shownMedia = "";
    const setStatus = (text) => {
      status.textContent = text;
      status.hidden = !text;
    };
    const readFile = (file) => new Promise((resolve, reject) => {
      if (file.size > MAX_FILE_SIZE2) {
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
      const current2 = ++request;
      loading = true;
      setStatus("");
      render();
      try {
        const src = await (props.upload ?? readFile)(file);
        if (current2 !== request) return;
        loading = false;
        emit({ ...value, media: { src, kind } });
      } catch (error) {
        if (current2 !== request) return;
        setStatus(error instanceof Error && error.message ? error.message : "This file could not be opened. Try another one.");
      } finally {
        if (current2 === request && !destroyed) {
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
          const video = mediaElement = element6("video", "dialkit-background-media-element");
          video.muted = true;
          video.loop = true;
          video.playsInline = true;
          video.autoplay = true;
          video.addEventListener("loadedmetadata", () => measured(video.videoWidth, video.videoHeight));
          video.src = media.src;
        } else if (media) {
          mediaElement = element6("span", "dialkit-background-media-element");
          const image = new Image();
          image.addEventListener("load", () => measured(image.naturalWidth, image.naturalHeight));
          image.src = media.src;
        }
        if (mediaElement) frame.append(mediaElement);
      }
      if (!media || !mediaElement) return;
      const { ratio } = value.mediaDisplay;
      const [w, h] = ratio === "source" ? [sourceRatio ?? 16 / 9, 1] : ratio.split(":").map(Number);
      const box = preview2.clientWidth / preview2.clientHeight || 16 / 9;
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
      if (!popup?.contains(event.target) && !preview2.contains(event.target)) closeOptions();
    };
    function closeOptions(restoreFocus = false) {
      stopOptions?.();
      stopOptions = void 0;
      popup?.remove();
      popup = void 0;
      syncOptions = () => {
      };
      delete preview2.dataset.open;
      preview2.setAttribute("aria-expanded", "false");
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      if (restoreFocus) preview2.focus({ preventScroll: true });
    }
    const openOptions = (event) => {
      if (popup) {
        closeOptions();
        return;
      }
      const portal = getDialKitPortalRoot(host) ?? host;
      const shell = popup = element6("div", "dialkit-background-popover");
      shell.style.position = "fixed";
      shell.tabIndex = -1;
      shell.setAttribute("role", "dialog");
      shell.setAttribute("aria-label", `${props.label} media options`);
      const section = (title, control) => {
        const wrap = element6("div", "dialkit-background-popover-section");
        wrap.append(element6("div", "dialkit-background-popover-label", title), control);
        shell.append(wrap);
        return wrap;
      };
      const fits = segmentedControl("dialkit-background-fits", "Sizing", MEDIA_FITS.map((fit) => ({ value: fit, label: FIT_LABELS[fit] })), (fit) => setDisplay({ fit }));
      fits.buttons.forEach((button2, i) => hint(button2, BG_HINTS.fit[MEDIA_FITS[i]]));
      hint(section("Sizing", fits.root), BG_HINTS.sizing);
      const tileSizeWrap = element6("div", "dialkit-background-tile-size");
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
      const ratios = segmentedControl("dialkit-background-ratios", "Ratio", MEDIA_RATIOS.map((ratio) => ratio === "source" ? { value: ratio, label: "Source", icon: icon3(ICON_SOURCE) } : { value: ratio, label: ratio }), (ratio) => setDisplay({ ratio }));
      ratios.buttons.forEach((button2, i) => hint(button2, BG_HINTS.ratio(MEDIA_RATIOS[i])));
      hint(section("Ratio", ratios.root), BG_HINTS.ratioSection);
      const zoomProps = () => ({ label: "Zoom", unit: "\xD7", ...MEDIA_ZOOM, value: value.mediaDisplay.zoom, seekOnPress: true, hint: BG_HINTS.zoom, onChange: (zoom2) => setDisplay({ zoom: zoom2 }) });
      const zoom = mountSlider(shell, zoomProps());
      const grid = element6("div", "dialkit-background-position");
      grid.setAttribute("role", "radiogroup");
      grid.setAttribute("aria-label", "Pin");
      const pill = element6("span", "dialkit-background-position-pill");
      pill.setAttribute("aria-hidden", "true");
      grid.append(pill);
      const cells = ROWS2.flatMap((y, row) => COLUMNS2.map((x, column) => {
        const cell = element6("button", "dialkit-background-position-cell");
        cell.setAttribute("role", "radio");
        cell.setAttribute("aria-label", `${ROW_NAMES[row]}, ${COLUMN_NAMES[column]}`);
        cell.append(element6("span", "dialkit-background-position-dot"));
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
        const column = clamp(COLUMNS2.indexOf(x) + move[0], 0, 2);
        const row = clamp(ROWS2.indexOf(y) + move[1], 0, 2);
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
        if (!isHintKey(event2)) event2.stopPropagation();
      });
      portal.append(shell);
      syncOptions();
      const stopPosition = observeDropdownPosition(preview2, () => {
        if (!popup) return;
        if (!host.isConnected || !preview2.getClientRects().length) {
          closeOptions();
          return;
        }
        const scale = preview2.getBoundingClientRect().width / preview2.offsetWidth || 1;
        const p = getDropdownPosition(preview2, portal, { dropdownHeight: popup.scrollHeight + 2, width: 280, maxHeight: 480, preferSide: true, fixed: true, gap: 8, scale });
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
      preview2.dataset.open = "true";
      preview2.setAttribute("aria-expanded", "true");
      document.addEventListener("pointerdown", outside);
      document.addEventListener("focusin", outside);
      if (event.detail > 0) shell.focus({ preventScroll: true });
      else shell.querySelector('.dialkit-background-fits [data-active="true"]')?.focus({ preventScroll: true });
    };
    preview2.addEventListener("click", openOptions);
    root.append(solidPane, gradientPane, mediaPane);
    host.append(root);
    const panes = { solid: solidPane, gradient: gradientPane, media: mediaPane };
    let shownMode;
    let height;
    let paneFade;
    const blocks = () => [...Object.values(panes).flatMap((pane) => [...pane.children]).filter((el) => el !== stopList), ...[...rows2.values()].map((row) => row.root)];
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
        paneFade = layoutSpring(panes[value.mode], (p) => ({ opacity: String(clamp(p, 0, 1)) }), 0);
      } else {
        if (!rowDrag) for (const el of blocks()) {
          const from = before.tops.get(el);
          if (from !== void 0 && el.getClientRects().length) slide(el, from);
        }
        for (const row of entering) {
          const animation = layoutSpring(row.root, (p) => ({ opacity: String(clamp(p, 0, 1)), transform: `scale(${0.96 + 0.04 * clamp(p, 0, 1)})` }));
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
        const stop3 = stops[i];
        handle.style.setProperty("--dial-stop-at", `${stop3.at}%`);
        handle.style.setProperty("--dial-color", stop3.color);
        stems[i].style.setProperty("--dial-stop-at", `${stop3.at}%`);
        handle.setAttribute("aria-label", `Stop ${i + 1}`);
        handle.setAttribute("aria-valuenow", String(stop3.at));
        handle.setAttribute("aria-valuetext", `${stop3.at}%, ${stop3.color}`);
        handle.toggleAttribute("data-off", drag?.off === true && ids[i] === drag.id);
      });
      bar.toggleAttribute("data-full", stops.length >= MAX_GRADIENT_STOPS);
      const entering = syncRows(before);
      ids.forEach((id, i) => {
        const row = rows2.get(id);
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
      preview2.hidden = actions.hidden = !media;
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
          unsubscribe = DialStore.subscribe(next.panelId, onStore);
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
        rows2.forEach((row) => row.color.destroy());
        leaving.forEach((fade, row) => {
          fade.cancel();
          dropRow(row);
        });
        hints.destroy();
        root.remove();
      }
    };
  }

  // src/fields-control.ts
  function scaleFields(ranges, values, index, next) {
    const base = values.map((value, i) => Math.max(ranges[i].min, Math.min(ranges[i].max, value)));
    const from = base[index];
    const ratio = from !== 0;
    let low = -Infinity;
    let high = Infinity;
    ranges.forEach(({ min, max }, i) => {
      const value = base[i];
      if (!ratio) {
        low = Math.max(low, min - value);
        high = Math.min(high, max - value);
      } else if (value !== 0) {
        low = Math.max(low, Math.min(min / value, max / value));
        high = Math.min(high, Math.max(min / value, max / value));
      }
    });
    const amount = Math.max(low, Math.min(high, ratio ? next / from : next - from));
    return base.map((value, i) => {
      const { min, max, step } = ranges[i];
      return roundValue(ratio ? value * amount : value + amount, step, min, max);
    });
  }
  function createFieldLock() {
    let anchor;
    return {
      /** Every field's value after moving field `index` to `next`. */
      change(ranges, current2, index, next) {
        if (!anchor || anchor.index !== index || anchor.written.some((value, i) => value !== current2[i])) {
          anchor = { index, base: current2, written: current2 };
        }
        anchor.written = scaleFields(ranges, anchor.base, index, next);
        return anchor.written;
      },
      /**
       * Ends a scrub or a committed edit. A field that started at 0 moved the
       * others by an amount, not a ratio, so its next edit starts again from
       * the values it reached.
       */
      settle() {
        if (anchor && anchor.base[anchor.index] === 0) anchor = void 0;
      },
      reset() {
        anchor = void 0;
      }
    };
  }
  function resetFields(controls, values, defaults) {
    const updates = {};
    for (const { path } of controls) {
      if (path in defaults && values[path] !== defaults[path]) updates[path] = defaults[path];
    }
    return updates;
  }
  function element7(tag, className, text) {
    const el = document.createElement(tag);
    el.className = className;
    if (text) el.textContent = text;
    if (tag === "button") el.type = "button";
    return el;
  }
  function strokeIcon(paths) {
    const svg2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg2.setAttribute("viewBox", "0 0 24 24");
    svg2.setAttribute("fill", "none");
    svg2.setAttribute("stroke", "currentColor");
    svg2.setAttribute("stroke-width", "2");
    svg2.setAttribute("stroke-linecap", "round");
    svg2.setAttribute("stroke-linejoin", "round");
    svg2.setAttribute("aria-hidden", "true");
    for (const d of paths) {
      const path = document.createElementNS(svg2.namespaceURI, "path");
      path.setAttribute("d", d);
      svg2.append(path);
    }
    return svg2;
  }
  function rangeOf(control) {
    return { min: control.min ?? 0, max: control.max ?? 1, step: control.step ?? 0.01 };
  }
  function mountFields(host, initial) {
    let props = initial;
    let values = props.values;
    let signature = "";
    const fieldLock = createFieldLock();
    let scrub;
    let fields = [];
    const root = element7("div", "dialkit-fields");
    root.setAttribute("role", "group");
    const caption = element7("div", "dialkit-fields-caption");
    const label = element7("span", "dialkit-fields-label");
    const reset = element7("button", "dialkit-fields-reset");
    reset.append(strokeIcon(ICON_RESET));
    const lock = element7("button", "dialkit-fields-lock");
    lock.append(strokeIcon(ICON_LINK));
    caption.append(label, reset);
    const row = element7("div", "dialkit-fields-row");
    root.append(caption, row);
    host.append(root);
    const axes = () => props.controls.filter((control) => control.type === "slider");
    const lockControl = () => props.controls.find((control) => control.type === "toggle");
    const locked = () => {
      const control = lockControl();
      return control ? values[control.path] === true : false;
    };
    const read = (control) => {
      const value = values[control.path];
      return typeof value === "number" ? value : rangeOf(control).min;
    };
    const format = (control) => {
      const { min, max, step } = rangeOf(control);
      return read(control).toFixed(decimalsForStep(step, min, max));
    };
    function emit(updates) {
      if (Object.keys(updates).length === 0) return;
      values = { ...values, ...updates };
      render();
      props.onChange(updates);
    }
    function change(index, next) {
      const controls = axes();
      const ranges = controls.map(rangeOf);
      const current2 = controls.map(read);
      let result;
      if (locked()) {
        result = fieldLock.change(ranges, current2, index, next);
      } else {
        const { min, max, step } = ranges[index];
        result = current2.map((value, i) => i === index ? roundValue(next, step, min, max) : value);
      }
      const updates = {};
      controls.forEach((control, i) => {
        if (result[i] !== current2[i]) updates[control.path] = result[i];
      });
      emit(updates);
      return result[index];
    }
    function commit(index, next) {
      change(index, next);
      fieldLock.settle();
    }
    function endScrub() {
      const id = scrub?.id;
      if (scrub?.moved) fieldLock.settle();
      scrub = void 0;
      fields.forEach(({ field: field2, axis }) => {
        delete field2.dataset.scrubbing;
        if (id !== void 0 && axis.hasPointerCapture(id)) axis.releasePointerCapture(id);
      });
    }
    function createField(index) {
      const field2 = element7("div", "dialkit-fields-field");
      const axis = element7("span", "dialkit-fields-axis");
      axis.setAttribute("aria-hidden", "true");
      const value = element7("button", "dialkit-fields-value");
      field2.append(axis, value);
      const state = { field: field2, axis, value };
      const control = () => axes()[index];
      let scrubbed = false;
      const finish = (apply) => {
        const input = state.input;
        if (!input) return;
        state.input = void 0;
        const text = input.value.trim();
        const number2 = text === "" ? NaN : Number(text);
        if (apply && text !== format(control()) && Number.isFinite(number2)) commit(index, number2);
        input.replaceWith(value);
        render();
      };
      value.addEventListener("click", () => {
        if (state.input) return;
        const input = element7("input", "dialkit-fields-input");
        input.type = "text";
        input.inputMode = "decimal";
        input.autocomplete = "off";
        input.spellcheck = false;
        input.setAttribute("aria-label", `${props.label} ${control().label}`);
        input.value = input.defaultValue = format(control());
        input.addEventListener("blur", () => finish(true));
        input.addEventListener("keydown", (event) => {
          event.stopPropagation();
          if (event.key === "Enter" || event.key === "Escape") {
            event.preventDefault();
            finish(event.key === "Enter");
            return;
          }
          if (event.altKey || event.metaKey || event.ctrlKey || !["ArrowUp", "ArrowDown", "PageUp", "PageDown"].includes(event.key)) return;
          event.preventDefault();
          const { min, max, step } = rangeOf(control());
          const draft = input.value.trim() === "" ? NaN : Number(input.value);
          const next = sliderKeyValue(event.key, Number.isFinite(draft) ? draft : read(control()), min, max, step, event.shiftKey);
          if (next !== void 0) commit(index, next);
          input.value = input.defaultValue = format(control());
          input.select();
        });
        state.input = input;
        value.replaceWith(input);
        input.focus();
        input.select();
      });
      axis.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || scrub) return;
        event.preventDefault();
        const active2 = document.activeElement;
        if (active2 instanceof HTMLElement && root.contains(active2)) active2.blur();
        const current2 = read(control());
        scrub = { id: event.pointerId, index, x: event.clientX, value: current2, applied: current2, moved: false };
        scrubbed = false;
        axis.setPointerCapture(event.pointerId);
      });
      axis.addEventListener("pointermove", (event) => {
        if (!scrub || event.pointerId !== scrub.id) return;
        const dx = event.clientX - scrub.x;
        if (!scrub.moved && Math.abs(dx) < 3) return;
        scrub.moved = true;
        scrubbed = true;
        field2.dataset.scrubbing = "true";
        scrub.x = event.clientX;
        const { min, max, step } = rangeOf(control());
        const target = Math.max(min, Math.min(max, scrub.value + dx * step * (event.shiftKey ? 10 : 1)));
        scrub.applied = change(index, target);
        scrub.value = Math.abs(scrub.applied - target) > step / 2 ? scrub.applied : target;
      });
      axis.addEventListener("pointerup", (event) => {
        if (event.pointerId === scrub?.id) endScrub();
      });
      axis.addEventListener("pointercancel", (event) => {
        if (event.pointerId === scrub?.id) endScrub();
      });
      axis.addEventListener("lostpointercapture", (event) => {
        if (event.pointerId === scrub?.id) endScrub();
      });
      axis.addEventListener("click", (event) => {
        if (scrubbed) event.preventDefault();
        scrubbed = false;
      });
      row.append(field2);
      return state;
    }
    reset.addEventListener("click", () => {
      fieldLock.reset();
      emit(resetFields(props.controls, values, props.defaults));
    });
    lock.addEventListener("click", () => {
      const control = lockControl();
      if (!control) return;
      fieldLock.reset();
      emit({ [control.path]: !locked() });
    });
    function build() {
      const next = axes().map((control) => control.path).join("\n");
      if (next === signature) return;
      signature = next;
      endScrub();
      fieldLock.reset();
      fields.forEach(({ field: field2 }) => {
        setHint(field2, void 0);
        field2.remove();
      });
      fields = axes().map((_, index) => createField(index));
    }
    function render() {
      root.setAttribute("aria-label", props.label);
      setHint(root, props.hint);
      label.textContent = props.label;
      reset.setAttribute("aria-label", `Reset ${props.label}`);
      if (Object.keys(resetFields(props.controls, values, props.defaults)).length > 0) {
        reset.dataset.changed = "true";
      } else {
        if (document.activeElement === reset) fields[0]?.value.focus();
        delete reset.dataset.changed;
      }
      const lockMeta = lockControl();
      if (lockMeta) {
        if (lock.parentNode !== caption) caption.append(lock);
        lock.setAttribute("aria-label", `${lockMeta.label} ${props.label}`);
        lock.setAttribute("aria-pressed", String(locked()));
      } else {
        lock.remove();
      }
      axes().forEach((control, index) => {
        const { field: field2, axis, value, input } = fields[index];
        const text = format(control);
        axis.textContent = control.label;
        setHint(field2, control.hint);
        value.textContent = text;
        value.setAttribute("aria-label", `${props.label} ${control.label}: ${text}`);
        if (input && input.value === input.defaultValue && input.value !== text) {
          input.value = input.defaultValue = text;
          if (document.activeElement === input) input.select();
        }
      });
    }
    build();
    render();
    return {
      update(next) {
        props = next;
        values = next.values;
        build();
        const scrubbed = scrub && axes()[scrub.index];
        if (scrub && scrubbed && read(scrubbed) !== scrub.applied) {
          scrub.value = scrub.applied = read(scrubbed);
        }
        render();
      },
      destroy() {
        endScrub();
        fields.forEach(({ field: field2 }) => setHint(field2, void 0));
        setHint(root, void 0);
        root.remove();
      }
    };
  }

  // src/anchor-control.ts
  function element8(tag, className, text) {
    const el = document.createElement(tag);
    el.className = className;
    if (text) el.textContent = text;
    return el;
  }
  var PILL_SPRING = springParams({ type: "spring", visualDuration: 0.3, bounce: 0 });
  var PILL_OMEGA = Math.sqrt(PILL_SPRING.stiffness / PILL_SPRING.mass);
  var PILL_DURATION = 0.55;
  function slideAxis(from, velocity, to, t) {
    const offset = from - to;
    const b = velocity + PILL_OMEGA * offset;
    const decay = Math.exp(-PILL_OMEGA * t);
    return [to + (offset + b * t) * decay, (velocity - PILL_OMEGA * b * t) * decay];
  }
  function mountAnchorControl(host, initial) {
    let props = initial;
    let value = normalizeAnchorValue(props.value);
    let at;
    let slide;
    const grid = element8("div", "dialkit-anchor");
    grid.setAttribute("role", "radiogroup");
    const pill = element8("span", "dialkit-anchor-pill");
    pill.setAttribute("aria-hidden", "true");
    grid.append(pill);
    const cells = ANCHOR_ROWS.flatMap((y) => ANCHOR_COLUMNS.map((x) => {
      const cell = element8("button", "dialkit-anchor-cell");
      const option = { x, y };
      cell.type = "button";
      cell.setAttribute("role", "radio");
      cell.setAttribute("aria-label", anchorLabel(option));
      cell.append(element8("span", "dialkit-anchor-dot"));
      cell.addEventListener("click", () => commit(option));
      grid.append(cell);
      return { cell, option };
    }));
    host.append(grid);
    function move(to) {
      const from = at;
      at = to;
      pill.style.translate = `${to[0] * 100}% ${to[1] * 100}%`;
      if (!from || from[0] === to[0] && from[1] === to[1]) return;
      if (typeof pill.animate !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      let start = from;
      let velocity = [0, 0];
      if (slide?.animation.playState === "running") {
        const t = Number(slide.animation.currentTime ?? 0) / 1e3;
        const { from: prev, velocity: v, to: target } = slide;
        const [x, vx] = slideAxis(prev[0], v[0], target[0], t);
        const [y, vy] = slideAxis(prev[1], v[1], target[1], t);
        start = [x, y];
        velocity = [vx, vy];
      }
      slide?.animation.cancel();
      const count = Math.ceil(PILL_DURATION * 60);
      const frames = Array.from({ length: count + 1 }, (_, index) => {
        const t = index / count * PILL_DURATION;
        const x = index === count ? to[0] : slideAxis(start[0], velocity[0], to[0], t)[0];
        const y = index === count ? to[1] : slideAxis(start[1], velocity[1], to[1], t)[0];
        return { translate: `${x * 100}% ${y * 100}%` };
      });
      slide = { from: start, velocity, to, animation: pill.animate(frames, { duration: PILL_DURATION * 1e3, easing: "linear" }) };
    }
    function render() {
      setHint(grid, props.hint);
      grid.setAttribute("aria-label", props.label);
      move([ANCHOR_COLUMNS.indexOf(value.x), ANCHOR_ROWS.indexOf(value.y)]);
      for (const { cell, option } of cells) {
        const checked = option.x === value.x && option.y === value.y;
        cell.setAttribute("aria-checked", String(checked));
        cell.tabIndex = checked ? 0 : -1;
      }
    }
    function commit(next) {
      if (next.x === value.x && next.y === value.y) return;
      value = next;
      render();
      props.onChange({ ...value });
    }
    grid.addEventListener("keydown", (event) => {
      if (event.altKey || event.metaKey || event.ctrlKey) return;
      const next = anchorValueFromKey(value, event.key);
      if (!next) return;
      event.preventDefault();
      event.stopPropagation();
      commit(next);
      cells.find(({ option }) => option.x === value.x && option.y === value.y)?.cell.focus({ preventScroll: true });
    });
    render();
    return {
      update(next) {
        props = next;
        value = normalizeAnchorValue(next.value);
        render();
      },
      destroy() {
        slide?.animation.cancel();
        setHint(grid, void 0);
        grid.remove();
      }
    };
  }

  // src/preset-menu.ts
  var ROW = ".dialkit-preset-item[data-preset-id]";
  var DRAG_THRESHOLD_PX = 3;
  var GLIDE_MS = 200;
  var LONG_PRESS_MS = 400;
  function versionNamePrefix(noun = "version") {
    return noun === "sequence" ? "Sequence" : void 0;
  }
  function observePresetMenu(getPopup, reorder) {
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
      const rows2 = () => Array.from(popup.querySelectorAll(ROW));
      const move = (id, to) => {
        const ids = rows2().map((row) => row.dataset.presetId).filter((other) => other !== id);
        ids.splice(to, 0, id);
        reorder(ids);
      };
      const reset = () => {
        delete popup.dataset.dragging;
        for (const row of rows2()) {
          row.style.transform = "";
          delete row.dataset.dragging;
        }
      };
      const layout = ({ from, to, offset, step }) => rows2().forEach((row, index) => {
        const shift = index === from ? offset : from < to && index > from && index <= to ? -step : to < from && index >= to && index < from ? step : 0;
        row.style.transform = shift ? `translateY(${shift}px)` : "";
      });
      let drag;
      const stopDrag = () => {
        if (drag) clearTimeout(drag.hold);
        drag = void 0;
        document.removeEventListener("pointermove", pointermove);
        document.removeEventListener("pointerup", pointerup);
        document.removeEventListener("pointercancel", pointercancel);
      };
      const swallow = (event) => {
        event.preventDefault();
        event.stopPropagation();
      };
      const lift = (current2) => {
        const [first, second] = rows2().map((row) => row.getBoundingClientRect().top);
        if (second === void 0) {
          stopDrag();
          return;
        }
        current2.lifted = true;
        current2.scale = popup.offsetHeight ? popup.getBoundingClientRect().height / popup.offsetHeight || 1 : 1;
        current2.step = (second - first) / current2.scale;
        popup.dataset.dragging = "true";
        current2.row.dataset.dragging = "true";
      };
      const pointermove = (event) => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        const dy = event.clientY - drag.startY;
        if (!drag.lifted) {
          if (event.pointerType === "touch") {
            if (Math.hypot(event.clientX - drag.startX, dy) > DRAG_THRESHOLD_PX) stopDrag();
            return;
          }
          if (Math.abs(dy) <= DRAG_THRESHOLD_PX) return;
          lift(drag);
          if (!drag?.lifted) return;
        }
        const last = rows2().length - 1;
        drag.offset = Math.min(Math.max(dy / drag.scale, -drag.from * drag.step), (last - drag.from) * drag.step);
        drag.to = Math.min(Math.max(Math.round(drag.from + drag.offset / drag.step), 0), last);
        layout(drag);
      };
      const pointerup = (event) => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        const done = drag;
        stopDrag();
        if (!done.lifted) return;
        window.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener("click", swallow, true));
        const end = (done.to - done.from) * done.step;
        const glide = done.row.animate(
          [{ transform: `translateY(${done.offset}px)` }, { transform: `translateY(${end}px)` }],
          { duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : GLIDE_MS, easing: "cubic-bezier(0.25, 1, 0.5, 1)", fill: "forwards" }
        );
        glide.onfinish = () => {
          glide.cancel();
          reset();
          if (done.to !== done.from) move(done.id, done.to);
        };
      };
      const pointercancel = (event) => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        const done = drag;
        stopDrag();
        if (done.lifted) reset();
      };
      const touchmove = (event) => {
        if (drag?.lifted) event.preventDefault();
      };
      const contextmenu = (event) => {
        if (drag) event.preventDefault();
      };
      const pointerdown = (event) => {
        const target = event.target;
        const row = target.closest(ROW);
        if (drag || popup.dataset.dragging || event.button !== 0 || !row || target.closest("input, .dialkit-preset-actions")) return;
        const current2 = { row, id: row.dataset.presetId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, from: rows2().indexOf(row), to: 0, offset: 0, step: 0, scale: 1, lifted: false, hold: 0 };
        if (event.pointerType === "touch") current2.hold = window.setTimeout(() => {
          if (drag === current2) lift(current2);
        }, LONG_PRESS_MS);
        drag = current2;
        document.addEventListener("pointermove", pointermove);
        document.addEventListener("pointerup", pointerup);
        document.addEventListener("pointercancel", pointercancel);
      };
      const keydown = (event) => {
        const target = event.target;
        const row = target.closest(ROW);
        if (!event.altKey || event.metaKey || event.ctrlKey || !["ArrowUp", "ArrowDown"].includes(event.key) || !row || target instanceof HTMLInputElement) return;
        event.preventDefault();
        event.stopPropagation();
        const id = row.dataset.presetId;
        const list = rows2();
        const to = Math.min(Math.max(list.indexOf(row) + (event.key === "ArrowUp" ? -1 : 1), 0), list.length - 1);
        if (list[to] === row) return;
        move(id, to);
        queueMicrotask(() => popup.querySelector(`${ROW}[data-preset-id="${CSS.escape(id)}"] .dialkit-preset-name`)?.focus({ preventScroll: true }));
      };
      const click = (event) => {
        event.target.closest(".dialkit-preset-more")?.focus({ preventScroll: true });
      };
      popup.addEventListener("pointerdown", pointerdown);
      popup.addEventListener("touchmove", touchmove, { passive: false });
      popup.addEventListener("contextmenu", contextmenu);
      popup.addEventListener("keydown", keydown);
      popup.addEventListener("click", click);
      dispose = () => {
        if (drag?.lifted) reset();
        stopDrag();
        popup.removeEventListener("pointerdown", pointerdown);
        popup.removeEventListener("touchmove", touchmove);
        popup.removeEventListener("contextmenu", contextmenu);
        popup.removeEventListener("keydown", keydown);
        popup.removeEventListener("click", click);
      };
    };
    frame = requestAnimationFrame(connect);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      dispose?.();
    };
  }

  // src/vanilla/menus.ts
  function popupMenu(trigger, className, kind, populate, onOpen) {
    let popup;
    let stopKeyboard, stopPosition, stopOpen;
    const outside = (event) => {
      if (!trigger.contains(event.target) && !popup?.contains(event.target))
        close2();
    };
    function close2() {
      stopKeyboard?.();
      stopPosition?.();
      stopOpen?.();
      stopKeyboard = stopPosition = stopOpen = void 0;
      popup?.remove();
      popup = void 0;
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
      stopOpen = onOpen?.(popup);
      populate(popup);
      trigger.dataset.open = "true";
      trigger.setAttribute("aria-expanded", "true");
      stopPosition = observeDropdownPosition(trigger, () => {
        if (!popup)
          return;
        if (!trigger.isConnected || !trigger.getClientRects().length) {
          close2();
          return;
        }
        const p = getDropdownPosition(trigger, root, { fixed: true, dropdownHeight: popup.scrollHeight + 2, ...kind === "help" ? { width: 280 } : {} });
        Object.assign(popup.style, { top: `${p.top}px`, left: `${p.left}px`, maxHeight: `${p.maxHeight}px` });
        if (kind !== "presets") popup.style.width = `${p.width}px`;
      }, () => popup);
      stopKeyboard = observeDropdownKeyboard(trigger, () => popup, close2, kind);
      document.addEventListener("pointerdown", outside);
    }
    const click = () => {
      if (popup)
        close2();
      else
        open();
    };
    const key = (e) => openDropdownOnKey(e, open);
    trigger.setAttribute("aria-haspopup", kind === "select" ? "listbox" : kind === "presets" ? "menu" : "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", click);
    trigger.addEventListener("keydown", key);
    return {
      close: close2,
      refresh() {
        if (popup)
          populate(popup);
      },
      destroy() {
        close2();
        trigger.removeEventListener("click", click);
        trigger.removeEventListener("keydown", key);
      }
    };
  }
  function selectOptions(options) {
    return options.map((option) => typeof option === "string" ? { value: option, label: option.replace(/\b\w/g, (c) => c.toUpperCase()) } : option);
  }
  function mountSelectControl(host, initial) {
    let props = initial;
    const mountForm = () => (props.display === "segmented" ? mountSegmentedSelect : mountSelectDropdown)(host, props);
    let form = mountForm();
    return {
      update(next) {
        const remount = next.display === "segmented" !== (props.display === "segmented");
        props = next;
        if (!remount)
          return form.update(props);
        const previous = form;
        form = mountForm();
        previous.row.before(form.row);
        previous.destroy();
      },
      destroy() {
        form.destroy();
      }
    };
  }
  function mountSelectDropdown(host, initial) {
    let props = initial;
    const row = element5("div", "dialkit-select-row");
    const trigger = element5("button", "dialkit-select-trigger");
    const label = element5("span", "dialkit-select-label");
    const right = element5("div", "dialkit-select-right");
    const value = element5("span", "dialkit-select-value");
    right.append(value, icon2(ICON_CHEVRON, "dialkit-select-chevron"));
    trigger.append(label, right);
    row.append(trigger);
    host.append(row);
    const options = () => selectOptions(props.options);
    const menu = popupMenu(trigger, "dialkit-select-dropdown", "select", (popup) => {
      popup.replaceChildren(...options().map((option) => {
        const b = element5("button", "dialkit-select-option", option.label);
        b.dataset.selected = String(option.value === props.value);
        b.addEventListener("click", () => {
          props.onChange(option.value);
          menu.close();
        });
        return b;
      }));
    });
    function render() {
      label.textContent = props.label;
      setHint(row, props.hint);
      value.textContent = options().find((o) => o.value === props.value)?.label ?? props.value;
      trigger.disabled = !props.options.length;
      menu.refresh();
    }
    render();
    return {
      row,
      update(next) {
        props = next;
        render();
      },
      destroy() {
        menu.destroy();
        setHint(row, void 0);
        row.remove();
      }
    };
  }
  function mountSegmentedSelect(host, initial) {
    let props = initial;
    const row = element5("div", "dialkit-labeled-control");
    const label = element5("span", "dialkit-labeled-control-label");
    host.append(row);
    const segmentProps = () => ({ options: selectOptions(props.options), value: props.value, onChange: (value) => props.onChange(value), label: props.label });
    const segmented = mountSegmentedControl(row, segmentProps());
    function render() {
      label.textContent = props.label;
      setHint(row, props.hint);
      if (props.hideLabel) {
        row.dataset.hideLabel = "true";
        label.remove();
      } else {
        delete row.dataset.hideLabel;
        row.prepend(label);
      }
      segmented.update(segmentProps());
    }
    render();
    return {
      row,
      update(next) {
        props = next;
        render();
      },
      destroy() {
        segmented.destroy();
        setHint(row, void 0);
        row.remove();
      }
    };
  }
  function mountPresetManager(host, initial) {
    let props = initial;
    const row = element5("div", "dialkit-preset-manager");
    const trigger = element5("button", "dialkit-preset-trigger");
    const label = element5("span", "dialkit-preset-label");
    trigger.setAttribute("aria-label", "Versions");
    setHint(trigger, versionHints(props.noun).versions);
    trigger.append(label, icon2(ICON_CHEVRON, "dialkit-select-chevron"));
    row.append(trigger);
    host.append(row);
    let editingId = null;
    const finishRename = (presetId, name) => {
      editingId = null;
      if (name !== void 0) DialStore.renamePreset(props.panelId, presetId, name);
      menu.refresh();
    };
    const action = (className, label2, paths, onClick) => {
      const node = element5("button", className);
      node.setAttribute("aria-label", label2);
      node.append(icon2(paths));
      node.addEventListener("click", onClick);
      return node;
    };
    const menu = popupMenu(trigger, "dialkit-preset-dropdown", "presets", (popup) => {
      const versions = [{ id: null, name: DialStore.getBaseName(props.panelId) }, ...props.presets];
      popup.replaceChildren(...versions.map((preset) => {
        const item = element5("div", "dialkit-preset-item");
        item.dataset.active = String(preset.id === props.activePresetId);
        item.addEventListener("click", (event) => {
          if (event.target.closest("input, .dialkit-preset-actions"))
            return;
          if (preset.id)
            DialStore.loadPreset(props.panelId, preset.id);
          else
            DialStore.clearActivePreset(props.panelId);
          menu.close();
        });
        item.append(icon2(preset.id === props.activePresetId ? ICON_CHECK : [], "dialkit-preset-check"));
        if (!preset.id) {
          item.append(element5("button", "dialkit-preset-name", preset.name));
          return item;
        }
        const id = preset.id;
        item.dataset.presetId = id;
        item.dataset.locked = String(!!preset.locked);
        if (id === editingId) {
          const input = element5("input", "dialkit-preset-input");
          input.value = preset.name;
          input.setAttribute("aria-label", "Version name");
          input.addEventListener("focus", () => input.select());
          input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") finishRename(id, input.value);
            else if (event.key === "Escape") finishRename(id);
            else return;
            event.preventDefault();
          });
          input.addEventListener("blur", () => {
            if (editingId === id) finishRename(id, input.value);
          });
          item.append(input);
          queueMicrotask(() => input.focus());
          return item;
        }
        const actions = element5("div", "dialkit-preset-actions");
        const lock = action("dialkit-preset-lock", `${preset.locked ? "Unlock" : "Lock"} ${preset.name}`, preset.locked ? ICON_LOCK : ICON_LOCK_OPEN, () => DialStore.setPresetLocked(props.panelId, id, !preset.locked));
        const rename = action("dialkit-preset-rename", `Rename ${preset.name}`, ICON_PENCIL, () => {
          editingId = id;
          menu.refresh();
        });
        if (preset.locked) actions.append(lock, rename);
        else {
          const more = element5("button", "dialkit-preset-more");
          more.type = "button";
          more.setAttribute("aria-label", `More actions for ${preset.name}`);
          more.dataset.hint = versionHints(props.noun).versionActions;
          more.append(icon2(ICON_MORE));
          actions.append(more, rename, lock, action("dialkit-preset-delete", `Delete ${preset.name}`, ICON_TRASH, () => DialStore.deletePreset(props.panelId, id)));
        }
        item.append(element5("button", "dialkit-preset-name", preset.name), actions);
        return item;
      }));
      const divider = element5("div", "dialkit-preset-divider");
      divider.setAttribute("role", "separator");
      const create = element5("button", "dialkit-preset-create");
      create.append(icon2(ICON_PLUS, "dialkit-preset-check"), document.createTextNode(`New ${props.noun ?? "version"}`));
      create.addEventListener("click", () => {
        if (props.onAdd) props.onAdd();
        else DialStore.saveNewPreset(props.panelId, versionNamePrefix(props.noun));
        menu.close();
        trigger.focus();
      });
      popup.append(divider, create);
    }, (popup) => {
      editingId = null;
      return observePresetMenu(() => popup, (ids) => DialStore.reorderPresets(props.panelId, ids));
    });
    function render() {
      const active2 = props.presets.find((p) => p.id === props.activePresetId);
      label.textContent = active2?.name ?? DialStore.getBaseName(props.panelId);
      trigger.dataset.hasPreset = String(!!active2);
      menu.refresh();
    }
    render();
    return {
      update(next) {
        props = next;
        render();
      },
      destroy() {
        menu.destroy();
        setHint(trigger, void 0);
        row.remove();
      }
    };
  }
  function mountShortcutsMenu(host, initial) {
    let props = initial;
    const trigger = element5("button", "dialkit-shortcuts-trigger");
    trigger.setAttribute("aria-label", "Keyboard shortcuts");
    trigger.append(icon2(["M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z", "M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"]));
    host.append(trigger);
    const menu = popupMenu(trigger, "dialkit-shortcuts-dropdown", "help", (popup) => {
      const panel = DialStore.getPanel(props.panelId);
      popup.replaceChildren(element5("div", "dialkit-shortcuts-title", "Keyboard Shortcuts"));
      const list = element5("div", "dialkit-shortcuts-list");
      for (const [path, shortcut] of Object.entries(panel?.shortcuts ?? {})) {
        const row = element5("div", "dialkit-shortcuts-row");
        const interaction = shortcut.interaction ?? "scroll";
        row.append(element5("span", "dialkit-shortcuts-row-key", formatToggleShortcut(shortcut)), element5("span", "dialkit-shortcuts-row-label", DialStore.getControl(props.panelId, path)?.label ?? path), element5("span", "dialkit-shortcuts-row-mode", interaction === "scroll-only" ? "scroll" : `key+${interaction}`));
        list.append(row);
      }
      popup.append(list, element5("div", "dialkit-shortcuts-hint", "See pill badges on controls for keys"));
    });
    const render = () => {
      trigger.style.display = Object.keys(DialStore.getPanel(props.panelId)?.shortcuts ?? {}).length ? "" : "none";
      menu.refresh();
    };
    const stop3 = DialStore.subscribeGlobal(render);
    render();
    return {
      update(next) {
        props = next;
        render();
      },
      destroy() {
        stop3();
        menu.destroy();
        trigger.remove();
      }
    };
  }

  // src/easing-control.ts
  var nextId3 = 0;
  var MORPH_MS = 250;
  function mountEasingVisualization(host, initial) {
    let props = initial;
    let value = normalizeEase(props.easing.ease);
    let width = 256;
    let height = 180;
    let shown;
    let morphFrame = 0;
    let lastOutsideChange = -Infinity;
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
    help.id = `dialkit-easing-help-${++nextId3}`;
    help.textContent = "Drag to adjust X from 0 to 1 and Y from -1 to 2. Arrow keys adjust by 0.01. Shift adjusts by 0.1. Escape cancels a drag.";
    root.append(svg2, help);
    const handles = [0, 1].map((handle) => {
      const button2 = document.createElement("button");
      button2.type = "button";
      button2.className = "dialkit-easing-handle";
      button2.setAttribute("aria-describedby", help.id);
      button2.addEventListener("pointerdown", (event) => {
        if (!props.onChange || event.button !== 0 || drag) return;
        event.preventDefault();
        event.stopPropagation();
        button2.focus({ preventScroll: true });
        stopMorph();
        measure();
        const bounds = root.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        drag = { id: event.pointerId, handle, x: event.clientX, y: event.clientY, scale: fitEasingGraph(value, width, height).scale, ratioX: width / bounds.width, ratioY: height / bounds.height, value: [...value] };
        button2.setPointerCapture(event.pointerId);
        button2.dataset.dragging = "true";
      });
      button2.addEventListener("pointermove", move);
      button2.addEventListener("pointerup", (event) => {
        if (event.pointerId !== drag?.id) return;
        move(event);
        endDrag();
      });
      button2.addEventListener("pointercancel", (event) => {
        if (event.pointerId === drag?.id) cancelDrag();
      });
      button2.addEventListener("lostpointercapture", (event) => {
        if (event.pointerId === drag?.id) endDrag();
      });
      button2.addEventListener("keydown", (event) => {
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
      root.append(button2);
      return button2;
    });
    host.append(root);
    function line(node, a, b) {
      node.setAttribute("x1", String(a.x));
      node.setAttribute("y1", String(a.y));
      node.setAttribute("x2", String(b.x));
      node.setAttribute("y2", String(b.y));
    }
    function render() {
      const graph = fitEasingGraph(shown ?? value, width, height);
      svg2.setAttribute("viewBox", `0 0 ${width} ${height}`);
      line(reference, graph.start, graph.end);
      [graph.start, graph.end].forEach((point, index) => {
        line(tangents[index], point, easingGuideEnd(point, graph.handles[index]));
        endpoints[index].setAttribute("cx", String(point.x));
        endpoints[index].setAttribute("cy", String(point.y));
        endpoints[index].setAttribute("r", "2.5");
        const button2 = handles[index];
        button2.style.left = `${graph.handles[index].x / width * 100}%`;
        button2.style.top = `${graph.handles[index].y / height * 100}%`;
        button2.disabled = !props.onChange;
        button2.setAttribute("aria-label", `B\xE9zier handle ${index + 1}: X ${value[index * 2]}, Y ${value[index * 2 + 1]}`);
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
      stopMorph();
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
    function morph(from) {
      cancelAnimationFrame(morphFrame);
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        shown = void 0;
        return;
      }
      const target = value;
      let start;
      const step = (now) => {
        start ?? (start = now);
        const t = Math.min(1, (now - start) / MORPH_MS);
        const k = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
        shown = t < 1 ? from.map((part, index) => part + (target[index] - part) * k) : void 0;
        render();
        if (shown) morphFrame = requestAnimationFrame(step);
      };
      shown = from;
      morphFrame = requestAnimationFrame(step);
    }
    function stopMorph() {
      cancelAnimationFrame(morphFrame);
      shown = void 0;
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
        const changed = incoming.some((part, index) => part !== value[index]);
        const from = drag ? void 0 : shown ?? value;
        if (!next.onChange || changed) endDrag();
        props = next;
        value = incoming;
        if (changed) {
          const now = performance.now();
          if (from && now - lastOutsideChange >= MORPH_MS) morph(from);
          else stopMorph();
          lastOutsideChange = now;
        }
        render();
      },
      destroy() {
        endDrag();
        stopMorph();
        observer.disconnect();
        root.remove();
      }
    };
  }
  var EASE_FIELDS = [
    { name: "X1", min: 0, max: 1 },
    { name: "Y1", min: -1, max: 2 },
    { name: "X2", min: 0, max: 1 },
    { name: "Y2", min: -1, max: 2 }
  ];
  var SCRUB_THRESHOLD = 3;
  var formatEasePart = (value) => String(Number(value.toFixed(2)) || 0);
  var EASE_FIELDS_HINT = "The two handles of the curve: the start point (X, Y) and the end point (X, Y). Drag a field or click it to type.";
  function mountEaseFields(host, initial) {
    let props = initial;
    let value = normalizeEase(props.ease);
    let press;
    const root = document.createElement("div");
    root.className = "dialkit-ease-fields";
    const commitAll = (ease) => {
      if (ease.every((part, index) => part === value[index])) return;
      value = ease;
      render();
      props.onChange([...value]);
    };
    const commit = (index, next) => {
      const { min, max } = EASE_FIELDS[index];
      const ease = [...value];
      ease[index] = Number(Math.max(min, Math.min(max, next)).toFixed(3));
      commitAll(ease);
    };
    const fields = EASE_FIELDS.map((field2, index) => {
      const input = document.createElement("input");
      input.className = "dialkit-ease-field";
      input.type = "text";
      input.inputMode = "decimal";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.setAttribute("role", "spinbutton");
      input.setAttribute("aria-label", field2.name);
      input.setAttribute("aria-valuemin", String(field2.min));
      input.setAttribute("aria-valuemax", String(field2.max));
      root.append(input);
      input.addEventListener("focus", () => input.select());
      input.addEventListener("input", () => {
        fields[index].draft = true;
      });
      const accept = () => {
        if (!fields[index].draft) return;
        fields[index].draft = false;
        const curve = parseEase(input.value);
        const number2 = input.value.trim() === "" ? NaN : Number(input.value);
        if (curve) commitAll(curve);
        else if (Number.isFinite(number2)) commit(index, number2);
        input.value = formatEasePart(value[index]);
      };
      input.addEventListener("blur", accept);
      input.addEventListener("keydown", (event) => {
        event.stopPropagation();
        if (event.key === "Enter" || event.key === "Escape") {
          event.preventDefault();
          if (event.key === "Enter") accept();
          fields[index].draft = false;
          input.value = formatEasePart(value[index]);
          input.select();
        } else if (!event.altKey && !event.metaKey && !event.ctrlKey && ["ArrowUp", "ArrowDown"].includes(event.key)) {
          event.preventDefault();
          const draft = input.value.trim() === "" ? NaN : Number(input.value);
          const current2 = Number.isFinite(draft) ? draft : value[index];
          fields[index].draft = false;
          commit(index, current2 + (event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? 0.1 : 0.01));
          input.value = formatEasePart(value[index]);
          input.select();
        }
      });
      input.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || press || document.activeElement === input) return;
        event.preventDefault();
        press = { id: event.pointerId, index, x: event.clientX, start: value[index], shift: event.shiftKey, last: event.clientX, moved: false };
        input.setPointerCapture(event.pointerId);
      });
      input.addEventListener("pointermove", (event) => {
        if (event.pointerId !== press?.id) return;
        if (!press.moved) {
          if (Math.abs(event.clientX - press.x) < SCRUB_THRESHOLD) return;
          press.moved = true;
          input.dataset.scrubbing = "true";
        }
        if (event.shiftKey !== press.shift) press = { ...press, x: press.last, start: value[index], shift: event.shiftKey };
        press.last = event.clientX;
        commit(index, press.start + (event.clientX - press.x) * (press.shift ? 0.1 : 0.01));
      });
      input.addEventListener("pointerup", (event) => {
        if (event.pointerId !== press?.id) return;
        const moved = press.moved;
        endPress();
        if (!moved) input.focus();
      });
      input.addEventListener("pointercancel", (event) => {
        if (event.pointerId === press?.id) endPress();
      });
      return { input, draft: false };
    });
    host.append(root);
    setHint(root, EASE_FIELDS_HINT);
    function endPress() {
      if (!press) return;
      const { id, index } = press;
      press = void 0;
      const { input } = fields[index];
      delete input.dataset.scrubbing;
      if (input.hasPointerCapture(id)) input.releasePointerCapture(id);
    }
    function render() {
      fields.forEach(({ input, draft }, index) => {
        input.setAttribute("aria-valuenow", String(value[index]));
        const focused = document.activeElement === input;
        if (focused && draft) return;
        const all = input.selectionStart === 0 && input.selectionEnd === input.value.length;
        input.value = formatEasePart(value[index]);
        if (focused && all) input.select();
      });
    }
    render();
    return {
      update(next) {
        props = next;
        value = normalizeEase(next.ease);
        render();
      },
      destroy() {
        endPress();
        setHint(root, void 0);
        root.remove();
      }
    };
  }

  // src/transition-presets-control.ts
  function element9(tag, className, text) {
    const el = document.createElement(tag);
    el.className = className;
    if (text) el.textContent = text;
    if (el instanceof HTMLButtonElement) el.type = "button";
    return el;
  }
  function svgIcon(paths, className, strokeWidth = 2) {
    const icon4 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon4.setAttribute("class", className);
    icon4.setAttribute("viewBox", "0 0 24 24");
    icon4.setAttribute("fill", "none");
    icon4.setAttribute("stroke", "currentColor");
    icon4.setAttribute("stroke-width", String(strokeWidth));
    icon4.setAttribute("stroke-linecap", "round");
    icon4.setAttribute("aria-hidden", "true");
    for (const d of paths) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      icon4.append(path);
    }
    return icon4;
  }
  var THUMB_WIDTH = 24;
  var THUMB_HEIGHT = 16;
  function thumbnail(value) {
    const pad = 1.5;
    let points;
    if (value.type === "easing") {
      const [x1, y1, x2, y2] = value.ease;
      points = [[0, 0], [x1, y1], [x2, y2], [1, 1]];
    } else {
      const params = springParams(value);
      const end = springSettleDuration(params);
      points = Array.from({ length: 25 }, (_, i) => [i / 24, springProgress(i / 24 * end, params)]);
    }
    const low = Math.min(0, ...points.map(([, y]) => y));
    const high = Math.max(1, ...points.map(([, y]) => y));
    const coords = points.map(([x, y]) => `${pad + x * (THUMB_WIDTH - pad * 2)} ${THUMB_HEIGHT - pad - (y - low) / (high - low) * (THUMB_HEIGHT - pad * 2)}`);
    const icon4 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon4.setAttribute("class", "dialkit-transition-preset-thumb");
    icon4.setAttribute("viewBox", `0 0 ${THUMB_WIDTH} ${THUMB_HEIGHT}`);
    icon4.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", value.type === "easing" ? `M ${coords[0]} C ${coords.slice(1).join(", ")}` : `M ${coords.join(" L ")}`);
    icon4.append(path);
    return icon4;
  }
  function mountTransitionPresets(host, initial) {
    let props = initial;
    const saved = () => DialStore.getTransitionPresets().filter((preset) => preset.mode === props.mode);
    let tab = saved().some((preset) => sameTransition(preset.value, props.value, props.mode)) && !defaultTransitionPresets(props.mode).some((preset) => sameTransition(preset.value, props.value, props.mode)) ? "custom" : "defaults";
    let signature = "";
    let items = [];
    const root = element9("div", "dialkit-transition-presets");
    const tabs = element9("div", "dialkit-segmented dialkit-transition-preset-tabs");
    tabs.setAttribute("role", "radiogroup");
    tabs.setAttribute("aria-label", "Preset source");
    tabs.addEventListener("keydown", handleSegmentKey);
    const pill = element9("div", "dialkit-segmented-pill");
    pill.setAttribute("aria-hidden", "true");
    tabs.append(pill);
    const tabButtons = ["defaults", "custom"].map((value) => {
      const button2 = element9("button", "dialkit-segmented-button dialkit-transition-preset-tab", value === "defaults" ? "Defaults" : "Custom");
      button2.setAttribute("role", "radio");
      button2.addEventListener("click", () => {
        tab = value;
        render();
      });
      tabs.append(button2);
      return button2;
    });
    const list = element9("div", "dialkit-transition-preset-list");
    list.setAttribute("role", "group");
    const fade = () => {
      list.toggleAttribute("data-above", list.scrollTop > 0);
      list.toggleAttribute("data-below", list.scrollTop + list.clientHeight < list.scrollHeight - 1);
    };
    list.addEventListener("scroll", fade, { passive: true });
    const resize = typeof ResizeObserver === "undefined" ? void 0 : new ResizeObserver(fade);
    resize?.observe(list);
    const empty = element9("p", "dialkit-transition-preset-empty");
    const save = element9("button", "dialkit-transition-preset-save");
    save.addEventListener("click", () => DialStore.saveTransitionPreset(props.value, props.mode));
    root.append(tabs, list, empty, save);
    host.append(root);
    const presetNoun = () => props.mode === "easing" ? "curve" : "spring";
    const unhintItems = () => list.querySelectorAll("[data-hint]").forEach((part) => setHint(part, void 0));
    function buildItems(options) {
      unhintItems();
      items = options.map((option) => {
        const item = element9("div", "dialkit-transition-preset");
        const pick = element9("button", "dialkit-transition-preset-pick");
        pick.append(thumbnail(option.value), element9("span", "dialkit-transition-preset-name", option.name));
        setHint(pick, option.description ?? `Uses this ${presetNoun()}.`);
        pick.addEventListener("click", () => props.onChange(applyTransitionPreset(props.value, option.value, props.mode)));
        item.append(pick);
        if (option.id) {
          const id = option.id;
          const remove = element9("button", "dialkit-transition-preset-delete");
          remove.setAttribute("aria-label", `Delete ${option.name}`);
          setHint(remove, `Deletes this saved ${presetNoun()}.`);
          remove.append(svgIcon([ICON_CLOSE], ""));
          remove.addEventListener("click", () => DialStore.deleteTransitionPreset(id));
          item.append(remove);
        }
        return { root: item, pick, option };
      });
      list.replaceChildren(...items.map((item) => item.root));
    }
    function render() {
      const custom = saved();
      const options = tab === "defaults" ? defaultTransitionPresets(props.mode) : custom.map(({ id, name, value }) => ({ id, name, value }));
      const nextSignature = `${props.mode}:${tab}:${tab === "custom" ? custom.map((preset) => preset.id).join(",") : ""}`;
      if (signature !== nextSignature) {
        const focused = items.findIndex((item) => item.root.contains(document.activeElement));
        signature = nextSignature;
        buildItems(options);
        if (focused >= 0) (items[Math.min(focused, items.length - 1)]?.pick ?? save).focus({ preventScroll: true });
      }
      tabButtons.forEach((button2, index) => {
        const active2 = index === 0 === (tab === "defaults");
        button2.dataset.active = String(active2);
        button2.setAttribute("aria-checked", String(active2));
        button2.tabIndex = active2 ? 0 : -1;
        if (active2) pill.style.transform = `translateX(${index * 100}%)`;
      });
      for (const item of items) {
        const active2 = sameTransition(item.option.value, props.value, props.mode);
        item.root.dataset.active = String(active2);
        item.pick.setAttribute("aria-pressed", String(active2));
      }
      const noun = props.mode === "easing" ? "curve" : "spring";
      setHint(tabs, `Defaults: the ready-made ${noun}s. Custom: the ${noun}s you saved.`);
      list.setAttribute("aria-label", `${tab === "defaults" ? "Default" : "Custom"} ${noun}s`);
      list.hidden = !items.length;
      empty.hidden = tab === "defaults" || items.length > 0;
      empty.textContent = `No custom ${noun}s yet. Shape a ${noun}, then save it.`;
      save.hidden = tab === "defaults";
      const savedAs = custom.find((preset) => sameTransition(preset.value, props.value, props.mode));
      save.disabled = !!savedAs;
      save.textContent = savedAs ? `Saved as ${savedAs.name}` : `Save current ${noun}`;
      fade();
    }
    const stop3 = DialStore.subscribeTransitions(render);
    render();
    return {
      update(next) {
        props = next;
        render();
      },
      destroy() {
        stop3();
        resize?.disconnect();
        unhintItems();
        setHint(tabs, void 0);
        root.remove();
      }
    };
  }
  var COPY_DONE_MS = 1200;
  var COPY_GROUP_SPRING = { visualDuration: 0.15, bounce: 0 };
  var COPY_ICON_SPRING = { visualDuration: 0.2, bounce: 0.35 };
  var COPY_ICON_STAGGER_MS = 45;
  var COPY_ICON_HIDDEN = { scale: 0.6, x: 2 };
  function playSpring(node, frame, spring, distance, delay = 0) {
    const params = springParams({ type: "spring", ...spring });
    const duration = springRestDuration(params, distance);
    const count = Math.max(2, Math.ceil(duration * 60));
    const frames = Array.from({ length: count + 1 }, (_, index) => frame(index === count ? 1 : springProgress(index / count * duration, params)));
    return node.animate(frames, { duration: duration * 1e3, delay, easing: "linear", fill: "backwards" });
  }
  var COPY_HINTS = {
    dots: "Shows copy and paste for this transition.",
    copy: "Copies this transition and its tab (Easing, Time or Physics).",
    paste: "Pastes the transition you copied, with its tab."
  };
  var TAB_NAMES = { easing: "Easing", simple: "Time", advanced: "Physics" };
  function mountTransitionCopy(host, initial) {
    let props = initial;
    let open = false;
    let quiet = false;
    let opening = false;
    let doneTimer;
    let motion = [];
    const root = element9("div", "dialkit-copy-actions");
    const group = element9("div", "dialkit-copy-group");
    const action = (label, paths, run) => {
      const button2 = element9("button", "dialkit-copy-action");
      button2.setAttribute("aria-label", label);
      button2.append(svgIcon(paths, ""));
      button2.addEventListener("click", () => {
        run();
        finish();
      });
      return button2;
    };
    const copy = action("Copy transition", ICON_COPY, () => DialStore.copyTransition(props.value, props.mode));
    const paste = action("Paste transition", ICON_PASTE, () => {
      const copied = DialStore.getCopiedTransition();
      if (copied) props.onPaste(copied);
    });
    const dots = element9("button", "dialkit-copy-button");
    dots.setAttribute("aria-label", "Copy or paste");
    setHint(dots, COPY_HINTS.dots);
    setHint(copy, COPY_HINTS.copy);
    group.append(copy, paste);
    root.append(group, dots);
    host.append(root);
    function render() {
      root.dataset.open = String(open);
      group.inert = !open;
      dots.setAttribute("aria-expanded", String(open));
      const copied = DialStore.getCopiedTransition();
      paste.disabled = !copied;
      setHint(paste, copied ? `${COPY_HINTS.paste} Now: ${TAB_NAMES[copied.mode]} \xB7 ${transitionPresetName(copied.value, copied.mode, DialStore.getTransitionPresets())}.` : COPY_HINTS.paste);
    }
    function animateGroup() {
      const toIcon = open ? { scale: 1, x: 0 } : COPY_ICON_HIDDEN;
      const settle = () => {
        group.style.width = open ? "" : "0px";
        group.style.opacity = open ? "" : "0";
        for (const icon4 of [copy, paste]) icon4.style.transform = open ? "" : `translateX(${toIcon.x}px) scale(${toIcon.scale})`;
      };
      if (typeof group.animate !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        for (const animation of motion) animation.cancel();
        settle();
        group.hidden = !open;
        return;
      }
      const shown = !group.hidden;
      const style = getComputedStyle(group);
      const fromWidth = shown ? parseFloat(style.width) : 0;
      const fromOpacity = shown ? Number(style.opacity) : 0;
      const icons = [copy, paste].map((icon4) => {
        if (!shown) return { icon: icon4, ...COPY_ICON_HIDDEN };
        const matrix = new DOMMatrixReadOnly(getComputedStyle(icon4).transform);
        return { icon: icon4, scale: matrix.a, x: matrix.e };
      });
      for (const animation of motion) animation.cancel();
      group.hidden = false;
      group.style.width = "";
      const toWidth = open ? parseFloat(getComputedStyle(group).width) : 0;
      const toOpacity = open ? 1 : 0;
      settle();
      motion = [
        playSpring(group, (p) => ({ width: `${fromWidth + (toWidth - fromWidth) * p}px` }), COPY_GROUP_SPRING, toWidth - fromWidth),
        playSpring(group, (p) => ({ opacity: String(fromOpacity + (toOpacity - fromOpacity) * p) }), COPY_GROUP_SPRING, toOpacity - fromOpacity)
      ];
      (open ? [...icons].reverse() : icons).forEach(({ icon: icon4, scale, x }, index) => {
        motion.push(playSpring(icon4, (p) => ({
          transform: `translateX(${x + (toIcon.x - x) * p}px) scale(${scale + (toIcon.scale - scale) * p})`
        }), COPY_ICON_SPRING, Math.max(Math.abs(toIcon.x - x), Math.abs(toIcon.scale - scale)), index * COPY_ICON_STAGGER_MS));
      });
      if (open) return;
      const closing = motion;
      Promise.all(closing.map((animation) => animation.finished)).then(() => {
        if (motion === closing) group.hidden = true;
      }, () => {
      });
    }
    function setOpen(next) {
      if (open === next) return;
      if (!next && group.contains(document.activeElement)) focusDots();
      open = next;
      opening = false;
      if (open) document.addEventListener("pointerdown", pointerOutside, true);
      else document.removeEventListener("pointerdown", pointerOutside, true);
      render();
      animateGroup();
    }
    function pointerOutside(event) {
      if (!event.composedPath().includes(root)) setOpen(false);
    }
    function showDots(done) {
      dots.replaceChildren(done ? svgIcon([ICON_CHECK], "") : svgIcon(ICON_MORE, "", 3));
    }
    function focusDots() {
      quiet = true;
      dots.focus({ preventScroll: true });
      quiet = false;
    }
    function finish() {
      setOpen(false);
      showDots(true);
      clearTimeout(doneTimer);
      doneTimer = setTimeout(() => showDots(false), COPY_DONE_MS);
    }
    root.addEventListener("click", (event) => event.stopPropagation());
    dots.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse" || open) return;
      setOpen(true);
      opening = true;
    });
    dots.addEventListener("pointerdown", () => {
      if (!open) opening = true;
    });
    root.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse" && !root.contains(document.activeElement)) setOpen(false);
    });
    dots.addEventListener("focus", () => {
      if (quiet) return;
      const keep = opening;
      setOpen(true);
      opening = keep;
    });
    dots.addEventListener("click", () => {
      const toggle = open && !opening;
      opening = false;
      setOpen(!toggle);
    });
    root.addEventListener("focusout", (event) => {
      if (!root.contains(event.relatedTarget) && !root.matches(":hover")) setOpen(false);
    });
    root.addEventListener("keydown", (event) => {
      if (!open) return;
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    });
    showDots(false);
    group.hidden = true;
    render();
    const stop3 = DialStore.subscribeTransitions(render);
    return {
      update(next) {
        props = next;
      },
      destroy() {
        stop3();
        clearTimeout(doneTimer);
        for (const animation of motion) animation.cancel();
        document.removeEventListener("pointerdown", pointerOutside, true);
        [dots, copy, paste].forEach((part) => setHint(part, void 0));
        root.remove();
      }
    };
  }

  // src/vanilla/transitions.ts
  function mountSpringVisualization(host, initial) {
    const root = svg("svg", { viewBox: "0 0 256 140", class: "dialkit-spring-viz", role: "img", "aria-label": "Spring response curve" });
    for (let i = 1; i < 4; i++) {
      root.append(svg("line", { x1: i * 64, y1: 0, x2: i * 64, y2: 140, stroke: "var(--dial-surface-active)" }), svg("line", { x1: 0, y1: i * 35, x2: 256, y2: i * 35, stroke: "var(--dial-surface-active)" }));
    }
    root.append(svg("line", { x1: 0, y1: 70, x2: 256, y2: 70, stroke: "var(--dial-border-hover)", "stroke-dasharray": "4,4" }));
    const path = svg("path", { fill: "none", stroke: "var(--dial-text-label)", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" });
    root.append(path);
    host.append(root);
    function update({ spring, isSimpleMode }) {
      const params = springParams(isSimpleMode ? { type: "spring", visualDuration: spring.visualDuration ?? 0.3, bounce: spring.bounce ?? 0.2 } : { type: "spring", stiffness: spring.stiffness ?? 400, damping: spring.damping ?? 17, mass: spring.mass ?? 1 });
      const values = Array.from({ length: 101 }, (_, i) => springProgress(i / 50, params));
      const min = Math.min(...values), range = Math.max(...values) - min || 1;
      path.setAttribute("d", values.map((v, i) => `${i ? "L" : "M"} ${i * 2.56} ${140 - ((v - min) / range * 84 + 28)}`).join(" "));
    }
    update(initial);
    return {
      update,
      destroy() {
        root.remove();
      }
    };
  }
  function mountTransitionControl(host, initial, springOnly = false) {
    let props = initial;
    const folderProps = () => ({ title: props.label, hint: props.hint, onReset: props.onReset, changed: props.changed });
    const folder = mountFolder(host, { ...folderProps(), actions: !springOnly });
    const body = element5("div");
    Object.assign(body.style, { display: "flex", flexDirection: "column", gap: "6px" });
    folder.body.append(body);
    let mode;
    const current2 = () => cache[mode];
    const copyProps = () => ({
      mode,
      value: current2(),
      onPaste(copied) {
        DialStore.updateTransitionMode(props.panelId, props.path, copied.mode);
        props.onChange(copied.value);
      }
    });
    const presetProps = () => ({ mode, value: current2(), onChange: (value) => props.onChange(value) });
    const intensity = createEaseIntensity();
    let copy;
    let presets;
    const presetsFolder = springOnly ? void 0 : mountFolder(element5("div"), { title: "Presets", defaultOpen: false, hint: TRANSITION_HINTS.presets });
    const showPresetName = () => presetsFolder?.update({ title: "Presets", hint: TRANSITION_HINTS.presets, meta: transitionPresetName(current2(), mode, DialStore.getTransitionPresets()) });
    const stopPresets = presetsFolder ? DialStore.subscribeTransitions(showPresetName) : void 0;
    let controls = [];
    let refresh = () => {
    };
    const cache = {
      easing: props.value.type === "easing" ? props.value : { type: "easing", duration: 0.3, ease: [1, -0.4, 0.5, 1] },
      simple: props.value.type === "spring" && props.value.visualDuration !== void 0 ? props.value : { type: "spring", visualDuration: 0.3, bounce: 0.2 },
      advanced: props.value.type === "spring" && props.value.stiffness !== void 0 ? props.value : { type: "spring", stiffness: 200, damping: 25, mass: 1 }
    };
    const currentMode = () => springOnly ? DialStore.getSpringMode(props.panelId, props.path) : DialStore.getTransitionMode(props.panelId, props.path);
    function render() {
      const nextMode = currentMode();
      if (nextMode === "easing" && props.value.type === "easing")
        cache.easing = props.value;
      if (nextMode !== "easing" && props.value.type === "spring")
        cache[nextMode] = props.value;
      if (mode !== nextMode) {
        mode = nextMode;
        rebuild();
      }
      folder.update(folderProps());
      refresh();
    }
    function rebuild() {
      controls.forEach((c) => c.destroy());
      controls = [];
      body.replaceChildren();
      const updates = [];
      const change = (value) => props.onChange(value);
      const typeRow = element5("div", "dialkit-labeled-control dialkit-transition-type");
      typeRow.append(element5("span", "dialkit-labeled-control-label", "Type"));
      if (!springOnly) {
        setHint(typeRow, HINTS.transitionType);
        controls.push({ destroy: () => setHint(typeRow, void 0) });
      }
      body.append(typeRow);
      if (mode === "easing") {
        const vizProps = () => ({ easing: cache.easing, onChange: (ease) => change({ ...cache.easing, ease }) });
        const viz = mountEasingVisualization(body, vizProps());
        controls.push(viz);
        updates.push(() => viz.update(vizProps()));
      } else {
        const vizProps = () => ({ spring: cache[mode], isSimpleMode: mode === "simple" });
        const viz = mountSpringVisualization(body, vizProps());
        controls.push(viz);
        updates.push(() => viz.update(vizProps()));
      }
      const segment = mountSegmentedControl(typeRow, {
        options: [...springOnly ? [] : [{ value: "easing", label: "Easing" }], { value: "simple", label: "Time" }, { value: "advanced", label: "Physics" }],
        value: mode,
        onChange(next) {
          const value = { ...cache[next] };
          if (springOnly)
            DialStore.updateSpringMode(props.panelId, props.path, next);
          else
            DialStore.updateTransitionMode(props.panelId, props.path, next);
          props.onChange(value);
        }
      });
      controls.push(segment);
      function slider(label, key, fallback, min, max, step, hint2, duration = false) {
        const getProps = () => {
          const value = cache[mode];
          const external = duration ? props.durationControl : void 0;
          return {
            label,
            hint: hint2,
            value: external?.value ?? value[key] ?? fallback,
            min: external?.min ?? min,
            max: external?.max ?? max,
            step: external?.step ?? step,
            unit: duration ? "s" : void 0,
            onChange: external?.onChange ?? ((v) => {
              const next = { ...cache[mode], [key]: v };
              if (mode === "simple") {
                delete next.stiffness;
                delete next.damping;
                delete next.mass;
              } else if (mode === "advanced") {
                delete next.visualDuration;
                delete next.bounce;
              }
              change(next);
            })
          };
        };
        const control = mountSlider(body, getProps());
        controls.push(control);
        updates.push(() => control.update(getProps()));
      }
      if (mode === "easing") {
        const fieldsProps = () => ({ ease: cache.easing.ease, onChange: (ease) => change({ ...cache.easing, ease }) });
        const fields = mountEaseFields(body, fieldsProps());
        const intensityProps = () => ({
          label: "Intensity",
          hint: TRANSITION_HINTS.intensity,
          value: intensity.read(cache.easing.ease),
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
          onChange: (v) => change({ ...cache.easing, ease: intensity.apply(cache.easing.ease, v) })
        });
        const intensitySlider = mountSlider(body, intensityProps());
        controls.push(fields, intensitySlider);
        updates.push(() => {
          fields.update(fieldsProps());
          intensitySlider.update(intensityProps());
        });
      } else if (mode === "simple") {
        if (springOnly && !props.hideDuration)
          slider("Duration", "visualDuration", 0.3, 0.1, 5, 0.05, HINTS.springDuration, true);
        slider("Bounce", "bounce", 0.2, 0, 1, 0.05, HINTS.bounce);
      } else {
        slider("Stiffness", "stiffness", 400, 1, 1e3, 10, HINTS.stiffness);
        slider("Damping", "damping", 17, 1, 100, 1, HINTS.damping);
        slider("Mass", "mass", 1, 0.1, 10, 0.1, HINTS.mass);
      }
      if (!springOnly && !props.hideDuration && mode !== "advanced")
        slider("Duration", mode === "easing" ? "duration" : "visualDuration", 0.3, 0.1, mode === "easing" ? 2 : 5, 0.05, mode === "easing" ? HINTS.easingDuration : HINTS.springDuration, true);
      if (presetsFolder) {
        body.append(presetsFolder.element);
        presets ?? (presets = mountTransitionPresets(presetsFolder.body, presetProps()));
        copy ?? (copy = mountTransitionCopy(folder.actions, copyProps()));
        updates.push(() => {
          presets?.update(presetProps());
          copy?.update(copyProps());
          showPresetName();
        });
      }
      refresh = () => updates.forEach((update) => update());
    }
    render();
    return {
      update(next) {
        props = next;
        render();
      },
      destroy() {
        controls.forEach((c) => c.destroy());
        stopPresets?.();
        copy?.destroy();
        presets?.destroy();
        presetsFolder?.destroy();
        folder.destroy();
      }
    };
  }
  function mountSpringControl(host, props) {
    const convert = (p) => ({ ...p, value: p.spring, onChange: (value) => p.onChange(value) });
    const mounted = mountTransitionControl(host, convert(props), true);
    return {
      update(next) {
        mounted.update(convert(next));
      },
      destroy: mounted.destroy
    };
  }

  // src/vanilla/shortcuts.ts
  var users2 = 0;
  var stop2;
  var active = null;
  var listeners = /* @__PURE__ */ new Set();
  function subscribeShortcut(listener) {
    listeners.add(listener);
    listener(active);
    return () => {
      listeners.delete(listener);
    };
  }
  function setActive(target) {
    active = target;
    listeners.forEach((listener) => listener(target));
  }
  function mountShortcutListener() {
    if (users2++ === 0)
      stop2 = listen2();
    let destroyed = false;
    return {
      destroy() {
        if (destroyed)
          return;
        destroyed = true;
        if (--users2 === 0) {
          stop2?.();
          stop2 = void 0;
        }
      }
    };
  }
  function listen2() {
    const keys = /* @__PURE__ */ new Set();
    let modifier;
    let dragging = false, lastX, accumulator = 0;
    const targetFor = (...interactions) => {
      for (const key of keys) {
        const target = DialStore.resolveShortcutTarget(key, modifier);
        if (target?.control.type === "slider" && interactions.includes(target.control.shortcut?.interaction ?? "scroll"))
          return target;
      }
      return null;
    };
    const resetMouse = () => {
      dragging = false;
      lastX = void 0;
      accumulator = 0;
    };
    const keydown = (event) => {
      if (isInputFocused())
        return;
      modifier = getActiveModifier(event);
      if (event.key.startsWith("Arrow") && keys.size) {
        const target2 = targetFor("scroll", "drag", "move");
        if (target2) {
          event.preventDefault();
          applySliderDelta(target2.panelId, target2.path, target2.control, getEffectiveStep(target2.control, target2.control.shortcut), ["ArrowRight", "ArrowUp"].includes(event.key) ? 1 : -1);
          return;
        }
      }
      const key = event.key.toLowerCase(), held = keys.has(key);
      keys.add(key);
      const target = DialStore.resolveShortcutTarget(key, modifier);
      if (target) {
        setActive(target);
        if (!held && target.control.type === "toggle")
          DialStore.updateValue(target.panelId, target.path, !DialStore.getValue(target.panelId, target.path));
      }
      if (!held) {
        lastX = void 0;
        accumulator = 0;
      }
    };
    const keyup = (event) => {
      keys.delete(event.key.toLowerCase());
      modifier = getActiveModifier(event);
      resetMouse();
      setActive([...keys].map((key) => DialStore.resolveShortcutTarget(key, modifier)).find(Boolean) ?? null);
    };
    const wheel = (event) => {
      if (isInputFocused())
        return;
      modifier = getActiveModifier(event);
      const target = targetFor("scroll") ?? DialStore.resolveScrollOnlyTargets().find((t) => t.control.type === "slider");
      if (!target)
        return;
      event.preventDefault();
      applySliderDelta(target.panelId, target.path, target.control, getEffectiveStep(target.control, target.control.shortcut), event.deltaY > 0 ? -1 : 1);
    };
    const mousedown = (event) => {
      if (event.button !== 0 || isInputFocused())
        return;
      modifier = getActiveModifier(event);
      if (targetFor("drag")) {
        dragging = true;
        lastX = event.clientX;
        accumulator = 0;
        event.preventDefault();
      }
    };
    const mousemove = (event) => {
      if (isInputFocused())
        return;
      modifier = getActiveModifier(event);
      const target = targetFor(dragging ? "drag" : "move");
      if (!target)
        return;
      if (lastX === void 0) {
        lastX = event.clientX;
        return;
      }
      accumulator += event.clientX - lastX;
      lastX = event.clientX;
      const steps = Math.trunc(accumulator / DRAG_SENSITIVITY);
      if (steps) {
        accumulator -= steps * DRAG_SENSITIVITY;
        applySliderDelta(target.panelId, target.path, target.control, getEffectiveStep(target.control, target.control.shortcut), steps);
      }
    };
    const blur = () => {
      keys.clear();
      resetMouse();
      setActive(null);
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("mousedown", mousedown);
    window.addEventListener("mousemove", mousemove);
    window.addEventListener("mouseup", resetMouse);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("mousedown", mousedown);
      window.removeEventListener("mousemove", mousemove);
      window.removeEventListener("mouseup", resetMouse);
      window.removeEventListener("blur", blur);
      blur();
    };
  }

  // src/control-presence.ts
  function mergeControls(rendered, controls) {
    const present = new Set(controls.map((control) => control.path));
    const rows2 = [...controls];
    let previous;
    for (const row of rendered) {
      if (!present.has(row.path)) {
        rows2.splice(previous === void 0 ? 0 : rows2.findIndex((control) => control.path === previous) + 1, 0, row);
      }
      previous = row.path;
    }
    return rows2;
  }

  // src/vanilla/ControlRenderer.ts
  var rowSignature = (control) => JSON.stringify({ ...control, children: void 0 });
  function mountControlRenderer(host, initial) {
    let props = initial;
    let active2 = null;
    let signature = "";
    let resetCount = 0;
    const resetProps = (control) => control.reset ? {
      changed: DialStore.isFolderChanged(props.panelId, control.path),
      onReset: () => {
        resetCount++;
        DialStore.resetFolder(props.panelId, control.path);
      }
    } : {};
    let mounted = [];
    let rows2 = [];
    let rendered;
    function mountControl(control, target, entries, topLevel = false) {
      const value = () => props.values[control.path];
      const change = (v) => DialStore.updateValue(props.panelId, control.path, v);
      const shortcut = () => ({ shortcut: control.shortcut, shortcutActive: active2?.panelId === props.panelId && active2?.path === control.path });
      function mount(factory, getProps) {
        const instance = factory(target, getProps());
        entries.push({ update: () => instance.update(getProps()), destroy: instance.destroy });
      }
      switch (control.type) {
        case "folder": {
          if (control.fields) {
            mount(mountFields, () => ({ label: control.label, controls: control.children ?? [], values: props.values, defaults: DialStore.getDefaultValues(props.panelId), hint: control.hint, onChange: (v) => DialStore.updateValues(props.panelId, v) }));
            return void 0;
          }
          const open = () => topLevel && props.openFolder !== void 0 ? props.openFolder === control.path : void 0;
          const folderProps = () => ({
            title: control.label,
            defaultOpen: control.defaultOpen,
            hint: control.hint,
            open: open(),
            onOpenChange: open() === void 0 ? void 0 : (next) => props.onOpenFolderChange?.(next ? control.path : null),
            ...resetProps(control)
          });
          const folder = mountFolder(target, folderProps());
          entries.push({ update: () => folder.update(folderProps()), destroy: folder.destroy });
          return folder.body;
        }
        case "slider":
          mount(mountSlider, () => ({ label: control.label, hint: control.hint, value: value(), min: control.min, max: control.max, step: control.step, unit: control.unit, resetCount, onChange: change, ...shortcut() }));
          break;
        case "toggle":
          mount(mountToggle, () => ({ label: control.label, hint: control.hint, checked: value(), onChange: change, ...shortcut() }));
          break;
        case "text":
          mount(mountTextControl, () => ({ label: control.label, hint: control.hint, value: value(), placeholder: control.placeholder, onChange: change }));
          break;
        case "select":
          mount(mountSelectControl, () => ({ label: control.label, hint: control.hint, value: value(), options: control.options ?? [], display: control.display, hideLabel: control.hideLabel, onChange: change }));
          break;
        case "color":
          mount(mountColorControl, () => ({ label: control.label, hint: control.hint, value: value(), onChange: change }));
          break;
        case "image":
          mount(mountImageControl, () => ({ label: control.label, hint: control.hint, value: value(), options: control.options, onChange: change }));
          break;
        case "pad":
          mount(mountDialPad, () => ({ ...control.pad, label: control.label, hint: control.hint, value: value(), onChange: change }));
          break;
        case "background": {
          const folderProps = () => ({ title: control.label, hint: control.hint, ...resetProps(control) });
          const folder = mountFolder(target, folderProps());
          const backgroundProps = () => ({ panelId: props.panelId, label: control.label, value: value(), upload: control.background?.upload, onChange: change });
          const background = mountBackgroundControl(folder.body, backgroundProps());
          entries.push({
            update() {
              folder.update(folderProps());
              background.update(backgroundProps());
            },
            destroy() {
              background.destroy();
              folder.destroy();
            }
          });
          break;
        }
        case "anchor":
          mount(mountAnchorControl, () => ({ label: control.label, hint: control.hint, value: value(), onChange: change }));
          break;
        case "spring":
          mount(mountSpringControl, () => ({ panelId: props.panelId, path: control.path, label: control.label, hint: control.hint, spring: value(), onChange: change, ...resetProps(control) }));
          break;
        case "transition":
          mount(mountTransitionControl, () => ({ panelId: props.panelId, path: control.path, label: control.label, hint: control.hint, value: value(), durationControl: props.transitionDuration, onChange: change, ...resetProps(control) }));
          break;
        case "action": {
          const b = element5("button", "dialkit-button", control.label);
          setHint(b, control.hint);
          b.addEventListener("click", () => DialStore.triggerAction(props.panelId, control.path));
          target.append(b);
          entries.push({
            update() {
            },
            destroy() {
              setHint(b, void 0);
              b.remove();
            }
          });
          break;
        }
      }
    }
    function build(controls, target, topLevel = false) {
      for (const control of controls) {
        const body = mountControl(control, target, mounted, topLevel);
        if (body)
          build(control.children ?? [], body);
      }
    }
    function createRow(control, topLevel) {
      const wrapper = element5("div", "dialkit-control-wrapper");
      const row = { control, wrapper, entries: [], rows: [], leaving: false, gone: false };
      row.body = mountControl(control, wrapper, row.entries, topLevel);
      if (row.body)
        row.rows = syncRows(row.body, [], control.children ?? [], false);
      return row;
    }
    function destroyRow(row) {
      if (row.gone)
        return;
      row.gone = true;
      row.animation?.cancel();
      row.rows.forEach(destroyRow);
      row.entries.forEach((entry) => entry.destroy());
      row.wrapper.remove();
    }
    function slide(row, shown, from = row.wrapper.getBoundingClientRect().height) {
      row.animation?.cancel();
      row.leaving = !shown;
      const natural = row.wrapper.offsetHeight;
      const to = shown ? natural : 0;
      row.animation = animateSpring(row.wrapper, (p) => {
        const height = Math.max(0, from + (to - from) * p);
        const shownPart = natural ? height / natural : 0;
        return { opacity: shownPart, height: `${height}px`, marginBottom: `calc(var(--dial-row-gap) * ${shownPart - 1})`, overflowY: "clip" };
      }, 0.25);
      if (shown)
        return;
      if (row.animation)
        row.animation.onfinish = () => destroyRow(row);
      else
        destroyRow(row);
    }
    function syncRows(target, current2, controls, animate, topLevel = false) {
      const present = new Map(controls.map((control) => [control.path, control]));
      const kept = /* @__PURE__ */ new Map();
      const replaced = /* @__PURE__ */ new Set();
      const entering = [];
      for (const row of current2) {
        if (row.gone)
          continue;
        const next2 = present.get(row.control.path);
        if (next2 && rowSignature(next2) !== rowSignature(row.control)) {
          destroyRow(row);
          replaced.add(next2.path);
        } else
          kept.set(row.control.path, row);
      }
      const next = mergeControls([...kept.values()].map((row) => row.control), controls).map((control) => {
        const row = kept.get(control.path);
        if (!row) {
          const created = createRow(control, topLevel);
          if (animate && !replaced.has(control.path))
            entering.push(created);
          return created;
        }
        if (!present.has(control.path)) {
          if (!row.leaving)
            slide(row, false);
          return row;
        }
        row.control = control;
        if (row.body)
          row.rows = syncRows(row.body, row.rows, control.children ?? [], animate);
        if (row.leaving)
          slide(row, true);
        return row;
      });
      let anchor = null;
      for (const row of [...next].reverse()) {
        if (row.wrapper.parentElement !== target || row.wrapper.nextElementSibling !== anchor)
          target.insertBefore(row.wrapper, anchor);
        anchor = row.wrapper;
      }
      entering.forEach((row) => slide(row, true, 0));
      return next;
    }
    function updateRows(list) {
      for (const row of list) {
        if (row.gone || row.leaving)
          continue;
        row.entries.forEach((entry) => entry.update());
        updateRows(row.rows);
      }
    }
    function clear() {
      mounted.forEach((c) => c.destroy());
      mounted = [];
      rows2.forEach(destroyRow);
      rows2 = [];
      rendered = void 0;
    }
    function render() {
      if (props.animateControls) {
        if (signature !== props.panelId) {
          clear();
          signature = props.panelId;
        }
        if (rendered !== props.controls) {
          rows2 = syncRows(host, rows2, props.controls, rendered !== void 0, true);
          rendered = props.controls;
        }
        updateRows(rows2);
        return;
      }
      const next = JSON.stringify([props.panelId, props.controls]);
      if (signature !== next) {
        clear();
        signature = next;
        build(props.controls, host, true);
      } else
        mounted.forEach((c) => c.update());
    }
    const stopShortcut = subscribeShortcut((next) => {
      active2 = next;
      mounted.forEach((c) => c.update());
      updateRows(rows2);
    });
    render();
    return {
      update(next) {
        props = next;
        render();
      },
      destroy() {
        stopShortcut();
        clear();
      }
    };
  }

  // src/versions/spring.ts
  function bakedSpring(easing, duration) {
    const stops = easing.replace(/^linear\(|\)$/g, "").split(",").map((part) => {
      const [value, position] = part.trim().split(/\s+/);
      return { value: parseFloat(value), at: position ? parseFloat(position) / 100 : NaN };
    });
    if (isNaN(stops[0].at)) stops[0].at = 0;
    if (isNaN(stops[stops.length - 1].at)) stops[stops.length - 1].at = 1;
    for (let i = 1; i < stops.length; i++) {
      if (!isNaN(stops[i].at)) continue;
      let j = i;
      while (isNaN(stops[j].at)) j++;
      const step = (stops[j].at - stops[i - 1].at) / (j - i + 1);
      for (let n = i; n < j; n++) stops[n].at = stops[i - 1].at + step * (n - i + 1);
    }
    return {
      easing,
      duration,
      timeAt: (p) => {
        for (let i = 1; i < stops.length; i++) {
          const a = stops[i - 1];
          const b = stops[i];
          if (b.value < p) continue;
          const t = b.value === a.value ? b.at : a.at + (p - a.value) / (b.value - a.value) * (b.at - a.at);
          return Math.max(0, t) * duration;
        }
        return duration;
      }
    };
  }
  var GALLERY_SPRING = bakedSpring(
    "linear(0, 0.0043, 0.0162 1.83%, 0.0853 4.56%, 0.5106 15.52%, 0.6846 20.99%, 0.7529 23.73%, 0.8258 27.38%, 0.8684 30.12%, 0.9118, 0.9428 37.42%, 0.9686, 0.9842 46.55%, 0.9944, 0.9992 57.5%, 1.0013 64.8%, 1.0002 99.48%)",
    0.4681
  );

  // src/versions/capture.ts
  var SKIP_TAGS = /* @__PURE__ */ new Set(["SCRIPT", "NOSCRIPT", "TEMPLATE", "IFRAME", "LINK", "META"]);
  var FROZEN = "animation: none !important; transition: none !important; caret-color: transparent !important;";
  async function rasterizeViewport({ ignore, scale }) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const canvasFrames = await snapshotCanvases(ignore);
    const root = document.documentElement;
    const clone = root.cloneNode(true);
    const pairs = [];
    collectPairs(root, clone, pairs);
    const pseudoRules = [];
    const resources = [];
    let pseudoId = 0;
    for (const [source, copy] of pairs) {
      if (SKIP_TAGS.has(source.tagName) || source !== root && source.matches(ignore)) {
        copy.remove();
        continue;
      }
      const style = getComputedStyle(source);
      if (style.display === "none") {
        copy.remove();
        continue;
      }
      let css = inlineStyle(style) + FROZEN;
      copy.removeAttribute("class");
      for (const pseudo of ["::before", "::after"]) {
        const ps = getComputedStyle(source, pseudo);
        if (ps.content && ps.content !== "none" && ps.content !== "normal") {
          const cls = `dk-capture-${pseudoId++}`;
          copy.classList.add(cls);
          pseudoRules.push(`.${cls}${pseudo}{${inlineStyle(ps)}${FROZEN}}`);
        }
      }
      if (source instanceof HTMLCanvasElement) {
        const img = document.createElement("img");
        img.src = canvasFrames.get(source) ?? "";
        img.setAttribute("style", css);
        copy.replaceWith(img);
        continue;
      }
      if (source instanceof HTMLVideoElement) {
        const img = document.createElement("img");
        img.src = videoFrame(source);
        img.setAttribute("style", css);
        copy.replaceWith(img);
        continue;
      }
      if (source instanceof HTMLImageElement && copy instanceof HTMLImageElement) {
        const src = source.currentSrc || source.src;
        copy.removeAttribute("srcset");
        copy.removeAttribute("loading");
        if (src && !src.startsWith("data:")) {
          resources.push(toDataUrl(src).then((data) => {
            copy.src = data;
          }));
        }
      }
      if (source instanceof HTMLInputElement || source instanceof HTMLTextAreaElement) {
        copy.setAttribute("value", source.value);
        if (copy instanceof HTMLTextAreaElement) copy.textContent = source.value;
      }
      const urls = [...css.matchAll(/url\("?([^")]+)"?\)/g)].map((m) => m[1]).filter((u) => !u.startsWith("data:"));
      if (urls.length) {
        resources.push(Promise.all(urls.map(async (u) => [u, await toDataUrl(u)])).then((pairs2) => {
          for (const [u, data] of pairs2) css = css.split(u).join(data);
          copy.setAttribute("style", css);
        }));
      }
      copy.setAttribute("style", css);
    }
    await Promise.all(resources);
    const body = clone.querySelector("body");
    body?.setAttribute("style", `${body.getAttribute("style") ?? ""}; margin-top: ${-window.scrollY}px; margin-left: ${-window.scrollX}px;`);
    clone.querySelectorAll("style").forEach((node) => node.remove());
    const styleEl = document.createElement("style");
    styleEl.textContent = pseudoRules.join("\n");
    clone.querySelector("head")?.append(styleEl);
    clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    const markup = new XMLSerializer().serializeToString(clone);
    const svg2 = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject x="0" y="0" width="100%" height="100%">${markup}</foreignObject></svg>`;
    const image = new Image();
    image.decoding = "async";
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg2)}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = pageBackground();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
  function collectPairs(source, copy, out) {
    out.push([source, copy]);
    const a = source.children;
    const b = copy.children;
    for (let i = 0; i < a.length; i++) collectPairs(a[i], b[i], out);
  }
  function inlineStyle(style) {
    let css = "";
    for (let i = 0; i < style.length; i++) {
      const name = style[i];
      css += `${name}:${style.getPropertyValue(name)};`;
    }
    return css;
  }
  function snapshotCanvases(ignore) {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const frames = /* @__PURE__ */ new Map();
        for (const canvas of Array.from(document.querySelectorAll("canvas"))) {
          if (canvas.width === 0 || canvas.height === 0 || canvas.closest(ignore)) continue;
          try {
            const copy = document.createElement("canvas");
            copy.width = canvas.width;
            copy.height = canvas.height;
            copy.getContext("2d").drawImage(canvas, 0, 0);
            frames.set(canvas, copy.toDataURL("image/webp", 0.92));
          } catch {
          }
        }
        resolve(frames);
      });
    });
  }
  function videoFrame(video) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      return canvas.toDataURL("image/webp", 0.9);
    } catch {
      return video.poster || "";
    }
  }
  var dataUrlCache = /* @__PURE__ */ new Map();
  function toDataUrl(url) {
    let cached = dataUrlCache.get(url);
    if (!cached) {
      cached = fetch(url).then((res) => res.blob()).then((blob) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => resolve("");
        reader.readAsDataURL(blob);
      })).catch(() => "");
      dataUrlCache.set(url, cached);
    }
    return cached;
  }
  function pageBackground() {
    for (const el of [document.body, document.documentElement]) {
      const color = getComputedStyle(el).backgroundColor;
      if (color && color !== "transparent" && !/rgba\(.*,\s*0\)$/.test(color)) return color;
    }
    return "#ffffff";
  }

  // src/versions/thumbnails.ts
  var BASE_VERSION = "base";
  var THUMBNAIL_WIDTH = 720;
  var THUMBNAIL_QUALITY = 0.8;
  var IGNORE_SELECTOR = ".dialkit-root, .dialkit-version-overlay, [data-dialkit-ignore]";
  function versionKey(presetId) {
    return presetId ?? BASE_VERSION;
  }
  var ThumbnailStoreImpl = class {
    constructor() {
      this.cache = /* @__PURE__ */ new Map();
      this.stale = /* @__PURE__ */ new Map();
      this.listeners = /* @__PURE__ */ new Set();
    }
    get(panelId, key) {
      return this.read(panelId)[key];
    }
    getAll(panelId) {
      return this.read(panelId);
    }
    set(panelId, key, thumbnail2) {
      this.stale.get(panelId)?.delete(key);
      const next = { ...this.read(panelId), [key]: thumbnail2 };
      this.write(panelId, next);
    }
    /** The version's values changed since its thumbnail was captured. */
    markStale(panelId, key) {
      let keys = this.stale.get(panelId);
      if (!keys) this.stale.set(panelId, keys = /* @__PURE__ */ new Set());
      keys.add(key);
    }
    isStale(panelId, key) {
      return this.stale.get(panelId)?.has(key) ?? false;
    }
    delete(panelId, key) {
      this.stale.get(panelId)?.delete(key);
      const current2 = this.read(panelId);
      if (!(key in current2)) return;
      const next = { ...current2 };
      delete next[key];
      this.write(panelId, next);
    }
    /** Drop thumbnails whose versions no longer exist. */
    prune(panelId, keys) {
      const current2 = this.read(panelId);
      const keep = new Set(keys);
      if (Object.keys(current2).every((key) => keep.has(key))) return;
      const next = {};
      for (const key of keys) if (current2[key]) next[key] = current2[key];
      this.write(panelId, next);
    }
    subscribe(listener) {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    }
    read(panelId) {
      const cached = this.cache.get(panelId);
      if (cached) return cached;
      let parsed = {};
      try {
        const raw = storageFor(panelId)?.getItem(storageKey(panelId));
        if (raw) parsed = JSON.parse(raw);
      } catch {
      }
      this.cache.set(panelId, parsed);
      return parsed;
    }
    write(panelId, value) {
      this.cache.set(panelId, value);
      this.persist(panelId, value);
      this.listeners.forEach((fn) => fn());
    }
    persist(panelId, value) {
      const storage = storageFor(panelId);
      if (!storage) return;
      const entries = Object.entries(value).sort((a, b) => b[1].capturedAt - a[1].capturedAt);
      for (let keep = entries.length; keep >= 0; keep--) {
        try {
          storage.setItem(storageKey(panelId), JSON.stringify(Object.fromEntries(entries.slice(0, keep))));
          return;
        } catch {
        }
      }
    }
  };
  function storageFor(panelId) {
    const config = DialStore.getPresetStorage(panelId);
    if (!config || typeof window === "undefined") return null;
    try {
      return config.storage === "sessionStorage" ? window.sessionStorage : window.localStorage;
    } catch {
      return null;
    }
  }
  function storageKey(panelId) {
    return `${DialStore.getPresetStorage(panelId).key}:thumbnails`;
  }
  var ThumbnailStore = new ThumbnailStoreImpl();
  async function captureViewport() {
    if (typeof window === "undefined") return null;
    try {
      const canvas = await rasterizeViewport({
        ignore: IGNORE_SELECTOR,
        scale: Math.min(window.devicePixelRatio || 1, 2)
      });
      return { canvas, thumbnail: toThumbnail(canvas, window.innerWidth, window.innerHeight) };
    } catch {
      return null;
    }
  }
  function toThumbnail(canvas, width, height) {
    const scale = Math.min(1, THUMBNAIL_WIDTH / width);
    const out = document.createElement("canvas");
    out.width = Math.round(width * scale);
    out.height = Math.round(height * scale);
    const ctx = out.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
    return {
      src: out.toDataURL("image/webp", THUMBNAIL_QUALITY),
      width,
      height,
      capturedAt: Date.now()
    };
  }

  // src/versions/appshot.ts
  var APPSHOT = {
    shutterFadeIn: 150,
    // ms, ease-in-out
    moveFallbackDelay: 200,
    // ms; the flight starts when the shutter is in, or after this
    imageFadeIn: 180,
    // ms, ease-in, over the opaque shutter
    arcOvershoot: 50,
    // px the path swings past the target, vertically
    sizeBump: 0.06,
    // peak extra size mid-flight
    paddingX: 20,
    // px of shadow room around the flying frame
    paddingTop: 10,
    minCornerRadius: 2,
    landingAt: 0.75,
    // progress at which the real thumbnail shows underneath
    labelAt: 0.95
    // progress at which the thumbnail's label fades in
  };
  var EASE_IN = "cubic-bezier(0.42, 0, 1, 1)";
  var EASE_IN_OUT = "cubic-bezier(0.42, 0, 0.58, 1)";
  var lerp = (a, b, t) => a + (b - a) * t;
  var clamp01 = (v) => Math.min(1, Math.max(0, v));
  function frameAt(source, target, p) {
    const sx = source.x + source.width / 2;
    const sy = source.y + source.height / 2;
    const tx = target.x + target.width / 2;
    const ty = target.y + target.height / 2;
    const my = ty + (ty < sy ? -1 : 1) * APPSHOT.arcOvershoot;
    const cx = 2 * ((sx + tx) / 2 - 0.25 * sx - 0.25 * tx);
    const cy = 2 * (my - 0.25 * sy - 0.25 * ty);
    const q = 1 - p;
    const x = q * q * sx + 2 * p * q * cx + p * p * tx;
    const y = q * q * sy + 2 * p * q * cy + p * p * ty;
    const swell = 1 + q * Math.sin(Math.PI * p) * APPSHOT.sizeBump;
    const width = lerp(source.width, target.width, p) * swell;
    const height = lerp(source.height, target.height, p) * swell;
    return { x: x - width / 2, y: y - height / 2, width, height };
  }
  function startAppshot() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const source = { x: 0, y: 0, width: W, height: H };
    const container = layer("dialkit-appshot");
    const shadow = layer("dialkit-appshot-shadow");
    const card = layer("dialkit-appshot-card");
    const shutter = layer("dialkit-appshot-shutter");
    const image = layer("dialkit-appshot-image");
    card.append(shutter, image);
    container.append(shadow, card);
    for (const node of [card, shutter, image]) {
      node.style.width = `${W}px`;
      node.style.height = `${H}px`;
    }
    document.body.append(container);
    const shutterIn = shutter.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: APPSHOT.shutterFadeIn,
      easing: EASE_IN_OUT,
      fill: "forwards"
    });
    const ready = Promise.race([
      shutterIn.finished.catch(() => {
      }),
      new Promise((resolve) => setTimeout(resolve, APPSHOT.moveFallbackDelay))
    ]);
    const cancel = () => container.remove();
    const fly = async (frame, slot, { onLanding, onLabel }) => {
      await ready;
      const rect = slot?.getBoundingClientRect();
      if (!slot || !rect || rect.width === 0) {
        const out = shutter.animate([{ opacity: 1 }, { opacity: 0 }], { duration: APPSHOT.imageFadeIn, easing: EASE_IN, fill: "forwards" });
        await out.finished.catch(() => {
        });
        cancel();
        return;
      }
      const target = {
        x: rect.x - APPSHOT.paddingX,
        y: rect.y - APPSHOT.paddingTop,
        width: rect.width + APPSHOT.paddingX * 2,
        height: rect.height + APPSHOT.paddingTop
      };
      const slotRadius = Math.min(parseFloat(getComputedStyle(slot).borderRadius) || 0, rect.width / 2, rect.height / 2);
      const steps = 48;
      const samples = Array.from({ length: steps + 1 }, (_, i) => {
        const p = i / steps;
        const f = frameAt(source, target, p);
        const padX = Math.min(Math.floor((f.width - 1) / 2), APPSHOT.paddingX * p);
        const padTop = APPSHOT.paddingTop * p;
        const boxW = f.width - padX * 2;
        const boxH = f.height - padTop;
        const k = Math.min(boxW / W, boxH / H);
        const frameRadius = lerp(0, slotRadius, p);
        return {
          p,
          k,
          x: f.x + padX + (boxW - W * k) / 2,
          y: f.y + padTop,
          radius: lerp(frameRadius, Math.max(APPSHOT.minCornerRadius, slotRadius), p),
          fade: clamp01((p - APPSHOT.landingAt) * 4)
        };
      });
      const end = samples[steps];
      shadow.style.width = `${W * end.k}px`;
      shadow.style.height = `${H * end.k}px`;
      shadow.style.borderRadius = `${slotRadius}px`;
      frame.className = "dialkit-appshot-frame";
      image.append(frame);
      container.dataset.flying = "true";
      shutterIn.finish();
      image.animate([{ opacity: 0 }, { opacity: 1 }], { duration: APPSHOT.imageFadeIn, easing: EASE_IN, fill: "forwards" });
      const timing = { duration: GALLERY_SPRING.duration * 1e3, easing: GALLERY_SPRING.easing, fill: "forwards" };
      const flight = card.animate(samples.map((s) => ({
        offset: s.p,
        transform: `translate3d(${s.x}px, ${s.y}px, 0) scale(${s.k})`
      })), timing);
      card.animate(samples.map((s) => ({ offset: s.p, borderRadius: `${s.radius / s.k}px` })), timing);
      shadow.animate(samples.map((s) => ({
        offset: s.p,
        transform: `translate3d(${s.x}px, ${s.y}px, 0) scale(${s.k / end.k})`,
        opacity: s.p * (1 - 0.8 * s.fade)
      })), timing);
      let landed = false;
      let labeled = false;
      const land = () => {
        if (!landed) {
          landed = true;
          onLanding();
        }
      };
      const label = () => {
        land();
        if (!labeled) {
          labeled = true;
          onLabel();
        }
      };
      const landTimer = setTimeout(land, GALLERY_SPRING.timeAt(APPSHOT.landingAt) * 1e3);
      const labelTimer = setTimeout(label, GALLERY_SPRING.timeAt(APPSHOT.labelAt) * 1e3);
      await flight.finished.catch(() => {
      });
      clearTimeout(landTimer);
      clearTimeout(labelTimer);
      label();
      container.remove();
    };
    return { fly, cancel };
  }
  var ArrivalStoreImpl = class {
    constructor() {
      this.arrivals = /* @__PURE__ */ new Map();
      this.listeners = /* @__PURE__ */ new Set();
    }
    get(panelId) {
      return this.arrivals.get(panelId) ?? null;
    }
    set(panelId, arrival) {
      if (arrival) this.arrivals.set(panelId, arrival);
      else this.arrivals.delete(panelId);
      this.listeners.forEach((fn) => fn());
    }
    subscribe(fn) {
      this.listeners.add(fn);
      return () => {
        this.listeners.delete(fn);
      };
    }
  };
  var ArrivalStore = new ArrivalStoreImpl();
  async function saveVersionWithAppshot(panelId, resolveSlot) {
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const previousKey = versionKey(DialStore.getActivePresetId(panelId));
    const appshot = reduceMotion ? null : startAppshot();
    const capture = await captureViewport();
    const id = DialStore.saveNewPreset(panelId);
    if (appshot && capture) ArrivalStore.set(panelId, { key: id, stage: "pending" });
    if (capture) {
      ThumbnailStore.set(panelId, id, capture.thumbnail);
      if (!ThumbnailStore.get(panelId, previousKey) || ThumbnailStore.isStale(panelId, previousKey)) {
        ThumbnailStore.set(panelId, previousKey, capture.thumbnail);
      }
    }
    if (!appshot || !capture) {
      appshot?.cancel();
      return id;
    }
    try {
      await appshot.fly(capture.canvas, await resolveSlot(id), {
        onLanding: () => ArrivalStore.set(panelId, { key: id, stage: "landing" }),
        onLabel: () => ArrivalStore.set(panelId, null)
      });
    } finally {
      ArrivalStore.set(panelId, null);
    }
    return id;
  }
  function layer(className) {
    const node = document.createElement("div");
    node.className = className;
    node.dataset.dialkitIgnore = "";
    return node;
  }

  // src/versions/grid.ts
  var CARD_RADIUS = 14;
  var SETTLE_FADE_MS = 140;
  var current = null;
  function openVersionGrid(options) {
    current?.close();
    registerSceneProperties();
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let versions = options.versions;
    let activeKey = options.activeKey;
    let focusKey = activeKey;
    let closing = false;
    let animations = [];
    const overlay = element5("div", "dialkit-version-overlay");
    overlay.dataset.theme = options.theme ?? "system";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Versions");
    const scroller = element5("div", "dialkit-version-overlay-scroll");
    const grid = element5("div", "dialkit-version-overlay-grid");
    const close2 = element5("button", "dialkit-version-overlay-close");
    close2.setAttribute("aria-label", "Close versions");
    close2.append(icon2(ICON_CLOSE));
    scroller.append(grid);
    overlay.append(scroller, close2);
    const cards = /* @__PURE__ */ new Map();
    const focusCard = (key, opts) => cards.get(key)?.querySelector(".dialkit-version-card-frame")?.focus(opts);
    const render = () => {
      grid.textContent = "";
      cards.clear();
      grid.style.setProperty("--dialkit-version-aspect", String(window.innerWidth / window.innerHeight));
      grid.style.setProperty("--dialkit-version-columns", String(columnsFor(versions.length)));
      for (const version of versions) {
        const card = element5("div", "dialkit-version-card");
        card.dataset.key = version.key;
        const frame = element5("button", "dialkit-version-card-frame");
        frame.setAttribute("aria-label", version.name);
        if (version.thumbnail) {
          const img = element5("img");
          img.src = version.thumbnail.src;
          img.alt = "";
          img.draggable = false;
          img.decoding = "sync";
          frame.append(img);
        }
        const label = element5("span", "dialkit-version-card-label");
        label.textContent = version.name;
        label.title = "Double-click to rename";
        label.addEventListener("dblclick", () => editLabel(version.key, label, frame));
        card.append(frame, label);
        frame.addEventListener("click", () => choose(version.key));
        frame.addEventListener("focus", () => {
          focusKey = version.key;
        });
        cards.set(version.key, card);
        grid.append(card);
      }
      reserveDialKitSpace();
    };
    const editLabel = (key, label, frame) => {
      if (closing || !options.onRename) return;
      const previous = versions.find((v) => v.key === key)?.name ?? label.textContent ?? "";
      const input = element5("input", "dialkit-version-card-input");
      input.value = previous;
      input.setAttribute("aria-label", "Version name");
      let done = false;
      const end = (save) => {
        if (done) return;
        done = true;
        const name = input.value.trim();
        if (save && name && name !== previous) {
          options.onRename(key, name);
          versions = versions.map((v) => v.key === key ? { ...v, name } : v);
          label.textContent = name;
          frame.setAttribute("aria-label", name);
        }
        input.replaceWith(label);
        frame.focus({ preventScroll: true });
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          end(true);
        } else if (e.key === "Escape") {
          e.preventDefault();
          end(false);
        }
      });
      input.addEventListener("blur", () => end(true));
      label.replaceWith(input);
      input.focus();
      input.select();
    };
    const reserveDialKitSpace = () => {
      const panel = document.querySelector('.dialkit-panel:not([data-mode="inline"])');
      const rect = panel?.getBoundingClientRect();
      const gutter = 32;
      scroller.style.paddingRight = "";
      scroller.style.paddingLeft = "";
      if (!rect || rect.width === 0) return;
      if (rect.left > window.innerWidth / 2) scroller.style.paddingRight = `${window.innerWidth - rect.left + gutter}px`;
      else scroller.style.paddingLeft = `${rect.right + gutter}px`;
    };
    const zoomedInto = (key) => {
      const frame = cards.get(key)?.querySelector(".dialkit-version-card-frame");
      if (!frame) return null;
      const prev = grid.style.transform;
      grid.style.transform = "none";
      const home = frame.getBoundingClientRect();
      const origin = grid.getBoundingClientRect();
      grid.style.transform = prev;
      const s = window.innerWidth / home.width;
      const tx = -origin.x - s * (home.x - origin.x);
      const ty = -origin.y - s * (home.y - origin.y);
      return `translate3d(${tx}px, ${ty}px, 0) scale(${s})`;
    };
    const animateTo = (transform, scene) => {
      const style = getComputedStyle(grid);
      const from = {
        transform: style.transform === "none" ? "translate3d(0px, 0px, 0) scale(1)" : style.transform,
        scene: parseFloat(getComputedStyle(overlay).getPropertyValue("--dialkit-scene")) || 0,
        radius: style.getPropertyValue("--dialkit-card-radius").trim() || "0px"
      };
      animations.forEach((a) => a.cancel());
      const scale = scaleOf2(transform);
      const timing = {
        duration: reduceMotion ? 0 : GALLERY_SPRING.duration * 1e3,
        easing: GALLERY_SPRING.easing,
        fill: "forwards"
      };
      overlay.dataset.animating = "true";
      animations = [
        grid.animate([
          { transform: from.transform, "--dialkit-card-radius": from.radius },
          { transform, "--dialkit-card-radius": `${CARD_RADIUS * scene / scale}px` }
        ], timing),
        overlay.animate([{ "--dialkit-scene": from.scene }, { "--dialkit-scene": scene }], timing)
      ];
      return Promise.all(animations.map((a) => a.finished)).then(
        () => {
          delete overlay.dataset.animating;
        },
        () => {
        }
        // superseded by a newer transition
      );
    };
    const finish = () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onResize);
      if (current === handle) current = null;
      const fade = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: reduceMotion ? 0 : SETTLE_FADE_MS,
        easing: "linear",
        fill: "forwards"
      });
      fade.onfinish = () => overlay.remove();
      options.onClose?.();
    };
    const choose = (key) => {
      if (closing) return;
      closing = true;
      overlay.dataset.closing = "true";
      if (key !== activeKey) {
        options.onSelect(key);
        activeKey = key;
      }
      const target = zoomedInto(key);
      if (!target) {
        finish();
        return;
      }
      let done = false;
      const settle = () => {
        if (!done) {
          done = true;
          finish();
        }
      };
      animateTo(target, 0).then(settle);
      setTimeout(settle, GALLERY_SPRING.duration * 750);
    };
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement && overlay.contains(e.target)) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        choose(activeKey);
        return;
      }
      const columns = columnsFor(versions.length);
      const arrows = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
      if (e.key in arrows) {
        e.preventDefault();
        const index = versions.findIndex((v) => v.key === focusKey);
        const next = versions[Math.max(0, Math.min(versions.length - 1, (index < 0 ? 0 : index) + arrows[e.key]))];
        focusCard(next.key);
      }
    };
    const onResize = () => {
      if (closing) return;
      animations.forEach((a) => a.cancel());
      render();
    };
    close2.addEventListener("click", () => choose(activeKey));
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    overlay.style.setProperty("--dialkit-scene", "0");
    overlay.style.visibility = "hidden";
    document.body.append(overlay);
    render();
    const anchor = cards.get(activeKey);
    if (anchor) scroller.scrollTop = Math.max(0, anchor.offsetTop - (scroller.clientHeight - anchor.offsetHeight) / 2);
    const start = zoomedInto(activeKey);
    if (start) {
      grid.style.transform = start;
      grid.style.setProperty("--dialkit-card-radius", "0px");
    }
    overlay.style.visibility = "";
    animateTo("translate3d(0px, 0px, 0) scale(1)", 1).then(() => {
      if (closing) return;
      overlay.style.setProperty("--dialkit-scene", "1");
      grid.style.transform = "";
      grid.style.removeProperty("--dialkit-card-radius");
      animations.forEach((a) => a.cancel());
      animations = [];
    });
    focusCard(activeKey, { preventScroll: true });
    const handle = {
      select: (key) => choose(key),
      dismiss: () => choose(activeKey),
      close: () => {
        if (closing) return;
        closing = true;
        animations.forEach((a) => a.cancel());
        finish();
      },
      update: (next, nextActive) => {
        versions = next;
        activeKey = nextActive;
        for (const version of versions) {
          const img = cards.get(version.key)?.querySelector("img");
          if (img && version.thumbnail && img.src !== version.thumbnail.src) img.src = version.thumbnail.src;
        }
      }
    };
    current = handle;
    return handle;
  }
  function scaleOf2(transform) {
    const match = /scale\(([^)]+)\)/.exec(transform);
    return match ? parseFloat(match[1]) : 1;
  }
  var registered = false;
  function registerSceneProperties() {
    if (registered || typeof CSS === "undefined" || !("registerProperty" in CSS)) return;
    registered = true;
    for (const [name, syntax, initialValue] of [
      ["--dialkit-scene", "<number>", "1"],
      ["--dialkit-card-radius", "<length>", `${CARD_RADIUS}px`]
    ]) {
      try {
        CSS.registerProperty({ name, syntax, inherits: true, initialValue });
      } catch {
      }
    }
  }
  function columnsFor(count) {
    const width = window.innerWidth;
    const max = width >= 1100 ? 3 : width >= 680 ? 2 : 1;
    return Math.max(1, Math.min(max, Math.max(count, 2)));
  }

  // src/versions/controller.ts
  var SETTLE_DELAY_MS = 900;
  function listVersions(panelId) {
    const thumbnails = ThumbnailStore.getAll(panelId);
    const presets = DialStore.getPresets(panelId);
    return [
      { key: BASE_VERSION, presetId: null, name: DialStore.getBaseName(panelId), thumbnail: thumbnails[BASE_VERSION] },
      ...presets.map((preset) => ({
        key: preset.id,
        presetId: preset.id,
        name: preset.name,
        locked: preset.locked,
        thumbnail: thumbnails[preset.id]
      }))
    ];
  }
  function selectVersion(panelId, key) {
    if (key === BASE_VERSION) DialStore.clearActivePreset(panelId);
    else DialStore.loadPreset(panelId, key);
  }
  function renameVersion(panelId, key, name) {
    DialStore.renamePreset(panelId, key === BASE_VERSION ? null : key, name);
  }
  function deleteVersion(panelId, key) {
    if (key === BASE_VERSION || DialStore.getPresets(panelId).find((p) => p.id === key)?.locked) return;
    DialStore.deletePreset(panelId, key);
    ThumbnailStore.delete(panelId, key);
  }
  function watchVersionThumbnails(panelId) {
    const activeKey = () => versionKey(DialStore.getActivePresetId(panelId));
    const valuesOf = () => JSON.stringify(DialStore.getValues(panelId));
    const comparing = () => DialStore.getPresets(panelId).length > 0;
    let timer;
    let lastValues = valuesOf();
    let lastKey = activeKey();
    let capturing = null;
    let stopped = false;
    const capture = () => {
      capturing ?? (capturing = (async () => {
        const key = activeKey();
        const values = valuesOf();
        const result = await captureViewport();
        if (!result || stopped || key !== activeKey()) return;
        ThumbnailStore.set(panelId, key, result.thumbnail);
        if (valuesOf() !== values) ThumbnailStore.markStale(panelId, key);
      })().finally(() => {
        capturing = null;
      }));
      return capturing;
    };
    const flush = async () => {
      await capturing;
      const key = activeKey();
      if (!ThumbnailStore.get(panelId, key) || ThumbnailStore.isStale(panelId, key)) await capture();
    };
    const captureMissingSoon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (stopped || !comparing() || ThumbnailStore.get(panelId, activeKey())) return;
        if (document.querySelector(".dialkit-version-overlay, .dialkit-appshot")) {
          captureMissingSoon();
          return;
        }
        void capture();
      }, SETTLE_DELAY_MS);
    };
    const unsubscribe = DialStore.subscribe(panelId, () => {
      const values = valuesOf();
      const key = activeKey();
      if (key !== lastKey) captureMissingSoon();
      else if (values !== lastValues) ThumbnailStore.markStale(panelId, key);
      lastValues = values;
      lastKey = key;
    });
    ThumbnailStore.prune(panelId, [BASE_VERSION, ...DialStore.getPresets(panelId).map((p) => p.id)]);
    ThumbnailStore.markStale(panelId, lastKey);
    captureMissingSoon();
    return {
      flush,
      stop: () => {
        stopped = true;
        clearTimeout(timer);
        unsubscribe();
      }
    };
  }
  function openVersionsOverview(panelId, theme, onClose) {
    const key = versionKey(DialStore.getActivePresetId(panelId));
    const handle = openVersionGrid({
      versions: listVersions(panelId),
      activeKey: key,
      theme,
      onSelect: (next) => selectVersion(panelId, next),
      onRename: (next, name) => renameVersion(panelId, next, name),
      onClose: () => {
        stop3();
        onClose?.();
      }
    });
    const stop3 = ThumbnailStore.subscribe(() => {
      handle.update(listVersions(panelId), versionKey(DialStore.getActivePresetId(panelId)));
    });
    return handle;
  }

  // src/versions/gallery.ts
  function mountVersionGallery(host, initial) {
    let props = initial;
    let overview = null;
    let opening = false;
    let saving = false;
    let editing = null;
    let switchingTo = null;
    let destroyed = false;
    const root = element5("div", "dialkit-versions");
    const actions = element5("div", "dialkit-versions-actions");
    const save = element5("button", "dialkit-versions-button");
    save.dataset.primary = "true";
    save.append(icon2(ICON_PLUS, "", "0 0 24 24"), "Save version");
    setHint(save, HINTS.saveVersion);
    const toggle = element5("button", "dialkit-versions-button");
    toggle.dataset.icon = "true";
    const grid = svg("svg", { viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true" });
    for (const d of ICON_GRID) grid.append(svg("path", { d }));
    toggle.append(grid);
    setHint(toggle, HINTS.allVersions);
    actions.append(save, toggle);
    const strip = element5("div", "dialkit-versions-strip");
    strip.setAttribute("role", "listbox");
    strip.setAttribute("aria-label", "Versions");
    root.append(actions, strip);
    host.prepend(root);
    const thumbs = /* @__PURE__ */ new Map();
    const syncCopy = (disabled) => {
      const panel = root.closest(".dialkit-folder");
      panel?.toggleAttribute("data-version-overview", disabled);
      const copy = panel?.querySelector(".dialkit-toolbar-primary[data-wide]");
      if (copy) copy.disabled = disabled;
    };
    const render = () => {
      const { panelId } = props;
      const versions = listVersions(panelId);
      const activeKey = versionKey(DialStore.getActivePresetId(panelId));
      const arrival = ArrivalStore.get(panelId);
      const many = versions.length > 1;
      root.dataset.panel = panelId;
      toggle.hidden = !many;
      toggle.setAttribute("aria-pressed", String(!!overview || opening));
      root.toggleAttribute("data-overview", !!overview);
      syncCopy(!!overview);
      save.disabled = !!overview || opening;
      toggle.setAttribute("aria-label", `All versions (${versions.length})`);
      strip.hidden = !many;
      const keys = new Set(versions.map((v) => v.key));
      for (const [key, node] of thumbs) {
        if (!keys.has(key)) {
          removeThumb(node);
          thumbs.delete(key);
        }
      }
      versions.forEach((version, index) => {
        const node = thumbs.get(version.key) ?? createThumb(version.key);
        const frame = node.firstElementChild;
        node.dataset.active = String(version.key === activeKey);
        node.dataset.locked = String(!!version.locked);
        frame.setAttribute("aria-selected", String(version.key === activeKey));
        frame.setAttribute("aria-label", version.name);
        if (arrival?.key === version.key) node.dataset.arrival = arrival.stage;
        else delete node.dataset.arrival;
        const img = frame.querySelector("img");
        if (version.thumbnail && img?.getAttribute("src") !== version.thumbnail.src) {
          const next = img ?? element5("img");
          next.alt = "";
          next.draggable = false;
          next.src = version.thumbnail.src;
          if (!img) frame.append(next);
        }
        const label = node.querySelector(".dialkit-version-thumb-label");
        if (label && editing !== version.key) label.textContent = version.name;
        const remove = node.querySelector(".dialkit-version-thumb-delete");
        if (remove) remove.setAttribute("aria-label", `Delete ${version.name}`);
        if (strip.children[index] !== node) strip.insertBefore(node, strip.children[index] ?? null);
      });
    };
    const createThumb = (key) => {
      const node = element5("div", "dialkit-version-thumb");
      node.dataset.version = key;
      setHint(node, HINTS.version);
      const frame = element5("button", "dialkit-version-thumb-frame");
      frame.setAttribute("role", "option");
      frame.addEventListener("click", () => {
        if (overview) overview.select(key);
        else void switchTo(key);
      });
      const label = element5("span", "dialkit-version-thumb-label");
      label.addEventListener("dblclick", () => rename(key, label));
      node.append(frame, label);
      if (key !== versionKey(null)) {
        const remove = element5("button", "dialkit-version-thumb-delete");
        remove.append(icon2(ICON_CLOSE));
        setHint(remove, HINTS.deleteVersion);
        remove.addEventListener("click", () => deleteVersion(props.panelId, key));
        node.append(remove);
      }
      thumbs.set(key, node);
      return node;
    };
    const removeThumb = (node) => {
      setHint(node, void 0);
      const remove = node.querySelector(".dialkit-version-thumb-delete");
      if (remove) setHint(remove, void 0);
      node.remove();
    };
    const rename = (key, label) => {
      const current2 = listVersions(props.panelId).find((v) => v.key === key)?.name ?? "";
      const input = element5("input", "dialkit-version-thumb-label dialkit-version-thumb-input");
      input.value = current2;
      input.setAttribute("aria-label", "Version name");
      editing = key;
      let done = false;
      const end = (commit) => {
        if (done) return;
        done = true;
        editing = null;
        input.replaceWith(label);
        if (commit) renameVersion(props.panelId, key, input.value);
        render();
      };
      input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") end(true);
        else if (e.key === "Escape") end(false);
      });
      input.addEventListener("blur", () => end(true));
      label.replaceWith(input);
      input.focus();
      input.select();
    };
    const switchTo = async (key) => {
      if (switchingTo !== null) {
        switchingTo = key;
        return;
      }
      if (key === versionKey(DialStore.getActivePresetId(props.panelId))) return;
      switchingTo = key;
      await watcher.flush();
      const next = switchingTo;
      switchingTo = null;
      if (!destroyed) selectVersion(props.panelId, next);
    };
    save.addEventListener("click", async () => {
      if (saving || overview || opening) return;
      saving = true;
      try {
        await saveVersionWithAppshot(props.panelId, async (key) => {
          await new Promise(requestAnimationFrame);
          const slot = thumbs.get(key)?.querySelector(".dialkit-version-thumb-frame") ?? null;
          slot?.scrollIntoView({ block: "nearest", inline: "nearest" });
          return slot;
        });
      } finally {
        saving = false;
      }
    });
    toggle.addEventListener("click", async () => {
      if (overview) {
        overview.dismiss();
        return;
      }
      if (opening) return;
      opening = true;
      render();
      await watcher.flush();
      opening = false;
      if (destroyed) return;
      overview = openVersionsOverview(props.panelId, props.theme, () => {
        overview = null;
        render();
      });
      render();
    });
    const syncAspect = () => root.style.setProperty("--dialkit-version-aspect", String(window.innerWidth / window.innerHeight));
    syncAspect();
    window.addEventListener("resize", syncAspect);
    let watcher = watchVersionThumbnails(props.panelId);
    let stopStore = DialStore.subscribe(props.panelId, render);
    const stopThumbnails = ThumbnailStore.subscribe(render);
    const stopArrivals = ArrivalStore.subscribe(render);
    render();
    return {
      update(next) {
        if (next.panelId !== props.panelId) {
          watcher.stop();
          stopStore();
          thumbs.forEach(removeThumb);
          thumbs.clear();
          watcher = watchVersionThumbnails(next.panelId);
          stopStore = DialStore.subscribe(next.panelId, render);
        }
        props = next;
        render();
      },
      destroy() {
        destroyed = true;
        overview?.close();
        syncCopy(false);
        watcher.stop();
        stopStore();
        stopThumbnails();
        stopArrivals();
        window.removeEventListener("resize", syncAspect);
        thumbs.forEach(removeThumb);
        setHint(save, void 0);
        setHint(toggle, void 0);
        root.remove();
      }
    };
  }

  // src/vanilla/DialRoot.ts
  function mountPanelToolbar(host, id, hookName = "createDialKit", versions = "menu") {
    let timer;
    let destroyed = false;
    const gallery = versions !== "menu";
    const presetProps = () => ({ panelId: id, presets: DialStore.getPresets(id), activePresetId: DialStore.getActivePresetId(id) });
    const presets = gallery ? null : mountPresetManager(host, presetProps());
    const copyContent = (copied) => {
      const glyph = icon2(copied ? ICON_CHECK : [ICON_CLIPBOARD_PLAIN.board, ICON_CLIPBOARD_PLAIN.body]);
      return gallery ? [glyph, element5("span", "", copied ? "Copied" : "Copy parameters")] : [glyph];
    };
    const copy = button("Copy parameters", [ICON_CLIPBOARD_PLAIN.board, ICON_CLIPBOARD_PLAIN.body], async () => {
      try {
        await navigator.clipboard.writeText(buildCopyInstruction(hookName, DialStore.getPanel(id)?.name ?? "", DialStore.getValues(id)));
      } catch {
        return;
      }
      if (destroyed)
        return;
      copy.replaceChildren(...copyContent(true));
      clearTimeout(timer);
      timer = setTimeout(() => copy.replaceChildren(...copyContent(false)), 1500);
    });
    copy.classList.add("dialkit-toolbar-primary");
    if (gallery) {
      copy.dataset.wide = "true";
      copy.replaceChildren(...copyContent(false));
    }
    setHint(copy, HINTS.copy);
    host.append(copy);
    const stop3 = DialStore.subscribe(id, () => presets?.update(presetProps()));
    return {
      destroy() {
        destroyed = true;
        clearTimeout(timer);
        stop3();
        presets?.destroy();
        setHint(copy, void 0);
        copy.remove();
      }
    };
  }
  function createDialRoot(options = {}) {
    const root = element5("div", "dialkit-root");
    const shell = element5("div", "dialkit-panel");
    root.append(shell);
    const inline = options.mode === "inline";
    root.dataset.mode = shell.dataset.mode = inline ? "inline" : "popover";
    root.dataset.theme = options.theme ?? "system";
    if (options.accordion)
      shell.dataset.accordion = "true";
    let position = options.position ?? "top-right";
    shell.dataset.position = position;
    let offset = null;
    let drag;
    const origin = () => {
      shell.dataset.originX = getPanelOriginX(position, offset);
      shell.dataset.originY = getPanelOriginY(position, offset);
    };
    origin();
    let shellOpen = inline || (options.defaultOpen ?? true);
    let lastOpen = shellOpen;
    let signature = "";
    let children = [];
    let shellFolder;
    let openFolders = {};
    let destroyed = false;
    const notify = (open) => {
      if (lastOpen !== open) {
        lastOpen = open;
        options.onOpenChange?.(open);
      }
    };
    function setShellOpen(open) {
      shellOpen = open;
      shellFolder?.update({ title: "DialKit", open, isRoot: true, inline, onOpenChange: setShellOpen });
      notify(open);
    }
    function timelineToggle(host) {
      if (!TimelineStore.getTimelines().length)
        return;
      const toggle = button("Toggle timeline", ["M3 5h18v14H3z", "M7 9h10M7 13h6"], () => TimelineUiStore.toggle());
      host.append(toggle);
      const sync = () => toggle.setAttribute("aria-pressed", String(TimelineUiStore.getVisible()));
      const stop3 = TimelineUiStore.subscribe(sync);
      sync();
      children.push({
        destroy() {
          stop3();
          toggle.remove();
        }
      });
    }
    function panelView(panel, host, isRoot) {
      DialStore.initPanelOpen(panel.id, isRoot ? inline || (options.defaultOpen ?? true) : true);
      const folderProps = () => ({
        title: DialStore.getPanel(panel.id)?.name ?? panel.name,
        open: DialStore.getPanelOpen(panel.id),
        isRoot,
        isSection: !isRoot,
        inline: isRoot && inline,
        onOpenChange: (open) => {
          DialStore.setPanelOpen(panel.id, open);
          if (isRoot)
            notify(open);
        }
      });
      const folder = mountFolder(host, folderProps());
      const toolbar = folder.toolbar;
      const versions = options.versions ?? "thumbnails";
      const toolbarView = mountPanelToolbar(toolbar, panel.id, "createDialKit", versions);
      if (isRoot)
        timelineToggle(toolbar);
      const rendererProps = () => {
        const controls = DialStore.getPanel(panel.id)?.controls ?? [];
        return { panelId: panel.id, controls, values: DialStore.getValues(panel.id), animateControls: true, openFolder: options.accordion ? resolveOpenFolder(controls, openFolders[panel.id]) : void 0, onOpenFolderChange: (path) => {
          openFolders = { ...openFolders, [panel.id]: path };
          renderer.update(rendererProps());
        } };
      };
      const renderer = mountControlRenderer(folder.body, rendererProps());
      const gallery = versions === "menu" ? null : mountVersionGallery(folder.body, { panelId: panel.id, theme: options.theme });
      const tip = element5("p", "dialkit-hint-tip");
      tip.append("Hold ", element5("kbd", "dialkit-hint-tip-key", "H"), " over a control to see what it does.");
      const renderTip = () => {
        if (!HintStore.isTipSeen())
          folder.body.append(tip);
        else
          tip.remove();
      };
      renderTip();
      const update = () => {
        folder.update(folderProps());
        renderer.update(rendererProps());
        renderTip();
      };
      const stop3 = DialStore.subscribe(panel.id, update);
      const stopHints = HintStore.subscribe(renderTip);
      children.push({
        destroy() {
          stop3();
          stopHints();
          tip.remove();
          toolbarView.destroy();
          gallery?.destroy();
          renderer.destroy();
          folder.destroy();
        }
      });
    }
    function render() {
      if (destroyed)
        return;
      const panels = DialStore.getPanels("panel");
      const timelines = TimelineStore.getTimelines();
      root.style.display = panels.length || timelines.length ? "" : "none";
      const next = JSON.stringify([panels.map((p) => [p.id, p.name]), timelines.length > 0]);
      if (next === signature)
        return;
      signature = next;
      openFolders = pruneOpenFolders(openFolders, panels.map((p) => p.id));
      children.forEach((child) => child.destroy());
      children = [];
      shell.replaceChildren();
      shellFolder = void 0;
      if (!panels.length && !timelines.length)
        return;
      const wrapper = element5("div", "dialkit-panel-wrapper");
      shell.append(wrapper);
      shell.dataset.multiple = String(panels.length > 1);
      if (panels.length === 1)
        panelView(panels[0], wrapper, true);
      else {
        shellFolder = mountFolder(wrapper, { title: "DialKit", open: shellOpen, isRoot: true, inline, onOpenChange: setShellOpen });
        children.push(shellFolder);
        timelineToggle(shellFolder.toolbar);
        panels.forEach((panel) => panelView(panel, shellFolder.body, false));
        if (!panels.length)
          shellFolder.body.append(element5("div", "dialkit-timeline-toolkit-only", "Timeline"));
      }
    }
    const endDrag = () => {
      if (!drag)
        return;
      const current2 = drag;
      drag = void 0;
      releasePanelPointer(current2.handle, current2.id);
      if (current2.moved)
        blockPanelDragClick(current2.handle);
    };
    if (!inline) {
      shell.addEventListener("pointerdown", (event) => {
        if (event.button !== 0)
          return;
        const handle = getPanelDragHandle(event.target, shell);
        if (!handle)
          return;
        event.preventDefault();
        drag = { start: getPanelDragStart(event.clientX, event.clientY, shell), handle, id: event.pointerId, moved: false };
        capturePanelPointer(handle, event.pointerId);
      });
      shell.addEventListener("pointermove", (event) => {
        if (!drag || drag.id !== event.pointerId || !drag.moved && !hasPanelDragMoved(drag.start, event.clientX, event.clientY))
          return;
        drag.moved = true;
        offset = getPanelDragOffset(drag.start, event.clientX, event.clientY);
        delete shell.dataset.position;
        Object.assign(shell.style, { left: `${offset.x}px`, top: `${offset.y}px`, right: "auto", bottom: "auto" });
        origin();
      });
      shell.addEventListener("pointerup", endDrag);
      shell.addEventListener("pointercancel", endDrag);
      shell.addEventListener("lostpointercapture", endDrag);
    }
    if (options.productionEnabled !== false)
      (options.target ?? document.body).append(root);
    const shortcuts = options.productionEnabled !== false ? mountShortcutListener() : void 0;
    const stopPointerFocus = options.productionEnabled !== false ? observePointerFocus() : () => {
    };
    const stopGlobal = options.productionEnabled !== false ? DialStore.subscribeGlobal(render) : () => {
    };
    const stopTimelines = options.productionEnabled !== false ? TimelineStore.subscribeGlobal(render) : () => {
    };
    const stopOpen = DialStore.subscribePanelOpen((id, open) => {
      if (destroyed)
        return;
      const panels = DialStore.getPanels("panel");
      if (!panels.some((p) => p.id === id))
        return;
      if (panels.length > 1 && open)
        setShellOpen(true);
      else if (panels.length === 1)
        notify(open);
      if (!open && !inline && offset) {
        position = getPanelCorner(position, offset);
        offset = null;
        shell.style.cssText = "";
        shell.dataset.position = position;
        origin();
      }
    });
    if (options.productionEnabled !== false)
      render();
    return {
      element: root,
      destroy() {
        if (destroyed)
          return;
        destroyed = true;
        endDrag();
        stopGlobal();
        stopTimelines();
        stopOpen();
        shortcuts?.destroy();
        stopPointerFocus();
        children.forEach((child) => child.destroy());
        root.remove();
      }
    };
  }
  var DialRoot = createDialRoot;

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
    const curve = step.transition ?? inheritedTransition;
    if (curve && isPhysicsSpring(curve)) return transitionDefaultDuration(curve);
    if (step.duration !== void 0) return animatedDuration(step.duration);
    if (step.transition) return transitionDefaultDuration(step.transition);
    return DEFAULT_STEP_DURATION;
  }
  function defaultTrackDuration(track, inheritedTransition) {
    const curve = track.transition ?? inheritedTransition;
    if (track.steps?.length) {
      return track.steps.reduce((sum, step) => sum + defaultStepDuration(step, curve), 0);
    }
    if (curve && isPhysicsSpring(curve)) return transitionDefaultDuration(curve);
    if (track.duration !== void 0) return animatedDuration(track.duration);
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
    if (isPhysicsSpring(defaultCurve)) return transitionDefaultDuration(defaultCurve);
    if (clip.duration !== void 0) return animatedDuration(clip.duration);
    if (isTransitionConfig(clip.transition)) return transitionDefaultDuration(clip.transition);
    return clip.from || clip.to ? transitionDefaultDuration(DEFAULT_CLIP_TRANSITION) : 0;
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
      maxEnd = Math.max(maxEnd, nonNegativeFinite(clip.at) + defaultClipDuration(clip));
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
      const total = defaultClipDuration(clip);
      const defaultCurve = single ?? DEFAULT_CLIP_TRANSITION;
      const clipAt = nonNegativeFinite(clip.at);
      const clipDial = {
        at: [clipAt, 0, duration, CLIP_VALUE_STEP]
      };
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
      clips.push({
        key: path,
        label: typeof clip.label === "string" && clip.label ? clip.label : formatLabel(childKey),
        color: TIMELINE_CLIP_COLORS[index % TIMELINE_CLIP_COLORS.length],
        loop: normalizeLoopMode(clip.loop),
        group,
        stepKeys,
        tracks
      });
    });
    return { duration, dialConfig, clips };
  }
  var TRACK_RESERVED = /* @__PURE__ */ new Set(["at", "duration", "loop", "from", "to", "transition", "delay"]);
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
      return cubicBezierProgress(clamp2(curve.duration > 0 ? elapsed / curve.duration : 1, 0, 1), curve.ease);
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
    const maxEnd = clips.reduce(
      (end, clip) => Math.max(end, clip.at + clip.duration),
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
    const progress = total > 0 ? clamp2(basePos / total, 0, 1) : started ? 1 : 0;
    let current2;
    let stepIndex = 0;
    if (clip.tracks.length && clip.props?.length) {
      current2 = {};
      for (const track of clip.tracks) {
        const props = track.prop !== void 0 ? [track.prop] : clip.props;
        for (const prop of props) {
          const startValue = track.steps[0]?.start[prop];
          if (!started) {
            if (startValue !== void 0) current2[prop] = startValue;
            continue;
          }
          const phase = phaseElapsed - track.delay;
          if (phase <= 0) {
            if (startValue !== void 0) current2[prop] = startValue;
            continue;
          }
          const pos = looping && track.duration > 0 ? phase % track.duration : phase;
          const value = evalPropAtPos(track.steps, prop, pos);
          if (value !== void 0) current2[prop] = value;
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
      current: current2
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
    let h = hex.slice(1);
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255
    ];
  }
  function mixHexColors(a, b, p) {
    const ca = parseHex(a);
    const cb = parseHex(b);
    if (!ca || !cb) return null;
    const t = clamp2(p, 0, 1);
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
    return clamp2(round22(delay), 0, Math.max(0, round22(timelineDuration - at - trackDuration)));
  }
  function clampClipResizeEnd(duration, at, timelineDuration) {
    return clamp2(round22(duration), TIMELINE_MIN_CLIP_DURATION, timelineDuration - at);
  }
  function clampClipResizeStart(newAt, at, duration) {
    const clampedAt = clamp2(round22(newAt), 0, at + duration - TIMELINE_MIN_CLIP_DURATION);
    return { at: clampedAt, duration: round22(at + duration - clampedAt) };
  }
  function clampStepResize(duration, at, otherStepsTotal, timelineDuration) {
    const max = Math.max(TIMELINE_MIN_CLIP_DURATION, timelineDuration - at - otherStepsTotal);
    return clamp2(round22(duration), TIMELINE_MIN_CLIP_DURATION, max);
  }
  function canShareTrack(clips) {
    return clips.every(
      (clip) => !clip.group && !clip.stepKeys?.length && !clip.tracks?.length && clip.loop === "off"
    );
  }
  function timelineClipSpans(values, clips, timelineDuration) {
    return clips.map((clip) => {
      const { at, duration } = computeClipStaticFromValues(values, clip, timelineDuration);
      return { key: clip.key, at, duration };
    });
  }
  function timelineClipDragBounds(spans, key, timelineDuration, options = {}) {
    const index = spans.findIndex((span) => span.key === key);
    const self = spans[index];
    let start = 0;
    let end = timelineDuration;
    const targets = /* @__PURE__ */ new Set();
    spans.forEach((span, i) => {
      if (i === index) return;
      targets.add(round22(span.at));
      targets.add(round22(span.at + span.duration));
      if (!options.singleTrack || !self) return;
      const before = span.at < self.at || span.at === self.at && i < index;
      if (before) start = Math.max(start, Math.min(span.at + span.duration, self.at));
      else end = Math.min(end, Math.max(span.at, self.at + self.duration));
    });
    if (options.playhead !== void 0) targets.add(options.playhead);
    return { start, end, targets: [...targets].sort((a, b) => a - b) };
  }
  function nearestWithin(candidates, wanted, min, max) {
    let best;
    for (const candidate of candidates) {
      if (candidate < min - 1e-9 || candidate > max + 1e-9) continue;
      if (best === void 0 || Math.abs(candidate - wanted) < Math.abs(best - wanted)) best = candidate;
    }
    return best;
  }
  function dragTimelineClip(mode, clip, delta, bounds, snap = false) {
    const { at, duration } = clip;
    if (mode === "move") {
      const max2 = Math.max(bounds.start, bounds.end - duration);
      const wanted2 = at + delta;
      const landed2 = snap ? nearestWithin(bounds.targets.flatMap((t) => [t, t - duration]), wanted2, bounds.start, max2) : void 0;
      return { at: clamp2(round22(landed2 ?? wanted2), bounds.start, max2), duration };
    }
    if (mode === "end") {
      const max2 = bounds.end - at;
      const wanted2 = duration + delta;
      const landed2 = snap ? nearestWithin(bounds.targets.map((t) => t - at), wanted2, TIMELINE_MIN_CLIP_DURATION, max2) : void 0;
      return { at, duration: clamp2(round22(landed2 ?? wanted2), TIMELINE_MIN_CLIP_DURATION, max2) };
    }
    const max = at + duration - TIMELINE_MIN_CLIP_DURATION;
    const wanted = at + delta;
    const landed = snap ? nearestWithin(bounds.targets, wanted, bounds.start, max) : void 0;
    const next = clamp2(round22(landed ?? wanted), bounds.start, max);
    return { at: next, duration: round22(at + duration - next) };
  }
  function timelineClipProgress(time, at, duration) {
    if (duration <= 0) return time >= at ? 1 : 0;
    return clamp2((time - at) / duration, 0, 1);
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
  function buildTimelineMeta(id, name, duration, parsed, loop, track = "rows") {
    const resolvedLoop = resolveTimelineLoop(loop);
    return {
      id,
      name,
      duration,
      loop: resolvedLoop.enabled,
      loopStart: resolvedLoop.start,
      track: track === "single" && singleTrackFits(name, parsed) ? "single" : "rows",
      clips: parsed.clips
    };
  }
  var warnedSingleTrack = /* @__PURE__ */ new WeakSet();
  function singleTrackFits(name, parsed) {
    if (canShareTrack(parsed.clips)) return true;
    if (!warnedSingleTrack.has(parsed)) {
      warnedSingleTrack.add(parsed);
      console.warn(
        `[dialkit] Timeline "${name}": track: 'single' holds plain clips only (no groups, steps, props or looping clips) \u2014 using rows.`
      );
    }
    return false;
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
      const state = computeClipState(clip, transport.time, cycleTime);
      if (clip.group) {
        const bucket = result[_a = clip.group] ?? (result[_a] = {});
        bucket[clip.childKey] = state;
      } else {
        result[clip.key] = state;
      }
    }
    return result;
  }

  // src/vanilla/createDialTimeline.ts
  var nextId4 = 0;
  function createDialTimeline(name, config, options = {}) {
    const id = options.id ?? `vanilla-timeline-${name}-${++nextId4}`;
    let parsed = parseTimelineConfig(config);
    let destroyed = false;
    const registration = { retainOnUnmount: options.id !== void 0, persist: options.persist, kind: "timeline" };
    DialStore.registerPanel(id, name, parsed.dialConfig, void 0, registration);
    let compiled = computeStaticTimeline(parsed, DialStore.getValues(id));
    const meta = () => buildTimelineMeta(id, name, compiled.duration, parsed, options.loop, options.track);
    TimelineStore.register(meta(), { autoplay: options.autoplay ?? true });
    const actions = {
      play() {
        if (!destroyed)
          TimelineStore.play(id);
      },
      pause() {
        if (!destroyed)
          TimelineStore.pause(id);
      },
      replay() {
        if (!destroyed)
          TimelineStore.replay(id);
      },
      seek(time) {
        if (!destroyed)
          TimelineStore.seek(id, time);
      }
    };
    const listeners2 = /* @__PURE__ */ new Set();
    const getValues = () => buildTimelineValues(compiled.clips, TimelineStore.getTransport(id), compiled.duration, resolveTimelineLoop(options.loop).start, actions);
    const notify = () => {
      const values = getValues();
      listeners2.forEach((listener) => listener(values));
    };
    const stopValues = DialStore.subscribe(id, () => {
      compiled = computeStaticTimeline(parsed, DialStore.getValues(id));
      TimelineStore.update(meta());
    });
    const stopTransport = TimelineStore.subscribe(id, notify);
    return {
      id,
      ...actions,
      get values() {
        return getValues();
      },
      getValues,
      subscribe(listener, immediate = true) {
        if (destroyed)
          return () => {
          };
        listeners2.add(listener);
        if (immediate)
          listener(getValues());
        return () => {
          listeners2.delete(listener);
        };
      },
      updateConfig(next) {
        if (destroyed)
          return;
        parsed = parseTimelineConfig(next);
        DialStore.updatePanel(id, name, parsed.dialConfig, void 0, registration);
      },
      destroy() {
        if (destroyed)
          return;
        destroyed = true;
        listeners2.clear();
        stopValues();
        stopTransport();
        TimelineStore.unregister(id);
        DialStore.unregisterPanel(id);
      }
    };
  }

  // src/vanilla/DialTimeline.ts
  function createDialTimelineRoot(initial = {}) {
    let options = initial;
    let destroyed = false;
    const root = element5("div", "dialkit-root dialkit-timeline");
    root.dataset.theme = options.theme ?? "system";
    const resize = element5("div", "dialkit-timeline-resize-handle");
    resize.setAttribute("role", "separator");
    resize.setAttribute("aria-label", "Resize timeline height");
    resize.dataset.hint = TIMELINE_HINTS.resize;
    const hints = mountHints();
    resize.setAttribute("aria-orientation", "horizontal");
    resize.tabIndex = 0;
    const dock = element5("div", "dialkit-timeline-dock");
    root.append(resize, dock);
    let height = 400;
    const size = () => {
      dock.style.maxHeight = `min(${height}px, calc(100vh - 24px))`;
    };
    size();
    const drag = pointerGesture();
    resize.addEventListener("pointerdown", (event) => {
      const start = dock.getBoundingClientRect().height;
      drag.start(event, (next) => {
        height = clamp2(start + event.clientY - next.clientY, 120, Math.max(120, window.innerHeight - 24));
        size();
      });
    });
    resize.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        height = clamp2(height + (event.key === "ArrowUp" ? 20 : -20), 120, Math.max(120, window.innerHeight - 24));
        size();
      }
    });
    const sections = /* @__PURE__ */ new Map();
    const visibilityId = /* @__PURE__ */ Symbol("vanilla-timeline");
    const controller = () => ({ visible: options.visible, defaultVisible: options.defaultVisible ?? true, onVisibilityChange: options.onVisibilityChange });
    function render() {
      const timelines = TimelineStore.getTimelines();
      root.hidden = options.productionEnabled === false || !timelines.length || !TimelineUiStore.getVisible();
      for (const [id, section] of sections)
        if (!timelines.some((t) => t.id === id)) {
          section.destroy();
          sections.delete(id);
        }
      for (const meta of timelines) {
        let section = sections.get(meta.id);
        if (!section) {
          section = mountSection(dock, meta, options);
          sections.set(meta.id, section);
        } else
          section.update(meta, options.theme ?? "system");
        if (root.hidden)
          section.closeEditor();
      }
    }
    const enabled = options.productionEnabled !== false;
    const stopController = enabled ? TimelineUiStore.registerController(visibilityId, controller()) : () => {
    };
    const stopGlobal = enabled ? TimelineStore.subscribeGlobal(render) : () => {
    };
    const stopVisible = enabled ? TimelineUiStore.subscribe(render) : () => {
    };
    const stopPointerFocus = enabled ? observePointerFocus() : () => {
    };
    if (enabled) {
      (options.target ?? document.body).append(root);
      render();
    }
    return {
      element: root,
      setVisible(visible) {
        if (!destroyed)
          TimelineUiStore.requestVisible(visible);
      },
      update(next) {
        if (destroyed)
          return;
        options = { ...options, ...next };
        root.dataset.theme = options.theme ?? "system";
        TimelineUiStore.updateController(visibilityId, controller());
        render();
      },
      destroy() {
        if (destroyed)
          return;
        destroyed = true;
        drag.destroy();
        stopGlobal();
        stopVisible();
        stopController();
        stopPointerFocus();
        sections.forEach((s) => s.destroy());
        sections.clear();
        hints.destroy();
        root.remove();
      }
    };
  }
  var DialTimeline = createDialTimelineRoot;
  function pointerGesture() {
    let finish;
    return {
      start(event, move, end) {
        if (event.button !== 0)
          return;
        finish?.(true);
        event.preventDefault();
        event.stopPropagation();
        const onMove = (next) => {
          if (next.pointerId === event.pointerId) {
            next.preventDefault();
            move(next);
          }
        };
        const onEnd = (next) => {
          if (next.pointerId === event.pointerId)
            finish?.(next.type === "pointercancel");
        };
        finish = (cancelled = false) => {
          finish = void 0;
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onEnd);
          window.removeEventListener("pointercancel", onEnd);
          end?.(cancelled);
        };
        window.addEventListener("pointermove", onMove, { passive: false });
        window.addEventListener("pointerup", onEnd);
        window.addEventListener("pointercancel", onEnd);
      },
      destroy() {
        finish?.(true);
      }
    };
  }
  function mountSection(host, initial, options) {
    let meta = initial;
    let theme = options.theme ?? "system";
    let open = options.defaultOpen ?? true;
    let zoom = 1, viewStart = 0;
    const groups = /* @__PURE__ */ new Set(), tracks = /* @__PURE__ */ new Set();
    const section = element5("div", "dialkit-timeline-section");
    section.setAttribute("role", "group");
    const header = element5("div", "dialkit-timeline-header");
    const playback = element5("div", "dialkit-timeline-transport");
    const overview = element5("div", "dialkit-timeline-overview");
    const viewport = element5("div", "dialkit-timeline-overview-viewport");
    const progress = element5("div", "dialkit-timeline-overview-progress");
    const marker = element5("div", "dialkit-timeline-overview-playhead");
    overview.append(viewport, progress, marker);
    const actions = element5("div", "dialkit-timeline-actions");
    header.append(playback, overview, actions);
    const play = button("Play timeline", ICON_PLAY, () => {
      if (TimelineStore.getTransport(meta.id).playing)
        TimelineStore.pause(meta.id);
      else
        TimelineStore.play(meta.id);
    });
    const replay = button("Replay timeline", ICON_REPLAY, () => {
      zoom = 1;
      viewStart = 0;
      render();
      TimelineStore.replay(meta.id);
    });
    const loop = button("Toggle loop", ICON_LOOP, () => TimelineStore.setLoop(meta.id, !meta.loop));
    loop.classList.add("dialkit-timeline-toolbar-toggle", "dialkit-timeline-loop");
    play.dataset.hint = TIMELINE_HINTS.play;
    replay.dataset.hint = TIMELINE_HINTS.replay;
    loop.dataset.hint = TIMELINE_HINTS.loop;
    overview.dataset.hint = TIMELINE_HINTS.overview;
    playback.append(play, replay, loop);
    const presetProps = () => ({ panelId: meta.id, presets: DialStore.getPresets(meta.id), activePresetId: DialStore.getActivePresetId(meta.id), noun: "sequence" });
    const presets = mountPresetManager(actions, presetProps());
    let copyTimer;
    let destroyed = false;
    let renderedWidth = -1;
    const copy = button("Copy parameters", [ICON_CLIPBOARD_PLAIN.board, ICON_CLIPBOARD_PLAIN.body], async () => {
      try {
        await navigator.clipboard.writeText(buildCopyInstruction("createDialTimeline", meta.name, normalizeTimelineValuesForCopy(DialStore.getValues(meta.id), meta.clips)));
      } catch {
        return;
      }
      if (destroyed)
        return;
      copy.replaceChildren(icon2(ICON_CHECK));
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => copy.replaceChildren(icon2([ICON_CLIPBOARD_PLAIN.board, ICON_CLIPBOARD_PLAIN.body])), 1500);
    });
    actions.append(copy);
    copy.dataset.hint = TIMELINE_HINTS.copy;
    const collapse = element5("button", "dialkit-timeline-chevron");
    collapse.append(icon2(ICON_CHEVRON));
    collapse.dataset.hint = TIMELINE_HINTS.toggle;
    collapse.addEventListener("click", () => {
      open = !open;
      closeEditor();
      render();
    });
    actions.append(collapse);
    const body = element5("div", "dialkit-timeline-body");
    const grid = element5("div", "dialkit-timeline-grid");
    const rulerRow = element5("div", "dialkit-timeline-row dialkit-timeline-ruler-row");
    const ruler = element5("div", "dialkit-timeline-ruler");
    ruler.dataset.hint = TIMELINE_HINTS.ruler;
    rulerRow.append(element5("div", "dialkit-timeline-label"), ruler);
    grid.append(rulerRow);
    const playhead = element5("div", "dialkit-timeline-playhead-control");
    playhead.setAttribute("role", "slider");
    playhead.tabIndex = 0;
    playhead.setAttribute("aria-label", "Timeline current time");
    playhead.dataset.hint = TIMELINE_HINTS.playhead;
    const stem = element5("div", "dialkit-timeline-playhead-stem");
    const anchor = element5("div", "dialkit-timeline-playhead-anchor");
    const flag = element5("div", "dialkit-timeline-playhead-flag");
    anchor.append(flag);
    playhead.append(stem, anchor);
    grid.append(playhead);
    const scrollRow = element5("div", "dialkit-timeline-scroll-row");
    const scroll = element5("div", "dialkit-timeline-horizontal-scroll");
    scroll.setAttribute("aria-label", "Timeline horizontal scroll");
    const spacer = element5("div");
    scroll.append(spacer);
    scrollRow.append(element5("div", "dialkit-timeline-label"), scroll);
    body.append(grid, scrollRow);
    section.append(header, body);
    host.append(section);
    const gesture = pointerGesture();
    let rowElements = [];
    let fills = [];
    let editor;
    let selected = "";
    let picked = "";
    let pickedNode;
    function closeEditor() {
      editor?.destroy();
      editor = void 0;
      selected = "";
      section.querySelectorAll(".dialkit-timeline-clip[data-selected]").forEach((node) => delete node.dataset.selected);
      pickedNode?.setAttribute("data-selected", "");
    }
    function pick(key, node) {
      if (pickedNode && pickedNode !== node && selected !== picked)
        delete pickedNode.dataset.selected;
      picked = key;
      pickedNode = node;
      node?.setAttribute("data-selected", "");
    }
    const width = () => ruler.clientWidth;
    const visibleDuration = () => meta.duration / zoom;
    const scale = () => meta.duration > 0 ? width() / visibleDuration() : 0;
    function transport() {
      const state = TimelineStore.getTransport(meta.id);
      play.setAttribute("aria-label", state.playing ? "Pause timeline" : "Play timeline");
      if (play.dataset.playing !== String(state.playing)) {
        play.dataset.playing = String(state.playing);
        play.replaceChildren(icon2(state.playing ? ICON_PAUSE : ICON_PLAY));
      }
      const percent = meta.duration > 0 ? state.time / meta.duration * 100 : 0;
      progress.style.width = marker.style.left = `${percent}%`;
      viewport.style.left = `${meta.duration > 0 ? viewStart / meta.duration * 100 : 0}%`;
      viewport.style.width = `${100 / zoom}%`;
      if (zoom > 1)
        viewport.dataset.zoomed = "";
      else
        delete viewport.dataset.zoomed;
      const x = clamp2((state.time - viewStart) * scale(), 0, width());
      const flagOffset = clamp2(x, 18, Math.max(18, width() - 18)) - x;
      playhead.style.display = state.time < viewStart || state.time > viewStart + visibleDuration() || !width() ? "none" : "";
      playhead.style.left = `calc(var(--dial-timeline-label-w) + ${x}px)`;
      playhead.style.setProperty("--dial-timeline-playhead-flag-offset", `${flagOffset}px`);
      playhead.dataset.edge = flagOffset > 0.5 ? "start" : flagOffset < -0.5 ? "end" : "center";
      flag.textContent = state.time.toFixed(2);
      for (const fill of fills)
        fill.node.style.width = `${timelineClipProgress(state.time, fill.at, fill.duration) * 100}%`;
      playhead.setAttribute("aria-valuemin", "0");
      playhead.setAttribute("aria-valuemax", String(meta.duration));
      playhead.setAttribute("aria-valuenow", String(state.time));
    }
    function scrub(event, full = false) {
      const rect = (full ? overview : ruler).getBoundingClientRect();
      if (!rect.width)
        return;
      closeEditor();
      if (event.shiftKey) {
        zoom = 1;
        viewStart = 0;
        render();
      }
      if (event.altKey && !full) {
        const startZoom = zoom, ratio = clamp2((event.clientX - rect.left) / rect.width, 0, 1), time = viewStart + ratio * visibleDuration();
        gesture.start(event, (next) => {
          zoom = clamp2(startZoom * Math.exp((next.clientX - event.clientX) / 180), 1, Math.max(8, meta.duration * rect.width / 140));
          viewStart = time - ratio * visibleDuration();
          render();
        });
        return;
      }
      const wasPlaying = TimelineStore.getTransport(meta.id).playing;
      const start = full ? 0 : viewStart, duration = full ? meta.duration : visibleDuration();
      TimelineStore.pause(meta.id);
      const seek = (next) => {
        const time = clamp2(start + (next.clientX - rect.left) / rect.width * duration, start, start + duration);
        TimelineStore.seek(meta.id, time);
        if (full) {
          viewStart = time - visibleDuration() / 2;
          render();
        }
      };
      gesture.start(event, seek, () => {
        if (wasPlaying && !destroyed)
          TimelineStore.play(meta.id);
      });
      seek(event);
    }
    ruler.addEventListener("pointerdown", (event) => scrub(event));
    playhead.addEventListener("pointerdown", (event) => scrub(event));
    overview.addEventListener("pointerdown", (event) => scrub(event, true));
    playhead.addEventListener("keydown", (event) => {
      const current2 = TimelineStore.getTransport(meta.id).time;
      const next = event.key === "Home" ? 0 : event.key === "End" ? meta.duration : event.key === "ArrowLeft" ? current2 - (event.shiftKey ? 0.1 : 1e-3) : event.key === "ArrowRight" ? current2 + (event.shiftKey ? 0.1 : 1e-3) : void 0;
      if (next !== void 0) {
        event.preventDefault();
        TimelineStore.seek(meta.id, next);
      }
    });
    body.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".dialkit-timeline-lane") && (!event.target.closest(".dialkit-timeline-clip") || event.shiftKey)) {
        pick("");
        scrub(event);
      }
    });
    scroll.addEventListener("scroll", () => {
      if (!scale())
        return;
      const next = scroll.scrollLeft / scale();
      if (Math.abs(next - viewStart) < 1e-3)
        return;
      viewStart = next;
      closeEditor();
      render();
    });
    body.addEventListener("wheel", (event) => {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
      if (zoom > 1 && delta) {
        event.preventDefault();
        scroll.scrollLeft += delta;
      }
    }, { passive: false });
    function row(label, className = "", grouped = false) {
      const root = element5("div", `dialkit-timeline-row ${className}`);
      if (grouped)
        root.dataset.grouped = "";
      const caption = element5("div", "dialkit-timeline-label", label), lane = element5("div", "dialkit-timeline-lane");
      root.append(caption, lane);
      grid.insertBefore(root, playhead);
      rowElements.push(root);
      return { root, caption, lane };
    }
    function disclosure(host2, isOpen, label, change) {
      const b = element5("button", "dialkit-timeline-group-toggle");
      b.setAttribute("aria-label", label);
      b.setAttribute("aria-expanded", String(isOpen));
      b.dataset.open = String(isOpen);
      b.append(icon2(ICON_CHEVRON));
      b.addEventListener("click", change);
      host2.prepend(b);
    }
    function render() {
      if (destroyed)
        return;
      section.setAttribute("aria-label", meta.name);
      body.style.display = open ? "" : "none";
      overview.style.display = open ? "none" : "";
      if (open)
        header.dataset.open = "";
      else
        delete header.dataset.open;
      collapse.dataset.open = String(open);
      collapse.setAttribute("aria-expanded", String(open));
      collapse.setAttribute("aria-label", open ? "Collapse timeline" : "Expand timeline");
      loop.setAttribute("aria-pressed", String(meta.loop));
      if (meta.loop)
        loop.dataset.active = "";
      else
        delete loop.dataset.active;
      viewStart = clamp2(viewStart, 0, Math.max(0, meta.duration - visibleDuration()));
      const px = scale();
      renderedWidth = width();
      ruler.replaceChildren();
      const tickSteps = [1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
      let major = tickSteps.find((t) => t >= 140 / (px || 1)) ?? 600;
      if (zoom < 1.5 && meta.duration >= 1)
        major = Math.max(1, major);
      for (let i = Math.ceil(viewStart / (major / 10)); i <= Math.floor((viewStart + visibleDuration()) / (major / 10)); i++) {
        const tick = element5("div", `dialkit-timeline-tick${i % 10 === 0 ? "" : i % 5 === 0 ? " dialkit-timeline-tick-medium" : " dialkit-timeline-tick-fine"}`);
        tick.style.left = `${(i * major / 10 - viewStart) * px}px`;
        if (i % 10 === 0)
          tick.append(element5("span", "dialkit-timeline-tick-label", `${Number((i * major / 10).toFixed(3))}s`));
        ruler.append(tick);
      }
      rowElements.forEach((r) => r.remove());
      rowElements = [];
      fills = [];
      pickedNode = void 0;
      const values = DialStore.getValues(meta.id);
      const singleTrack = meta.track === "single";
      if (singleTrack)
        section.dataset.track = "single";
      else
        delete section.dataset.track;
      let lastGroup;
      if (singleTrack) {
        const lane = row("").lane;
        for (const clip of meta.clips) {
          const stat = computeClipStaticFromValues(values, clip, meta.duration);
          bar(lane, clip, stat.at, stat.duration, void 0, stat.isPhysics, false, 0, false, true);
        }
      } else for (const clip of meta.clips) {
        if (clip.group && clip.group !== lastGroup) {
          const group = clip.group;
          const r2 = row(formatLabel(group), "dialkit-timeline-group-row");
          disclosure(r2.caption, !groups.has(group), groups.has(group) ? "Expand layer" : "Collapse layer", () => {
            if (!groups.delete(group))
              groups.add(group);
            closeEditor();
            render();
          });
        }
        lastGroup = clip.group;
        if (clip.group && groups.has(clip.group))
          continue;
        const stat = computeClipStaticFromValues(values, clip, meta.duration);
        const r = row(clip.label, "", !!clip.group);
        const composite = !!clip.tracks?.length;
        if (composite)
          disclosure(r.caption, tracks.has(clip.key), tracks.has(clip.key) ? "Collapse properties" : "Expand properties", () => {
            if (!tracks.delete(clip.key))
              tracks.add(clip.key);
            closeEditor();
            render();
          });
        bar(r.lane, clip, stat.at, stat.duration, clip.stepKeys?.length ? stat.tracks[0]?.steps : void 0, stat.isPhysics, composite);
        if (composite && tracks.has(clip.key))
          for (const trackRef of clip.tracks) {
            const track = stat.tracks.find((t) => t.prop === trackRef.prop);
            if (!track)
              continue;
            const r2 = row(formatLabel(trackRef.prop), "dialkit-timeline-track-row", !!clip.group);
            const trackMeta = { ...clip, key: `${clip.key}.${trackRef.prop}`, label: `${clip.label} \xB7 ${formatLabel(trackRef.prop)}`, tracks: void 0, stepKeys: trackRef.stepKeys };
            bar(r2.lane, trackMeta, stat.at + track.delay, track.duration, trackRef.stepKeys?.length ? track.steps : void 0, !trackRef.stepKeys?.length && track.steps[0]?.isPhysics === true, false, stat.at, true);
          }
      }
      scrollRow.style.display = zoom > 1 ? "" : "none";
      spacer.style.width = `${width() * zoom}px`;
      scroll.scrollLeft = viewStart * px;
      transport();
      presets.update(presetProps());
      editor?.update();
    }
    function dragBounds(clipKey) {
      const state = TimelineStore.getTransport(meta.id);
      return timelineClipDragBounds(timelineClipSpans(DialStore.getValues(meta.id), meta.clips, meta.duration), clipKey, meta.duration, { singleTrack: meta.track === "single", playhead: state.playing ? void 0 : state.time });
    }
    function bar(lane, clip, at, duration, steps, physics, composite = false, baseAt = 0, delayMode = false, single = false) {
      const px = scale();
      if (clip.loop === "repeat" && duration > 0)
        for (let index = Math.max(1, Math.floor((viewStart - at) / duration)), count = 0; at + duration * index < meta.duration && count < 256; index++, count++) {
          const ghost = element5("div", "dialkit-timeline-clip-ghost");
          ghost.setAttribute("aria-hidden", "true");
          Object.assign(ghost.style, { left: `${(at + duration * index - viewStart) * px + 1}px`, width: `${Math.max(1, Math.min(duration, meta.duration - at - duration * index) * px - 2)}px`, background: clip.color });
          lane.append(ghost);
        }
      const node = element5("div", "dialkit-timeline-clip");
      node.tabIndex = 0;
      node.setAttribute("role", "button");
      node.setAttribute("aria-label", `Edit ${clip.label}`);
      Object.assign(node.style, { left: `${(at - viewStart) * px + (single ? 1 : 0)}px`, width: `${Math.max(duration * px, 14) - (single ? 2 : 0)}px`, background: single ? "" : composite ? `${clip.color}80` : clip.color });
      if (steps?.length)
        node.dataset.steps = "";
      if (composite)
        node.dataset.composite = "";
      if (single && picked === clip.key)
        pickedNode = node;
      if (selected === clip.key || pickedNode === node)
        node.dataset.selected = "";
      const edge = (side) => {
        const handle = element5("div", "dialkit-timeline-clip-handle");
        handle.dataset.edge = side;
        node.append(handle);
      };
      if (steps?.length && !composite) {
        let offset = 0;
        for (const [index, step] of steps.entries()) {
          const segment = element5("div", "dialkit-timeline-clip-segment");
          segment.dataset.step = step.key ?? "";
          segment.style.width = `${step.duration * px}px`;
          if (step.duration * px > 52)
            segment.append(element5("span", "dialkit-timeline-clip-duration", formatSeconds(step.duration)));
          node.append(segment);
          offset += step.duration;
          if (!step.isPhysics) {
            const handle = element5("div", "dialkit-timeline-clip-handle");
            handle.dataset.boundary = String(index);
            handle.style.left = `${offset * px - 4}px`;
            node.append(handle);
          }
        }
        if (!steps[0].isPhysics)
          edge("start");
      } else {
        if (single) {
          const fill = element5("span", "dialkit-timeline-clip-fill");
          fill.setAttribute("aria-hidden", "true");
          node.append(fill);
          fills.push({ node: fill, at, duration });
        }
        if (!physics && !composite && duration > 0)
          edge("start");
        if (single)
          node.append(element5("span", "dialkit-timeline-clip-name", clip.label));
        if (duration * px > 56)
          node.append(element5("span", "dialkit-timeline-clip-duration", `${physics && !composite ? "~" : ""}${formatSeconds(duration)}`));
        if (!physics && !composite && duration > 0)
          edge("end");
      }
      lane.append(node);
      if (clip.loop === "repeat" && duration > 0)
        lane.append(element5("span", "dialkit-timeline-loop-infinity", "\u221E"));
      const edit = (target) => {
        if (composite) {
          if (!tracks.delete(clip.key))
            tracks.add(clip.key);
          render();
        } else
          openEditor(clip, target.closest("[data-step]") ?? node);
      };
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          edit(node);
        }
      });
      node.addEventListener("pointerdown", (event) => {
        if (event.shiftKey || event.button !== 0 || px <= 0)
          return;
        const target = event.target;
        const boundary = target.dataset.boundary;
        const mode = boundary !== void 0 ? "boundary" : target.dataset.edge ?? "move";
        if (single && mode === "move")
          pick(clip.key, node);
        const durations = steps?.map((s) => s.duration);
        const bounds = dragBounds(clip.key);
        let moved = false;
        gesture.start(event, (next) => {
          const dx = next.clientX - event.clientX;
          if (!moved && Math.abs(dx) <= 3)
            return;
          moved = true;
          closeEditor();
          const dt = dx / px;
          if (mode === "boundary" && steps && durations) {
            const index = Number(boundary);
            DialStore.updateValue(meta.id, `${clip.key}.${steps[index].key}.duration`, clampStepResize(durations[index] + dt, at, durations.reduce((sum, d, i) => sum + (i === index ? 0 : d), 0), meta.duration));
          } else if (!delayMode && (mode === "move" || mode === "end" || mode === "start" && !steps)) {
            const result = dragTimelineClip(mode, { at, duration }, dt, bounds, next.metaKey || next.ctrlKey);
            DialStore.updateValues(meta.id, { ...mode !== "end" && { [`${clip.key}.at`]: result.at }, ...mode !== "move" && { [`${clip.key}.duration`]: result.duration } });
          } else if (mode === "move" && delayMode) {
            DialStore.updateValue(meta.id, `${clip.key}.delay`, clampTrackDelay(at + dt - baseAt, baseAt, duration, meta.duration));
          } else if (mode === "end")
            DialStore.updateValue(meta.id, `${clip.key}.duration`, clampClipResizeEnd(duration + dt, at, meta.duration));
          else {
            const result = clampClipResizeStart(Math.max(at + dt, baseAt, 0), at, durations?.[0] ?? duration);
            DialStore.updateValues(meta.id, { [`${clip.key}.${delayMode ? "delay" : "at"}`]: delayMode ? Math.max(0, result.at - baseAt) : result.at, [`${clip.key}.${steps?.length ? `${steps[0].key}.` : ""}duration`]: result.duration });
          }
        }, (cancelled) => {
          if (!destroyed && !moved && !cancelled)
            edit(target);
        });
      });
    }
    function openEditor(clip, target) {
      closeEditor();
      selected = clip.key;
      target.closest(".dialkit-timeline-clip")?.setAttribute("data-selected", "");
      const stepKey = target.dataset.step || void 0;
      const path = stepKey ? `${clip.key}.${stepKey}` : clip.key;
      const getControl = (path2) => findControl(DialStore.getPanel(meta.id)?.controls ?? [], path2);
      const excluded = /* @__PURE__ */ new Set([...clip.stepKeys ?? [], ...clip.tracks?.map((t) => t.prop) ?? []]);
      let controls = getControl(path)?.children?.filter((c) => !["at", "duration"].includes(c.path.slice(path.length + 1)) && (stepKey || !excluded.has(c.path.slice(path.length + 1)))) ?? [];
      if (stepKey === clip.stepKeys?.[0]) {
        const from = getControl(`${clip.key}.from`);
        if (from) {
          const index = controls.findIndex((c) => c.path === `${path}.to`);
          controls = [...controls];
          controls.splice(index < 0 ? controls.length : index, 0, from);
        }
      }
      if (!controls.length)
        return;
      const root = element5("div", "dialkit-root");
      root.dataset.theme = theme;
      const popup = element5("div", "dialkit-timeline-popover");
      popup.setAttribute("role", "dialog");
      popup.setAttribute("aria-label", `Edit ${clip.label}${stepKey ? ` \xB7 ${formatStepLabel(stepKey)}` : ""}`);
      const heading = element5("div", "dialkit-timeline-popover-header");
      heading.append(element5("span", "dialkit-timeline-popover-title", `${clip.label}${stepKey ? ` \xB7 ${formatStepLabel(stepKey)}` : ""}`));
      const close2 = element5("button", "dialkit-timeline-popover-close");
      close2.setAttribute("aria-label", "Close editor");
      close2.dataset.hint = TIMELINE_HINTS.closeEditor;
      close2.append(icon2("M6 6l12 12M18 6 6 18"));
      close2.addEventListener("click", closeEditor);
      heading.append(close2);
      const content = element5("div", "dialkit-timeline-popover-body");
      popup.append(heading, content);
      root.append(popup);
      document.body.append(root);
      const rendererProps = () => {
        const values = DialStore.getValues(meta.id);
        const durationMeta = getControl(`${path}.duration`);
        const duration = values[`${path}.duration`];
        const min = Math.max(TIMELINE_MIN_CLIP_DURATION, durationMeta?.min ?? 0);
        const room = meta.track === "single" && !stepKey ? dragBounds(clip.key).end - computeClipStaticFromValues(values, clip, meta.duration).at : void 0;
        const max = room === void 0 ? durationMeta?.max : Math.max(min, Math.min(durationMeta?.max ?? room, room));
        return { panelId: meta.id, controls, values: timelinePopoverDisplayValues(values, clip.key, clip.stepKeys, stepKey), transitionDuration: durationMeta?.type === "slider" && typeof duration === "number" ? { value: duration, onChange: (v) => DialStore.updateValue(meta.id, `${path}.duration`, max === void 0 ? v : Math.min(v, max)), min, max, step: durationMeta.step } : void 0 };
      };
      const renderer = mountControlRenderer(content, rendererProps());
      const rect = target.getBoundingClientRect();
      const position = () => {
        const p = getDropdownPosition({ getBoundingClientRect: () => rect }, document.body, { fixed: true, width: 280, maxHeight: window.innerHeight - 24, dropdownHeight: popup.scrollHeight + 2 });
        Object.assign(popup.style, { left: `${clamp2(rect.left + rect.width / 2 - p.width / 2, 12, Math.max(12, window.innerWidth - p.width - 12))}px`, top: `${p.top}px`, width: `${p.width}px`, maxHeight: `${p.maxHeight}px` });
        popup.dataset.placement = p.above ? "above" : "below";
      };
      const observer2 = new ResizeObserver(position);
      observer2.observe(popup);
      window.addEventListener("resize", position);
      position();
      const outside = (event) => {
        if (!root.contains(event.target) && !event.target.closest(".dialkit-timeline-clip"))
          closeEditor();
      };
      const key = (event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          closeEditor();
        }
      };
      document.addEventListener("pointerdown", outside);
      root.addEventListener("keydown", key);
      close2.focus({ preventScroll: true });
      editor = {
        update() {
          root.dataset.theme = theme;
          renderer.update(rendererProps());
        },
        destroy() {
          observer2.disconnect();
          window.removeEventListener("resize", position);
          document.removeEventListener("pointerdown", outside);
          renderer.destroy();
          root.remove();
        }
      };
    }
    const stopValues = DialStore.subscribe(meta.id, render);
    const stopTransport = TimelineStore.subscribe(meta.id, transport);
    const observer = new ResizeObserver(() => {
      if (width() !== renderedWidth)
        render();
    });
    observer.observe(ruler);
    render();
    return {
      update(next, nextTheme) {
        meta = next;
        theme = nextTheme;
        render();
      },
      closeEditor,
      destroy() {
        destroyed = true;
        gesture.destroy();
        clearTimeout(copyTimer);
        stopValues();
        stopTransport();
        observer.disconnect();
        closeEditor();
        presets.destroy();
        section.remove();
      }
    };
  }
  return __toCommonJS(vanilla_exports);
})();
//# sourceMappingURL=browser.global.js.map