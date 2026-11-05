import { animateSpring } from './animation';
import { ICON_CHEVRON } from './icons';
import {
  findPictureFamily, normalizePictureFamilies, normalizePicturesValue,
  type PictureFamily, type PictureItem, type PicturesValue,
} from './pictures';
import {
  getActivePictureFamily, getPictureHost, getShownPictureFamily, subscribeActivePictureFamily,
  subscribePictureFamily, subscribePictureHost,
} from './store/PictureHost';
import { setHint } from './hints';
import { element, icon } from './vanilla/dom';

export type PictureListControlProps = {
  label: string;
  families: PictureFamily[];
  /** The selected tile's id. It only marks that tile: a click never changes it. */
  value: PicturesValue;
  /** A tile was clicked: the app switches to that preset, then writes the new value. */
  onPick: (id: string) => void;
  /** A short sentence about the control, shown while the hint key is held. Families and tiles have their own. */
  hint?: string;
};

type Tile = {
  id: string;
  root: HTMLButtonElement;
  picture: HTMLDivElement;
  label: HTMLSpanElement;
  /** The host's attach ran for this tile since it was shown (or since the host last changed). */
  attached: boolean;
  cleanup?: () => void;
};

type FamilyRow = {
  root: HTMLDivElement;
  row: HTMLButtonElement;
  name: HTMLSpanElement;
  count: HTMLSpanElement;
  chevron: SVGSVGElement;
  /** The part that opens and closes. Its height springs; `inner` holds the tiles. */
  body: HTMLDivElement;
  inner: HTMLDivElement;
  /** The grid of tiles inside `inner`. */
  grid: HTMLDivElement;
  /** This family's tiles. They stay while the body closes, then go. */
  tiles: Map<string, Tile>;
  /** Open as last rendered; undefined before the first render. */
  shown?: boolean;
  animation?: Animation;
  chevronAnimation?: Animation;
};

let instances = 0;

/** The chevron's turn: it points right while closed and down while open. */
const chevronAngle = (open: boolean) => open ? 0 : -90;

