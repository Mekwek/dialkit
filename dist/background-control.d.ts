import { BackgroundValue } from './background.js';

type BackgroundControlProps = {
    label: string;
    value: BackgroundValue;
    onChange: (value: BackgroundValue) => void;
    /** False when the caller draws the folder named by the label itself (the
     *  React renderer does, with its own Folder); the control then mounts
     *  straight into the host. */
    folder?: boolean;
};
/**
 * The background control: a solid color, a gradient with a stop editor, or a
 * media file the host uploads. One implementation for all five adapters.
 */
declare function mountBackgroundControl(host: HTMLElement, initial: BackgroundControlProps): {
    update(next: BackgroundControlProps): void;
    destroy(): void;
};

export { type BackgroundControlProps, mountBackgroundControl };
