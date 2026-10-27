import type { SelectConfig, SelectOption } from 'dialkit/store';
type $$ComponentProps = {
    label: string;
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    display?: SelectConfig['display'];
    hideLabel?: boolean;
    hint?: string;
};
declare const SelectControl: import("svelte").Component<$$ComponentProps, {}, "">;
type SelectControl = ReturnType<typeof SelectControl>;
export default SelectControl;
//# sourceMappingURL=SelectControl.svelte.d.ts.map