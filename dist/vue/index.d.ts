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

/**
 * The background control's value: a solid color, a gradient or a media file.
 * Pure data helpers, with no DOM, shared by the store and the control.
 */
interface BackgroundStop {
    /** Position along the gradient, 0..100 (%). */
    at: number;
    /** '#rrggbb', lowercase. */
    color: string;
    /** Opacity, 0..100 (%). */
    alpha: number;
}
type GradientShape = 'linear' | 'radial' | 'angular' | 'diamond';
/** A point as a fraction of the canvas box: x 0 = left, 1 = right; y 0 = top, 1 = bottom. May go outside 0..1. */
interface GradientPoint {
    x: number;
    y: number;
}
/**
 * Figma's three gradient handles. Linear runs from `start` to `end` (`width`
 * is unused but kept). Radial, Diamond and Angular: `start` is the centre,
 * `end` sets the main radius and its direction, and `width` sets the radius
 * across it (an ellipse). Switching shape keeps all three. See
 * gradientFrame and gradientParamAt for the exact shading rule.
 */
interface GradientHandles {
    start: GradientPoint;
    end: GradientPoint;
    width: GradientPoint;
}
interface BackgroundGradient {
    shape: GradientShape;
    handles: GradientHandles;
    /** 2..8 stops, kept sorted by `at`. */
    stops: BackgroundStop[];
}
interface BackgroundMedia {
    /** The host's storage key, never a URL. */
    key: string;
    kind: 'image' | 'video';
}
interface BackgroundMediaDisplay {
    /** fill = CSS cover, fit = contain, stretch = fill the box ignoring the media's shape, tile = repeat. */
    fit: 'fill' | 'fit' | 'stretch' | 'tile';
    /** The media box's shape; 'source' is the file's own shape. */
    ratio: '16:9' | '4:3' | '1:1' | '4:5' | '3:4' | '9:16' | 'source';
    /** 1..3, step 0.1. */
    zoom: number;
    /** Tile mode: one tile's height as a share of the canvas height, 0.05..1, step 0.01. */
    tileScale: number;
    /** Left, center, right. */
    pinX: -1 | 0 | 1;
    /** Top, center, bottom. */
    pinY: -1 | 0 | 1;
}
interface BackgroundValue {
    /** The tab that is on. The key is `mode`, never `type`: DialKit reads `type` as a config type. */
    mode: 'solid' | 'gradient' | 'media';
    /** The Solid tab, '#rrggbb'. */
    color: string;
    gradient: BackgroundGradient;
    media: BackgroundMedia | null;
    /** How the media sits in its box. Replacing or removing the file keeps it. */
    mediaDisplay: BackgroundMediaDisplay;
}
interface SavedGradient {
    id: string;
    gradient: BackgroundGradient;
}
interface BackgroundConfig {
    type: 'background';
    default?: BackgroundValue;
}
declare const GRADIENT_SHAPES: GradientShape[];
declare function defaultBackgroundValue(): BackgroundValue;
/** The default handles: a top to bottom linear gradient, each handle 10% in from the canvas's edges. */
declare function defaultGradientHandles(): GradientHandles;
/**
 * The handles for a value saved before handles existed (it had `angle`).
 *
 * Linear, CSS angle θ (0 points up, 90 right, 180 down): the line passes
 * through the centre (0.5, 0.5) along d = (sin θ, -cos θ), with half length
 * h = (|sin θ| + |cos θ|) / 2 in canvas fractions, which is CSS's own
 * gradient line, exact on a square canvas and close otherwise:
 *   start = centre - d * h, end = centre + d * h,
 *   width = centre + (-d.y, d.x) * h  (where Figma puts it: θ = 180 gives
 *   start (0.5, 0), end (0.5, 1), width (0, 0.5), edge to edge).
 * Radial (centred, as CSS's `radial-gradient(circle at center)`):
 *   start = (0.5, 0.5), end = (1, 0.5), width = (0.5, 0).
 * The theca engine converts old values with this same rule.
 */
declare function legacyGradientHandles(shape: 'linear' | 'radial', angle: number): GradientHandles;
/**
 * The gradient with its type switched, placed as Figma places it (measured
 * from a recording):
 * - Linear → Radial, Angular or Diamond: the centre moves to the middle of the
 *   line, the end stays, and the width point goes at the same distance a
 *   quarter turn clockwise on screen, in pixels of the canvas (`aspect` is its
 *   width / height), so the shape is a circle on screen, even on a wide canvas.
 * - Between Radial, Angular and Diamond: the three points stay.
 * - Radial, Angular or Diamond → Linear: start = 2 × centre − end, the end stays,
 *   so Linear → Radial → Linear gives back the same line.
 * The stops never change.
 */
