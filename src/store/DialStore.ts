// Lightweight state store with subscriptions for dialkit

export type SpringConfig = {
  type: 'spring';
  stiffness?: number;
  damping?: number;
  mass?: number;
  visualDuration?: number;
  bounce?: number;
};

export type EasingConfig = {
  type: 'easing';
  duration: number;
  ease: [number, number, number, number];
};

export type TransitionConfig = SpringConfig | EasingConfig;

export type ActionConfig = {
  type: 'action';
  label?: string;
};

export type SelectConfig = {
  type: 'select';
  options: (string | { value: string; label: string })[];
  default?: string;
};

export type ColorConfig = {
  type: 'color';
  default?: string;
};

export type TextConfig = {
  type: 'text';
  default?: string;
  placeholder?: string;
};

export type DialValue = number | boolean | string | SpringConfig | EasingConfig | ActionConfig | SelectConfig | ColorConfig | TextConfig;

export type VisibleWhenValue = string | boolean | number;

/**
 * Rule for conditional control visibility. Exactly one of `is` or `not`
 * should be provided — if both are set, only `is` is evaluated.
 */
export type VisibleWhen = {
  /**
   * Flat store path of another control in the same panel to watch.
   * Must be the full dot-delimited path as it appears in panel.values
   * (e.g. `"debug.showStats"` for a nested control, not a relative path).
   */
  field: string;
} & (
  | { is: VisibleWhenValue | VisibleWhenValue[]; not?: never }
  | { not: VisibleWhenValue | VisibleWhenValue[]; is?: never }
  | { is?: undefined; not?: undefined }
);

/**
 * Wraps a control with a visibility rule. The control is only added to the
 * panel's rendered tree when its rule passes. Re-evaluated on every value
 * change. Use the {@link withVisibility} helper instead of building this by hand.
 */
export type ControlWithVisibility<T = DialValue | [number, number, number, number?] | DialConfig> = {
  value: T;
  visibleWhen: VisibleWhen;
};

/**
 * Tag any DialKit control with a conditional visibility rule. The control is
 * only shown when `rule` passes against the current panel values.
 *
 * @example
 * const config = {
 *   layoutMode: { type: 'select', options: ['grid', 'sphere'] },
 *   radius: withVisibility([1, 0, 10], { field: 'layoutMode', is: 'sphere' }),
 * };
 */
export function withVisibility<T extends DialValue | [number, number, number, number?] | DialConfig>(
  control: T,
  rule: VisibleWhen
): ControlWithVisibility<T> {
  return { value: control, visibleWhen: rule };
}

/** The union of all value shapes that can appear in a DialConfig entry. */
type DialConfigValue = DialValue | [number, number, number, number?] | DialConfig;

/**
 * Detect and unwrap a `{ value, visibleWhen }` wrapper produced by
 * {@link withVisibility}. Returns the inner value if wrapped, or the
 * original value if not.
 *
 * Exported for use by framework hooks (React, Solid, Svelte, Vue) so
 * they can strip the wrapper when building resolved values without
 * duplicating the detection logic.
 */
export function unwrapVisibility(raw: unknown): DialConfigValue {
  if (
    typeof raw === 'object' &&
    raw !== null &&
    !Array.isArray(raw) &&
    'value' in raw &&
    'visibleWhen' in raw
  ) {
    return (raw as ControlWithVisibility).value;
  }
  return raw as DialConfigValue;
}

export type DialConfig = {
  [key: string]: DialValue | [number, number, number, number?] | DialConfig | ControlWithVisibility;
};

export type ResolvedValues<T extends DialConfig> = {
  [K in keyof T]: T[K] extends [number, number, number, number?]
    ? number
    : T[K] extends SpringConfig
      ? TransitionConfig
      : T[K] extends EasingConfig
        ? TransitionConfig
        : T[K] extends SelectConfig
          ? string
          : T[K] extends ColorConfig
            ? string
            : T[K] extends TextConfig
              ? string
              : T[K] extends DialConfig
                ? ResolvedValues<T[K]>
                : T[K];
};

export type DialKitValueUpdates<T extends DialConfig> = {
  [K in keyof T as K extends '_collapsed' ? never : K]?: T[K] extends [number, number, number, number?]
    ? number
    : T[K] extends SpringConfig | EasingConfig
      ? TransitionConfig
      : T[K] extends ActionConfig
        ? never
        : T[K] extends SelectConfig | ColorConfig | TextConfig
          ? string
          : T[K] extends DialConfig
            ? DialKitValueUpdates<T[K]>
            : T[K];
};

export type ShortcutMode = 'fine' | 'normal' | 'coarse';
export type ShortcutInteraction = 'scroll' | 'drag' | 'move' | 'scroll-only';

export type ShortcutConfig = {
  key?: string;
  modifier?: 'alt' | 'shift' | 'meta';
  mode?: ShortcutMode;
  interaction?: ShortcutInteraction;
};

export type ControlMeta = {
  type: 'slider' | 'toggle' | 'spring' | 'transition' | 'folder' | 'action' | 'select' | 'color' | 'text';
  path: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  children?: ControlMeta[];
  defaultOpen?: boolean;
  options?: (string | { value: string; label: string })[];
  placeholder?: string;
  shortcut?: ShortcutConfig;
  /** Conditional visibility rule attached via {@link withVisibility}. */
  visibleWhen?: VisibleWhen;
};

export type PanelConfig = {
  id: string;
  name: string;
  controls: ControlMeta[];
  values: Record<string, DialValue>;
  shortcuts: Record<string, ShortcutConfig>;
  kind?: 'timeline';
  /**
   * Optional grouping key. Panels sharing the same non-empty `group` are
   * rendered as collapsible sections inside ONE merged shell by `DialRoot`.
   * Panels with no group (the default) render as independent standalone
   * shells, exactly as before.
   */
  group?: string;
  /**
   * Initial open state for this panel's folder. Defaults to open. Most useful
   * for a grouped panel that should start collapsed as a section inside the
   * merged shell (e.g. a secondary settings section). `undefined` ⇒ open.
   */
  defaultOpen?: boolean;
};

