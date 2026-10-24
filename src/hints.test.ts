import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getHintPosition, hasHints, HintStore, isHintKey } from './hints';
import { DialStore, flattenDialValueUpdates, resolveDialValues, type DialConfig } from './store/DialStore';

const press = (key: string, extra: Partial<KeyboardEvent> = {}) => ({
  key, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, target: null, ...extra,
});

function withStorage(storage: Partial<Storage> | undefined, run: () => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: storage ? { localStorage: storage } : {
    get localStorage(): Storage { throw new Error('blocked'); },
  } });
  try { run(); }
  finally {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  }
}

describe('hints', () => {
  it('reads _hints from each folder without adding controls or values', () => {
    const id = 'hints-config';
    const config = {
      _hints: { radius: 'Rounds the corners.', shadow: 'The shadow under the card.' },
      radius: [12, 0, 32],
      shadow: { _hints: { blur: 'Softens the edge of the shadow.' }, blur: [8, 0, 40], visible: true },
    } satisfies DialConfig;
    try {
      DialStore.registerPanel(id, 'Hints', config);
      const controls = DialStore.getPanel(id)!.controls;
      assert.deepEqual(controls.map(control => [control.path, control.hint]), [['radius', 'Rounds the corners.'], ['shadow', 'The shadow under the card.']]);
      assert.deepEqual(controls[1].children!.map(control => [control.path, control.hint]), [['shadow.blur', 'Softens the edge of the shadow.'], ['shadow.visible', undefined]]);
      assert.equal(hasHints(controls), true);
      assert.deepEqual(resolveDialValues(config, DialStore.getValues(id)), { radius: 12, shadow: { blur: 8, visible: true } });
      assert.deepEqual(flattenDialValueUpdates(config, { radius: 4 }), { radius: 4 });

      DialStore.updatePanel(id, 'Hints', { radius: [12, 0, 32], shadow: { blur: [8, 0, 40] } });
      assert.equal(hasHints(DialStore.getPanel(id)!.controls), false);
    } finally { DialStore.unregisterPanel(id); }
  });

  it('holds H only for a plain press outside fields', () => {
    assert.equal(isHintKey(press('h')), true);
    assert.equal(isHintKey(press('j')), false);
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const) {
      assert.equal(isHintKey(press('h', { [modifier]: true })), false, modifier);
    }
    for (const target of [{ tagName: 'INPUT' }, { tagName: 'TEXTAREA' }, { tagName: 'SELECT' }, { tagName: 'DIV', isContentEditable: true }]) {
      assert.equal(isHintKey(press('h', { target: target as unknown as EventTarget })), false, target.tagName);
    }
    assert.equal(isHintKey(press('h', { target: { tagName: 'BUTTON' } as unknown as EventTarget })), true);
    assert.equal(isHintKey({ ...press('h'), key: undefined as unknown as string }), false);
  });

  it('gives a shortcut assigned to H precedence', () => {
    const id = 'hints-shortcut';
    try {
      DialStore.registerPanel(id, 'Shortcut', { visible: true }, { visible: { key: 'h', modifier: 'shift' } });
      assert.equal(isHintKey(press('h')), true);
      DialStore.updatePanel(id, 'Shortcut', { visible: true }, { visible: { key: 'H' } });
      assert.equal(isHintKey(press('h')), false);
    } finally { DialStore.unregisterPanel(id); }
    assert.equal(isHintKey(press('h')), true);
  });

  it('places a hint above its row, below it near the top, and inside the viewport', () => {
    const viewport = { width: 400, height: 600 };
    const size = { width: 200, height: 40 };
    assert.deepEqual(getHintPosition({ left: 50, top: 300, bottom: 336 }, { left: 0, top: 0 }, size, viewport), { left: 50, top: 254, above: true });
    assert.deepEqual(getHintPosition({ left: 50, top: 20, bottom: 56 }, { left: 0, top: 0 }, size, viewport), { left: 50, top: 62, above: false });
    assert.equal(getHintPosition({ left: 300, top: 300, bottom: 336 }, { left: 0, top: 0 }, size, viewport).left, 192);
    assert.deepEqual(getHintPosition({ left: 50, top: 300, bottom: 336 }, { left: 20, top: 100 }, size, viewport), { left: 30, top: 154, above: true });
  });

  // HintStore is shared, so these steps run in order: once a hint has shown,
  // the tip stays hidden for the rest of the page.
  it('shows the tip until a hint first shows, then remembers it', () => {
    const saved = new Map<string, string>();
    const storage = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => void saved.set(key, value) };
    assert.equal(HintStore.isTipSeen(), true, 'no tip on the server');
    withStorage(undefined, () => assert.equal(HintStore.isTipSeen(), false, 'blocked storage still shows the tip'));
    withStorage(storage, () => {
      assert.equal(HintStore.isTipSeen(), false);
      saved.set('dialkit-hint-tip-seen', '1');
      assert.equal(HintStore.isTipSeen(), true, 'seen in an earlier visit');
      saved.clear();
      let calls = 0;
      const stop = HintStore.subscribe(() => calls++);
      HintStore.markTipSeen();
      HintStore.markTipSeen();
      stop();
      assert.equal(calls, 1);
      assert.equal(saved.get('dialkit-hint-tip-seen'), '1');
      assert.equal(HintStore.isTipSeen(), true);
    });
    withStorage(undefined, () => {
      assert.doesNotThrow(() => HintStore.markTipSeen());
      assert.equal(HintStore.isTipSeen(), true);
    });
  });
});
