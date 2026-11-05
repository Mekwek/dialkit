// Drag a version's picture (or press Alt+Arrow on it) to reorder the strip of
// versions. The strip is a grid, so the other pictures slide to their new places
// in both directions. On touch a drag starts with a long-press, so a swipe still
// scrolls the strip. The strip calls `reorder` with the new order.

const ITEM = '.dialkit-version-thumb[data-draggable="true"]';
const DRAG_THRESHOLD_PX = 3;
// Matches the item transform transition in theme.css.
const GLIDE_MS = 200;
const LONG_PRESS_MS = 400;
const EDGE_PX = 28;
const SCROLL_STEP_PX = 6;

type Point = { x: number; y: number };

type Drag = {
  node: HTMLElement;
  pointerId: number;
  clientX: number;
  clientY: number;
  /** The pointer where the drag started, in the list's own pixels. */
  start: Point;
  /** How far the picture has moved, in the list's own pixels. */
  offset: Point;
  from: number;
  to: number;
  /** Where each picture rests, in the list's own pixels. */
  slots: Point[];
  lifted: boolean;
  hold?: number;
};

export function observeVersionReorder(list: HTMLElement, reorder: (keys: string[]) => void): () => void {
  const items = () => Array.from(list.querySelectorAll<HTMLElement>(ITEM));
  const keyOf = (node: HTMLElement) => node.dataset.version!;
  let drag: Drag | undefined;
  let frame = 0;

  // A list drawn scaled (a host's zoom) still keeps its picture under the pointer.
  const scale = () => (list.offsetWidth ? list.getBoundingClientRect().width / list.offsetWidth || 1 : 1);
  const toList = (clientX: number, clientY: number): Point => {
    const rect = list.getBoundingClientRect();
    const zoom = scale();
    return { x: (clientX - rect.left) / zoom + list.scrollLeft, y: (clientY - rect.top) / zoom + list.scrollTop };
  };

  const reset = () => {
    delete list.dataset.dragging;
    for (const node of items()) { node.style.transform = ''; delete node.dataset.dragging; }
  };

  const layout = ({ from, to, offset, slots }: Drag) => items().forEach((node, index) => {
    if (index === from) { node.style.transform = `translate(${offset.x}px, ${offset.y}px)`; return; }
    const target = from < to && index > from && index <= to ? index - 1
      : to < from && index >= to && index < from ? index + 1 : index;
    const shift = { x: slots[target].x - slots[index].x, y: slots[target].y - slots[index].y };
    node.style.transform = target === index ? '' : `translate(${shift.x}px, ${shift.y}px)`;
  });

  const follow = (current: Drag) => {
    const at = toList(current.clientX, current.clientY);
    current.offset = { x: at.x - current.start.x, y: at.y - current.start.y };
    const center = { x: current.slots[current.from].x + current.offset.x, y: current.slots[current.from].y + current.offset.y };
    let nearest = Infinity;
    current.slots.forEach((slot, index) => {
      const distance = Math.hypot(slot.x - center.x, slot.y - center.y);
      if (distance < nearest) { nearest = distance; current.to = index; }
    });
    layout(current);
  };

  // A picture held at the list's top or bottom edge scrolls the list.
  const autoScroll = () => {
    frame = 0;
    if (!drag?.lifted) return;
    const rect = list.getBoundingClientRect();
    const step = drag.clientY < rect.top + EDGE_PX ? -SCROLL_STEP_PX : drag.clientY > rect.bottom - EDGE_PX ? SCROLL_STEP_PX : 0;
    const before = list.scrollTop;
    if (step) list.scrollTop += step;
    if (list.scrollTop !== before) follow(drag);
    frame = requestAnimationFrame(autoScroll);
  };

  const stopDrag = () => {
    if (drag) clearTimeout(drag.hold);
    drag = undefined;
    cancelAnimationFrame(frame);
    frame = 0;
    document.removeEventListener('pointermove', pointermove);
    document.removeEventListener('pointerup', pointerup);
    document.removeEventListener('pointercancel', pointercancel);
    document.removeEventListener('keydown', escape, true);
  };

  // The click that ends a drag must not select the dropped version.
  const swallow = (event: MouseEvent) => { event.preventDefault(); event.stopPropagation(); };

  const lift = (current: Drag) => {
    const nodes = items();
    if (nodes.length < 2) { stopDrag(); return; }
    current.lifted = true;
    current.slots = nodes.map((node) => ({ x: node.offsetLeft, y: node.offsetTop }));
    list.dataset.dragging = 'true';
    current.node.dataset.dragging = 'true';
    frame = requestAnimationFrame(autoScroll);
  };

  const pointermove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.clientX = event.clientX;
    drag.clientY = event.clientY;
    if (!drag.lifted) {
      const at = toList(event.clientX, event.clientY);
      const moved = Math.hypot(at.x - drag.start.x, at.y - drag.start.y);
      if (moved <= DRAG_THRESHOLD_PX) return;
      // A touch that moves before the long-press is a scroll, not a drag.
      if (event.pointerType === 'touch') { stopDrag(); return; }
      lift(drag);
      if (!drag?.lifted) return;
    }
    follow(drag);
  };

  const commit = (node: HTMLElement, to: number) => {
    const others = items().filter((other) => other !== node).map(keyOf);
    others.splice(to, 0, keyOf(node));
    reorder(others);
  };

  const pointerup = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const done = drag;
    stopDrag();
    if (!done.lifted) return;
    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallow, true));
    // Glide into the slot, then commit; the list renders the new order before the next paint.
    const end = { x: done.slots[done.to].x - done.slots[done.from].x, y: done.slots[done.to].y - done.slots[done.from].y };
    const glide = done.node.animate(
      [{ transform: `translate(${done.offset.x}px, ${done.offset.y}px)` }, { transform: `translate(${end.x}px, ${end.y}px)` }],
      { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : GLIDE_MS, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' },
    );
    glide.onfinish = () => {
      glide.cancel();
      reset();
      if (done.to !== done.from) commit(done.node, done.to);
    };
  };

  // A cancelled drag puts the pictures back where they were.
  const cancel = () => {
    const done = drag;
    stopDrag();
    if (done?.lifted) reset();
  };
  const pointercancel = (event: PointerEvent) => { if (event.pointerId === drag?.pointerId) cancel(); };
  const escape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !drag?.lifted) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    cancel();
  };

  // The list lets the browser scroll vertically, so a lifted touch drag holds it still.
  const touchmove = (event: TouchEvent) => { if (drag?.lifted) event.preventDefault(); };
  const contextmenu = (event: Event) => { if (drag) event.preventDefault(); };

  const pointerdown = (event: PointerEvent) => {
    const target = event.target as HTMLElement;
    const node = target.closest<HTMLElement>(ITEM);
    if (drag || list.dataset.dragging || event.button !== 0 || !node || target.closest('input, .dialkit-version-thumb-delete')) return;
    const current: Drag = {
      node,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      start: toList(event.clientX, event.clientY),
      offset: { x: 0, y: 0 },
      from: items().indexOf(node),
      to: items().indexOf(node),
      slots: [],
      lifted: false,
    };
    if (event.pointerType === 'touch') current.hold = window.setTimeout(() => { if (drag === current) lift(current); }, LONG_PRESS_MS);
    drag = current;
    document.addEventListener('pointermove', pointermove);
    document.addEventListener('pointerup', pointerup);
    document.addEventListener('pointercancel', pointercancel);
    document.addEventListener('keydown', escape, true);
  };

  const keydown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const node = target.closest<HTMLElement>(ITEM);
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
    if (!event.altKey || event.metaKey || event.ctrlKey || !step || !node || target.closest('input')) return;
    event.preventDefault();
    event.stopPropagation();
    const nodes = items();
    const to = Math.min(Math.max(nodes.indexOf(node) + step, 0), nodes.length - 1);
    if (nodes[to] === node) return;
    commit(node, to);
    // Moving a node drops its focus; keep it on the moved version.
    node.querySelector('button')?.focus({ preventScroll: true });
  };

  list.addEventListener('pointerdown', pointerdown);
  list.addEventListener('touchmove', touchmove, { passive: false });
  list.addEventListener('contextmenu', contextmenu);
  list.addEventListener('keydown', keydown);
  return () => {
    if (drag?.lifted) reset();
    stopDrag();
    list.removeEventListener('pointerdown', pointerdown);
    list.removeEventListener('touchmove', touchmove);
    list.removeEventListener('contextmenu', contextmenu);
    list.removeEventListener('keydown', keydown);
  };
}
