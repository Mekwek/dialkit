import type { SpringConfig } from 'dialkit/store';
type $$ComponentProps = {
    panelId: string;
    path: string;
    label: string;
    spring: SpringConfig;
    onChange: (spring: SpringConfig) => void;
    /** Shows a reset button in the header. See Folder's onReset. */
    onReset?: () => void;
    changed?: boolean;
    hint?: string;
};
declare const SpringControl: import("svelte").Component<$$ComponentProps, {}, "">;
type SpringControl = ReturnType<typeof SpringControl>;
export default SpringControl;
//# sourceMappingURL=SpringControl.svelte.d.ts.map