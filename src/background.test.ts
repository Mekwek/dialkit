import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  backgroundGradientCss, backgroundMediaCss, colorOpacity, defaultBackgroundValue, gradientColorAt, gradientFrame, gradientParamAt, gradientStrip, moveStopColor,
  normalizeBackgroundValue, paintGradient, rotateGradient, sameBackgroundValue, switchGradientShape, widestGapMiddle, withOpacity, type BackgroundGradient,
} from './background';
import { colorToRgb, parseColor } from './color';
import { DialStore, resolveDialValues, type BackgroundValue, type DialConfig, type ResolvedValues } from './store/DialStore';

const gradient = (shape: BackgroundGradient['shape'], start = { x: 0.5, y: 0.1 }, end = { x: 0.5, y: 0.9 }): BackgroundGradient => ({
  shape, handles: { start, end, width: { x: 0.1, y: 0.5 } }, stops: [{ at: 0, color: '#000000' }, { at: 100, color: '#ffffff' }],
});

function withStorage(run: (storage: Map<string, string>, writes: () => number) => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const storage = new Map<string, string>();
  let writes = 0;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { writes++; storage.set(key, value); },
  } } });
  try { run(storage, () => writes); }
  finally {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  }
}

describe('Background values', () => {
  it('fills missing or invalid fields from the fallback, one field at a time', () => {
    const base = defaultBackgroundValue();
    assert.deepEqual(normalizeBackgroundValue(undefined), base);
    const next = normalizeBackgroundValue({
      mode: 'gradient', color: 'not a color',
      gradient: { shape: 'conic', stops: [{ at: 140, color: 'oklch(0.7 0.1 200)' }, { at: -5, color: '#fff' }, { at: 50, color: 'nope' }] },
      media: { src: '', kind: 'image' }, mediaDisplay: { zoom: 9, tileSize: 0.333, position: { x: 'right', y: 'middle' } },
    }, base);
    assert.equal(next.mode, 'gradient');
    assert.equal(next.color, '#000000');
    assert.equal(next.gradient.shape, 'linear');
    assert.deepEqual(next.gradient.handles, base.gradient.handles);
    // Sorted and clamped; any CSS color is kept as written.
    assert.deepEqual(next.gradient.stops, [{ at: 0, color: '#fff' }, { at: 100, color: 'oklch(0.7 0.1 200)' }]);
    assert.equal(next.media, null);
    assert.deepEqual(next.mediaDisplay, { fit: 'fill', ratio: 'source', zoom: 3, tileSize: 0.33, position: { x: 'right', y: 'center' } });
    // Fewer than two valid stops keep the fallback's stops; more than eight keep both ends.
    assert.deepEqual(normalizeBackgroundValue({ gradient: { stops: [{ at: 0, color: '#f00' }] } }).gradient.stops, base.gradient.stops);
    const many = normalizeBackgroundValue({ gradient: { stops: Array.from({ length: 12 }, (_, i) => ({ at: i * 9, color: '#000' })) } }).gradient.stops;
    assert.equal(many.length, 8);
    assert.deepEqual([many[0].at, many[7].at], [0, 99]);
  });

  it('centres a new centred shape given without handles, as switching shape does', () => {
    const radial = normalizeBackgroundValue({ gradient: { shape: 'radial' } }).gradient;
    assert.deepEqual(radial.handles, { start: { x: 0.5, y: 0.5 }, end: { x: 0.5, y: 0.9 }, width: { x: 0.1, y: 0.5 } });
    assert.deepEqual(normalizeBackgroundValue({ gradient: { shape: 'linear' } }, { ...defaultBackgroundValue(), gradient: radial }).gradient.handles,
      defaultBackgroundValue().gradient.handles);
    // Handles given with the shape are kept.
    const handles = { start: { x: 0.2, y: 0.3 }, end: { x: 0.8, y: 0.3 }, width: { x: 0.2, y: 0.6 } };
    assert.deepEqual(normalizeBackgroundValue({ gradient: { shape: 'angular', handles } }).gradient.handles, handles);
  });

  it('keeps media and an explicit null, and compares values field by field', () => {
    const media = normalizeBackgroundValue({ media: { src: '/hero.mp4', kind: 'video' } });
    assert.deepEqual(media.media, { src: '/hero.mp4', kind: 'video' });
    assert.deepEqual(normalizeBackgroundValue({ mode: 'media' }, media).media, media.media);
    assert.equal(normalizeBackgroundValue({ media: null }, media).media, null);
    assert.ok(sameBackgroundValue(media, normalizeBackgroundValue(media)));
    assert.ok(!sameBackgroundValue(media, { ...media, mediaDisplay: { ...media.mediaDisplay, position: { x: 'left', y: 'center' } } }));
  });

  it('switches shapes in place and back without moving the line', () => {
    const linear = gradient('linear');
    const radial = switchGradientShape(linear, 'radial');
    assert.deepEqual(radial.handles, { start: { x: 0.5, y: 0.5 }, end: { x: 0.5, y: 0.9 }, width: { x: 0.1, y: 0.5 } });
    assert.deepEqual(switchGradientShape(radial, 'diamond').handles, radial.handles);
    assert.deepEqual(switchGradientShape(radial, 'linear').handles, linear.handles);
    assert.deepEqual(radial.stops, linear.stops);
  });

  it('rotates a quarter turn clockwise around the line or the centre', () => {
    const turned = rotateGradient(gradient('linear'));
    assert.deepEqual(turned.handles.start, { x: 0.9, y: 0.5 });
    assert.deepEqual(turned.handles.end, { x: 0.1, y: 0.5 });
    const once = rotateGradient(gradient('radial', { x: 0.5, y: 0.5 }, { x: 1, y: 0.5 }));
    assert.deepEqual(once.handles.end, { x: 0.5, y: 1 });
    let full = gradient('angular', { x: 0.3, y: 0.4 }, { x: 0.8, y: 0.4 });
    for (let i = 0; i < 4; i++) full = rotateGradient(full);
    assert.deepEqual(full.handles, gradient('angular', { x: 0.3, y: 0.4 }, { x: 0.8, y: 0.4 }).handles);
  });

  it('moves stop colors, finds the widest gap, and mixes colors in sRGB', () => {
    const stops = [{ at: 0, color: '#ff0000' }, { at: 20, color: '#00ff00' }, { at: 100, color: '#0000ff' }];
    assert.deepEqual(moveStopColor(stops, 0, 2), [{ at: 0, color: '#00ff00' }, { at: 20, color: '#0000ff' }, { at: 100, color: '#ff0000' }]);
    assert.equal(widestGapMiddle(stops), 60);
    assert.equal(gradientColorAt([{ at: 0, color: '#000000' }, { at: 100, color: '#ffffff' }], 25), '#404040');
    assert.equal(gradientColorAt(stops, 20), '#00ff00');
    assert.equal(gradientColorAt(stops, -5), '#ff0000');
    assert.equal(gradientColorAt(stops, 120), '#0000ff');
    assert.equal(gradientColorAt([{ at: 0, color: 'rgb(0 0 0 / 0)' }, { at: 100, color: 'rgb(255 255 255)' }], 25), 'rgb(64 64 64 / 0.25)');
  });

  it("reads and sets a stop's opacity in its color's own format", () => {
    assert.equal(colorOpacity('#ff0000'), 100);
    assert.equal(colorOpacity('rgb(0 0 0 / 0.25)'), 25);
    assert.equal(withOpacity('#ff0000', 50), '#FF000080');
    assert.equal(withOpacity('#ff000080', 100), '#FF0000');
    assert.equal(withOpacity('rgb(10 20 30)', 40), 'rgb(10 20 30 / 0.4)');
    assert.equal(withOpacity('oklch(0.7 0.1 200 / 0.5)', 0), 'oklch(0.7 0.1 200 / 0)');
    assert.equal(Math.round(colorOpacity(withOpacity('#123456', 37))), 37);
  });

  it('shades each shape and writes CSS for the axis-aligned cases', () => {
    const frame = gradientFrame({ start: { x: 0.5, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0.5, y: 0 } }, 100, 100);
    assert.equal(gradientParamAt('radial', frame, 75, 50), 0.5);
    assert.equal(gradientParamAt('diamond', frame, 75, 25), 1);
    // Angular turns from the end handle towards the width side.
    assert.equal(gradientParamAt('angular', frame, 50, 0), 0.25);
    assert.equal(gradientParamAt('angular', frame, 50, 100), 0.75);
    assert.equal(backgroundGradientCss(gradient('linear', { x: 0.5, y: 0 }, { x: 0.5, y: 1 })), 'linear-gradient(180deg, #000000 0%, #ffffff 100%)');
    assert.equal(backgroundGradientCss(gradient('linear')), 'linear-gradient(180deg, #000000 10%, #ffffff 90%)');
    const centred = { start: { x: 0.5, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0.5, y: 0.25 } };
    assert.equal(backgroundGradientCss({ ...gradient('radial'), handles: centred }), 'radial-gradient(50% 25% at 50% 50%, #000000 0%, #ffffff 100%)');
    assert.equal(backgroundGradientCss({ ...gradient('angular'), handles: centred }), 'conic-gradient(from 90deg at 50% 50%, #ffffff 0%, #000000 100%)');
  });

  it('paints the stop strip left to right, the color at x% matching the stops at x', () => {
    const stops = [{ at: 0, color: '#ff0000' }, { at: 30, color: 'rgb(0 255 0 / 0.5)' }, { at: 100, color: '#0000ff' }];
    let image: { data: Uint8ClampedArray } | undefined;
    const canvas = {
      width: 200,
      height: 4,
      getContext: () => ({
        createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
        putImageData: (data: { data: Uint8ClampedArray }) => { image = data; },
      }),
    } as unknown as HTMLCanvasElement;
    // The strip takes only the stops, so every shape shows them the same way.
    paintGradient(canvas, gradientStrip(stops));
    for (const x of [0, 30, 59, 60, 120, 199]) {
      const color = parseColor(gradientColorAt(stops, (x + 0.5) / canvas.width * 100))!;
      const expected = [...colorToRgb(color).map(n => n * 255), color.a * 255];
      const pixel = Array.from(image!.data.slice((canvas.width + x) * 4, (canvas.width + x) * 4 + 4));
      pixel.forEach((n, i) => assert.ok(Math.abs(n - expected[i]) <= 2, `at ${x}: ${pixel} vs ${expected}`));
    }
  });

  it('writes media display options as CSS', () => {
    const display = { ...defaultBackgroundValue().mediaDisplay, zoom: 1.5, position: { x: 'left', y: 'bottom' } as const };
    const image = { src: 'data:image/png;base64,AAAA', kind: 'image' as const };
    assert.deepEqual(backgroundMediaCss(image, display), {
      'background-image': 'url("data:image/png;base64,AAAA")', 'background-position': 'left bottom', 'background-repeat': 'no-repeat',
      'background-size': 'cover', transform: 'scale(1.5)', 'transform-origin': 'left bottom',
    });
    assert.equal(backgroundMediaCss(image, { ...display, fit: 'fit' })['background-size'], 'contain');
    assert.equal(backgroundMediaCss(image, { ...display, fit: 'stretch' })['background-size'], '100% 100%');
    assert.deepEqual([backgroundMediaCss(image, { ...display, fit: 'tile', tileSize: 0.4 })].map(css => [css['background-size'], css['background-repeat']]), [['auto 40%', 'repeat']]);
    const video = { src: '/clip.mp4', kind: 'video' as const };
    assert.deepEqual(backgroundMediaCss(video, { ...display, fit: 'fit' }), { 'object-fit': 'contain', 'object-position': 'left bottom', transform: 'scale(1.5)', 'transform-origin': 'left bottom' });
    assert.equal(backgroundMediaCss(video, { ...display, fit: 'tile' })['object-fit'], 'cover');
  });
});

