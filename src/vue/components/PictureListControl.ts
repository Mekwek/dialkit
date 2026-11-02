import { defineComponent, h, onMounted, onUnmounted, ref, watchEffect, type PropType } from 'vue';
import type { PictureFamily, PicturesValue } from '../../pictures';
import { mountPictureListControl } from '../../picture-list-control';

/** Families of presets as accordion rows, each opening to a grid of picture tiles. Emits `pick` with a tile's id. */
export const PictureListControl = defineComponent({
  name: 'DialKitPictureListControl',
  props: {
    label: { type: String, required: true },
    families: { type: Array as PropType<PictureFamily[]>, required: true },
    value: { type: String as PropType<PicturesValue>, default: null },
    hint: String,
  },
  emits: ['pick'],
  setup(props, { emit }) {
    const host = ref<HTMLElement>();
    let control: ReturnType<typeof mountPictureListControl> | undefined;
    const options = () => ({ label: props.label, families: props.families, value: props.value ?? null, hint: props.hint, onPick: (id: string) => emit('pick', id) });
    onMounted(() => { control = mountPictureListControl(host.value!, options()); });
    watchEffect(() => { const next = options(); control?.update(next); });
    onUnmounted(() => control?.destroy());
    return () => h('div', { ref: host, class: 'dialkit-pictures-host' });
  },
});
