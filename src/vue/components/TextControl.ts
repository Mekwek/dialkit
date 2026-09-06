import { defineComponent, h, onMounted, onUnmounted, ref, watch } from 'vue';
import { observeTextSize } from '../../text-autosize';

let textControlInstance = 0;

export const TextControl = defineComponent({
  name: 'DialKitTextControl',
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
    placeholder: { type: String, required: false },
  },
  emits: ['change'],
  setup(props, { emit }) {
    const inputId = ref(`dialkit-text-${++textControlInstance}`);
    const inputRef = ref<HTMLTextAreaElement>();
    let size: ReturnType<typeof observeTextSize> | undefined;
    onMounted(() => { size = observeTextSize(inputRef.value!); });
    onUnmounted(() => size?.destroy());
    watch(() => [props.value, props.placeholder], () => size?.update(), { flush: 'post' });

    return () => h('div', { class: 'dialkit-text-control' }, [
      h('label', { class: 'dialkit-text-label', for: inputId.value }, props.label),
      h('textarea', {
        ref: inputRef,
        id: inputId.value,
        rows: 1,
        class: 'dialkit-text-input',
        value: props.value,
        placeholder: props.placeholder,
        onInput: (event: Event) => emit('change', (event.target as HTMLTextAreaElement).value),
      }),
    ]);
  },
});
