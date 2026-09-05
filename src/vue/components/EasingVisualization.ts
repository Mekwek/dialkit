import { defineComponent, h, onMounted, onUnmounted, ref, watchEffect, type PropType } from 'vue';
import { mountEasingVisualization, type EasingVisualizationProps } from '../../easing-control';
import type { EasingConfig } from '../../store/DialStore';

export { easingPresets } from '../../easing-geometry';

export const EasingVisualization = defineComponent({
  name: 'DialKitEasingVisualization',
  props: {
    easing: { type: Object as PropType<EasingConfig>, required: true },
    onChange: Function as PropType<EasingVisualizationProps['onChange']>,
  },
  setup(props) {
    const host = ref<HTMLElement>();
    let control: ReturnType<typeof mountEasingVisualization> | undefined;
    const options = () => ({ easing: props.easing, onChange: props.onChange });
    onMounted(() => { control = mountEasingVisualization(host.value!, options()); });
    watchEffect(() => { const next = options(); control?.update(next); });
    onUnmounted(() => control?.destroy());
    return () => h('div', { ref: host, class: 'dialkit-easing-host' });
  },
});
