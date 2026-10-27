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
/** The control inside a {@link withVisibility} wrapper; any other value as is. */
declare function unwrapVisibility(value: DialConfig[string]): DialConfig[string];
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
type Listener = () => void;
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
declare function resolveDialValues<T extends DialConfig>(config: T, flatValues: Record<string, DialValue>): ResolvedValues<T>;
declare function flattenDialValueUpdates<T extends DialConfig>(config: T, updates: DialKitValueUpdates<T>): Record<string, DialValue>;
/** Folder metadata such as `_collapsed` configures the folder and is not a value. */
declare function isFolderMetaKey(key: string): boolean;
declare function isLeafConfigValue(value: unknown): boolean;
declare function isSpringConfigValue(value: unknown): value is SpringConfig;
declare function isEasingConfigValue(value: unknown): value is EasingConfig;
declare function isHexColor(value: string): boolean;
/** camelCase → Title Case, the label rule used everywhere a key becomes UI text. */
declare function formatLabel(key: string): string;
/** Default slider step for a numeric range. */
declare function inferStep(min: number, max: number): number;
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
    subscribe(panelId: string, listener: Listener): () => void;
    subscribeGlobal(listener: Listener): () => void;
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
    subscribeTransitions(listener: Listener): () => void;
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

export { type ActionConfig, type AnchorConfig, type AnchorValue, type BackgroundConfig, type BackgroundGradient, type BackgroundMedia, type BackgroundMediaDisplay, type BackgroundMediaFit, type BackgroundMediaRatio, type BackgroundMode, type BackgroundValue, type BackgroundValueUpdate, type ColorConfig, type ControlMeta, type ControlWithVisibility, type CopiedTransition, type DialConfig, type DialKitPersistOptions, type DialKitValueUpdates, type DialPadAxis, type DialPadConfig, type DialPadValue, DialStore, type DialStorePanelOptions, type DialValue, type EasingConfig, type GradientHandles, type GradientPoint, type GradientShape, type GradientStop, type ImageConfig, type ImageOption, type PanelConfig, type Preset, type ResolvedValues, type SavedGradient, type SelectConfig, type SelectOption, type ShortcutConfig, type ShortcutInteraction, type ShortcutMode, type SpringConfig, type TextConfig, type TransitionConfig, type TransitionMode, type TransitionPreset, type VisibleWhen, type VisibleWhenValue, flattenDialValueUpdates, formatLabel, inferStep, isEasingConfigValue, isFolderMetaKey, isHexColor, isLeafConfigValue, isSpringConfigValue, resolveDialValues, unwrapVisibility, withVisibility };