type Listener = () => void;
type ActionListener = (action: string) => void;

export type Preset = {
  id: string;
  name: string;
  values: Record<string, DialValue>;
};

export type DialKitPersistOptions = boolean | {
  key?: string;
  storage?: 'localStorage' | 'sessionStorage';
  presets?: boolean;
};

export type DialStorePanelOptions = {
  retainOnUnmount?: boolean;
  persist?: DialKitPersistOptions;
  kind?: 'timeline';
  /**
   * Optional grouping key. See {@link PanelConfig.group}.
   */
  group?: string;
  /**
   * Initial open state for this panel's folder. See {@link PanelConfig.defaultOpen}.
   */
  defaultOpen?: boolean;
};

type PersistConfig = {
  key: string;
  storage: 'localStorage' | 'sessionStorage';
  presets: boolean;
};

type PersistedPanelState = {
  version: 1;
  values?: Record<string, DialValue>;
  baseValues?: Record<string, DialValue>;
  presets?: Preset[];
  activePresetId?: string | null;
};

// Stable empty object for unregistered panels (React 19 useSyncExternalStore requirement)
const EMPTY_VALUES: Record<string, DialValue> = Object.freeze({});

export function resolveDialValues<T extends DialConfig>(
  config: T,
  flatValues: Record<string, DialValue>
): ResolvedValues<T> {
  return resolveConfigValues(config, flatValues, '') as ResolvedValues<T>;
}

export function flattenDialValueUpdates<T extends DialConfig>(
  config: T,
  updates: DialKitValueUpdates<T>
): Record<string, DialValue> {
  const values: Record<string, DialValue> = {};
  if (typeof updates === 'object' && updates !== null) {
    flattenConfigUpdates(config, updates as Record<string, unknown>, '', values);
  }
  return values;
}

function resolveConfigValues(
  config: DialConfig,
  flatValues: Record<string, DialValue>,
  prefix: string
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, rawConfigValue] of Object.entries(config)) {
    if (key === '_collapsed') continue;
    const path = prefix ? `${prefix}.${key}` : key;
    const configValue = unwrapVisibility(rawConfigValue);

    if (Array.isArray(configValue) && configValue.length <= 4 && typeof configValue[0] === 'number') {
      result[key] = flatValues[path] ?? configValue[0];
    } else if (typeof configValue === 'number' || typeof configValue === 'boolean' || typeof configValue === 'string') {
      result[key] = flatValues[path] ?? configValue;
    } else if (isSpringConfigValue(configValue) || isEasingConfigValue(configValue)) {
      result[key] = flatValues[path] ?? configValue;
    } else if (isActionConfigValue(configValue)) {
      result[key] = flatValues[path] ?? configValue;
    } else if (isSelectConfigValue(configValue)) {
      const defaultValue = configValue.default ?? getFirstOptionValue(configValue.options);
      result[key] = flatValues[path] ?? defaultValue;
    } else if (isColorConfigValue(configValue)) {
      result[key] = flatValues[path] ?? configValue.default ?? '#000000';
    } else if (isTextConfigValue(configValue)) {
      result[key] = flatValues[path] ?? configValue.default ?? '';
    } else if (typeof configValue === 'object' && configValue !== null) {
      result[key] = resolveConfigValues(configValue as DialConfig, flatValues, path);
    }
  }

  return result;
}

function flattenConfigUpdates(
  config: DialConfig,
  updates: Record<string, unknown>,
  prefix: string,
  values: Record<string, DialValue>
): void {
  for (const [key, rawConfigValue] of Object.entries(config)) {
    if (key === '_collapsed' || !(key in updates)) continue;

    const nextValue = updates[key];
    if (nextValue === undefined) continue;

    const path = prefix ? `${prefix}.${key}` : key;
    const configValue = unwrapVisibility(rawConfigValue);

    if (isActionConfigValue(configValue)) {
      continue;
    }

    if (isLeafConfigValue(configValue)) {
      values[path] = nextValue as DialValue;
      continue;
    }

    if (
      typeof configValue === 'object' &&
      configValue !== null &&
      typeof nextValue === 'object' &&
      nextValue !== null &&
      !Array.isArray(nextValue)
    ) {
      flattenConfigUpdates(configValue as DialConfig, nextValue as Record<string, unknown>, path, values);
    }
  }
}

function isLeafConfigValue(value: unknown): boolean {
  return (
    (Array.isArray(value) && value.length <= 4 && typeof value[0] === 'number') ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'string' ||
    isSpringConfigValue(value) ||
    isEasingConfigValue(value) ||
    isActionConfigValue(value) ||
    isSelectConfigValue(value) ||
    isColorConfigValue(value) ||
    isTextConfigValue(value)
  );
}

function hasType(value: unknown, type: string): boolean {
  return typeof value === 'object' && value !== null && 'type' in value && (value as { type: string }).type === type;
}

export function isSpringConfigValue(value: unknown): value is SpringConfig {
  return hasType(value, 'spring');
}

export function isEasingConfigValue(value: unknown): value is EasingConfig {
  return hasType(value, 'easing');
}

export function isHexColor(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value);
}

/** camelCase → Title Case, the label rule used everywhere a key becomes UI text. */
export function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/** Default slider step for a numeric range. */
export function inferStep(min: number, max: number): number {
  const range = max - min;
  if (range <= 1) return 0.01;
  if (range <= 10) return 0.1;
  if (range <= 100) return 1;
  return 10;
}

function isActionConfigValue(value: unknown): value is ActionConfig {
  return hasType(value, 'action');
}

function isSelectConfigValue(value: unknown): value is SelectConfig {
  return hasType(value, 'select') && 'options' in (value as object) && Array.isArray((value as SelectConfig).options);
}

function isColorConfigValue(value: unknown): value is ColorConfig {
  return hasType(value, 'color');
}

function isTextConfigValue(value: unknown): value is TextConfig {
  return hasType(value, 'text');
}

