"use client";
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ButtonGroup: () => ButtonGroup,
  ColorControl: () => ColorControl,
  ControlRenderer: () => ControlRenderer,
  DialRoot: () => DialRoot,
  DialStore: () => DialStore,
  DialTimeline: () => DialTimeline,
  EasingVisualization: () => EasingVisualization,
  Folder: () => Folder,
  PresetManager: () => PresetManager,
  SelectControl: () => SelectControl,
  ShortcutsMenu: () => ShortcutsMenu,
  Slider: () => Slider,
  SpringControl: () => SpringControl,
  SpringVisualization: () => SpringVisualization,
  TextControl: () => TextControl,
  TimelineStore: () => TimelineStore,
  Toggle: () => Toggle,
  TransitionControl: () => TransitionControl,
  formatClock: () => formatClock,
  unwrapVisibility: () => unwrapVisibility,
  useDialKit: () => useDialKit,
  useDialKitController: () => useDialKitController,
  useDialTimeline: () => useDialTimeline,
  withVisibility: () => withVisibility
});
module.exports = __toCommonJS(index_exports);

// src/hooks/useDialKit.ts
var import_react2 = require("react");

// src/store/DialStore.ts
function withVisibility(control, rule) {
  return { value: control, visibleWhen: rule };
}
function unwrapVisibility(raw) {
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw) && "value" in raw && "visibleWhen" in raw) {
    return raw.value;
  }
  return raw;
}
var EMPTY_VALUES = Object.freeze({});
function resolveDialValues(config, flatValues) {
  return resolveConfigValues(config, flatValues, "");
}
function flattenDialValueUpdates(config, updates) {
  const values = {};
  if (typeof updates === "object" && updates !== null) {
    flattenConfigUpdates(config, updates, "", values);
  }
  return values;
}
function resolveConfigValues(config, flatValues, prefix) {
  const result = {};
  for (const [key, rawConfigValue] of Object.entries(config)) {
    if (key === "_collapsed") continue;
    const path = prefix ? `${prefix}.${key}` : key;
    const configValue = unwrapVisibility(rawConfigValue);
    if (Array.isArray(configValue) && configValue.length <= 4 && typeof configValue[0] === "number") {
      result[key] = flatValues[path] ?? configValue[0];
    } else if (typeof configValue === "number" || typeof configValue === "boolean" || typeof configValue === "string") {
      result[key] = flatValues[path] ?? configValue;
    } else if (isSpringConfigValue(configValue) || isEasingConfigValue(configValue)) {
      result[key] = flatValues[path] ?? configValue;
    } else if (isActionConfigValue(configValue)) {
      result[key] = flatValues[path] ?? configValue;
    } else if (isSelectConfigValue(configValue)) {
      const defaultValue = configValue.default ?? getFirstOptionValue(configValue.options);
      result[key] = flatValues[path] ?? defaultValue;
    } else if (isColorConfigValue(configValue)) {
      result[key] = flatValues[path] ?? configValue.default ?? "#000000";
    } else if (isTextConfigValue(configValue)) {
      result[key] = flatValues[path] ?? configValue.default ?? "";
    } else if (typeof configValue === "object" && configValue !== null) {
      result[key] = resolveConfigValues(configValue, flatValues, path);
    }
  }
  return result;
}
function flattenConfigUpdates(config, updates, prefix, values) {
  for (const [key, rawConfigValue] of Object.entries(config)) {
    if (key === "_collapsed" || !(key in updates)) continue;
    const nextValue = updates[key];
    if (nextValue === void 0) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    const configValue = unwrapVisibility(rawConfigValue);
    if (isActionConfigValue(configValue)) {
      continue;
    }
    if (isLeafConfigValue(configValue)) {
      values[path] = nextValue;
      continue;
    }
    if (typeof configValue === "object" && configValue !== null && typeof nextValue === "object" && nextValue !== null && !Array.isArray(nextValue)) {
      flattenConfigUpdates(configValue, nextValue, path, values);
    }
  }
}
function isLeafConfigValue(value) {
  return Array.isArray(value) && value.length <= 4 && typeof value[0] === "number" || typeof value === "number" || typeof value === "boolean" || typeof value === "string" || isSpringConfigValue(value) || isEasingConfigValue(value) || isActionConfigValue(value) || isSelectConfigValue(value) || isColorConfigValue(value) || isTextConfigValue(value);
}
function hasType(value, type) {
  return typeof value === "object" && value !== null && "type" in value && value.type === type;
}
function isSpringConfigValue(value) {
  return hasType(value, "spring");
}
function isEasingConfigValue(value) {
  return hasType(value, "easing");
}
function isHexColor(value) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value);
}
function formatLabel(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();
}
function inferStep(min, max) {
  const range = max - min;
  if (range <= 1) return 0.01;
  if (range <= 10) return 0.1;
  if (range <= 100) return 1;
  return 10;
}
function isActionConfigValue(value) {
  return hasType(value, "action");
}
function isSelectConfigValue(value) {
  return hasType(value, "select") && "options" in value && Array.isArray(value.options);
}
function isColorConfigValue(value) {
  return hasType(value, "color");
}
function isTextConfigValue(value) {
  return hasType(value, "text");
}
function getFirstOptionValue(options) {
  const first = options[0];
  if (first === void 0) return "";
  return typeof first === "string" ? first : first.value;
}
var DialStoreClass = class {
  constructor() {
    this.panels = /* @__PURE__ */ new Map();
    this.panelsSnapshot = [];
    this.standardPanelsSnapshot = [];
    this.timelinePanelsSnapshot = [];
    this.listeners = /* @__PURE__ */ new Map();
    this.globalListeners = /* @__PURE__ */ new Set();
    this.snapshots = /* @__PURE__ */ new Map();
    this.actionListeners = /* @__PURE__ */ new Map();
    this.presets = /* @__PURE__ */ new Map();
    this.activePreset = /* @__PURE__ */ new Map();
    this.baseValues = /* @__PURE__ */ new Map();
    this.defaultValues = /* @__PURE__ */ new Map();
    this.registrationCounts = /* @__PURE__ */ new Map();
    this.retainedPanels = /* @__PURE__ */ new Set();
    this.persistConfigs = /* @__PURE__ */ new Map();
    /**
     * Full (unfiltered) control tree per panel. `panels[id].controls` holds the
     * tree with conditional-visibility controls already filtered out, which is
     * what the UI renders. We keep the unfiltered tree here so visibility can
     * flip back when a dependent value changes.
     */
    this.allControls = /* @__PURE__ */ new Map();
  }
  registerPanel(id, name, config, shortcuts, options = {}) {
    const existingPanel = this.panels.get(id);
    if (existingPanel && existingPanel.kind !== options.kind) {
      console.warn(
        `[dialkit] Panel id "${id}" cannot be shared by a timeline and a standard panel; the most recent registration controls where it renders.`
      );
    }
    this.configurePanelRetention(id, options);
    this.registrationCounts.set(id, (this.registrationCounts.get(id) ?? 0) + 1);
    const allControls = this.parseConfig(config, "", shortcuts);
    const controlsByPath = this.mapControlsByPath(allControls);
    const defaultValues = this.flattenValues(config, "");
    this.initTransitionModes(config, "", defaultValues);
    const persisted = this.loadPersistedPanel(id);
    const previousValues = this.panels.get(id)?.values ?? this.snapshots.get(id) ?? persisted?.values ?? {};
    const values = this.reconcileValues(defaultValues, previousValues, controlsByPath);
    const previousBaseValues = this.baseValues.get(id) ?? persisted?.baseValues ?? persisted?.values ?? {};
    const baseValues = this.reconcileValues(defaultValues, previousBaseValues, controlsByPath);
    this.allControls.set(id, allControls);
    const controls = this.filterByVisibility(allControls, values);
    this.panels.set(id, { id, name, controls, values, shortcuts: shortcuts ?? {}, kind: options.kind, group: options.group, defaultOpen: options.defaultOpen, presetsEditable: options.presetsEditable, presetsLockable: options.presetsLockable });
    this.snapshots.set(id, { ...values });
    this.baseValues.set(id, baseValues);
    this.defaultValues.set(id, { ...defaultValues });
    const existingPresets = this.presets.get(id) ?? persisted?.presets;
    if (existingPresets) {
      this.presets.set(id, this.reconcilePresets(existingPresets, defaultValues, controlsByPath));
    }
    if (!this.activePreset.has(id) && persisted?.activePresetId !== void 0) {
      this.activePreset.set(id, persisted.activePresetId);
    }
    this.persistPanel(id);
    this.notify(id);
    this.notifyGlobal();
  }
  updatePanel(id, name, config, shortcuts, options = {}) {
    this.configurePanelRetention(id, options);
    const existing = this.panels.get(id);
    if (!existing) {
      this.registerPanel(id, name, config, shortcuts, options);
      return;
    }
    const allControls = this.parseConfig(config, "", shortcuts);
    const controlsByPath = this.mapControlsByPath(allControls);
    const defaultValues = this.flattenValues(config, "");
    this.initTransitionModes(config, "", defaultValues);
    const nextValues = this.reconcileValues(defaultValues, existing.values, controlsByPath);
    this.allControls.set(id, allControls);
    const controls = this.filterByVisibility(allControls, nextValues);
    const nextPanel = {
      id,
      name,
      controls,
      values: nextValues,
      shortcuts: shortcuts ?? existing.shortcuts,
      kind: options.kind ?? existing.kind,
      group: options.group ?? existing.group,
      defaultOpen: options.defaultOpen ?? existing.defaultOpen,
      presetsEditable: options.presetsEditable ?? existing.presetsEditable,
      presetsLockable: options.presetsLockable ?? existing.presetsLockable
    };
    this.panels.set(id, nextPanel);
    this.snapshots.set(id, { ...nextValues });
    const previousBaseValues = this.baseValues.get(id) ?? {};
    const nextBaseValues = this.reconcileValues(defaultValues, previousBaseValues, controlsByPath);
    for (const [path, value] of Object.entries(nextValues)) {
      if (path.endsWith(".__mode")) {
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
  unregisterPanel(id) {
    const nextCount = (this.registrationCounts.get(id) ?? 1) - 1;
    if (nextCount > 0) {
      this.registrationCounts.set(id, nextCount);
      return;
    }
    this.registrationCounts.delete(id);
    this.panels.delete(id);
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
    this.notifyGlobal();
  }
  updateValue(panelId, path, value) {
    this.updateValues(panelId, { [path]: value });
  }
  updateValues(panelId, updates) {
    const panel = this.panels.get(panelId);
    if (!panel) return;
    const validUpdates = {};
    for (const [path, value] of Object.entries(updates)) {
      if (!Object.prototype.hasOwnProperty.call(panel.values, path)) {
        continue;
      }
      const control = this.findControlByPath(panel.controls, path);
      if (control?.type === "action") {
        continue;
      }
      panel.values[path] = value;
      validUpdates[path] = value;
      if (control?.type === "transition") {
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
    const activeId = this.activePreset.get(panelId);
    if (activeId) {
      const presets = this.presets.get(panelId) ?? [];
      const preset = presets.find((p2) => p2.id === activeId);
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
    this.snapshots.set(panelId, { ...panel.values });
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
  resetValues(panelId) {
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
  updateSpringMode(panelId, path, mode) {
    this.updateTransitionMode(panelId, path, mode);
  }
  getSpringMode(panelId, path) {
    const mode = this.getTransitionMode(panelId, path);
    if (mode === "easing") return "simple";
    return mode;
  }
  updateTransitionMode(panelId, path, mode) {
    const panel = this.panels.get(panelId);
    if (!panel) return;
    panel.values[`${path}.__mode`] = mode;
    this.snapshots.set(panelId, { ...panel.values });
    this.persistPanel(panelId);
    this.notify(panelId);
  }
  getTransitionMode(panelId, path) {
    const panel = this.panels.get(panelId);
    if (!panel) return "simple";
    return panel.values[`${path}.__mode`] || "simple";
  }
  getValue(panelId, path) {
    const panel = this.panels.get(panelId);
    return panel?.values[path];
  }
  getValues(panelId) {
    return this.snapshots.get(panelId) ?? EMPTY_VALUES;
  }
  getPanels(kind) {
    if (kind === "panel") return this.standardPanelsSnapshot;
    if (kind === "timeline") return this.timelinePanelsSnapshot;
    return this.panelsSnapshot;
  }
  getPanel(id) {
    return this.panels.get(id);
  }
  subscribe(panelId, listener) {
    if (!this.listeners.has(panelId)) {
      this.listeners.set(panelId, /* @__PURE__ */ new Set());
    }
    this.listeners.get(panelId).add(listener);
    return () => {
      const listeners = this.listeners.get(panelId);
      listeners?.delete(listener);
      if (listeners?.size === 0 && !this.panels.has(panelId)) {
        this.listeners.delete(panelId);
      }
    };
  }
  subscribeGlobal(listener) {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }
  subscribeActions(panelId, listener) {
    if (!this.actionListeners.has(panelId)) {
      this.actionListeners.set(panelId, /* @__PURE__ */ new Set());
    }
    this.actionListeners.get(panelId).add(listener);
    return () => {
      const listeners = this.actionListeners.get(panelId);
      listeners?.delete(listener);
      if (listeners?.size === 0 && !this.panels.has(panelId)) {
        this.actionListeners.delete(panelId);
      }
    };
  }
  triggerAction(panelId, path) {
    this.actionListeners.get(panelId)?.forEach((fn) => fn(path));
  }
  savePreset(panelId, name) {
    const panel = this.panels.get(panelId);
    if (!panel) throw new Error(`Panel ${panelId} not found`);
    const id = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const preset = {
      id,
      name,
      values: { ...panel.values }
    };
    const existing = this.presets.get(panelId) ?? [];
    this.presets.set(panelId, [...existing, preset]);
    this.activePreset.set(panelId, id);
    this.snapshots.set(panelId, { ...panel.values });
    this.persistPanel(panelId);
    this.notify(panelId);
    return id;
  }
  loadPreset(panelId, presetId) {
    const panel = this.panels.get(panelId);
    if (!panel) return;
    const presets = this.presets.get(panelId) ?? [];
    const preset = presets.find((p2) => p2.id === presetId);
    if (!preset) return;
    panel.values = { ...preset.values };
    this.snapshots.set(panelId, { ...panel.values });
    this.activePreset.set(panelId, presetId);
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
  deletePreset(panelId, presetId) {
    const presets = this.presets.get(panelId) ?? [];
    this.presets.set(panelId, presets.filter((p2) => p2.id !== presetId));
    if (this.activePreset.get(panelId) === presetId) {
      this.activePreset.set(panelId, null);
    }
    const panel = this.panels.get(panelId);
    if (panel) {
      this.snapshots.set(panelId, { ...panel.values });
    }
    this.persistPanel(panelId);
    this.notify(panelId);
  }
  renamePreset(panelId, presetId, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const presets = this.presets.get(panelId) ?? [];
    const preset = presets.find((p2) => p2.id === presetId);
    if (!preset) return;
    this.presets.set(panelId, presets.map((p2) => p2.id === presetId ? { ...p2, name: trimmed } : p2));
    const panel = this.panels.get(panelId);
    if (panel) {
      this.snapshots.set(panelId, { ...panel.values });
    }
    this.persistPanel(panelId);
    this.notify(panelId);
  }
  setPresetLocked(panelId, presetId, locked) {
    const presets = this.presets.get(panelId) ?? [];
    const preset = presets.find((p2) => p2.id === presetId);
    if (!preset || !!preset.locked === locked) return;
    this.presets.set(panelId, presets.map((p2) => p2.id === presetId ? { ...p2, locked } : p2));
    const panel = this.panels.get(panelId);
    if (panel) {
      this.snapshots.set(panelId, { ...panel.values });
    }
    this.persistPanel(panelId);
    this.notify(panelId);
  }
  reorderPresets(panelId, orderedIds) {
    const presets = this.presets.get(panelId) ?? [];
    if (presets.length === 0) return;
    const byId = new Map(presets.map((p2) => [p2.id, p2]));
    const ordered = [];
    for (const id of orderedIds) {
      const preset = byId.get(id);
      if (preset) {
        ordered.push(preset);
        byId.delete(id);
      }
    }
    for (const preset of presets) {
      if (byId.has(preset.id)) ordered.push(preset);
    }
    const unchanged = ordered.length === presets.length && ordered.every((p2, i2) => p2.id === presets[i2].id);
    if (unchanged) return;
    this.presets.set(panelId, ordered);
    const panel = this.panels.get(panelId);
    if (panel) {
      this.snapshots.set(panelId, { ...panel.values });
    }
    this.persistPanel(panelId);
    this.notify(panelId);
  }
  getPresets(panelId) {
    return this.presets.get(panelId) ?? [];
  }
  getActivePresetId(panelId) {
    return this.activePreset.get(panelId) ?? null;
  }
  isPresetsEditable(panelId) {
    return this.panels.get(panelId)?.presetsEditable ?? true;
  }
  isPresetsLockable(panelId) {
    return this.panels.get(panelId)?.presetsLockable ?? false;
  }
  clearActivePreset(panelId) {
    const panel = this.panels.get(panelId);
    const base = this.baseValues.get(panelId);
    if (panel && base) {
      panel.values = { ...base };
      this.snapshots.set(panelId, { ...panel.values });
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
  resolveShortcutTarget(key, modifier) {
    for (const panel of this.panels.values()) {
      for (const [path, shortcut] of Object.entries(panel.shortcuts)) {
        if (!shortcut.key) continue;
        if (shortcut.key.toLowerCase() !== key.toLowerCase()) continue;
        const scMod = shortcut.modifier ?? void 0;
        if (scMod !== modifier) continue;
        const control = this.findControlByPath(panel.controls, path);
        if (control) {
          return { panelId: panel.id, path, control };
        }
      }
    }
    return null;
  }
  resolveScrollOnlyTargets() {
    const results = [];
    for (const panel of this.panels.values()) {
      for (const [path, shortcut] of Object.entries(panel.shortcuts)) {
        if ((shortcut.interaction ?? "scroll") !== "scroll-only") continue;
        const control = this.findControlByPath(panel.controls, path);
        if (control) {
          results.push({ panelId: panel.id, path, control, shortcut });
        }
      }
    }
    return results;
  }
  configurePanelRetention(id, options) {
    if (options.retainOnUnmount) {
      this.retainedPanels.add(id);
    }
    const persistConfig = this.normalizePersistConfig(id, options.persist);
    if (persistConfig) {
      this.persistConfigs.set(id, persistConfig);
      this.retainedPanels.add(id);
    }
  }
  reconcileValues(defaultValues, previousValues, controlsByPath) {
    const nextValues = {};
    for (const [path, defaultValue] of Object.entries(defaultValues)) {
      if (path.endsWith(".__mode")) {
        const transitionPath = path.slice(0, -".__mode".length);
        const transitionControl = controlsByPath.get(transitionPath);
        nextValues[path] = transitionControl?.type === "transition" && previousValues[path] !== void 0 ? previousValues[path] : defaultValue;
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
  reconcilePresets(presets, defaultValues, controlsByPath) {
    return presets.map((preset) => ({
      ...preset,
      values: this.reconcileValues(defaultValues, preset.values, controlsByPath)
    }));
  }
  normalizePersistConfig(id, persist) {
    if (!persist) return null;
    const options = typeof persist === "object" ? persist : {};
    return {
      key: options.key ?? `dialkit:${id}`,
      storage: options.storage ?? "localStorage",
      presets: options.presets ?? true
    };
  }
  loadPersistedPanel(id) {
    const config = this.persistConfigs.get(id);
    if (!config) return null;
    const storage = this.getStorage(config.storage);
    if (!storage) return null;
    try {
      const raw = storage.getItem(config.key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.version !== 1 || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  }
  persistPanel(id) {
    const config = this.persistConfigs.get(id);
    if (!config) return;
    const storage = this.getStorage(config.storage);
    if (!storage) return;
    const values = this.snapshots.get(id) ?? this.panels.get(id)?.values;
    if (!values) return;
    const state = {
      version: 1,
      values,
      baseValues: this.baseValues.get(id) ?? values,
      activePresetId: this.activePreset.get(id) ?? null
    };
    if (config.presets) {
      state.presets = this.presets.get(id) ?? [];
    }
    try {
      storage.setItem(config.key, JSON.stringify(state));
    } catch {
    }
  }
  getStorage(kind) {
    if (typeof globalThis === "undefined" || !("window" in globalThis)) {
      return null;
    }
    try {
      return kind === "sessionStorage" ? globalThis.window?.sessionStorage ?? null : globalThis.window?.localStorage ?? null;
    } catch {
      return null;
    }
  }
  findControlByPath(controls, path) {
    for (const control of controls) {
      if (control.path === path) return control;
      if (control.type === "folder" && control.children) {
        const found = this.findControlByPath(control.children, path);
        if (found) return found;
      }
    }
    return null;
  }
  notify(panelId) {
    this.listeners.get(panelId)?.forEach((fn) => fn());
  }
  notifyGlobal() {
    this.panelsSnapshot = Array.from(this.panels.values());
    this.standardPanelsSnapshot = this.panelsSnapshot.filter((panel) => panel.kind !== "timeline");
    this.timelinePanelsSnapshot = this.panelsSnapshot.filter((panel) => panel.kind === "timeline");
    this.globalListeners.forEach((fn) => fn());
  }
  /** Editor mode implied by a transition config's shape — the same mapping
   *  initTransitionModes applies to config defaults at registration. */
  transitionModeFor(value) {
    if (this.isEasingConfig(value)) return "easing";
    if (this.isSpringConfig(value)) {
      const hasPhysics = value.stiffness !== void 0 || value.damping !== void 0 || value.mass !== void 0;
      const hasTime = value.visualDuration !== void 0 || value.bounce !== void 0;
      return hasPhysics && !hasTime ? "advanced" : "simple";
    }
    return null;
  }
  initTransitionModes(config, prefix, values) {
    for (const [key, rawValue] of Object.entries(config)) {
      if (key === "_collapsed") continue;
      const path = prefix ? `${prefix}.${key}` : key;
      const value = this.unwrapVisibilityWithRule(rawValue).value;
      if (this.isEasingConfig(value)) {
        values[`${path}.__mode`] = "easing";
      } else if (this.isSpringConfig(value)) {
        const hasPhysics = value.stiffness !== void 0 || value.damping !== void 0 || value.mass !== void 0;
        const hasTime = value.visualDuration !== void 0 || value.bounce !== void 0;
        values[`${path}.__mode`] = hasPhysics && !hasTime ? "advanced" : "simple";
      } else if (typeof value === "object" && value !== null && !Array.isArray(value) && !this.isActionConfig(value) && !this.isSelectConfig(value) && !this.isColorConfig(value) && !this.isTextConfig(value)) {
        this.initTransitionModes(value, path, values);
      }
    }
  }
  parseConfig(config, prefix, shortcuts) {
    const controls = [];
    const startLen = () => controls.length;
    const tagLast = (visibleWhen, before) => {
      if (!visibleWhen) return;
      for (let i2 = before; i2 < controls.length; i2++) {
        if (!controls[i2].visibleWhen) controls[i2].visibleWhen = visibleWhen;
      }
    };
    for (const [key, rawValue] of Object.entries(config)) {
      if (key === "_collapsed") continue;
      const path = prefix ? `${prefix}.${key}` : key;
      const label = this.formatLabel(key);
      const shortcut = shortcuts?.[path];
      const unwrapped = this.unwrapVisibilityWithRule(rawValue);
      const value = unwrapped.value;
      const visibleWhen = unwrapped.visibleWhen;
      const before = startLen();
      if (Array.isArray(value) && value.length <= 4 && typeof value[0] === "number") {
        controls.push({
          type: "slider",
          path,
          label,
          min: value[1],
          max: value[2],
          step: value[3] ?? this.inferStep(value[1], value[2]),
          shortcut
        });
      } else if (typeof value === "number") {
        const { min, max, step } = this.inferRange(value);
        controls.push({ type: "slider", path, label, min, max, step, shortcut });
      } else if (typeof value === "boolean") {
        controls.push({ type: "toggle", path, label, shortcut });
      } else if (this.isSpringConfig(value) || this.isEasingConfig(value)) {
        controls.push({ type: "transition", path, label });
      } else if (this.isActionConfig(value)) {
        controls.push({ type: "action", path, label: value.label || label });
      } else if (this.isSelectConfig(value)) {
        controls.push({ type: "select", path, label, options: value.options });
      } else if (this.isColorConfig(value)) {
        controls.push({ type: "color", path, label });
      } else if (this.isTextConfig(value)) {
        controls.push({ type: "text", path, label, placeholder: value.placeholder });
      } else if (typeof value === "string") {
        if (this.isHexColor(value)) {
          controls.push({ type: "color", path, label });
        } else {
          controls.push({ type: "text", path, label });
        }
      } else if (typeof value === "object" && value !== null) {
        const folderConfig = value;
        const defaultOpen = "_collapsed" in folderConfig ? !folderConfig._collapsed : true;
        controls.push({
          type: "folder",
          path,
          label,
          defaultOpen,
          children: this.parseConfig(folderConfig, path, shortcuts)
        });
      }
      tagLast(visibleWhen, before);
    }
    return controls;
  }
  flattenValues(config, prefix) {
    const values = {};
    for (const [key, rawValue] of Object.entries(config)) {
      if (key === "_collapsed") continue;
      const path = prefix ? `${prefix}.${key}` : key;
      const value = this.unwrapVisibilityWithRule(rawValue).value;
      if (Array.isArray(value) && value.length <= 4 && typeof value[0] === "number") {
        values[path] = value[0];
      } else if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
        values[path] = value;
      } else if (this.isSpringConfig(value) || this.isEasingConfig(value)) {
        values[path] = value;
      } else if (this.isActionConfig(value)) {
        values[path] = value;
      } else if (this.isSelectConfig(value)) {
        const firstOption = value.options[0];
        const firstValue = typeof firstOption === "string" ? firstOption : firstOption.value;
        values[path] = value.default ?? firstValue;
      } else if (this.isColorConfig(value)) {
        values[path] = value.default ?? "#000000";
      } else if (this.isTextConfig(value)) {
        values[path] = value.default ?? "";
      } else if (typeof value === "object" && value !== null) {
        Object.assign(values, this.flattenValues(value, path));
      }
    }
    return values;
  }
  isSpringConfig(value) {
    return typeof value === "object" && value !== null && "type" in value && value.type === "spring";
  }
  isEasingConfig(value) {
    return typeof value === "object" && value !== null && "type" in value && value.type === "easing";
  }
  isActionConfig(value) {
    return typeof value === "object" && value !== null && "type" in value && value.type === "action";
  }
  isSelectConfig(value) {
    return typeof value === "object" && value !== null && "type" in value && value.type === "select" && "options" in value && Array.isArray(value.options);
  }
  isColorConfig(value) {
    return typeof value === "object" && value !== null && "type" in value && value.type === "color";
  }
  isTextConfig(value) {
    return typeof value === "object" && value !== null && "type" in value && value.type === "text";
  }
  isHexColor(value) {
    return isHexColor(value);
  }
  formatLabel(key) {
    return formatLabel(key);
  }
  inferRange(value) {
    if (value >= 0 && value <= 1) {
      return { min: 0, max: 1, step: 0.01 };
    } else if (value >= 0 && value <= 10) {
      return { min: 0, max: value * 3 || 10, step: 0.1 };
    } else if (value >= 0 && value <= 100) {
      return { min: 0, max: value * 3 || 100, step: 1 };
    } else if (value >= 0) {
      return { min: 0, max: value * 3 || 1e3, step: 10 };
    } else {
      return { min: value * 3, max: -value * 3, step: 1 };
    }
  }
  inferStep(min, max) {
    return inferStep(min, max);
  }
  normalizePreservedValue(existingValue, defaultValue, control) {
    if (existingValue === void 0 || !control) {
      return defaultValue;
    }
    switch (control.type) {
      case "slider": {
        if (typeof existingValue !== "number" || typeof defaultValue !== "number") {
          return defaultValue;
        }
        const min = control.min ?? Number.NEGATIVE_INFINITY;
        const max = control.max ?? Number.POSITIVE_INFINITY;
        const clamped = Math.min(max, Math.max(min, existingValue));
        if (typeof control.step !== "number" || control.step <= 0) {
          return clamped;
        }
        return this.roundToStep(clamped, min, max, control.step);
      }
      case "toggle":
        return typeof existingValue === "boolean" ? existingValue : defaultValue;
      case "select": {
        if (typeof existingValue !== "string") {
          return defaultValue;
        }
        const options = control.options ?? [];
        const validValues = new Set(options.map((option) => typeof option === "string" ? option : option.value));
        return validValues.has(existingValue) ? existingValue : defaultValue;
      }
      case "color":
      case "text":
        return typeof existingValue === "string" ? existingValue : defaultValue;
      case "transition":
        if (this.isSpringConfig(existingValue) || this.isEasingConfig(existingValue)) {
          return existingValue;
        }
        return defaultValue;
      case "action":
        return defaultValue;
      default:
        return defaultValue;
    }
  }
  roundToStep(value, min, max, step) {
    const snapped = min + Math.round((value - min) / step) * step;
    const clamped = Math.min(max, Math.max(min, snapped));
    const precision = this.stepPrecision(step);
    return Number(clamped.toFixed(precision));
  }
  stepPrecision(step) {
    const text = String(step);
    const decimalIndex = text.indexOf(".");
    return decimalIndex === -1 ? 0 : text.length - decimalIndex - 1;
  }
  mapControlsByPath(controls) {
    const map = /* @__PURE__ */ new Map();
    const visit = (nodes) => {
      for (const node of nodes) {
        if (node.type === "folder" && node.children) {
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
  unwrapVisibilityWithRule(raw) {
    if (typeof raw === "object" && raw !== null && !Array.isArray(raw) && "value" in raw && "visibleWhen" in raw) {
      const wrapper = raw;
      return { value: wrapper.value, visibleWhen: wrapper.visibleWhen };
    }
    return { value: raw, visibleWhen: void 0 };
  }
  /** Evaluate a visibility rule against a flat value map. */
  isVisible(rule, values) {
    if (!rule) return true;
    const actual = values[rule.field];
    if (actual === void 0 && !(rule.field in values)) {
      if (typeof globalThis !== "undefined" && typeof console !== "undefined") {
        console.warn(
          `[DialKit] visibleWhen references field "${rule.field}" which does not exist in the panel's values. The control will default to visible. Check for typos \u2014 field must be the full dot-delimited store path.`
        );
      }
    }
    if (rule.is !== void 0) {
      const targets = Array.isArray(rule.is) ? rule.is : [rule.is];
      return targets.some((t2) => t2 === actual);
    }
    if (rule.not !== void 0) {
      const targets = Array.isArray(rule.not) ? rule.not : [rule.not];
      return !targets.some((t2) => t2 === actual);
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
  filterByVisibility(controls, values) {
    const result = [];
    for (const control of controls) {
      if (!this.isVisible(control.visibleWhen, values)) continue;
      if (control.type === "folder" && control.children) {
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
  sameControlPaths(a2, b2) {
    if (a2.length !== b2.length) return false;
    for (let i2 = 0; i2 < a2.length; i2++) {
      const ca = a2[i2];
      const cb = b2[i2];
      if (ca.path !== cb.path || ca.type !== cb.type) return false;
      if (ca.type === "folder") {
        const childrenA = ca.children ?? [];
        const childrenB = cb.children ?? [];
        if (!this.sameControlPaths(childrenA, childrenB)) return false;
      }
    }
    return true;
  }
};
var DialStore = /* @__PURE__ */ new DialStoreClass();

// src/hooks/useDialStorePanel.ts
var import_react = require("react");
function useSerialized(value) {
  const ref = (0, import_react.useRef)();
  if (!ref.current || !Object.is(ref.current.value, value)) {
    ref.current = { value, text: JSON.stringify(value) };
  }
  return ref.current.text;
}
function useDialStorePanel(name, config, options = {}) {
  const instanceId = (0, import_react.useId)();
  const hasStableId = options.id !== void 0;
  const panelId = options.id ?? `${name}-${instanceId}`;
  const configRef = (0, import_react.useRef)(config);
  configRef.current = config;
  const optionsRef = (0, import_react.useRef)(options);
  optionsRef.current = options;
  const serializedConfig = useSerialized(config);
  const serializedShortcuts = useSerialized(options.shortcuts);
  const serializedPersist = useSerialized(options.persist);
  (0, import_react.useEffect)(() => {
    DialStore.registerPanel(panelId, name, configRef.current, optionsRef.current.shortcuts, {
      retainOnUnmount: hasStableId,
      persist: optionsRef.current.persist,
      kind: optionsRef.current.kind,
      group: optionsRef.current.group,
      defaultOpen: optionsRef.current.defaultOpen,
      presetsEditable: optionsRef.current.presetsEditable,
      presetsLockable: optionsRef.current.presetsLockable
    });
    return () => DialStore.unregisterPanel(panelId);
  }, [hasStableId, panelId, name]);
  const mountedRef = (0, import_react.useRef)(false);
  (0, import_react.useEffect)(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    DialStore.updatePanel(panelId, name, configRef.current, optionsRef.current.shortcuts, {
      retainOnUnmount: hasStableId,
      persist: optionsRef.current.persist,
      kind: optionsRef.current.kind,
      group: optionsRef.current.group,
      defaultOpen: optionsRef.current.defaultOpen,
      presetsEditable: optionsRef.current.presetsEditable,
      presetsLockable: optionsRef.current.presetsLockable
    });
  }, [hasStableId, panelId, name, serializedConfig, serializedShortcuts, serializedPersist, options.group, options.defaultOpen, options.presetsEditable, options.presetsLockable]);
  const subscribe = (0, import_react.useCallback)(
    (callback) => DialStore.subscribe(panelId, callback),
    [panelId]
  );
  const getSnapshot = (0, import_react.useCallback)(() => DialStore.getValues(panelId), [panelId]);
  const flatValues = (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return { panelId, flatValues, serializedConfig };
}

// src/hooks/useDialKit.ts
function useDialKit(name, config, options) {
  return useDialKitController(name, config, options).values;
}
function useDialKitController(name, config, options) {
  const { panelId, flatValues, serializedConfig } = useDialStorePanel(name, config, {
    id: options?.id,
    persist: options?.persist,
    shortcuts: options?.shortcuts,
    group: options?.group,
    defaultOpen: options?.defaultOpen,
    presetsEditable: options?.presetsEditable,
    presetsLockable: options?.presetsLockable
  });
  const configRef = (0, import_react2.useRef)(config);
  configRef.current = config;
  const onActionRef = (0, import_react2.useRef)(options?.onAction);
  onActionRef.current = options?.onAction;
  (0, import_react2.useEffect)(() => {
    return DialStore.subscribeActions(panelId, (action) => {
      onActionRef.current?.(action);
    });
  }, [panelId]);
  const values = (0, import_react2.useMemo)(
    () => resolveDialValues(configRef.current, flatValues),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flatValues, serializedConfig]
  );
  const setValue = (0, import_react2.useCallback)(
    (path, value) => {
      DialStore.updateValue(panelId, path, value);
    },
    [panelId]
  );
  const setValues = (0, import_react2.useCallback)(
    (nextValues) => {
      DialStore.updateValues(panelId, flattenDialValueUpdates(configRef.current, nextValues));
    },
    [panelId]
  );
  const resetValues = (0, import_react2.useCallback)(() => {
    DialStore.resetValues(panelId);
  }, [panelId]);
  const getValues = (0, import_react2.useCallback)(
    () => resolveDialValues(configRef.current, DialStore.getValues(panelId)),
    [panelId]
  );
  return (0, import_react2.useMemo)(
    () => ({
      values,
      setValue,
      setValues,
      resetValues,
      getValues
    }),
    [getValues, resetValues, setValue, setValues, values]
  );
}

// src/components/DialRoot.tsx
var import_react24 = require("react");
var import_react_dom4 = require("react-dom");

// src/store/TimelineStore.ts
function loopSpan(duration, loopStart) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  if (!Number.isFinite(loopStart)) loopStart = 0;
  const start = Math.min(Math.max(0, loopStart), duration);
  return duration - start > 0 ? duration - start : duration;
}
function foldLoopTime(time, duration, loopStart = 0) {
  if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) {
    return { time: 0, wraps: 0 };
  }
  if (time < duration) return { time, wraps: 0 };
  const span = loopSpan(duration, loopStart);
  const base = duration - span;
  const over = time - base;
  return { time: base + over % span, wraps: Math.floor(over / span) };
}
var TIMELINE_CLIP_COLORS = [
  "#E8E8E8"
  // neutral white — slightly off-white so the pure-white selection ring still reads
];
var EMPTY_TRANSPORT = Object.freeze({ time: 0, playing: false, duration: 0, wraps: 0 });
var TimelineStoreClass = class {
  constructor() {
    this.timelines = /* @__PURE__ */ new Map();
    this.transports = /* @__PURE__ */ new Map();
    this.listeners = /* @__PURE__ */ new Map();
    this.globalListeners = /* @__PURE__ */ new Set();
    this.registrationCounts = /* @__PURE__ */ new Map();
    this.listCache = null;
    this.rafId = null;
    this.lastTick = 0;
    this.tick = (now) => {
      const dt = Math.max(0, (now - this.lastTick) / 1e3);
      this.lastTick = now;
      let anyPlaying = false;
      for (const [id, transport] of this.transports) {
        if (!transport.playing) continue;
        const meta = this.timelines.get(id);
        const duration = meta?.duration ?? transport.duration;
        if (!Number.isFinite(duration) || duration <= 0) {
          this.transports.set(id, { time: 0, playing: false, duration: 0, wraps: 0 });
          this.notify(id);
          continue;
        }
        let time = transport.time + dt;
        let playing = true;
        let wraps = transport.wraps;
        if (time >= duration) {
          if (meta?.loop) {
            const folded = foldLoopTime(time, duration, meta.loopStart);
            time = folded.time;
            wraps += folded.wraps;
          } else {
            time = duration;
            playing = false;
          }
        }
        this.transports.set(id, { time, playing, duration, wraps });
        if (playing) anyPlaying = true;
        this.notify(id);
      }
      this.rafId = anyPlaying ? window.requestAnimationFrame(this.tick) : null;
    };
  }
  register(meta, options) {
    const existing = this.timelines.get(meta.id);
    if (existing && existing.name !== meta.name) {
      console.warn(
        `[dialkit] Timeline id "${meta.id}" is already registered by "${existing.name}"; "${meta.name}" will share and overwrite that transport.`
      );
    }
    this.registrationCounts.set(meta.id, (this.registrationCounts.get(meta.id) ?? 0) + 1);
    this.applyMeta(meta, options.autoplay);
  }
  update(meta) {
    if (!this.timelines.has(meta.id)) return;
    this.applyMeta(meta, false);
  }
  unregister(id) {
    const nextCount = (this.registrationCounts.get(id) ?? 1) - 1;
    if (nextCount > 0) {
      this.registrationCounts.set(id, nextCount);
      return;
    }
    this.registrationCounts.delete(id);
    this.timelines.delete(id);
    this.transports.delete(id);
    if (this.listeners.get(id)?.size === 0) this.listeners.delete(id);
    this.listCache = null;
    this.notifyGlobal();
  }
  play(id) {
    const transport = this.transports.get(id);
    if (!transport || transport.duration <= 0 || transport.playing) return;
    const restart = transport.time >= transport.duration;
    this.transports.set(id, {
      ...transport,
      time: restart ? 0 : transport.time,
      wraps: restart ? 0 : transport.wraps,
      playing: true
    });
    this.notify(id);
    this.ensureLoop();
  }
  pause(id) {
    const transport = this.transports.get(id);
    if (!transport || !transport.playing) return;
    this.transports.set(id, { ...transport, playing: false });
    this.notify(id);
  }
  replay(id) {
    const transport = this.transports.get(id);
    if (!transport || transport.duration <= 0) return;
    this.transports.set(id, { ...transport, time: 0, wraps: 0, playing: true });
    this.notify(id);
    this.ensureLoop();
  }
  setLoop(id, loop) {
    const meta = this.timelines.get(id);
    if (!meta || meta.loop === loop) return;
    this.timelines.set(id, { ...meta, loop });
    this.listCache = null;
    this.notify(id);
    this.notifyGlobal();
  }
  /**
   * Name the clip the host is editing, or pass null to clear it. Store
   * state, not config state — `applyMeta` carries it across rebuilds.
   */
  setHighlight(id, clipKey) {
    const meta = this.timelines.get(id);
    if (!meta || (meta.highlightedClip ?? null) === clipKey) return;
    this.timelines.set(id, { ...meta, highlightedClip: clipKey });
    this.listCache = null;
    this.notify(id);
    this.notifyGlobal();
  }
  seek(id, time) {
    const transport = this.transports.get(id);
    if (!transport || !Number.isFinite(time)) return;
    const clamped = Math.min(transport.duration, Math.max(0, time));
    this.transports.set(id, { ...transport, time: clamped, wraps: 0 });
    this.notify(id);
  }
  getTransport(id) {
    return this.transports.get(id) ?? EMPTY_TRANSPORT;
  }
  getTimeline(id) {
    return this.timelines.get(id);
  }
  getTimelines() {
    if (!this.listCache) {
      this.listCache = Array.from(this.timelines.values());
    }
    return this.listCache;
  }
  subscribe(id, listener) {
    if (!this.listeners.has(id)) {
      this.listeners.set(id, /* @__PURE__ */ new Set());
    }
    this.listeners.get(id).add(listener);
    return () => {
      const listeners = this.listeners.get(id);
      listeners?.delete(listener);
      if (listeners?.size === 0 && !this.timelines.has(id)) {
        this.listeners.delete(id);
      }
    };
  }
  subscribeGlobal(listener) {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }
  applyMeta(meta, autoplay) {
    const duration = Number.isFinite(meta.duration) ? Math.max(0, meta.duration) : 0;
    const loopStart = Number.isFinite(meta.loopStart) ? Math.min(duration, Math.max(0, meta.loopStart)) : 0;
    const previous = this.timelines.get(meta.id);
    const highlightedClip = meta.highlightedClip !== void 0 ? meta.highlightedClip : previous?.highlightedClip ?? null;
    const safeMeta = { ...meta, duration, loopStart, highlightedClip };
    this.timelines.set(meta.id, safeMeta);
    const existing = this.transports.get(meta.id);
    if (existing) {
      this.transports.set(meta.id, {
        time: Math.min(existing.time, duration),
        playing: duration > 0 && existing.playing,
        duration,
        wraps: existing.wraps
      });
    } else {
      const playing = duration > 0 && autoplay;
      this.transports.set(meta.id, { time: 0, playing, duration, wraps: 0 });
      if (playing) this.ensureLoop();
    }
    this.listCache = null;
    this.notify(meta.id);
    this.notifyGlobal();
  }
  ensureLoop() {
    if (this.rafId !== null || typeof window === "undefined") return;
    this.lastTick = performance.now();
    this.rafId = window.requestAnimationFrame(this.tick);
  }
  notify(id) {
    this.listeners.get(id)?.forEach((fn) => fn());
  }
  notifyGlobal() {
    this.globalListeners.forEach((fn) => fn());
  }
};
var TimelineStore = /* @__PURE__ */ new TimelineStoreClass();

// src/env.ts
var import_meta = {};
var isDevDefault = typeof process !== "undefined" && process?.env?.NODE_ENV ? process.env.NODE_ENV !== "production" : typeof import_meta !== "undefined" && import_meta.env?.MODE ? import_meta.env.MODE !== "production" : true;

// src/components/Folder.tsx
var import_react3 = require("react");
var import_react4 = require("motion/react");

// src/icons.ts
var ICON_CHEVRON = "M6 9.5L12 15.5L18 9.5";
var ICON_CHECK = "M5 12.75L10 19L19 5";
var ICON_PAUSE = [
  "M6.75 3C5.23122 3 4 4.23122 4 5.75V18.25C4 19.7688 5.23122 21 6.75 21H7.25C8.76878 21 10 19.7688 10 18.25V5.75C10 4.23122 8.76878 3 7.25 3H6.75Z",
  "M16.75 3C15.2312 3 14 4.23122 14 5.75V18.25C14 19.7688 15.2312 21 16.75 21H17.25C18.7688 21 20 19.7688 20 18.25V5.75C20 4.23122 18.7688 3 17.25 3H16.75Z"
];
var ICON_PLAY = "M9.24394 2.36758C7.41419 1.18362 5 2.49701 5 4.67639V19.3238C5 21.5032 7.41419 22.8166 9.24394 21.6326L20.5624 14.3089C22.2371 13.2253 22.2372 10.775 20.5624 9.69129L9.24394 2.36758Z";
var ICON_REPLAY = [
  "M12 2.5C17.2466 2.50016 21.5 6.7534 21.5 12C21.5 17.2466 17.2466 21.4998 12 21.5C7.52191 21.5 3.76987 18.4025 2.76465 14.2344C2.63517 13.6975 2.96508 13.1578 3.50195 13.0283C4.03883 12.8988 4.57851 13.2288 4.70801 13.7656C5.5016 17.0563 8.46701 19.5 12 19.5C16.142 19.4998 19.5 16.142 19.5 12C19.5 7.85796 16.142 4.50016 12 4.5C9.32981 4.5 6.98389 5.89541 5.6543 8H7.5C8.05228 8 8.5 8.44772 8.5 9C8.5 9.55228 8.05228 10 7.5 10H3.5C2.94772 10 2.5 9.55228 2.5 9V5C2.5 4.44772 2.94772 4 3.5 4C4.05228 4 4.5 4.44772 4.5 5V6.16797C6.2376 3.93677 8.95063 2.5 12 2.5Z",
  "M10 9.94043C10 9.33379 10.6826 8.97849 11.1797 9.32617L14.1221 11.3857C14.5486 11.6843 14.5486 12.3157 14.1221 12.6143L11.1797 14.6738C10.6826 15.0215 10 14.6662 10 14.0596V9.94043Z"
];
var ICON_LOOP = [
  "M17 2L21 6L17 10",
  "M3 11V10C3 7.79086 4.79086 6 7 6H21",
  "M7 22L3 18L7 14",
  "M21 13V14C21 16.2091 19.2091 18 17 18H3"
];
var ICON_TIMELINE = [
  "M18.868 10C20.8517 10.0003 22.2886 11.8914 21.7577 13.8027L20.369 18.8027C20.0083 20.1012 18.826 20.9999 17.4784 21H6.51941C5.17179 21 3.98948 20.1012 3.62878 18.8027L2.24011 13.8027C1.7092 11.8913 3.14603 10.0003 5.12976 10H18.868Z",
  "M18.9989 6.5C19.5511 6.50007 19.9989 6.94776 19.9989 7.5C19.9989 8.05224 19.5511 8.49993 18.9989 8.5H4.9989C4.44661 8.5 3.9989 8.05228 3.9989 7.5C3.9989 6.94772 4.44661 6.5 4.9989 6.5H18.9989Z",
  "M16.9989 3C17.5511 3.00007 17.9989 3.44776 17.9989 4C17.9989 4.55224 17.5511 4.99993 16.9989 5H6.9989C6.44661 5 5.9989 4.55228 5.9989 4C5.9989 3.44772 6.44661 3 6.9989 3H16.9989Z"
];
var ICON_CLIPBOARD = {
  board: "M8 6C8 4.34315 9.34315 3 11 3H13C14.6569 3 16 4.34315 16 6V7H8V6Z",
  sparkle: "M19.2405 16.1852L18.5436 14.3733C18.4571 14.1484 18.241 14 18 14C17.759 14 17.5429 14.1484 17.4564 14.3733L16.7595 16.1852C16.658 16.4493 16.4493 16.658 16.1852 16.7595L14.3733 17.4564C14.1484 17.5429 14 17.759 14 18C14 18.241 14.1484 18.4571 14.3733 18.5436L16.1852 19.2405C16.4493 19.342 16.658 19.5507 16.7595 19.8148L17.4564 21.6267C17.5429 21.8516 17.759 22 18 22C18.241 22 18.4571 21.8516 18.5436 21.6267L19.2405 19.8148C19.342 19.5507 19.5507 19.342 19.8148 19.2405L21.6267 18.5436C21.8516 18.4571 22 18.241 22 18C22 17.759 21.8516 17.5429 21.6267 17.4564L19.8148 16.7595C19.5507 16.658 19.342 16.4493 19.2405 16.1852Z",
  body: "M16 5H17C18.6569 5 20 6.34315 20 8V11M8 5H7C5.34315 5 4 6.34315 4 8V18C4 19.6569 5.34315 21 7 21H12"
};
var ICON_ADD_PRESET = [
  "M4 6H20",
  "M4 12H10",
  "M15 15L21 15",
  "M18 12V18",
  "M4 18H10"
];
var ICON_PENCIL = [
  "M12 20h9",
  "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"
];
var ICON_TRASH = [
  "M5 6.5L5.80734 18.2064C5.91582 19.7794 7.22348 21 8.80023 21H15.1998C16.7765 21 18.0842 19.7794 18.1927 18.2064L19 6.5",
  "M10 11V16",
  "M14 11V16",
  "M3.5 6H20.5",
  "M8.07092 5.74621C8.42348 3.89745 10.0485 2.5 12 2.5C13.9515 2.5 15.5765 3.89745 15.9291 5.74621"
];
var ICON_LOCK = [
  "M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z",
  "M7 11V7a5 5 0 0 1 10 0v4"
];
var ICON_LOCK_OPEN = [
  "M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z",
  "M7 11V7a5 5 0 0 1 9.9-1"
];
var ICON_PANEL = {
  path: "M6.84766 11.75C6.78583 11.9899 6.75 12.2408 6.75 12.5C6.75 12.7592 6.78583 13.0101 6.84766 13.25H2C1.58579 13.25 1.25 12.9142 1.25 12.5C1.25 12.0858 1.58579 11.75 2 11.75H6.84766ZM14 11.75C14.4142 11.75 14.75 12.0858 14.75 12.5C14.75 12.9142 14.4142 13.25 14 13.25H12.6523C12.7142 13.0101 12.75 12.7592 12.75 12.5C12.75 12.2408 12.7142 11.9899 12.6523 11.75H14ZM3.09766 7.25C3.03583 7.48994 3 7.74075 3 8C3 8.25925 3.03583 8.51006 3.09766 8.75H2C1.58579 8.75 1.25 8.41421 1.25 8C1.25 7.58579 1.58579 7.25 2 7.25H3.09766ZM14 7.25C14.4142 7.25 14.75 7.58579 14.75 8C14.75 8.41421 14.4142 8.75 14 8.75H8.90234C8.96417 8.51006 9 8.25925 9 8C9 7.74075 8.96417 7.48994 8.90234 7.25H14ZM7.59766 2.75C7.53583 2.98994 7.5 3.24075 7.5 3.5C7.5 3.75925 7.53583 4.01006 7.59766 4.25H2C1.58579 4.25 1.25 3.91421 1.25 3.5C1.25 3.08579 1.58579 2.75 2 2.75H7.59766ZM14 2.75C14.4142 2.75 14.75 3.08579 14.75 3.5C14.75 3.91421 14.4142 4.25 14 4.25H13.4023C13.4642 4.01006 13.5 3.75925 13.5 3.5C13.5 3.24075 13.4642 2.98994 13.4023 2.75H14Z",
  circles: [
    { cx: "6", cy: "8", r: "0.998596" },
    { cx: "10.4999", cy: "3.5", r: "0.998657" },
    { cx: "9.75015", cy: "12.5", r: "0.997986" }
  ]
};

// src/components/Folder.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function Folder({ title, children, defaultOpen = true, isRoot = false, inline = false, onOpenChange, toolbar, open, onToggle, panelHeightOffset = 10 }) {
  const controlled = open !== void 0;
  const [internalOpen, setInternalOpen] = (0, import_react3.useState)(defaultOpen);
  const isOpen = controlled ? open : internalOpen;
  const [isCollapsed, setIsCollapsed] = (0, import_react3.useState)(!defaultOpen);
  const contentRef = (0, import_react3.useRef)(null);
  const [contentHeight, setContentHeight] = (0, import_react3.useState)(void 0);
  const [windowHeight, setWindowHeight] = (0, import_react3.useState)(typeof window !== "undefined" ? window.innerHeight : 800);
  (0, import_react3.useEffect)(() => {
    if (!isRoot) return;
    const onResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isRoot]);
  (0, import_react3.useEffect)(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (isOpen) {
        const h2 = el.offsetHeight;
        setContentHeight((prev) => prev === h2 ? prev : h2);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);
  const handleToggle = () => {
    if (inline && isRoot) return;
    const next = !isOpen;
    if (controlled) {
      onToggle?.(next);
      onOpenChange?.(next);
      return;
    }
    setInternalOpen(next);
    if (next) {
      setIsCollapsed(false);
    } else {
      setIsCollapsed(true);
    }
    onOpenChange?.(next);
  };
  const folderContent = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      ref: isRoot ? contentRef : void 0,
      className: `dialkit-folder ${isRoot ? "dialkit-folder-root" : ""}`,
      "data-open": String(isOpen),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `dialkit-folder-header ${isRoot ? "dialkit-panel-header" : ""}`, onClick: handleToggle, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dialkit-folder-header-top", children: [
            isRoot ? isOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dialkit-folder-title-row", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dialkit-folder-title dialkit-folder-title-root", children: title }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dialkit-folder-title-row", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dialkit-folder-title", children: title }) }),
            isRoot && !inline && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "svg",
              {
                className: "dialkit-panel-icon",
                viewBox: "0 0 16 16",
                fill: "none",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { opacity: "0.5", d: ICON_PANEL.path, fill: "currentColor" }),
                  ICON_PANEL.circles.map((c2, i2) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: c2.cx, cy: c2.cy, r: c2.r, fill: "currentColor", stroke: "currentColor", strokeWidth: "1.25" }, i2))
                ]
              }
            ),
            !isRoot && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              import_react4.motion.svg,
              {
                className: "dialkit-folder-icon",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2.5",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                initial: false,
                animate: { rotate: isOpen ? 0 : 180 },
                transition: { type: "spring", visualDuration: 0.35, bounce: 0.15 },
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: ICON_CHEVRON })
              }
            )
          ] }),
          isRoot && toolbar && isOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dialkit-panel-toolbar", onClick: (e2) => e2.stopPropagation(), children: toolbar })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react4.AnimatePresence, { initial: false, children: isOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_react4.motion.div,
          {
            className: "dialkit-folder-content",
            initial: isRoot ? void 0 : { height: 0, opacity: 0 },
            animate: isRoot ? void 0 : { height: "auto", opacity: 1 },
            exit: isRoot ? void 0 : { height: 0, opacity: 0 },
            transition: isRoot ? void 0 : { type: "spring", visualDuration: 0.35, bounce: 0.1 },
            style: isRoot ? void 0 : { clipPath: "inset(0 -20px)" },
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dialkit-folder-inner", children })
          }
        ) })
      ]
    }
  );
  if (isRoot) {
    if (inline) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dialkit-panel-inner dialkit-panel-inline", children: folderContent });
    }
    const panelStyle = isOpen ? { width: 280, height: contentHeight !== void 0 ? Math.min(contentHeight + panelHeightOffset, windowHeight - 32) : "auto", borderRadius: 14, boxShadow: "var(--dial-shadow)", cursor: void 0, overflowY: "auto" } : { width: 42, height: 42, borderRadius: "50%", boxSizing: "border-box", boxShadow: "var(--dial-shadow-collapsed)", overflow: "hidden", cursor: "pointer" };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      import_react4.motion.div,
      {
        className: "dialkit-panel-inner",
        style: panelStyle,
        onClick: !isOpen ? handleToggle : void 0,
        "data-collapsed": isCollapsed,
        whileTap: !isOpen ? { scale: 0.9 } : void 0,
        transition: { type: "spring", visualDuration: 0.15, bounce: 0.3 },
        children: folderContent
      }
    );
  }
  return folderContent;
}

