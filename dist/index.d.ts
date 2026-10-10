import * as react_jsx_runtime from 'react/jsx-runtime';
import * as react from 'react';
import { ReactNode } from 'react';

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
/**
 * Hints: set `_hints` on a folder (or the panel's root config) to a map from
 * a child key to a short sentence about that control. See
 * {@link ControlMeta.hint}.
 */
type HintsConfig = Record<string, string>;
/**
 * Labels: set `_labels` on a folder (or the panel's root config) to a map
 * from a child key to the text its row shows instead of the key's own
 * words. The key stays the control's path, so saved values do not move.
 */
type LabelsConfig = Record<string, string>;
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
    /**
     * A short sentence about the panel. It shows on the panel's header while
     * the hint key is held.
     */
    hint?: string;
};
type Listener$3 = () => void;
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
    /**
     * A short sentence about the panel. It shows on the panel's header while
     * the hint key is held.
     */
    hint?: string;
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
    subscribe(panelId: string, listener: Listener$3): () => void;
    subscribeGlobal(listener: Listener$3): () => void;
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
    /**
     * Optional grouping key. Panels sharing the same non-empty `group` render as
     * collapsible sections inside one merged shell (see `DialRoot`). Omit for an
     * independent standalone panel — the historical default.
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
    /**
     * A short sentence about the panel. It shows on the panel's header while
     * the hint key is held.
     */
    hint?: string;
}
interface DialKitController<T extends DialConfig> {
    values: ResolvedValues<T>;
    setValue: (path: string, value: DialValue) => void;
    setValues: (values: DialKitValueUpdates<T>) => void;
    resetValues: () => void;
    setOpen: (open: boolean) => void;
    getOpen: () => boolean | undefined;
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
}
declare function DialRoot({ position, defaultOpen, mode, theme, productionEnabled, folderMode, onOpenChange }: DialRootProps): react_jsx_runtime.JSX.Element | null;

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
    /** Read-only settle window (seconds) past the bar's end — motion the host
     * says keeps running after the clip's own duration. Drawn as a fading
     * tail in single-track mode and counted into the timeline's end. */
    tail?: number;
    /** Single track: the extra row this clip lives on (unset = main lane). */
    lane?: string;
    /** Single track: row label for `lane`. */
    laneLabel?: string;
    /** Single track: fixed in/out parts (seconds); resizing edits only idle. */
    segments?: {
        in: number;
        out: number;
    };
    /** The bar's hint, shown while the hint key is held over it. */
    hint?: string;
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
    /** All clips share ONE lane: no overlap (drags clamp against neighbors),
     * labels drawn inside the bars, tails rendered. Simple from/to clips
     * only — groups/steps/props fall back to row rendering. */
    singleTrack?: boolean;
    /**
     * Single track: the bar that OPENS the timeline holds its start. It
     * cannot be dragged along the lane and has no start handle, so the
     * timeline can never begin with a lead gap. Its end handle still works,
     * so its length stays editable, and reordering still works — whichever
     * bar ends up first inherits the pin.
     */
    pinStart?: boolean;
    /**
     * Single track: the key of the clip the HOST is currently editing, or
     * null. It is not the selection and not the playhead — it says which
     * version the panel is pointed at, which can be a different bar from
     * the one under the playhead. Set it with `setHighlight`, never through
     * the timeline config: it changes while the timeline runs, and the
     * config is rebuilt whenever the clip list changes.
     */
    highlightedClip?: string | null;
    /**
     * Called with the clip's key when a clip bar is clicked (pressed and
     * released under the drag threshold). Set through the hook's
     * `onClipClick` option; the React dock fires it.
     */
    onClipClick?: (key: string) => void;
};
type TimelineTransport = {
    time: number;
    playing: boolean;
    duration: number;
    /** Completed loop passes — keeps looping clips phase-continuous across
     * timeline wraps. Reset by seek/replay so scrubbing stays deterministic. */
    wraps: number;
};
type Listener$2 = () => void;
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
    setLoop(id: string, loop: boolean): void;
    /**
     * Name the clip the host is editing, or pass null to clear it. Store
     * state, not config state — `applyMeta` carries it across rebuilds.
     */
    setHighlight(id: string, clipKey: string | null): void;
    seek(id: string, time: number): void;
    getTransport(id: string): TimelineTransport;
    getTimeline(id: string): TimelineMeta | undefined;
    getTimelines(): TimelineMeta[];
    subscribe(id: string, listener: Listener$2): () => void;
    subscribeGlobal(listener: Listener$2): () => void;
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
     * or a `from` / `to` value. Each shows while the hint key (H) is held over
     * its control. `duration` replaces the curve's own Duration hint.
     */
    hints?: Record<string, string>;
    /** The clip bar's own hint, shown while the hint key (H) is held over it. */
    hint?: string;
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
    /** Renders an Export button in the dock actions row when set (host decides what export means). */
    onExport?: () => void;
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
        /** Replaces the curve's own Duration hint. */
        hint?: string;
    };
    /** Cap (seconds) on the settle a physics spring's params may produce —
     *  threaded into TransitionControl's physics sliders (see its
     *  physicsSettleCap doc). */
    physicsSettleCap?: number;
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
declare function ControlRenderer({ panelId, controls, values, transitionDuration, physicsSettleCap, animateControls, accordionOpenPath, onAccordionToggle, }: ControlRendererProps): react_jsx_runtime.JSX.Element;

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
    hint?: string;
}
declare function Slider({ label, value, onChange, min, max, step, unit, shortcut, shortcutActive, hint, }: SliderProps): react_jsx_runtime.JSX.Element;

