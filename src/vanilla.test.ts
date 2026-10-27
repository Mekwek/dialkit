import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import { createDialKit, createDialKitController, createDialTimeline, DialStore, TimelineStore, withVisibility } from './vanilla';
import type { DialConfig } from './store/DialStore';

const config = { group: {
  _reset: true, amount: [0.25, 0, 1, 0.05], enabled: true, title: { type: 'text', default: 'Hello' },
  choice: { type: 'select', options: ['a', 'b'] }, accent: { type: 'color', default: '#ff5500' },
  cover: { type: 'image' }, position: { type: 'pad', x: [0.5, -1, 1, 0.1] },
  origin: { type: 'anchor', default: { y: 'top' } },
  spring: { type: 'spring', visualDuration: 0.3, bounce: 0.2 },
  easing: { type: 'easing', duration: 0.5, ease: [0, 0, 1, 1] }, run: { type: 'action' },
  shade: withVisibility([0.5, 0, 1], { field: 'group.enabled', is: true }),
} } satisfies DialConfig;

describe('vanilla adapter', () => {
  it('resolves every control and notifies once for nested batched updates', () => {
    const actions: string[] = [];
    const kit = createDialKit('Vanilla', config, { onAction: action => actions.push(action) });
    try {
      assert.equal(createDialKitController, createDialKit);
      assert.deepEqual(kit.values.group, { amount: 0.25, enabled: true, title: 'Hello', choice: 'a', accent: '#ff5500', cover: '', position: { x: 0.5, y: 0 }, origin: { x: 'center', y: 'top' }, spring: config.group.spring, easing: config.group.easing, run: config.group.run, shade: 0.5 });
      let calls = 0;
      const stop = kit.subscribe(values => { calls++; assert.equal(values.group.amount, kit.values.group.amount); });
      assert.equal(calls, 1);
      kit.setValues({ group: { amount: 0.8, enabled: false, position: { x: -0.5, y: 0.2 }, origin: { x: 'right', y: 'bottom' }, title: 'Changed' } });
      assert.equal(calls, 2);
      assert.deepEqual(kit.values.group.position, { x: -0.5, y: 0.2 });
      assert.deepEqual(kit.values.group.origin, { x: 'right', y: 'bottom' });
      assert.equal(kit.values.group.enabled, false);
      assert.equal(kit.values.group.shade, 0.5);
      assert.ok(!DialStore.getPanel(kit.id)!.controls[0].children!.some(control => control.path === 'group.shade'));
      DialStore.triggerAction(kit.id, 'group.run'); assert.deepEqual(actions, ['group.run']);
      stop(); kit.resetValues(); assert.equal(calls, 2); assert.equal(kit.values.group.amount, 0.25);
    } finally { kit.destroy(); }
    assert.equal(DialStore.getPanel(kit.id), undefined);
    DialStore.triggerAction(kit.id, 'group.run'); assert.equal(actions.length, 1);
  });

  it('shares stable IDs, retains presets, and destroys only its own registration', () => {
    const first = createDialKit('Shared', config, { id: 'vanilla-shared', defaultCollapsed: true });
    const second = createDialKit('Shared', config, { id: 'vanilla-shared' });
    let firstCalls = 0, secondCalls = 0;
    first.subscribe(() => firstCalls++, false); second.subscribe(() => secondCalls++, false);
    assert.equal(first.getOpen(), false);
    second.setOpen(true); assert.equal(first.getOpen(), true);
    first.setValue('group.amount', 0.6);
    const preset = DialStore.savePreset(first.id, 'Saved');
    const calls = firstCalls;
    first.destroy(); first.destroy(); first.setValue('group.amount', 0.1);
    DialStore.clearActivePreset(second.id);
    second.setValue('group.amount', 0.9);
    assert.equal(firstCalls, calls); assert.ok(secondCalls > 0);
    assert.equal(second.values.group.amount, 0.9);
    DialStore.loadPreset(second.id, preset); assert.equal(second.values.group.amount, 0.6);
    second.destroy(); assert.equal(DialStore.getPanel(second.id), undefined);
    const restored = createDialKit('Shared', config, { id: 'vanilla-shared' });
    try { assert.equal(restored.values.group.amount, 0.6); assert.equal(DialStore.getPresets(restored.id).length, 1); } finally { restored.destroy(); }
  });

  it('pastes a copied transition with its mode and keeps saved ones with a persisted kit', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } } });
    const kit = createDialKit('Transitions', config, { id: 'vanilla-transitions', persist: true });
    try {
      DialStore.copyTransition(kit.values.group.spring, DialStore.getTransitionMode(kit.id, 'group.spring'));
      const copied = DialStore.getCopiedTransition()!;
      // The header's Paste applies the copied mode, then the value.
      DialStore.updateTransitionMode(kit.id, 'group.easing', copied.mode);
      kit.setValue('group.easing', copied.value);
      assert.equal(DialStore.getTransitionMode(kit.id, 'group.easing'), 'simple');
      assert.deepEqual(kit.values.group.easing, config.group.spring);
      DialStore.clearCopiedTransition();

      const id = DialStore.saveTransitionPreset(config.group.easing, 'easing');
      assert.deepEqual(JSON.parse(storage.get('dialkit:transition-presets')!).presets.map((preset: { id: string }) => preset.id), [id]);
      DialStore.deleteTransitionPreset(id);
      assert.deepEqual(JSON.parse(storage.get('dialkit:transition-presets')!).presets, []);
    } finally {
      kit.destroy();
      if (original) Object.defineProperty(globalThis, 'window', original);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });

  it('reconciles config changes and resets to the new defaults', () => {
    const kit = createDialKit('Config', { amount: [0.5, 0, 1, 0.1] });
    try {
      kit.setValue('amount', 0.9);
      kit.updateConfig({ amount: [0.2, 0, 0.6, 0.1] });
      assert.equal(kit.values.amount, 0.6); kit.resetValues(); assert.equal(kit.values.amount, 0.2);
    } finally { kit.destroy(); }
  });

  it('removes deleted controls, including a conditional one, from the store on updateConfig', () => {
    const kit = createDialKit('Removal', { outline: true, width: withVisibility([2, 0, 8], { field: 'outline', is: true }), opacity: [0.5, 0, 1] } as DialConfig);
    try {
      kit.updateConfig({ outline: true, opacity: [0.5, 0, 1] });
      assert.deepEqual(DialStore.getPanel(kit.id)!.controls.map(control => control.path), ['outline', 'opacity']);
      assert.equal(DialStore.getValues(kit.id).width, undefined);
      kit.updateConfig({ outline: true });
      assert.deepEqual(kit.values, { outline: true });
    } finally { kit.destroy(); }
  });

  it('exposes scrubbable timeline values and updates metadata after edits', () => {
    const timeline = createDialTimeline('Timeline', { duration: 2, clip: { at: 0.2, duration: 1, from: { x: 0 }, to: { x: 100 }, transition: { type: 'easing', duration: 1, ease: [0, 0, 1, 1] } } }, { autoplay: false, track: 'single' });
    let calls = 0;
    timeline.subscribe(() => calls++, false);
    assert.equal(DialStore.getPanel(timeline.id)?.kind, 'timeline');
    assert.equal(TimelineStore.getTimeline(timeline.id)?.track, 'single');
    timeline.seek(0.7); assert.ok(Math.abs(Number(timeline.values.clip.current.x) - 50) < 0.01);
    DialStore.updateValue(timeline.id, 'clip.duration', 0.5);
    assert.equal(timeline.values.clip.duration, 0.5); assert.ok(calls >= 2);
    timeline.play(); assert.equal(timeline.values.playing, true);
    timeline.pause(); assert.equal(timeline.values.playing, false);
    timeline.destroy(); timeline.destroy();
    assert.equal(TimelineStore.getTimeline(timeline.id), undefined); assert.equal(DialStore.getPanel(timeline.id), undefined);
  });

  it('bundles without any external imports or a browser at import time', async () => {
    const result = await build({ entryPoints: ['src/vanilla/index.ts'], bundle: true, write: false, format: 'iife', globalName: 'DialKit', platform: 'browser', metafile: true, define: { 'import.meta': '{}' } });
    assert.ok(Object.values(result.metafile!.outputs).every(output => output.imports.length === 0));
    assert.ok(Object.keys(result.metafile!.inputs).every(input => !input.includes('node_modules')));
    const context = { console };
    runInNewContext(result.outputFiles[0].text, context);
    assert.equal(typeof (context as unknown as { DialKit: { createDialRoot: unknown } }).DialKit.createDialRoot, 'function');
  });
});
