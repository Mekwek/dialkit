import { easingPresets, type BezierPoints } from './easing-geometry';
import type { EasingConfig, SpringConfig, TransitionConfig, TransitionMode, TransitionPreset } from './store/DialStore';

export interface EasingCurve {
  name: string;
  /** How the curve moves, in a few words. */
  description: string;
  ease: BezierPoints;
}

export interface SpringPreset {
  name: string;
  /** How the spring moves, in a few words. */
  description: string;
  /** Physics mode: stiffness, damping and mass. */
  physics: { stiffness: number; damping: number; mass: number };
  /** Time mode: the duration and bounce that settle like the physics values. */
  time: { visualDuration: number; bounce: number };
}

/**
 * Named curves first, then the classic families in the order most tools list
 * them. The classic Ease curves are After Effects' Easy Ease, and Sine to
 * Back are cubic-bézier approximations of Robert Penner's equations.
 */
export const easingCurves: EasingCurve[] = [
  // Named
  { name: 'Glide', description: 'Starts gently and glides to a long, soft stop.', ease: [0.33, 0, 0, 1] },
  { name: 'Sweep', description: 'Slow at both ends, with a fast sweep through the middle.', ease: [0.7, 0.101, 0.3, 0.899] },
  { name: 'Settle', description: 'Starts and ends softly, with a quick middle.', ease: [0.8, 0.27, 0.2, 0.75] },
  { name: 'Flip', description: 'A light ease in and out that arrives a little early.', ease: [0.333, 0, 0.571, 1] },
  { name: 'Natural', description: 'Slow at both ends and fast in the middle.', ease: [0.8, 0, 0.2, 1] },
  { name: 'Coast', description: 'Starts softly, then slows over a long, gentle stop.', ease: [0.4, 0, 0, 1] },
  { name: 'Elastic', description: 'Pulls back, overshoots the target and comes back.', ease: [0.6, -0.85, 0, 1.65] },
  { name: 'Slow', description: 'Fast at first, then a long, slow stop.', ease: [0, 0, 0, 1] },
  { name: 'Vive', description: 'Starts very slowly and speeds up to a sudden stop.', ease: [1, 0, 1, 1] },
  { name: 'Anticipate', description: 'Pulls back a little, then moves to the target.', ease: [1, -0.4, 0.35, 0.95] },
  { name: 'Snappy Out', description: 'Jumps out fast and settles slowly into place.', ease: [0.19, 1, 0.22, 1] },
  { name: 'Swift Out', description: 'Starts fast and overshoots the target a little.', ease: [0.175, 0.885, 0.32, 1.1] },
  // Classic
  { name: 'Linear', description: 'The same speed from start to end.', ease: easingPresets.linear },
  { name: 'Ease In', description: 'Starts slowly and speeds up.', ease: [0.33, 0, 1, 1] },
  { name: 'Ease Out', description: 'Starts fast and slows down to the end.', ease: [0, 0, 0.67, 1] },
  { name: 'Ease In Out', description: 'Slow at both ends, faster in the middle.', ease: [0.33, 0, 0.67, 1] },
  { name: 'Sine In', description: 'A light ease in.', ease: [0.36, 0, 0.64, 0.48] },
  { name: 'Sine Out', description: 'A light ease out.', ease: [0.33, 0.52, 0.64, 1] },
  { name: 'Sine In Out', description: 'A light ease in and out.', ease: [0.36, 0, 0.63, 1] },
  { name: 'Quad In', description: 'A soft ease in.', ease: [0.26, 0, 0.6, 0.2] },
  { name: 'Quad Out', description: 'A soft ease out.', ease: [0.4, 0.8, 0.74, 1] },
  { name: 'Quad In Out', description: 'A soft ease in and out.', ease: [0.48, 0.04, 0.52, 0.96] },
  { name: 'Cubic In', description: 'A medium ease in.', ease: [0.4, 0, 0.68, 0.06] },
  { name: 'Cubic Out', description: 'A medium ease out.', ease: [0.32, 0.94, 0.6, 1] },
  { name: 'Cubic In Out', description: 'A medium ease in and out.', ease: [0.66, 0, 0.34, 1] },
  { name: 'Quart In', description: 'A strong ease in.', ease: [0.52, 0, 0.74, 0] },
  { name: 'Quart Out', description: 'A strong ease out.', ease: [0.26, 1, 0.48, 1] },
  { name: 'Quart In Out', description: 'A strong ease in and out.', ease: [0.76, 0, 0.24, 1] },
  { name: 'Quint In', description: 'A very strong ease in.', ease: [0.64, 0, 0.78, 0] },
  { name: 'Quint Out', description: 'A very strong ease out.', ease: [0.22, 1, 0.36, 1] },
  { name: 'Quint In Out', description: 'A very strong ease in and out.', ease: [0.84, 0, 0.16, 1] },
  { name: 'Expo In', description: 'Almost still at first, then very fast.', ease: [0.66, 0, 0.86, 0] },
  { name: 'Expo Out', description: 'Very fast at first, then almost still.', ease: [0.14, 1, 0.34, 1] },
  { name: 'Expo In Out', description: 'Almost still at both ends, very fast in the middle.', ease: [0.9, 0, 0.1, 1] },
  { name: 'Circ In', description: 'Starts slowly and speeds up sharply at the end.', ease: [0.54, 0, 1, 0.44] },
  { name: 'Circ Out', description: 'Starts very fast and stops softly.', ease: [0, 0.56, 0.46, 1] },
  { name: 'Circ In Out', description: 'Slow at both ends, with a sharp middle.', ease: [0.88, 0.14, 0.12, 0.86] },
  { name: 'Back In', description: 'Pulls back a little before it moves.', ease: [0.6, -0.28, 0.73, 0.04] },
  { name: 'Back Out', description: 'Overshoots a little, then settles back.', ease: [0.17, 0.89, 0.32, 1.27] },
  { name: 'Back In Out', description: 'Pulls back at the start and overshoots at the end.', ease: [0.68, -0.55, 0.27, 1.55] },
];

