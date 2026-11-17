/**
 * Keeps two distances on `scroller` for the `.dialkit-edge-fade` class:
 * `--dial-edge-above` is how far the content reaches above the view, and
 * `--dial-edge-below` how far it reaches below. Follows the scroll, and the
 * scroller and its children as they resize or change. While `paused` answers
 * true the distances stay as they are: a zoom inflates the scroll height.
 * Returns the stop.
 */
export function observeScrollEdges(scroller: HTMLElement, paused: () => boolean = () => false): () => void {
  let frame = 0;
  let measured: { above: string; below: string } | null = null;
  const measure = () => {
    const { scrollTop, clientHeight, scrollHeight } = scroller;
    measured = {
      above: `${Math.max(0, scrollTop)}px`,
      below: `${Math.max(0, scrollHeight - clientHeight - scrollTop)}px`,
    };
  };
  // Only a changed distance is written: a write restyles the whole list.
  const write = () => {
    if (!measured) return;
    for (const [name, value] of [
      ['--dial-edge-above', measured.above],
      ['--dial-edge-below', measured.below],
    ] as const) {
      if (scroller.style.getPropertyValue(name) !== value) scroller.style.setProperty(name, value);
    }
    measured = null;
  };
  const update = () => {
    frame = 0;
    if (paused()) {
      measured = null;
      return;
    }
    if (!measured) measure();
    write();
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  // A scroll or a new child makes the last measure old: the frame reads again.
  const changed = () => {
    measured = null;
    schedule();
  };
  // The observer runs just after the browser lays the page out, so a read
  // there costs nothing, and the write waits for the next frame. A write
  // here would make every later observer's read lay the page out again,
  // and a read from a frame callback after a host's style writes does too.
  const resize = new ResizeObserver(() => {
    if (paused()) return;
    measure();
    schedule();
  });
  const watchChildren = () => {
    for (const child of scroller.children) resize.observe(child);
  };
  const children = new MutationObserver(() => {
    watchChildren();
    changed();
  });
  resize.observe(scroller);
  children.observe(scroller, { childList: true });
  scroller.addEventListener('scroll', changed, { passive: true });
  watchChildren();
  update();
  return () => {
    resize.disconnect();
    children.disconnect();
    scroller.removeEventListener('scroll', changed);
    cancelAnimationFrame(frame);
    scroller.style.removeProperty('--dial-edge-above');
    scroller.style.removeProperty('--dial-edge-below');
  };
}
