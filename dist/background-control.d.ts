import { BackgroundValue } from './background.js';

type BackgroundControlProps = {
    label: string;
    value: BackgroundValue;
    onChange: (value: BackgroundValue) => void;
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
