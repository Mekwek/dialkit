import * as react_jsx_runtime from 'react/jsx-runtime';
import * as react from 'react';
import { ReactNode } from 'react';

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
type SelectConfig = {
    type: 'select';
    options: (string | {
        value: string;
        label: string;
    })[];
    default?: string;
};
type ColorConfig = {
    type: 'color';
    default?: string;
};
type TextConfig = {
    type: 'text';
    default?: string;
    placeholder?: string;
};
type DialValue = number | boolean | string | SpringConfig | EasingConfig | ActionConfig | SelectConfig | ColorConfig | TextConfig;
type VisibleWhenValue = string | boolean | number;
/**
 * Rule for conditional control visibility. Exactly one of `is` or `not`
 * should be provided — if both are set, only `is` is evaluated.
 */
type VisibleWhen = {
    /**
     * Flat store path of another control in the same panel to watch.
     * Must be the full dot-delimited path as it appears in panel.values
     * (e.g. `"debug.showStats"` for a nested control, not a relative path).
     */
    field: string;
} & ({
    is: VisibleWhenValue | VisibleWhenValue[];
    not?: never;
} | {
    not: VisibleWhenValue | VisibleWhenValue[];
    is?: never;
} | {
    is?: undefined;
    not?: undefined;
});
/**
 * Wraps a control with a visibility rule. The control is only added to the
 * panel's rendered tree when its rule passes. Re-evaluated on every value
 * change. Use the {@link withVisibility} helper instead of building this by hand.
 */
type ControlWithVisibility<T = DialValue | [number, number, number, number?] | DialConfig> = {
    value: T;
    visibleWhen: VisibleWhen;
};
/**
 * Tag any DialKit control with a conditional visibility rule. The control is
 * only shown when `rule` passes against the current panel values.
 *
 * @example
 * const config = {
 *   layoutMode: { type: 'select', options: ['grid', 'sphere'] },
 *   radius: withVisibility([1, 0, 10], { field: 'layoutMode', is: 'sphere' }),
 * };
 */
declare function withVisibility<T extends DialValue | [number, number, number, number?] | DialConfig>(control: T, rule: VisibleWhen): ControlWithVisibility<T>;
/** The union of all value shapes that can appear in a DialConfig entry. */
type DialConfigValue = DialValue | [number, number, number, number?] | DialConfig;
/**
 * Detect and unwrap a `{ value, visibleWhen }` wrapper produced by
 * {@link withVisibility}. Returns the inner value if wrapped, or the
 * original value if not.
 *
 * Exported for use by framework hooks (React, Solid, Svelte, Vue) so
 * they can strip the wrapper when building resolved values without
 * duplicating the detection logic.
 */
