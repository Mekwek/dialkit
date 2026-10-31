import * as vue from 'vue';
import { ComputedRef, ObjectDirective, PropType, InjectionKey, Ref, VNodeChild, VNode } from 'vue';

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
declare const GRADIENT_SHAPES: readonly GradientShape[];
/** Black to white, top to bottom, each end 10% in from the edge. */
declare function defaultBackgroundValue(): BackgroundValue;
/** The default handles: a top to bottom linear gradient, each end 10% in from the edge. */
declare function defaultGradientHandles(): GradientHandles;
/**
 * The handles for a gradient saved before handles existed, which had a CSS
 * `angle` instead (0 points up, 90 right, 180 down). For a host that rewrites
 * its old data; `normalizeGradient` does not read `angle`.
 *
 * Linear: the line passes through the centre along d = (sin θ, -cos θ), half
 * as long as CSS's own gradient line, h = (|sin θ| + |cos θ|) / 2, so
 * start = centre - d·h, end = centre + d·h, and the width point sits a
 * quarter turn from the end: 180 gives start (0.5, 0), end (0.5, 1),
 * width (0, 0.5). Radial is centred, as `radial-gradient(circle at center)`.
 */
declare function legacyGradientHandles(shape: 'linear' | 'radial', angle: number): GradientHandles;
/**
 * A complete, valid value. Each missing or invalid field falls back to the
 * same field of `fallback` (the current value, or the default), so a partial
 * update such as `{ mode: 'gradient' }` keeps everything else.
 */
declare function normalizeBackgroundValue(value: unknown, fallback?: BackgroundValue): BackgroundValue;
/**
 * Switching between Linear and the centred shapes keeps the gradient in
 * place: the centre goes to the middle of the line, with the width point a
 * quarter turn from the end, and back again. Between the centred shapes the
 * handles stay as they are. The stops never change.
 *
 * `aspect` is the box's width / height. The quarter turn is taken in the
 * box's pixels, so a centred shape starts as a circle on screen, even in a
 * wide box. Without it the box is square.
 */
declare function switchGradientShape(gradient: BackgroundGradient, shape: GradientShape, aspect?: number): BackgroundGradient;
/** The gradient's axes in pixels for a box of `width` × `height`. */
type GradientFrame = {
    cx: number;
    cy: number;
    ax: number;
    ay: number;
    nx: number;
    ny: number;
    r1: number;
    r2: number;
};
declare function gradientFrame(handles: GradientHandles, width: number, height: number): GradientFrame;
/**
 * Where a pixel falls on the gradient: 0 at the first position, 1 at the
 * last. With u and v the pixel's distance from the centre along each axis,
 * in radii: linear t = u, radial √(u² + v²), diamond |u| + |v|, and angular
 * the turn from the end handle towards the width side.
 */
