import { createEffect, onCleanup, onMount } from 'solid-js';
import { mountVersionGallery, type VersionGalleryProps } from '../../versions/gallery';

/** Mounts the shared version gallery (see versions/gallery.ts). */
export function VersionGallery(props: VersionGalleryProps) {
  let host!: HTMLDivElement;
  onMount(() => {
    const gallery = mountVersionGallery(host, { panelId: props.panelId, theme: props.theme });
    createEffect(() => gallery.update({ panelId: props.panelId, theme: props.theme }));
    onCleanup(() => gallery.destroy());
  });
  return <div ref={host} class="dialkit-versions-host" />;
}