declare function unwrapVisibility(raw: unknown): DialConfigValue;
type DialConfig = {
    [key: string]: DialValue | [number, number, number, number?] | DialConfig | ControlWithVisibility;
};
type ResolvedValues<T extends DialConfig> = {
    [K in keyof T]: T[K] extends [number, number, number, number?] ? number : T[K] extends SpringConfig ? TransitionConfig : T[K] extends EasingConfig ? TransitionConfig : T[K] extends SelectConfig ? string : T[K] extends ColorConfig ? string : T[K] extends TextConfig ? string : T[K] extends DialConfig ? ResolvedValues<T[K]> : T[K];
};
type DialKitValueUpdates<T extends DialConfig> = {
    [K in keyof T as K extends '_collapsed' ? never : K]?: T[K] extends [number, number, number, number?] ? number : T[K] extends SpringConfig | EasingConfig ? TransitionConfig : T[K] extends ActionConfig ? never : T[K] extends SelectConfig | ColorConfig | TextConfig ? string : T[K] extends DialConfig ? DialKitValueUpdates<T[K]> : T[K];
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
    type: 'slider' | 'toggle' | 'spring' | 'transition' | 'folder' | 'action' | 'select' | 'color' | 'text';
    path: string;
    label: string;
    min?: number;
    max?: number;
    step?: number;
    children?: ControlMeta[];
    defaultOpen?: boolean;
    options?: (string | {
        value: string;
        label: string;
    })[];
    placeholder?: string;
    shortcut?: ShortcutConfig;
    /** Conditional visibility rule attached via {@link withVisibility}. */
    visibleWhen?: VisibleWhen;
};
type PanelConfig = {
    id: string;
    name: string;
    controls: ControlMeta[];
    values: Record<string, DialValue>;
    shortcuts: Record<string, ShortcutConfig>;
    kind?: 'timeline';
    /**
     * Optional grouping key. Panels sharing the same non-empty `group` are
     * rendered as collapsible sections inside ONE merged shell by `DialRoot`.
     * Panels with no group (the default) render as independent standalone
     * shells, exactly as before.
     */
    group?: string;
    /**
     * Initial open state for this panel's folder. Defaults to open. Most useful
     * for a grouped panel that should start collapsed as a section inside the
     * merged shell (e.g. a secondary settings section). `undefined` ⇒ open.
     */
    defaultOpen?: boolean;
};
type Listener$1 = () => void;
type ActionListener = (action: string) => void;
type Preset = {
    id: string;
    name: string;
    values: Record<string, DialValue>;
};
type DialKitPersistOptions = boolean | {
    key?: string;
    storage?: 'localStorage' | 'sessionStorage';
    presets?: boolean;
};
type DialStorePanelOptions = {
    retainOnUnmount?: boolean;
    persist?: DialKitPersistOptions;
    kind?: 'timeline';
    /**
     * Optional grouping key. See {@link PanelConfig.group}.
     */
    group?: string;
    /**
     * Initial open state for this panel's folder. See {@link PanelConfig.defaultOpen}.
     */
    defaultOpen?: boolean;
};
declare class DialStoreClass {
    private panels;
    private panelsSnapshot;
    private standardPanelsSnapshot;
    private timelinePanelsSnapshot;
    private listeners;
    private globalListeners;
    private snapshots;
    private actionListeners;
    private presets;
    private activePreset;
    private baseValues;
    private defaultValues;
    private registrationCounts;
    private retainedPanels;
    private persistConfigs;
    /**
     * Full (unfiltered) control tree per panel. `panels[id].controls` holds the
     * tree with conditional-visibility controls already filtered out, which is
     * what the UI renders. We keep the unfiltered tree here so visibility can
     * flip back when a dependent value changes.
     */
    private allControls;
    registerPanel(id: string, name: string, config: DialConfig, shortcuts?: Record<string, ShortcutConfig>, options?: DialStorePanelOptions): void;
    updatePanel(id: string, name: string, config: DialConfig, shortcuts?: Record<string, ShortcutConfig>, options?: DialStorePanelOptions): void;
    unregisterPanel(id: string): void;
    updateValue(panelId: string, path: string, value: DialValue): void;
    updateValues(panelId: string, updates: Record<string, DialValue>): void;
    resetValues(panelId: string): void;
    updateSpringMode(panelId: string, path: string, mode: 'simple' | 'advanced'): void;
    getSpringMode(panelId: string, path: string): 'simple' | 'advanced';
    updateTransitionMode(panelId: string, path: string, mode: 'easing' | 'simple' | 'advanced'): void;
    getTransitionMode(panelId: string, path: string): 'easing' | 'simple' | 'advanced';
    getValue(panelId: string, path: string): DialValue | undefined;
    getValues(panelId: string): Record<string, DialValue>;
    getPanels(kind?: 'panel' | 'timeline'): PanelConfig[];
    getPanel(id: string): PanelConfig | undefined;
    subscribe(panelId: string, listener: Listener$1): () => void;
    subscribeGlobal(listener: Listener$1): () => void;
    subscribeActions(panelId: string, listener: ActionListener): () => void;
    triggerAction(panelId: string, path: string): void;
    savePreset(panelId: string, name: string): string;
    loadPreset(panelId: string, presetId: string): void;
    deletePreset(panelId: string, presetId: string): void;
    getPresets(panelId: string): Preset[];
    getActivePresetId(panelId: string): string | null;
    clearActivePreset(panelId: string): void;
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
    private reconcilePresets;
    private normalizePersistConfig;
    private loadPersistedPanel;
    private persistPanel;
    private getStorage;
    private findControlByPath;
    private notify;
    private notifyGlobal;
    /** Editor mode implied by a transition config's shape — the same mapping
     *  initTransitionModes applies to config defaults at registration. */
    private transitionModeFor;
    private initTransitionModes;
    private parseConfig;
    private flattenValues;
    private isSpringConfig;
    private isEasingConfig;
    private isActionConfig;
    private isSelectConfig;
    private isColorConfig;
    private isTextConfig;
    private isHexColor;
    private formatLabel;
    private inferRange;
    private inferStep;
    private normalizePreservedValue;
    private roundToStep;
    private stepPrecision;
    private mapControlsByPath;
    /**
     * Detects and unwraps a `{ value, visibleWhen }` wrapper produced by
     * {@link withVisibility}. Returns the inner control plus the rule (or
     * `undefined` for `visibleWhen` if the input was not a wrapper).
     */
    private unwrapVisibilityWithRule;
    /** Evaluate a visibility rule against a flat value map. */
    private isVisible;
    /**
     * Recursively filter a control tree by evaluating each control's
     * `visibleWhen` against the current values. Folders that become empty
     * after filtering their children are pruned.
     *
     * KNOWN LIMITATION — folder collapsed state across hide/show cycles:
     * Folder open/closed state lives in `Folder`'s local `useState`, not in
     * the store. When a folder's `visibleWhen` fails, its DOM node unmounts
     * and that local state is lost. Re-showing the folder mounts a fresh
     * instance with `defaultOpen`, so a user-collapsed folder will re-open
     * after a visibility cycle. Sibling visibility changes do NOT trigger
     * this (motion.div keys are stable by path), only the wrapped folder
     * itself hiding. This is a pre-existing architectural constraint of
     * DialKit's folder state model, not introduced by this feature — any
     * mechanism that unmounts a folder would behave the same. Lifting
     * folder state into the store is a possible follow-up.
     */
    private filterByVisibility;
    /**
     * Cheap structural comparison used to decide whether visibility flipped
     * after an updateValue. We only care about the set of visible paths —
     * labels/options/etc can't change between snapshots of the same tree.
     */
    private sameControlPaths;
}
declare const DialStore: DialStoreClass;

