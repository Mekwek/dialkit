import { handleSegmentKey } from './control-keyboard';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  if (el instanceof HTMLButtonElement) el.type = 'button';
  return el;
}

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  /** A spoken name when the visible label is short. */
  ariaLabel?: string;
  /** Shown in place of the label, which becomes its name and tooltip. */
  icon?: SVGElement;
};

/**
 * Segments with a sliding pill that takes the picked one's box and slides
 * there from wherever it is; the arrow keys move between them.
 */
export function segmentedControl<T extends string>(className: string, label: string, options: readonly SegmentedOption<T>[], pick: (value: T) => void, buttonClassName = '') {
  const root = element('div', `dialkit-segmented ${className}`);
  root.setAttribute('role', 'radiogroup');
  root.setAttribute('aria-label', label);
  root.addEventListener('keydown', handleSegmentKey);
  const pill = element('div', 'dialkit-segmented-pill');
  pill.setAttribute('aria-hidden', 'true');
  root.append(pill);
  const buttons = options.map(option => {
    const button = element('button', `dialkit-segmented-button ${buttonClassName}`.trim(), option.icon ? undefined : option.label);
    button.setAttribute('role', 'radio');
    if (option.icon) button.append(option.icon);
    const name = option.ariaLabel ?? (option.icon && option.label);
    if (name) button.setAttribute('aria-label', name);
    button.addEventListener('click', () => pick(option.value));
    root.append(button);
    return button;
  });
  // Measured to the subpixel, so a label sits in the middle of the pill; the
  // scale undoes a transform on the way in (a popover's entrance). A resize
  // (the row taking its width, a font loading) moves the pill without a slide.
  const place = (slide: boolean) => {
    const active = buttons.find(button => button.dataset.active === 'true');
    if (!active?.offsetWidth) return;
    const row = root.getBoundingClientRect();
    const box = active.getBoundingClientRect();
    const scale = row.width / root.offsetWidth;
    if (!slide) pill.style.transition = 'none';
    pill.style.left = `${(box.left - row.left) / scale}px`;
    pill.style.width = `${box.width / scale}px`;
    if (!slide) {
      void pill.offsetWidth;
      pill.style.transition = '';
    }
  };
  const observer = new ResizeObserver(() => place(false));
  buttons.forEach(button => observer.observe(button));
  let current: T | undefined;
  return {
    root,
    buttons,
    set(value: T) {
      options.forEach((option, i) => {
        const active = option.value === value;
        buttons[i].setAttribute('aria-checked', String(active));
        buttons[i].tabIndex = active ? 0 : -1;
        buttons[i].dataset.active = String(active);
      });
      if (value !== current) { current = value; place(true); }
    },
    disconnect: () => observer.disconnect(),
  };
}

/**
 * A text field in its label, with `${className}-input` inside: Enter or
 * leaving commits, and Escape restores a changed draft.
 */
export function textField(className: string, label: string, text: () => string, accept: (text: string) => boolean) {
  const root = element('label', className);
  const input = element('input', `${className}-input`);
  input.type = 'text';
  input.spellcheck = false;
  input.autocomplete = 'off';
  input.setAttribute('aria-label', label);
  root.append(input);
  let shown = '';
  const show = () => { input.value = shown = text(); input.removeAttribute('aria-invalid'); };
  const commit = () => { if (accept(input.value.trim())) show(); else input.setAttribute('aria-invalid', 'true'); };
  input.addEventListener('change', commit);
  input.addEventListener('blur', () => { if (input.getAttribute('aria-invalid')) show(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    // Escape restores a changed draft first; a second Escape reaches the popover.
    if (e.key === 'Escape' && input.value !== text()) { e.preventDefault(); e.stopPropagation(); show(); }
  });
  // A focused field follows outside changes too, unless it holds a draft,
  // and keeps its text selected so the next key replaces the value.
  const sync = () => {
    const focused = document.activeElement === input;
    if (focused && input.value !== shown) return;
    const all = input.selectionStart === 0 && input.selectionEnd === input.value.length;
    show();
    if (focused && all) input.select();
  };
  return { root, input, show, sync };
}

export type NumberFieldOptions = {
  className: string;
  label: string;
  /** Text before the number; dragging it scrubs the value. */
  name?: string;
  /** Text after the number; it scrubs too. */
  unit?: string;
  min: number;
  max: number;
  step: number;
  digits: number;
  /** Brings a typed, stepped, or scrubbed number into range. */
  limit: (n: number) => number;
  read: () => number;
  write: (n: number) => void;
  onScrub?: (active: boolean) => void;
};

/**
 * A spin button: type a number, step it with Up and Down (ten steps with
 * Shift), or drag its name or unit, `${className}-name`, sideways.
 */
export function numberField(options: NumberFieldOptions) {
  const { digits, step, read } = options;
  // A typed value may end in the unit, or in % where there is none ("50%" in HSL).
  const suffix = options.unit ?? '%';
  const parse = (text: string) => text ? Number(text.endsWith(suffix) ? text.slice(0, -suffix.length) : text) : NaN;
  const set = (n: number) => {
    const next = options.limit(Number(n.toFixed(digits)));
    if (next !== Number(read().toFixed(digits))) options.write(next);
    field.show();
  };
  const field = textField(options.className, options.label, () => read().toFixed(digits), text => {
    const n = parse(text);
    if (Number.isFinite(n)) set(n);
    return Number.isFinite(n);
  });
  const { input } = field;
  input.setAttribute('role', 'spinbutton');
  input.inputMode = 'decimal';
  input.setAttribute('aria-valuemin', String(options.min));
  if (Number.isFinite(options.max)) input.setAttribute('aria-valuemax', String(options.max));
  input.addEventListener('keydown', e => {
    if (!['ArrowUp', 'ArrowDown'].includes(e.key) || e.altKey || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    e.stopPropagation();
    const draft = parse(input.value.trim());
    // Steps land on the field's grid, as a slider's keys do: 0.682 steps down to 0.68.
    const position = (Number.isFinite(draft) ? draft : read()) / step;
    const steps = e.shiftKey ? 10 : 1;
    set((e.key === 'ArrowUp' ? Math.floor(position + 1e-9) + steps : Math.ceil(position - 1e-9) - steps) * step);
  });
  const grips = [options.name, options.unit].map(text => {
    if (!text) return undefined;
    const grip = element('span', `${options.className}-name`, text);
    grip.setAttribute('aria-hidden', 'true');
    let drag: { id: number; x: number; start: number } | undefined;
    let moved = false;
    grip.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      drag = { id: e.pointerId, x: e.clientX, start: read() };
      moved = false;
      grip.setPointerCapture(e.pointerId);
      options.onScrub?.(true);
    });
    grip.addEventListener('pointermove', e => {
      if (e.pointerId !== drag?.id) return;
      const dx = e.clientX - drag.x;
      if (!moved && Math.abs(dx) < 3) return;
      moved = true;
      set(drag.start + dx * step * (e.shiftKey ? 10 : 1));
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== drag?.id) return;
      drag = undefined;
      options.onScrub?.(false);
    };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('lostpointercapture', end);
    // A press without a drag still focuses the field through its label.
    grip.addEventListener('click', e => { if (moved) e.preventDefault(); });
    return grip;
  });
  if (grips[0]) field.root.prepend(grips[0]);
  if (grips[1]) field.root.append(grips[1]);
  return { ...field, sync: () => { input.setAttribute('aria-valuenow', read().toFixed(digits)); field.sync(); } };
}
