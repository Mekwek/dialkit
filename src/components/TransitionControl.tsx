import type { BezierPoints } from '../easing-geometry';
import { SpringConfig, EasingConfig, TransitionConfig, DialStore } from '../store/DialStore';
import { springParams, springSettleDuration } from '../transition-math';
import { Folder } from './Folder';
import { Slider } from './Slider';
import { SegmentedControl } from './SegmentedControl';
import { SpringVisualization } from './SpringVisualization';
import { EasingVisualization } from './EasingVisualization';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CURVE_MORPH_MS, EASING_CURVES, curveNameFor, customSpringNameFor, intensityEase, sameEase, springPresetNameFor } from '../transition-presets';
import { CurvePicker, EaseFields, SpringPresetPicker, useCustomCurves, useCustomSprings } from './TransitionPresets';

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
  /**
   * Cap (seconds) on the settle time the PHYSICS values may produce — the
   * physics sliders clamp at the value where the derived settle meets it.
   * Evaluated against the CURRENT other two params on every move, so
   * changing one param moves the others' stopping points automatically.
   * The settle is not one-directional in every param (very low damping
   * wobbles long, very high damping crawls long), so the clamp searches
   * for the first crossing between the current value and the requested
   * one instead of assuming a fixed maximum. A move that REDUCES an
   * already-over settle is always allowed.
   */
  physicsSettleCap?: number;
  /** Shows a reset icon in the header. See Folder.onReset. */
  onReset?: () => void;
  /** True when the value differs from its default. */
  changed?: boolean;
}

type CurveMode = 'easing' | 'simple' | 'advanced';

