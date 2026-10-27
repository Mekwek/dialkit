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
export {
  ANCHOR_COLUMNS,
  ANCHOR_ROWS,
  anchorLabel,
  anchorValueFromKey,
  normalizeAnchorValue
};
//# sourceMappingURL=anchor.js.map