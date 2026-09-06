// Behavior lock for DialRoot's group partitioning (`group` panel option).
// Run with `npm test` (node:test via tsx).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { groupRootKey, partitionPanels } from './panel-groups';
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
