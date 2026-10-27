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

type BezierPoints = EasingConfig['ease'];

/** A named value a transition control can apply in one mode. */
interface TransitionPresetOption {
    name: string;
    /** A short description of how it moves; saved presets have none. */
    description?: string;
    value: TransitionConfig;
}

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
type SavedGradient = {
    id: string;
    gradient: BackgroundGradient;
};
/** Draws a gradient into a canvas at the canvas's own size, every shape exactly. */
declare function paintGradient(canvas: HTMLCanvasElement, gradient: BackgroundGradient): void;
/**
 * The gradient as a CSS image for a square box. Linear is exact; radial and
 * angular are exact while the handles keep to the box's axes, as the panel
 * keeps them. CSS has no diamond gradient, so a diamond is drawn as its
 * radial ellipse; use `paintGradient` to draw it exactly.
 */
declare function backgroundGradientCss(gradient: BackgroundGradient): string;
type MediaCssProperty = 'background-image' | 'background-position' | 'background-repeat' | 'background-size' | 'object-fit' | 'object-position' | 'transform' | 'transform-origin';
/**
 * The media as CSS properties, as the panel's preview draws it, keyed by CSS
 * property name. Give them to an element that fills a box with
 * `overflow: hidden`: any element for an image, which becomes its background,
 * or the `<video>` itself. Zoom scales the media around the part kept in view.
 * Tile repeats an image; a video fills its box instead. The ratio is the box's
 * shape, so set the box's `aspect-ratio` to it (or to the media's own for
 * `"source"`).
 */
