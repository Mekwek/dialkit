import { defineComponent, h, onMounted, onUnmounted, ref, watchEffect, type PropType } from 'vue';
import type { AnchorValue } from '../../anchor';
import { mountAnchorControl } from '../../anchor-control';

export const AnchorControl = defineComponent({
  name: 'DialKitAnchorControl',
  props: {
    label: { type: String, required: true },
    value: { type: Object as PropType<AnchorValue>, required: true },
    hint: String,
  },
  emits: ['change'],
  setup(props, { emit }) {
    const host = ref<HTMLElement>();
    let control: ReturnType<typeof mountAnchorControl> | undefined;
    const options = () => ({ label: props.label, value: props.value, hint: props.hint, onChange: (value: AnchorValue) => emit('change', value) });
    onMounted(() => { control = mountAnchorControl(host.value!, options()); });
    watchEffect(() => { const next = options(); control?.update(next); });
    onUnmounted(() => control?.destroy());
    return () => h('div', { ref: host, class: 'dialkit-anchor-host' });
  },
});
