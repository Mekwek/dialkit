import type { EasingConfig } from './store/DialStore';
import { easingGuideEnd, easingHandleFromKey, fitEasingGraph, moveEasingHandle, normalizeEase, type BezierPoints, type GraphPoint } from './easing-geometry';

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
