import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TransitionLibrary } from './store/TransitionLibrary';
import { EASING_CURVES, SPRING_PRESETS, curveNameFor, describeCopied, intensityEase, sameEase, springPresetNameFor } from './transition-presets';
import { springParams, springSettleDuration } from './transition-math';

describe('transition presets', () => {
  it('has 40 curves with unique names and no two equal curves', () => {
    assert.equal(EASING_CURVES.length, 40);
    assert.equal(new Set(EASING_CURVES.map((curve) => curve.name)).size, 40);
    EASING_CURVES.forEach((a, i) => EASING_CURVES.slice(i + 1).forEach((b) => assert.ok(!sameEase(a.ease, b.ease), `${a.name} equals ${b.name}`)));
    assert.equal(curveNameFor([0.33, 0, 0, 1], EASING_CURVES), 'Glide');
    // The classic curves use Flow's default values.
    assert.equal(curveNameFor([0.9, 0, 0.1, 1], EASING_CURVES), 'Expo In Out');
    assert.equal(curveNameFor([0.36, 0, 0.63, 1], EASING_CURVES), 'Sine In Out');
    assert.equal(curveNameFor([0, 0, 0.67, 1], EASING_CURVES), 'Ease Out');
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

  it('keeps every spring preset inside the Physics slider ranges and stable at a 1/60s step', () => {
    for (const { name, physics, time } of SPRING_PRESETS) {
      assert.ok(physics.stiffness >= 1 && physics.stiffness <= 1000, `${name} stiffness`);
      assert.ok(physics.damping >= 1 && physics.damping <= 100, `${name} damping`);
      assert.ok(physics.mass >= 0.1 && physics.mass <= 10, `${name} mass`);
      // One step of damping must not cancel more than all of the speed.
      assert.ok(physics.damping / physics.mass / 60 <= 1, `${name} flips its speed every step`);
      // Theca turns a Time spring into damping 4π × (1 − bounce) / duration, with mass 1.
      assert.ok((4 * Math.PI * (1 - time.bounce)) / time.visualDuration / 60 <= 1, `${name} Time flips its speed every step`);
      // Theca runs a step of 1/60s: faster springs leave the exact curve.
      assert.ok(Math.sqrt(physics.stiffness / physics.mass) / 60 <= 1, `${name} is too fast for a 1/60s step`);
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
  it('copies a transition with its tab, as a copy', () => {
    const ease = { type: 'easing' as const, duration: 0.4, ease: [0.76, 0, 0.24, 1] as [number, number, number, number] };
    TransitionLibrary.copyTransition(ease, 'easing');
    ease.ease[0] = 0.1;
    assert.deepEqual(TransitionLibrary.getCopied(), { value: { type: 'easing', duration: 0.4, ease: [0.76, 0, 0.24, 1] }, mode: 'easing' });
    assert.equal(describeCopied(TransitionLibrary.getCopied()!), 'Easing · Quart In Out');
    assert.equal(describeCopied({ value: { type: 'spring', stiffness: 180, damping: 12, mass: 1 }, mode: 'advanced' }), 'Physics · Wobbly');
    assert.equal(describeCopied({ value: { type: 'spring', visualDuration: 0.7, bounce: 0.1 }, mode: 'simple' }), 'Time · Custom');
  });
});