declare function backgroundMediaCss(media: BackgroundMedia, display: BackgroundMediaDisplay): Partial<Record<MediaCssProperty, string>>;

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
/** Shows `control` (any control or folder) only while `rule` holds. Hidden controls keep their values. */
declare function withVisibility<T extends DialValue | [number, number, number, number?, string?] | DialConfig>(control: T, rule: VisibleWhen): ControlWithVisibility<T>;
type ResolvedValues<T extends DialConfig> = {
    [K in keyof T as K extends '_collapsed' | '_fields' | '_reset' | '_hints' ? never : K]: T[K] extends ControlWithVisibility<infer U extends DialConfig[string]> ? ResolvedValues<{
        value: U;
    }>['value'] : T[K] extends [number, number, number, number?, string?] ? number : T[K] extends SpringConfig ? TransitionConfig : T[K] extends EasingConfig ? TransitionConfig : T[K] extends SelectConfig ? string : T[K] extends ColorConfig | ImageConfig ? string : T[K] extends TextConfig ? string : T[K] extends DialPadConfig ? DialPadValue : T[K] extends BackgroundConfig ? BackgroundValue : T[K] extends AnchorConfig ? AnchorValue : T[K] extends DialConfig ? ResolvedValues<T[K]> : T[K];
};
type DialKitValueUpdates<T extends DialConfig> = {
    [K in keyof T as K extends '_collapsed' | '_fields' | '_reset' | '_hints' ? never : K]?: T[K] extends ControlWithVisibility<infer U extends DialConfig[string]> ? DialKitValueUpdates<{
        value: U;
    }>['value'] : T[K] extends [number, number, number, number?, string?] ? number : T[K] extends SpringConfig | EasingConfig ? TransitionConfig : T[K] extends ActionConfig ? never : T[K] extends SelectConfig | ColorConfig | ImageConfig | TextConfig ? string : T[K] extends DialPadConfig ? DialPadValue : T[K] extends BackgroundConfig ? BackgroundValueUpdate : T[K] extends AnchorConfig ? AnchorValue : T[K] extends DialConfig ? DialKitValueUpdates<T[K]> : T[K];
};
type ShortcutMode = 'fine' | 'normal' | 'coarse';
type ShortcutInteraction = 'scroll' | 'drag' | 'move' | 'scroll-only';
type ShortcutConfig = {
    key?: string;
    modifier?: 'alt' | 'shift' | 'meta';
    mode?: ShortcutMode;
    interaction?: ShortcutInteraction;
};
type ControlMeta = {
    type: 'slider' | 'toggle' | 'spring' | 'transition' | 'folder' | 'action' | 'select' | 'color' | 'image' | 'text' | 'pad' | 'background' | 'anchor';
    path: string;
    label: string;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    children?: ControlMeta[];
    defaultOpen?: boolean;
    /** The folder drawn for this control shows a reset button: `_reset` folders, springs, transitions, and backgrounds. */
    reset?: boolean;
    /** Folder only: `_fields: true` shows its numbers as one row of fields. */
    fields?: boolean;
    options?: SelectOption[];
    display?: SelectConfig['display'];
    hideLabel?: boolean;
    placeholder?: string;
    pad?: DialPadConfig;
    anchor?: AnchorConfig;
    background?: BackgroundConfig;
    shortcut?: ShortcutConfig;
    visibleWhen?: VisibleWhen;
    /** A short sentence about the control, from its folder's `_hints`. */
    hint?: string;
};
type PanelConfig = {
    id: string;
    name: string;
    controls: ControlMeta[];
    values: Record<string, DialValue>;
    shortcuts: Record<string, ShortcutConfig>;
    kind?: 'timeline';
};
type Listener$1 = () => void;
type ActionListener = (action: string) => void;
type Preset = {
    id: string;
    name: string;
    values: Record<string, DialValue>;
    locked?: boolean;
};
type TransitionMode = 'easing' | 'simple' | 'advanced';
/** A curve or spring the user saved, shared by every transition control. */
type TransitionPreset = {
    id: string;
    name: string;
    mode: TransitionMode;
    value: TransitionConfig;
};
/** The transition a transition control copied, with the mode it was in. */
type CopiedTransition = {
    value: TransitionConfig;
    mode: TransitionMode;
};
type DialKitPersistOptions = boolean | {
    key?: string;
    storage?: 'localStorage' | 'sessionStorage';
    presets?: boolean;
};
type DialStorePanelOptions = {
    defaultCollapsed?: boolean;
    retainOnUnmount?: boolean;
    persist?: DialKitPersistOptions;
    kind?: 'timeline';
};
declare class DialStoreClass {
    private panelOpenListeners;
    private panelOpenStates;
    private panels;
    private controlsByPanel;
    private resetKeysByPanel;
    private allControls;
    private panelsSnapshot;
    private standardPanelsSnapshot;
    private timelinePanelsSnapshot;
    private listeners;
    private globalListeners;
    private snapshots;
    private actionListeners;
    private presets;
    private activePreset;
    private gradients;
    private baseValues;
    private baseNames;
    private defaultValues;
    private registrationCounts;
    private retainedPanels;
    private persistConfigs;
    private transitionPresets;
    private transitionStorageLoaded;
    private copiedTransition;
    private transitionListeners;
    registerPanel(id: string, name: string, config: DialConfig, shortcuts?: Record<string, ShortcutConfig>, options?: DialStorePanelOptions): void;
    updatePanel(id: string, name: string, config: DialConfig, shortcuts?: Record<string, ShortcutConfig>, options?: DialStorePanelOptions): void;
    unregisterPanel(id: string): void;
    /** Undefined delegates the initial state to DialRoot.defaultOpen. */
    getPanelOpen(panelId: string): boolean | undefined;
    isPanelOpen(panelId: string): boolean;
    togglePanelOpen(panelId: string): void;
    /** Applies a host component's own default; no-op once the panel has state. */
    initPanelOpen(panelId: string, open: boolean): void;
    /** Observe open requests so a containing toolkit can reveal its requested panel. */
    subscribePanelOpen(listener: (panelId: string, open: boolean) => void): () => void;
    setPanelOpen(panelId: string, open: boolean): void;
    updateValue(panelId: string, path: string, value: DialValue): void;
    updateValues(panelId: string, updates: Record<string, DialValue>): void;
    resetValues(panelId: string): void;
    /**
     * Restore the defaults behind a folder's reset button: every value inside a
     * `_reset` folder, nested folders included, or a spring, transition or
     * background's own value. Saves like any other edit.
     */
    resetFolder(panelId: string, path: string): void;
    /** True when a value that `resetFolder` restores differs from its default, so the reset button shows. */
    isFolderChanged(panelId: string, path: string): boolean;
    updateSpringMode(panelId: string, path: string, mode: 'simple' | 'advanced'): void;
    getSpringMode(panelId: string, path: string): 'simple' | 'advanced';
    updateTransitionMode(panelId: string, path: string, mode: TransitionMode): void;
    getTransitionMode(panelId: string, path: string): TransitionMode;
    getValue(panelId: string, path: string): DialValue | undefined;
    getValues(panelId: string): Record<string, DialValue>;
    getDefaultValues(panelId: string): Record<string, DialValue>;
    getPanels(kind?: 'panel' | 'timeline'): PanelConfig[];
    getPanel(id: string): PanelConfig | undefined;
    /** Looks up a control by path, including one its visibility rule hides. */
    getControl(panelId: string, path: string): ControlMeta | undefined;
    subscribe(panelId: string, listener: Listener$1): () => void;
    subscribeGlobal(listener: Listener$1): () => void;
    subscribeActions(panelId: string, listener: ActionListener): () => void;
    triggerAction(panelId: string, path: string): void;
    /**
     * Saves the current values as the next numbered version: "V2", "V3"…, or under its own
     * `prefix` ("Sequence 2" in a timeline). Older saves used "Version N"; both count toward the next V.
     */
    saveNewPreset(panelId: string, prefix?: string): string;
    savePreset(panelId: string, name: string): string;
    loadPreset(panelId: string, presetId: string): void;
    deletePreset(panelId: string, presetId: string): void;
    /** Rename a saved version. A null presetId renames the base version. */
    renamePreset(panelId: string, presetId: string | null, name: string): void;
    /** Where a panel's saved versions persist, if they do. */
    getPresetStorage(panelId: string): {
        key: string;
        storage: 'localStorage' | 'sessionStorage';
    } | null;
    /** Display name of the base version (the values before any saved preset). */
    getBaseName(panelId: string): string;
    setPresetLocked(panelId: string, presetId: string, locked: boolean): void;
    reorderPresets(panelId: string, presetIds: string[]): void;
    getPresets(panelId: string): Preset[];
    /** Saved gradients belong to the panel, and persist with it when it opts in. */
    saveGradient(panelId: string, gradient: BackgroundGradient): string;
    deleteGradient(panelId: string, gradientId: string): void;
    getSavedGradients(panelId: string): SavedGradient[];
    getActivePresetId(panelId: string): string | null;
    clearActivePreset(panelId: string): void;
    /** Saved curves and springs, shared by every transition control. */
    getTransitionPresets(): TransitionPreset[];
    /** The built-in curves (Easing) or springs (Time and Physics) for a mode, each with a short description of how it moves. */
    getDefaultTransitionPresets(mode: TransitionMode): TransitionPresetOption[];
    /** Saves a transition for its mode as "Custom N" and returns the new preset's id. */
    saveTransitionPreset(value: TransitionConfig, mode: TransitionMode): string;
    deleteTransitionPreset(id: string): void;
    copyTransition(value: TransitionConfig, mode: TransitionMode): void;
    /** A copy of the copied transition, so applying it never changes what was copied. */
    getCopiedTransition(): CopiedTransition | null;
    clearCopiedTransition(): void;
    /** Notifies when saved transitions or the copied transition change. */
    subscribeTransitions(listener: Listener$1): () => void;
    resolveShortcutTarget(key: string, modifier?: 'alt' | 'shift' | 'meta'): {
        panelId: string;
        path: string;
        control: ControlMeta;
    } | null;
    resolveScrollOnlyTargets(): Array<{
        panelId: string;
        path: string;
        control: ControlMeta;
        shortcut: ShortcutConfig;
    }>;
    private configurePanelRetention;
    private reconcileValues;
    private setPresets;
    private reconcilePresets;
    private normalizePersistConfig;
    private loadPersistedPanel;
    private persistPanel;
    private getStorage;
    private setTransitionPresets;
    /** Saved transitions follow panel persistence: they are stored wherever a panel persists its presets. */
    private transitionStorageKinds;
    /** Merges the transitions saved in a storage the first time a persisted panel uses it. */
    private loadTransitionPresets;
    private persistTransitionPresets;
    private notifyTransitions;
    /** Keeps the full tree aside and shows the controls whose rules hold. */
    private setVisibleControls;
    /** Re-applies visibility rules after a write. `getPanels()` snapshots are cached, so a changed tree refreshes them too. */
    private updateVisibility;
    /** Hidden controls ignore shortcuts. */
    private isShown;
    private notify;
    private notifyGlobal;
    /** Compile controls, defaults, and the lookup index in one walk. */
    private parseConfig;
    private inferRange;
    private normalizePreservedValue;
}
declare const DialStore: DialStoreClass;

