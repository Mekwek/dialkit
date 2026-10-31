/** The prefix a new version is numbered under: none for a panel's "V2", or "Sequence" for a timeline's "Sequence 2". */
declare function versionNamePrefix(noun?: 'version' | 'sequence'): string | undefined;
/**
 * Shared row behavior for version menus: drag a saved version (or press Alt+Arrow on it)
 * to reorder, with the rows in between sliding aside, and open a row's actions from its
 * menu icon. On touch a drag starts with a long-press, so a swipe still scrolls the menu.
 * Adapters render the rows and pass the new order to the store.
 */
declare function observePresetMenu(getPopup: () => HTMLElement | null | undefined, reorder: (presetIds: string[]) => void): () => void;

export { observePresetMenu, versionNamePrefix };
