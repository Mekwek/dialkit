import type { BezierPoints } from './easing-geometry';
import type { SpringConfig } from './store/DialStore';
import type { CopiedTransition } from './store/TransitionLibrary';

export interface EasingCurve {
  name: string;
  ease: BezierPoints;
}

/**
 * The default curves: named curves first (Arqé's, Movo's, then easing.dev's), then the
 * classic families in the order most tools list them. The classic values
 * are the defaults of Flow, the After Effects curve editor: its Ease curves
 * are After Effects' Easy Ease, and its Sine to Back curves are mostly the
 * easings.net values, with Back from Ceaser. Each curve appears once:
 * Arqé's Smooth is Quart In Out, and Movo's Bounce is close to Back Out.
 * easing.dev's Overshoot Out is Back Out.
 * Arqé's Ease and Ease Out are dropped as almost Expo In Out and Expo Out.
 * Arqé's Flow and Movo's Glide are dropped as almost Circ In Out, and
 * Movo's Linear as Linear.
 * Movo's Smooth is named Coast here.
 */
export const EASING_CURVES: EasingCurve[] = [
  // Named: Arqé
  { name: 'Glide', ease: [0.33, 0, 0, 1] },
  { name: 'Sweep', ease: [0.7, 0.101, 0.3, 0.899] },
  { name: 'Settle', ease: [0.8, 0.27, 0.2, 0.75] },
  { name: 'Flip', ease: [0.333, 0, 0.571, 1] },
  // Named: Movo
  { name: 'Natural', ease: [0.8, 0, 0.2, 1] },
  { name: 'Coast', ease: [0.4, 0, 0, 1] },
  { name: 'Elastic', ease: [0.6, -0.85, 0, 1.65] },
  { name: 'Slow', ease: [0, 0, 0, 1] },
  { name: 'Vive', ease: [1, 0, 1, 1] },
  // Named: easing.dev
  { name: 'Anticipate', ease: [1, -0.4, 0.35, 0.95] },
  { name: 'Snappy Out', ease: [0.19, 1, 0.22, 1] },
  { name: 'Swift Out', ease: [0.175, 0.885, 0.32, 1.1] },
  // Classic: Flow's defaults
  { name: 'Linear', ease: [0, 0, 1, 1] },
  { name: 'Ease In', ease: [0.33, 0, 1, 1] },
  { name: 'Ease Out', ease: [0, 0, 0.67, 1] },
  { name: 'Ease In Out', ease: [0.33, 0, 0.67, 1] },
  { name: 'Sine In', ease: [0.36, 0, 0.64, 0.48] },
  { name: 'Sine Out', ease: [0.33, 0.52, 0.64, 1] },
  { name: 'Sine In Out', ease: [0.36, 0, 0.63, 1] },
  { name: 'Quad In', ease: [0.26, 0, 0.6, 0.2] },
  { name: 'Quad Out', ease: [0.4, 0.8, 0.74, 1] },
  { name: 'Quad In Out', ease: [0.48, 0.04, 0.52, 0.96] },
  { name: 'Cubic In', ease: [0.4, 0, 0.68, 0.06] },
  { name: 'Cubic Out', ease: [0.32, 0.94, 0.6, 1] },
  { name: 'Cubic In Out', ease: [0.66, 0, 0.34, 1] },
  { name: 'Quart In', ease: [0.52, 0, 0.74, 0] },
  { name: 'Quart Out', ease: [0.26, 1, 0.48, 1] },
  { name: 'Quart In Out', ease: [0.76, 0, 0.24, 1] },
  { name: 'Quint In', ease: [0.64, 0, 0.78, 0] },
  { name: 'Quint Out', ease: [0.22, 1, 0.36, 1] },
  { name: 'Quint In Out', ease: [0.84, 0, 0.16, 1] },
  { name: 'Expo In', ease: [0.66, 0, 0.86, 0] },
  { name: 'Expo Out', ease: [0.14, 1, 0.34, 1] },
  { name: 'Expo In Out', ease: [0.9, 0, 0.1, 1] },
  { name: 'Circ In', ease: [0.54, 0, 1, 0.44] },
  { name: 'Circ Out', ease: [0, 0.56, 0.46, 1] },
  { name: 'Circ In Out', ease: [0.88, 0.14, 0.12, 0.86] },
  { name: 'Back In', ease: [0.6, -0.28, 0.73, 0.04] },
  { name: 'Back Out', ease: [0.17, 0.89, 0.32, 1.27] },
  { name: 'Back In Out', ease: [0.68, -0.55, 0.27, 1.55] },
];

