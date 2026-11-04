export { PictureFamily, PictureItem, PicturesConfig, PicturesValue, findPictureFamily, normalizePictureFamilies, normalizePicturesValue, parsePictureAction, pictureAction } from './pictures.js';

/** The elements of one shown tile: the box the picture goes in, and the tile button around it. */
type PictureParts = {
    picture: HTMLElement;
    tile: HTMLElement;
};
/**
 * What a host gives every pictures control: the pictures themselves.
 *
 * `attach` runs when a tile's picture box is shown (its family opens, or the
 * control mounts with it open), with the tile's item id and its elements.
 * The host draws into `picture` (for example by adding a canvas) and may
 * return a cleanup, which runs when the tile is no longer shown: its family
 * closes, the item is removed, or the control is destroyed. When the host
 * changes, every shown tile is cleaned up and attached again.
 *
 * Without a host (or after `setPictureHost({})`), the picture box shows its
 * placeholder background.
 */
type PictureHost = {
    attach?: (itemId: string, parts: PictureParts) => (() => void) | void;
};
type Listener = () => void;
/** Sets the host, replacing the previous one. `setPictureHost({})` removes it. */
declare function setPictureHost(host: PictureHost): void;
declare function getPictureHost(): PictureHost;
/** Calls `listener` when the host changes. Returns the unsubscribe. */
declare function subscribePictureHost(listener: Listener): () => void;
/**
 * Opens a family in every pictures control, also one mounted later. A host
 * calls it when what it shows belongs to a family but matches no tile, so no
 * selection can name the family. Every call opens the family again, so it
 * also closes a family the user opened since.
 */
declare function showPictureFamily(id: string): void;
declare function getShownPictureFamily(): string | null;
/** Calls `listener` on every `showPictureFamily`. Returns the unsubscribe. */
declare function subscribePictureFamily(listener: Listener): () => void;

export { type PictureHost, type PictureParts, getPictureHost, getShownPictureFamily, setPictureHost, showPictureFamily, subscribePictureFamily, subscribePictureHost };
