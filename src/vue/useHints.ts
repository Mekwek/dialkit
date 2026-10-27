import { computed, watchEffect } from 'vue';
import { mountHints } from '../hints';

/** Mounts the shared hint listeners while a control has a hint. */
export function useHints(active: () => boolean): void {
  const enabled = computed(active);
  watchEffect((onCleanup) => {
    if (!enabled.value) return;
    const hints = mountHints();
    onCleanup(() => hints.destroy());
  });
}
