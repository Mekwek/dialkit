// Behavior lock for DialRoot's group partitioning (`group` panel option).
// Run with `npm test` (node:test via tsx).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { groupRootKey, partitionPanels, placeBesidePanels } from './panel-groups';
import type { PanelConfig } from './store/DialStore';

function panel(id: string, group?: string): PanelConfig {
  return { id, name: id, controls: [], values: {}, shortcuts: {}, group };
}

describe('partitionPanels', () => {
  it('leaves an ungrouped panel standalone and merges grouped panels into one shell', () => {
    const entries = partitionPanels([
      panel('scene', 'Settings'),
      panel('solo'),
      panel('camera', 'Settings'),
    ]);

    assert.deepEqual(entries.map((entry) => entry.kind), ['group', 'panel']);
    assert.deepEqual(entries.map((entry) => entry.key), [groupRootKey('Settings'), 'solo']);

    const [group, solo] = entries;
    assert.equal(group.kind, 'group');
    assert.equal(group.kind === 'group' && group.group, 'Settings');
    assert.deepEqual(group.kind === 'group' ? group.panels.map((p) => p.id) : [], ['scene', 'camera']);
    assert.equal(solo.kind === 'panel' && solo.panel.id, 'solo');
  });

  it('keeps every panel standalone when nothing is grouped', () => {
    const entries = partitionPanels([panel('a'), panel('b')]);
    assert.deepEqual(entries.map((entry) => entry.key), ['a', 'b']);
    assert.ok(entries.every((entry) => entry.kind === 'panel'));
  });

  it('emits each group once, at its first member, and treats an empty group as ungrouped', () => {
    const entries = partitionPanels([
      panel('one', 'A'),
      panel('two', 'B'),
      panel('three', 'A'),
      panel('four', ''),
    ]);
    assert.deepEqual(entries.map((entry) => entry.key), [groupRootKey('A'), groupRootKey('B'), 'four']);
  });
});

describe('placeBesidePanels', () => {
  function besidePanel(id: string, beside: string, group?: string): PanelConfig {
    return { ...panel(id, group), beside };
  }

  it('attaches a beside panel to the group it names and takes it out of the column', () => {
    const slots = placeBesidePanels(partitionPanels([
      besidePanel('text', 'Theca OS'),
      panel('layout', 'Theca OS'),
      panel('solo'),
    ]));
    assert.deepEqual(slots.map((slot) => slot.entry.key), [groupRootKey('Theca OS'), 'solo']);
    assert.deepEqual(slots[0].beside.map((p) => p.id), ['text']);
    assert.deepEqual(slots[1].beside, []);
  });

  it('attaches to an ungrouped panel by its name', () => {
    const slots = placeBesidePanels(partitionPanels([panel('main'), besidePanel('side', 'main')]));
    assert.deepEqual(slots.map((slot) => slot.entry.key), ['main']);
    assert.deepEqual(slots[0].beside.map((p) => p.id), ['side']);
  });

  it('keeps a beside panel as its own shell when its target is missing or is itself beside', () => {
    const slots = placeBesidePanels(partitionPanels([
      besidePanel('lost', 'Nowhere'),
      besidePanel('a', 'b'),
      besidePanel('b', 'lost'),
    ]));
    assert.deepEqual(slots.map((slot) => slot.entry.key), ['lost', 'a', 'b']);
    assert.ok(slots.every((slot) => slot.beside.length === 0));
  });

  it('leaves a grouped panel in its group even with beside', () => {
    const slots = placeBesidePanels(partitionPanels([panel('main'), besidePanel('member', 'main', 'G')]));
    assert.deepEqual(slots.map((slot) => slot.entry.key), ['main', groupRootKey('G')]);
    assert.deepEqual(slots[0].beside, []);
  });
});
