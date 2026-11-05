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
     * How a value maps to the square. `'linear'` spreads the range evenly.
     * `'centered'` puts each axis's default in the middle: min to default fills
     * one half, default to max the other. Defaults to `'linear'`.
     */
    mapping?: 'linear' | 'centered';
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
    /**
     * Omitted axes default to 'center'. `null` starts with no cell picked: the
     * grid highlights none, and a click on any cell picks it.
     */
    default?: Partial<AnchorValue> | null;
};

/**
 * The layer list control's value: the rows, top first, and the selected row.
 *
 * The app owns the layers. It writes the whole value (labels follow the
 * layers' own text), and the control writes back a new value for the three
 * things a user changes in place: the selection, a row's eye and the order.
 * Adding, duplicating and deleting create or remove layers, so the control
 * sends them as actions instead (`layerAction`), and the app writes the new
 * value.
 */
type LayerItem = {
    /** The layer's id: it stays with the row through reordering. */
    id: string;
    /** The row's name. */
    label: string;
    /** Hidden with its eye: the row shows its eye crossed out, and dims. */
    hidden?: boolean;
    /**
     * Not on the canvas right now for another reason the app knows (outside
     * its timing, for example), given as that reason. The row stays normal:
     * only its eye is less bright than on a row whose layer is on the canvas,
     * and the row's hint gives the reason.
     */
    offCanvas?: string;
};
type LayersValue = {
    items: LayerItem[];
    selected: string | null;
};
type LayersConfig = {
    type: 'layers';
    default?: LayersValue;
    /** The add button's text. Default "+ Add". */
    addLabel?: string;
    /** Turns the add button off; its text should say why. */
    addDisabled?: boolean;
    /** The text shown in place of the list when it has no rows. */
    empty?: string;
};
type LayerActionKind = 'add' | 'duplicate' | 'delete';

/**
 * The pictures control: rows of families that open like an accordion, each
 * showing its child presets as a grid of picture tiles.
 *
 * The app owns the presets. The control's value is the id of the selected
 * tile, and the control never changes it on its own: a click on a tile sends
 * `pictureAction(path, id)`, the app switches to that preset, then writes the
 * new value. The pictures themselves are the app's too: DialKit gives each
 * tile's picture box to the picture host (`setPictureHost`) and draws nothing
 * in it but a placeholder.
 */
type PictureItem = {
    /** The preset's id: the value while this tile is selected. Unique across every family. */
    id: string;
    /** The text under the tile's picture. */
    label: string;
    /** A short sentence about the preset, shown while the hint key is held. */
    hint?: string;
};
type PictureFamily = {
    id: string;
    /** The family row's text. */
    label: string;
    items: PictureItem[];
    /** A short sentence about the family, shown on its row while the hint key is held. */
    hint?: string;
};
type PicturesConfig = {
    type: 'pictures';
    families: PictureFamily[];
    /** The selected tile's id before the app writes one. Default `null`, no tile selected. */
    default?: string | null;
};
/** The selected tile's id, or `null` when no tile is selected. */
type PicturesValue = string | null;

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
/**
 * `icon` is SVG path data in a 24 × 24 box, or a 16 × 16 box with
 * `iconSize: 16`. Segmented controls show it in place of the label.
 */
