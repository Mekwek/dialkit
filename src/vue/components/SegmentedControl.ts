import { handleSegmentKey, labelSegmentedControl } from '../../control-keyboard';
import { defineComponent, h, nextTick, onMounted, onUnmounted, ref, watch, type PropType } from 'vue';
import { animate } from 'motion';
import { iconPaths } from '../../icons';

type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
  /** SVG path data in a 24 × 24 box, shown in place of the label. */
  icon?: string | string[];
};

export const SegmentedControl = defineComponent({
  name: 'DialKitSegmentedControl',
  props: {
    options: {
      type: Array as PropType<SegmentedControlOption<string>[]>,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
    /** Accessible name for the group. */
    label: { type: String, default: undefined },
  },
  emits: ['change'],
  setup(props, { emit }) {
    const containerRef = ref<HTMLElement | null>(null);
    const pillRef = ref<HTMLElement | null>(null);
    const buttonRefs = new Map<string, HTMLElement>();

    const pillReady = ref(false);
    let hasAnimated = false;
    let pillAnim: ReturnType<typeof animate> | null = null;

    const measurePill = () => {
      const button = buttonRefs.get(props.value);
      const container = containerRef.value;
      if (!button || !container) return null;
      labelSegmentedControl(container);

      // Fractions of the row stay exact at fractional sizes and under transforms.
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      if (!containerRect.width) return null;
      return {
        left: `${(buttonRect.left - containerRect.left) / containerRect.width * 100}%`,
        width: `${buttonRect.width / containerRect.width * 100}%`,
      };
    };

    const setPillImmediate = (left: string, width: string) => {
      if (!pillRef.value) return;
      pillRef.value.style.left = left;
      pillRef.value.style.width = width;
      pillRef.value.style.visibility = 'visible';
    };

    const updatePill = (shouldAnimate: boolean) => {
      const next = measurePill();
      if (!next) return;

      if (!pillReady.value) {
        setPillImmediate(next.left, next.width);
        pillReady.value = true;
        return;
      }

      if (!shouldAnimate || !hasAnimated || !pillRef.value) {
        pillAnim?.stop();
        pillAnim = null;
        setPillImmediate(next.left, next.width);
        return;
      }

      pillAnim?.stop();
      pillAnim = animate(
        pillRef.value,
        {
          left: next.left,
          width: next.width,
        },
        {
          type: 'spring',
          visualDuration: 0.2,
          bounce: 0.15,
          onComplete: () => {
            pillAnim = null;
          },
        }
      );
    };

    let ro: ResizeObserver | undefined;

    onMounted(() => {
      nextTick(() => {
        updatePill(false);
        hasAnimated = true;
      });

      if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
        ro = new ResizeObserver(() => updatePill(false));
        ro.observe(containerRef.value);
      }
    });

    onUnmounted(() => {
      pillAnim?.stop();
      ro?.disconnect();
    });

    watch(
      () => props.value,
      () => {
        updatePill(true);
      },
      { flush: 'post' }
    );

    return () => h('div', { ref: containerRef, class: 'dialkit-segmented', role: 'radiogroup', 'aria-label': props.label, onKeydown: handleSegmentKey }, [
      h('div', {
        ref: pillRef,
        class: 'dialkit-segmented-pill',
        style: {
          visibility: pillReady.value ? 'visible' : 'hidden',
        },
      }),
      ...props.options.map((option) => h('button', {
        ref: ((el: Element | null) => {
          if (el instanceof HTMLElement) {
            buttonRefs.set(option.value, el);
            return;
          }

          buttonRefs.delete(option.value);
        }) as any,
        class: 'dialkit-segmented-button',
        'data-active': String(props.value === option.value),
        type: 'button', role: 'radio', 'aria-checked': props.value === option.value, tabindex: props.value === option.value ? 0 : -1,
        'aria-label': option.icon ? option.label : undefined,
        onClick: () => emit('change', option.value),
      }, option.icon
        ? h('svg', {
          class: 'dialkit-segmented-icon',
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '2',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'aria-hidden': 'true',
        }, iconPaths(option.icon).map((d) => h('path', { d })))
        : option.label)),
    ]);
  },
});