function getFirstOptionValue(options: (string | { value: string; label: string })[]): string {
  const first = options[0];
  if (first === undefined) return '';
  return typeof first === 'string' ? first : first.value;
}

class DialStoreClass {
  private panels: Map<string, PanelConfig> = new Map();
  private panelsSnapshot: PanelConfig[] = [];
  private standardPanelsSnapshot: PanelConfig[] = [];
  private timelinePanelsSnapshot: PanelConfig[] = [];
  private listeners: Map<string, Set<Listener>> = new Map();
  private globalListeners: Set<Listener> = new Set();
  private snapshots: Map<string, Record<string, DialValue>> = new Map();
  private actionListeners: Map<string, Set<ActionListener>> = new Map();
  private presets: Map<string, Preset[]> = new Map();
  private activePreset: Map<string, string | null> = new Map();
  private baseValues: Map<string, Record<string, DialValue>> = new Map();
  private defaultValues: Map<string, Record<string, DialValue>> = new Map();
  private registrationCounts: Map<string, number> = new Map();
  private retainedPanels: Set<string> = new Set();
  private persistConfigs: Map<string, PersistConfig> = new Map();
  /**
   * Full (unfiltered) control tree per panel. `panels[id].controls` holds the
   * tree with conditional-visibility controls already filtered out, which is
   * what the UI renders. We keep the unfiltered tree here so visibility can
   * flip back when a dependent value changes.
   */
  private allControls: Map<string, ControlMeta[]> = new Map();

  registerPanel(id: string, name: string, config: DialConfig, shortcuts?: Record<string, ShortcutConfig>, options: DialStorePanelOptions = {}): void {
    const existingPanel = this.panels.get(id);
    if (existingPanel && existingPanel.kind !== options.kind) {
      console.warn(
        `[dialkit] Panel id "${id}" cannot be shared by a timeline and a standard panel; ` +
        `the most recent registration controls where it renders.`
      );
    }
    this.configurePanelRetention(id, options);
    this.registrationCounts.set(id, (this.registrationCounts.get(id) ?? 0) + 1);

    const allControls = this.parseConfig(config, '', shortcuts);
    const controlsByPath = this.mapControlsByPath(allControls);
    const defaultValues = this.flattenValues(config, '');

    // Set initial transition modes based on config types
    this.initTransitionModes(config, '', defaultValues);

    const persisted = this.loadPersistedPanel(id);
    const previousValues = this.panels.get(id)?.values ?? this.snapshots.get(id) ?? persisted?.values ?? {};
    const values = this.reconcileValues(defaultValues, previousValues, controlsByPath);

    const previousBaseValues = this.baseValues.get(id) ?? persisted?.baseValues ?? persisted?.values ?? {};
    const baseValues = this.reconcileValues(defaultValues, previousBaseValues, controlsByPath);

    // Store the unfiltered tree so visibility can flip back later, then
    // filter against the RECONCILED values (not raw defaults) for HMR/retain.
    this.allControls.set(id, allControls);
    const controls = this.filterByVisibility(allControls, values);

    this.panels.set(id, { id, name, controls, values, shortcuts: shortcuts ?? {}, kind: options.kind, group: options.group, defaultOpen: options.defaultOpen });
    this.snapshots.set(id, { ...values });
    this.baseValues.set(id, baseValues);
    this.defaultValues.set(id, { ...defaultValues });

    const existingPresets = this.presets.get(id) ?? persisted?.presets;
    if (existingPresets) {
      this.presets.set(id, this.reconcilePresets(existingPresets, defaultValues, controlsByPath));
    }
    if (!this.activePreset.has(id) && persisted?.activePresetId !== undefined) {
      this.activePreset.set(id, persisted.activePresetId);
    }

    this.persistPanel(id);
    this.notify(id);
    this.notifyGlobal();
  }

  updatePanel(id: string, name: string, config: DialConfig, shortcuts?: Record<string, ShortcutConfig>, options: DialStorePanelOptions = {}): void {
    this.configurePanelRetention(id, options);
    const existing = this.panels.get(id);
    if (!existing) {
      this.registerPanel(id, name, config, shortcuts, options);
      return;
    }

    const allControls = this.parseConfig(config, '', shortcuts);
    const controlsByPath = this.mapControlsByPath(allControls);
    const defaultValues = this.flattenValues(config, '');
    this.initTransitionModes(config, '', defaultValues);
    const nextValues = this.reconcileValues(defaultValues, existing.values, controlsByPath);

    // Store the unfiltered tree, filter against the reconciled next values.
    this.allControls.set(id, allControls);
    const controls = this.filterByVisibility(allControls, nextValues);

    const nextPanel: PanelConfig = {
      id,
      name,
      controls,
      values: nextValues,
      shortcuts: shortcuts ?? existing.shortcuts,
      kind: options.kind ?? existing.kind,
      group: options.group ?? existing.group,
      defaultOpen: options.defaultOpen ?? existing.defaultOpen,
    };
    this.panels.set(id, nextPanel);
    this.snapshots.set(id, { ...nextValues });

    const previousBaseValues = this.baseValues.get(id) ?? {};
    const nextBaseValues = this.reconcileValues(defaultValues, previousBaseValues, controlsByPath);

    for (const [path, value] of Object.entries(nextValues)) {
      if (path.endsWith('.__mode')) {
        nextBaseValues[path] = value;
      }
    }

    this.baseValues.set(id, nextBaseValues);
    this.defaultValues.set(id, { ...defaultValues });
    this.presets.set(id, this.reconcilePresets(this.presets.get(id) ?? [], defaultValues, controlsByPath));

    this.persistPanel(id);
    this.notify(id);
    this.notifyGlobal();
  }

