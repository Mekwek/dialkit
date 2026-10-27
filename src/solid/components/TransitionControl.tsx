import { createEaseIntensity } from '../../easing-geometry';
import { mountEaseFields, type EaseFieldsProps } from '../../easing-control';
import { createEffect, onCleanup, onMount, Show } from 'solid-js';
import { DialStore } from '../../store/DialStore';
import type { CopiedTransition, EasingConfig, SpringConfig, TransitionConfig } from '../../store/DialStore';
import { transitionPresetName } from '../../transition-presets';
import { mountTransitionCopy, mountTransitionPresets, type TransitionCopyProps, type TransitionPresetsProps } from '../../transition-presets-control';
import { HINTS } from '../../hints';
import { createHints, fromStore } from '../primitives';
import { EasingVisualization } from './EasingVisualization';
import { Folder } from './Folder';
import { SegmentedControl } from './SegmentedControl';
import { Slider } from './Slider';
import { SpringVisualization } from './SpringVisualization';

export interface TransitionDurationControl {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

interface TransitionControlProps {
  panelId: string;
  path: string;
  label: string;
  value: TransitionConfig;
  onChange: (value: TransitionConfig) => void;
  hideDuration?: boolean;
  durationControl?: TransitionDurationControl;
  /** Shows a reset button in the header. See Folder.onReset. */
  onReset?: () => void;
  changed?: boolean;
  hint?: string;
}

type CurveMode = 'easing' | 'simple' | 'advanced';

export function TransitionControl(props: TransitionControlProps) {
  const mode = fromStore(
    () => DialStore.getTransitionMode(props.panelId, props.path),
    (notify) => DialStore.subscribe(props.panelId, notify)
  );
  createHints(() => true);
  const savedPresets = fromStore(
    () => DialStore.getTransitionPresets(),
    (notify) => DialStore.subscribeTransitions(notify)
  );
  // Intensity scales the curve it started from; 50% is that curve.
  const intensity = createEaseIntensity();
  const cache: { easing: EasingConfig; simple: SpringConfig; advanced: SpringConfig } = {
    easing: props.value.type === 'easing'
      ? props.value
      : { type: 'easing', duration: 0.3, ease: [1, -0.4, 0.5, 1] },
    simple: props.value.type === 'spring' && props.value.visualDuration !== undefined
      ? props.value
      : { type: 'spring', visualDuration: 0.3, bounce: 0.2 },
    advanced: props.value.type === 'spring' && props.value.stiffness !== undefined
      ? props.value
      : { type: 'spring', stiffness: 200, damping: 25, mass: 1 },
  };

  const isEasing = () => mode() === 'easing';
  const isSimple = () => mode() === 'simple';
  const spring = () => {
    if (props.value.type === 'spring') {
      if (isSimple()) cache.simple = props.value;
      else if (mode() === 'advanced') cache.advanced = props.value;
      return props.value;
    }
    return cache.simple;
  };
  const easing = () => {
    if (props.value.type === 'easing') {
      cache.easing = props.value;
      return props.value;
    }
    return cache.easing;
  };

  const handleModeChange = (next: CurveMode) => {
    DialStore.updateTransitionMode(props.panelId, props.path, next);
    props.onChange(next === 'easing' ? cache.easing : next === 'simple' ? cache.simple : cache.advanced);
  };

  const handlePaste = (copied: CopiedTransition) => {
    DialStore.updateTransitionMode(props.panelId, props.path, copied.mode);
    props.onChange(copied.value);
  };

  const handleSpringUpdate = (key: keyof SpringConfig, value: number) => {
    const current = spring();
    if (isSimple()) {
      const { stiffness, damping, mass, ...rest } = current;
      props.onChange({ ...rest, [key]: value });
    } else {
      const { visualDuration, bounce, ...rest } = current;
      props.onChange({ ...rest, [key]: value });
    }
  };

  const durationSlider = () => {
    if (props.hideDuration || (!isEasing() && !isSimple())) return null;
    const external = props.durationControl;
    return (
      <Slider
        label="Duration"
        value={external?.value ?? (isEasing() ? easing().duration : spring().visualDuration ?? 0.3)}
        onChange={external?.onChange ?? ((value) => {
          if (isEasing()) props.onChange({ ...easing(), duration: value });
          else handleSpringUpdate('visualDuration', value);
        })}
        min={external?.min ?? 0.1}
        max={external?.max ?? (isEasing() ? 2 : 5)}
        step={external?.step ?? 0.05}
        unit="s"
        hint={isEasing() ? HINTS.easingDuration : HINTS.springDuration}
      />
    );
  };

  return (
    <Folder
      title={props.label}
      defaultOpen={true}
      hint={props.hint}
      onReset={props.onReset}
      changed={props.changed}
      actions={<TransitionCopy mode={mode()} value={isEasing() ? easing() : spring()} onPaste={handlePaste} />}
    >
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '6px' }}>
        <div class="dialkit-labeled-control dialkit-transition-type" data-hint={HINTS.transitionType}>
          <span class="dialkit-labeled-control-label">Type</span>
          <SegmentedControl
            options={[
              { value: 'easing', label: 'Easing' },
              { value: 'simple', label: 'Time' },
              { value: 'advanced', label: 'Physics' },
            ]}
            value={mode()}
            onChange={handleModeChange}
          />
        </div>

