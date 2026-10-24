<script lang="ts">
  import { onMount } from 'svelte';
  import { mountTransitionPresets, type TransitionPresetsProps } from '../../transition-presets-control';
  let { mode, value, onChange }: TransitionPresetsProps = $props();
  let host: HTMLDivElement;
  let control: ReturnType<typeof mountTransitionPresets> | undefined;
  onMount(() => {
    control = mountTransitionPresets(host, { mode, value, onChange });
    return () => control?.destroy();
  });
  $effect(() => { const next = { mode, value, onChange }; control?.update(next); });
</script>

<div bind:this={host}></div>