declare function switchGradientShape(gradient: BackgroundGradient, next: GradientShape, aspect?: number): BackgroundGradient;
/**
 * The gradient's frame in pixels for a canvas of `width` x `height`.
 * Main axis: from start (the centre) to end, length r1, unit (ax, ay).
 * Cross axis: unit (nx, ny), perpendicular to the main axis on the side the
 * width point lies; r2 is the width point's distance from the main axis line
 * (so any width point gives an ellipse, Figma's default included).
 */
interface GradientFrame {
    cx: number;
    cy: number;
    ax: number;
    ay: number;
    nx: number;
    ny: number;
    r1: number;
    r2: number;
}
declare function gradientFrame(handles: GradientHandles, width: number, height: number): GradientFrame;
/**
 * Where a pixel falls on the gradient, as t: 0 at the first colour position
 * (0 %), 1 at the last (100 %). With d = pixel - centre, u = (d · a) / r1 and
 * v = (d · n) / r2 (see gradientFrame):
 *   linear: t = u            (beyond 0..1 the end colours continue)
 *   radial: t = sqrt(u² + v²)
 *   diamond: t = |u| + |v|
 *   angular: t = atan2(v, u) / 2π, wrapped into 0..1 (0 % on the end handle's
 *     direction, growing towards the width side, 360° = 100 %)
 */
declare function gradientParamAt(shape: GradientShape, frame: GradientFrame, px: number, py: number): number;
/**
 * A fresh, valid value. Each field that is missing or invalid falls back to
 * the same field of `fallback` (the current value, or the control's default),
 * so one bad or missing field never resets the rest.
 */
declare function normalizeBackgroundValue(value: unknown, fallback?: BackgroundValue): BackgroundValue;
/**
 * The gradient as a CSS image, for small previews (saved swatches) and the
 * panel's strip (`direction`, the stops left to right). CSS cannot draw every
 * Figma gradient, so this is close, not exact; it assumes a square box:
 *   linear: exact on a square box (the stops are placed along CSS's own line);
 *   radial and diamond: an ellipse at the centre, its radii on the nearest
 *     box axes (CSS ellipses cannot turn);
 *   angular: a conic gradient from the end handle's direction (round, not
 *     elliptical).
 * Hosts that draw the real thing use gradientFrame and gradientParamAt, or
 * paintBackgroundPreview.
 */
declare function backgroundGradientCss(gradient: BackgroundGradient, direction?: string): string;

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
 * The action path a layer list sends: `<path>:add`, or
 * `<path>:duplicate:<id>` and `<path>:delete:<id>` for one row.
 */
declare function layerAction(path: string, kind: LayerActionKind, id?: string): string;
/** Reads an action path sent by the layer list at `path`, or null for any other action. */
declare function parseLayerAction(path: string, action: string): {
    kind: LayerActionKind;
    id?: string;
} | null;
/**
 * A complete, valid value: rows without a string id or label are dropped,
 * repeated ids keep their first row, and a selection that names no row
 * becomes null.
 */
declare function normalizeLayersValue(value: unknown, fallback?: LayersValue): LayersValue;

/**
 * Draws a background value into a 2D canvas, at the canvas's own pixel size:
 * the solid colour, or the gradient with the exact shading rule
 * (gradientFrame and gradientParamAt), all four shapes. For hosts without a
 * WebGL canvas, such as a workbench preview. Media is not drawn: the canvas
 * is cleared (the host shows its own media).
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
     * hosts style those as panels (theca makes every `.dialkit-root` a fixed,
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
 * What the host gives the background control. The control never uploads or
 * stores anything itself: it calls these.
 */
