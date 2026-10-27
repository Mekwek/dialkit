/** The same [default, min, max, step?] notation used by sliders. */
type DialPadAxis = [number, number, number, number?];
type DialPadValue = {
    x: number;
    y: number;
};
type DialPadConfig = {
    type: 'pad';
    /** Defaults to [0, -1, 1, 0.01]. */
    x?: DialPadAxis;
    /** Positive Y points upward. Defaults to [0, -1, 1, 0.01]. */
    y?: DialPadAxis;
    labels?: {
        x?: string;
        y?: string;
    };
    /** Hides the label box; the fields fill the row, and the label still names the pad. */
    hideLabel?: boolean;
    /** Drag an axis label left or right to change its value. */
    dragLabels?: boolean;
};

type AnchorValue = {
    x: 'left' | 'center' | 'right';
    y: 'top' | 'center' | 'bottom';
};
type AnchorConfig = {
    type: 'anchor';
    /** Omitted axes default to 'center'. */
    default?: Partial<AnchorValue>;
};

type BackgroundMode = 'solid' | 'gradient' | 'media';
type GradientShape = 'linear' | 'radial' | 'angular' | 'diamond';
type GradientStop = {
    /** Position along the gradient, 0–100. */
    at: number;
    /** Any CSS color the color control accepts, opacity included. */
    color: string;
};
/** A point as a fraction of the box: x 0 is the left edge, y 0 the top edge. */
type GradientPoint = {
    x: number;
    y: number;
};
/**
 * A linear gradient runs from `start` to `end`. The other shapes are centred
 * on `start`; `end` sets the main radius and its direction, and `width` the
 * radius across it.
 */
type GradientHandles = {
    start: GradientPoint;
    end: GradientPoint;
    width: GradientPoint;
};
type BackgroundGradient = {
    shape: GradientShape;
    handles: GradientHandles;
    /** 2–8 stops, sorted by position. */
    stops: GradientStop[];
};
type BackgroundMedia = {
    /** Any URL the browser can show, including data URLs. */
    src: string;
    kind: 'image' | 'video';
};
type BackgroundMediaFit = 'fill' | 'fit' | 'stretch' | 'tile';
type BackgroundMediaRatio = '16:9' | '4:3' | '1:1' | '4:5' | '3:4' | '9:16' | 'source';
type BackgroundMediaDisplay = {
    /** Fill covers the box, Fit shows all of the media, Stretch ignores its shape, Tile repeats it. */
    fit: BackgroundMediaFit;
    /** The shape the media is cropped to; 'source' keeps its own. */
    ratio: BackgroundMediaRatio;
    /** 1–3. */
    zoom: number;
    /** One tile's height as a share of the box's height, 0.05–1. */
    tileSize: number;
    /** The part of the media that stays in view when it is cropped. */
    position: {
        x: 'left' | 'center' | 'right';
        y: 'top' | 'center' | 'bottom';
    };
};
type BackgroundValue = {
    mode: BackgroundMode;
    color: string;
    gradient: BackgroundGradient;
    media: BackgroundMedia | null;
    /** Kept when the media is replaced or removed. */
    mediaDisplay: BackgroundMediaDisplay;
};
/** A value with any field left out; missing fields keep their current value or the default. */
type BackgroundValueUpdate = {
    mode?: BackgroundMode;
    color?: string;
    gradient?: Partial<BackgroundGradient>;
    media?: BackgroundMedia | null;
    mediaDisplay?: Partial<BackgroundMediaDisplay>;
};
type BackgroundConfig = {
    type: 'background';
    default?: BackgroundValueUpdate;
    /** Stores a dropped or picked file and returns its URL. Without it, files up to 10 MB are read as data URLs. */
    upload?: (file: File) => Promise<string>;
};

