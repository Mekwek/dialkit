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

/**
 * A root shell and the panels that open beside it (the `beside` option).
 */
export type PanelRootSlot = { entry: PanelRootEntry; beside: PanelConfig[] };

/** The name a `beside` option uses for a shell: its group, or its panel's name. */
function shellName(entry: PanelRootEntry): string {
  return entry.kind === 'group' ? entry.group : entry.panel.name;
}

/**
 * Attach each panel with `beside` to the shell it names. Such a panel leaves
 * the column and rides with that shell. A panel whose shell is missing, or
 * names another `beside` panel, stays a shell of its own, in place. A panel
 * with a `group` belongs to its group, so its `beside` is ignored (it never
 * reaches here as a standalone entry).
 */
export function placeBesidePanels(entries: PanelRootEntry[]): PanelRootSlot[] {
  const isBeside = (entry: PanelRootEntry) => entry.kind === 'panel' && !!entry.panel.beside;
  const targets = new Map<string, PanelRootSlot>();
  const slots: PanelRootSlot[] = [];
  for (const entry of entries) {
    const slot = { entry, beside: [] };
    slots.push(slot);
    const name = shellName(entry);
    if (!isBeside(entry) && !targets.has(name)) targets.set(name, slot);
  }

  return slots.filter((slot) => {
    if (slot.entry.kind !== 'panel' || !slot.entry.panel.beside) return true;
    const target = targets.get(slot.entry.panel.beside);
    if (!target) return true;
    target.beside.push(slot.entry.panel);
    return false;
  });
}
