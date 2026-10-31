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
    const rows = () => Array.from(popup.querySelectorAll(ROW));
    const move = (id, to) => {
      const ids = rows().map((row) => row.dataset.presetId).filter((other) => other !== id);
      ids.splice(to, 0, id);
      reorder(ids);
    };
    const reset = () => {
      delete popup.dataset.dragging;
      for (const row of rows()) {
        row.style.transform = "";
        delete row.dataset.dragging;
      }
    };
    const layout = ({ from, to, offset, step }) => rows().forEach((row, index) => {
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
    const lift = (current) => {
      const [first, second] = rows().map((row) => row.getBoundingClientRect().top);
      if (second === void 0) {
        stopDrag();
        return;
      }
      current.lifted = true;
      current.scale = popup.offsetHeight ? popup.getBoundingClientRect().height / popup.offsetHeight || 1 : 1;
      current.step = (second - first) / current.scale;
      popup.dataset.dragging = "true";
      current.row.dataset.dragging = "true";
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
      const last = rows().length - 1;
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
      const current = { row, id: row.dataset.presetId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, from: rows().indexOf(row), to: 0, offset: 0, step: 0, scale: 1, lifted: false, hold: 0 };
      if (event.pointerType === "touch") current.hold = window.setTimeout(() => {
        if (drag === current) lift(current);
      }, LONG_PRESS_MS);
      drag = current;
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
      const list = rows();
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
export {
  observePresetMenu,
  versionNamePrefix
};
//# sourceMappingURL=preset-menu.js.map