import { defineComponent, h, onMounted, onUnmounted, ref, watchEffect, type PropType } from 'vue';
import type { LayerActionKind, LayersValue } from '../../layers';
import { mountLayerListControl } from '../../layer-list-control';

export const LayerListControl = defineComponent({
  name: 'DialKitLayerListControl',
  props: {
    label: { type: String, required: true },
    value: { type: Object as PropType<LayersValue>, required: true },
    addLabel: { type: String, required: false },
    addDisabled: { type: Boolean, required: false },
    empty: { type: String, required: false },
  },
  emits: ['change', 'action'],
  setup(props, { emit }) {
    const host = ref<HTMLElement>();
    let control: ReturnType<typeof mountLayerListControl> | undefined;
    const options = () => ({
      label: props.label, value: props.value, addLabel: props.addLabel, addDisabled: props.addDisabled, empty: props.empty,
      onChange: (value: LayersValue) => emit('change', value),
      onAction: (kind: LayerActionKind, id?: string) => emit('action', kind, id),
    });
    onMounted(() => { control = mountLayerListControl(host.value!, options()); });
    watchEffect(() => { const next = options(); control?.update(next); });
    onUnmounted(() => control?.destroy());
    return () => h('div', { ref: host, class: 'dialkit-layers-host' });
  },
});
