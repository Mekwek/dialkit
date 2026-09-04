import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPanelCorner, getPanelOriginX, getPanelOriginY } from './panel-drag';

describe('panel snap corner and animation origin', () => {
  it('uses the configured corner before the bubble is dragged', () => {
    for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const) {
      assert.equal(getPanelCorner(corner, null, 1000, 800), corner);
    }
  });

  it('uses both axes of the dragged bubble center in every quadrant', () => {
    for (const [offset, corner] of [
      [{ x: 100, y: 100 }, 'top-left'],
      [{ x: 700, y: 100 }, 'top-right'],
      [{ x: 100, y: 600 }, 'bottom-left'],
      [{ x: 700, y: 600 }, 'bottom-right'],
    ] as const) {
      assert.equal(getPanelCorner('top-right', offset, 1000, 800), corner);
      assert.equal(`${getPanelOriginY('top-right', offset, 800)}-${getPanelOriginX('top-right', offset, 1000)}`, corner);
    }
  });

  it('classifies by the center rather than the top-left edge', () => {
    assert.equal(getPanelCorner('top-left', { x: 478, y: 378 }, 1000, 800), 'top-left');
    assert.equal(getPanelCorner('top-left', { x: 479, y: 379 }, 1000, 800), 'bottom-right');
  });

  it('uses the current viewport when snapping after a resize', () => {
    const offset = { x: 400, y: 300 };
    assert.equal(getPanelCorner('top-right', offset, 1000, 800), 'top-left');
    assert.equal(getPanelCorner('top-right', offset, 600, 500), 'bottom-right');
  });

  it('falls back to the configured origin during server rendering', () => {
    assert.equal(getPanelCorner('bottom-left', { x: 100, y: 100 }), 'bottom-left');
  });
});