interface CreateDialOptions {
    id?: string;
    defaultCollapsed?: boolean;
    persist?: DialKitPersistOptions;
    onAction?: (action: string) => void;
    shortcuts?: Record<string, ShortcutConfig>;
}
interface DialKitController<T extends DialConfig> {
    readonly id: string;
    readonly values: ResolvedValues<T>;
    getValues(): ResolvedValues<T>;
    setValue(path: string, value: DialValue): void;
    setValues(values: DialKitValueUpdates<T>): void;
    resetValues(): void;
    setOpen(open: boolean): void;
    getOpen(): boolean | undefined;
    /** Called immediately by default, then whenever the panel changes. */
    subscribe(listener: (values: ResolvedValues<T>) => void, immediate?: boolean): () => void;
    updateConfig(config: T): void;
    /** Release this registration and all of its subscriptions. Safe to call twice. */
    destroy(): void;
}
/** A framework-free panel with explicit subscriptions and lifecycle. */
declare function createDialKit<T extends DialConfig>(name: string, config: T, options?: CreateDialOptions): DialKitController<T>;
declare const createDialKitController: typeof createDialKit;

interface Mounted<P> {
    update(props: P): void;
    destroy(): void;
}

/** How a panel shows its versions: captured thumbnails (default), or a menu. */
type DialVersions = 'menu' | 'thumbnails';
interface VersionGalleryProps {
    panelId: string;
    theme?: 'light' | 'dark' | 'system';
}
declare function mountVersionGallery(host: HTMLElement, initial: VersionGalleryProps): Mounted<VersionGalleryProps>;

type DialPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
type DialMode = 'popover' | 'inline';
type DialTheme = 'light' | 'dark' | 'system';
interface DialRootOptions {
    target?: HTMLElement;
    position?: DialPosition;
    defaultOpen?: boolean;
    mode?: DialMode;
    theme?: DialTheme;
    /** Plain HTML has no build-mode detection; enabled by default. */
    productionEnabled?: boolean;
    /** How saved versions appear: captured thumbnails (default), or a menu. */
    versions?: DialVersions;
    accordion?: boolean;
    onOpenChange?: (open: boolean) => void;
}
declare function createDialRoot(options?: DialRootOptions): {
    element: HTMLDivElement;
    destroy(): void;
};
declare const DialRoot: typeof createDialRoot;

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
type Listener = () => void;
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
    subscribe(id: string, listener: Listener): () => void;
    subscribeGlobal(listener: Listener): () => void;
    private applyMeta;
    private ensureLoop;
    private tick;
    private notify;
    private notifyGlobal;
}
declare const TimelineStore: TimelineStoreClass;

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
declare function formatClock(time: number, tenths?: boolean): string;

interface DialTimelineOptions$1 {
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

type CreateDialTimelineOptions = DialTimelineOptions$1;
interface DialTimelineController<T extends TimelineConfig> {
    readonly id: string;
    readonly values: DialTimelineValues<T>;
    getValues(): DialTimelineValues<T>;
    subscribe(listener: (values: DialTimelineValues<T>) => void, immediate?: boolean): () => void;
    play(): void;
    pause(): void;
    replay(): void;
    seek(time: number): void;
    updateConfig(config: T): void;
    destroy(): void;
}
declare function createDialTimeline<T extends TimelineConfig>(name: string, config: T, options?: CreateDialTimelineOptions): DialTimelineController<T>;

interface SpringVisualizationProps {
    spring: SpringConfig;
    isSimpleMode: boolean;
}
declare function mountSpringVisualization(host: HTMLElement, initial: SpringVisualizationProps): Mounted<SpringVisualizationProps>;
interface TransitionControlProps {
    panelId: string;
    path: string;
    label: string;
    value: TransitionConfig;
    onChange: (value: TransitionConfig) => void;
    hideDuration?: boolean;
    durationControl?: {
        value: number;
        onChange: (value: number) => void;
        min?: number;
        max?: number;
        step?: number;
    };
    /** Shows a reset button in the header. See FolderProps.onReset. */
    onReset?: () => void;
    changed?: boolean;
    hint?: string;
}
declare function mountTransitionControl(host: HTMLElement, initial: TransitionControlProps, springOnly?: boolean): Mounted<TransitionControlProps>;
interface SpringControlProps {
    panelId: string;
    path: string;
    label: string;
    spring: SpringConfig;
    onChange: (value: SpringConfig) => void;
    /** Shows a reset button in the header. See FolderProps.onReset. */
    onReset?: () => void;
    changed?: boolean;
    hint?: string;
}
declare function mountSpringControl(host: HTMLElement, props: SpringControlProps): Mounted<SpringControlProps>;

interface ControlRendererProps {
    panelId: string;
    controls: ControlMeta[];
    values: Record<string, DialValue>;
    transitionDuration?: TransitionControlProps['durationControl'];
    /** Path of the one open top-level folder in accordion mode, or null when all are closed. */
    openFolder?: string | null;
    onOpenFolderChange?: (path: string | null) => void;
    /** Slide controls in and out as their visibility rules change. */
    animateControls?: boolean;
}
declare function mountControlRenderer(host: HTMLElement, initial: ControlRendererProps): Mounted<ControlRendererProps>;

interface FolderProps {
    title: string;
    defaultOpen?: boolean;
    open?: boolean;
    isRoot?: boolean;
    isSection?: boolean;
    inline?: boolean;
    /** Short text at the end of a nested folder's title row, such as the preset in use. */
    meta?: string;
    /** Adds a slot beside the title of a nested folder, such as a transition's copy and paste. */
    actions?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Shows a reset button after the title, visible while `changed` is true. */
    onReset?: () => void;
    changed?: boolean;
    hint?: string;
}
declare function mountFolder(host: HTMLElement, initial: FolderProps): {
    element: HTMLDivElement;
    body: HTMLDivElement;
    toolbar: HTMLDivElement;
    actions: HTMLDivElement;
    update(next: FolderProps): void;
    destroy(): void;
};
interface SegmentedControlProps<T extends string = string> {
    options: {
        value: T;
        label: string;
        /** SVG path data in a 24 × 24 box, shown in place of the label. */
        icon?: string | string[];
    }[];
    value: T;
    onChange: (value: T) => void;
    /** Accessible name for the group. */
    label?: string;
}
declare function mountSegmentedControl<T extends string>(host: HTMLElement, initial: SegmentedControlProps<T>): Mounted<SegmentedControlProps<T>>;
interface ToggleProps {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    shortcut?: ShortcutConfig;
    shortcutActive?: boolean;
    hint?: string;
}
declare function mountToggle(host: HTMLElement, initial: ToggleProps): Mounted<ToggleProps>;
interface SliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    shortcut?: ShortcutConfig;
    shortcutActive?: boolean;
    /** @internal A value that arrives with a new count springs into place, like a click on the track. */
    resetCount?: number;
    hint?: string;
    /** A press moves the value to the pressed point at once, on the step's grid, instead of snapping it there on release. */
    seekOnPress?: boolean;
}
declare function mountSlider(host: HTMLElement, initial: SliderProps): Mounted<SliderProps>;
interface TextControlProps {
    label: string;
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
    hint?: string;
}
declare function mountTextControl(host: HTMLElement, initial: TextControlProps): Mounted<TextControlProps>;
interface ButtonGroupProps {
    buttons: {
        label: string;
        onClick: () => void;
    }[];
}
declare function mountButtonGroup(host: HTMLElement, initial: ButtonGroupProps): Mounted<ButtonGroupProps>;

