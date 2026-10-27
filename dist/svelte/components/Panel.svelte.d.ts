import type { Snippet } from 'svelte';
import type { PanelConfig } from 'dialkit/store';
import type { DialVersions } from '../../version-gallery';
type $$ComponentProps = {
    panel: PanelConfig;
    defaultOpen?: boolean;
    inline?: boolean;
    accordion?: boolean;
    openFolder?: string | null;
    onOpenFolderChange?: (path: string | null) => void;
    onOpenChange?: (open: boolean) => void;
    variant?: 'root' | 'section';
    toolbarExtra?: Snippet;
    versions?: DialVersions;
    theme?: 'light' | 'dark' | 'system';
};
declare const Panel: import("svelte").Component<$$ComponentProps, {}, "">;
type Panel = ReturnType<typeof Panel>;
export default Panel;
//# sourceMappingURL=Panel.svelte.d.ts.map