        <Show when={isEasing()} fallback={<SpringVisualization spring={spring()} isSimpleMode={isSimple()} />}>
          <EasingVisualization easing={easing()} onChange={(ease) => props.onChange({ ...easing(), ease })} />
        </Show>

        <Show when={isEasing()}>
          <EaseFields ease={easing().ease} onChange={(ease) => props.onChange({ ...easing(), ease })} />
          <Slider
            label="Intensity"
            value={intensity.read(easing().ease)}
            onChange={(value) => props.onChange({ ...easing(), ease: intensity.apply(easing().ease, value) })}
            min={0}
            max={100}
            step={1}
            unit="%"
          />
        </Show>

        <Show when={isSimple()}>
          <Slider label="Bounce" value={spring().bounce ?? 0.2} onChange={(value) => handleSpringUpdate('bounce', value)} min={0} max={1} step={0.05} hint={HINTS.bounce} />
        </Show>
        <Show when={!isEasing() && !isSimple()}>
          <Slider label="Stiffness" value={spring().stiffness ?? 400} onChange={(value) => handleSpringUpdate('stiffness', value)} min={1} max={1000} step={10} hint={HINTS.stiffness} />
          <Slider label="Damping" value={spring().damping ?? 17} onChange={(value) => handleSpringUpdate('damping', value)} min={1} max={100} step={1} hint={HINTS.damping} />
          <Slider label="Mass" value={spring().mass ?? 1} onChange={(value) => handleSpringUpdate('mass', value)} min={0.1} max={10} step={0.1} hint={HINTS.mass} />
        </Show>
        {durationSlider()}

        <Folder title="Presets" defaultOpen={false} meta={transitionPresetName(isEasing() ? easing() : spring(), mode(), savedPresets())}>
          <TransitionPresets mode={mode()} value={isEasing() ? easing() : spring()} onChange={props.onChange} />
        </Folder>
      </div>
    </Folder>
  );
}

function EaseFields(props: EaseFieldsProps) {
  let host!: HTMLDivElement;
  let control: ReturnType<typeof mountEaseFields> | undefined;
  onMount(() => {
    control = mountEaseFields(host, { ...props });
    createEffect(() => control?.update({ ease: props.ease, onChange: props.onChange }));
  });
  onCleanup(() => control?.destroy());
  return <div ref={host} />;
}

function TransitionPresets(props: TransitionPresetsProps) {
  let host!: HTMLDivElement;
  let control: ReturnType<typeof mountTransitionPresets> | undefined;
  onMount(() => {
    control = mountTransitionPresets(host, { ...props });
    createEffect(() => control?.update({ mode: props.mode, value: props.value, onChange: props.onChange }));
  });
  onCleanup(() => control?.destroy());
  return <div ref={host} />;
}

function TransitionCopy(props: TransitionCopyProps) {
  let host!: HTMLDivElement;
  let control: ReturnType<typeof mountTransitionCopy> | undefined;
  onMount(() => {
    control = mountTransitionCopy(host, { ...props });
    createEffect(() => control?.update({ mode: props.mode, value: props.value, onPaste: props.onPaste }));
  });
  onCleanup(() => control?.destroy());
  return <div ref={host} />;
}
