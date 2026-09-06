import { useEffect, useRef } from 'react';
import { mountImageControl, type ImageControlProps } from '../image-control';

export function ImageControl(props: ImageControlProps) {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<ReturnType<typeof mountImageControl>>();
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    control.current = mountImageControl(host.current!, latest.current);
    return () => control.current?.destroy();
  }, []);
  useEffect(() => { control.current?.update(props); });
  return <div ref={host} className="dialkit-image-host" />;
}