type SpringConfig = {
    type: 'spring';
    stiffness?: number;
    damping?: number;
    mass?: number;
    visualDuration?: number;
    bounce?: number;
};
type EasingConfig = {
    type: 'easing';
    duration: number;
    ease: [number, number, number, number];
};
type TransitionConfig = SpringConfig | EasingConfig;
type ActionConfig = {
    type: 'action';
    label?: string;
};
/** `icon` is SVG path data in a 24 × 24 box. Segmented controls show it in place of the label. */
type SelectOption = string | {
    value: string;
    label: string;
    icon?: string | string[];
};
type SelectConfig = {
    type: 'select';
    options: SelectOption[];
    default?: string;
    /** `'segmented'` shows every option in one row instead of a dropdown. */
    display?: 'dropdown' | 'segmented';
    /** Segmented only: the options fill the row, and the label becomes the group's accessible name. */
    hideLabel?: boolean;
};
type ColorConfig = {
    type: 'color';
    default?: string;
};
type ImageOption = string | {
    value: string;
    label: string;
};
type ImageConfig = {
    type: 'image';
    /** Image URLs, optionally paired with display labels. */
    options?: ImageOption[];
    /** Defaults to the first option, or an empty string for upload-only controls. */
    default?: string;
};
type TextConfig = {
    type: 'text';
    default?: string;
    placeholder?: string;
};
type DialValue = number | boolean | string | SpringConfig | EasingConfig | ActionConfig | SelectConfig | ColorConfig | ImageConfig | TextConfig | DialPadConfig | DialPadValue | BackgroundConfig | BackgroundValue | AnchorConfig | AnchorValue;
type DialConfig = {
    [key: string]: DialValue | [number, number, number, number?, string?] | DialConfig | ControlWithVisibility;
};
type VisibleWhenValue = string | number | boolean;
/** Shows a control only while another control in the same panel has (`is`) or lacks (`not`) one of the given values. */
type VisibleWhen = {
    /** Path of the watched control, dot-separated inside folders (`'style.outline'`). */
    field: string;
} & ({
    is: VisibleWhenValue | VisibleWhenValue[];
    not?: never;
} | {
    not: VisibleWhenValue | VisibleWhenValue[];
    is?: never;
});
type ControlWithVisibility<T = DialValue | [number, number, number, number?, string?] | DialConfig> = {
    value: T;
    visibleWhen: VisibleWhen;
};
type ResolvedValues<T extends DialConfig> = {
    [K in keyof T as K extends '_collapsed' | '_fields' | '_reset' | '_hints' ? never : K]: T[K] extends ControlWithVisibility<infer U extends DialConfig[string]> ? ResolvedValues<{
        value: U;
    }>['value'] : T[K] extends [number, number, number, number?, string?] ? number : T[K] extends SpringConfig ? TransitionConfig : T[K] extends EasingConfig ? TransitionConfig : T[K] extends SelectConfig ? string : T[K] extends ColorConfig | ImageConfig ? string : T[K] extends TextConfig ? string : T[K] extends DialPadConfig ? DialPadValue : T[K] extends BackgroundConfig ? BackgroundValue : T[K] extends AnchorConfig ? AnchorValue : T[K] extends DialConfig ? ResolvedValues<T[K]> : T[K];
};
type DialKitPersistOptions = boolean | {
    key?: string;
    storage?: 'localStorage' | 'sessionStorage';
    presets?: boolean;
};