interface SelectControlProps {
    label: string;
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    display?: SelectConfig['display'];
    hideLabel?: boolean;
    hint?: string;
}
declare function mountSelectControl(host: HTMLElement, initial: SelectControlProps): Mounted<SelectControlProps>;
interface PresetManagerProps {
    panelId: string;
    presets: Preset[];
    activePresetId: string | null;
    onAdd?: () => void;
    /** What a version is called in the menu: a version (default) or, in a timeline, a sequence. */
    noun?: 'version' | 'sequence';
}
declare function mountPresetManager(host: HTMLElement, initial: PresetManagerProps): Mounted<PresetManagerProps>;
declare function mountShortcutsMenu(host: HTMLElement, initial: {
    panelId: string;
}): Mounted<{
    panelId: string;
}>;

type ColorControlProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    hint?: string;
};
declare function mountColorControl(host: HTMLElement, initial: ColorControlProps, presentation?: 'popover' | 'inline'): {
    update(next: ColorControlProps): void;
    /** Closes the popover picker. */
    close(): void;
    destroy(): void;
};

type ImageControlProps = {
    label: string;
    value: string;
    options?: ImageOption[];
    onChange: (value: string) => void;
    hint?: string;
};
/** Shared picker so selection, uploads, focus, and positioning match in every framework. */
declare function mountImageControl(host: HTMLElement, initial: ImageControlProps, presentation?: 'popover' | 'inline'): {
    update(next: ImageControlProps): void;
    destroy(): void;
};

