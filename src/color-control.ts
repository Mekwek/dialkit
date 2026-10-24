import {
  channelsToColor, clamp, clampChannel, COLOR_CHANNELS, colorChannels, colorFormat, colorToRgb, fitGamut, formatColor, formatGamut, maxChroma, parseColor,
  type Color, type ColorChannel, type ColorFormat,
} from './color';
import { getDialKitPortalRoot, getDropdownPosition, observeDropdownPosition } from './dropdown-position';
import { handleSegmentKey } from './control-keyboard';

export type ColorControlProps = { label: string; value: string; onChange: (value: string) => void };

const FORMATS: { format: ColorFormat; label: string; ariaLabel?: string }[] = [
  { format: 'hex', label: 'Hex' }, { format: 'rgb', label: 'RGB' }, { format: 'hsl', label: 'HSL' }, { format: 'oklch', label: 'OKLCH' }, { format: 'p3', label: 'P3', ariaLabel: 'Display P3' },
];
const OPACITY: ColorChannel = { name: '%', label: 'Opacity', max: 100, step: 1, digits: 0 };
type EyeDropperConstructor = new () => { open: (options?: { signal?: AbortSignal }) => Promise<{ sRGBHex: string }> };

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  if (el instanceof HTMLButtonElement) el.type = 'button';
  return el;
}

function eyedropperIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', 'm2 22 1-1h3l9-9M3 21v-3l9-9m3-3 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z');
  svg.append(path);
  return svg;
}

function textInput(className: string, label: string) {
  const input = element('input', className);
  input.type = 'text';
  input.spellcheck = false;
  input.autocomplete = 'off';
  input.setAttribute('aria-label', label);
  return input;
}