type TimelineClipTrackMeta = {
    prop: string;
    /** Step folder keys when the track is a sequence. */
    stepKeys?: string[];
};
type TimelineClipMeta = {
    key: string;
    label: string;
    color: string;
    /** Code-defined playback behavior; intentionally not exposed as a dial. */
    loop: 'off' | 'repeat';
    /** Group key when the clip lives inside a nested layer, e.g. "circle". */
    group?: string;
    /** Step folder keys for sequence clips, e.g. ["step1", "step2"]. */
    stepKeys?: string[];
    /** Independent property tracks of a props clip — full rows when expanded. */
    tracks?: TimelineClipTrackMeta[];
};
type TimelineMeta = {
    id: string;
    name: string;
    duration: number;
    loop: boolean;
    /** Loop wraps back to this time, not 0 — clips before it play once
     * (intro-then-idle). 0 loops the whole timeline. */
    loopStart: number;
    /** `rows` (the default) gives each clip a row; `single` lines every
     * clip up on one track, one after another. */
    track?: 'rows' | 'single';
    clips: TimelineClipMeta[];
};
type TimelineTransport = {
    time: number;
    playing: boolean;
    duration: number;
    /** Completed loop passes — keeps looping clips phase-continuous across
     * timeline wraps. Reset by seek/replay so scrubbing stays deterministic. */
    wraps: number;
};
type Listener$1 = () => void;
/** Length of the repeating span — the whole timeline unless a loop region
 * narrows it. Degenerate regions (start ≥ duration) fall back to the whole
 * timeline so a bad `from` never stalls the clock. */
declare function loopSpan(duration: number, loopStart: number): number;
/** Folds an over-run playhead back into the loop region, reporting how many
 * spans were crossed so continuous time (wraps × span + time) never jumps. */
declare function foldLoopTime(time: number, duration: number, loopStart?: number): {
    time: number;
    wraps: number;
};
declare const TIMELINE_CLIP_COLORS: string[];
declare class TimelineStoreClass {
    private timelines;
    private transports;
    private listeners;
    private globalListeners;
    private registrationCounts;
    private listCache;
    /** Loop toggled in the dock, kept across updates until the authored
     * option turns looping on or off. */
    private loopToggles;
    private rafId;
    private lastTick;
    register(meta: TimelineMeta, options: {
        autoplay: boolean;
    }): void;
    update(meta: TimelineMeta): void;
    unregister(id: string): void;
    play(id: string): void;
    pause(id: string): void;
    replay(id: string): void;
    /** Turns looping on or off. A `{ from }` loop keeps its start, so turning
     * it back on wraps to the same time. */
    setLoop(id: string, loop: boolean): void;
    seek(id: string, time: number): void;
    getTransport(id: string): TimelineTransport;
    getTimeline(id: string): TimelineMeta | undefined;
    getTimelines(): TimelineMeta[];
    subscribe(id: string, listener: Listener$1): () => void;
    subscribeGlobal(listener: Listener$1): () => void;
    private applyMeta;
    private ensureLoop;
    private tick;
    private notify;
    private notifyGlobal;
}
declare const TimelineStore: TimelineStoreClass;

type SpringParams = {
    stiffness: number;
    damping: number;
    mass: number;
};
declare function clamp(value: number, min: number, max: number): number;

