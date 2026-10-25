// Framework-agnostic glue between DialStore versions (presets) and their
// thumbnails, shared by every framework's version gallery.

import { DialStore } from '../store/DialStore';
import { openVersionGrid, type GridVersion, type VersionGridHandle } from './grid';
import { BASE_VERSION, captureViewport, ThumbnailStore, versionKey } from './thumbnails';

export type VersionEntry = GridVersion & { presetId: string | null };

const REFRESH_DELAY_MS = 900;

/** All versions of a panel, oldest first, starting with the base version. */
export function listVersions(panelId: string): VersionEntry[] {
  const thumbnails = ThumbnailStore.getAll(panelId);
  const presets = DialStore.getPresets(panelId);
  return [
    { key: BASE_VERSION, presetId: null, name: DialStore.getBaseName(panelId), thumbnail: thumbnails[BASE_VERSION] },
    ...presets.map((preset) => ({
      key: preset.id,
      presetId: preset.id,
      name: preset.name,
      thumbnail: thumbnails[preset.id],
    })),
  ];
}

export function selectVersion(panelId: string, key: string): void {
  if (key === BASE_VERSION) DialStore.clearActivePreset(panelId);
  else DialStore.loadPreset(panelId, key);
}

export function renameVersion(panelId: string, key: string, name: string): void {
  DialStore.renamePreset(panelId, key === BASE_VERSION ? null : key, name);
}

export function deleteVersion(panelId: string, key: string): void {
  if (key === BASE_VERSION) return;
  DialStore.deletePreset(panelId, key);
  ThumbnailStore.delete(panelId, key);
}

/**
 * Keep the active version's thumbnail current: recapture shortly after its
 * values stop changing, and whenever a version without a thumbnail is shown.
 */
export function watchVersionThumbnails(panelId: string): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastValues = JSON.stringify(DialStore.getValues(panelId));
  let lastKey = versionKey(DialStore.getActivePresetId(panelId));
  let busy = false;

  const refresh = async () => {
    if (busy) { schedule(); return; }
    busy = true;
    const key = versionKey(DialStore.getActivePresetId(panelId));
    const capture = await captureViewport();
    busy = false;
    // Discard if the version changed while capturing.
    if (capture && key === versionKey(DialStore.getActivePresetId(panelId))) {
      ThumbnailStore.set(panelId, key, capture.thumbnail);
    }
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (document.querySelector('.dialkit-version-overlay, .dialkit-appshot')) { schedule(); return; }
      void refresh();
    }, REFRESH_DELAY_MS);
  };

  const unsubscribe = DialStore.subscribe(panelId, () => {
    // Compare contents: renames and saves hand out new snapshot objects too.
    const values = JSON.stringify(DialStore.getValues(panelId));
    const key = versionKey(DialStore.getActivePresetId(panelId));
    const switched = key !== lastKey;
    const edited = !switched && values !== lastValues;
    lastValues = values;
    lastKey = key;
    if (edited) schedule();
    // A version shown without a thumbnail gets one, unless something (like a
    // save) supplies it in the meantime.
    else if (switched) setTimeout(() => {
      if (!ThumbnailStore.get(panelId, key)) schedule();
    });
  });

  ThumbnailStore.prune(panelId, [BASE_VERSION, ...DialStore.getPresets(panelId).map((p) => p.id)]);
  // A stored thumbnail can predate this page load's values; always refresh.
  schedule();

  return () => { clearTimeout(timer); unsubscribe(); };
}

/**
 * Zoom the page out into a grid of every version. Opens immediately from the
 * cached thumbnails, which the watcher keeps current.
 */
export function openVersionsOverview(panelId: string, theme?: 'light' | 'dark' | 'system', onClose?: () => void): VersionGridHandle {
  const key = versionKey(DialStore.getActivePresetId(panelId));
  const handle = openVersionGrid({
    versions: listVersions(panelId),
    activeKey: key,
    theme,
    onSelect: (next) => selectVersion(panelId, next),
    onRename: (next, name) => renameVersion(panelId, next, name),
    onClose: () => { stop(); onClose?.(); },
  });
  const stop = ThumbnailStore.subscribe(() => {
    handle.update(listVersions(panelId), versionKey(DialStore.getActivePresetId(panelId)));
  });
  return handle;
}