// src/components/Panel.tsx
var import_react20 = require("react");
var import_react21 = require("motion/react");

// src/copy-instruction.ts
function buildCopyInstruction(hookName, panelName, values) {
  const jsonStr = JSON.stringify(values, null, 2);
  if (hookName === "useDialTimeline" || hookName === "createDialTimeline") {
    return `Update the ${hookName} configuration for "${panelName}" with these values:

\`\`\`json
${jsonStr}
\`\`\`

Apply these values as the new defaults in the ${hookName} call. Keep the existing \`clip.current\` bindings while this timeline is being authored; do not convert the animation or remove DialKit yet.

Add this comment immediately above the ${hookName} call as a production handoff note:

\`\`\`tsx
// TODO(production): DialKit's clip.current values are the scrubbable authoring preview.
// Replace them with equivalent real Motion animations using the tuned timeline
// timings and transitions, then remove ${hookName} and <DialTimeline />.
\`\`\``;
  }
  return `Update the ${hookName} configuration for "${panelName}" with these values:

\`\`\`json
${jsonStr}
\`\`\`

Apply these values as the new defaults in the ${hookName} call.`;
}

// src/components/ControlRenderer.tsx
var import_react16 = require("react");
var import_react17 = require("motion/react");

// src/components/control-motion.ts
var CONTROL_ANIM = {
  initial: { opacity: 0, height: 0, marginBottom: -6 },
  animate: { opacity: 1, height: "auto", marginBottom: 0 },
  exit: { opacity: 0, height: 0, marginBottom: -6 },
  transition: {
    type: "spring",
    visualDuration: 0.25,
    bounce: 0.1
  },
  style: { overflow: "hidden" }
};

// src/components/ShortcutListener.tsx
var import_react5 = require("react");

// src/shortcut-utils.ts
function decimalsForStep(step) {
  const s2 = step.toString();
  const dot = s2.indexOf(".");
  return dot === -1 ? 0 : s2.length - dot - 1;
}
function roundValue(val, step) {
  const raw = Math.round(val / step) * step;
  return parseFloat(raw.toFixed(decimalsForStep(step)));
}
function getEffectiveStep(control, shortcut) {
  const min = control.min ?? 0;
  const max = control.max ?? 1;
  const range = max - min;
  const mode = shortcut.mode ?? "normal";
  return mode === "fine" ? range * 0.01 : mode === "coarse" ? range * 0.1 : control.step ?? 1;
}
function applySliderDelta(panelId, path, control, effectiveStep, direction) {
  const currentValue = DialStore.getValue(panelId, path);
  const min = control.min ?? 0;
  const max = control.max ?? 1;
  const newValue = Math.max(min, Math.min(max, currentValue + direction * effectiveStep));
  DialStore.updateValue(panelId, path, roundValue(newValue, effectiveStep));
}
function snapToDecile(rawValue, min, max) {
  const normalized = (rawValue - min) / (max - min);
  const nearest = Math.round(normalized * 10) / 10;
  if (Math.abs(normalized - nearest) <= 0.03125) {
    return min + nearest * (max - min);
  }
  return rawValue;
}
function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  if (el.contentEditable === "true") return true;
  return false;
}
function getActiveModifier(e2) {
  if (e2.altKey) return "alt";
  if (e2.shiftKey) return "shift";
  if (e2.metaKey) return "meta";
  return void 0;
}
function findControl(controls, path) {
  for (const control of controls) {
    if (control.path === path) return control;
    if (control.type === "folder" && control.children) {
      const found = findControl(control.children, path);
      if (found) return found;
    }
  }
  return null;
}
var DRAG_SENSITIVITY = 4;
function formatInteractionLabel(interaction) {
  switch (interaction) {
    case "drag":
      return "Drag";
    case "move":
      return "Move";
    case "scroll-only":
      return "Scroll";
    default:
      return "Scroll";
  }
}
function formatSliderShortcut(sc) {
  const interaction = sc.interaction ?? "scroll";
  const actionLabel = formatInteractionLabel(interaction);
  if (!sc.key) return actionLabel;
  const mod = formatModifier(sc.modifier);
  return `${mod}${sc.key.toUpperCase()}+${actionLabel}`;
}
function formatToggleShortcut(sc) {
  if (!sc.key) return "Press";
  const mod = formatModifier(sc.modifier);
  return `${mod}${sc.key.toUpperCase()}`;
}
function formatModifier(modifier) {
  return modifier === "alt" ? "\u2325" : modifier === "shift" ? "\u21E7" : modifier === "meta" ? "\u2318" : "";
}

