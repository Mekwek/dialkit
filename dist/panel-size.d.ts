/** Include the panel's chrome in explicit border-box heights, independent of host CSS resets. */
declare function measurePanelHeight(content: HTMLElement): number;
/** Keep nested folder headers below a panel's title and optional toolbar. */
declare function observePanelHeader(folder: HTMLElement): () => void;
/**
 * The scroll fades for browsers without CSS scroll-state queries. Marks
 * pinned folder headers (`data-stuck`) and a panel with more rows below
 * (`data-more`), which theme.css reads like the queries. Where the queries
 * exist, it does nothing. One passive scroll listener and a size observer,
 * at most one pass a frame: reads first, then writes.
 */
declare function observeScrollFades(root: HTMLElement): () => void;
/** One clock for section content, its toolbar, and the visible toolkit height.
 * Interpolating the already-capped height keeps a bottom-anchored toolkit moving
 * down immediately, instead of waiting for off-screen content to fold first.
 */
declare function createPanelSectionTransition(folder: HTMLElement, initiallyOpen: boolean): {
    setOpen(next: boolean): void;
    destroy(): void;
};

export { createPanelSectionTransition, measurePanelHeight, observePanelHeader, observeScrollFades };
