<script lang="ts">
  import { observeDropdownKeyboard } from '../../dropdown-keyboard';
  import { observePresetMenu, versionNamePrefix } from '../../preset-menu';
  import { openDropdownOnKey } from '../../control-keyboard';

  import { Spring } from 'svelte/motion';
  import Portal from '../Portal.svelte';
  import { DialStore } from 'dialkit/store';
  import type { Preset } from 'dialkit/store';
  import { dropdownTransition } from './transitions';
  import { getDialKitPortalRoot, getDropdownPosition } from '../../dropdown-position';
  import { ICON_CHEVRON, ICON_TRASH, ICON_PLUS, ICON_CHECK, ICON_MORE, ICON_PENCIL, ICON_LOCK, ICON_LOCK_OPEN } from '../../icons';
  import { versionHints } from '../../hints';
  import { createHints } from '../hints.svelte.js';

  let { panelId, presets, activePresetId, noun = 'version' } = $props<{
    panelId: string;
    presets: Preset[];
    activePresetId: string | null;
    /** What a version is called in the menu: a version (default) or, in a timeline, a sequence. */
    noun?: 'version' | 'sequence';
  }>();

  createHints(() => true);

  let isOpen = $state(false);
  let pos = $state({ top: 0, left: 0, width: 0 });
  let portalTarget = $state<HTMLElement | null>(null);
  let editingId = $state<string | null>(null);
  let triggerRef: HTMLButtonElement | undefined;
  let dropdownRef = $state<HTMLDivElement | undefined>(undefined);

  const chevronRotation = new Spring(0, { stiffness: 0.2, damping: 0.6 });
  const chevronOpacity = new Spring(0.6, { stiffness: 0.2, damping: 0.6 });

  const hints = $derived(versionHints(noun));
  const activePreset = $derived(presets.find((p: Preset) => p.id === activePresetId));

  const updatePos = () => {
    if (!triggerRef || !portalTarget) return;
    pos = getDropdownPosition(triggerRef, portalTarget, { fixed: true, dropdownHeight: (dropdownRef?.scrollHeight ?? 0) + 2 });
  };

  const openDropdown = () => {
    updatePos();
    editingId = null;
    isOpen = true;
  };

  const closeDropdown = () => {
    isOpen = false;
  };

  $effect(() => {
    if (typeof document === 'undefined' || !triggerRef) return;
    portalTarget = getDialKitPortalRoot(triggerRef) ?? document.body;
  });

  $effect(() => {
    chevronRotation.set(isOpen ? 180 : 0);
    chevronOpacity.set(0.6);
  });

  $effect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const handleViewportChange = () => updatePos();
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef?.contains(target) || dropdownRef?.contains(target)) return;
      closeDropdown();
    };

    updatePos();
    const stopKeyboard = observeDropdownKeyboard(triggerRef!, () => dropdownRef, closeDropdown, 'presets');
    const stopMenu = observePresetMenu(() => dropdownRef, (ids) => DialStore.reorderPresets(panelId, ids));
    document.addEventListener('mousedown', handler);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      stopKeyboard();
      stopMenu();
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  });

  const handleSelect = (presetId: string | null) => {
    if (presetId) DialStore.loadPreset(panelId, presetId);
    else DialStore.clearActivePreset(panelId);
    closeDropdown();
  };

  const handleRename = (input: HTMLInputElement, presetId: string) => {
    DialStore.renamePreset(panelId, presetId, input.value);
    editingId = null;
  };

  const handleRenameKey = (e: KeyboardEvent & { currentTarget: HTMLInputElement }, preset: Preset) => {
    if (e.key === 'Enter') handleRename(e.currentTarget, preset.id);
    else if (e.key === 'Escape') { e.currentTarget.value = preset.name; editingId = null; }
    else return;
    e.preventDefault();
  };

  const focusOnMount = (input: HTMLInputElement) => input.focus();
</script>

