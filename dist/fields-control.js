// src/control-keyboard.ts
function sliderKeyValue(key, value, min, max, step, shift = false) {
  if (key === "Home") return min;
  if (key === "End") return max;
  const direction = ["ArrowRight", "ArrowUp", "PageUp"].includes(key) ? 1 : ["ArrowLeft", "ArrowDown", "PageDown"].includes(key) ? -1 : 0;
  if (!direction) return void 0;
  if (!(step > 0) || max <= min) return min;
  const amount = key.startsWith("Page") || shift ? 10 : 1;
  const position = (value - min) / step;
  const nextStep = direction > 0 ? Math.floor(position + 1e-9) + amount : Math.ceil(position - 1e-9) - amount;
  const next = min + nextStep * step;
  return Math.max(min, Math.min(max, Number(next.toPrecision(14))));
}

// src/icons.ts
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
var ICON_RESET = ["M4.5 12a7.5 7.5 0 1 0 2.2-5.3", "M4.5 4.5v3.75h3.75"];
var ICON_LINK = [
  "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1",
  "M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"
];

// src/numeric.ts
function decimalsForStep(step, min = 0, max = 0) {
  return Math.min(100, Math.max(...[step, min, max].map((value) => {
    const [coefficient, exponent = "0"] = String(value).toLowerCase().split("e");
    return Math.max(0, (coefficient.split(".")[1]?.length ?? 0) - Number(exponent));
  })));
}
function roundValue(value, step, min, max) {
  const lower = min ?? -Infinity;
  const upper = max ?? Infinity;
  const clamped = Math.max(lower, Math.min(upper, value));
  if (clamped === lower || clamped === upper || !Number.isFinite(step) || step <= 0) return clamped;
  const origin = min ?? 0;
  const snapped = origin + Math.round((clamped - origin) / step) * step;
  return Math.max(lower, Math.min(upper, Number(snapped.toPrecision(14))));
}

