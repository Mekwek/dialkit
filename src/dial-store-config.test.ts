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

  it('keeps a slider unit in its metadata and out of its value', () => {
    const id = 'config-unit';
    const config = { angle: [12, -180, 180, 1, '°'], amount: [2, 0, 10] } satisfies DialConfig;
    try {
      DialStore.registerPanel(id, 'Config', config);
      const controls = DialStore.getPanel(id)?.controls ?? [];
      assert.equal(controls.find(control => control.path === 'angle')?.type, 'slider');
      assert.equal(controls.find(control => control.path === 'angle')?.unit, '°');
      assert.equal(controls.find(control => control.path === 'amount')?.unit, undefined);
      assert.deepEqual(DialStore.getValues(id), { angle: 12, amount: 2 });
      assert.deepEqual(resolveDialValues(config, {}), { angle: 12, amount: 2 });
      assert.deepEqual(flattenDialValueUpdates(config, { angle: 90 }), { angle: 90 });
    } finally { DialStore.unregisterPanel(id); }
  });

  it('passes segmented select options through to the control metadata', () => {
    const id = 'config-segmented';
    const viewport = { value: 'viewport', label: 'Viewport', icon: ['M4 4H20V20H4Z'] };
    const config = {
      layout: { type: 'select', options: ['stack', 'grid'], display: 'segmented' },
      ratio: { type: 'select', options: ['1:1', viewport], default: '1:1', display: 'segmented', hideLabel: true },
    } satisfies DialConfig;
    try {
      DialStore.registerPanel(id, 'Config', config);
      const [layout, ratio] = DialStore.getPanel(id)!.controls;
      assert.equal(layout.display, 'segmented');
      assert.equal(layout.hideLabel, undefined);
      assert.deepEqual(ratio, { type: 'select', path: 'ratio', label: 'Ratio', options: ['1:1', viewport], display: 'segmented', hideLabel: true });
      assert.deepEqual(DialStore.getValues(id), { layout: 'stack', ratio: '1:1' });
      DialStore.updateValue(id, 'ratio', 'viewport');
      assert.deepEqual(resolveDialValues(config, DialStore.getValues(id)), { layout: 'stack', ratio: 'viewport' });
    } finally { DialStore.unregisterPanel(id); }
  });

  it('resets one folder, nested folders included, and reports when it differs from its defaults', () => {
    const id = 'config-folder-reset';
    const config = {
      layout: {
        _reset: true,
        gap: [16, 0, 64, 1],
        grid: { columns: [3, 1, 6, 1], dense: false },
      },
      motion: { _reset: true, speed: [1, 0, 3, 0.1] },
    } satisfies DialConfig;
    try {
      DialStore.registerPanel(id, 'Config', config);
      const layout = DialStore.getPanel(id)?.controls.find(control => control.path === 'layout');
      assert.equal(layout?.reset, true);
      assert.deepEqual(layout?.children?.map(control => control.path), ['layout.gap', 'layout.grid']);
      assert.deepEqual(resolveDialValues(config, DialStore.getValues(id)), {
        layout: { gap: 16, grid: { columns: 3, dense: false } },
        motion: { speed: 1 },
      });
      assert.equal(DialStore.isFolderChanged(id, 'layout'), false);

      DialStore.updateValues(id, { 'layout.grid.columns': 5, 'layout.grid.dense': true, 'motion.speed': 2 });
      assert.equal(DialStore.isFolderChanged(id, 'layout'), true);
      assert.equal(DialStore.isFolderChanged(id, 'motion'), true);

      DialStore.resetFolder(id, 'layout');
      assert.deepEqual(resolveDialValues(config, DialStore.getValues(id)), {
        layout: { gap: 16, grid: { columns: 3, dense: false } },
        motion: { speed: 2 },
      });
      assert.equal(DialStore.isFolderChanged(id, 'layout'), false);
      assert.equal(DialStore.isFolderChanged(id, 'motion'), true);

      DialStore.updateValue(id, 'motion.speed', 1);
      assert.equal(DialStore.isFolderChanged(id, 'motion'), false);
    } finally { DialStore.unregisterPanel(id); }
  });

  it('saves a folder reset like an edit and compares transitions by content', () => {
    const id = 'config-folder-reset-preset';
    const config = {
      motion: {
        _reset: true,
        speed: [1, 0, 3, 0.1],
        spring: { type: 'spring', visualDuration: 0.3, bounce: 0.2 },
      },
    } satisfies DialConfig;
    try {
      DialStore.registerPanel(id, 'Config', config);
      DialStore.updateValue(id, 'motion.speed', 2);
      const preset = DialStore.savePreset(id, 'Variant');
      DialStore.updateTransitionMode(id, 'motion.spring', 'easing');
      DialStore.updateValue(id, 'motion.spring', { type: 'easing', duration: 0.4, ease: [0.4, 0, 0.2, 1] });
      DialStore.resetFolder(id, 'motion');
      assert.equal(DialStore.getValue(id, 'motion.speed'), 1);
      assert.deepEqual(DialStore.getValue(id, 'motion.spring'), config.motion.spring);
      assert.equal(DialStore.getTransitionMode(id, 'motion.spring'), 'simple');

      // The reset is saved into the active version; Version 1 keeps its edit.
      DialStore.clearActivePreset(id);
      assert.equal(DialStore.getValue(id, 'motion.speed'), 2);
      DialStore.loadPreset(id, preset);
      assert.equal(DialStore.getValue(id, 'motion.speed'), 1);

      // A new object with the default's content counts as unchanged.
      DialStore.updateValue(id, 'motion.spring', { type: 'spring', bounce: 0.2, visualDuration: 0.3 });
      assert.equal(DialStore.isFolderChanged(id, 'motion'), false);
    } finally { DialStore.unregisterPanel(id); }
  });

  it('resets a spring or transition from its own folder, mode included', () => {
    const id = 'config-transition-reset';
    const config = {
      enter: { type: 'spring', visualDuration: 0.3, bounce: 0.2 },
      enterOut: { type: 'easing', duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    } satisfies DialConfig;
    try {
      DialStore.registerPanel(id, 'Config', config);
      assert.deepEqual(DialStore.getPanel(id)?.controls.map(control => control.reset), [true, true]);
      assert.equal(DialStore.isFolderChanged(id, 'enter'), false);

      DialStore.updateTransitionMode(id, 'enter', 'advanced');
      DialStore.updateValue(id, 'enter', { type: 'spring', stiffness: 300, damping: 20, mass: 1 });
      DialStore.updateValue(id, 'enterOut', { type: 'easing', duration: 0.5, ease: [0.4, 0, 0.2, 1] });
      assert.equal(DialStore.isFolderChanged(id, 'enter'), true);

      DialStore.resetFolder(id, 'enter');
      assert.deepEqual(DialStore.getValue(id, 'enter'), config.enter);
      assert.equal(DialStore.getTransitionMode(id, 'enter'), 'simple');
      assert.equal(DialStore.isFolderChanged(id, 'enter'), false);
      // A sibling whose name starts the same keeps its edit.
      assert.equal((DialStore.getValue(id, 'enterOut') as { duration: number }).duration, 0.5);
      assert.equal(DialStore.isFolderChanged(id, 'enterOut'), true);
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
