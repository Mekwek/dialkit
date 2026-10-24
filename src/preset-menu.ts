const ROW = '.dialkit-preset-item[data-preset-id]';
const DRAG_THRESHOLD_PX = 3;
// Matches the row transform transition in theme.css.
const GLIDE_MS = 200;
const LONG_PRESS_MS = 400;

type Drag = { row: HTMLElement; id: string; pointerId: number; startX: number; startY: number; from: number; to: number; offset: number; step: number; lifted: boolean; hold: number };

/**
 * Shared row behavior for version menus: drag a saved version (or press Alt+Arrow on it)
 * to reorder, with the rows in between sliding aside, and open a row's actions from its
 * menu icon. On touch a drag starts with a long-press, so a swipe still scrolls the menu.
 * Adapters render the rows and pass the new order to the store.
 */
export function observePresetMenu(getPopup: () => HTMLElement | null | undefined, reorder: (presetIds: string[]) => void): () => void {
  let frame = 0;
  let dispose: (() => void) | undefined;
  let stopped = false;
  const connect = () => {
    if (stopped) return;
    const popup = getPopup();
    if (!popup?.isConnected) { frame = requestAnimationFrame(connect); return; }

    const rows = () => Array.from(popup.querySelectorAll<HTMLElement>(ROW));
    const move = (id: string, to: number) => {
      const ids = rows().map(row => row.dataset.presetId!).filter(other => other !== id);
      ids.splice(to, 0, id);
      reorder(ids);
    };
    const reset = () => {
      delete popup.dataset.dragging;
      for (const row of rows()) { row.style.transform = ''; delete row.dataset.dragging; }
    };
    const layout = ({ from, to, offset, step }: Drag) => rows().forEach((row, index) => {
      const shift = index === from ? offset
        : from < to && index > from && index <= to ? -step
          : to < from && index >= to && index < from ? step : 0;
      row.style.transform = shift ? `translateY(${shift}px)` : '';
    });

    let drag: Drag | undefined;
    const stopDrag = () => {
      if (drag) clearTimeout(drag.hold);
      drag = undefined;
      document.removeEventListener('pointermove', pointermove);
      document.removeEventListener('pointerup', pointerup);
      document.removeEventListener('pointercancel', pointercancel);
    };
    // The click that ends a drag must not select the dropped row.
    const swallow = (event: MouseEvent) => { event.preventDefault(); event.stopPropagation(); };
    const lift = (current: Drag) => {
      const [first, second] = rows().map(row => row.getBoundingClientRect().top);
      if (second === undefined) { stopDrag(); return; }
      current.lifted = true;
      current.step = second - first;
      popup.dataset.dragging = 'true';
      current.row.dataset.dragging = 'true';
    };
    const pointermove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const dy = event.clientY - drag.startY;
      if (!drag.lifted) {
        // A touch that moves before the long-press is a scroll, not a drag.
        if (event.pointerType === 'touch') {
          if (Math.hypot(event.clientX - drag.startX, dy) > DRAG_THRESHOLD_PX) stopDrag();
          return;
        }
        if (Math.abs(dy) <= DRAG_THRESHOLD_PX) return;
        lift(drag);
        if (!drag?.lifted) return;
      }
      const last = rows().length - 1;
      drag.offset = Math.min(Math.max(dy, -drag.from * drag.step), (last - drag.from) * drag.step);
      drag.to = Math.min(Math.max(Math.round(drag.from + drag.offset / drag.step), 0), last);
      layout(drag);
    };
    const pointerup = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const done = drag;
      stopDrag();
      if (!done.lifted) return;
      window.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', swallow, true));
      // Glide into the slot, then commit; the framework renders the new order before the next paint.
      const end = (done.to - done.from) * done.step;
      const glide = done.row.animate(
        [{ transform: `translateY(${done.offset}px)` }, { transform: `translateY(${end}px)` }],
        { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : GLIDE_MS, easing: 'ease-out', fill: 'forwards' },
      );
      glide.onfinish = () => {
        glide.cancel();
        reset();
        if (done.to !== done.from) move(done.id, done.to);
      };
    };
    // A cancelled drag puts the rows back where they were.
    const pointercancel = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const done = drag;
      stopDrag();
      if (done.lifted) reset();
    };
    // Rows let the browser scroll vertically, so a lifted touch drag holds the menu still.
    const touchmove = (event: TouchEvent) => { if (drag?.lifted) event.preventDefault(); };
    const contextmenu = (event: Event) => { if (drag) event.preventDefault(); };
    const pointerdown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      const row = target.closest<HTMLElement>(ROW);
      if (drag || popup.dataset.dragging || event.button !== 0 || !row || target.closest('input, .dialkit-preset-actions')) return;
      const current: Drag = { row, id: row.dataset.presetId!, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, from: rows().indexOf(row), to: 0, offset: 0, step: 0, lifted: false, hold: 0 };
      if (event.pointerType === 'touch') current.hold = window.setTimeout(() => { if (drag === current) lift(current); }, LONG_PRESS_MS);
      drag = current;
      document.addEventListener('pointermove', pointermove);
      document.addEventListener('pointerup', pointerup);
      document.addEventListener('pointercancel', pointercancel);
    };

    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const row = target.closest<HTMLElement>(ROW);
      if (!event.altKey || event.metaKey || event.ctrlKey || !['ArrowUp', 'ArrowDown'].includes(event.key) || !row || target instanceof HTMLInputElement) return;
      event.preventDefault(); event.stopPropagation();
      const id = row.dataset.presetId!;
      const list = rows();
      const to = Math.min(Math.max(list.indexOf(row) + (event.key === 'ArrowUp' ? -1 : 1), 0), list.length - 1);
      if (list[to] === row) return;
      move(id, to);
      // Keep focus on the moved version once its row has been rendered in place.
      queueMicrotask(() => popup.querySelector<HTMLElement>(`${ROW}[data-preset-id="${CSS.escape(id)}"] .dialkit-preset-name`)?.focus({ preventScroll: true }));
    };

    // The menu icon reveals the row's actions on hover; a click (or tap) moves focus into them.
    const click = (event: MouseEvent) => {
      const more = (event.target as HTMLElement).closest('.dialkit-preset-more');
      more?.parentElement?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
    };

    popup.addEventListener('pointerdown', pointerdown);
    popup.addEventListener('touchmove', touchmove, { passive: false });
    popup.addEventListener('contextmenu', contextmenu);
    popup.addEventListener('keydown', keydown);
    popup.addEventListener('click', click);
    dispose = () => {
      if (drag?.lifted) reset();
      stopDrag();
      popup.removeEventListener('pointerdown', pointerdown);
      popup.removeEventListener('touchmove', touchmove);
      popup.removeEventListener('contextmenu', contextmenu);
      popup.removeEventListener('keydown', keydown);
      popup.removeEventListener('click', click);
    };
  };
  frame = requestAnimationFrame(connect);
  return () => { stopped = true; cancelAnimationFrame(frame); dispose?.(); };
}
