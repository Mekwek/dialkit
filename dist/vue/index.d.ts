import * as vue from 'vue';
import { ComputedRef, ObjectDirective, PropType, InjectionKey, Ref, VNodeChild } from 'vue';

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
    /**
     * How a value maps to the square. "linear" spreads the range evenly.
     * "centered" puts each axis's default in the middle: min to default fills
     * one half, default to max the other. Defaults to "linear".
     */
    mapping?: 'linear' | 'centered';
    /** Hides the label box left of the X and Y fields. */
    hideLabel?: boolean;
    /** Lets the X and Y fields drag left and right to change their value. */
    dragFields?: boolean;
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
/** A select option. `icon` is SVG path data in a 16 × 16 box, drawn as a
 *  1.5px stroke. A pill with an icon shows the icon instead of the label,
 *  and the label becomes its hover name. Dropdowns ignore it. */
type SelectOption$1 = string | {
    value: string;
    label: string;
    icon?: string;
};
type SelectConfig = {
    type: 'select';
    options: SelectOption$1[];
    default?: string;
    /** `'pills'` shows the options as one row of pills instead of a
     *  dropdown. React only; other renderers keep the dropdown. */
    display?: 'dropdown' | 'pills';
    /** Pills only: no row label; the pills fill the row and the label
     *  becomes the group's accessible name. */
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
type DialValue = number | boolean | string | SpringConfig | EasingConfig | ActionConfig | SelectConfig | ColorConfig | ImageConfig | TextConfig | DialPadConfig | DialPadValue;
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
 * A slider: `[default, min, max, step?, unit?]`. The unit shows after the
 * value, for example `[12, -180, 180, 1, '°']` shows "12°".
 */
type RangeConfig = [number, number, number, number?, string?];
/**
 * An X / Y / Z group: set `_fields: true` (or these options) on a folder.
 * See {@link ControlMeta.fields}.
 */
type FieldsConfig = {
    /** Most decimals a field shows. The value keeps its precision: only the
     *  display rounds, and a click on the number shows the exact value. */
    decimals?: number;
};
/**
 * A pad group: set `_pad: true` (or these options) on a folder whose first
 * two number children are a pair. The folder shows as one pad: X drives the
 * first value, Y the second, and each value keeps its own path.
 */
type PadGroupConfig = Pick<DialPadConfig, 'labels' | 'mapping' | 'hideLabel' | 'dragFields'>;
/**
 * An anchor grid: set `_anchor: true` on a folder whose first two select
 * children are a horizontal and a vertical choice. The folder keeps its
 * header, and the two selects show as one grid: the first select's options
 * are the columns, the second's are the rows. Each value keeps its own path.
 */
type AnchorGridConfig = Record<string, never>;
/** Folder keys that configure the folder instead of adding a control. */
declare const FOLDER_META_KEYS: readonly ["_anchor", "_collapsed", "_fields", "_hints", "_labels", "_pad", "_reset"];
type FolderMetaKey = (typeof FOLDER_META_KEYS)[number];
/**
 * Wraps a control with a visibility rule. The control is only added to the
 * panel's rendered tree when its rule passes. Re-evaluated on every value
 * change. Use the {@link withVisibility} helper instead of building this by hand.
 */
type ControlWithVisibility<T = DialValue | RangeConfig | DialConfig> = {
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
declare function withVisibility<T extends DialValue | RangeConfig | DialConfig>(control: T, rule: VisibleWhen): ControlWithVisibility<T>;
/** The union of all value shapes that can appear in a DialConfig entry. */
type DialConfigValue = DialValue | RangeConfig | DialConfig;
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
    [key: string]: DialValue | RangeConfig | DialConfig | ControlWithVisibility;
};
type ResolvedValues<T extends DialConfig> = {
    [K in keyof T]: T[K] extends ControlWithVisibility<infer U> ? U extends DialConfigValue ? ResolvedValues<{
        value: U;
    }>['value'] : never : T[K] extends RangeConfig ? number : T[K] extends SpringConfig ? TransitionConfig : T[K] extends EasingConfig ? TransitionConfig : T[K] extends SelectConfig ? string : T[K] extends ColorConfig | ImageConfig ? string : T[K] extends TextConfig ? string : T[K] extends DialPadConfig ? DialPadValue : T[K] extends DialConfig ? ResolvedValues<T[K]> : T[K];
};
type DialKitValueUpdates<T extends DialConfig> = {
    [K in keyof T as K extends FolderMetaKey ? never : K]?: T[K] extends ControlWithVisibility<infer U> ? U extends DialConfigValue ? DialKitValueUpdates<{
        value: U;
    }>['value'] : never : T[K] extends RangeConfig ? number : T[K] extends SpringConfig | EasingConfig ? TransitionConfig : T[K] extends ActionConfig ? never : T[K] extends SelectConfig | ColorConfig | ImageConfig | TextConfig ? string : T[K] extends DialPadConfig ? DialPadValue : T[K] extends DialConfig ? DialKitValueUpdates<T[K]> : T[K];
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
    type: 'slider' | 'toggle' | 'spring' | 'transition' | 'folder' | 'action' | 'select' | 'color' | 'image' | 'text' | 'pad';
    path: string;
    label: string;
    min?: number;
    max?: number;
    step?: number;
    /** Slider only: the unit shown after the value. See {@link RangeConfig}. */
    unit?: string;
    /**
     * Folder only: `_fields` shows the folder as an X / Y / Z group. Its label
     * and reset sit on a line above one row of short number fields. The number
     * children are the fields, and a boolean child is a lock icon.
     */
    fields?: FieldsConfig;
    /** Folder only: `_pad` shows the folder as one pad. See {@link PadGroupConfig}. */
    padGroup?: PadGroupConfig;
    /** Folder only: `_anchor` shows the folder's two selects as one grid. See {@link AnchorGridConfig}. */
    anchor?: AnchorGridConfig;
    /**
     * Folder only: `_reset` shows a reset icon in the folder's header. The
     * icon puts every value inside back to its default. With `_reset: 'key'`
     * it first runs the folder's action `key`, whose row is hidden. Here it
     * is the action's full path. Nested folders with their own `_reset`
     * reset too.
     */
    reset?: true | string;
    children?: ControlMeta[];
    defaultOpen?: boolean;
    options?: SelectOption$1[];
    /** Select only: how the options show. See {@link SelectConfig.display}. */
    display?: SelectConfig['display'];
    /** Select pills only. See {@link SelectConfig.hideLabel}. */
    hideLabel?: boolean;
    placeholder?: string;
    pad?: DialPadConfig;
    shortcut?: ShortcutConfig;
    /** Conditional visibility rule attached via {@link withVisibility}. */
    visibleWhen?: VisibleWhen;
    /** A short sentence about the control, from its folder's `_hints`. It shows as the control's hint. */
    hint?: string;
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
     * `false` hides the rename control and disables drag reorder in the
     * preset dropdown (a read-only host such as a share-link viewer).
     * Default `true`.
     */
    presetsEditable?: boolean;
    /**
     * `true` shows a lock toggle on each preset row (left of the trash). Off
     * by default; the host opts in per panel.
     */
    presetsLockable?: boolean;
};
type Listener = () => void;
type ActionListener = (action: string) => void;
type Preset = {
    id: string;
    name: string;
    values: Record<string, DialValue>;
    /**
     * Host-defined: the host decides what a locked preset refuses (theca: no
     * auto-save into it). The dropdown only shows the state, hides delete,
     * and toggles it.
     */
    locked?: boolean;
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
    /**
     * Optional grouping key. See {@link PanelConfig.group}.
     */
    group?: string;
    /**
     * `false` hides the rename control and disables drag reorder in the
     * preset dropdown (a read-only host such as a share-link viewer).
     * Default `true`.
     */
    presetsEditable?: boolean;
    /**
     * `true` shows a lock toggle on each preset row (left of the trash). Off
     * by default; the host opts in per panel.
     */
    presetsLockable?: boolean;
};
declare class DialStoreClass {
    private panelOpenListeners;
    private panelOpenStates;
    private panels;
    private controlsByPanel;
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
    /** Host values a reset returns to, over the defaults. See setResetValues. */
    private hostResetValues;
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
    /**
     * Parsed configs per panel id, keyed by the serialized config + shortcuts.
     * Hosts that swap between a few configs (layout presets) re-register the
     * same shape repeatedly; the parsed tree is immutable after parse (the
     * filtered tree and value maps are fresh copies), so it can be shared.
     */
    private parsedConfigs;
    /** Cache key of the config each registered panel currently holds. */
    private panelConfigKeys;
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
     * The values a reset returns to, by path, when they are not the config's
     * defaults: for example when the host passes saved values as defaults, so
     * a panel opens on them, but a reset goes back to its own defaults. Each
     * call replaces the last. Once set, a reset and hasChanges use only these
     * paths: a path left out is one no reset returns to a default.
     */
    setResetValues(panelId: string, values: Record<string, DialValue>): void;
    /** The value a reset puts at each path: setResetValues, else defaults. */
    private resetTargets;
    /** The value a reset puts at `path`. */
    getResetValue(panelId: string, path: string): DialValue | undefined;
    /** Put the given paths back to their reset values. */
    resetPaths(panelId: string, paths: string[]): void;
    /**
     * Run a folder's section reset (see {@link ControlMeta.reset}): every
     * value inside goes back to its reset value. A folder with a reset action
     * runs the action first, so it can reset values its own way, for example
     * with an animation, and the values it did not reset follow. Nested
     * folders with their own reset go last, and find nothing left to change
     * where the action already reset them. Values inside a nested folder
     * without its own reset belong to the parent.
     */
    resetSection(panelId: string, path: string): void;
    /**
     * True when a value the folder's section reset would return differs from
     * its reset value: every value inside, nested folders and hidden rows
     * included, the same values resetSection resets.
     */
    sectionHasChanges(panelId: string, path: string): boolean;
    /** True when a value at one of the paths differs from its reset value. */
    hasChanges(panelId: string, paths: string[]): boolean;
    updateSpringMode(panelId: string, path: string, mode: 'simple' | 'advanced'): void;
    getSpringMode(panelId: string, path: string): 'simple' | 'advanced';
    updateTransitionMode(panelId: string, path: string, mode: 'easing' | 'simple' | 'advanced'): void;
    getTransitionMode(panelId: string, path: string): 'easing' | 'simple' | 'advanced';
    getValue(panelId: string, path: string): DialValue | undefined;
    getValues(panelId: string): Record<string, DialValue>;
    getPanels(kind?: 'panel' | 'timeline'): PanelConfig[];
    getPanel(id: string): PanelConfig | undefined;
    subscribe(panelId: string, listener: Listener): () => void;
    subscribeGlobal(listener: Listener): () => void;
    subscribeActions(panelId: string, listener: ActionListener): () => void;
    triggerAction(panelId: string, path: string): void;
    savePreset(panelId: string, name: string): string;
    loadPreset(panelId: string, presetId: string): void;
    deletePreset(panelId: string, presetId: string): void;
    renamePreset(panelId: string, presetId: string, name: string): void;
    setPresetLocked(panelId: string, presetId: string, locked: boolean): void;
    reorderPresets(panelId: string, orderedIds: string[]): void;
    getPresets(panelId: string): Preset[];
    getActivePresetId(panelId: string): string | null;
    isPresetsEditable(panelId: string): boolean;
    isPresetsLockable(panelId: string): boolean;
    clearActivePreset(panelId: string): void;
    /** Presets changed without a value change: bump the snapshot so subscribers re-render. */
    private refreshPresetSnapshot;
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
    private notify;
    private notifyGlobal;
    /**
     * Parse through the per-panel cache. The key is computed first and the
     * result is only stored after a successful parse, so an invalid config
     * still throws before any store mutation.
     */
    private parseCached;
    /** Compile controls, defaults, and the lookup index in one walk. */
    private parseConfig;
    private inferRange;
    private normalizePreservedValue;
    /**
     * Rebuild the filtered control tree against the panel's current values.
     * When the set of visible paths changed, swap `panel.controls` and bump
     * the global listeners: `getPanels()` snapshots are cached by identity,
     * so a per-panel notify alone would leave DialRoot rendering the old tree.
     */
    private refilterVisibility;
}
declare const DialStore: DialStoreClass;

interface UseDialOptions {
    id?: string;
    defaultCollapsed?: boolean;
    persist?: DialKitPersistOptions;
    onAction?: (action: string) => void;
    shortcuts?: Record<string, ShortcutConfig>;
}
interface DialKitController<T extends DialConfig> {
    values: ComputedRef<ResolvedValues<T>>;
    setValue: (path: string, value: DialValue) => void;
    setValues: (values: DialKitValueUpdates<T>) => void;
    resetValues: () => void;
    setOpen: (open: boolean) => void;
    getOpen: () => boolean | undefined;
    getValues: () => ResolvedValues<T>;
}
declare function useDialKit<T extends DialConfig>(name: string, config: T, options?: UseDialOptions): ComputedRef<ResolvedValues<T>>;
declare function useDialKitController<T extends DialConfig>(name: string, config: T, options?: UseDialOptions): DialKitController<T>;

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
     * Settle window (seconds) past the bar's end — motion the host declares
     * keeps running after the clip's own duration (e.g. staggered elements
     * finishing their flight). Read-only: no dial, no popover control. The
     * timeline's end covers `at + duration + tail`, and single-track mode
     * draws it as a fading tail behind the following bars.
     */
    tail?: number;
    /**
     * Display name for the clip's bar. Defaults to the config key, prettified.
     * Set this when the key is an opaque identifier — keying clips by a stable
     * record id keeps edits attached across renames and reordering, but that id
     * is not something anyone wants to read on a timeline.
     */
    label?: string;
    /**
     * Single track: puts the clip on its own row below the main lane. Clips
     * sharing a `lane` value share that row (no overlap within it); rows are
     * ordered by first appearance in the config. Lane clips never clamp or
     * snap against main-lane clips (and vice versa), never take the
     * `pinStart` pin, and count toward the timeline's end like any clip.
     * Ignored in rows mode, where every clip has its own row anyway.
     */
    lane?: string;
    /** Row label for the clip's `lane`. Falls back to the clip's `label`. */
    laneLabel?: string;
    /**
     * Single track: draws the bar as three parts — `in` (seconds), idle (the
     * rest), `out` (seconds). Resizing either edge changes only the idle part;
     * the bar can never be shorter than `in + out`.
     */
    segments?: TimelineClipSegments;
    /**
     * Hints for the clip's popover controls, by key: `duration`, `transition`,
     * or a `from` / `to` value. Each shows while the hint key (I) is held over
     * its control. `duration` replaces the curve's own Duration hint.
     */
    hints?: Record<string, string>;
};
/** The fixed in/out parts of a segmented clip, in seconds. */
type TimelineClipSegments = {
    in: number;
    out: number;
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
     * `'single'`: every clip shares ONE lane — no overlap (drags and resizes
     * clamp against neighbors), labels drawn inside the bars, `tail` windows
     * rendered. Simple from/to clips only. Defaults to `'rows'` (one lane per
     * clip, the classic dock).
     */
    track?: 'rows' | 'single';
    /**
     * Single track only: hold the opening bar's start at wherever it begins.
     * That bar cannot be dragged along the lane and loses its start handle,
     * so the timeline can never open with a lead gap. Its end handle still
     * resizes it, and reordering still works — whichever bar ends up first
     * inherits the pin. Defaults to false.
     */
    pinStart?: boolean;
    /**
     * `false` hides the rename control and disables drag reorder in the
     * preset dropdown (a read-only host such as a share-link viewer).
     * Default `true`.
     */
    presetsEditable?: boolean;
    /**
     * `true` shows a lock toggle on each preset row (left of the trash). Off
     * by default; the host opts in per panel.
     */
    presetsLockable?: boolean;
    /**
     * Called with a clip's key when its bar is clicked (pressed and released
     * without dragging past the click threshold). Fires for every clip,
     * before the dock's own click handling (the clip editor popover). React
     * dock only for now. To mark a clip as selected, name it with
     * `TimelineStore.setHighlight(id, key)` — the same edit highlight the
     * single track already draws.
     */
    onClipClick?: (key: string) => void;
}

