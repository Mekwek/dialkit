type ColorControlProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    hint?: string;
};
declare function mountColorControl(host: HTMLElement, initial: ColorControlProps, presentation?: 'popover' | 'inline'): {
    update(next: ColorControlProps): void;
    /** Closes the popover picker. */
    close(): void;
    destroy(): void;
};

export { type ColorControlProps, mountColorControl };
