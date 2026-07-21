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

declare function decimalsForStep(step: number): number;
declare function roundValue(val: number, step: number): number;
declare function getEffectiveStep(control: ControlMeta, shortcut: ShortcutConfig): number;
declare function applySliderDelta(panelId: string, path: string, control: ControlMeta, effectiveStep: number, direction: number): void;
declare function snapToDecile(rawValue: number, min: number, max: number): number;
declare function isInputFocused(): boolean;
declare function getActiveModifier(e: KeyboardEvent | WheelEvent | MouseEvent): 'alt' | 'shift' | 'meta' | undefined;
declare function findControl(controls: ControlMeta[], path: string): ControlMeta | null;
declare const DRAG_SENSITIVITY = 4;
declare function formatInteractionLabel(interaction: string): string;
declare function formatSliderShortcut(sc: ShortcutConfig): string;
declare function formatToggleShortcut(sc: ShortcutConfig): string;

export { DRAG_SENSITIVITY, applySliderDelta, decimalsForStep, findControl, formatInteractionLabel, formatSliderShortcut, formatToggleShortcut, getActiveModifier, getEffectiveStep, isInputFocused, roundValue, snapToDecile };
