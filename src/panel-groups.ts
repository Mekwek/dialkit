import type { PanelConfig } from './store/DialStore';

/**
 * One root shell rendered by DialRoot: an ungrouped panel on its own, or a
 * merged shell holding every panel that shares a `group`.
 */
export type PanelRootEntry =
  | { kind: 'panel'; key: string; panel: PanelConfig }
  | { kind: 'group'; key: string; group: string; panels: PanelConfig[] };

/** Synthetic open-state key for a merged group shell. */
export function groupRootKey(group: string): string {
  return `group:${group}`;
}

/**
 * Partition registered panels into root shells in registration order.
 * Ungrouped panels stay standalone; each group appears exactly once, at the
 * position of its first member, so DOM order tracks registration order.
 */
export function partitionPanels(panels: PanelConfig[]): PanelRootEntry[] {
  const entries: PanelRootEntry[] = [];
  const groups = new Map<string, Extract<PanelRootEntry, { kind: 'group' }>>();

  for (const panel of panels) {
    if (!panel.group) {
      entries.push({ kind: 'panel', key: panel.id, panel });
      continue;
    }
    let entry = groups.get(panel.group);
    if (!entry) {
      entry = { kind: 'group', key: groupRootKey(panel.group), group: panel.group, panels: [] };
      groups.set(panel.group, entry);
      entries.push(entry);
    }
    entry.panels.push(panel);
  }

  return entries;
}
