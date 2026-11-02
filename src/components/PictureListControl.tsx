import { useEffect, useLayoutEffect, useRef } from 'react';
import { mountPictureListControl, type PictureListControlProps } from '../picture-list-control';

/** Families of presets as accordion rows, each opening to a grid of picture tiles. */
export function PictureListControl(props: PictureListControlProps) {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<ReturnType<typeof mountPictureListControl>>();
  const latest = useRef(props);
  latest.current = props;
  // Built before layout effects run: a folder that opens measures its
  // content in one, and an empty host would measure 0px tall.
  useLayoutEffect(() => {
    control.current = mountPictureListControl(host.current!, latest.current);
    return () => control.current?.destroy();
  }, []);
  useEffect(() => { control.current?.update(props); });
  return <div ref={host} className="dialkit-pictures-host" />;
}
