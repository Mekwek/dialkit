import { PictureFamily, PicturesValue } from './pictures.js';

type PictureListControlProps = {
    label: string;
    families: PictureFamily[];
    /** The selected tile's id. It only marks that tile: a click never changes it. */
    value: PicturesValue;
    /** A tile was clicked: the app switches to that preset, then writes the new value. */
    onPick: (id: string) => void;
    /** A short sentence about the control, shown while the hint key is held. Families and tiles have their own. */
    hint?: string;
};
/**
 * Families of presets as accordion rows: each row shows its family's name,
 * a badge with its number of presets and a chevron. At most one family is
 * open; clicking the open row closes it. An open family shows its presets
 * as a grid of tiles (a picture box with the preset's name under it). A
 * family opens and closes with the same spring as a folder.
 *
 * The family holding the first selection opens, on mount or when that
 * selection arrives later, unless the user opened or closed a family
 * first. With no selection, the active family opens. After that the open
 * family is the user's and the host's (`showPictureFamily`): a new value or
 * a new active family never opens or closes one.
 *
 * The control is controlled. A tile click calls `onPick`; only `value` moves
 * the selected mark. The picture box of every shown tile goes to the picture
 * host (`setPictureHost`), which draws into it. A closing family keeps its
 * tiles, and their pictures, until its body has closed.
 */
declare function mountPictureListControl(host: HTMLElement, initial: PictureListControlProps): {
    update(next: PictureListControlProps): void;
    destroy(): void;
};

export { type PictureListControlProps, mountPictureListControl };
