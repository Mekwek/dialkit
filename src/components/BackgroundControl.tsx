import { useEffect, useRef } from 'react';
import { mountBackgroundControl, type BackgroundControlProps } from '../background-control';

export function BackgroundControl(props: BackgroundControlProps) {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<ReturnType<typeof mountBackgroundControl>>();
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    control.current = mountBackgroundControl(host.current!, latest.current);
    return () => control.current?.destroy();
  }, []);
  useEffect(() => { control.current?.update(props); });
  return <div ref={host} className="dialkit-background-host" />;
}