declare function gradientParamAt(shape: GradientShape, frame: GradientFrame, x: number, y: number): number;
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
type DialValue = number | boolean | string | SpringConfig | EasingConfig | ActionConfig | SelectConfig | ColorConfig | ImageConfig | TextConfig | DialPadConfig | DialPadValue | BackgroundConfig | BackgroundValue | AnchorConfig | AnchorValue | LayersConfig | LayersValue | null;
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
type FolderMetaKey = (typeof FOLDER_META_KEYS)[number];
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
/** An anchor's value: a cell, or `null` (no cell picked) when its default is `null`. */
type AnchorConfigValue<C> = C extends {
    default: null;
} ? AnchorValue | null : AnchorValue;
type ResolvedValues<T extends DialConfig> = {
    [K in keyof T as K extends FolderMetaKey ? never : K]: T[K] extends ControlWithVisibility<infer U extends DialConfig[string]> ? ResolvedValues<{
        value: U;
    }>['value'] : T[K] extends [number, number, number, number?, string?] ? number : T[K] extends SpringConfig ? TransitionConfig : T[K] extends EasingConfig ? TransitionConfig : T[K] extends SelectConfig ? string : T[K] extends ColorConfig | ImageConfig ? string : T[K] extends TextConfig ? string : T[K] extends DialPadConfig ? DialPadValue : T[K] extends BackgroundConfig ? BackgroundValue : T[K] extends AnchorConfig ? AnchorConfigValue<T[K]> : T[K] extends LayersConfig ? LayersValue : T[K] extends DialConfig ? ResolvedValues<T[K]> : T[K];
};
type DialKitValueUpdates<T extends DialConfig> = {
    [K in keyof T as K extends FolderMetaKey ? never : K]?: T[K] extends ControlWithVisibility<infer U extends DialConfig[string]> ? DialKitValueUpdates<{
        value: U;
    }>['value'] : T[K] extends [number, number, number, number?, string?] ? number : T[K] extends SpringConfig | EasingConfig ? TransitionConfig : T[K] extends ActionConfig ? never : T[K] extends SelectConfig | ColorConfig | ImageConfig | TextConfig ? string : T[K] extends DialPadConfig ? DialPadValue : T[K] extends BackgroundConfig ? BackgroundValueUpdate : T[K] extends AnchorConfig ? AnchorConfigValue<T[K]> : T[K] extends LayersConfig ? LayersValue : T[K] extends DialConfig ? DialKitValueUpdates<T[K]> : T[K];
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
    type: 'slider' | 'toggle' | 'spring' | 'transition' | 'folder' | 'action' | 'select' | 'color' | 'image' | 'text' | 'pad' | 'background' | 'anchor' | 'layers';
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
};
type Listener$1 = () => void;
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
    subscribe(panelId: string, listener: Listener$1): () => void;
    subscribeGlobal(listener: Listener$1): () => void;
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
     * Seconds the clip's motion keeps running past its bar, such as staggered
     * elements still settling. Read-only: no dial and no popover control. The
     * timeline's end covers `at + duration + tail`, and a single track draws
     * it as a fading tail behind the following bars.
     */
    tail?: number;
    /** The name shown in the dock. Defaults to the config key, formatted. */
    label?: string;
    /**
     * Single track: puts the clip on its own row below the main lane. Clips
     * with the same `lane` share that row, without overlap; rows follow the
     * order lanes first appear in the config. Lane clips never bound or snap
     * against clips on another lane, never take the `pinStart` pin, and count
     * toward the timeline's end like any clip. Ignored in rows mode, where
     * every clip has a row of its own.
     */
    lane?: string;
    /** The row label of the clip's `lane`. Falls back to the clip's `label`. */
    laneLabel?: string;
    /**
     * Single track: draws the bar in three parts, `in` and `out` (seconds) at
     * its ends and the idle part between them. Resizing either edge changes
     * only the idle part, so the bar is never shorter than `in + out`.
     */
    segments?: TimelineClipSegments;
    /**
     * Hints for the clip's editor controls, by key: `at`, `duration`,
     * `transition`, `from` or `to`. Each shows while the hint key (H) is held
     * over its control. `duration` replaces the curve's own Duration hint.
     */
    hints?: Record<string, string>;
    /** The clip bar's own hint, shown while the hint key (H) is held over it. */
    hint?: string;
    /**
     * The name of a registered panel. A click on the bar opens that panel in
     * the clip's popover, in place of the clip's own controls, and the panel
     * leaves its own place while the popover shows it. Closing the popover
     * closes the panel, as the panel's own close button does. React dock only
     * for now.
     */
    panel?: string;
};
/** The fixed parts at each end of a segmented clip, in seconds. */
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
    /**
     * `false` makes the sequence menu switch sequences only: no rename, lock,
     * delete or reorder (for example a viewer of a shared page). Default `true`.
     */
    presetsEditable?: boolean;
    /** `false` drops the lock button from the sequence menu. Default `true`. */
    presetsLockable?: boolean;
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
    /**
     * Single track only: the bar that opens the timeline holds its start. It
     * cannot be dragged along the lane and has no start handle, so the
     * timeline never opens with a lead gap. Its end handle still sets its
     * length, and whichever bar ends up first holds the pin. Lane clips never
     * take it. Defaults to false. React dock only for now.
     */
    pinStart?: boolean;
    /**
     * Called with a clip's key when its bar is clicked (pressed and released
     * without a drag), before the dock opens the clip's popover. Fires for
     * every clip. To mark the clip the host is editing, name it with
     * `TimelineStore.setHighlight(id, key)`. React dock only for now.
     */
    onClipClick?: (key: string) => void;
}

type UseDialTimelineOptions = DialTimelineOptions;
declare function useDialTimeline<T extends TimelineConfig>(name: string, config: T, options?: UseDialTimelineOptions): ComputedRef<DialTimelineValues<T>>;

