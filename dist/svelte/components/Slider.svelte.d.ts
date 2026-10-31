import type { ShortcutConfig } from 'dialkit/store';
type $$ComponentProps = {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    shortcut?: ShortcutConfig;
    shortcutActive?: boolean;
    /** @internal A value that arrives with a new count springs into place, like a click on the track. */
    resetCount?: number;
    hint?: string;
};
declare const Slider: import("svelte").Component<$$ComponentProps, {}, "">;
type Slider = ReturnType<typeof Slider>;
export default Slider;
//# sourceMappingURL=Slider.svelte.d.ts.map