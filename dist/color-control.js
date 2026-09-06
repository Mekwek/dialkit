// src/color.ts
var fieldSpace = (format) => format === "hsl" ? "hsl" : format === "oklch" ? "oklch" : "hsv";
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
function hsvToColor({ h, s, v }, a = 1) {
  const f = (n) => {
    const k = (n + wrapHue(h) / 60) % 6;
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
function hslToColor({ h, s, l }, a = 1) {
  const k = clamp(s) * Math.min(clamp(l), 1 - clamp(l));
  const f = (n) => {
    const t = (n + wrapHue(h) / 30) % 12;
    return clamp(l) - k * Math.max(-1, Math.min(t - 3, 9 - t, 1));
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

// src/color-control.ts
var FORMATS = ["hex", "rgb", "hsl", "oklch"];
var FORMAT_LABEL = { hex: "Hex", rgb: "RGB", hsl: "HSL", oklch: "OKLCH" };
var MODE_KEY = "dialkit:color-mode";
var HEX_RE = /^#?([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;
var EYEDROPPER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg>';
var CHANNELS = {
  rgb: [
    { key: "r", label: "Red", min: 0, max: 255, digits: 0, width: 4 },
    { key: "g", label: "Green", min: 0, max: 255, digits: 0, width: 4 },
    { key: "b", label: "Blue", min: 0, max: 255, digits: 0, width: 4 }
  ],
  hsl: [
    { key: "h", label: "Hue", min: 0, max: 360, digits: 0, width: 4 },
    { key: "s", label: "Saturation", min: 0, max: 100, digits: 0, unit: "%", width: 4 },
    { key: "l", label: "Lightness", min: 0, max: 100, digits: 0, unit: "%", width: 4 }
  ],
  oklch: [
    { key: "l", label: "Lightness", min: 0, max: 1, digits: 3, width: 6 },
    { key: "c", label: "Chroma", min: 0, max: 0.4, digits: 3, width: 6 },
    { key: "h", label: "Hue", min: 0, max: 360, digits: 1, width: 6 }
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
var percentByte = (n) => Math.round(clamp(n) * 100);
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
    valueInput.title = props.value;
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
      input.title = "Enter a hex, RGB, HSL or OKLCH color";
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
  const open = () => {
    if (popup) {
      if (!inline) close();
      return;
    }
    const root = inline ? host : getDialKitPortalRoot(host) ?? host;
    popup = element("div", "dialkit-color-popover");
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
    const tracks = element("div", "dialkit-color-tracks");
    function track(name, max, step, className) {
      const line = element("label", "dialkit-color-track-row");
      const nameEl = element("span", "", name);
      const input = element("input", `dialkit-color-track ${className}`);
      input.type = "range";
      input.min = "0";
      input.max = String(max);
      input.step = String(step);
      input.setAttribute("aria-label", name);
      line.append(nameEl, input);
      tracks.append(line);
      return input;
    }
    const hue = track("Hue", 360, 0.1, "dialkit-color-hue");
    const opacity = track("Opacity", 100, 1, "dialkit-color-opacity");
    const formatRow = element("div", "dialkit-labeled-control dialkit-color-format-row");
    const formats = element("div", "dialkit-segmented dialkit-color-formats");
    formatRow.append(formats);
    formats.setAttribute("role", "radiogroup");
    formats.addEventListener("keydown", handleSegmentKey);
    formats.setAttribute("aria-label", "Color format");
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
    const fields = element("div", "dialkit-color-fields");
    const EyeDropperApi = window.EyeDropper;
    const eyedropper = element("button", "dialkit-color-eyedropper");
    eyedropper.innerHTML = EYEDROPPER_ICON;
    eyedropper.title = "Pick a color from the screen";
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
    if (EyeDropperApi) fields.append(eyedropper);
    fields.append(channelBox, alphaBox);
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
    const bindField = (input, onCommit) => {
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
      });
    };
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
          cell.append(input, name);
          channelBox.append(cell);
          return input;
        });
      }
      channelInputs.forEach((input) => bindField(input, commitChannels));
      syncChannels();
    };
    syncChannels = () => {
      if (channelInputs.length !== (format === "hex" ? 1 : 3)) return;
      const focused = document.activeElement;
      if (format === "hex") {
        if (focused !== channelInputs[0]) channelInputs[0].value = colorToHexSix(color);
      } else {
        const values = format === "rgb" ? colorToRgb255(color) : format === "hsl" ? (({ h, s, l }) => [h, s * 100, l * 100])(colorToHsl(color, srgbHue)) : [color.l, color.c, color.h];
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
    });
    const output = textInput("dialkit-color-css-input", "CSS color");
    output.addEventListener("change", () => acceptText(output));
    output.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        acceptText(output);
      }
    });
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
      if (document.activeElement !== output) {
        output.value = props.value;
        output.removeAttribute("aria-invalid");
      }
      output.title = props.value;
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
        if (e.shiftKey && document.activeElement === first || !e.shiftKey && document.activeElement === output) {
          swatch.focus({ preventScroll: true });
          close();
        }
      }
      e.stopPropagation();
    });
    popup.append(formatRow, plane, tracks, fields, output);
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
    formatButtons.find((button) => button.getAttribute("aria-checked") === "true")?.focus({ preventScroll: true });
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
export {
  mountColorControl
};
//# sourceMappingURL=color-control.js.map