// src/components/ShortcutListener.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var ShortcutContext = (0, import_react5.createContext)({ activePanelId: null, activePath: null });
function ShortcutListener({ children }) {
  const [activeShortcut, setActiveShortcut] = (0, import_react5.useState)({ activePanelId: null, activePath: null });
  const activeKeysRef = (0, import_react5.useRef)(/* @__PURE__ */ new Set());
  const isDraggingRef = (0, import_react5.useRef)(false);
  const lastMouseXRef = (0, import_react5.useRef)(null);
  const dragAccumulatorRef = (0, import_react5.useRef)(0);
  const resolveActiveTarget = (0, import_react5.useCallback)((interaction) => {
    for (const key of activeKeysRef.current) {
      const panels = DialStore.getPanels();
      for (const panel of panels) {
        for (const [path, shortcut] of Object.entries(panel.shortcuts)) {
          if (!shortcut.key) continue;
          if (shortcut.key.toLowerCase() !== key) continue;
          if ((shortcut.interaction ?? "scroll") !== interaction) continue;
          const control = findControl(panel.controls, path);
          if (control && control.type === "slider") {
            return { panelId: panel.id, path, control, shortcut };
          }
        }
      }
    }
    return null;
  }, []);
  (0, import_react5.useEffect)(() => {
    const handleKeyDown = (e2) => {
      if (isInputFocused()) return;
      const key = e2.key.toLowerCase();
      if (key === "arrowleft" || key === "arrowright" || key === "arrowup" || key === "arrowdown") {
        if (activeKeysRef.current.size > 0) {
          const target2 = resolveActiveTarget("scroll") || resolveActiveTarget("drag") || resolveActiveTarget("move");
          if (target2 && target2.control.type === "slider") {
            e2.preventDefault();
            const direction = key === "arrowright" || key === "arrowup" ? 1 : -1;
            const effectiveStep = getEffectiveStep(target2.control, target2.shortcut);
            applySliderDelta(target2.panelId, target2.path, target2.control, effectiveStep, direction);
            return;
          }
        }
      }
      const wasAlreadyHeld = activeKeysRef.current.has(key);
      activeKeysRef.current.add(key);
      const modifier = getActiveModifier(e2);
      const target = DialStore.resolveShortcutTarget(key, modifier);
      if (target) {
        setActiveShortcut({ activePanelId: target.panelId, activePath: target.path });
        if (!wasAlreadyHeld && target.control.type === "toggle") {
          const currentValue = DialStore.getValue(target.panelId, target.path);
          DialStore.updateValue(target.panelId, target.path, !currentValue);
        }
      }
      if (!wasAlreadyHeld) {
        lastMouseXRef.current = null;
        dragAccumulatorRef.current = 0;
      }
    };
    const handleKeyUp = (e2) => {
      const key = e2.key.toLowerCase();
      activeKeysRef.current.delete(key);
      isDraggingRef.current = false;
      lastMouseXRef.current = null;
      dragAccumulatorRef.current = 0;
      if (activeKeysRef.current.size === 0) {
        setActiveShortcut({ activePanelId: null, activePath: null });
      } else {
        let found = false;
        for (const remainingKey of activeKeysRef.current) {
          const modifier = getActiveModifier(e2);
          const target = DialStore.resolveShortcutTarget(remainingKey, modifier);
          if (target) {
            setActiveShortcut({ activePanelId: target.panelId, activePath: target.path });
            found = true;
            break;
          }
        }
        if (!found) {
          setActiveShortcut({ activePanelId: null, activePath: null });
        }
      }
    };
    const handleWheel = (e2) => {
      if (isInputFocused()) return;
      const modifier = getActiveModifier(e2);
      if (activeKeysRef.current.size > 0) {
        for (const key of activeKeysRef.current) {
          const target = DialStore.resolveShortcutTarget(key, modifier);
          if (!target) continue;
          const { panelId, path, control } = target;
          const interaction = control.shortcut?.interaction ?? "scroll";
          if (interaction !== "scroll" || control.type !== "slider") continue;
          e2.preventDefault();
          const effectiveStep = getEffectiveStep(control, control.shortcut);
          const direction = e2.deltaY > 0 ? -1 : 1;
          applySliderDelta(panelId, path, control, effectiveStep, direction);
          return;
        }
      }
      const scrollOnlyTargets = DialStore.resolveScrollOnlyTargets();
      for (const { panelId, path, control, shortcut } of scrollOnlyTargets) {
        if (control.type !== "slider") continue;
        e2.preventDefault();
        const effectiveStep = getEffectiveStep(control, shortcut);
        const direction = e2.deltaY > 0 ? -1 : 1;
        applySliderDelta(panelId, path, control, effectiveStep, direction);
        return;
      }
    };
    const handleMouseDown = (e2) => {
      if (isInputFocused()) return;
      if (activeKeysRef.current.size === 0) return;
      const target = resolveActiveTarget("drag");
      if (target) {
        isDraggingRef.current = true;
        lastMouseXRef.current = e2.clientX;
        dragAccumulatorRef.current = 0;
        e2.preventDefault();
      }
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      lastMouseXRef.current = null;
      dragAccumulatorRef.current = 0;
    };
    const handleMouseMove = (e2) => {
      if (isInputFocused()) return;
      if (activeKeysRef.current.size === 0) return;
      if (isDraggingRef.current) {
        const target = resolveActiveTarget("drag");
        if (target && lastMouseXRef.current !== null) {
          const deltaX = e2.clientX - lastMouseXRef.current;
          lastMouseXRef.current = e2.clientX;
          dragAccumulatorRef.current += deltaX;
          const effectiveStep = getEffectiveStep(target.control, target.shortcut);
          const steps = Math.trunc(dragAccumulatorRef.current / DRAG_SENSITIVITY);
          if (steps !== 0) {
            dragAccumulatorRef.current -= steps * DRAG_SENSITIVITY;
            applySliderDelta(target.panelId, target.path, target.control, effectiveStep, steps);
          }
        }
        return;
      }
      const moveTarget = resolveActiveTarget("move");
      if (moveTarget) {
        if (lastMouseXRef.current === null) {
          lastMouseXRef.current = e2.clientX;
          return;
        }
        const deltaX = e2.clientX - lastMouseXRef.current;
        lastMouseXRef.current = e2.clientX;
        dragAccumulatorRef.current += deltaX;
        const effectiveStep = getEffectiveStep(moveTarget.control, moveTarget.shortcut);
        const steps = Math.trunc(dragAccumulatorRef.current / DRAG_SENSITIVITY);
        if (steps !== 0) {
          dragAccumulatorRef.current -= steps * DRAG_SENSITIVITY;
          applySliderDelta(moveTarget.panelId, moveTarget.path, moveTarget.control, effectiveStep, steps);
        }
      }
    };
    const handleWindowBlur = () => {
      activeKeysRef.current.clear();
      isDraggingRef.current = false;
      lastMouseXRef.current = null;
      dragAccumulatorRef.current = 0;
      setActiveShortcut({ activePanelId: null, activePath: null });
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [resolveActiveTarget]);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ShortcutContext.Provider, { value: activeShortcut, children });
}

// src/components/Slider.tsx
var import_react6 = require("react");
var import_react7 = require("motion/react");
var import_jsx_runtime3 = require("react/jsx-runtime");
var CLICK_THRESHOLD = 3;
var DEAD_ZONE = 32;
var MAX_CURSOR_RANGE = 200;
var MAX_STRETCH = 8;
function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  unit,
  shortcut,
  shortcutActive
}) {
  if (typeof value !== "number" || !Number.isFinite(value)) value = min;
  const wrapperRef = (0, import_react6.useRef)(null);
  const trackRef = (0, import_react6.useRef)(null);
  const inputRef = (0, import_react6.useRef)(null);
  const labelRef = (0, import_react6.useRef)(null);
  const valueSpanRef = (0, import_react6.useRef)(null);
  const [isInteracting, setIsInteracting] = (0, import_react6.useState)(false);
  const [isDragging, setIsDragging] = (0, import_react6.useState)(false);
  const [isHovered, setIsHovered] = (0, import_react6.useState)(false);
  const [isValueHovered, setIsValueHovered] = (0, import_react6.useState)(false);
  const [isValueEditable, setIsValueEditable] = (0, import_react6.useState)(false);
  const [showInput, setShowInput] = (0, import_react6.useState)(false);
  const [inputValue, setInputValue] = (0, import_react6.useState)("");
  const hoverTimeoutRef = (0, import_react6.useRef)(null);
  const pointerDownPos = (0, import_react6.useRef)(null);
  const isClickRef = (0, import_react6.useRef)(true);
  const animRef = (0, import_react6.useRef)(null);
  const wrapperRectRef = (0, import_react6.useRef)(null);
  const scaleRef = (0, import_react6.useRef)(1);
  const percentage = (value - min) / (max - min) * 100;
  const isActive = isInteracting || isHovered;
  const fillPercent = (0, import_react7.useMotionValue)(percentage);
  const fillWidth = (0, import_react7.useTransform)(fillPercent, (pct) => `${pct}%`);
  const handleLeft = (0, import_react7.useTransform)(
    fillPercent,
    (pct) => `max(5px, calc(${pct}% - 9px))`
  );
  const rubberStretchPx = (0, import_react7.useMotionValue)(0);
  const rubberBandWidth = (0, import_react7.useTransform)(
    rubberStretchPx,
    (stretch) => `calc(100% + ${Math.abs(stretch)}px)`
  );
  const rubberBandX = (0, import_react7.useTransform)(
    rubberStretchPx,
    (stretch) => stretch < 0 ? stretch : 0
  );
  (0, import_react6.useEffect)(() => {
    if (!isInteracting && !animRef.current) {
      fillPercent.jump(percentage);
    }
  }, [percentage, isInteracting, fillPercent]);
  const positionToValue = (0, import_react6.useCallback)(
    (clientX) => {
      const rect = wrapperRectRef.current;
      if (!rect) return value;
      const screenX = clientX - rect.left;
      const sceneX = screenX / scaleRef.current;
      const nativeWidth = wrapperRef.current ? wrapperRef.current.offsetWidth : rect.width;
      const percent = Math.max(0, Math.min(1, sceneX / nativeWidth));
      const rawValue = min + percent * (max - min);
      return Math.max(min, Math.min(max, rawValue));
    },
    [min, max, value]
  );
  const percentFromValue = (0, import_react6.useCallback)(
    (v2) => (v2 - min) / (max - min) * 100,
    [min, max]
  );
  const computeRubberStretch = (0, import_react6.useCallback)(
    (clientX, sign) => {
      const rect = wrapperRectRef.current;
      if (!rect) return 0;
      const distancePast = sign < 0 ? rect.left - clientX : clientX - rect.right;
      const overflow = Math.max(0, distancePast - DEAD_ZONE);
      return sign * MAX_STRETCH * Math.sqrt(Math.min(overflow / MAX_CURSOR_RANGE, 1));
    },
    []
  );
  const handlePointerDown = (0, import_react6.useCallback)(
    (e2) => {
      if (showInput) return;
      e2.preventDefault();
      e2.target.setPointerCapture(e2.pointerId);
      pointerDownPos.current = { x: e2.clientX, y: e2.clientY };
      isClickRef.current = true;
      setIsInteracting(true);
      if (wrapperRef.current) {
        wrapperRectRef.current = wrapperRef.current.getBoundingClientRect();
        const nativeWidth = wrapperRef.current.offsetWidth;
        scaleRef.current = wrapperRectRef.current.width / nativeWidth;
      }
    },
    [showInput]
  );
  const handlePointerMove = (0, import_react6.useCallback)(
    (e2) => {
      if (!isInteracting || !pointerDownPos.current) return;
      const dx = e2.clientX - pointerDownPos.current.x;
      const dy = e2.clientY - pointerDownPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (isClickRef.current && distance > CLICK_THRESHOLD) {
        isClickRef.current = false;
        setIsDragging(true);
      }
      if (!isClickRef.current) {
        const rect = wrapperRectRef.current;
        if (rect) {
          if (e2.clientX < rect.left) {
            rubberStretchPx.jump(computeRubberStretch(e2.clientX, -1));
          } else if (e2.clientX > rect.right) {
            rubberStretchPx.jump(computeRubberStretch(e2.clientX, 1));
          } else {
            rubberStretchPx.jump(0);
          }
        }
        const newValue = positionToValue(e2.clientX);
        const newPct = percentFromValue(newValue);
        if (animRef.current) {
          animRef.current.stop();
          animRef.current = null;
        }
        fillPercent.jump(newPct);
        onChange(roundValue(newValue, step));
      }
    },
    [
      isInteracting,
      positionToValue,
      percentFromValue,
      onChange,
      fillPercent,
      rubberStretchPx,
      computeRubberStretch
    ]
  );
  const handlePointerUp = (0, import_react6.useCallback)(
    (e2) => {
      if (!isInteracting) return;
      if (isClickRef.current) {
        const rawValue = positionToValue(e2.clientX);
        const discreteSteps2 = (max - min) / step;
        const snappedValue = discreteSteps2 <= 10 ? Math.max(min, Math.min(max, min + Math.round((rawValue - min) / step) * step)) : snapToDecile(rawValue, min, max);
        const newPct = percentFromValue(snappedValue);
        if (animRef.current) {
          animRef.current.stop();
        }
        animRef.current = (0, import_react7.animate)(fillPercent, newPct, {
          type: "spring",
          stiffness: 300,
          damping: 25,
          mass: 0.8,
          onComplete: () => {
            animRef.current = null;
          }
        });
        onChange(roundValue(snappedValue, step));
      }
      if (rubberStretchPx.get() !== 0) {
        (0, import_react7.animate)(rubberStretchPx, 0, {
          type: "spring",
          visualDuration: 0.35,
          bounce: 0.15
        });
      }
      setIsInteracting(false);
      setIsDragging(false);
      pointerDownPos.current = null;
    },
    [
      isInteracting,
      positionToValue,
      percentFromValue,
      onChange,
      min,
      max,
      fillPercent,
      rubberStretchPx
    ]
  );
  (0, import_react6.useEffect)(() => {
    if (isValueHovered && !showInput && !isValueEditable) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsValueEditable(true);
      }, 800);
    } else if (!isValueHovered && !showInput) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setIsValueEditable(false);
    }
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [isValueHovered, showInput, isValueEditable]);
  (0, import_react6.useEffect)(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [showInput]);
  const handleInputChange = (e2) => {
    setInputValue(e2.target.value);
  };
  const handleInputSubmit = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(roundValue(clamped, step));
    }
    setShowInput(false);
    setIsValueHovered(false);
    setIsValueEditable(false);
  };
  const handleValueClick = (e2) => {
    if (isValueEditable) {
      e2.stopPropagation();
      e2.preventDefault();
      setShowInput(true);
      setInputValue(value.toFixed(decimalsForStep(step)));
    }
  };
  const handleInputKeyDown = (e2) => {
    if (e2.key === "Enter") {
      handleInputSubmit();
    } else if (e2.key === "Escape") {
      setShowInput(false);
      setIsValueHovered(false);
    }
  };
  const handleInputBlur = () => {
    handleInputSubmit();
  };
  const displayValue = value.toFixed(decimalsForStep(step));
  const HANDLE_BUFFER = 8;
  const LABEL_CSS_LEFT = 10;
  const VALUE_CSS_RIGHT = 10;
  let leftThreshold = 30;
  let rightThreshold = 78;
  const trackWidth = wrapperRef.current?.offsetWidth;
  if (trackWidth && trackWidth > 0) {
    if (labelRef.current) {
      leftThreshold = (LABEL_CSS_LEFT + labelRef.current.offsetWidth + HANDLE_BUFFER) / trackWidth * 100;
    }
    if (valueSpanRef.current) {
      rightThreshold = (trackWidth - VALUE_CSS_RIGHT - valueSpanRef.current.offsetWidth - HANDLE_BUFFER) / trackWidth * 100;
    }
  }
  const valueDodge = percentage < leftThreshold || percentage > rightThreshold;
  const handleOpacity = !isActive ? 0 : valueDodge ? 0.1 : isDragging ? 0.9 : 0.5;
  const discreteSteps = (max - min) / step;
  const hashMarks = discreteSteps <= 10 ? Array.from({ length: discreteSteps - 1 }, (_2, i2) => {
    const pct = (i2 + 1) * step / (max - min) * 100;
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "div",
      {
        className: "dialkit-slider-hashmark",
        style: { left: `${pct}%` }
      },
      i2
    );
  }) : Array.from({ length: 9 }, (_2, i2) => {
    const pct = (i2 + 1) * 10;
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "div",
      {
        className: "dialkit-slider-hashmark",
        style: { left: `${pct}%` }
      },
      i2
    );
  });
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { ref: wrapperRef, className: "dialkit-slider-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    import_react7.motion.div,
    {
      ref: trackRef,
      className: `dialkit-slider ${isActive ? "dialkit-slider-active" : ""}`,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
      style: { width: rubberBandWidth, x: rubberBandX },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dialkit-slider-hashmarks", children: hashMarks }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          import_react7.motion.div,
          {
            className: "dialkit-slider-fill",
            style: {
              width: fillWidth
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          import_react7.motion.div,
          {
            className: "dialkit-slider-handle",
            style: {
              left: handleLeft,
              y: "-50%"
            },
            animate: {
              opacity: handleOpacity,
              scaleX: isActive ? 1 : 0.25,
              scaleY: isActive && valueDodge ? 0.75 : 1
            },
            transition: {
              scaleX: { type: "spring", visualDuration: 0.25, bounce: 0.15 },
              scaleY: { type: "spring", visualDuration: 0.2, bounce: 0.1 },
              opacity: { duration: 0.15 }
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { ref: labelRef, className: "dialkit-slider-label", children: [
          label,
          shortcut && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: `dialkit-shortcut-pill${shortcutActive ? " dialkit-shortcut-pill-active" : ""}`, children: formatSliderShortcut(shortcut) })
        ] }),
        showInput ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "input",
          {
            ref: inputRef,
            type: "text",
            className: "dialkit-slider-input",
            value: inputValue,
            onChange: handleInputChange,
            onKeyDown: handleInputKeyDown,
            onBlur: handleInputBlur,
            onPointerDown: (e2) => e2.stopPropagation(),
            onClick: (e2) => e2.stopPropagation(),
            onMouseDown: (e2) => e2.stopPropagation()
          }
        ) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "span",
          {
            ref: valueSpanRef,
            className: `dialkit-slider-value ${isValueEditable ? "dialkit-slider-value-editable" : ""}`,
            onMouseEnter: () => setIsValueHovered(true),
            onMouseLeave: () => setIsValueHovered(false),
            onClick: handleValueClick,
            onPointerDown: (e2) => isValueEditable && e2.stopPropagation(),
            onMouseDown: (e2) => isValueEditable && e2.stopPropagation(),
            style: { cursor: isValueEditable ? "text" : "default" },
            children: displayValue
          }
        )
      ]
    }
  ) });
}

// src/components/SegmentedControl.tsx
var import_react8 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
function SegmentedControl({
  options,
  value,
  onChange
}) {
  const containerRef = (0, import_react8.useRef)(null);
  const hasAnimated = (0, import_react8.useRef)(false);
  const [pillStyle, setPillStyle] = (0, import_react8.useState)(null);
  const measure = (0, import_react8.useCallback)(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeButton = container.querySelector('[data-active="true"]');
    if (!activeButton) return;
    setPillStyle({
      left: activeButton.offsetLeft,
      width: activeButton.offsetWidth
    });
  }, []);
  (0, import_react8.useLayoutEffect)(() => {
    measure();
  }, [value, options.length, measure]);
  const shouldAnimate = hasAnimated.current;
  hasAnimated.current = true;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dialkit-segmented", ref: containerRef, children: [
    pillStyle && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      "div",
      {
        className: "dialkit-segmented-pill",
        style: {
          left: pillStyle.left,
          width: pillStyle.width,
          transition: shouldAnimate ? "left 0.2s cubic-bezier(0.25, 1, 0.5, 1), width 0.2s cubic-bezier(0.25, 1, 0.5, 1)" : "none"
        }
      }
    ),
    options.map((option) => {
      const isActive = value === option.value;
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "button",
        {
          onClick: () => onChange(option.value),
          className: "dialkit-segmented-button",
          "data-active": String(isActive),
          children: option.label
        },
        option.value
      );
    })
  ] });
}

// src/components/Toggle.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
function Toggle({ label, checked, onChange, shortcut, shortcutActive }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dialkit-labeled-control", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dialkit-labeled-control-label", children: [
      label,
      shortcut && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: `dialkit-shortcut-pill${shortcutActive ? " dialkit-shortcut-pill-active" : ""}`, children: formatToggleShortcut(shortcut) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      SegmentedControl,
      {
        options: [
          { value: "off", label: "Off" },
          { value: "on", label: "On" }
        ],
        value: checked ? "on" : "off",
        onChange: (val) => onChange(val === "on")
      }
    )
  ] });
}

// src/transition-math.ts
function round2(value) {
  return Math.round(value * 100) / 100;
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function isTransitionConfig(value) {
  return isSpringConfigValue(value) || isEasingConfigValue(value);
}
function isPhysicsSpring(transition) {
  return transition.type === "spring" && (transition.stiffness !== void 0 || transition.damping !== void 0 || transition.mass !== void 0);
}
function springParams(spring) {
  if (isPhysicsSpring(spring)) {
    return { stiffness: spring.stiffness ?? 200, damping: spring.damping ?? 25, mass: spring.mass ?? 1 };
  }
  const visualDuration = Math.max(0.05, spring.visualDuration ?? 0.3);
  const bounce = spring.bounce ?? 0.3;
  const root = 2 * Math.PI / (visualDuration * 1.2);
  const stiffness = root * root;
  const damping = 2 * Math.min(1, Math.max(0.05, 1 - bounce)) * Math.sqrt(stiffness);
  return { stiffness, damping, mass: 1 };
}
function springProgress(t2, { stiffness, damping, mass }) {
  if (t2 <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 0.9999) {
    const wd2 = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t2) * (Math.cos(wd2 * t2) + zeta * w0 / wd2 * Math.sin(wd2 * t2));
  }
  if (zeta < 1.0001) {
    return 1 - Math.exp(-w0 * t2) * (1 + w0 * t2);
  }
  const wd = w0 * Math.sqrt(zeta * zeta - 1);
  const r1 = -zeta * w0 + wd;
  const r2 = -zeta * w0 - wd;
  return 1 + (r2 * Math.exp(r1 * t2) - r1 * Math.exp(r2 * t2)) / (r1 - r2);
}
function springSettleDuration(params) {
  const w0 = Math.sqrt(params.stiffness / params.mass);
  const zeta = params.damping / (2 * Math.sqrt(params.stiffness * params.mass));
  const decay = zeta >= 1 ? zeta * w0 - w0 * Math.sqrt(Math.max(0, zeta * zeta - 1)) : zeta * w0;
  const duration = Math.log(200) / Math.max(decay, 1e-6);
  return round2(clamp(duration, 0.05, 10));
}
function cubicBezierProgress(p2, [x1, y1, x2, y2]) {
  if (p2 <= 0) return 0;
  if (p2 >= 1) return 1;
  const sampleX = (t3) => bezierAxis(t3, x1, x2);
  const sampleY = (t3) => bezierAxis(t3, y1, y2);
  let t2 = p2;
  for (let i2 = 0; i2 < 8; i2++) {
    const x = sampleX(t2) - p2;
    if (Math.abs(x) < 1e-5) return sampleY(t2);
    const dx = bezierAxisDerivative(t2, x1, x2);
    if (Math.abs(dx) < 1e-6) break;
    t2 -= x / dx;
  }
  let lo = 0;
  let hi = 1;
  t2 = p2;
  while (hi - lo > 1e-5) {
    if (sampleX(t2) < p2) lo = t2;
    else hi = t2;
    t2 = (lo + hi) / 2;
  }
  return sampleY(t2);
}
function bezierAxis(t2, a1, a2) {
  return (1 - 3 * a2 + 3 * a1) * t2 * t2 * t2 + (3 * a2 - 6 * a1) * t2 * t2 + 3 * a1 * t2;
}
function bezierAxisDerivative(t2, a1, a2) {
  return 3 * (1 - 3 * a2 + 3 * a1) * t2 * t2 + 2 * (3 * a2 - 6 * a1) * t2 + 3 * a1;
}
function resolveClipTransition(raw, clipDuration) {
  const safeDuration = Math.max(0.05, clipDuration);
  if (raw.type === "easing") {
    return {
      transition: { ...raw, duration: safeDuration },
      duration: safeDuration,
      isPhysics: false
    };
  }
  if (isPhysicsSpring(raw)) {
    return {
      transition: raw,
      // An explicit stored duration wins — a host may deliberately reserve
      // a bar LONGER than the spring's motion (e.g. covering a staggered
      // wave's spread plus each particle's settle, so the bar's end means
      // "everything at rest"). The spring's own settle time is only the
      // default when no real duration was stored.
      duration: clipDuration > 0 ? safeDuration : springSettleDuration(springParams(raw)),
      isPhysics: true
    };
  }
  return {
    transition: { type: "spring", bounce: raw.bounce ?? 0.2, visualDuration: safeDuration },
    duration: safeDuration,
    isPhysics: false
  };
}

// src/components/SpringVisualization.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
function SpringVisualization({ spring, isSimpleMode }) {
  const width = 256;
  const height = 140;
  const params = isSimpleMode ? springParams({ type: "spring", visualDuration: spring.visualDuration ?? 0.3, bounce: spring.bounce ?? 0.2 }) : springParams({ type: "spring", stiffness: spring.stiffness ?? 400, damping: spring.damping ?? 17, mass: spring.mass ?? 1 });
  const duration = 2;
  const steps = 100;
  const points = [];
  for (let i2 = 0; i2 <= steps; i2++) {
    const time = i2 / steps * duration;
    points.push([time, springProgress(time, params)]);
  }
  const values = points.map(([, value]) => value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue;
  const pathData = points.map(([time, value], i2) => {
    const x = time / duration * width;
    const normalizedValue = (value - minValue) / (valueRange || 1);
    const y2 = height - (normalizedValue * height * 0.6 + height * 0.2);
    return `${i2 === 0 ? "M" : "L"} ${x} ${y2}`;
  }).join(" ");
  const gridLines = [];
  for (let i2 = 1; i2 < 4; i2++) {
    const x = width / 4 * i2;
    const y2 = height / 4 * i2;
    gridLines.push(
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("line", { x1: x, y1: 0, x2: x, y2: height, stroke: "rgba(255, 255, 255, 0.08)", strokeWidth: "1" }, `v-${i2}`),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("line", { x1: 0, y1: y2, x2: width, y2, stroke: "rgba(255, 255, 255, 0.08)", strokeWidth: "1" }, `h-${i2}`)
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("svg", { viewBox: `0 0 ${width} ${height}`, className: "dialkit-spring-viz", children: [
    gridLines,
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      "line",
      {
        x1: 0,
        y1: height / 2,
        x2: width,
        y2: height / 2,
        stroke: "rgba(255, 255, 255, 0.15)",
        strokeWidth: "1",
        strokeDasharray: "4,4"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      "path",
      {
        d: pathData,
        fill: "none",
        stroke: "rgba(255, 255, 255, 0.6)",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }
    )
  ] });
}

// src/components/SpringControl.tsx
var import_react9 = require("react");
var import_jsx_runtime7 = require("react/jsx-runtime");
function SpringControl({ panelId, path, label, spring, onChange }) {
  const subscribe = (0, import_react9.useCallback)(
    (callback) => DialStore.subscribe(panelId, callback),
    [panelId]
  );
  const getSnapshot = (0, import_react9.useCallback)(
    () => DialStore.getSpringMode(panelId, path),
    [panelId, path]
  );
  const mode = (0, import_react9.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  const isSimpleMode = mode === "simple";
  const cache = (0, import_react9.useRef)({
    simple: spring.visualDuration !== void 0 ? spring : { type: "spring", visualDuration: 0.3, bounce: 0.2 },
    advanced: spring.stiffness !== void 0 ? spring : { type: "spring", stiffness: 200, damping: 25, mass: 1 }
  });
  if (isSimpleMode) {
    cache.current.simple = spring;
  } else {
    cache.current.advanced = spring;
  }
  const handleModeChange = (newMode) => {
    DialStore.updateSpringMode(panelId, path, newMode);
    if (newMode === "simple") {
      onChange(cache.current.simple);
    } else {
      onChange(cache.current.advanced);
    }
  };
  const handleUpdate = (key, value) => {
    if (isSimpleMode) {
      const { stiffness, damping, mass, ...rest } = spring;
      onChange({ ...rest, [key]: value });
    } else {
      const { visualDuration, bounce, ...rest } = spring;
      onChange({ ...rest, [key]: value });
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Folder, { title: label, defaultOpen: true, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(SpringVisualization, { spring, isSimpleMode }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dialkit-labeled-control", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dialkit-labeled-control-label", children: "Type" }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        SegmentedControl,
        {
          options: [
            { value: "simple", label: "Time" },
            { value: "advanced", label: "Physics" }
          ],
          value: mode,
          onChange: handleModeChange
        }
      )
    ] }),
    isSimpleMode ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        Slider,
        {
          label: "Duration",
          value: spring.visualDuration ?? 0.3,
          onChange: (v2) => handleUpdate("visualDuration", v2),
          min: 0.1,
          max: 1,
          step: 0.05,
          unit: "s"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        Slider,
        {
          label: "Bounce",
          value: spring.bounce ?? 0.2,
          onChange: (v2) => handleUpdate("bounce", v2),
          min: 0,
          max: 1,
          step: 0.05
        }
      )
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        Slider,
        {
          label: "Stiffness",
          value: spring.stiffness ?? 400,
          onChange: (v2) => handleUpdate("stiffness", v2),
          min: 1,
          max: 1e3,
          step: 10
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        Slider,
        {
          label: "Damping",
          value: spring.damping ?? 17,
          onChange: (v2) => handleUpdate("damping", v2),
          min: 1,
          max: 100,
          step: 1
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        Slider,
        {
          label: "Mass",
          value: spring.mass ?? 1,
          onChange: (v2) => handleUpdate("mass", v2),
          min: 0.1,
          max: 10,
          step: 0.1
        }
      )
    ] })
  ] }) });
}

// src/components/EasingVisualization.tsx
var import_jsx_runtime8 = require("react/jsx-runtime");
function EasingVisualization({ easing }) {
  const ease = easing.ease;
  const s2 = 200;
  const pad = 10;
  const inner = s2 - pad * 2;
  const unit = inner / 2;
  const toSvg = (nx, ny) => ({
    x: pad + (nx + 0.5) * unit,
    y: pad + (1.5 - ny) * unit
  });
  const start = toSvg(0, 0);
  const end = toSvg(1, 1);
  const p1 = toSvg(ease[0], ease[1]);
  const p2 = toSvg(ease[2], ease[3]);
  const curvePath = `M ${start.x} ${start.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${end.x} ${end.y}`;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
    "svg",
    {
      viewBox: `0 0 ${s2} ${s2}`,
      preserveAspectRatio: "xMidYMid slice",
      className: "dialkit-spring-viz dialkit-easing-viz",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          "line",
          {
            x1: start.x,
            y1: start.y,
            x2: end.x,
            y2: end.y,
            stroke: "rgba(255, 255, 255, 0.15)",
            strokeWidth: "1",
            strokeDasharray: "4,4"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("path", { d: curvePath, fill: "none", stroke: "rgba(255, 255, 255, 0.6)", strokeWidth: "2", strokeLinecap: "round" })
      ]
    }
  );
}

// src/components/TransitionControl.tsx
var import_react10 = require("react");
var import_jsx_runtime9 = require("react/jsx-runtime");
function TransitionControl({
  panelId,
  path,
  label,
  value,
  onChange,
  hideDuration = false,
  durationControl,
  physicsSettleCap
}) {
  const subscribe = (0, import_react10.useCallback)(
    (callback) => DialStore.subscribe(panelId, callback),
    [panelId]
  );
  const getSnapshot = (0, import_react10.useCallback)(
    () => DialStore.getTransitionMode(panelId, path),
    [panelId, path]
  );
  const mode = (0, import_react10.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  const isEasing = mode === "easing";
  const isSimpleSpring = mode === "simple";
  const cache = (0, import_react10.useRef)({
    easing: value.type === "easing" ? value : { type: "easing", duration: 0.3, ease: [1, -0.4, 0.5, 1] },
    simple: value.type === "spring" && value.visualDuration !== void 0 ? value : { type: "spring", visualDuration: 0.3, bounce: 0.2 },
    advanced: value.type === "spring" && value.stiffness !== void 0 ? value : { type: "spring", stiffness: 200, damping: 25, mass: 1 }
  });
  if (isEasing && value.type === "easing") {
    cache.current.easing = value;
  } else if (isSimpleSpring && value.type === "spring") {
    cache.current.simple = value;
  } else if (mode === "advanced" && value.type === "spring") {
    cache.current.advanced = value;
  }
  const spring = value.type === "spring" ? value : cache.current.simple;
  const easing = value.type === "easing" ? value : cache.current.easing;
  const handleModeChange = (newMode) => {
    DialStore.updateTransitionMode(panelId, path, newMode);
    if (newMode === "easing") {
      onChange(cache.current.easing);
    } else if (newMode === "simple") {
      onChange(cache.current.simple);
    } else {
      onChange(cache.current.advanced);
    }
  };
  const handleSpringUpdate = (key, val) => {
    if (isSimpleSpring) {
      const { stiffness, damping, mass, ...rest } = spring;
      onChange({ ...rest, [key]: val });
    } else {
      const { visualDuration, bounce, ...rest } = spring;
      let next = val;
      if (physicsSettleCap !== void 0 && (key === "stiffness" || key === "damping" || key === "mass")) {
        next = clampPhysicsParam(rest, key, val, physicsSettleCap);
      }
      onChange({ ...rest, [key]: next });
    }
  };
  const updateEase = (index, val) => {
    const newEase = [...easing.ease];
    newEase[index] = val;
    onChange({ ...easing, ease: newEase });
  };
  const durationSlider = !hideDuration && (isEasing || isSimpleSpring) ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
    Slider,
    {
      label: "Duration",
      value: durationControl?.value ?? (isEasing ? easing.duration : spring.visualDuration ?? 0.3),
      onChange: durationControl?.onChange ?? ((next) => {
        if (isEasing) onChange({ ...easing, duration: next });
        else handleSpringUpdate("visualDuration", next);
      }),
      min: durationControl?.min ?? 0.1,
      max: durationControl?.max ?? 5,
      step: durationControl?.step ?? 0.05,
      unit: "s"
    }
  ) : null;
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Folder, { title: label, defaultOpen: true, children: /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
    isEasing ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(EasingVisualization, { easing }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(SpringVisualization, { spring, isSimpleMode: isSimpleSpring }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dialkit-labeled-control", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dialkit-labeled-control-label", children: "Type" }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
        SegmentedControl,
        {
          options: [
            { value: "easing", label: "Easing" },
            { value: "simple", label: "Time" },
            { value: "advanced", label: "Physics" }
          ],
          value: mode,
          onChange: handleModeChange
        }
      )
    ] }),
    isEasing ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Slider, { label: "x1", value: easing.ease[0], onChange: (v2) => updateEase(0, v2), min: 0, max: 1, step: 0.01 }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Slider, { label: "y1", value: easing.ease[1], onChange: (v2) => updateEase(1, v2), min: -1, max: 2, step: 0.01 }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Slider, { label: "x2", value: easing.ease[2], onChange: (v2) => updateEase(2, v2), min: 0, max: 1, step: 0.01 }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Slider, { label: "y2", value: easing.ease[3], onChange: (v2) => updateEase(3, v2), min: -1, max: 2, step: 0.01 }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(EaseTextInput, { ease: easing.ease, onChange: (newEase) => onChange({ ...easing, ease: newEase }) })
    ] }) : isSimpleSpring ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Slider, { label: "Bounce", value: spring.bounce ?? 0.2, onChange: (v2) => handleSpringUpdate("bounce", v2), min: 0, max: 1, step: 0.05 }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Slider, { label: "Stiffness", value: spring.stiffness ?? 400, onChange: (v2) => handleSpringUpdate("stiffness", v2), min: 1, max: 1e3, step: 10 }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Slider, { label: "Damping", value: spring.damping ?? 17, onChange: (v2) => handleSpringUpdate("damping", v2), min: 1, max: 100, step: 1 }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Slider, { label: "Mass", value: spring.mass ?? 1, onChange: (v2) => handleSpringUpdate("mass", v2), min: 0.1, max: 10, step: 0.1 })
    ] }),
    durationSlider
  ] }) });
}
function clampPhysicsParam(current, key, requested, cap) {
  const settleWith = (v2) => springSettleDuration(springParams({ ...current, [key]: v2 }));
  if (settleWith(requested) <= cap) return requested;
  const oldValue = springParams(current)[key];
  if (settleWith(requested) < settleWith(oldValue)) return requested;
  if (settleWith(oldValue) > cap) return oldValue;
  let good = oldValue;
  let bad = requested;
  for (let i2 = 0; i2 < 24; i2++) {
    const mid = (good + bad) / 2;
    if (settleWith(mid) <= cap) good = mid;
    else bad = mid;
  }
  return good;
}
function formatEase(ease) {
  return ease.map((v2) => parseFloat(v2.toFixed(2))).join(", ");
}
function parseEase(str) {
  const parts = str.split(",").map((s2) => parseFloat(s2.trim()));
  if (parts.length === 4 && parts.every((n2) => !isNaN(n2))) {
    return parts;
  }
  return null;
}
function EaseTextInput({ ease, onChange }) {
  const [editing, setEditing] = (0, import_react10.useState)(false);
  const [draft, setDraft] = (0, import_react10.useState)("");
  const handleFocus = () => {
    setDraft(formatEase(ease));
    setEditing(true);
  };
  const handleBlur = () => {
    const parsed = parseEase(draft);
    if (parsed) onChange(parsed);
    setEditing(false);
  };
  const handleKeyDown = (e2) => {
    if (e2.key === "Enter") {
      e2.target.blur();
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dialkit-labeled-control", children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dialkit-labeled-control-label", children: "Ease" }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      "input",
      {
        type: "text",
        className: "dialkit-text-input",
        value: editing ? draft : formatEase(ease),
        onChange: (e2) => setDraft(e2.target.value),
        onFocus: handleFocus,
        onBlur: handleBlur,
        onKeyDown: handleKeyDown,
        spellCheck: false
      }
    )
  ] });
}

// src/components/TextControl.tsx
var import_jsx_runtime10 = require("react/jsx-runtime");
function TextControl({ label, value, onChange, placeholder }) {
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "dialkit-text-control", children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("label", { className: "dialkit-text-label", children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
      "input",
      {
        type: "text",
        className: "dialkit-text-input",
        value,
        onChange: (e2) => onChange(e2.target.value),
        placeholder
      }
    )
  ] });
}

// src/components/SelectControl.tsx
var import_react11 = require("react");
var import_react_dom = require("react-dom");
var import_react12 = require("motion/react");

// src/dropdown-position.ts
function getDropdownPosition(trigger, portalRoot, options = {}) {
  const { dropdownHeight = 0, gap = 4, allowAbove = true } = options;
  const triggerRect = trigger.getBoundingClientRect();
  const rootRect = portalRoot.getBoundingClientRect();
  const spaceBelow = window.innerHeight - triggerRect.bottom - gap;
  const above = allowAbove && spaceBelow < dropdownHeight && triggerRect.top > spaceBelow;
  return {
    top: above ? triggerRect.top - rootRect.top - dropdownHeight - gap : triggerRect.bottom - rootRect.top + gap,
    left: triggerRect.left - rootRect.left,
    width: triggerRect.width,
    above
  };
}
function getDialKitPortalRoot(trigger) {
  return trigger?.closest(".dialkit-root") ?? null;
}

// src/components/SelectControl.tsx
var import_jsx_runtime11 = require("react/jsx-runtime");
function toTitleCase(s2) {
  return s2.replace(/\b\w/g, (c2) => c2.toUpperCase());
}
function normalizeOptions(options) {
  return options.map(
    (opt) => typeof opt === "string" ? { value: opt, label: toTitleCase(opt) } : opt
  );
}
function SelectControl({ label, value, options, onChange }) {
  const [isOpen, setIsOpen] = (0, import_react11.useState)(false);
  const triggerRef = (0, import_react11.useRef)(null);
  const dropdownRef = (0, import_react11.useRef)(null);
  const [portalTarget, setPortalTarget] = (0, import_react11.useState)(null);
  const [pos, setPos] = (0, import_react11.useState)(null);
  const normalized = normalizeOptions(options);
  const selectedOption = normalized.find((o2) => o2.value === value);
  const updatePos = (0, import_react11.useCallback)(() => {
    const el = triggerRef.current;
    if (!el || !portalTarget) return;
    const dropdownHeight = 8 + normalized.length * 36;
    setPos(getDropdownPosition(el, portalTarget, { dropdownHeight }));
  }, [normalized.length, portalTarget]);
  (0, import_react11.useEffect)(() => {
    setPortalTarget(getDialKitPortalRoot(triggerRef.current) ?? document.body);
  }, []);
  (0, import_react11.useEffect)(() => {
    if (!isOpen) return;
    updatePos();
  }, [isOpen, updatePos]);
  (0, import_react11.useEffect)(() => {
    if (!isOpen) return;
    const handleClick = (e2) => {
      const target = e2.target;
      if (triggerRef.current && !triggerRef.current.contains(target) && dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "dialkit-select-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
      "button",
      {
        ref: triggerRef,
        className: "dialkit-select-trigger",
        onClick: () => setIsOpen(!isOpen),
        "data-open": String(isOpen),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "dialkit-select-label", children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "dialkit-select-right", children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "dialkit-select-value", children: selectedOption?.label ?? value }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
              import_react12.motion.svg,
              {
                className: "dialkit-select-chevron",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2.5",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                animate: { rotate: isOpen ? 180 : 0 },
                transition: { type: "spring", visualDuration: 0.2, bounce: 0.15 },
                children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("path", { d: ICON_CHEVRON })
              }
            )
          ] })
        ]
      }
    ),
    portalTarget && (0, import_react_dom.createPortal)(
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react12.AnimatePresence, { children: isOpen && pos && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        import_react12.motion.div,
        {
          ref: dropdownRef,
          className: "dialkit-select-dropdown",
          initial: { opacity: 0, y: pos.above ? 8 : -8, scale: 0.95 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: pos.above ? 8 : -8, scale: 0.95 },
          transition: { type: "spring", visualDuration: 0.15, bounce: 0 },
          style: {
            position: "absolute",
            left: pos.left,
            top: pos.top,
            width: pos.width,
            transformOrigin: pos.above ? "bottom" : "top"
          },
          children: normalized.map((option) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
            "button",
            {
              className: "dialkit-select-option",
              "data-selected": String(option.value === value),
              onClick: () => {
                onChange(option.value);
                setIsOpen(false);
              },
              children: option.label
            },
            option.value
          ))
        }
      ) }),
      portalTarget
    )
  ] });
}