/** One interaction/rendering implementation shared by the four framework adapters. */
export function mountColorControl(host: HTMLElement, initial: ColorControlProps, presentation: 'popover' | 'inline' = 'popover') {
  const inline = presentation === 'inline';
  let props = initial;
  let color: Color = parseColor(props.value) ?? { l: 0, c: 0, h: 0, a: 1 };
  let format = colorFormat(props.value);
  let lastEmitted: string | undefined;
  let popup: HTMLDivElement | undefined;
  let stopPosition: (() => void) | undefined;
  let paintFrame = 0;
  let eyedropperAbort: AbortController | undefined;
  let updatePicker = () => {};
  const row = element('div', 'dialkit-color-control');
  const label = element('span', 'dialkit-color-label');
  const inputs = element('div', 'dialkit-color-inputs');
  const valueInput = element('input', 'dialkit-color-value');
  valueInput.type = 'text';
  valueInput.spellcheck = false;
  valueInput.autocomplete = 'off';
  const swatch = element('button', 'dialkit-color-swatch');
  swatch.setAttribute('aria-haspopup', 'dialog');
  swatch.setAttribute('aria-expanded', 'false');
  inputs.append(valueInput, swatch);
  row.append(label, inputs);
  host.append(row);
  if (inline) row.style.display = 'none';

  const render = () => {
    label.textContent = props.label;
    valueInput.setAttribute('aria-label', `${props.label} color value`);
    if (document.activeElement !== valueInput) valueInput.value = props.value;
    valueInput.title = props.value;
    swatch.style.setProperty('--dial-color', props.value);
    swatch.setAttribute('aria-label', `Pick ${props.label.toLowerCase()} color`);
    updatePicker();
  };
  const commit = (next: Color, nextFormat = format) => {
    format = nextFormat;
    // Every format but OKLCH is a bounded output space. Keep the handle on the emitted color.
    color = format === 'oklch' ? next : fitGamut(next, formatGamut(format));
    const value = formatColor(color, format);
    lastEmitted = value;
    props = { ...props, value };
    render();
    props.onChange(value);
  };
  const acceptText = (input: HTMLInputElement) => {
    const parsed = parseColor(input.value);
    if (!parsed) {
      input.setAttribute('aria-invalid', 'true');
      input.title = 'Enter a hex, RGB, HSL, OKLCH, or Display P3 color';
      return false;
    }
    input.removeAttribute('aria-invalid');
    color = parsed;
    format = colorFormat(input.value);
    const value = input.value.trim();
    lastEmitted = value;
    props = { ...props, value };
    render();
    props.onChange(value);
    return true;
  };
  valueInput.addEventListener('change', () => acceptText(valueInput));
  valueInput.addEventListener('blur', () => {
    if (valueInput.getAttribute('aria-invalid')) {
      valueInput.value = props.value;
      valueInput.removeAttribute('aria-invalid');
    }
  });
  valueInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { if (acceptText(valueInput)) valueInput.blur(); }
    if (e.key === 'Escape') { valueInput.value = props.value; valueInput.removeAttribute('aria-invalid'); valueInput.blur(); }
    e.stopPropagation();
  });

  const close = (restoreFocus = false) => {
    stopPosition?.();
    stopPosition = undefined;
    cancelAnimationFrame(paintFrame);
    eyedropperAbort?.abort();
    eyedropperAbort = undefined;
    popup?.remove();
    popup = undefined;
    updatePicker = () => {};
    delete row.dataset.open;
    swatch.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside);
    document.removeEventListener('focusin', focusOutside);
    if (restoreFocus) swatch.focus({ preventScroll: true });
  };
  const outside = (e: PointerEvent) => {
    if (!popup?.contains(e.target as Node) && !row.contains(e.target as Node)) close();
  };
  const focusOutside = (e: FocusEvent) => {
    if (!popup?.contains(e.target as Node) && !row.contains(e.target as Node)) close();
  };

  const open = () => {
    if (popup) { if (!inline) close(); return; }
    const root = inline ? host : getDialKitPortalRoot(host) ?? host;
    popup = element('div', 'dialkit-color-popover');
    popup.dataset.presentation = presentation;
    popup.style.position = inline ? 'static' : 'fixed';
    popup.setAttribute('role', inline ? 'group' : 'dialog');
    popup.setAttribute('aria-label', `${props.label} color picker`);
    const plane = element('div', 'dialkit-color-plane');
    plane.setAttribute('role', 'group');
    plane.setAttribute('aria-label', 'Color field; use arrow keys to adjust saturation and lightness');
    plane.tabIndex = 0;
    const canvas = element('canvas', 'dialkit-color-canvas');
    canvas.width = 252;
    canvas.height = 160;
    canvas.setAttribute('aria-hidden', 'true');
    const marker = element('span', 'dialkit-color-marker');
    marker.setAttribute('aria-hidden', 'true');
    plane.append(canvas, marker);
    const tracks = element('div', 'dialkit-color-tracks');
    // The strips show what they change, so they take the whole row.
    function track(name: string, max: number, step: number, className: string) {
      const line = element('label', 'dialkit-color-track-row');
      const input = element('input', `dialkit-color-track ${className}`);
      input.type = 'range'; input.min = '0'; input.max = String(max); input.step = String(step);
      input.setAttribute('aria-label', name);
      line.append(input); tracks.append(line);
      return input;
    }
    const hue = track('Hue', 360, 0.1, 'dialkit-color-hue');
    const opacity = track('Opacity', 100, 1, 'dialkit-color-opacity');
    hue.addEventListener('input', () => {
      const h = Number(hue.value);
      // Hue changes keep the field handle in place and match the strip preview.
      commit({ ...color, h, c: saturation * maxChroma(color.l, h, planeSpace()) });
    });
    opacity.addEventListener('input', () => commit({ ...color, a: Number(opacity.value) / 100 }));

    const formatRow = element('div', 'dialkit-labeled-control dialkit-color-format-row');
    const formats = element('div', 'dialkit-segmented dialkit-color-formats');
    formatRow.append(formats);
    formats.setAttribute('role', 'radiogroup');
    formats.addEventListener('keydown', handleSegmentKey);
    formats.setAttribute('aria-label', 'Color format');
    const formatPill = element('div', 'dialkit-segmented-pill');
    formatPill.setAttribute('aria-hidden', 'true');
    formats.append(formatPill);
    const formatButtons = FORMATS.map(({ format: f, label, ariaLabel }) => {
      const button = element('button', 'dialkit-segmented-button dialkit-color-format', label);
      button.type = 'button';
      button.setAttribute('role', 'radio');
      if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
      button.addEventListener('click', () => commit(color, f));
      formats.append(button);
      return button;
    });

    // One field per channel of the format, then opacity. Type a value, step it
    // with the arrow keys, or drag the channel's letter (or the %).
    const fieldsRow = element('div', 'dialkit-color-fields-row');
    const fields = element('div', 'dialkit-color-fields');
    const EyeDropper = (window as Window & { EyeDropper?: EyeDropperConstructor }).EyeDropper;
    if (EyeDropper) {
      const eyedropper = element('button', 'dialkit-color-eyedropper');
      eyedropper.setAttribute('aria-label', 'Pick a color from the screen');
      eyedropper.title = 'Pick a color from the screen';
      eyedropper.append(eyedropperIcon());
      eyedropper.addEventListener('click', async () => {
        eyedropperAbort?.abort();
        const abort = eyedropperAbort = new AbortController();
        try {
          const picked = parseColor((await new EyeDropper().open({ signal: abort.signal })).sRGBHex);
          // Screen pixels are opaque; keep the opacity already set.
          if (picked && !abort.signal.aborted) commit({ ...picked, a: color.a });
        } catch { /* Dismissed, or the picker closed */ }
        if (eyedropperAbort === abort) eyedropperAbort = undefined;
      });
      fieldsRow.append(eyedropper);
    }
    fieldsRow.append(fields);
    let fieldsFormat: ColorFormat | undefined;
    let syncFields: (() => void)[] = [];
    // Channel values as last typed: a round trip through the color would lose
    // them where they stop mattering (the saturation of black in HSL).
    let typed: { key: string; values: number[] } | undefined;
    const channelKey = () => formatColor({ ...color, a: 1 }, format);
    const channelValues = (f: Exclude<ColorFormat, 'hex'>) => typed?.key === channelKey() ? typed.values : colorChannels(color, f);

    const scrub = (grip: HTMLElement, channel: ColorChannel, read: () => number, write: (n: number) => void) => {
      let drag: { id: number; x: number; start: number } | undefined;
      let moved = false;
      grip.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault();
        drag = { id: e.pointerId, x: e.clientX, start: read() };
        moved = false;
        grip.setPointerCapture(e.pointerId);
      });
      grip.addEventListener('pointermove', e => {
        if (e.pointerId !== drag?.id) return;
        const dx = e.clientX - drag.x;
        if (!moved && Math.abs(dx) < 3) return;
        moved = true;
        write(drag.start + dx * channel.step * (e.shiftKey ? 10 : 1));
      });
      const end = (e: PointerEvent) => { if (e.pointerId === drag?.id) drag = undefined; };
      grip.addEventListener('pointerup', end);
      grip.addEventListener('lostpointercapture', end);
      // A press without a drag still focuses the field through its label.
      grip.addEventListener('click', e => { if (moved) e.preventDefault(); });
    };
    /** A text field in its label: Enter or leaving commits, Escape restores. */
    const textField = (label: string, text: () => string, accept: (text: string) => boolean) => {
      const cell = element('label', 'dialkit-color-field');
      const input = textInput('dialkit-color-field-input', label);
      cell.append(input);
      input.addEventListener('focus', () => input.select());
      let shown = '';
      const show = () => { input.value = shown = text(); input.removeAttribute('aria-invalid'); };
      const commitText = () => { if (accept(input.value.trim())) show(); else input.setAttribute('aria-invalid', 'true'); };
      input.addEventListener('change', commitText);
      input.addEventListener('blur', () => { if (input.getAttribute('aria-invalid')) show(); });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); commitText(); }
        // Escape restores a changed draft first; a second Escape closes the picker.
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
      return { cell, input, show, sync };
    };
    const numberField = (channel: ColorChannel, label: string, read: () => number, write: (n: number) => void) => {
      const number = (text: string) => text ? Number(text.replace(/%$/, '')) : NaN;
      const set = (n: number) => {
        const next = clampChannel(channel, Number(n.toFixed(channel.digits)));
        if (next !== Number(read().toFixed(channel.digits))) write(next);
        field.show();
      };
      const field = textField(label, () => read().toFixed(channel.digits), text => {
        const n = number(text);
        if (Number.isFinite(n)) set(n);
        return Number.isFinite(n);
      });
      // The same spin button as the pad's X and Y fields.
      field.input.setAttribute('role', 'spinbutton');
      field.input.inputMode = 'decimal';
      field.input.setAttribute('aria-valuemin', '0');
      if (Number.isFinite(channel.max)) field.input.setAttribute('aria-valuemax', String(channel.max));
      field.input.addEventListener('keydown', e => {
        if (!['ArrowUp', 'ArrowDown'].includes(e.key) || e.altKey || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        const draft = number(field.input.value.trim());
        set((Number.isFinite(draft) ? draft : read()) + (e.key === 'ArrowUp' ? 1 : -1) * channel.step * (e.shiftKey ? 10 : 1));
      });
      const name = element('span', 'dialkit-color-field-name', channel.name);
      name.setAttribute('aria-hidden', 'true');
      scrub(name, channel, read, set);
      field.cell.dataset.channel = channel.label.toLowerCase();
      if (channel === OPACITY) field.cell.append(name);
      else field.cell.prepend(name);
      return { ...field, sync: () => { field.input.setAttribute('aria-valuenow', read().toFixed(channel.digits)); field.sync(); } };
    };
    const hexField = () => {
      const field = textField('Hex color', () => formatColor({ ...color, a: 1 }, 'hex'), text => {
        const hex = text.replace(/^#?/, '#');
        if (/^#[\da-f]+$/i.test(hex)) {
          const parsed = parseColor(hex);
          if (!parsed) return false;
          // Three or six digits keep the opacity already set; four or eight carry their own.
          const next = { ...parsed, a: hex.length === 5 || hex.length === 9 ? parsed.a : color.a };
          if (formatColor(next, 'hex') !== formatColor(color, 'hex')) commit(next);
          return true;
        }
        // Any other CSS color switches to its format, as the row's field does.
        const parsed = parseColor(text);
        if (parsed) commit(parsed, colorFormat(text));
        return !!parsed;
      });
      field.cell.dataset.channel = 'hex';
      return field;
    };
    const opacityField = numberField(OPACITY, 'Opacity value', () => color.a * 100, n => commit({ ...color, a: n / 100 }));
    fields.append(opacityField.cell);
    let channelFields: { cell: HTMLElement; input: HTMLInputElement }[] = [];
    const buildFields = () => {
      const f = format;
      const mode = FORMATS.find(({ format }) => format === f)!;
      const channels = f === 'hex' ? [hexField()] : COLOR_CHANNELS[f].map((channel, i) => numberField(channel, `${mode.ariaLabel ?? mode.label} ${channel.label}`, () => channelValues(f)[i], n => {
        const values = channelValues(f).slice();
        values[i] = n;
        const converted = channelsToColor(values, f, color.a);
        // A gray keeps the field's hue; HSL's carries its own.
        const next = f === 'oklch' || f === 'hsl' || converted.c > 1e-7 ? converted : { ...converted, h: color.h };
        typed = { key: formatColor({ ...next, a: 1 }, f), values };
        commit(next);
      }));
      fieldsFormat = f;
      syncFields = [...channels, opacityField].map(field => field.sync);
      // A mode change can come from a focused field (a pasted color) or from
      // outside; the field at the same place keeps the focus.
      const focused = channelFields.findIndex(field => field.input === document.activeElement);
      channelFields.forEach(field => field.cell.remove());
      opacityField.cell.before(...channels.map(field => field.cell));
      channelFields = channels;
      if (focused >= 0) {
        // Shown before the focus, so the focus selects its text.
        const field = channels[focused] ?? channels[0];
        field.show();
        field.input.focus({ preventScroll: true });
      }
    };
    let lastHue = -1;
    let lastSpace = '';
    let lastHueTrack = '';
    let saturation = 0;
    const planeSpace = () => formatGamut(format);
    const ctx = canvas.getContext('2d', { colorSpace: 'display-p3' });
    const canvasSpace = ctx?.getContextAttributes?.().colorSpace === 'display-p3' ? 'p3' : 'srgb';
    const paint = () => {
      if (!ctx) return;
      const space = planeSpace();
      if (lastHue === color.h && lastSpace === space) return;
      lastHue = color.h; lastSpace = space;
      const pixels = ctx.createImageData(canvas.width, canvas.height);
      for (let y = 0; y < canvas.height; y++) {
        const l = 1 - y / (canvas.height - 1);
        // Normalize each row to its available chroma: the whole field is usable,
        // from neutral on the left to the richest color on the right.
        const max = maxChroma(l, color.h, space);
        for (let x = 0; x < canvas.width; x++) {
          const sample = { l, c: x / (canvas.width - 1) * max, h: color.h, a: 1 };
          const rgb = colorToRgb(sample, canvasSpace);
          const index = (y * canvas.width + x) * 4;
          rgb.forEach((n, i) => { pixels.data[index + i] = Math.round(clamp(n) * 255); });
          pixels.data[index + 3] = 255;
        }
      }
      ctx.putImageData(pixels, 0, 0);
    };
    updatePicker = () => {
      popup?.setAttribute('aria-label', `${props.label} color picker`);
      const max = maxChroma(color.l, color.h, planeSpace());
      // Keep the horizontal position at white and black, where chroma is zero.
      if (max > 0) saturation = clamp(color.c / max);
      marker.style.left = `${saturation * 100}%`;
      marker.style.top = `${(1 - color.l) * 100}%`;
      marker.style.background = formatColor({ ...color, a: 1 }, 'oklch');
      hue.value = String(color.h);
      opacity.value = String(color.a * 100);
      hue.setAttribute('aria-valuetext', `${Math.round(color.h)} degrees`);
      opacity.setAttribute('aria-valuetext', `${Math.round(color.a * 100)} percent`);
      const hueTrackKey = `${color.l.toFixed(5)}:${saturation.toFixed(5)}:${planeSpace()}`;
      if (hueTrackKey !== lastHueTrack) {
        lastHueTrack = hueTrackKey;
        const stops = Array.from({ length: 73 }, (_, i) => {
          const h = i * 5;
          return formatColor({ l: color.l, c: saturation * maxChroma(color.l, h, planeSpace()), h, a: 1 }, 'oklch');
        });
        hue.style.setProperty('--dial-color-track-bg', `linear-gradient(to right in oklab, ${stops.join(', ')})`);
      }
      // Fill the entire thumb independently of the shorter track beneath it.
      hue.style.setProperty('--dial-color-thumb', formatColor({ ...color, a: 1 }, 'oklch'));
      opacity.style.setProperty('--dial-color-thumb', formatColor(color, 'oklch'));
      opacity.style.setProperty('--dial-color-opaque', formatColor({ ...color, a: 1 }, 'oklch'));
      formatButtons.forEach((button, i) => {
        const active = FORMATS[i].format === format;
        button.setAttribute('aria-checked', String(active));
        button.tabIndex = active ? 0 : -1;
        button.dataset.active = String(active);
        if (active) formatPill.style.transform = `translateX(${i * 100}%)`;
      });
      if (fieldsFormat !== format) buildFields();
      syncFields.forEach(sync => sync());
      cancelAnimationFrame(paintFrame);
      paintFrame = requestAnimationFrame(paint);
    };
    const move = (e: PointerEvent) => {
      const rect = plane.getBoundingClientRect();
      const l = 1 - clamp((e.clientY - rect.top) / rect.height);
      saturation = clamp((e.clientX - rect.left) / rect.width);
      commit({ ...color, l, c: saturation * maxChroma(l, color.h, planeSpace()) });
    };
    plane.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      plane.focus({ preventScroll: true });
      plane.setPointerCapture(e.pointerId);
      move(e);
    });
    plane.addEventListener('keydown', e => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      const step = e.shiftKey ? 0.1 : 0.01;
      const l = clamp(color.l + (e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0));
      saturation = clamp(saturation + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0));
      commit({ ...color, l, c: saturation * maxChroma(l, color.h, planeSpace()) });
    });
    plane.addEventListener('pointermove', e => { if (plane.hasPointerCapture(e.pointerId)) move(e); });
    plane.addEventListener('pointerup', e => { if (plane.hasPointerCapture(e.pointerId)) plane.releasePointerCapture(e.pointerId); });
    popup.addEventListener('keydown', e => {
      if (inline) return;
      if (e.key === 'Escape') { e.preventDefault(); close(true); }
      if (e.key === 'Tab') {
        const first = formatButtons.find(button => button.tabIndex === 0);
        if ((e.shiftKey && document.activeElement === first) || (!e.shiftKey && document.activeElement === opacityField.input)) {
          swatch.focus({ preventScroll: true });
          close();
        }
      }
      e.stopPropagation();
    });
    popup.append(formatRow, plane, tracks, fieldsRow);
    root.append(popup);
    const updatePosition = () => {
      if (!popup) return;
      if (!host.isConnected || row.getClientRects().length === 0) { close(); return; }
      const p = getDropdownPosition(row, root, { dropdownHeight: popup.scrollHeight + 2, width: 280, maxHeight: 480, preferSide: true, fixed: true, gap: 8 });
      Object.assign(popup.style, { left: `${p.left}px`, top: `${p.top}px`, width: `${p.width}px`, maxHeight: `${p.maxHeight}px`, transformOrigin: p.above ? 'bottom' : 'top' });
    };
    updatePicker();
    if (inline) return;
    stopPosition = observeDropdownPosition(row, updatePosition, () => popup);
    row.dataset.open = 'true';
    swatch.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', focusOutside);
    formatButtons.find(button => button.getAttribute('aria-checked') === 'true')?.focus({ preventScroll: true });
  };
  swatch.addEventListener('click', open);
  render();
  if (inline) open();
  return {
    update(next: ColorControlProps) {
      const parsed = parseColor(next.value);
      if (parsed && next.value !== lastEmitted && next.value !== props.value) {
        color = { ...parsed, h: parsed.c < 1e-7 && colorFormat(next.value) !== 'hsl' ? color.h : parsed.h };
        format = colorFormat(next.value);
      }
      props = next;
      render();
    },
    destroy() { close(); row.remove(); },
  };
}
