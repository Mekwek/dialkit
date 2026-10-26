import { sliderKeyValue } from './control-keyboard';
import { ICON_LINK, ICON_RESET } from './icons';
import { decimalsForStep, roundValue } from './numeric';
import { setHint } from './hints';
import type { ControlMeta, DialValue } from './store/DialStore';

export type FieldsProps = {
  label: string;
  /** A `_fields` folder's children: two to four sliders and an optional toggle, the lock. */
  controls: ControlMeta[];
  values: Record<string, DialValue>;
  /** The panel's default values, which the row's reset puts back. */
  defaults: Record<string, DialValue>;
  /** Receives every path that changed, so a locked edit is saved as one update. */
  onChange: (values: Record<string, DialValue>) => void;
  /** A short sentence shown while H is held over the row. */
  hint?: string;
};

type FieldRange = { min: number; max: number; step: number };

/**
 * Locked fields scale together: moving field `index` from `base[index]` to
 * `next` multiplies every field by the same ratio, so their proportions hold.
 * A field at 0 has no ratio, so the others move by the same amount instead.
 * Either way the change stops where the first field reaches its min or max.
 */
export function scaleFields(ranges: FieldRange[], values: number[], index: number, next: number): number[] {
  // Values written from code may sit outside their range.
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

/**
 * The lock's memory of where an edit started. Repeated edits of one field
 * scale from the same start values, so a long scrub or many steps keep the
 * exact proportions instead of compounding each step's rounding. Editing
 * another field, or any change made elsewhere, starts again from the
 * current values.
 */
export function createFieldLock() {
  let anchor: { index: number; base: number[]; written: number[] } | undefined;
  return {
    /** Every field's value after moving field `index` to `next`. */
    change(ranges: FieldRange[], current: number[], index: number, next: number): number[] {
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
      if (anchor && anchor.base[anchor.index] === 0) anchor = undefined;
    },
    reset() {
      anchor = undefined;
    },
  };
}

/** The updates that put every value in the row back to its default; empty when none changed. */
export function resetFields(controls: ControlMeta[], values: Record<string, DialValue>, defaults: Record<string, DialValue>) {
  const updates: Record<string, DialValue> = {};
  for (const { path } of controls) {
    if (path in defaults && values[path] !== defaults[path]) updates[path] = defaults[path];
  }
  return updates;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  if (tag === 'button') (el as HTMLButtonElement).type = 'button';
  return el;
}

function strokeIcon(paths: string[]) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of paths) {
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

function rangeOf(control: ControlMeta): FieldRange {
  return { min: control.min ?? 0, max: control.max ?? 1, step: control.step ?? 0.01 };
}

/**
 * One row of number fields shared by all five adapters. Drag a field's label to
 * scrub its value. Each value is a button; clicking it, or Enter or Space,
 * opens an input to type in, where Up/Down step it.
 */
export function mountFields(host: HTMLElement, initial: FieldsProps) {
  let props = initial;
  let values = props.values;
  let signature = '';
  const fieldLock = createFieldLock();
  let scrub: { id: number; index: number; x: number; value: number; applied: number; moved: boolean } | undefined;
  let fields: {
    field: HTMLDivElement;
    axis: HTMLSpanElement;
    /** The value at rest: a button that opens the input. */
    value: HTMLButtonElement;
    /** The input while the value is typed in. */
    input?: HTMLInputElement;
  }[] = [];

  const root = element('div', 'dialkit-fields');
  root.setAttribute('role', 'group');
  const caption = element('div', 'dialkit-fields-caption');
  const label = element('span', 'dialkit-fields-label');
  const reset = element('button', 'dialkit-fields-reset');
  reset.append(strokeIcon(ICON_RESET));
  const lock = element('button', 'dialkit-fields-lock');
  lock.append(strokeIcon(ICON_LINK));
  caption.append(label, reset);
  const row = element('div', 'dialkit-fields-row');
  root.append(caption, row);
  host.append(root);

  const axes = () => props.controls.filter(control => control.type === 'slider');
  const lockControl = () => props.controls.find(control => control.type === 'toggle');
  const locked = () => {
    const control = lockControl();
    return control ? values[control.path] === true : false;
  };
  const read = (control: ControlMeta) => {
    const value = values[control.path];
    return typeof value === 'number' ? value : rangeOf(control).min;
  };
  const format = (control: ControlMeta) => {
    const { min, max, step } = rangeOf(control);
    return read(control).toFixed(decimalsForStep(step, min, max));
  };

  function emit(updates: Record<string, DialValue>) {
    if (Object.keys(updates).length === 0) return;
    values = { ...values, ...updates };
    render();
    props.onChange(updates);
  }

  /** Moves field `index` toward `next` and returns the value it reached. */
  function change(index: number, next: number): number {
    const controls = axes();
    const ranges = controls.map(rangeOf);
    const current = controls.map(read);
    let result: number[];
    if (locked()) {
      result = fieldLock.change(ranges, current, index, next);
    } else {
      const { min, max, step } = ranges[index];
      result = current.map((value, i) => (i === index ? roundValue(next, step, min, max) : value));
    }
    const updates: Record<string, DialValue> = {};
    controls.forEach((control, i) => {
      if (result[i] !== current[i]) updates[control.path] = result[i];
    });
    emit(updates);
    return result[index];
  }

  /** A typed value or a key step: one complete edit. */
  function commit(index: number, next: number) {
    change(index, next);
    fieldLock.settle();
  }

  function endScrub() {
    const id = scrub?.id;
    if (scrub?.moved) fieldLock.settle();
    scrub = undefined;
    fields.forEach(({ field, axis }) => {
      delete field.dataset.scrubbing;
      if (id !== undefined && axis.hasPointerCapture(id)) axis.releasePointerCapture(id);
    });
  }

  function createField(index: number) {
    const field = element('div', 'dialkit-fields-field');
    const axis = element('span', 'dialkit-fields-axis');
    axis.setAttribute('aria-hidden', 'true');
    const value = element('button', 'dialkit-fields-value');
    field.append(axis, value);
    const state: (typeof fields)[number] = { field, axis, value };
    const control = () => axes()[index];
    let scrubbed = false;

    /** Ends typing: applies the text unless cancelled, and shows the value again. */
    const finish = (apply: boolean) => {
      const input = state.input;
      if (!input) return;
      state.input = undefined;
      const text = input.value.trim();
      const number = text === '' ? NaN : Number(text);
      if (apply && text !== format(control()) && Number.isFinite(number)) commit(index, number);
      input.replaceWith(value);
      render();
    };

    // A click, Enter or Space opens an input with the value selected for typing.
    value.addEventListener('click', () => {
      if (state.input) return;
      const input = element('input', 'dialkit-fields-input');
      input.type = 'text';
      input.inputMode = 'decimal';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('aria-label', `${props.label} ${control().label}`);
      input.value = input.defaultValue = format(control());
      input.addEventListener('blur', () => finish(true));
      input.addEventListener('keydown', event => {
        event.stopPropagation();
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.preventDefault();
          finish(event.key === 'Enter');
          return;
        }
        if (event.altKey || event.metaKey || event.ctrlKey || !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(event.key)) return;
        event.preventDefault();
        const { min, max, step } = rangeOf(control());
        const draft = input.value.trim() === '' ? NaN : Number(input.value);
        const next = sliderKeyValue(event.key, Number.isFinite(draft) ? draft : read(control()), min, max, step, event.shiftKey);
        if (next !== undefined) commit(index, next);
        input.value = input.defaultValue = format(control());
        input.select();
      });
      state.input = input;
      value.replaceWith(input);
      input.focus();
      input.select();
    });

    axis.addEventListener('pointerdown', event => {
      if (event.button !== 0 || scrub) return;
      // Keep focus and text selection where they are while scrubbing, but
      // commit a value typed in this row first so it cannot land later.
      event.preventDefault();
      const active = document.activeElement;
      if (active instanceof HTMLElement && root.contains(active)) active.blur();
      const current = read(control());
      scrub = { id: event.pointerId, index, x: event.clientX, value: current, applied: current, moved: false };
      scrubbed = false;
      axis.setPointerCapture(event.pointerId);
    });
    axis.addEventListener('pointermove', event => {
      if (!scrub || event.pointerId !== scrub.id) return;
      const dx = event.clientX - scrub.x;
      if (!scrub.moved && Math.abs(dx) < 3) return;
      scrub.moved = true;
      scrubbed = true;
      field.dataset.scrubbing = 'true';
      scrub.x = event.clientX;
      // One step per pixel; Shift moves ten steps, like the arrow keys.
      const { min, max, step } = rangeOf(control());
      const target = Math.max(min, Math.min(max, scrub.value + dx * step * (event.shiftKey ? 10 : 1)));
      scrub.applied = change(index, target);
      // Keep sub-step movement, but continue from the value applied when a
      // lock held it at another field's bound.
      scrub.value = Math.abs(scrub.applied - target) > step / 2 ? scrub.applied : target;
    });
    axis.addEventListener('pointerup', event => { if (event.pointerId === scrub?.id) endScrub(); });
    axis.addEventListener('pointercancel', event => { if (event.pointerId === scrub?.id) endScrub(); });
    axis.addEventListener('lostpointercapture', event => { if (event.pointerId === scrub?.id) endScrub(); });
    axis.addEventListener('click', event => {
      if (scrubbed) event.preventDefault();
      scrubbed = false;
    });

    row.append(field);
    return state;
  }

  reset.addEventListener('click', () => {
    fieldLock.reset();
    emit(resetFields(props.controls, values, props.defaults));
  });

  lock.addEventListener('click', () => {
    const control = lockControl();
    if (!control) return;
    fieldLock.reset();
    emit({ [control.path]: !locked() });
  });

  function build() {
    const next = axes().map(control => control.path).join('\n');
    if (next === signature) return;
    signature = next;
    endScrub();
    fieldLock.reset();
    fields.forEach(({ field }) => {
      setHint(field, undefined);
      field.remove();
    });
    fields = axes().map((_, index) => createField(index));
  }

  function render() {
    root.setAttribute('aria-label', props.label);
    setHint(root, props.hint);
    label.textContent = props.label;
    reset.setAttribute('aria-label', `Reset ${props.label}`);
    if (Object.keys(resetFields(props.controls, values, props.defaults)).length > 0) {
      reset.dataset.changed = 'true';
    } else {
      // A hidden reset cannot keep the focus, so it moves to the first field.
      if (document.activeElement === reset) fields[0]?.value.focus();
      delete reset.dataset.changed;
    }
    const lockMeta = lockControl();
    if (lockMeta) {
      // Attach only once: moving a focused button would blur it.
      if (lock.parentNode !== caption) caption.append(lock);
      lock.setAttribute('aria-label', `${lockMeta.label} ${props.label}`);
      lock.setAttribute('aria-pressed', String(locked()));
    } else {
      lock.remove();
    }
    axes().forEach((control, index) => {
      const { field, axis, value, input } = fields[index];
      const text = format(control);
      axis.textContent = control.label;
      // A field's own hint, from the row's `_hints`, wins over the row's.
      setHint(field, control.hint);
      value.textContent = text;
      value.setAttribute('aria-label', `${props.label} ${control.label}: ${text}`);
      // A value changed elsewhere, such as by a scrub, shows in an input with nothing typed yet.
      if (input && input.value === input.defaultValue && input.value !== text) {
        input.value = input.defaultValue = text;
        if (document.activeElement === input) input.select();
      }
    });
  }

  build();
  render();
  return {
    update(next: FieldsProps) {
      props = next;
      values = next.values;
      build();
      // A change made elsewhere during a scrub, such as a reset, becomes
      // the scrub's new starting point instead of being overwritten.
      const scrubbed = scrub && axes()[scrub.index];
      if (scrub && scrubbed && read(scrubbed) !== scrub.applied) {
        scrub.value = scrub.applied = read(scrubbed);
      }
      render();
    },
    destroy() {
      endScrub();
      fields.forEach(({ field }) => setHint(field, undefined));
      setHint(root, undefined);
      root.remove();
    },
  };
}