// src/components/ColorControl.tsx
var import_react14 = require("react");
var import_react_dom2 = require("react-dom");
var import_react15 = require("motion/react");

// node_modules/react-colorful/dist/index.mjs
var import_react13 = __toESM(require("react"), 1);
function l() {
  return (l = Object.assign || function(e2) {
    for (var r2 = 1; r2 < arguments.length; r2++) {
      var n2 = arguments[r2];
      for (var t2 in n2) Object.prototype.hasOwnProperty.call(n2, t2) && (e2[t2] = n2[t2]);
    }
    return e2;
  }).apply(this, arguments);
}
function c(e2, r2) {
  if (null == e2) return {};
  var n2, t2, o2 = {}, a2 = Object.keys(e2);
  for (t2 = 0; t2 < a2.length; t2++) r2.indexOf(n2 = a2[t2]) >= 0 || (o2[n2] = e2[n2]);
  return o2;
}
function i(e2) {
  var n2 = (0, import_react13.useRef)(e2), t2 = (0, import_react13.useRef)(function(e3) {
    n2.current && n2.current(e3);
  });
  return n2.current = e2, t2.current;
}
var s = function(e2, r2, n2) {
  return void 0 === r2 && (r2 = 0), void 0 === n2 && (n2 = 1), e2 > n2 ? n2 : e2 < r2 ? r2 : e2;
};
var f = function(e2) {
  return "touches" in e2;
};
var d = function(e2) {
  return e2 && e2.ownerDocument.defaultView || self;
};
var v = function(e2, r2, n2) {
  var t2 = e2.getBoundingClientRect(), o2 = f(r2) ? (function(e3, r3) {
    for (var n3 = 0; n3 < e3.length; n3++) if (e3[n3].identifier === r3) return e3[n3];
    return e3[0];
  })(r2.touches, n2) : r2;
  return { left: s((o2.pageX - (t2.left + d(e2).pageXOffset)) / t2.width), top: s((o2.pageY - (t2.top + d(e2).pageYOffset)) / t2.height) };
};
var h = function(e2) {
  !f(e2) && e2.preventDefault();
};
var g = import_react13.default.memo(function(o2) {
  var a2 = o2.onMove, u2 = o2.onKey, s2 = o2.onEnd, g2 = c(o2, ["onMove", "onKey", "onEnd"]), m2 = (0, import_react13.useRef)(null), p2 = i(a2), b2 = i(u2), _2 = i(s2), E2 = (0, import_react13.useRef)(null), C2 = (0, import_react13.useRef)(false), x = (0, import_react13.useMemo)(function() {
    var e2 = function(e3) {
      h(e3), (f(e3) ? e3.touches.length > 0 : e3.buttons > 0) && m2.current ? p2(v(m2.current, e3, E2.current)) : (n2(false), _2());
    }, r2 = function() {
      n2(false), _2();
    };
    function n2(n3) {
      var t2 = C2.current, o3 = d(m2.current), a3 = n3 ? o3.addEventListener : o3.removeEventListener;
      a3(t2 ? "touchmove" : "mousemove", e2), a3(t2 ? "touchend" : "mouseup", r2);
    }
    return [function(e3) {
      var r3 = e3.nativeEvent, t2 = m2.current;
      if (t2 && (h(r3), !(function(e4, r4) {
        return r4 && !f(e4);
      })(r3, C2.current) && t2)) {
        if (f(r3)) {
          C2.current = true;
          var o3 = r3.changedTouches || [];
          o3.length && (E2.current = o3[0].identifier);
        }
        t2.focus(), p2(v(t2, r3, E2.current)), n2(true);
      }
    }, function(e3) {
      var r3 = e3.which || e3.keyCode;
      r3 < 37 || r3 > 40 || (e3.preventDefault(), b2({ left: 39 === r3 ? 0.05 : 37 === r3 ? -0.05 : 0, top: 40 === r3 ? 0.05 : 38 === r3 ? -0.05 : 0 }));
    }, function(e3) {
      var r3 = e3.which || e3.keyCode;
      r3 >= 37 && r3 <= 40 && _2();
    }, n2];
  }, [b2, p2, _2]), H = x[0], M = x[1], N = x[2], w2 = x[3];
  return (0, import_react13.useEffect)(function() {
    return w2;
  }, [w2]), import_react13.default.createElement("div", l({}, g2, { onTouchStart: H, onMouseDown: H, className: "react-colorful__interactive", ref: m2, onKeyDown: M, onKeyUp: N, tabIndex: 0, role: "slider" }));
});
var m = function(e2) {
  return e2.filter(Boolean).join(" ");
};
var p = function(r2) {
  var n2 = r2.color, t2 = r2.left, o2 = r2.top, a2 = void 0 === o2 ? 0.5 : o2, u2 = m(["react-colorful__pointer", r2.className]);
  return import_react13.default.createElement("div", { className: u2, style: { top: 100 * a2 + "%", left: 100 * t2 + "%" } }, import_react13.default.createElement("div", { className: "react-colorful__pointer-fill", style: { backgroundColor: n2 } }));
};
var b = function(e2, r2, n2) {
  return void 0 === r2 && (r2 = 0), void 0 === n2 && (n2 = Math.pow(10, r2)), Math.round(n2 * e2) / n2;
};
var _ = { grad: 0.9, turn: 360, rad: 360 / (2 * Math.PI) };
var E = function(e2) {
  return L(C(e2));
};
var C = function(e2) {
  return "#" === e2[0] && (e2 = e2.substring(1)), e2.length < 6 ? { r: parseInt(e2[0] + e2[0], 16), g: parseInt(e2[1] + e2[1], 16), b: parseInt(e2[2] + e2[2], 16), a: 4 === e2.length ? b(parseInt(e2[3] + e2[3], 16) / 255, 2) : 1 } : { r: parseInt(e2.substring(0, 2), 16), g: parseInt(e2.substring(2, 4), 16), b: parseInt(e2.substring(4, 6), 16), a: 8 === e2.length ? b(parseInt(e2.substring(6, 8), 16) / 255, 2) : 1 };
};
var w = function(e2) {
  return B(I(e2));
};
var y = function(e2) {
  var r2 = e2.s, n2 = e2.v, t2 = e2.a, o2 = (200 - r2) * n2 / 100;
  return { h: b(e2.h), s: b(o2 > 0 && o2 < 200 ? r2 * n2 / 100 / (o2 <= 100 ? o2 : 200 - o2) * 100 : 0), l: b(o2 / 2), a: b(t2, 2) };
};
var k = function(e2) {
  var r2 = y(e2);
  return "hsl(" + r2.h + ", " + r2.s + "%, " + r2.l + "%)";
};
var q = function(e2) {
  var r2 = y(e2);
  return "hsla(" + r2.h + ", " + r2.s + "%, " + r2.l + "%, " + r2.a + ")";
};
var I = function(e2) {
  var r2 = e2.h, n2 = e2.s, t2 = e2.v, o2 = e2.a;
  r2 = r2 / 360 * 6, n2 /= 100, t2 /= 100;
  var a2 = Math.floor(r2), u2 = t2 * (1 - n2), l2 = t2 * (1 - (r2 - a2) * n2), c2 = t2 * (1 - (1 - r2 + a2) * n2), i2 = a2 % 6;
  return { r: b(255 * [t2, l2, u2, u2, c2, t2][i2]), g: b(255 * [c2, t2, t2, l2, u2, u2][i2]), b: b(255 * [u2, u2, c2, t2, t2, l2][i2]), a: b(o2, 2) };
};
var K = function(e2) {
  var r2 = e2.toString(16);
  return r2.length < 2 ? "0" + r2 : r2;
};
var B = function(e2) {
  var r2 = e2.r, n2 = e2.g, t2 = e2.b, o2 = e2.a, a2 = o2 < 1 ? K(b(255 * o2)) : "";
  return "#" + K(r2) + K(n2) + K(t2) + a2;
};
var L = function(e2) {
  var r2 = e2.r, n2 = e2.g, t2 = e2.b, o2 = e2.a, a2 = Math.max(r2, n2, t2), u2 = a2 - Math.min(r2, n2, t2), l2 = u2 ? a2 === r2 ? (n2 - t2) / u2 : a2 === n2 ? 2 + (t2 - r2) / u2 : 4 + (r2 - n2) / u2 : 0;
  return { h: b(60 * (l2 < 0 ? l2 + 6 : l2)), s: b(a2 ? u2 / a2 * 100 : 0), v: b(a2 / 255 * 100), a: o2 };
};
var R = import_react13.default.memo(function(r2) {
  var n2 = r2.hue, t2 = r2.onChange, o2 = r2.onChangeEnd, a2 = m(["react-colorful__hue", r2.className]);
  return import_react13.default.createElement("div", { className: a2 }, import_react13.default.createElement(g, { onMove: function(e2) {
    t2({ h: 360 * e2.left });
  }, onKey: function(e2) {
    t2({ h: s(n2 + 360 * e2.left, 0, 360) });
  }, onEnd: o2, "aria-label": "Hue", "aria-valuenow": b(n2), "aria-valuemax": "360", "aria-valuemin": "0" }, import_react13.default.createElement(p, { className: "react-colorful__hue-pointer", left: n2 / 360, color: k({ h: n2, s: 100, v: 100, a: 1 }) })));
});
var S = import_react13.default.memo(function(r2) {
  var n2 = r2.hsva, t2 = r2.onChange, o2 = r2.onChangeEnd, a2 = { backgroundColor: k({ h: n2.h, s: 100, v: 100, a: 1 }) };
  return import_react13.default.createElement("div", { className: "react-colorful__saturation", style: a2 }, import_react13.default.createElement(g, { onMove: function(e2) {
    t2({ s: 100 * e2.left, v: 100 - 100 * e2.top });
  }, onKey: function(e2) {
    t2({ s: s(n2.s + 100 * e2.left, 0, 100), v: s(n2.v - 100 * e2.top, 0, 100) });
  }, onEnd: o2, "aria-label": "Color", "aria-valuetext": "Saturation " + b(n2.s) + "%, Brightness " + b(n2.v) + "%" }, import_react13.default.createElement(p, { className: "react-colorful__saturation-pointer", top: 1 - n2.v / 100, left: n2.s / 100, color: k(n2) })));
});
var T = function(e2, r2) {
  if (e2 === r2) return true;
  for (var n2 in e2) if (e2[n2] !== r2[n2]) return false;
  return true;
};
var P = function(e2, r2) {
  return e2.toLowerCase() === r2.toLowerCase() || T(C(e2), C(r2));
};
function X(e2, n2, u2, l2) {
  var c2 = i(u2), s2 = i(l2), f2 = (0, import_react13.useState)(function() {
    return e2.toHsva(n2);
  }), d2 = f2[0], v2 = f2[1], h2 = (0, import_react13.useRef)({ color: n2, hsva: d2 }), g2 = (0, import_react13.useRef)(false);
  (0, import_react13.useEffect)(function() {
    if (!e2.equal(n2, h2.current.color)) {
      var r2 = e2.toHsva(n2);
      h2.current = { hsva: r2, color: n2 }, v2(r2), g2.current = false;
    }
  }, [n2, e2]), (0, import_react13.useEffect)(function() {
    var r2;
    T(d2, h2.current.hsva) || e2.equal(r2 = e2.fromHsva(d2), h2.current.color) || (h2.current = { hsva: d2, color: r2 }, c2(r2), g2.current = true);
  }, [d2, e2, c2]);
  var m2 = (0, import_react13.useCallback)(function(e3) {
    v2(function(r2) {
      return Object.assign({}, r2, e3);
    });
  }, []), p2 = (0, import_react13.useCallback)(function() {
    g2.current && (g2.current = false, s2(h2.current.color));
  }, [s2]);
  return [d2, m2, p2];
}
var Y;
var U = "undefined" != typeof window ? import_react13.useLayoutEffect : import_react13.useEffect;
var V = function() {
  return Y || ("undefined" != typeof __webpack_nonce__ ? __webpack_nonce__ : void 0);
};
var $ = /* @__PURE__ */ new WeakMap();
var G = function(e2) {
  U(function() {
    var r2 = e2.current;
    if ("undefined" != typeof document && r2) {
      var n2 = r2.getRootNode ? r2.getRootNode() : r2.ownerDocument, t2 = n2 && ("head" in n2 || "host" in n2) ? n2 : r2.ownerDocument;
      if (!$.has(t2)) {
        var o2 = "head" in t2 ? t2.head : t2, a2 = (o2.ownerDocument || document).createElement("style");
        a2.innerHTML = `.react-colorful{position:relative;display:flex;flex-direction:column;width:200px;height:200px;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;cursor:default}.react-colorful__saturation{position:relative;flex-grow:1;border-color:transparent;border-bottom:12px solid #000;border-radius:8px 8px 0 0;background-image:linear-gradient(0deg,#000,transparent),linear-gradient(90deg,#fff,hsla(0,0%,100%,0))}.react-colorful__alpha-gradient,.react-colorful__pointer-fill{content:"";position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;border-radius:inherit}.react-colorful__alpha-gradient,.react-colorful__saturation{box-shadow:inset 0 0 0 1px rgba(0,0,0,.05)}.react-colorful__alpha,.react-colorful__hue{position:relative;height:24px}.react-colorful__hue{background:linear-gradient(90deg,red 0,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,red)}.react-colorful__last-control{border-radius:0 0 8px 8px}.react-colorful__interactive{position:absolute;left:0;top:0;right:0;bottom:0;border-radius:inherit;outline:none;touch-action:none}.react-colorful__pointer{position:absolute;z-index:1;box-sizing:border-box;width:28px;height:28px;transform:translate(-50%,-50%);background-color:#fff;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,.2)}.react-colorful__interactive:focus .react-colorful__pointer{transform:translate(-50%,-50%) scale(1.1)}.react-colorful__alpha,.react-colorful__alpha-pointer{background-color:#fff;background-image:url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill-opacity=".05"><path d="M8 0h8v8H8zM0 8h8v8H0z"/></svg>')}.react-colorful__saturation-pointer{z-index:3}.react-colorful__hue-pointer{z-index:2}`;
        var u2 = V();
        u2 && a2.setAttribute("nonce", u2), $.set(t2, a2), o2.appendChild(a2);
      }
    }
  }, []);
};
var ee = function(r2) {
  var n2 = r2.className, t2 = r2.hsva, o2 = r2.onChange, a2 = r2.onChangeEnd, u2 = { backgroundImage: "linear-gradient(90deg, " + q(Object.assign({}, t2, { a: 0 })) + ", " + q(Object.assign({}, t2, { a: 1 })) + ")" }, l2 = m(["react-colorful__alpha", n2]), c2 = b(100 * t2.a);
  return import_react13.default.createElement("div", { className: l2 }, import_react13.default.createElement("div", { className: "react-colorful__alpha-gradient", style: u2 }), import_react13.default.createElement(g, { onMove: function(e2) {
    o2({ a: e2.left });
  }, onKey: function(e2) {
    o2({ a: s(t2.a + e2.left) });
  }, onEnd: a2, "aria-label": "Alpha", "aria-valuetext": c2 + "%", "aria-valuenow": c2, "aria-valuemin": "0", "aria-valuemax": "100" }, import_react13.default.createElement(p, { className: "react-colorful__alpha-pointer", left: t2.a, color: q(t2) })));
};
var re = function(n2) {
  var t2 = n2.className, o2 = n2.colorModel, a2 = n2.color, u2 = void 0 === a2 ? o2.defaultColor : a2, i2 = n2.onChange, s2 = n2.onChangeEnd, f2 = c(n2, ["className", "colorModel", "color", "onChange", "onChangeEnd"]), d2 = (0, import_react13.useRef)(null);
  G(d2);
  var v2 = X(o2, u2, i2, s2), h2 = v2[0], g2 = v2[1], p2 = v2[2], b2 = m(["react-colorful", t2]);
  return import_react13.default.createElement("div", l({}, f2, { ref: d2, className: b2 }), import_react13.default.createElement(S, { hsva: h2, onChange: g2, onChangeEnd: p2 }), import_react13.default.createElement(R, { hue: h2.h, onChange: g2, onChangeEnd: p2 }), import_react13.default.createElement(ee, { hsva: h2, onChange: g2, onChangeEnd: p2, className: "react-colorful__last-control" }));
};
var ne = { defaultColor: "0001", toHsva: E, fromHsva: w, equal: P };
var te = function(r2) {
  return import_react13.default.createElement(re, l({}, r2, { colorModel: ne }));
};

// src/components/ColorControl.tsx
var import_jsx_runtime12 = require("react/jsx-runtime");
var HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
var PICKER_PANEL_HEIGHT = 250;
function toEightDigitHex(hex) {
  if (!HEX_COLOR_REGEX.test(hex)) return "#000000ff";
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}ff`;
  }
  if (hex.length === 7) return `${hex}ff`;
  return hex;
}
function normalizeOut(hex) {
  const eight = toEightDigitHex(hex);
  return eight.slice(7).toLowerCase() === "ff" ? eight.slice(0, 7) : eight;
}
function alphaPercent(hex) {
  return Math.round(parseInt(toEightDigitHex(hex).slice(7), 16) / 255 * 100);
}
function ColorControl({ label, value, onChange }) {
  const [isEditing, setIsEditing] = (0, import_react14.useState)(false);
  const [editValue, setEditValue] = (0, import_react14.useState)(value);
  const [isOpen, setIsOpen] = (0, import_react14.useState)(false);
  const swatchRef = (0, import_react14.useRef)(null);
  const panelRef = (0, import_react14.useRef)(null);
  const [portalTarget, setPortalTarget] = (0, import_react14.useState)(null);
  const [pos, setPos] = (0, import_react14.useState)(null);
  const [hexDraft, setHexDraft] = (0, import_react14.useState)(null);
  const [alphaDraft, setAlphaDraft] = (0, import_react14.useState)(null);
  const colourOnly = toEightDigitHex(value).slice(0, 7);
  (0, import_react14.useEffect)(() => {
    if (!isEditing) {
      setEditValue(colourOnly);
    }
  }, [colourOnly, isEditing]);
  (0, import_react14.useEffect)(() => {
    setPortalTarget(getDialKitPortalRoot(swatchRef.current) ?? document.body);
  }, []);
  const updatePos = (0, import_react14.useCallback)(() => {
    const el = swatchRef.current;
    if (!el || !portalTarget) return;
    const placed = getDropdownPosition(el, portalTarget, {
      dropdownHeight: PICKER_PANEL_HEIGHT
    });
    setPos({ top: placed.top, left: placed.left + placed.width - 216, above: placed.above });
  }, [portalTarget]);
  (0, import_react14.useEffect)(() => {
    if (!isOpen) return;
    updatePos();
  }, [isOpen, updatePos]);
  (0, import_react14.useEffect)(() => {
    if (!isOpen) return;
    const handleClick = (e2) => {
      const target = e2.target;
      if (swatchRef.current && !swatchRef.current.contains(target) && panelRef.current && !panelRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e2) => {
      if (e2.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);
  function commitHexDraft() {
    const draft = hexDraft;
    setHexDraft(null);
    if (draft === null) return;
    const typed = draft.trim().startsWith("#") ? draft.trim() : `#${draft.trim()}`;
    if (!HEX_COLOR_REGEX.test(typed)) return;
    const colour = toEightDigitHex(typed).slice(0, 7);
    onChange(normalizeOut(colour + toEightDigitHex(value).slice(7)));
  }
  function commitAlphaDraft() {
    const draft = alphaDraft;
    setAlphaDraft(null);
    if (draft === null) return;
    const percent = Number.parseFloat(draft.replace("%", "").trim());
    if (!Number.isFinite(percent)) return;
    const clamped = Math.min(100, Math.max(0, percent));
    const byte = Math.round(clamped / 100 * 255).toString(16).padStart(2, "0");
    onChange(normalizeOut(toEightDigitHex(value).slice(0, 7) + byte));
  }
  function handleTextSubmit() {
    setIsEditing(false);
    if (HEX_COLOR_REGEX.test(editValue)) {
      onChange(
        normalizeOut(
          toEightDigitHex(editValue).slice(0, 7) + toEightDigitHex(value).slice(7)
        )
      );
    } else {
      setEditValue(colourOnly);
    }
  }
  function handleKeyDown(e2) {
    if (e2.key === "Enter") {
      handleTextSubmit();
    } else if (e2.key === "Escape") {
      setIsEditing(false);
      setEditValue(colourOnly);
    }
  }
  const EyeDropperApi = window.EyeDropper;
  const pickFromScreen = async () => {
    if (!EyeDropperApi) return;
    try {
      const picked = await new EyeDropperApi().open();
      onChange(normalizeOut(picked.sRGBHex + toEightDigitHex(value).slice(7)));
    } catch {
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "dialkit-color-control", children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dialkit-color-label", children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "dialkit-color-inputs", children: [
      isEditing ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
        "input",
        {
          type: "text",
          className: "dialkit-color-hex-input",
          value: editValue,
          onChange: (e2) => setEditValue(e2.target.value),
          onBlur: handleTextSubmit,
          onKeyDown: handleKeyDown,
          autoFocus: true
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
        "span",
        {
          className: "dialkit-color-hex",
          onClick: () => setIsEditing(true),
          children: colourOnly.toUpperCase()
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
        "button",
        {
          ref: swatchRef,
          className: "dialkit-color-swatch",
          onClick: () => setIsOpen((open) => !open),
          "data-open": String(isOpen),
          title: "Pick color",
          children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
            "span",
            {
              className: "dialkit-color-swatch-fill",
              style: { backgroundColor: toEightDigitHex(value) }
            }
          )
        }
      )
    ] }),
    portalTarget && (0, import_react_dom2.createPortal)(
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_react15.AnimatePresence, { children: isOpen && pos && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
        import_react15.motion.div,
        {
          ref: panelRef,
          className: "dialkit-color-panel",
          initial: { opacity: 0, y: pos.above ? 8 : -8, scale: 0.95 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: {
            opacity: 0,
            y: pos.above ? 8 : -8,
            scale: 0.95,
            transition: { duration: 0.1, ease: [0.23, 1, 0.32, 1] }
          },
          transition: {
            duration: 0.15,
            ease: [0.23, 1, 0.32, 1]
          },
          style: {
            position: "absolute",
            left: pos.left,
            top: pos.top,
            // The panel is right-aligned to the swatch, so it grows out
            // of the swatch's own corner rather than the panel's edge.
            transformOrigin: pos.above ? "bottom right" : "top right"
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
              te,
              {
                color: toEightDigitHex(value),
                onChange: (next) => onChange(normalizeOut(next))
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "dialkit-color-panel-footer", children: [
              EyeDropperApi && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                "button",
                {
                  className: "dialkit-color-eyedropper",
                  onClick: pickFromScreen,
                  title: "Pick a color from the screen",
                  "aria-label": "Pick a color from the screen",
                  children: /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("path", { d: "m2 22 1-1h3l9-9" }),
                    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("path", { d: "M3 21v-3l9-9" }),
                    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("path", { d: "m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" })
                  ] })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                "input",
                {
                  type: "text",
                  className: "dialkit-color-panel-hex",
                  value: hexDraft ?? toEightDigitHex(value).slice(0, 7).toUpperCase(),
                  onChange: (e2) => setHexDraft(e2.target.value),
                  onBlur: commitHexDraft,
                  onKeyDown: (e2) => {
                    if (e2.key === "Enter") e2.target.blur();
                    else if (e2.key === "Escape") setHexDraft(null);
                  },
                  spellCheck: false,
                  "aria-label": "Hex value"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "dialkit-color-panel-alpha", children: [
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                  "input",
                  {
                    type: "text",
                    className: "dialkit-color-panel-alpha-input",
                    value: alphaDraft ?? String(alphaPercent(value)),
                    onChange: (e2) => setAlphaDraft(e2.target.value),
                    onBlur: commitAlphaDraft,
                    onKeyDown: (e2) => {
                      if (e2.key === "Enter") e2.target.blur();
                      else if (e2.key === "Escape") setAlphaDraft(null);
                    },
                    spellCheck: false,
                    "aria-label": "Alpha percentage"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dialkit-color-panel-alpha-unit", children: "%" })
              ] })
            ] })
          ]
        }
      ) }),
      portalTarget
    )
  ] });
}

// src/components/ControlRenderer.tsx
var import_jsx_runtime13 = require("react/jsx-runtime");
function ControlRenderer({
  panelId,
  controls,
  values,
  transitionDuration,
  physicsSettleCap,
  animateControls = false,
  accordionOpenPath,
  onAccordionToggle
}) {
  const shortcutCtx = (0, import_react16.useContext)(ShortcutContext);
  const renderControlInner = (control, depth) => {
    const value = values[control.path];
    switch (control.type) {
      case "slider":
        return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          Slider,
          {
            label: control.label,
            value,
            onChange: (v2) => DialStore.updateValue(panelId, control.path, v2),
            min: control.min,
            max: control.max,
            step: control.step,
            shortcut: control.shortcut,
            shortcutActive: shortcutCtx.activePanelId === panelId && shortcutCtx.activePath === control.path
          },
          control.path
        );
      case "toggle":
        return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          Toggle,
          {
            label: control.label,
            checked: value,
            onChange: (v2) => DialStore.updateValue(panelId, control.path, v2),
            shortcut: control.shortcut,
            shortcutActive: shortcutCtx.activePanelId === panelId && shortcutCtx.activePath === control.path
          },
          control.path
        );
      case "spring":
        return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          SpringControl,
          {
            panelId,
            path: control.path,
            label: control.label,
            spring: value,
            onChange: (v2) => DialStore.updateValue(panelId, control.path, v2)
          },
          control.path
        );
      case "transition":
        return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          TransitionControl,
          {
            panelId,
            path: control.path,
            label: control.label,
            value,
            onChange: (v2) => DialStore.updateValue(panelId, control.path, v2),
            durationControl: transitionDuration,
            physicsSettleCap
          },
          control.path
        );
      case "folder": {
        const controlledProps = depth === 0 && onAccordionToggle ? {
          open: accordionOpenPath === control.path,
          onToggle: (next) => onAccordionToggle(control.path, next)
        } : {};
        const children = control.children?.map((child) => renderControl(child, depth + 1));
        return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Folder, { title: control.label, defaultOpen: control.defaultOpen ?? true, ...controlledProps, children: animateControls ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(import_react17.AnimatePresence, { initial: false, children }) : children }, control.path);
      }
      case "text":
        return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          TextControl,
          {
            label: control.label,
            value,
            onChange: (v2) => DialStore.updateValue(panelId, control.path, v2),
            placeholder: control.placeholder
          },
          control.path
        );
      case "select":
        return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          SelectControl,
          {
            label: control.label,
            value,
            options: control.options ?? [],
            onChange: (v2) => DialStore.updateValue(panelId, control.path, v2)
          },
          control.path
        );
      case "color":
        return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          ColorControl,
          {
            label: control.label,
            value,
            onChange: (v2) => DialStore.updateValue(panelId, control.path, v2)
          },
          control.path
        );
      case "action":
        return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          "button",
          {
            className: "dialkit-button",
            onClick: () => DialStore.triggerAction(panelId, control.path),
            children: control.label
          },
          control.path
        );
      default:
        return null;
    }
  };
  const renderControl = (control, depth = 0) => {
    const inner = renderControlInner(control, depth);
    if (inner === null || !animateControls) return inner;
    const isFolder = control.type === "folder" || control.type === "spring" || control.type === "transition";
    const wrapClassName = isFolder ? "dialkit-control-wrap dialkit-control-wrap-folder" : "dialkit-control-wrap";
    return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(import_react17.motion.div, { className: wrapClassName, ...CONTROL_ANIM, children: inner }, control.path);
  };
  if (!animateControls) {
    return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(import_jsx_runtime13.Fragment, { children: controls.map((control) => renderControl(control, 0)) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(import_react17.AnimatePresence, { initial: false, children: controls.map((control) => renderControl(control, 0)) });
}

// src/components/PresetManager.tsx
var import_react18 = require("react");
var import_react_dom3 = require("react-dom");
var import_react19 = require("motion/react");
var import_jsx_runtime14 = require("react/jsx-runtime");
var DRAG_LIFT_PX = 4;
var PRESET_DROPDOWN_MAX_WIDTH = 280;
function PresetManager({ panelId, presets, activePresetId, onAdd, dropdownClassName }) {
  const [isOpen, setIsOpen] = (0, import_react18.useState)(false);
  const triggerRef = (0, import_react18.useRef)(null);
  const dropdownRef = (0, import_react18.useRef)(null);
  const [pos, setPos] = (0, import_react18.useState)({ top: 0, left: 0, width: 0, above: false });
  const [editingId, setEditingId] = (0, import_react18.useState)(null);
  const [draft, setDraft] = (0, import_react18.useState)("");
  const cancelledRef = (0, import_react18.useRef)(false);
  const [draggingId, setDraggingId] = (0, import_react18.useState)(null);
  const [cueTop, setCueTop] = (0, import_react18.useState)(null);
  const dragRef = (0, import_react18.useRef)(null);
  const suppressClickRef = (0, import_react18.useRef)(false);
  const editable = DialStore.isPresetsEditable(panelId);
  const lockable = editable && DialStore.isPresetsLockable(panelId);
  const hasPresets = presets.length > 0;
  const activePreset = presets.find((p2) => p2.id === activePresetId);
  const open = (0, import_react18.useCallback)(() => {
    if (!hasPresets) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const dropdownHeight = 8 + (presets.length + 1) * 36;
      const spaceBelow = window.innerHeight - rect.bottom - 4;
      const above = spaceBelow < dropdownHeight && rect.top > spaceBelow;
      setPos({
        top: above ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        above
      });
    }
    setIsOpen(true);
  }, [hasPresets, presets.length]);
  const close = (0, import_react18.useCallback)(() => {
    setIsOpen(false);
    setEditingId(null);
  }, []);
  const toggle = (0, import_react18.useCallback)(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, open, close]);
  (0, import_react18.useEffect)(() => {
    if (!isOpen) return;
    const handler = (e2) => {
      const target = e2.target;
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, close]);
  const handleSelect = (presetId) => {
    if (presetId) {
      DialStore.loadPreset(panelId, presetId);
    } else {
      DialStore.clearActivePreset(panelId);
    }
    close();
  };
  const handleDelete = (e2, presetId) => {
    e2.stopPropagation();
    DialStore.deletePreset(panelId, presetId);
  };
  const startEdit = (preset) => {
    cancelledRef.current = false;
    setEditingId(preset.id);
    setDraft(preset.name);
  };
  const commitEdit = () => {
    if (!editingId) return;
    DialStore.renamePreset(panelId, editingId, draft);
    setEditingId(null);
  };
  const cancelEdit = () => {
    cancelledRef.current = true;
    setEditingId(null);
  };
  const handleRowPointerDown = (e2, preset) => {
    if (!editable) return;
    if (editingId === preset.id) return;
    if (e2.button !== 0) return;
    dragRef.current = { id: preset.id, startY: e2.clientY, lifted: false, slot: null };
    e2.currentTarget.setPointerCapture(e2.pointerId);
  };
  const handleRowPointerMove = (e2, preset) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== preset.id) return;
    if (!drag.lifted) {
      if (Math.abs(e2.clientY - drag.startY) <= DRAG_LIFT_PX) return;
      drag.lifted = true;
      setDraggingId(drag.id);
    }
    const dropdownEl = dropdownRef.current;
    if (!dropdownEl) return;
    const rows = Array.from(dropdownEl.querySelectorAll(".dialkit-preset-item[data-preset-id]"));
    if (rows.length === 0) return;
    const dropdownRect = dropdownEl.getBoundingClientRect();
    let slot = rows.length;
    for (let i2 = 0; i2 < rows.length; i2++) {
      const r2 = rows[i2].getBoundingClientRect();
      if (e2.clientY < r2.top + r2.height / 2) {
        slot = i2;
        break;
      }
    }
    drag.slot = slot;
    const top = slot < rows.length ? rows[slot].getBoundingClientRect().top - dropdownRect.top : rows[rows.length - 1].getBoundingClientRect().bottom - dropdownRect.top;
    setCueTop(top);
  };
  const handleRowPointerEnd = (e2, preset) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.id !== preset.id) return;
    if (drag.lifted && drag.slot !== null) {
      const currentIds = presets.map((p2) => p2.id);
      const idx = currentIds.indexOf(drag.id);
      const withoutDragged = currentIds.filter((id) => id !== drag.id);
      const adjustedSlot = idx >= 0 && drag.slot > idx ? drag.slot - 1 : drag.slot;
      withoutDragged.splice(adjustedSlot, 0, drag.id);
      DialStore.reorderPresets(panelId, withoutDragged);
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    setDraggingId(null);
    setCueTop(null);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "dialkit-preset-manager", children: [
    /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
      "button",
      {
        ref: triggerRef,
        className: "dialkit-preset-trigger",
        onClick: toggle,
        "data-open": String(isOpen),
        "data-has-preset": String(!!activePreset),
        "data-disabled": String(!hasPresets),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dialkit-preset-label", children: activePreset ? activePreset.name : "Version 1" }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
            import_react19.motion.svg,
            {
              className: "dialkit-select-chevron",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2.5",
              strokeLinecap: "round",
              strokeLinejoin: "round",
              animate: { rotate: isOpen ? 180 : 0, opacity: hasPresets ? 0.6 : 0.25 },
              transition: { type: "spring", visualDuration: 0.2, bounce: 0.15 },
              children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("path", { d: ICON_CHEVRON })
            }
          )
        ]
      }
    ),
    (0, import_react_dom3.createPortal)(
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(import_react19.AnimatePresence, { children: isOpen && /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
        import_react19.motion.div,
        {
          ref: dropdownRef,
          className: `dialkit-root dialkit-preset-dropdown${dropdownClassName ? ` ${dropdownClassName}` : ""}`,
          "data-dragging": draggingId ? "true" : void 0,
          style: {
            position: "fixed",
            left: pos.left,
            minWidth: pos.width,
            // Grow for long names, but never past the viewport's right
            // edge or a sane cap — a long name truncates (ellipsis on
            // .dialkit-preset-name) instead of pushing the icons off
            // screen where the rename control can't be reached.
            maxWidth: Math.max(pos.width, Math.min(PRESET_DROPDOWN_MAX_WIDTH, window.innerWidth - pos.left - 8)),
            ...pos.above ? { bottom: window.innerHeight - pos.top, transformOrigin: "bottom" } : { top: pos.top, transformOrigin: "top" }
          },
          initial: { opacity: 0, y: pos.above ? 8 : -8, scale: 0.97 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: pos.above ? 8 : -8, scale: 0.97, pointerEvents: "none" },
          transition: { type: "spring", visualDuration: 0.15, bounce: 0 },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
              "div",
              {
                className: "dialkit-preset-item",
                "data-active": String(!activePresetId),
                onClick: () => handleSelect(null),
                children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dialkit-preset-name", children: "Version 1" })
              }
            ),
            presets.map((preset) => {
              const isEditing = editingId === preset.id;
              return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
                "div",
                {
                  className: "dialkit-preset-item",
                  "data-active": String(preset.id === activePresetId),
                  "data-preset-id": preset.id,
                  "data-locked": preset.locked ? "true" : void 0,
                  "data-dragging": draggingId === preset.id ? "true" : void 0,
                  onClick: () => {
                    if (isEditing) return;
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false;
                      return;
                    }
                    handleSelect(preset.id);
                  },
                  onPointerDown: (e2) => handleRowPointerDown(e2, preset),
                  onPointerMove: (e2) => handleRowPointerMove(e2, preset),
                  onPointerUp: (e2) => handleRowPointerEnd(e2, preset),
                  onPointerCancel: (e2) => handleRowPointerEnd(e2, preset),
                  onLostPointerCapture: (e2) => handleRowPointerEnd(e2, preset),
                  children: [
                    isEditing ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                      "input",
                      {
                        className: "dialkit-preset-input",
                        value: draft,
                        autoFocus: true,
                        onFocus: (e2) => e2.target.select(),
                        onChange: (e2) => setDraft(e2.target.value),
                        onKeyDown: (e2) => {
                          if (e2.key === "Enter") {
                            e2.preventDefault();
                            commitEdit();
                          } else if (e2.key === "Escape") {
                            e2.preventDefault();
                            cancelEdit();
                          }
                        },
                        onBlur: () => {
                          if (cancelledRef.current) {
                            cancelledRef.current = false;
                            return;
                          }
                          commitEdit();
                        },
                        onClick: (e2) => e2.stopPropagation(),
                        onMouseDown: (e2) => e2.stopPropagation(),
                        onPointerDown: (e2) => e2.stopPropagation()
                      }
                    ) : /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dialkit-preset-name", children: preset.name }),
                    !isEditing && /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
                      editable && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                        "button",
                        {
                          className: "dialkit-preset-rename",
                          title: "Rename preset",
                          onClick: (e2) => {
                            e2.stopPropagation();
                            startEdit(preset);
                          },
                          onMouseDown: (e2) => e2.stopPropagation(),
                          onPointerDown: (e2) => e2.stopPropagation(),
                          children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: ICON_PENCIL.map((d2, i2) => /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("path", { d: d2 }, i2)) })
                        }
                      ),
                      lockable && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                        "button",
                        {
                          className: "dialkit-preset-lock",
                          "data-locked": String(!!preset.locked),
                          title: preset.locked ? "Unlock preset" : "Lock preset",
                          onClick: (e2) => {
                            e2.stopPropagation();
                            DialStore.setPresetLocked(panelId, preset.id, !preset.locked);
                          },
                          onMouseDown: (e2) => e2.stopPropagation(),
                          onPointerDown: (e2) => e2.stopPropagation(),
                          children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: (preset.locked ? ICON_LOCK : ICON_LOCK_OPEN).map((d2, i2) => /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("path", { d: d2 }, i2)) })
                        }
                      ),
                      !preset.locked && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                        "button",
                        {
                          className: "dialkit-preset-delete",
                          onClick: (e2) => handleDelete(e2, preset.id),
                          onMouseDown: (e2) => e2.stopPropagation(),
                          onPointerDown: (e2) => e2.stopPropagation(),
                          title: "Delete preset",
                          children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: ICON_TRASH.map((d2, i2) => /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("path", { d: d2 }, i2)) })
                        }
                      )
                    ] })
                  ]
                },
                preset.id
              );
            }),
            draggingId && cueTop !== null && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { className: "dialkit-preset-drop-cue", style: { top: cueTop } })
          ]
        }
      ) }),
      document.body
    )
  ] });
}

