import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TransitionLibrary } from './store/TransitionLibrary';
import { EASING_CURVES, SPRING_PRESETS, curveNameFor, intensityEase, sameEase, springPresetNameFor } from './transition-presets';
import { springParams, springSettleDuration } from './transition-math';

describe('transition presets', () => {
  it('has 32 named curves with unique names and no two equal curves', () => {
    assert.equal(EASING_CURVES.length, 32);
    assert.equal(new Set(EASING_CURVES.map((curve) => curve.name)).size, 32);
    EASING_CURVES.forEach((a, i) => EASING_CURVES.slice(i + 1).forEach((b) => assert.ok(!sameEase(a.ease, b.ease), `${a.name} equals ${b.name}`)));
    assert.equal(curveNameFor([0.86, 0.14, 0.14, 0.86], EASING_CURVES), 'Flow');
    assert.equal(curveNameFor([0.1, 0.2, 0.3, 0.4], EASING_CURVES), undefined);
  });

  it('keeps a curve at 50% intensity, flattens it at 0% and stays in range at 100%', () => {
    for (const curve of EASING_CURVES) assert.ok(sameEase(intensityEase(curve.ease, 50), curve.ease), curve.name);
    assert.deepEqual(intensityEase([0.86, 0.14, 0.14, 0.86], 0), [0, 0, 1, 1]);
    const strong = intensityEase([0.34, 1.56, 0.64, 1], 100);
    assert.ok(strong.every((value, i) => (i % 2 === 0 ? value >= 0 && value <= 1 : value >= -1 && value <= 2)));
  });

  it('gives each spring preset a Time version that settles like its Physics version', () => {
    for (const preset of SPRING_PRESETS) {
      const physics = springSettleDuration(springParams({ type: 'spring', ...preset.physics }));
      const time = springSettleDuration(springParams({ type: 'spring', ...preset.time }));
      assert.ok(Math.abs(physics - time) <= 0.05, `${preset.name}: ${physics} vs ${time}`);
      assert.equal(springPresetNameFor({ type: 'spring', ...preset.time }, 'simple'), preset.name);
      assert.equal(springPresetNameFor({ type: 'spring', ...preset.physics }, 'advanced'), preset.name);
    }
  });

  it('saves custom curves under the first free number and removes them', () => {
    TransitionLibrary.setCustomCurves([]);
    assert.equal(TransitionLibrary.saveCustomCurve([0.1, 0, 0.2, 1]).name, 'Custom 1');
    assert.equal(TransitionLibrary.saveCustomCurve([0.3, 0, 0.4, 1]).name, 'Custom 2');
    TransitionLibrary.removeCustomCurve('Custom 1');
    assert.equal(TransitionLibrary.saveCustomCurve([0.5, 0, 0.6, 1]).name, 'Custom 1');
    assert.deepEqual(TransitionLibrary.getCustomCurves().map((curve) => curve.name), ['Custom 2', 'Custom 1']);
    TransitionLibrary.setCustomCurves([]);
  });

  it('saves Time and Physics springs separately, numbered per mode', () => {
    TransitionLibrary.setCustomSprings([]);
    const time = TransitionLibrary.saveCustomSpring({ type: 'spring', visualDuration: 0.6, bounce: 0.2, stiffness: 1 }, 'simple');
    assert.deepEqual(time, { name: 'Custom 1', mode: 'simple', spring: { type: 'spring', visualDuration: 0.6, bounce: 0.2 } });
    assert.equal(TransitionLibrary.saveCustomSpring({ type: 'spring', stiffness: 300, damping: 20, mass: 1 }, 'advanced').name, 'Custom 1');
    assert.equal(TransitionLibrary.saveCustomSpring({ type: 'spring', visualDuration: 0.9, bounce: 0 }, 'simple').name, 'Custom 2');
    TransitionLibrary.removeCustomSpring('Custom 1', 'advanced');
    assert.deepEqual(TransitionLibrary.getCustomSprings().map((saved) => `${saved.mode} ${saved.name}`), ['simple Custom 1', 'simple Custom 2']);
    TransitionLibrary.setCustomSprings([]);
  });
});
