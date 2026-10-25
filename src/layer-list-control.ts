import { ICON_CLOSE, ICON_COPY, ICON_EYE, ICON_EYE_OFF } from './icons';
import { moveLayer, normalizeLayersValue, sameLayersValue, type LayerActionKind, type LayersValue } from './layers';
import { HintStore } from './store/HintStore';
import { element, icon } from './vanilla/dom';

export type LayerListControlProps = {
  label: string;
  value: LayersValue;
  onChange: (value: LayersValue) => void;
  /** Add, duplicate and delete: the app creates or removes the layer, then writes the new value. */
  onAction: (kind: LayerActionKind, id?: string) => void;
  addLabel?: string;
  addDisabled?: boolean;
  empty?: string;
};

/** The hints of the control's parts, shown while the hint key (H) is held. */
const LAYER_HINTS = {
  add: 'Adds a new layer.',
  row: 'Click to select this layer. Drag to change which layer draws on top.',
  hidden: 'Hidden with its eye.',
  show: 'Shows this layer again.',
  hide: 'Hides this layer everywhere.',
  duplicate: 'Makes a copy of this layer.',
  delete: 'Deletes this layer.',
};

/** Pointer travel before a press on a row becomes a reorder drag, as in the version list. */
const DRAG_LIFT_PX = 4;
/** The parts of a row that keep their own press. */
const ROW_DRAG_EXCLUDE = 'button';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

type Row = {
  id: string;
  root: HTMLDivElement;
  name: HTMLSpanElement;
  eye: HTMLButtonElement;
  duplicate: HTMLButtonElement;
  remove: HTMLButtonElement;
};

/**
 * A list of layers, as in a design tool's Layers panel: a wide add button,
 * then one row per layer, top first. A row selects its layer on click, and
 * holds an eye, a duplicate button and a delete button that turns red under
 * the pointer. A row hidden with its eye shows a darker fill, a dim name and
 * dim icons. The eye of a row whose layer is on the canvas is brighter than
 * the eye of a row that is off the canvas for another reason (`offCanvas`).
 *
 * A row drags from anywhere but its buttons, as a version row does: the
 * other rows slide aside while it moves, and on release it glides into its
 * slot before the new order is written. Alt+Up and Alt+Down move the focused
 * row; Up and Down select the next row.
 */
