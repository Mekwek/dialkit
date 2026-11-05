// The version gallery (gallery.ts) for a host that draws its own pictures. It
// looks the same, and each thumbnail is a live picture instead of a capture: the
// host draws it through the picture host (store/PictureHost.ts), under the id
// `versionPictureId` gives, so nothing is captured or stored. It does everything
// the version menu does: pick, rename, lock, delete and reorder. Plain DOM, so
// every framework mounts the same thing. Save version and the grid button are
// their own row (`mountVersionActions`), so a folder can keep them shown while
// the pictures close.

import { DialStore } from '../store/DialStore';
import { HINTS, setHint } from '../hints';
import { ICON_CLOSE, ICON_GRID, ICON_LOCK, ICON_LOCK_OPEN, ICON_PLUS } from '../icons';
import { getPictureHost, subscribePictureHost, type PictureParts } from '../store/PictureHost';
import { element, icon, svg, type Mounted } from '../vanilla/dom';
import { deleteVersion, listVersions, renameVersion, selectVersion } from './controller';
import { openVersionGrid, type VersionGridHandle, type VersionGridOptions } from './grid';
import { observeVersionReorder } from './reorder';
import { BASE_VERSION, versionKey } from './thumbnails';

const PICTURE_PREFIX = 'version:';

/** The item id a version's picture has in the picture host. */
export function versionPictureId(key: string): string {
  return `${PICTURE_PREFIX}${key}`;
}

/** The version key in a picture id, or null for a picture of something else. */
export function versionOfPicture(itemId: string): string | null {
  return itemId.startsWith(PICTURE_PREFIX) ? itemId.slice(PICTURE_PREFIX.length) : null;
}

/** Gives a picture box to the picture host, again when the host changes. Returns the release. */
function holdPicture(itemId: string, parts: PictureParts): () => void {
  let cleanup: (() => void) | void;
  const attach = () => {
    cleanup?.();
    cleanup = getPictureHost().attach?.(itemId, parts);
  };
  attach();
  const stop = subscribePictureHost(attach);
  return () => { stop(); cleanup?.(); };
}

/** Calls `listener` when the versions of a panel, or the picked one, change. */
function subscribeVersions(panelId: string, listener: () => void): () => void {
  const stopPanel = DialStore.subscribe(panelId, listener);
  const stopGlobal = DialStore.subscribeGlobal(listener);
  return () => { stopPanel(); stopGlobal(); };
}

export interface VersionPicturesProps {
  panelId: string;
  /** True while the grid of every version is open. */
  gridOpen?: boolean;
}

export interface VersionActionsProps extends VersionPicturesProps {
  /** Opens or closes the grid. Without it, the grid button does not show. */
  onToggleGrid?: () => void;
}

