import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DialStore } from './store/DialStore';
import { versionHints } from './hints';

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

  it('lets a panel turn off editing or locking in its version menu, both on by default', () => {
    const config = { amount: [0.5, 0, 1] as [number, number, number] };
    DialStore.registerPanel('preset-options-default', 'Default', config);
    DialStore.registerPanel('preset-options-read-only', 'Read only', config, undefined, { presetsEditable: false });
    DialStore.registerPanel('preset-options-no-lock', 'No lock', config, undefined, { presetsLockable: false });
    try {
      assert.equal(DialStore.isPresetsEditable('preset-options-default'), true);
      assert.equal(DialStore.isPresetsLockable('preset-options-default'), true);
      // A menu that cannot edit cannot lock either.
      assert.equal(DialStore.isPresetsEditable('preset-options-read-only'), false);
      assert.equal(DialStore.isPresetsLockable('preset-options-read-only'), false);
      assert.equal(DialStore.isPresetsEditable('preset-options-no-lock'), true);
      assert.equal(DialStore.isPresetsLockable('preset-options-no-lock'), false);
      // An update without the option keeps it; one with it changes it.
      DialStore.updatePanel('preset-options-read-only', 'Read only', { amount: [0.5, 0, 2] });
      assert.equal(DialStore.isPresetsEditable('preset-options-read-only'), false);
      DialStore.updatePanel('preset-options-read-only', 'Read only', config, undefined, { presetsEditable: true });
      assert.equal(DialStore.isPresetsEditable('preset-options-read-only'), true);
      // An unknown panel has the defaults.
      assert.equal(DialStore.isPresetsEditable('preset-options-unknown'), true);
      assert.equal(DialStore.isPresetsLockable('preset-options-unknown'), true);
    } finally {
      DialStore.unregisterPanel('preset-options-default');
      DialStore.unregisterPanel('preset-options-read-only');
      DialStore.unregisterPanel('preset-options-no-lock');
    }
  });

  it('names only the actions a version menu offers in its hints', () => {
    assert.equal(versionHints('version').versions, 'Switches to another version. Rename, lock or delete a version from the list.');
    assert.equal(versionHints('version', { lockable: false }).versions, 'Switches to another version. Rename or delete a version from the list.');
    assert.equal(versionHints('version', { lockable: false }).versionActions, 'Shows rename and delete for this version.');
    assert.equal(versionHints('sequence', { editable: false }).versions, 'Switches to another sequence.');
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
