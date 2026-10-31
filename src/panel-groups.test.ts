import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { filterRootPanels, groupRootKey, layoutRootPanels, UNGROUPED_ROOT_KEY } from './panel-groups';
import { DialStore, type PanelConfig } from './store/DialStore';

function panel(id: string, group?: string, beside?: string): PanelConfig {
  return { id, name: id, controls: [], values: {}, shortcuts: {}, group, beside };
}

const keys = (panels: PanelConfig[], options?: { placeBeside?: boolean }) =>
  layoutRootPanels(panels, options).map((slot) => slot.entry.key);

describe('layoutRootPanels', () => {
  it('keeps DialKit\'s rule for panels without a group: one alone, several in one shell', () => {
    assert.deepEqual(keys([panel('a')]), ['a']);
    const [slot] = layoutRootPanels([panel('a'), panel('b'), panel('c')]);
    assert.equal(slot.entry.kind, 'shell');
    assert.deepEqual(slot.entry.kind === 'shell' ? slot.entry.panels.map((p) => p.id) : [], ['a', 'b', 'c']);
    assert.deepEqual(keys([]), []);
  });

  it('draws each group in its own shell, apart from the panels without a group', () => {
    const slots = layoutRootPanels([
      panel('scene', 'Settings'),
      panel('solo'),
      panel('camera', 'Settings'),
    ]);
    assert.deepEqual(slots.map((slot) => slot.entry.key), [groupRootKey('Settings'), 'solo']);
    const [group, solo] = slots.map((slot) => slot.entry);
    assert.equal(group.kind === 'group' && group.group, 'Settings');
    assert.deepEqual(group.kind === 'group' ? group.panels.map((p) => p.id) : [], ['scene', 'camera']);
    assert.equal(solo.kind === 'panel' && solo.panel.id, 'solo');
  });

  it('puts each group at its first panel, merges the panels without a group there, and treats an empty group as none', () => {
    assert.deepEqual(keys([
      panel('one', 'A'),
      panel('two', 'B'),
      panel('three', 'A'),
      panel('four', ''),
      panel('five'),
    ]), [groupRootKey('A'), groupRootKey('B'), UNGROUPED_ROOT_KEY]);
  });

  it('gives two panels their own shells when each has its own group, as theca\'s Views and Theca OS', () => {
    assert.deepEqual(keys([panel('Views', 'Views'), panel('Layout', 'Theca OS'), panel('Settings', 'Theca OS')]), [groupRootKey('Views'), groupRootKey('Theca OS')]);
  });

  it('attaches a beside panel to the group it names and takes it out of the column', () => {
    const slots = layoutRootPanels([
      panel('text', undefined, 'Theca OS'),
      panel('layout', 'Theca OS'),
      panel('views', 'Views'),
    ]);
    assert.deepEqual(slots.map((slot) => slot.entry.key), [groupRootKey('Theca OS'), groupRootKey('Views')]);
    assert.deepEqual(slots[0].beside.map((p) => p.id), ['text']);
    assert.deepEqual(slots[1].beside, []);
  });

  it('attaches to the one panel without a group by its name, and never merges a beside panel into the DialKit shell', () => {
    const slots = layoutRootPanels([panel('main'), panel('side', undefined, 'main')]);
    assert.deepEqual(slots.map((slot) => slot.entry.key), ['main']);
    assert.deepEqual(slots[0].beside.map((p) => p.id), ['side']);

    // A panel inside the DialKit shell is not a target: the beside panel stands alone.
    assert.deepEqual(keys([panel('a'), panel('b'), panel('side', undefined, 'a')]), [UNGROUPED_ROOT_KEY, 'side']);
  });

  it('keeps a beside panel as its own shell when its target is missing or is itself beside', () => {
    const slots = layoutRootPanels([
      panel('lost', undefined, 'Nowhere'),
      panel('a', undefined, 'b'),
      panel('b', undefined, 'lost'),
    ]);
    assert.deepEqual(slots.map((slot) => slot.entry.key), ['lost', 'a', 'b']);
    assert.ok(slots.every((slot) => slot.beside.length === 0));
  });

  it('leaves a grouped panel in its group even with beside, and keeps beside panels in the column when asked', () => {
    const slots = layoutRootPanels([panel('main'), panel('member', 'G', 'main')]);
    assert.deepEqual(slots.map((slot) => slot.entry.key), ['main', groupRootKey('G')]);
    assert.deepEqual(slots[0].beside, []);
    assert.deepEqual(keys([panel('layout', 'Theca OS'), panel('text', undefined, 'Theca OS')], { placeBeside: false }), [groupRootKey('Theca OS'), 'text']);
  });
});

describe('filterRootPanels', () => {
  it('draws every panel without a filter, else the panels without a group and the listed groups', () => {
    const panels = [panel('a'), panel('b', 'G'), panel('c', 'H'), panel('d', '')];
    assert.equal(filterRootPanels(panels), panels);
    assert.deepEqual(filterRootPanels(panels, { ungrouped: true }).map((p) => p.id), ['a', 'd']);
    assert.deepEqual(filterRootPanels(panels, { groups: ['H'] }).map((p) => p.id), ['c']);
    assert.deepEqual(filterRootPanels(panels, { groups: ['G'], ungrouped: true }).map((p) => p.id), ['a', 'b', 'd']);
    assert.deepEqual(filterRootPanels(panels, {}), []);
  });
});

describe('Panel options: group, groupHeader, beside', () => {
  it('keeps them per panel, and through an update', () => {
    const text = 'groups-text-test';
    const os = 'groups-os-test';
    try {
      DialStore.registerPanel(os, 'OS', { a: 1 }, undefined, { group: 'Theca OS', groupHeader: true });
      DialStore.registerPanel(text, 'Text', { x: 0 }, undefined, { beside: 'Theca OS' });
      assert.equal(DialStore.getPanel(os)!.group, 'Theca OS');
      assert.equal(DialStore.getPanel(os)!.groupHeader, true);
      assert.equal(DialStore.getPanel(text)!.beside, 'Theca OS');
      assert.equal(DialStore.getPanel(text)!.group, undefined);

      DialStore.updatePanel(text, 'Text', { x: 1 });
      assert.equal(DialStore.getPanel(text)!.beside, 'Theca OS');

      // A new group is a change, so the panel is drawn again.
      let notified = 0;
      const stop = DialStore.subscribeGlobal(() => { notified += 1; });
      DialStore.updatePanel(os, 'OS', { a: 1 }, undefined, { group: 'Scene' });
      stop();
      assert.equal(DialStore.getPanel(os)!.group, 'Scene');
      assert.ok(notified > 0);
    } finally {
      DialStore.unregisterPanel(text);
      DialStore.unregisterPanel(os);
    }
  });
});