type DialPadProps = Omit<DialPadConfig, 'type'> & {
    label: string;
    value: DialPadValue;
    onChange: (value: DialPadValue) => void;
    hint?: string;
};
/** Shared pointer, keyboard, and numeric editing behavior for all four frameworks. */
declare function mountDialPad(host: HTMLElement, initial: DialPadProps): {
    update(next: DialPadProps): void;
    destroy(): void;
};

type AnchorControlProps = {
    label: string;
    value: AnchorValue;
    onChange: (value: AnchorValue) => void;
    /** A short sentence shown while H is held over the control. */
    hint?: string;
};
/** A 3 × 3 radio grid: one pick sets both axes, and the highlight slides to it. */
declare function mountAnchorControl(host: HTMLElement, initial: AnchorControlProps): {
    update(next: AnchorControlProps): void;
    destroy(): void;
};

type BackgroundControlProps = {
    /** Saved gradients belong to this panel. */
    panelId: string;
    label: string;
    value: BackgroundValue;
    /** Stores a dropped or picked file and returns its URL. Without it, files up to 10 MB are read as data URLs. */
    upload?: (file: File) => Promise<string>;
    onChange: (value: BackgroundValue) => void;
};
/** Solid, gradient, and media backgrounds in one control, shared by every adapter. */
declare function mountBackgroundControl(host: HTMLElement, initial: BackgroundControlProps): {
    update(next: BackgroundControlProps): void;
    destroy(): void;
};

interface EasingVisualizationProps {
    easing: EasingConfig;
    /** Enables pointer and keyboard editing of the two control points. */
    onChange?: (ease: BezierPoints) => void;
}
/** One interaction and fitting implementation for React, Solid, Vue, and Svelte. */
declare function mountEasingVisualization(host: HTMLElement, initial: EasingVisualizationProps): {
    update(next: EasingVisualizationProps): void;
    destroy(): void;
};

/** Roots share one listener, so mounting two editing surfaces never doubles a shortcut. */
declare function mountShortcutListener(): {
    destroy(): void;
};

