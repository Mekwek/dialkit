import { AnchorValue } from './anchor.js';

type AnchorControlProps = {
    label: string;
    /** `null`: no cell is picked, and a click on any cell picks it. */
    value: AnchorValue | null;
    onChange: (value: AnchorValue) => void;
    /** A short sentence shown while H is held over the control. */
    hint?: string;
};
/**
 * The value a key gives: the next cell from the picked one, or, with none
 * picked, the middle cell for an arrow and the first or last for Home or End.
 */
declare function anchorKeyPick(value: AnchorValue | null, key: string): AnchorValue | undefined;
/**
 * A 3 × 3 radio grid: one pick sets both axes, and the highlight slides to
 * it. With no cell picked, nothing is highlighted.
 */
declare function mountAnchorControl(host: HTMLElement, initial: AnchorControlProps): {
    update(next: AnchorControlProps): void;
    destroy(): void;
};

export { type AnchorControlProps, anchorKeyPick, mountAnchorControl };
