import { AnchorValue } from './anchor.js';

type AnchorControlProps = {
    label: string;
    value: AnchorValue;
    onChange: (value: AnchorValue) => void;
    /** A short sentence shown while H is held over the control. */
    hint?: string;
};
/** A 3 × 3 radio grid: one pick sets both axes, and the highlight slides to it. */
declare function mountAnchorControl(host: HTMLElement, initial: AnchorControlProps): {
    update(next: AnchorControlProps): void;
    destroy(): void;
};

export { type AnchorControlProps, mountAnchorControl };
