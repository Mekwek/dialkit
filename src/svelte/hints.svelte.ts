import { mountHints } from '../hints';

/** Mounts the shared hint listeners while a control has a hint. */
export function createHints(active: () => boolean): void {
  const enabled = $derived(active());
  $effect(() => {
    if (!enabled) return;
    const hints = mountHints();
    return () => hints.destroy();
  });
}
