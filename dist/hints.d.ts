import { C as ControlMeta } from './DialStore-CDYWklsr.js';
import './dial-pad.js';
import './anchor.js';
import './background.js';

type Listener = () => void;
/** How HintStore's `show` and `hide` reach the mounted hint listeners. */
type HintDisplay = {
    show(element: HTMLElement, text: string): void;
    hide(element?: HTMLElement): void;
};
/** `y` is the hint's edge that faces its row: its bottom when above, its top when below. */
type HintPosition = {
    left: number;
    y: number;
    above: boolean;
};
type Box = {
    left: number;
    top: number;
    right?: number;
    bottom: number;
};
/**
 * The hints of DialKit's own parts. They show with no setup, like a
 * control's own hint.
 */
declare const HINTS: {
    readonly panel: "Closes the panel to a small button. Click the button to open it again.";
    /** A panel's header when its host closes the panel (`onClose`). */
    readonly panelClose: "Closes the panel.";
    readonly copy: "Copies the panel's values as text, ready to paste into code.";
    readonly sectionReset: "Sets every control in this section back to its default.";
    readonly saveVersion: "Saves the current values as a new version, with a picture of the page.";
    readonly version: "Switches to this version. Double-click its name to rename it.";
    readonly deleteVersion: "Deletes this version.";
    readonly allVersions: "Shows every version side by side. Click one to switch to it.";
    readonly transitionType: "Easing: a curve over a set duration. Time: a spring set by its duration and bounce. Physics: a spring set by its stiffness, damping and mass.";
    readonly easingDuration: "How long the curve takes, in seconds.";
    readonly springDuration: "How long the spring takes to settle, in seconds.";
    readonly bounce: "How far the motion overshoots and swings back. 0 has no bounce.";
    readonly stiffness: "How hard the spring pulls toward its target. Higher is faster.";
    readonly damping: "How fast the spring slows down. Lower swings more.";
    readonly mass: "How heavy the moving thing is. Higher is slower and swings more.";
    readonly colorPlane: "Drag to change how light and how strong the color is.";
    readonly colorHue: "Drag to change the hue.";
    readonly colorOpacity: "Drag to change how see-through the color is.";
    readonly imageUpload: "Adds an image from your computer.";
    readonly imageClear: "Removes the image.";
};
/** The version menu's hints, in the word its rows go by: versions, or a timeline's sequences. */
declare function versionHints(noun?: 'version' | 'sequence', { editable, lockable }?: {
    editable?: boolean | undefined;
    lockable?: boolean | undefined;
}): {
    versions: string;
    versionActions: string;
};
/** The hints of the timeline bar's parts, shown while the hint key (H) is held. */
declare const TIMELINE_HINTS: {
    play: string;
    replay: string;
    loop: string;
    toggle: string;
    ruler: string;
    playhead: string;
    copy: string;
    resize: string;
    overview: string;
    closeEditor: string;
};
/**
 * Whether this browser has seen a hint yet, shared by every panel. Until
 * then, every panel ends with a tip that points to the hint key.
 */
declare class HintStoreClass {
    private tipSeen;
    private key;
    private listeners;
    /** The mounted hint listeners' own show and hide, while they run. */
    private display;
    /** Keeps the listeners mounted while a host's hint shows. */
    private hostHint;
    /**
     * Shows `text` above `element` without the hint key, as a host does after
     * the pointer rests on an element for a moment (500ms in theca). The
     * element must sit inside a `.dialkit-root`. The hint stays until
     * `hide(element)`, a held key shows another, or the pointer leaves the
     * window.
     */
    show(text: string, element: HTMLElement): void;
    /** Hides the hint, if `element` is the one it shows for, or any hint without one. */
    hide(element?: HTMLElement): void;
    /** Called by the mounted listeners: how `show` and `hide` reach them. */
    attachDisplay(display: HintDisplay): () => void;
    /** The key held to show hints, H by default. */
    getKey(): string;
    /** Changes the key held to show hints, for a page that uses H itself. */
    setKey(key: string): void;
    /** True once a hint has shown in this browser, and on the server. */
    isTipSeen(): boolean;
    /** Called when the key is released after a hint: the tip has done its job. */
    markTipSeen(): void;
    subscribe(listener: Listener): () => void;
    private notify;
}
declare const HintStore: HintStoreClass;
/** Whether any action button in the tree has a hint: those are ControlRenderer's own rows. */
declare function hasActionHints(controls: ControlMeta[]): boolean;
/**
 * Whether a key press holds the hint key, H unless `HintStore.setKey` changed
 * it. Typing in a field, a press with a modifier, and a shortcut assigned to
 * the key all leave it alone.
 */
declare function isHintKey(event: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'target'>): boolean;
/**
 * Where a hint sits, relative to its root: above the row on its left edge,
 * below it when there is no room above, and inside the viewport. It is
 * placed by the edge that faces the row, so a sentence of another height
 * grows away from the row.
 */
declare function getHintPosition(row: Box, root: Pick<Box, 'left' | 'top'>, size: {
    width: number;
    height: number;
}, viewport: {
    width: number;
    height: number;
}): HintPosition;
/**
 * Hold H over a control with a hint to read it. The rest of its panel dims,
 * and the control is described by the hint while it shows. Every control
 * with a hint mounts this, and they share one set of listeners, so any
 * number of panels or controls, with or without a DialRoot, handle the key
 * once.
 */
declare function mountHints(): {
    destroy(): void;
};
/**
 * Gives a row its hint, and keeps the hints mounted while it has one, so a
 * control shows its hint even without a ControlRenderer. Pass no hint when
 * the row goes away.
 */
declare function setHint(row: HTMLElement, hint: string | undefined): void;

export { HINTS, type HintPosition, HintStore, TIMELINE_HINTS, getHintPosition, hasActionHints, isHintKey, mountHints, setHint, versionHints };
