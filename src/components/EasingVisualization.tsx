import { useEffect, useRef } from 'react';
import { mountEasingVisualization, type EasingVisualizationProps } from '../easing-control';

export { easingPresets } from '../easing-geometry';

export function EasingVisualization(props: EasingVisualizationProps) {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<ReturnType<typeof mountEasingVisualization>>();
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    control.current = mountEasingVisualization(host.current!, latest.current);
    return () => control.current?.destroy();
  }, []);
  useEffect(() => { control.current?.update(props); });
  return <div ref={host} className="dialkit-easing-host" />;
}
