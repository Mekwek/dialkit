<script lang="ts">
  import { onMount } from 'svelte';
  import { mountTransitionMenu, type TransitionMenuProps } from '../../transition-presets-control';
  let { mode, value, onPaste }: TransitionMenuProps = $props();
  let host: HTMLDivElement;
  let control: ReturnType<typeof mountTransitionMenu> | undefined;
  onMount(() => {
    control = mountTransitionMenu(host, { mode, value, onPaste });
    return () => control?.destroy();
  });
  $effect(() => { const next = { mode, value, onPaste }; control?.update(next); });
</script>

<div bind:this={host}></div>
