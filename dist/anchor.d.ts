type AnchorValue = {
    x: 'left' | 'center' | 'right';
    y: 'top' | 'center' | 'bottom';
};
type AnchorConfig = {
    type: 'anchor';
    /** Omitted axes default to 'center'. */
    default?: Partial<AnchorValue>;
};
/** Columns left to right and rows top to bottom. */
declare const ANCHOR_COLUMNS: readonly AnchorValue['x'][];
declare const ANCHOR_ROWS: readonly AnchorValue['y'][];
/** Invalid or missing axes fall back to the configured default, then to 'center'. */
declare function normalizeAnchorValue(value: unknown, config?: Pick<AnchorConfig, 'default'>): AnchorValue;
/** "Top left", "Center", "Bottom center", … */
declare function anchorLabel({ x, y }: AnchorValue): string;
/** Arrow keys move one cell and stop at the edges; Home and End go to the first and last cells. */
declare function anchorValueFromKey(value: AnchorValue, key: string): AnchorValue | undefined;

export { ANCHOR_COLUMNS, ANCHOR_ROWS, type AnchorConfig, type AnchorValue, anchorLabel, anchorValueFromKey, normalizeAnchorValue };
