import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DialStore } from './store/DialStore';
import { springParams, springSettleDuration } from './transition-math';
import { applyTransitionPreset, defaultTransitionPresets, easingCurves, sameTransition, springPresets } from './transition-presets';

describe('transition presets', () => {
  it('lists unique, editable curves', () => {
    assert.equal(new Set(easingCurves.map(curve => curve.name)).size, easingCurves.length);
    for (const { name, description, ease: [x1, y1, x2, y2] } of easingCurves) {
      assert.ok(description, name);
      assert.ok(x1 >= 0 && x1 <= 1 && x2 >= 0 && x2 <= 1, `${name} x`);
      assert.ok(y1 >= -1 && y1 <= 2 && y2 >= -1 && y2 <= 2, `${name} y`);
    }
    easingCurves.forEach((a, i) => easingCurves.slice(i + 1).forEach(b =>
      assert.ok(!sameTransition({ type: 'easing', duration: 1, ease: a.ease }, { type: 'easing', duration: 1, ease: b.ease }, 'easing'), `${a.name} equals ${b.name}`)));
  });

  it('keeps springs inside the slider ranges and settles Time like Physics', () => {
    for (const { name, physics, time } of springPresets) {
      assert.ok(physics.stiffness >= 1 && physics.stiffness <= 1000 && physics.damping >= 1 && physics.damping <= 100 && physics.mass >= 0.1 && physics.mass <= 10, name);
      assert.ok(time.visualDuration >= 0.1 && time.visualDuration <= 1 && time.bounce >= 0 && time.bounce <= 1, name);
      const settle = (spring: object) => springSettleDuration(springParams({ type: 'spring', ...spring }));
      assert.ok(Math.abs(settle(physics) - settle(time)) <= 0.1, `${name}: ${settle(physics)} vs ${settle(time)}`);
    }
  });

  it('matches and applies presets by the values their mode edits', () => {
    const [time, physics] = [defaultTransitionPresets('simple')[2], defaultTransitionPresets('advanced')[2]];
    assert.equal(time.name, 'Wobbly');
    assert.deepEqual(time.value, { type: 'spring', visualDuration: 0.4, bounce: 0.55 });
    assert.deepEqual(physics.value, { type: 'spring', stiffness: 180, damping: 12, mass: 1 });
    assert.ok(sameTransition({ type: 'spring', visualDuration: 0.4, bounce: 0.55, stiffness: 1 }, time.value, 'simple'));
    assert.ok(!sameTransition(time.value, physics.value, 'advanced'));

    const curve = { type: 'easing', duration: 0.6, ease: [0.1, 0.2, 0.3, 0.4] } as const;
    assert.deepEqual(applyTransitionPreset(curve, { type: 'easing', duration: 0.3, ease: [0, 0, 1, 1] }, 'easing'), { type: 'easing', duration: 0.6, ease: [0, 0, 1, 1] });
    assert.deepEqual(applyTransitionPreset({ type: 'spring', visualDuration: 0.2, bounce: 0 }, physics.value, 'advanced'), physics.value);
  });
});

function withStorage(run: (local: Map<string, string>, session: Map<string, string>) => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const local = new Map<string, string>();
  const session = new Map<string, string>();
  const storage = (map: Map<string, string>) => ({ getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => map.set(key, value) });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage(local), sessionStorage: storage(session) } });
  try { run(local, session); }
  finally {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  }
}

