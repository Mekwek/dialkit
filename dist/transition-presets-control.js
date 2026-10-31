// src/transition-presets-control.ts
import { DialStore } from "dialkit/store";

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

// src/transition-presets-control.ts
import { setHint } from "./hints.js";

// src/icons.ts
var ICON_CLOSE = "M6 6L18 18M18 6L6 18";
var ICON_CHECK = "M5 12.75L10 19L19 5";
var ICON_CLIPBOARD = {
  board: "M8 6C8 4.34315 9.34315 3 11 3H13C14.6569 3 16 4.34315 16 6V7H8V6Z",
  sparkle: "M19.2405 16.1852L18.5436 14.3733C18.4571 14.1484 18.241 14 18 14C17.759 14 17.5429 14.1484 17.4564 14.3733L16.7595 16.1852C16.658 16.4493 16.4493 16.658 16.1852 16.7595L14.3733 17.4564C14.1484 17.5429 14 17.759 14 18C14 18.241 14.1484 18.4571 14.3733 18.5436L16.1852 19.2405C16.4493 19.342 16.658 19.5507 16.7595 19.8148L17.4564 21.6267C17.5429 21.8516 17.759 22 18 22C18.241 22 18.4571 21.8516 18.5436 21.6267L19.2405 19.8148C19.342 19.5507 19.5507 19.342 19.8148 19.2405L21.6267 18.5436C21.8516 18.4571 22 18.241 22 18C22 17.759 21.8516 17.5429 21.6267 17.4564L19.8148 16.7595C19.5507 16.658 19.342 16.4493 19.2405 16.1852Z",
  body: "M16 5H17C18.6569 5 20 6.34315 20 8V11M8 5H7C5.34315 5 4 6.34315 4 8V18C4 19.6569 5.34315 21 7 21H12"
};
var ICON_CLIPBOARD_PLAIN = {
  board: ICON_CLIPBOARD.board,
  body: "M16 5H17C18.6569 5 20 6.34315 20 8V18C20 19.6569 18.6569 21 17 21H7C5.34315 21 4 19.6569 4 18V8C4 6.34315 5.34315 5 7 5H8"
};
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
var ICON_MORE = ["M5 12h.01", "M12 12h.01", "M19 12h.01"];
var ICON_LOCK = [
  "M6 11H18C18.5523 11 19 11.4477 19 12V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V12C5 11.4477 5.44772 11 6 11Z",
  "M7 11V7a5 5 0 0 1 10 0v4"
];
var ICON_LOCK_OPEN = [
  ICON_LOCK[0],
  "M7 11V7a5 5 0 0 1 9.9-1"
];

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
function applyTransitionPreset(current, preset, mode) {
  if (mode === "easing") {
    const duration = current.type === "easing" ? current.duration : 0.3;
    return { type: "easing", duration, ease: [...preset.ease] };
  }
  const spring = preset;
  return mode === "simple" ? { type: "spring", visualDuration: spring.visualDuration, bounce: spring.bounce } : { type: "spring", stiffness: spring.stiffness, damping: spring.damping, mass: spring.mass };
}

