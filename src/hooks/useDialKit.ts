import { useCallback, useEffect, useMemo, useRef } from 'react';
import { DialStore, flattenDialValueUpdates, resolveDialValues } from '../store/DialStore';
import type {
  DialConfig,
  DialKitPersistOptions,
  DialKitValueUpdates,
  DialValue,
  FolderMode,
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
  /**
   * `false` makes the version menu switch versions only: no rename, lock,
   * delete or reorder (for example a viewer of a shared page). Default `true`.
   */
  presetsEditable?: boolean;
  /** `false` drops the lock button from the version menu. Default `true`. */
  presetsLockable?: boolean;
  /** A short sentence about the panel, shown on its header while the hint key is held. */
  hint?: string;
  /**
   * How the panel's top-level folders open: `'accordion'` keeps one open at
   * a time, `'independent'` lets each open on its own. Without it, the panel
   * follows its DialRoot's `accordion`.
   */
  folderMode?: FolderMode;
  /**
   * Called by the X in the panel's header, instead of closing the panel to
   * a small button: the host removes the panel (a selection panel clears
   * the selection).
   */
  onClose?: () => void;
  /**
   * `false` drops the toolbar (versions and copy) from the panel's header.
   * Default `true`.
   */
  toolbar?: boolean;
  /**
   * A group name. Panels that share one draw as sections of their own shell,
   * titled by the group, apart from the shell of the panels without a group.
   */
  group?: string;
  /**
   * In a group, `true` puts this panel's toolbar (versions and copy) in the
   * group shell's header, and drops its section.
   */
  groupHeader?: boolean;
  /**
   * The name of a group, or of the one panel without a group, that this
   * panel opens next to: out of the column, on the side toward the middle of
   * the screen, level with that shell's top edge. Without that shell, or in
   * an inline root, the panel shows as a shell of its own. A panel in a
   * group stays in its group.
   */
  beside?: string;
  /**
   * The word saved versions are named with: the base version is
   * "<prefix> 1" and each new one the next number ("Version 2"). Without it,
   * versions are "V1", "V2"…
   */
  versionPrefix?: string;
  /**
   * `false`: a value change does not render the component again. `values`
   * then holds the values of the component's last render; read the current
   * ones with the controller's `getValues`, and hear each change with its
   * `subscribe`. For a host that sends values on to something outside React
   * (a canvas, an engine) on every frame of a drag. Default `true`.
   */
  renderOnChange?: boolean;
}

export interface DialKitController<T extends DialConfig> {
  values: ResolvedValues<T>;
  setValue: (path: string, value: DialValue) => void;
  setValues: (values: DialKitValueUpdates<T>) => void;
  resetValues: () => void;
  setOpen: (open: boolean) => void;
  getOpen: () => boolean | undefined;
  getValues: () => ResolvedValues<T>;
  /**
   * Calls `listener` after each change of the panel's values or structure,
   * outside React. Returns the call that stops it.
   */
  subscribe: (listener: () => void) => () => void;
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
    presetsEditable: options?.presetsEditable,
    presetsLockable: options?.presetsLockable,
    hint: options?.hint,
    folderMode: options?.folderMode,
    onClose: options?.onClose,
    toolbar: options?.toolbar,
    group: options?.group,
    groupHeader: options?.groupHeader,
    beside: options?.beside,
    versionPrefix: options?.versionPrefix,
    renderOnChange: options?.renderOnChange,
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
  const subscribe = useCallback(
    (listener: () => void) => DialStore.subscribe(panelId, listener),
    [panelId]
  );

  return useMemo(
    () => ({
      values,
      setValue,
      setValues,
      resetValues,
      getValues,
      setOpen,
      getOpen,
      subscribe,
    }),
    [getValues, getOpen, setOpen, resetValues, setValue, setValues, subscribe, values]
  );
}
