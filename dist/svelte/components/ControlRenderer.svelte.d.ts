import type { ControlMeta, DialValue } from 'dialkit/store';
import ControlRenderer from './ControlRenderer.svelte';
import type { TransitionDurationControl } from './TransitionControl.svelte';
type $$ComponentProps = {
    panelId: string;
    control: ControlMeta;
    values: Record<string, DialValue>;
    transitionDuration?: TransitionDurationControl;
    /** Counts folder resets, so sliders can spring to the values a reset sets. */
    resetCount?: number;
    /** Path of the one open top-level folder in accordion mode, or null when all are closed. */
    openFolder?: string | null;
    onOpenFolderChange?: (path: string | null) => void;
    /** Slide controls in and out as their visibility rules change. */
    animateControls?: boolean;
};
declare const ControlRenderer: import("svelte").Component<$$ComponentProps, {}, "">;
type ControlRenderer = ReturnType<typeof ControlRenderer>;
export default ControlRenderer;
//# sourceMappingURL=ControlRenderer.svelte.d.ts.map