type TimelineClipLoop = 'off' | 'repeat';
type TimelineStepValues = {
    [key: string]: DialConfig[string] | undefined;
};
type TimelineStepConfig = {
    duration?: number;
    to?: TimelineStepValues;
    transition?: TransitionConfig;
};
type TimelinePropStepConfig = {
    duration?: number;
    to?: number | string;
    transition?: TransitionConfig;
};
type TimelinePropConfig = {
    from?: number | string;
    to?: number | string;
    duration?: number;
    /** Offset from the clip's `at` in seconds. */
    delay?: number;
    transition?: TransitionConfig;
    steps?: TimelinePropStepConfig[];
};
type TimelineClipBase = {
    at: number;
    duration?: number;
    transition?: TransitionConfig;
    loop?: boolean | TimelineClipLoop;
    /** The name shown in the dock. Defaults to the config key, formatted. */
    label?: string;
};
type TimelineClipConfig = TimelineClipBase & ({
    from?: DialConfig;
    to?: DialConfig;
    steps?: never;
    props?: never;
} | {
    from?: DialConfig;
    to?: never;
    /** Sequential legs on one row — a segmented bar; boundaries retime legs. */
    steps: TimelineStepConfig[];
    props?: never;
} | {
    from?: never;
    to?: never;
    steps?: never;
    /** Independent per-property tracks — mutually exclusive with from/to/steps. */
    props: {
        [prop: string]: TimelinePropConfig;
    };
});
/** Nested keys group clips into a collapsible layer — purely presentational. */
type TimelineGroupConfig = {
    [key: string]: TimelineClipConfig;
};
type TimelineConfig = {
    /** Total timeline length in seconds. Inferred from the last clip when omitted. */
    duration?: number;
} & {
    [key: string]: TimelineClipConfig | TimelineGroupConfig | number | undefined;
};
/** CSS-friendly output for consumers not using Motion — spread into a style. */
type TimelineClipCss = {
    transitionDuration: string;
    transitionTimingFunction: string;
};
type TimelineClipValues<C extends TimelineClipConfig = TimelineClipConfig> = {
    at: number;
    duration: number;
    /** Effective code-defined loop mode. */
    loop: TimelineClipLoop;
    /** Playhead is at or past the clip start. */
    started: boolean;
    /** Playhead is inside the clip — for looping clips, inside any cycle. */
    active: boolean;
    /** Playhead is past the clip end (for looping clips, past the timeline end). */
    done: boolean;
    /**
     * 0–1 position of the playhead within the clip — cycle progress (a
     * sawtooth) for looping clips, sequence progress for steps clips.
     */
    progress: number;
    /** Index of the leg under the playhead, for sequence clips. */
    step: C['steps'] extends TimelineStepConfig[] ? number : undefined;
    from: C['props'] extends Record<string, TimelinePropConfig> ? {
        [K in keyof C['props']]: number | string;
    } : C['from'] extends DialConfig ? ResolvedValues<C['from']> : undefined;
    to: C['props'] extends Record<string, TimelinePropConfig> ? {
        [K in keyof C['props']]: number | string;
    } : C['steps'] extends TimelineStepConfig[] ? C['from'] extends DialConfig ? ResolvedValues<C['from']> : Record<string, number | string> : C['to'] extends DialConfig ? ResolvedValues<C['to']> : undefined;
    /** `to` once the clip has started, `from` before — hand it to Motion's animate.
     * For sequences this is the final merged state; for props clips, per-track
     * endpoint records. */
    animate: C['props'] extends Record<string, TimelinePropConfig> ? {
        [K in keyof C['props']]: number | string;
    } : C['steps'] extends TimelineStepConfig[] ? C['from'] extends DialConfig ? ResolvedValues<C['from']> : Record<string, number | string> | undefined : C['to'] extends DialConfig ? C['from'] extends DialConfig ? ResolvedValues<C['from']> | ResolvedValues<C['to']> : ResolvedValues<C['to']> | undefined : undefined;
    /** The clip's editable curve — single-curve clips only. */
    transition: C['props'] extends Record<string, TimelinePropConfig> ? undefined : C['steps'] extends TimelineStepConfig[] ? undefined : C extends {
        transition: TransitionConfig;
    } | {
        from: DialConfig;
    } | {
        to: DialConfig;
    } ? TransitionConfig : undefined;
    /** Duration + timing-function for native CSS transitions — single-curve clips only. */
    css: C['props'] extends Record<string, TimelinePropConfig> ? undefined : C['steps'] extends TimelineStepConfig[] ? undefined : C extends {
        transition: TransitionConfig;
    } | {
        from: DialConfig;
    } | {
        to: DialConfig;
    } ? TimelineClipCss : undefined;
    /**
     * Values interpolated through the clip's curves at the current playhead —
     * bind to style for true scrubbing: the element is exactly at this point
     * in time whether playing, paused, or scrubbing. Sequence clips report the
     * merged state of all legs (declare every animated property in `from`);
     * props clips report every track's value.
     */
    current: C['props'] extends Record<string, TimelinePropConfig> ? {
        [K in keyof C['props']]: number | string;
    } : C['steps'] extends TimelineStepConfig[] ? C['from'] extends DialConfig ? ResolvedValues<C['from']> : Record<string, number | string> : C['to'] extends DialConfig ? C['from'] extends DialConfig ? ResolvedValues<C['from']> | ResolvedValues<C['to']> : undefined : undefined;
};
type TimelineGroupValues<G extends TimelineGroupConfig> = {
    [K in keyof G as G[K] extends TimelineClipConfig ? K : never]: TimelineClipValues<Extract<G[K], TimelineClipConfig>>;
};
type DialTimelineValues<T extends TimelineConfig> = {
    time: number;
    playing: boolean;
    duration: number;
    play: () => void;
    pause: () => void;
    replay: () => void;
    seek: (time: number) => void;
} & {
    [K in keyof T as T[K] extends TimelineClipConfig ? K : never]: TimelineClipValues<Extract<T[K], TimelineClipConfig>>;
} & {
    [K in keyof T as T[K] extends TimelineClipConfig ? never : T[K] extends TimelineGroupConfig ? K : never]: TimelineGroupValues<Extract<T[K], TimelineGroupConfig>>;
};
declare const TIMELINE_MIN_CLIP_DURATION = 0.05;
type ParsedTimeline = {
    duration: number;
    dialConfig: DialConfig;
    clips: TimelineClipMeta[];
};
declare function parseTimelineConfig(config: TimelineConfig): ParsedTimeline;
type CurveStatic = {
    duration: number;
    spring?: SpringParams;
    settle?: number;
    ease?: [number, number, number, number];
};
type TimelineStepStatic = {
    key: string | null;
    offset: number;
    duration: number;
    isPhysics: boolean;
    /** Full property state at step start — the hold rule made concrete. */
    start: Record<string, unknown>;
    /** Targets this step animates; untouched properties hold `start`. */
    to: Record<string, unknown>;
    curve: CurveStatic;
};
/**
 * One track: a step chain with its own cycle length and phase offset from
 * the clip's `at`. This is the unified runtime model — a shared-timing clip
 * is exactly one track (prop unset, delay 0) whose steps carry the full
 * property record; a props clip is one single-property track per entry.
 */