interface FieldRowProps {
    panelId: string;
    control: ControlMeta;
    values: Record<string, DialValue>;
}
/**
 * An X / Y / Z group: a folder set with `_fields: true`. The label and its
 * reset sit on a line above one row of short number fields, with the lock at
 * the right end of that line. The
 * folder's number children are the fields. A boolean child is a lock: the
 * host decides what a lock does, this row only shows and switches it.
 */
declare function FieldRow({ panelId, control, values }: FieldRowProps): react_jsx_runtime.JSX.Element;

interface ToggleProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    shortcut?: ShortcutConfig;
    shortcutActive?: boolean;
    hint?: string;
}
declare function Toggle({ label, checked, onChange, shortcut, shortcutActive, hint }: ToggleProps): react_jsx_runtime.JSX.Element;

interface FolderProps {
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
    open?: boolean;
    isRoot?: boolean;
    inline?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    toolbar?: ReactNode;
    /** Shows a reset icon in a section header. See ControlMeta.reset. */
    onReset?: () => void;
    /** True when a value inside differs from its default. */
    changed?: boolean;
    /** Short text on the right of a section header, left of the arrow. */
    meta?: ReactNode;
    /** Buttons on the right of a section header, left of the arrow. */
    actions?: ReactNode;
    /**
     * A short sentence about the section. It shows while the hint key is held
     * over the header. A panel's own header, which closes the panel, has one
     * by default.
     */
    hint?: string;
}
declare function Folder({ title, children, open, defaultOpen, isRoot, inline, onOpenChange, toolbar, onReset, changed, meta, actions, hint }: FolderProps): react_jsx_runtime.JSX.Element;

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
    /** Shows a reset icon in the header. See Folder.onReset. */
    onReset?: () => void;
    /** True when the value differs from its default. */
    changed?: boolean;
}
declare function SpringControl({ panelId, path, label, spring, onChange, onReset, changed }: SpringControlProps): react_jsx_runtime.JSX.Element;

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
        /** Replaces the curve's own Duration hint, for the owner's duration. */
        hint?: string;
    };
    /**
     * Cap (seconds) on the settle time the PHYSICS values may produce — the
     * physics sliders clamp at the value where the derived settle meets it.
     * Evaluated against the CURRENT other two params on every move, so
     * changing one param moves the others' stopping points automatically.
     * The settle is not one-directional in every param (very low damping
     * wobbles long, very high damping crawls long), so the clamp searches
     * for the first crossing between the current value and the requested
     * one instead of assuming a fixed maximum. A move that REDUCES an
     * already-over settle is always allowed.
     */
    physicsSettleCap?: number;
    /** Shows a reset icon in the header. See Folder.onReset. */
    onReset?: () => void;
    /** True when the value differs from its default. */
    changed?: boolean;
    /**
     * Draws the control without its own header. A section whose only
     * control is this one uses its header instead.
     */
    bare?: boolean;
    /** A short sentence about the transition. See Folder.hint. */
    hint?: string;
}
declare function TransitionControl({ panelId, path, label, value, onChange, hideDuration, durationControl, physicsSettleCap, onReset, changed, bare, hint, }: TransitionControlProps): react_jsx_runtime.JSX.Element;

