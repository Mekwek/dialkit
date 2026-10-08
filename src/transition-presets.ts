import type { BezierPoints } from './easing-geometry';
import type { SpringConfig } from './store/DialStore';

export interface EasingCurve {
  name: string;
  ease: BezierPoints;
}

/**
 * The named default curves: Arqé's named curves first, then Movo's, then
 * the standard Quad, Cubic, Quart, Expo and Sine families. Duplicates are
 * merged: Movo's Linear draws the same line as Arqé's, Movo's Glide is
 * almost Arqé's Flow, and Expo In Out is the same curve as Snap. Movo's
 * Smooth is named Coast here, because Arqé's Smooth is another curve.
 */
export const EASING_CURVES: EasingCurve[] = [
  // Arqé
  { name: 'Flow', ease: [0.86, 0.14, 0.14, 0.86] },
  { name: 'Glide', ease: [0.33, 0, 0, 1] },
  { name: 'Linear', ease: [0.25, 0.25, 0.75, 0.75] },
  { name: 'Ease', ease: [0.87, 0, 0.13, 1] },
  { name: 'Sweep', ease: [0.7, 0.101, 0.3, 0.899] },
  { name: 'Smooth', ease: [0.76, 0, 0.24, 1] },
  { name: 'Settle', ease: [0.8, 0.27, 0.2, 0.75] },
  { name: 'Ease Out', ease: [0.16, 1, 0.3, 1] },
  { name: 'Snap', ease: [1, 0, 0, 1] },
  { name: 'Ease In', ease: [0.42, 0, 1, 1] },
  { name: 'Ease In Out', ease: [0.42, 0, 0.58, 1] },
  { name: 'Flip', ease: [0.333, 0, 0.571, 1] },
  // Movo
  { name: 'Natural', ease: [0.8, 0, 0.2, 1] },
  { name: 'Coast', ease: [0.4, 0, 0, 1] },
  { name: 'Bounce', ease: [0.34, 1.56, 0.64, 1] },
  { name: 'Elastic', ease: [0.6, -0.85, 0, 1.65] },
  { name: 'Slow', ease: [0, 0, 0, 1] },
  { name: 'Vive', ease: [1, 0, 1, 1] },
  // Standard families
  { name: 'Quad In', ease: [0.55, 0.085, 0.68, 0.53] },
  { name: 'Quad Out', ease: [0.25, 0.46, 0.45, 0.94] },
  { name: 'Quad In Out', ease: [0.45, 0.03, 0.55, 0.97] },
  { name: 'Cubic In', ease: [0.55, 0.055, 0.675, 0.19] },
  { name: 'Cubic Out', ease: [0.215, 0.61, 0.355, 1] },
  { name: 'Cubic In Out', ease: [0.645, 0.045, 0.355, 1] },
  { name: 'Quart In', ease: [0.895, 0.03, 0.685, 0.22] },
  { name: 'Quart Out', ease: [0.165, 0.84, 0.44, 1] },
  { name: 'Quart In Out', ease: [0.77, 0, 0.175, 1] },
  { name: 'Expo In', ease: [0.95, 0.05, 0.795, 0.035] },
  { name: 'Expo Out', ease: [0.19, 1, 0.22, 1] },
  { name: 'Sine In', ease: [0.47, 0, 0.745, 0.715] },
  { name: 'Sine Out', ease: [0.39, 0.575, 0.565, 1] },
  { name: 'Sine In Out', ease: [0.445, 0.05, 0.55, 0.95] },
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
 * React Spring's six named configs. Molasses keeps React Spring's settle
 * time (2.23s) with less damping than its 120: a step-by-step spring, like
 * Theca's at 1/60s, cancels more than all of its speed in one step when
 * damping over mass passes 60, and from 120 the motion never settles. The
 * Physics sliders also stop damping at 100.
 */
export const SPRING_PRESETS: SpringPreset[] = [
  { name: 'Default', physics: { stiffness: 170, damping: 26, mass: 1 }, time: { visualDuration: 0.4, bounce: 0 } },
  { name: 'Gentle', physics: { stiffness: 120, damping: 14, mass: 1 }, time: { visualDuration: 0.5, bounce: 0.35 } },
  { name: 'Wobbly', physics: { stiffness: 180, damping: 12, mass: 1 }, time: { visualDuration: 0.4, bounce: 0.55 } },
  { name: 'Stiff', physics: { stiffness: 210, damping: 20, mass: 1 }, time: { visualDuration: 0.35, bounce: 0.3 } },
  { name: 'Slow', physics: { stiffness: 280, damping: 60, mass: 1 }, time: { visualDuration: 1.05, bounce: 0 } },
  { name: 'Molasses', physics: { stiffness: 125, damping: 55, mass: 1 }, time: { visualDuration: 2.2, bounce: 0 } },
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