{#snippet icon(paths: readonly string[])}
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {#each paths as d}<path {d} />{/each}
  </svg>
{/snippet}

{#snippet lockButton(preset: Preset)}
  <button type="button" class="dialkit-preset-lock" aria-label={`${preset.locked ? 'Unlock' : 'Lock'} ${preset.name}`} onclick={() => DialStore.setPresetLocked(panelId, preset.id, !preset.locked)}>
    {@render icon(preset.locked ? ICON_LOCK : ICON_LOCK_OPEN)}
  </button>
{/snippet}

<div class="dialkit-preset-manager">
  <button
    bind:this={triggerRef}
    class="dialkit-preset-trigger"
    onclick={() => (isOpen ? closeDropdown() : openDropdown())}
    data-open={String(isOpen)}
    data-has-preset={String(!!activePreset)}
    type="button" aria-haspopup="menu" aria-expanded={isOpen}
    aria-label="Versions" data-hint={hints.versions} onkeydown={(e) => openDropdownOnKey(e, openDropdown)}
  >
    <span class="dialkit-preset-label">
      {activePreset ? activePreset.name : DialStore.getBaseName(panelId)}
    </span>
    <svg
      class="dialkit-select-chevron"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      style:transform={`rotate(${chevronRotation.current}deg)`}
      style:opacity={chevronOpacity.current}
    >
      <path d={ICON_CHEVRON} />
    </svg>
  </button>

  {#if portalTarget}
    <Portal target={portalTarget}>
      {#if isOpen}
        <div
          bind:this={dropdownRef}
          class="dialkit-root dialkit-preset-dropdown"
          style={`position:fixed;top:${pos.top}px;left:${pos.left}px;min-width:${pos.width}px;`}
          transition:dropdownTransition={{ above: false }}
        >
          <div
            class="dialkit-preset-item"
            data-active={String(!activePresetId)}
            onclick={() => handleSelect(null)}
          >
            <svg class="dialkit-preset-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">{#if !activePresetId}<path d={ICON_CHECK} />{/if}</svg>
            <button type="button" class="dialkit-preset-name">{DialStore.getBaseName(panelId)}</button>
          </div>

          {#each presets as preset (preset.id)}
            <div
              class="dialkit-preset-item"
              data-active={String(preset.id === activePresetId)}
              data-preset-id={preset.id}
              data-locked={String(!!preset.locked)}
              onclick={(e) => { if (!(e.target as HTMLElement).closest('input, .dialkit-preset-actions')) handleSelect(preset.id); }}
            >
              <svg class="dialkit-preset-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">{#if preset.id === activePresetId}<path d={ICON_CHECK} />{/if}</svg>
              {#if editingId === preset.id}
                <input
                  class="dialkit-preset-input"
                  value={preset.name}
                  aria-label="Version name"
                  use:focusOnMount
                  onfocus={(e) => e.currentTarget.select()}
                  onkeydown={(e) => handleRenameKey(e, preset)}
                  onblur={(e) => handleRename(e.currentTarget, preset.id)}
                />
              {:else}
                <button type="button" class="dialkit-preset-name">{preset.name}</button>
                <!-- Keyboard order: the icon shown at rest (the menu icon, or a locked row's lock), then the actions it reveals. -->
                <div class="dialkit-preset-actions">
                  {#if preset.locked}
                    {@render lockButton(preset)}
                  {:else}
                    <button type="button" class="dialkit-preset-more" aria-label={`More actions for ${preset.name}`} data-hint={hints.versionActions}>
                      {@render icon(ICON_MORE)}
                    </button>
                  {/if}
                  <button type="button" class="dialkit-preset-rename" aria-label={`Rename ${preset.name}`} onclick={() => (editingId = preset.id)}>
                    {@render icon(ICON_PENCIL)}
                  </button>
                  {#if !preset.locked}
                    {@render lockButton(preset)}
                    <button type="button" class="dialkit-preset-delete" aria-label={`Delete ${preset.name}`} onclick={() => DialStore.deletePreset(panelId, preset.id)}>
                      {@render icon(ICON_TRASH)}
                    </button>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
          <div class="dialkit-preset-divider" role="separator"></div>
          <button type="button" class="dialkit-preset-create" onclick={() => { DialStore.saveNewPreset(panelId, versionNamePrefix(noun)); closeDropdown(); triggerRef?.focus(); }}>
            <svg class="dialkit-preset-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d={ICON_PLUS[0]} /></svg>
            New {noun}
          </button>
        </div>
      {/if}
    </Portal>
  {/if}
</div>
