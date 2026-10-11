/** Include the panel's chrome in explicit border-box heights, independent of host CSS resets. */
declare function measurePanelHeight(content: HTMLElement): number;
/** Keep nested panel headers below the root's title and optional toolbar. */
declare function observePanelHeader(folder: HTMLElement): () => void;
/** One clock for section content, its toolbar, and the visible toolkit height.
 * Interpolating the already-capped height keeps a bottom-anchored toolkit moving
 * down immediately, instead of waiting for off-screen content to fold first.
 */
declare function createPanelSectionTransition(folder: HTMLElement, initiallyOpen: boolean, onSettled?: (open: boolean) => void): {
    setOpen(next: boolean): void;
    destroy(): void;
};

export { createPanelSectionTransition, measurePanelHeight, observePanelHeader };
