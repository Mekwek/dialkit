import { defineComponent, h, onMounted, onUnmounted, ref, watchEffect, type PropType } from 'vue';
import type { DialPadAxis, DialPadConfig, DialPadValue } from '../../dial-pad';
import { mountDialPad } from '../../dial-pad-control';

export const DialPad = defineComponent({
  name: 'DialPad',
  props: {
    label: { type: String, required: true },
    value: { type: Object as PropType<DialPadValue>, required: true },
    x: Array as unknown as PropType<DialPadAxis>,
    y: Array as unknown as PropType<DialPadAxis>,
    labels: Object as PropType<DialPadConfig['labels']>,
  },
  emits: ['change'],
  setup(props, { emit }) {
    const host = ref<HTMLElement>();
    let control: ReturnType<typeof mountDialPad> | undefined;
    const options = () => ({ label: props.label, value: props.value, x: props.x, y: props.y, labels: props.labels, onChange: (value: DialPadValue) => emit('change', value) });
    onMounted(() => { control = mountDialPad(host.value!, options()); });
    watchEffect(() => { const next = options(); control?.update(next); });
    onUnmounted(() => control?.destroy());
    return () => h('div', { ref: host, class: 'dialkit-pad-host' });
  },
});
