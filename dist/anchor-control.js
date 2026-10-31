// src/control-keyboard.ts
function optionKeyIndex(key, index, count, wrap = false) {
  if (!count) return void 0;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  const delta = ["ArrowRight", "ArrowDown"].includes(key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(key) ? -1 : 0;
  if (!delta) return void 0;
  return wrap ? (index + delta + count) % count : Math.max(0, Math.min(count - 1, index + delta));
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

// src/anchor-control.ts
import { setHint } from "./hints.js";

// src/transition-math.ts
import { isEasingConfigValue, isSpringConfigValue } from "dialkit/store";
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

// src/anchor-control.ts
function element(tag, className, text) {
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
  const grid = element("div", "dialkit-anchor");
  grid.setAttribute("role", "radiogroup");
  const pill = element("span", "dialkit-anchor-pill");
  pill.setAttribute("aria-hidden", "true");
  grid.append(pill);
  const cells = ANCHOR_ROWS.flatMap((y) => ANCHOR_COLUMNS.map((x) => {
    const cell = element("button", "dialkit-anchor-cell");
    const option = { x, y };
    cell.type = "button";
    cell.setAttribute("role", "radio");
    cell.setAttribute("aria-label", anchorLabel(option));
    cell.append(element("span", "dialkit-anchor-dot"));
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
export {
  mountAnchorControl
};
//# sourceMappingURL=anchor-control.js.map