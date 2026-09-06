import { roundValue } from '../numeric';
import { parseColor } from '../color';
import { normalizePadValue, type DialPadConfig, type DialPadValue } from '../dial-pad';
export type { DialPadAxis, DialPadConfig, DialPadValue } from '../dial-pad';

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

export type ImageOption = string | { value: string; label: string };

export type ImageConfig = {
  type: 'image';
  /** Image URLs, optionally paired with display labels. */
  options?: ImageOption[];
  /** Defaults to the first option, or an empty string for upload-only controls. */
  default?: string;
};

export type TextConfig = {
  type: 'text';
  default?: string;
  placeholder?: string;
};

export type DialValue = number | boolean | string | SpringConfig | EasingConfig | ActionConfig | SelectConfig | ColorConfig | ImageConfig | TextConfig | DialPadConfig | DialPadValue;

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

function isVisibilityWrapper(raw: unknown): raw is ControlWithVisibility {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    !Array.isArray(raw) &&
    'value' in raw &&
    'visibleWhen' in raw
  );
}

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
  return isVisibilityWrapper(raw) ? raw.value : (raw as DialConfigValue);
}

export type DialConfig = {
  [key: string]: DialValue | [number, number, number, number?] | DialConfig | ControlWithVisibility;
};

export type ResolvedValues<T extends DialConfig> = {
  [K in keyof T]: T[K] extends ControlWithVisibility<infer U>
    ? U extends DialConfigValue ? ResolvedValues<{ value: U }>['value'] : never
    : T[K] extends [number, number, number, number?]
    ? number
    : T[K] extends SpringConfig
      ? TransitionConfig
      : T[K] extends EasingConfig
        ? TransitionConfig
        : T[K] extends SelectConfig
          ? string
          : T[K] extends ColorConfig | ImageConfig
            ? string
            : T[K] extends TextConfig
              ? string
              : T[K] extends DialPadConfig
                ? DialPadValue
                : T[K] extends DialConfig
                  ? ResolvedValues<T[K]>
                  : T[K];
};

export type DialKitValueUpdates<T extends DialConfig> = {
  [K in keyof T as K extends '_collapsed' ? never : K]?: T[K] extends ControlWithVisibility<infer U>
    ? U extends DialConfigValue ? DialKitValueUpdates<{ value: U }>['value'] : never
    : T[K] extends [number, number, number, number?]
    ? number
    : T[K] extends SpringConfig | EasingConfig
      ? TransitionConfig
      : T[K] extends ActionConfig
        ? never
        : T[K] extends SelectConfig | ColorConfig | ImageConfig | TextConfig
          ? string
          : T[K] extends DialPadConfig
            ? DialPadValue
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
  type: 'slider' | 'toggle' | 'spring' | 'transition' | 'folder' | 'action' | 'select' | 'color' | 'image' | 'text' | 'pad';
  path: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  children?: ControlMeta[];
  defaultOpen?: boolean;
  options?: (string | { value: string; label: string })[];
  placeholder?: string;
  pad?: DialPadConfig;
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
};

type Listener = () => void;
type ActionListener = (action: string) => void;

export type Preset = {
  id: string;
  name: string;
  values: Record<string, DialValue>;
  /**
   * Host-defined: the host decides what a locked preset refuses (theca: no
   * auto-save into it). The dropdown only shows the state, hides delete,
   * and toggles it.
   */
  locked?: boolean;
};

export type DialKitPersistOptions = boolean | {
  key?: string;
  storage?: 'localStorage' | 'sessionStorage';
  presets?: boolean;
};

