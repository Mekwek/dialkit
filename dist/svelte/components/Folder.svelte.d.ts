import type { Snippet } from 'svelte';
type $$ComponentProps = {
    title: string;
    defaultOpen?: boolean;
    open?: boolean;
    isRoot?: boolean;
    inline?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    toolbar?: Snippet;
    /** Short text at the end of a nested folder's title row, such as the preset in use. */
    meta?: string;
    /** Buttons beside the title of a nested folder, such as a transition's copy and paste. */
    actions?: Snippet;
    panelHeightOffset?: number;
    /** Shows a reset button after the title, visible while `changed` is true. */
    onReset?: () => void;
    changed?: boolean;
    children?: Snippet;
    hint?: string;
};
declare const Folder: import("svelte").Component<$$ComponentProps, {}, "">;
type Folder = ReturnType<typeof Folder>;
export default Folder;
//# sourceMappingURL=Folder.svelte.d.ts.map