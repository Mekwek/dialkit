<script lang="ts">
  import { onMount } from 'svelte';
  import { mountBackgroundControl, type BackgroundControlProps } from '../../background-control';
  let { panelId, label, value, upload, onChange }: BackgroundControlProps = $props();
  let host: HTMLDivElement;
  let control: ReturnType<typeof mountBackgroundControl> | undefined;
  onMount(() => {
    control = mountBackgroundControl(host, { panelId, label, value, upload, onChange });
    return () => control?.destroy();
  });
  $effect(() => { const next = { panelId, label, value, upload, onChange }; control?.update(next); });
</script>

<div bind:this={host} class="dialkit-background-host"></div>
