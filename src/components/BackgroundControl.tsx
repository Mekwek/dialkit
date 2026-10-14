import { useEffect, useLayoutEffect, useRef } from 'react';
import { mountBackgroundControl, type BackgroundControlProps } from '../background-control';
import { useHint } from './Hint';

/** The background control (solid, gradient, media), with its hint. */
export function BackgroundControl({ hint, ...props }: BackgroundControlProps & { hint?: string }) {
  const { hintRow } = useHint(hint);
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<ReturnType<typeof mountBackgroundControl>>();
  const latest = useRef(props);
  latest.current = props;
  // Built before layout effects run: a folder that opens measures its
  // content in one, and an empty host would measure 0px tall.
  useLayoutEffect(() => {
    control.current = mountBackgroundControl(host.current!, latest.current);
    return () => control.current?.destroy();
  }, []);
  useEffect(() => { control.current?.update(props); });
  return <div ref={host} className="dialkit-bg-host" {...hintRow} />;
}