interface DialTimelineOptions {
    target?: HTMLElement;
    theme?: DialTheme;
    defaultVisible?: boolean;
    visible?: boolean;
    onVisibilityChange?: (visible: boolean) => void;
    defaultOpen?: boolean;
    productionEnabled?: boolean;
}
type DialTimelineProps = DialTimelineOptions;
/** Mount the timeline dock independently of the parameter panel. */
declare function createDialTimelineRoot(initial?: DialTimelineOptions): {
    element: HTMLDivElement;
    setVisible(visible: boolean): void;
    update(next: Pick<DialTimelineOptions, "theme" | "visible" | "onVisibilityChange">): void;
    destroy(): void;
};
declare const DialTimeline: typeof createDialTimelineRoot;

export { type ActionConfig, type AnchorConfig, mountAnchorControl as AnchorControl, type AnchorControlProps, type AnchorValue, type BackgroundConfig, mountBackgroundControl as BackgroundControl, type BackgroundControlProps, type BackgroundGradient, type BackgroundMedia, type BackgroundMediaDisplay, type BackgroundMediaFit, type BackgroundMediaRatio, type BackgroundMode, type BackgroundValue, type BackgroundValueUpdate, mountButtonGroup as ButtonGroup, type ButtonGroupProps, type ColorConfig, mountColorControl as ColorControl, type ColorControlProps, type ControlMeta, mountControlRenderer as ControlRenderer, type ControlRendererProps, type ControlWithVisibility, type CopiedTransition, type CreateDialOptions, type CreateDialTimelineOptions, type DialConfig, type DialKitController, type DialKitPersistOptions, type DialKitValueUpdates, type DialMode, mountDialPad as DialPad, type DialPadAxis, type DialPadConfig, type DialPadProps, type DialPadValue, type DialPosition, DialRoot, type DialRootOptions, DialStore, type DialTheme, DialTimeline, type DialTimelineController, type DialTimelineOptions, type DialTimelineProps, type DialTimelineValues, type DialValue, type DialVersions, type EasingConfig, mountEasingVisualization as EasingVisualization, type EasingVisualizationProps, mountFolder as Folder, type FolderProps, type GradientHandles, type GradientPoint, type GradientShape, type GradientStop, type ImageConfig, mountImageControl as ImageControl, type ImageControlProps, type ImageOption, type PanelConfig, type Preset, mountPresetManager as PresetManager, type PresetManagerProps, type ResolvedValues, type SavedGradient, mountSegmentedControl as SegmentedControl, type SegmentedControlProps, type SelectConfig, mountSelectControl as SelectControl, type SelectControlProps, type SelectOption, type ShortcutConfig, type ShortcutInteraction, type ShortcutMode, mountShortcutsMenu as ShortcutsMenu, mountSlider as Slider, type SliderProps, type SpringConfig, mountSpringControl as SpringControl, type SpringControlProps, mountSpringVisualization as SpringVisualization, type SpringVisualizationProps, type TextConfig, mountTextControl as TextControl, type TextControlProps, type TimelineClipConfig, type TimelineClipCss, type TimelineClipLoop, type TimelineClipMeta, type TimelineClipTrackMeta, type TimelineClipValues, type TimelineConfig, type TimelineGroupConfig, type TimelineGroupValues, type TimelineMeta, type TimelinePropConfig, type TimelinePropStepConfig, type TimelineStepConfig, type TimelineStepValues, TimelineStore, type TimelineTransport, mountToggle as Toggle, type ToggleProps, type TransitionConfig, mountTransitionControl as TransitionControl, type TransitionControlProps, type TransitionMode, type TransitionPreset, mountVersionGallery as VersionGallery, type VersionGalleryProps, type VisibleWhen, type VisibleWhenValue, backgroundGradientCss, backgroundMediaCss, createDialKit, createDialKitController, createDialRoot, createDialTimeline, createDialTimelineRoot, formatClock, mountAnchorControl, mountBackgroundControl, mountButtonGroup, mountColorControl, mountControlRenderer, mountDialPad, mountEasingVisualization, mountFolder, mountImageControl, mountPresetManager, mountSegmentedControl, mountSelectControl, mountShortcutListener, mountShortcutsMenu, mountSlider, mountSpringControl, mountSpringVisualization, mountTextControl, mountToggle, mountTransitionControl, mountVersionGallery, paintGradient, withVisibility };
