import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DialStore, type DialConfig } from './store/DialStore';

const configA = { amount: [0.25, 0, 1], enabled: false, group: { title: '' } } satisfies DialConfig;
const configB = { amount: [0.25, 0, 1], enabled: false, extra: [3, 0, 10] } satisfies DialConfig;

type Spy = { calls: number; restore: () => void };

/** Count parseConfig calls while delegating to the original implementation. */
function spyOnParse(): Spy {
  const store = DialStore as unknown as { parseConfig: (...args: unknown[]) => unknown };
  const original = store.parseConfig;
  const spy: Spy = { calls: 0, restore: () => { store.parseConfig = original; } };
  store.parseConfig = function (this: unknown, ...args: unknown[]) {
    spy.calls += 1;
    return original.apply(this, args);
  };
  return spy;
}

describe('DialStore parse cache', () => {
  it('skips the parse and the notify when the same config is re-applied', () => {
    const id = 'structure-same-config';
    const spy = spyOnParse();
    let notified = 0;
    const unsubscribe = DialStore.subscribe(id, () => { notified += 1; });
    try {
      DialStore.registerPanel(id, 'Panel', configA);
      const parses = spy.calls;
      notified = 0;
      DialStore.updatePanel(id, 'Panel', configA);
      assert.equal(spy.calls, parses);
      assert.equal(notified, 0);
    } finally {
      unsubscribe();
      DialStore.unregisterPanel(id);
      spy.restore();
    }
  });

  it('parses and notifies when the config changes', () => {
    const id = 'structure-changed-config';
    const spy = spyOnParse();
    let notified = 0;
    const unsubscribe = DialStore.subscribe(id, () => { notified += 1; });
    try {
      DialStore.registerPanel(id, 'Panel', configA);
      const parses = spy.calls;
      notified = 0;
      DialStore.updatePanel(id, 'Panel', configB);
      assert.equal(spy.calls, parses + 1);
      assert.equal(notified, 1);
      const paths = DialStore.getPanel(id)?.controls.map((control) => control.path);
      assert.deepEqual(paths, ['amount', 'enabled', 'extra']);
    } finally {
      unsubscribe();
      DialStore.unregisterPanel(id);
      spy.restore();
    }
  });

  it('reuses the earlier parse on a round trip and keeps the edited value', () => {
    const id = 'structure-round-trip';
    const spy = spyOnParse();
    try {
      DialStore.registerPanel(id, 'Panel', configA);
      DialStore.updateValue(id, 'amount', 0.75);
      DialStore.updatePanel(id, 'Panel', configB);
      DialStore.updatePanel(id, 'Panel', configA);
      assert.equal(spy.calls, 2);
      assert.equal(DialStore.getValue(id, 'amount'), 0.75);
      assert.deepEqual(DialStore.getPanel(id)?.controls.map((control) => control.path), ['amount', 'enabled', 'group']);
    } finally {
      DialStore.unregisterPanel(id);
      spy.restore();
    }
  });

  it('drops the cache with a non-retained panel', () => {
    const id = 'structure-unregister';
    const spy = spyOnParse();
    try {
      DialStore.registerPanel(id, 'Panel', configA);
      assert.equal(spy.calls, 1);
      DialStore.unregisterPanel(id);
      DialStore.registerPanel(id, 'Panel', configA);
      assert.equal(spy.calls, 2);
    } finally {
      DialStore.unregisterPanel(id);
      spy.restore();
    }
  });

  it('still notifies when only a panel option changes', () => {
    const id = 'structure-group-option';
    let notified = 0;
    const unsubscribe = DialStore.subscribe(id, () => { notified += 1; });
    try {
      DialStore.registerPanel(id, 'Panel', configA);
      notified = 0;
      DialStore.updatePanel(id, 'Panel', configA, undefined, { group: 'Scene' });
      assert.equal(notified, 1);
      assert.equal(DialStore.getPanel(id)?.group, 'Scene');
    } finally {
      unsubscribe();
      DialStore.unregisterPanel(id);
    }
  });
});