interface BackgroundHost {
    /** Uploads a file and returns its storage key. Without it, the Media tab shows a disabled message. */
    upload?: (file: File) => Promise<BackgroundMedia>;
    /** The URL that shows a stored media file. */
    mediaUrl?: (media: BackgroundMedia) => string;
    /** Saves a gradient. Without it, the Save gradient button is hidden. */
    saveGradient?: (gradient: BackgroundGradient) => Promise<SavedGradient>;
    /** Deletes a saved gradient. Without it, saved gradients show no delete button. */
    deleteGradient?: (id: string) => Promise<void>;
    /**
     * The element the gradient gizmo draws over (the host's canvas). The gizmo
     * is a fixed overlay sized to its box, in document.body, above it and under
     * the DialKit panel. Without it there is no gizmo.
     */
    gizmoTarget?: () => HTMLElement | null;
}
type Listener$1 = () => void;
/** Sets the host's upload, media URL and saved-gradient hooks. Replaces the previous host. */
declare function setBackgroundHost(host: BackgroundHost): void;
declare function getBackgroundHost(): BackgroundHost;
/** Sets the saved gradients every background control shows. */
declare function setSavedGradients(list: SavedGradient[]): void;
declare function getSavedGradients(): SavedGradient[];
/** Calls `listener` when the host or the saved gradients change. Returns the unsubscribe. */
declare function subscribeBackgroundHost(listener: Listener$1): () => void;

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
type DialValue = number | boolean | string | SpringConfig | EasingConfig | ActionConfig | SelectConfig | ColorConfig | ImageConfig | TextConfig | DialPadConfig | DialPadValue | BackgroundConfig | BackgroundValue | LayersConfig | LayersValue;
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
    }>['value'] : never : T[K] extends RangeConfig ? number : T[K] extends SpringConfig ? TransitionConfig : T[K] extends EasingConfig ? TransitionConfig : T[K] extends SelectConfig ? string : T[K] extends ColorConfig | ImageConfig ? string : T[K] extends TextConfig ? string : T[K] extends DialPadConfig ? DialPadValue : T[K] extends BackgroundConfig ? BackgroundValue : T[K] extends LayersConfig ? LayersValue : T[K] extends DialConfig ? ResolvedValues<T[K]> : T[K];
};
type DialKitValueUpdates<T extends DialConfig> = {
    [K in keyof T as K extends FolderMetaKey ? never : K]?: T[K] extends ControlWithVisibility<infer U> ? U extends DialConfigValue ? DialKitValueUpdates<{
        value: U;
    }>['value'] : never : T[K] extends RangeConfig ? number : T[K] extends SpringConfig | EasingConfig ? TransitionConfig : T[K] extends ActionConfig ? never : T[K] extends SelectConfig | ColorConfig | ImageConfig | TextConfig ? string : T[K] extends DialPadConfig ? DialPadValue : T[K] extends BackgroundConfig ? BackgroundValue : T[K] extends LayersConfig ? LayersValue : T[K] extends DialConfig ? DialKitValueUpdates<T[K]> : T[K];
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
    type: 'slider' | 'toggle' | 'spring' | 'transition' | 'folder' | 'action' | 'select' | 'color' | 'image' | 'text' | 'pad' | 'background' | 'layers';
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
    /** Background only: the config, with its default made valid. */
    background?: BackgroundConfig & {
        default: BackgroundValue;
    };
    /** Layers only: the config, with its default made valid. Its add, duplicate and delete send `layerAction` paths. */
    layers?: LayersConfig & {
        default: LayersValue;
    };
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
    /**
     * In a group, `true` puts this panel's version toolbar (add, the version
     * menu, copy) in the group's own header, as on a standalone panel, and
     * drops its section.
     */
    groupHeader?: boolean;
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
    /**
     * A short sentence about the panel. It shows on the panel's header while
     * the hint key is held.
     */
    hint?: string;
    /**
     * In a group, `true` puts this panel's version toolbar (add, the version
     * menu, copy) in the group's own header, as on a standalone panel, and
     * drops its section.
     */
    groupHeader?: boolean;
};
declare class DialStoreClass {
    private panelOpenListeners;
    private panelOpenStates;
    private panels;
    /** How many resets ran: a slider that sees it change springs to its new
     *  value instead of jumping (see getResetCount). */
    private resetCount;
    private lastResetAt;
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
    /**
     * Counts the resets so far (resetValues, resetPaths and so a section
     * reset). A value that changes in the same render as a new count came
     * from a reset, so a control can animate it; other outside changes, like
     * timeline playback, keep following the value at once.
     */
    getResetCount(): number;
    /** When the last reset ran, in performance.now() time. */
    getLastResetAt(): number;
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
    /**
     * Saves the current values under the next free "<prefix> N" name. N is one
     * more than the highest number in use, so deleting a preset never lets two
     * share a name. The unsaved base counts as "<prefix> 1".
     */
    saveNewPreset(panelId: string, prefix?: string): string;
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
    mode: DialMode;
    theme: DialTheme;
    defaultOpen: boolean;
    position: DialPosition;
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
    theme: DialTheme;
    defaultOpen: boolean;
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
    toolbar: (() => VNodeChild) | null;
    open: boolean;
    isRoot: boolean;
    inline: boolean;
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

declare const BackgroundControl: vue.DefineComponent<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: PropType<BackgroundValue>;
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
        type: PropType<BackgroundValue>;
        required: true;
    };
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

