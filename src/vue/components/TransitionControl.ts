import { createEaseIntensity } from '../../easing-geometry';
import { mountEaseFields } from '../../easing-control';
import { defineComponent, h, onMounted, onUnmounted, ref, shallowRef, watchEffect, type PropType } from 'vue';
import { DialStore } from '../../store/DialStore';
import type { CopiedTransition, EasingConfig, SpringConfig, TransitionConfig, TransitionMode } from '../../store/DialStore';
import { transitionPresetName } from '../../transition-presets';
import { mountTransitionCopy, mountTransitionPresets } from '../../transition-presets-control';
import { Folder } from './Folder';
import { Slider } from './Slider';
import { SegmentedControl } from './SegmentedControl';
import { SpringVisualization } from './SpringVisualization';
import { EasingVisualization } from './EasingVisualization';

type CurveMode = 'easing' | 'simple' | 'advanced';

export interface TransitionDurationControl {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const EaseFields = defineComponent({
  name: 'DialKitEaseFields',
  props: {
    ease: { type: Array as unknown as PropType<[number, number, number, number]>, required: true },
    onChange: { type: Function as PropType<(ease: [number, number, number, number]) => void>, required: true },
  },
  setup(props) {
    const host = ref<HTMLElement>();
    let control: ReturnType<typeof mountEaseFields> | undefined;
    const options = () => ({ ease: props.ease, onChange: props.onChange });
    onMounted(() => { control = mountEaseFields(host.value!, options()); });
    watchEffect(() => { const next = options(); control?.update(next); });
    onUnmounted(() => control?.destroy());
    return () => h('div', { ref: host });
  },
});

const TransitionPresets = defineComponent({
  name: 'DialKitTransitionPresets',
  props: {
    mode: { type: String as PropType<TransitionMode>, required: true },
    value: { type: Object as PropType<TransitionConfig>, required: true },
    onChange: { type: Function as PropType<(value: TransitionConfig) => void>, required: true },
  },
  setup(props) {
    const host = ref<HTMLElement>();
    let control: ReturnType<typeof mountTransitionPresets> | undefined;
    const options = () => ({ mode: props.mode, value: props.value, onChange: props.onChange });
    onMounted(() => { control = mountTransitionPresets(host.value!, options()); });
    watchEffect(() => { const next = options(); control?.update(next); });
    onUnmounted(() => control?.destroy());
    return () => h('div', { ref: host });
  },
});

const TransitionCopy = defineComponent({
  name: 'DialKitTransitionCopy',
  props: {
    mode: { type: String as PropType<TransitionMode>, required: true },
    value: { type: Object as PropType<TransitionConfig>, required: true },
    onPaste: { type: Function as PropType<(copied: CopiedTransition) => void>, required: true },
  },
  setup(props) {
    const host = ref<HTMLElement>();
    let control: ReturnType<typeof mountTransitionCopy> | undefined;
    const options = () => ({ mode: props.mode, value: props.value, onPaste: props.onPaste });
    onMounted(() => { control = mountTransitionCopy(host.value!, options()); });
    watchEffect(() => { const next = options(); control?.update(next); });
    onUnmounted(() => control?.destroy());
    return () => h('div', { ref: host });
  },
});

export const TransitionControl = defineComponent({
  name: 'DialKitTransitionControl',
  props: {
    panelId: { type: String, required: true },
    path: { type: String, required: true },
    label: { type: String, required: true },
    value: {
      type: Object as PropType<TransitionConfig>,
      required: true,
    },
    hideDuration: { type: Boolean, default: false },
    durationControl: Object as PropType<TransitionDurationControl>,
    /** Shows a reset button in the header. See Folder.onReset. */
    onReset: Function as PropType<() => void>,
    changed: { type: Boolean, default: false },
  },
  emits: ['change'],
  setup(props, { emit }) {
    const mode = ref<CurveMode>(DialStore.getTransitionMode(props.panelId, props.path));
    const savedPresets = shallowRef(DialStore.getTransitionPresets());
    let unsub: (() => void) | undefined;
    let unsubPresets: (() => void) | undefined;

    onMounted(() => {
      unsub = DialStore.subscribe(props.panelId, () => {
        mode.value = DialStore.getTransitionMode(props.panelId, props.path);
      });
      unsubPresets = DialStore.subscribeTransitions(() => {
        savedPresets.value = DialStore.getTransitionPresets();
      });
    });

    onUnmounted(() => {
      unsub?.();
      unsubPresets?.();
    });

    const cache = {
      easing: (props.value.type === 'easing' ? { ...props.value } : { type: 'easing' as const, duration: 0.3, ease: [1, -0.4, 0.5, 1] as [number, number, number, number] }) as EasingConfig,
      simple: (props.value.type === 'spring' && props.value.visualDuration !== undefined ? { ...props.value } : { type: 'spring' as const, visualDuration: 0.3, bounce: 0.2 }) as SpringConfig,
      advanced: (props.value.type === 'spring' && props.value.stiffness !== undefined ? { ...props.value } : { type: 'spring' as const, stiffness: 200, damping: 25, mass: 1 }) as SpringConfig,
    };

    const spring = (): SpringConfig => {
      if (props.value.type === 'spring') {
        // Keep cache updated
        if (mode.value === 'simple') cache.simple = props.value;
        else if (mode.value === 'advanced') cache.advanced = props.value;
        return props.value;
      }
      return cache.simple;
    };

    const easing = (): EasingConfig => {
      if (props.value.type === 'easing') {
        cache.easing = props.value;
        return props.value;
      }
      return cache.easing;
    };

    const handleModeChange = (nextMode: CurveMode) => {
      DialStore.updateTransitionMode(props.panelId, props.path, nextMode);

      if (nextMode === 'easing') {
        emit('change', cache.easing);
      } else if (nextMode === 'simple') {
        emit('change', cache.simple);
      } else {
        emit('change', cache.advanced);
      }
    };

    // Intensity scales the curve it started from; 50% is that curve.
    const intensity = createEaseIntensity();

    const handlePaste = (copied: CopiedTransition) => {
      DialStore.updateTransitionMode(props.panelId, props.path, copied.mode);
      emit('change', copied.value);
    };

    const handleSpringUpdate = (key: keyof SpringConfig, value: number) => {
      const current = spring();
      if (mode.value === 'simple') {
        const { stiffness, damping, mass, ...rest } = current;
        emit('change', { ...rest, [key]: value });
      } else {
        const { visualDuration, bounce, ...rest } = current;
        emit('change', { ...rest, [key]: value });
      }
    };

    return () => {
      const isEasing = mode.value === 'easing';
      const isSimpleSpring = mode.value === 'simple';
      const currentSpring = spring();
      const currentEasing = easing();
      const durationSlider = !props.hideDuration && (isEasing || isSimpleSpring)
        ? h(Slider, {
          label: 'Duration',
          value: props.durationControl?.value ?? (isEasing ? currentEasing.duration : currentSpring.visualDuration ?? 0.3),
          min: props.durationControl?.min ?? 0.1,
          max: props.durationControl?.max ?? (isEasing ? 2 : 5),
          step: props.durationControl?.step ?? 0.05,
          unit: 's',
          onChange: props.durationControl?.onChange ?? ((next: number) => {
            if (isEasing) emit('change', { ...currentEasing, duration: next });
            else handleSpringUpdate('visualDuration', next);
          }),
        })
        : null;

      const current = isEasing ? currentEasing : currentSpring;

      return h(Folder, {
        title: props.label,
        defaultOpen: true,
        onReset: props.onReset,
        changed: props.changed,
        actions: () => h(TransitionCopy, { mode: mode.value, value: current, onPaste: handlePaste }),
      }, {
        default: () => [
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } }, [
            h('div', { class: 'dialkit-labeled-control dialkit-transition-type' }, [
              h('span', { class: 'dialkit-labeled-control-label' }, 'Type'),
              h(SegmentedControl, {
                options: [
                  { value: 'easing', label: 'Easing' },
                  { value: 'simple', label: 'Time' },
                  { value: 'advanced', label: 'Physics' },
                ],
                value: mode.value,
                onChange: handleModeChange,
              }),
            ]),
            isEasing
              ? h(EasingVisualization, { easing: currentEasing, onChange: (ease: EasingConfig['ease']) => emit('change', { ...currentEasing, ease }) })
              : h(SpringVisualization, { spring: currentSpring, isSimpleMode: isSimpleSpring }),
            ...(isEasing
              ? [
                h(EaseFields, {
                  ease: currentEasing.ease,
                  onChange: (ease: EasingConfig['ease']) => emit('change', { ...currentEasing, ease }),
                }),
                h(Slider, {
                  label: 'Intensity',
                  value: intensity.read(currentEasing.ease),
                  min: 0,
                  max: 100,
                  step: 1,
                  unit: '%',
                  onChange: (next: number) => emit('change', { ...currentEasing, ease: intensity.apply(currentEasing.ease, next) }),
                }),
              ]
              : isSimpleSpring
                ? [
                  h(Slider, {
                    label: 'Bounce',
                    value: currentSpring.bounce ?? 0.2,
                    min: 0,
                    max: 1,
                    step: 0.05,
                    onChange: (next: number) => handleSpringUpdate('bounce', next),
                  }),
                ]
                : [
                  h(Slider, {
                    label: 'Stiffness',
                    value: currentSpring.stiffness ?? 400,
                    min: 1,
                    max: 1000,
                    step: 10,
                    onChange: (next: number) => handleSpringUpdate('stiffness', next),
                  }),
                  h(Slider, {
                    label: 'Damping',
                    value: currentSpring.damping ?? 17,
                    min: 1,
                    max: 100,
                    step: 1,
                    onChange: (next: number) => handleSpringUpdate('damping', next),
                  }),
                  h(Slider, {
                    label: 'Mass',
                    value: currentSpring.mass ?? 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1,
                    onChange: (next: number) => handleSpringUpdate('mass', next),
                  }),
                ]),
            durationSlider,
            h(Folder, { title: 'Presets', defaultOpen: false, meta: transitionPresetName(current, mode.value, savedPresets.value) }, {
              default: () => [
                h(TransitionPresets, { mode: mode.value, value: current, onChange: (next: TransitionConfig) => emit('change', next) }),
              ],
            }),
          ]),
        ],
      });
    };
  },
});