export function TransitionControl({
  panelId,
  path,
  label,
  value,
  onChange,
  hideDuration = false,
  durationControl,
  physicsSettleCap,
  onReset,
  changed,
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

  const handleSpringUpdate = (key: keyof SpringConfig, val: number) => {
    if (isSimpleSpring) {
      const { stiffness, damping, mass, ...rest } = spring;
      onChange({ ...rest, [key]: val });
    } else {
      const { visualDuration, bounce, ...rest } = spring;
      let next = val;
      if (
        physicsSettleCap !== undefined &&
        (key === 'stiffness' || key === 'damping' || key === 'mass')
      ) {
        next = clampPhysicsParam(rest as SpringConfig, key, val, physicsSettleCap);
      }
      onChange({ ...rest, [key]: next });
    }
  };

  const customCurves = useCustomCurves();
  const customSprings = useCustomSprings();

  // A picked curve moves the line and the handles to its shape: the store
  // gets the new curve at once, the curve box shows the steps between.
  const [shownEase, setShownEase] = useState<BezierPoints | null>(null);
  const morph = useRef<{ frame: number; cancelled: boolean } | null>(null);
  const stopMorph = () => {
    if (morph.current) {
      morph.current.cancelled = true;
      cancelAnimationFrame(morph.current.frame);
      morph.current = null;
    }
    setShownEase(null);
  };
  useEffect(() => () => stopMorph(), []);

  // Movo's Intensity: a percentage of the curve it started from. Any other
  // change of the curve starts again from that curve at 50%.
  const [intensity, setIntensity] = useState(50);
  const intensityBase = useRef<BezierPoints>(easing.ease);
  if (!sameEase(intensityEase(intensityBase.current, intensity), easing.ease)) {
    intensityBase.current = easing.ease;
    if (intensity !== 50) setIntensity(50);
  }

  const setEase = (ease: BezierPoints) => {
    stopMorph();
    onChange({ ...easing, ease });
  };

  const pickEase = (target: BezierPoints) => {
    stopMorph();
    const from = shownEase ?? easing.ease;
    // Show the start of the move in the same render as the new value, or the
    // box draws the new curve for one frame, then jumps back.
    setShownEase(from);
    onChange({ ...easing, ease: target });
    const state = { frame: 0, cancelled: false };
    morph.current = state;
    // The clock starts on the first drawn frame, so no frame is spent
    // before the move. Ease in and out: no leap on the first frame.
    let start: number | null = null;
    // A fresh arrow each frame: Theca's Tempus turns a callback that
    // schedules itself by name into a loop that never stops.
    const step = (now: number) => {
      if (state.cancelled) return;
      start ??= now - 1000 / 60;
      const t = Math.min(1, (now - start) / CURVE_MORPH_MS);
      const k = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      if (t >= 1) {
        morph.current = null;
        setShownEase(null);
        return;
      }
      setShownEase(from.map((value, index) => value + (target[index] - value) * k) as BezierPoints);
      state.frame = requestAnimationFrame((time) => step(time));
    };
    state.frame = requestAnimationFrame((time) => step(time));
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
      max={durationControl?.max ?? 5}
      step={durationControl?.step ?? 0.05}
      unit="s"
    />
  ) : null;

  const typeOptions = [
    { value: 'easing' as const, label: 'Easing' },
    { value: 'simple' as const, label: 'Time' },
    { value: 'advanced' as const, label: 'Physics' },
  ];
  const typeControl = (
    <SegmentedControl fill ariaLabel="Type" options={typeOptions} value={mode} onChange={handleModeChange} />
  );

  const presetPicker = isEasing ? (
    <CurvePicker ease={easing.ease} onPick={pickEase} />
  ) : (
    <SpringPresetPicker
      spring={spring}
      mode={isSimpleSpring ? 'simple' : 'advanced'}
      onPick={(next) => onChange(next)}
    />
  );
  // The name the Curves folder shows: the matching default, else
  // the matching saved curve, else Custom.
  const presetName = isEasing
    ? curveNameFor(easing.ease, EASING_CURVES) ?? curveNameFor(easing.ease, customCurves) ?? 'Custom'
    : springPresetNameFor(spring, isSimpleSpring ? 'simple' : 'advanced') ??
      customSpringNameFor(spring, isSimpleSpring ? 'simple' : 'advanced', customSprings) ??
      'Custom';

  return (
    <Folder title={label} defaultOpen={true} onReset={onReset} changed={changed}>
      <div className="dialkit-transition">
        {typeControl}
        {isEasing ? (
          <EasingVisualization easing={{ ...easing, ease: shownEase ?? easing.ease }} onChange={setEase} />
        ) : (
          <SpringVisualization spring={spring} isSimpleMode={isSimpleSpring} />
        )}

        {isEasing ? (
          <>
            <EaseFields ease={easing.ease} onChange={setEase} />
            <Slider
                label="Intensity"
                value={intensity}
                onChange={(next) => {
                  stopMorph();
                  setIntensity(next);
                  onChange({ ...easing, ease: intensityEase(intensityBase.current, next) });
                }}
                min={0}
                max={100}
                step={1}
                unit="%"
              />
          </>
        ) : isSimpleSpring ? (
          <Slider label="Bounce" value={spring.bounce ?? 0.2} onChange={(v) => handleSpringUpdate('bounce', v)} min={0} max={1} step={0.05} />
        ) : (
          <>
            <Slider label="Stiffness" value={spring.stiffness ?? 400} onChange={(v) => handleSpringUpdate('stiffness', v)} min={1} max={1000} step={10} />
            <Slider label="Damping" value={spring.damping ?? 17} onChange={(v) => handleSpringUpdate('damping', v)} min={1} max={100} step={1} />
            <Slider label="Mass" value={spring.mass ?? 1} onChange={(v) => handleSpringUpdate('mass', v)} min={0.1} max={10} step={0.1} />
          </>
        )}
        {durationSlider}
        <Folder title="Curves" defaultOpen={false} meta={presetName}>
          {presetPicker}
        </Folder>
      </div>
    </Folder>
  );
}

/**
 * Clamp one physics param so the spring's derived settle time stays within
 * `cap` seconds — the slider stops at the first value where the settle
 * meets the cap, searched between the current value and the requested one
 * (see TransitionControlProps.physicsSettleCap). Defaults are filled by
 * springParams, the same function the bar derivation uses, so the clamp
 * and the bar always agree.
 */
function clampPhysicsParam(
  current: SpringConfig,
  key: 'stiffness' | 'damping' | 'mass',
  requested: number,
  cap: number
): number {
  const settleWith = (v: number) =>
    springSettleDuration(springParams({ ...current, [key]: v }));
  if (settleWith(requested) <= cap) return requested;
  const oldValue = springParams(current)[key];
  // Already past the cap and the move reduces the settle — always allowed
  // (it is the only way back under).
  if (settleWith(requested) < settleWith(oldValue)) return requested;
  // Already past the cap and the move makes it worse — hold position.
  if (settleWith(oldValue) > cap) return oldValue;
  // Bisect for the crossing between the in-cap current value and the
  // out-of-cap request.
  let good = oldValue;
  let bad = requested;
  for (let i = 0; i < 24; i++) {
    const mid = (good + bad) / 2;
    if (settleWith(mid) <= cap) good = mid;
    else bad = mid;
  }
  return good;
}
