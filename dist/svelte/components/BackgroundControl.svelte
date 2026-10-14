<script lang="ts">
  import { onMount } from 'svelte';
  import { mountBackgroundControl, type BackgroundControlProps } from '../../background-control';
  let { label, value, onChange }: BackgroundControlProps = $props();
  let host: HTMLDivElement;
  let control: ReturnType<typeof mountBackgroundControl> | undefined;
  onMount(() => {
    control = mountBackgroundControl(host, { label, value, onChange });
    return () => control?.destroy();
  });
  $effect(() => { const next = { label, value, onChange }; control?.update(next); });
</script>

<div bind:this={host} class="dialkit-bg-host"></div>
