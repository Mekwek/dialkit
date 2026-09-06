import {
  clamp, colorFormat, colorToHexSix, colorToHsl, colorToHsv, colorToRgb, colorToRgb255, fieldSpace, fitGamut, formatColor,
  hslToColor, hsvToColor, maxChroma, parseColor, rgb255ToColor, wrapHue, type Color, type ColorFormat, type ColorSpace,
} from './color';
import { getDialKitPortalRoot, getDropdownPosition, observeDropdownPosition } from './dropdown-position';
import { handleSegmentKey, stepInputKey } from './control-keyboard';

export type ColorControlProps = { label: string; value: string; onChange: (value: string) => void };

const FORMATS: ColorFormat[] = ['hex', 'rgb', 'hsl', 'oklch'];
const FORMAT_LABEL: Record<ColorFormat, string> = { hex: 'Hex', rgb: 'RGB', hsl: 'HSL', oklch: 'OKLCH' };
const MODE_KEY = 'dialkit:color-mode';
const HEX_RE = /^#?([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;
const EYEDROPPER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg>';

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };
type Channel = { key: string; label: string; min: number; max: number; step: number; digits: number; unit?: string; width: number; wrap?: boolean };
const CHANNELS: Record<Exclude<ColorFormat, 'hex'>, Channel[]> = {
  rgb: [
    { key: 'r', label: 'Red', min: 0, max: 255, step: 1, digits: 0, width: 4 },
    { key: 'g', label: 'Green', min: 0, max: 255, step: 1, digits: 0, width: 4 },
    { key: 'b', label: 'Blue', min: 0, max: 255, step: 1, digits: 0, width: 4 },
  ],
  hsl: [
    { key: 'h', label: 'Hue', min: 0, max: 360, step: 1, digits: 0, width: 4, wrap: true },
    { key: 's', label: 'Saturation', min: 0, max: 100, step: 1, digits: 0, unit: '%', width: 4 },
    { key: 'l', label: 'Lightness', min: 0, max: 100, step: 1, digits: 0, unit: '%', width: 4 },
  ],
  oklch: [
    { key: 'l', label: 'Lightness', min: 0, max: 1, step: 0.01, digits: 3, width: 5 },
    { key: 'c', label: 'Chroma', min: 0, max: 0.4, step: 0.005, digits: 3, width: 5 },
    { key: 'h', label: 'Hue', min: 0, max: 360, step: 1, digits: 1, width: 5, wrap: true },
  ],
};

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  if (el instanceof HTMLButtonElement) el.type = 'button';
  return el;
}
function textInput(className: string, label: string, width?: number): HTMLInputElement {
  const input = element('input', className);
  input.type = 'text';
  input.spellcheck = false;
  input.autocomplete = 'off';
  input.setAttribute('aria-label', label);
  if (width) input.style.width = `${width}ch`;
  return input;
}
function readMode(): ColorFormat | null {
  try {
    const stored = localStorage.getItem(MODE_KEY);
    return FORMATS.includes(stored as ColorFormat) ? (stored as ColorFormat) : null;
  } catch { return null; }
}
function writeMode(format: ColorFormat) {
  try { localStorage.setItem(MODE_KEY, format); } catch { /* storage unavailable */ }
}
const percentByte = (n: number) => Math.round(clamp(n) * 100);

/** sRGB conversions used only to paint the HSB and HSL fields; direct so a 252×160 paint stays cheap. */
function hsvRgb(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [f(5), f(3), f(1)];
}
function hslRgb(h: number, s: number, l: number): [number, number, number] {
  const k = s * Math.min(l, 1 - l);
  const f = (n: number) => { const t = (n + h / 30) % 12; return l - k * Math.max(-1, Math.min(t - 3, 9 - t, 1)); };
  return [f(0), f(8), f(4)];
}
const cssRgb = (rgb: number[]) => `rgb(${rgb.map(n => Math.round(clamp(n) * 255)).join(' ')})`;

