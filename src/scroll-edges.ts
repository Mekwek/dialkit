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
  const update = () => {
    frame = 0;
    if (paused()) return;
    const { scrollTop, clientHeight, scrollHeight } = scroller;
    scroller.style.setProperty('--dial-edge-above', `${Math.max(0, scrollTop)}px`);
    scroller.style.setProperty('--dial-edge-below', `${Math.max(0, scrollHeight - clientHeight - scrollTop)}px`);
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const resize = new ResizeObserver(schedule);
  const watchChildren = () => {
    for (const child of scroller.children) resize.observe(child);
  };
  const children = new MutationObserver(() => {
    watchChildren();
    schedule();
  });
  resize.observe(scroller);
  children.observe(scroller, { childList: true });
  scroller.addEventListener('scroll', schedule, { passive: true });
  watchChildren();
  update();
  return () => {
    resize.disconnect();
    children.disconnect();
    scroller.removeEventListener('scroll', schedule);
    cancelAnimationFrame(frame);
    scroller.style.removeProperty('--dial-edge-above');
    scroller.style.removeProperty('--dial-edge-below');
  };
}