  unregisterPanel(id: string): void {
    const nextCount = (this.registrationCounts.get(id) ?? 1) - 1;
    if (nextCount > 0) {
      this.registrationCounts.set(id, nextCount);
      return;
    }

    this.registrationCounts.delete(id);
    this.panels.delete(id);
    // Keep listener sets: subscribed components can outlive the registration
    // (HMR unregister/re-register of the same id) and must keep receiving
    // notifications. Cleanup happens via unsubscribe closures.
    if (this.listeners.get(id)?.size === 0) this.listeners.delete(id);
    if (this.actionListeners.get(id)?.size === 0) this.actionListeners.delete(id);

    if (!this.retainedPanels.has(id)) {
      this.snapshots.delete(id);
      this.baseValues.delete(id);
      this.defaultValues.delete(id);
      this.presets.delete(id);
      this.activePreset.delete(id);
      this.persistConfigs.delete(id);
      this.allControls.delete(id);
    }
    // Retained panels keep their allControls entry so a later re-registration
    // (or a visibility re-eval before re-registration) has the full tree.

    this.notifyGlobal();
  }

  updateValue(panelId: string, path: string, value: DialValue): void {
    this.updateValues(panelId, { [path]: value });
  }

  updateValues(panelId: string, updates: Record<string, DialValue>): void {
    const panel = this.panels.get(panelId);
    if (!panel) return;

    const validUpdates: Record<string, DialValue> = {};

    for (const [path, value] of Object.entries(updates)) {
      if (!Object.prototype.hasOwnProperty.call(panel.values, path)) {
        continue;
      }

      const control = this.findControlByPath(panel.controls, path);
      if (control?.type === 'action') {
        continue;
      }

      panel.values[path] = value;
      validUpdates[path] = value;

      // A transition control renders from TWO keys: the config value and the
      // `.__mode` sibling that picks which editor (easing/time/physics) is
      // shown. A programmatic write that changes the config's type without
      // updating the mode leaves the control rendering the OLD type's
      // editors over the new value — so derive the mode from the value here,
      // exactly as registration does in initTransitionModes.
      if (control?.type === 'transition') {
        const mode = this.transitionModeFor(value);
        if (mode) {
          panel.values[`${path}.__mode`] = mode;
          validUpdates[`${path}.__mode`] = mode;
        }
      }
    }

    if (Object.keys(validUpdates).length === 0) {
      return;
    }

    // Auto-save to active preset or base values
    const activeId = this.activePreset.get(panelId);
    if (activeId) {
      const presets = this.presets.get(panelId) ?? [];
      const preset = presets.find(p => p.id === activeId);
      if (preset) {
        for (const [path, value] of Object.entries(validUpdates)) {
          preset.values[path] = value;
        }
      }
    } else {
      const base = this.baseValues.get(panelId);
      if (base) {
        for (const [path, value] of Object.entries(validUpdates)) {
          base[path] = value;
        }
      }
    }

    // Create a new snapshot reference so useSyncExternalStore detects the change
    this.snapshots.set(panelId, { ...panel.values });
    this.persistPanel(panelId);
    this.notify(panelId);

    // Re-evaluate conditional visibility once after the whole batch, against
    // the values that just landed above. If any control's visibility
    // flipped, rebuild the filtered tree and bump the global listener so
    // DialRoot picks up the new controls array.
    const allControls = this.allControls.get(panelId);
    if (allControls) {
      const nextControls = this.filterByVisibility(allControls, panel.values);
      if (!this.sameControlPaths(panel.controls, nextControls)) {
        panel.controls = nextControls;
        this.notifyGlobal();
      }
    }
  }

  resetValues(panelId: string): void {
    const panel = this.panels.get(panelId);
    const defaults = this.defaultValues.get(panelId);
    if (!panel || !defaults) return;

    panel.values = { ...defaults };
    this.snapshots.set(panelId, { ...panel.values });
    this.baseValues.set(panelId, { ...defaults });
    this.activePreset.set(panelId, null);
    this.persistPanel(panelId);
    this.notify(panelId);

    const allControls = this.allControls.get(panelId);
    if (allControls) {
      const nextControls = this.filterByVisibility(allControls, panel.values);
      if (!this.sameControlPaths(panel.controls, nextControls)) {
        panel.controls = nextControls;
        this.notifyGlobal();
      }
    }
  }

  updateSpringMode(panelId: string, path: string, mode: 'simple' | 'advanced'): void {
    this.updateTransitionMode(panelId, path, mode);
  }

  getSpringMode(panelId: string, path: string): 'simple' | 'advanced' {
    const mode = this.getTransitionMode(panelId, path);
    if (mode === 'easing') return 'simple';
    return mode;
  }

  updateTransitionMode(panelId: string, path: string, mode: 'easing' | 'simple' | 'advanced'): void {
    const panel = this.panels.get(panelId);
    if (!panel) return;

    panel.values[`${path}.__mode`] = mode;
    this.snapshots.set(panelId, { ...panel.values });
    this.persistPanel(panelId);
    this.notify(panelId);
  }

  getTransitionMode(panelId: string, path: string): 'easing' | 'simple' | 'advanced' {
    const panel = this.panels.get(panelId);
    if (!panel) return 'simple';
    return (panel.values[`${path}.__mode`] as 'easing' | 'simple' | 'advanced') || 'simple';
  }

  getValue(panelId: string, path: string): DialValue | undefined {
    const panel = this.panels.get(panelId);
    return panel?.values[path];
  }

  getValues(panelId: string): Record<string, DialValue> {
    // Return the snapshot for useSyncExternalStore compatibility
    // Use stable EMPTY_VALUES to avoid infinite loop in React 19
    return this.snapshots.get(panelId) ?? EMPTY_VALUES;
  }

  getPanels(kind?: 'panel' | 'timeline'): PanelConfig[] {
    // Stable reference between global notifications: getSnapshot-style
    // consumers (React useSyncExternalStore, Solid `from`) compare by
    // identity, and a fresh array on every call makes them loop or re-render.
    if (kind === 'panel') return this.standardPanelsSnapshot;
    if (kind === 'timeline') return this.timelinePanelsSnapshot;
    return this.panelsSnapshot;
  }

  getPanel(id: string): PanelConfig | undefined {
    return this.panels.get(id);
  }