/**
 * React Spring's named configs, with its default as Crisp, then more named
 * springs. All of them fit the Physics sliders: Molasses is 125 / 55 rather
 * than React Spring's 280 / 120, which settles in about the same 2.2s with
 * damping under the slider's 100. The Time values take the bounce from the
 * damping ratio and a duration that settles like the physics.
 */
export const springPresets: SpringPreset[] = [
  // React Spring
  { name: 'Crisp', description: 'Quick and firm, no bounce.', physics: { stiffness: 170, damping: 26, mass: 1 }, time: { visualDuration: 0.4, bounce: 0 } },
  { name: 'Gentle', description: 'Soft, with a little bounce.', physics: { stiffness: 120, damping: 14, mass: 1 }, time: { visualDuration: 0.5, bounce: 0.35 } },
  { name: 'Wobbly', description: 'Quick, with a lot of bounce.', physics: { stiffness: 180, damping: 12, mass: 1 }, time: { visualDuration: 0.4, bounce: 0.55 } },
  { name: 'Stiff', description: 'Fast and tight, with a short bounce.', physics: { stiffness: 210, damping: 20, mass: 1 }, time: { visualDuration: 0.35, bounce: 0.3 } },
  { name: 'Slow', description: 'Slow and smooth, no bounce.', physics: { stiffness: 280, damping: 60, mass: 1 }, time: { visualDuration: 1.05, bounce: 0 } },
  { name: 'Molasses', description: 'The slowest: about two seconds, no bounce.', physics: { stiffness: 125, damping: 55, mass: 1 }, time: { visualDuration: 2.2, bounce: 0 } },
  // More named springs
  { name: 'Buoyant', description: 'Heavy, with a large bounce.', physics: { stiffness: 900, damping: 80, mass: 10 }, time: { visualDuration: 0.52, bounce: 0.6 } },
  { name: 'Elegant', description: 'Smooth, with a small, soft bounce.', physics: { stiffness: 150, damping: 19, mass: 1.2 }, time: { visualDuration: 0.46, bounce: 0.3 } },
  { name: 'Bob', description: 'Very short and light, with a quick bounce.', physics: { stiffness: 131.1, damping: 2.3, mass: 0.1 }, time: { visualDuration: 0.14, bounce: 0.7 } },
  { name: 'Fling', description: 'Fast and heavy, with a small bounce.', physics: { stiffness: 800, damping: 80, mass: 4 }, time: { visualDuration: 0.37, bounce: 0.3 } },
  { name: 'Swift', description: 'Very fast, no bounce.', physics: { stiffness: 280, damping: 18, mass: 0.3 }, time: { visualDuration: 0.21, bounce: 0 } },
  { name: 'Float', description: 'Light, with a large bounce.', physics: { stiffness: 290, damping: 15, mass: 2 }, time: { visualDuration: 0.42, bounce: 0.7 } },
  { name: 'Drift', description: 'Loose and slow to settle, with almost no bounce.', physics: { stiffness: 26.7, damping: 4.1, mass: 0.2 }, time: { visualDuration: 0.46, bounce: 0.1 } },
  { name: 'Snap', description: 'Very fast, with a tiny bounce.', physics: { stiffness: 320, damping: 20, mass: 0.4 }, time: { visualDuration: 0.19, bounce: 0.1 } },
  { name: 'Stern', description: 'Fast and firm, with a clear bounce.', physics: { stiffness: 550, damping: 30, mass: 1.2 }, time: { visualDuration: 0.25, bounce: 0.4 } },
];

