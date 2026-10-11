import { useEffect, useLayoutEffect, useRef } from 'react';
import { mountDialPad, type DialPadProps } from '../dial-pad-control';
import { useHint } from './Hint';

/** The pad, with its hint. */
export function DialPad({ hint, ...props }: DialPadProps & { hint?: string }) {
  const { hintRow } = useHint(hint);
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<ReturnType<typeof mountDialPad>>();
  const latest = useRef(props);
  latest.current = props;
  // Built before layout effects run: a folder that opens measures its
  // content in one, and an empty host would measure 0px tall.
  useLayoutEffect(() => {
    control.current = mountDialPad(host.current!, latest.current);
    return () => control.current?.destroy();
  }, []);
  useEffect(() => { control.current?.update(props); });
  return <div ref={host} className="dialkit-pad-host" {...hintRow} />;
}