type TimelineTrackStatic = {
    /** Set for a props clip's single-property tracks; unset for the shared track. */
    prop?: string;
    delay: number;
    duration: number;
    steps: TimelineStepStatic[];
};
type TimelineClipStatic = {
    key: string;
    childKey: string;
    group?: string;
    at: number;
    /** Effective total duration — the bar length (one cycle for looping clips;
     * the widest track extent for props clips). */
    duration: number;
    loop: TimelineClipLoop;
    /** Where the clip stops affecting values: at + duration, or the timeline end when looping. */
    end: number;
    isPhysics: boolean;
    /** Motion-ready transition, its duration injected from the bar — single-curve clips only. */
    transition?: TransitionConfig;
    css?: TimelineClipCss;
    from?: Record<string, unknown>;
    /** Final merged state (the last leg's landing values for sequences). */
    to?: Record<string, unknown>;
    /** Every animating clip is tracks; empty for markers. */
    tracks: TimelineTrackStatic[];
    explicitSteps: boolean;
    /** Union of every property the clip touches. */
    props?: string[];
};
declare function computeStaticClips(parsed: ParsedTimeline, flatValues: Record<string, DialValue>): TimelineClipStatic[];
type TimelineStaticState = {
    duration: number;
    clips: TimelineClipStatic[];
};
/**
 * Resolves the editable clip model and grows the timeline when a live value
 * creates content beyond its authored window. This is most important for
 * physics springs: changing stiffness/damping changes their emergent length.
 * The parsed duration remains the minimum, so shortening a clip never removes
 * the original editing room.
 */
declare function computeStaticTimeline(parsed: ParsedTimeline, flatValues: Record<string, DialValue>): TimelineStaticState;
/** The dock's resolver: the same static model the hook animates with,
 * rebuilt from flat stored values — bars, popovers, and playback can never
 * disagree about geometry. */
