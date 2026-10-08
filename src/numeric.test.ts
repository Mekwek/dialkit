import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decimalsForStep, parseFieldInput, roundValue } from './numeric';
import { applySliderDelta } from './shortcut-utils';
import { DialStore } from './store/DialStore';

describe('slider numeric values', () => {
  it('preserves fractional origins, tiny steps, and partial endpoints', () => {
    assert.equal(roundValue(0.26, 0.1, 0.05, 0.98), 0.25);
    assert.equal(roundValue(0.98, 0.1, 0.05, 0.98), 0.98);
    assert.equal(roundValue(20, 0.1, 0.05, 0.98), 0.98);
    assert.equal(roundValue(-20, 0.1, 0.05, 0.98), 0.05);
    assert.equal(roundValue(0.00000026, 1e-7, 0, 1e-6), 0.0000003);
    assert.equal(roundValue(-0.26, 0.1), -0.3);
    assert.equal(decimalsForStep(1e-7), 7);
    assert.equal(decimalsForStep(1.5e-7), 8);
    assert.equal(decimalsForStep(0.1, 0.05, 0.98), 2);
    assert.equal(decimalsForStep(1), 0);
  });

  it('preserves precise sliders through config updates, presets, shortcuts, and remounts', () => {
    const id = 'numeric-lifecycle';
    const config = { offset: [0.25, 0.05, 0.98, 0.1], tiny: [0, 0, 1e-6, 1e-7] } as const;
    // Mutable tuples are the public range notation.
    const dialConfig = { offset: [...config.offset] as [number, number, number, number], tiny: [...config.tiny] as [number, number, number, number] };
    try {
      DialStore.registerPanel(id, 'Numbers', dialConfig, undefined, { retainOnUnmount: true });
      DialStore.updateValues(id, { offset: 0.95, tiny: 3e-7 });
      const preset = DialStore.savePreset(id, 'Precise');
      DialStore.updatePanel(id, 'Numbers', dialConfig);
      assert.equal(DialStore.getValue(id, 'offset'), 0.95);
      assert.equal(DialStore.getValue(id, 'tiny'), 3e-7);
      DialStore.loadPreset(id, preset);
      const control = DialStore.getPanel(id)!.controls[0];
      applySliderDelta(id, 'offset', control, 0.1, 1);
      assert.equal(DialStore.getValue(id, 'offset'), 0.98);
      DialStore.unregisterPanel(id);
      DialStore.registerPanel(id, 'Numbers', dialConfig);
      assert.equal(DialStore.getValue(id, 'offset'), 0.98);
      assert.equal(DialStore.getValue(id, 'tiny'), 3e-7);
    } finally { DialStore.unregisterPanel(id); }
  });
});

describe('typed field values', () => {
  it('reads plain numbers, with or without the unit', () => {
    assert.equal(parseFieldInput('12'), 12);
    assert.equal(parseFieldInput(' -40.5 '), -40.5);
    assert.equal(parseFieldInput('.5'), 0.5);
    assert.equal(parseFieldInput('1e3'), 1000);
    assert.equal(parseFieldInput('90°', '°'), 90);
    assert.equal(parseFieldInput('2 ×', '×'), 2);
  });

  it('refuses entries that are not one plain number', () => {
    assert.equal(parseFieldInput(''), null);
    assert.equal(parseFieldInput('1,5'), null);
    assert.equal(parseFieldInput('1 5'), null);
    assert.equal(parseFieldInput('abc'), null);
    assert.equal(parseFieldInput('12px', '°'), null);
  });
});
