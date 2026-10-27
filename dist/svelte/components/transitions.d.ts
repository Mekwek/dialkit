import type { TransitionConfig } from 'svelte/transition';
/** Fold the content without fading its controls or retaining scroll overflow. */
export declare function folderTransition(node: HTMLElement): TransitionConfig;
/** Slide a control in or out on the other adapters' spring, fading it and closing the row gap below it as it goes. */
export declare function controlTransition(node: HTMLElement): TransitionConfig;
export declare function dropdownTransition(node: Element, params?: {
    above?: boolean;
    duration?: number;
}): TransitionConfig;
//# sourceMappingURL=transitions.d.ts.map