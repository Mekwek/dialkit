import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { mountTransitionCopy, type TransitionCopyProps } from '../transition-presets-control';
import { DialStore, type CopiedTransition, type TransitionConfig } from '../store/DialStore';

/** The copy and paste buttons in a transition's header, for a value the caller owns. */
export function TransitionCopy(props: TransitionCopyProps) {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<ReturnType<typeof mountTransitionCopy>>();
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    control.current = mountTransitionCopy(host.current!, latest.current);
    return () => control.current?.destroy();
  }, []);
  useEffect(() => { control.current?.update(props); });
  return <div ref={host} />;
}

export interface TransitionCopyMenuProps {
  panelId: string;
  /** The transition's path in the panel. */
  path: string;
  value: TransitionConfig;
}

/**
 * A transition's copy and paste buttons, for a header the host draws itself,
 * such as a section whose only row is that transition. Copy keeps the value
 * and its tab (Easing, Time or Physics); paste writes both into the panel.
 */
export function TransitionCopyMenu({ panelId, path, value }: TransitionCopyMenuProps) {
  const subscribe = useCallback((callback: () => void) => DialStore.subscribe(panelId, callback), [panelId]);
  const getMode = useCallback(() => DialStore.getTransitionMode(panelId, path), [panelId, path]);
  const mode = useSyncExternalStore(subscribe, getMode, getMode);
  const paste = (copied: CopiedTransition) => {
    DialStore.updateTransitionMode(panelId, path, copied.mode);
    DialStore.updateValue(panelId, path, copied.value);
  };
  return <TransitionCopy mode={mode} value={value} onPaste={paste} />;
}
