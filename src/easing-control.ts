import type { EasingConfig } from './store/DialStore';
import { easingGuideEnd, easingHandleFromKey, fitEasingGraph, moveEasingHandle, normalizeEase, parseEase, type BezierPoints, type GraphPoint } from './easing-geometry';

export interface EasingVisualizationProps {
  easing: EasingConfig;
  /** Enables pointer and keyboard editing of the two control points. */
  onChange?: (ease: BezierPoints) => void;
}

let nextId = 0;

/**
 * How long the curve takes to move to a shape set from outside, such as a
 * preset. Outside changes that come closer together than this are continuous
 * input, such as a slider drag, and are drawn as they arrive.
 */
const MORPH_MS = 250;

/** One interaction and fitting implementation for React, Solid, Vue, and Svelte. */
export function mountEasingVisualization(host: HTMLElement, initial: EasingVisualizationProps) {
  let props = initial;
  let value = normalizeEase(props.easing.ease);
  let width = 256;
  let height = 180;
  let shown: BezierPoints | undefined;
  let morphFrame = 0;
  let lastOutsideChange = -Infinity;
  let drag: { id: number; handle: 0 | 1; x: number; y: number; scale: GraphPoint; ratioX: number; ratioY: number; value: BezierPoints } | undefined;
  const root = document.createElement('div');
  root.className = 'dialkit-easing-viz';
  root.setAttribute('aria-label', 'Bézier easing curve');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const shape = <K extends keyof SVGElementTagNameMap>(tag: K, className: string) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    node.setAttribute('class', className);
    svg.append(node);
    return node;
  };
  const reference = shape('line', 'dialkit-easing-reference');
  const tangents = [shape('line', 'dialkit-easing-tangent'), shape('line', 'dialkit-easing-tangent')];
  const path = shape('path', 'dialkit-easing-curve');
  const endpoints = [shape('circle', 'dialkit-easing-endpoint'), shape('circle', 'dialkit-easing-endpoint')];
  const help = document.createElement('span');
  help.className = 'dialkit-easing-instructions';
  help.id = `dialkit-easing-help-${++nextId}`;
  help.textContent = 'Drag to adjust X from 0 to 1 and Y from -1 to 2. Arrow keys adjust by 0.01. Shift adjusts by 0.1. Escape cancels a drag.';
  root.append(svg, help);
  const handles = ([0, 1] as const).map(handle => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dialkit-easing-handle';
    button.setAttribute('aria-describedby', help.id);
    button.addEventListener('pointerdown', event => {
      if (!props.onChange || event.button !== 0 || drag) return;
      event.preventDefault();
      event.stopPropagation();
      button.focus({ preventScroll: true });
      stopMorph();
      measure();
      const bounds = root.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      drag = { id: event.pointerId, handle, x: event.clientX, y: event.clientY, scale: fitEasingGraph(value, width, height).scale, ratioX: width / bounds.width, ratioY: height / bounds.height, value: [...value] };
      button.setPointerCapture(event.pointerId);
      button.dataset.dragging = 'true';
    });
    button.addEventListener('pointermove', move);
    button.addEventListener('pointerup', event => {
      if (event.pointerId !== drag?.id) return;
      move(event);
      endDrag();
    });
    button.addEventListener('pointercancel', event => { if (event.pointerId === drag?.id) cancelDrag(); });
    button.addEventListener('lostpointercapture', event => { if (event.pointerId === drag?.id) endDrag(); });
    button.addEventListener('keydown', event => {
      if (!props.onChange || event.altKey || event.metaKey || event.ctrlKey) return;
      if (event.key === 'Escape' && drag) {
        event.preventDefault();
        event.stopPropagation();
        cancelDrag();
        return;
      }
      const next = easingHandleFromKey(value, handle, event.key, event.shiftKey);
      if (next) {
        event.preventDefault();
        event.stopPropagation();
        endDrag();
        commit(next);
      }
    });
    root.append(button);
    return button;
  });
  host.append(root);

  function line(node: SVGLineElement, a: GraphPoint, b: GraphPoint) {
    node.setAttribute('x1', String(a.x)); node.setAttribute('y1', String(a.y));
    node.setAttribute('x2', String(b.x)); node.setAttribute('y2', String(b.y));
  }

  function render() {
    const graph = fitEasingGraph(shown ?? value, width, height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    line(reference, graph.start, graph.end);
    [graph.start, graph.end].forEach((point, index) => {
      line(tangents[index], point, easingGuideEnd(point, graph.handles[index]));
      endpoints[index].setAttribute('cx', String(point.x));
      endpoints[index].setAttribute('cy', String(point.y));
      endpoints[index].setAttribute('r', '2.5');
      const button = handles[index];
      button.style.left = `${graph.handles[index].x / width * 100}%`;
      button.style.top = `${graph.handles[index].y / height * 100}%`;
      button.disabled = !props.onChange;
      button.setAttribute('aria-label', `Bézier handle ${index + 1}: X ${value[index * 2]}, Y ${value[index * 2 + 1]}`);
    });
    root.setAttribute('role', props.onChange ? 'group' : 'img');
    const { start, end, handles: [a, b] } = graph;
    path.setAttribute('d', `M ${start.x} ${start.y} C ${a.x} ${a.y}, ${b.x} ${b.y}, ${end.x} ${end.y}`);
  }

  function measure() {
    width = root.clientWidth || width;
    height = root.clientHeight || height;
    render();
  }

  function commit(next: BezierPoints) {
    if (next.every((part, index) => part === value[index])) return;
    stopMorph();
    value = next;
    render();
    props.onChange?.([...value]);
  }

  function move(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    commit(moveEasingHandle(drag.value, drag.handle, (event.clientX - drag.x) * drag.ratioX, (event.clientY - drag.y) * drag.ratioY, drag.scale));
  }

  function endDrag() {
    if (!drag) return;
    const { id, handle } = drag;
    drag = undefined;
    delete handles[handle].dataset.dragging;
    if (handles[handle].hasPointerCapture(id)) handles[handle].releasePointerCapture(id);
  }

  function morph(from: BezierPoints) {
    cancelAnimationFrame(morphFrame);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { shown = undefined; return; }
    const target = value;
    let start: number | undefined;
    const step = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / MORPH_MS);
      const k = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      shown = t < 1 ? from.map((part, index) => part + (target[index] - part) * k) as BezierPoints : undefined;
      render();
      if (shown) morphFrame = requestAnimationFrame(step);
    };
    shown = from;
    morphFrame = requestAnimationFrame(step);
  }

  function stopMorph() {
    cancelAnimationFrame(morphFrame);
    shown = undefined;
  }

  function cancelDrag() {
    if (!drag) return;
    const original = drag.value;
    endDrag();
    commit(original);
  }

  const observer = new ResizeObserver(measure);
  observer.observe(root);
  measure();
  return {
    update(next: EasingVisualizationProps) {
      const incoming = normalizeEase(next.easing.ease);
      const changed = incoming.some((part, index) => part !== value[index]);
      const from = drag ? undefined : shown ?? value;
      // An external preset/edit replaces an active gesture instead of being overwritten by it.
      if (!next.onChange || changed) endDrag();
      props = next;
      value = incoming;
      if (changed) {
        // A one-off change, such as a preset, moves the curve to its new shape.
        // A run of changes follows the input directly, so the curve never lags it.
        const now = performance.now();
        if (from && now - lastOutsideChange >= MORPH_MS) morph(from);
        else stopMorph();
        lastOutsideChange = now;
      }
      render();
    },
    destroy() { endDrag(); stopMorph(); observer.disconnect(); root.remove(); },
  };
}

