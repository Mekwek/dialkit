import { defineComponent, h, onMounted, onUnmounted, ref, watchEffect, type PropType } from 'vue';
import type { ImageOption } from '../../store/DialStore';
import { mountImageControl } from '../../image-control';

export const ImageControl = defineComponent({
  name: 'DialKitImageControl',
  props: { options: Array as PropType<ImageOption[]>, label: { type: String, required: true }, value: { type: String, required: true } },
  emits: ['change'],
  setup(props, { emit }) {
    const host = ref<HTMLElement>();
    let control: ReturnType<typeof mountImageControl> | undefined;
    const options = () => ({ label: props.label, value: props.value, options: props.options, onChange: (value: string) => emit('change', value) });
    onMounted(() => {
      control = mountImageControl(host.value!, options());
    });
    watchEffect(() => { const next = options(); control?.update(next); });
    onUnmounted(() => control?.destroy());
    return () => h('div', { ref: host, class: 'dialkit-image-host' });
  },
});