// src/components/Panel.tsx
var import_jsx_runtime15 = require("react/jsx-runtime");
function Panel({ panel, defaultOpen = true, inline = false, folderMode = "independent", onOpenChange, variant = "root", toolbarExtra }) {
  const [copied, setCopied] = (0, import_react20.useState)(false);
  const [isPanelOpen, setIsPanelOpen] = (0, import_react20.useState)(defaultOpen);
  const subscribe = (0, import_react20.useCallback)(
    (callback) => DialStore.subscribe(panel.id, callback),
    [panel.id]
  );
  const getSnapshot = (0, import_react20.useCallback)(
    () => DialStore.getValues(panel.id),
    [panel.id]
  );
  const hoistedFolder = variant === "section" && panel.controls.length === 1 && panel.controls[0].type === "folder" ? panel.controls[0] : null;
  const topLevelControls = hoistedFolder ? hoistedFolder.children ?? [] : panel.controls;
  const [openFolder, setOpenFolder] = (0, import_react20.useState)(() => {
    if (folderMode !== "accordion") return null;
    const first = topLevelControls.find(
      (c2) => c2.type === "folder" && (c2.defaultOpen ?? true)
    );
    return first?.path ?? null;
  });
  const accordion = folderMode === "accordion";
  const handleOpenChange = (0, import_react20.useCallback)((open) => {
    setIsPanelOpen(open);
    onOpenChange?.(open);
  }, [onOpenChange]);
  const values = (0, import_react20.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  const presets = DialStore.getPresets(panel.id);
  const activePresetId = DialStore.getActivePresetId(panel.id);
  const handleAddPreset = () => {
    const nextNum = presets.length + 2;
    DialStore.savePreset(panel.id, `Version ${nextNum}`);
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(buildCopyInstruction("useDialKit", panel.name, values));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const handleAccordionToggle = (0, import_react20.useCallback)((path, next) => {
    setOpenFolder(next ? path : null);
  }, []);
  const renderControls = () => /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
    ControlRenderer,
    {
      panelId: panel.id,
      controls: topLevelControls,
      values,
      animateControls: true,
      accordionOpenPath: accordion ? openFolder : void 0,
      onAccordionToggle: accordion ? handleAccordionToggle : void 0
    }
  );
  const iconTransition = { type: "spring", visualDuration: 0.4, bounce: 0.1 };
  const toolbar = /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(import_jsx_runtime15.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      import_react21.motion.button,
      {
        className: "dialkit-toolbar-add",
        onClick: handleAddPreset,
        title: "Add preset",
        whileTap: { scale: 0.9 },
        transition: { type: "spring", visualDuration: 0.15, bounce: 0.3 },
        children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: ICON_ADD_PRESET.map((d2, i2) => /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("path", { d: d2 }, i2)) })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      PresetManager,
      {
        panelId: panel.id,
        presets,
        activePresetId,
        onAdd: handleAddPreset
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      import_react21.motion.button,
      {
        className: "dialkit-toolbar-add",
        onClick: handleCopy,
        title: "Copy parameters",
        whileTap: { scale: 0.9 },
        transition: { type: "spring", visualDuration: 0.15, bounce: 0.3 },
        children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { position: "relative", width: 16, height: 16 }, children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(import_react21.AnimatePresence, { initial: false, mode: "wait", children: copied ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
          import_react21.motion.svg,
          {
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            style: { position: "absolute", inset: 0, width: 16, height: 16, color: "var(--dial-text-label)" },
            initial: { scale: 0.8, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            exit: { scale: 0.8, opacity: 0 },
            transition: { duration: 0.08 },
            children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("path", { d: ICON_CHECK })
          },
          "check"
        ) : /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
          import_react21.motion.svg,
          {
            viewBox: "0 0 24 24",
            fill: "none",
            style: { position: "absolute", inset: 0, width: 16, height: 16, color: "var(--dial-text-label)" },
            initial: { scale: 0.8, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            exit: { scale: 0.8, opacity: 0 },
            transition: { duration: 0.08 },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("path", { d: ICON_CLIPBOARD.board, stroke: "currentColor", strokeWidth: "2", strokeLinejoin: "round" }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("path", { d: ICON_CLIPBOARD.sparkle, fill: "currentColor" }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("path", { d: ICON_CLIPBOARD.body, stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })
            ]
          },
          "clipboard"
        ) }) })
      }
    ),
    toolbarExtra
  ] });
  if (variant === "section") {
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "dialkit-panel-section", "data-panel-name": panel.name, children: /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(Folder, { title: panel.name, defaultOpen: panel.defaultOpen ?? defaultOpen, onOpenChange: handleOpenChange, children: [
      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "dialkit-panel-section-toolbar", onClick: (e2) => e2.stopPropagation(), children: toolbar }),
      renderControls()
    ] }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "dialkit-panel-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Folder, { title: panel.name, defaultOpen, isRoot: true, inline, onOpenChange: handleOpenChange, toolbar, children: renderControls() }) });
}

// src/components/Timeline/TimelineToggleButton.tsx
var import_react22 = require("react");
var import_react23 = require("motion/react");

// src/store/TimelineUiStore.ts
var TimelineUiStoreClass = class {
  constructor() {
    this.visible = true;
    this.initialized = false;
    this.controllers = /* @__PURE__ */ new Map();
    this.listeners = /* @__PURE__ */ new Set();
  }
  getVisible() {
    for (const controller of this.controllers.values()) {
      if (controller.visible !== void 0) return controller.visible;
    }
    return this.visible;
  }
  registerController(id, controller) {
    const previous = this.getVisible();
    if (!this.initialized) {
      this.visible = controller.defaultVisible;
      this.initialized = true;
    }
    this.controllers.set(id, controller);
    if (previous !== this.getVisible()) this.notify();
    return () => {
      const before = this.getVisible();
      this.controllers.delete(id);
      if (this.controllers.size === 0) this.initialized = false;
      if (before !== this.getVisible()) this.notify();
    };
  }
  updateController(id, controller) {
    if (!this.controllers.has(id)) return;
    const previous = this.getVisible();
    this.controllers.set(id, controller);
    if (previous !== this.getVisible()) this.notify();
  }
  requestVisible(visible) {
    const current = this.getVisible();
    if (current === visible) return;
    const controlled = Array.from(this.controllers.values()).filter(
      (controller) => controller.visible !== void 0
    );
    if (controlled.length > 0) {
      controlled.forEach((controller) => controller.onVisibilityChange?.(visible));
      return;
    }
    this.visible = visible;
    this.controllers.forEach((controller) => controller.onVisibilityChange?.(visible));
    this.notify();
  }
  toggle() {
    this.requestVisible(!this.getVisible());
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  notify() {
    this.listeners.forEach((listener) => listener());
  }
};
var TimelineUiStore = /* @__PURE__ */ new TimelineUiStoreClass();

// src/components/Timeline/TimelineToggleButton.tsx
var import_jsx_runtime16 = require("react/jsx-runtime");
function TimelineToggleButton() {
  const subscribe = (0, import_react22.useCallback)(
    (listener) => TimelineUiStore.subscribe(listener),
    []
  );
  const getVisible = (0, import_react22.useCallback)(() => TimelineUiStore.getVisible(), []);
  const visible = (0, import_react22.useSyncExternalStore)(subscribe, getVisible, getVisible);
  const label = visible ? "Hide timeline" : "Show timeline";
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
    import_react23.motion.button,
    {
      className: "dialkit-toolbar-add dialkit-timeline-toolbar-toggle",
      "data-active": visible || void 0,
      "aria-pressed": visible,
      "aria-label": label,
      title: label,
      onClick: () => TimelineUiStore.toggle(),
      whileTap: { scale: 0.9 },
      transition: { type: "spring", visualDuration: 0.15, bounce: 0.3 },
      children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("svg", { viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: ICON_TIMELINE.map((d2, i2) => /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("path", { d: d2, fill: "currentColor" }, i2)) })
    }
  );
}

// src/panel-drag.ts
var PANEL_DRAG_THRESHOLD = 8;
var COLLAPSED_PANEL_SIZE = 42;
var DRAG_EXCLUSION_SELECTOR = [
  ".dialkit-panel-icon",
  ".dialkit-panel-toolbar",
  "button",
  "input",
  "select",
  "textarea",
  "a",
  '[role="button"]',
  '[contenteditable="true"]'
].join(",");
function getPanelDragHandle(target, panel) {
  if (!(target instanceof Element) || !panel) return null;
  const inner = target.closest(".dialkit-panel-inner");
  if (!inner || !panel.contains(inner)) return null;
  if (inner.getAttribute("data-collapsed") === "true") {
    return inner;
  }
  const header = target.closest(".dialkit-panel-header");
  if (!header || !inner.contains(header)) return null;
  if (target.closest(DRAG_EXCLUSION_SELECTOR)) return null;
  return header;
}
function getPanelDragStart(pointerX, pointerY, panel) {
  const rect = panel.getBoundingClientRect();
  return {
    pointerX,
    pointerY,
    elX: rect.left,
    elY: rect.top
  };
}
function getPanelDragOffset(start, pointerX, pointerY) {
  return {
    x: start.elX + pointerX - start.pointerX,
    y: start.elY + pointerY - start.pointerY
  };
}
function hasPanelDragMoved(start, pointerX, pointerY) {
  const dx = pointerX - start.pointerX;
  const dy = pointerY - start.pointerY;
  return Math.hypot(dx, dy) >= PANEL_DRAG_THRESHOLD;
}
function getPanelOriginX(position, offset, viewportWidth = typeof window !== "undefined" ? window.innerWidth : void 0) {
  if (offset && viewportWidth) {
    return offset.x + COLLAPSED_PANEL_SIZE / 2 < viewportWidth / 2 ? "left" : "right";
  }
  return position.endsWith("left") ? "left" : "right";
}
function blockPanelDragClick(handle) {
  const blocker = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
  };
  handle.addEventListener("click", blocker, { capture: true, once: true });
  window.setTimeout(() => {
    handle.removeEventListener("click", blocker, true);
  }, 0);
}

// src/components/DialRoot.tsx
var import_jsx_runtime17 = require("react/jsx-runtime");
function DialRoot({ position = "top-right", defaultOpen = true, mode = "popover", theme = "system", productionEnabled = isDevDefault, folderMode = "independent", onOpenChange, include }) {
  if (!productionEnabled) return null;
  const [panels, setPanels] = (0, import_react24.useState)([]);
  const [timelineCount, setTimelineCount] = (0, import_react24.useState)(0);
  const [mounted, setMounted] = (0, import_react24.useState)(false);
  const inline = mode === "inline";
  const panelRef = (0, import_react24.useRef)(null);
  const [dragOffset, setDragOffset] = (0, import_react24.useState)(null);
  const [activePosition, setActivePosition] = (0, import_react24.useState)(position);
  const lastDragOffset = (0, import_react24.useRef)(null);
  const draggingRef = (0, import_react24.useRef)(false);
  const dragStartRef = (0, import_react24.useRef)(null);
  const didDragRef = (0, import_react24.useRef)(false);
  const dragTargetRef = (0, import_react24.useRef)(null);
  const panelOpenStatesRef = (0, import_react24.useRef)(/* @__PURE__ */ new Map());
  const rootOpenRef = (0, import_react24.useRef)(null);
  const visiblePanels = (0, import_react24.useMemo)(() => {
    if (!include) return panels;
    return panels.filter((p2) => include.ungrouped === true && !p2.group || !!include.groups && !!p2.group && include.groups.includes(p2.group));
  }, [panels, include]);
  const rootKeys = (0, import_react24.useMemo)(() => {
    const keys = [];
    const seenGroups = /* @__PURE__ */ new Set();
    for (const panel of visiblePanels) {
      if (!panel.group) {
        keys.push(panel.id);
      } else if (!seenGroups.has(panel.group)) {
        seenGroups.add(panel.group);
        keys.push(`group:${panel.group}`);
      }
    }
    return keys;
  }, [visiblePanels]);
  (0, import_react24.useEffect)(() => {
    setMounted(true);
    setPanels(DialStore.getPanels("panel"));
    setTimelineCount(TimelineStore.getTimelines().length);
    const unsubscribePanels = DialStore.subscribeGlobal(() => {
      setPanels(DialStore.getPanels("panel"));
    });
    const unsubscribeTimelines = TimelineStore.subscribeGlobal(() => {
      setTimelineCount(TimelineStore.getTimelines().length);
    });
    return () => {
      unsubscribePanels();
      unsubscribeTimelines();
    };
  }, []);
  (0, import_react24.useEffect)(() => {
    const fallbackOpen = inline || defaultOpen;
    const nextStates = /* @__PURE__ */ new Map();
    for (const key of rootKeys) {
      nextStates.set(key, panelOpenStatesRef.current.get(key) ?? fallbackOpen);
    }
    panelOpenStatesRef.current = nextStates;
    rootOpenRef.current = Array.from(nextStates.values()).some(Boolean);
  }, [defaultOpen, inline, rootKeys]);
  (0, import_react24.useEffect)(() => {
    if (!panelRef.current || inline) return;
    const observer = new MutationObserver(() => {
      const inners = panelRef.current?.querySelectorAll(".dialkit-panel-inner");
      if (!inners || inners.length === 0) return;
      const collapsed = Array.from(inners).every(
        (el) => el.getAttribute("data-collapsed") === "true"
      );
      const currentDragOffset = dragOffset;
      if (!collapsed) {
        if (currentDragOffset) {
          lastDragOffset.current = currentDragOffset;
          const bubbleCenterX = currentDragOffset.x + 21;
          const midX = window.innerWidth / 2;
          setActivePosition(bubbleCenterX < midX ? "top-left" : "top-right");
        } else {
          setActivePosition(position);
        }
        setDragOffset(null);
      } else if (currentDragOffset) {
        lastDragOffset.current = currentDragOffset;
      } else if (lastDragOffset.current) {
        setDragOffset(lastDragOffset.current);
      }
    });
    observer.observe(panelRef.current, { subtree: true, attributes: true, attributeFilter: ["data-collapsed"] });
    return () => observer.disconnect();
  }, [inline, dragOffset, position]);
  const handlePointerDown = (0, import_react24.useCallback)((e2) => {
    const panel = panelRef.current;
    const handle = getPanelDragHandle(e2.target, panel);
    if (!panel || !handle) return;
    dragTargetRef.current = handle;
    dragStartRef.current = getPanelDragStart(e2.clientX, e2.clientY, panel);
    didDragRef.current = false;
    draggingRef.current = true;
    handle.setPointerCapture(e2.pointerId);
  }, []);
  const handlePointerMove = (0, import_react24.useCallback)((e2) => {
    if (!draggingRef.current || !dragStartRef.current) return;
    if (!didDragRef.current && !hasPanelDragMoved(dragStartRef.current, e2.clientX, e2.clientY)) return;
    didDragRef.current = true;
    setDragOffset(getPanelDragOffset(dragStartRef.current, e2.clientX, e2.clientY));
  }, []);
  const handlePointerUp = (0, import_react24.useCallback)((e2) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    dragStartRef.current = null;
    const dragTarget = dragTargetRef.current;
    if (dragTarget?.hasPointerCapture(e2.pointerId)) {
      dragTarget.releasePointerCapture(e2.pointerId);
    }
    if (didDragRef.current) {
      e2.stopPropagation();
      if (dragTarget) {
        blockPanelDragClick(dragTarget);
      }
    }
    dragTargetRef.current = null;
  }, []);
  const handlePanelOpenChange = (0, import_react24.useCallback)((panelId, open) => {
    panelOpenStatesRef.current.set(panelId, open);
    const fallbackOpen = inline || defaultOpen;
    const nextRootOpen = rootKeys.some((key) => panelOpenStatesRef.current.get(key) ?? fallbackOpen);
    if (rootOpenRef.current === nextRootOpen) return;
    rootOpenRef.current = nextRootOpen;
    onOpenChange?.(nextRootOpen);
  }, [defaultOpen, inline, onOpenChange, rootKeys]);
  const handleRootOpenChange = (0, import_react24.useCallback)((open) => {
    if (rootOpenRef.current === open) return;
    rootOpenRef.current = open;
    onOpenChange?.(open);
  }, [onOpenChange]);
  if (!mounted || typeof window === "undefined") {
    return null;
  }
  if (visiblePanels.length === 0 && timelineCount === 0) {
    return null;
  }
  const dragStyle = dragOffset ? {
    top: dragOffset.y,
    left: dragOffset.x,
    right: "auto",
    bottom: "auto"
  } : void 0;
  const originX = getPanelOriginX(activePosition, dragOffset);
  const timelineToggle = timelineCount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(TimelineToggleButton, {}) : null;
  const renderedGroups = /* @__PURE__ */ new Set();
  const panelNodes = visiblePanels.map((panel) => {
    const group = panel.group;
    if (!group) {
      return /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
        Panel,
        {
          panel,
          defaultOpen: inline || defaultOpen,
          inline,
          folderMode,
          toolbarExtra: timelineToggle,
          onOpenChange: (open) => handlePanelOpenChange(panel.id, open)
        },
        panel.id
      );
    }
    if (renderedGroups.has(group)) return null;
    renderedGroups.add(group);
    const sectionPanels = visiblePanels.filter((p2) => p2.group === group);
    return /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "dialkit-panel-wrapper", "data-group": group, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
      Folder,
      {
        title: group,
        defaultOpen: inline || defaultOpen,
        isRoot: true,
        inline,
        panelHeightOffset: 12,
        onOpenChange: (open) => handlePanelOpenChange(`group:${group}`, open),
        children: sectionPanels.map((p2) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
          Panel,
          {
            panel: p2,
            variant: "section",
            defaultOpen: inline || defaultOpen,
            inline,
            folderMode
          },
          p2.id
        ))
      }
    ) }, `group:${group}`);
  });
  const content = /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(ShortcutListener, { children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "dialkit-root", "data-mode": mode, "data-theme": theme, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
    "div",
    {
      ref: panelRef,
      className: "dialkit-panel",
      "data-position": inline ? void 0 : dragOffset ? void 0 : activePosition,
      "data-origin-x": inline ? void 0 : originX,
      "data-mode": mode,
      style: dragStyle,
      onPointerDown: !inline ? handlePointerDown : void 0,
      onPointerMove: !inline ? handlePointerMove : void 0,
      onPointerUp: !inline ? handlePointerUp : void 0,
      onPointerCancel: !inline ? handlePointerUp : void 0,
      children: visiblePanels.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "dialkit-panel-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
        Folder,
        {
          title: "DialKit",
          defaultOpen: inline || defaultOpen,
          isRoot: true,
          inline,
          onOpenChange: handleRootOpenChange,
          toolbar: timelineToggle,
          panelHeightOffset: 2,
          children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "dialkit-timeline-toolkit-only", children: "Timeline" })
        }
      ) }) : panelNodes
    }
  ) }) });
  if (inline) {
    return content;
  }
  return (0, import_react_dom4.createPortal)(content, document.body);
}

// src/hooks/useDialTimeline.ts
var import_react25 = require("react");

