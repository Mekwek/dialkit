import { BackgroundValue } from './background.js';

type BackgroundControlProps = {
    /** Saved gradients belong to this panel, unless a background host is set (`setBackgroundHost`). */
    panelId: string;
    label: string;
    value: BackgroundValue;
    /**
     * Stores a dropped or picked file and returns its URL. Without it, the
     * background host's `upload` stores it; with no host set, files up to
     * 10 MB are read as data URLs.
     */
    upload?: (file: File) => Promise<string>;
    onChange: (value: BackgroundValue) => void;
};
/** Solid, gradient, and media backgrounds in one control, shared by every adapter. */
declare function mountBackgroundControl(host: HTMLElement, initial: BackgroundControlProps): {
    update(next: BackgroundControlProps): void;
    destroy(): void;
};

export { type BackgroundControlProps, mountBackgroundControl };