describe('Background control store', () => {
  it('resolves its value, normalizes partial updates, and restores normalized values', () => {
    const config = { backdrop: { type: 'background', default: { mode: 'gradient', gradient: { shape: 'radial' } } } } satisfies DialConfig;
    const values: ResolvedValues<typeof config> = resolveDialValues(config, {});
    const backdrop: BackgroundValue = values.backdrop;
    assert.equal(backdrop.mode, 'gradient');
    assert.equal(backdrop.gradient.shape, 'radial');
    assert.deepEqual(backdrop.gradient.handles.start, { x: 0.5, y: 0.5 });
    const id = 'background-store';
    try {
      DialStore.registerPanel(id, 'Background', config);
      assert.equal(DialStore.getPanel(id)!.controls[0].type, 'background');
      assert.deepEqual(DialStore.getValue(id, 'backdrop'), backdrop);
      let calls = 0;
      const stop = DialStore.subscribe(id, () => calls++);
      DialStore.updateValue(id, 'backdrop', { ...backdrop });
      assert.equal(calls, 0);
      DialStore.updateValues(id, { backdrop: { color: '#123456' } as BackgroundValue });
      assert.deepEqual(DialStore.getValue(id, 'backdrop'), { ...backdrop, color: '#123456' });
      DialStore.updateValues(id, { backdrop: { gradient: { shape: 'linear' } } as BackgroundValue });
      assert.deepEqual((DialStore.getValue(id, 'backdrop') as BackgroundValue).gradient.handles, defaultBackgroundValue().gradient.handles);
      stop();
      DialStore.resetValues(id);
      assert.deepEqual(DialStore.getValue(id, 'backdrop'), backdrop);
    } finally { DialStore.unregisterPanel(id); }
  });

  it('keeps saved gradients in memory and leaves storage alone without persist', () => withStorage((storage, writes) => {
    const id = 'background-saved';
    try {
      DialStore.registerPanel(id, 'Background', { backdrop: { type: 'background' } });
      const first = DialStore.saveGradient(id, gradient('linear'));
      const second = DialStore.saveGradient(id, gradient('diamond'));
      assert.deepEqual(DialStore.getSavedGradients(id).map(saved => saved.id), [first, second]);
      DialStore.deleteGradient(id, first);
      assert.deepEqual(DialStore.getSavedGradients(id).map(saved => saved.gradient.shape), ['diamond']);
      assert.equal(writes(), 0);
      assert.equal(storage.size, 0);
    } finally { DialStore.unregisterPanel(id); }
    assert.deepEqual(DialStore.getSavedGradients(id), []);
  }));

  it('persists saved gradients with a panel that opts in, and restores them valid', () => withStorage(storage => {
    const id = 'background-persist';
    const config = { backdrop: { type: 'background' } } satisfies DialConfig;
    try {
      DialStore.registerPanel(id, 'Background', config, undefined, { persist: { key: id, presets: false } });
      DialStore.saveGradient(id, gradient('angular'));
      DialStore.updateValue(id, 'backdrop', { ...defaultBackgroundValue(), mode: 'gradient' });
    } finally { DialStore.unregisterPanel(id); }
    const saved = JSON.parse(storage.get(id)!);
    assert.equal(saved.gradients.length, 1);
    assert.equal(saved.values.backdrop.mode, 'gradient');
    saved.gradients.push({ id: 'bad' }, { id: 'partial', gradient: { shape: 'radial' } });
    saved.values.backdrop.mediaDisplay = 'bad';
    // A new page: a panel that has not been registered yet reads the stored record.
    const reloaded = 'background-persist-reloaded';
    storage.set(reloaded, JSON.stringify(saved));
    try {
      DialStore.registerPanel(reloaded, 'Background', config, undefined, { persist: { key: reloaded } });
      assert.deepEqual(DialStore.getSavedGradients(reloaded).map(entry => entry.gradient.shape), ['angular', 'radial']);
      assert.equal(DialStore.getSavedGradients(reloaded)[1].gradient.stops.length, 2);
      const value = DialStore.getValue(reloaded, 'backdrop') as BackgroundValue;
      assert.equal(value.mode, 'gradient');
      assert.deepEqual(value.mediaDisplay, defaultBackgroundValue().mediaDisplay);
    } finally { DialStore.unregisterPanel(reloaded); }
  }));
});
