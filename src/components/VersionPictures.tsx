import { useLayoutEffect, useRef } from 'react';
import { mountVersionPictures, type VersionPicturesProps } from '../versions/pictures';

/** Mounts the shared version list (see versions/pictures.ts). */
export function VersionPictures(props: VersionPicturesProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<ReturnType<typeof mountVersionPictures> | null>(null);

  useLayoutEffect(() => {
    const list = mountVersionPictures(hostRef.current!, props);
    listRef.current = list;
    return () => {
      list.destroy();
      listRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    listRef.current?.update(props);
  }, [props.panelId, props.gridOpen, props.onToggleGrid]);

  return <div ref={hostRef} className="dialkit-versions-host" />;
}