type UseDialTimelineOptions = DialTimelineOptions;
declare function useDialTimeline<T extends TimelineConfig>(name: string, config: T, options?: UseDialTimelineOptions): ComputedRef<DialTimelineValues<T>>;

type DialPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
type DialMode = 'popover' | 'inline';
type DialTheme = 'light' | 'dark' | 'system';
declare const DialRoot: vue.DefineComponent<vue.ExtractPropTypes<{
    position: {
        type: () => DialPosition;
        default: string;
    };
    defaultOpen: {
        type: BooleanConstructor;
        default: boolean;
    };
    mode: {
        type: () => DialMode;
        default: string;
    };
    theme: {
        type: () => DialTheme;
        default: string;
    };
    productionEnabled: {
        type: BooleanConstructor;
        default: boolean;
    };
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}> | null, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, "openChange"[], "openChange", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    position: {
        type: () => DialPosition;
        default: string;
    };
    defaultOpen: {
        type: BooleanConstructor;
        default: boolean;
    };
    mode: {
        type: () => DialMode;
        default: string;
    };
    theme: {
        type: () => DialTheme;
        default: string;
    };
    productionEnabled: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & Readonly<{
    onOpenChange?: ((...args: any[]) => any) | undefined;
}>, {
    defaultOpen: boolean;
    mode: DialMode;
    position: DialPosition;
    theme: DialTheme;
    productionEnabled: boolean;
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

interface DialKitDirectiveOptions {
    position?: DialPosition;
    defaultOpen?: boolean;
    mode?: DialMode;
    onOpenChange?: (open: boolean) => void;
}
type DialKitDirectiveValue = DialMode | DialKitDirectiveOptions | undefined;
declare const vDialKit: ObjectDirective<HTMLElement, DialKitDirectiveValue>;

declare const DialTimeline: vue.DefineComponent<vue.ExtractPropTypes<{
    theme: {
        type: PropType<DialTheme>;
        default: string;
    };
    defaultVisible: {
        type: BooleanConstructor;
        default: boolean;
    };
    visible: {
        type: PropType<boolean | undefined>;
        default: undefined;
    };
    onVisibilityChange: PropType<(visible: boolean) => void>;
    defaultOpen: {
        type: BooleanConstructor;
        default: boolean;
    };
    productionEnabled: {
        type: BooleanConstructor;
        default: boolean;
    };
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}> | null, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, {}, string, vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    theme: {
        type: PropType<DialTheme>;
        default: string;
    };
    defaultVisible: {
        type: BooleanConstructor;
        default: boolean;
    };
    visible: {
        type: PropType<boolean | undefined>;
        default: undefined;
    };
    onVisibilityChange: PropType<(visible: boolean) => void>;
    defaultOpen: {
        type: BooleanConstructor;
        default: boolean;
    };
    productionEnabled: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & Readonly<{}>, {
    defaultOpen: boolean;
    theme: DialTheme;
    visible: boolean | undefined;
    productionEnabled: boolean;
    defaultVisible: boolean;
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

interface ShortcutState {
    activePanelId: Ref<string | null>;
    activePath: Ref<string | null>;
}
declare const ShortcutKey: InjectionKey<ShortcutState>;
declare function useShortcutContext(): ShortcutState;
declare const ShortcutListener: vue.DefineComponent<{}, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>[] | undefined, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, {}, string, vue.PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

declare const ShortcutsMenu: vue.DefineComponent<vue.ExtractPropTypes<{
    panelId: {
        type: PropType<string>;
        required: true;
    };
}>, () => (vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}> | null)[] | null, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, {}, string, vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    panelId: {
        type: PropType<string>;
        required: true;
    };
}>> & Readonly<{}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

