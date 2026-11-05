/**
 * The pictures control: rows of families that open like an accordion, each
 * showing its child presets as a grid of picture tiles.
 *
 * The app owns the presets. The control's value is the id of the selected
 * tile, and the control never changes it on its own: a click on a tile sends
 * `pictureAction(path, id)`, the app switches to that preset, then writes the
 * new value. The pictures themselves are the app's too: DialKit gives each
 * tile's picture box to the picture host (`setPictureHost`) and draws nothing
 * in it but a placeholder.
 */

export type PictureItem = {
  /** The preset's id: the value while this tile is selected. Unique across every family. */
  id: string;
  /** The text under the tile's picture. */
  label: string;
  /** A short sentence about the preset, shown while the hint key is held. */
  hint?: string;
};

export type PictureFamily = {
  id: string;
  /** The family row's text. */
  label: string;
  items: PictureItem[];
  /** A short sentence about the family, shown on its row while the hint key is held. */
  hint?: string;
};

export type PicturesConfig = {
  type: 'pictures';
  families: PictureFamily[];
  /** The selected tile's id before the app writes one. Default `null`, no tile selected. */
  default?: string | null;
};

/** The selected tile's id, or `null` when no tile is selected. */
export type PicturesValue = string | null;

const ACTION_SEPARATOR = ':';
const PICK = 'pick';

/** The action path a pictures control sends when its tile `id` is clicked: `<path>:pick:<id>`. */
export function pictureAction(path: string, id: string): string {
  return `${path}${ACTION_SEPARATOR}${PICK}${ACTION_SEPARATOR}${id}`;
}

/** Reads an action path sent by the pictures control at `path`, or null for any other action. */
export function parsePictureAction(path: string, action: string): { id: string } | null {
  const prefix = `${path}${ACTION_SEPARATOR}${PICK}${ACTION_SEPARATOR}`;
  if (!action.startsWith(prefix) || action.length === prefix.length) return null;
  return { id: action.slice(prefix.length) };
}

/** The id of the family holding the tile `id`, or null. */
export function findPictureFamily(families: readonly PictureFamily[], id: string | null): string | null {
  if (id === null) return null;
  return families.find(family => family.items.some(item => item.id === id))?.id ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value !== '';

/**
 * Valid families: a family or tile without a string id and label is dropped,
 * a repeated family id keeps its first family, and a tile id already used
 * (in any family) keeps its first tile.
 */
export function normalizePictureFamilies(value: unknown): PictureFamily[] {
  if (!Array.isArray(value)) return [];
  const familyIds = new Set<string>();
  const itemIds = new Set<string>();
  const families: PictureFamily[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || !nonEmpty(raw.id) || typeof raw.label !== 'string' || familyIds.has(raw.id)) continue;
    familyIds.add(raw.id);
    const items: PictureItem[] = [];
    for (const rawItem of Array.isArray(raw.items) ? raw.items : []) {
      if (!isRecord(rawItem) || !nonEmpty(rawItem.id) || typeof rawItem.label !== 'string' || itemIds.has(rawItem.id)) continue;
      itemIds.add(rawItem.id);
      const item: PictureItem = { id: rawItem.id, label: rawItem.label };
      if (nonEmpty(rawItem.hint)) item.hint = rawItem.hint;
      items.push(item);
    }
    const family: PictureFamily = { id: raw.id, label: raw.label, items };
    if (nonEmpty(raw.hint)) family.hint = raw.hint;
    families.push(family);
  }
  return families;
}

/** A valid value: a non-empty string id, else null. */
export function normalizePicturesValue(value: unknown): PicturesValue {
  return nonEmpty(value) ? value : null;
}