// src/transition-presets-control.ts
function element(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  if (el instanceof HTMLButtonElement) el.type = "button";
  return el;
}
function svgIcon(paths, className, strokeWidth = 2) {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", className);
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", String(strokeWidth));
  icon.setAttribute("stroke-linecap", "round");
  icon.setAttribute("aria-hidden", "true");
  for (const d of paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    icon.append(path);
  }
  return icon;
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
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "dialkit-transition-preset-thumb");
  icon.setAttribute("viewBox", `0 0 ${THUMB_WIDTH} ${THUMB_HEIGHT}`);
  icon.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", value.type === "easing" ? `M ${coords[0]} C ${coords.slice(1).join(", ")}` : `M ${coords.join(" L ")}`);
  icon.append(path);
  return icon;
}
function mountTransitionPresets(host, initial) {
  let props = initial;
  const saved = () => DialStore.getTransitionPresets().filter((preset) => preset.mode === props.mode);
  let tab = saved().some((preset) => sameTransition(preset.value, props.value, props.mode)) && !defaultTransitionPresets(props.mode).some((preset) => sameTransition(preset.value, props.value, props.mode)) ? "custom" : "defaults";
  let signature = "";
  let items = [];
  const root = element("div", "dialkit-transition-presets");
  const tabs = element("div", "dialkit-segmented dialkit-transition-preset-tabs");
  tabs.setAttribute("role", "radiogroup");
  tabs.setAttribute("aria-label", "Preset source");
  tabs.addEventListener("keydown", handleSegmentKey);
  const pill = element("div", "dialkit-segmented-pill");
  pill.setAttribute("aria-hidden", "true");
  tabs.append(pill);
  const tabButtons = ["defaults", "custom"].map((value) => {
    const button = element("button", "dialkit-segmented-button dialkit-transition-preset-tab", value === "defaults" ? "Defaults" : "Custom");
    button.setAttribute("role", "radio");
    button.addEventListener("click", () => {
      tab = value;
      render();
    });
    tabs.append(button);
    return button;
  });
  const list = element("div", "dialkit-transition-preset-list");
  list.setAttribute("role", "group");
  const fade = () => {
    list.toggleAttribute("data-above", list.scrollTop > 0);
    list.toggleAttribute("data-below", list.scrollTop + list.clientHeight < list.scrollHeight - 1);
  };
  list.addEventListener("scroll", fade, { passive: true });
  const resize = typeof ResizeObserver === "undefined" ? void 0 : new ResizeObserver(fade);
  resize?.observe(list);
  const empty = element("p", "dialkit-transition-preset-empty");
  const save = element("button", "dialkit-transition-preset-save");
  save.addEventListener("click", () => DialStore.saveTransitionPreset(props.value, props.mode));
  root.append(tabs, list, empty, save);
  host.append(root);
  const presetNoun = () => props.mode === "easing" ? "curve" : "spring";
  const unhintItems = () => list.querySelectorAll("[data-hint]").forEach((part) => setHint(part, void 0));
  function buildItems(options) {
    unhintItems();
    items = options.map((option) => {
      const item = element("div", "dialkit-transition-preset");
      const pick = element("button", "dialkit-transition-preset-pick");
      pick.append(thumbnail(option.value), element("span", "dialkit-transition-preset-name", option.name));
      setHint(pick, option.description ?? `Uses this ${presetNoun()}.`);
      pick.addEventListener("click", () => props.onChange(applyTransitionPreset(props.value, option.value, props.mode)));
      item.append(pick);
      if (option.id) {
        const id = option.id;
        const remove = element("button", "dialkit-transition-preset-delete");
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
    tabButtons.forEach((button, index) => {
      const active = index === 0 === (tab === "defaults");
      button.dataset.active = String(active);
      button.setAttribute("aria-checked", String(active));
      button.tabIndex = active ? 0 : -1;
      if (active) pill.style.transform = `translateX(${index * 100}%)`;
    });
    for (const item of items) {
      const active = sameTransition(item.option.value, props.value, props.mode);
      item.root.dataset.active = String(active);
      item.pick.setAttribute("aria-pressed", String(active));
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
  const stop = DialStore.subscribeTransitions(render);
  render();
  return {
    update(next) {
      props = next;
      render();
    },
    destroy() {
      stop();
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
  const root = element("div", "dialkit-copy-actions");
  const group = element("div", "dialkit-copy-group");
  const action = (label, paths, run) => {
    const button = element("button", "dialkit-copy-action");
    button.setAttribute("aria-label", label);
    button.append(svgIcon(paths, ""));
    button.addEventListener("click", () => {
      run();
      finish();
    });
    return button;
  };
  const copy = action("Copy transition", ICON_COPY, () => DialStore.copyTransition(props.value, props.mode));
  const paste = action("Paste transition", ICON_PASTE, () => {
    const copied = DialStore.getCopiedTransition();
    if (copied) props.onPaste(copied);
  });
  const dots = element("button", "dialkit-copy-button");
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
      for (const icon of [copy, paste]) icon.style.transform = open ? "" : `translateX(${toIcon.x}px) scale(${toIcon.scale})`;
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
    const icons = [copy, paste].map((icon) => {
      if (!shown) return { icon, ...COPY_ICON_HIDDEN };
      const matrix = new DOMMatrixReadOnly(getComputedStyle(icon).transform);
      return { icon, scale: matrix.a, x: matrix.e };
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
    (open ? [...icons].reverse() : icons).forEach(({ icon, scale, x }, index) => {
      motion.push(playSpring(icon, (p) => ({
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
  const stop = DialStore.subscribeTransitions(render);
  return {
    update(next) {
      props = next;
    },
    destroy() {
      stop();
      clearTimeout(doneTimer);
      for (const animation of motion) animation.cancel();
      document.removeEventListener("pointerdown", pointerOutside, true);
      [dots, copy, paste].forEach((part) => setHint(part, void 0));
      root.remove();
    }
  };
}
export {
  mountTransitionCopy,
  mountTransitionPresets
};
//# sourceMappingURL=transition-presets-control.js.map