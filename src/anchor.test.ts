import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { anchorLabel, anchorValueFromKey, normalizeAnchorValue } from './anchor';
import { DialStore, flattenDialValueUpdates, resolveDialValues, type AnchorConfig, type AnchorValue, type DialConfig, type ResolvedValues } from './store/DialStore';

describe('anchor controls', () => {
  it('resolves default and nested anchors as typed pairs, without exposing their config', () => {
    const config = {
      origin: { type: 'anchor' },
      layout: { align: { type: 'anchor', default: { x: 'left', y: 'bottom' } }, partial: { type: 'anchor', default: { y: 'top' } } },
    } satisfies DialConfig;
    const values: ResolvedValues<typeof config> = resolveDialValues(config, {});
    const origin: AnchorValue = values.origin;
    const x: 'left' | 'center' | 'right' = values.layout.align.x;
    assert.deepEqual(origin, { x: 'center', y: 'center' });
    assert.equal(x, 'left');
    assert.deepEqual(values.layout, { align: { x: 'left', y: 'bottom' }, partial: { x: 'center', y: 'top' } });
    assert.deepEqual(flattenDialValueUpdates(config, { origin: { x: 'right', y: 'top' }, layout: { align: { x: 'center', y: 'center' } } }), {
      origin: { x: 'right', y: 'top' }, 'layout.align': { x: 'center', y: 'center' },
    });
    const id = 'anchor-defaults';
    try {
      DialStore.registerPanel(id, 'Anchors', config);
      assert.deepEqual(DialStore.getPanel(id)!.controls.map(c => c.type), ['anchor', 'folder']);
      assert.deepEqual(DialStore.getPanel(id)!.controls[1].children![0].anchor, config.layout.align);
      assert.deepEqual(resolveDialValues(config, DialStore.getValues(id)), values);
      assert.deepEqual(Object.keys(DialStore.getValues(id)), ['origin', 'layout.align', 'layout.partial']);
    } finally { DialStore.unregisterPanel(id); }
  });

  it('accepts only the three positions on each axis and falls back to the configured default', () => {
    assert.deepEqual(normalizeAnchorValue({ x: 'right', y: 'bottom' }), { x: 'right', y: 'bottom' });
    assert.deepEqual(normalizeAnchorValue({ x: 'top', y: 'left' }), { x: 'center', y: 'center' });
    assert.deepEqual(normalizeAnchorValue({ x: 'Right', y: 1 }, { default: { x: 'left', y: 'top' } }), { x: 'left', y: 'top' });
    assert.deepEqual(normalizeAnchorValue({ y: 'bottom' }, { default: { x: 'right' } }), { x: 'right', y: 'bottom' });
    assert.deepEqual(normalizeAnchorValue('top left', { default: { x: 'right' } }), { x: 'right', y: 'center' });
    assert.deepEqual(normalizeAnchorValue(null, { default: { x: 'middle' as never } }), { x: 'center', y: 'center' });
  });

  it('names each cell from top to bottom, then left to right', () => {
    assert.equal(anchorLabel({ x: 'left', y: 'top' }), 'Top left');
    assert.equal(anchorLabel({ x: 'center', y: 'bottom' }), 'Bottom center');
    assert.equal(anchorLabel({ x: 'right', y: 'center' }), 'Center right');
    assert.equal(anchorLabel({ x: 'center', y: 'center' }), 'Center');
  });

  it('moves one cell per arrow key in two dimensions, stops at the edges, and jumps to the corners with Home and End', () => {
    const center: AnchorValue = { x: 'center', y: 'center' };
    assert.deepEqual(anchorValueFromKey(center, 'ArrowLeft'), { x: 'left', y: 'center' });
    assert.deepEqual(anchorValueFromKey(center, 'ArrowRight'), { x: 'right', y: 'center' });
    assert.deepEqual(anchorValueFromKey(center, 'ArrowUp'), { x: 'center', y: 'top' });
    assert.deepEqual(anchorValueFromKey(center, 'ArrowDown'), { x: 'center', y: 'bottom' });
    assert.deepEqual(anchorValueFromKey({ x: 'left', y: 'top' }, 'ArrowLeft'), { x: 'left', y: 'top' });
    assert.deepEqual(anchorValueFromKey({ x: 'right', y: 'bottom' }, 'ArrowDown'), { x: 'right', y: 'bottom' });
    assert.deepEqual(anchorValueFromKey(center, 'Home'), { x: 'left', y: 'top' });
    assert.deepEqual(anchorValueFromKey(center, 'End'), { x: 'right', y: 'bottom' });
    assert.equal(anchorValueFromKey(center, 'Enter'), undefined);
  });

  it('sets both axes in one update, falls back to the default for invalid axes, and preserves presets', () => {
    const id = 'anchor-presets';
    const config = { origin: { type: 'anchor', default: { y: 'top' } } } satisfies DialConfig;
    try {
      DialStore.registerPanel(id, 'Anchor', config);
      const updates: AnchorValue[] = [];
      const unsubscribe = DialStore.subscribe(id, () => updates.push(DialStore.getValue(id, 'origin') as AnchorValue));
      DialStore.updateValues(id, flattenDialValueUpdates(config, { origin: { x: 'left', y: 'bottom' } }));
      DialStore.updateValue(id, 'origin', { x: 'left', y: 'bottom' });
      unsubscribe();
      assert.deepEqual(updates, [{ x: 'left', y: 'bottom' }]);
      DialStore.updateValue(id, 'origin', { x: 'right' } as AnchorValue);
      assert.deepEqual(DialStore.getValue(id, 'origin'), { x: 'right', y: 'top' });
      DialStore.updateValue(id, 'origin', { x: 'nowhere', y: 'bottom' } as never);
      assert.deepEqual(DialStore.getValue(id, 'origin'), { x: 'center', y: 'bottom' });
      DialStore.updateValue(id, 'origin', { x: 'right', y: 'top' });
      const preset = DialStore.savePreset(id, 'Corner');
      DialStore.clearActivePreset(id);
      DialStore.updateValue(id, 'origin', { x: 'center', y: 'center' });
      DialStore.loadPreset(id, preset);
      assert.deepEqual(DialStore.getValue(id, 'origin'), { x: 'right', y: 'top' });
      DialStore.updatePanel(id, 'Updated anchor', { origin: { type: 'anchor', default: { x: 'left', y: 'top' } } });
      assert.deepEqual(DialStore.getValue(id, 'origin'), { x: 'right', y: 'top' });
      DialStore.resetValues(id);
      assert.deepEqual(DialStore.getValue(id, 'origin'), { x: 'left', y: 'top' });
      DialStore.updatePanel(id, 'Pad', { origin: { type: 'pad' } });
      assert.deepEqual(DialStore.getValue(id, 'origin'), { x: 0, y: 0 });
      DialStore.updatePanel(id, 'Anchor again', config);
      assert.deepEqual(DialStore.getValue(id, 'origin'), { x: 'center', y: 'top' });
    } finally { DialStore.unregisterPanel(id); }
  });

  it('restores persisted pairs and replaces malformed stored axes with the defaults', () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } } });
    const config = { origin: { type: 'anchor', default: { x: 'left' } } } satisfies Record<string, AnchorConfig>;
    const options = { persist: { key: 'anchor-test-storage' } };
    try {
      DialStore.registerPanel('anchor-persist-source', 'Anchor', config, undefined, options);
      DialStore.updateValue('anchor-persist-source', 'origin', { x: 'right', y: 'bottom' });
      DialStore.unregisterPanel('anchor-persist-source');
      DialStore.registerPanel('anchor-persist-restored', 'Anchor', config, undefined, options);
      assert.deepEqual(DialStore.getValue('anchor-persist-restored', 'origin'), { x: 'right', y: 'bottom' });
      storage.set('anchor-test-storage', JSON.stringify({ version: 1, values: { origin: { x: 'invalid', y: 'top' } } }));
      DialStore.registerPanel('anchor-persist-invalid', 'Anchor', config, undefined, options);
      assert.deepEqual(DialStore.getValue('anchor-persist-invalid', 'origin'), { x: 'left', y: 'top' });
    } finally {
      for (const id of ['anchor-persist-source', 'anchor-persist-restored', 'anchor-persist-invalid']) DialStore.unregisterPanel(id);
      if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });
});
