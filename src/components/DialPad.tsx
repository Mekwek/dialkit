import { useEffect, useRef } from 'react';
import { mountDialPad, type DialPadProps } from '../dial-pad-control';

export function DialPad(props: DialPadProps) {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<ReturnType<typeof mountDialPad>>();
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    control.current = mountDialPad(host.current!, latest.current);
    return () => control.current?.destroy();
  }, []);
  useEffect(() => { control.current?.update(props); });
  return <div ref={host} className="dialkit-pad-host" />;
}
