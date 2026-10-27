import { roundValue } from '../numeric';
import { parseColor } from '../color';
import { normalizePadValue, type DialPadConfig, type DialPadValue } from '../dial-pad';
import { normalizeAnchorValue, type AnchorConfig, type AnchorValue } from '../anchor';
import { defaultTransitionPresets, type TransitionPresetOption } from '../transition-presets';
export type { DialPadAxis, DialPadConfig, DialPadValue } from '../dial-pad';
export type { AnchorConfig, AnchorValue } from '../anchor';

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

/** `icon` is SVG path data in a 24 × 24 box. Segmented controls show it in place of the label. */
export type SelectOption = string | { value: string; label: string; icon?: string | string[] };

export type SelectConfig = {
  type: 'select';
  options: SelectOption[];
  default?: string;
  /** `'segmented'` shows every option in one row instead of a dropdown. */
  display?: 'dropdown' | 'segmented';
  /** Segmented only: the options fill the row, and the label becomes the group's accessible name. */
  hideLabel?: boolean;
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

export type DialValue = number | boolean | string | SpringConfig | EasingConfig | ActionConfig | SelectConfig | ColorConfig | ImageConfig | TextConfig | DialPadConfig | DialPadValue | AnchorConfig | AnchorValue;

export type DialConfig = {
  [key: string]: DialValue | [number, number, number, number?, string?] | DialConfig | ControlWithVisibility;
};

export type VisibleWhenValue = string | number | boolean;

/** Shows a control only while another control in the same panel has (`is`) or lacks (`not`) one of the given values. */
export type VisibleWhen = {
  /** Path of the watched control, dot-separated inside folders (`'style.outline'`). */
  field: string;
} & (
  | { is: VisibleWhenValue | VisibleWhenValue[]; not?: never }
  | { not: VisibleWhenValue | VisibleWhenValue[]; is?: never }
);

export type ControlWithVisibility<T = DialValue | [number, number, number, number?, string?] | DialConfig> = {
  value: T;
  visibleWhen: VisibleWhen;
};

/** Shows `control` (any control or folder) only while `rule` holds. Hidden controls keep their values. */
export function withVisibility<T extends DialValue | [number, number, number, number?, string?] | DialConfig>(
  control: T,
  rule: VisibleWhen
): ControlWithVisibility<T> {
  return { value: control, visibleWhen: rule };
}

function isVisibilityWrapper(value: unknown): value is ControlWithVisibility {
  return isRecord(value) && 'value' in value && isRecord(value.visibleWhen) && typeof value.visibleWhen.field === 'string';
}

/** The control inside a {@link withVisibility} wrapper; any other value as is. */
export function unwrapVisibility(value: DialConfig[string]): DialConfig[string] {
  return isVisibilityWrapper(value) ? value.value : value;
}

export type ResolvedValues<T extends DialConfig> = {
  [K in keyof T as K extends '_collapsed' | '_fields' | '_reset' | '_hints' ? never : K]: T[K] extends ControlWithVisibility<infer U extends DialConfig[string]>
    ? ResolvedValues<{ value: U }>['value']
    : T[K] extends [number, number, number, number?, string?]
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
                : T[K] extends AnchorConfig
                  ? AnchorValue
                  : T[K] extends DialConfig
                    ? ResolvedValues<T[K]>
                    : T[K];
};

export type DialKitValueUpdates<T extends DialConfig> = {
  [K in keyof T as K extends '_collapsed' | '_fields' | '_reset' | '_hints' ? never : K]?: T[K] extends ControlWithVisibility<infer U extends DialConfig[string]>
    ? DialKitValueUpdates<{ value: U }>['value']
    : T[K] extends [number, number, number, number?, string?]
    ? number
    : T[K] extends SpringConfig | EasingConfig
      ? TransitionConfig
      : T[K] extends ActionConfig
        ? never
        : T[K] extends SelectConfig | ColorConfig | ImageConfig | TextConfig
          ? string
          : T[K] extends DialPadConfig
            ? DialPadValue
            : T[K] extends AnchorConfig
              ? AnchorValue
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
  type: 'slider' | 'toggle' | 'spring' | 'transition' | 'folder' | 'action' | 'select' | 'color' | 'image' | 'text' | 'pad' | 'anchor';
  path: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  children?: ControlMeta[];
  defaultOpen?: boolean;
  /** The folder drawn for this control shows a reset button: `_reset` folders, springs, and transitions. */
  reset?: boolean;
  /** Folder only: `_fields: true` shows its numbers as one row of fields. */
  fields?: boolean;
  options?: SelectOption[];
  display?: SelectConfig['display'];
  hideLabel?: boolean;
  placeholder?: string;
  pad?: DialPadConfig;
  anchor?: AnchorConfig;
  shortcut?: ShortcutConfig;
  visibleWhen?: VisibleWhen;
  /** A short sentence about the control, from its folder's `_hints`. */
  hint?: string;
};

export type PanelConfig = {
  id: string;
  name: string;
  controls: ControlMeta[];
  values: Record<string, DialValue>;
  shortcuts: Record<string, ShortcutConfig>;
  kind?: 'timeline';
};

type Listener = () => void;
type ActionListener = (action: string) => void;

export type Preset = {
  id: string;
  name: string;
  values: Record<string, DialValue>;
  locked?: boolean;
};

export type TransitionMode = 'easing' | 'simple' | 'advanced';

/** A curve or spring the user saved, shared by every transition control. */
export type TransitionPreset = {
  id: string;
  name: string;
  mode: TransitionMode;
  value: TransitionConfig;
};

/** The transition a transition control copied, with the mode it was in. */
export type CopiedTransition = {
  value: TransitionConfig;
  mode: TransitionMode;
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
  baseName?: string;
};

// Stable empty object for unregistered panels (React 19 useSyncExternalStore requirement)
const EMPTY_VALUES: Record<string, DialValue> = Object.freeze({});
const TRANSITION_PRESETS_KEY = 'dialkit:transition-presets';

function copyTransitionValue(value: TransitionConfig): TransitionConfig {
  return value.type === 'easing' ? { ...value, ease: [...value.ease] } : { ...value };
}

/** "Custom N" for a mode, numbered after the highest saved one so names stay unique. */
function nextTransitionPresetName(presets: TransitionPreset[], mode: TransitionMode): string {
  const highest = presets.reduce((max, preset) => {
    const match = /^Custom (\d+)$/.exec(preset.name);
    return preset.mode === mode && match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `Custom ${highest + 1}`;
}

/** A stored transition is kept only when it has every value its mode edits. */
function isStoredTransitionPreset(preset: unknown): preset is TransitionPreset {
  if (!isRecord(preset) || typeof preset.id !== 'string' || typeof preset.name !== 'string' || !isRecord(preset.value)) return false;
  const value = preset.value;
  const finite = (...keys: string[]) => keys.every(key => Number.isFinite(value[key]));
  switch (preset.mode) {
    case 'easing':
      // Bézier X stays within 0–1; Y may overshoot.
      return value.type === 'easing' && finite('duration') && Array.isArray(value.ease) && value.ease.length === 4 &&
        value.ease.every((n, index) => Number.isFinite(n) && (index % 2 === 1 || (n >= 0 && n <= 1)));
    case 'simple':
      return value.type === 'spring' && finite('visualDuration', 'bounce');
    case 'advanced':
      return value.type === 'spring' && finite('stiffness', 'damping', 'mass');
    default:
      return false;
  }
}

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

  for (const [key, rawValue] of Object.entries(config)) {
    if (isFolderMetaKey(key)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    const configValue = unwrapVisibility(rawValue);

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
  for (const [key, rawValue] of Object.entries(config)) {
    if (isFolderMetaKey(key) || !(key in updates)) continue;

    const nextValue = updates[key];
    if (nextValue === undefined) continue;

    const path = prefix ? `${prefix}.${key}` : key;
    const configValue = unwrapVisibility(rawValue);

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

/** Folder metadata such as `_collapsed` configures the folder and is not a value. */
export function isFolderMetaKey(key: string): boolean {
  return key === '_collapsed' || key === '_fields' || key === '_reset' || key === '_hints';
}

/** A field row holds two to four numbers and at most one boolean, its lock. */
function canShowFields(children: ControlMeta[]): boolean {
  const axes = children.filter(child => child.type === 'slider').length;
  const locks = children.filter(child => child.type === 'toggle').length;
  return axes >= 2 && axes <= 4 && locks <= 1 && axes + locks === children.length;
}

export function isLeafConfigValue(value: unknown): boolean {
  return (
    (Array.isArray(value) && value.length <= 5 && typeof value[0] === 'number') ||
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
    isPadConfigValue(value) ||
    isAnchorConfigValue(value)
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
  if (isAnchorConfigValue(value)) return normalizeAnchorValue(undefined, value);
  return value as DialValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sameControlValue(previous: unknown, next: unknown, control?: ControlMeta): boolean {
  return Object.is(previous, next) || ((control?.type === 'pad' || control?.type === 'anchor') &&
    isRecord(previous) && isRecord(next) && previous.x === next.x && previous.y === next.y);
}

/** Deep equality for stored values: springs, easings, and pads are compared by content. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length &&
    keys.every((key) => sameValue((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
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

function isAnchorConfigValue(value: unknown): value is AnchorConfig {
  return hasType(value, 'anchor');
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
  private resetKeysByPanel = new WeakMap<PanelConfig, Map<string, string[]>>();
  // Full control trees of panels with visibility rules; `panel.controls` holds the visible part.
  private allControls = new WeakMap<PanelConfig, ControlMeta[]>();
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
  private baseNames: Map<string, string> = new Map();
  private defaultValues: Map<string, Record<string, DialValue>> = new Map();
  private registrationCounts: Map<string, number> = new Map();
  private retainedPanels: Set<string> = new Set();
  private persistConfigs: Map<string, PersistConfig> = new Map();
  private transitionPresets: TransitionPreset[] = [];
  private transitionStorageLoaded: Set<PersistConfig['storage']> = new Set();
  private copiedTransition: CopiedTransition | null = null;
  private transitionListeners: Set<Listener> = new Set();

  registerPanel(id: string, name: string, config: DialConfig, shortcuts?: Record<string, ShortcutConfig>, options: DialStorePanelOptions = {}): void {
    const { controls, controlsByPath, defaultValues, resetKeys, conditional } = this.parseConfig(id, config, shortcuts);
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

    const panel: PanelConfig = { id, name, controls, values, shortcuts: shortcuts ?? {}, kind: options.kind };
    this.panels.set(id, panel);
    this.controlsByPanel.set(panel, controlsByPath);
    this.resetKeysByPanel.set(panel, resetKeys);
    if (conditional) this.setVisibleControls(panel, controls);
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
    if (!this.baseNames.has(id) && persisted?.baseName) {
      this.baseNames.set(id, persisted.baseName);
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

    const { controls, controlsByPath, defaultValues, resetKeys, conditional } = this.parseConfig(id, config, shortcuts ?? existing.shortcuts);
    this.configurePanelRetention(id, options);
    const nextValues = this.reconcileValues(defaultValues, existing.values, controlsByPath);

    const nextPanel: PanelConfig = { id, name, controls, values: nextValues, shortcuts: shortcuts ?? existing.shortcuts, kind: options.kind ?? existing.kind };
    this.panels.set(id, nextPanel);
    this.controlsByPanel.set(nextPanel, controlsByPath);
    this.resetKeysByPanel.set(nextPanel, resetKeys);
    if (conditional) this.setVisibleControls(nextPanel, controls);
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
      this.baseNames.delete(id);
      this.defaultValues.delete(id);
      this.presets.delete(id);
      this.activePreset.delete(id);
      this.persistConfigs.delete(id);
    }

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
    const active = activeId ? this.presets.get(panelId)?.find(preset => preset.id === activeId) : undefined;
    // A locked version keeps its saved values; edits still apply to the panel.
    const target = activeId ? (active?.locked ? undefined : active?.values) : this.baseValues.get(panelId);

    for (const [path, value] of Object.entries(updates)) {
      if (!Object.prototype.hasOwnProperty.call(panel.values, path)) {
        continue;
      }

      const control = this.controlsByPanel.get(panel)?.get(path);
      if (control?.type === 'action') {
        continue;
      }

      const next = control?.type === 'pad' ? normalizePadValue(value, control.pad)
        : control?.type === 'anchor' ? normalizeAnchorValue(value, control.anchor)
        : value;
      if (sameControlValue(panel.values[path], next, control) &&
        (!target || sameControlValue(target[path], next, control))) continue;
      panel.values[path] = next;
      validUpdates[path] = next;
    }

    if (Object.keys(validUpdates).length === 0) {
      return;
    }

    // Auto-save to active preset or base values
    if (target) Object.assign(target, validUpdates);

    // Create a new snapshot reference so useSyncExternalStore detects the change
    this.snapshots.set(panelId, { ...panel.values });
    this.updateVisibility(panel);
    this.persistPanel(panelId);
    this.notify(panelId);
  }

  resetValues(panelId: string): void {
    const panel = this.panels.get(panelId);
    const defaults = this.defaultValues.get(panelId);
    if (!panel || !defaults) return;

    panel.values = { ...defaults };
    this.snapshots.set(panelId, { ...panel.values });
    this.updateVisibility(panel);
    this.baseValues.set(panelId, { ...defaults });
    this.activePreset.set(panelId, null);
    this.persistPanel(panelId);
    this.notify(panelId);
  }

  /**
   * Restore the defaults behind a folder's reset button: every value inside a
   * `_reset` folder, nested folders included, or a spring or transition's own
   * value. Saves like any other edit.
   */
  resetFolder(panelId: string, path: string): void {
    const panel = this.panels.get(panelId);
    const keys = panel && this.resetKeysByPanel.get(panel)?.get(path);
    const defaults = this.defaultValues.get(panelId);
    if (!keys || !defaults) return;
    this.updateValues(panelId, Object.fromEntries(keys.map((key) => [key, defaults[key]])));
  }

  /** True when a value that `resetFolder` restores differs from its default, so the reset button shows. */
  isFolderChanged(panelId: string, path: string): boolean {
    const panel = this.panels.get(panelId);
    const keys = panel && this.resetKeysByPanel.get(panel)?.get(path);
    const defaults = this.defaultValues.get(panelId);
    if (!panel || !keys || !defaults) return false;
    return keys.some((key) => !sameValue(panel.values[key], defaults[key]));
  }

  updateSpringMode(panelId: string, path: string, mode: 'simple' | 'advanced'): void {
    this.updateTransitionMode(panelId, path, mode);
  }

  getSpringMode(panelId: string, path: string): 'simple' | 'advanced' {
    const mode = this.getTransitionMode(panelId, path);
    if (mode === 'easing') return 'simple';
    return mode;
  }

  updateTransitionMode(panelId: string, path: string, mode: TransitionMode): void {
    const panel = this.panels.get(panelId);
    if (!panel) return;

    if (panel.values[`${path}.__mode`] === mode) return;
    panel.values[`${path}.__mode`] = mode;
    this.snapshots.set(panelId, { ...panel.values });
    this.persistPanel(panelId);
    this.notify(panelId);
  }

  getTransitionMode(panelId: string, path: string): TransitionMode {
    const panel = this.panels.get(panelId);
    if (!panel) return 'simple';
    return (panel.values[`${path}.__mode`] as TransitionMode) || 'simple';
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

  getDefaultValues(panelId: string): Record<string, DialValue> {
    return this.defaultValues.get(panelId) ?? EMPTY_VALUES;
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

  /** Looks up a control by path, including one its visibility rule hides. */
  getControl(panelId: string, path: string): ControlMeta | undefined {
    const panel = this.panels.get(panelId);
    return panel ? this.controlsByPanel.get(panel)?.get(path) : undefined;
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

  /**
   * Saves the current values as the next numbered version: "V2", "V3"…, or under its own
   * `prefix` ("Sequence 2" in a timeline). Older saves used "Version N"; both count toward the next V.
   */
  saveNewPreset(panelId: string, prefix?: string): string {
    const pattern = prefix ? new RegExp(`^${prefix} (\\d+)$`) : /^(?:V|Version )(\d+)$/;
    const highest = this.getPresets(panelId).reduce((max, preset) => {
      const match = pattern.exec(preset.name);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 1);
    return this.savePreset(panelId, prefix ? `${prefix} ${highest + 1}` : `V${highest + 1}`);
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
    this.updateVisibility(panel);
    this.activePreset.set(panelId, presetId);
    this.persistPanel(panelId);
    this.notify(panelId);
  }

  deletePreset(panelId: string, presetId: string): void {
    const presets = this.presets.get(panelId) ?? [];
    if (presets.find(p => p.id === presetId)?.locked) return;
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

  /** Rename a saved version. A null presetId renames the base version. */
  renamePreset(panelId: string, presetId: string | null, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (presetId === null) {
      this.baseNames.set(panelId, trimmed);
    } else {
      const presets = this.presets.get(panelId) ?? [];
      if (!presets.some(p => p.id === presetId)) return;
      this.presets.set(panelId, presets.map(p => p.id === presetId ? { ...p, name: trimmed } : p));
    }
    const panel = this.panels.get(panelId);
    if (panel) this.snapshots.set(panelId, { ...panel.values });
    this.persistPanel(panelId);
    this.notify(panelId);
  }

  /** Where a panel's saved versions persist, if they do. */
  getPresetStorage(panelId: string): { key: string; storage: 'localStorage' | 'sessionStorage' } | null {
    const config = this.persistConfigs.get(panelId);
    return config?.presets ? { key: config.key, storage: config.storage } : null;
  }

  /** Display name of the base version (the values before any saved preset). */
  getBaseName(panelId: string): string {
    return this.baseNames.get(panelId) ?? 'V1';
  }

  setPresetLocked(panelId: string, presetId: string, locked: boolean): void {
    const presets = this.presets.get(panelId) ?? [];
    const preset = presets.find(p => p.id === presetId);
    if (!preset || !!preset.locked === locked) return;
    this.setPresets(panelId, presets.map(p => (p.id === presetId ? { ...p, locked } : p)));
  }

  reorderPresets(panelId: string, presetIds: string[]): void {
    const presets = this.presets.get(panelId) ?? [];
    const rank = new Map(presetIds.map((id, index) => [id, index]));
    // Versions missing from presetIds keep their relative order after the listed ones.
    const ordered = presets
      .map((preset, index) => ({ preset, rank: rank.get(preset.id) ?? presetIds.length + index }))
      .sort((a, b) => a.rank - b.rank)
      .map(({ preset }) => preset);
    if (ordered.every((preset, index) => preset === presets[index])) return;
    this.setPresets(panelId, ordered);
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
      this.updateVisibility(panel);
    }
    this.activePreset.set(panelId, null);
    this.persistPanel(panelId);
    this.notify(panelId);
  }

  /** Saved curves and springs, shared by every transition control. */
  getTransitionPresets(): TransitionPreset[] {
    return this.transitionPresets;
  }

  /** The built-in curves (Easing) or springs (Time and Physics) for a mode, each with a short description of how it moves. */
  getDefaultTransitionPresets(mode: TransitionMode): TransitionPresetOption[] {
    return defaultTransitionPresets(mode);
  }

  /** Saves a transition for its mode as "Custom N" and returns the new preset's id. */
  saveTransitionPreset(value: TransitionConfig, mode: TransitionMode): string {
    const presets = this.getTransitionPresets();
    const id = `transition-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.setTransitionPresets([...presets, { id, name: nextTransitionPresetName(presets, mode), mode, value: copyTransitionValue(value) }]);
    return id;
  }

  deleteTransitionPreset(id: string): void {
    this.setTransitionPresets(this.getTransitionPresets().filter(preset => preset.id !== id));
  }

  copyTransition(value: TransitionConfig, mode: TransitionMode): void {
    this.copiedTransition = { value: copyTransitionValue(value), mode };
    this.notifyTransitions();
  }

  /** A copy of the copied transition, so applying it never changes what was copied. */
  getCopiedTransition(): CopiedTransition | null {
    return this.copiedTransition && { value: copyTransitionValue(this.copiedTransition.value), mode: this.copiedTransition.mode };
  }

  clearCopiedTransition(): void {
    if (!this.copiedTransition) return;
    this.copiedTransition = null;
    this.notifyTransitions();
  }

  /** Notifies when saved transitions or the copied transition change. */
  subscribeTransitions(listener: Listener): () => void {
    this.transitionListeners.add(listener);
    return () => this.transitionListeners.delete(listener);
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
        if (control && this.isShown(panel, path)) {
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
        if (control && this.isShown(panel, path)) {
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
      if (persistConfig.presets) this.loadTransitionPresets(persistConfig.storage);
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

  private setPresets(panelId: string, presets: Preset[]): void {
    this.presets.set(panelId, presets);

    // Force re-render by creating new snapshot reference
    const panel = this.panels.get(panelId);
    if (panel) {
      this.snapshots.set(panelId, { ...panel.values });
    }
    this.persistPanel(panelId);
    this.notify(panelId);
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
        baseName: config.presets && typeof parsed.baseName === 'string' ? parsed.baseName : undefined,
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
      const baseName = this.baseNames.get(id);
      if (baseName) state.baseName = baseName;
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

  private setTransitionPresets(presets: TransitionPreset[]): void {
    this.transitionPresets = presets;
    this.transitionStorageKinds().forEach(kind => this.persistTransitionPresets(kind));
    this.notifyTransitions();
  }

  /** Saved transitions follow panel persistence: they are stored wherever a panel persists its presets. */
  private transitionStorageKinds(): Set<PersistConfig['storage']> {
    const kinds = new Set<PersistConfig['storage']>();
    this.persistConfigs.forEach(config => { if (config.presets) kinds.add(config.storage); });
    return kinds;
  }

  /** Merges the transitions saved in a storage the first time a persisted panel uses it. */
  private loadTransitionPresets(kind: PersistConfig['storage']): void {
    if (this.transitionStorageLoaded.has(kind)) return;
    const storage = this.getStorage(kind);
    if (!storage) return;
    this.transitionStorageLoaded.add(kind);

    let stored: TransitionPreset[] = [];
    try {
      const parsed: unknown = JSON.parse(storage.getItem(TRANSITION_PRESETS_KEY) ?? 'null');
      if (isRecord(parsed) && parsed.version === 1 && Array.isArray(parsed.presets)) {
        stored = parsed.presets.filter(isStoredTransitionPreset);
      }
    } catch {
      // Malformed storage starts from the transitions already in memory.
    }

    const known = new Set(this.transitionPresets.map(preset => preset.id));
    const added: TransitionPreset[] = [];
    let renamed = false;
    stored.forEach(preset => {
      if (known.has(preset.id)) return;
      known.add(preset.id);
      // A name already used for the mode, such as a second "Custom 1", is numbered after the others.
      const presets = [...added, ...this.transitionPresets];
      const taken = presets.some(other => other.mode === preset.mode && other.name === preset.name);
      added.push(taken ? { ...preset, name: nextTransitionPresetName(presets, preset.mode) } : preset);
      renamed ||= taken;
    });
    if (added.length) {
      this.transitionPresets = [...added, ...this.transitionPresets];
      this.notifyTransitions();
    }
    // Transitions saved before this panel registered, and renamed ones, are kept in its storage too.
    if (renamed || added.length < this.transitionPresets.length) this.persistTransitionPresets(kind);
  }

  private persistTransitionPresets(kind: PersistConfig['storage']): void {
    try {
      this.getStorage(kind)?.setItem(TRANSITION_PRESETS_KEY, JSON.stringify({ version: 1, presets: this.transitionPresets }));
    } catch {
      // Ignore storage quota/security errors; saved transitions still work in-memory.
    }
  }

  private notifyTransitions(): void {
    this.transitionListeners.forEach(fn => fn());
  }

  /** Keeps the full tree aside and shows the controls whose rules hold. */
  private setVisibleControls(panel: PanelConfig, controls: ControlMeta[]): void {
    this.allControls.set(panel, controls);
    panel.controls = filterVisibleControls(controls, panel.values);
  }

  /** Re-applies visibility rules after a write. `getPanels()` snapshots are cached, so a changed tree refreshes them too. */
  private updateVisibility(panel: PanelConfig): void {
    const all = this.allControls.get(panel);
    if (!all) return;
    const controls = filterVisibleControls(all, panel.values);
    if (sameControlPaths(controls, panel.controls)) return;
    panel.controls = controls;
    this.notifyGlobal();
  }

  /** Hidden controls ignore shortcuts. */
  private isShown(panel: PanelConfig, path: string): boolean {
    return !this.allControls.has(panel) || hasControlPath(panel.controls, path);
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
  private parseConfig(panelId: string, config: DialConfig, shortcuts?: Record<string, ShortcutConfig>) {
    const defaultValues: Record<string, DialValue> = {};
    const modes: Record<string, DialValue> = {};
    const controlsByPath = new Map<string, ControlMeta>();
    const rules: [string, VisibleWhen][] = [];
    const visit = (config: DialConfig, prefix: string): ControlMeta[] => {
      const controls: ControlMeta[] = [];
      const hints = config._hints as Record<string, unknown> | undefined;

      for (const [key, rawValue] of Object.entries(config)) {
        if (isFolderMetaKey(key)) continue;
        const value = unwrapVisibility(rawValue);
        const path = prefix ? `${prefix}.${key}` : key;
        const label = formatLabel(key);
        const shortcut = shortcuts?.[path];
        let control: ControlMeta | undefined;

        if (Array.isArray(value) && value.length <= 5 && typeof value[0] === 'number') {
          // Range tuple: [default, min, max, step?, unit?]
          control = {
            type: 'slider',
            path,
            label,
            min: value[1],
            max: value[2],
            step: value[3] ?? inferStep(value[1], value[2]),
            unit: value[4],
            shortcut,
          };
        } else if (typeof value === 'number') {
          // Single number - auto-infer range
          const { min, max, step } = this.inferRange(value);
          control = { type: 'slider', path, label, min, max, step, shortcut };
        } else if (typeof value === 'boolean') {
          control = { type: 'toggle', path, label, shortcut };
        } else if (isSpringConfigValue(value) || isEasingConfigValue(value)) {
          control = { type: 'transition', path, label, reset: true };
        } else if (isActionConfigValue(value)) {
          control = { type: 'action', path, label: value.label || label };
        } else if (isSelectConfigValue(value)) {
          control = { type: 'select', path, label, options: value.options, display: value.display, hideLabel: value.hideLabel };
        } else if (isColorConfigValue(value)) {
          control = { type: 'color', path, label };
        } else if (isImageConfigValue(value)) {
          control = { type: 'image', path, label, options: value.options };
        } else if (isTextConfigValue(value)) {
          control = { type: 'text', path, label, placeholder: value.placeholder };
        } else if (isPadConfigValue(value)) {
          control = { type: 'pad', path, label, pad: value };
        } else if (isAnchorConfigValue(value)) {
          control = { type: 'anchor', path, label, anchor: value };
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
          const children = visit(folderConfig, path);
          control = {
            type: 'folder',
            path,
            label,
            defaultOpen,
            reset: folderConfig._reset === true,
            children,
          };
          if (folderConfig._fields === true) {
            if (canShowFields(children)) {
              control.fields = true;
            } else {
              console.warn(`[dialkit] "${path}" sets _fields but needs two to four numbers and at most one boolean; showing it as a folder.`);
            }
          }
        }
        if (!control) continue;
        if (isVisibilityWrapper(rawValue)) {
          control.visibleWhen = rawValue.visibleWhen;
          rules.push([path, rawValue.visibleWhen]);
        }
        const hint = hints?.[key];
        if (typeof hint === 'string' && hint) control.hint = hint;
        controls.push(control);
        controlsByPath.set(path, control);
        if (control.type === 'folder') continue;
        defaultValues[path] = configDefaultValue(value);
        if (isEasingConfigValue(value)) {
          modes[`${path}.__mode`] = 'easing';
        } else if (isSpringConfigValue(value)) {
          const hasPhysics = value.stiffness !== undefined || value.damping !== undefined || value.mass !== undefined;
          const hasTime = value.visualDuration !== undefined || value.bounce !== undefined;
          modes[`${path}.__mode`] = hasPhysics && !hasTime ? 'advanced' : 'simple';
        }
      }

      return controls;
    };
    const controls = visit(config, '');
    Object.assign(defaultValues, modes);
    // The values each reset button restores: everything inside a `_reset`
    // folder, nested folders included, or a control's own value. Transition
    // modes are included either way.
    const resetKeys = new Map<string, string[]>();
    for (const control of controlsByPath.values()) {
      if (!control.reset) continue;
      const prefix = `${control.path}.`;
      resetKeys.set(control.path, Object.keys(defaultValues).filter((key) => key === control.path || key.startsWith(prefix)));
    }
    // Checked once per registration rather than on every write.
    for (const [path, rule] of rules) {
      if (!(rule.field in defaultValues)) {
        console.warn(`[dialkit] "${path}" in panel "${panelId}" depends on "${rule.field}", which is not a control in that panel.`);
      }
    }
    return { controls, defaultValues, controlsByPath, resetKeys, conditional: rules.length > 0 };
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
      case 'anchor':
        return normalizeAnchorValue(existingValue, control.anchor);
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
        if (isSpringConfigValue(defaultValue)) {
          return isSpringConfigValue(existingValue) ? existingValue : defaultValue;
        }
        if (isEasingConfigValue(defaultValue)) {
          return isEasingConfigValue(existingValue) ? existingValue : defaultValue;
        }
        return defaultValue;
      case 'action':
        return defaultValue;
      default:
        return defaultValue;
    }
  }
}

function isVisible(rule: VisibleWhen | undefined, values: Record<string, DialValue>): boolean {
  if (!rule) return true;
  const value = values[rule.field];
  const matches = (targets: VisibleWhenValue | VisibleWhenValue[]) =>
    (Array.isArray(targets) ? targets : [targets]).some(target => target === value);
  return rule.is !== undefined ? matches(rule.is) : !matches(rule.not);
}

/** Drops controls whose rule fails, and folders left with nothing to show. */
function filterVisibleControls(controls: ControlMeta[], values: Record<string, DialValue>): ControlMeta[] {
  const visible: ControlMeta[] = [];
  for (const control of controls) {
    if (!isVisible(control.visibleWhen, values)) continue;
    const children = control.type === 'folder' ? control.children ?? [] : [];
    if (children.length === 0) {
      visible.push(control);
      continue;
    }
    const shown = filterVisibleControls(children, values);
    if (shown.length === 0) continue;
    const unchanged = shown.length === children.length && shown.every((child, index) => child === children[index]);
    visible.push(unchanged ? control : { ...control, children: shown });
  }
  return visible;
}

function hasControlPath(controls: ControlMeta[], path: string): boolean {
  return controls.some(control => control.path === path || hasControlPath(control.children ?? [], path));
}

function sameControlPaths(a: ControlMeta[], b: ControlMeta[]): boolean {
  return a.length === b.length && a.every((control, index) =>
    control.path === b[index].path && sameControlPaths(control.children ?? [], b[index].children ?? []));
}

// Singleton instance
export const DialStore = /* @__PURE__ */ new DialStoreClass();
