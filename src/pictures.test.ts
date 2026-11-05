import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  findPictureFamily, normalizePictureFamilies, normalizePicturesValue, parsePictureAction, pictureAction,
} from './pictures';
import {
  getPictureHost, getShownPictureFamily, setPictureHost, showPictureFamily, subscribePictureFamily, subscribePictureHost,
} from './store/PictureHost';
import { DialStore, resolveDialValues, type DialConfig } from './store/DialStore';

describe('showPictureFamily', () => {
  it('keeps the family for a later control and tells every call to the listeners', () => {
    let calls = 0;
    const stop = subscribePictureFamily(() => { calls += 1; });
    showPictureFamily('path');
    showPictureFamily('path');
    assert.equal(getShownPictureFamily(), 'path');
    assert.equal(calls, 2);
    stop();
    showPictureFamily('grid');
    assert.equal(calls, 2);
  });
});

describe('picture actions', () => {
  it('round-trips a tile id, including one with the separator in it', () => {
    assert.equal(pictureAction('layout.presets', 'grid-01'), 'layout.presets:pick:grid-01');
    assert.deepEqual(parsePictureAction('layout.presets', pictureAction('layout.presets', 'grid-01')), { id: 'grid-01' });
    assert.deepEqual(parsePictureAction('presets', pictureAction('presets', 'a:b')), { id: 'a:b' });
  });

  it('ignores other actions', () => {
    assert.equal(parsePictureAction('presets', 'presets:pick:'), null);
    assert.equal(parsePictureAction('presets', 'presets:pick'), null);
    assert.equal(parsePictureAction('presets', 'presets:add'), null);
    assert.equal(parsePictureAction('presets', 'presetsX:pick:a'), null);
    assert.equal(parsePictureAction('presets', 'other:pick:a'), null);
    assert.equal(parsePictureAction('presets', 'shuffle'), null);
  });
});

describe('normalizePictureFamilies', () => {
  it('keeps valid families and tiles, dropping invalid and repeated ones', () => {
    const families = normalizePictureFamilies([
      { id: 'grid', label: 'Grid', hint: 'Rows and columns.', items: [{ id: 'g1', label: 'Grid 01', hint: 'Close.' }, { id: 'g1', label: 'Again' }, { id: '', label: 'No id' }, { id: 'g2' }] },
      { id: 'grid', label: 'Repeated family', items: [] },
      { id: 'wheel', label: 'Wheel', items: [{ id: 'g1', label: 'Taken id' }, { id: 'w1', label: 'Wheel 01' }] },
      { label: 'No id', items: [] },
      'nope',
    ]);
    assert.deepEqual(families, [
      { id: 'grid', label: 'Grid', hint: 'Rows and columns.', items: [{ id: 'g1', label: 'Grid 01', hint: 'Close.' }] },
      { id: 'wheel', label: 'Wheel', items: [{ id: 'w1', label: 'Wheel 01' }] },
    ]);
    assert.deepEqual(normalizePictureFamilies(undefined), []);
  });

  it('finds the family holding a tile', () => {
    const families = normalizePictureFamilies([{ id: 'grid', label: 'Grid', items: [{ id: 'g1', label: 'Grid 01' }] }]);
    assert.equal(findPictureFamily(families, 'g1'), 'grid');
    assert.equal(findPictureFamily(families, 'missing'), null);
    assert.equal(findPictureFamily(families, null), null);
  });

  it('makes a value a non-empty id or null', () => {
    assert.equal(normalizePicturesValue('g1'), 'g1');
    assert.equal(normalizePicturesValue(''), null);
    assert.equal(normalizePicturesValue(3), null);
    assert.equal(normalizePicturesValue(undefined), null);
  });
});

