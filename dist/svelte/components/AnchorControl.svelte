<script lang="ts">
  import { onMount } from 'svelte';
  import { mountAnchorControl, type AnchorControlProps } from '../../anchor-control';
  let { label, value, onChange, hint }: AnchorControlProps = $props();
  let host: HTMLDivElement;
  let control: ReturnType<typeof mountAnchorControl> | undefined;
  onMount(() => {
    control = mountAnchorControl(host, { label, value, onChange, hint });
    return () => control?.destroy();
  });
  $effect(() => { const next = { label, value, onChange, hint }; control?.update(next); });
</script>

<div bind:this={host} class="dialkit-anchor-host"></div>