declare function computeClipStaticFromValues(values: Record<string, DialValue>, clip: TimelineClipMeta, timelineDuration: number): TimelineClipStatic;
/**
 * `time` is the playhead (what the dock shows); `cycleTime` is continuous
 * time across timeline wraps (wraps × duration + time). Looping clips fold
 * against `cycleTime`, so a looping timeline never snaps their phase — the
 * window is a viewport onto animations that repeat forever. Scrubbing seeks
 * with cycleTime === time, which is the deterministic first-pass state.
 */
declare function computeClipState(clip: TimelineClipStatic, time: number, cycleTime?: number): Record<string, unknown>;
declare function transitionToCss(transition: TransitionConfig | undefined): TimelineClipCss | undefined;
/** Popover display values: swap stored shape-only transitions for their
 * effective configs (duration injected from the bar/segment) so the curve
 * editor shows the transition as it actually runs. */
declare function timelinePopoverDisplayValues(values: Record<string, DialValue>, clipKey: string, stepKeys?: string[], stepKey?: string): Record<string, DialValue>;
/** Dragging a track bar edits the property's phase offset. */
declare function clampTrackDelay(delay: number, at: number, trackDuration: number, timelineDuration: number): number;
declare function clampClipMove(at: number, duration: number, timelineDuration: number): number;
declare function clampClipResizeEnd(duration: number, at: number, timelineDuration: number): number;
declare function clampClipResizeStart(newAt: number, at: number, duration: number): {
    at: number;
    duration: number;
};
/** Resizing one leg of a sequence: the other legs keep their length, the
 * whole bar must still fit the timeline. */
declare function clampStepResize(duration: number, at: number, otherStepsTotal: number, timelineDuration: number): number;
type TimelineClipSpan = {
    key: string;
    at: number;
    duration: number;
};
/** Every clip's place on the timeline, from flat stored values. */
declare function timelineClipSpans(values: Record<string, DialValue>, clips: TimelineClipMeta[], timelineDuration: number): TimelineClipSpan[];
/** Where a dragged clip may go, and what a snapping drag lands on. */
type TimelineClipDragBounds = {
    /** Earliest start: 0, or the end of the clip before it on a single track. */
    start: number;
    /** Latest end: the timeline end, or the start of the clip after it on a single track. */
    end: number;
    /** Every other clip's start and end, plus the playhead when given. */
    targets: number[];
};
declare function timelineClipDragBounds(spans: TimelineClipSpan[], key: string, timelineDuration: number, options?: {
    singleTrack?: boolean;
    playhead?: number;
}): TimelineClipDragBounds;
/**
 * Moving a clip or one of its edges by `delta` seconds, kept inside
 * `bounds`. With the whole timeline as bounds this is exactly
 * `clampClipMove`, `clampClipResizeEnd` and `clampClipResizeStart`. With
 * `snap` the clip's start or end lands only on a target — the reachable one
 * closest to the pointer — and moves freely when none is reachable.
 */
declare function dragTimelineClip(mode: 'move' | 'start' | 'end', clip: {
    at: number;
    duration: number;
}, delta: number, bounds: TimelineClipDragBounds, snap?: boolean): {
    at: number;
    duration: number;
};
/** How much of a clip the playhead has crossed, 0 to 1. A clip with no
 * length counts as played once the playhead reaches it. */
declare function timelineClipProgress(time: number, at: number, duration: number): number;
/** Copy-for-agent export: strip editor-only state, normalize shape-only
 * transitions, resolve physics durations, and drop zero-value defaults. */
declare function normalizeTimelineValuesForCopy(values: Record<string, DialValue>, clips: TimelineClipMeta[]): Record<string, DialValue>;
declare function formatClock(time: number, tenths?: boolean): string;
declare function formatSeconds(value: number): string;
declare function formatStepLabel(stepKey: string): string;