/** The row with Save version and the grid button. */
export function mountVersionActions(host: HTMLElement, initial: VersionActionsProps): Mounted<VersionActionsProps> {
  let props = initial;

  const actions = element('div', 'dialkit-versions-actions');
  const save = element('button', 'dialkit-versions-button');
  save.dataset.primary = 'true';
  save.append(icon(ICON_PLUS, '', '0 0 24 24'), 'Save version');
  setHint(save, HINTS.saveVersion);
  save.addEventListener('click', () => DialStore.saveNewPreset(props.panelId));
  const toggle = element('button', 'dialkit-versions-button');
  toggle.dataset.icon = 'true';
  const grid = svg('svg', { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true' });
  for (const d of ICON_GRID) grid.append(svg('path', { d }));
  toggle.append(grid);
  setHint(toggle, HINTS.allVersions);
  toggle.addEventListener('click', () => props.onToggleGrid?.());
  actions.append(save, toggle);
  host.append(actions);

  function render() {
    const { panelId, gridOpen = false, onToggleGrid } = props;
    const versions = listVersions(panelId);
    save.hidden = !DialStore.isPresetsEditable(panelId);
    // The grid shows the versions it opened with, so saving waits for it to close.
    save.disabled = gridOpen;
    toggle.hidden = !(versions.length > 1 && onToggleGrid);
    toggle.setAttribute('aria-pressed', String(gridOpen));
    toggle.setAttribute('aria-label', `All versions (${versions.length})`);
    actions.hidden = save.hidden && toggle.hidden;
  }

  let stopStore = subscribeVersions(props.panelId, render);
  render();

  return {
    update(next) {
      if (next.panelId !== props.panelId) {
        stopStore();
        stopStore = subscribeVersions(next.panelId, render);
      }
      props = next;
      render();
    },
    destroy() {
      stopStore();
      setHint(save, undefined);
      setHint(toggle, undefined);
      actions.remove();
    },
  };
}

type Thumb = {
  node: HTMLElement;
  frame: HTMLButtonElement;
  label: HTMLElement;
  lock?: HTMLButtonElement;
  remove?: HTMLButtonElement;
  release: () => void;
};

export function mountVersionPictures(host: HTMLElement, initial: VersionPicturesProps): Mounted<VersionPicturesProps> {
  let props = initial;
  let editing: string | null = null;
  let shownActive: string | null = null;

  const root = element('div', 'dialkit-versions');
  root.dataset.list = 'true';
  const strip = element('div', 'dialkit-versions-strip');
  strip.setAttribute('role', 'listbox');
  strip.setAttribute('aria-label', 'Versions');
  root.append(strip);
  host.append(root);
  const thumbs = new Map<string, Thumb>();

  const createThumb = (key: string): Thumb => {
    const node = element('div', 'dialkit-version-thumb');
    node.dataset.version = key;
    setHint(node, HINTS.version);
    const frame = element('button', 'dialkit-version-thumb-frame');
    frame.setAttribute('role', 'option');
    // A click on the active version selects it again, so a host can act on it.
    frame.addEventListener('click', () => selectVersion(props.panelId, key));
    const picture = element('div', 'dialkit-version-thumb-picture');
    frame.append(picture);
    const label = element('span', 'dialkit-version-thumb-label');
    node.append(frame, label);
    const thumb: Thumb = { node, frame, label, release: holdPicture(versionPictureId(key), { picture, tile: frame }) };

    // The base version keeps its name, and can't be moved or deleted.
    if (key !== BASE_VERSION) {
      const startRename = () => { if (DialStore.isPresetsEditable(props.panelId)) rename(key, label); };
      label.addEventListener('dblclick', startRename);
      frame.addEventListener('keydown', (event) => { if (event.key === 'F2') startRename(); });
      thumb.lock = element('button', 'dialkit-version-thumb-delete dialkit-version-thumb-lock');
      thumb.lock.addEventListener('click', () => {
        const locked = !!DialStore.getPresets(props.panelId).find((preset) => preset.id === key)?.locked;
        DialStore.setPresetLocked(props.panelId, key, !locked);
      });
      thumb.remove = element('button', 'dialkit-version-thumb-delete');
      thumb.remove.append(icon(ICON_CLOSE));
      setHint(thumb.remove, HINTS.deleteVersion);
      thumb.remove.addEventListener('click', () => deleteVersion(props.panelId, key));
      node.append(thumb.lock, thumb.remove);
    }
    thumbs.set(key, thumb);
    return thumb;
  };

  const removeThumb = (thumb: Thumb) => {
    thumb.release();
    setHint(thumb.node, undefined);
    if (thumb.remove) setHint(thumb.remove, undefined);
    thumb.node.remove();
  };

  // Inline rename: Enter saves, Escape cancels, blur saves.
  const rename = (key: string, label: HTMLElement) => {
    if (editing) return;
    const current = listVersions(props.panelId).find((version) => version.key === key)?.name ?? '';
    const input = element('input', 'dialkit-version-thumb-label dialkit-version-thumb-input');
    input.value = current;
    input.setAttribute('aria-label', 'Version name');
    editing = key;
    let done = false;
    const end = (commit: boolean) => {
      if (done) return;
      done = true;
      editing = null;
      input.replaceWith(label);
      if (commit) renameVersion(props.panelId, key, input.value);
      render();
    };
    input.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Enter') end(true);
      else if (event.key === 'Escape') end(false);
    });
    input.addEventListener('blur', () => end(true));
    label.replaceWith(input);
    input.focus();
    input.select();
  };

  // Keeps the picked version in view, in the strip's own scroll only.
  const showActive = (node: HTMLElement) => {
    const top = node.offsetTop;
    const bottom = top + node.offsetHeight;
    if (top < strip.scrollTop) strip.scrollTop = top;
    else if (bottom > strip.scrollTop + strip.clientHeight) strip.scrollTop = bottom - strip.clientHeight;
  };

  function render() {
    const { panelId, gridOpen = false } = props;
    const versions = listVersions(panelId);
    const activeKey = versionKey(DialStore.getActivePresetId(panelId));
    const editable = DialStore.isPresetsEditable(panelId);
    const lockable = DialStore.isPresetsLockable(panelId);

    root.toggleAttribute('data-overview', gridOpen);
    // Pictures appear once there's something to compare.
    strip.hidden = versions.length < 2;

    const keys = new Set(versions.map((version) => version.key));
    for (const [key, thumb] of thumbs) {
      if (!keys.has(key)) { removeThumb(thumb); thumbs.delete(key); }
    }
    versions.forEach((version, index) => {
      const thumb = thumbs.get(version.key) ?? createThumb(version.key);
      const active = version.key === activeKey;
      const locked = !!version.locked;
      thumb.node.dataset.active = String(active);
      thumb.node.dataset.locked = String(locked);
      thumb.node.dataset.draggable = String(editable && version.key !== BASE_VERSION);
      thumb.frame.setAttribute('aria-selected', String(active));
      thumb.frame.setAttribute('aria-label', version.name);
      if (editing !== version.key) thumb.label.textContent = version.name;
      if (thumb.lock) {
        thumb.lock.hidden = !lockable;
        thumb.lock.setAttribute('aria-label', `${locked ? 'Unlock' : 'Lock'} ${version.name}`);
        thumb.lock.replaceChildren(icon(locked ? ICON_LOCK : ICON_LOCK_OPEN));
      }
      if (thumb.remove) {
        thumb.remove.hidden = !editable;
        thumb.remove.setAttribute('aria-label', `Delete ${version.name}`);
      }
      if (strip.children[index] !== thumb.node) strip.insertBefore(thumb.node, strip.children[index] ?? null);
    });
    if (activeKey !== shownActive) {
      shownActive = activeKey;
      const thumb = thumbs.get(activeKey);
      if (thumb) showActive(thumb.node);
    }
  }

  const stopReorder = observeVersionReorder(strip, (keys) => DialStore.reorderPresets(props.panelId, keys));
  let stopStore = subscribeVersions(props.panelId, render);
  render();

  return {
    update(next) {
      if (next.panelId !== props.panelId) {
        stopStore();
        thumbs.forEach(removeThumb);
        thumbs.clear();
        stopStore = subscribeVersions(next.panelId, render);
      }
      props = next;
      render();
    },
    destroy() {
      stopStore();
      stopReorder();
      thumbs.forEach(removeThumb);
      thumbs.clear();
      root.remove();
    },
  };
}

