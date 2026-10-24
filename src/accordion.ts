import type { ControlMeta } from './store/DialStore';

// In accordion mode only one top-level folder is open. When several start
// open, the first one wins, so the panel never shows more than one.
export function getDefaultOpenFolder(controls: ControlMeta[]): string | null {
  return controls.find(control => control.type === 'folder' && (control.defaultOpen ?? true))?.path ?? null;
}

// Drops the folders of panels that are gone, so a panel registered again
// starts from its default. Returns the same record when nothing changed.
export function pruneOpenFolders(openFolders: Record<string, string | null>, ids: string[]): Record<string, string | null> {
  const kept = Object.entries(openFolders).filter(([id]) => ids.includes(id));
  return kept.length === Object.keys(openFolders).length ? openFolders : Object.fromEntries(kept);
}

// Keeps the folder the user opened while the config still has it, and null
// once they close them all. Anything else falls back to the default.
export function resolveOpenFolder(controls: ControlMeta[], openFolder: string | null | undefined): string | null {
  if (openFolder === null) return null;
  if (openFolder !== undefined && controls.some(control => control.type === 'folder' && control.path === openFolder)) return openFolder;
  return getDefaultOpenFolder(controls);
}
