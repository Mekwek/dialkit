import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HintStore } from './store/HintStore';

// HintStore only compares anchors by identity, so plain objects stand in for
// the DOM rows in Node.
const created: HTMLElement[] = [];
function row(name: string): HTMLElement {
  const anchor = { name } as unknown as HTMLElement;
  created.push(anchor);
  return anchor;
}

// HintStore is a module singleton: release the key, forget every hovered row
// and clear the shown hint so no test sees another test's state.
afterEach(() => {
  HintStore.setKeyHeld(false);
  for (const anchor of created.splice(0)) HintStore.leave(anchor);
  HintStore.hide();
});

describe('HintStore', () => {
  it('shows the innermost of two nested hovered rows without a notify loop', () => {
    const outer = row('outer');
    const inner = row('inner');
    HintStore.enter(outer, 'Outer hint');
    HintStore.enter(inner, 'Inner hint');

    let calls = 0;
    const unsubscribe = HintStore.subscribe(() => {
      calls += 1;
    });
    try {
      HintStore.setKeyHeld(true);
    } finally {
      unsubscribe();
    }

    assert.equal(HintStore.getShown()?.text, 'Inner hint');
    assert.equal(HintStore.getShown()?.anchor, inner);
    // Two rows each re-showing their own hint on every notification used to
    // overflow the stack; one key press must notify a bounded number of times.
    assert.ok(calls <= 2, `expected at most 2 notifications, got ${calls}`);
  });

  it('follows the pointer from row to row while the key is held', () => {
    const a = row('a');
    const b = row('b');
    HintStore.setKeyHeld(true);

    HintStore.enter(a, 'A hint');
    assert.equal(HintStore.getShown()?.text, 'A hint');
    assert.equal(HintStore.getShown()?.anchor, a);

    HintStore.enter(b, 'B hint');
    assert.equal(HintStore.getShown()?.text, 'B hint');
    assert.equal(HintStore.getShown()?.anchor, b);

    // Leaving the row the pointer came from must not take B's hint away.
    HintStore.leave(a);
    assert.equal(HintStore.getShown()?.text, 'B hint');
    assert.equal(HintStore.getShown()?.anchor, b);
  });

  it('keeps the hint after leaving its row until the key is released', () => {
    const a = row('a');
    HintStore.setKeyHeld(true);
    HintStore.enter(a, 'A hint');

    // Sticky by design: the gap between two rows must not flicker the hint.
    HintStore.leave(a);
    assert.equal(HintStore.getShown()?.text, 'A hint');
    assert.equal(HintStore.getShown()?.anchor, a);

    HintStore.setKeyHeld(false);
    assert.equal(HintStore.getShown(), null);
  });

  it('shows nothing on hover alone and shows the hovered row once the key is pressed', () => {
    const a = row('a');
    HintStore.enter(a, 'A hint');
    assert.equal(HintStore.getShown(), null);

    HintStore.setKeyHeld(true);
    assert.equal(HintStore.getShown()?.text, 'A hint');
    assert.equal(HintStore.getShown()?.anchor, a);
  });

  it('shows nothing when the key is pressed after the pointer already left', () => {
    const a = row('a');
    HintStore.enter(a, 'A hint');
    HintStore.leave(a);

    HintStore.setKeyHeld(true);
    assert.equal(HintStore.getShown(), null);
  });

  it('updates the shown hint when its row changes text', () => {
    const a = row('a');
    HintStore.setKeyHeld(true);
    HintStore.enter(a, 'Old text');
    assert.equal(HintStore.getShown()?.text, 'Old text');

    HintStore.retext(a, 'New text');
    assert.equal(HintStore.getShown()?.text, 'New text');
    assert.equal(HintStore.getShown()?.anchor, a);
  });
});
