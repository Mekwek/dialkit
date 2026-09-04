import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { getDropdownPosition } from './dropdown-position';
import { measurePanelHeight } from './panel-size';
const originalWindow = globalThis.window;
const originalStyle = globalThis.getComputedStyle;
afterEach(() => { globalThis.window = originalWindow; globalThis.getComputedStyle = originalStyle; });
const el = (left: number, top: number, width: number, height: number) => ({ getBoundingClientRect: () => ({ x: left, y: top, left, top, right: left + width, width, height, bottom: top + height }), closest: () => null, scrollTop: 0, scrollLeft: 0, clientTop: 0, clientLeft: 0 }) as HTMLElement;
describe('popover layout', () => {
  it('constrains long menus and flips them using the rendered height', () => {
    globalThis.window = { innerWidth: 800, innerHeight: 600 } as Window & typeof globalThis;
    const p = getDropdownPosition(el(650, 500, 200, 36), el(0, 0, 0, 0), { dropdownHeight: 1000 });
    assert.deepEqual(p, { top: 176, left: 592, width: 200, above: true, maxHeight: 320 });
    const small = getDropdownPosition(el(20, 60, 200, 36), el(0, 0, 0, 0), { dropdownHeight: 80 });
    assert.equal(small.above, false); assert.equal(small.top, 100);
  });
  it('accounts for inline root coordinates, scroll offsets and the visual viewport', () => {
    globalThis.window = { innerWidth: 800, innerHeight: 600, visualViewport: { offsetTop: 100, offsetLeft: 0, width: 320, height: 260 } } as unknown as Window & typeof globalThis;
    const root = el(20, 50, 280, 300); root.scrollTop = 30;
    const p = getDropdownPosition(el(40, 200, 280, 36), root, { dropdownHeight: 500 });
    assert.ok(p.top + 50 - 30 >= 108);
    assert.ok(p.left + 20 + p.width <= 312);
    assert.ok(p.maxHeight <= 116);
  });
  it('positions fixed editors beside their anchor and fits small viewports', () => {
    globalThis.window = { innerWidth: 1000, innerHeight: 600 } as Window & typeof globalThis;
    const p = getDropdownPosition(el(700, 400, 250, 36), el(20, 50, 0, 0), { dropdownHeight: 440, width: 280, maxHeight: 480, preferSide: true, fixed: true, gap: 8 });
    assert.equal(p.left, 412);
    assert.equal(p.top, 152);
    globalThis.window = { innerWidth: 350, innerHeight: 320 } as Window & typeof globalThis;
    const narrow = getDropdownPosition(el(70, 150, 250, 36), el(20, 50, 0, 0), { dropdownHeight: 440, width: 280, maxHeight: 480, preferSide: true, fixed: true });
    assert.equal(narrow.top, 8);
    assert.equal(narrow.maxHeight, 304);
    assert.ok(narrow.left >= 8 && narrow.left + narrow.width <= 342);
  });
  it('includes padding and borders exactly once under either box sizing model', () => {
    const content = { offsetHeight: 200, parentElement: {} } as HTMLElement;
    for (const boxSizing of ['border-box', 'content-box']) {
      globalThis.getComputedStyle = (() => ({ boxSizing, paddingTop: '10px', paddingBottom: '10px', borderTopWidth: '1px', borderBottomWidth: '1px' })) as typeof getComputedStyle;
      assert.equal(measurePanelHeight(content), boxSizing === 'border-box' ? 222 : 200);
    }
  });
});