export function mountLayerListControl(host: HTMLElement, initial: LayerListControlProps) {
  let props = initial;
  let value = normalizeLayersValue(props.value);

  const root = element('div', 'dialkit-layers');
  const add = element('button', 'dialkit-preset-save dialkit-layers-add');
  const list = element('div', 'dialkit-layers-list');
  list.setAttribute('role', 'listbox');
  const empty = element('div', 'dialkit-layers-empty');
  root.append(add, list, empty);
  host.append(root);

  // The parts with a hint; a part's text can change, so it is read on entry.
  const hinted = new Set<HTMLElement>();
  const hint = (part: HTMLElement, text: () => string) => {
    hinted.add(part);
    part.addEventListener('pointerenter', () => HintStore.enter(part, text()));
    part.addEventListener('pointerleave', () => HintStore.leave(part));
  };
  const unhint = (part: HTMLElement) => {
    HintStore.leave(part);
    HintStore.hide(part);
    hinted.delete(part);
  };

  add.addEventListener('click', () => { if (!props.addDisabled) props.onAction('add'); });
  hint(add, () => LAYER_HINTS.add);

  const emit = (next: LayersValue) => {
    if (sameLayersValue(next, value)) return;
    value = next;
    render();
    props.onChange(next);
  };
  const select = (id: string) => emit({ items: value.items, selected: id });
  const indexOf = (id: string) => value.items.findIndex(item => item.id === id);

  const rowById = new Map<string, Row>();

  // ── Reordering rows: the version list's drag, in plain DOM ──
  let rowDrag: {
    id: string; pointerId: number; startY: number; lifted: boolean;
    from: number; to: number; offset: number; step: number; settling: boolean;
  } | undefined;
  /** A press that lifted into a drag ends without a click selecting the row. */
  let suppressClick = false;
  const paintRowDrag = () => {
    if (!rowDrag) return;
    const { id, from, to, offset, step, settling } = rowDrag;
    value.items.forEach((item, k) => {
      const row = rowById.get(item.id);
      if (!row) return;
      const shift = item.id === id ? (settling ? (to - from) * step : offset)
        : from < to && k > from && k <= to ? -step
        : to < from && k >= to && k < from ? step : 0;
      row.root.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  };
  const clearRowDrag = () => {
    delete list.dataset.dragging;
    delete list.dataset.settling;
    rowById.forEach(row => { row.root.style.transform = ''; delete row.root.dataset.dragging; });
  };
  const finishRowDrag = () => {
    const drag = rowDrag;
    if (!drag) return;
    rowDrag = undefined;
    // Transitions off first, so clearing the shifts draws the new order at once.
    clearRowDrag();
    if (drag.to !== drag.from) emit(moveLayer(value, drag.from, drag.to));
    else render();
  };
  /** Drops a drag at once, without writing: for a value from outside that changed the rows under it. */
  const cancelRowDrag = () => {
    const drag = rowDrag;
    if (!drag) return;
    rowDrag = undefined;
    clearRowDrag();
    const held = rowById.get(drag.id)?.root;
    if (held?.hasPointerCapture(drag.pointerId)) held.releasePointerCapture(drag.pointerId);
  };

  const buildRow = (id: string): Row => {
    const rowRoot = element('div', 'dialkit-layer');
    rowRoot.setAttribute('role', 'option');
    const name = element('span', 'dialkit-layer-name');
    const actions = element('div', 'dialkit-layer-actions');
    const iconButton = (className: string) => {
      const b = element('button', `dialkit-layer-button ${className}`);
      b.tabIndex = -1;
      return b;
    };
    const eye = iconButton('dialkit-layer-eye');
    const duplicate = iconButton('dialkit-layer-duplicate');
    duplicate.append(icon(ICON_COPY));
    duplicate.setAttribute('aria-label', 'Duplicate');
    const remove = iconButton('dialkit-layer-delete');
    remove.append(icon(ICON_CLOSE));
    remove.setAttribute('aria-label', 'Delete');
    actions.append(eye, duplicate, remove);
    rowRoot.append(name, actions);
    const row: Row = { id, root: rowRoot, name, eye, duplicate, remove };

    const item = () => value.items.find(it => it.id === id);
    hint(rowRoot, () => {
      const it = item();
      if (it?.hidden) return LAYER_HINTS.hidden;
      return it?.offCanvas ?? LAYER_HINTS.row;
    });
    hint(eye, () => item()?.hidden ? LAYER_HINTS.show : LAYER_HINTS.hide);
    hint(duplicate, () => LAYER_HINTS.duplicate);
    hint(remove, () => LAYER_HINTS.delete);

    // A button's click ends at the button. The eye swaps its icon while the
    // click runs, so by the time it reached the row its target would be out
    // of the page, and the row would take it as a click that selects.
    eye.addEventListener('click', event => {
      event.stopPropagation();
      const at = indexOf(id);
      if (at === -1) return;
      const items = value.items.slice();
      const it = items[at];
      items[at] = it.hidden ? { id: it.id, label: it.label, ...(it.offCanvas ? { offCanvas: it.offCanvas } : {}) } : { ...it, hidden: true };
      emit({ items, selected: value.selected });
    });
    duplicate.addEventListener('click', event => { event.stopPropagation(); props.onAction('duplicate', id); });
    remove.addEventListener('click', event => { event.stopPropagation(); props.onAction('delete', id); });
    rowRoot.addEventListener('click', event => {
      if (suppressClick) { suppressClick = false; return; }
      if ((event.target as Element).closest(ROW_DRAG_EXCLUDE)) return;
      select(id);
    });
    rowRoot.addEventListener('keydown', event => {
      const at = indexOf(id);
      if (at === -1) return;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const to = at + (event.key === 'ArrowUp' ? -1 : 1);
        if (to < 0 || to >= value.items.length) return;
        if (event.altKey) {
          if (rowDrag) return;
          emit(moveLayer(value, at, to));
          rowRoot.focus({ preventScroll: true });
        } else {
          const next = value.items[to];
          select(next.id);
          rowById.get(next.id)?.root.focus({ preventScroll: true });
        }
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(id);
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        props.onAction('delete', id);
      }
    });

    // The row holds the pointer from the press, so every later event reaches it once.
    rowRoot.addEventListener('pointerdown', event => {
      if (event.button !== 0 || rowDrag) return;
      if ((event.target as Element).closest(ROW_DRAG_EXCLUDE)) return;
      const from = indexOf(id);
      if (from === -1) return;
      rowDrag = { id, pointerId: event.pointerId, startY: event.clientY, lifted: false, from, to: from, offset: 0, step: 0, settling: false };
      try { rowRoot.setPointerCapture(event.pointerId); } catch { rowDrag = undefined; }
    });
    rowRoot.addEventListener('pointermove', event => {
      const drag = rowDrag;
      if (!drag || drag.id !== id || drag.pointerId !== event.pointerId || drag.settling) return;
      const dy = event.clientY - drag.startY;
      if (!drag.lifted) {
        if (Math.abs(dy) <= DRAG_LIFT_PX) return;
        drag.lifted = true;
        // One row's travel: its height plus the gap, from the rows as they sit.
        const first = rowById.get(value.items[0]?.id ?? '')?.root.getBoundingClientRect();
        const second = rowById.get(value.items[1]?.id ?? '')?.root.getBoundingClientRect();
        drag.step = first && second ? second.top - first.top : (first?.height ?? 36);
        list.dataset.dragging = 'true';
        rowRoot.dataset.dragging = 'true';
      }
      const n = value.items.length;
      // The row stays inside the list; its new place is the slot its centre is over.
      drag.offset = clamp(dy, -drag.from * drag.step, (n - 1 - drag.from) * drag.step);
      drag.to = clamp(Math.round(drag.from + drag.offset / drag.step), 0, n - 1);
      paintRowDrag();
    });
    const release = (event: PointerEvent) => {
      const drag = rowDrag;
      if (!drag || drag.id !== id || drag.pointerId !== event.pointerId || drag.settling) return;
      if (rowRoot.hasPointerCapture(event.pointerId)) rowRoot.releasePointerCapture(event.pointerId);
      if (!drag.lifted) { rowDrag = undefined; return; }
      suppressClick = event.type === 'pointerup';
      drag.settling = true;
      list.dataset.settling = 'true';
      paintRowDrag();
      // No glide to wait for: the row already sits in its slot, or reduced motion.
      if (reducedMotion() || drag.offset === (drag.to - drag.from) * drag.step) { finishRowDrag(); return; }
      let timer = 0;
      const done = (e?: TransitionEvent) => {
        if (e && (e.target !== rowRoot || e.propertyName !== 'transform')) return;
        rowRoot.removeEventListener('transitionend', done);
        clearTimeout(timer);
        if (rowDrag === drag) finishRowDrag();
      };
      rowRoot.addEventListener('transitionend', done);
      // A safety net, in case no transitionend comes (the row was hidden).
      timer = window.setTimeout(done, 400);
    };
    rowRoot.addEventListener('pointerup', release);
    rowRoot.addEventListener('pointercancel', release);
    rowRoot.addEventListener('lostpointercapture', release);
    return row;
  };

  const paintRow = (row: Row) => {
    const it = value.items.find(item => item.id === row.id);
    if (!it) return;
    const selected = value.selected === it.id;
    row.name.textContent = it.label;
    row.root.setAttribute('aria-selected', String(selected));
    row.root.toggleAttribute('data-selected', selected);
    row.root.toggleAttribute('data-hidden', !!it.hidden);
    row.root.toggleAttribute('data-on-canvas', !it.hidden && !it.offCanvas);
    row.eye.replaceChildren(icon(it.hidden ? ICON_EYE_OFF : ICON_EYE));
    row.eye.setAttribute('aria-label', it.hidden ? 'Show' : 'Hide');
    row.eye.setAttribute('aria-pressed', String(!!it.hidden));
  };

  function render() {
    add.textContent = props.addLabel ?? '+ Add';
    add.disabled = !!props.addDisabled;
    list.setAttribute('aria-label', props.label);
    empty.textContent = props.empty ?? '';
    empty.hidden = value.items.length > 0 || !props.empty;
    list.hidden = value.items.length === 0;

    const live = new Set(value.items.map(item => item.id));
    for (const [id, row] of rowById) {
      if (live.has(id)) continue;
      [row.root, row.eye, row.duplicate, row.remove].forEach(unhint);
      row.root.remove();
      rowById.delete(id);
    }
    // Rows keep their element through a reorder, so the focus stays on its row.
    const active = document.activeElement;
    let previous: Element | null = null;
    for (const item of value.items) {
      let row = rowById.get(item.id);
      if (!row) {
        row = buildRow(item.id);
        rowById.set(item.id, row);
      }
      paintRow(row);
      const next: Element | null = previous ? previous.nextElementSibling : list.firstElementChild;
      if (next !== row.root) {
        if (previous) previous.after(row.root);
        else list.prepend(row.root);
      }
      previous = row.root;
    }
    if (active instanceof HTMLElement && active !== document.activeElement && active.isConnected && list.contains(active)) {
      active.focus({ preventScroll: true });
    }
    // One row takes the Tab key: the selected one, else the first.
    const focusId = value.selected ?? value.items[0]?.id;
    rowById.forEach((row, id) => { row.root.tabIndex = id === focusId ? 0 : -1; });
  }

  render();

  return {
    update(next: LayerListControlProps) {
      props = next;
      const incoming = normalizeLayersValue(next.value);
      if (!sameLayersValue(incoming, value)) {
        // A value from outside that changes the rows under a drag drops the drag.
        const sameRows = incoming.items.length === value.items.length && incoming.items.every((item, i) => item.id === value.items[i]?.id);
        if (rowDrag && !sameRows) cancelRowDrag();
        value = incoming;
      }
      if (!rowDrag) render();
      else rowById.forEach(paintRow);
    },
    destroy() {
      cancelRowDrag();
      hinted.forEach(part => { HintStore.leave(part); HintStore.hide(part); });
      hinted.clear();
      root.remove();
    },
  };
}