/** A named value a transition control can apply in one mode. */
export interface TransitionPresetOption {
  name: string;
  /** A short description of how it moves; saved presets have none. */
  description?: string;
  value: TransitionConfig;
}

/** The built-in presets for a mode: curves for Easing, springs for Time and Physics. */
export function defaultTransitionPresets(mode: TransitionMode): TransitionPresetOption[] {
  if (mode === 'easing') {
    return easingCurves.map(({ name, description, ease }) => ({ name, description, value: { type: 'easing', duration: 0.3, ease } }));
  }
  return springPresets.map(({ name, description, physics, time }) => ({
    name,
    description,
    value: { type: 'spring', ...(mode === 'simple' ? time : physics) },
  }));
}

const close = (a: number | undefined, b: number | undefined) =>
  a !== undefined && b !== undefined && Math.abs(a - b) < 0.005;

/**
 * Two values match in a mode when the parts that mode edits match: the
 * curve for Easing, duration and bounce for Time, the physics for Physics.
 */
export function sameTransition(a: TransitionConfig, b: TransitionConfig, mode: TransitionMode): boolean {
  if (mode === 'easing') {
    return a.type === 'easing' && b.type === 'easing' && a.ease.every((part, index) => close(part, b.ease[index]));
  }
  if (a.type !== 'spring' || b.type !== 'spring') return false;
  const keys: (keyof SpringConfig)[] = mode === 'simple' ? ['visualDuration', 'bounce'] : ['stiffness', 'damping', 'mass'];
  return keys.every(key => close(a[key] as number | undefined, b[key] as number | undefined));
}

/**
 * The name a transition's Presets folder shows: the matching built-in
 * preset, else the matching saved one, else Custom.
 */
export function transitionPresetName(value: TransitionConfig, mode: TransitionMode, saved: TransitionPreset[]): string {
  const matches = (preset: { value: TransitionConfig }) => sameTransition(preset.value, value, mode);
  return defaultTransitionPresets(mode).find(matches)?.name
    ?? saved.find(preset => preset.mode === mode && matches(preset))?.name
    ?? 'Custom';
}

/**
 * The value a picked preset gives the control. A curve keeps the current
 * duration; a spring replaces the values of its mode.
 */
export function applyTransitionPreset(current: TransitionConfig, preset: TransitionConfig, mode: TransitionMode): TransitionConfig {
  if (mode === 'easing') {
    const duration = current.type === 'easing' ? current.duration : 0.3;
    return { type: 'easing', duration, ease: [...(preset as EasingConfig).ease] };
  }
  const spring = preset as SpringConfig;
  return mode === 'simple'
    ? { type: 'spring', visualDuration: spring.visualDuration, bounce: spring.bounce }
    : { type: 'spring', stiffness: spring.stiffness, damping: spring.damping, mass: spring.mass };
}