/** One interaction/rendering implementation shared by the four framework adapters. */
export function mountColorControl(host: HTMLElement, initial: ColorControlProps, presentation: 'popover' | 'inline' = 'popover') {
  const inline = presentation === 'inline';
  let props = initial;
  let color: Color = parseColor(props.value) ?? { l: 0, c: 0, h: 0, a: 1 };
  let format: ColorFormat = readMode() ?? colorFormat(props.value);
  // The sRGB hue survives a grey so the HSB and HSL fields do not jump to red.
  let srgbHue = colorToHsv(color).h;
  let lastEmitted: string | undefined;
  let popup: HTMLDivElement | undefined;
  let stopPosition: (() => void) | undefined;
  let paintFrame = 0;
  let updatePicker = () => {};
  let rebuildFields = () => {};
  const row = element('div', 'dialkit-color-control');
  const label = element('span', 'dialkit-color-label');
  const inputs = element('div', 'dialkit-color-inputs');
  const valueInput = textInput('dialkit-color-value', 'color value');
  const swatch = element('button', 'dialkit-color-swatch');
  swatch.setAttribute('aria-haspopup', 'dialog');
  swatch.setAttribute('aria-expanded', 'false');
  inputs.append(valueInput, swatch);
  row.append(label, inputs);
  host.append(row);
  if (inline) row.style.display = 'none';

  const rememberHue = (next: Color) => {
    const hsv = colorToHsv(next, srgbHue);
    if (hsv.s > 1e-4 && hsv.v > 1e-4) srgbHue = hsv.h;
  };
  const render = () => {
    label.textContent = props.label;
    valueInput.setAttribute('aria-label', `${props.label} color value`);
    // The row shows the six-digit colour only; the alpha lives in the panel.
    if (document.activeElement !== valueInput) valueInput.value = colorToHexSix(color);
    valueInput.title = props.value;
    swatch.style.setProperty('--dial-color', formatColor(color, 'hex'));
    swatch.setAttribute('aria-label', `Pick ${props.label.toLowerCase()} color`);
    updatePicker();
  };
  const commit = (next: Color, nextFormat = format) => {
    format = nextFormat;
    // Hex, RGB and HSL are bounded output spaces. Keep the handle on the emitted color.
    color = format === 'oklch' ? next : fitGamut(next);
    rememberHue(color);
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
      input.title = 'Enter a hex, RGB, HSL or OKLCH color';
      return false;
    }
    input.removeAttribute('aria-invalid');
    commit(parsed);
    return true;
  };
  valueInput.addEventListener('change', () => acceptText(valueInput));
  valueInput.addEventListener('blur', () => {
    valueInput.value = colorToHexSix(color);
    valueInput.removeAttribute('aria-invalid');
  });
  valueInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { if (acceptText(valueInput)) valueInput.blur(); }
    if (e.key === 'Escape') { valueInput.value = colorToHexSix(color); valueInput.removeAttribute('aria-invalid'); valueInput.blur(); }
    e.stopPropagation();
  });

  const close = (restoreFocus = false) => {
    stopPosition?.();
    stopPosition = undefined;
    cancelAnimationFrame(paintFrame);
    popup?.remove();
    popup = undefined;
    updatePicker = () => {};
    rebuildFields = () => {};
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

    // The field: one canvas, painted per space.
    const plane = element('div', 'dialkit-color-plane');
    plane.setAttribute('role', 'group');
    plane.tabIndex = 0;
    const canvas = element('canvas', 'dialkit-color-canvas');
    canvas.width = 252;
    canvas.height = 160;
    canvas.setAttribute('aria-hidden', 'true');
    const marker = element('span', 'dialkit-color-marker');
    marker.setAttribute('aria-hidden', 'true');
    plane.append(canvas, marker);

    // The hue and opacity strips.
    const tracks = element('div', 'dialkit-color-tracks');
    function track(name: string, max: number, step: number, className: string) {
      // No visible name: the strips speak for themselves and take the full row.
      const line = element('label', 'dialkit-color-track-row');
      const input = element('input', `dialkit-color-track ${className}`);
      input.type = 'range'; input.min = '0'; input.max = String(max); input.step = String(step);
      input.setAttribute('aria-label', name);
      line.append(input); tracks.append(line);
      return input;
    }
    const hue = track('Hue', 360, 0.1, 'dialkit-color-hue');
    const opacity = track('Opacity', 100, 1, 'dialkit-color-opacity');

    // The mode switcher.
    const formatRow = element('div', 'dialkit-labeled-control dialkit-color-format-row');
    const formats = element('div', 'dialkit-segmented dialkit-color-formats');
    formatRow.append(formats);
    formats.setAttribute('role', 'radiogroup');
    formats.addEventListener('keydown', handleSegmentKey);
    formats.setAttribute('aria-label', 'Color format');
    const formatPill = element('div', 'dialkit-segmented-pill');
    formatPill.setAttribute('aria-hidden', 'true');
    formats.append(formatPill);
    const formatButtons = FORMATS.map(f => {
      const button = element('button', 'dialkit-segmented-button dialkit-color-format', FORMAT_LABEL[f]);
      button.setAttribute('role', 'radio');
      // Build the new mode's fields first; the commit then syncs them.
      button.addEventListener('click', () => { format = f; writeMode(f); rebuildFields(); commit(color, f); });
      formats.append(button);
      return button;
    });

    // The inputs row: eyedropper, the mode's channel fields, then alpha.
    // The eyedropper is its own box beside the fields row, at the row's height.
    const fieldsRow = element('div', 'dialkit-color-fields-row');
    const fields = element('div', 'dialkit-color-fields');
    const EyeDropperApi = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
    const eyedropper = element('button', 'dialkit-color-eyedropper');
    eyedropper.innerHTML = EYEDROPPER_ICON;
    eyedropper.title = 'Pick a color from the screen';
    eyedropper.setAttribute('aria-label', 'Pick a color from the screen');
    eyedropper.addEventListener('click', async () => {
      if (!EyeDropperApi) return;
      try {
        const picked = await new EyeDropperApi().open();
        const parsed = parseColor(picked.sRGBHex);
        // The eyedropper reads opaque pixels; keep the alpha already set.
        if (parsed) commit({ ...parsed, a: color.a });
      } catch { /* the user dismissed the eyedropper */ }
    });
    const channelBox = element('div', 'dialkit-color-channels');
    const alphaBox = element('div', 'dialkit-color-alpha');
    const alphaInput = textInput('dialkit-color-channel dialkit-color-alpha-input', 'Alpha percentage', 3);
    const alphaUnit = element('span', 'dialkit-color-unit', '%');
    alphaBox.append(alphaInput, alphaUnit);
    if (EyeDropperApi) fieldsRow.append(eyedropper);
    fields.append(channelBox, alphaBox);
    fieldsRow.append(fields);
    let channelInputs: HTMLInputElement[] = [];
    let syncChannels = () => {};

    /** A typed number for one channel, or null when it is not a number. */
    const readNumber = (input: HTMLInputElement, channel: Channel) => {
      const n = Number.parseFloat(input.value.replace('%', '').trim());
      return Number.isFinite(n) ? clamp(n, channel.min, channel.max) : null;
    };
    const commitChannels = () => {
      if (format === 'hex') {
        const match = HEX_RE.exec(channelInputs[0].value.trim());
        if (!match) { channelInputs[0].setAttribute('aria-invalid', 'true'); return; }
        const parsed = parseColor(`#${match[1]}`)!;
        // Typing a colour keeps the alpha already set; an eight-digit hex carries its own.
        commit({ ...parsed, a: match[1].length === 4 || match[1].length === 8 ? parsed.a : color.a });
        return;
      }
      const values = CHANNELS[format].map((channel, i) => readNumber(channelInputs[i], channel));
      if (values.some(n => n === null)) {
        channelInputs.forEach((input, i) => { if (values[i] === null) input.setAttribute('aria-invalid', 'true'); });
        return;
      }
      const [a, b, c] = values as number[];
      if (format === 'rgb') commit(rgb255ToColor(a, b, c, color.a));
      else if (format === 'hsl') { srgbHue = wrapHue(a); commit(hslToColor({ h: a, s: b / 100, l: c / 100 }, color.a)); }
      else commit({ l: a, c: b, h: wrapHue(c), a: color.a });
    };
    type Range = Pick<Channel, 'min' | 'max' | 'step' | 'digits' | 'wrap'>;
    /** `range` and `current` make the arrow keys step the number in place; the hex field has neither. */
    const bindField = (input: HTMLInputElement, onCommit: () => void, range?: Range, current?: () => number) => {
      input.addEventListener('change', onCommit);
      input.addEventListener('blur', () => { input.removeAttribute('aria-invalid'); syncChannels(); });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); onCommit(); input.blur(); }
        if (e.key === 'Escape') { e.preventDefault(); input.removeAttribute('aria-invalid'); syncChannels(); input.blur(); }
        if (!range || !current) return;
        const stepped = stepInputKey(e, input.value.replace('%', ''), current(), range.min, range.max, range.step, range.wrap);
        if (stepped === undefined) return;
        input.value = stepped.toFixed(range.digits);
        input.removeAttribute('aria-invalid');
        onCommit();
      });
    };
    /** The mode's channel numbers for the current colour, in the fields' order. */
    const channelValues = (): number[] => format === 'hex' ? [] : format === 'rgb' ? colorToRgb255(color)
      : format === 'hsl' ? (({ h, s, l }) => [h, s * 100, l * 100])(colorToHsl(color, srgbHue))
      : [color.l, color.c, color.h];
    rebuildFields = () => {
      channelBox.replaceChildren();
      if (format === 'hex') {
        const input = textInput('dialkit-color-channel dialkit-color-hex-input', 'Hex value', 8);
        channelInputs = [input];
        channelBox.append(input);
      } else {
        channelInputs = CHANNELS[format].map(channel => {
          const cell = element('label', 'dialkit-color-channel-cell');
          const input = textInput('dialkit-color-channel', channel.label, channel.width);
          const name = element('span', 'dialkit-color-channel-name', channel.key.toUpperCase());
          cell.append(input, name);
          channelBox.append(cell);
          return input;
        });
      }
      channelInputs.forEach((input, i) => {
        const channel = format === 'hex' ? undefined : CHANNELS[format][i];
        bindField(input, commitChannels, channel, channel && (() => channelValues()[i]));
      });
      syncChannels();
    };
    syncChannels = () => {
      if (channelInputs.length !== (format === 'hex' ? 1 : 3)) return;
      const focused = document.activeElement;
      if (format === 'hex') {
        if (focused !== channelInputs[0]) channelInputs[0].value = colorToHexSix(color);
      } else {
        const values = channelValues();
        CHANNELS[format].forEach((channel, i) => {
          if (focused !== channelInputs[i]) channelInputs[i].value = values[i].toFixed(channel.digits);
        });
      }
      if (focused !== alphaInput) alphaInput.value = String(percentByte(color.a));
    };
    bindField(alphaInput, () => {
      const percent = Number.parseFloat(alphaInput.value.replace('%', '').trim());
      if (!Number.isFinite(percent)) { alphaInput.setAttribute('aria-invalid', 'true'); return; }
      commit({ ...color, a: clamp(percent, 0, 100) / 100 });
    }, { min: 0, max: 100, step: 1, digits: 0 }, () => percentByte(color.a));

    // Field geometry per space: x and y in 0..1, y from the top.
    let space: ColorSpace = fieldSpace(format);
    let lastPaintKey = '';
    let lastHueTrack = '';
    let saturation = 0;
    const fieldHue = () => space === 'oklch' ? color.h : srgbHue;
    const handle = (): { x: number; y: number } => {
      if (space === 'hsv') { const { s, v } = colorToHsv(color, srgbHue); return { x: s, y: 1 - v }; }
      if (space === 'hsl') { const { s, l } = colorToHsl(color, srgbHue); return { x: s, y: 1 - l }; }
      const max = maxChroma(color.l, color.h);
      // Keep the horizontal position at white and black, where chroma is zero.
      if (max > 0) saturation = clamp(color.c / max);
      return { x: saturation, y: 1 - color.l };
    };
    const colorAt = (x: number, y: number): Color => {
      if (space === 'hsv') return hsvToColor({ h: srgbHue, s: x, v: 1 - y }, color.a);
      if (space === 'hsl') return hslToColor({ h: srgbHue, s: x, l: 1 - y }, color.a);
      saturation = x;
      const l = 1 - y;
      return { ...color, l, c: x * maxChroma(l, color.h) };
    };
    const ctx = canvas.getContext('2d');
    const paint = () => {
      if (!ctx) return;
      const key = `${space}:${fieldHue().toFixed(2)}`;
      if (key === lastPaintKey) return;
      lastPaintKey = key;
      const h = fieldHue();
      const pixels = ctx.createImageData(canvas.width, canvas.height);
      for (let y = 0; y < canvas.height; y++) {
        const t = 1 - y / (canvas.height - 1);
        // Normalize each OKLCH row to its available chroma: the whole field is usable.
        const max = space === 'oklch' ? maxChroma(t, h) : 0;
        for (let x = 0; x < canvas.width; x++) {
          const u = x / (canvas.width - 1);
          const rgb = space === 'hsv' ? hsvRgb(h, u, t) : space === 'hsl' ? hslRgb(h, u, t) : colorToRgb({ l: t, c: u * max, h, a: 1 });
          const index = (y * canvas.width + x) * 4;
          rgb.forEach((n, i) => { pixels.data[index + i] = Math.round(clamp(n) * 255); });
          pixels.data[index + 3] = 255;
        }
      }
      ctx.putImageData(pixels, 0, 0);
    };
    const hueStops = () => {
      const at = handle();
      const stops = Array.from({ length: 73 }, (_, i) => {
        const h = i * 5;
        if (space === 'hsv') return cssRgb(hsvRgb(h, at.x, 1 - at.y));
        if (space === 'hsl') return cssRgb(hslRgb(h, at.x, 1 - at.y));
        return formatColor({ l: color.l, c: saturation * maxChroma(color.l, h), h, a: 1 }, 'oklch');
      });
      return `linear-gradient(to right${space === 'oklch' ? ' in oklab' : ''}, ${stops.join(', ')})`;
    };
    updatePicker = () => {
      popup?.setAttribute('aria-label', `${props.label} color picker`);
      space = fieldSpace(format);
      plane.setAttribute('aria-label', space === 'oklch'
        ? 'Color field; use arrow keys to adjust chroma and lightness'
        : space === 'hsl' ? 'Color field; use arrow keys to adjust saturation and lightness'
        : 'Color field; use arrow keys to adjust saturation and brightness');
      const at = handle();
      marker.style.left = `${at.x * 100}%`;
      marker.style.top = `${at.y * 100}%`;
      const opaque = formatColor({ ...color, a: 1 }, 'hex');
      marker.style.background = opaque;
      hue.value = String(fieldHue());
      opacity.value = String(color.a * 100);
      hue.setAttribute('aria-valuetext', `${Math.round(fieldHue())} degrees`);
      opacity.setAttribute('aria-valuetext', `${percentByte(color.a)} percent`);
      const hueTrackKey = `${space}:${at.x.toFixed(4)}:${at.y.toFixed(4)}`;
      if (hueTrackKey !== lastHueTrack) {
        lastHueTrack = hueTrackKey;
        hue.style.setProperty('--dial-color-track-bg', hueStops());
      }
      // Fill the entire thumb independently of the shorter track beneath it.
      hue.style.setProperty('--dial-color-thumb', opaque);
      opacity.style.setProperty('--dial-color-thumb', formatColor(color, 'hex'));
      opacity.style.setProperty('--dial-color-opaque', opaque);
      formatButtons.forEach((button, i) => {
        const active = FORMATS[i] === format;
        button.setAttribute('aria-checked', String(active));
        button.tabIndex = active ? 0 : -1;
        button.dataset.active = String(active);
        if (active) formatPill.style.transform = `translateX(${i * 100}%)`;
      });
      syncChannels();
      cancelAnimationFrame(paintFrame);
      paintFrame = requestAnimationFrame(paint);
    };
    hue.addEventListener('input', () => {
      const h = Number(hue.value);
      const at = handle();
      if (space === 'oklch') {
        // Hue changes keep the field handle in place and match the strip preview.
        commit({ ...color, h, c: saturation * maxChroma(color.l, h) });
      } else {
        srgbHue = wrapHue(h);
        commit(colorAt(at.x, at.y));
      }
    });
    opacity.addEventListener('input', () => commit({ ...color, a: Number(opacity.value) / 100 }));
    const move = (e: PointerEvent) => {
      const rect = plane.getBoundingClientRect();
      commit(colorAt(clamp((e.clientX - rect.left) / rect.width), clamp((e.clientY - rect.top) / rect.height)));
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
      const at = handle();
      const x = clamp(at.x + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0));
      const y = clamp(at.y + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0));
      commit(colorAt(x, y));
    });
    plane.addEventListener('pointermove', e => { if (plane.hasPointerCapture(e.pointerId)) move(e); });
    plane.addEventListener('pointerup', e => { if (plane.hasPointerCapture(e.pointerId)) plane.releasePointerCapture(e.pointerId); });
    popup.addEventListener('keydown', e => {
      if (inline) return;
      if (e.key === 'Escape') { e.preventDefault(); close(true); }
      if (e.key === 'Tab') {
        const first = formatButtons.find(button => button.tabIndex === 0);
        if ((e.shiftKey && document.activeElement === first) || (!e.shiftKey && document.activeElement === alphaInput)) {
          swatch.focus({ preventScroll: true });
          close();
        }
      }
      e.stopPropagation();
    });
    popup.append(formatRow, plane, tracks, fieldsRow);
    root.append(popup);
    rebuildFields();
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
        color = { ...parsed, h: parsed.c < 1e-7 ? color.h : parsed.h };
        rememberHue(color);
      }
      props = next;
      render();
    },
    destroy() { close(); row.remove(); },
  };
}
