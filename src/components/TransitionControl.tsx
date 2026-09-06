import { formatEase, parseEase } from '../easing-geometry';
import { SpringConfig, EasingConfig, TransitionConfig, DialStore } from '../store/DialStore';
import { springParams, springSettleDuration } from '../transition-math';
import { Folder } from './Folder';
import { Slider } from './Slider';
import { SegmentedControl } from './SegmentedControl';
import { SpringVisualization } from './SpringVisualization';
import { EasingVisualization } from './EasingVisualization';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';

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

  return (
    <Folder title={label} defaultOpen={true}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {isEasing ? (
          <EasingVisualization easing={easing} onChange={(ease) => onChange({ ...easing, ease })} />
        ) : (
          <SpringVisualization spring={spring} isSimpleMode={isSimpleSpring} />
        )}

        <div className="dialkit-labeled-control">
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
          <>
            <EaseTextInput ease={easing.ease} onChange={(newEase) => onChange({ ...easing, ease: newEase })} />
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

function EaseTextInput({ ease, onChange }: { ease: [number, number, number, number]; onChange: (ease: [number, number, number, number]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const handleFocus = () => {
    setDraft(formatEase(ease));
    setEditing(true);
  };

  const handleBlur = () => {
    const parsed = parseEase(draft);
    if (parsed) onChange(parsed);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="dialkit-labeled-control">
      <span className="dialkit-labeled-control-label">Ease</span>
      <input
        type="text"
        aria-label="Bézier coordinates"
        className="dialkit-text-input"
        value={editing ? draft : formatEase(ease)}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        spellCheck={false}
      />
    </div>
  );
}
