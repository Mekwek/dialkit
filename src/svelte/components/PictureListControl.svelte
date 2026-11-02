<script lang="ts">
  import { onMount } from 'svelte';
  import { mountPictureListControl, type PictureListControlProps } from '../../picture-list-control';
  let { label, families, value, onPick, hint }: PictureListControlProps = $props();
  let host: HTMLDivElement;
  let control: ReturnType<typeof mountPictureListControl> | undefined;
  onMount(() => {
    control = mountPictureListControl(host, { label, families, value, onPick, hint });
    return () => control?.destroy();
  });
  $effect(() => { const next = { label, families, value, onPick, hint }; control?.update(next); });
</script>

<div bind:this={host} class="dialkit-pictures-host"></div>
