import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DialStore } from './store/DialStore';
import { deleteVersion, listVersions, renameVersion, selectVersion } from './versions/controller';
import { bakedSpring, GALLERY_SPRING } from './versions/spring';
import { ThumbnailStore } from './versions/thumbnails';

describe('version gallery', () => {
  it('lists versions oldest first, starting with V1', () => {
    const id = 'versions-list';
    DialStore.registerPanel(id, id, { amount: [1, 0, 10] });
    try {
      const second = DialStore.saveNewPreset(id);
      DialStore.saveNewPreset(id);
      assert.deepEqual(listVersions(id).map(v => v.name), ['V1', 'V2', 'V3']);
      selectVersion(id, 'base');
      assert.equal(DialStore.getActivePresetId(id), null);
      selectVersion(id, second);
      assert.equal(DialStore.getActivePresetId(id), second);
    } finally { DialStore.unregisterPanel(id); }
  });

  it('renames and deletes versions with their thumbnails', () => {
    const id = 'versions-edit';
    DialStore.registerPanel(id, id, { amount: 1 });
    try {
      const version = DialStore.saveNewPreset(id);
      ThumbnailStore.set(id, version, { src: 'data:,', width: 1, height: 1, capturedAt: 1 });
      renameVersion(id, version, 'Soft');
      renameVersion(id, 'base', 'Original');
      assert.deepEqual(listVersions(id).map(v => v.name), ['Original', 'Soft']);
      deleteVersion(id, 'base');
      deleteVersion(id, version);
      assert.deepEqual(listVersions(id).map(v => v.name), ['Original']);
      assert.equal(ThumbnailStore.get(id, version), undefined);
    } finally { DialStore.unregisterPanel(id); }
  });

  it('times events along a baked linear() spring', () => {
    const spring = bakedSpring('linear(0, 0.5, 1 50%, 1)', 1);
    // The unpositioned 0.5 stop sits halfway between 0% and 50%.
    assert.equal(spring.timeAt(0.5), 0.25);
    assert.equal(spring.timeAt(1), 0.5);
    assert.ok(GALLERY_SPRING.timeAt(0.75) < GALLERY_SPRING.timeAt(0.95));
    assert.ok(GALLERY_SPRING.timeAt(0.95) < GALLERY_SPRING.duration);
  });
});
