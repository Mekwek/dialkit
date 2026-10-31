<script lang="ts">
  import { untrack } from 'svelte';
  import { mountVersionGallery } from '../../version-gallery';

  // Mounts the shared version gallery (see versions/gallery.ts).
  let { panelId, theme } = $props<{
    panelId: string;
    theme?: 'light' | 'dark' | 'system';
  }>();

  let host: HTMLDivElement;
  let gallery: ReturnType<typeof mountVersionGallery> | undefined;

  $effect(() => {
    gallery = mountVersionGallery(host, untrack(() => ({ panelId, theme })));
    return () => {
      gallery?.destroy();
      gallery = undefined;
    };
  });

  $effect(() => {
    gallery?.update({ panelId, theme });
  });
</script>

<div bind:this={host} class="dialkit-versions-host"></div>
