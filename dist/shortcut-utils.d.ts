import { C as ControlMeta, d as ShortcutConfig } from './DialStore-CP5O0S4u.js';
import './dial-pad.js';
import './anchor.js';
import './background.js';

/** Decimal places needed by a step or range endpoint, including scientific notation. */
declare function decimalsForStep(step: number, min?: number, max?: number): number;
/** Snap relative to the minimum and keep exact endpoints reachable. */
declare function roundValue(value: number, step: number, min?: number, max?: number): number;
/** Word units (s, ms, px) sit a small gap after the value; signs (°, ×, %) sit against it. */
declare function isWordUnit(unit: string): boolean;

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

export { DRAG_SENSITIVITY, applySliderDelta, decimalsForStep, findControl, formatInteractionLabel, formatSliderShortcut, formatToggleShortcut, getActiveModifier, getEffectiveStep, isInputFocused, isWordUnit, roundValue, snapToDecile };