declare const Slider: vue.DefineComponent<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: NumberConstructor;
        required: true;
    };
    min: {
        type: NumberConstructor;
        required: false;
    };
    max: {
        type: NumberConstructor;
        required: false;
    };
    step: {
        type: NumberConstructor;
        required: false;
    };
    unit: {
        type: StringConstructor;
        required: false;
    };
    shortcut: {
        type: PropType<ShortcutConfig>;
        default: undefined;
    };
    shortcutActive: {
        type: BooleanConstructor;
        default: boolean;
    };
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, "change"[], "change", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: NumberConstructor;
        required: true;
    };
    min: {
        type: NumberConstructor;
        required: false;
    };
    max: {
        type: NumberConstructor;
        required: false;
    };
    step: {
        type: NumberConstructor;
        required: false;
    };
    unit: {
        type: StringConstructor;
        required: false;
    };
    shortcut: {
        type: PropType<ShortcutConfig>;
        default: undefined;
    };
    shortcutActive: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {
    shortcut: ShortcutConfig;
    shortcutActive: boolean;
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

declare const Toggle: vue.DefineComponent<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    checked: {
        type: BooleanConstructor;
        required: true;
    };
    shortcut: {
        type: PropType<ShortcutConfig>;
        default: undefined;
    };
    shortcutActive: {
        type: BooleanConstructor;
        default: boolean;
    };
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, "change"[], "change", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    checked: {
        type: BooleanConstructor;
        required: true;
    };
    shortcut: {
        type: PropType<ShortcutConfig>;
        default: undefined;
    };
    shortcutActive: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {
    shortcut: ShortcutConfig;
    shortcutActive: boolean;
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

declare const Folder: vue.DefineComponent<vue.ExtractPropTypes<{
    title: {
        type: StringConstructor;
        required: true;
    };
    open: {
        type: BooleanConstructor;
        default: undefined;
    };
    defaultOpen: {
        type: BooleanConstructor;
        default: boolean;
    };
    isRoot: {
        type: BooleanConstructor;
        default: boolean;
    };
    inline: {
        type: BooleanConstructor;
        default: boolean;
    };
    toolbar: {
        type: PropType<(() => VNodeChild) | null>;
        required: false;
        default: null;
    };
    panelHeightOffset: {
        type: NumberConstructor;
        default: number;
    };
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, "openChange"[], "openChange", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    title: {
        type: StringConstructor;
        required: true;
    };
    open: {
        type: BooleanConstructor;
        default: undefined;
    };
    defaultOpen: {
        type: BooleanConstructor;
        default: boolean;
    };
    isRoot: {
        type: BooleanConstructor;
        default: boolean;
    };
    inline: {
        type: BooleanConstructor;
        default: boolean;
    };
    toolbar: {
        type: PropType<(() => VNodeChild) | null>;
        required: false;
        default: null;
    };
    panelHeightOffset: {
        type: NumberConstructor;
        default: number;
    };
}>> & Readonly<{
    onOpenChange?: ((...args: any[]) => any) | undefined;
}>, {
    defaultOpen: boolean;
    open: boolean;
    isRoot: boolean;
    inline: boolean;
    toolbar: (() => VNodeChild) | null;
    panelHeightOffset: number;
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

type ButtonGroupButton = {
    label: string;
    onClick: () => void;
};
declare const ButtonGroup: vue.DefineComponent<vue.ExtractPropTypes<{
    buttons: {
        type: PropType<ButtonGroupButton[]>;
        required: true;
    };
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, {}, string, vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    buttons: {
        type: PropType<ButtonGroupButton[]>;
        required: true;
    };
}>> & Readonly<{}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

declare const SpringControl: vue.DefineComponent<vue.ExtractPropTypes<{
    panelId: {
        type: StringConstructor;
        required: true;
    };
    path: {
        type: StringConstructor;
        required: true;
    };
    label: {
        type: StringConstructor;
        required: true;
    };
    spring: {
        type: PropType<SpringConfig>;
        required: true;
    };
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, "change"[], "change", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    panelId: {
        type: StringConstructor;
        required: true;
    };
    path: {
        type: StringConstructor;
        required: true;
    };
    label: {
        type: StringConstructor;
        required: true;
    };
    spring: {
        type: PropType<SpringConfig>;
        required: true;
    };
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

declare const SpringVisualization: vue.DefineComponent<vue.ExtractPropTypes<{
    spring: {
        type: PropType<SpringConfig>;
        required: true;
    };
    isSimpleMode: {
        type: BooleanConstructor;
        required: true;
    };
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, {}, string, vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    spring: {
        type: PropType<SpringConfig>;
        required: true;
    };
    isSimpleMode: {
        type: BooleanConstructor;
        required: true;
    };
}>> & Readonly<{}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

interface TransitionDurationControl {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
}
declare const TransitionControl: vue.DefineComponent<vue.ExtractPropTypes<{
    panelId: {
        type: StringConstructor;
        required: true;
    };
    path: {
        type: StringConstructor;
        required: true;
    };
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: PropType<TransitionConfig>;
        required: true;
    };
    hideDuration: {
        type: BooleanConstructor;
        default: boolean;
    };
    durationControl: PropType<TransitionDurationControl>;
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, "change"[], "change", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    panelId: {
        type: StringConstructor;
        required: true;
    };
    path: {
        type: StringConstructor;
        required: true;
    };
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: PropType<TransitionConfig>;
        required: true;
    };
    hideDuration: {
        type: BooleanConstructor;
        default: boolean;
    };
    durationControl: PropType<TransitionDurationControl>;
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {
    hideDuration: boolean;
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

type BezierPoints = EasingConfig['ease'];

interface EasingVisualizationProps {
    easing: EasingConfig;
    /** Enables pointer and keyboard editing of the two control points. */
    onChange?: (ease: BezierPoints) => void;
}

declare const EasingVisualization: vue.DefineComponent<vue.ExtractPropTypes<{
    easing: {
        type: PropType<EasingConfig>;
        required: true;
    };
    onChange: PropType<EasingVisualizationProps["onChange"]>;
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, {}, string, vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    easing: {
        type: PropType<EasingConfig>;
        required: true;
    };
    onChange: PropType<EasingVisualizationProps["onChange"]>;
}>> & Readonly<{}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

declare const TextControl: vue.DefineComponent<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: StringConstructor;
        required: true;
    };
    placeholder: {
        type: StringConstructor;
        required: false;
    };
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, "change"[], "change", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: StringConstructor;
        required: true;
    };
    placeholder: {
        type: StringConstructor;
        required: false;
    };
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

type SelectOption = string | {
    value: string;
    label: string;
};
declare const SelectControl: vue.DefineComponent<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: StringConstructor;
        required: true;
    };
    options: {
        type: PropType<SelectOption[]>;
        required: true;
    };
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, "change"[], "change", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: StringConstructor;
        required: true;
    };
    options: {
        type: PropType<SelectOption[]>;
        required: true;
    };
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

