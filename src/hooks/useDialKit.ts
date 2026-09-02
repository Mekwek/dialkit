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
  persist?: DialKitPersistOptions;
  onAction?: (action: string) => void;
  shortcuts?: Record<string, ShortcutConfig>;
  /**
   * Optional grouping key. Panels sharing the same non-empty `group` render as
   * collapsible sections inside one merged shell (see `DialRoot`). Omit for an
   * independent standalone panel — the historical default.
   */
  group?: string;
  /**
   * Initial open state for this panel's folder. Defaults to open. Most useful
   * for a grouped panel that should start collapsed as a section inside the
   * merged shell.
   */
  defaultOpen?: boolean;
  /**
   * `false` hides the rename control and disables drag reorder in the
   * preset dropdown (a read-only host such as a share-link viewer).
   * Default `true`.
   */
  presetsEditable?: boolean;
  /**
   * `true` shows a lock toggle on each preset row (left of the trash). Off
   * by default; the host opts in per panel.
   */
  presetsLockable?: boolean;
}

export interface DialKitController<T extends DialConfig> {
  values: ResolvedValues<T>;
  setValue: (path: string, value: DialValue) => void;
  setValues: (values: DialKitValueUpdates<T>) => void;
  resetValues: () => void;
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
    shortcuts: options?.shortcuts,
    group: options?.group,
    defaultOpen: options?.defaultOpen,
    presetsEditable: options?.presetsEditable,
    presetsLockable: options?.presetsLockable,
  });

  const configRef = useRef(config);
  configRef.current = config;
  const onActionRef = useRef(options?.onAction);
  onActionRef.current = options?.onAction;

  // Subscribe to action events
  useEffect(() => {
    return DialStore.subscribeActions(panelId, (action) => {
      onActionRef.current?.(action);
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

  return useMemo(
    () => ({
      values,
      setValue,
      setValues,
      resetValues,
      getValues,
    }),
    [getValues, resetValues, setValue, setValues, values]
  );
}
