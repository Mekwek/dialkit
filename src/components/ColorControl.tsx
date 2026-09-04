import { useEffect, useRef } from 'react';
import { mountColorControl, type ColorControlProps } from '../color-control';

export function ColorControl(props: ColorControlProps) {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<ReturnType<typeof mountColorControl>>();
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    control.current = mountColorControl(host.current!, latest.current);
    return () => control.current?.destroy();
  }, []);
  useEffect(() => { control.current?.update(props); });
  return <div ref={host} className="dialkit-color-host" />;
}
