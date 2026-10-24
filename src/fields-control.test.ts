import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createFieldLock, scaleFields } from './fields-control';
import { DialStore, flattenDialValueUpdates, resolveDialValues, type DialConfig } from './store/DialStore';

const ranges = [
  { min: 0.1, max: 3, step: 0.01 },
  { min: 0.1, max: 3, step: 0.01 },
  { min: 0.1, max: 3, step: 0.01 },
];

describe('field rows', () => {
  it('keeps each axis a plain number under its own key', () => {
    const config = {
      scale: { _fields: true, uniform: false, x: [1.25, 0.1, 3, 0.01], y: [1.25, 0.1, 3, 0.01], z: [1.25, 0.1, 3, 0.01] },
    } satisfies DialConfig;
    const id = 'fields-values';
    try {
      DialStore.registerPanel(id, 'Fields', config);
      const [scale] = DialStore.getPanel(id)!.controls;
      assert.equal(scale.type, 'folder');
      assert.equal(scale.fields, true);
      assert.deepEqual(scale.children!.map(c => c.type), ['toggle', 'slider', 'slider', 'slider']);
      assert.deepEqual(resolveDialValues(config, DialStore.getValues(id)), { scale: { uniform: false, x: 1.25, y: 1.25, z: 1.25 } });
      DialStore.updateValues(id, flattenDialValueUpdates(config, { scale: { uniform: true, y: 2 } }));
      assert.deepEqual(DialStore.getValues(id), { 'scale.uniform': true, 'scale.x': 1.25, 'scale.y': 2, 'scale.z': 1.25 });
    } finally { DialStore.unregisterPanel(id); }
  });

  it('shows a folder when its children cannot form a row', () => {
    const id = 'fields-invalid';
    const warn = console.warn;
    const warnings: unknown[] = [];
    console.warn = (message: unknown) => { warnings.push(message); };
    try {
      DialStore.registerPanel(id, 'Fields', {
        one: { _fields: true, x: 1 },
        mixed: { _fields: true, x: 1, y: 1, title: 'Text' },
        five: { _fields: true, a: 1, b: 1, c: 1, d: 1, e: 1 },
        pair: { _fields: true, x: 1, y: 1 },
      });
      assert.deepEqual(DialStore.getPanel(id)!.controls.map(c => c.fields ?? false), [false, false, false, true]);
      assert.equal(warnings.length, 3);
    } finally {
      console.warn = warn;
      DialStore.unregisterPanel(id);
    }
  });

  it('scales locked axes by the same ratio', () => {
    assert.deepEqual(scaleFields(ranges, [1, 2, 0.5], 0, 1.5), [1.5, 3, 0.75]);
    assert.deepEqual(scaleFields(ranges, [1.25, 1.25, 1.25], 1, 2), [2, 2, 2]);
  });

  it('stops where the first axis reaches its bound', () => {
    assert.deepEqual(scaleFields(ranges, [1, 2, 0.5], 0, 3), [1.5, 3, 0.75]);
    assert.deepEqual(scaleFields(ranges, [1, 2, 0.5], 0, 0.1), [0.2, 0.4, 0.1]);
  });

  it('moves the others by the same amount from 0, and snaps every axis to its step', () => {
    const signed = [{ min: -10, max: 10, step: 0.1 }, { min: -10, max: 10, step: 0.1 }];
    assert.deepEqual(scaleFields(signed, [0, 4], 0, 2), [2, 6]);
    assert.deepEqual(scaleFields(signed, [0, 4], 0, 9), [6, 10]);
    assert.deepEqual(scaleFields(signed, [2, 3], 0, -2), [-2, -3]);
    assert.deepEqual(scaleFields(ranges, [1, 1.34, 3], 0, 0.5), [0.5, 0.67, 1.5]);
  });

  it('clamps values written from code before scaling', () => {
    const uneven = [{ min: 0.1, max: 3, step: 0.01 }, { min: 0.5, max: 3, step: 0.01 }];
    assert.deepEqual(scaleFields(uneven, [1, 5], 0, 1.5), [1, 3]);
    assert.deepEqual(scaleFields(uneven, [1, 5], 0, 0.5), [0.5, 1.5]);
  });

  it('keeps exact proportions across repeated edits of one field', () => {
    const lock = createFieldLock();
    let values = [1, 1.34, 3];
    for (let x = 1.01; x <= 1.5; x += 0.01) values = lock.change(ranges, values, 0, x);
    values = lock.change(ranges, values, 0, 1);
    assert.deepEqual(values, [1, 1.34, 3]);
  });

  it('starts again from the current values when another field is edited', () => {
    const signed = [{ min: -10, max: 10, step: 0.1 }, { min: -10, max: 10, step: 0.1 }];
    const lock = createFieldLock();
    let values = lock.change(signed, [0, 4], 0, 2);
    lock.settle();
    assert.deepEqual(values, [2, 6]);
    values = lock.change(signed, values, 1, 9);
    assert.deepEqual(values, [3, 9]);
  });

  it('scales by a ratio once a field that started at 0 settles', () => {
    const signed = [{ min: -10, max: 10, step: 0.1 }, { min: -10, max: 10, step: 0.1 }];
    const lock = createFieldLock();
    const values = lock.change(signed, [0, 4], 0, 2);
    assert.deepEqual(lock.change(signed, values, 0, 3), [3, 7]);
    lock.settle();
    assert.deepEqual(lock.change(signed, [3, 7], 0, 3.6), [3.6, 8.4]);
  });

  it('starts again after a change made elsewhere', () => {
    const lock = createFieldLock();
    lock.change(ranges, [1, 2, 0.5], 0, 1.5);
    assert.deepEqual(lock.change(ranges, [1.5, 1, 0.75], 0, 3), [3, 2, 1.5]);
  });
});
