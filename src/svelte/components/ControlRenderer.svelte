<script lang="ts">
  import { getContext } from 'svelte';
  import { DialStore } from 'dialkit/store';
  import type { ControlMeta, DialValue, SpringConfig, TransitionConfig, DialPadValue, AnchorValue } from 'dialkit/store';
  import Slider from './Slider.svelte';
  import Toggle from './Toggle.svelte';
  import Folder from './Folder.svelte';
  import SpringControl from './SpringControl.svelte';
  import TransitionControl from './TransitionControl.svelte';
  import TextControl from './TextControl.svelte';
  import SelectControl from './SelectControl.svelte';
  import ColorControl from './ColorControl.svelte';
  import ImageControl from './ImageControl.svelte';
  import DialPad from './DialPad.svelte';
  import AnchorControl from './AnchorControl.svelte';
  import Fields from './Fields.svelte';
  import ControlRenderer from './ControlRenderer.svelte';
  import { SHORTCUT_CTX } from './ShortcutListener.svelte';
  import type { ShortcutContextValue } from './ShortcutListener.svelte';
  import type { TransitionDurationControl } from './TransitionControl.svelte';
  import { controlTransition } from './transitions';

  let { panelId, control, values, transitionDuration, resetCount = 0, openFolder, onOpenFolderChange, animateControls = false } = $props<{
    panelId: string;
    control: ControlMeta;
    values: Record<string, DialValue>;
    transitionDuration?: TransitionDurationControl;
    /** Counts folder resets, so sliders can spring to the values a reset sets. */
    resetCount?: number;
    /** Path of the one open top-level folder in accordion mode, or null when all are closed. */
    openFolder?: string | null;
    onOpenFolderChange?: (path: string | null) => void;
    /** Slide controls in and out as their visibility rules change. */
    animateControls?: boolean;
  }>();

  const shortcutCtx = getContext<ShortcutContextValue | undefined>(SHORTCUT_CTX);

  const controlValue = $derived(values[control.path]);
  // The reset button of the folder this control draws: a `_reset` folder, a
  // spring, or a transition. A folder reset adds to the count its children get.
  let folderResets = $state(0);
  const changed = $derived.by(() => {
    values;
    return !!control.reset && DialStore.isFolderChanged(panelId, control.path);
  });
  const onReset = $derived(control.reset ? () => {
    folderResets++;
    DialStore.resetFolder(panelId, control.path);
  } : undefined);

  // Accordion mode controls top-level folders; nested ones are rendered without openFolder.
  const accordion = $derived(openFolder !== undefined);
  const isShortcutActive = $derived(
    shortcutCtx ? shortcutCtx.activePanelId === panelId && shortcutCtx.activePath === control.path : false
  );
</script>

{#if control.type === 'slider'}
  <Slider
    label={control.label}
    value={controlValue as number}
    onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
    min={control.min}
    max={control.max}
    step={control.step}
    unit={control.unit}
    shortcut={control.shortcut}
    shortcutActive={isShortcutActive}
    {resetCount}
  />
{:else if control.type === 'toggle'}
  <Toggle
    label={control.label}
    checked={controlValue as boolean}
    onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
    shortcut={control.shortcut}
    shortcutActive={isShortcutActive}
  />
{:else if control.type === 'spring'}
  <SpringControl
    {panelId}
    path={control.path}
    label={control.label}
    spring={controlValue as SpringConfig}
    onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
    {onReset}
    {changed}
  />
{:else if control.type === 'transition'}
  <TransitionControl
    {panelId}
    path={control.path}
    label={control.label}
    value={controlValue as TransitionConfig}
    onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
    durationControl={transitionDuration}
    {onReset}
    {changed}
  />
{:else if control.type === 'folder' && control.fields}
  <Fields
    label={control.label}
    controls={control.children ?? []}
    {values}
    defaults={DialStore.getDefaultValues(panelId)}
    onChange={(v) => DialStore.updateValues(panelId, v)}
  />
{:else if control.type === 'folder'}
  <Folder
    title={control.label}
    defaultOpen={control.defaultOpen ?? true}
    {onReset}
    {changed}
    open={accordion ? openFolder === control.path : undefined}
    onOpenChange={accordion ? (open) => onOpenFolderChange?.(open ? control.path : null) : undefined}
  >
    {#if animateControls}
      {#each control.children ?? [] as child (child.path)}
        <div class="dialkit-control-wrapper" transition:controlTransition>
          <ControlRenderer {panelId} control={child} {values} {transitionDuration} resetCount={resetCount + folderResets} animateControls />
        </div>
      {/each}
    {:else}
      {#each control.children ?? [] as child (child.path)}
        <ControlRenderer {panelId} control={child} {values} {transitionDuration} resetCount={resetCount + folderResets} />
      {/each}
    {/if}
  </Folder>
{:else if control.type === 'text'}
  <TextControl
    label={control.label}
    value={controlValue as string}
    onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
    placeholder={control.placeholder}
  />
{:else if control.type === 'select'}
  <SelectControl
    label={control.label}
    value={controlValue as string}
    options={control.options ?? []}
    onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
    display={control.display}
    hideLabel={control.hideLabel}
  />
{:else if control.type === 'color'}
  <ColorControl
    label={control.label}
    value={controlValue as string}
    onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
  />
{:else if control.type === 'image'}
  <ImageControl
    options={control.options}
    label={control.label}
    value={controlValue as string}
    onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
  />
{:else if control.type === 'pad'}
  <DialPad
    label={control.label}
    value={controlValue as DialPadValue}
    x={control.pad?.x}
    y={control.pad?.y}
    labels={control.pad?.labels}
    hideLabel={control.pad?.hideLabel}
    dragLabels={control.pad?.dragLabels}
    onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
  />
{:else if control.type === 'anchor'}
  <AnchorControl
    label={control.label}
    value={controlValue as AnchorValue}
    onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
  />
{:else if control.type === 'action'}
  <button class="dialkit-button" onclick={() => DialStore.triggerAction(panelId, control.path)}>
    {control.label}
  </button>
{/if}
