import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultOpenFolder, pruneOpenFolders, resolveOpenFolder } from './accordion';
import { DialStore, type DialConfig } from './store/DialStore';

const controlsOf = (config: DialConfig) => {
  const id = 'accordion';
  DialStore.registerPanel(id, 'Accordion', config);
  const controls = DialStore.getPanel(id)!.controls;
  DialStore.unregisterPanel(id);
  return controls;
};

describe('accordion folders', () => {
  it('opens only the first top-level folder that starts open', () => {
    const controls = controlsOf({
      radius: [12, 0, 32],
      shadow: { _collapsed: true, blur: [12, 0, 40] },
      camera: { distance: [8, 1, 20], lens: { zoom: [1, 0, 4] } },
      lighting: { intensity: [1, 0, 3] },
    });
    assert.equal(getDefaultOpenFolder(controls), 'camera');
  });

  it('opens none when every top-level folder starts closed', () => {
    assert.equal(getDefaultOpenFolder(controlsOf({ radius: [12, 0, 32] })), null);
    assert.equal(getDefaultOpenFolder(controlsOf({ shadow: { _collapsed: true, blur: [12, 0, 40] } })), null);
  });

  it('keeps the chosen folder while it exists and falls back when it does not', () => {
    const before = controlsOf({ camera: { distance: [8, 1, 20] }, lighting: { intensity: [1, 0, 3] } });
    assert.equal(resolveOpenFolder(before, undefined), 'camera');
    assert.equal(resolveOpenFolder(before, 'lighting'), 'lighting');
    assert.equal(resolveOpenFolder(before, null), null);
    // A nested folder or a slider is never the accordion's open folder.
    assert.equal(resolveOpenFolder(controlsOf({ camera: { lens: { zoom: [1, 0, 4] } } }), 'camera.lens'), 'camera');
    assert.equal(resolveOpenFolder(controlsOf({ radius: [12, 0, 32], camera: { distance: [8, 1, 20] } }), 'radius'), 'camera');

    const renamed = controlsOf({ camera: { distance: [8, 1, 20] }, light: { intensity: [1, 0, 3] } });
    assert.equal(resolveOpenFolder(renamed, 'lighting'), 'camera');
    const removed = controlsOf({ radius: [12, 0, 32], lighting: { _collapsed: true, intensity: [1, 0, 3] } });
    assert.equal(resolveOpenFolder(removed, 'camera'), null);
    assert.equal(resolveOpenFolder(removed, null), null);
  });

  it('drops the folders of panels that are gone', () => {
    const folders = { card: 'shadow', menu: null };
    assert.equal(pruneOpenFolders(folders, ['card', 'menu', 'other']), folders);
    assert.deepEqual(pruneOpenFolders(folders, ['menu']), { menu: null });
  });
});
