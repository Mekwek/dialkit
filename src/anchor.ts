import { optionKeyIndex } from './control-keyboard';

export type AnchorValue = {
  x: 'left' | 'center' | 'right';
  y: 'top' | 'center' | 'bottom';
};

export type AnchorConfig = {
  type: 'anchor';
  /** Omitted axes default to 'center'. */
  default?: Partial<AnchorValue>;
};

/** Columns left to right and rows top to bottom. */
export const ANCHOR_COLUMNS: readonly AnchorValue['x'][] = ['left', 'center', 'right'];
export const ANCHOR_ROWS: readonly AnchorValue['y'][] = ['top', 'center', 'bottom'];

function oneOf<T extends string>(options: readonly T[], value: unknown, fallback: T): T {
  return options.includes(value as T) ? value as T : fallback;
}

/** Invalid or missing axes fall back to the configured default, then to 'center'. */
export function normalizeAnchorValue(value: unknown, config: Pick<AnchorConfig, 'default'> = {}): AnchorValue {
  const input = typeof value === 'object' && value !== null ? value as Partial<AnchorValue> : {};
  return {
    x: oneOf(ANCHOR_COLUMNS, input.x, oneOf(ANCHOR_COLUMNS, config.default?.x, 'center')),
    y: oneOf(ANCHOR_ROWS, input.y, oneOf(ANCHOR_ROWS, config.default?.y, 'center')),
  };
}

/** "Top left", "Center", "Bottom center", … */
export function anchorLabel({ x, y }: AnchorValue): string {
  const text = x === 'center' && y === 'center' ? 'center' : `${y} ${x}`;
  return text[0].toUpperCase() + text.slice(1);
}

/** Arrow keys move one cell and stop at the edges; Home and End go to the first and last cells. */
export function anchorValueFromKey(value: AnchorValue, key: string): AnchorValue | undefined {
  const column = ANCHOR_COLUMNS.indexOf(value.x);
  const row = ANCHOR_ROWS.indexOf(value.y);
  const vertical = key === 'ArrowUp' || key === 'ArrowDown';
  const horizontal = key === 'ArrowLeft' || key === 'ArrowRight';
  const nextColumn = vertical ? column : optionKeyIndex(key, column, ANCHOR_COLUMNS.length);
  const nextRow = horizontal ? row : optionKeyIndex(key, row, ANCHOR_ROWS.length);
  if (nextColumn === undefined || nextRow === undefined) return undefined;
  return { x: ANCHOR_COLUMNS[nextColumn], y: ANCHOR_ROWS[nextRow] };
}
