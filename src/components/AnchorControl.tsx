import { useEffect, useRef } from 'react';
import { mountAnchorControl, type AnchorControlProps } from '../anchor-control';

export function AnchorControl(props: AnchorControlProps) {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<ReturnType<typeof mountAnchorControl>>();
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    control.current = mountAnchorControl(host.current!, latest.current);
    return () => control.current?.destroy();
  }, []);
  useEffect(() => { control.current?.update(props); });
  return <div ref={host} className="dialkit-anchor-host" />;
}
