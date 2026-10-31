import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { layerAction, moveLayer, normalizeLayersValue, parseLayerAction, sameLayersValue } from './layers';
import { DialStore, resolveDialValues, type DialConfig } from './store/DialStore';

describe('normalizeLayersValue', () => {
  it('keeps valid rows and their flags', () => {
    const value = normalizeLayersValue({
      items: [{ id: 'a', label: 'Title' }, { id: 'b', label: 'Credits', hidden: true }, { id: 'c', label: 'Outro', offCanvas: 'Outside its time.' }],
      selected: 'b',
    });
    assert.deepEqual(value, {
      items: [{ id: 'a', label: 'Title' }, { id: 'b', label: 'Credits', hidden: true }, { id: 'c', label: 'Outro', offCanvas: 'Outside its time.' }],
      selected: 'b',
    });
  });

  it('drops invalid and repeated rows, and a selection that names no row', () => {
    const value = normalizeLayersValue({
      items: [{ id: 'a', label: 'One' }, { id: 'a', label: 'Again' }, { id: '', label: 'No id' }, { id: 'b' }, 'c'],
      selected: 'missing',
    });
    assert.deepEqual(value, { items: [{ id: 'a', label: 'One' }], selected: null });
  });

  it('falls back when the value is not a list', () => {
    const fallback = { items: [{ id: 'x', label: 'X' }], selected: 'x' };
    assert.deepEqual(normalizeLayersValue('nope', fallback), fallback);
    assert.deepEqual(normalizeLayersValue(undefined), { items: [], selected: null });
  });
});

describe('sameLayersValue', () => {
  it('compares rows, flags and selection', () => {
    const a = { items: [{ id: 'a', label: 'A' }], selected: null };
    assert.equal(sameLayersValue(a, { items: [{ id: 'a', label: 'A', hidden: false }], selected: null }), true);
    assert.equal(sameLayersValue(a, { items: [{ id: 'a', label: 'A', hidden: true }], selected: null }), false);
    assert.equal(sameLayersValue(a, { items: [{ id: 'a', label: 'A' }], selected: 'a' }), false);
  });
});

describe('moveLayer', () => {
  it('moves one row and keeps the selection', () => {
    const value = { items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }], selected: 'c' };
    assert.deepEqual(moveLayer(value, 2, 0).items.map(item => item.id), ['c', 'a', 'b']);
    assert.equal(moveLayer(value, 2, 0).selected, 'c');
  });
});

describe('layer actions', () => {
  it('round-trips add, duplicate and delete', () => {
    assert.deepEqual(parseLayerAction('text.layers', layerAction('text.layers', 'add')), { kind: 'add' });
    assert.deepEqual(parseLayerAction('text.layers', layerAction('text.layers', 'duplicate', 'txt_1')), { kind: 'duplicate', id: 'txt_1' });
    assert.deepEqual(parseLayerAction('text.layers', layerAction('text.layers', 'delete', 'a:b')), { kind: 'delete', id: 'a:b' });
  });

  it('ignores other actions', () => {
    assert.equal(parseLayerAction('layers', 'layersX:add'), null);
    assert.equal(parseLayerAction('layers', 'shuffle'), null);
    assert.equal(parseLayerAction('layers', 'layers:delete'), null);
    assert.equal(parseLayerAction('layers', 'layers:add:x'), null);
  });
});

describe('layers control in the store', () => {
  it('keeps a valid value, normalizes writes, and sends add, duplicate and delete as actions', () => {
    const id = 'layers-store-test';
    const config = {
      text: {
        layers: { type: 'layers', default: { items: [{ id: 'a', label: 'Title' }], selected: 'a' }, addLabel: '+ Text', empty: 'No text yet.' },
      },
    } satisfies DialConfig;
    try {
      DialStore.registerPanel(id, 'Layers', config);
      const control = DialStore.getControl(id, 'text.layers')!;
      assert.equal(control.type, 'layers');
      assert.equal(control.layers?.addLabel, '+ Text');
      assert.deepEqual(control.layers?.default, { items: [{ id: 'a', label: 'Title' }], selected: 'a' });
      assert.deepEqual(resolveDialValues(config, DialStore.getValues(id)), { text: { layers: { items: [{ id: 'a', label: 'Title' }], selected: 'a' } } });

      // A write is made valid: a repeated row drops, a missing selection clears.
      DialStore.updateValue(id, 'text.layers', { items: [{ id: 'b', label: 'B' }, { id: 'b', label: 'Again' }], selected: 'gone' });
      assert.deepEqual(DialStore.getValue(id, 'text.layers'), { items: [{ id: 'b', label: 'B' }], selected: null });

      // The same rows written again change nothing.
      let notified = 0;
      const stop = DialStore.subscribe(id, () => { notified += 1; });
      DialStore.updateValue(id, 'text.layers', { items: [{ id: 'b', label: 'B', hidden: false }], selected: null });
      assert.equal(notified, 0);
      stop();

      // A new registration keeps the stored rows.
      DialStore.updatePanel(id, 'Layers', config);
      assert.deepEqual(DialStore.getValue(id, 'text.layers'), { items: [{ id: 'b', label: 'B' }], selected: null });

      const actions: string[] = [];
      const unsubscribe = DialStore.subscribeActions(id, (action) => actions.push(action));
      DialStore.triggerAction(id, layerAction('text.layers', 'delete', 'b'));
      assert.deepEqual(actions.map((action) => parseLayerAction('text.layers', action)), [{ kind: 'delete', id: 'b' }]);
      unsubscribe();
    } finally { DialStore.unregisterPanel(id); }
  });
});
