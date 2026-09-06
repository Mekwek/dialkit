// Behavior lock for conditional visibility (`withVisibility`) and the
// transition `.__mode` derivation on programmatic writes.
// Run with `npm test` (node:test via tsx).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DialStore,
  flattenDialValueUpdates,
  resolveDialValues,
  withVisibility,
  unwrapVisibility,
  type ControlMeta,
  type DialConfig,
} from './store/DialStore';

const config = {
  mode: { type: 'select' as const, options: ['grid', 'sphere'] },
  radius: withVisibility([1, 0, 10], { field: 'mode', is: 'sphere' }),
  columns: withVisibility([3, 1, 12, 1], { field: 'mode', not: 'sphere' }),
  always: [0.5, 0, 1],
  advanced: withVisibility(
    { spin: [0, 0, 360], wobble: true },
    { field: 'mode', is: 'sphere' }
  ),
} satisfies DialConfig;

function paths(controls: ControlMeta[]): string[] {
  return controls.flatMap((control) =>
    control.type === 'folder' ? [control.path, ...paths(control.children ?? [])] : [control.path]
  );
}

function visiblePaths(panelId: string): string[] {
  return paths(DialStore.getPanel(panelId)!.controls);
}

function register(panelId: string) {
  DialStore.registerPanel(panelId, 'Visibility', config);
  return () => DialStore.unregisterPanel(panelId);
}

describe('DialStore conditional visibility', () => {
  it('unwraps the wrapper for defaults, resolved values, and flattened updates', () => {
    assert.deepEqual(unwrapVisibility(config.radius), [1, 0, 10]);
    assert.equal(unwrapVisibility(7), 7);

    const resolved = resolveDialValues(config, {});
    assert.equal(resolved.radius, 1);
    assert.equal(resolved.columns, 3);
    assert.deepEqual(resolved.advanced, { spin: 0, wobble: true });

    const flat = flattenDialValueUpdates(config, { radius: 4, advanced: { spin: 90 } });
    assert.deepEqual(flat, { radius: 4, 'advanced.spin': 90 });
  });

  it('filters controls against defaults at registration and keeps every value addressable', () => {
    const panelId = 'visibility-register';
    const cleanup = register(panelId);
    try {
      assert.deepEqual(visiblePaths(panelId), ['mode', 'columns', 'always']);
      // Hidden controls still own their values (and their folder descendants).
      const values = DialStore.getValues(panelId);
      assert.equal(values.radius, 1);
      assert.equal(values['advanced.spin'], 0);
      assert.equal(values['advanced.wobble'], true);
    } finally {
      cleanup();
    }
  });

  it('flips visibility on setValues, even when the batch also carries an invalid path', () => {
    const panelId = 'visibility-update';
    const cleanup = register(panelId);
    let globalNotifications = 0;
    const stop = DialStore.subscribeGlobal(() => { globalNotifications++; });
    try {
      const before = DialStore.getPanels('panel');
      DialStore.updateValues(panelId, { mode: 'sphere', 'does.not.exist': 1 });
      assert.deepEqual(visiblePaths(panelId), ['mode', 'radius', 'always', 'advanced', 'advanced.spin', 'advanced.wobble']);
      assert.equal(globalNotifications, 1, 'a visibility flip must notify global listeners');
      assert.notEqual(DialStore.getPanels('panel'), before, 'the cached panels snapshot must be replaced');
      assert.equal(DialStore.getPanels('panel').find((p) => p.id === panelId)?.controls, DialStore.getPanel(panelId)!.controls);

      // A write that changes values but not visibility leaves the tree alone.
      DialStore.updateValues(panelId, { radius: 4 });
      assert.equal(globalNotifications, 1);

      // An unchanged write is skipped entirely.
      DialStore.updateValues(panelId, { mode: 'sphere' });
      assert.equal(globalNotifications, 1);

      DialStore.updateValues(panelId, { mode: 'grid' });
      assert.deepEqual(visiblePaths(panelId), ['mode', 'columns', 'always']);
      assert.equal(globalNotifications, 2);
    } finally {
      stop();
      cleanup();
    }
  });

  it('re-evaluates visibility on loadPreset, clearActivePreset, and resetValues', () => {
    const panelId = 'visibility-presets';
    const cleanup = register(panelId);
    let globalNotifications = 0;
    const stop = DialStore.subscribeGlobal(() => { globalNotifications++; });
    try {
      // Edits while a preset is active land in that preset, so base stays grid.
      const sphere = DialStore.savePreset(panelId, 'Sphere');
      DialStore.updateValues(panelId, { mode: 'sphere' });
      assert.ok(visiblePaths(panelId).includes('radius'));
      assert.equal(globalNotifications, 1);

      DialStore.clearActivePreset(panelId);
      assert.deepEqual(visiblePaths(panelId), ['mode', 'columns', 'always'], 'base values (grid) hide the sphere controls');
      assert.equal(globalNotifications, 2);

      DialStore.loadPreset(panelId, sphere);
      assert.ok(visiblePaths(panelId).includes('radius'), 'preset values (sphere) reveal the sphere controls');
      assert.equal(globalNotifications, 3);

      DialStore.resetValues(panelId);
      assert.deepEqual(visiblePaths(panelId), ['mode', 'columns', 'always']);
      assert.equal(DialStore.getActivePresetId(panelId), null);
      assert.equal(globalNotifications, 4);
    } finally {
      stop();
      cleanup();
    }
  });

  it('keeps the filtered tree in sync with reconciled values across a config update', () => {
    const panelId = 'visibility-update-panel';
    const cleanup = register(panelId);
    try {
      DialStore.updateValues(panelId, { mode: 'sphere' });
      const nextConfig = { ...config, extra: withVisibility(true, { field: 'mode', is: 'sphere' }) };
      DialStore.updatePanel(panelId, 'Visibility', nextConfig);
      assert.ok(visiblePaths(panelId).includes('extra'), 'a new rule evaluates against the preserved value');
      assert.ok(!visiblePaths(panelId).includes('columns'));
    } finally {
      cleanup();
    }
  });
});