/** Puts `node` right after `previous` (or first in `parent`), moving it only when it is out of place. */
function place(parent: HTMLElement, node: HTMLElement, previous: HTMLElement | null) {
  const next: Element | null = previous ? previous.nextElementSibling : parent.firstElementChild;
  if (next === node) return;
  if (previous) previous.after(node);
  else parent.prepend(node);
}

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
export function mountPictureListControl(host: HTMLElement, initial: PictureListControlProps) {
  let props = initial;
  let families = normalizePictureFamilies(props.families);
  let value = normalizePicturesValue(props.value);
  const knownFamily = (id: string | null) => (families.some(family => family.id === id) ? id : null);
  let open = findPictureFamily(families, value) ?? knownFamily(getActivePictureFamily()) ?? knownFamily(getShownPictureFamily());
  /** The user opened or closed a family: nothing opens one by itself now. */
  let chosen = false;
  const openFirst = () => {
    if (open === null && !chosen) open = findPictureFamily(families, value) ?? knownFamily(getActivePictureFamily());
  };
  let destroyed = false;
  const uid = `dialkit-pictures-${++instances}`;
  let bodies = 0;

  const root = element('div', 'dialkit-pictures');
  root.setAttribute('role', 'group');
  host.append(root);

  const familyById = new Map<string, FamilyRow>();
  const eachTile = (fn: (tile: Tile) => void) => familyById.forEach(entry => entry.tiles.forEach(fn));

  // ── The picture host ──
  const attach = (tile: Tile) => {
    if (tile.attached) return;
    tile.attached = true;
    const hostAttach = getPictureHost().attach;
    if (!hostAttach) return;
    try {
      const cleanup = hostAttach(tile.id, { picture: tile.picture, tile: tile.root });
      if (typeof cleanup === 'function') tile.cleanup = cleanup;
    } catch (error) {
      console.error(error);
    }
  };
  const detach = (tile: Tile) => {
    const cleanup = tile.cleanup;
    tile.cleanup = undefined;
    tile.attached = false;
    if (!cleanup) return;
    try { cleanup(); } catch (error) { console.error(error); }
  };
  // New tiles attach once the current task's DOM work is done, so a control
  // mounted into a wrapper that is placed afterwards gives the host tiles
  // that are in the page.
  let attachQueued = false;
  const queueAttach = () => {
    if (attachQueued) return;
    attachQueued = true;
    queueMicrotask(() => {
      attachQueued = false;
      if (!destroyed) eachTile(attach);
    });
  };
  const unsubscribeHost = subscribePictureHost(() => {
    eachTile(detach);
    eachTile(attach);
  });

  const removeTile = (entry: FamilyRow, tile: Tile) => {
    detach(tile);
    setHint(tile.root, undefined);
    tile.root.remove();
    entry.tiles.delete(tile.id);
  };

  const buildTile = (id: string): Tile => {
    const tileRoot = element('button', 'dialkit-pictures-tile');
    const picture = element('div', 'dialkit-pictures-picture');
    const label = element('span', 'dialkit-pictures-label');
    tileRoot.append(picture, label);
    tileRoot.addEventListener('click', () => props.onPick(id));
    return { id, root: tileRoot, picture, label, attached: false };
  };

  const paintTile = (tile: Tile, item: PictureItem) => {
    const selected = value === item.id;
    tile.label.textContent = item.label;
    tile.root.setAttribute('aria-label', item.label);
    tile.root.setAttribute('aria-pressed', String(selected));
    tile.root.toggleAttribute('data-active', selected);
    setHint(tile.root, item.hint);
  };

  const buildFamily = (id: string): FamilyRow => {
    const familyRoot = element('div', 'dialkit-pictures-family');
    const row = element('button', 'dialkit-pictures-row');
    const name = element('span', 'dialkit-pictures-name');
    const count = element('span', 'dialkit-pictures-count');
    count.setAttribute('aria-hidden', 'true');
    const chevron = icon(ICON_CHEVRON, 'dialkit-pictures-chevron');
    row.append(name, count, chevron);
    const body = element('div', 'dialkit-pictures-body');
    const inner = element('div', 'dialkit-pictures-inner');
    const grid = element('div', 'dialkit-pictures-grid');
    inner.append(grid);
    body.append(inner);
    body.id = `${uid}-${++bodies}`;
    body.hidden = true;
    row.setAttribute('aria-controls', body.id);
    familyRoot.append(row, body);
    row.addEventListener('click', () => {
      chosen = true;
      open = open === id ? null : id;
      render();
    });
    return { root: familyRoot, row, name, count, chevron, body, inner, grid, tiles: new Map() };
  };

  /** Shows a family's tiles in its body, keeping every tile that stays shown. */
  const renderBody = (entry: FamilyRow, family: PictureFamily) => {
    const items = family.items;
    const shown = new Set(items.map(item => item.id));
    for (const tile of [...entry.tiles.values()]) if (!shown.has(tile.id)) removeTile(entry, tile);

    let newTiles = false;
    let previousTile: HTMLElement | null = null;
    for (const item of items) {
      let tile = entry.tiles.get(item.id);
      if (!tile) {
        tile = buildTile(item.id);
        entry.tiles.set(item.id, tile);
        newTiles = true;
      }
      paintTile(tile, item);
      place(entry.grid, tile.root, previousTile);
      previousTile = tile.root;
    }
    if (newTiles) queueAttach();
  };

  /** Empties a closed family's body: its tiles leave the picture host. */
  const clearBody = (entry: FamilyRow) => {
    for (const tile of [...entry.tiles.values()]) removeTile(entry, tile);
  };

  /** Opens or closes a family's body (`entry.shown`), with the folder spring when `spring` is set and the control is in the page. */
  const setBodyOpen = (entry: FamilyRow, spring: boolean) => {
    const isOpen = entry.shown === true;
    const animate = spring && root.getBoundingClientRect().width > 0;
    const from = entry.body.hidden ? 0 : entry.body.getBoundingClientRect().height;
    entry.animation?.cancel();
    entry.animation = undefined;
    entry.body.hidden = false;
    entry.body.inert = !isOpen;
    const to = isOpen ? entry.body.scrollHeight : 0;
    const finish = () => {
      if (isOpen || entry.shown) return;
      entry.body.hidden = true;
      entry.body.inert = false;
      clearBody(entry);
    };
    entry.animation = animate
      ? animateSpring(entry.body, p => ({ height: `${from + (to - from) * p}px`, overflow: 'hidden' }))
      : undefined;
    if (entry.animation) entry.animation.onfinish = finish;
    else finish();

    entry.chevronAnimation?.cancel();
    entry.chevron.style.transform = `rotate(${chevronAngle(isOpen)}deg)`;
    if (animate) {
      const start = chevronAngle(!isOpen);
      const end = chevronAngle(isOpen);
      entry.chevronAnimation = animateSpring(entry.chevron, p => ({ transform: `rotate(${start + (end - start) * p}deg)` }), 0.35, 0.15);
    }
  };

  function render() {
    root.setAttribute('aria-label', props.label);
    setHint(root, props.hint);
    if (open !== null && !families.some(family => family.id === open)) open = null;

    const live = new Set(families.map(family => family.id));
    for (const [id, entry] of familyById) {
      if (live.has(id)) continue;
      entry.animation?.cancel();
      clearBody(entry);
      setHint(entry.row, undefined);
      entry.root.remove();
      familyById.delete(id);
    }

    let previous: HTMLElement | null = null;
    for (const family of families) {
      let entry = familyById.get(family.id);
      if (!entry) {
        entry = buildFamily(family.id);
        familyById.set(family.id, entry);
      }
      const isOpen = open === family.id;
      const count = family.items.length;
      entry.name.textContent = family.label;
      entry.count.textContent = String(count);
      entry.row.setAttribute('aria-label', `${family.label}, ${count} ${count === 1 ? 'preset' : 'presets'}`);
      entry.row.setAttribute('aria-expanded', String(isOpen));
      entry.root.toggleAttribute('data-open', isOpen);
      entry.row.toggleAttribute('data-active', getActivePictureFamily() === family.id);
      setHint(entry.row, family.hint);
      place(root, entry.root, previous);
      previous = entry.root;

      // A closing family keeps its tiles as they are until it has closed.
      if (isOpen || entry.tiles.size > 0) renderBody(entry, family);
      if (entry.shown !== isOpen) {
        const first = entry.shown === undefined;
        entry.shown = isOpen;
        setBodyOpen(entry, !first);
      }
    }
  }

  render();

  const unsubscribeFamily = subscribePictureFamily(() => {
    open = knownFamily(getShownPictureFamily()) ?? open;
    render();
  });
  const unsubscribeActiveFamily = subscribeActivePictureFamily(() => {
    openFirst();
    render();
  });

  return {
    update(next: PictureListControlProps) {
      props = next;
      families = normalizePictureFamilies(next.families);
      value = normalizePicturesValue(next.value);
      openFirst();
      render();
    },
    destroy() {
      destroyed = true;
      unsubscribeHost();
      unsubscribeFamily();
      unsubscribeActiveFamily();
      familyById.forEach(entry => {
        entry.animation?.cancel();
        entry.chevronAnimation?.cancel();
        clearBody(entry);
        setHint(entry.row, undefined);
      });
      setHint(root, undefined);
      root.remove();
    },
  };
}
