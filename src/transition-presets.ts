import { easingPresets, type BezierPoints } from './easing-geometry';
import type { EasingConfig, SpringConfig, TransitionConfig, TransitionMode } from './store/DialStore';

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
 * The CSS keywords, then the common fits of Robert Penner's easing equations
 * (the values shared by Ceaser, easings.net and most motion tools).
 */
export const easingCurves: EasingCurve[] = [
  { name: 'Linear', description: 'The same speed from start to end.', ease: easingPresets.linear },
  { name: 'Ease', description: 'A quick start and a gentle stop. The CSS default.', ease: easingPresets.ease },
  { name: 'Ease In', description: 'Starts slowly and speeds up.', ease: easingPresets.easeIn },
  { name: 'Ease Out', description: 'Starts fast and slows down.', ease: easingPresets.easeOut },
  { name: 'Ease In Out', description: 'Slow at both ends, faster in the middle.', ease: easingPresets.easeInOut },
  { name: 'Sine In', description: 'A light ease in.', ease: [0.47, 0, 0.745, 0.715] },
  { name: 'Sine Out', description: 'A light ease out.', ease: [0.39, 0.575, 0.565, 1] },
  { name: 'Sine In Out', description: 'A light ease in and out.', ease: [0.445, 0.05, 0.55, 0.95] },
  { name: 'Quad In', description: 'A soft ease in.', ease: [0.55, 0.085, 0.68, 0.53] },
  { name: 'Quad Out', description: 'A soft ease out.', ease: [0.25, 0.46, 0.45, 0.94] },
  { name: 'Quad In Out', description: 'A soft ease in and out.', ease: [0.455, 0.03, 0.515, 0.955] },
  { name: 'Cubic In', description: 'A medium ease in.', ease: [0.55, 0.055, 0.675, 0.19] },
  { name: 'Cubic Out', description: 'A medium ease out.', ease: [0.215, 0.61, 0.355, 1] },
  { name: 'Cubic In Out', description: 'A medium ease in and out.', ease: [0.645, 0.045, 0.355, 1] },
  { name: 'Quart In', description: 'A strong ease in.', ease: [0.895, 0.03, 0.685, 0.22] },
  { name: 'Quart Out', description: 'A strong ease out.', ease: [0.165, 0.84, 0.44, 1] },
  { name: 'Quart In Out', description: 'A strong ease in and out.', ease: [0.77, 0, 0.175, 1] },
  { name: 'Quint In', description: 'A very strong ease in.', ease: [0.755, 0.05, 0.855, 0.06] },
  { name: 'Quint Out', description: 'A very strong ease out.', ease: [0.23, 1, 0.32, 1] },
  { name: 'Quint In Out', description: 'A very strong ease in and out.', ease: [0.86, 0, 0.07, 1] },
  { name: 'Expo In', description: 'Almost still at first, then very fast.', ease: [0.95, 0.05, 0.795, 0.035] },
  { name: 'Expo Out', description: 'Very fast at first, then almost still.', ease: [0.19, 1, 0.22, 1] },
  { name: 'Expo In Out', description: 'Almost still at both ends, very fast in the middle.', ease: [1, 0, 0, 1] },
  { name: 'Circ In', description: 'Starts slowly and speeds up sharply at the end.', ease: [0.6, 0.04, 0.98, 0.335] },
  { name: 'Circ Out', description: 'Starts sharply and stops softly.', ease: [0.075, 0.82, 0.165, 1] },
  { name: 'Circ In Out', description: 'Slow at both ends, with a sharp middle.', ease: [0.785, 0.135, 0.15, 0.86] },
  { name: 'Back In', description: 'Pulls back a little before it moves.', ease: [0.6, -0.28, 0.735, 0.045] },
  { name: 'Back Out', description: 'Overshoots a little, then settles back.', ease: [0.175, 0.885, 0.32, 1.275] },
  { name: 'Back In Out', description: 'Pulls back at the start and overshoots at the end.', ease: [0.68, -0.55, 0.265, 1.55] },
];

/**
 * React Spring's named configs, which fit both the Physics and Time sliders.
 * The Time values settle like the physics ones, rounded to the Time sliders' steps.
 */
export const springPresets: SpringPreset[] = [
  { name: 'Default', description: 'Quick and firm, no bounce.', physics: { stiffness: 170, damping: 26, mass: 1 }, time: { visualDuration: 0.4, bounce: 0 } },
  { name: 'Gentle', description: 'Soft, with a little bounce.', physics: { stiffness: 120, damping: 14, mass: 1 }, time: { visualDuration: 0.5, bounce: 0.35 } },
  { name: 'Wobbly', description: 'Quick, with a lot of bounce.', physics: { stiffness: 180, damping: 12, mass: 1 }, time: { visualDuration: 0.4, bounce: 0.55 } },
  { name: 'Stiff', description: 'Fast and tight, with a short bounce.', physics: { stiffness: 210, damping: 20, mass: 1 }, time: { visualDuration: 0.35, bounce: 0.3 } },
];

/** A named value a transition control can apply in one mode. */
export interface TransitionPresetOption {
  name: string;
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