type BezierPoints = EasingConfig['ease'];

interface EasingVisualizationProps {
    easing: EasingConfig;
    /** Enables pointer and keyboard editing of the two control points. */
    onChange?: (ease: BezierPoints) => void;
}

declare function EasingVisualization(props: EasingVisualizationProps): react_jsx_runtime.JSX.Element;

interface TextControlProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    hint?: string;
}
declare function TextControl({ label, value, onChange, placeholder, hint }: TextControlProps): react_jsx_runtime.JSX.Element;

type SelectOption = string | {
    value: string;
    label: string;
    icon?: string;
};
interface SelectControlProps {
    label: string;
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    hint?: string;
}
declare function SelectControl({ label, value, options, onChange, hint }: SelectControlProps): react_jsx_runtime.JSX.Element;

type ColorControlProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
};

/** The color row, with its hint. */
declare function ColorControl({ hint, ...props }: ColorControlProps & {
    hint?: string;
}): react_jsx_runtime.JSX.Element;

type ImageControlProps = {
    label: string;
    value: string;
    options?: ImageOption[];
    onChange: (value: string) => void;
};

/** The image row, with its hint. */
declare function ImageControl({ hint, ...props }: ImageControlProps & {
    hint?: string;
}): react_jsx_runtime.JSX.Element;

type DialPadProps = Omit<DialPadConfig, 'type'> & {
    label: string;
    value: DialPadValue;
    onChange: (value: DialPadValue) => void;
};

/** The pad, with its hint. */
declare function DialPad({ hint, ...props }: DialPadProps & {
    hint?: string;
}): react_jsx_runtime.JSX.Element;

interface AnchorGridProps {
    panelId: string;
    label: string;
    /** The select whose options are the columns, left to right. */
    columns: ControlMeta;
    /** The select whose options are the rows, top to bottom. */
    rows: ControlMeta;
    values: Record<string, DialValue>;
    /** The folder's hint. It shows while the hint key is held over the grid or the header. */
    hint?: string;
}
/**
 * Two selects as one grid of dots: one dot per pair of options. A click on a
 * dot sets both selects. The picked cell holds a pill that slides to the
 * next pick, and a hover shows a faint pill and a brighter dot. Arrow keys
 * move the pick.
 */
declare function AnchorGrid({ panelId, label, columns, rows, values, hint }: AnchorGridProps): react_jsx_runtime.JSX.Element;

interface PresetManagerProps {
    panelId: string;
    presets: Preset[];
    activePresetId: string | null;
    onAdd: () => void;
    /** Extra class for the portal'd dropdown — the portal escapes the host's DOM
     *  context, so hosts (e.g. the timeline dock) need this to scope styling. */
    dropdownClassName?: string;
    /** What a preset is called in the hint: a version (default) or a sequence. */
    noun?: 'version' | 'sequence';
}
declare function PresetManager({ panelId, presets, activePresetId, onAdd, dropdownClassName, noun }: PresetManagerProps): react_jsx_runtime.JSX.Element;

