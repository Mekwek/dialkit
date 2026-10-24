/**
 * The layer list control's value: the rows, top first, and the selected row.
 *
 * The app owns the layers. It writes the whole value (labels follow the
 * layers' own text), and the control writes back a new value for the three
 * things a user changes in place: the selection, a row's eye and the order.
 * Adding, duplicating and deleting create or remove layers, so the control
 * sends them as actions instead (`layerAction`), and the app writes the new
 * value.
 */

export type LayerItem = {
  /** The layer's id: it stays with the row through reordering. */
  id: string;
  /** The row's name. */
  label: string;
  /** Hidden with its eye: the row shows its eye crossed out, and dims. */
  hidden?: boolean;
  /**
   * Not on the canvas right now for another reason the app knows (outside
   * its timing, for example), given as that reason. The row stays normal:
   * only its eye is less bright than on a row whose layer is on the canvas,
   * and the row's hint gives the reason.
   */
  offCanvas?: string;
};

export type LayersValue = {
  items: LayerItem[];
  selected: string | null;
};

export type LayersConfig = {
  type: 'layers';
  default?: LayersValue;
  /** The add button's text. Default "+ Add". */
  addLabel?: string;
  /** Turns the add button off; its text should say why. */
  addDisabled?: boolean;
  /** The text shown in place of the list when it has no rows. */
  empty?: string;
};

export type LayerActionKind = 'add' | 'duplicate' | 'delete';

const ACTION_SEPARATOR = ':';

/**
 * The action path a layer list sends: `<path>:add`, or
 * `<path>:duplicate:<id>` and `<path>:delete:<id>` for one row.
 */
export function layerAction(path: string, kind: LayerActionKind, id?: string): string {
  return id === undefined ? `${path}${ACTION_SEPARATOR}${kind}` : `${path}${ACTION_SEPARATOR}${kind}${ACTION_SEPARATOR}${id}`;
}

/** Reads an action path sent by the layer list at `path`, or null for any other action. */
export function parseLayerAction(path: string, action: string): { kind: LayerActionKind; id?: string } | null {
  const prefix = `${path}${ACTION_SEPARATOR}`;
  if (!action.startsWith(prefix)) return null;
  const rest = action.slice(prefix.length);
  const cut = rest.indexOf(ACTION_SEPARATOR);
  const kind = cut === -1 ? rest : rest.slice(0, cut);
  if (kind === 'add') return cut === -1 ? { kind } : null;
  if ((kind === 'duplicate' || kind === 'delete') && cut !== -1 && cut < rest.length - 1) {
    return { kind, id: rest.slice(cut + 1) };
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A complete, valid value: rows without a string id or label are dropped,
 * repeated ids keep their first row, and a selection that names no row
 * becomes null.
 */
export function normalizeLayersValue(value: unknown, fallback: LayersValue = { items: [], selected: null }): LayersValue {
  if (!isRecord(value) || !Array.isArray(value.items)) return { items: fallback.items.map(item => ({ ...item })), selected: fallback.selected };
  const seen = new Set<string>();
  const items: LayerItem[] = [];
  for (const raw of value.items) {
    if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id === '' || typeof raw.label !== 'string' || seen.has(raw.id)) continue;
    seen.add(raw.id);
    const item: LayerItem = { id: raw.id, label: raw.label };
    if (raw.hidden === true) item.hidden = true;
    if (typeof raw.offCanvas === 'string' && raw.offCanvas !== '') item.offCanvas = raw.offCanvas;
    items.push(item);
  }
  const selected = typeof value.selected === 'string' && seen.has(value.selected) ? value.selected : null;
  return { items, selected };
}

export function sameLayersValue(a: unknown, b: unknown): boolean {
  if (!isRecord(a) || !isRecord(b) || !Array.isArray(a.items) || !Array.isArray(b.items)) return false;
  if (a.selected !== b.selected || a.items.length !== b.items.length) return false;
  return a.items.every((item, i) => {
    const other = (b.items as unknown[])[i];
    return isRecord(item) && isRecord(other) && item.id === other.id && item.label === other.label &&
      !!item.hidden === !!other.hidden && (item.offCanvas ?? '') === (other.offCanvas ?? '');
  });
}

/** The value with one row moved from `from` to `to`. */
export function moveLayer(value: LayersValue, from: number, to: number): LayersValue {
  const items = value.items.slice();
  const [moved] = items.splice(from, 1);
  if (moved) items.splice(to, 0, moved);
  return { items, selected: value.selected };
}
