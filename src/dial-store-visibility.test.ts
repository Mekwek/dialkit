import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DialStore,
  flattenDialValueUpdates,
  resolveDialValues,
  withVisibility,
  type ControlMeta,
  type DialConfig,
} from './store/DialStore';

const config = {
  shape: { type: 'select', options: ['grid', 'sphere', 'ring'] },
  radius: withVisibility([1, 0, 10], { field: 'shape', is: ['sphere', 'ring'] }),
  columns: withVisibility([3, 1, 12, 1], { field: 'shape', not: ['sphere', 'ring'] }),
  opacity: [0.5, 0, 1],
  orbit: withVisibility(
    { speed: [0, 0, 360], wobble: true, wobbleAmount: withVisibility([2, 0, 8], { field: 'orbit.wobble', is: true }) },
    { field: 'shape', is: 'sphere' }
  ),
} satisfies DialConfig;

function paths(controls: ControlMeta[]): string[] {
  return controls.flatMap((control) => [control.path, ...paths(control.children ?? [])]);
}

function visiblePaths(id: string): string[] {
  return paths(DialStore.getPanel(id)!.controls);
}

describe('DialStore conditional controls', () => {
  it('resolves and flattens values through withVisibility', () => {
    const resolved = resolveDialValues(config, {});
    assert.equal(resolved.radius, 1);
    assert.equal(resolved.columns, 3);
    assert.deepEqual(resolved.orbit, { speed: 0, wobble: true, wobbleAmount: 2 });

    assert.deepEqual(
      flattenDialValueUpdates(config, { radius: 4, orbit: { wobbleAmount: 6 } }),
      { radius: 4, 'orbit.wobbleAmount': 6 }
    );
  });

  it('shows only the controls whose rules hold, and hidden controls keep their values', () => {
    const id = 'visibility-register';
    DialStore.registerPanel(id, id, config);

    assert.deepEqual(visiblePaths(id), ['shape', 'columns', 'opacity']);
    const values = DialStore.getValues(id);
    assert.equal(values.radius, 1);
    assert.equal(values['orbit.speed'], 0);

    DialStore.unregisterPanel(id);
  });

  it('updates the visible controls after a write and notifies global listeners only when they change', () => {
    const id = 'visibility-write';
    DialStore.registerPanel(id, id, config);
    let global = 0;
    const unsubscribe = DialStore.subscribeGlobal(() => { global += 1; });
    const before = DialStore.getPanels('panel');

    DialStore.updateValue(id, 'shape', 'sphere');
    assert.deepEqual(visiblePaths(id), ['shape', 'radius', 'opacity', 'orbit', 'orbit.speed', 'orbit.wobble', 'orbit.wobbleAmount']);
    assert.equal(global, 1);
    assert.notEqual(DialStore.getPanels('panel'), before);

    // A write that leaves every rule as it was keeps the tree.
    DialStore.updateValue(id, 'radius', 4);
    assert.equal(global, 1);

    DialStore.updateValue(id, 'shape', 'ring');
    assert.deepEqual(visiblePaths(id), ['shape', 'radius', 'opacity']);
    assert.equal(global, 2);

    unsubscribe();
    DialStore.unregisterPanel(id);
  });

  it('applies a rule inside a folder that is itself conditional', () => {
    const id = 'visibility-nested';
    DialStore.registerPanel(id, id, config);
    DialStore.updateValues(id, { shape: 'sphere', 'orbit.wobble': false });

    assert.deepEqual(visiblePaths(id), ['shape', 'radius', 'opacity', 'orbit', 'orbit.speed', 'orbit.wobble']);
    DialStore.updateValue(id, 'orbit.wobble', true);
    assert.ok(visiblePaths(id).includes('orbit.wobbleAmount'));

    DialStore.unregisterPanel(id);
  });

  it('hides a folder once every control in it is hidden', () => {
    const id = 'visibility-empty-folder';
    DialStore.registerPanel(id, id, {
      outline: true,
      style: { width: withVisibility([2, 0, 8], { field: 'outline', is: true }) },
    });

    assert.deepEqual(visiblePaths(id), ['outline', 'style', 'style.width']);
    DialStore.updateValue(id, 'outline', false);
    assert.deepEqual(visiblePaths(id), ['outline']);

    DialStore.unregisterPanel(id);
  });

  it('re-applies rules on reset, presets, and config updates', () => {
    const id = 'visibility-presets';
    DialStore.registerPanel(id, id, config);

    const sphere = DialStore.savePreset(id, 'Sphere');
    DialStore.updateValue(id, 'shape', 'sphere');
    assert.ok(visiblePaths(id).includes('radius'));

    DialStore.clearActivePreset(id);
    assert.ok(!visiblePaths(id).includes('radius'));

    DialStore.loadPreset(id, sphere);
    assert.ok(visiblePaths(id).includes('radius'));

    DialStore.resetValues(id);
    assert.deepEqual(visiblePaths(id), ['shape', 'columns', 'opacity']);

    DialStore.updateValue(id, 'shape', 'sphere');
    DialStore.updatePanel(id, id, { ...config, glow: withVisibility(true, { field: 'shape', is: 'sphere' }) });
    assert.ok(visiblePaths(id).includes('glow'));
    assert.ok(!visiblePaths(id).includes('columns'));

    DialStore.unregisterPanel(id);
  });

  it('ignores shortcuts on hidden controls but still finds their labels', () => {
    const id = 'visibility-shortcuts';
    DialStore.registerPanel(id, id, {
      outline: true,
      outlineWidth: withVisibility([2, 0, 8], { field: 'outline', is: true }),
      glow: withVisibility([0.5, 0, 1], { field: 'outline', is: true }),
    }, {
      outlineWidth: { key: 'w' },
      glow: { interaction: 'scroll-only' },
    });
    const scrollOnly = () => DialStore.resolveScrollOnlyTargets().filter(target => target.panelId === id);

    assert.equal(DialStore.resolveShortcutTarget('w')?.path, 'outlineWidth');
    assert.equal(scrollOnly().length, 1);

    DialStore.updateValue(id, 'outline', false);
    assert.equal(DialStore.resolveShortcutTarget('w'), null);
    assert.equal(scrollOnly().length, 0);
    assert.equal(DialStore.getControl(id, 'outlineWidth')?.label, 'Outline Width');

    DialStore.unregisterPanel(id);
  });

  it('warns once per registration when a rule watches a control the panel does not have', () => {
    const id = 'visibility-missing-field';
    const warnings: unknown[] = [];
    const warn = console.warn;
    console.warn = (message: unknown) => { warnings.push(message); };
    try {
      DialStore.registerPanel(id, id, { width: withVisibility([2, 0, 8], { field: 'outlin', is: true }) });
      DialStore.updateValue(id, 'width', 4);
      DialStore.updateValue(id, 'width', 5);
    } finally {
      console.warn = warn;
      DialStore.unregisterPanel(id);
    }
    assert.equal(warnings.length, 1);
    assert.match(String(warnings[0]), /"outlin"/);
  });
});