interface ShortcutsMenuProps {
    panelId: string;
}
declare function ShortcutsMenu({ panelId }: ShortcutsMenuProps): react_jsx_runtime.JSX.Element | null;

interface EasingCurve {
    name: string;
    ease: BezierPoints;
}
/**
 * The default curves: named curves first (Arqé's, Movo's, then easing.dev's), then the
 * classic families in the order most tools list them. The classic values
 * are the defaults of Flow, the After Effects curve editor: its Ease curves
 * are After Effects' Easy Ease, and its Sine to Back curves are mostly the
 * easings.net values, with Back from Ceaser. Each curve appears once:
 * Arqé's Smooth is Quart In Out, and Movo's Bounce is close to Back Out.
 * easing.dev's Overshoot Out is Back Out.
 * Arqé's Ease and Ease Out are dropped as almost Expo In Out and Expo Out.
 * Arqé's Flow and Movo's Glide are dropped as almost Circ In Out, and
 * Movo's Linear as Linear.
 * Movo's Smooth is named Coast here.
 */
declare const EASING_CURVES: EasingCurve[];
interface SpringPreset {
    name: string;
    /** Physics: React Spring's tension and friction, with mass 1. */
    physics: Required<Pick<SpringConfig, 'stiffness' | 'damping' | 'mass'>>;
    /** Time: bounce from the damping ratio, and the duration whose settle
     *  time matches the physics spring's (transition-math). */
    time: Required<Pick<SpringConfig, 'visualDuration' | 'bounce'>>;
}
/**
 * The default springs: Default first, then React Spring's named configs
 * (its default renamed Crisp), then easing.dev's. Default is 150 / 30 / 1,
 * Theca's own spring. easing.dev's Slow is named Drift here, next to React
 * Spring's Slow, and its Bouyant is spelled Buoyant.
 *
 * Theca runs springs step by step, at most 1/60s per step. A spring
 * cancels more than all of its speed in one step when damping over mass
 * passes 60, and from 120 the motion never settles. React Spring's
 * Molasses (damping 120) keeps its settle time (2.23s) with damping 55.
 * easing.dev's Boingoingoing is left out: at 1/60s its Physics version
 * overshoots 178% instead of 79%, and its Time version grows without end.
 * The Time versions of Swift and Snap are a little longer than their
 * Physics settle times, for the same reason. The Physics sliders also stop
 * damping at 100.
 */
declare const SPRING_PRESETS: SpringPreset[];
type SpringMode = 'simple' | 'advanced';
/** A spring the user saved: a Time spring or a Physics spring. */
interface CustomSpring {
    name: string;
    mode: SpringMode;
    spring: SpringConfig;
}

type Listener$1 = () => void;
/** A copied transition: its value and the tab it was on. */
interface CopiedTransition {
    value: TransitionConfig;
    mode: 'easing' | 'simple' | 'advanced';
}
/**
 * The user's saved custom curves and springs, shared by every transition
 * control. Saved curves and springs live
 * here for the session; a host that stores them calls setCustomCurves and
 * setCustomSprings on load and listens with subscribe to save changes.
 */
declare class TransitionLibraryClass {
    private curves;
    private springs;
    private listeners;
    private copied;
    subscribe: (listener: Listener$1) => (() => void);
    private notify;
    getCustomCurves: () => EasingCurve[];
    setCustomCurves(curves: EasingCurve[]): void;
    /** Saves `ease` as "Custom N", the first free number, and returns it. */
    saveCustomCurve(ease: BezierPoints): EasingCurve;
    removeCustomCurve(name: string): void;
    getCustomSprings: () => CustomSpring[];
    setCustomSprings(springs: CustomSpring[]): void;
    /** Saves a Time or Physics spring as "Custom N", numbered per mode. */
    saveCustomSpring(spring: SpringConfig, mode: SpringMode): CustomSpring;
    removeCustomSpring(name: string, mode: SpringMode): void;
    /** The last copied transition, shared by every transition control. */
    getCopied: () => CopiedTransition | null;
    copyTransition(value: TransitionConfig, mode: CopiedTransition['mode']): void;
}
declare const TransitionLibrary: TransitionLibraryClass;