interface UseDialOptions {
    id?: string;
    persist?: DialKitPersistOptions;
    onAction?: (action: string) => void;
    shortcuts?: Record<string, ShortcutConfig>;
    /**
     * Optional grouping key. Panels sharing the same non-empty `group` render as
     * collapsible sections inside one merged shell (see `DialRoot`). Omit for an
     * independent standalone panel — the historical default.
     */
    group?: string;
    /**
     * Initial open state for this panel's folder. Defaults to open. Most useful
     * for a grouped panel that should start collapsed as a section inside the
     * merged shell.
     */
    defaultOpen?: boolean;
}
interface DialKitController<T extends DialConfig> {
    values: ResolvedValues<T>;
    setValue: (path: string, value: DialValue) => void;
    setValues: (values: DialKitValueUpdates<T>) => void;
    resetValues: () => void;
    getValues: () => ResolvedValues<T>;
}
declare function useDialKit<T extends DialConfig>(name: string, config: T, options?: UseDialOptions): ResolvedValues<T>;
declare function useDialKitController<T extends DialConfig>(name: string, config: T, options?: UseDialOptions): DialKitController<T>;

type DialPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
type DialMode = 'popover' | 'inline';
type DialTheme = 'light' | 'dark' | 'system';
/**
 * First-level folder behavior. `'independent'` (default) keeps each top-level
 * folder open state isolated. `'accordion'` allows only one top-level folder
 * open at a time. Nested folders are unaffected.
 */
