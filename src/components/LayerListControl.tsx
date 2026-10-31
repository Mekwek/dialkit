import { useEffect, useLayoutEffect, useRef } from 'react';
import { mountLayerListControl, type LayerListControlProps } from '../layer-list-control';

/** The layer list: an add button, then rows with an eye, duplicate and delete. */
export function LayerListControl(props: LayerListControlProps) {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<ReturnType<typeof mountLayerListControl>>();
  const latest = useRef(props);
  latest.current = props;
  // Built before layout effects run: a folder that opens measures its
  // content in one, and an empty host would measure 0px tall.
  useLayoutEffect(() => {
    control.current = mountLayerListControl(host.current!, latest.current);
    return () => control.current?.destroy();
  }, []);
  useEffect(() => { control.current?.update(props); });
  return <div ref={host} className="dialkit-layers-host" />;
}
