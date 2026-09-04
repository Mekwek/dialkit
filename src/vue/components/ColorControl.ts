import { defineComponent, h, onMounted, onUnmounted, ref, watchEffect } from 'vue';
import { mountColorControl } from '../../color-control';

export const ColorControl = defineComponent({
  name: 'DialKitColorControl',
  props: { label: { type: String, required: true }, value: { type: String, required: true } },
  emits: ['change'],
  setup(props, { emit }) {
    const host = ref<HTMLElement>();
    let control: ReturnType<typeof mountColorControl> | undefined;
    const options = () => ({ label: props.label, value: props.value, onChange: (value: string) => emit('change', value) });
    onMounted(() => {
      control = mountColorControl(host.value!, options());
    });
    watchEffect(() => { const next = options(); control?.update(next); });
    onUnmounted(() => control?.destroy());
    return () => h('div', { ref: host, class: 'dialkit-color-host' });
  },
});
