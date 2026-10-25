import { defineComponent, h, onMounted, onUnmounted, ref, watchEffect, type PropType } from 'vue';
import type { ControlMeta, DialValue } from '../../store/DialStore';
import { mountFields } from '../../fields-control';

export const Fields = defineComponent({
  name: 'DialKitFields',
  props: {
    label: { type: String, required: true },
    controls: { type: Array as PropType<ControlMeta[]>, required: true },
    values: { type: Object as PropType<Record<string, DialValue>>, required: true },
    defaults: { type: Object as PropType<Record<string, DialValue>>, required: true },
    hint: String,
  },
  emits: ['change'],
  setup(props, { emit }) {
    const host = ref<HTMLElement>();
    let control: ReturnType<typeof mountFields> | undefined;
    const options = () => ({ label: props.label, controls: props.controls, values: props.values, defaults: props.defaults, hint: props.hint, onChange: (values: Record<string, DialValue>) => emit('change', values) });
    onMounted(() => { control = mountFields(host.value!, options()); });
    watchEffect(() => { const next = options(); control?.update(next); });
    onUnmounted(() => control?.destroy());
    return () => h('div', { ref: host, class: 'dialkit-fields-host' });
  },
});