type Listener = () => void;
/** The hint on screen: its text, and the row it sits above. */
interface ShownHint {
    text: string;
    anchor: HTMLElement;
    box: HTMLElement;
}
/**
 * The hint key and the one hint on screen, shared by every control. While
 * the hint key (H) is held, the control under the pointer shows its hint.
 *
 * The store keeps the hovered rows itself, last entered last. A row inside
 * another row (a button in a header) is entered after it, so the innermost
 * one shows. One list, not a listener per row: two rows that each showed
 * their own hint on every change replaced each other without end.
 */
declare class HintStoreClass {
    private key;
    private keyHeld;
    private shown;
    private hovered;
    private listeners;
    subscribe: (listener: Listener) => (() => void);
    private notify;
    /** The key held to show hints. */
    getKey: () => string;
    setKey(key: string): void;
    isKeyHeld: () => boolean;
    setKeyHeld(held: boolean): void;
    getShown: () => ShownHint | null;
    /** The pointer entered `anchor`, a row with a hint. */
    enter(anchor: HTMLElement, text: string): void;
    /**
     * The pointer left `anchor`. Its hint stays while the key is held, so the
     * gap between two rows does not flicker: the next row replaces it.
     */
    leave(anchor: HTMLElement): void;
    /** A hovered row's text changed. */
    retext(anchor: HTMLElement, text: string): void;
    /** Shows `text` above `box`, the row; `anchor` is the element that asked. */
    show(text: string, anchor: HTMLElement, box?: HTMLElement): void;
    /** Hides the hint, if `anchor` is the one it points at. */
    hide(anchor?: HTMLElement): void;
}
declare const HintStore: HintStoreClass;

export { type ActionConfig, AnchorGrid, type AnchorGridConfig, ButtonGroup, type ColorConfig, ColorControl, type ControlMeta, ControlRenderer, type ControlWithVisibility, type CopiedTransition, type CustomSpring, type DialConfig, type DialKitController, type DialKitPersistOptions, type DialKitValueUpdates, type DialMode, DialPad, type DialPadAxis, type DialPadConfig, type DialPadProps, type DialPadValue, type DialPosition, DialRoot, DialStore, type DialTheme, DialTimeline, type DialTimelineProps, type DialTimelineValues, type DialValue, EASING_CURVES, type EasingConfig, type EasingCurve, EasingVisualization, FieldRow, type FieldsConfig, Folder, type FolderMode, HintStore, type HintsConfig, type ImageConfig, ImageControl, type ImageOption, type LabelsConfig, type PadGroupConfig, type PanelConfig, type Preset, PresetManager, type RangeConfig, type ResolvedValues, SPRING_PRESETS, type SelectConfig, SelectControl, type SelectOption$1 as SelectOption, type ShortcutConfig, type ShortcutInteraction, type ShortcutMode, ShortcutsMenu, Slider, type SpringConfig, SpringControl, type SpringMode, type SpringPreset, SpringVisualization, type TextConfig, TextControl, type TimelineClipConfig, type TimelineClipCss, type TimelineClipLoop, type TimelineClipMeta, type TimelineClipTrackMeta, type TimelineClipValues, type TimelineConfig, type TimelineGroupConfig, type TimelineGroupValues, type TimelineMeta, type TimelinePropConfig, type TimelinePropStepConfig, type TimelineStepConfig, type TimelineStepValues, TimelineStore, type TimelineTransport, Toggle, type TransitionConfig, TransitionControl, TransitionLibrary, type UseDialOptions, type UseDialTimelineOptions, type VisibleWhen, type VisibleWhenValue, formatClock, unwrapVisibility, useDialKit, useDialKitController, useDialTimeline, withVisibility };