export type DialStorePanelOptions = {
  defaultCollapsed?: boolean;
  retainOnUnmount?: boolean;
  persist?: DialKitPersistOptions;
  kind?: 'timeline';
  /**
   * Optional grouping key. See {@link PanelConfig.group}.
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

    if (isLeafConfigValue(configValue)) {
      result[key] = flatValues[path] ?? configDefaultValue(configValue);
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

export function isLeafConfigValue(value: unknown): boolean {
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
    isImageConfigValue(value) ||
    isTextConfigValue(value) ||
    isPadConfigValue(value)
  );
}

/** Defaults shared by the store and the values returned before a panel mounts. */
function configDefaultValue(value: DialConfig[string]): DialValue {
  if (Array.isArray(value)) return value[0];
  if (isSelectConfigValue(value)) return value.default ?? getFirstOptionValue(value.options);
  if (isColorConfigValue(value)) return value.default ?? '#000000';
  if (isImageConfigValue(value)) return value.default ?? getFirstOptionValue(value.options ?? []);
  if (isTextConfigValue(value)) return value.default ?? '';
  if (isPadConfigValue(value)) return normalizePadValue(undefined, value);
  return value as DialValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sameControlValue(previous: unknown, next: unknown, control?: ControlMeta): boolean {
  return Object.is(previous, next) || (control?.type === 'pad' &&
    isRecord(previous) && isRecord(next) && previous.x === next.x && previous.y === next.y);
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

function isImageConfigValue(value: unknown): value is ImageConfig {
  return hasType(value, 'image');
}

function isTextConfigValue(value: unknown): value is TextConfig {
  return hasType(value, 'text');
}

function isPadConfigValue(value: unknown): value is DialPadConfig {
  return hasType(value, 'pad');
}

function getFirstOptionValue(options: (string | { value: string; label: string })[]): string {
  const first = options[0];
  if (first === undefined) return '';
  return typeof first === 'string' ? first : first.value;
}

class DialStoreClass {
  private panelOpenListeners = new Set<(panelId: string, open: boolean) => void>();
  private panelOpenStates = new Map<string, boolean>();
  private panels: Map<string, PanelConfig> = new Map();
  private controlsByPanel = new WeakMap<PanelConfig, Map<string, ControlMeta>>();
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
    const { controls: allControls, controlsByPath, defaultValues } = this.parseConfig(config, shortcuts);
    if (!this.panelOpenStates.has(id) && options.defaultCollapsed !== undefined) {
      this.panelOpenStates.set(id, !options.defaultCollapsed);
    }
    const existingPanel = this.panels.get(id);
    if (existingPanel && existingPanel.kind !== options.kind) {
      console.warn(
        `[dialkit] Panel id "${id}" cannot be shared by a timeline and a standard panel; ` +
        `the most recent registration controls where it renders.`
      );
    }
    this.configurePanelRetention(id, options);
    this.registrationCounts.set(id, (this.registrationCounts.get(id) ?? 0) + 1);

    const persisted = this.loadPersistedPanel(id);
    const previousValues = this.panels.get(id)?.values ?? this.snapshots.get(id) ?? persisted?.values ?? {};
    const values = this.reconcileValues(defaultValues, previousValues, controlsByPath);

    const previousBaseValues = this.baseValues.get(id) ?? persisted?.baseValues ?? persisted?.values ?? {};
    const baseValues = this.reconcileValues(defaultValues, previousBaseValues, controlsByPath);

    // Store the unfiltered tree so visibility can flip back later, then
    // filter against the RECONCILED values (not raw defaults) for HMR/retain.
    this.allControls.set(id, allControls);
    const controls = filterByVisibility(allControls, values);

    const panel: PanelConfig = {
      id,
      name,
      controls,
      values,
      shortcuts: shortcuts ?? {},
      kind: options.kind,
      group: options.group,
      presetsEditable: options.presetsEditable,
      presetsLockable: options.presetsLockable,
    };
    this.panels.set(id, panel);
    this.controlsByPanel.set(panel, controlsByPath);
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
    const existing = this.panels.get(id);
    if (!existing) {
      this.registerPanel(id, name, config, shortcuts, options);
      return;
    }

    const { controls: allControls, controlsByPath, defaultValues } = this.parseConfig(config, shortcuts ?? existing.shortcuts);
    this.configurePanelRetention(id, options);
    const nextValues = this.reconcileValues(defaultValues, existing.values, controlsByPath);

    // Store the unfiltered tree, filter against the reconciled next values.
    this.allControls.set(id, allControls);
    const controls = filterByVisibility(allControls, nextValues);

    const nextPanel: PanelConfig = {
      id,
      name,
      controls,
      values: nextValues,
      shortcuts: shortcuts ?? existing.shortcuts,
      kind: options.kind ?? existing.kind,
      group: options.group ?? existing.group,
      presetsEditable: options.presetsEditable ?? existing.presetsEditable,
      presetsLockable: options.presetsLockable ?? existing.presetsLockable,
    };
    this.panels.set(id, nextPanel);
    this.controlsByPanel.set(nextPanel, controlsByPath);
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
      this.panelOpenStates.delete(id);
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

  /** Undefined delegates the initial state to DialRoot.defaultOpen. */
  getPanelOpen(panelId: string): boolean | undefined {
    return this.panelOpenStates.get(panelId);
  }

  isPanelOpen(panelId: string): boolean {
    return this.panelOpenStates.get(panelId) ?? true;
  }

  togglePanelOpen(panelId: string): void {
    this.setPanelOpen(panelId, !this.isPanelOpen(panelId));
  }

  /** Applies a host component's own default; no-op once the panel has state. */
  initPanelOpen(panelId: string, open: boolean): void {
    if (this.panelOpenStates.has(panelId)) return;
    this.panelOpenStates.set(panelId, open);
    this.notify(panelId);
  }

  /** Observe open requests so a containing toolkit can reveal its requested panel. */
  subscribePanelOpen(listener: (panelId: string, open: boolean) => void): () => void {
    this.panelOpenListeners.add(listener);
    return () => { this.panelOpenListeners.delete(listener); };
  }

  setPanelOpen(panelId: string, open: boolean): void {
    if (!this.panels.has(panelId)) return;
    if (this.panelOpenStates.get(panelId) !== open) {
      this.panelOpenStates.set(panelId, open);
      this.notify(panelId);
    }
    // Repeated open requests still reveal a collapsed containing toolkit.
    this.panelOpenListeners.forEach(listener => listener(panelId, open));
  }

  updateValue(panelId: string, path: string, value: DialValue): void {
    this.updateValues(panelId, { [path]: value });
  }

  updateValues(panelId: string, updates: Record<string, DialValue>): void {
    const panel = this.panels.get(panelId);
    if (!panel) return;

    const validUpdates: Record<string, DialValue> = {};
    const activeId = this.activePreset.get(panelId);
    const target = activeId
      ? this.presets.get(panelId)?.find(preset => preset.id === activeId)?.values
      : this.baseValues.get(panelId);

    for (const [path, value] of Object.entries(updates)) {
      if (!Object.prototype.hasOwnProperty.call(panel.values, path)) {
        continue;
      }

      const control = this.controlsByPanel.get(panel)?.get(path);
      if (control?.type === 'action') {
        continue;
      }

      const next = control?.type === 'pad' ? normalizePadValue(value, control.pad) : value;
      if (sameControlValue(panel.values[path], next, control) &&
        (!target || sameControlValue(target[path], next, control))) continue;
      panel.values[path] = next;
      validUpdates[path] = next;

      // A transition control renders from TWO keys: the config value and the
      // `.__mode` sibling that picks which editor (easing/time/physics) is
      // shown. A programmatic write that changes the config's type without
      // updating the mode leaves the control rendering the OLD type's
      // editors over the new value — so derive the mode from the value here,
      // exactly as registration does in parseConfig.
      if (control?.type === 'transition') {
        const mode = transitionModeFor(next);
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
    if (target) Object.assign(target, validUpdates);

    // Create a new snapshot reference so useSyncExternalStore detects the change
    this.snapshots.set(panelId, { ...panel.values });
    this.persistPanel(panelId);
    this.notify(panelId);

    // Re-evaluate conditional visibility once after the whole batch, against
    // the values that just landed above.
    this.refilterVisibility(panelId);
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
    this.refilterVisibility(panelId);
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

    if (panel.values[`${path}.__mode`] === mode) return;
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

    // Re-evaluate conditional visibility against the preset's values (the
    // preset may have changed a field that drives a `visibleWhen` rule).
    this.refilterVisibility(panelId);
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

  renamePreset(panelId: string, presetId: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;

    const presets = this.presets.get(panelId) ?? [];
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    this.presets.set(panelId, presets.map(p => (p.id === presetId ? { ...p, name: trimmed } : p)));
    this.refreshPresetSnapshot(panelId);
  }

  setPresetLocked(panelId: string, presetId: string, locked: boolean): void {
    const presets = this.presets.get(panelId) ?? [];
    const preset = presets.find(p => p.id === presetId);
    if (!preset || !!preset.locked === locked) return;

    this.presets.set(panelId, presets.map(p => (p.id === presetId ? { ...p, locked } : p)));
    this.refreshPresetSnapshot(panelId);
  }

  reorderPresets(panelId: string, orderedIds: string[]): void {
    const presets = this.presets.get(panelId) ?? [];
    if (presets.length === 0) return;

    const byId = new Map(presets.map(p => [p.id, p]));
    const ordered: Preset[] = [];
    for (const id of orderedIds) {
      const preset = byId.get(id);
      if (preset) {
        ordered.push(preset);
        byId.delete(id);
      }
    }
    // Any preset not listed keeps its relative order and is appended at the end.
    for (const preset of presets) {
      if (byId.has(preset.id)) ordered.push(preset);
    }

    const unchanged = ordered.length === presets.length && ordered.every((p, i) => p.id === presets[i].id);
    if (unchanged) return;

    this.presets.set(panelId, ordered);
    this.refreshPresetSnapshot(panelId);
  }

  getPresets(panelId: string): Preset[] {
    return this.presets.get(panelId) ?? [];
  }

  getActivePresetId(panelId: string): string | null {
    return this.activePreset.get(panelId) ?? null;
  }

  isPresetsEditable(panelId: string): boolean {
    return this.panels.get(panelId)?.presetsEditable ?? true;
  }

  isPresetsLockable(panelId: string): boolean {
    return this.panels.get(panelId)?.presetsLockable ?? false;
  }

  clearActivePreset(panelId: string): void {
    const panel = this.panels.get(panelId);
    const base = this.baseValues.get(panelId);
    if (panel && base) {
      panel.values = { ...base };
      this.snapshots.set(panelId, { ...panel.values });
    }
    this.activePreset.set(panelId, null);
    this.persistPanel(panelId);
    this.notify(panelId);

    // Re-evaluate conditional visibility against the restored base values,
    // same as loadPreset. Without this, switching back from an active
    // preset keeps the preset's control tree even though values reverted.
    if (panel && base) this.refilterVisibility(panelId);
  }

  /** Presets changed without a value change: bump the snapshot so subscribers re-render. */
  private refreshPresetSnapshot(panelId: string): void {
    const panel = this.panels.get(panelId);
    if (panel) {
      this.snapshots.set(panelId, { ...panel.values });
    }
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

        const control = this.controlsByPanel.get(panel)?.get(path);
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
        const control = this.controlsByPanel.get(panel)?.get(path);
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
    } else if (options.persist === false) {
      this.persistConfigs.delete(id);
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
        const mode = previousValues[path];
        nextValues[path] = transitionControl?.type === 'transition' && (mode === 'easing' || mode === 'simple' || mode === 'advanced')
          ? mode
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
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed) || parsed.version !== 1) return null;
      const values = isRecord(parsed.values) ? parsed.values as Record<string, DialValue> : undefined;
      const presets = config.presets && Array.isArray(parsed.presets)
        ? parsed.presets.filter((preset): preset is Preset =>
          isRecord(preset) && typeof preset.id === 'string' && typeof preset.name === 'string' && isRecord(preset.values))
        : [];
      return {
        version: 1,
        values,
        baseValues: config.presets && isRecord(parsed.baseValues) ? parsed.baseValues as Record<string, DialValue> : values,
        presets,
        activePresetId: presets.some(preset => preset.id === parsed.activePresetId) ? parsed.activePresetId as string : null,
      };
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

    const state: PersistedPanelState = { version: 1, values };
    if (config.presets) {
      state.baseValues = this.baseValues.get(id) ?? values;
      state.presets = this.presets.get(id) ?? [];
      state.activePresetId = this.activePreset.get(id) ?? null;
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

  private notify(panelId: string): void {
    this.listeners.get(panelId)?.forEach(fn => fn());
  }

  private notifyGlobal(): void {
    this.panelsSnapshot = Array.from(this.panels.values());
    this.standardPanelsSnapshot = this.panelsSnapshot.filter((panel) => panel.kind !== 'timeline');
    this.timelinePanelsSnapshot = this.panelsSnapshot.filter((panel) => panel.kind === 'timeline');
    this.globalListeners.forEach(fn => fn());
  }

  /** Compile controls, defaults, and the lookup index in one walk. */
  private parseConfig(config: DialConfig, shortcuts?: Record<string, ShortcutConfig>) {
    const defaultValues: Record<string, DialValue> = {};
    const modes: Record<string, DialValue> = {};
    const controlsByPath = new Map<string, ControlMeta>();
    const visit = (config: DialConfig, prefix: string): ControlMeta[] => {
      const controls: ControlMeta[] = [];

      for (const [key, rawValue] of Object.entries(config)) {
        if (key === '_collapsed') continue;
        const path = prefix ? `${prefix}.${key}` : key;
        const label = formatLabel(key);
        const shortcut = shortcuts?.[path];
        let control: ControlMeta | undefined;

        // Unwrap the conditional-visibility wrapper before shape dispatch and
        // remember the rule so the emitted control (and, for a folder, its
        // descendants) can be filtered against live values.
        const visibleWhen = isVisibilityWrapper(rawValue) ? rawValue.visibleWhen : undefined;
        const value = unwrapVisibility(rawValue);

        if (Array.isArray(value) && value.length <= 4 && typeof value[0] === 'number') {
          // Range tuple: [default, min, max]
          control = {
            type: 'slider',
            path,
            label,
            min: value[1],
            max: value[2],
            step: value[3] ?? inferStep(value[1], value[2]),
            shortcut,
          };
        } else if (typeof value === 'number') {
          // Single number - auto-infer range
          const { min, max, step } = this.inferRange(value);
          control = { type: 'slider', path, label, min, max, step, shortcut };
        } else if (typeof value === 'boolean') {
          control = { type: 'toggle', path, label, shortcut };
        } else if (isSpringConfigValue(value) || isEasingConfigValue(value)) {
          control = { type: 'transition', path, label };
        } else if (isActionConfigValue(value)) {
          control = { type: 'action', path, label: value.label || label };
        } else if (isSelectConfigValue(value)) {
          control = { type: 'select', path, label, options: value.options };
        } else if (isColorConfigValue(value)) {
          control = { type: 'color', path, label };
        } else if (isImageConfigValue(value)) {
          control = { type: 'image', path, label, options: value.options };
        } else if (isTextConfigValue(value)) {
          control = { type: 'text', path, label, placeholder: value.placeholder };
        } else if (isPadConfigValue(value)) {
          control = { type: 'pad', path, label, pad: value };
        } else if (typeof value === 'string') {
          // Auto-detect: hex color vs text
          if (parseColor(value) && value !== 'transparent') {
            control = { type: 'color', path, label };
          } else {
            control = { type: 'text', path, label };
          }
        } else if (typeof value === 'object' && value !== null) {
          // Nested object becomes a folder
          const folderConfig = value as DialConfig;
          const defaultOpen = '_collapsed' in folderConfig ? !(folderConfig._collapsed as boolean) : true;
          control = {
            type: 'folder',
            path,
            label,
            defaultOpen,
            children: visit(folderConfig, path),
          };
        }
        if (!control) continue;
        if (visibleWhen) tagVisibility(control, visibleWhen);
        controls.push(control);
        controlsByPath.set(path, control);
        if (control.type === 'folder') continue;
        defaultValues[path] = configDefaultValue(value);
        const mode = transitionModeFor(value);
        if (mode) modes[`${path}.__mode`] = mode;
      }

      return controls;
    };
    const controls = visit(config, '');
    Object.assign(defaultValues, modes);
    return { controls, defaultValues, controlsByPath };
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
        if (typeof existingValue !== 'number' || !Number.isFinite(existingValue) || typeof defaultValue !== 'number') {
          return defaultValue;
        }

        const min = control.min ?? Number.NEGATIVE_INFINITY;
        const max = control.max ?? Number.POSITIVE_INFINITY;
        const clamped = Math.min(max, Math.max(min, existingValue));

        if (typeof control.step !== 'number' || control.step <= 0) {
          return clamped;
        }

        return roundValue(clamped, control.step, min, max);
      }
      case 'toggle':
        return typeof existingValue === 'boolean' ? existingValue : defaultValue;
      case 'pad':
        return normalizePadValue(existingValue, control.pad);
      case 'select': {
        if (typeof existingValue !== 'string') {
          return defaultValue;
        }

        const options = control.options ?? [];
        const validValues = new Set(options.map((option) => (typeof option === 'string' ? option : option.value)));
        return validValues.has(existingValue) ? existingValue : defaultValue;
      }
      case 'color':
      case 'image':
      case 'text':
        return typeof existingValue === 'string' ? existingValue : defaultValue;
      case 'transition':
        // Preserve any VALID transition, whatever its type. The type
        // selector is a first-class control — matching the live value
        // against the config default's type would silently revert every
        // type switch (user or programmatic) on the next re-registration,
        // since re-registrations happen on ordinary re-renders.
        if (isSpringConfigValue(existingValue) || isEasingConfigValue(existingValue)) {
          return existingValue;
        }
        return defaultValue;
      case 'action':
        return defaultValue;
      default:
        return defaultValue;
    }
  }

  // ─── Conditional visibility ──────────────────────────────────────

  /**
   * Rebuild the filtered control tree against the panel's current values.
   * When the set of visible paths changed, swap `panel.controls` and bump
   * the global listeners: `getPanels()` snapshots are cached by identity,
   * so a per-panel notify alone would leave DialRoot rendering the old tree.
   */
  private refilterVisibility(panelId: string): void {
    const panel = this.panels.get(panelId);
    const allControls = this.allControls.get(panelId);
    if (!panel || !allControls) return;

    const nextControls = filterByVisibility(allControls, panel.values);
    if (!sameControlPaths(panel.controls, nextControls)) {
      panel.controls = nextControls;
      this.notifyGlobal();
    }
  }
}

/** Attach a visibility rule to a control and (for folders) every descendant. */
function tagVisibility(control: ControlMeta, visibleWhen: VisibleWhen): void {
  if (!control.visibleWhen) control.visibleWhen = visibleWhen;
  if (control.type === 'folder' && control.children) {
    for (const child of control.children) tagVisibility(child, visibleWhen);
  }
}

/** Editor mode implied by a transition config's shape; null for non-transitions. */
function transitionModeFor(value: unknown): 'easing' | 'simple' | 'advanced' | null {
  if (isEasingConfigValue(value)) return 'easing';
  if (isSpringConfigValue(value)) {
    const hasPhysics = value.stiffness !== undefined || value.damping !== undefined || value.mass !== undefined;
    const hasTime = value.visualDuration !== undefined || value.bounce !== undefined;
    return hasPhysics && !hasTime ? 'advanced' : 'simple';
  }
  return null;
}

/** Evaluate a visibility rule against a flat value map. */
function isVisible(rule: VisibleWhen | undefined, values: Record<string, DialValue>): boolean {
  if (!rule) return true;
  const actual = values[rule.field];
  if (actual === undefined && !(rule.field in values)) {
    // Dev-mode warning for mistyped field paths.
    console.warn(
      `[DialKit] visibleWhen references field "${rule.field}" which does not exist in the panel's values. ` +
      `The control will default to visible. Check for typos — field must be the full dot-delimited store path.`
    );
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
 * Folder open/closed state lives in the host component, not in the store.
 * When a folder's `visibleWhen` fails, its DOM node unmounts and that
 * local state is lost, so a user-collapsed folder re-opens after a
 * visibility cycle. Sibling visibility changes do NOT trigger this (keys
 * are stable by path), only the wrapped folder itself hiding.
 */
function filterByVisibility(controls: ControlMeta[], values: Record<string, DialValue>): ControlMeta[] {
  const result: ControlMeta[] = [];
  for (const control of controls) {
    if (!isVisible(control.visibleWhen, values)) continue;

    if (control.type === 'folder' && control.children) {
      const filteredChildren = filterByVisibility(control.children, values);
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
 * after a write. We only care about the set of visible paths — labels and
 * options can't change between snapshots of the same tree.
 */
function sameControlPaths(a: ControlMeta[], b: ControlMeta[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ca = a[i];
    const cb = b[i];
    if (ca.path !== cb.path || ca.type !== cb.type) return false;
    if (ca.type === 'folder' && !sameControlPaths(ca.children ?? [], cb.children ?? [])) return false;
  }
  return true;
}

// Singleton instance
export const DialStore = /* @__PURE__ */ new DialStoreClass();