type FolderMode = 'independent' | 'accordion';
interface DialRootProps {
    position?: DialPosition;
    defaultOpen?: boolean;
    mode?: DialMode;
    theme?: DialTheme;
    productionEnabled?: boolean;
    /** See {@link FolderMode}. */
    folderMode?: FolderMode;
    onOpenChange?: (open: boolean) => void;
    /**
     * Restrict which registered panels this root renders. Lets multiple
     * `DialRoot` instances split the same store — e.g. one popover root showing
     * only ungrouped panels, another inline root showing only a named group.
     * - `{ ungrouped: true }` — render only panels with no `group`.
     * - `{ groups: ['X'] }` — render only panels in the listed groups.
     * Both may be combined (OR). Omit to render every panel (the default).
     */
    include?: {
        groups?: string[];
        ungrouped?: boolean;
    };
}
declare function DialRoot({ position, defaultOpen, mode, theme, productionEnabled, folderMode, onOpenChange, include }: DialRootProps): react_jsx_runtime.JSX.Element | null;

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
    /**
     * Display name for the clip's bar. Defaults to the config key, prettified.
     * Set this when the key is an opaque identifier — keying clips by a stable
     * record id keeps edits attached across renames and reordering, but that id
     * is not something anyone wants to read on a timeline.
     */
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
}

type UseDialTimelineOptions = DialTimelineOptions;
declare function useDialTimeline<T extends TimelineConfig>(name: string, config: T, options?: UseDialTimelineOptions): DialTimelineValues<T>;

interface DialTimelineProps {
    theme?: DialTheme;
    /** Initial dock visibility. Expansion is controlled separately by defaultOpen. */
    defaultVisible?: boolean;
    /** Controlled dock visibility. */
    visible?: boolean;
    onVisibilityChange?: (visible: boolean) => void;
    defaultOpen?: boolean;
    productionEnabled?: boolean;
}
declare const DialTimeline: react.NamedExoticComponent<DialTimelineProps>;

interface ControlRendererProps {
    panelId: string;
    controls: ControlMeta[];
    values: Record<string, DialValue>;
    /** Optional timeline-owned duration rendered inside the transition editor. */
    transitionDuration?: {
        value: number;
        onChange: (value: number) => void;
        min?: number;
        max?: number;
        step?: number;
    };
    /**
     * Opt-in enter/exit animation for each rendered control (used so
     * conditionally-visible controls animate in/out when their `visibleWhen`
     * rule flips). Defaults to false so callers like the Timeline clip
     * popover stay vanilla — no motion wrapper, no AnimatePresence.
     */
    animateControls?: boolean;
    /**
     * Path of the currently-open top-level (depth 0) folder when the caller is
     * running accordion mode. Only consulted when `onAccordionToggle` is also
     * provided; nested folders (depth > 0) always stay independent.
     */
    accordionOpenPath?: string | null;
    /** Fired when a depth-0 folder is toggled in accordion mode. Receives the folder's path and its requested next open state. */
    onAccordionToggle?: (path: string, next: boolean) => void;
}
declare function ControlRenderer({ panelId, controls, values, transitionDuration, animateControls, accordionOpenPath, onAccordionToggle, }: ControlRendererProps): react_jsx_runtime.JSX.Element;

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
}
declare function Slider({ label, value, onChange, min, max, step, unit, shortcut, shortcutActive, }: SliderProps): react_jsx_runtime.JSX.Element;

interface ToggleProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    shortcut?: ShortcutConfig;
    shortcutActive?: boolean;
}
declare function Toggle({ label, checked, onChange, shortcut, shortcutActive }: ToggleProps): react_jsx_runtime.JSX.Element;

interface FolderProps {
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
    isRoot?: boolean;
    inline?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    toolbar?: ReactNode;
    /**
     * Controlled open state. When provided, the folder derives its open state
     * from this prop instead of internal state, and `onToggle` is called on
     * header clicks instead of mutating local state. Used by `Panel` to drive
     * accordion behavior across first-level folders. Omit for the default
     * uncontrolled behavior.
     */
    open?: boolean;
    /** Toggle handler for controlled mode. Receives the requested next state. */
    onToggle?: (next: boolean) => void;
    /**
     * Vertical slack (px) added to the measured content height when sizing the
     * root panel. The measurement uses offsetHeight, which excludes margins that
     * collapse through the content chain, so this offset covers that gap and
     * prevents a spurious scrollbar. Defaults to 10 for a single-panel shell; a
     * merged shell sets it a little higher (~12) because each stacked section
     * folder contributes outer margins that escape the measurement.
     */
    panelHeightOffset?: number;
}
declare function Folder({ title, children, defaultOpen, isRoot, inline, onOpenChange, toolbar, open, onToggle, panelHeightOffset }: FolderProps): react_jsx_runtime.JSX.Element;