interface DialTimelineOptions {
    id?: string;
    persist?: DialKitPersistOptions;
    /** Start playing on mount. Defaults to true. */
    autoplay?: boolean;
    /**
     * Loop when the playhead reaches the end. `true` restarts the whole
     * timeline; `{ from }` wraps back to that time instead, so clips before it
     * play once and looping clips keep cycling forever. Defaults to false.
     */
    loop?: boolean | {
        from: number;
    };
    /**
     * `'single'` lines every clip up on one track: clips play one after
     * another, and dragging one stops at its neighbors. Holds plain clips
     * only — groups, steps, props and looping clips need `'rows'`, the
     * default.
     */
    track?: 'rows' | 'single';
}
type TimelineActions = {
    play: () => void;
    pause: () => void;
    replay: () => void;
    seek: (time: number) => void;
};
/** One resolution of the public loop option, shared by every adapter. */
declare function resolveTimelineLoop(loop: DialTimelineOptions['loop']): {
    enabled: boolean;
    start: number;
};
declare function buildTimelineMeta(id: string, name: string, duration: number, parsed: ParsedTimeline, loop: DialTimelineOptions['loop'], track?: DialTimelineOptions['track']): TimelineMeta;
/**
 * Framework-neutral frame pass. Adapters only own lifecycle and reactivity;
 * the value shape and loop-cycle math stay identical everywhere.
 */
declare function buildTimelineValues<T extends TimelineConfig>(staticClips: TimelineClipStatic[], transport: TimelineTransport, timelineDuration: number, loopStart: number, actions: TimelineActions): DialTimelineValues<T>;

type Listener = () => void;
type VisibilityController = {
    visible?: boolean;
    defaultVisible: boolean;
    onVisibilityChange?: (visible: boolean) => void;
};
/**
 * UI-only state shared by the toolkit root and the timeline portal.
 * Playback deliberately lives elsewhere: hiding the editor must never pause
 * or otherwise change the animation it is inspecting.
 */
declare class TimelineUiStoreClass {
    private visible;
    private initialized;
    private controllers;
    private listeners;
    getVisible(): boolean;
    registerController(id: symbol, controller: VisibilityController): () => void;
    updateController(id: symbol, controller: VisibilityController): void;
    requestVisible(visible: boolean): void;
    toggle(): void;
    subscribe(listener: Listener): () => void;
    private notify;
}
declare const TimelineUiStore: TimelineUiStoreClass;

declare function buildCopyInstruction(hookName: string, panelName: string, values: Record<string, DialValue>): string;

declare const isDevDefault: boolean;

export { type DialTimelineOptions, type DialTimelineValues, type ParsedTimeline, TIMELINE_CLIP_COLORS, TIMELINE_MIN_CLIP_DURATION, type TimelineActions, type TimelineClipConfig, type TimelineClipCss, type TimelineClipDragBounds, type TimelineClipLoop, type TimelineClipMeta, type TimelineClipSpan, type TimelineClipStatic, type TimelineClipTrackMeta, type TimelineClipValues, type TimelineConfig, type TimelineGroupConfig, type TimelineGroupValues, type TimelineMeta, type TimelinePropConfig, type TimelinePropStepConfig, type TimelineStaticState, type TimelineStepConfig, type TimelineStepStatic, type TimelineStepValues, TimelineStore, type TimelineTrackStatic, type TimelineTransport, TimelineUiStore, buildCopyInstruction, buildTimelineMeta, buildTimelineValues, clamp, clampClipMove, clampClipResizeEnd, clampClipResizeStart, clampStepResize, clampTrackDelay, computeClipState, computeClipStaticFromValues, computeStaticClips, computeStaticTimeline, dragTimelineClip, foldLoopTime, formatClock, formatSeconds, formatStepLabel, isDevDefault, loopSpan, normalizeTimelineValuesForCopy, parseTimelineConfig, resolveTimelineLoop, timelineClipDragBounds, timelineClipProgress, timelineClipSpans, timelinePopoverDisplayValues, transitionToCss };
