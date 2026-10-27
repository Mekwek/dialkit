import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DialStore } from './store/DialStore';

describe('version actions', () => {
  it('renames a version, trimming the name and ignoring an empty one', () => {
    const id = 'version-rename';
    DialStore.registerPanel(id, id, { amount: 1 });
    try {
      const version = DialStore.saveNewPreset(id);
      DialStore.renamePreset(id, version, '  Warm  ');
      assert.equal(DialStore.getPresets(id)[0].name, 'Warm');
      assert.equal(DialStore.getPresets(id)[0].id, version);
      DialStore.renamePreset(id, version, '   ');
      assert.equal(DialStore.getPresets(id)[0].name, 'Warm');
      assert.doesNotThrow(() => DialStore.renamePreset(id, 'missing', 'Other'));
    } finally { DialStore.unregisterPanel(id); }
  });

  it('reorders versions, keeping unlisted ones after the listed ones', () => {
    const id = 'version-reorder';
    DialStore.registerPanel(id, id, { amount: 1 });
    try {
      const [a, b, c] = ['A', 'B', 'C'].map(name => DialStore.savePreset(id, name));
      DialStore.reorderPresets(id, [c, a, 'missing']);
      assert.deepEqual(DialStore.getPresets(id).map(p => p.id), [c, a, b]);
      const before = DialStore.getPresets(id);
      DialStore.reorderPresets(id, [c, a, b]);
      assert.equal(DialStore.getPresets(id), before);
    } finally { DialStore.unregisterPanel(id); }
  });

  it('keeps edits out of a locked version and refuses to delete it', () => {
    const id = 'version-lock';
    DialStore.registerPanel(id, id, { amount: [1, 0, 100] });
    try {
      const version = DialStore.saveNewPreset(id);
      DialStore.setPresetLocked(id, version, true);
      DialStore.updateValue(id, 'amount', 42);
      assert.equal(DialStore.getValues(id).amount, 42);
      assert.equal(DialStore.getPresets(id)[0].values.amount, 1);
      DialStore.deletePreset(id, version);
      assert.equal(DialStore.getPresets(id).length, 1);
      DialStore.renamePreset(id, version, 'Kept');
      assert.equal(DialStore.getPresets(id)[0].name, 'Kept');

      DialStore.clearActivePreset(id);
      DialStore.loadPreset(id, version);
      assert.equal(DialStore.getValues(id).amount, 1);

      DialStore.setPresetLocked(id, version, false);
      DialStore.updateValue(id, 'amount', 7);
      assert.equal(DialStore.getPresets(id)[0].values.amount, 7);
      DialStore.deletePreset(id, version);
      assert.equal(DialStore.getPresets(id).length, 0);
    } finally { DialStore.unregisterPanel(id); }
  });
});
