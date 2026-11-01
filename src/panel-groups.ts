import type { PanelConfig } from './store/DialStore';

/**
 * One shell a DialRoot draws:
 * - `panel`: a panel on its own. The one panel without a group, or a panel
 *   with `beside` that is not placed next to another shell.
 * - `shell`: the panels without a group, when there are two or more, as
 *   sections of the one "DialKit" shell.
 * - `group`: the panels that share a `group`, as sections of a shell titled
 *   by the group. A group of one panel that is not its `groupHeader` is that
 *   panel on its own (`panel`), so its title shows once.
 */
export type PanelRootEntry =
  | { kind: 'panel'; key: string; panel: PanelConfig }
  | { kind: 'shell'; key: string; panels: PanelConfig[] }
  | { kind: 'group'; key: string; group: string; panels: PanelConfig[] };

/** A shell, and the panels that open beside it (the `beside` option). */
export type PanelRootSlot = { entry: PanelRootEntry; beside: PanelConfig[] };

/** Which panels a DialRoot draws: those without a group, those in the listed groups, or both. */
export type PanelRootFilter = { groups?: string[]; ungrouped?: boolean };

/** The open-state key of a group's shell. */
export function groupRootKey(group: string): string {
  return `group:${group}`;
}

/** The open-state key of the shell of the panels without a group. */
export const UNGROUPED_ROOT_KEY = 'dialkit:ungrouped';

const groupOf = (panel: PanelConfig) => panel.group || undefined;

/** The panels a root with `include` draws; every panel without it. */
export function filterRootPanels(panels: PanelConfig[], include?: PanelRootFilter): PanelConfig[] {
  if (!include) return panels;
  return panels.filter((panel) => {
    const group = groupOf(panel);
    return group ? !!include.groups?.includes(group) : include.ungrouped === true;
  });
}

/**
 * The shells a DialRoot draws, in the order their first panel registered.
 *
 * Panels without a group follow DialKit's own rule: one shows on its own,
 * two or more share the "DialKit" shell. Panels that share a group share a
 * shell of their own; a group of one panel (not its `groupHeader`) shows
 * that panel on its own, still apart from the panels without a group. A panel with `beside` and no group never joins the
 * "DialKit" shell: it rides with the shell it names (a group, or the one
 * panel without a group), or, when that shell is missing or `placeBeside`
 * is false (an inline root), it shows as a shell of its own in its place.
 */
export function layoutRootPanels(panels: PanelConfig[], { placeBeside = true }: { placeBeside?: boolean } = {}): PanelRootSlot[] {
  const ungrouped = panels.filter((panel) => !groupOf(panel) && !panel.beside);
  const lone = ungrouped.length === 1 ? ungrouped[0] : undefined;
  const slots: PanelRootSlot[] = [];
  const groups = new Map<string, Extract<PanelRootEntry, { kind: 'group' }>>();
  const targets = new Map<string, PanelRootSlot>();
  const besidePanels: { panel: PanelConfig; slot: PanelRootSlot }[] = [];
  let shell: Extract<PanelRootEntry, { kind: 'shell' }> | undefined;

  const add = (entry: PanelRootEntry, name?: string) => {
    const slot: PanelRootSlot = { entry, beside: [] };
    slots.push(slot);
    if (name !== undefined && !targets.has(name)) targets.set(name, slot);
    return slot;
  };

  for (const panel of panels) {
    const group = groupOf(panel);
    if (group) {
      let entry = groups.get(group);
      if (!entry) {
        entry = { kind: 'group', key: groupRootKey(group), group, panels: [] };
        groups.set(group, entry);
        add(entry, group);
      }
      entry.panels.push(panel);
    } else if (panel.beside) {
      besidePanels.push({ panel, slot: add({ kind: 'panel', key: panel.id, panel }) });
    } else if (panel === lone) {
      add({ kind: 'panel', key: panel.id, panel }, panel.name);
    } else if (!shell) {
      shell = { kind: 'shell', key: UNGROUPED_ROOT_KEY, panels: [panel] };
      add(shell);
    } else {
      shell.panels.push(panel);
    }
  }

  // A group of one panel draws it on its own: a shell around one section
  // would show the same title twice. A `groupHeader` panel has no section,
  // so its group stays a shell.
  for (const slot of slots) {
    const { entry } = slot;
    if (entry.kind === 'group' && entry.panels.length === 1 && !entry.panels[0].groupHeader) {
      slot.entry = { kind: 'panel', key: entry.panels[0].id, panel: entry.panels[0] };
    }
  }

  if (!placeBeside) return slots;
  const placed = new Set<PanelRootSlot>();
  for (const { panel, slot } of besidePanels) {
    const target = targets.get(panel.beside!);
    if (!target) continue;
    target.beside.push(panel);
    placed.add(slot);
  }
  return slots.filter((slot) => !placed.has(slot));
}
