import { useLayoutEffect, useRef } from 'react';
import { mountVersionGallery, type VersionGalleryProps } from '../versions/gallery';

/** Mounts the shared version gallery (see versions/gallery.ts). */
export function VersionGallery(props: VersionGalleryProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<ReturnType<typeof mountVersionGallery> | null>(null);

  useLayoutEffect(() => {
    const gallery = mountVersionGallery(hostRef.current!, props);
    galleryRef.current = gallery;
    return () => {
      gallery.destroy();
      galleryRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    galleryRef.current?.update(props);
  }, [props.panelId, props.theme]);

  return <div ref={hostRef} className="dialkit-versions-host" />;
}