describe('DialStore transition presets and copy', () => {
  const key = 'dialkit:transition-presets';
  const stored = (map: Map<string, string>) => (JSON.parse(map.get(key) ?? '{"presets":[]}').presets as { id: string }[]).map(preset => preset.id);

  it('keeps saved transitions in memory until a panel persists its presets', () => withStorage((local, session) => {
    const saved = JSON.stringify({ version: 1, presets: [
      { id: 'a', name: 'Custom 1', mode: 'easing', value: { type: 'easing', duration: 0.3, ease: [0.2, 0, 0, 1] } },
      { id: 'b', name: 'Bad mode', mode: 'other', value: { type: 'spring' } },
      { id: 'c', name: 'Bad value', mode: 'simple', value: { type: 'easing', duration: 0.3, ease: [0, 0, 1, 1] } },
      { id: 'd', name: 'No ease', mode: 'easing', value: { type: 'easing', duration: 0.3 } },
      { id: 'e', name: 'Short ease', mode: 'easing', value: { type: 'easing', duration: 0.3, ease: [0, 0, 1] } },
      { id: 'f', name: 'X out of range', mode: 'easing', value: { type: 'easing', duration: 0.3, ease: [1.5, 0, 1, 1] } },
      { id: 'g', name: 'No duration', mode: 'easing', value: { type: 'easing', ease: [0, 0, 1, 1] } },
      { id: 'h', name: 'No bounce', mode: 'simple', value: { type: 'spring', visualDuration: 0.3 } },
      { id: 'i', name: 'Time only', mode: 'advanced', value: { type: 'spring', visualDuration: 0.3, bounce: 0.2 } },
      { id: 'j', name: 'No mass', mode: 'advanced', value: { type: 'spring', stiffness: 200, damping: 20, mass: null } },
      null,
    ] });
    local.set(key, saved);
    let calls = 0;
    const stop = DialStore.subscribeTransitions(() => calls++);
    const ease = [0.5, 0, 0.5, 1] as [number, number, number, number];
    const curve = DialStore.saveTransitionPreset({ type: 'easing', duration: 0.4, ease }, 'easing');
    ease[0] = 0;
    assert.deepEqual(DialStore.getTransitionPresets().map(preset => preset.id), [curve]);
    assert.deepEqual(DialStore.getTransitionPresets()[0].value, { type: 'easing', duration: 0.4, ease: [0.5, 0, 0.5, 1] });
    assert.equal(local.get(key), saved);

    // Panels that don't persist presets leave storage alone.
    DialStore.registerPanel('transition-values-only', 'Values', { amount: [1, 0, 2] }, undefined, { persist: { presets: false } });
    DialStore.registerPanel('transition-session-values', 'Values', { amount: [1, 0, 2] }, undefined, { persist: { storage: 'sessionStorage', presets: false } });
    assert.equal(local.get(key), saved);
    assert.equal(session.has(key), false);

    // A persisted panel merges what its storage holds, valid entries only, and keeps the rest there too.
    // The stored "Custom 1" clashes with the curve saved in memory, so it is numbered after it.
    DialStore.registerPanel('transition-persisted', 'Persisted', { amount: [1, 0, 2] }, undefined, { persist: true });
    stop();
    assert.equal(calls, 2);
    assert.deepEqual(DialStore.getTransitionPresets().map(preset => `${preset.id} ${preset.name}`), ['a Custom 2', `${curve} Custom 1`]);
    assert.deepEqual(stored(local), ['a', curve]);
    assert.equal(JSON.parse(local.get(key)!).presets[0].name, 'Custom 2');
    assert.equal(session.has(key), false);
  }));

  it('saves per mode into the storage of every panel that persists presets', () => withStorage((local, session) => {
    const before = DialStore.getTransitionPresets();
    DialStore.registerPanel('transition-session', 'Session', { amount: [1, 0, 2] }, undefined, { persist: { key: 'session-panel', storage: 'sessionStorage' } });
    assert.deepEqual(stored(session), before.map(preset => preset.id));
    const spring = DialStore.saveTransitionPreset({ type: 'spring', visualDuration: 0.5, bounce: 0.1 }, 'simple');
    const names = DialStore.getTransitionPresets().map(preset => `${preset.mode} ${preset.name}`);
    assert.deepEqual(names, ['easing Custom 2', 'easing Custom 1', 'simple Custom 1']);
    DialStore.deleteTransitionPreset('a');
    assert.deepEqual(stored(local), [before[1].id, spring]);
    assert.deepEqual(stored(session), [before[1].id, spring]);
    // Numbers continue after the highest saved one, so names stay unique after a delete.
    DialStore.saveTransitionPreset({ type: 'easing', duration: 0.3, ease: [0, 0, 1, 1] }, 'easing');
    assert.equal(DialStore.getTransitionPresets().at(-1)?.name, 'Custom 2');
    assert.equal(stored(local).length, 3);
  }));

  it('copies a transition with its mode and clears it', () => {
    let calls = 0;
    const stop = DialStore.subscribeTransitions(() => calls++);
    const value = { type: 'easing' as const, duration: 0.4, ease: [0.77, 0, 0.175, 1] as [number, number, number, number] };
    DialStore.copyTransition(value, 'easing');
    value.ease[0] = 0;
    assert.deepEqual(DialStore.getCopiedTransition(), { value: { type: 'easing', duration: 0.4, ease: [0.77, 0, 0.175, 1] }, mode: 'easing' });
    // Pasting hands out a copy, so a control that changes the pasted value leaves the clipboard alone.
    (DialStore.getCopiedTransition()!.value as typeof value).ease[0] = 0;
    assert.deepEqual(DialStore.getCopiedTransition()?.value, { type: 'easing', duration: 0.4, ease: [0.77, 0, 0.175, 1] });
    DialStore.clearCopiedTransition();
    DialStore.clearCopiedTransition();
    stop();
    assert.equal(DialStore.getCopiedTransition(), null);
    assert.equal(calls, 2);
  });
});