// src/timeline-core.ts
var CLIP_VALUE_STEP = 0.01;
var TIMELINE_MIN_CLIP_DURATION = 0.05;
var DEFAULT_STEP_DURATION = 0.3;
var DEFAULT_CLIP_TRANSITION = { type: "spring", bounce: 0.2 };
var RESERVED_KEYS = /* @__PURE__ */ new Set(["time", "playing", "duration", "play", "pause", "replay", "seek"]);
function isClipConfig(value) {
  return isPlainObject(value) && Number.isFinite(value.at);
}
function isGroupConfig(value) {
  if (!isPlainObject(value) || "at" in value) return false;
  const entries = Object.values(value);
  return entries.length > 0 && entries.some(isClipConfig);
}
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonNegativeFinite(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallback;
}
function animatedDuration(value, fallback = DEFAULT_STEP_DURATION) {
  return Math.max(TIMELINE_MIN_CLIP_DURATION, nonNegativeFinite(value, fallback));
}
function transitionDefaultDuration(transition) {
  if (transition.type === "easing") return animatedDuration(transition.duration);
  if (isPhysicsSpring(transition)) {
    return animatedDuration(springSettleDuration(springParams(transition)));
  }
  if (transition.visualDuration !== void 0) return animatedDuration(transition.visualDuration);
  return animatedDuration(springSettleDuration(springParams(transition)));
}
function defaultStepDuration(step, inheritedTransition) {
  if (step.duration !== void 0) return animatedDuration(step.duration);
  const curve = step.transition ?? inheritedTransition;
  if (curve && isPhysicsSpring(curve)) return transitionDefaultDuration(curve);
  if (step.transition) return transitionDefaultDuration(step.transition);
  return DEFAULT_STEP_DURATION;
}
function defaultTrackDuration(track, inheritedTransition) {
  const curve = track.transition ?? inheritedTransition;
  if (track.steps?.length) {
    return track.steps.reduce((sum, step) => sum + defaultStepDuration(step, curve), 0);
  }
  if (track.duration !== void 0) return animatedDuration(track.duration);
  if (curve && isPhysicsSpring(curve)) return transitionDefaultDuration(curve);
  if (track.transition) return transitionDefaultDuration(track.transition);
  return DEFAULT_STEP_DURATION;
}
function defaultClipDuration(clip) {
  const defaultCurve = isTransitionConfig(clip.transition) ? clip.transition : DEFAULT_CLIP_TRANSITION;
  if (clip.props) {
    return Object.values(clip.props).reduce(
      (max, track) => Math.max(
        max,
        nonNegativeFinite(track.delay) + defaultTrackDuration(track, defaultCurve)
      ),
      0
    );
  }
  if (clip.steps?.length) {
    return clip.steps.reduce((sum, step) => sum + defaultStepDuration(step, defaultCurve), 0);
  }
  const animating = Boolean(clip.transition || clip.from || clip.to);
  if (!animating) return nonNegativeFinite(clip.duration);
  if (clip.duration !== void 0) return animatedDuration(clip.duration);
  if (isPhysicsSpring(defaultCurve)) return transitionDefaultDuration(defaultCurve);
  if (isTransitionConfig(clip.transition)) return transitionDefaultDuration(clip.transition);
  return clip.from || clip.to ? transitionDefaultDuration(DEFAULT_CLIP_TRANSITION) : 0;
}
function normalizeLoopMode(value) {
  if (value === true || value === "mirror" || value === "repeat") return "repeat";
  return "off";
}
function normalizeStoredTransition(transition, clipDuration) {
  if (transition.type === "easing") {
    return { ...transition, duration: clipDuration };
  }
  if (isPhysicsSpring(transition)) {
    return transition;
  }
  return { type: "spring", bounce: transition.bounce ?? 0.2 };
}
function collectClipEntries(config) {
  const entries = [];
  for (const [key, value] of Object.entries(config)) {
    if (key === "duration") continue;
    if (RESERVED_KEYS.has(key)) {
      console.warn(`[dialkit] Timeline key "${key}" collides with a reserved key and was skipped.`);
      continue;
    }
    if (isClipConfig(value)) {
      entries.push({ path: key, childKey: key, clip: value });
    } else if (isGroupConfig(value)) {
      for (const [childKey, childClip] of Object.entries(value)) {
        if (isClipConfig(childClip)) {
          entries.push({ path: `${key}.${childKey}`, childKey, group: key, clip: childClip });
        } else {
          console.warn(
            `[dialkit] Timeline clip "${key}.${childKey}" is missing a numeric "at" and was skipped.`
          );
        }
      }
    } else {
      console.warn(
        `[dialkit] Timeline entry "${key}" is neither a clip (needs a numeric "at") nor a group of clips and was skipped.`
      );
    }
  }
  return entries;
}
function definedValues(values) {
  if (!values) return void 0;
  const result = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== void 0) result[key] = value;
  }
  return result;
}
function setDialPath(dialConfig, path, value) {
  const segments = path.split(".");
  let node = dialConfig;
  for (const segment of segments.slice(0, -1)) {
    node = node[segment] ?? (node[segment] = {});
  }
  node[segments[segments.length - 1]] = value;
}
function parseTimelineConfig(config) {
  const entries = collectClipEntries(config);
  let maxEnd = 0;
  for (const { clip } of entries) {
    maxEnd = Math.max(
      maxEnd,
      nonNegativeFinite(clip.at) + defaultClipDuration(clip) + nonNegativeFinite(clip.tail)
    );
  }
  const duration = typeof config.duration === "number" && Number.isFinite(config.duration) && config.duration > 0 ? config.duration : maxEnd > 0 ? Math.ceil(maxEnd * 100 - 1e-4) / 100 : 1;
  const dialConfig = {};
  const clips = [];
  entries.forEach(({ path, childKey, group, clip }, index) => {
    const raw = clip;
    if (raw.props && (raw.steps?.length || raw.from || raw.to)) {
      console.warn(
        `[dialkit] Timeline clip "${path}": "props" is mutually exclusive with from/to/steps \u2014 using "props".`
      );
    } else if (raw.steps?.length && raw.to) {
      console.warn(
        `[dialkit] Timeline clip "${path}": "to" is ignored when "steps" is present \u2014 each leg's "to" defines its targets.`
      );
    }
    const hasSteps = Boolean(clip.steps?.length) && !clip.props;
    const hasProps = Boolean(clip.props);
    const single = isTransitionConfig(clip.transition) ? clip.transition : void 0;
    const total = defaultClipDuration(clip);
    const defaultCurve = single ?? DEFAULT_CLIP_TRANSITION;
    const clipAt = nonNegativeFinite(clip.at);
    const clipDial = {
      at: [clipAt, 0, duration, CLIP_VALUE_STEP]
    };
    if (!hasSteps && !hasProps) {
      clipDial.duration = [total, 0, duration, CLIP_VALUE_STEP];
    }
    if (!hasSteps && !hasProps && (clip.transition || clip.from || clip.to)) {
      clipDial.transition = normalizeStoredTransition(defaultCurve, total);
    }
    let tracks;
    if (clip.props) {
      tracks = [];
      for (const [prop, track] of Object.entries(clip.props)) {
        if (TRACK_RESERVED.has(prop) || /^step\d+$/.test(prop)) {
          console.warn(`[dialkit] Timeline property "${prop}" collides with a clip field and was skipped.`);
          continue;
        }
        const trackDuration = defaultTrackDuration(track, defaultCurve);
        const trackCurve = track.transition ?? defaultCurve;
        const hasTrackSteps = Boolean(track.steps?.length);
        const trackDial = {
          delay: [nonNegativeFinite(track.delay), 0, duration, CLIP_VALUE_STEP]
        };
        if (!hasTrackSteps) {
          trackDial.duration = [trackDuration, 0, duration, CLIP_VALUE_STEP];
          trackDial.transition = normalizeStoredTransition(trackCurve, trackDuration);
        }
        const fromValue = track.from ?? (hasTrackSteps ? void 0 : track.to);
        if (hasTrackSteps && fromValue === void 0) {
          console.warn(
            `[dialkit] Timeline clip "${path}": track "${prop}" has steps but no "from" \u2014 declare its starting value.`
          );
        }
        if (fromValue !== void 0) {
          trackDial.from = scalarDial(prop, fromValue, hasTrackSteps ? track.steps[0]?.to : track.to);
        }
        if (!hasTrackSteps && track.to !== void 0) {
          trackDial.to = scalarDial(prop, track.to, fromValue);
        }
        let trackStepKeys;
        if (hasTrackSteps) {
          trackStepKeys = [];
          let previous = fromValue;
          track.steps.forEach((step, stepIndex) => {
            const stepKey = `step${stepIndex + 1}`;
            trackStepKeys.push(stepKey);
            const stepDuration = defaultStepDuration(step, trackCurve);
            const stepDial = {
              duration: [stepDuration, 0, duration, CLIP_VALUE_STEP],
              transition: normalizeStoredTransition(step.transition ?? trackCurve, stepDuration)
            };
            if (step.to !== void 0) {
              stepDial.to = scalarDial(prop, step.to, previous);
              previous = step.to;
            }
            trackDial[stepKey] = stepDial;
          });
        }
        clipDial[prop] = trackDial;
        tracks.push({ prop, stepKeys: trackStepKeys });
      }
    }
    if (clip.from && !hasProps) {
      clipDial.from = withFromToRanges(
        clip.from,
        hasSteps ? definedValues(clip.steps[0]?.to) : clip.to
      );
    }
    if (!hasSteps && !hasProps && clip.to) {
      clipDial.to = withFromToRanges(clip.to, clip.from);
    }
    let stepKeys;
    if (hasSteps) {
      stepKeys = [];
      let running = clip.from;
      clip.steps.forEach((step, stepIndex) => {
        const stepKey = `step${stepIndex + 1}`;
        stepKeys.push(stepKey);
        const stepDuration = defaultStepDuration(step, defaultCurve);
        const stepDial = {
          duration: [stepDuration, 0, duration, CLIP_VALUE_STEP],
          transition: normalizeStoredTransition(step.transition ?? defaultCurve, stepDuration)
        };
        const stepTo = definedValues(step.to);
        if (stepTo) {
          for (const prop of Object.keys(stepTo)) {
            if (!running || !(prop in running)) {
              console.warn(
                `[dialkit] Timeline clip "${path}": property "${prop}" first animates in step ${stepIndex + 1} with no starting value \u2014 declare it in "from".`
              );
            }
          }
          stepDial.to = withFromToRanges(stepTo, running);
        }
        clipDial[stepKey] = stepDial;
        running = { ...running ?? {}, ...stepTo ?? {} };
      });
    }
    setDialPath(dialConfig, path, clipDial);
    clips.push({
      key: path,
      label: typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : formatLabel(childKey),
      color: TIMELINE_CLIP_COLORS[index % TIMELINE_CLIP_COLORS.length],
      loop: normalizeLoopMode(clip.loop),
      group,
      stepKeys,
      tracks,
      ...nonNegativeFinite(clip.tail) > 0 ? { tail: nonNegativeFinite(clip.tail) } : {}
    });
  });
  return { duration, dialConfig, clips };
}
var TRACK_RESERVED = /* @__PURE__ */ new Set(["at", "duration", "loop", "label", "from", "to", "transition", "delay"]);
function scalarDial(prop, value, counterpart) {
  const record = withFromToRanges(
    { [prop]: value },
    counterpart === void 0 ? void 0 : { [prop]: counterpart }
  );
  return record[prop];
}
var FROM_TO_RANGE_PRESETS = [
  [/^(x|y|z|tx|ty|offsetx|offsety|translatex|translatey)$/i, { min: -100, max: 100, step: 1 }],
  [/rotat|angle|skew/i, { min: -180, max: 180, step: 1 }],
  [/^scale/i, { min: 0, max: 2, step: 0.01 }],
  [/opacity|alpha/i, { min: 0, max: 1, step: 0.01 }],
  [/blur|radius|spread/i, { min: 0, max: 100, step: 1 }]
];
function inferFromToRange(key, value, counterpart) {
  const lo = Math.min(value, counterpart ?? value);
  const hi = Math.max(value, counterpart ?? value);
  const preset = FROM_TO_RANGE_PRESETS.find(([pattern]) => pattern.test(key))?.[1];
  if (preset) {
    return [value, Math.min(preset.min, lo), Math.max(preset.max, hi), preset.step];
  }
  if (lo >= 0 && hi <= 1) {
    return [value, 0, 1, 0.01];
  }
  const extent = Math.max(Math.abs(lo), Math.abs(hi), 1);
  const min = lo < 0 ? -extent * 2 : 0;
  const max = Math.max(extent * 2, hi);
  return [value, min, max, inferStep(min, max)];
}
function withFromToRanges(config, counterpart) {
  const result = {};
  for (const [key, value] of Object.entries(config)) {
    const other = counterpart?.[key];
    if (typeof value === "number") {
      result[key] = inferFromToRange(key, value, typeof other === "number" ? other : void 0);
    } else if (isPlainObject(value) && !("type" in value)) {
      result[key] = withFromToRanges(
        value,
        isPlainObject(other) && !("type" in other) ? other : void 0
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}
function curveStatic(transition, duration) {
  if (!transition) return { duration };
  if (transition.type === "easing") return { duration, ease: transition.ease };
  const spring = springParams(transition);
  return { duration, spring, settle: springSettleDuration(spring) };
}
function sampleCurve(curve, elapsed) {
  if (elapsed <= 0) return 0;
  if (curve.spring) {
    if (curve.settle !== void 0 && elapsed >= curve.settle) return 1;
    return springProgress(elapsed, curve.spring);
  }
  if (curve.ease) {
    return cubicBezierProgress(clamp(curve.duration > 0 ? elapsed / curve.duration : 1, 0, 1), curve.ease);
  }
  return curve.duration > 0 ? Math.min(1, elapsed / curve.duration) : 1;
}
function resolvedAtPath(resolved, path) {
  let node = resolved;
  for (const segment of path.split(".")) {
    node = isPlainObject(node) ? node[segment] : void 0;
  }
  return isPlainObject(node) ? node : {};
}
function computeStaticClips(parsed, flatValues) {
  const resolved = resolveDialValues(parsed.dialConfig, flatValues);
  return parsed.clips.map(
    (clip) => buildClipStatic(resolvedAtPath(resolved, clip.key), clip, parsed.duration)
  );
}
function computeStaticTimeline(parsed, flatValues) {
  let clips = computeStaticClips(parsed, flatValues);
  const tailByKey = new Map(parsed.clips.map((clip) => [clip.key, clip.tail ?? 0]));
  const maxEnd = clips.reduce(
    (end, clip) => Math.max(end, clip.at + clip.duration + (tailByKey.get(clip.key) ?? 0)),
    parsed.duration
  );
  const duration = maxEnd > parsed.duration ? Math.ceil(maxEnd * 100 - 1e-4) / 100 : parsed.duration;
  if (duration !== parsed.duration) {
    clips = clips.map(
      (clip) => clip.loop === "repeat" ? { ...clip, end: duration } : clip
    );
  }
  return { duration, clips };
}
function computeClipStaticFromValues(values, clip, timelineDuration) {
  return buildClipStatic(unflattenClipValues(values, clip.key), clip, timelineDuration);
}
function buildClipStatic(clipResolved, clip, timelineDuration) {
  {
    const at = typeof clipResolved.at === "number" ? clipResolved.at : 0;
    const from = isPlainObject(clipResolved.from) ? clipResolved.from : void 0;
    const single = isTransitionConfig(clipResolved.transition) ? clipResolved.transition : void 0;
    const staticClip = {
      key: clip.key,
      childKey: clip.group ? clip.key.slice(clip.group.length + 1) : clip.key,
      group: clip.group,
      at,
      duration: 0,
      loop: "off",
      end: 0,
      isPhysics: false,
      from,
      tracks: [],
      explicitSteps: Boolean(clip.stepKeys?.length)
    };
    if (clip.tracks?.length) {
      const tracks = clip.tracks.map(({ prop, stepKeys }) => {
        const trackResolved = isPlainObject(clipResolved[prop]) ? clipResolved[prop] : {};
        const delay = typeof trackResolved.delay === "number" ? trackResolved.delay : 0;
        const fromValue = trackResolved.from;
        let steps;
        let trackDuration = 0;
        if (stepKeys?.length) {
          let running = fromValue;
          steps = stepKeys.map((stepKey) => {
            const stepResolved = isPlainObject(trackResolved[stepKey]) ? trackResolved[stepKey] : {};
            const storedDuration = typeof stepResolved.duration === "number" ? stepResolved.duration : 0;
            const raw = isTransitionConfig(stepResolved.transition) ? stepResolved.transition : void 0;
            const effective = raw ? resolveClipTransition(raw, storedDuration) : { transition: void 0, duration: storedDuration, isPhysics: false };
            const toValue = stepResolved.to;
            const step = {
              key: stepKey,
              offset: trackDuration,
              duration: effective.duration,
              isPhysics: effective.isPhysics,
              start: running === void 0 ? {} : { [prop]: running },
              to: toValue === void 0 ? {} : { [prop]: toValue },
              curve: curveStatic(effective.transition, effective.duration)
            };
            if (toValue !== void 0) running = toValue;
            trackDuration += effective.duration;
            return step;
          });
        } else {
          const storedDuration = typeof trackResolved.duration === "number" ? trackResolved.duration : 0;
          const raw = isTransitionConfig(trackResolved.transition) ? trackResolved.transition : void 0;
          const effective = raw ? resolveClipTransition(raw, storedDuration) : { transition: void 0, duration: storedDuration, isPhysics: false };
          const toValue = trackResolved.to;
          trackDuration = effective.duration;
          steps = [
            {
              key: null,
              offset: 0,
              duration: effective.duration,
              isPhysics: effective.isPhysics,
              start: fromValue === void 0 ? {} : { [prop]: fromValue },
              to: toValue === void 0 ? {} : { [prop]: toValue },
              curve: curveStatic(effective.transition, effective.duration)
            }
          ];
        }
        return { prop, delay, duration: trackDuration, steps };
      });
      staticClip.tracks = tracks;
      staticClip.props = tracks.map((track) => track.prop);
      staticClip.duration = tracks.reduce((max, track) => Math.max(max, track.delay + track.duration), 0);
      staticClip.from = Object.fromEntries(
        tracks.map((track) => [track.prop, track.steps[0].start[track.prop]])
      );
      staticClip.to = Object.fromEntries(
        tracks.map((track) => {
          const last = track.steps[track.steps.length - 1];
          return [track.prop, last.to[track.prop] ?? last.start[track.prop]];
        })
      );
      staticClip.loop = staticClip.duration > 0 ? clip.loop : "off";
      staticClip.end = staticClip.loop === "off" ? staticClip.at + staticClip.duration : timelineDuration;
      return staticClip;
    }
    if (clip.stepKeys?.length) {
      let running = { ...from ?? {} };
      let offset = 0;
      const steps = clip.stepKeys.map((stepKey) => {
        const stepResolved = isPlainObject(clipResolved[stepKey]) ? clipResolved[stepKey] : {};
        const storedDuration = typeof stepResolved.duration === "number" ? stepResolved.duration : 0;
        const raw = isTransitionConfig(stepResolved.transition) ? stepResolved.transition : void 0;
        const effective = raw ? resolveClipTransition(raw, storedDuration) : { transition: void 0, duration: storedDuration, isPhysics: false };
        const to = isPlainObject(stepResolved.to) ? stepResolved.to : {};
        const step = {
          key: stepKey,
          offset,
          duration: effective.duration,
          isPhysics: effective.isPhysics,
          start: running,
          to,
          curve: curveStatic(effective.transition, effective.duration)
        };
        running = { ...running, ...to };
        offset += effective.duration;
        return step;
      });
      staticClip.tracks = [{ delay: 0, duration: offset, steps }];
      staticClip.duration = offset;
      staticClip.to = running;
    } else {
      const storedDuration = typeof clipResolved.duration === "number" ? clipResolved.duration : 0;
      const to = isPlainObject(clipResolved.to) ? clipResolved.to : void 0;
      if (single) {
        const effective = resolveClipTransition(single, storedDuration);
        staticClip.duration = effective.duration;
        staticClip.isPhysics = effective.isPhysics;
        staticClip.transition = effective.transition;
        staticClip.css = transitionToCss(effective.transition);
        staticClip.to = to;
        if (from && to) {
          staticClip.tracks = [
            {
              delay: 0,
              duration: effective.duration,
              steps: [
                {
                  key: null,
                  offset: 0,
                  duration: effective.duration,
                  isPhysics: effective.isPhysics,
                  start: from,
                  to,
                  curve: curveStatic(effective.transition, effective.duration)
                }
              ]
            }
          ];
        }
      } else {
        staticClip.duration = storedDuration;
        staticClip.to = to;
        if (from && to) {
          const base = resolveClipTransition(DEFAULT_CLIP_TRANSITION, storedDuration);
          staticClip.duration = base.duration;
          staticClip.tracks = [
            {
              delay: 0,
              duration: base.duration,
              steps: [
                {
                  key: null,
                  offset: 0,
                  duration: base.duration,
                  isPhysics: false,
                  start: from,
                  to,
                  curve: curveStatic(base.transition, base.duration)
                }
              ]
            }
          ];
        }
      }
    }
    if (staticClip.tracks.length) {
      const props = new Set(Object.keys(from ?? {}));
      for (const track of staticClip.tracks) {
        for (const step of track.steps) {
          for (const prop of Object.keys(step.to)) props.add(prop);
        }
      }
      staticClip.props = Array.from(props);
    }
    staticClip.loop = staticClip.duration > 0 ? clip.loop : "off";
    staticClip.end = staticClip.loop === "off" ? staticClip.at + staticClip.duration : timelineDuration;
    return staticClip;
  }
}
function stepAtPosition(steps, pos) {
  for (const step of steps) {
    if (pos < step.offset + step.duration) return step;
  }
  return steps[steps.length - 1];
}
function evalPropAtPos(steps, prop, pos) {
  const step = stepAtPosition(steps, pos);
  const within = Math.max(0, pos - step.offset);
  if (prop in step.to) {
    const eased = sampleCurve(step.curve, within);
    return interpolateResolved(step.start[prop], step.to[prop], eased);
  }
  return step.start[prop];
}
function computeClipState(clip, time, cycleTime = time) {
  const total = clip.duration;
  const looping = clip.loop === "repeat" && total > 0;
  const started = time >= clip.at || looping && cycleTime > time;
  const done = time >= clip.end;
  const elapsed = time - clip.at;
  const phaseElapsed = looping ? cycleTime - clip.at : elapsed;
  const fold = (e2) => looping ? e2 % total : e2;
  const basePos = started ? fold(Math.max(0, phaseElapsed)) : 0;
  const progress = total > 0 ? clamp(basePos / total, 0, 1) : started ? 1 : 0;
  let current;
  let stepIndex = 0;
  if (clip.tracks.length && clip.props?.length) {
    current = {};
    for (const track of clip.tracks) {
      const props = track.prop !== void 0 ? [track.prop] : clip.props;
      for (const prop of props) {
        const startValue = track.steps[0]?.start[prop];
        if (!started) {
          if (startValue !== void 0) current[prop] = startValue;
          continue;
        }
        const phase = phaseElapsed - track.delay;
        if (phase <= 0) {
          if (startValue !== void 0) current[prop] = startValue;
          continue;
        }
        const pos = looping && track.duration > 0 ? phase % track.duration : phase;
        const value = evalPropAtPos(track.steps, prop, pos);
        if (value !== void 0) current[prop] = value;
      }
    }
    const shared = clip.tracks[0];
    if (started && clip.explicitSteps && shared.prop === void 0) {
      stepIndex = shared.steps.indexOf(stepAtPosition(shared.steps, basePos));
    }
  }
  return {
    at: clip.at,
    duration: clip.duration,
    loop: clip.loop,
    started,
    active: started && !done,
    done,
    progress,
    step: clip.explicitSteps ? stepIndex : void 0,
    from: clip.from,
    to: clip.to,
    animate: started ? clip.to : clip.from,
    transition: clip.transition,
    css: clip.css,
    current
  };
}
function interpolateResolved(from, to, p2) {
  if (typeof from === "number" && typeof to === "number") {
    return from + (to - from) * p2;
  }
  if (typeof from === "string" && typeof to === "string") {
    const mixed = mixHexColors(from, to, p2);
    if (mixed) return mixed;
  }
  if (isPlainObject(from) && isPlainObject(to)) {
    const result = {};
    for (const key of Object.keys(from)) {
      result[key] = key in to ? interpolateResolved(from[key], to[key], p2) : from[key];
    }
    for (const key of Object.keys(to)) {
      if (!(key in from)) result[key] = to[key];
    }
    return result;
  }
  return p2 < 0.5 ? from : to;
}
function parseHex(hex) {
  if (!isHexColor(hex)) return null;
  let h2 = hex.slice(1);
  if (h2.length === 3) h2 = h2.split("").map((c2) => c2 + c2).join("");
  return [
    parseInt(h2.slice(0, 2), 16),
    parseInt(h2.slice(2, 4), 16),
    parseInt(h2.slice(4, 6), 16),
    h2.length === 8 ? parseInt(h2.slice(6, 8), 16) : 255
  ];
}
function mixHexColors(a2, b2, p2) {
  const ca = parseHex(a2);
  const cb = parseHex(b2);
  if (!ca || !cb) return null;
  const t2 = clamp(p2, 0, 1);
  const mixed = ca.map((v2, i2) => Math.round(v2 + (cb[i2] - v2) * t2));
  const hex = (n2) => n2.toString(16).padStart(2, "0");
  const rgb = `#${hex(mixed[0])}${hex(mixed[1])}${hex(mixed[2])}`;
  return mixed[3] === 255 ? rgb : `${rgb}${hex(mixed[3])}`;
}
function transitionToCss(transition) {
  if (!transition) return void 0;
  if (transition.type === "easing") {
    return {
      transitionDuration: `${round2(transition.duration)}s`,
      transitionTimingFunction: `cubic-bezier(${transition.ease.map((v2) => round2(v2)).join(", ")})`
    };
  }
  const params = springParams(transition);
  const dampingRatio = params.damping / (2 * Math.sqrt(params.stiffness * params.mass));
  const duration = transition.visualDuration ?? springSettleDuration(params);
  const bounce = transition.bounce ?? Math.max(0, round2(1 - dampingRatio));
  return {
    transitionDuration: `${round2(duration)}s`,
    transitionTimingFunction: bounce > 0.05 ? `cubic-bezier(0.34, ${round2(1.2 + bounce)}, 0.64, 1)` : "cubic-bezier(0.25, 0.6, 0.35, 1)"
  };
}
function timelinePopoverDisplayValues(values, clipKey, stepKeys, stepKey) {
  const display = { ...values };
  const swap = (path, duration) => {
    const raw = display[path];
    if (isTransitionConfig(raw)) display[path] = resolveClipTransition(raw, duration).transition;
  };
  if (stepKey) {
    swap(`${clipKey}.${stepKey}.transition`, numberValue(values[`${clipKey}.${stepKey}.duration`]));
    return display;
  }
  const cycle = stepKeys?.length ? stepKeys.reduce((sum, sk) => sum + numberValue(values[`${clipKey}.${sk}.duration`]), 0) : numberValue(values[`${clipKey}.duration`]);
  swap(`${clipKey}.transition`, cycle);
  return display;
}
function numberValue(value) {
  return typeof value === "number" ? value : 0;
}
function unflattenClipValues(values, clipKey) {
  const prefix = `${clipKey}.`;
  const result = {};
  const entries = Object.entries(values).filter(([path]) => path.startsWith(prefix)).map(([path, value]) => ({ segments: path.slice(prefix.length).split("."), value })).sort((a2, b2) => a2.segments.length - b2.segments.length);
  for (const { segments, value } of entries) {
    let node = result;
    for (let i2 = 0; i2 < segments.length - 1; i2++) {
      const existing = node[segments[i2]];
      node = isPlainObject(existing) ? existing : node[segments[i2]] = {};
    }
    node[segments[segments.length - 1]] = cloneTimelineValue(value);
  }
  return result;
}
function cloneTimelineValue(value) {
  if (Array.isArray(value)) return value.map(cloneTimelineValue);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, cloneTimelineValue(nested)])
  );
}
function clampTrackDelay(delay, at, trackDuration, timelineDuration) {
  return clamp(round2(delay), 0, Math.max(0, round2(timelineDuration - at - trackDuration)));
}
function clampClipMove(at, duration, timelineDuration) {
  return clamp(round2(at), 0, Math.max(0, timelineDuration - duration));
}
function clampClipResizeEnd(duration, at, timelineDuration) {
  return clamp(round2(duration), TIMELINE_MIN_CLIP_DURATION, timelineDuration - at);
}
function clampClipResizeStart(newAt, at, duration) {
  const clampedAt = clamp(round2(newAt), 0, at + duration - TIMELINE_MIN_CLIP_DURATION);
  return { at: clampedAt, duration: round2(at + duration - clampedAt) };
}
function singleTrackMoveBounds(clips) {
  let lo = Number.NEGATIVE_INFINITY;
  let hi = Number.POSITIVE_INFINITY;
  for (let i2 = 0; i2 < clips.length; i2++) {
    if (!clips[i2].selected) continue;
    const prev = clips[i2 - 1];
    if (i2 === 0) lo = Math.max(lo, -clips[i2].at);
    else if (!prev.selected) lo = Math.max(lo, prev.at + prev.duration - clips[i2].at);
    const next = clips[i2 + 1];
    if (next && !next.selected) hi = Math.min(hi, next.at - (clips[i2].at + clips[i2].duration));
  }
  return { lo, hi };
}
function singleTrackMoveDelta(clips, delta) {
  const { lo, hi } = singleTrackMoveBounds(clips);
  if (lo > hi) return 0;
  return clamp(delta, lo, hi);
}
var SNAP_EPS = 1e-9;
function singleTrackSnapTargets(clips, playhead) {
  const out = /* @__PURE__ */ new Set();
  for (const clip of clips) {
    if (clip.selected) continue;
    out.add(round2(clip.at));
    out.add(round2(clip.at + clip.duration));
    if ((clip.tail ?? 0) > 0) out.add(round2(clip.at + clip.duration + (clip.tail ?? 0)));
  }
  if (playhead !== void 0) out.add(round2(playhead));
  return [...out].sort((a2, b2) => a2 - b2);
}
function singleTrackBlockPoints(clips) {
  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  let tailEnd = Number.NEGATIVE_INFINITY;
  for (const clip of clips) {
    if (!clip.selected) continue;
    start = Math.min(start, clip.at);
    end = Math.max(end, clip.at + clip.duration);
    if ((clip.tail ?? 0) > 0) tailEnd = Math.max(tailEnd, clip.at + clip.duration + (clip.tail ?? 0));
  }
  if (!Number.isFinite(start)) return [];
  const points = [start, end];
  if (tailEnd > end + SNAP_EPS) points.push(tailEnd);
  return points;
}
function singleTrackSteppedMoveDelta(clips, delta, targets) {
  const { lo, hi } = singleTrackMoveBounds(clips);
  if (lo > hi) return 0;
  let best = null;
  for (const point of singleTrackBlockPoints(clips)) {
    for (const target of targets) {
      const d2 = target - point;
      if (d2 < lo - SNAP_EPS || d2 > hi + SNAP_EPS) continue;
      if (best === null || Math.abs(d2 - delta) < Math.abs(best - delta)) best = d2;
    }
  }
  return best === null ? singleTrackMoveDelta(clips, delta) : round2(clamp(best, lo, hi));
}
function singleTrackSteppedResizeEnd(span, nextStart, delta, targets) {
  const wanted = span.duration + delta;
  const max = nextStart === void 0 ? Number.POSITIVE_INFINITY : nextStart - span.at;
  const tail = span.tail ?? 0;
  let best = null;
  for (const target of targets) {
    const candidates = [target - span.at];
    if (tail > 0) candidates.push(target - span.at - tail);
    for (const d2 of candidates) {
      if (d2 < TIMELINE_MIN_CLIP_DURATION - SNAP_EPS || d2 > max + SNAP_EPS) continue;
      if (best === null || Math.abs(d2 - wanted) < Math.abs(best - wanted)) best = d2;
    }
  }
  return best === null ? clampSingleTrackResizeEnd(wanted, span.at, nextStart) : clampSingleTrackResizeEnd(best, span.at, nextStart);
}
function singleTrackSteppedResizeStart(span, prevEnd, delta, targets) {
  const wanted = span.at + delta;
  const floor = Math.max(0, prevEnd ?? 0);
  const ceil = span.at + span.duration - TIMELINE_MIN_CLIP_DURATION;
  let best = null;
  for (const target of targets) {
    if (target < floor - SNAP_EPS || target > ceil + SNAP_EPS) continue;
    if (best === null || Math.abs(target - wanted) < Math.abs(best - wanted)) best = target;
  }
  return clampSingleTrackResizeStart(best ?? wanted, span.at, span.duration, prevEnd);
}
function singleTrackReorderAts(clips, slot) {
  const gaps = clips.map(
    (clip, i2) => i2 === 0 ? clip.at : clip.at - (clips[i2 - 1].at + clips[i2 - 1].duration)
  );
  const selectedRun = clips.filter((clip) => clip.selected);
  const others = clips.filter((clip) => !clip.selected);
  const boundedSlot = Math.max(0, Math.min(others.length, Math.round(slot)));
  const nextOrder = [
    ...others.slice(0, boundedSlot),
    ...selectedRun,
    ...others.slice(boundedSlot)
  ];
  const ats = {};
  let cursor = 0;
  nextOrder.forEach((clip, i2) => {
    const at = round2(cursor + gaps[i2]);
    ats[clip.key] = at;
    cursor = at + clip.duration;
  });
  return ats;
}
function clampSingleTrackResizeEnd(duration, at, nextStart) {
  const max = nextStart === void 0 ? Number.POSITIVE_INFINITY : Math.max(TIMELINE_MIN_CLIP_DURATION, nextStart - at);
  return clamp(round2(duration), TIMELINE_MIN_CLIP_DURATION, max);
}
function clampSingleTrackResizeStart(newAt, at, duration, prevEnd) {
  const floor = Math.max(0, prevEnd ?? 0);
  const clampedAt = clamp(round2(newAt), floor, at + duration - TIMELINE_MIN_CLIP_DURATION);
  return { at: clampedAt, duration: round2(at + duration - clampedAt) };
}
function clampStepResize(duration, at, otherStepsTotal, timelineDuration) {
  const max = Math.max(TIMELINE_MIN_CLIP_DURATION, timelineDuration - at - otherStepsTotal);
  return clamp(round2(duration), TIMELINE_MIN_CLIP_DURATION, max);
}
function normalizeTimelineValuesForCopy(values, clips) {
  const normalized = { ...values };
  for (const path of Object.keys(normalized)) {
    if (path.endsWith(".__mode")) delete normalized[path];
  }
  const normalizeTransitionAt = (transitionPath, durationPath) => {
    const raw = normalized[transitionPath];
    if (!isTransitionConfig(raw)) return;
    if (isPhysicsSpring(raw)) {
      normalized[durationPath] = transitionDefaultDuration(raw);
    }
    normalized[transitionPath] = normalizeStoredTransition(
      raw,
      numberValue(normalized[durationPath])
    );
  };
  for (const clip of clips) {
    for (const stepKey of clip.stepKeys ?? []) {
      normalizeTransitionAt(
        `${clip.key}.${stepKey}.transition`,
        `${clip.key}.${stepKey}.duration`
      );
    }
    normalizeTransitionAt(`${clip.key}.transition`, `${clip.key}.duration`);
    for (const track of clip.tracks ?? []) {
      const trackKey = `${clip.key}.${track.prop}`;
      for (const stepKey of track.stepKeys ?? []) {
        normalizeTransitionAt(
          `${trackKey}.${stepKey}.transition`,
          `${trackKey}.${stepKey}.duration`
        );
      }
      normalizeTransitionAt(`${trackKey}.transition`, `${trackKey}.duration`);
      if (normalized[`${trackKey}.delay`] === 0) {
        delete normalized[`${trackKey}.delay`];
      }
    }
    delete normalized[`${clip.key}.loop`];
  }
  return normalized;
}
function formatClock(time, tenths = false) {
  const safe = Math.max(0, time);
  const minutes = Math.floor(safe / 60);
  const seconds = safe - minutes * 60;
  const secondsText = tenths ? seconds.toFixed(1).padStart(4, "0") : String(Math.floor(seconds)).padStart(2, "0");
  return `${String(minutes).padStart(2, "0")}:${secondsText}`;
}
function formatSeconds(value) {
  return `${round2(value)}s`;
}
function formatStepLabel(stepKey) {
  const match = /^step(\d+)$/.exec(stepKey);
  return match ? `Step ${match[1]}` : formatLabel(stepKey);
}

// src/timeline/adapter.ts
function resolveTimelineLoop(loop) {
  if (typeof loop === "object" && loop !== null) {
    return {
      enabled: true,
      start: Number.isFinite(loop.from) ? Math.max(0, loop.from) : 0
    };
  }
  return { enabled: Boolean(loop), start: 0 };
}
function buildTimelineMeta(id, name, duration, parsed, loop, track, pinStart) {
  const resolvedLoop = resolveTimelineLoop(loop);
  return {
    id,
    name,
    duration,
    loop: resolvedLoop.enabled,
    loopStart: resolvedLoop.start,
    clips: parsed.clips,
    ...track === "single" ? { singleTrack: true } : {},
    ...track === "single" && pinStart ? { pinStart: true } : {}
  };
}
function buildTimelineValues(staticClips, transport, timelineDuration, loopStart, actions) {
  var _a;
  const result = {
    time: transport.time,
    playing: transport.playing,
    duration: timelineDuration,
    ...actions
  };
  const span = loopSpan(transport.duration, loopStart);
  const cycleTime = (span > 0 ? transport.wraps * span : 0) + transport.time;
  for (const clip of staticClips) {
    const state = computeClipState(clip, transport.time, cycleTime);
    if (clip.group) {
      const bucket = result[_a = clip.group] ?? (result[_a] = {});
      bucket[clip.childKey] = state;
    } else {
      result[clip.key] = state;
    }
  }
  return result;
}

// src/hooks/useDialTimeline.ts
function useDialTimeline(name, config, options) {
  const serializedConfig = useSerialized(config);
  const parsed = (0, import_react25.useMemo)(() => parseTimelineConfig(config), [serializedConfig]);
  const { panelId, flatValues } = useDialStorePanel(name, parsed.dialConfig, {
    id: options?.id,
    persist: options?.persist,
    kind: "timeline",
    presetsEditable: options?.presetsEditable,
    presetsLockable: options?.presetsLockable
  });
  const staticTimeline = (0, import_react25.useMemo)(
    () => computeStaticTimeline(parsed, flatValues),
    [parsed, flatValues]
  );
  const timelineDuration = staticTimeline.duration;
  const staticClips = staticTimeline.clips;
  const parsedRef = (0, import_react25.useRef)(parsed);
  parsedRef.current = parsed;
  const optionsRef = (0, import_react25.useRef)(options);
  optionsRef.current = options;
  const { start: loopStart } = resolveTimelineLoop(options?.loop);
  const buildMeta = (0, import_react25.useCallback)(
    () => buildTimelineMeta(
      panelId,
      name,
      timelineDuration,
      parsedRef.current,
      options?.loop,
      options?.track,
      options?.pinStart
    ),
    [panelId, name, timelineDuration, options?.loop, options?.track, options?.pinStart]
  );
  const buildMetaRef = (0, import_react25.useRef)(buildMeta);
  buildMetaRef.current = buildMeta;
  (0, import_react25.useEffect)(() => {
    TimelineStore.register(buildMetaRef.current(), { autoplay: optionsRef.current?.autoplay ?? true });
    return () => TimelineStore.unregister(panelId);
  }, [panelId, name]);
  const mountedRef = (0, import_react25.useRef)(false);
  (0, import_react25.useEffect)(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    TimelineStore.update(buildMeta());
  }, [buildMeta, parsed]);
  const subscribeTransport = (0, import_react25.useCallback)(
    (callback) => TimelineStore.subscribe(panelId, callback),
    [panelId]
  );
  const getTransport = (0, import_react25.useCallback)(() => TimelineStore.getTransport(panelId), [panelId]);
  const transport = (0, import_react25.useSyncExternalStore)(subscribeTransport, getTransport, getTransport);
  const play = (0, import_react25.useCallback)(() => TimelineStore.play(panelId), [panelId]);
  const pause = (0, import_react25.useCallback)(() => TimelineStore.pause(panelId), [panelId]);
  const replay = (0, import_react25.useCallback)(() => TimelineStore.replay(panelId), [panelId]);
  const seek = (0, import_react25.useCallback)((time) => TimelineStore.seek(panelId, time), [panelId]);
  return (0, import_react25.useMemo)(
    () => buildTimelineValues(staticClips, transport, timelineDuration, loopStart, {
      play,
      pause,
      replay,
      seek
    }),
    [staticClips, transport, timelineDuration, loopStart, play, pause, replay, seek]
  );
}

