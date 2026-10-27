// src/hints.ts
import { DialStore } from "dialkit/store";
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
function hasActionHints(controls) {
  return controls.some((control) => control.type === "action" && !!control.hint || !!control.children && hasActionHints(control.children));
}
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
function radiusOf(element, variable) {
  if (typeof getComputedStyle !== "function") return 0;
  const style = getComputedStyle(element);
  return Number.parseFloat(variable ? style.getPropertyValue(variable) : style.borderTopLeftRadius) || 0;
}
function scaleOf(element) {
  const box = element.getBoundingClientRect();
  const { offsetWidth: width, offsetHeight: height } = element;
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
function setHint(row, hint) {
  if (hint) row.dataset.hint = hint;
  else delete row.dataset.hint;
  const hints = rows.get(row);
  if (hint && !hints) rows.set(row, mountHints());
  else if (!hint && hints) {
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
  const layer = document.createElement("div");
  layer.className = "dialkit-hint-layer";
  layer.append(dim, tooltip);
  const topLayer = typeof layer.showPopover === "function";
  if (topLayer) layer.setAttribute("popover", "manual");
  const raise = () => {
    if (!topLayer || !layer.isConnected) return;
    if (layer.matches(":popover-open")) layer.hidePopover();
    layer.showPopover();
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
    const active = document.activeElement;
    const target = active instanceof HTMLElement && row.contains(active) ? active : row.matches(FOCUSABLE) ? row : row.querySelector(FOCUSABLE);
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
    if (!shown.isConnected || !layer.parentElement) return hide();
    const scale = topLayer ? scaleOf(area ?? shown) : { x: 1, y: 1 };
    layer.style.transform = scale.x === 1 && scale.y === 1 ? "" : `scale(${scale.x}, ${scale.y})`;
    const origin = layer.getBoundingClientRect();
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
      if (layer.parentElement !== root) {
        tooltip.removeAttribute("data-open");
        dim.removeAttribute("data-open");
        root.append(layer);
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
    if (event.target !== layer && event.newState === "open" && layer.matches(":popover-open")) raise();
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
    layer.remove();
  };
}
export {
  HINTS,
  HintStore,
  TIMELINE_HINTS,
  getHintPosition,
  hasActionHints,
  isHintKey,
  mountHints,
  setHint,
  versionHints
};
//# sourceMappingURL=hints.js.map