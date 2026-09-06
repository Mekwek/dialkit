import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { colorFormat, colorToHexSix, colorToHsl, colorToHsv, colorToRgb, colorToRgb255, fieldSpace, fitGamut, formatColor, hslToColor, hsvToColor, inGamut, maxChroma, parseColor, rgb255ToColor } from './color';
import { DialStore } from './store/DialStore';

const near = (a: number, b: number, epsilon = 0.00001) => assert.ok(Math.abs(a - b) < epsilon, `${a} ≈ ${b}`);
describe('color conversion and editing', () => {
  it('round-trips sRGB primaries, gray, shorthand, and alpha', () => {
    for (const hex of ['#ff0000', '#00ff00', '#0000ff', '#ffffff', '#000000', '#808080', '#1e82f080', '#abcdef00']) {
      assert.equal(formatColor(parseColor(hex)!, 'hex'), hex);
    }
    assert.equal(formatColor(parseColor('#f008')!, 'hex'), '#ff000088');
    assert.equal(formatColor(parseColor('#abc')!, 'hex'), '#aabbcc');
  });
  it('matches reference OKLCH red and still reads wide-gamut P3 input', () => {
    const red = parseColor('#ff0000')!;
    near(red.l, 0.62795536); near(red.c, 0.25768331); near(red.h, 29.233885, 0.0001);
    const wide = parseColor('color(display-p3 1 0 0 / 0.5)')!;
    assert.equal(inGamut(wide), false);
    assert.equal(inGamut(wide, 'p3'), true);
    assert.equal(colorFormat('color(display-p3 1 0 0 / 0.5)'), 'oklch');
    const roundTrip = parseColor(formatColor(wide, 'oklch'))!;
    near(roundTrip.c, wide.c, 0.0001); near(roundTrip.a, wide.a);
  });
  it('writes RGB and HSL forms and detects the format of a value', () => {
    const half = parseColor('#ff000080')!;
    assert.equal(formatColor(half, 'rgb'), 'rgb(255 0 0 / 0.502)');
    assert.equal(formatColor(half, 'hsl'), 'hsl(0 100% 50% / 0.502)');
    assert.equal(formatColor(parseColor('#47a9c3')!, 'rgb'), 'rgb(71 169 195)');
    assert.equal(formatColor(parseColor('#47a9c3')!, 'hex'), '#47a9c3');
    assert.equal(colorFormat('rgb(1 2 3)'), 'rgb');
    assert.equal(colorFormat('rgba(1, 2, 3, 0.5)'), 'rgb');
    assert.equal(colorFormat('hsl(10 20% 30%)'), 'hsl');
    assert.equal(colorFormat('oklch(0.5 0.1 20)'), 'oklch');
    assert.equal(colorFormat('#abc'), 'hex');
    assert.deepEqual(['hex', 'rgb', 'hsl', 'oklch'].map(f => fieldSpace(f as never)), ['hsv', 'hsv', 'hsl', 'oklch']);
  });
  it('round-trips the field spaces and the row readout', () => {
    const teal = parseColor('#47a9c3')!;
    assert.deepEqual(colorToRgb255(teal), [71, 169, 195]);
    assert.equal(colorToHexSix(parseColor('#47a9c380')!), '#47A9C3');
    assert.equal(formatColor(rgb255ToColor(71, 169, 195), 'hex'), '#47a9c3');
    const hsv = colorToHsv(teal);
    near(hsv.h, 192.6, 0.1); near(hsv.s, 0.636, 0.001); near(hsv.v, 0.765, 0.001);
    assert.equal(formatColor(hsvToColor(hsv), 'hex'), '#47a9c3');
    const hsl = colorToHsl(teal);
    near(hsl.h, 192.6, 0.1); near(hsl.s, 0.508, 0.001); near(hsl.l, 0.522, 0.001);
    assert.equal(formatColor(hslToColor(hsl), 'hex'), '#47a9c3');
    // A grey keeps the hue the caller passes, so the field does not jump to red.
    assert.equal(colorToHsv(parseColor('#808080')!, 210).h, 210);
    assert.equal(colorToHsl(parseColor('#ffffff')!, 210).h, 210);
    assert.equal(colorToHsv(parseColor('#808080')!).s, 0);
    near(colorToHsl(parseColor('#808080')!).l, 0.502, 0.001);
  });
  it('reduces chroma without changing lightness, hue or alpha for bounded outputs', () => {
    const color = parseColor('oklch(70% 0.35 145 / 40%)')!;
    const fitted = fitGamut(color);
    assert.ok(fitted.c < color.c);
    assert.equal(inGamut(fitted), true);
    assert.equal(fitted.l, color.l); assert.equal(fitted.h, color.h); assert.equal(fitted.a, color.a);
    assert.ok(colorToRgb(fitted).every(Number.isFinite));
    assert.equal(parseColor(formatColor(color, 'oklch'))!.c, 0.35);
  });
  it('fills the entire picker field with selectable colors inside the chosen gamut', () => {
    for (const space of ['srgb', 'p3'] as const) {
      for (const h of [0, 30, 90, 145, 220, 285]) {
        assert.equal(maxChroma(0, h, space), 0);
        assert.equal(maxChroma(1, h, space), 0);
        for (const l of [0.05, 0.25, 0.5, 0.75, 0.95]) {
          const max = maxChroma(l, h, space);
          assert.ok(max > 0);
          for (const saturation of [0, 0.25, 0.5, 0.75, 1]) {
            assert.equal(inGamut({ l, c: saturation * max, h, a: 1 }, space), true);
          }
          assert.equal(inGamut({ l, c: max + 0.00001, h, a: 1 }, space), false);
        }
      }
    }
    const wide = parseColor('color(display-p3 1 0 0)')!;
    assert.ok(maxChroma(wide.l, wide.h, 'p3') > maxChroma(wide.l, wide.h, 'srgb'));
    near(maxChroma(wide.l, wide.h, 'p3'), wide.c);
  });
  it('accepts RGB, HSL, angles and percentages without losing alpha', () => {
    for (const text of ['rgb(255 0 0 / 50%)', 'rgba(255, 0, 0, 0.5)', 'hsl(1turn 100% 50% / .5)', 'rgb(100% 0% 0% / .5)']) {
      assert.equal(formatColor(parseColor(text)!, 'hex'), '#ff000080');
    }
    assert.deepEqual(parseColor('oklch(60% 50% -30deg / 25%)'), { l: 0.6, c: 0.2, h: 330, a: 0.25 });
  });
  it('rejects malformed values, unsupported expressions and non-finite numbers', () => {
    for (const text of ['#12', '#12345', 'oklch(NaN 0.2 40)', 'oklch(1e999 .2 40)', 'rgb(1 2)', 'rgb(1 2 3 / / .5)', 'rgb(1, 2 3)', 'rgb(1,2,3,4,5)', 'rgb(10%, 2, 3)', 'oklch(1, .2, 40)', 'color(display-p3 1 0 0) trailing', 'var(--accent)', 'red']) {
      assert.equal(parseColor(text), null, text);
    }
  });
  it('detects wide-gamut color controls and keeps their values through presets', () => {
    const id = 'color-config-test';
    const value = 'oklch(0.7 0.24 145 / 0.4)';
    DialStore.registerPanel(id, 'Colors', { accent: value, title: 'hello', explicit: { type: 'color', default: 'color(display-p3 1 0 0)' } });
    assert.deepEqual(DialStore.getPanel(id)!.controls.map(c => c.type), ['color', 'text', 'color']);
    const preset = DialStore.savePreset(id, 'Wide');
    DialStore.clearActivePreset(id);
    DialStore.updateValue(id, 'accent', '#ff0000');
    DialStore.loadPreset(id, preset);
    assert.equal(DialStore.getValue(id, 'accent'), value);
    DialStore.unregisterPanel(id);
  });
});
