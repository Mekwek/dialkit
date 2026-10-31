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
    field.show();
  };
  const field = textField(options.className, options.label, () => read().toFixed(digits), (text) => {
    const n = parse(text);
    if (Number.isFinite(n)) set(n);
    return Number.isFinite(n);
  });
  const { input } = field;
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
  if (grips[0]) field.root.prepend(grips[0]);
  if (grips[1]) field.root.append(grips[1]);
  return { ...field, sync: () => {
    input.setAttribute("aria-valuenow", read().toFixed(digits));
    field.sync();
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
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  for (const d of ["m2 22 1-1h3l9-9", "M3 21v-3l9-9", "m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"]) {
    const path = document.createElementNS(svg.namespaceURI, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
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
    function track(name, max, step, className, hint) {
      const line = element2("label", "dialkit-color-track-row");
      const input = element2("input", `dialkit-color-track ${className}`);
      input.type = "range";
      input.min = "0";
      input.max = String(max);
      input.step = String(step);
      input.setAttribute("aria-label", name);
      line.append(input);
      tracks.append(line);
      setHint(line, hint);
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
      const field = numberField({
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
      field.root.dataset.channel = channel.label.toLowerCase();
      return field;
    };
    const hexField = () => {
      const field = textField("dialkit-color-field", "Hex value", () => formatColor({ ...color, a: 1 }, "hex"), (text) => {
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
      field.root.dataset.channel = "hex";
      return field;
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
      syncFields = [...channels, opacityField].map((field) => field.sync);
      const focused = channelFields.findIndex((field) => field.input === document.activeElement);
      channelFields.forEach((field) => field.root.remove());
      opacityField.root.before(...channels.map((field) => field.root));
      channelFields = channels;
      if (focused >= 0) {
        const field = channels[focused] ?? channels[0];
        field.show();
        field.input.focus({ preventScroll: true });
        field.input.select();
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
export {
  mountColorControl
};
//# sourceMappingURL=color-control.js.map