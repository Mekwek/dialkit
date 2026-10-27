import { C as ControlMeta, D as DialValue } from './DialStore-CP5O0S4u.js';
import './dial-pad.js';
import './anchor.js';
import './background.js';

type FieldsProps = {
    label: string;
    /** A `_fields` folder's children: two to four sliders and an optional toggle, the lock. */
    controls: ControlMeta[];
    values: Record<string, DialValue>;
    /** The panel's default values, which the row's reset puts back. */
    defaults: Record<string, DialValue>;
    /** Receives every path that changed, so a locked edit is saved as one update. */
    onChange: (values: Record<string, DialValue>) => void;
    /** A short sentence shown while H is held over the row. */
    hint?: string;
};
type FieldRange = {
    min: number;
    max: number;
    step: number;
};
/**
 * Locked fields scale together: moving field `index` from `base[index]` to
 * `next` multiplies every field by the same ratio, so their proportions hold.
 * A field at 0 has no ratio, so the others move by the same amount instead.
 * Either way the change stops where the first field reaches its min or max.
 */
declare function scaleFields(ranges: FieldRange[], values: number[], index: number, next: number): number[];
/**
 * The lock's memory of where an edit started. Repeated edits of one field
 * scale from the same start values, so a long scrub or many steps keep the
 * exact proportions instead of compounding each step's rounding. Editing
 * another field, or any change made elsewhere, starts again from the
 * current values.
 */
declare function createFieldLock(): {
    /** Every field's value after moving field `index` to `next`. */
    change(ranges: FieldRange[], current: number[], index: number, next: number): number[];
    /**
     * Ends a scrub or a committed edit. A field that started at 0 moved the
     * others by an amount, not a ratio, so its next edit starts again from
     * the values it reached.
     */
    settle(): void;
    reset(): void;
};
/** The updates that put every value in the row back to its default; empty when none changed. */
declare function resetFields(controls: ControlMeta[], values: Record<string, DialValue>, defaults: Record<string, DialValue>): Record<string, DialValue>;
/**
 * One row of number fields shared by all five adapters. Drag a field's label to
 * scrub its value. Each value is a button; clicking it, or Enter or Space,
 * opens an input to type in, where Up/Down step it.
 */
declare function mountFields(host: HTMLElement, initial: FieldsProps): {
    update(next: FieldsProps): void;
    destroy(): void;
};

export { type FieldsProps, createFieldLock, mountFields, resetFields, scaleFields };
