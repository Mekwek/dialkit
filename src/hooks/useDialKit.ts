import { useCallback, useEffect, useMemo, useRef } from 'react';
import { DialStore, flattenDialValueUpdates, resolveDialValues } from '../store/DialStore';
import type {
  DialConfig,
  DialKitPersistOptions,
  DialKitValueUpdates,
  DialValue,
  ResolvedValues,
  ShortcutConfig,
} from '../store/DialStore';
import { useDialStorePanel } from './useDialStorePanel';

export interface UseDialOptions {
  id?: string;
  defaultCollapsed?: boolean;
  persist?: DialKitPersistOptions;
  onAction?: (action: string) => void;
  /**
   * Called with a folder's path when its reset button (or `DialStore.resetFolder`)
   * resets it, before the reset writes the values back.
   */
  onReset?: (folderPath: string) => void;
  shortcuts?: Record<string, ShortcutConfig>;
}

export interface DialKitController<T extends DialConfig> {
  values: ResolvedValues<T>;
  setValue: (path: string, value: DialValue) => void;
  setValues: (values: DialKitValueUpdates<T>) => void;
  resetValues: () => void;
  setOpen: (open: boolean) => void;
  getOpen: () => boolean | undefined;
  getValues: () => ResolvedValues<T>;
}

export function useDialKit<T extends DialConfig>(
  name: string,
  config: T,
  options?: UseDialOptions
): ResolvedValues<T> {
  return useDialKitController(name, config, options).values;
}

export function useDialKitController<T extends DialConfig>(
  name: string,
  config: T,
  options?: UseDialOptions
): DialKitController<T> {
  const { panelId, flatValues, serializedConfig } = useDialStorePanel(name, config, {
    id: options?.id,
    persist: options?.persist,
    defaultCollapsed: options?.defaultCollapsed,
    shortcuts: options?.shortcuts,
  });

  const configRef = useRef(config);
  configRef.current = config;
  const onActionRef = useRef(options?.onAction);
  onActionRef.current = options?.onAction;
  const onResetRef = useRef(options?.onReset);
  onResetRef.current = options?.onReset;

  // Subscribe to action events
  useEffect(() => {
    return DialStore.subscribeActions(panelId, (action) => {
      onActionRef.current?.(action);
    });
  }, [panelId]);

  // Subscribe to folder resets, which fire before their values change
  useEffect(() => {
    return DialStore.subscribeResets(panelId, (folderPath) => {
      onResetRef.current?.(folderPath);
    });
  }, [panelId]);

  const values = useMemo(
    () => resolveDialValues(configRef.current, flatValues),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flatValues, serializedConfig]
  );

  const setValue = useCallback(
    (path: string, value: DialValue) => {
      DialStore.updateValue(panelId, path, value);
    },
    [panelId]
  );

  const setValues = useCallback(
    (nextValues: DialKitValueUpdates<T>) => {
      DialStore.updateValues(panelId, flattenDialValueUpdates(configRef.current, nextValues));
    },
    [panelId]
  );

  const resetValues = useCallback(() => {
    DialStore.resetValues(panelId);
  }, [panelId]);

  const getValues = useCallback(
    () => resolveDialValues(configRef.current, DialStore.getValues(panelId)),
    [panelId]
  );

  const setOpen = useCallback((open: boolean) => DialStore.setPanelOpen(panelId, open), [panelId]);
  const getOpen = useCallback(() => DialStore.getPanelOpen(panelId), [panelId]);

  return useMemo(
    () => ({
      values,
      setValue,
      setValues,
      resetValues,
      getValues,
      setOpen,
      getOpen,
    }),
    [getValues, getOpen, setOpen, resetValues, setValue, setValues, values]
  );
}
