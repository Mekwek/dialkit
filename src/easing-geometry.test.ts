import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { easingGuideEnd, easingHandleFromKey, fitEasingGraph, formatEase, moveEasingHandle, normalizeEase, parseEase, type BezierPoints } from './easing-geometry';

describe('Bézier editor', () => {
  it('contains the curve, tangents, and full handle targets at every scale', () => {
    const curves: BezierPoints[] = [[0.42, 0, 0.58, 1], [0.25, -0.6, 0.6, 1.6], [0.15, -8, 0.85, 9], [0, -1e6, 1, 1e6], [0, -Number.MAX_VALUE, 1, Number.MAX_VALUE]];
    for (const [width, height] of [[256, 180], [180, 127], [400, 281]]) {
      for (const ease of curves) {
        const graph = fitEasingGraph(ease, width, height);
        const points = [graph.start, ...graph.handles, graph.end];
        for (const point of points) {
          assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
          assert.ok(point.x >= 12 - 1e-9 && point.x <= width - 12 + 1e-9);
          assert.ok(point.y >= 12 - 1e-9 && point.y <= height - 12 + 1e-9);
        }
        for (let step = 0; step <= 100; step++) {
          const t = step / 100;
          const weights = [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3];
          for (const axis of ['x', 'y'] as const) {
            const coordinate = points.reduce((sum, point, i) => sum + point[axis] * weights[i], 0);
            assert.ok(coordinate >= 12 - 1e-9 && coordinate <= (axis === 'x' ? width : height) - 12 + 1e-9);
          }
        }
      }
    }
  });

  it('keeps the reference at 45 degrees and the endpoints centered as overshoot grows', () => {
    const normal = fitEasingGraph([0.25, 0, 0.75, 1], 256, 180);
    const extreme = fitEasingGraph([0.25, -1, 0.75, 2], 256, 180);
    assert.ok(extreme.scale.y < normal.scale.y);
    for (const graph of [normal, extreme]) {
      assert.equal(graph.scale.x, graph.scale.y);
      const dx = graph.end.x - graph.start.x;
      const dy = graph.start.y - graph.end.y;
      assert.ok(Math.abs(Math.atan2(dy, dx) * 180 / Math.PI - 45) < 1e-9);
      assert.equal((graph.start.x + graph.end.x) / 2, 128);
      assert.equal((graph.start.y + graph.end.y) / 2, 90);
    }
    assert.equal(extreme.handles[0].y, 180 - 12);
    assert.equal(extreme.handles[1].y, 12);
  });

  it('maps drag distance using each starting axis scale and clamps X to 0…1 and Y to -1…2', () => {
    const ease: BezierPoints = [0.25, 0, 0.75, 1];
    const scale = fitEasingGraph(ease, 256, 140).scale;
    assert.deepEqual(moveEasingHandle(ease, 0, scale.x / 4, scale.y / 2, scale), [0.5, -0.5, 0.75, 1]);
    assert.deepEqual(moveEasingHandle(ease, 0, scale.x / 4, scale.y * 4, scale), [0.5, -1, 0.75, 1]);
    assert.deepEqual(moveEasingHandle(ease, 1, scale.x * 20, -scale.y * 8, scale), [0.25, 0, 1, 2]);
    assert.deepEqual(moveEasingHandle(ease, 0, -scale.x * 20, 0, scale), [0, 0, 0.75, 1]);
    assert.deepEqual(moveEasingHandle(ease, 0, 0, 0, scale), ease);
    assert.deepEqual(moveEasingHandle(ease, 0, 1, 1, { x: 0, y: 0 }), ease);
    assert.deepEqual(ease, [0.25, 0, 0.75, 1]);
    const precise: BezierPoints = [0.12345, -0.98765, 0.54321, 1.23456];
    assert.deepEqual(moveEasingHandle(precise, 0, 0, 0, scale), precise);
    assert.equal(easingHandleFromKey(precise, 0, 'ArrowUp', false)![0], precise[0]);
  });

  it('supports precise and coarse keyboard edits without changing the other handle', () => {
    const ease: BezierPoints = [0, -1, 1, 2];
    assert.deepEqual(easingHandleFromKey(ease, 0, 'ArrowLeft', false), ease);
    assert.deepEqual(easingHandleFromKey(ease, 0, 'ArrowRight', false), [0.01, -1, 1, 2]);
    assert.deepEqual(easingHandleFromKey(ease, 1, 'ArrowUp', true), ease);
    assert.deepEqual(easingHandleFromKey(ease, 0, 'ArrowDown', false), ease);
    assert.deepEqual(easingHandleFromKey(ease, 1, 'ArrowDown', true), [0, -1, 1, 1.9]);
    assert.equal(easingHandleFromKey(ease, 0, 'Tab', false), undefined);
  });

  it('accepts valid overshoot and preserves precision while rejecting invalid easing coordinates', () => {
    const ease: BezierPoints = [0.12345, -0.98765, 0.85, 1.98765];
    assert.deepEqual(parseEase(formatEase(ease)), ease);
    assert.deepEqual(parseEase(' .1, -2e2, +.9, 3. '), [0.1, -1, 0.9, 2]);
    for (const text of ['0, Infinity, 1, 1', '0, NaN, 1, 1', '0, 2px, 1, 1', '0, , 1, 1', '-0.1, 0, 1, 1', '0, 0, 1.1, 1', '0,0,1', '0,0,1,1,2', '0,1e999,1,1']) {
      assert.equal(parseEase(text), null, text);
    }
    assert.deepEqual(normalizeEase([NaN, -Infinity, 2, Infinity]), [0, 0, 1, 1]);
  });

  it('stops tangent lines at the handle rim without reversing short or coincident guides', () => {
    assert.deepEqual(easingGuideEnd({ x: 0, y: 0 }, { x: 30, y: 40 }), { x: 27, y: 36 });
    assert.deepEqual(easingGuideEnd({ x: 30, y: 40 }, { x: 0, y: 0 }), { x: 3, y: 4 });
    assert.deepEqual(easingGuideEnd({ x: 0, y: 0 }, { x: 3, y: 4 }), { x: 0, y: 0 });
    assert.deepEqual(easingGuideEnd({ x: 1, y: 1 }, { x: 1, y: 1 }), { x: 1, y: 1 });
  });
});
