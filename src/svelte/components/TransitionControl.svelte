<script lang="ts">
  import { createEaseIntensity } from '../../easing-geometry';
  import { transitionPresetName } from '../../transition-presets';
  import { DialStore } from 'dialkit/store';
  import type { CopiedTransition, EasingConfig, SpringConfig, TransitionConfig } from 'dialkit/store';
  import { HINTS } from '../../hints';
  import { createHints } from '../hints.svelte.js';
  import Folder from './Folder.svelte';
  import Slider from './Slider.svelte';
  import SegmentedControl from './SegmentedControl.svelte';
  import SpringVisualization from './SpringVisualization.svelte';
  import EasingVisualization from './EasingVisualization.svelte';
  import EaseFields from './EaseFields.svelte';
  import TransitionCopy from './TransitionCopy.svelte';
  import TransitionPresets from './TransitionPresets.svelte';

  type CurveMode = 'easing' | 'simple' | 'advanced';

  export type TransitionDurationControl = {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
  };

  let { panelId, path, label, value, onChange, hideDuration = false, durationControl, onReset, changed = false, hint } = $props<{
    panelId: string;
    path: string;
    label: string;
    value: TransitionConfig;
    onChange: (value: TransitionConfig) => void;
    hideDuration?: boolean;
    durationControl?: TransitionDurationControl;
    /** Shows a reset button in the header. See Folder's onReset. */
    onReset?: () => void;
    changed?: boolean;
    hint?: string;
  }>();
  createHints(() => true);

  let mode = $state<CurveMode>(DialStore.getTransitionMode(panelId, path));
  let savedPresets = $state.raw(DialStore.getTransitionPresets());
  // Intensity scales the curve it started from; 50% is that curve.
  const intensity = createEaseIntensity();

  $effect(() => {
    const unsub = DialStore.subscribe(panelId, () => {
      mode = DialStore.getTransitionMode(panelId, path);
    });
    return unsub;
  });

  $effect(() => {
    const unsub = DialStore.subscribeTransitions(() => {
      savedPresets = DialStore.getTransitionPresets();
    });
    return unsub;
  });

  const isEasing = $derived(mode === 'easing');
  const isSimpleSpring = $derived(mode === 'simple');

  const cache: {
    easing: EasingConfig;
    simple: SpringConfig;
    advanced: SpringConfig;
  } = {
    easing: value.type === 'easing' ? value : { type: 'easing', duration: 0.3, ease: [1, -0.4, 0.5, 1] },
    simple: value.type === 'spring' && value.visualDuration !== undefined ? value : { type: 'spring', visualDuration: 0.3, bounce: 0.2 },
    advanced: value.type === 'spring' && value.stiffness !== undefined ? value : { type: 'spring', stiffness: 200, damping: 25, mass: 1 },
  };

  const spring = $derived<SpringConfig>(
    value.type === 'spring' ? value : cache.simple
  );

  const easing = $derived<EasingConfig>(
    value.type === 'easing' ? value : cache.easing
  );

  // Keep cache updated with current edits
  $effect(() => {
    if (isEasing && value.type === 'easing') {
      cache.easing = value;
    } else if (isSimpleSpring && value.type === 'spring') {
      cache.simple = value;
    } else if (mode === 'advanced' && value.type === 'spring') {
      cache.advanced = value;
    }
  });

  const handleModeChange = (nextMode: string) => {
    const typed = nextMode as CurveMode;
    DialStore.updateTransitionMode(panelId, path, typed);

    if (typed === 'easing') {
      onChange(cache.easing);
    } else if (typed === 'simple') {
      onChange(cache.simple);
    } else {
      onChange(cache.advanced);
    }
  };

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
</script>

{#snippet copyActions()}
  <TransitionCopy {mode} value={isEasing ? easing : spring} onPaste={handlePaste} />
{/snippet}

<Folder title={label} defaultOpen={true} {hint} {onReset} {changed} actions={copyActions}>
  <div style="display: flex; flex-direction: column; gap: 6px;">
    <div class="dialkit-labeled-control dialkit-transition-type" data-hint={HINTS.transitionType}>
      <span class="dialkit-labeled-control-label">Type</span>
      <SegmentedControl
        options={[
          { value: 'easing', label: 'Easing' },
          { value: 'simple', label: 'Time' },
          { value: 'advanced', label: 'Physics' },
        ]}
        value={mode}
        onChange={handleModeChange}
      />
    </div>

    {#if isEasing}
      <EasingVisualization {easing} onChange={(ease) => onChange({ ...easing, ease })} />
    {:else}
      <SpringVisualization spring={spring} isSimpleMode={isSimpleSpring} />
    {/if}

    {#if isEasing}
      <EaseFields ease={easing.ease} onChange={(ease) => onChange({ ...easing, ease })} />
      <Slider
        label="Intensity"
        value={intensity.read(easing.ease)}
        onChange={(v) => onChange({ ...easing, ease: intensity.apply(easing.ease, v) })}
        min={0}
        max={100}
        step={1}
        unit="%"
      />
    {:else if isSimpleSpring}
      <Slider
        label="Bounce"
        value={spring.bounce ?? 0.2}
        onChange={(v) => handleSpringUpdate('bounce', v)}
        min={0}
        max={1}
        step={0.05}
        hint={HINTS.bounce}
      />
    {:else}
      <Slider
        label="Stiffness"
        value={spring.stiffness ?? 400}
        onChange={(v) => handleSpringUpdate('stiffness', v)}
        min={1}
        max={1000}
        step={10}
        hint={HINTS.stiffness}
      />
      <Slider
        label="Damping"
        value={spring.damping ?? 17}
        onChange={(v) => handleSpringUpdate('damping', v)}
        min={1}
        max={100}
        step={1}
        hint={HINTS.damping}
      />
      <Slider
        label="Mass"
        value={spring.mass ?? 1}
        onChange={(v) => handleSpringUpdate('mass', v)}
        min={0.1}
        max={10}
        step={0.1}
        hint={HINTS.mass}
      />
    {/if}

    {#if !hideDuration && (isEasing || isSimpleSpring)}
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
    {/if}

    <Folder title="Presets" defaultOpen={false} meta={transitionPresetName(isEasing ? easing : spring, mode, savedPresets)}>
      <TransitionPresets {mode} value={isEasing ? easing : spring} {onChange} />
    </Folder>
  </div>
</Folder>
