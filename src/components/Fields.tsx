import { useEffect, useRef } from 'react';
import { mountFields, type FieldsProps } from '../fields-control';

export function Fields(props: FieldsProps) {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<ReturnType<typeof mountFields>>();
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    control.current = mountFields(host.current!, latest.current);
    return () => control.current?.destroy();
  }, []);
  useEffect(() => { control.current?.update(props); });
  return <div ref={host} className="dialkit-fields-host" />;
}
