<script lang="ts">
  import { onMount } from 'svelte';
  import { mountTransitionCopy, type TransitionCopyProps } from '../../transition-presets-control';
  let { mode, value, onPaste }: TransitionCopyProps = $props();
  let host: HTMLDivElement;
  let control: ReturnType<typeof mountTransitionCopy> | undefined;
  onMount(() => {
    control = mountTransitionCopy(host, { mode, value, onPaste });
    return () => control?.destroy();
  });
  $effect(() => { const next = { mode, value, onPaste }; control?.update(next); });
</script>

<div bind:this={host}></div>
