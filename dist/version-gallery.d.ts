interface Mounted<P> {
    update(props: P): void;
    destroy(): void;
}

/** How a panel shows its versions: captured thumbnails (default), or a menu. */
type DialVersions = 'menu' | 'thumbnails';
interface VersionGalleryProps {
    panelId: string;
    theme?: 'light' | 'dark' | 'system';
}
declare function mountVersionGallery(host: HTMLElement, initial: VersionGalleryProps): Mounted<VersionGalleryProps>;

export { type DialVersions, type VersionGalleryProps, mountVersionGallery };