  subscribe(panelId: string, listener: Listener): () => void {
    if (!this.listeners.has(panelId)) {
      this.listeners.set(panelId, new Set());
    }
    this.listeners.get(panelId)!.add(listener);

    return () => {
      const listeners = this.listeners.get(panelId);
      listeners?.delete(listener);
      if (listeners?.size === 0 && !this.panels.has(panelId)) {
        this.listeners.delete(panelId);
      }
    };
  }

  subscribeGlobal(listener: Listener): () => void {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  subscribeActions(panelId: string, listener: ActionListener): () => void {
    if (!this.actionListeners.has(panelId)) {
      this.actionListeners.set(panelId, new Set());
    }
    this.actionListeners.get(panelId)!.add(listener);

    return () => {
      const listeners = this.actionListeners.get(panelId);
      listeners?.delete(listener);
      if (listeners?.size === 0 && !this.panels.has(panelId)) {
        this.actionListeners.delete(panelId);
      }
    };
  }

  triggerAction(panelId: string, path: string): void {
    this.actionListeners.get(panelId)?.forEach(fn => fn(path));
  }

  savePreset(panelId: string, name: string): string {
    const panel = this.panels.get(panelId);
    if (!panel) throw new Error(`Panel ${panelId} not found`);

    const id = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const preset: Preset = {
      id,
      name,
      values: { ...panel.values },
    };

    const existing = this.presets.get(panelId) ?? [];
    this.presets.set(panelId, [...existing, preset]);
    this.activePreset.set(panelId, id);

    // Force re-render by creating new snapshot reference
    this.snapshots.set(panelId, { ...panel.values });
    this.persistPanel(panelId);
    this.notify(panelId);

    return id;
  }

  loadPreset(panelId: string, presetId: string): void {
    const panel = this.panels.get(panelId);
    if (!panel) return;

    const presets = this.presets.get(panelId) ?? [];
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    // Apply preset values
    panel.values = { ...preset.values };
    this.snapshots.set(panelId, { ...panel.values });
    this.activePreset.set(panelId, presetId);
    this.persistPanel(panelId);
    this.notify(panelId);

    // Re-evaluate conditional visibility against the preset's values. If
    // any control's visibility flipped (e.g. the preset changed a field
    // that drives a `visibleWhen` rule), rebuild the filtered tree and
    // bump the global listener so DialRoot picks up the new controls.
    const allControls = this.allControls.get(panelId);
    if (allControls) {
      const nextControls = this.filterByVisibility(allControls, panel.values);
      if (!this.sameControlPaths(panel.controls, nextControls)) {
        panel.controls = nextControls;
        this.notifyGlobal();
      }
    }
  }

  deletePreset(panelId: string, presetId: string): void {
    const presets = this.presets.get(panelId) ?? [];
    this.presets.set(panelId, presets.filter(p => p.id !== presetId));

    // Clear active if deleted
    if (this.activePreset.get(panelId) === presetId) {
      this.activePreset.set(panelId, null);
    }

    // Force re-render by creating new snapshot reference
    const panel = this.panels.get(panelId);
    if (panel) {
      this.snapshots.set(panelId, { ...panel.values });
    }
    this.persistPanel(panelId);
    this.notify(panelId);
  }

  getPresets(panelId: string): Preset[] {
    return this.presets.get(panelId) ?? [];
  }

  getActivePresetId(panelId: string): string | null {
    return this.activePreset.get(panelId) ?? null;
  }

  clearActivePreset(panelId: string): void {
    const panel = this.panels.get(panelId);
    const base = this.baseValues.get(panelId);
    if (panel && base) {
      panel.values = { ...base };
      this.snapshots.set(panelId, { ...panel.values });

      // Re-evaluate conditional visibility against the restored base
      // values, same as loadPreset. Without this, switching back to
      // "Version 1" from an active preset keeps the preset's control
      // tree even though the values have reverted.
      const allControls = this.allControls.get(panelId);
      if (allControls) {
        const nextControls = this.filterByVisibility(allControls, panel.values);
        if (!this.sameControlPaths(panel.controls, nextControls)) {
          panel.controls = nextControls;
          this.notifyGlobal();
        }
      }
    }
    this.activePreset.set(panelId, null);
    this.persistPanel(panelId);
    this.notify(panelId);
  }

  resolveShortcutTarget(key: string, modifier?: 'alt' | 'shift' | 'meta'): {
    panelId: string;
    path: string;
    control: ControlMeta;
  } | null {
    for (const panel of this.panels.values()) {
      for (const [path, shortcut] of Object.entries(panel.shortcuts)) {
        if (!shortcut.key) continue; // skip keyless shortcuts
        if (shortcut.key.toLowerCase() !== key.toLowerCase()) continue;
        const scMod = shortcut.modifier ?? undefined;
        if (scMod !== modifier) continue;

        const control = this.findControlByPath(panel.controls, path);
        if (control) {
          return { panelId: panel.id, path, control };
        }
      }
    }
    return null;
  }

  resolveScrollOnlyTargets(): Array<{
    panelId: string;
    path: string;
    control: ControlMeta;
    shortcut: ShortcutConfig;
  }> {
    const results: Array<{ panelId: string; path: string; control: ControlMeta; shortcut: ShortcutConfig }> = [];
    for (const panel of this.panels.values()) {
      for (const [path, shortcut] of Object.entries(panel.shortcuts)) {
        if ((shortcut.interaction ?? 'scroll') !== 'scroll-only') continue;
        const control = this.findControlByPath(panel.controls, path);
        if (control) {
          results.push({ panelId: panel.id, path, control, shortcut });
        }
      }
    }
    return results;
  }

  private configurePanelRetention(id: string, options: DialStorePanelOptions): void {
    if (options.retainOnUnmount) {
      this.retainedPanels.add(id);
    }

    const persistConfig = this.normalizePersistConfig(id, options.persist);
    if (persistConfig) {
      this.persistConfigs.set(id, persistConfig);
      this.retainedPanels.add(id);
    }
  }

  private reconcileValues(
    defaultValues: Record<string, DialValue>,
    previousValues: Record<string, DialValue>,
    controlsByPath: Map<string, ControlMeta>
  ): Record<string, DialValue> {
    const nextValues: Record<string, DialValue> = {};

    for (const [path, defaultValue] of Object.entries(defaultValues)) {
      if (path.endsWith('.__mode')) {
        const transitionPath = path.slice(0, -'.__mode'.length);
        const transitionControl = controlsByPath.get(transitionPath);
        nextValues[path] = transitionControl?.type === 'transition' && previousValues[path] !== undefined
          ? previousValues[path]
          : defaultValue;
        continue;
      }

      nextValues[path] = this.normalizePreservedValue(
        previousValues[path],
        defaultValue,
        controlsByPath.get(path)
      );
    }

    return nextValues;
  }

  private reconcilePresets(
    presets: Preset[],
    defaultValues: Record<string, DialValue>,
    controlsByPath: Map<string, ControlMeta>
  ): Preset[] {
    return presets.map((preset) => ({
      ...preset,
      values: this.reconcileValues(defaultValues, preset.values, controlsByPath),
    }));
  }

  private normalizePersistConfig(id: string, persist: DialKitPersistOptions | undefined): PersistConfig | null {
    if (!persist) return null;
    const options = typeof persist === 'object' ? persist : {};
    return {
      key: options.key ?? `dialkit:${id}`,
      storage: options.storage ?? 'localStorage',
      presets: options.presets ?? true,
    };
  }

  private loadPersistedPanel(id: string): PersistedPanelState | null {
    const config = this.persistConfigs.get(id);
    if (!config) return null;

    const storage = this.getStorage(config.storage);
    if (!storage) return null;

    try {
      const raw = storage.getItem(config.key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedPanelState;
      if (parsed?.version !== 1 || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private persistPanel(id: string): void {
    const config = this.persistConfigs.get(id);
    if (!config) return;

    const storage = this.getStorage(config.storage);
    if (!storage) return;

    const values = this.snapshots.get(id) ?? this.panels.get(id)?.values;
    if (!values) return;

    const state: PersistedPanelState = {
      version: 1,
      values,
      baseValues: this.baseValues.get(id) ?? values,
      activePresetId: this.activePreset.get(id) ?? null,
    };

    if (config.presets) {
      state.presets = this.presets.get(id) ?? [];
    }

    try {
      storage.setItem(config.key, JSON.stringify(state));
    } catch {
      // Ignore storage quota/security errors; DialKit should still work in-memory.
    }
  }

  private getStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
    if (typeof globalThis === 'undefined' || !('window' in globalThis)) {
      return null;
    }

    try {
      return kind === 'sessionStorage'
        ? globalThis.window?.sessionStorage ?? null
        : globalThis.window?.localStorage ?? null;
    } catch {
      return null;
    }
  }

  private findControlByPath(controls: ControlMeta[], path: string): ControlMeta | null {
    for (const control of controls) {
      if (control.path === path) return control;
      if (control.type === 'folder' && control.children) {
        const found = this.findControlByPath(control.children, path);
        if (found) return found;
      }
    }
    return null;
  }

  private notify(panelId: string): void {
    this.listeners.get(panelId)?.forEach(fn => fn());
  }

  private notifyGlobal(): void {
    this.panelsSnapshot = Array.from(this.panels.values());
    this.standardPanelsSnapshot = this.panelsSnapshot.filter((panel) => panel.kind !== 'timeline');
    this.timelinePanelsSnapshot = this.panelsSnapshot.filter((panel) => panel.kind === 'timeline');
    this.globalListeners.forEach(fn => fn());
  }

  /** Editor mode implied by a transition config's shape — the same mapping
   *  initTransitionModes applies to config defaults at registration. */
  private transitionModeFor(value: DialValue): 'easing' | 'simple' | 'advanced' | null {
    if (this.isEasingConfig(value)) return 'easing';
    if (this.isSpringConfig(value)) {
      const hasPhysics = value.stiffness !== undefined || value.damping !== undefined || value.mass !== undefined;
      const hasTime = value.visualDuration !== undefined || value.bounce !== undefined;
      return hasPhysics && !hasTime ? 'advanced' : 'simple';
    }
    return null;
  }

  private initTransitionModes(config: DialConfig, prefix: string, values: Record<string, DialValue>): void {
    for (const [key, rawValue] of Object.entries(config)) {
      if (key === '_collapsed') continue;
      const path = prefix ? `${prefix}.${key}` : key;
      // Unwrap conditional-visibility wrapper before shape dispatch.
      const value = this.unwrapVisibilityWithRule(rawValue).value;

      if (this.isEasingConfig(value)) {
        values[`${path}.__mode`] = 'easing';
      } else if (this.isSpringConfig(value)) {
        // Detect physics mode from config
        const hasPhysics = value.stiffness !== undefined || value.damping !== undefined || value.mass !== undefined;
        const hasTime = value.visualDuration !== undefined || value.bounce !== undefined;
        values[`${path}.__mode`] = hasPhysics && !hasTime ? 'advanced' : 'simple';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && !this.isActionConfig(value) && !this.isSelectConfig(value) && !this.isColorConfig(value) && !this.isTextConfig(value)) {
        this.initTransitionModes(value as DialConfig, path, values);
      }
    }
  }

  private parseConfig(config: DialConfig, prefix: string, shortcuts?: Record<string, ShortcutConfig>): ControlMeta[] {
    const controls: ControlMeta[] = [];
    const startLen = () => controls.length;
    const tagLast = (visibleWhen: VisibleWhen | undefined, before: number) => {
      if (!visibleWhen) return;
      for (let i = before; i < controls.length; i++) {
        if (!controls[i].visibleWhen) controls[i].visibleWhen = visibleWhen;
      }
    };

    for (const [key, rawValue] of Object.entries(config)) {
      if (key === '_collapsed') continue;
      const path = prefix ? `${prefix}.${key}` : key;
      const label = this.formatLabel(key);
      const shortcut = shortcuts?.[path];

      // Unwrap conditional-visibility wrapper, remember the rule.
      const unwrapped = this.unwrapVisibilityWithRule(rawValue);
      const value = unwrapped.value;
      const visibleWhen = unwrapped.visibleWhen;
      const before = startLen();

      if (Array.isArray(value) && value.length <= 4 && typeof value[0] === 'number') {
        // Range tuple: [default, min, max]
        controls.push({
          type: 'slider',
          path,
          label,
          min: value[1],
          max: value[2],
          step: value[3] ?? this.inferStep(value[1], value[2]),
          shortcut,
        });
      } else if (typeof value === 'number') {
        // Single number - auto-infer range
        const { min, max, step } = this.inferRange(value);
        controls.push({ type: 'slider', path, label, min, max, step, shortcut });
      } else if (typeof value === 'boolean') {
        controls.push({ type: 'toggle', path, label, shortcut });
      } else if (this.isSpringConfig(value) || this.isEasingConfig(value)) {
        controls.push({ type: 'transition', path, label });
      } else if (this.isActionConfig(value)) {
        controls.push({ type: 'action', path, label: (value as ActionConfig).label || label });
      } else if (this.isSelectConfig(value)) {
        controls.push({ type: 'select', path, label, options: value.options });
      } else if (this.isColorConfig(value)) {
        controls.push({ type: 'color', path, label });
      } else if (this.isTextConfig(value)) {
        controls.push({ type: 'text', path, label, placeholder: value.placeholder });
      } else if (typeof value === 'string') {
        // Auto-detect: hex color vs text
        if (this.isHexColor(value)) {
          controls.push({ type: 'color', path, label });
        } else {
          controls.push({ type: 'text', path, label });
        }
      } else if (typeof value === 'object' && value !== null) {
        // Nested object becomes a folder
        const folderConfig = value as DialConfig;
        const defaultOpen = '_collapsed' in folderConfig ? !(folderConfig._collapsed as boolean) : true;
        controls.push({
          type: 'folder',
          path,
          label,
          defaultOpen,
          children: this.parseConfig(folderConfig, path, shortcuts),
        });
      }

      tagLast(visibleWhen, before);
    }

    return controls;
  }

  private flattenValues(config: DialConfig, prefix: string): Record<string, DialValue> {
    const values: Record<string, DialValue> = {};

    for (const [key, rawValue] of Object.entries(config)) {
      if (key === '_collapsed') continue;
      const path = prefix ? `${prefix}.${key}` : key;
      // Unwrap conditional-visibility wrapper before shape dispatch.
      const value = this.unwrapVisibilityWithRule(rawValue).value;

      if (Array.isArray(value) && value.length <= 4 && typeof value[0] === 'number') {
        values[path] = value[0]; // Default value
      } else if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
        values[path] = value;
      } else if (this.isSpringConfig(value) || this.isEasingConfig(value)) {
        values[path] = value;
      } else if (this.isActionConfig(value)) {
        // Actions don't need stored values - they're just triggers
        values[path] = value;
      } else if (this.isSelectConfig(value)) {
        // Use default or first option's value
        const firstOption = value.options[0];
        const firstValue = typeof firstOption === 'string' ? firstOption : firstOption.value;
        values[path] = value.default ?? firstValue;
      } else if (this.isColorConfig(value)) {
        values[path] = value.default ?? '#000000';
      } else if (this.isTextConfig(value)) {
        values[path] = value.default ?? '';
      } else if (typeof value === 'object' && value !== null) {
        Object.assign(values, this.flattenValues(value as DialConfig, path));
      }
    }

    return values;
  }

  private isSpringConfig(value: unknown): value is SpringConfig {
    return (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      (value as SpringConfig).type === 'spring'
    );
  }

  private isEasingConfig(value: unknown): value is EasingConfig {
    return (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      (value as EasingConfig).type === 'easing'
    );
  }

  private isActionConfig(value: unknown): value is ActionConfig {
    return (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      (value as ActionConfig).type === 'action'
    );
  }

  private isSelectConfig(value: unknown): value is SelectConfig {
    return (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      (value as SelectConfig).type === 'select' &&
      'options' in value &&
      Array.isArray((value as SelectConfig).options)
    );
  }

  private isColorConfig(value: unknown): value is ColorConfig {
    return (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      (value as ColorConfig).type === 'color'
    );
  }

  private isTextConfig(value: unknown): value is TextConfig {
    return (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      (value as TextConfig).type === 'text'
    );
  }

  private isHexColor(value: string): boolean {
    return isHexColor(value);
  }

  private formatLabel(key: string): string {
    return formatLabel(key);
  }

  private inferRange(value: number): { min: number; max: number; step: number } {
    // Infer reasonable range based on value
    if (value >= 0 && value <= 1) {
      return { min: 0, max: 1, step: 0.01 };
    } else if (value >= 0 && value <= 10) {
      return { min: 0, max: value * 3 || 10, step: 0.1 };
    } else if (value >= 0 && value <= 100) {
      return { min: 0, max: value * 3 || 100, step: 1 };
    } else if (value >= 0) {
      return { min: 0, max: value * 3 || 1000, step: 10 };
    } else {
      return { min: value * 3, max: -value * 3, step: 1 };
    }
  }

  private inferStep(min: number, max: number): number {
    return inferStep(min, max);
  }

  private normalizePreservedValue(
    existingValue: DialValue | undefined,
    defaultValue: DialValue,
    control: ControlMeta | undefined
  ): DialValue {
    if (existingValue === undefined || !control) {
      return defaultValue;
    }

    switch (control.type) {
      case 'slider': {
        if (typeof existingValue !== 'number' || typeof defaultValue !== 'number') {
          return defaultValue;
        }

        const min = control.min ?? Number.NEGATIVE_INFINITY;
        const max = control.max ?? Number.POSITIVE_INFINITY;
        const clamped = Math.min(max, Math.max(min, existingValue));

        if (typeof control.step !== 'number' || control.step <= 0) {
          return clamped;
        }

        return this.roundToStep(clamped, min, max, control.step);
      }
      case 'toggle':
        return typeof existingValue === 'boolean' ? existingValue : defaultValue;
      case 'select': {
        if (typeof existingValue !== 'string') {
          return defaultValue;
        }

        const options = control.options ?? [];
        const validValues = new Set(options.map((option) => (typeof option === 'string' ? option : option.value)));
        return validValues.has(existingValue) ? existingValue : defaultValue;
      }
      case 'color':
      case 'text':
        return typeof existingValue === 'string' ? existingValue : defaultValue;
      case 'transition':
        // Preserve any VALID transition, whatever its type. The type
        // selector is a first-class control — matching the live value
        // against the config default's type would silently revert every
        // type switch (user or programmatic) on the next re-registration,
        // since re-registrations happen on ordinary re-renders.
        if (this.isSpringConfig(existingValue) || this.isEasingConfig(existingValue)) {
          return existingValue;
        }
        return defaultValue;
      case 'action':
        return defaultValue;
      default:
        return defaultValue;
    }
  }

  private roundToStep(value: number, min: number, max: number, step: number): number {
    const snapped = min + Math.round((value - min) / step) * step;
    const clamped = Math.min(max, Math.max(min, snapped));
    const precision = this.stepPrecision(step);
    return Number(clamped.toFixed(precision));
  }

  private stepPrecision(step: number): number {
    const text = String(step);
    const decimalIndex = text.indexOf('.');
    return decimalIndex === -1 ? 0 : text.length - decimalIndex - 1;
  }

  private mapControlsByPath(controls: ControlMeta[]): Map<string, ControlMeta> {
    const map = new Map<string, ControlMeta>();

    const visit = (nodes: ControlMeta[]) => {
      for (const node of nodes) {
        if (node.type === 'folder' && node.children) {
          visit(node.children);
          continue;
        }

        map.set(node.path, node);
      }
    };

    visit(controls);
    return map;
  }

  // ─── Conditional visibility ──────────────────────────────────────

  /**
   * Detects and unwraps a `{ value, visibleWhen }` wrapper produced by
   * {@link withVisibility}. Returns the inner control plus the rule (or
   * `undefined` for `visibleWhen` if the input was not a wrapper).
   */
  private unwrapVisibilityWithRule(raw: unknown): { value: DialConfigValue; visibleWhen: VisibleWhen | undefined } {
    if (
      typeof raw === 'object' &&
      raw !== null &&
      !Array.isArray(raw) &&
      'value' in raw &&
      'visibleWhen' in raw
    ) {
      const wrapper = raw as ControlWithVisibility;
      return { value: wrapper.value, visibleWhen: wrapper.visibleWhen };
    }
    return { value: raw as DialConfigValue, visibleWhen: undefined };
  }

  /** Evaluate a visibility rule against a flat value map. */
  private isVisible(rule: VisibleWhen | undefined, values: Record<string, DialValue>): boolean {
    if (!rule) return true;
    const actual = values[rule.field];
    if (actual === undefined && !(rule.field in values)) {
      // Dev-mode warning for mistyped field paths. Guarded by typeof check
      // so it's safe in environments without process (bundlers strip this).
      if (typeof globalThis !== 'undefined' && typeof console !== 'undefined') {
        console.warn(
          `[DialKit] visibleWhen references field "${rule.field}" which does not exist in the panel's values. ` +
          `The control will default to visible. Check for typos — field must be the full dot-delimited store path.`
        );
      }
    }
    if (rule.is !== undefined) {
      const targets = Array.isArray(rule.is) ? rule.is : [rule.is];
      return targets.some(t => t === actual);
    }
    if (rule.not !== undefined) {
      const targets = Array.isArray(rule.not) ? rule.not : [rule.not];
      return !targets.some(t => t === actual);
    }
    return true;
  }

  /**
   * Recursively filter a control tree by evaluating each control's
   * `visibleWhen` against the current values. Folders that become empty
   * after filtering their children are pruned.
   *
   * KNOWN LIMITATION — folder collapsed state across hide/show cycles:
   * Folder open/closed state lives in `Folder`'s local `useState`, not in
   * the store. When a folder's `visibleWhen` fails, its DOM node unmounts
   * and that local state is lost. Re-showing the folder mounts a fresh
   * instance with `defaultOpen`, so a user-collapsed folder will re-open
   * after a visibility cycle. Sibling visibility changes do NOT trigger
   * this (motion.div keys are stable by path), only the wrapped folder
   * itself hiding. This is a pre-existing architectural constraint of
   * DialKit's folder state model, not introduced by this feature — any
   * mechanism that unmounts a folder would behave the same. Lifting
   * folder state into the store is a possible follow-up.
   */
  private filterByVisibility(controls: ControlMeta[], values: Record<string, DialValue>): ControlMeta[] {
    const result: ControlMeta[] = [];
    for (const control of controls) {
      if (!this.isVisible(control.visibleWhen, values)) continue;

      if (control.type === 'folder' && control.children) {
        const filteredChildren = this.filterByVisibility(control.children, values);
        if (filteredChildren.length === 0) continue;
        result.push({ ...control, children: filteredChildren });
      } else {
        result.push(control);
      }
    }
    return result;
  }

  /**
   * Cheap structural comparison used to decide whether visibility flipped
   * after an updateValue. We only care about the set of visible paths —
   * labels/options/etc can't change between snapshots of the same tree.
   */
  private sameControlPaths(a: ControlMeta[], b: ControlMeta[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const ca = a[i];
      const cb = b[i];
      if (ca.path !== cb.path || ca.type !== cb.type) return false;
      if (ca.type === 'folder') {
        const childrenA = ca.children ?? [];
        const childrenB = cb.children ?? [];
        if (!this.sameControlPaths(childrenA, childrenB)) return false;
      }
    }
    return true;
  }

}

// Singleton instance
export const DialStore = /* @__PURE__ */ new DialStoreClass();
