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

// src/icons.ts
var ICON_CHEVRON = "M6 9.5L12 15.5L18 9.5";
var ICON_CLIPBOARD = {
  board: "M8 6C8 4.34315 9.34315 3 11 3H13C14.6569 3 16 4.34315 16 6V7H8V6Z",
  sparkle: "M19.2405 16.1852L18.5436 14.3733C18.4571 14.1484 18.241 14 18 14C17.759 14 17.5429 14.1484 17.4564 14.3733L16.7595 16.1852C16.658 16.4493 16.4493 16.658 16.1852 16.7595L14.3733 17.4564C14.1484 17.5429 14 17.759 14 18C14 18.241 14.1484 18.4571 14.3733 18.5436L16.1852 19.2405C16.4493 19.342 16.658 19.5507 16.7595 19.8148L17.4564 21.6267C17.5429 21.8516 17.759 22 18 22C18.241 22 18.4571 21.8516 18.5436 21.6267L19.2405 19.8148C19.342 19.5507 19.5507 19.342 19.8148 19.2405L21.6267 18.5436C21.8516 18.4571 22 18.241 22 18C22 17.759 21.8516 17.5429 21.6267 17.4564L19.8148 16.7595C19.5507 16.658 19.342 16.4493 19.2405 16.1852Z",
  body: "M16 5H17C18.6569 5 20 6.34315 20 8V11M8 5H7C5.34315 5 4 6.34315 4 8V18C4 19.6569 5.34315 21 7 21H12"
};
var ICON_CLIPBOARD_PLAIN = {
  board: ICON_CLIPBOARD.board,
  body: "M16 5H17C18.6569 5 20 6.34315 20 8V18C20 19.6569 18.6569 21 17 21H7C5.34315 21 4 19.6569 4 18V8C4 6.34315 5.34315 5 7 5H8"
};
var ICON_LOCK = [
  "M6 11H18C18.5523 11 19 11.4477 19 12V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V12C5 11.4477 5.44772 11 6 11Z",
  "M7 11V7a5 5 0 0 1 10 0v4"
];
var ICON_LOCK_OPEN = [
  ICON_LOCK[0],
  "M7 11V7a5 5 0 0 1 9.9-1"
];

