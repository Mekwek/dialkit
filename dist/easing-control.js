// src/easing-control.ts
import { setHint } from "./hints.js";

// src/easing-geometry.ts
var clampY = (value) => Math.max(-1, Math.min(2, value));
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
    const finite = Number.isFinite(value) ? value : index < 2 ? 0 : 1;
    return index % 2 === 0 ? Math.max(0, Math.min(1, finite)) : finite;
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

// src/easing-control.ts
var nextId = 0;
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
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true");
  const shape = (tag, className) => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    node.setAttribute("class", className);
    svg.append(node);
    return node;
  };
  const reference = shape("line", "dialkit-easing-reference");
  const tangents = [shape("line", "dialkit-easing-tangent"), shape("line", "dialkit-easing-tangent")];
  const path = shape("path", "dialkit-easing-curve");
  const endpoints = [shape("circle", "dialkit-easing-endpoint"), shape("circle", "dialkit-easing-endpoint")];
  const help = document.createElement("span");
  help.className = "dialkit-easing-instructions";
  help.id = `dialkit-easing-help-${++nextId}`;
  help.textContent = "Drag to adjust X from 0 to 1 and Y from -1 to 2. Arrow keys adjust by 0.01. Shift adjusts by 0.1. Escape cancels a drag.";
  root.append(svg, help);
  const handles = [0, 1].map((handle) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dialkit-easing-handle";
    button.setAttribute("aria-describedby", help.id);
    button.addEventListener("pointerdown", (event) => {
      if (!props.onChange || event.button !== 0 || drag) return;
      event.preventDefault();
      event.stopPropagation();
      button.focus({ preventScroll: true });
      stopMorph();
      measure();
      const bounds = root.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      drag = { id: event.pointerId, handle, x: event.clientX, y: event.clientY, scale: fitEasingGraph(value, width, height).scale, ratioX: width / bounds.width, ratioY: height / bounds.height, value: [...value] };
      button.setPointerCapture(event.pointerId);
      button.dataset.dragging = "true";
    });
    button.addEventListener("pointermove", move);
    button.addEventListener("pointerup", (event) => {
      if (event.pointerId !== drag?.id) return;
      move(event);
      endDrag();
    });
    button.addEventListener("pointercancel", (event) => {
      if (event.pointerId === drag?.id) cancelDrag();
    });
    button.addEventListener("lostpointercapture", (event) => {
      if (event.pointerId === drag?.id) endDrag();
    });
    button.addEventListener("keydown", (event) => {
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
    root.append(button);
    return button;
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
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    line(reference, graph.start, graph.end);
    [graph.start, graph.end].forEach((point, index) => {
      line(tangents[index], point, easingGuideEnd(point, graph.handles[index]));
      endpoints[index].setAttribute("cx", String(point.x));
      endpoints[index].setAttribute("cy", String(point.y));
      endpoints[index].setAttribute("r", "2.5");
      const button = handles[index];
      button.style.left = `${graph.handles[index].x / width * 100}%`;
      button.style.top = `${graph.handles[index].y / height * 100}%`;
      button.disabled = !props.onChange;
      button.setAttribute("aria-label", `B\xE9zier handle ${index + 1}: X ${value[index * 2]}, Y ${value[index * 2 + 1]}`);
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
  const fields = EASE_FIELDS.map((field, index) => {
    const input = document.createElement("input");
    input.className = "dialkit-ease-field";
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.setAttribute("role", "spinbutton");
    input.setAttribute("aria-label", field.name);
    input.setAttribute("aria-valuemin", String(field.min));
    input.setAttribute("aria-valuemax", String(field.max));
    root.append(input);
    input.addEventListener("focus", () => input.select());
    input.addEventListener("input", () => {
      fields[index].draft = true;
    });
    const accept = () => {
      if (!fields[index].draft) return;
      fields[index].draft = false;
      const curve = parseEase(input.value);
      const number = input.value.trim() === "" ? NaN : Number(input.value);
      if (curve) commitAll(curve);
      else if (Number.isFinite(number)) commit(index, number);
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
        const current = Number.isFinite(draft) ? draft : value[index];
        fields[index].draft = false;
        commit(index, current + (event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? 0.1 : 0.01));
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
export {
  mountEaseFields,
  mountEasingVisualization
};
//# sourceMappingURL=easing-control.js.map