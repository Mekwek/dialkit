import { useCallback, useSyncExternalStore } from 'react';
import { DialStore, type DialValue } from '../store/DialStore';

const EMPTY: Record<string, DialValue> = Object.freeze({}) as Record<string, DialValue>;
const noStop = () => {};

/** Runs `read` on each change of the panel. A component redraws only when the result changes. */
function usePanelRead<T>(panelId: string | undefined, read: () => T): T {
  const subscribe = useCallback(
    (callback: () => void) => (panelId === undefined ? noStop : DialStore.subscribe(panelId, callback)),
    [panelId]
  );
  return useSyncExternalStore(subscribe, read, read);
}

/** All the values of a panel. Without a panel, no values. */
export function usePanelValues(panelId: string | undefined): Record<string, DialValue> {
  return usePanelRead(panelId, () => (panelId === undefined ? EMPTY : DialStore.getValues(panelId)));
}

/** One value of a panel, so a write to another value does not redraw its row. */
export function useControlValue(panelId: string | undefined, path: string | undefined): DialValue | undefined {
  return usePanelRead(panelId, () => (panelId === undefined || path === undefined ? undefined : DialStore.getValues(panelId)[path]));
}

/** Whether the reset button of the folder at `path` shows. */
export function useFolderChanged(panelId: string | undefined, path: string | undefined): boolean {
  return usePanelRead(path === undefined ? undefined : panelId, () => (
    panelId !== undefined && path !== undefined && DialStore.isFolderChanged(panelId, path)
  ));
}