interface ButtonGroupProps {
    buttons: Array<{
        label: string;
        onClick: () => void;
    }>;
}
declare function ButtonGroup({ buttons }: ButtonGroupProps): react_jsx_runtime.JSX.Element;

interface SpringControlProps {
    panelId: string;
    path: string;
    label: string;
    spring: SpringConfig;
    onChange: (spring: SpringConfig) => void;
}
declare function SpringControl({ panelId, path, label, spring, onChange }: SpringControlProps): react_jsx_runtime.JSX.Element;

interface SpringVisualizationProps {
    spring: SpringConfig;
    isSimpleMode: boolean;
}
declare function SpringVisualization({ spring, isSimpleMode }: SpringVisualizationProps): react_jsx_runtime.JSX.Element;

interface TransitionControlProps {
    panelId: string;
    path: string;
    label: string;
    value: TransitionConfig;
    onChange: (value: TransitionConfig) => void;
    /** Hide duration sliders when something else owns the duration (e.g. a timeline clip bar). */
    hideDuration?: boolean;
    /** Route duration edits through an external owner while keeping this control's layout. */
    durationControl?: {
        value: number;
        onChange: (value: number) => void;
        min?: number;
        max?: number;
        step?: number;
    };
}
declare function TransitionControl({ panelId, path, label, value, onChange, hideDuration, durationControl, }: TransitionControlProps): react_jsx_runtime.JSX.Element;

interface EasingVisualizationProps {
    easing: EasingConfig;
}
declare function EasingVisualization({ easing }: EasingVisualizationProps): react_jsx_runtime.JSX.Element;

interface TextControlProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}
declare function TextControl({ label, value, onChange, placeholder }: TextControlProps): react_jsx_runtime.JSX.Element;

type SelectOption = string | {
    value: string;
    label: string;
};
interface SelectControlProps {
    label: string;
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
}
declare function SelectControl({ label, value, options, onChange }: SelectControlProps): react_jsx_runtime.JSX.Element;

interface ColorControlProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}
declare function ColorControl({ label, value, onChange }: ColorControlProps): react_jsx_runtime.JSX.Element;

interface PresetManagerProps {
    panelId: string;
    presets: Preset[];
    activePresetId: string | null;
    onAdd: () => void;
}
declare function PresetManager({ panelId, presets, activePresetId, onAdd }: PresetManagerProps): react_jsx_runtime.JSX.Element;

interface ShortcutsMenuProps {
    panelId: string;
}
declare function ShortcutsMenu({ panelId }: ShortcutsMenuProps): react_jsx_runtime.JSX.Element | null;

export { type ActionConfig, ButtonGroup, type ColorConfig, ColorControl, type ControlMeta, ControlRenderer, type ControlWithVisibility, type DialConfig, type DialKitController, type DialKitPersistOptions, type DialKitValueUpdates, type DialMode, type DialPosition, DialRoot, DialStore, type DialTheme, DialTimeline, type DialTimelineProps, type DialTimelineValues, type DialValue, type EasingConfig, EasingVisualization, Folder, type FolderMode, type PanelConfig, type Preset, PresetManager, type ResolvedValues, type SelectConfig, SelectControl, type ShortcutConfig, type ShortcutInteraction, type ShortcutMode, ShortcutsMenu, Slider, type SpringConfig, SpringControl, SpringVisualization, type TextConfig, TextControl, type TimelineClipConfig, type TimelineClipCss, type TimelineClipLoop, type TimelineClipMeta, type TimelineClipTrackMeta, type TimelineClipValues, type TimelineConfig, type TimelineGroupConfig, type TimelineGroupValues, type TimelineMeta, type TimelinePropConfig, type TimelinePropStepConfig, type TimelineStepConfig, type TimelineStepValues, TimelineStore, type TimelineTransport, Toggle, type TransitionConfig, TransitionControl, type UseDialOptions, type UseDialTimelineOptions, type VisibleWhen, type VisibleWhenValue, formatClock, unwrapVisibility, useDialKit, useDialKitController, useDialTimeline, withVisibility };
