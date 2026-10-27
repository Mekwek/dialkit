<script lang="ts">
  import { buildCopyInstruction } from '../../copy-instruction';
  import { resolveOpenFolder } from '../../accordion';
  import { Spring } from 'svelte/motion';
  import type { Snippet } from 'svelte';
  import { DialStore } from 'dialkit/store';
  import type { DialValue, PanelConfig, Preset } from 'dialkit/store';
  import Folder from './Folder.svelte';
  import PresetManager from './PresetManager.svelte';
  import VersionGallery from './VersionGallery.svelte';
  import type { DialVersions } from '../../version-gallery';
  import ControlRenderer from './ControlRenderer.svelte';
  import { controlTransition } from './transitions';
  import { ICON_CLIPBOARD_PLAIN, ICON_CHECK } from '../../icons';

  let { panel, defaultOpen = true, inline = false, accordion = false, openFolder, onOpenFolderChange, onOpenChange, variant = 'root', toolbarExtra, versions = 'thumbnails', theme } = $props<{
    panel: PanelConfig;
    defaultOpen?: boolean;
    inline?: boolean;
    accordion?: boolean;
    openFolder?: string | null;
    onOpenFolderChange?: (path: string | null) => void;
    onOpenChange?: (open: boolean) => void;
    variant?: 'root' | 'section';
    toolbarExtra?: Snippet;
    versions?: DialVersions;
    theme?: 'light' | 'dark' | 'system';
  }>();

  let copied = $state(false);
  const resolvedOpenFolder = $derived(accordion ? resolveOpenFolder(panel.controls, openFolder) : undefined);
  // The store owns open/collapsed state so it can be driven programmatically.
  let storeOpen = $state<boolean | undefined>(DialStore.getPanelOpen(panel.id));
  const isOpen = $derived(storeOpen ?? defaultOpen);
  let values = $state<Record<string, DialValue>>(DialStore.getValues(panel.id));
  let presets = $state<Preset[]>(DialStore.getPresets(panel.id));
  let activePresetId = $state<string | null>(DialStore.getActivePresetId(panel.id));

  const copyScale = new Spring(1, { stiffness: 0.25, damping: 0.7 });
  const clipboardOpacity = new Spring(1, { stiffness: 0.25, damping: 0.7 });
  const clipboardScale = new Spring(1, { stiffness: 0.2, damping: 0.6 });
  const checkOpacity = new Spring(0, { stiffness: 0.25, damping: 0.7 });
  const checkScale = new Spring(0.5, { stiffness: 0.2, damping: 0.6 });

  let copyTimeout: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const unsub = DialStore.subscribe(panel.id, () => {
      values = DialStore.getValues(panel.id);
      presets = DialStore.getPresets(panel.id);
      activePresetId = DialStore.getActivePresetId(panel.id);
      storeOpen = DialStore.getPanelOpen(panel.id);
    });
    DialStore.initPanelOpen(panel.id, defaultOpen);

    return () => {
      unsub();
      if (copyTimeout) clearTimeout(copyTimeout);
    };
  });

  $effect(() => {
    if (copied) {
      clipboardOpacity.set(0);
      clipboardScale.set(0.5);
      checkOpacity.set(1);
      checkScale.set(1);
      return;
    }

    clipboardOpacity.set(1);
    clipboardScale.set(1);
    checkOpacity.set(0);
    checkScale.set(0.5);
  });

  const handleCopy = async () => {
    const instruction = buildCopyInstruction('createDialKit', panel.name, values);

    try { await navigator.clipboard.writeText(instruction); }
    catch { return; }
    copied = true;

    if (copyTimeout) clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => {
      copied = false;
    }, 1500);
  };

  const handleOpenChange = (open: boolean) => {
    DialStore.setPanelOpen(panel.id, open);
    onOpenChange?.(open);
  };
</script>

{#snippet panelToolbar()}
  {#if versions === 'menu'}
    <PresetManager panelId={panel.id} {presets} {activePresetId} />
  {/if}

  <button
    class="dialkit-toolbar-add dialkit-toolbar-primary"
    data-wide={versions !== 'menu' ? 'true' : undefined}
    onclick={handleCopy}
    onpointerdown={() => copyScale.set(0.95)}
    onpointerup={() => copyScale.set(1)}
    onpointercancel={() => copyScale.set(1)}
    onpointerleave={() => copyScale.set(1)}
    title="Copy parameters" aria-label="Copy parameters"
    style:transform={`scale(${copyScale.current})`}
  >
    <span class="dialkit-toolbar-copy-icon-wrap">
      <svg
        class="dialkit-toolbar-copy-icon"
        viewBox="0 0 24 24"
        fill="none"
        style:opacity={clipboardOpacity.current}
        style:transform={`scale(${clipboardScale.current})`}
        style:filter={`blur(${(1 - clipboardOpacity.current) * 4}px)`}
      >
        <path d={ICON_CLIPBOARD_PLAIN.board} stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d={ICON_CLIPBOARD_PLAIN.body} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>

      <svg
        class="dialkit-toolbar-copy-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        style:opacity={checkOpacity.current}
        style:transform={`scale(${checkScale.current})`}
        style:filter={`blur(${(1 - checkOpacity.current) * 4}px)`}
      >
        <path d={ICON_CHECK} />
      </svg>
    </span>
    {#if versions !== 'menu'}
      <span>{copied ? 'Copied' : 'Copy parameters'}</span>
    {/if}
  </button>

  {#if toolbarExtra}
    {@render toolbarExtra()}
  {/if}
{/snippet}

{#snippet panelControls()}
  {#if versions !== 'menu'}
    <VersionGallery panelId={panel.id} {theme} />
  {/if}
  {#each panel.controls as control (control.path)}
    <div class="dialkit-control-wrapper" transition:controlTransition>
      <ControlRenderer
        panelId={panel.id}
        {control}
        {values}
        openFolder={resolvedOpenFolder}
        {onOpenFolderChange}
        animateControls
      />
    </div>
  {/each}
{/snippet}

{#if variant === 'section'}
  <Folder title={panel.name} open={isOpen} onOpenChange={handleOpenChange}>
    {#snippet toolbar()}
      {@render panelToolbar()}
    {/snippet}
    {@render panelControls()}
  </Folder>
{:else}
  <div class="dialkit-panel-wrapper">
    <Folder title={panel.name} open={isOpen} isRoot={true} {inline} onOpenChange={handleOpenChange}>
      {#snippet toolbar()}
        {@render panelToolbar()}
      {/snippet}

      {@render panelControls()}
    </Folder>
  </div>
{/if}
