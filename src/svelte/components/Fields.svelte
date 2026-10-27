<script lang="ts">
  import { onMount } from 'svelte';
  import { mountFields, type FieldsProps } from '../../fields-control';
  let { label, controls, values, defaults, onChange }: FieldsProps = $props();
  let host: HTMLDivElement;
  let control: ReturnType<typeof mountFields> | undefined;
  onMount(() => {
    control = mountFields(host, { label, controls, values, defaults, onChange });
    return () => control?.destroy();
  });
  $effect(() => { const next = { label, controls, values, defaults, onChange }; control?.update(next); });
</script>

<div bind:this={host} class="dialkit-fields-host"></div>