describe('picture host', () => {
  it('shares one host across module copies and notifies', () => {
    let calls = 0;
    const stop = subscribePictureHost(() => calls++);
    try {
      const attach = () => undefined;
      setPictureHost({ attach });
      assert.equal(getPictureHost().attach, attach);
      const shared = (globalThis as unknown as Record<symbol, { host: { attach?: unknown } }>)[Symbol.for('dialkit.pictureHost')];
      assert.equal(shared.host.attach, attach);
      setPictureHost({});
      assert.equal(getPictureHost().attach, undefined);
      assert.equal(calls, 2);
    } finally {
      stop();
      setPictureHost({});
    }
  });
});

describe('pictures control in the store', () => {
  const families = [
    { id: 'grid', label: 'Grid', items: [{ id: 'g1', label: 'Grid 01' }, { id: 'g2', label: 'Grid 02' }] },
    { id: 'wheel', label: 'Wheel', items: [{ id: 'a1', label: 'Arc 01' }] },
  ];

  it('starts with no selection when the config gives no default', () => {
    const id = 'pictures-store-null-test';
    const config = { layout: { presets: { type: 'pictures', families } } } satisfies DialConfig;
    // Before the panel registers, the resolved value is the default too.
    assert.deepEqual(resolveDialValues(config, {}), { layout: { presets: null } });
    try {
      DialStore.registerPanel(id, 'Pictures', config);
      const control = DialStore.getControl(id, 'layout.presets')!;
      assert.equal(control.type, 'pictures');
      assert.deepEqual(control.pictures?.families, families);
      assert.equal(control.pictures?.default, null);
      assert.equal(DialStore.getValue(id, 'layout.presets'), null);
    } finally { DialStore.unregisterPanel(id); }
  });

  it('starts with the given default, keeps written ids, and makes invalid writes null', () => {
    const id = 'pictures-store-default-test';
    const config = { layout: { presets: { type: 'pictures', families, default: 'g2' } } } satisfies DialConfig;
    try {
      DialStore.registerPanel(id, 'Pictures', config);
      assert.equal(DialStore.getControl(id, 'layout.presets')?.pictures?.default, 'g2');
      assert.deepEqual(resolveDialValues(config, DialStore.getValues(id)), { layout: { presets: 'g2' } });

      DialStore.updateValue(id, 'layout.presets', 'a1');
      assert.equal(DialStore.getValue(id, 'layout.presets'), 'a1');
      DialStore.updateValue(id, 'layout.presets', 42 as unknown as string);
      assert.equal(DialStore.getValue(id, 'layout.presets'), null);

      // Registering again keeps a selection whose tile is still there.
      DialStore.updateValue(id, 'layout.presets', 'g1');
      DialStore.registerPanel(id, 'Pictures', { layout: { presets: { type: 'pictures', families: [families[0]], default: 'g2' } } });
      assert.equal(DialStore.getValue(id, 'layout.presets'), 'g1');
      // A selection whose tile is gone falls back to the default.
      DialStore.registerPanel(id, 'Pictures', { layout: { presets: { type: 'pictures', families: [families[1]], default: 'a1' } } });
      assert.equal(DialStore.getValue(id, 'layout.presets'), 'a1');
    } finally { DialStore.unregisterPanel(id); }
  });

  it('sends a tile click as an action and leaves the value to the app', () => {
    const id = 'pictures-store-action-test';
    const actions: string[] = [];
    try {
      DialStore.registerPanel(id, 'Pictures', { layout: { presets: { type: 'pictures', families, default: 'g1' } } });
      const stop = DialStore.subscribeActions(id, action => actions.push(action));
      DialStore.triggerAction(id, pictureAction('layout.presets', 'a1'));
      stop();
      assert.deepEqual(actions, ['layout.presets:pick:a1']);
      assert.deepEqual(parsePictureAction('layout.presets', actions[0]), { id: 'a1' });
      assert.equal(DialStore.getValue(id, 'layout.presets'), 'g1');
    } finally { DialStore.unregisterPanel(id); }
  });
});