/** How a panel shows its versions: captured thumbnails (default), or a menu. */
type DialVersions = 'menu' | 'thumbnails';

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
    /** How saved versions appear: captured thumbnails (default), or a menu. */
    versions: {
        type: () => DialVersions;
        default: string;
    };
    accordion: {
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
    /** How saved versions appear: captured thumbnails (default), or a menu. */
    versions: {
        type: () => DialVersions;
        default: string;
    };
    accordion: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & Readonly<{
    onOpenChange?: ((...args: any[]) => any) | undefined;
}>, {
    position: DialPosition;
    mode: DialMode;
    accordion: boolean;
    defaultOpen: boolean;
    theme: DialTheme;
    versions: DialVersions;
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
    visible: boolean | undefined;
    theme: DialTheme;
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
    /** @internal A value that arrives with a new count springs into place, like a click on the track. */
    resetCount: {
        type: NumberConstructor;
        default: number;
    };
    hint: {
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
    /** @internal A value that arrives with a new count springs into place, like a click on the track. */
    resetCount: {
        type: NumberConstructor;
        default: number;
    };
    hint: {
        type: StringConstructor;
        required: false;
    };
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {
    shortcut: ShortcutConfig;
    shortcutActive: boolean;
    resetCount: number;
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
    hint: {
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
    hint: {
        type: StringConstructor;
        required: false;
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
    /** Short text at the end of a nested folder's title row, such as the preset in use. */
    meta: {
        type: StringConstructor;
        default: string;
    };
    /** Buttons beside the title of a nested folder, such as a transition's copy and paste. */
    actions: {
        type: PropType<(() => VNodeChild) | null>;
        required: false;
        default: null;
    };
    panelHeightOffset: {
        type: NumberConstructor;
        default: number;
    };
    /** Shows a reset button after the title, visible while `changed` is true. */
    onReset: PropType<() => void>;
    changed: {
        type: BooleanConstructor;
        default: boolean;
    };
    hint: {
        type: StringConstructor;
        required: false;
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
    /** Short text at the end of a nested folder's title row, such as the preset in use. */
    meta: {
        type: StringConstructor;
        default: string;
    };
    /** Buttons beside the title of a nested folder, such as a transition's copy and paste. */
    actions: {
        type: PropType<(() => VNodeChild) | null>;
        required: false;
        default: null;
    };
    panelHeightOffset: {
        type: NumberConstructor;
        default: number;
    };
    /** Shows a reset button after the title, visible while `changed` is true. */
    onReset: PropType<() => void>;
    changed: {
        type: BooleanConstructor;
        default: boolean;
    };
    hint: {
        type: StringConstructor;
        required: false;
    };
}>> & Readonly<{
    onOpenChange?: ((...args: any[]) => any) | undefined;
}>, {
    meta: string;
    toolbar: (() => VNodeChild) | null;
    defaultOpen: boolean;
    open: boolean;
    isRoot: boolean;
    inline: boolean;
    actions: (() => VNodeChild) | null;
    panelHeightOffset: number;
    changed: boolean;
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
    /** Shows a reset button in the header. See Folder.onReset. */
    onReset: PropType<() => void>;
    changed: {
        type: BooleanConstructor;
        default: boolean;
    };
    hint: {
        type: StringConstructor;
        required: false;
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
    /** Shows a reset button in the header. See Folder.onReset. */
    onReset: PropType<() => void>;
    changed: {
        type: BooleanConstructor;
        default: boolean;
    };
    hint: {
        type: StringConstructor;
        required: false;
    };
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {
    changed: boolean;
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

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
    /** Shows a reset button in the header. See Folder.onReset. */
    onReset: PropType<() => void>;
    changed: {
        type: BooleanConstructor;
        default: boolean;
    };
    hint: {
        type: StringConstructor;
        required: false;
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
    value: {
        type: PropType<TransitionConfig>;
        required: true;
    };
    hideDuration: {
        type: BooleanConstructor;
        default: boolean;
    };
    durationControl: PropType<TransitionDurationControl>;
    /** Shows a reset button in the header. See Folder.onReset. */
    onReset: PropType<() => void>;
    changed: {
        type: BooleanConstructor;
        default: boolean;
    };
    hint: {
        type: StringConstructor;
        required: false;
    };
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {
    changed: boolean;
    hideDuration: boolean;
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

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
    hint: {
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
    hint: {
        type: StringConstructor;
        required: false;
    };
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

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
    display: {
        type: PropType<SelectConfig["display"]>;
        default: undefined;
    };
    hideLabel: {
        type: BooleanConstructor;
        default: boolean;
    };
    hint: {
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
    options: {
        type: PropType<SelectOption[]>;
        required: true;
    };
    display: {
        type: PropType<SelectConfig["display"]>;
        default: undefined;
    };
    hideLabel: {
        type: BooleanConstructor;
        default: boolean;
    };
    hint: {
        type: StringConstructor;
        required: false;
    };
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {
    hideLabel: boolean;
    display: "dropdown" | "segmented" | undefined;
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

declare const ColorControl: vue.DefineComponent<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: StringConstructor;
        required: true;
    };
    hint: StringConstructor;
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
    hint: StringConstructor;
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
    hint: StringConstructor;
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
    hint: StringConstructor;
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
    hideLabel: BooleanConstructor;
    dragLabels: BooleanConstructor;
    hint: StringConstructor;
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
    hideLabel: BooleanConstructor;
    dragLabels: BooleanConstructor;
    hint: StringConstructor;
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {
    hideLabel: boolean;
    dragLabels: boolean;
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

declare const AnchorControl: vue.DefineComponent<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: PropType<AnchorValue>;
        required: true;
    };
    hint: StringConstructor;
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, "change"[], "change", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: PropType<AnchorValue>;
        required: true;
    };
    hint: StringConstructor;
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

declare const BackgroundControl: vue.DefineComponent<vue.ExtractPropTypes<{
    panelId: {
        type: StringConstructor;
        required: true;
    };
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: PropType<BackgroundValue>;
        required: true;
    };
    upload: PropType<(file: File) => Promise<string>>;
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, "change"[], "change", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    panelId: {
        type: StringConstructor;
        required: true;
    };
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: PropType<BackgroundValue>;
        required: true;
    };
    upload: PropType<(file: File) => Promise<string>>;
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

/**
 * Draws a background value into a canvas at the canvas's own size: the solid
 * color, or the gradient exactly, every shape (`paintGradient`). For a host
 * that previews the background without drawing it itself. Media is not
 * drawn; the canvas is cleared and the host shows its own.
 */
declare function paintBackgroundPreview(canvas: HTMLCanvasElement, value: BackgroundValue): void;

/**
 * The on-canvas gradient gizmo, as in Figma: handle dots that move, scale and
 * rotate the gradient, the stops as swatches on its line (or around its rim
 * for Angular) that slide along it, and a click on the line that adds a stop.
 * The maths below is pure (no DOM) so it is tested on its own; the gizmo
 * itself is plain DOM, mounted over the host's canvas.
 */
/** The canvas box in CSS pixels. */
interface GizmoBox {
    width: number;
    height: number;
}
interface Vec {
    x: number;
    y: number;
}
/** The three handles as drawn, in pixels. The width handle is shown on the cross axis, at its radius. */
declare function gizmoPoints(handles: GradientHandles, box: GizmoBox): {
    start: Vec;
    end: Vec;
    width: Vec;
};
/**
 * Turns the end and width handles around `start` by `radians` (positive is
 * clockwise on screen). Lengths and the ellipse's shape do not change.
 */
declare function rotateGradientHandles(handles: GradientHandles, radians: number, box: GizmoBox): GradientHandles;
/**
 * The end handle follows the pointer; the centre stays. The main radius and
 * the direction change together, and the cross radius scales with the main
 * one, so the ellipse keeps its shape. The end stays at least 1px from the
 * centre: on the centre both radii would be 0, the shape's ratio would be
 * lost, and the next move would rebuild it as a circle.
 */
declare function dragGradientEnd(handles: GradientHandles, pointer: Vec, box: GizmoBox): GradientHandles;
/** The centre (start) follows the pointer; the end handle stays, and the ellipse keeps its shape. */
declare function dragGradientCentre(handles: GradientHandles, pointer: Vec, box: GizmoBox): GradientHandles;
/**
 * The width handle sets the cross radius only: the pointer's distance from
 * the main axis. Crossing the axis moves the handle to the other side.
 */
declare function dragGradientWidth(handles: GradientHandles, pointer: Vec, box: GizmoBox): GradientHandles;
/**
 * The stop position (0..100) under a pointer: its projection on the line from
 * the centre to the end handle, or for Angular its angle around the centre
 * from the end handle's direction.
 */
declare function stopPositionAt(shape: GradientShape, handles: GradientHandles, pointer: Vec, box: GizmoBox): number;
/**
 * Where a stop's swatch goes. `x, y` is the stop's point on the line (or on
 * the ellipse's rim for Angular); `ox, oy` the unit direction the swatch
 * stands off in (one side of the line, or outward from the rim); `rotation`
 * turns the swatch so its pointer points back at the line.
 */
declare function stopPlacement(shape: GradientShape, handles: GradientHandles, at: number, box: GizmoBox): {
    x: number;
    y: number;
    ox: number;
    oy: number;
    rotation: number;
};
/**
 * The angle the tooltip shows: the main axis's direction (centre to end
 * handle), in whole degrees, 0 when it points down, -90 right, 90 left,
 * 180 up, as Figma shows it. Any handle's rotate ring shows this same value.
 */
declare function gizmoAngle(handles: GradientHandles, box: GizmoBox): number;
declare const formatGizmoAngle: (degrees: number) => string;
interface GradientGizmoProps {
    gradient: BackgroundGradient;
    /** The selected stop's index. */
    selected: number;
    /**
     * The panel's DialKit root: the gizmo copies its `--dial-*` tokens, so it
     * draws with the panel's theme. The gizmo is not a `.dialkit-root` itself:
     * hosts style those as panels (a host may make every `.dialkit-root` a fixed,
     * full-screen layer whose children take the pointer), and the gizmo must
     * take presses only on its own parts.
     */
    themeSource?: HTMLElement | null;
    /** Its stacking order: under the DialKit panel, above the host's canvas. */
    zIndex?: number;
}
interface GradientGizmoCallbacks {
    onHandles: (handles: GradientHandles) => void;
    onSelect: (index: number) => void;
    /** Moves the selected stop (it is selected while it is dragged). */
    onStopMove: (index: number, at: number) => void;
    /** Adds a stop at `at`; the new stop becomes the selected one. */
    onStopAdd: (at: number) => void;
}
/**
 * Mounts the gizmo over `target`: a fixed overlay sized to the target's box,
 * in document.body, above the host's canvas and under the DialKit panel.
 * Presses on the gizmo stop there, so a colour picker open in the panel stays
 * open; everything else passes through to the canvas.
 */
declare function mountGradientGizmo(target: HTMLElement, initial: GradientGizmoProps, callbacks: GradientGizmoCallbacks): {
    element: HTMLDivElement;
    update(next: GradientGizmoProps): void;
    destroy(): void;
};

/**
 * What a host gives every background control: where uploads go, how a
 * stored file is shown, where saved gradients live, and the canvas the
 * gradient gizmo draws over.
 *
 * Once a host sets any of these, it owns the media and the saved gradients:
 * - Uploads go to a control's own `upload`, else to the host's. With
 *   neither, the Media tab says uploads are not available here; files are
 *   never read into data URLs.
 * - Saved gradients are only the list given to `setSavedGradients`. The
 *   control saves and deletes through `saveGradient` and `deleteGradient`,
 *   and hides each button the host leaves out. Nothing is kept in the panel
 *   or in browser storage.
 * Without a host (or after `setBackgroundHost({})`), a control keeps its
 * saved gradients in its panel and reads files up to 10 MB as data URLs.
 */
type BackgroundHost = {
    /** Stores a dropped or picked file and returns the media to keep: its `src` (a URL, or the host's own storage key) and kind. */
    upload?: (file: File) => Promise<BackgroundMedia>;
    /** The URL that shows a media in the control's preview, for a host that keeps a storage key in `src`. Without it, `src` is the URL. */
    mediaUrl?: (media: BackgroundMedia) => string;
    /** Saves a gradient and returns it with its id. Without it, the Save gradient button is hidden. */
    saveGradient?: (gradient: BackgroundGradient) => Promise<SavedGradient>;
    /** Deletes a saved gradient. Without it, saved gradients show no delete button. */
    deleteGradient?: (id: string) => Promise<void>;
    /**
     * The element the gradient gizmo draws over, usually the host's canvas.
     * The gradient's handles are fractions of its box. Opening a stop's color
     * picker shows the gizmo; without a target there is none.
     */
    gizmoTarget?: () => HTMLElement | null;
};
type Listener = () => void;
/** Sets the host's hooks, replacing the previous host. `setBackgroundHost({})` removes it. */
declare function setBackgroundHost(host: BackgroundHost): void;
declare function getBackgroundHost(): BackgroundHost;
/** Whether a host is set: any of its hooks is given. */
declare function hasBackgroundHost(): boolean;
/** Sets the saved gradients every background control shows while a host is set. Each is made valid. */
declare function setSavedGradients(list: readonly SavedGradient[]): void;
declare function getSavedGradients(): SavedGradient[];
/** Calls `listener` when the host or the saved gradients change. Returns the unsubscribe. */
declare function subscribeBackgroundHost(listener: Listener): () => void;

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
    /** What a version is called in the menu: a version (default) or, in a timeline, a sequence. */
    noun: {
        type: PropType<"version" | "sequence">;
        default: string;
    };
}>, () => VNode<vue.RendererNode, vue.RendererElement, {
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
    /** What a version is called in the menu: a version (default) or, in a timeline, a sequence. */
    noun: {
        type: PropType<"version" | "sequence">;
        default: string;
    };
}>> & Readonly<{}>, {
    activePresetId: string | null;
    noun: "version" | "sequence";
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

/** Mounts the shared version gallery (see versions/gallery.ts). */
declare const VersionGallery: vue.DefineComponent<vue.ExtractPropTypes<{
    panelId: {
        type: StringConstructor;
        required: true;
    };
    theme: PropType<"light" | "dark" | "system">;
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, {}, string, vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    panelId: {
        type: StringConstructor;
        required: true;
    };
    theme: PropType<"light" | "dark" | "system">;
}>> & Readonly<{}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

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
    /** Path of the one open top-level folder in accordion mode, or null when all are closed. */
    openFolder: {
        type: PropType<string | null>;
        default: undefined;
    };
    /** Slide controls in and out as their visibility rules change. */
    animateControls: BooleanConstructor;
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, "openFolderChange"[], "openFolderChange", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
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
    /** Path of the one open top-level folder in accordion mode, or null when all are closed. */
    openFolder: {
        type: PropType<string | null>;
        default: undefined;
    };
    /** Slide controls in and out as their visibility rules change. */
    animateControls: BooleanConstructor;
}>> & Readonly<{
    onOpenFolderChange?: ((...args: any[]) => any) | undefined;
}>, {
    animateControls: boolean;
    openFolder: string | null;
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

export { type ActionConfig, type AnchorConfig, AnchorControl, type AnchorValue, type BackgroundConfig, BackgroundControl, type BackgroundGradient, type BackgroundHost, type BackgroundMedia, type BackgroundMediaDisplay, type BackgroundMediaFit, type BackgroundMediaRatio, type BackgroundMode, type BackgroundValue, type BackgroundValueUpdate, ButtonGroup, type ColorConfig, ColorControl, type ControlMeta, ControlRenderer, type ControlWithVisibility, type CopiedTransition, type DialConfig, type DialKitController, type DialKitDirectiveOptions, type DialKitDirectiveValue, type DialKitPersistOptions, type DialKitValueUpdates, type DialMode, DialPad, type DialPadAxis, type DialPadConfig, type DialPadValue, type DialPosition, DialRoot, DialStore, type DialTheme, DialTimeline, type DialTimelineValues, type DialValue, type DialVersions, type EasingConfig, EasingVisualization, Folder, GRADIENT_SHAPES, type GizmoBox, type GradientFrame, type GradientGizmoCallbacks, type GradientGizmoProps, type GradientHandles, type GradientPoint, type GradientShape, type GradientStop, type ImageConfig, ImageControl, type ImageOption, type PanelConfig, type Preset, PresetManager, type ResolvedValues, type SavedGradient, type SelectConfig, SelectControl, type SelectOption, type ShortcutConfig, ShortcutKey, ShortcutListener, type ShortcutState, ShortcutsMenu, Slider, type SpringConfig, SpringControl, SpringVisualization, type TextConfig, TextControl, type TimelineClipConfig, type TimelineClipCss, type TimelineClipLoop, type TimelineClipValues, type TimelineConfig, type TimelineGroupConfig, type TimelineGroupValues, type TimelinePropConfig, type TimelinePropStepConfig, type TimelineStepConfig, type TimelineStepValues, Toggle, type TransitionConfig, TransitionControl, type TransitionMode, type TransitionPreset, type UseDialOptions, type UseDialTimelineOptions, VersionGallery, type VisibleWhen, type VisibleWhenValue, backgroundGradientCss, backgroundMediaCss, defaultBackgroundValue, defaultGradientHandles, dragGradientCentre, dragGradientEnd, dragGradientWidth, formatGizmoAngle, getBackgroundHost, getSavedGradients, gizmoAngle, gizmoPoints, gradientFrame, gradientParamAt, hasBackgroundHost, legacyGradientHandles, mountGradientGizmo, normalizeBackgroundValue, paintBackgroundPreview, paintGradient, rotateGradientHandles, setBackgroundHost, setSavedGradients, stopPlacement, stopPositionAt, subscribeBackgroundHost, switchGradientShape, useDialKit, useDialKitController, useDialTimeline, useShortcutContext, vDialKit, withVisibility };
