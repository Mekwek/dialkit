<script lang="ts">
  import { onMount } from 'svelte';
  import { mountLayerListControl, type LayerListControlProps } from '../../layer-list-control';
  let { label, value, onChange, onAction, addLabel, addDisabled, empty }: LayerListControlProps = $props();
  let host: HTMLDivElement;
  let control: ReturnType<typeof mountLayerListControl> | undefined;
  onMount(() => {
    control = mountLayerListControl(host, { label, value, onChange, onAction, addLabel, addDisabled, empty });
    return () => control?.destroy();
  });
  $effect(() => { const next = { label, value, onChange, onAction, addLabel, addDisabled, empty }; control?.update(next); });
</script>

<div bind:this={host} class="dialkit-layers-host"></div>
