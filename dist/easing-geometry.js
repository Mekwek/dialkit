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
export {
  createEaseIntensity,
  easingGuideEnd,
  easingHandleFromKey,
  easingPresets,
  fitEasingGraph,
  moveEasingHandle,
  normalizeEase,
  parseEase,
  scaleEase
};
//# sourceMappingURL=easing-geometry.js.map