export interface SpringPreset {
  name: string;
  /** Physics: React Spring's tension and friction, with mass 1. */
  physics: Required<Pick<SpringConfig, 'stiffness' | 'damping' | 'mass'>>;
  /** Time: bounce from the damping ratio, and the duration whose settle
   *  time matches the physics spring's (transition-math). */
  time: Required<Pick<SpringConfig, 'visualDuration' | 'bounce'>>;
}

/**
 * The default springs: Default first, then React Spring's named configs
 * (its default renamed Crisp), then easing.dev's. Default is 150 / 30 / 1,
 * Theca's own spring. easing.dev's Slow is named Drift here, next to React
 * Spring's Slow, and its Bouyant is spelled Buoyant.
 *
 * Theca runs springs step by step, at most 1/60s per step. A spring
 * cancels more than all of its speed in one step when damping over mass
 * passes 60, and from 120 the motion never settles. React Spring's
 * Molasses (damping 120) keeps its settle time (2.23s) with damping 55.
 * easing.dev's Boingoingoing is left out: at 1/60s its Physics version
 * overshoots 178% instead of 79%, and its Time version grows without end.
 * The Time versions of Swift and Snap are a little longer than their
 * Physics settle times, for the same reason. The Physics sliders also stop
 * damping at 100.
 */
export const SPRING_PRESETS: SpringPreset[] = [
  { name: 'Default', physics: { stiffness: 150, damping: 30, mass: 1 }, time: { visualDuration: 0.83, bounce: 0 } },
  // React Spring
  { name: 'Crisp', physics: { stiffness: 170, damping: 26, mass: 1 }, time: { visualDuration: 0.4, bounce: 0 } },
  { name: 'Gentle', physics: { stiffness: 120, damping: 14, mass: 1 }, time: { visualDuration: 0.5, bounce: 0.35 } },
  { name: 'Wobbly', physics: { stiffness: 180, damping: 12, mass: 1 }, time: { visualDuration: 0.4, bounce: 0.55 } },
  { name: 'Stiff', physics: { stiffness: 210, damping: 20, mass: 1 }, time: { visualDuration: 0.35, bounce: 0.3 } },
  { name: 'Slow', physics: { stiffness: 280, damping: 60, mass: 1 }, time: { visualDuration: 1.05, bounce: 0 } },
  { name: 'Molasses', physics: { stiffness: 125, damping: 55, mass: 1 }, time: { visualDuration: 2.2, bounce: 0 } },
  // easing.dev
  { name: 'Buoyant', physics: { stiffness: 900, damping: 80, mass: 10 }, time: { visualDuration: 0.52, bounce: 0.6 } },
  { name: 'Elegant', physics: { stiffness: 150, damping: 19, mass: 1.2 }, time: { visualDuration: 0.46, bounce: 0.3 } },
  { name: 'Bob', physics: { stiffness: 131.1, damping: 2.3, mass: 0.1 }, time: { visualDuration: 0.14, bounce: 0.7 } },
  { name: 'Fling', physics: { stiffness: 800, damping: 80, mass: 4 }, time: { visualDuration: 0.37, bounce: 0.3 } },
  { name: 'Swift', physics: { stiffness: 280, damping: 18, mass: 0.3 }, time: { visualDuration: 0.21, bounce: 0 } },
  { name: 'Float', physics: { stiffness: 290, damping: 15, mass: 2 }, time: { visualDuration: 0.42, bounce: 0.7 } },
  { name: 'Drift', physics: { stiffness: 26.7, damping: 4.1, mass: 0.2 }, time: { visualDuration: 0.46, bounce: 0.1 } },
  { name: 'Snap', physics: { stiffness: 320, damping: 20, mass: 0.4 }, time: { visualDuration: 0.19, bounce: 0.1 } },
  { name: 'Stern', physics: { stiffness: 550, damping: 30, mass: 1.2 }, time: { visualDuration: 0.25, bounce: 0.4 } },
];

