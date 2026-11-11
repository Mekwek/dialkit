import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useDialKit } from './hooks/useDialKit';
import { DialStore } from './store/DialStore';
import { HINTS, presetHints } from './hints';
import { deleteVersion, listVersions, pickVersion, renameVersion, selectVersion, showsVersionStrip } from './versions/controller';
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

  it('keeps a locked version and its thumbnail', () => {
    const id = 'versions-locked';
    DialStore.registerPanel(id, id, { amount: 1 });
    try {
      const version = DialStore.saveNewPreset(id);
      ThumbnailStore.set(id, version, { src: 'data:,', width: 1, height: 1, capturedAt: 1 });
      DialStore.setPresetLocked(id, version, true);
      assert.equal(listVersions(id)[1].locked, true);
      deleteVersion(id, version);
      assert.deepEqual(listVersions(id).map(v => v.name), ['V1', 'V2']);
      assert.ok(ThumbnailStore.get(id, version));
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

describe('version wording, labels and the switch guard', () => {
  const config = { amount: [1, 0, 10] as [number, number, number] };

  it('lists the base version unless showBasePreset is false', () => {
    DialStore.registerPanel('versions-base-shown', 'Shown', config);
    DialStore.registerPanel('versions-base-hidden', 'Hidden', config, undefined, { showBasePreset: false });
    try {
      DialStore.saveNewPreset('versions-base-shown');
      const first = DialStore.saveNewPreset('versions-base-hidden');
      const second = DialStore.saveNewPreset('versions-base-hidden');
      assert.deepEqual(listVersions('versions-base-shown').map(v => v.name), ['V1', 'V2']);
      assert.equal(DialStore.showsBasePreset('versions-base-shown'), true);
      assert.deepEqual(listVersions('versions-base-hidden').map(v => v.key), [first, second]);
      assert.equal(DialStore.showsBasePreset('versions-base-hidden'), false);
    } finally {
      DialStore.unregisterPanel('versions-base-shown');
      DialStore.unregisterPanel('versions-base-hidden');
    }
  });

  it('shows the pictures from one saved version with the base hidden, from two otherwise', () => {
    DialStore.registerPanel('versions-strip-shown', 'Shown', config);
    DialStore.registerPanel('versions-strip-hidden', 'Hidden', config, undefined, { showBasePreset: false });
    try {
      DialStore.saveNewPreset('versions-strip-hidden');
      assert.equal(listVersions('versions-strip-hidden').length, 1);
      assert.equal(showsVersionStrip('versions-strip-hidden', listVersions('versions-strip-hidden').length), true);
      assert.equal(showsVersionStrip('versions-strip-hidden', 0), false);
      // Today's rule with the base listed: the base alone hides, base + one shows.
      assert.equal(showsVersionStrip('versions-strip-shown', listVersions('versions-strip-shown').length), false);
      DialStore.saveNewPreset('versions-strip-shown');
      assert.equal(showsVersionStrip('versions-strip-shown', listVersions('versions-strip-shown').length), true);
    } finally {
      DialStore.unregisterPanel('versions-strip-shown');
      DialStore.unregisterPanel('versions-strip-hidden');
    }
  });

  it('draws each saved version under its presetLabel, by its place, and keeps the stored name', () => {
    const id = 'versions-labels';
    DialStore.registerPanel(id, id, config, undefined, {
      versionPrefix: 'Version',
      showBasePreset: false,
      presetLabel: (preset, index) => (/^Version \d+$/.test(preset.name) ? `Shot ${index + 1}` : preset.name),
    });
    try {
      const a = DialStore.saveNewPreset(id);
      const b = DialStore.saveNewPreset(id);
      DialStore.renamePreset(id, b, 'Hero');
      DialStore.saveNewPreset(id);
      assert.deepEqual(DialStore.getPresets(id).map(p => p.name), ['Version 2', 'Hero', 'Version 3']);
      assert.deepEqual(listVersions(id).map(v => v.name), ['Shot 1', 'Hero', 'Shot 3']);
      assert.equal(DialStore.getPresetLabel(id, DialStore.getPresets(id)[2], 2), 'Shot 3');
      // A rename field left showing the label keeps the stored name; a typed name renames.
      renameVersion(id, a, 'Shot 1');
      assert.equal(DialStore.getPresets(id)[0].name, 'Version 2');
      renameVersion(id, a, 'Wide');
      assert.equal(DialStore.getPresets(id)[0].name, 'Wide');
    } finally { DialStore.unregisterPanel(id); }
  });

  it('names versions by their stored name without presetLabel, and renames as before', () => {
    const id = 'versions-no-label';
    DialStore.registerPanel(id, id, config);
    try {
      const version = DialStore.saveNewPreset(id);
      assert.equal(DialStore.hasPresetLabel(id), false);
      assert.equal(DialStore.getPresetLabel(id, DialStore.getPresets(id)[0], 0), 'V2');
      renameVersion(id, version, 'Warm');
      assert.equal(DialStore.getPresets(id)[0].name, 'Warm');
    } finally { DialStore.unregisterPanel(id); }
  });

  it('carries a presetBadge only on the versions that have one', () => {
    let draft: string | null = null;
    const id = 'versions-badge';
    DialStore.registerPanel(id, id, config, undefined, { presetBadge: (presetId) => (presetId === draft ? 'Draft' : null) });
    try {
      const version = DialStore.saveNewPreset(id);
      assert.equal('badge' in listVersions(id)[1], false);
      draft = version;
      let heard = 0;
      const stop = DialStore.subscribe(id, () => { heard++; });
      DialStore.refreshPresetDisplay(id);
      stop();
      assert.equal(heard, 1);
      assert.equal(listVersions(id)[1].badge, 'Draft');
      assert.equal(listVersions(id)[0].badge, undefined);
    } finally { DialStore.unregisterPanel(id); }
  });

  it('switches on a click at once without onBeforePresetSwitch', () => {
    const id = 'versions-no-guard';
    DialStore.registerPanel(id, id, config);
    try {
      const version = DialStore.saveNewPreset(id);
      DialStore.clearActivePreset(id);
      assert.equal(pickVersion(id, version), true);
      assert.equal(DialStore.getActivePresetId(id), version);
    } finally { DialStore.unregisterPanel(id); }
  });

  it('keeps the active version when onBeforePresetSwitch says false, and switches when it says true', async () => {
    const asked: string[] = [];
    let answer = false;
    const id = 'versions-guard';
    DialStore.registerPanel(id, id, config, undefined, {
      onBeforePresetSwitch: async (presetId) => { asked.push(presetId); return answer; },
    });
    try {
      const first = DialStore.saveNewPreset(id);
      const second = DialStore.saveNewPreset(id);
      assert.equal(DialStore.getActivePresetId(id), second);

      assert.equal(await pickVersion(id, first), false);
      assert.equal(DialStore.getActivePresetId(id), second);
      assert.equal(await DialStore.switchPresetFromClick(id, null), false);
      assert.equal(DialStore.getActivePresetId(id), second);
      assert.deepEqual(asked, [first, 'base']);

      // The version already shown does not ask, and selects again at once.
      assert.equal(pickVersion(id, second), true);
      assert.equal(asked.length, 2);

      answer = true;
      assert.equal(await pickVersion(id, first), true);
      assert.equal(DialStore.getActivePresetId(id), first);
    } finally { DialStore.unregisterPanel(id); }
  });

  it('words the version hints with presetWord, the same as HINTS by default', () => {
    assert.deepEqual(presetHints(), {
      saveVersion: HINTS.saveVersion,
      version: HINTS.version,
      deleteVersion: HINTS.deleteVersion,
      allVersions: HINTS.allVersions,
    });
    assert.equal(presetHints({ singular: 'Shot', plural: 'Shots' }).version, 'Switches to this shot. Double-click its name to rename it.');
    DialStore.registerPanel('versions-word-default', 'Default', config);
    DialStore.registerPanel('versions-word-shot', 'Shots', config, undefined, { presetWord: { singular: 'Shot', plural: 'Shots' }, saveLabel: 'New Shot' });
    try {
      assert.deepEqual(DialStore.getPresetWord('versions-word-default'), { singular: 'Version', plural: 'Versions' });
      assert.equal(DialStore.getSaveLabel('versions-word-default'), undefined);
      assert.deepEqual(DialStore.getPresetWord('versions-word-shot'), { singular: 'Shot', plural: 'Shots' });
      assert.equal(DialStore.getSaveLabel('versions-word-shot'), 'New Shot');
      // The same word again, in a new object, changes nothing.
      let heard = 0;
      const stop = DialStore.subscribe('versions-word-shot', () => { heard++; });
      DialStore.updatePanel('versions-word-shot', 'Shots', config, undefined, { presetWord: { singular: 'Shot', plural: 'Shots' }, saveLabel: 'New Shot' });
      stop();
      assert.equal(heard, 0);
    } finally {
      DialStore.unregisterPanel('versions-word-default');
      DialStore.unregisterPanel('versions-word-shot');
    }
  });
});

describe('useDialKit version options', () => {
  it('keeps inline version callbacks without rebuilding the panel, and calls the latest one', () => {
    const id = 'versions-inline-callbacks';
    const config = { amount: [1, 0, 10] as [number, number, number] };
    let suffix = 'a';
    let renders = 0;
    function Harness() {
      renders++;
      useDialKit('Inline callbacks', config, {
        id,
        presetLabel: (preset) => `${preset.name}-${suffix}`,
        presetBadge: () => null,
        onBeforePresetSwitch: () => true,
      });
      return null;
    }
    let renderer: ReactTestRenderer | undefined;
    try {
      act(() => { renderer = create(createElement(Harness)); });
      DialStore.saveNewPreset(id);
      const panel = DialStore.getPanel(id);
      const before = renders;
      suffix = 'b';
      act(() => { renderer!.update(createElement(Harness)); });
      // One render for the update: no loop, and the store kept its panel.
      assert.equal(renders, before + 1);
      assert.equal(DialStore.getPanel(id), panel);
      assert.deepEqual(listVersions(id).map(v => v.name), ['V1', 'V2-b']);
    } finally {
      act(() => renderer?.unmount());
      DialStore.unregisterPanel(id);
    }
  });
});
