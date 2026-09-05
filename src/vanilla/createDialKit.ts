import { DialStore, flattenDialValueUpdates, resolveDialValues } from '../store/DialStore';
import type { DialConfig, DialKitPersistOptions, DialKitValueUpdates, DialValue, ResolvedValues, ShortcutConfig } from '../store/DialStore';
export interface CreateDialOptions {
  id?: string;
  defaultCollapsed?: boolean;
  persist?: DialKitPersistOptions;
  onAction?: (action: string) => void;
  shortcuts?: Record<string, ShortcutConfig>;
}
export interface DialKitController<T extends DialConfig> {
  readonly id: string;
  readonly values: ResolvedValues<T>;
  getValues(): ResolvedValues<T>;
  setValue(path: string, value: DialValue): void;
  setValues(values: DialKitValueUpdates<T>): void;
  resetValues(): void;
  setOpen(open: boolean): void;
  getOpen(): boolean | undefined;
  /** Called immediately by default, then whenever the panel changes. */
  subscribe(listener: (values: ResolvedValues<T>) => void, immediate?: boolean): () => void;
  updateConfig(config: T): void;
  /** Release this registration and all of its subscriptions. Safe to call twice. */
  destroy(): void;
}
let nextId = 0;
/** A framework-free panel with explicit subscriptions and lifecycle. */
export function createDialKit<T extends DialConfig>(name: string, config: T, options: CreateDialOptions = {}): DialKitController<T> {
  const id = options.id ?? `vanilla-${name}-${++nextId}`;
  let currentConfig = config;
  let destroyed = false;
  const subscriptions = new Set<() => void>();
  const registration = { retainOnUnmount: options.id !== undefined, persist: options.persist, defaultCollapsed: options.defaultCollapsed };
  const getValues = () => resolveDialValues(currentConfig, DialStore.getValues(id));
  DialStore.registerPanel(id, name, currentConfig, options.shortcuts, registration);
  const stopActions = options.onAction ? DialStore.subscribeActions(id, options.onAction) : undefined;
  return {
    id,
    get values() {
      return getValues();
    },
    getValues,
    setValue(path, value) {
      if (!destroyed)
        DialStore.updateValue(id, path, value);
    },
    setValues(values) {
      if (!destroyed)
        DialStore.updateValues(id, flattenDialValueUpdates(currentConfig, values));
    },
    resetValues() {
      if (!destroyed)
        DialStore.resetValues(id);
    },
    setOpen(open) {
      if (!destroyed)
        DialStore.setPanelOpen(id, open);
    },
    getOpen() {
      return DialStore.getPanelOpen(id);
    },
    subscribe(listener, immediate = true) {
      if (destroyed)
        return () => {
        };
      const stop = DialStore.subscribe(id, () => listener(getValues()));
      const unsubscribe = () => {
        stop();
        subscriptions.delete(unsubscribe);
      };
      subscriptions.add(unsubscribe);
      if (immediate)
        listener(getValues());
      return unsubscribe;
    },
    updateConfig(next) {
      if (destroyed)
        return;
      currentConfig = next;
      DialStore.updatePanel(id, name, currentConfig, options.shortcuts, registration);
    },
    destroy() {
      if (destroyed)
        return;
      destroyed = true;
      subscriptions.forEach(stop => stop());
      stopActions?.();
      DialStore.unregisterPanel(id);
    },
  };
}
export const createDialKitController = createDialKit;