// src/pictures.ts
function findPictureFamily(families, id) {
  if (id === null) return null;
  return families.find((family) => family.items.some((item) => item.id === id))?.id ?? null;
}
function familyAfterSelection(families, open, before, after) {
  if (after === before) return open;
  return findPictureFamily(families, after) ?? open;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var nonEmpty = (value) => typeof value === "string" && value !== "";
function normalizePictureFamilies(value) {
  if (!Array.isArray(value)) return [];
  const familyIds = /* @__PURE__ */ new Set();
  const itemIds = /* @__PURE__ */ new Set();
  const families = [];
  for (const raw of value) {
    if (!isRecord(raw) || !nonEmpty(raw.id) || typeof raw.label !== "string" || familyIds.has(raw.id)) continue;
    familyIds.add(raw.id);
    const items = [];
    for (const rawItem of Array.isArray(raw.items) ? raw.items : []) {
      if (!isRecord(rawItem) || !nonEmpty(rawItem.id) || typeof rawItem.label !== "string" || itemIds.has(rawItem.id)) continue;
      itemIds.add(rawItem.id);
      const item = { id: rawItem.id, label: rawItem.label };
      if (nonEmpty(rawItem.hint)) item.hint = rawItem.hint;
      items.push(item);
    }
    const family = { id: raw.id, label: raw.label, items };
    if (nonEmpty(raw.hint)) family.hint = raw.hint;
    families.push(family);
  }
  return families;
}
function normalizePicturesValue(value) {
  return nonEmpty(value) ? value : null;
}

// src/store/PictureHost.ts
var STATE_KEY = /* @__PURE__ */ Symbol.for("dialkit.pictureHost");
function state() {
  const scope = globalThis;
  let current = scope[STATE_KEY];
  if (!current) {
    current = { host: {}, listeners: /* @__PURE__ */ new Set() };
    scope[STATE_KEY] = current;
  }
  return current;
}
function getPictureHost() {
  return state().host;
}
function subscribePictureHost(listener) {
  const listeners = state().listeners;
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// src/picture-list-control.ts
import { setHint } from "./hints.js";

// src/vanilla/dom.ts
function element(tag, className = "", text) {
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

// src/picture-list-control.ts
var instances = 0;
var chevronAngle = (open) => open ? 0 : -90;
function place(parent, node, previous) {
  const next = previous ? previous.nextElementSibling : parent.firstElementChild;
  if (next === node) return;
  if (previous) previous.after(node);
  else parent.prepend(node);
}
function mountPictureListControl(host, initial) {
  let props = initial;
  let families = normalizePictureFamilies(props.families);
  let value = normalizePicturesValue(props.value);
  let open = findPictureFamily(families, value);
  let destroyed = false;
  const uid = `dialkit-pictures-${++instances}`;
  let bodies = 0;
  const root = element("div", "dialkit-pictures");
  root.setAttribute("role", "group");
  host.append(root);
  const familyById = /* @__PURE__ */ new Map();
  const eachTile = (fn) => familyById.forEach((entry) => entry.tiles.forEach(fn));
  const attach = (tile) => {
    if (tile.attached) return;
    tile.attached = true;
    const hostAttach = getPictureHost().attach;
    if (!hostAttach) return;
    try {
      const cleanup = hostAttach(tile.id, { picture: tile.picture, tile: tile.root });
      if (typeof cleanup === "function") tile.cleanup = cleanup;
    } catch (error) {
      console.error(error);
    }
  };
  const detach = (tile) => {
    const cleanup = tile.cleanup;
    tile.cleanup = void 0;
    tile.attached = false;
    if (!cleanup) return;
    try {
      cleanup();
    } catch (error) {
      console.error(error);
    }
  };
  let attachQueued = false;
  const queueAttach = () => {
    if (attachQueued) return;
    attachQueued = true;
    queueMicrotask(() => {
      attachQueued = false;
      if (!destroyed) eachTile(attach);
    });
  };
  const unsubscribeHost = subscribePictureHost(() => {
    eachTile(detach);
    eachTile(attach);
  });
  const removeTile = (entry, tile) => {
    detach(tile);
    setHint(tile.root, void 0);
    tile.root.remove();
    entry.tiles.delete(tile.id);
  };
  const buildTile = (id) => {
    const tileRoot = element("button", "dialkit-pictures-tile");
    const picture = element("div", "dialkit-pictures-picture");
    const label = element("span", "dialkit-pictures-label");
    tileRoot.append(picture, label);
    tileRoot.addEventListener("click", () => props.onPick(id));
    return { id, root: tileRoot, picture, label, attached: false };
  };
  const paintTile = (tile, item) => {
    const selected = value === item.id;
    tile.label.textContent = item.label;
    tile.root.setAttribute("aria-label", item.label);
    tile.root.setAttribute("aria-pressed", String(selected));
    tile.root.toggleAttribute("data-active", selected);
    setHint(tile.root, item.hint);
  };
  const buildFamily = (id) => {
    const familyRoot = element("div", "dialkit-pictures-family");
    const row = element("button", "dialkit-pictures-row");
    const name = element("span", "dialkit-pictures-name");
    const count = element("span", "dialkit-pictures-count");
    count.setAttribute("aria-hidden", "true");
    const chevron = icon(ICON_CHEVRON, "dialkit-pictures-chevron");
    row.append(name, count, chevron);
    const body = element("div", "dialkit-pictures-body");
    const inner = element("div", "dialkit-pictures-inner");
    const grid = element("div", "dialkit-pictures-grid");
    inner.append(grid);
    body.append(inner);
    body.id = `${uid}-${++bodies}`;
    body.hidden = true;
    row.setAttribute("aria-controls", body.id);
    familyRoot.append(row, body);
    row.addEventListener("click", () => {
      open = open === id ? null : id;
      render();
    });
    return { root: familyRoot, row, name, count, chevron, body, inner, grid, tiles: /* @__PURE__ */ new Map() };
  };
  const renderBody = (entry, family) => {
    const items = family.items;
    const shown = new Set(items.map((item) => item.id));
    for (const tile of [...entry.tiles.values()]) if (!shown.has(tile.id)) removeTile(entry, tile);
    let newTiles = false;
    let previousTile = null;
    for (const item of items) {
      let tile = entry.tiles.get(item.id);
      if (!tile) {
        tile = buildTile(item.id);
        entry.tiles.set(item.id, tile);
        newTiles = true;
      }
      paintTile(tile, item);
      place(entry.grid, tile.root, previousTile);
      previousTile = tile.root;
    }
    if (newTiles) queueAttach();
  };
  const clearBody = (entry) => {
    for (const tile of [...entry.tiles.values()]) removeTile(entry, tile);
  };
  const setBodyOpen = (entry, spring) => {
    const isOpen = entry.shown === true;
    const animate = spring && root.getBoundingClientRect().width > 0;
    const from = entry.body.hidden ? 0 : entry.body.getBoundingClientRect().height;
    entry.animation?.cancel();
    entry.animation = void 0;
    entry.body.hidden = false;
    entry.body.inert = !isOpen;
    const to = isOpen ? entry.body.scrollHeight : 0;
    const finish = () => {
      if (isOpen || entry.shown) return;
      entry.body.hidden = true;
      entry.body.inert = false;
      clearBody(entry);
    };
    entry.animation = animate ? animateSpring(entry.body, (p) => ({ height: `${from + (to - from) * p}px`, overflow: "hidden" })) : void 0;
    if (entry.animation) entry.animation.onfinish = finish;
    else finish();
    entry.chevronAnimation?.cancel();
    entry.chevron.style.transform = `rotate(${chevronAngle(isOpen)}deg)`;
    if (animate) {
      const start = chevronAngle(!isOpen);
      const end = chevronAngle(isOpen);
      entry.chevronAnimation = animateSpring(entry.chevron, (p) => ({ transform: `rotate(${start + (end - start) * p}deg)` }), 0.35, 0.15);
    }
  };
  function render() {
    root.setAttribute("aria-label", props.label);
    setHint(root, props.hint);
    if (open !== null && !families.some((family) => family.id === open)) open = null;
    const live = new Set(families.map((family) => family.id));
    for (const [id, entry] of familyById) {
      if (live.has(id)) continue;
      entry.animation?.cancel();
      clearBody(entry);
      setHint(entry.row, void 0);
      entry.root.remove();
      familyById.delete(id);
    }
    let previous = null;
    for (const family of families) {
      let entry = familyById.get(family.id);
      if (!entry) {
        entry = buildFamily(family.id);
        familyById.set(family.id, entry);
      }
      const isOpen = open === family.id;
      const count = family.items.length;
      entry.name.textContent = family.label;
      entry.count.textContent = String(count);
      entry.row.setAttribute("aria-label", `${family.label}, ${count} ${count === 1 ? "preset" : "presets"}`);
      entry.row.setAttribute("aria-expanded", String(isOpen));
      entry.root.toggleAttribute("data-open", isOpen);
      setHint(entry.row, family.hint);
      place(root, entry.root, previous);
      previous = entry.root;
      if (isOpen || entry.tiles.size > 0) renderBody(entry, family);
      if (entry.shown !== isOpen) {
        const first = entry.shown === void 0;
        entry.shown = isOpen;
        setBodyOpen(entry, !first);
      }
    }
  }
  render();
  return {
    update(next) {
      props = next;
      families = normalizePictureFamilies(next.families);
      const before = value;
      value = normalizePicturesValue(next.value);
      open = familyAfterSelection(families, open, before, value);
      render();
    },
    destroy() {
      destroyed = true;
      unsubscribeHost();
      familyById.forEach((entry) => {
        entry.animation?.cancel();
        entry.chevronAnimation?.cancel();
        clearBody(entry);
        setHint(entry.row, void 0);
      });
      setHint(root, void 0);
      root.remove();
    }
  };
}
export {
  mountPictureListControl
};
//# sourceMappingURL=picture-list-control.js.map