// src/fields-control.ts
import { setHint } from "./hints.js";
function scaleFields(ranges, values, index, next) {
  const base = values.map((value, i) => Math.max(ranges[i].min, Math.min(ranges[i].max, value)));
  const from = base[index];
  const ratio = from !== 0;
  let low = -Infinity;
  let high = Infinity;
  ranges.forEach(({ min, max }, i) => {
    const value = base[i];
    if (!ratio) {
      low = Math.max(low, min - value);
      high = Math.min(high, max - value);
    } else if (value !== 0) {
      low = Math.max(low, Math.min(min / value, max / value));
      high = Math.min(high, Math.max(min / value, max / value));
    }
  });
  const amount = Math.max(low, Math.min(high, ratio ? next / from : next - from));
  return base.map((value, i) => {
    const { min, max, step } = ranges[i];
    return roundValue(ratio ? value * amount : value + amount, step, min, max);
  });
}
function createFieldLock() {
  let anchor;
  return {
    /** Every field's value after moving field `index` to `next`. */
    change(ranges, current, index, next) {
      if (!anchor || anchor.index !== index || anchor.written.some((value, i) => value !== current[i])) {
        anchor = { index, base: current, written: current };
      }
      anchor.written = scaleFields(ranges, anchor.base, index, next);
      return anchor.written;
    },
    /**
     * Ends a scrub or a committed edit. A field that started at 0 moved the
     * others by an amount, not a ratio, so its next edit starts again from
     * the values it reached.
     */
    settle() {
      if (anchor && anchor.base[anchor.index] === 0) anchor = void 0;
    },
    reset() {
      anchor = void 0;
    }
  };
}
function resetFields(controls, values, defaults) {
  const updates = {};
  for (const { path } of controls) {
    if (path in defaults && values[path] !== defaults[path]) updates[path] = defaults[path];
  }
  return updates;
}
function element(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  if (tag === "button") el.type = "button";
  return el;
}
function strokeIcon(paths) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  for (const d of paths) {
    const path = document.createElementNS(svg.namespaceURI, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}
function rangeOf(control) {
  return { min: control.min ?? 0, max: control.max ?? 1, step: control.step ?? 0.01 };
}
function mountFields(host, initial) {
  let props = initial;
  let values = props.values;
  let signature = "";
  const fieldLock = createFieldLock();
  let scrub;
  let fields = [];
  const root = element("div", "dialkit-fields");
  root.setAttribute("role", "group");
  const caption = element("div", "dialkit-fields-caption");
  const label = element("span", "dialkit-fields-label");
  const reset = element("button", "dialkit-fields-reset");
  reset.append(strokeIcon(ICON_RESET));
  const lock = element("button", "dialkit-fields-lock");
  lock.append(strokeIcon(ICON_LINK));
  caption.append(label, reset);
  const row = element("div", "dialkit-fields-row");
  root.append(caption, row);
  host.append(root);
  const axes = () => props.controls.filter((control) => control.type === "slider");
  const lockControl = () => props.controls.find((control) => control.type === "toggle");
  const locked = () => {
    const control = lockControl();
    return control ? values[control.path] === true : false;
  };
  const read = (control) => {
    const value = values[control.path];
    return typeof value === "number" ? value : rangeOf(control).min;
  };
  const format = (control) => {
    const { min, max, step } = rangeOf(control);
    return read(control).toFixed(decimalsForStep(step, min, max));
  };
  function emit(updates) {
    if (Object.keys(updates).length === 0) return;
    values = { ...values, ...updates };
    render();
    props.onChange(updates);
  }
  function change(index, next) {
    const controls = axes();
    const ranges = controls.map(rangeOf);
    const current = controls.map(read);
    let result;
    if (locked()) {
      result = fieldLock.change(ranges, current, index, next);
    } else {
      const { min, max, step } = ranges[index];
      result = current.map((value, i) => i === index ? roundValue(next, step, min, max) : value);
    }
    const updates = {};
    controls.forEach((control, i) => {
      if (result[i] !== current[i]) updates[control.path] = result[i];
    });
    emit(updates);
    return result[index];
  }
  function commit(index, next) {
    change(index, next);
    fieldLock.settle();
  }
  function endScrub() {
    const id = scrub?.id;
    if (scrub?.moved) fieldLock.settle();
    scrub = void 0;
    fields.forEach(({ field, axis }) => {
      delete field.dataset.scrubbing;
      if (id !== void 0 && axis.hasPointerCapture(id)) axis.releasePointerCapture(id);
    });
  }
  function createField(index) {
    const field = element("div", "dialkit-fields-field");
    const axis = element("span", "dialkit-fields-axis");
    axis.setAttribute("aria-hidden", "true");
    const value = element("button", "dialkit-fields-value");
    field.append(axis, value);
    const state = { field, axis, value };
    const control = () => axes()[index];
    let scrubbed = false;
    const finish = (apply) => {
      const input = state.input;
      if (!input) return;
      state.input = void 0;
      const text = input.value.trim();
      const number = text === "" ? NaN : Number(text);
      if (apply && text !== format(control()) && Number.isFinite(number)) commit(index, number);
      input.replaceWith(value);
      render();
    };
    value.addEventListener("click", () => {
      if (state.input) return;
      const input = element("input", "dialkit-fields-input");
      input.type = "text";
      input.inputMode = "decimal";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.setAttribute("aria-label", `${props.label} ${control().label}`);
      input.value = input.defaultValue = format(control());
      input.addEventListener("blur", () => finish(true));
      input.addEventListener("keydown", (event) => {
        event.stopPropagation();
        if (event.key === "Enter" || event.key === "Escape") {
          event.preventDefault();
          finish(event.key === "Enter");
          return;
        }
        if (event.altKey || event.metaKey || event.ctrlKey || !["ArrowUp", "ArrowDown", "PageUp", "PageDown"].includes(event.key)) return;
        event.preventDefault();
        const { min, max, step } = rangeOf(control());
        const draft = input.value.trim() === "" ? NaN : Number(input.value);
        const next = sliderKeyValue(event.key, Number.isFinite(draft) ? draft : read(control()), min, max, step, event.shiftKey);
        if (next !== void 0) commit(index, next);
        input.value = input.defaultValue = format(control());
        input.select();
      });
      state.input = input;
      value.replaceWith(input);
      input.focus();
      input.select();
    });
    axis.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || scrub) return;
      event.preventDefault();
      const active = document.activeElement;
      if (active instanceof HTMLElement && root.contains(active)) active.blur();
      const current = read(control());
      scrub = { id: event.pointerId, index, x: event.clientX, value: current, applied: current, moved: false };
      scrubbed = false;
      axis.setPointerCapture(event.pointerId);
    });
    axis.addEventListener("pointermove", (event) => {
      if (!scrub || event.pointerId !== scrub.id) return;
      const dx = event.clientX - scrub.x;
      if (!scrub.moved && Math.abs(dx) < 3) return;
      scrub.moved = true;
      scrubbed = true;
      field.dataset.scrubbing = "true";
      scrub.x = event.clientX;
      const { min, max, step } = rangeOf(control());
      const target = Math.max(min, Math.min(max, scrub.value + dx * step * (event.shiftKey ? 10 : 1)));
      scrub.applied = change(index, target);
      scrub.value = Math.abs(scrub.applied - target) > step / 2 ? scrub.applied : target;
    });
    axis.addEventListener("pointerup", (event) => {
      if (event.pointerId === scrub?.id) endScrub();
    });
    axis.addEventListener("pointercancel", (event) => {
      if (event.pointerId === scrub?.id) endScrub();
    });
    axis.addEventListener("lostpointercapture", (event) => {
      if (event.pointerId === scrub?.id) endScrub();
    });
    axis.addEventListener("click", (event) => {
      if (scrubbed) event.preventDefault();
      scrubbed = false;
    });
    row.append(field);
    return state;
  }
  reset.addEventListener("click", () => {
    fieldLock.reset();
    emit(resetFields(props.controls, values, props.defaults));
  });
  lock.addEventListener("click", () => {
    const control = lockControl();
    if (!control) return;
    fieldLock.reset();
    emit({ [control.path]: !locked() });
  });
  function build() {
    const next = axes().map((control) => control.path).join("\n");
    if (next === signature) return;
    signature = next;
    endScrub();
    fieldLock.reset();
    fields.forEach(({ field }) => {
      setHint(field, void 0);
      field.remove();
    });
    fields = axes().map((_, index) => createField(index));
  }
  function render() {
    root.setAttribute("aria-label", props.label);
    setHint(root, props.hint);
    label.textContent = props.label;
    reset.setAttribute("aria-label", `Reset ${props.label}`);
    if (Object.keys(resetFields(props.controls, values, props.defaults)).length > 0) {
      reset.dataset.changed = "true";
    } else {
      if (document.activeElement === reset) fields[0]?.value.focus();
      delete reset.dataset.changed;
    }
    const lockMeta = lockControl();
    if (lockMeta) {
      if (lock.parentNode !== caption) caption.append(lock);
      lock.setAttribute("aria-label", `${lockMeta.label} ${props.label}`);
      lock.setAttribute("aria-pressed", String(locked()));
    } else {
      lock.remove();
    }
    axes().forEach((control, index) => {
      const { field, axis, value, input } = fields[index];
      const text = format(control);
      axis.textContent = control.label;
      setHint(field, control.hint);
      value.textContent = text;
      value.setAttribute("aria-label", `${props.label} ${control.label}: ${text}`);
      if (input && input.value === input.defaultValue && input.value !== text) {
        input.value = input.defaultValue = text;
        if (document.activeElement === input) input.select();
      }
    });
  }
  build();
  render();
  return {
    update(next) {
      props = next;
      values = next.values;
      build();
      const scrubbed = scrub && axes()[scrub.index];
      if (scrub && scrubbed && read(scrubbed) !== scrub.applied) {
        scrub.value = scrub.applied = read(scrubbed);
      }
      render();
    },
    destroy() {
      endScrub();
      fields.forEach(({ field }) => setHint(field, void 0));
      setHint(root, void 0);
      root.remove();
    }
  };
}
export {
  createFieldLock,
  mountFields,
  resetFields,
  scaleFields
};
//# sourceMappingURL=fields-control.js.map