type SelectOption = string | {
    value: string;
    label: string;
    icon?: string | string[];
    iconSize?: 16 | 24;
};
type SelectConfig = {
    type: 'select';
    options: SelectOption[];
    default?: string;
    /** `'segmented'` shows every option in one row instead of a dropdown. */
    display?: 'dropdown' | 'segmented';
    /** Segmented only: the options fill the row, and the label becomes the group's accessible name. */
    hideLabel?: boolean;
    /**
     * Dropdown only: a first row in the dropdown that adds an option, such as
     * an upload. `label` names it and `hint` is its hint. A click runs the
     * action `<path>.add`.
     */
    add?: SelectAddConfig;
};
type SelectAddConfig = {
    label: string;
    hint?: string;
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
type DialValue = number | boolean | string | SpringConfig | EasingConfig | ActionConfig | SelectConfig | ColorConfig | ImageConfig | TextConfig | DialPadConfig | DialPadValue | BackgroundConfig | BackgroundValue | AnchorConfig | AnchorValue | LayersConfig | LayersValue | PicturesConfig | null;
/**
 * Folder keys that configure the folder instead of adding a control:
 * `_collapsed`, `_fields`, `_reset`, `_hints` (a sentence per child key),
 * `_labels` (the text a child's row shows in place of its key's own words),
 * `_row` and `_inlineLabels` (see {@link RowConfig}), and `_pad` (see
 * {@link PadGroupConfig}).
 */
declare const FOLDER_META_KEYS: readonly ["_collapsed", "_fields", "_reset", "_hints", "_labels", "_row", "_inlineLabels", "_pad"];
/**
 * A row: set `_row: true` on a folder with two controls. The folder shows
 * no header; its two controls sit side by side, each with its label above
 * it, like Weight and Size in a type tool. Each value keeps its own path.
 */
type RowConfig = Record<string, never>;
/**
 * The names a row's controls show when its labels sit inside the controls
 * (`--dial-row-label-style: 2`): set `_inlineLabels` on the `_row` folder,
 * from a child key to a shorter name, or `''` to show only the value. The
 * title above each control keeps the full name.
 */
type InlineLabelsConfig = Record<string, string>;
/**
 * A pad group: set `_pad: true` (or these options) on a folder whose first
 * two number children are a pair. The folder shows as one pad: X drives the
 * first value, Y the second, and each value keeps its own path.
 */
type PadGroupConfig = Pick<DialPadConfig, 'labels' | 'mapping' | 'hideLabel' | 'dragLabels'>;
/**
 * A field row: `_fields: true`, or these options. See {@link ControlMeta.fields}.
 */
type FieldsConfig = {
    /**
     * Most decimals a field shows. The value keeps its precision: only the
     * display rounds, and a click on the number shows the exact value.
     */
    decimals?: number;
    /**
     * Shows each value without trailing zeros: "1" for 1.00, "1.5" for 1.50,
     * and never "-0". With `decimals`, that still caps the count. Default off.
     */
    trim?: boolean;
};
type FolderMetaKey = (typeof FOLDER_META_KEYS)[number];
/**
 * A slider: `[default, min, max, step?, unit?]`. The unit shows after the
 * value: `[12, -180, 180, 1, '°']` shows "12°".
 */
type RangeConfig = [number, number, number, number?, string?];
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
/** An anchor's value: a cell, or `null` (no cell picked) when its default is `null`. */
type AnchorConfigValue<C> = C extends {
    default: null;
} ? AnchorValue | null : AnchorValue;
type ResolvedValues<T extends DialConfig> = {
    [K in keyof T as K extends FolderMetaKey ? never : K]: T[K] extends ControlWithVisibility<infer U extends DialConfig[string]> ? ResolvedValues<{
        value: U;
    }>['value'] : T[K] extends [number, number, number, number?, string?] ? number : T[K] extends SpringConfig ? TransitionConfig : T[K] extends EasingConfig ? TransitionConfig : T[K] extends SelectConfig ? string : T[K] extends ColorConfig | ImageConfig ? string : T[K] extends TextConfig ? string : T[K] extends DialPadConfig ? DialPadValue : T[K] extends BackgroundConfig ? BackgroundValue : T[K] extends AnchorConfig ? AnchorConfigValue<T[K]> : T[K] extends LayersConfig ? LayersValue : T[K] extends PicturesConfig ? PicturesValue : T[K] extends DialConfig ? ResolvedValues<T[K]> : T[K];
};
type DialKitValueUpdates<T extends DialConfig> = {
    [K in keyof T as K extends FolderMetaKey ? never : K]?: T[K] extends ControlWithVisibility<infer U extends DialConfig[string]> ? DialKitValueUpdates<{
        value: U;
    }>['value'] : T[K] extends [number, number, number, number?, string?] ? number : T[K] extends SpringConfig | EasingConfig ? TransitionConfig : T[K] extends ActionConfig ? never : T[K] extends SelectConfig | ColorConfig | ImageConfig | TextConfig ? string : T[K] extends DialPadConfig ? DialPadValue : T[K] extends BackgroundConfig ? BackgroundValueUpdate : T[K] extends AnchorConfig ? AnchorConfigValue<T[K]> : T[K] extends LayersConfig ? LayersValue : T[K] extends PicturesConfig ? PicturesValue : T[K] extends DialConfig ? DialKitValueUpdates<T[K]> : T[K];
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
    type: 'slider' | 'toggle' | 'spring' | 'transition' | 'folder' | 'action' | 'select' | 'color' | 'image' | 'text' | 'pad' | 'background' | 'anchor' | 'layers' | 'pictures';
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
    /** Folder only: `_fields` (`true` or {@link FieldsConfig}) shows its numbers as one row of fields. */
    fields?: boolean;
    /** Fields only: the most decimals a field shows, from `_fields: { decimals }`. See {@link FieldsConfig}. */
    decimals?: number;
    /** Fields only: values show without trailing zeros, from `_fields: { trim: true }`. See {@link FieldsConfig}. */
    trim?: boolean;
    /** Folder only: `_row` shows the folder's two controls side by side. See {@link RowConfig}. */
    row?: RowConfig;
    /** Row only: the names its controls show inside. See {@link InlineLabelsConfig}. */
    inlineLabels?: InlineLabelsConfig;
    /** Folder only: `_pad` shows the folder's first two numbers as one pad. See {@link PadGroupConfig}. */
    padGroup?: PadGroupConfig;
    options?: SelectOption[];
    display?: SelectConfig['display'];
    hideLabel?: boolean;
    /** Select only: the dropdown's add row. See `SelectConfig.add`. */
    add?: SelectAddConfig;
    placeholder?: string;
    pad?: DialPadConfig;
    anchor?: AnchorConfig;
    background?: BackgroundConfig;
    /** Layers only: the config, with its default made valid. Its add, duplicate and delete send `layerAction` paths. */
    layers?: LayersConfig & {
        default: LayersValue;
    };
    /** Pictures only: the config, with its families and default made valid. A tile click sends a `pictureAction` path. */
    pictures?: PicturesConfig & {
        families: PictureFamily[];
        default: PicturesValue;
    };
    shortcut?: ShortcutConfig;
    visibleWhen?: VisibleWhen;
    /** A short sentence about the control, from its folder's `_hints`. */
    hint?: string;
};
/** How a panel's top-level folders open. See `PanelConfig.folderMode`. */
type FolderMode = 'independent' | 'accordion';
type PanelConfig = {
    id: string;
    name: string;
    controls: ControlMeta[];
    values: Record<string, DialValue>;
    shortcuts: Record<string, ShortcutConfig>;
    kind?: 'timeline';
    /**
     * `false` makes the version menu switch versions only: no rename, lock,
     * delete or reorder (for example a viewer of a shared page). Default `true`.
     */
    presetsEditable?: boolean;
    /** `false` drops the lock button from the version menu. Default `true`. */
    presetsLockable?: boolean;
    /** A short sentence about the panel, shown on its header while the hint key is held. */
    hint?: string;
    /**
     * How the panel's top-level folders open: `'accordion'` keeps one open at
     * a time, `'independent'` lets each open on its own. Without it, the panel
     * follows its DialRoot's `accordion`.
     */
    folderMode?: FolderMode;
    /**
     * Called by the X in the panel's header, instead of closing the panel to
     * a small button: the host removes the panel (a selection panel clears
     * the selection).
     */
    onClose?: () => void;
    /**
     * `false` drops the toolbar (versions and copy) from the panel's header.
     * Default `true`.
     */
    toolbar?: boolean;
    /**
     * A group name. Panels that share one draw as sections of their own shell,
     * titled by the group, apart from the shell of the panels without a group.
     */
    group?: string;
    /**
     * In a group, `true` puts this panel's toolbar (versions and copy) in the
     * group shell's header, and drops its section.
     */
    groupHeader?: boolean;
    /**
     * The name of a group, or of the one panel without a group, that this
     * panel opens next to: out of the column, on the side toward the middle of
     * the screen, level with that shell's top edge. Without that shell, or in
     * an inline root, the panel shows as a shell of its own. A panel in a
     * group stays in its group.
     */
    beside?: string;
    /**
     * The word saved versions are named with: the base version is
     * "<prefix> 1" and each new one the next number ("Version 2"). Without it,
     * versions are "V1", "V2"…
     */
    versionPrefix?: string;
};
type Listener = () => void;
type ActionListener = (action: string) => void;
type ResetListener = (folderPath: string) => void;
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
    /**
     * `false` makes the version menu switch versions only: no rename, lock,
     * delete or reorder (for example a viewer of a shared page). Default `true`.
     */
    presetsEditable?: boolean;
    /** `false` drops the lock button from the version menu. Default `true`. */
    presetsLockable?: boolean;
    /** A short sentence about the panel, shown on its header while the hint key is held. */
    hint?: string;
    /**
     * How the panel's top-level folders open: `'accordion'` keeps one open at
     * a time, `'independent'` lets each open on its own. Without it, the panel
     * follows its DialRoot's `accordion`.
     */
    folderMode?: FolderMode;
    /**
     * Called by the X in the panel's header, instead of closing the panel to
     * a small button: the host removes the panel (a selection panel clears
     * the selection).
     */
    onClose?: () => void;
    /**
     * `false` drops the toolbar (versions and copy) from the panel's header.
     * Default `true`.
     */
    toolbar?: boolean;
    /**
     * A group name. Panels that share one draw as sections of their own shell,
     * titled by the group, apart from the shell of the panels without a group.
     */
    group?: string;
    /**
     * In a group, `true` puts this panel's toolbar (versions and copy) in the
     * group shell's header, and drops its section.
     */
    groupHeader?: boolean;
    /**
     * The name of a group, or of the one panel without a group, that this
     * panel opens next to: out of the column, on the side toward the middle of
     * the screen, level with that shell's top edge. Without that shell, or in
     * an inline root, the panel shows as a shell of its own. A panel in a
     * group stays in its group.
     */
    beside?: string;
    /**
     * The word saved versions are named with: the base version is
     * "<prefix> 1" and each new one the next number ("Version 2"). Without it,
     * versions are "V1", "V2"…
     */
    versionPrefix?: string;
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
    /** The nested folders opened or closed by hand, by panel and path. A folder
     *  unmounts when its parent closes, so its state lives here. */
    private folderOpenStates;
    private panels;
    private controlsByPanel;
    private resetKeysByPanel;
    private allControls;
    private panelsSnapshot;
    private standardPanelsSnapshot;
    private timelinePanelsSnapshot;
    private listeners;
    private globalListeners;
    /** Names of the panels a timeline clip popover shows. See setPanelInPopover. */
    private panelsInPopover;
    private snapshots;
    private actionListeners;
    private resetListeners;
    private presets;
    private activePreset;
    private gradients;
    private baseValues;
    private baseNames;
    private defaultValues;
    /** Host values a reset returns to, over the defaults. See setResetValues. */
    private hostResetValues;
    /** How many resets ran: a slider that sees it change springs to its new value instead of jumping. */
    private resetCount;
    private lastResetAt;
    private registrationCounts;
    private retainedPanels;
    private persistConfigs;
    private transitionPresets;
    private transitionStorageLoaded;
    private copiedTransition;
    private transitionListeners;
    /**
     * Parsed configs per panel id, by `parsedConfigKey`. A host that swaps
     * between a few configs (layout presets) registers the same shapes again
     * and again; a parsed tree is never changed after its parse, so it can be
     * shared.
     */
    private parsedConfigs;
    /** The cache key of the config each registered panel holds. */
    private panelConfigKeys;
    registerPanel(id: string, name: string, config: DialConfig, shortcuts?: Record<string, ShortcutConfig>, options?: DialStorePanelOptions): void;
    updatePanel(id: string, name: string, config: DialConfig, shortcuts?: Record<string, ShortcutConfig>, options?: DialStorePanelOptions): void;
    unregisterPanel(id: string): void;
    /** Undefined delegates the initial state to DialRoot.defaultOpen. */
    getPanelOpen(panelId: string): boolean | undefined;
    isPanelOpen(panelId: string): boolean;
    togglePanelOpen(panelId: string): void;
    /** Whether a nested folder starts open: as it was left, or `fallback`. */
    isFolderOpen(panelId: string, path: string, fallback: boolean): boolean;
    /** Keeps a nested folder's state for when the folder shows again. */
    rememberFolder(panelId: string, path: string, open: boolean): void;
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
     *
     * Reset listeners (see `subscribeResets`) hear the folder's path first,
     * before any value changes, so a host can start its own motion from the
     * values the reset is about to replace.
     */
    resetFolder(panelId: string, path: string): void;
    /** True when a value that `resetFolder` restores differs from its reset value, so the reset button shows. */
    isFolderChanged(panelId: string, path: string): boolean;
    /**
     * Put the given paths back to their reset values (see `setResetValues`),
     * for a host that draws rows from several folders or panels. A path with
     * no reset value is left as it is. With `folder`, reset listeners hear
     * that folder's path first, as they do for `resetFolder`.
     */
    resetPaths(panelId: string, paths: string[], options?: {
        folder?: string;
    }): void;
    /** True when a value at one of the paths differs from its reset value. */
    hasChanges(panelId: string, paths: string[]): boolean;
    /**
     * The values a reset returns to, by path, when they are not the config's
     * defaults: for example when the host passes saved values as defaults, so
     * a panel opens on them, but a reset goes back to its own defaults. Each
     * call replaces the last. Once set, `resetFolder` and `isFolderChanged`
     * use only these paths: a path left out is one no reset returns to a
     * default. List `<path>.__mode` to reset a transition's mode too.
     */
    setResetValues(panelId: string, values: Record<string, DialValue>): void;
    /** The value each path resets to: the values from `setResetValues`, else the defaults. */
    getResetValues(panelId: string): Record<string, DialValue>;
    /** The value a reset puts at `path`, or undefined when no reset changes it. */
    getResetValue(panelId: string, path: string): DialValue | undefined;
    /**
     * Counts the resets so far. A value that changes right after a new count
     * came from a reset, so a control can animate it; other outside changes,
     * like timeline playback, keep following the value at once.
     */
    getResetCount(): number;
    /** When the last reset ran, in `performance.now()` time. */
    getLastResetAt(): number;
    private resetTargets;
    /** Writes the reset value of each listed path that has one, and counts the reset. */
    private writeResetValues;
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
    /**
     * Shows or hides a panel, by name, in a timeline clip popover (`panel` on
     * a clip). DialRoot leaves the panel out while a popover shows it.
     */
    setPanelInPopover(name: string, shown: boolean): void;
    isPanelInPopover(name: string): boolean;
    subscribeActions(panelId: string, listener: ActionListener): () => void;
    triggerAction(panelId: string, path: string): void;
    /**
     * Hear each folder reset of a panel, with the path of the folder (or the
     * spring, transition or background) being reset. The listener runs before
     * the reset writes its values, so the values it reads are still the old ones.
     */
    subscribeResets(panelId: string, listener: ResetListener): () => void;
    private notifyReset;
    /**
     * Saves the current values as the next numbered version: "V2", "V3"…, or under its own
     * `prefix` ("Sequence 2" in a timeline), else the panel's `versionPrefix` ("Version 2").
     * Older saves used "Version N"; both count toward the next V.
     */
    saveNewPreset(panelId: string, prefix?: string | undefined): string;
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
    /** Display name of the base version (the values before any saved preset): "V1", or "<versionPrefix> 1". */
    getBaseName(panelId: string): string;
    setPresetLocked(panelId: string, presetId: string, locked: boolean): void;
    reorderPresets(panelId: string, presetIds: string[]): void;
    getPresets(panelId: string): Preset[];
    /** Saved gradients belong to the panel, and persist with it when it opts in. */
    saveGradient(panelId: string, gradient: BackgroundGradient): string;
    deleteGradient(panelId: string, gradientId: string): void;
    getSavedGradients(panelId: string): SavedGradient[];
    /** Whether the version menu may rename, lock, delete and reorder versions. See `presetsEditable`. */
    isPresetsEditable(panelId: string): boolean;
    /** Whether the version menu shows lock buttons: only on an editable menu. See `presetsLockable`. */
    isPresetsLockable(panelId: string): boolean;
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
    /**
     * Parses through the panel's cache. The result is stored only after a
     * parse succeeds, so an invalid config still throws before the store
     * changes.
     */
    private parseCached;
    /** Compile controls, defaults, and the lookup index in one walk. */
    private parseConfig;
    private inferRange;
    private normalizePreservedValue;
}
declare const DialStore: DialStoreClass;