declare const ColorControl: vue.DefineComponent<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: StringConstructor;
        required: true;
    };
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, "change"[], "change", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: StringConstructor;
        required: true;
    };
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

declare const ImageControl: vue.DefineComponent<vue.ExtractPropTypes<{
    options: PropType<ImageOption[]>;
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: StringConstructor;
        required: true;
    };
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, "change"[], "change", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    options: PropType<ImageOption[]>;
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: StringConstructor;
        required: true;
    };
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

declare const DialPad: vue.DefineComponent<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: PropType<DialPadValue>;
        required: true;
    };
    x: PropType<DialPadAxis>;
    y: PropType<DialPadAxis>;
    labels: PropType<DialPadConfig["labels"]>;
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, "change"[], "change", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: PropType<DialPadValue>;
        required: true;
    };
    x: PropType<DialPadAxis>;
    y: PropType<DialPadAxis>;
    labels: PropType<DialPadConfig["labels"]>;
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

declare const PresetManager: vue.DefineComponent<vue.ExtractPropTypes<{
    panelId: {
        type: StringConstructor;
        required: true;
    };
    presets: {
        type: PropType<Preset[]>;
        required: true;
    };
    activePresetId: {
        type: PropType<string | null>;
        required: false;
        default: null;
    };
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, {}, string, vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    panelId: {
        type: StringConstructor;
        required: true;
    };
    presets: {
        type: PropType<Preset[]>;
        required: true;
    };
    activePresetId: {
        type: PropType<string | null>;
        required: false;
        default: null;
    };
}>> & Readonly<{}>, {
    activePresetId: string | null;
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

declare const ControlRenderer: vue.DefineComponent<vue.ExtractPropTypes<{
    panelId: {
        type: StringConstructor;
        required: true;
    };
    controls: {
        type: PropType<ControlMeta[]>;
        required: true;
    };
    values: {
        type: PropType<Record<string, DialValue>>;
        required: true;
    };
    transitionDuration: PropType<TransitionDurationControl>;
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, {}, string, vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    panelId: {
        type: StringConstructor;
        required: true;
    };
    controls: {
        type: PropType<ControlMeta[]>;
        required: true;
    };
    values: {
        type: PropType<Record<string, DialValue>>;
        required: true;
    };
    transitionDuration: PropType<TransitionDurationControl>;
}>> & Readonly<{}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

export { type ActionConfig, ButtonGroup, type ColorConfig, ColorControl, type ControlMeta, ControlRenderer, type ControlWithVisibility, type DialConfig, type DialKitController, type DialKitDirectiveOptions, type DialKitDirectiveValue, type DialKitPersistOptions, type DialKitValueUpdates, type DialMode, DialPad, type DialPadAxis, type DialPadConfig, type DialPadValue, type DialPosition, DialRoot, DialStore, type DialTheme, DialTimeline, type DialTimelineValues, type DialValue, type EasingConfig, EasingVisualization, Folder, type ImageConfig, ImageControl, type ImageOption, type PanelConfig, type Preset, PresetManager, type ResolvedValues, type SelectConfig, SelectControl, type ShortcutConfig, ShortcutKey, ShortcutListener, type ShortcutState, ShortcutsMenu, Slider, type SpringConfig, SpringControl, SpringVisualization, type TextConfig, TextControl, type TimelineClipConfig, type TimelineClipCss, type TimelineClipLoop, type TimelineClipValues, type TimelineConfig, type TimelineGroupConfig, type TimelineGroupValues, type TimelinePropConfig, type TimelinePropStepConfig, type TimelineStepConfig, type TimelineStepValues, Toggle, type TransitionConfig, TransitionControl, type UseDialOptions, type UseDialTimelineOptions, type VisibleWhen, type VisibleWhenValue, unwrapVisibility, useDialKit, useDialKitController, useDialTimeline, useShortcutContext, vDialKit, withVisibility };