export type VersionPicturesGridOptions = {
  theme?: 'light' | 'dark' | 'system';
  /** The element the grid fills. See `VersionGridOptions.host`. */
  host: HTMLElement;
  onClose?: () => void;
  /** Runs the load of a picked version, so a host can load it its own way. */
  selectWith?: (select: () => void) => void;
  /** Takes over the grid's scroll. See `VersionGridOptions.scroll`. */
  scroll?: VersionGridOptions['scroll'];
};

/** Opens the grid of every version, with the same live pictures as the list. */
export function openVersionPicturesGrid(panelId: string, options: VersionPicturesGridOptions): VersionGridHandle {
  const activeKey = () => versionKey(DialStore.getActivePresetId(panelId));
  const handle = openVersionGrid({
    versions: listVersions(panelId),
    activeKey: activeKey(),
    theme: options.theme,
    host: options.host,
    picture: (key, picture, tile) => holdPicture(versionPictureId(key), { picture, tile, live: () => activeKey() === key }),
    onSelect: (key) => {
      const select = () => selectVersion(panelId, key);
      if (options.selectWith) options.selectWith(select);
      else select();
    },
    scroll: options.scroll,
    onRename: (key, name) => renameVersion(panelId, key, name),
    canRename: (key) => key !== BASE_VERSION && DialStore.isPresetsEditable(panelId),
    onClose: () => { stop(); options.onClose?.(); },
  });
  const stop = subscribeVersions(panelId, () => handle.update(listVersions(panelId), activeKey()));
  return handle;
}