const close = (a: number, b: number) => Math.abs(a - b) < 0.0051;

export function sameEase(a: BezierPoints, b: BezierPoints): boolean {
  return a.every((value, index) => close(value, b[index]));
}

/** The name of the curve in `curves` that matches `ease`, if any. */
export function curveNameFor(ease: BezierPoints, curves: readonly EasingCurve[]): string | undefined {
  return curves.find((curve) => sameEase(curve.ease, ease))?.name;
}

export type SpringMode = 'simple' | 'advanced';

/** A spring the user saved: a Time spring or a Physics spring. */
export interface CustomSpring {
  name: string;
  mode: SpringMode;
  spring: SpringConfig;
}

/** Equal springs in one mode: Time compares duration and bounce, Physics
 *  compares stiffness, damping and mass. */
export function sameSpring(a: SpringConfig, b: SpringConfig, mode: SpringMode): boolean {
  if (mode === 'simple') {
    return close(a.visualDuration ?? NaN, b.visualDuration ?? NaN) && close(a.bounce ?? NaN, b.bounce ?? NaN);
  }
  return close(a.stiffness ?? NaN, b.stiffness ?? NaN) && close(a.damping ?? NaN, b.damping ?? NaN) && close(a.mass ?? NaN, b.mass ?? NaN);
}

/** The spring preset's values in one mode. */
export function springPresetConfig(preset: SpringPreset, mode: SpringMode): SpringConfig {
  return mode === 'simple' ? { type: 'spring', ...preset.time } : { type: 'spring', ...preset.physics };
}

/** The name of the spring preset that matches `spring` in its mode, if any. */
export function springPresetNameFor(spring: SpringConfig, mode: SpringMode): string | undefined {
  return SPRING_PRESETS.find((preset) => sameSpring(spring, springPresetConfig(preset, mode), mode))?.name;
}

/** The name of the saved spring that matches `spring` in its mode, if any. */
export function customSpringNameFor(spring: SpringConfig, mode: SpringMode, springs: readonly CustomSpring[]): string | undefined {
  return springs.find((saved) => saved.mode === mode && sameSpring(spring, saved.spring, mode))?.name;
}

/**
 * Movo's Intensity: 50 is the curve itself, 0 is a straight line, 100
 * doubles how far the handles reach from it.
 */
export function intensityEase(base: BezierPoints, intensity: number): BezierPoints {
  const k = Math.max(0, Math.min(100, intensity)) / 50;
  const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
  // The curve box and the value fields hold Y between -1 and 2.
  const clampY = (value: number) => Math.max(-1, Math.min(2, value));
  const round = (value: number) => Number(value.toFixed(3));
  const [x1, y1, x2, y2] = base;
  return [round(clamp01(k * x1)), round(clampY(k * y1)), round(clamp01(1 + k * (x2 - 1))), round(clampY(1 + k * (y2 - 1)))];
}

/** A short ease-out: how long a picked curve takes to move to its shape. */
export const CURVE_MORPH_MS = 280;

const TAB_NAMES = { easing: 'Easing', simple: 'Time', advanced: 'Physics' };

/** "Physics · Wobbly": a copied transition's tab and preset name, or Custom. */
export function describeCopied({ value, mode }: CopiedTransition): string {
  const name =
    value.type === 'easing'
      ? curveNameFor(value.ease, EASING_CURVES)
      : springPresetNameFor(value, mode === 'advanced' ? 'advanced' : 'simple');
  return `${TAB_NAMES[mode]} · ${name ?? 'Custom'}`;
}
