declare const ICON_CHEVRON = "M6 9.5L12 15.5L18 9.5";
declare const ICON_CLOSE = "M6 6L18 18M18 6L6 18";
declare const ICON_CHECK = "M5 12.75L10 19L19 5";
declare const ICON_PAUSE: string[];
declare const ICON_PLAY = "M9.24394 2.36758C7.41419 1.18362 5 2.49701 5 4.67639V19.3238C5 21.5032 7.41419 22.8166 9.24394 21.6326L20.5624 14.3089C22.2371 13.2253 22.2372 10.775 20.5624 9.69129L9.24394 2.36758Z";
declare const ICON_REPLAY: string[];
declare const ICON_LOOP: string[];
declare const ICON_TIMELINE: string[];
declare const ICON_CLIPBOARD: {
    board: string;
    sparkle: string;
    body: string;
};
declare const ICON_PLUS: string[];
declare const ICON_ADD_PRESET: string[];
declare const ICON_PENCIL: string[];
declare const ICON_TRASH: string[];
declare const ICON_LOCK: string[];
declare const ICON_LOCK_OPEN: string[];
declare const ICON_PANEL: {
    path: string;
    circles: {
        cx: string;
        cy: string;
        r: string;
    }[];
};
/** Stroke icons, 24 × 24: put a group back to its defaults. */
declare const ICON_RESET: string[];
/** Stroke icons, 24 × 24: a chain that locks values together. */
declare const ICON_LINK: string[];
declare const ICON_MORE: string[];
/**
 * The stroke the "···" dots are drawn with: the Ease section's copy menu, the
 * version menu's row dots and the gradient row's Column grip (turned upright)
 * all draw ICON_MORE with it, in its 24-unit box shown 14px tall.
 */
declare const ICON_MORE_STROKE = 3;
/** An open eye: shown. */
declare const ICON_EYE: string[];
/** An eye crossed out: hidden. */
declare const ICON_EYE_OFF: string[];
/** Two overlapping sheets: copy. */
declare const ICON_COPY: string[];
/** A clipboard with an arrow in: paste. */
declare const ICON_PASTE: string[];

export { ICON_ADD_PRESET, ICON_CHECK, ICON_CHEVRON, ICON_CLIPBOARD, ICON_CLOSE, ICON_COPY, ICON_EYE, ICON_EYE_OFF, ICON_LINK, ICON_LOCK, ICON_LOCK_OPEN, ICON_LOOP, ICON_MORE, ICON_MORE_STROKE, ICON_PANEL, ICON_PASTE, ICON_PAUSE, ICON_PENCIL, ICON_PLAY, ICON_PLUS, ICON_REPLAY, ICON_RESET, ICON_TIMELINE, ICON_TRASH };
