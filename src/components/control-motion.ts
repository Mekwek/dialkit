import type { Transition } from 'motion/react';

/**
 * Shared enter/exit animation preset for the wrapper that Panel.tsx
 * puts around every control so conditionally-visible controls animate
 * in and out smoothly when their visibleWhen rule flips.
 *
 * The wrapper's `height: auto` fits the child control's natural row
 * height (DialKit controls use CSS fixed heights like
 * `height: var(--dial-row-height)` on `.dialkit-slider-wrapper`).
 *
 * `marginBottom: -6` cancels the parent's 6px flex gap during exit so
 * scalar controls don't leave a 6px orphan of empty space while they
 * shrink. At rest it animates back to 0, restoring the normal gap.
 * The -6 value must match `.dialkit-folder-inner { gap: 6px }` in
 * theme.css — if the gap changes, update this value to match.
 *
 * `overflowY: clip` clips the child while the wrapper's height is less
 * than auto, giving the collapse-reveal effect. Unlike `hidden`, it makes
 * no scroll box, so a pinned folder header inside still sticks to the
 * panel's scroll. It is on only while the wrapper grows in or shrinks out,
 * and only vertically: at rest the wrapper clips nothing, as upstream DialKit
 * has no wrapper at all, so what a control draws past its own box (a
 * slider's rubber-band stretch past its end, a focus ring, an end swatch's
 * ring) shows whole, in every nesting depth.
 */
export const CONTROL_ANIM = {
  initial: { opacity: 0, height: 0, marginBottom: -6, overflowY: 'clip' as const },
  animate: { opacity: 1, height: 'auto' as const, marginBottom: 0, transitionEnd: { overflowY: 'visible' as const } },
  exit: { opacity: 0, height: 0, marginBottom: -6, overflowY: 'clip' as const },
  transition: {
    type: 'spring',
    visualDuration: 0.25,
    bounce: 0.1,
  } as Transition,
} as const;