type BackgroundControlProps = {
    label: string;
    value: BackgroundValue;
    onChange: (value: BackgroundValue) => void;
    /** False when the caller draws the folder named by the label itself (the
     *  React renderer does, with its own Folder); the control then mounts
     *  straight into the host. */
    folder?: boolean;
};

declare const LayerListControl: vue.DefineComponent<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: PropType<LayersValue>;
        required: true;
    };
    addLabel: {
        type: StringConstructor;
        required: false;
    };
    addDisabled: {
        type: BooleanConstructor;
        required: false;
    };
    empty: {
        type: StringConstructor;
        required: false;
    };
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, ("change" | "action")[], "change" | "action", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    value: {
        type: PropType<LayersValue>;
        required: true;
    };
    addLabel: {
        type: StringConstructor;
        required: false;
    };
    addDisabled: {
        type: BooleanConstructor;
        required: false;
    };
    empty: {
        type: StringConstructor;
        required: false;
    };
}>> & Readonly<{
    onAction?: ((...args: any[]) => any) | undefined;
    onChange?: ((...args: any[]) => any) | undefined;
}>, {
    addDisabled: boolean;
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

type LayerListControlProps = {
    label: string;
    value: LayersValue;
    onChange: (value: LayersValue) => void;
    /** Add, duplicate and delete: the app creates or removes the layer, then writes the new value. */
    onAction: (kind: LayerActionKind, id?: string) => void;
    addLabel?: string;
    addDisabled?: boolean;
    empty?: string;
};

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

export { type ActionConfig, type BackgroundConfig, BackgroundControl, type BackgroundControlProps, type BackgroundGradient, type BackgroundHost, type BackgroundMedia, type BackgroundMediaDisplay, type BackgroundStop, type BackgroundValue, ButtonGroup, type ColorConfig, ColorControl, type ControlMeta, ControlRenderer, type ControlWithVisibility, type DialConfig, type DialKitController, type DialKitDirectiveOptions, type DialKitDirectiveValue, type DialKitPersistOptions, type DialKitValueUpdates, type DialMode, DialPad, type DialPadAxis, type DialPadConfig, type DialPadValue, type DialPosition, DialRoot, DialStore, type DialTheme, DialTimeline, type DialTimelineValues, type DialValue, type EasingConfig, EasingVisualization, Folder, GRADIENT_SHAPES, type GizmoBox, type GradientFrame, type GradientGizmoCallbacks, type GradientGizmoProps, type GradientHandles, type GradientPoint, type GradientShape, type ImageConfig, ImageControl, type ImageOption, type LayerActionKind, type LayerItem, LayerListControl, type LayerListControlProps, type LayersConfig, type LayersValue, type PanelConfig, type Preset, PresetManager, type ResolvedValues, type SavedGradient, type SelectConfig, SelectControl, type ShortcutConfig, ShortcutKey, ShortcutListener, type ShortcutState, ShortcutsMenu, Slider, type SpringConfig, SpringControl, SpringVisualization, type TextConfig, TextControl, type TimelineClipConfig, type TimelineClipCss, type TimelineClipLoop, type TimelineClipValues, type TimelineConfig, type TimelineGroupConfig, type TimelineGroupValues, type TimelinePropConfig, type TimelinePropStepConfig, type TimelineStepConfig, type TimelineStepValues, Toggle, type TransitionConfig, TransitionControl, type UseDialOptions, type UseDialTimelineOptions, type VisibleWhen, type VisibleWhenValue, backgroundGradientCss, defaultBackgroundValue, defaultGradientHandles, dragGradientCentre, dragGradientEnd, dragGradientWidth, formatGizmoAngle, getBackgroundHost, getSavedGradients, gizmoAngle, gizmoPoints, gradientFrame, gradientParamAt, layerAction, legacyGradientHandles, mountGradientGizmo, normalizeBackgroundValue, normalizeLayersValue, paintBackgroundPreview, parseLayerAction, rotateGradientHandles, setBackgroundHost, setSavedGradients, stopPlacement, stopPositionAt, subscribeBackgroundHost, switchGradientShape, unwrapVisibility, useDialKit, useDialKitController, useDialTimeline, useShortcutContext, vDialKit, withVisibility };