describe('DialStore transition mode sync', () => {
  const transitions = {
    move: { type: 'spring' as const, visualDuration: 0.3, bounce: 0.2 },
  } satisfies DialConfig;

  it('derives .__mode from the value shape on a programmatic transition write', () => {
    const panelId = 'transition-mode-sync';
    DialStore.registerPanel(panelId, 'Transition', transitions);
    try {
      assert.equal(DialStore.getTransitionMode(panelId, 'move'), 'simple');

      DialStore.updateValue(panelId, 'move', { type: 'easing', duration: 0.5, ease: [0, 0, 1, 1] });
      assert.equal(DialStore.getTransitionMode(panelId, 'move'), 'easing');

      DialStore.updateValue(panelId, 'move', { type: 'spring', stiffness: 200, damping: 25, mass: 1 });
      assert.equal(DialStore.getTransitionMode(panelId, 'move'), 'advanced');

      DialStore.updateValue(panelId, 'move', { type: 'spring', visualDuration: 0.4, bounce: 0 });
      assert.equal(DialStore.getTransitionMode(panelId, 'move'), 'simple');

      // The derived mode is part of the same write, so it lands in base values
      // and survives a re-registration with the original config.
      DialStore.updateValue(panelId, 'move', { type: 'easing', duration: 0.2, ease: [0, 0, 1, 1] });
      DialStore.updatePanel(panelId, 'Transition', transitions);
      assert.equal(DialStore.getTransitionMode(panelId, 'move'), 'easing');
      assert.equal((DialStore.getValue(panelId, 'move') as { type: string }).type, 'easing');
    } finally {
      DialStore.unregisterPanel(panelId);
    }
  });
});
