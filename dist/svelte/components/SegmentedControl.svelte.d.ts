export interface SegmentedControlOption<T extends string = string> {
    value: T;
    label: string;
    /** SVG path data in a 24 × 24 box, shown in place of the label. */
    icon?: string | string[];
}
type $$ComponentProps = {
    options: SegmentedControlOption[];
    value: string;
    onChange: (value: string) => void;
    /** Accessible name for the group. */
    label?: string;
};
declare const SegmentedControl: import("svelte").Component<$$ComponentProps, {}, "">;
type SegmentedControl = ReturnType<typeof SegmentedControl>;
export default SegmentedControl;
//# sourceMappingURL=SegmentedControl.svelte.d.ts.map