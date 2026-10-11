import { useEffect, useLayoutEffect, useRef } from 'react';
import { mountImageControl, type ImageControlProps } from '../image-control';
import { useHint } from './Hint';

/** The image row, with its hint. */
export function ImageControl({ hint, ...props }: ImageControlProps & { hint?: string }) {
  const { hintRow } = useHint(hint);
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<ReturnType<typeof mountImageControl>>();
  const latest = useRef(props);
  latest.current = props;
  // Built before layout effects run: a folder that opens measures its
  // content in one, and an empty host would measure 0px tall.
  useLayoutEffect(() => {
    control.current = mountImageControl(host.current!, latest.current);
    return () => control.current?.destroy();
  }, []);
  useEffect(() => { control.current?.update(props); });
  return <div ref={host} className="dialkit-image-host" {...hintRow} />;
}
