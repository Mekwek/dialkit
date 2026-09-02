// Behavior lock for DialStore's preset rename/reorder/editability API.
// Run with `npm test` (node:test via tsx).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DialStore } from './store/DialStore';

const config = { value: { type: 'text' as const, default: 'a' } };

describe('DialStore presets', () => {
  it('renamePreset trims, ignores empty, keeps id, and gives a new array reference', () => {
    const panelId = 'preset-rename-panel';
    DialStore.registerPanel(panelId, 'Rename Panel', config);
    const id = DialStore.savePreset(panelId, 'Original');

    const before = DialStore.getPresets(panelId);
    DialStore.renamePreset(panelId, id, '  Renamed  ');
    const after = DialStore.getPresets(panelId);

    assert.notEqual(before, after, 'renamePreset should produce a new presets array reference');
    assert.equal(after.length, 1);
    assert.equal(after[0].id, id, 'renaming must not change the preset id');
    assert.equal(after[0].name, 'Renamed', 'name should be trimmed');

    // Empty name is ignored — the existing name is retained.
    DialStore.renamePreset(panelId, id, '   ');
    assert.equal(DialStore.getPresets(panelId)[0].name, 'Renamed');

    // Missing preset is a no-op, not a throw.
    assert.doesNotThrow(() => DialStore.renamePreset(panelId, 'nonexistent', 'X'));

    DialStore.unregisterPanel(panelId);
  });

  it('reorderPresets applies the given order, appends unlisted presets, ignores unknown ids, and no-ops when unchanged', () => {
    const panelId = 'preset-reorder-panel';
    DialStore.registerPanel(panelId, 'Reorder Panel', config);
    const idA = DialStore.savePreset(panelId, 'A');
    const idB = DialStore.savePreset(panelId, 'B');
    const idC = DialStore.savePreset(panelId, 'C');

    // Reorder to C, A — B was not listed, so it should be appended at the end
    // in its old relative order. Unknown ids are ignored.
    DialStore.reorderPresets(panelId, [idC, idA, 'unknown-id']);
    const reordered = DialStore.getPresets(panelId).map((p) => p.id);
    assert.deepEqual(reordered, [idC, idA, idB]);

    // No-op when the resulting order equals the current order.
    const before = DialStore.getPresets(panelId);
    DialStore.reorderPresets(panelId, [idC, idA, idB]);
    const after = DialStore.getPresets(panelId);
    assert.equal(before, after, 'unchanged order should not produce a new array reference');

    DialStore.unregisterPanel(panelId);
  });

  it('isPresetsEditable defaults to true and reflects the presetsEditable panel option', () => {
    const panelId = 'preset-editable-panel';
    DialStore.registerPanel(panelId, 'Editable Panel', config);
    assert.equal(DialStore.isPresetsEditable(panelId), true);
    DialStore.unregisterPanel(panelId);

    const readOnlyPanelId = 'preset-readonly-panel';
    DialStore.registerPanel(readOnlyPanelId, 'Read Only Panel', config, undefined, { presetsEditable: false });
    assert.equal(DialStore.isPresetsEditable(readOnlyPanelId), false);
    DialStore.unregisterPanel(readOnlyPanelId);

    // Unknown panel id also defaults to true.
    assert.equal(DialStore.isPresetsEditable('never-registered-panel'), true);
  });

  it('isPresetsLockable defaults to false and reflects the presetsLockable panel option', () => {
    const panelId = 'preset-lockable-default-panel';
    DialStore.registerPanel(panelId, 'Lockable Default Panel', config);
    assert.equal(DialStore.isPresetsLockable(panelId), false);
    DialStore.unregisterPanel(panelId);

    const lockablePanelId = 'preset-lockable-panel';
    DialStore.registerPanel(lockablePanelId, 'Lockable Panel', config, undefined, { presetsLockable: true });
    assert.equal(DialStore.isPresetsLockable(lockablePanelId), true);
    DialStore.unregisterPanel(lockablePanelId);

    // Unknown panel id also defaults to false.
    assert.equal(DialStore.isPresetsLockable('never-registered-panel'), false);
  });

  it('setPresetLocked sets the flag, no-ops when unchanged, and ignores unknown ids', () => {
    const panelId = 'preset-lock-panel';
    DialStore.registerPanel(panelId, 'Lock Panel', config);
    const id = DialStore.savePreset(panelId, 'Original');

    const before = DialStore.getPresets(panelId);
    assert.equal(before[0].locked, undefined);

    DialStore.setPresetLocked(panelId, id, true);
    const afterLock = DialStore.getPresets(panelId);
    assert.notEqual(before, afterLock, 'setPresetLocked should produce a new presets array reference');
    assert.equal(afterLock[0].locked, true);

    // Setting to the same value is a no-op — array reference stays identical.
    DialStore.setPresetLocked(panelId, id, true);
    assert.equal(DialStore.getPresets(panelId), afterLock, 'unchanged lock state should not produce a new array reference');

    DialStore.setPresetLocked(panelId, id, false);
    assert.equal(DialStore.getPresets(panelId)[0].locked, false);

    // Missing preset is a no-op, not a throw.
    assert.doesNotThrow(() => DialStore.setPresetLocked(panelId, 'nonexistent', true));

    DialStore.unregisterPanel(panelId);
  });
});
