// src/pointer-focus.ts
var MODIFIERS = /* @__PURE__ */ new Set(["Alt", "Control", "Meta", "Shift"]);
var observers = 0;
var fromPointer = false;
var unobserve;
function fitSliderInput(target) {
  const input = target;
  if (input?.classList?.contains("dialkit-slider-input")) input.style.width = `${Math.max(input.value.length, 1)}ch`;
}
function observePointerFocus() {
  if (typeof document === "undefined") return () => {
  };
  if (observers++ === 0) {
    const pointerDown = () => {
      fromPointer = true;
    };
    const keyDown = (event) => {
      if (!MODIFIERS.has(event.key)) fromPointer = false;
    };
    const focusIn = (event) => {
      const target = event.target;
      if (fromPointer && target.closest?.(".dialkit-root")) target.setAttribute("data-pointer-focus", "");
      fitSliderInput(target);
    };
    const input = (event) => fitSliderInput(event.target);
    const click = (event) => {
      const header = event.target.closest?.(".dialkit-root .dialkit-folder-header-top");
      if (event.detail > 0 && header && header === document.activeElement) header.blur();
    };
    const focusOut = (event) => {
      const target = event.target;
      if (target !== document.activeElement) target.removeAttribute?.("data-pointer-focus");
    };
    document.addEventListener("pointerdown", pointerDown, true);
    document.addEventListener("keydown", keyDown, true);
    document.addEventListener("focusin", focusIn, true);
    document.addEventListener("focusout", focusOut, true);
    document.addEventListener("input", input, true);
    document.addEventListener("click", click, true);
    unobserve = () => {
      document.removeEventListener("pointerdown", pointerDown, true);
      document.removeEventListener("keydown", keyDown, true);
      document.removeEventListener("focusin", focusIn, true);
      document.removeEventListener("focusout", focusOut, true);
      document.removeEventListener("input", input, true);
      document.removeEventListener("click", click, true);
      fromPointer = false;
    };
  }
  let observing = true;
  return () => {
    if (!observing) return;
    observing = false;
    if (--observers === 0) {
      unobserve?.();
      unobserve = void 0;
    }
  };
}
export {
  observePointerFocus
};
//# sourceMappingURL=pointer-focus.js.map