import { defineComponent, h, onMounted, onUnmounted, ref, watchEffect, type PropType } from 'vue';
import type { BackgroundValue } from '../../background';
import { mountBackgroundControl } from '../../background-control';

export const BackgroundControl = defineComponent({
  name: 'DialKitBackgroundControl',
  props: {
    label: { type: String, required: true },
    value: { type: Object as PropType<BackgroundValue>, required: true },
  },
  emits: ['change'],
  setup(props, { emit }) {
    const host = ref<HTMLElement>();
    let control: ReturnType<typeof mountBackgroundControl> | undefined;
    const options = () => ({ label: props.label, value: props.value, onChange: (value: BackgroundValue) => emit('change', value) });
    onMounted(() => { control = mountBackgroundControl(host.value!, options()); });
    watchEffect(() => { const next = options(); control?.update(next); });
    onUnmounted(() => control?.destroy());
    return () => h('div', { ref: host, class: 'dialkit-bg-host' });
  },
});
