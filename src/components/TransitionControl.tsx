import { createEaseIntensity } from '../easing-geometry';
import { mountEaseFields, type EaseFieldsProps } from '../easing-control';
import { SpringConfig, EasingConfig, TransitionConfig, DialStore, type CopiedTransition } from '../store/DialStore';
import { TRANSITION_HINTS, transitionPresetName } from '../transition-presets';
import { mountTransitionCopy, mountTransitionPresets, type TransitionCopyProps, type TransitionPresetsProps } from '../transition-presets-control';
import { Folder } from './Folder';
import { Slider } from './Slider';
import { SegmentedControl } from './SegmentedControl';
import { SpringVisualization } from './SpringVisualization';
import { EasingVisualization } from './EasingVisualization';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { HINTS } from '../hints';
import { useHints } from '../hooks/useHints';

interface TransitionControlProps {
  panelId: string;
  path: string;
  label: string;
  value: TransitionConfig;
  onChange: (value: TransitionConfig) => void;
  /** Hide duration sliders when something else owns the duration (e.g. a timeline clip bar). */
  hideDuration?: boolean;
  /** Route duration edits through an external owner while keeping this control's layout. */
  durationControl?: {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
  };
  /** Shows a reset button in the header. See Folder.onReset. */
  onReset?: () => void;
  changed?: boolean;
  hint?: string;
}

type CurveMode = 'easing' | 'simple' | 'advanced';

const subscribeTransitions = (callback: () => void) => DialStore.subscribeTransitions(callback);
const getTransitionPresets = () => DialStore.getTransitionPresets();

