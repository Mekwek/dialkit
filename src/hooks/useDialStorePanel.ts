import { useCallback, useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { DialStore } from '../store/DialStore';
import type { DialConfig, DialKitPersistOptions, DialValue, FolderMode, ShortcutConfig } from '../store/DialStore';

export interface UseDialStorePanelOptions {
  id?: string;
  defaultCollapsed?: boolean;
  persist?: DialKitPersistOptions;
  shortcuts?: Record<string, ShortcutConfig>;
  kind?: 'timeline';
  /**
   * Optional grouping key. Panels sharing the same non-empty `group` are
   * rendered as collapsible sections inside ONE merged shell by `DialRoot`.
   */
  group?: string;
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
  /**
   * A short sentence about the panel. It shows on the panel's header while
   * the hint key is held.
   */
  hint?: string;
  /**
   * In a group, `true` puts this panel's version toolbar (add, the version
   * menu, copy) in the group's own header, as on a standalone panel, and
   * drops its section.
   */
  groupHeader?: boolean;
  /**
   * The name of a group, or of a panel with no group, this panel opens next
   * to. It sits beside that panel, toward the middle of the screen, with
   * the same top edge, instead of in the column. See `PanelConfig.beside`.
   */
  beside?: string;
  /**
   * Called by the X in the panel's header, instead of closing the panel to
   * a small button. The host removes the panel (and, for a selection
   * panel, clears the selection).
   */
  onClose?: () => void;
  /**
   * This panel's own folder mode. Without it, the panel takes the
   * `folderMode` of its `DialRoot`.
   */
  folderMode?: FolderMode;
  /**
   * `false` drops the version toolbar (add, the version menu, copy) from
   * the panel's header. Default `true`.
   */
  toolbar?: boolean;
}

// Serialize with a referential short-circuit: consumers can re-render at 60Hz
// during timeline playback, and re-stringifying an unchanged config every
// frame is wasted work whenever the object is memoized or module-stable.
export function useSerialized(value: unknown): string {
  const ref = useRef<{ value: unknown; text: string }>();
  if (!ref.current || !Object.is(ref.current.value, value)) {
    ref.current = { value, text: JSON.stringify(value) };
  }
  return ref.current.text;
}

// The DialStore panel lifecycle shared by useDialKit and useDialTimeline:
// stable panel id, register on mount / unregister on unmount, push structure
// changes on config edits, and subscribe to the flat value snapshot.
// Fixes to StrictMode/HMR behavior belong here so every panel-backed hook
// gets them.
export function useDialStorePanel(
  name: string,
  config: DialConfig,
  options: UseDialStorePanelOptions = {}
): { panelId: string; flatValues: Record<string, DialValue>; serializedConfig: string } {
  const instanceId = useId();
  const hasStableId = options.id !== undefined;
  const panelId = options.id ?? `${name}-${instanceId}`;

  const configRef = useRef(config);
  configRef.current = config;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const serializedConfig = useSerialized(config);
  const serializedShortcuts = useSerialized(options.shortcuts);
  const serializedPersist = useSerialized(options.persist);

  // The store keeps one close handler per panel, so a host passing a new
  // function on each render neither rebuilds the panel nor goes stale.
  const hasOnClose = options.onClose !== undefined;
  const handleClose = useCallback(() => optionsRef.current.onClose?.(), []);

  // Register on mount
  useEffect(() => {
    DialStore.registerPanel(panelId, name, configRef.current, optionsRef.current.shortcuts, {
      retainOnUnmount: hasStableId,
      persist: optionsRef.current.persist,
      defaultCollapsed: optionsRef.current.defaultCollapsed,
      kind: optionsRef.current.kind,
      group: optionsRef.current.group,
      presetsEditable: optionsRef.current.presetsEditable,
      presetsLockable: optionsRef.current.presetsLockable,
      hint: optionsRef.current.hint,
      groupHeader: optionsRef.current.groupHeader,
      beside: optionsRef.current.beside,
      onClose: optionsRef.current.onClose ? handleClose : undefined,
      folderMode: optionsRef.current.folderMode,
      toolbar: optionsRef.current.toolbar,
    });
    return () => DialStore.unregisterPanel(panelId);
  }, [hasStableId, panelId, name, handleClose]);

  // Push structure changes without re-registering
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    DialStore.updatePanel(panelId, name, configRef.current, optionsRef.current.shortcuts, {
      retainOnUnmount: hasStableId,
      persist: optionsRef.current.persist,
      defaultCollapsed: optionsRef.current.defaultCollapsed,
      kind: optionsRef.current.kind,
      group: optionsRef.current.group,
      presetsEditable: optionsRef.current.presetsEditable,
      presetsLockable: optionsRef.current.presetsLockable,
      hint: optionsRef.current.hint,
      groupHeader: optionsRef.current.groupHeader,
      beside: optionsRef.current.beside,
      onClose: optionsRef.current.onClose ? handleClose : undefined,
      folderMode: optionsRef.current.folderMode,
      toolbar: optionsRef.current.toolbar,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStableId, panelId, name, serializedConfig, serializedShortcuts, serializedPersist, options.group, options.presetsEditable, options.presetsLockable, options.hint, options.groupHeader, options.beside, hasOnClose, options.folderMode, options.toolbar]);

  const subscribe = useCallback(
    (callback: () => void) => DialStore.subscribe(panelId, callback),
    [panelId]
  );
  const getSnapshot = useCallback(() => DialStore.getValues(panelId), [panelId]);

  // DialStore.getValues returns a stable empty object when panel is not registered.
  const flatValues = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return { panelId, flatValues, serializedConfig };
}
