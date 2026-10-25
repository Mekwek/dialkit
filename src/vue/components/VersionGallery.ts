import { defineComponent, h, onMounted, onUnmounted, ref, watch, type PropType } from 'vue';
import { mountVersionGallery } from '../../versions/gallery';

/** Mounts the shared version gallery (see versions/gallery.ts). */
export const VersionGallery = defineComponent({
  name: 'DialKitVersionGallery',
  props: {
    panelId: { type: String, required: true },
    theme: String as PropType<'light' | 'dark' | 'system'>,
  },
  setup(props) {
    const host = ref<HTMLDivElement | null>(null);
    let gallery: ReturnType<typeof mountVersionGallery> | undefined;
    onMounted(() => {
      gallery = mountVersionGallery(host.value!, { panelId: props.panelId, theme: props.theme });
    });
    watch(() => [props.panelId, props.theme], () => {
      gallery?.update({ panelId: props.panelId, theme: props.theme });
    });
    onUnmounted(() => gallery?.destroy());
    return () => h('div', { ref: host, class: 'dialkit-versions-host' });
  },
});