export function TransitionControl({
  panelId,
  path,
  label,
  value,
  onChange,
  hideDuration = false,
  durationControl,
  onReset,
  changed,
  hint,
}: TransitionControlProps) {
  const subscribe = useCallback(
    (callback: () => void) => DialStore.subscribe(panelId, callback),
    [panelId]
  );
  const getSnapshot = useCallback(
    () => DialStore.getTransitionMode(panelId, path),
    [panelId, path]
  );
  const mode = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const savedPresets = useSyncExternalStore(subscribeTransitions, getTransitionPresets, getTransitionPresets);
  useHints(true);

  const isEasing = mode === 'easing';
  const isSimpleSpring = mode === 'simple';

  // Cache per-mode values so switching back restores previous edits
  const cache = useRef<{
    easing: EasingConfig;
    simple: SpringConfig;
    advanced: SpringConfig;
  }>({
    easing: value.type === 'easing' ? value : { type: 'easing', duration: 0.3, ease: [1, -0.4, 0.5, 1] },
    simple: value.type === 'spring' && value.visualDuration !== undefined ? value : { type: 'spring', visualDuration: 0.3, bounce: 0.2 },
    advanced: value.type === 'spring' && value.stiffness !== undefined ? value : { type: 'spring', stiffness: 200, damping: 25, mass: 1 },
  });

  // Keep cache up to date with current edits
  if (isEasing && value.type === 'easing') {
    cache.current.easing = value;
  } else if (isSimpleSpring && value.type === 'spring') {
    cache.current.simple = value;
  } else if (mode === 'advanced' && value.type === 'spring') {
    cache.current.advanced = value;
  }

  const spring: SpringConfig = value.type === 'spring' ? value : cache.current.simple;
  const easing: EasingConfig = value.type === 'easing' ? value : cache.current.easing;

  const handleModeChange = (newMode: CurveMode) => {
    DialStore.updateTransitionMode(panelId, path, newMode);

    if (newMode === 'easing') {
      onChange(cache.current.easing);
    } else if (newMode === 'simple') {
      onChange(cache.current.simple);
    } else {
      onChange(cache.current.advanced);
    }
  };

  // Intensity scales the curve it started from; 50% is that curve.
  const [intensity] = useState(createEaseIntensity);

  const handlePaste = (copied: CopiedTransition) => {
    DialStore.updateTransitionMode(panelId, path, copied.mode);
    onChange(copied.value);
  };

  const handleSpringUpdate = (key: keyof SpringConfig, val: number) => {
    if (isSimpleSpring) {
      const { stiffness, damping, mass, ...rest } = spring;
      onChange({ ...rest, [key]: val });
    } else {
      const { visualDuration, bounce, ...rest } = spring;
      onChange({ ...rest, [key]: val });
    }
  };

  const durationSlider = !hideDuration && (isEasing || isSimpleSpring) ? (
    <Slider
      label="Duration"
      value={durationControl?.value ?? (isEasing ? easing.duration : spring.visualDuration ?? 0.3)}
      onChange={durationControl?.onChange ?? ((next) => {
        if (isEasing) onChange({ ...easing, duration: next });
        else handleSpringUpdate('visualDuration', next);
      })}
      min={durationControl?.min ?? 0.1}
      max={durationControl?.max ?? (isEasing ? 2 : 5)}
      step={durationControl?.step ?? 0.05}
      unit="s"
      hint={isEasing ? HINTS.easingDuration : HINTS.springDuration}
    />
  ) : null;

  return (
    <Folder title={label} defaultOpen={true} hint={hint} onReset={onReset} changed={changed} actions={<TransitionCopy mode={mode} value={isEasing ? easing : spring} onPaste={handlePaste} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="dialkit-labeled-control dialkit-transition-type" data-hint={HINTS.transitionType}>
          <span className="dialkit-labeled-control-label">Type</span>
          <SegmentedControl
            options={[
              { value: 'easing' as const, label: 'Easing' },
              { value: 'simple' as const, label: 'Time' },
              { value: 'advanced' as const, label: 'Physics' },
            ]}
            value={mode}
            onChange={handleModeChange}
          />
        </div>

        {isEasing ? (
          <EasingVisualization easing={easing} onChange={(ease) => onChange({ ...easing, ease })} />
        ) : (
          <SpringVisualization spring={spring} isSimpleMode={isSimpleSpring} />
        )}

        {isEasing ? (
          <>
            <EaseFields ease={easing.ease} onChange={(ease) => onChange({ ...easing, ease })} />
            <Slider
              label="Intensity"
              value={intensity.read(easing.ease)}
              onChange={(v) => onChange({ ...easing, ease: intensity.apply(easing.ease, v) })}
              min={0}
              max={100}
              step={1}
              unit="%"
              hint={TRANSITION_HINTS.intensity}
            />
          </>
        ) : isSimpleSpring ? (
          <Slider label="Bounce" value={spring.bounce ?? 0.2} onChange={(v) => handleSpringUpdate('bounce', v)} min={0} max={1} step={0.05} hint={HINTS.bounce} />
        ) : (
          <>
            <Slider label="Stiffness" value={spring.stiffness ?? 400} onChange={(v) => handleSpringUpdate('stiffness', v)} min={1} max={1000} step={10} hint={HINTS.stiffness} />
            <Slider label="Damping" value={spring.damping ?? 17} onChange={(v) => handleSpringUpdate('damping', v)} min={1} max={100} step={1} hint={HINTS.damping} />
            <Slider label="Mass" value={spring.mass ?? 1} onChange={(v) => handleSpringUpdate('mass', v)} min={0.1} max={10} step={0.1} hint={HINTS.mass} />
          </>
        )}
        {durationSlider}

        <Folder title="Presets" defaultOpen={false} hint={TRANSITION_HINTS.presets} meta={transitionPresetName(isEasing ? easing : spring, mode, savedPresets)}>
          <TransitionPresets mode={mode} value={isEasing ? easing : spring} onChange={onChange} />
        </Folder>
      </div>
    </Folder>
  );
}

function TransitionPresets(props: TransitionPresetsProps) {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<ReturnType<typeof mountTransitionPresets>>();
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    control.current = mountTransitionPresets(host.current!, latest.current);
    return () => control.current?.destroy();
  }, []);
  useEffect(() => { control.current?.update(props); });
  return <div ref={host} />;
}

function TransitionCopy(props: TransitionCopyProps) {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<ReturnType<typeof mountTransitionCopy>>();
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    control.current = mountTransitionCopy(host.current!, latest.current);
    return () => control.current?.destroy();
  }, []);
  useEffect(() => { control.current?.update(props); });
  return <div ref={host} />;
}

function EaseFields(props: EaseFieldsProps) {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<ReturnType<typeof mountEaseFields>>();
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    control.current = mountEaseFields(host.current!, latest.current);
    return () => control.current?.destroy();
  }, []);
  useEffect(() => { control.current?.update(props); });
  return <div ref={host} />;
}