export { type ActionConfig, type AnchorConfig, type AnchorValue, type BackgroundConfig, type BackgroundGradient, type BackgroundMedia, type BackgroundMediaDisplay, type BackgroundMediaFit, type BackgroundMediaRatio, type BackgroundMode, type BackgroundValue, type BackgroundValueUpdate, type ColorConfig, type ControlMeta, type ControlWithVisibility, type CopiedTransition, type DialConfig, type DialKitPersistOptions, type DialKitValueUpdates, type DialPadAxis, type DialPadConfig, type DialPadValue, DialStore, type DialStorePanelOptions, type DialValue, type EasingConfig, type FieldsConfig, type FolderMode, type GradientHandles, type GradientPoint, type GradientShape, type GradientStop, type ImageConfig, type ImageOption, type InlineLabelsConfig, type LayerActionKind, type LayerItem, type LayersConfig, type LayersValue, type PadGroupConfig, type PanelConfig, type PictureFamily, type PictureItem, type PicturesConfig, type PicturesValue, type Preset, type RangeConfig, type ResolvedValues, type RowConfig, type SavedGradient, type SelectAddConfig, type SelectConfig, type SelectOption, type ShortcutConfig, type ShortcutInteraction, type ShortcutMode, type SpringConfig, type TextConfig, type TransitionConfig, type TransitionMode, type TransitionPreset, type VisibleWhen, type VisibleWhenValue, flattenDialValueUpdates, formatLabel, inferStep, isEasingConfigValue, isFolderMetaKey, isHexColor, isLeafConfigValue, isSpringConfigValue, resolveDialValues, unwrapVisibility, withVisibility };
