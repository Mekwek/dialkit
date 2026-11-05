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
type PictureItem = {
    /** The preset's id: the value while this tile is selected. Unique across every family. */
    id: string;
    /** The text under the tile's picture. */
    label: string;
    /** A short sentence about the preset, shown while the hint key is held. */
    hint?: string;
};
type PictureFamily = {
    id: string;
    /** The family row's text. */
    label: string;
    items: PictureItem[];
    /** A short sentence about the family, shown on its row while the hint key is held. */
    hint?: string;
};
type PicturesConfig = {
    type: 'pictures';
    families: PictureFamily[];
    /** The selected tile's id before the app writes one. Default `null`, no tile selected. */
    default?: string | null;
};
/** The selected tile's id, or `null` when no tile is selected. */
type PicturesValue = string | null;
/** The action path a pictures control sends when its tile `id` is clicked: `<path>:pick:<id>`. */
declare function pictureAction(path: string, id: string): string;
/** Reads an action path sent by the pictures control at `path`, or null for any other action. */
declare function parsePictureAction(path: string, action: string): {
    id: string;
} | null;
/** The id of the family holding the tile `id`, or null. */
declare function findPictureFamily(families: readonly PictureFamily[], id: string | null): string | null;
/**
 * Valid families: a family or tile without a string id and label is dropped,
 * a repeated family id keeps its first family, and a tile id already used
 * (in any family) keeps its first tile.
 */
declare function normalizePictureFamilies(value: unknown): PictureFamily[];
/** A valid value: a non-empty string id, else null. */
declare function normalizePicturesValue(value: unknown): PicturesValue;

export { type PictureFamily, type PictureItem, type PicturesConfig, type PicturesValue, findPictureFamily, normalizePictureFamilies, normalizePicturesValue, parsePictureAction, pictureAction };
