import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DialStore } from './store/DialStore';

describe('new version creation', () => {
  it('saves current values, selects the new version, and keeps base settings independent', () => {
    const id = 'new-version-values';
    DialStore.registerPanel(id, id, { amount: [1, 0, 100] });
    try {
      const version = DialStore.saveNewPreset(id);
      assert.equal(DialStore.getActivePresetId(id), version);
      assert.equal(DialStore.getPresets(id)[0].name, 'Version 2');
      DialStore.updateValue(id, 'amount', 42);
      DialStore.clearActivePreset(id);
      assert.equal(DialStore.getValues(id).amount, 1);
      DialStore.loadPreset(id, version);
      assert.equal(DialStore.getValues(id).amount, 42);
    } finally { DialStore.unregisterPanel(id); }
  });

  it('does not reuse a surviving version name after deleting a middle version', () => {
    const id = 'new-version-numbering';
    DialStore.registerPanel(id, id, { amount: 1 });
    try {
      const second = DialStore.saveNewPreset(id);
      DialStore.saveNewPreset(id);
      DialStore.deletePreset(id, second);
      DialStore.saveNewPreset(id);
      assert.deepEqual(DialStore.getPresets(id).map(p => p.name), ['Version 3', 'Version 4']);
      DialStore.savePreset(id, 'Custom');
      DialStore.saveNewPreset(id);
      assert.equal(DialStore.getPresets(id).at(-1)?.name, 'Version 5');
    } finally { DialStore.unregisterPanel(id); }
  });

  it('can create a version again after deleting the last saved version', () => {
    const id = 'new-version-delete-last';
    DialStore.registerPanel(id, id, { amount: 1 });
    try {
      DialStore.deletePreset(id, DialStore.saveNewPreset(id));
      assert.equal(DialStore.getActivePresetId(id), null);
      const created = DialStore.saveNewPreset(id);
      assert.equal(DialStore.getActivePresetId(id), created);
      assert.equal(DialStore.getPresets(id).length, 1);
    } finally { DialStore.unregisterPanel(id); }
  });
});
