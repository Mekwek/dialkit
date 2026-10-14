import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  backgroundGradientCss, defaultBackgroundValue, gradientColorAt, moveItem, moveStopPayload, normalizeBackgroundValue, sameBackgroundValue, widestGapMiddle,
  type BackgroundValue,
} from './background';
import { getBackgroundHost, getSavedGradients, setBackgroundHost, setSavedGradients, subscribeBackgroundHost } from './store/BackgroundHost';
import { DialStore, resolveDialValues, type DialConfig, type ResolvedValues } from './store/DialStore';

const custom = (): BackgroundValue => ({
  mode: 'gradient',
  color: '#123456',
  gradient: { shape: 'radial', angle: 90, stops: [{ at: 0, color: '#ff0000', alpha: 50 }, { at: 40, color: '#00ff00', alpha: 100 }, { at: 100, color: '#0000ff', alpha: 100 }] },
  media: { key: 'boards/1/bg.mp4', kind: 'video' },
  mediaDisplay: { fit: 'tile', ratio: '4:5', zoom: 1.5, tileScale: 0.4, pinX: -1, pinY: 1 },
});

describe('background value', () => {
  it('defaults to the contract value', () => {
    assert.deepEqual(defaultBackgroundValue(), {
      mode: 'solid',
      color: '#000000',
      gradient: { shape: 'linear', angle: 180, stops: [{ at: 0, color: '#000000', alpha: 100 }, { at: 100, color: '#ffffff', alpha: 100 }] },
      media: null,
      mediaDisplay: { fit: 'fill', ratio: 'source', zoom: 1, tileScale: 0.25, pinX: 0, pinY: 0 },
    });
  });

  it('keeps a valid value and falls back per field, never resetting the rest', () => {
    assert.deepEqual(normalizeBackgroundValue(custom()), custom());
    const broken = normalizeBackgroundValue({
      ...custom(),
      mode: 'pattern',
      color: 'red',
      gradient: { shape: 'conic', angle: 450, stops: [{ at: 120, color: '#ABC', alpha: -5 }, { at: 10, color: '#ffffff' }, { at: 5, color: 'nope' }] },
      media: { key: '', kind: 'image' },
      mediaDisplay: { fit: 'cover', ratio: '2:1', zoom: 9, tileScale: 0.001, pinX: 2, pinY: -1 },
    });
    assert.deepEqual(broken, {
      mode: 'solid',
      color: '#000000',
      gradient: { shape: 'linear', angle: 90, stops: [{ at: 10, color: '#ffffff', alpha: 100 }, { at: 100, color: '#aabbcc', alpha: 0 }] },
      media: null,
      mediaDisplay: { fit: 'fill', ratio: 'source', zoom: 3, tileScale: 0.05, pinX: 0, pinY: -1 },
    });
    // Fewer than two valid stops fall back to the default's; more than eight are cut.
    assert.equal(normalizeBackgroundValue({ gradient: { stops: [{ at: 0, color: '#fff' }] } }).gradient.stops.length, 2);
    const many = Array.from({ length: 12 }, (_, i) => ({ at: 100 - i, color: '#000000', alpha: 100 }));
    const cut = normalizeBackgroundValue({ gradient: { shape: 'linear', angle: 0, stops: many } }).gradient.stops;
    assert.equal(cut.length, 8);
    assert.deepEqual(cut.map(stop => stop.at), [89, 90, 91, 92, 93, 94, 95, 96]);
    // A value from before mediaDisplay existed gets the default display.
    const { mediaDisplay: _, ...old } = custom();
    assert.deepEqual(normalizeBackgroundValue(old).mediaDisplay, defaultBackgroundValue().mediaDisplay);
  });

  it('compares by content, including the media display', () => {
    assert.ok(sameBackgroundValue(custom(), custom()));
    assert.ok(!sameBackgroundValue(custom(), { ...custom(), mediaDisplay: { ...custom().mediaDisplay, tileScale: 0.41 } }));
    assert.ok(!sameBackgroundValue(custom(), { ...custom(), media: null }));
    assert.ok(!sameBackgroundValue(custom(), 'x'));
  });

  it('interpolates stop colors, finds the widest gap, and paints CSS', () => {
    const stops = custom().gradient.stops;
    assert.deepEqual(gradientColorAt(stops, 20), { color: '#808000', alpha: 75 });
    assert.deepEqual(gradientColorAt(stops, -5), { color: '#ff0000', alpha: 50 });
    assert.equal(widestGapMiddle(stops), 70);
    assert.equal(backgroundGradientCss({ ...custom().gradient, shape: 'linear' }),
      'linear-gradient(90deg, rgb(255 0 0 / 0.5) 0%, rgb(0 255 0 / 1) 40%, rgb(0 0 255 / 1) 100%)');
    assert.match(backgroundGradientCss(custom().gradient), /^radial-gradient\(circle at center, /);
  });
});

describe('reordering stop rows', () => {
  const abc = [{ at: 0, color: '#aaaaaa', alpha: 100 }, { at: 50, color: '#bbbbbb', alpha: 40 }, { at: 100, color: '#cccccc', alpha: 70 }];

  it('keeps the positions in their slots and moves the color and alpha', () => {
    // Drag A's row to the end: 0 = B, 50 = C, 100 = A.
    assert.deepEqual(moveStopPayload(abc, 0, 2), [
      { at: 0, color: '#bbbbbb', alpha: 40 }, { at: 50, color: '#cccccc', alpha: 70 }, { at: 100, color: '#aaaaaa', alpha: 100 },
    ]);
    // Drag C's row to the top: 0 = C, 50 = A, 100 = B.
    assert.deepEqual(moveStopPayload(abc, 2, 0).map(stop => [stop.at, stop.color]), [[0, '#cccccc'], [50, '#aaaaaa'], [100, '#bbbbbb']]);
    // One place down, as Alt+ArrowDown does.
    assert.deepEqual(moveStopPayload(abc, 1, 2).map(stop => [stop.at, stop.color]), [[0, '#aaaaaa'], [50, '#cccccc'], [100, '#bbbbbb']]);
  });

  it('returns new objects, leaves the input alone, and ignores a move in place', () => {
    const before = JSON.stringify(abc);
    const moved = moveStopPayload(abc, 0, 0);
    assert.deepEqual(moved, abc);
    assert.notEqual(moved[0], abc[0]);
    moveStopPayload(abc, 0, 2);
    assert.equal(JSON.stringify(abc), before);
    assert.deepEqual(moveItem(['a', 'b', 'c', 'd'], 3, 1), ['a', 'd', 'b', 'c']);
    assert.deepEqual(moveItem(['a', 'b'], 0, 9), ['b', 'a']);
  });
});

describe('background in the store', () => {
  it('registers, resolves, deep-compares writes, and keeps restored values', () => {
    const id = 'background-store';
    const config = { scene: { background: { type: 'background', default: custom() } } } satisfies DialConfig;
    const values: ResolvedValues<typeof config> = resolveDialValues(config, {});
    const typed: BackgroundValue = values.scene.background;
    assert.deepEqual(typed, custom());
    let calls = 0;
    try {
      DialStore.registerPanel(id, 'Background', config, undefined, { retainOnUnmount: true });
      const control = DialStore.getPanel(id)!.controls[0].children![0];
      assert.equal(control.type, 'background');
      assert.deepEqual(DialStore.getValue(id, 'scene.background'), custom());
      const unsubscribe = DialStore.subscribe(id, () => calls++);
      // An equal value in a new object is no change.
      DialStore.updateValue(id, 'scene.background', custom());
      assert.equal(calls, 0);
      const before = DialStore.getValue(id, 'scene.background') as BackgroundValue;
      const next = { ...custom(), mediaDisplay: { ...custom().mediaDisplay, zoom: 2.2 } };
      DialStore.updateValue(id, 'scene.background', next);
      assert.equal(calls, 1);
      assert.equal(before.mediaDisplay.zoom, 1.5, 'the previous value is never changed in place');
      // A write is validated per field.
      DialStore.updateValue(id, 'scene.background', { ...next, mode: 'nope' } as unknown as BackgroundValue);
      assert.equal((DialStore.getValue(id, 'scene.background') as BackgroundValue).mode, 'gradient');
      unsubscribe();
      // A remount keeps the edited value instead of resetting it to the default.
      DialStore.unregisterPanel(id);
      DialStore.registerPanel(id, 'Background', config);
      assert.equal((DialStore.getValue(id, 'scene.background') as BackgroundValue).mediaDisplay.zoom, 2.2);
      DialStore.resetValues(id);
      assert.deepEqual(DialStore.getValue(id, 'scene.background'), custom());
    } finally { DialStore.unregisterPanel(id); }
  });

  it('fills a missing default with the contract default', () => {
    const values = resolveDialValues({ bg: { type: 'background' } } satisfies DialConfig, {});
    assert.deepEqual(values.bg, defaultBackgroundValue());
  });
});

describe('background host', () => {
  it('shares one host and saved list across module copies and notifies', () => {
    let calls = 0;
    const stop = subscribeBackgroundHost(() => calls++);
    try {
      const upload = async () => ({ key: 'k', kind: 'image' as const });
      setBackgroundHost({ upload });
      assert.equal(getBackgroundHost().upload, upload);
      const list = [{ id: 'a', gradient: custom().gradient }];
      setSavedGradients(list);
      assert.deepEqual(getSavedGradients(), list);
      assert.notEqual(getSavedGradients()[0].gradient, list[0].gradient);
      assert.equal(calls, 2);
      const shared = (globalThis as unknown as Record<symbol, { saved: unknown[] }>)[Symbol.for('dialkit.backgroundHost')];
      assert.equal(shared.saved, getSavedGradients());
    } finally {
      stop();
      setBackgroundHost({});
      setSavedGradients([]);
    }
  });
});
