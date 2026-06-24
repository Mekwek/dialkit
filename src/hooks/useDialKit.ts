import { useCallback, useEffect, useId, useSyncExternalStore, useRef } from 'react';
import { DialStore, DialConfig, DialValue, ResolvedValues, SpringConfig, EasingConfig, SelectConfig, ColorConfig, TextConfig, ActionConfig, ShortcutConfig, unwrapVisibility } from '../store/DialStore';

export interface UseDialOptions {
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
}

/**
 * Imperative handle for a DialKit panel: reactive `values` plus write methods.
 * `setValue`/`setValues` write flat store paths (the dot-delimited paths used
 * throughout the store, e.g. `"debug.showStats"`), `getValues` reads the
 * current flat snapshot, and `resetValues` restores the panel's base values.
 */
export interface DialKitController<T extends DialConfig> {
  values: ResolvedValues<T>;
  setValue: (path: string, value: DialValue) => void;
  setValues: (updates: Record<string, DialValue>) => void;
  getValues: () => Record<string, DialValue>;
  resetValues: () => void;
}

/**
 * Like {@link useDialKit} but returns the full imperative controller instead of
 * just the resolved values. Use this when the host needs to write values back
 * into the panel (app → DialKit) rather than only reading them.
 */
export function useDialKitController<T extends DialConfig>(
  name: string,
  config: T,
  options?: UseDialOptions
): DialKitController<T> {
  const instanceId = useId();
  const panelId = `${name}-${instanceId}`;
  const configRef = useRef(config);
  const serializedConfig = JSON.stringify(config);
  configRef.current = config;
  const onActionRef = useRef(options?.onAction);
  onActionRef.current = options?.onAction;
  const shortcutsRef = useRef(options?.shortcuts);
  shortcutsRef.current = options?.shortcuts;
  const serializedShortcuts = JSON.stringify(options?.shortcuts);
  const groupRef = useRef(options?.group);
  groupRef.current = options?.group;
  const group = options?.group;
  const defaultOpenRef = useRef(options?.defaultOpen);
  defaultOpenRef.current = options?.defaultOpen;
  const defaultOpenOption = options?.defaultOpen;

  // Register panel on mount
  useEffect(() => {
    DialStore.registerPanel(panelId, name, configRef.current, shortcutsRef.current, groupRef.current, defaultOpenRef.current);
    return () => DialStore.unregisterPanel(panelId);
  }, [panelId, name]);

  // Update panel when config structure, shortcuts, group, or defaultOpen change
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    DialStore.updatePanel(panelId, name, configRef.current, shortcutsRef.current, groupRef.current, defaultOpenRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId, name, serializedConfig, serializedShortcuts, group, defaultOpenOption]);

  // Subscribe to action events
  useEffect(() => {
    return DialStore.subscribeActions(panelId, (action) => {
      onActionRef.current?.(action);
    });
  }, [panelId]);

  // Subscribe to changes
  // DialStore.getValues returns a stable empty object when panel not registered
  const values = useSyncExternalStore(
    (callback) => DialStore.subscribe(panelId, callback),
    () => DialStore.getValues(panelId),
    () => DialStore.getValues(panelId)
  );

  const setValue = useCallback(
    (path: string, value: DialValue) => DialStore.updateValue(panelId, path, value),
    [panelId]
  );
  const setValues = useCallback(
    (updates: Record<string, DialValue>) => DialStore.updateValues(panelId, updates),
    [panelId]
  );
  const getValues = useCallback(() => DialStore.getValues(panelId), [panelId]);
  const resetValues = useCallback(() => DialStore.resetValues(panelId), [panelId]);

  // Build resolved values object
  const resolved = buildResolvedValues(config, values, '') as ResolvedValues<T>;

  return { values: resolved, setValue, setValues, getValues, resetValues };
}

export function useDialKit<T extends DialConfig>(
  name: string,
  config: T,
  options?: UseDialOptions
): ResolvedValues<T> {
  return useDialKitController(name, config, options).values;
}

function buildResolvedValues(
  config: DialConfig,
  flatValues: Record<string, DialValue>,
  prefix: string
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, rawConfigValue] of Object.entries(config)) {
    if (key === '_collapsed') continue;
    const path = prefix ? `${prefix}.${key}` : key;
    // Unwrap conditional-visibility wrapper, if any.
    const configValue = unwrapVisibility(rawConfigValue);

    if (Array.isArray(configValue) && configValue.length <= 4 && typeof configValue[0] === 'number') {
      // Range tuple
      result[key] = flatValues[path] ?? configValue[0];
    } else if (typeof configValue === 'number' || typeof configValue === 'boolean' || typeof configValue === 'string') {
      result[key] = flatValues[path] ?? configValue;
    } else if (isSpringConfig(configValue) || isEasingConfig(configValue)) {
      result[key] = flatValues[path] ?? configValue;
    } else if (isActionConfig(configValue)) {
      result[key] = flatValues[path] ?? configValue;
    } else if (isSelectConfig(configValue)) {
      // Select config resolves to string value
      const defaultValue = configValue.default ?? getFirstOptionValue(configValue.options);
      result[key] = flatValues[path] ?? defaultValue;
    } else if (isColorConfig(configValue)) {
      // Color config resolves to string value
      result[key] = flatValues[path] ?? configValue.default ?? '#000000';
    } else if (isTextConfig(configValue)) {
      // Text config resolves to string value
      result[key] = flatValues[path] ?? configValue.default ?? '';
    } else if (typeof configValue === 'object' && configValue !== null) {
      // Nested object
      result[key] = buildResolvedValues(configValue as DialConfig, flatValues, path);
    }
  }

  return result;
}

function hasType(value: unknown, type: string): boolean {
  return typeof value === 'object' && value !== null && 'type' in value && (value as { type: string }).type === type;
}

function isSpringConfig(value: unknown): value is SpringConfig {
  return hasType(value, 'spring');
}

function isEasingConfig(value: unknown): value is EasingConfig {
  return hasType(value, 'easing');
}

function isActionConfig(value: unknown): value is ActionConfig {
  return hasType(value, 'action');
}

function isSelectConfig(value: unknown): value is SelectConfig {
  return hasType(value, 'select') && 'options' in (value as object) && Array.isArray((value as SelectConfig).options);
}

function isColorConfig(value: unknown): value is ColorConfig {
  return hasType(value, 'color');
}

function isTextConfig(value: unknown): value is TextConfig {
  return hasType(value, 'text');
}

function getFirstOptionValue(options: (string | { value: string; label: string })[]): string {
  const first = options[0];
  return typeof first === 'string' ? first : first.value;
}
