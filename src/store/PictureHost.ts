/**
 * The elements of one shown tile: the box the picture goes in, and the tile
 * button around it. `live` is set on every picture in the grid: while it
 * returns true, the picture's version is the active version, and the picture
 * must show exactly what the page shows, because the grid hands off from this
 * picture to the page.
 */
export type PictureParts = { picture: HTMLElement; tile: HTMLElement; live?: () => boolean };

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
export type PictureHost = {
  attach?: (itemId: string, parts: PictureParts) => (() => void) | void;
};

type Listener = () => void;

type PictureHostState = {
  host: PictureHost;
  listeners: Set<Listener>;
  /** The last family `showPictureFamily` named. */
  family: string | null;
  familyListeners: Set<Listener>;
  /** The family `setActivePictureFamily` named. */
  activeFamily: string | null;
  activeFamilyListeners: Set<Listener>;
};

/**
 * One state for every copy of this module: each entry (React, Solid, Vue,
 * Svelte, vanilla) bundles its own, so a host set through one still reaches
 * a control drawn by another.
 */
const STATE_KEY = Symbol.for('dialkit.pictureHost');

function state(): PictureHostState {
  const scope = globalThis as unknown as Record<symbol, PictureHostState | undefined>;
  let current = scope[STATE_KEY];
  if (!current) {
    current = { host: {}, listeners: new Set(), family: null, familyListeners: new Set(), activeFamily: null, activeFamilyListeners: new Set() };
    scope[STATE_KEY] = current;
  }
  return current;
}

/** Sets the host, replacing the previous one. `setPictureHost({})` removes it. */
export function setPictureHost(host: PictureHost): void {
  const current = state();
  current.host = { ...host };
  current.listeners.forEach(listener => listener());
}

export function getPictureHost(): PictureHost {
  return state().host;
}

/** Calls `listener` when the host changes. Returns the unsubscribe. */
export function subscribePictureHost(listener: Listener): () => void {
  const listeners = state().listeners;
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Opens a family in every pictures control, also one mounted later. A host
 * calls it when what it shows belongs to a family but matches no tile, so no
 * selection can name the family. Every call opens the family again, so it
 * also closes a family the user opened since.
 */
export function showPictureFamily(id: string): void {
  const current = state();
  current.family = id;
  current.familyListeners.forEach(listener => listener());
}

export function getShownPictureFamily(): string | null {
  return state().family;
}

/** Calls `listener` on every `showPictureFamily`. Returns the unsubscribe. */
export function subscribePictureFamily(listener: Listener): () => void {
  const listeners = state().familyListeners;
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Marks the family of what the host shows now, in every pictures control, also
 * one mounted later. The mark stays apart from the open family: a user can
 * open any family without moving it.
 */
export function setActivePictureFamily(id: string | null): void {
  const current = state();
  if (current.activeFamily === id) return;
  current.activeFamily = id;
  current.activeFamilyListeners.forEach(listener => listener());
}

export function getActivePictureFamily(): string | null {
  return state().activeFamily;
}

/** Calls `listener` when the marked family changes. Returns the unsubscribe. */
export function subscribeActivePictureFamily(listener: Listener): () => void {
  const listeners = state().activeFamilyListeners;
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
