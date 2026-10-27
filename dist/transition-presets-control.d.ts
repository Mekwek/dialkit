import { a as TransitionMode, T as TransitionConfig, c as CopiedTransition } from './DialStore-CP5O0S4u.js';
import './dial-pad.js';
import './anchor.js';
import './background.js';

interface TransitionPresetsProps {
    mode: TransitionMode;
    value: TransitionConfig;
    onChange: (value: TransitionConfig) => void;
}
interface TransitionCopyProps {
    mode: TransitionMode;
    value: TransitionConfig;
    /** Applies a pasted transition and its mode. */
    onPaste: (copied: CopiedTransition) => void;
}
/**
 * Defaults / Custom tabs over named curves (Easing) or springs (Time and
 * Physics). Custom lists the transitions saved with DialStore for the mode.
 */
declare function mountTransitionPresets(host: HTMLElement, initial: TransitionPresetsProps): {
    update(next: TransitionPresetsProps): void;
    destroy(): void;
};
/**
 * The dots in a transition's header. Hovering, focusing or clicking them
 * opens Copy and Paste to their left: the group widens and fades in while
 * the icons pop out, the one by the dots first, and closing reverses it.
 * One click copies this transition with its mode, or pastes the copied
 * one. Paste stays disabled until a transition has been copied.
 */
declare function mountTransitionCopy(host: HTMLElement, initial: TransitionCopyProps): {
    update(next: TransitionCopyProps): void;
    destroy(): void;
};

export { type TransitionCopyProps, type TransitionPresetsProps, mountTransitionCopy, mountTransitionPresets };
