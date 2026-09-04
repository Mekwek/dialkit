import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sliderKeyValue, optionKeyIndex, handleSliderKey, activateOnKey } from './control-keyboard';

function event(key: string, sameTarget = true) {
  const target = {} as EventTarget;
  return { key, target, currentTarget: sameTarget ? target : {} as EventTarget,
    shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
    prevented: false, stopped: false,
    preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
}

describe('control keyboard navigation', () => {
  it('steps in both directions without accumulating floating point error', () => {
    for (const key of ['ArrowRight', 'ArrowUp']) assert.equal(sliderKeyValue(key, 0.2, 0, 1, 0.1), 0.3);
    for (const key of ['ArrowLeft', 'ArrowDown']) assert.equal(sliderKeyValue(key, 0.3, 0, 1, 0.1), 0.2);
    assert.equal(sliderKeyValue('ArrowRight', 0.15, 0.05, 1, 0.1), 0.25);
    assert.equal(sliderKeyValue('ArrowUp', 0.00002, 0, 1, 0.00001), 0.00003);
  });
  it('supports coarse steps and exact endpoints, including a partial last step', () => {
    assert.equal(sliderKeyValue('PageUp', 20, 0, 100, 2), 40);
    assert.equal(sliderKeyValue('PageDown', 20, 0, 100, 2), 0);
    assert.equal(sliderKeyValue('ArrowRight', 20, 0, 100, 2, true), 40);
    assert.equal(sliderKeyValue('Home', 3, -1, 4.5, 2), -1);
    assert.equal(sliderKeyValue('End', 3, -1, 4.5, 2), 4.5);
    assert.equal(sliderKeyValue('ArrowRight', 4, 0, 4.5, 2), 4.5);
    assert.equal(sliderKeyValue('ArrowLeft', 4.5, 0, 4.5, 2), 4);
    assert.equal(sliderKeyValue('ArrowLeft', 0, 0, 100, 1), 0);
    assert.equal(sliderKeyValue('ArrowRight', 1, 1, 1, 1), 1);
  });
  it('consumes only slider keys, leaving text editing, Tab, and browser shortcuts alone', () => {
    const changes: number[] = []; let edits = 0;
    const run = (e: ReturnType<typeof event>) => handleSliderKey(e, 2, 0, 10, 1, v => changes.push(v), () => edits++);
    const up = event('ArrowUp'); run(up);
    assert.deepEqual(changes, [3]); assert.equal(up.prevented, true); assert.equal(up.stopped, true);
    run(event('Enter')); assert.equal(edits, 1);
    const tab = event('Tab'); run(tab); assert.equal(tab.prevented, false);
    run(event('ArrowUp', false)); run({ ...event('ArrowUp'), metaKey: true });
    assert.deepEqual(changes, [3]);
  });
  it('clamps list navigation but wraps segmented choices and handles empty lists', () => {
    assert.equal(optionKeyIndex('ArrowDown', 2, 3), 2);
    assert.equal(optionKeyIndex('ArrowDown', 2, 3, true), 0);
    assert.equal(optionKeyIndex('ArrowLeft', 0, 3, true), 2);
    assert.equal(optionKeyIndex('Home', 2, 3), 0);
    assert.equal(optionKeyIndex('End', 0, 3), 2);
    assert.equal(optionKeyIndex('ArrowDown', 0, 0), undefined);
    assert.equal(optionKeyIndex('Tab', 0, 3), undefined);
  });
  it('activates folder headers without responding to keys from nested controls', () => {
    let count = 0;
    for (const key of ['Enter', ' ']) { const e = event(key); activateOnKey(e, () => count++); assert.equal(e.prevented, true); }
    activateOnKey(event('Enter', false), () => count++);
    activateOnKey(event('ArrowDown'), () => count++);
    assert.equal(count, 2);
  });
});
