import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultBackgroundValue, type BackgroundGradient, type BackgroundValue } from './background';
import { paintBackgroundPreview } from './background-paint';
import {
  getBackgroundHost, getSavedGradients, hasBackgroundHost, setBackgroundHost, setSavedGradients, subscribeBackgroundHost,
} from './store/BackgroundHost';

const gradient = (): BackgroundGradient => ({
  shape: 'radial',
  handles: { start: { x: 0.5, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0.5, y: 0 } },
  stops: [{ at: 0, color: '#ff000080' }, { at: 100, color: '#0000ff' }],
});

describe('background host', () => {
  it('shares one host and saved list across module copies and notifies', () => {
    let calls = 0;
    const stop = subscribeBackgroundHost(() => calls++);
    try {
      assert.equal(hasBackgroundHost(), false);
      const upload = async () => ({ src: 'boards/1/bg.png', kind: 'image' as const });
      setBackgroundHost({ upload });
      assert.equal(getBackgroundHost().upload, upload);
      assert.equal(hasBackgroundHost(), true);
      const list = [{ id: 'a', gradient: gradient() }];
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
    assert.equal(hasBackgroundHost(), false);
    assert.equal(calls, 2, 'an unsubscribed listener is not called');
  });

  it('counts a host with only hooks left undefined as no host', () => {
    try {
      setBackgroundHost({ upload: undefined, mediaUrl: undefined });
      assert.equal(hasBackgroundHost(), false);
      setBackgroundHost({ gizmoTarget: () => null });
      assert.equal(hasBackgroundHost(), true);
    } finally { setBackgroundHost({}); }
  });

  it('makes each saved gradient valid', () => {
    try {
      setSavedGradients([{ id: 'partial', gradient: { shape: 'diamond' } as BackgroundGradient }]);
      const [saved] = getSavedGradients();
      assert.equal(saved.id, 'partial');
      assert.equal(saved.gradient.shape, 'diamond');
      assert.equal(saved.gradient.stops.length, 2);
    } finally { setSavedGradients([]); }
  });
});

/** A canvas whose 2D context records what is drawn. */
function fakeCanvas(width: number, height: number) {
  const calls: string[] = [];
  let pixels: Uint8ClampedArray | undefined;
  const context = {
    fillStyle: '',
    clearRect: () => calls.push('clear'),
    fillRect: () => calls.push(`fill ${context.fillStyle}`),
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (image: { data: Uint8ClampedArray }) => { pixels = image.data; calls.push('pixels'); },
  };
  const canvas = { width, height, getContext: () => context } as unknown as HTMLCanvasElement;
  return { canvas, calls, pixels: () => pixels };
}

describe('paintBackgroundPreview', () => {
  const value = (patch: Partial<BackgroundValue>): BackgroundValue => ({ ...defaultBackgroundValue(), ...patch });

  it('fills a solid color in sRGB, with its opacity', () => {
    const { canvas, calls } = fakeCanvas(4, 2);
    paintBackgroundPreview(canvas, value({ color: '#ff000080' }));
    assert.deepEqual(calls, ['clear', 'fill rgb(255 0 0 / 0.5019607843137255)']);
  });

  it('paints a gradient pixel by pixel', () => {
    const { canvas, calls, pixels } = fakeCanvas(4, 1);
    paintBackgroundPreview(canvas, value({ mode: 'gradient', gradient: { ...gradient(), shape: 'linear', handles: { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0, y: 0 } } } }));
    assert.deepEqual(calls, ['clear', 'pixels']);
    const data = pixels()!;
    // The first pixel is near the red end, half transparent; the last near the blue end, solid.
    assert.ok(data[0] > 200 && data[2] < 60 && data[3] < 160);
    assert.ok(data[12] < 60 && data[14] > 200 && data[15] > 230);
  });

  it('only clears the canvas for media', () => {
    const { canvas, calls } = fakeCanvas(2, 2);
    paintBackgroundPreview(canvas, value({ mode: 'media', media: { src: 'a.png', kind: 'image' } }));
    assert.deepEqual(calls, ['clear']);
  });
});
