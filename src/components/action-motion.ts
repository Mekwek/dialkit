/**
 * The motion of a row of actions that opens from a "⋯" button: the version
 * menu's rename, lock and delete, and a transition's copy and paste.
 */

/** How long the action group takes to open or close. */
export const GROUP_SPRING = { type: 'spring', visualDuration: 0.15, bounce: 0 } as const;

/**
 * The group widens while its icons pop out one after another, the one next
 * to the dots first; closing pops them in the other way.
 */
export const GROUP_MOTION = {
  hidden: { width: 0, opacity: 0, transition: { ...GROUP_SPRING, staggerChildren: 0.045, staggerDirection: 1 } },
  shown: { width: 'auto', opacity: 1, transition: { ...GROUP_SPRING, staggerChildren: 0.045, staggerDirection: -1 } },
};

/** The icons pop with a little bounce; the group's width does not, so its
    edge never wobbles. */
export const ICON_SPRING = { type: 'spring', visualDuration: 0.2, bounce: 0.35 } as const;

export const ICON_MOTION = {
  hidden: { scale: 0.6, x: 2, transition: ICON_SPRING },
  shown: { scale: 1, x: 0, transition: ICON_SPRING },
};
