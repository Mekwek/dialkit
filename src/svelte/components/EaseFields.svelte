<script lang="ts">
  import { onMount } from 'svelte';
  import { mountEaseFields, type EaseFieldsProps } from '../../easing-control';
  let { ease, onChange }: EaseFieldsProps = $props();
  let host: HTMLDivElement;
  let control: ReturnType<typeof mountEaseFields> | undefined;
  onMount(() => {
    control = mountEaseFields(host, { ease, onChange });
    return () => control?.destroy();
  });
  $effect(() => { const next = { ease, onChange }; control?.update(next); });
</script>

<div bind:this={host}></div>
