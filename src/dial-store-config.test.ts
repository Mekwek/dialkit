import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DialStore, flattenDialValueUpdates, resolveDialValues, type DialConfig } from './store/DialStore';

describe('DialStore config lifecycle', () => {
  it('uses the same defaults before registration, after registration, and after reset', () => {
    const config = {
      amount: [0.25, 0, 1],
      enabled: false,
      title: '',
      group: {
        _collapsed: true,
        empty: { type: 'select', options: [] },
        explicit: { type: 'select', options: [], default: 'pending' },
        choice: { type: 'select', options: [{ value: 'one', label: 'One' }] },
        color: { type: 'color' },
        image: { type: 'image' },
        text: { type: 'text' },
        position: { type: 'pad' },
        spring: { type: 'spring', stiffness: 200, damping: 20 },
        easing: { type: 'easing', duration: 0.5, ease: [0, 0, 1, 1] },
        run: { type: 'action', label: 'Run' },
      },
    } satisfies DialConfig;
    const expected = {
      amount: 0.25, enabled: false, title: '',
      group: {
        empty: '', explicit: 'pending', choice: 'one', color: '#000000', image: '', text: '',
        position: { x: 0, y: 0 }, spring: config.group.spring, easing: config.group.easing, run: config.group.run,
      },
    };
    const id = 'config-lifecycle';
    assert.deepEqual(resolveDialValues(config, {}), expected);
    try {
      DialStore.registerPanel(id, 'Config', config);
      assert.deepEqual(resolveDialValues(config, DialStore.getValues(id)), expected);
      assert.equal(DialStore.getTransitionMode(id, 'group.spring'), 'advanced');
      assert.equal(DialStore.getTransitionMode(id, 'group.easing'), 'easing');
      DialStore.updateValues(id, flattenDialValueUpdates(config, { amount: 0, enabled: true, group: { text: 'Edited' } }));
      assert.equal(resolveDialValues(config, DialStore.getValues(id)).amount, 0);
      DialStore.resetValues(id);
      assert.deepEqual(resolveDialValues(config, DialStore.getValues(id)), expected);
      DialStore.updatePanel(id, 'Config', config);
      assert.deepEqual(resolveDialValues(config, DialStore.getValues(id)), expected);
    } finally { DialStore.unregisterPanel(id); }
  });

  it('keeps base edits and preset edits separate across config changes and remounts', () => {
    const id = 'config-presets';
    const config = { amount: [2, 0, 10, 1], group: { enabled: true, run: { type: 'action' } } } satisfies DialConfig;
    const actions: string[] = [];
    const unsubscribe = DialStore.subscribeActions(id, action => actions.push(action));
    try {
      DialStore.registerPanel(id, 'Config', config, undefined, { retainOnUnmount: true });
      DialStore.updateValue(id, 'amount', 4);
      const preset = DialStore.savePreset(id, 'Variant');
      DialStore.updateValues(id, { amount: 8, 'group.enabled': false, 'group.run': 123, unknown: 1 });
      DialStore.clearActivePreset(id);
      assert.equal(DialStore.getValue(id, 'amount'), 4);
      assert.equal(DialStore.getValue(id, 'group.enabled'), true);
      assert.deepEqual(DialStore.getValue(id, 'group.run'), config.group.run);
      assert.equal(DialStore.getValue(id, 'unknown'), undefined);
      DialStore.loadPreset(id, preset);
      assert.equal(DialStore.getValue(id, 'amount'), 8);
      DialStore.updatePanel(id, 'Config', { ...config, amount: [2, 0, 6, 1] });
      assert.equal(DialStore.getValue(id, 'amount'), 6);
      DialStore.unregisterPanel(id);
      DialStore.registerPanel(id, 'Config', config);
      assert.equal(DialStore.getValue(id, 'amount'), 6);
      DialStore.triggerAction(id, 'group.run');
      assert.deepEqual(actions, ['group.run']);
      DialStore.resetValues(id);
      assert.equal(DialStore.getValue(id, 'amount'), 2);
    } finally { unsubscribe(); DialStore.unregisterPanel(id); }
  });

  it('notifies once for a batch and preserves snapshots for unchanged values', () => {
    const id = 'config-notifications';
    let calls = 0;
    DialStore.registerPanel(id, 'Config', { amount: 1, enabled: true, position: { type: 'pad' } });
    const unsubscribe = DialStore.subscribe(id, () => calls++);
    try {
      const before = DialStore.getValues(id);
      DialStore.updateValues(id, { amount: 1, enabled: true, position: { x: 0, y: 0 }, unknown: 1 });
      assert.equal(calls, 0);
      assert.equal(DialStore.getValues(id), before);
      DialStore.updateValues(id, { amount: 0.5, enabled: false });
      assert.equal(calls, 1);
      assert.notEqual(DialStore.getValues(id), before);
      assert.equal(before.amount, 1);
      assert.equal(before.enabled, true);
      assert.equal(DialStore.getValue(id, 'amount'), 0.5);
    } finally { unsubscribe(); DialStore.unregisterPanel(id); }
  });

  it('preserves shared registrations and subscribers across remounts', () => {
    const id = 'config-shared-owners';
    const config = { amount: 1 };
    let calls = 0;
    const unsubscribe = DialStore.subscribe(id, () => calls++);
    try {
      DialStore.registerPanel(id, 'First', config);
      DialStore.registerPanel(id, 'Second', config);
      DialStore.unregisterPanel(id);
      assert.ok(DialStore.getPanel(id));
      DialStore.updateValue(id, 'amount', 0.5);
      assert.equal(calls, 3);
      DialStore.unregisterPanel(id);
      assert.equal(DialStore.getPanel(id), undefined);
      DialStore.registerPanel(id, 'Remounted', config);
      DialStore.updateValue(id, 'amount', 0.25);
      assert.equal(calls, 5);
    } finally { unsubscribe(); DialStore.unregisterPanel(id); }
  });

  it('keeps shortcut metadata and lookups aligned after configuration changes', () => {
    const id = 'config-shortcuts';
    const config = { group: { amount: [2, 0, 10] } } satisfies DialConfig;
    const shortcuts = { 'group.amount': { key: 'r', interaction: 'scroll-only' as const } };
    try {
      DialStore.registerPanel(id, 'Config', config, shortcuts);
      DialStore.updatePanel(id, 'Config', { group: { amount: [2, 0, 20] } });
      const target = DialStore.resolveShortcutTarget('R');
      assert.equal(target?.panelId, id);
      assert.equal(target?.control.max, 20);
      assert.deepEqual(target?.control.shortcut, shortcuts['group.amount']);
      assert.equal(DialStore.resolveScrollOnlyTargets().find(target => target.panelId === id)?.control.max, 20);
      DialStore.updatePanel(id, 'Config', { enabled: true }, {});
      assert.equal(DialStore.resolveShortcutTarget('r'), null);
    } finally { DialStore.unregisterPanel(id); }
  });

  it('keeps a slider unit and the plain number value', () => {
    const id = 'config-unit';
    const config = { angle: [12, -180, 180, 1, '°'], amount: [2, 0, 10] } satisfies DialConfig;
    try {
      DialStore.registerPanel(id, 'Config', config);
      const controls = DialStore.getPanel(id)?.controls ?? [];
      assert.equal(controls.find(c => c.path === 'angle')?.unit, '°');
      assert.equal(controls.find(c => c.path === 'angle')?.step, 1);
      assert.equal(controls.find(c => c.path === 'amount')?.unit, undefined);
      assert.deepEqual(DialStore.getValues(id), { angle: 12, amount: 2 });
      assert.deepEqual(resolveDialValues(config, {}), { angle: 12, amount: 2 });
    } finally { DialStore.unregisterPanel(id); }
  });

  it('reads a fields row and resets only its paths', () => {
    const id = 'config-fields';
    const config = {
      position: { _fields: { decimals: 0 }, x: [1.5, -10, 10, 0.01] },
      scale: { _fields: true, uniform: true, x: [1, 0, 10, 0.1], y: [1, 0, 10, 0.1] },
      other: [5, 0, 10],
    } satisfies DialConfig;
    try {
      DialStore.registerPanel(id, 'Config', config);
      const folder = DialStore.getPanel(id)?.controls.find(c => c.path === 'scale');
      assert.deepEqual(folder?.fields, {});
      assert.deepEqual(DialStore.getPanel(id)?.controls.find(c => c.path === 'position')?.fields, { decimals: 0 });
      assert.deepEqual(folder?.children?.map(c => c.path), ['scale.uniform', 'scale.x', 'scale.y']);
      DialStore.updateValues(id, { 'scale.x': 4, 'scale.uniform': false, other: 8 });
      DialStore.resetPaths(id, ['scale.uniform', 'scale.x', 'scale.y']);
      assert.deepEqual(DialStore.getValues(id), { 'position.x': 1.5, 'scale.uniform': true, 'scale.x': 1, 'scale.y': 1, other: 8 });
      assert.deepEqual(resolveDialValues(config, DialStore.getValues(id)), { position: { x: 1.5 }, scale: { uniform: true, x: 1, y: 1 }, other: 8 });
    } finally { DialStore.unregisterPanel(id); }
  });

  it('resets a section, its nested sections first, and runs an action reset', () => {
    const id = 'config-section-reset';
    const config = {
      display: {
        _reset: true,
        radius: [8, 0, 24, 1],
        inner: { gap: [2, 0, 10, 1] },
        displacement: { _reset: true, amount: [0.5, 0, 1, 0.1] },
        camera: { _reset: 'resetCamera', fov: [50, 10, 120, 1], resetCamera: { type: 'action' } },
      },
      other: [5, 0, 10],
    } satisfies DialConfig;
    const actions: string[] = [];
    try {
      DialStore.registerPanel(id, 'Config', config);
      const unsubscribe = DialStore.subscribeActions(id, (path) => actions.push(path));
      const display = DialStore.getPanel(id)?.controls.find(c => c.path === 'display');
      assert.equal(display?.reset, true);
      assert.equal(display?.children?.find(c => c.path === 'display.camera')?.reset, 'display.camera.resetCamera');
      assert.equal(DialStore.hasChanges(id, ['display.radius', 'other']), false);
      DialStore.updateValues(id, { 'display.radius': 20, 'display.inner.gap': 9, 'display.displacement.amount': 1, 'display.camera.fov': 90, other: 8 });
      assert.equal(DialStore.hasChanges(id, ['display.radius']), true);
      assert.equal(DialStore.sectionHasChanges(id, 'display'), true);
      assert.equal(DialStore.sectionHasChanges(id, 'display.displacement'), true);
      DialStore.resetSection(id, 'display.displacement');
      assert.equal(DialStore.getValue(id, 'display.displacement.amount'), 0.5);
      assert.equal(DialStore.getValue(id, 'display.radius'), 20);
      DialStore.updateValue(id, 'display.displacement.amount', 1);
      DialStore.resetSection(id, 'display');
      assert.deepEqual(actions, ['display.camera.resetCamera']);
      assert.deepEqual(DialStore.getValues(id), {
        'display.radius': 8, 'display.inner.gap': 2, 'display.displacement.amount': 0.5,
        // After its action, a section resets the values the action left.
        'display.camera.fov': 50, 'display.camera.resetCamera': DialStore.getValue(id, 'display.camera.resetCamera'),
        other: 8,
      });
      unsubscribe();
    } finally { DialStore.unregisterPanel(id); }
  });

  it('resets to the host reset values, and compares objects by content', () => {
    const id = 'config-reset-values';
    const config = {
      // The host opens the panel on saved values: they are the defaults.
      layout: { _reset: true, gap: [12, 0, 50, 1], ease: { type: 'easing', duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
      other: [5, 0, 10],
    } satisfies DialConfig;
    try {
      DialStore.registerPanel(id, 'Config', config);
      const paths = ['layout.gap', 'layout.ease'];
      assert.equal(DialStore.hasChanges(id, paths), false);
      DialStore.setResetValues(id, { 'layout.gap': 4, 'layout.ease': { type: 'easing', duration: 0.3, ease: [0.4, 0, 0.2, 1] } });
      DialStore.updateValue(id, 'layout.gap', -0);
      DialStore.setResetValues(id, { 'layout.gap': 0, 'layout.ease': { type: 'easing', duration: 0.3, ease: [0.4, 0, 0.2, 1] } });
      assert.equal(DialStore.hasChanges(id, ['layout.gap']), false);
      DialStore.setResetValues(id, { 'layout.gap': 4, 'layout.ease': { type: 'easing', duration: 0.3, ease: [0.4, 0, 0.2, 1] } });
      // A path the reset values leave out is never reset and never changed.
      assert.equal(DialStore.hasChanges(id, ['other']), false);
      assert.equal(DialStore.hasChanges(id, ['layout.gap']), true);
      DialStore.resetSection(id, 'layout');
      assert.equal(DialStore.getValue(id, 'layout.gap'), 4);
      // A new object with the same content counts as unchanged.
      DialStore.updateValue(id, 'layout.ease', { type: 'easing', duration: 0.3, ease: [0.4, 0, 0.2, 1] });
      assert.equal(DialStore.hasChanges(id, paths), false);
      DialStore.updateValue(id, 'other', 9);
      DialStore.resetPaths(id, ['other']);
      assert.equal(DialStore.getValue(id, 'other'), 9);
      assert.equal(DialStore.hasChanges(id, ['other']), false);
    } finally { DialStore.unregisterPanel(id); }
  });

  it('does not retain an extra registration when an invalid config is rejected', () => {
    const id = 'config-rejected-owner';
    DialStore.registerPanel(id, 'Original', { amount: 1 });
    try {
      assert.throws(() => DialStore.registerPanel(id, 'Invalid', { position: { type: 'pad', x: [0, 1, 1] } }), RangeError);
      assert.equal(DialStore.getPanel(id)?.name, 'Original');
      assert.equal(DialStore.getValue(id, 'amount'), 1);
    } finally { DialStore.unregisterPanel(id); }
    assert.equal(DialStore.getPanel(id), undefined);
  });

  it('can save the visible value back to base after deleting the active preset', () => {
    const id = 'config-delete-active';
    try {
      DialStore.registerPanel(id, 'Config', { amount: 1 });
      const preset = DialStore.savePreset(id, 'Variant');
      DialStore.updateValue(id, 'amount', 0.5);
      DialStore.deletePreset(id, preset);
      DialStore.updateValue(id, 'amount', 0.5);
      DialStore.clearActivePreset(id);
      assert.equal(DialStore.getValue(id, 'amount'), 0.5);
    } finally { DialStore.unregisterPanel(id); }
  });
});
