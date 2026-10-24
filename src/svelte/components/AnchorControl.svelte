<script lang="ts">
  import { onMount } from 'svelte';
  import { mountAnchorControl, type AnchorControlProps } from '../../anchor-control';
  let { label, value, onChange }: AnchorControlProps = $props();
  let host: HTMLDivElement;
  let control: ReturnType<typeof mountAnchorControl> | undefined;
  onMount(() => {
    control = mountAnchorControl(host, { label, value, onChange });
    return () => control?.destroy();
  });
  $effect(() => { const next = { label, value, onChange }; control?.update(next); });
</script>

<div bind:this={host} class="dialkit-anchor-host"></div>