// src/components/Timeline/DialTimeline.tsx
var import_react26 = require("react");
var import_react_dom5 = require("react-dom");
var import_react27 = require("motion/react");
var import_jsx_runtime18 = require("react/jsx-runtime");
var DRAG_THRESHOLD_PX = 3;
var SINGLE_LIFT_PX = 12;
var SINGLE_TAIL_TUCK_PX = 8;
var MAJOR_TICK_TARGET_PX = 140;
var MILLISECOND_STEP = 1e-3;
var SECOND_TICK_STEPS = [
  1e-3,
  2e-3,
  5e-3,
  0.01,
  0.02,
  0.05,
  0.1,
  0.2,
  0.5,
  1,
  2,
  5,
  10,
  15,
  30,
  60,
  120,
  300,
  600
];
var MIN_TIMELINE_MAX_ZOOM = 8;
var PLAYHEAD_FLAG_WIDTH = 38;
var PLAYHEAD_FLAG_EDGE_OVERHANG = 1;
var POPOVER_WIDTH = 280;
var ZOOM_DRAG_DISTANCE = 180;
var ZOOM_WHEEL_DISTANCE = 240;
var DEFAULT_DOCK_MAX_HEIGHT = 400;
var MIN_DOCK_MAX_HEIGHT = 120;
var subscribeGlobalTimelines = (callback) => TimelineStore.subscribeGlobal(callback);
var getTimelines = () => TimelineStore.getTimelines();
var subscribeTimelineVisibility = (callback) => TimelineUiStore.subscribe(callback);
var getTimelineVisibility = () => TimelineUiStore.getVisible();
var DialTimeline = (0, import_react26.memo)(function DialTimeline2({
  theme = "system",
  defaultVisible = true,
  visible,
  onVisibilityChange,
  defaultOpen = true,
  productionEnabled = isDevDefault
}) {
  if (!productionEnabled) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
    DialTimelineDock,
    {
      theme,
      defaultVisible,
      visible,
      onVisibilityChange,
      defaultOpen
    }
  );
});
function DialTimelineDock({
  theme,
  defaultVisible,
  visible,
  onVisibilityChange,
  defaultOpen
}) {
  const [mounted, setMounted] = (0, import_react26.useState)(false);
  const [dockMaxHeight, setDockMaxHeight] = (0, import_react26.useState)(DEFAULT_DOCK_MAX_HEIGHT);
  const visibilityControllerId = (0, import_react26.useRef)(/* @__PURE__ */ Symbol("dialkit-timeline-visibility"));
  const dockRef = (0, import_react26.useRef)(null);
  const resizeCleanupRef = (0, import_react26.useRef)(null);
  (0, import_react26.useEffect)(() => TimelineUiStore.registerController(visibilityControllerId.current, {
    visible,
    defaultVisible,
    onVisibilityChange
  }), []);
  (0, import_react26.useEffect)(() => {
    TimelineUiStore.updateController(visibilityControllerId.current, {
      visible,
      defaultVisible,
      onVisibilityChange
    });
  }, [defaultVisible, onVisibilityChange, visible]);
  (0, import_react26.useEffect)(() => {
    setMounted(true);
  }, []);
  (0, import_react26.useEffect)(() => () => resizeCleanupRef.current?.(), []);
  const handleResizePointerDown = (0, import_react26.useCallback)((e2) => {
    const dock = dockRef.current;
    if (!dock) return;
    e2.preventDefault();
    e2.stopPropagation();
    resizeCleanupRef.current?.();
    const pointerY = e2.clientY;
    const startHeight = dock.getBoundingClientRect().height;
    const handlePointerMove = (event) => {
      event.preventDefault();
      const viewportMax = Math.max(MIN_DOCK_MAX_HEIGHT, window.innerHeight - 24);
      setDockMaxHeight(clamp(startHeight + pointerY - event.clientY, MIN_DOCK_MAX_HEIGHT, viewportMax));
    };
    const finishResize = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishResize);
      window.removeEventListener("pointercancel", finishResize);
      resizeCleanupRef.current = null;
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", finishResize);
    window.addEventListener("pointercancel", finishResize);
    resizeCleanupRef.current = finishResize;
  }, []);
  const timelines = (0, import_react26.useSyncExternalStore)(subscribeGlobalTimelines, getTimelines, getTimelines);
  const dockVisible = (0, import_react26.useSyncExternalStore)(
    subscribeTimelineVisibility,
    getTimelineVisibility,
    getTimelineVisibility
  );
  (0, import_react26.useEffect)(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const root = document.documentElement;
    const publish = () => {
      const rect = dock.getBoundingClientRect();
      const clearance = rect.height > 0 ? Math.round(window.innerHeight - rect.top) : 0;
      root.style.setProperty("--dialkit-timeline-clearance", `${Math.max(0, clearance)}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(dock);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--dialkit-timeline-clearance");
    };
  }, [dockVisible, timelines.length > 0, mounted]);
  if (!mounted || typeof window === "undefined" || timelines.length === 0) {
    return null;
  }
  return (0, import_react_dom5.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "dialkit-root dialkit-timeline", "data-theme": theme, hidden: !dockVisible, children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        "div",
        {
          className: "dialkit-timeline-resize-handle",
          onPointerDown: handleResizePointerDown,
          role: "separator",
          "aria-label": "Resize timeline height",
          "aria-orientation": "horizontal",
          title: "Drag to resize timeline"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        "div",
        {
          ref: dockRef,
          className: "dialkit-timeline-dock",
          style: { maxHeight: `min(${dockMaxHeight}px, calc(100vh - 24px))` },
          children: timelines.map((timeline) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            TimelineSection,
            {
              meta: timeline,
              defaultOpen,
              theme,
              dockVisible
            },
            timeline.id
          ))
        }
      )
    ] }),
    document.body
  );
}
function useTransportSubscribe(id) {
  return (0, import_react26.useCallback)((callback) => TimelineStore.subscribe(id, callback), [id]);
}
function PlayPauseButton({ id }) {
  const subscribe = useTransportSubscribe(id);
  const getPlaying = (0, import_react26.useCallback)(() => TimelineStore.getTransport(id).playing, [id]);
  const playing = (0, import_react26.useSyncExternalStore)(subscribe, getPlaying, getPlaying);
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
    import_react27.motion.button,
    {
      className: "dialkit-toolbar-add",
      onClick: () => playing ? TimelineStore.pause(id) : TimelineStore.play(id),
      title: playing ? "Pause" : "Play",
      "aria-label": playing ? "Pause" : "Play",
      whileTap: { scale: 0.9 },
      transition: { type: "spring", visualDuration: 0.15, bounce: 0.3 },
      children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { position: "relative", width: 16, height: 16 }, children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(import_react27.AnimatePresence, { initial: false, mode: "wait", children: playing ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        import_react27.motion.svg,
        {
          viewBox: "0 0 24 24",
          fill: "none",
          "aria-hidden": "true",
          style: { position: "absolute", inset: 0, width: 16, height: 16, color: "var(--dial-text-label)" },
          initial: { scale: 0.8, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 0.8, opacity: 0 },
          transition: { duration: 0.08 },
          children: ICON_PAUSE.map((d2, i2) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: d2, fill: "currentColor" }, i2))
        },
        "pause"
      ) : /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        import_react27.motion.svg,
        {
          viewBox: "0 0 24 24",
          fill: "none",
          "aria-hidden": "true",
          style: { position: "absolute", inset: 0, width: 16, height: 16, color: "var(--dial-text-label)" },
          initial: { scale: 0.8, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 0.8, opacity: 0 },
          transition: { duration: 0.08 },
          children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: ICON_PLAY, fill: "currentColor" })
        },
        "play"
      ) }) })
    }
  );
}
function ReplayButton({ onReplay }) {
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
    import_react27.motion.button,
    {
      className: "dialkit-toolbar-add",
      onClick: onReplay,
      title: "Replay",
      "aria-label": "Replay",
      whileTap: { scale: 0.9 },
      transition: { type: "spring", visualDuration: 0.15, bounce: 0.3 },
      children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("svg", { viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: ICON_REPLAY.map((d2, i2) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: d2, fill: "currentColor" }, i2)) })
    }
  );
}
function LoopButton({ id, loop }) {
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
    import_react27.motion.button,
    {
      className: "dialkit-toolbar-add dialkit-timeline-toolbar-toggle",
      onClick: () => TimelineStore.setLoop(id, !loop),
      title: loop ? "Loop on" : "Loop off",
      "aria-label": "Toggle loop",
      "aria-pressed": loop,
      "data-active": loop || void 0,
      whileTap: { scale: 0.9 },
      transition: { type: "spring", visualDuration: 0.15, bounce: 0.3 },
      children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { opacity: loop ? 1 : 0.45 }, children: ICON_LOOP.map((d2, i2) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: d2 }, i2)) })
    }
  );
}
function TimelinePlayheadFlag({
  id,
  duration,
  pxPerSecond,
  viewStart,
  viewEnd,
  laneWidth,
  rulerRef,
  onResetView
}) {
  const subscribe = useTransportSubscribe(id);
  const getTime = (0, import_react26.useCallback)(() => TimelineStore.getTransport(id).time, [id]);
  const time = (0, import_react26.useSyncExternalStore)(subscribe, getTime, getTime);
  const scrubRef = (0, import_react26.useRef)(null);
  const cleanupScrubRef = (0, import_react26.useRef)(null);
  const seekFromClientX = (0, import_react26.useCallback)((clientX) => {
    const rect = scrubRef.current?.rect;
    const scrub = scrubRef.current;
    const contentWidth = rect?.width ?? 0;
    if (!rect || !scrub || contentWidth <= 0) return;
    const nextTime = clamp(
      scrub.viewStart + (clientX - rect.left) / contentWidth * (scrub.viewEnd - scrub.viewStart),
      scrub.viewStart,
      scrub.viewEnd
    );
    TimelineStore.seek(id, nextTime);
  }, [id]);
  const handlePointerDown = (0, import_react26.useCallback)((e2) => {
    const rect = rulerRef.current?.getBoundingClientRect();
    if (!rect) return;
    e2.preventDefault();
    e2.stopPropagation();
    cleanupScrubRef.current?.();
    const resetView = e2.shiftKey;
    scrubRef.current = {
      wasPlaying: TimelineStore.getTransport(id).playing,
      rect,
      viewStart: resetView ? 0 : viewStart,
      viewEnd: resetView ? duration : viewEnd
    };
    if (resetView) onResetView();
    TimelineStore.pause(id);
    seekFromClientX(e2.clientX);
    const handleWindowPointerMove = (event) => {
      event.preventDefault();
      seekFromClientX(event.clientX);
    };
    const finishWindowScrub = () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", finishWindowScrub);
      window.removeEventListener("pointercancel", finishWindowScrub);
      if (scrubRef.current?.wasPlaying) TimelineStore.play(id);
      scrubRef.current = null;
      cleanupScrubRef.current = null;
    };
    window.addEventListener("pointermove", handleWindowPointerMove, { passive: false });
    window.addEventListener("pointerup", finishWindowScrub);
    window.addEventListener("pointercancel", finishWindowScrub);
    cleanupScrubRef.current = finishWindowScrub;
  }, [duration, id, onResetView, rulerRef, seekFromClientX, viewEnd, viewStart]);
  (0, import_react26.useEffect)(() => () => cleanupScrubRef.current?.(), []);
  if (time < viewStart || time > viewEnd || laneWidth <= 0) return null;
  const x = clamp(
    (time - viewStart) * pxPerSecond,
    0,
    laneWidth
  );
  const flagCenter = clamp(
    x,
    PLAYHEAD_FLAG_WIDTH / 2 - PLAYHEAD_FLAG_EDGE_OVERHANG,
    laneWidth - PLAYHEAD_FLAG_WIDTH / 2 + PLAYHEAD_FLAG_EDGE_OVERHANG
  );
  const flagOffset = flagCenter - x;
  const edge = flagOffset > 0.5 ? "start" : flagOffset < -0.5 ? "end" : "center";
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
    "div",
    {
      className: "dialkit-timeline-playhead-control",
      "data-edge": edge,
      style: {
        left: `calc(var(--dial-timeline-label-w) + ${x}px)`,
        "--dial-timeline-playhead-flag-offset": `${flagOffset}px`
      },
      onPointerDown: handlePointerDown,
      role: "slider",
      "aria-label": "Timeline current time",
      "aria-valuemin": 0,
      "aria-valuemax": duration,
      "aria-valuenow": time,
      title: "Drag to scrub the timeline",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-playhead-stem" }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-playhead-anchor", children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-playhead-flag", children: time.toFixed(2) }) })
      ]
    }
  );
}
function ClipFill({ id, at, duration }) {
  const subscribe = useTransportSubscribe(id);
  const getProgress = (0, import_react26.useCallback)(() => {
    const time = TimelineStore.getTransport(id).time;
    if (duration <= 0) return time >= at ? 1 : 0;
    return clamp((time - at) / duration, 0, 1);
  }, [at, duration, id]);
  const progress = (0, import_react26.useSyncExternalStore)(subscribe, getProgress, getProgress);
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
    "span",
    {
      className: "dialkit-timeline-clip-fill",
      style: { width: `${progress * 100}%` },
      "aria-hidden": "true"
    }
  );
}
function ClipTail({
  id,
  at,
  left,
  width,
  lit
}) {
  const subscribe = useTransportSubscribe(id);
  const getPlayed = (0, import_react26.useCallback)(() => TimelineStore.getTransport(id).time >= at, [at, id]);
  const played = (0, import_react26.useSyncExternalStore)(subscribe, getPlayed, getPlayed);
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
    "span",
    {
      className: "dialkit-timeline-clip-tail",
      "data-lit": lit || played || void 0,
      style: { left, width },
      "aria-hidden": "true"
    }
  );
}
function TimelineOverview({
  id,
  duration,
  viewStart,
  viewEnd,
  onNavigate
}) {
  const subscribe = useTransportSubscribe(id);
  const getTime = (0, import_react26.useCallback)(() => TimelineStore.getTransport(id).time, [id]);
  const time = (0, import_react26.useSyncExternalStore)(subscribe, getTime, getTime);
  const scrubRef = (0, import_react26.useRef)(null);
  const seekFromClientX = (0, import_react26.useCallback)((clientX) => {
    const rect = scrubRef.current?.rect;
    if (!rect || rect.width <= 0 || duration <= 0) return;
    const nextTime = clamp((clientX - rect.left) / rect.width * duration, 0, duration);
    TimelineStore.seek(id, nextTime);
    onNavigate(nextTime);
  }, [duration, id, onNavigate]);
  const handlePointerDown = (0, import_react26.useCallback)((e2) => {
    e2.preventDefault();
    e2.currentTarget.setPointerCapture(e2.pointerId);
    scrubRef.current = {
      wasPlaying: TimelineStore.getTransport(id).playing,
      rect: e2.currentTarget.getBoundingClientRect()
    };
    TimelineStore.pause(id);
    seekFromClientX(e2.clientX);
  }, [id, seekFromClientX]);
  const handlePointerMove = (0, import_react26.useCallback)((e2) => {
    if (scrubRef.current) seekFromClientX(e2.clientX);
  }, [seekFromClientX]);
  const finishScrub = (0, import_react26.useCallback)(() => {
    if (scrubRef.current?.wasPlaying) TimelineStore.play(id);
    scrubRef.current = null;
  }, [id]);
  const viewportLeft = duration > 0 ? viewStart / duration * 100 : 0;
  const viewportWidth = duration > 0 ? (viewEnd - viewStart) / duration * 100 : 100;
  const playheadLeft = duration > 0 ? time / duration * 100 : 0;
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
    "div",
    {
      className: "dialkit-timeline-overview",
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: finishScrub,
      onPointerCancel: finishScrub,
      onLostPointerCapture: finishScrub,
      title: "Drag to scrub the full timeline",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          "div",
          {
            className: "dialkit-timeline-overview-viewport",
            "data-zoomed": viewportWidth < 99.999 || void 0,
            style: { left: `${viewportLeft}%`, width: `${viewportWidth}%` }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-overview-progress", style: { width: `${playheadLeft}%` } }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-overview-playhead", style: { left: `${playheadLeft}%` } })
      ]
    }
  );
}
function clampViewStart(start, duration, visibleDuration) {
  return clamp(start, 0, Math.max(0, duration - visibleDuration));
}
function formatRulerSeconds(time, step) {
  if (step >= 1 && Number.isInteger(time)) return formatClock(time);
  const decimals = Math.min(3, Math.max(1, Math.ceil(-Math.log10(step))));
  return `${time.toFixed(decimals)}s`;
}
var TimelineSection = (0, import_react26.memo)(function TimelineSection2({
  meta,
  defaultOpen,
  theme,
  dockVisible
}) {
  const [open, setOpen] = (0, import_react26.useState)(defaultOpen);
  const [copied, setCopied] = (0, import_react26.useState)(false);
  const [popover, setPopover] = (0, import_react26.useState)(null);
  const [collapsedGroups, setCollapsedGroups] = (0, import_react26.useState)(() => /* @__PURE__ */ new Set());
  const [expandedTracks, setExpandedTracks] = (0, import_react26.useState)(() => /* @__PURE__ */ new Set());
  const [zoom, setZoom] = (0, import_react26.useState)(1);
  const [viewStart, setViewStart] = (0, import_react26.useState)(0);
  const singleTrack = Boolean(meta.singleTrack) && meta.clips.every((clip) => !clip.stepKeys?.length && !clip.tracks?.length && !clip.group);
  const [selectedKeys, setSelectedKeys] = (0, import_react26.useState)(() => /* @__PURE__ */ new Set());
  const selectedKeysRef = (0, import_react26.useRef)(selectedKeys);
  selectedKeysRef.current = selectedKeys;
  const [liftedKeys, setLiftedKeys] = (0, import_react26.useState)(null);
  const [cueTime, setCueTime] = (0, import_react26.useState)(null);
  const singleDragRef = (0, import_react26.useRef)(null);
  const subscribeValues = (0, import_react26.useCallback)(
    (callback) => DialStore.subscribe(meta.id, callback),
    [meta.id]
  );
  const getValues = (0, import_react26.useCallback)(() => DialStore.getValues(meta.id), [meta.id]);
  const values = (0, import_react26.useSyncExternalStore)(subscribeValues, getValues, getValues);
  const presets = DialStore.getPresets(meta.id);
  const activePresetId = DialStore.getActivePresetId(meta.id);
  const laneAreaRef = (0, import_react26.useRef)(null);
  const horizontalScrollRef = (0, import_react26.useRef)(null);
  const [laneWidth, setLaneWidth] = (0, import_react26.useState)(0);
  (0, import_react26.useLayoutEffect)(() => {
    if (!open) return;
    const ruler = laneAreaRef.current;
    if (!ruler) return;
    const measure = () => {
      setLaneWidth(ruler.getBoundingClientRect().width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(ruler);
    return () => observer.disconnect();
  }, [open]);
  const visibleDuration = meta.duration > 0 ? meta.duration / zoom : meta.duration;
  const safeViewStart = clampViewStart(viewStart, meta.duration, visibleDuration);
  const viewEnd = safeViewStart + visibleDuration;
  const pxPerSecond = visibleDuration > 0 && laneWidth > 0 ? laneWidth / visibleDuration : 0;
  const millisecondReadableZoom = laneWidth > 0 && meta.duration > 0 ? MAJOR_TICK_TARGET_PX * meta.duration / (MILLISECOND_STEP * 10 * laneWidth) : MIN_TIMELINE_MAX_ZOOM;
  const maxZoom = Math.max(MIN_TIMELINE_MAX_ZOOM, millisecondReadableZoom);
  (0, import_react26.useEffect)(() => {
    setZoom((current) => clamp(current, 1, maxZoom));
  }, [maxZoom]);
  (0, import_react26.useEffect)(() => {
    setViewStart((current) => clampViewStart(current, meta.duration, meta.duration / zoom));
  }, [meta.duration, zoom]);
  (0, import_react26.useLayoutEffect)(() => {
    const scroller = horizontalScrollRef.current;
    if (!scroller || pxPerSecond <= 0) return;
    const nextScrollLeft = safeViewStart * pxPerSecond;
    if (Math.abs(scroller.scrollLeft - nextScrollLeft) > 0.5) {
      scroller.scrollLeft = nextScrollLeft;
    }
  }, [open, pxPerSecond, safeViewStart]);
  (0, import_react26.useEffect)(() => {
    if (!dockVisible) setPopover(null);
  }, [dockVisible]);
  (0, import_react26.useEffect)(() => {
    if (!singleTrack) return;
    const onPointerDown = (e2) => {
      const target = e2.target;
      if (!target) return;
      if (target.closest(".dialkit-timeline-clip") || target.closest(".dialkit-timeline-popover")) {
        return;
      }
      setSelectedKeys((prev) => prev.size ? /* @__PURE__ */ new Set() : prev);
      setPopover(null);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [singleTrack]);
  const centerViewAt = (0, import_react26.useCallback)((time) => {
    if (zoom <= 1 || meta.duration <= 0) return;
    const windowDuration = meta.duration / zoom;
    setViewStart(clampViewStart(time - windowDuration / 2, meta.duration, windowDuration));
  }, [meta.duration, zoom]);
  const resetView = (0, import_react26.useCallback)(() => {
    setZoom(1);
    setViewStart(0);
  }, []);
  const handleReplay = (0, import_react26.useCallback)(() => {
    setViewStart(0);
    TimelineStore.replay(meta.id);
  }, [meta.id]);
  const handleHorizontalScroll = (0, import_react26.useCallback)((e2) => {
    if (pxPerSecond <= 0) return;
    setViewStart(clampViewStart(
      e2.currentTarget.scrollLeft / pxPerSecond,
      meta.duration,
      visibleDuration
    ));
  }, [meta.duration, pxPerSecond, visibleDuration]);
  const applyAnchoredZoom = (0, import_react26.useCallback)((nextZoom, anchorRatio, anchorTime) => {
    const nextVisibleDuration = meta.duration / nextZoom;
    setZoom(nextZoom);
    setViewStart(clampViewStart(
      anchorTime - anchorRatio * nextVisibleDuration,
      meta.duration,
      nextVisibleDuration
    ));
  }, [meta.duration]);
  const bodyRef = (0, import_react26.useRef)(null);
  const wheelHandlerRef = (0, import_react26.useRef)(() => {
  });
  wheelHandlerRef.current = (e2) => {
    if (e2.altKey) {
      const lane = laneAreaRef.current;
      if (!lane || meta.duration <= 0) return;
      const rect = lane.getBoundingClientRect();
      const anchorRatio = rect.width > 0 ? clamp((e2.clientX - rect.left) / rect.width, 0, 1) : 0.5;
      const anchorTime = safeViewStart + anchorRatio * visibleDuration;
      const delta = e2.deltaMode === 1 ? e2.deltaY * 16 : e2.deltaY;
      if (delta === 0) return;
      e2.preventDefault();
      applyAnchoredZoom(
        clamp(zoom * Math.exp(-delta / ZOOM_WHEEL_DISTANCE), 1, maxZoom),
        anchorRatio,
        anchorTime
      );
      return;
    }
    const scroller = horizontalScrollRef.current;
    if (!scroller || zoom <= 1) return;
    const horizontalDelta = Math.abs(e2.deltaX) > Math.abs(e2.deltaY) ? e2.deltaX : e2.shiftKey ? e2.deltaY : 0;
    if (horizontalDelta === 0) return;
    e2.preventDefault();
    scroller.scrollLeft += horizontalDelta;
  };
  (0, import_react26.useEffect)(() => {
    const body = bodyRef.current;
    if (!open || !body) return;
    const onWheel = (e2) => wheelHandlerRef.current(e2);
    body.addEventListener("wheel", onWheel, { passive: false });
    return () => body.removeEventListener("wheel", onWheel);
  }, [open]);
  const zoomDragRef = (0, import_react26.useRef)(null);
  const rulerScrubRef = (0, import_react26.useRef)(null);
  const seekRulerFromClientX = (0, import_react26.useCallback)((clientX) => {
    const scrub = rulerScrubRef.current;
    const contentWidth = scrub?.rect.width ?? 0;
    if (!scrub || contentWidth <= 0) return;
    TimelineStore.seek(
      meta.id,
      clamp(
        scrub.viewStart + (clientX - scrub.rect.left) / contentWidth * scrub.visibleDuration,
        scrub.viewStart,
        scrub.viewStart + scrub.visibleDuration
      )
    );
  }, [meta.id]);
  const handleRulerPointerDown = (0, import_react26.useCallback)((e2) => {
    e2.preventDefault();
    e2.stopPropagation();
    const rect = e2.currentTarget.getBoundingClientRect();
    const contentWidth = rect.width;
    if (contentWidth <= 0) return;
    e2.currentTarget.setPointerCapture(e2.pointerId);
    if (!e2.altKey) {
      const resetView2 = e2.shiftKey;
      rulerScrubRef.current = {
        wasPlaying: TimelineStore.getTransport(meta.id).playing,
        rect,
        viewStart: resetView2 ? 0 : safeViewStart,
        visibleDuration: resetView2 ? meta.duration : visibleDuration
      };
      if (resetView2) {
        setZoom(1);
        setViewStart(0);
      }
      TimelineStore.pause(meta.id);
      seekRulerFromClientX(e2.clientX);
      return;
    }
    const anchorRatio = clamp((e2.clientX - rect.left) / contentWidth, 0, 1);
    zoomDragRef.current = {
      pointerX: e2.clientX,
      rect,
      zoom,
      viewStart: safeViewStart,
      anchorRatio,
      anchorTime: safeViewStart + anchorRatio * visibleDuration,
      moved: false
    };
  }, [meta.duration, meta.id, safeViewStart, seekRulerFromClientX, visibleDuration, zoom]);
  const handleRulerPointerMove = (0, import_react26.useCallback)((e2) => {
    if (rulerScrubRef.current) {
      seekRulerFromClientX(e2.clientX);
      return;
    }
    const drag = zoomDragRef.current;
    if (!drag || meta.duration <= 0) return;
    const dx = e2.clientX - drag.pointerX;
    if (!drag.moved && Math.abs(dx) <= DRAG_THRESHOLD_PX) return;
    drag.moved = true;
    applyAnchoredZoom(
      clamp(drag.zoom * Math.exp(dx / ZOOM_DRAG_DISTANCE), 1, maxZoom),
      drag.anchorRatio,
      drag.anchorTime
    );
  }, [applyAnchoredZoom, maxZoom, meta.duration, seekRulerFromClientX]);
  const handleRulerPointerUp = (0, import_react26.useCallback)(() => {
    if (rulerScrubRef.current?.wasPlaying) TimelineStore.play(meta.id);
    rulerScrubRef.current = null;
    zoomDragRef.current = null;
  }, [meta.id]);
  const handleRulerPointerCancel = (0, import_react26.useCallback)(() => {
    if (rulerScrubRef.current?.wasPlaying) TimelineStore.play(meta.id);
    rulerScrubRef.current = null;
    zoomDragRef.current = null;
  }, [meta.id]);
  const trackScrubRef = (0, import_react26.useRef)(null);
  const seekTrackFromClientX = (0, import_react26.useCallback)((clientX) => {
    const scrub = trackScrubRef.current;
    const contentWidth = scrub?.rect.width ?? 0;
    if (!scrub || contentWidth <= 0) return;
    const nextTime = clamp(
      scrub.viewStart + (clientX - scrub.rect.left) / contentWidth * scrub.visibleDuration,
      scrub.viewStart,
      scrub.viewStart + scrub.visibleDuration
    );
    TimelineStore.seek(meta.id, nextTime);
  }, [meta.id]);
  const handleTrackPointerDown = (0, import_react26.useCallback)((e2) => {
    const target = e2.target;
    if (target.closest(".dialkit-timeline-label, button")) return;
    if (target.closest(".dialkit-timeline-scroll-row")) return;
    if (!e2.shiftKey && target.closest(".dialkit-timeline-clip")) return;
    setSelectedKeys((prev) => prev.size ? /* @__PURE__ */ new Set() : prev);
    const rect = laneAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    e2.preventDefault();
    e2.currentTarget.setPointerCapture(e2.pointerId);
    const resetView2 = e2.shiftKey;
    trackScrubRef.current = {
      wasPlaying: TimelineStore.getTransport(meta.id).playing,
      rect,
      viewStart: resetView2 ? 0 : safeViewStart,
      visibleDuration: resetView2 ? meta.duration : visibleDuration
    };
    if (resetView2) {
      setZoom(1);
      setViewStart(0);
    }
    setPopover(null);
    TimelineStore.pause(meta.id);
    seekTrackFromClientX(e2.clientX);
  }, [meta.duration, meta.id, safeViewStart, seekTrackFromClientX, visibleDuration]);
  const handleTrackPointerMove = (0, import_react26.useCallback)((e2) => {
    if (trackScrubRef.current) seekTrackFromClientX(e2.clientX);
  }, [seekTrackFromClientX]);
  const finishTrackScrub = (0, import_react26.useCallback)(() => {
    if (trackScrubRef.current?.wasPlaying) TimelineStore.play(meta.id);
    trackScrubRef.current = null;
  }, [meta.id]);
  const handleCopy = (0, import_react26.useCallback)(() => {
    const normalized = normalizeTimelineValuesForCopy(DialStore.getValues(meta.id), meta.clips);
    navigator.clipboard.writeText(buildCopyInstruction("useDialTimeline", meta.name, normalized));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [meta.clips, meta.id, meta.name]);
  const handleAddPreset = (0, import_react26.useCallback)(() => {
    DialStore.savePreset(meta.id, `Sequence ${presets.length + 2}`);
  }, [meta.id, presets.length]);
  const closePopover = (0, import_react26.useCallback)(() => setPopover(null), []);
  const openClipPopover = (0, import_react26.useCallback)(
    (clip, rect, stepKey) => {
      const targetPath = stepKey ? `${clip.key}.${stepKey}` : clip.key;
      const exclude = stepKey ? void 0 : clipPopoverExclusions(clip);
      if (getClipControls(meta.id, targetPath, exclude).length === 0) return;
      setPopover(
        (prev) => prev?.clip.key === clip.key && prev?.stepKey === stepKey ? null : {
          clip,
          stepKey,
          anchor: {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          }
        }
      );
    },
    [meta.id]
  );
  const toggleTracks = (0, import_react26.useCallback)((clipKey) => {
    setExpandedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(clipKey)) next.delete(clipKey);
      else next.add(clipKey);
      return next;
    });
  }, []);
  const handleBarClick = (0, import_react26.useCallback)(
    (clip, rect, stepKey) => {
      if (!stepKey && clip.tracks?.length) {
        toggleTracks(clip.key);
        return;
      }
      openClipPopover(clip, rect, stepKey);
    },
    [openClipPopover, toggleTracks]
  );
  const toggleGroup = (0, import_react26.useCallback)((group) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);
  const snapshotSingleSpans = (selection) => meta.clips.map((clip) => {
    const stat = computeClipStaticFromValues(DialStore.getValues(meta.id), clip, meta.duration);
    return {
      key: clip.key,
      at: stat.at,
      duration: stat.duration,
      selected: selection.has(clip.key),
      tail: clip.tail ?? 0
    };
  }).sort((a2, b2) => a2.at - b2.at);
  const singleSnapTargets = (spans) => {
    const transport = TimelineStore.getTransport(meta.id);
    return singleTrackSnapTargets(spans, transport.playing ? void 0 : transport.time);
  };
  const singlePress = (key, select) => {
    let selection = selectedKeysRef.current;
    if (select && !selection.has(key)) {
      selection = /* @__PURE__ */ new Set([key]);
      setSelectedKeys(selection);
    }
    singleDragRef.current = { spans: snapshotSingleSpans(selection), slot: null };
  };
  const singleToggleSelect = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const singleMove = (dt, stepped) => {
    const drag = singleDragRef.current;
    if (!drag) return;
    const delta = stepped ? singleTrackSteppedMoveDelta(drag.spans, dt, singleSnapTargets(drag.spans)) : singleTrackMoveDelta(drag.spans, dt);
    const writes = {};
    for (const span of drag.spans) {
      if (span.selected) writes[`${span.key}.at`] = round2(span.at + delta);
    }
    DialStore.updateValues(meta.id, writes);
  };
  const singleLift = () => {
    const drag = singleDragRef.current;
    if (!drag) return;
    const writes = {};
    for (const span of drag.spans) {
      if (span.selected) writes[`${span.key}.at`] = span.at;
    }
    DialStore.updateValues(meta.id, writes);
    setLiftedKeys(new Set(drag.spans.filter((span) => span.selected).map((span) => span.key)));
  };
  const singleReorderHover = (clientX) => {
    const drag = singleDragRef.current;
    const rect = laneAreaRef.current?.getBoundingClientRect();
    if (!drag || !rect || pxPerSecond <= 0) return;
    const xSec = safeViewStart + (clientX - rect.left) / pxPerSecond;
    const others = drag.spans.filter((span) => !span.selected);
    let slot = others.length;
    for (let i2 = 0; i2 < others.length; i2++) {
      if (xSec < others[i2].at + others[i2].duration / 2) {
        slot = i2;
        break;
      }
    }
    drag.slot = slot;
    setCueTime(
      slot < others.length ? others[slot].at : others.length ? others[others.length - 1].at + others[others.length - 1].duration : 0
    );
  };
  const singleReorderDrop = () => {
    const drag = singleDragRef.current;
    singleDragRef.current = null;
    setLiftedKeys(null);
    setCueTime(null);
    if (!drag || drag.slot === null) return;
    const ats = singleTrackReorderAts(drag.spans, drag.slot);
    const writes = {};
    for (const [key, at] of Object.entries(ats)) writes[`${key}.at`] = at;
    DialStore.updateValues(meta.id, writes);
  };
  const singleResizeEnd = (key, dt, stepped) => {
    const drag = singleDragRef.current;
    if (!drag) return;
    const index = drag.spans.findIndex((span2) => span2.key === key);
    if (index < 0) return;
    const span = drag.spans[index];
    const next = drag.spans[index + 1];
    DialStore.updateValue(
      meta.id,
      `${key}.duration`,
      stepped ? singleTrackSteppedResizeEnd(span, next?.at, dt, singleSnapTargets(drag.spans)) : clampSingleTrackResizeEnd(span.duration + dt, span.at, next?.at)
    );
  };
  const singleResizeStart = (key, dt, stepped) => {
    const drag = singleDragRef.current;
    if (!drag) return;
    const index = drag.spans.findIndex((span2) => span2.key === key);
    if (index < 0) return;
    const span = drag.spans[index];
    const prev = drag.spans[index - 1];
    const prevEnd = prev ? prev.at + prev.duration : 0;
    const next = stepped ? singleTrackSteppedResizeStart(span, prevEnd, dt, singleSnapTargets(drag.spans)) : clampSingleTrackResizeStart(span.at + dt, span.at, span.duration, prevEnd);
    DialStore.updateValues(meta.id, {
      [`${key}.at`]: next.at,
      [`${key}.duration`]: next.duration
    });
  };
  const singleRelease = () => {
    singleDragRef.current = null;
  };
  const rawStep = pxPerSecond > 0 ? MAJOR_TICK_TARGET_PX / pxPerSecond : 1;
  const adaptiveMajorStep = SECOND_TICK_STEPS.find((step) => step >= rawStep) ?? SECOND_TICK_STEPS[SECOND_TICK_STEPS.length - 1];
  const majorStep = zoom < 1.5 && meta.duration >= 1 ? Math.max(1, adaptiveMajorStep) : adaptiveMajorStep;
  const fineTickStep = majorStep / 10;
  const majorTicks = [];
  const mediumTicks = [];
  const fineTicks = [];
  const firstMajorTick = Math.ceil((safeViewStart - 1e-6) / majorStep) * majorStep;
  for (let t2 = firstMajorTick; t2 <= viewEnd + 1e-6; t2 += majorStep) {
    majorTicks.push(Number(t2.toFixed(4)));
  }
  const firstFineIndex = Math.ceil((safeViewStart - 1e-6) / fineTickStep);
  const lastFineIndex = Math.floor((viewEnd + 1e-6) / fineTickStep);
  for (let index = firstFineIndex; index <= lastFineIndex; index++) {
    if (index % 10 === 0) continue;
    const tick = Number((index * fineTickStep).toFixed(6));
    if (index % 5 === 0) mediumTicks.push(tick);
    else fineTicks.push(tick);
  }
  const rows = [];
  if (singleTrack) {
    rows.push(
      /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "dialkit-timeline-row dialkit-timeline-single-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-label" }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "dialkit-timeline-lane", children: [
          (() => {
            const stats = meta.clips.map((clip) => ({
              clip,
              stat: computeClipStaticFromValues(values, clip, meta.duration)
            }));
            const pinnedKey = meta.pinStart && stats.length ? stats.reduce((a2, b2) => b2.stat.at < a2.stat.at ? b2 : a2).clip.key : null;
            return stats.map(({ clip, stat }) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
              TimelineClip,
              {
                timelineId: meta.id,
                clip,
                at: stat.at,
                duration: stat.duration,
                loop: stat.loop,
                fixedDuration: stat.isPhysics,
                pxPerSecond,
                viewStart: safeViewStart,
                timelineDuration: meta.duration,
                selected: selectedKeys.has(clip.key),
                highlighted: clip.key === meta.highlightedClip,
                onClick: handleBarClick,
                onDrag: closePopover,
                single: {
                  tail: clip.tail ?? 0,
                  lifted: liftedKeys?.has(clip.key) ?? false,
                  pinned: clip.key === pinnedKey,
                  onPress: singlePress,
                  onToggleSelect: singleToggleSelect,
                  onMove: singleMove,
                  onLift: singleLift,
                  onReorderHover: singleReorderHover,
                  onReorderDrop: singleReorderDrop,
                  onResizeEnd: singleResizeEnd,
                  onResizeStart: singleResizeStart,
                  onRelease: singleRelease
                }
              },
              clip.key
            ));
          })(),
          cueTime !== null && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            "div",
            {
              className: "dialkit-timeline-single-cue",
              style: { left: (cueTime - safeViewStart) * pxPerSecond }
            }
          )
        ] })
      ] }, "single-track")
    );
  }
  let lastGroup;
  for (const clip of singleTrack ? [] : meta.clips) {
    if (clip.group !== lastGroup) {
      lastGroup = clip.group;
      if (clip.group) {
        const group = clip.group;
        const isCollapsed = collapsedGroups.has(group);
        rows.push(
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "dialkit-timeline-row dialkit-timeline-group-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "dialkit-timeline-label", children: [
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                "button",
                {
                  className: "dialkit-timeline-group-toggle",
                  "data-open": !isCollapsed,
                  onClick: () => toggleGroup(group),
                  title: isCollapsed ? "Expand layer" : "Collapse layer",
                  children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: ICON_CHEVRON }) })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { children: formatLabel(group) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-lane" })
          ] }, `group:${group}`)
        );
      }
    }
    if (clip.group && collapsedGroups.has(clip.group)) continue;
    const isProps = Boolean(clip.tracks?.length);
    const tracksOpen = isProps && expandedTracks.has(clip.key);
    const stat = computeClipStaticFromValues(values, clip, meta.duration);
    rows.push(
      /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "dialkit-timeline-row", "data-grouped": clip.group ? "" : void 0, children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "dialkit-timeline-label", children: [
          isProps ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            "button",
            {
              className: "dialkit-timeline-group-toggle",
              "data-open": tracksOpen,
              onClick: (e2) => {
                e2.stopPropagation();
                toggleTracks(clip.key);
              },
              title: tracksOpen ? "Collapse properties" : "Expand properties",
              children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: ICON_CHEVRON }) })
            }
          ) : null,
          clip.label
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-lane", children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          TimelineClip,
          {
            timelineId: meta.id,
            clip,
            at: stat.at,
            duration: stat.duration,
            loop: stat.loop,
            steps: clip.stepKeys?.length ? stat.tracks[0]?.steps : void 0,
            fixedDuration: isProps ? true : stat.isPhysics,
            composite: isProps,
            pxPerSecond,
            viewStart: safeViewStart,
            timelineDuration: meta.duration,
            selected: popover?.clip.key === clip.key,
            selectedStepKey: popover?.clip.key === clip.key ? popover.stepKey : void 0,
            onClick: handleBarClick,
            onDrag: closePopover
          }
        ) })
      ] }, clip.key)
    );
    if (tracksOpen) {
      for (const trackRef of clip.tracks ?? []) {
        const track = stat.tracks.find((candidate) => candidate.prop === trackRef.prop);
        if (!track) continue;
        const trackKey = `${clip.key}.${trackRef.prop}`;
        const trackMeta = {
          key: trackKey,
          label: `${clip.label} \xB7 ${formatLabel(trackRef.prop)}`,
          color: clip.color,
          loop: clip.loop,
          group: clip.group,
          stepKeys: trackRef.stepKeys
        };
        rows.push(
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
            "div",
            {
              className: "dialkit-timeline-row dialkit-timeline-track-row",
              "data-grouped": clip.group ? "" : void 0,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-label", children: formatLabel(trackRef.prop) }),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-lane", children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                  TimelineClip,
                  {
                    timelineId: meta.id,
                    clip: trackMeta,
                    at: stat.at + track.delay,
                    duration: track.duration,
                    loop: stat.loop,
                    steps: trackRef.stepKeys?.length ? track.steps : void 0,
                    fixedDuration: !trackRef.stepKeys?.length && track.steps[0]?.isPhysics === true,
                    baseAt: stat.at,
                    delayMode: true,
                    pxPerSecond,
                    viewStart: safeViewStart,
                    timelineDuration: meta.duration,
                    selected: popover?.clip.key === trackKey,
                    selectedStepKey: popover?.clip.key === trackKey ? popover.stepKey : void 0,
                    onClick: openClipPopover,
                    onDrag: closePopover
                  }
                ) })
              ]
            },
            trackKey
          )
        );
      }
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "dialkit-timeline-section", "data-single-track": singleTrack || void 0, children: [
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "dialkit-timeline-header", "data-open": open || void 0, children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "dialkit-timeline-transport", children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(PlayPauseButton, { id: meta.id }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(ReplayButton, { onReplay: handleReplay }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(LoopButton, { id: meta.id, loop: meta.loop })
      ] }),
      !open && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        TimelineOverview,
        {
          id: meta.id,
          duration: meta.duration,
          viewStart: safeViewStart,
          viewEnd,
          onNavigate: centerViewAt
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "dialkit-timeline-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          import_react27.motion.button,
          {
            className: "dialkit-toolbar-add",
            onClick: handleAddPreset,
            title: "Add timeline version",
            "aria-label": "Add timeline version",
            whileTap: { scale: 0.9 },
            transition: { type: "spring", visualDuration: 0.15, bounce: 0.3 },
            children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: ICON_ADD_PRESET.map((d2, i2) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: d2 }, i2)) })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          PresetManager,
          {
            panelId: meta.id,
            presets,
            activePresetId,
            onAdd: handleAddPreset,
            dropdownClassName: "dialkit-timeline-preset-dropdown"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          import_react27.motion.button,
          {
            className: "dialkit-toolbar-add",
            onClick: handleCopy,
            title: "Copy parameters",
            "aria-label": copied ? "Copied parameters" : "Copy parameters",
            whileTap: { scale: 0.9 },
            transition: { type: "spring", visualDuration: 0.15, bounce: 0.3 },
            children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { position: "relative", width: 16, height: 16 }, children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(import_react27.AnimatePresence, { initial: false, mode: "wait", children: copied ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
              import_react27.motion.svg,
              {
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                "aria-hidden": "true",
                style: { position: "absolute", inset: 0, width: 16, height: 16, color: "var(--dial-text-label)" },
                initial: { scale: 0.8, opacity: 0 },
                animate: { scale: 1, opacity: 1 },
                exit: { scale: 0.8, opacity: 0 },
                transition: { duration: 0.08 },
                children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: ICON_CHECK })
              },
              "check"
            ) : /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
              import_react27.motion.svg,
              {
                viewBox: "0 0 24 24",
                fill: "none",
                "aria-hidden": "true",
                style: { position: "absolute", inset: 0, width: 16, height: 16, color: "var(--dial-text-label)" },
                initial: { scale: 0.8, opacity: 0 },
                animate: { scale: 1, opacity: 1 },
                exit: { scale: 0.8, opacity: 0 },
                transition: { duration: 0.08 },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: ICON_CLIPBOARD.board, stroke: "currentColor", strokeWidth: "2", strokeLinejoin: "round" }),
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: ICON_CLIPBOARD.sparkle, fill: "currentColor" }),
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: ICON_CLIPBOARD.body, stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })
                ]
              },
              "clipboard"
            ) }) })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          "button",
          {
            className: "dialkit-timeline-chevron",
            "data-open": open,
            "aria-expanded": open,
            onClick: () => setOpen(!open),
            title: open ? "Collapse timeline" : "Expand timeline",
            children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: ICON_CHEVRON }) })
          }
        )
      ] })
    ] }),
    open && /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
      "div",
      {
        ref: bodyRef,
        className: "dialkit-timeline-body",
        onPointerDown: handleTrackPointerDown,
        onPointerMove: handleTrackPointerMove,
        onPointerUp: finishTrackScrub,
        onPointerCancel: finishTrackScrub,
        onLostPointerCapture: finishTrackScrub,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "dialkit-timeline-grid", children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "dialkit-timeline-row dialkit-timeline-ruler-row", children: [
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-label" }),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                "div",
                {
                  ref: laneAreaRef,
                  className: "dialkit-timeline-ruler",
                  onPointerDown: handleRulerPointerDown,
                  onPointerMove: handleRulerPointerMove,
                  onPointerUp: handleRulerPointerUp,
                  onPointerCancel: handleRulerPointerCancel,
                  onLostPointerCapture: handleRulerPointerCancel,
                  title: "Drag to seek \xB7 Option-drag or Option-scroll to zoom \xB7 Shift-click to reset zoom",
                  children: [
                    fineTicks.map((t2) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-tick dialkit-timeline-tick-fine", style: { left: (t2 - safeViewStart) * pxPerSecond } }, `fine:${t2}`)),
                    mediumTicks.map((t2) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-tick dialkit-timeline-tick-medium", style: { left: (t2 - safeViewStart) * pxPerSecond } }, `medium:${t2}`)),
                    majorTicks.map((t2) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-tick", style: { left: (t2 - safeViewStart) * pxPerSecond } }, t2)),
                    majorTicks.map((t2) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                      "span",
                      {
                        className: "dialkit-timeline-tick-label",
                        style: { left: (t2 - safeViewStart) * pxPerSecond },
                        children: formatRulerSeconds(t2, majorStep)
                      },
                      `label:${t2}`
                    ))
                  ]
                }
              )
            ] }),
            rows,
            pxPerSecond > 0 && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
              TimelinePlayheadFlag,
              {
                id: meta.id,
                duration: meta.duration,
                pxPerSecond,
                viewStart: safeViewStart,
                viewEnd,
                laneWidth,
                rulerRef: laneAreaRef,
                onResetView: resetView
              }
            )
          ] }),
          zoom > 1 && /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "dialkit-timeline-scroll-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-label" }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
              "div",
              {
                ref: horizontalScrollRef,
                className: "dialkit-timeline-horizontal-scroll",
                onScroll: handleHorizontalScroll,
                "aria-label": "Timeline horizontal scroll",
                children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { width: laneWidth * zoom } })
              }
            )
          ] })
        ]
      }
    ),
    popover && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      ClipPopover,
      {
        panelId: meta.id,
        popover,
        values,
        theme,
        maxClipDuration: singleTrack && !popover.stepKey ? singleTrackNeighborCap(meta, values, popover.clip.key) : void 0,
        onClose: closePopover
      }
    )
  ] });
});
function ClipPopover({
  panelId,
  popover,
  values,
  theme,
  maxClipDuration,
  onClose
}) {
  const ref = (0, import_react26.useRef)(null);
  const [naturalHeight, setNaturalHeight] = (0, import_react26.useState)(0);
  const [viewport, setViewport] = (0, import_react26.useState)(() => ({
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
    offsetLeft: window.visualViewport?.offsetLeft ?? 0,
    offsetTop: window.visualViewport?.offsetTop ?? 0
  }));
  (0, import_react26.useLayoutEffect)(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setNaturalHeight(element.scrollHeight + 2);
    measure();
    const observer = new ResizeObserver(measure);
    const body = element.querySelector(".dialkit-timeline-popover-body");
    observer.observe(body ?? element);
    return () => observer.disconnect();
  }, [popover.clip.key, popover.stepKey]);
  (0, import_react26.useEffect)(() => {
    const updateViewport = () => setViewport({
      width: window.visualViewport?.width ?? window.innerWidth,
      height: window.visualViewport?.height ?? window.innerHeight,
      offsetLeft: window.visualViewport?.offsetLeft ?? 0,
      offsetTop: window.visualViewport?.offsetTop ?? 0
    });
    window.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
    };
  }, []);
  (0, import_react26.useEffect)(() => {
    const handlePointerDown = (e2) => {
      const target = e2.target;
      if (ref.current?.contains(target)) return;
      if (target.closest?.(".dialkit-timeline-clip")) return;
      if (target.closest?.(".dialkit-timeline-label")) return;
      onClose();
    };
    const handleKeyDown = (e2) => {
      if (e2.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);
  const { clip, stepKey } = popover;
  let controls;
  let title;
  if (stepKey) {
    controls = getClipControls(panelId, `${clip.key}.${stepKey}`);
    if (stepKey === clip.stepKeys?.[0]) {
      const from = getControlAt(panelId, `${clip.key}.from`);
      if (from) {
        const toIndex = controls.findIndex((control) => control.path === `${clip.key}.${stepKey}.to`);
        controls = toIndex >= 0 ? [...controls.slice(0, toIndex), from, ...controls.slice(toIndex)] : [...controls, from];
      }
    }
    title = `${clip.label} \xB7 ${formatStepLabel(stepKey)}`;
  } else {
    controls = getClipControls(panelId, clip.key, clipPopoverExclusions(clip));
    title = clip.label;
  }
  if (controls.length === 0) return null;
  const targetPath = stepKey ? `${clip.key}.${stepKey}` : clip.key;
  const durationMeta = getControlAt(panelId, `${targetPath}.duration`);
  const durationValue = durationMeta ? values[durationMeta.path] : void 0;
  const durationMin = Math.max(TIMELINE_MIN_CLIP_DURATION, durationMeta?.min ?? 0);
  const durationMax = maxClipDuration !== void 0 ? Math.min(durationMeta?.max ?? Number.POSITIVE_INFINITY, maxClipDuration) : durationMeta?.max;
  const transitionDuration = durationMeta?.type === "slider" && typeof durationValue === "number" ? {
    value: durationValue,
    // Clamp here too — a typed value bypasses the slider's own bounds.
    onChange: (next) => DialStore.updateValue(
      panelId,
      durationMeta.path,
      clamp(next, durationMin, durationMax ?? Number.POSITIVE_INFINITY)
    ),
    min: durationMin,
    max: durationMax,
    step: durationMeta.step
  } : void 0;
  const displayValues = timelinePopoverDisplayValues(values, clip.key, clip.stepKeys, stepKey);
  const viewportRight = viewport.offsetLeft + viewport.width;
  const viewportBottom = viewport.offsetTop + viewport.height;
  const popoverWidth = Math.min(POPOVER_WIDTH, Math.max(220, viewport.width - 24));
  const left = clamp(
    popover.anchor.left + popover.anchor.width / 2 - popoverWidth / 2,
    viewport.offsetLeft + 12,
    Math.max(viewport.offsetLeft + 12, viewportRight - popoverWidth - 12)
  );
  const spaceAbove = Math.max(0, popover.anchor.top - viewport.offsetTop - 22);
  const spaceBelow = Math.max(0, viewportBottom - popover.anchor.bottom - 22);
  const placeAbove = naturalHeight === 0 ? spaceAbove >= spaceBelow : naturalHeight <= spaceAbove || naturalHeight > spaceBelow && spaceAbove >= spaceBelow;
  const availableHeight = placeAbove ? spaceAbove : spaceBelow;
  const renderedHeight = Math.min(naturalHeight || availableHeight, availableHeight);
  const unclampedTop = placeAbove ? popover.anchor.top - 10 - renderedHeight : popover.anchor.bottom + 10;
  const top = clamp(
    unclampedTop,
    viewport.offsetTop + 12,
    Math.max(viewport.offsetTop + 12, viewportBottom - renderedHeight - 12)
  );
  return (0, import_react_dom5.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-root", "data-theme": theme, children: /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
      "div",
      {
        ref,
        className: "dialkit-timeline-popover",
        "data-placement": placeAbove ? "above" : "below",
        style: {
          left,
          top,
          width: popoverWidth,
          maxHeight: availableHeight,
          visibility: naturalHeight > 0 ? "visible" : "hidden"
        },
        role: "dialog",
        "aria-label": `Edit ${title}`,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "dialkit-timeline-popover-header", children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "dialkit-timeline-popover-title", children: title }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("button", { className: "dialkit-timeline-popover-close", onClick: onClose, title: "Close editor", "aria-label": "Close editor", children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: "M6 6L18 18M18 6L6 18" }) }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-popover-body", children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            ControlRenderer,
            {
              panelId,
              controls,
              values: displayValues,
              transitionDuration,
              physicsSettleCap: maxClipDuration
            }
          ) })
        ]
      }
    ) }),
    document.body
  );
}
function singleTrackNeighborCap(meta, values, clipKey) {
  const spans = meta.clips.map((clip) => ({
    key: clip.key,
    at: computeClipStaticFromValues(values, clip, meta.duration).at
  })).sort((a2, b2) => a2.at - b2.at);
  const index = spans.findIndex((span) => span.key === clipKey);
  if (index < 0) return void 0;
  const next = spans[index + 1];
  if (!next) return void 0;
  return Math.max(TIMELINE_MIN_CLIP_DURATION, next.at - spans[index].at);
}
function clipPopoverExclusions(clip) {
  return /* @__PURE__ */ new Set([
    ...clip.stepKeys ?? [],
    ...clip.tracks?.map((track) => track.prop) ?? []
  ]);
}
function getClipControls(panelId, controlPath, excludeChildren) {
  const panel = DialStore.getPanel(panelId);
  const folder = panel ? findControl(panel.controls, controlPath) : null;
  if (!folder?.children) return [];
  return folder.children.filter((control) => {
    const childKey = control.path.slice(controlPath.length + 1);
    if (childKey === "at" || childKey === "duration") return false;
    return !excludeChildren?.has(childKey);
  });
}
function getControlAt(panelId, path) {
  const panel = DialStore.getPanel(panelId);
  return panel ? findControl(panel.controls, path) : null;
}
function TimelineClip({
  timelineId,
  clip,
  at,
  duration,
  loop,
  steps,
  fixedDuration,
  composite = false,
  baseAt = 0,
  delayMode = false,
  pxPerSecond,
  viewStart,
  timelineDuration,
  selected,
  selectedStepKey,
  highlighted = false,
  onClick,
  onDrag,
  single
}) {
  const dragRef = (0, import_react26.useRef)(null);
  const [dragging, setDragging] = (0, import_react26.useState)(false);
  const [hovered, setHovered] = (0, import_react26.useState)(false);
  const isSteps = Boolean(steps?.length);
  const handlePointerDown = (0, import_react26.useCallback)(
    (e2) => {
      if (single) {
        e2.stopPropagation();
        const target2 = e2.target;
        let mode2 = "move";
        if (!fixedDuration) {
          const edge = target2.dataset?.edge;
          if (edge) mode2 = edge;
        }
        if (e2.shiftKey) {
          if (mode2 === "move") single.onToggleSelect(clip.key);
          return;
        }
        single.onPress(clip.key, mode2 === "move");
        dragRef.current = {
          mode: mode2,
          pointerX: e2.clientX,
          pointerY: e2.clientY,
          at,
          duration,
          clickEl: null,
          moved: false,
          locked: single.pinned && mode2 === "move"
        };
        e2.currentTarget.setPointerCapture(e2.pointerId);
        return;
      }
      if (e2.shiftKey) return;
      e2.stopPropagation();
      const target = e2.target;
      let mode = "move";
      let boundaryIndex;
      const boundary = target.dataset?.boundary;
      if (boundary !== void 0) {
        mode = "boundary";
        boundaryIndex = Number(boundary);
      } else if (!fixedDuration) {
        const edge = target.dataset?.edge;
        if (edge) mode = edge;
      }
      dragRef.current = {
        mode,
        boundaryIndex,
        pointerX: e2.clientX,
        at,
        duration,
        stepDurations: steps?.map((step) => step.duration),
        clickEl: target.closest?.("[data-step]") ?? null,
        moved: false
      };
      e2.currentTarget.setPointerCapture(e2.pointerId);
    },
    [at, clip.key, duration, fixedDuration, single, steps]
  );
  const handlePointerMove = (0, import_react26.useCallback)(
    (e2) => {
      const drag = dragRef.current;
      if (!drag || pxPerSecond <= 0) return;
      if (single) {
        if (drag.locked) return;
        const sdx = e2.clientX - drag.pointerX;
        const sdy = e2.clientY - (drag.pointerY ?? e2.clientY);
        if (!drag.moved) {
          if (Math.abs(sdx) <= DRAG_THRESHOLD_PX && Math.abs(sdy) <= DRAG_THRESHOLD_PX) return;
          drag.moved = true;
          setDragging(true);
          onDrag();
        }
        const sdt = sdx / pxPerSecond;
        const stepped = e2.metaKey || e2.ctrlKey;
        if (drag.mode === "move") {
          if (!drag.lifted && Math.abs(sdy) > SINGLE_LIFT_PX) {
            drag.lifted = true;
            single.onLift();
          }
          if (drag.lifted) single.onReorderHover(e2.clientX);
          else single.onMove(sdt, stepped);
        } else if (drag.mode === "end") {
          single.onResizeEnd(clip.key, sdt, stepped);
        } else {
          single.onResizeStart(clip.key, sdt, stepped);
        }
        return;
      }
      const dx = e2.clientX - drag.pointerX;
      if (!drag.moved) {
        if (Math.abs(dx) <= DRAG_THRESHOLD_PX) return;
        drag.moved = true;
        setDragging(true);
        onDrag();
      }
      const dt = dx / pxPerSecond;
      if (drag.mode === "boundary" && steps && drag.stepDurations) {
        const index = drag.boundaryIndex ?? 0;
        const others = drag.stepDurations.reduce((sum, d2, j) => j === index ? sum : sum + d2, 0);
        DialStore.updateValue(
          timelineId,
          `${clip.key}.${steps[index].key ?? ""}.duration`,
          clampStepResize(drag.stepDurations[index] + dt, drag.at, others, timelineDuration)
        );
      } else if (drag.mode === "move") {
        if (delayMode) {
          DialStore.updateValue(
            timelineId,
            `${clip.key}.delay`,
            clampTrackDelay(drag.at + dt - baseAt, baseAt, drag.duration, timelineDuration)
          );
        } else {
          DialStore.updateValue(timelineId, `${clip.key}.at`, clampClipMove(drag.at + dt, drag.duration, timelineDuration));
        }
      } else if (drag.mode === "end") {
        DialStore.updateValue(
          timelineId,
          `${clip.key}.duration`,
          clampClipResizeEnd(drag.duration + dt, drag.at, timelineDuration)
        );
      } else if (steps && drag.stepDurations) {
        const limit = Math.max(baseAt, 0);
        const next = clampClipResizeStart(Math.max(drag.at + dt, limit), drag.at, drag.stepDurations[0]);
        DialStore.updateValues(timelineId, {
          [delayMode ? `${clip.key}.delay` : `${clip.key}.at`]: delayMode ? Math.max(0, next.at - baseAt) : next.at,
          [`${clip.key}.${steps[0].key ?? ""}.duration`]: next.duration
        });
      } else {
        const limit = Math.max(baseAt, 0);
        const next = clampClipResizeStart(Math.max(drag.at + dt, limit), drag.at, drag.duration);
        DialStore.updateValues(timelineId, {
          [delayMode ? `${clip.key}.delay` : `${clip.key}.at`]: delayMode ? Math.max(0, next.at - baseAt) : next.at,
          [`${clip.key}.duration`]: next.duration
        });
      }
    },
    [baseAt, clip.key, delayMode, onDrag, pxPerSecond, single, steps, timelineId, timelineDuration]
  );
  const handlePointerUp = (0, import_react26.useCallback)(
    (e2) => {
      const drag = dragRef.current;
      dragRef.current = null;
      setDragging(false);
      if (single) {
        if (drag?.lifted) {
          single.onReorderDrop();
          return;
        }
        single.onRelease();
        if (drag && !drag.moved) onClick(clip, e2.currentTarget.getBoundingClientRect());
        return;
      }
      if (drag && !drag.moved) {
        const stepKey = drag.clickEl?.dataset?.step;
        const anchorEl = drag.clickEl ?? e2.currentTarget;
        onClick(clip, anchorEl.getBoundingClientRect(), stepKey);
      }
    },
    [clip, onClick, single]
  );
  const handlePointerCancel = (0, import_react26.useCallback)(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (single) {
      if (drag?.lifted) single.onReorderDrop();
      else single.onRelease();
    }
  }, [single]);
  const width = Math.max(duration * pxPerSecond, 14);
  const resizable = duration > 0 && !fixedDuration && !composite;
  const durationText = `${fixedDuration && !composite ? "~" : ""}${formatSeconds(duration)}`;
  const looping = loop === "repeat" && duration > 0;
  const ghostCycles = [];
  if (looping) {
    const maxGhostCycles = 256;
    const firstGhostIndex = Math.max(1, Math.floor((viewStart - at) / duration));
    for (let offset = 0; offset < maxGhostCycles; offset++) {
      const index = firstGhostIndex + offset;
      const start = at + duration * index;
      if (start >= timelineDuration - 1e-6) break;
      ghostCycles.push({
        start,
        duration: Math.min(duration, timelineDuration - start),
        index
      });
    }
  }
  const boundaryOffsets = [];
  if (steps) {
    let cumulative = 0;
    for (const step of steps) {
      cumulative += step.duration;
      boundaryOffsets.push(cumulative);
    }
  }
  const barTitle = composite ? `${clip.label} \u2014 composite of its property tracks${looping ? " \xB7 repeats through timeline" : ""} \xB7 click to expand` : `${clip.label} \u2014 ${formatSeconds(at)} for ${durationText}${fixedDuration ? " (duration set by spring physics)" : ""}${looping ? " \xB7 repeats through timeline" : ""}${delayMode ? " \xB7 drag to phase-shift" : ""}`;
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(import_jsx_runtime18.Fragment, { children: [
    ghostCycles.map((cycle) => {
      const ghostWidth = Math.max(1, cycle.duration * pxPerSecond - 2);
      return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        "div",
        {
          className: "dialkit-timeline-clip-ghost",
          "data-steps": isSteps || void 0,
          "aria-hidden": "true",
          style: {
            left: (cycle.start - viewStart) * pxPerSecond + 1,
            width: ghostWidth,
            background: clip.color
          },
          children: steps?.map((step, stepIndex) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            "span",
            {
              className: "dialkit-timeline-clip-ghost-segment",
              style: { width: step.duration * pxPerSecond }
            },
            step.key ?? `step:${stepIndex}`
          ))
        },
        `ghost:${cycle.index}`
      );
    }),
    single && single.tail > 0 && pxPerSecond > 0 && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      ClipTail,
      {
        id: timelineId,
        at,
        left: (at + duration - viewStart) * pxPerSecond - SINGLE_TAIL_TUCK_PX,
        width: single.tail * pxPerSecond + SINGLE_TAIL_TUCK_PX,
        lit: hovered || selected
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      "div",
      {
        className: "dialkit-timeline-clip",
        "data-steps": isSteps || void 0,
        "data-composite": composite || void 0,
        "data-selected": selected || void 0,
        "data-highlighted": single && highlighted || void 0,
        "data-dragging": dragging || void 0,
        "data-lifted": single?.lifted || void 0,
        "data-pinned": single?.pinned || void 0,
        style: {
          // Hairline: single-track bars draw 1px short of their span on
          // each side, so butted pairs keep a sliver of lane between them.
          left: (at - viewStart) * pxPerSecond + (single ? 1 : 0),
          width: single ? Math.max(width - 2, 12) : width,
          ...single ? {} : { background: composite ? `${clip.color}80` : clip.color }
        },
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onPointerCancel: handlePointerCancel,
        onLostPointerCapture: handlePointerCancel,
        onPointerEnter: single ? () => setHovered(true) : void 0,
        onPointerLeave: single ? () => setHovered(false) : void 0,
        title: barTitle,
        children: single ? /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(import_jsx_runtime18.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(ClipFill, { id: timelineId, at, duration }),
          resizable && !single.pinned && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-clip-handle", "data-edge": "start" }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "dialkit-timeline-clip-name", children: clip.label }),
          width > 56 && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "dialkit-timeline-clip-duration", children: durationText }),
          resizable && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-clip-handle", "data-edge": "end" }),
          highlighted && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("svg", { className: "dialkit-timeline-clip-ants", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("rect", { rx: "4.5", ry: "4.5" }) })
        ] }) : composite ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(import_jsx_runtime18.Fragment, { children: width > 56 && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "dialkit-timeline-clip-duration", children: durationText }) }) : isSteps ? /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(import_jsx_runtime18.Fragment, { children: [
          steps.map((step) => {
            const segmentWidth = step.duration * pxPerSecond;
            return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
              "div",
              {
                className: "dialkit-timeline-clip-segment",
                "data-step": step.key ?? void 0,
                "data-selected": selectedStepKey === step.key || void 0,
                style: { width: segmentWidth },
                children: segmentWidth > 52 && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "dialkit-timeline-clip-duration", children: formatSeconds(step.duration) })
              },
              step.key ?? "step"
            );
          }),
          steps.map(
            (step, index) => step.isPhysics ? null : /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
              "div",
              {
                className: "dialkit-timeline-clip-handle",
                "data-boundary": index,
                style: { left: boundaryOffsets[index] * pxPerSecond - 4 }
              },
              `boundary:${step.key}`
            )
          ),
          !steps[0].isPhysics && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-clip-handle", "data-edge": "start" })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(import_jsx_runtime18.Fragment, { children: [
          resizable && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-clip-handle", "data-edge": "start" }),
          width > 56 && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "dialkit-timeline-clip-duration", children: durationText }),
          resizable && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "dialkit-timeline-clip-handle", "data-edge": "end" })
        ] })
      }
    ),
    looping && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "dialkit-timeline-loop-infinity", "aria-hidden": "true", title: "Repeats indefinitely", children: "\u221E" })
  ] });
}

// src/components/ButtonGroup.tsx
var import_jsx_runtime19 = require("react/jsx-runtime");
function ButtonGroup({ buttons }) {
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "dialkit-button-group", children: buttons.map((button, index) => /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
    "button",
    {
      className: "dialkit-button",
      onClick: button.onClick,
      children: button.label
    },
    index
  )) });
}

// src/components/ShortcutsMenu.tsx
var import_react28 = require("react");
var import_react_dom6 = require("react-dom");
var import_react29 = require("motion/react");
var import_jsx_runtime20 = require("react/jsx-runtime");
function formatShortcutKey(sc) {
  if (!sc.key) return "\u2014";
  const mod = sc.modifier === "alt" ? "\u2325" : sc.modifier === "shift" ? "\u21E7" : sc.modifier === "meta" ? "\u2318" : "";
  return `${mod}${sc.key.toUpperCase()}`;
}
function formatInteraction(sc) {
  const interaction = sc.interaction ?? "scroll";
  switch (interaction) {
    case "scroll":
      return sc.key ? "key+scroll" : "scroll";
    case "drag":
      return "key+drag";
    case "move":
      return "key+move";
    case "scroll-only":
      return "scroll";
  }
}
function ShortcutsMenu({ panelId }) {
  const [isOpen, setIsOpen] = (0, import_react28.useState)(false);
  const triggerRef = (0, import_react28.useRef)(null);
  const dropdownRef = (0, import_react28.useRef)(null);
  const [pos, setPos] = (0, import_react28.useState)({ top: 0, right: 0 });
  const open = (0, import_react28.useCallback)(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setIsOpen(true);
  }, []);
  const close = (0, import_react28.useCallback)(() => setIsOpen(false), []);
  const toggle = (0, import_react28.useCallback)(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, open, close]);
  (0, import_react28.useEffect)(() => {
    if (!isOpen) return;
    const handler = (e2) => {
      const target = e2.target;
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, close]);
  const panel = DialStore.getPanel(panelId);
  if (!panel) return null;
  const shortcuts = Object.entries(panel.shortcuts);
  if (shortcuts.length === 0) return null;
  const rows = shortcuts.map(([path, shortcut]) => {
    const findLabel = (controls) => {
      for (const c2 of controls) {
        if (c2.path === path) return c2.label;
        if (c2.type === "folder" && c2.children) {
          const found = findLabel(c2.children);
          if (found) return found;
        }
      }
      return path;
    };
    return {
      path,
      shortcut,
      label: findLabel(panel.controls)
    };
  });
  return /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(import_jsx_runtime20.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
      import_react29.motion.button,
      {
        ref: triggerRef,
        className: "dialkit-shortcuts-trigger",
        onClick: toggle,
        title: "Keyboard shortcuts",
        whileTap: { scale: 0.9 },
        transition: { type: "spring", visualDuration: 0.15, bounce: 0.3 },
        children: /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("rect", { x: "2", y: "6", width: "20", height: "12", rx: "2" }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("path", { d: "M6 10H6.01" }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("path", { d: "M10 10H10.01" }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("path", { d: "M14 10H14.01" }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("path", { d: "M18 10H18.01" }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("path", { d: "M8 14H16" })
        ] })
      }
    ),
    (0, import_react_dom6.createPortal)(
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(import_react29.AnimatePresence, { children: isOpen && /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
        import_react29.motion.div,
        {
          ref: dropdownRef,
          className: "dialkit-root dialkit-shortcuts-dropdown",
          style: { position: "fixed", top: pos.top, right: pos.right },
          initial: { opacity: 0, y: 4, scale: 0.97 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: 4, scale: 0.97, pointerEvents: "none" },
          transition: { type: "spring", visualDuration: 0.15, bounce: 0 },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "dialkit-shortcuts-title", children: "Keyboard Shortcuts" }),
            /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "dialkit-shortcuts-list", children: rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "dialkit-shortcuts-row", children: [
              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { className: "dialkit-shortcuts-row-key", children: formatShortcutKey(row.shortcut) }),
              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { className: "dialkit-shortcuts-row-label", children: row.label }),
              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { className: "dialkit-shortcuts-row-mode", children: formatInteraction(row.shortcut) })
            ] }, row.path)) }),
            /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "dialkit-shortcuts-hint", children: "See pill badges on controls for keys" })
          ]
        }
      ) }),
      document.body
    )
  ] });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ButtonGroup,
  ColorControl,
  ControlRenderer,
  DialRoot,
  DialStore,
  DialTimeline,
  EasingVisualization,
  Folder,
  PresetManager,
  SelectControl,
  ShortcutsMenu,
  Slider,
  SpringControl,
  SpringVisualization,
  TextControl,
  TimelineStore,
  Toggle,
  TransitionControl,
  formatClock,
  unwrapVisibility,
  useDialKit,
  useDialKitController,
  useDialTimeline,
  withVisibility
});
//# sourceMappingURL=index.cjs.map