export interface EaseFieldsProps {
  ease: BezierPoints;
  onChange: (ease: BezierPoints) => void;
}

const EASE_FIELDS = [
  { name: 'X1', min: 0, max: 1 },
  { name: 'Y1', min: -1, max: 2 },
  { name: 'X2', min: 0, max: 1 },
  { name: 'Y2', min: -1, max: 2 },
] as const;

/** Pixels the pointer moves before a press on a field becomes a scrub. */
const SCRUB_THRESHOLD = 3;

/** Two decimals at most, without trailing zeros. */
const formatEasePart = (value: number) => String(Number(value.toFixed(2)) || 0);

/**
 * The four Bézier coordinates as numeric fields. Drag a field to scrub it
 * (0.01 per pixel, Shift for 0.1), click it to type, or use the Up and Down arrows.
 * Typing or pasting all four values ("0.25, 0.1, 0.25, 1") into any field sets the whole curve.
 */
export function mountEaseFields(host: HTMLElement, initial: EaseFieldsProps) {
  let props = initial;
  let value = normalizeEase(props.ease);
  let press: { id: number; index: number; x: number; start: number; shift: boolean; last: number; moved: boolean } | undefined;
  const root = document.createElement('div');
  root.className = 'dialkit-ease-fields';
  const commitAll = (ease: BezierPoints) => {
    if (ease.every((part, index) => part === value[index])) return;
    value = ease;
    render();
    props.onChange([...value]);
  };
  const commit = (index: number, next: number) => {
    const { min, max } = EASE_FIELDS[index];
    const ease = [...value] as BezierPoints;
    ease[index] = Number(Math.max(min, Math.min(max, next)).toFixed(3));
    commitAll(ease);
  };
  const fields = EASE_FIELDS.map((field, index) => {
    const input = document.createElement('input');
    input.className = 'dialkit-ease-field';
    input.type = 'text';
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('role', 'spinbutton');
    input.setAttribute('aria-label', field.name);
    input.setAttribute('aria-valuemin', String(field.min));
    input.setAttribute('aria-valuemax', String(field.max));
    root.append(input);
    input.addEventListener('focus', () => input.select());
    // Only typed text is applied; until then a focused field keeps showing the current value.
    input.addEventListener('input', () => { fields[index].draft = true; });
    const accept = () => {
      if (!fields[index].draft) return;
      fields[index].draft = false;
      const curve = parseEase(input.value);
      const number = input.value.trim() === '' ? NaN : Number(input.value);
      if (curve) commitAll(curve);
      else if (Number.isFinite(number)) commit(index, number);
      input.value = formatEasePart(value[index]);
    };
    input.addEventListener('blur', accept);
    input.addEventListener('keydown', event => {
      event.stopPropagation();
      // Enter applies the draft and Escape discards it; either way the field keeps focus.
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault();
        if (event.key === 'Enter') accept();
        fields[index].draft = false;
        input.value = formatEasePart(value[index]);
        input.select();
      } else if (!event.altKey && !event.metaKey && !event.ctrlKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        const draft = input.value.trim() === '' ? NaN : Number(input.value);
        const current = Number.isFinite(draft) ? draft : value[index];
        fields[index].draft = false;
        commit(index, current + (event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 0.1 : 0.01));
        input.value = formatEasePart(value[index]);
        input.select();
      }
    });
    // A press on a field that is not open for typing waits: moved, it scrubs
    // the value; released in place, it opens the field.
    input.addEventListener('pointerdown', event => {
      if (event.button !== 0 || press || document.activeElement === input) return;
      event.preventDefault();
      press = { id: event.pointerId, index, x: event.clientX, start: value[index], shift: event.shiftKey, last: event.clientX, moved: false };
      input.setPointerCapture(event.pointerId);
    });
    input.addEventListener('pointermove', event => {
      if (event.pointerId !== press?.id) return;
      if (!press.moved) {
        if (Math.abs(event.clientX - press.x) < SCRUB_THRESHOLD) return;
        press.moved = true;
        input.dataset.scrubbing = 'true';
      }
      // Pressing or releasing Shift changes the step from here on, not for the distance already dragged.
      if (event.shiftKey !== press.shift) press = { ...press, x: press.last, start: value[index], shift: event.shiftKey };
      press.last = event.clientX;
      commit(index, press.start + (event.clientX - press.x) * (press.shift ? 0.1 : 0.01));
    });
    input.addEventListener('pointerup', event => {
      if (event.pointerId !== press?.id) return;
      const moved = press.moved;
      endPress();
      if (!moved) input.focus();
    });
    input.addEventListener('pointercancel', event => { if (event.pointerId === press?.id) endPress(); });
    return { input, draft: false };
  });
  host.append(root);

  function endPress() {
    if (!press) return;
    const { id, index } = press;
    press = undefined;
    const { input } = fields[index];
    delete input.dataset.scrubbing;
    if (input.hasPointerCapture(id)) input.releasePointerCapture(id);
  }

  function render() {
    fields.forEach(({ input, draft }, index) => {
      input.setAttribute('aria-valuenow', String(value[index]));
      // A focused field follows outside changes too, unless it holds a draft,
      // and keeps its text selected so the next key replaces the value.
      const focused = document.activeElement === input;
      if (focused && draft) return;
      const all = input.selectionStart === 0 && input.selectionEnd === input.value.length;
      input.value = formatEasePart(value[index]);
      if (focused && all) input.select();
    });
  }

  render();
  return {
    update(next: EaseFieldsProps) {
      props = next;
      value = normalizeEase(next.ease);
      render();
    },
    destroy() { endPress(); root.remove(); },
  };
}
