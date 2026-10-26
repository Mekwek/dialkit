import { useEffect } from 'react';
import { mountHints } from '../hints';

/** Mounts the shared hint listeners while a control has a hint. */
export function useHints(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const hints = mountHints();
    return () => hints.destroy();
  }, [active]);
}
