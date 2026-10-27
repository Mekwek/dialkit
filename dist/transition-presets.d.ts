import { BezierPoints } from './easing-geometry.js';
import { T as TransitionConfig, a as TransitionMode, b as TransitionPreset } from './DialStore-CP5O0S4u.js';
import './dial-pad.js';
import './anchor.js';
import './background.js';

interface EasingCurve {
    name: string;
    /** How the curve moves, in a few words. */
    description: string;
    ease: BezierPoints;
}
interface SpringPreset {
    name: string;
    /** How the spring moves, in a few words. */
    description: string;
    /** Physics mode: stiffness, damping and mass. */
    physics: {
        stiffness: number;
        damping: number;
        mass: number;
    };
    /** Time mode: the duration and bounce that settle like the physics values. */
    time: {
        visualDuration: number;
        bounce: number;
    };
}
/**
 * Named curves first, then the classic families in the order most tools list
 * them. The classic Ease curves are After Effects' Easy Ease, and Sine to
 * Back are cubic-bézier approximations of Robert Penner's equations.
 */
declare const easingCurves: EasingCurve[];
/**
 * React Spring's named configs, with its default as Crisp, then more named
 * springs. All of them fit the Physics sliders: Molasses is 125 / 55 rather
 * than React Spring's 280 / 120, which settles in about the same 2.2s with
 * damping under the slider's 100. The Time values take the bounce from the
 * damping ratio and a duration that settles like the physics.
 */
declare const springPresets: SpringPreset[];
/** A named value a transition control can apply in one mode. */
interface TransitionPresetOption {
    name: string;
    /** A short description of how it moves; saved presets have none. */
    description?: string;
    value: TransitionConfig;
}
/** The hints of a transition's Presets folder and Intensity slider, shown while the hint key (H) is held. */
declare const TRANSITION_HINTS: {
    presets: string;
    intensity: string;
};
/** The built-in presets for a mode: curves for Easing, springs for Time and Physics. */
declare function defaultTransitionPresets(mode: TransitionMode): TransitionPresetOption[];
/**
 * Two values match in a mode when the parts that mode edits match: the
 * curve for Easing, duration and bounce for Time, the physics for Physics.
 */
declare function sameTransition(a: TransitionConfig, b: TransitionConfig, mode: TransitionMode): boolean;
/**
 * The name a transition's Presets folder shows: the matching built-in
 * preset, else the matching saved one, else Custom.
 */
declare function transitionPresetName(value: TransitionConfig, mode: TransitionMode, saved: TransitionPreset[]): string;
/**
 * The value a picked preset gives the control. A curve keeps the current
 * duration; a spring replaces the values of its mode.
 */
declare function applyTransitionPreset(current: TransitionConfig, preset: TransitionConfig, mode: TransitionMode): TransitionConfig;

export { type EasingCurve, type SpringPreset, TRANSITION_HINTS, type TransitionPresetOption, applyTransitionPreset, defaultTransitionPresets, easingCurves, sameTransition, springPresets, transitionPresetName };
