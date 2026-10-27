import { DialStore, type Preset, type SelectConfig, type SelectOption } from '../store/DialStore';
import { observeDropdownKeyboard } from '../dropdown-keyboard';
import { observePresetMenu, versionNamePrefix } from '../preset-menu';
import { openDropdownOnKey } from '../control-keyboard';
import { getDialKitPortalRoot, getDropdownPosition, observeDropdownPosition } from '../dropdown-position';
import { findControl, formatToggleShortcut } from '../shortcut-utils';
import { ICON_CHEVRON, ICON_TRASH, ICON_PLUS, ICON_CHECK, ICON_MORE, ICON_PENCIL, ICON_LOCK, ICON_LOCK_OPEN } from '../icons';
import { HINTS, setHint } from '../hints';
import { element, icon, type Mounted } from './dom';
import { mountSegmentedControl } from './controls';
export function popupMenu(trigger: HTMLButtonElement, className: string, kind: 'select' | 'presets' | 'help', populate: (popup: HTMLElement) => void, onOpen?: (popup: HTMLElement) => () => void) {
  let popup: HTMLDivElement | undefined;
  let stopKeyboard: (() => void) | undefined, stopPosition: (() => void) | undefined, stopOpen: (() => void) | undefined;
  const outside = (event: Event) => {
    if (!trigger.contains(event.target as Node) && !popup?.contains(event.target as Node))
      close();
  };
  function close() {
    stopKeyboard?.();
    stopPosition?.();
    stopOpen?.();
    stopKeyboard = stopPosition = stopOpen = undefined;
    popup?.remove();
    popup = undefined;
    trigger.dataset.open = 'false';
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside);
  }
  function open() {
    if (popup || trigger.disabled)
      return;
    const root = getDialKitPortalRoot(trigger) ?? document.body;
    popup = element('div', className);
    popup.style.position = 'fixed';
    root.append(popup);
    stopOpen = onOpen?.(popup);
    populate(popup);
    trigger.dataset.open = 'true';
    trigger.setAttribute('aria-expanded', 'true');
    stopPosition = observeDropdownPosition(trigger, () => {
      if (!popup)
        return;
      if (!trigger.isConnected || !trigger.getClientRects().length) {
        close();
        return;
      }
      const p = getDropdownPosition(trigger, root, { fixed: true, dropdownHeight: popup.scrollHeight + 2, ...(kind === 'help' ? { width: 280 } : {}) });
      Object.assign(popup.style, { top: `${p.top}px`, left: `${p.left}px`, maxHeight: `${p.maxHeight}px` });
      // A version menu sizes to its names; observeDropdownKeyboard bounds it.
      if (kind !== 'presets') popup.style.width = `${p.width}px`;
    }, () => popup);
    stopKeyboard = observeDropdownKeyboard(trigger, () => popup, close, kind);
    document.addEventListener('pointerdown', outside);
  }
  const click = () => {
    if (popup)
      close();
    else
      open();
  };
  const key = (e: KeyboardEvent) => openDropdownOnKey(e, open);
  trigger.setAttribute('aria-haspopup', kind === 'select' ? 'listbox' : kind === 'presets' ? 'menu' : 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.addEventListener('click', click);
  trigger.addEventListener('keydown', key);
  return {
    close, refresh() {
      if (popup)
        populate(popup);
    }, destroy() {
      close();
      trigger.removeEventListener('click', click);
      trigger.removeEventListener('keydown', key);
    }
  };
}
export interface SelectControlProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  display?: SelectConfig['display'];
  hideLabel?: boolean;
  hint?: string;
}
function selectOptions(options: SelectOption[]) {
  return options.map(option => typeof option === 'string' ? { value: option, label: option.replace(/\b\w/g, c => c.toUpperCase()) } : option);
}
export function mountSelectControl(host: HTMLElement, initial: SelectControlProps): Mounted<SelectControlProps> {
  let props = initial;
  const mountForm = () => (props.display === 'segmented' ? mountSegmentedSelect : mountSelectDropdown)(host, props);
  let form = mountForm();
  return {
    update(next) {
      const remount = (next.display === 'segmented') !== (props.display === 'segmented');
      props = next;
      if (!remount)
        return form.update(props);
      const previous = form;
      form = mountForm();
      // The new form takes the old one's place among its siblings.
      previous.row.before(form.row);
      previous.destroy();
    }, destroy() {
      form.destroy();
    }
  };
}
type SelectForm = Mounted<SelectControlProps> & { row: HTMLElement };
function mountSelectDropdown(host: HTMLElement, initial: SelectControlProps): SelectForm {
  let props = initial;
  const row = element('div', 'dialkit-select-row');
  const trigger = element('button', 'dialkit-select-trigger');
  const label = element('span', 'dialkit-select-label');
  const right = element('div', 'dialkit-select-right');
  const value = element('span', 'dialkit-select-value');
  right.append(value, icon(ICON_CHEVRON, 'dialkit-select-chevron'));
  trigger.append(label, right);
  row.append(trigger);
  host.append(row);
  const options = () => selectOptions(props.options);
  const menu = popupMenu(trigger, 'dialkit-select-dropdown', 'select', popup => {
    popup.replaceChildren(...options().map(option => {
      const b = element('button', 'dialkit-select-option', option.label);
      b.dataset.selected = String(option.value === props.value);
      b.addEventListener('click', () => {
        props.onChange(option.value);
        menu.close();
      });
      return b;
    }));
  });
  function render() {
    label.textContent = props.label;
    setHint(row, props.hint);
    value.textContent = options().find(o => o.value === props.value)?.label ?? props.value;
    trigger.disabled = !props.options.length;
    menu.refresh();
  }
  render();
  return {
    row,
    update(next) {
      props = next;
      render();
    }, destroy() {
      menu.destroy();
      setHint(row, undefined);
      row.remove();
    }
  };
}
function mountSegmentedSelect(host: HTMLElement, initial: SelectControlProps): SelectForm {
  let props = initial;
  const row = element('div', 'dialkit-labeled-control');
  const label = element('span', 'dialkit-labeled-control-label');
  host.append(row);
  const segmentProps = () => ({ options: selectOptions(props.options), value: props.value, onChange: (value: string) => props.onChange(value), label: props.label });
  const segmented = mountSegmentedControl(row, segmentProps());
  function render() {
    label.textContent = props.label;
    if (props.hideLabel) {
      row.dataset.hideLabel = 'true';
      label.remove();
    } else {
      delete row.dataset.hideLabel;
      row.prepend(label);
    }
    segmented.update(segmentProps());
  }
  render();
  return {
    row,
    update(next) {
      props = next;
      render();
    }, destroy() {
      segmented.destroy();
      row.remove();
    }
  };
}
export interface PresetManagerProps {
  panelId: string;
  presets: Preset[];
  activePresetId: string | null;
  onAdd?: () => void;
  /** What a version is called in the menu: a version (default) or, in a timeline, a sequence. */
  noun?: 'version' | 'sequence';
}
export function mountPresetManager(host: HTMLElement, initial: PresetManagerProps): Mounted<PresetManagerProps> {
  let props = initial;
  const row = element('div', 'dialkit-preset-manager');
  const trigger = element('button', 'dialkit-preset-trigger');
  const label = element('span', 'dialkit-preset-label');
  trigger.setAttribute('aria-label', 'Versions');
  setHint(trigger, HINTS.versions);
  trigger.append(label, icon(ICON_CHEVRON, 'dialkit-select-chevron'));
  row.append(trigger);
  host.append(row);
  let editingId: string | null = null;
  const finishRename = (presetId: string, name?: string) => {
    editingId = null;
    if (name !== undefined) DialStore.renamePreset(props.panelId, presetId, name);
    menu.refresh();
  };
  const action = (className: string, title: string, paths: readonly string[], onClick: () => void) => {
    const node = element('button', className);
    node.title = title;
    node.setAttribute('aria-label', title);
    node.append(icon(paths));
    node.addEventListener('click', onClick);
    return node;
  };
  const menu = popupMenu(trigger, 'dialkit-preset-dropdown', 'presets', popup => {
    const versions = [{ id: null, name: DialStore.getBaseName(props.panelId) }, ...props.presets];
    popup.replaceChildren(...versions.map(preset => {
      const item = element('div', 'dialkit-preset-item');
      item.dataset.active = String(preset.id === props.activePresetId);
      item.addEventListener('click', (event) => {
        if ((event.target as HTMLElement).closest('input, .dialkit-preset-actions'))
          return;
        if (preset.id)
          DialStore.loadPreset(props.panelId, preset.id);
        else
          DialStore.clearActivePreset(props.panelId);
        menu.close();
      });
      item.append(icon(preset.id === props.activePresetId ? ICON_CHECK : [], 'dialkit-preset-check'));
      if (!preset.id) {
        item.append(element('button', 'dialkit-preset-name', preset.name));
        return item;
      }
      const id = preset.id;
      item.dataset.presetId = id;
      item.dataset.locked = String(!!preset.locked);
      if (id === editingId) {
        const input = element('input', 'dialkit-preset-input');
        input.value = preset.name;
        input.setAttribute('aria-label', 'Version name');
        input.addEventListener('focus', () => input.select());
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') finishRename(id, input.value);
          else if (event.key === 'Escape') finishRename(id);
          else return;
          event.preventDefault();
        });
        input.addEventListener('blur', () => { if (editingId === id) finishRename(id, input.value); });
        item.append(input);
        queueMicrotask(() => input.focus());
        return item;
      }
      // Keyboard order: the icon shown at rest (the menu icon, or a locked row's lock), then the actions it reveals.
      const actions = element('div', 'dialkit-preset-actions');
      const lock = action('dialkit-preset-lock', `${preset.locked ? 'Unlock' : 'Lock'} ${preset.name}`, preset.locked ? ICON_LOCK : ICON_LOCK_OPEN, () => DialStore.setPresetLocked(props.panelId, id, !preset.locked));
      const rename = action('dialkit-preset-rename', `Rename ${preset.name}`, ICON_PENCIL, () => { editingId = id; menu.refresh(); });
      if (preset.locked) actions.append(lock, rename);
      else {
        const more = element('button', 'dialkit-preset-more');
        more.type = 'button';
        more.setAttribute('aria-label', `More actions for ${preset.name}`);
        more.append(icon(ICON_MORE));
        actions.append(more, rename, lock, action('dialkit-preset-delete', `Delete ${preset.name}`, ICON_TRASH, () => DialStore.deletePreset(props.panelId, id)));
      }
      item.append(element('button', 'dialkit-preset-name', preset.name), actions);
      return item;
    }));
    const divider = element('div', 'dialkit-preset-divider');
    divider.setAttribute('role', 'separator');
    const create = element('button', 'dialkit-preset-create');
    create.append(icon(ICON_PLUS, 'dialkit-preset-check'), document.createTextNode(`New ${props.noun ?? 'version'}`));
    create.addEventListener('click', () => {
      if (props.onAdd) props.onAdd(); else DialStore.saveNewPreset(props.panelId, versionNamePrefix(props.noun));
      menu.close();
      trigger.focus();
    });
    popup.append(divider, create);
  }, popup => {
    editingId = null;
    return observePresetMenu(() => popup, (ids) => DialStore.reorderPresets(props.panelId, ids));
  });
  function render() {
    const active = props.presets.find(p => p.id === props.activePresetId);
    label.textContent = active?.name ?? DialStore.getBaseName(props.panelId);
    trigger.dataset.hasPreset = String(!!active);
    menu.refresh();
  }
  render();
  return {
    update(next) {
      props = next;
      render();
    }, destroy() {
      menu.destroy();
      setHint(trigger, undefined);
      row.remove();
    }
  };
}
export function mountShortcutsMenu(host: HTMLElement, initial: {
  panelId: string;
}): Mounted<{
  panelId: string;
}> {
  let props = initial;
  const trigger = element('button', 'dialkit-shortcuts-trigger');
  trigger.setAttribute('aria-label', 'Keyboard shortcuts');
  trigger.append(icon(['M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z', 'M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8']));
  host.append(trigger);
  const menu = popupMenu(trigger, 'dialkit-shortcuts-dropdown', 'help', popup => {
    const panel = DialStore.getPanel(props.panelId);
    popup.replaceChildren(element('div', 'dialkit-shortcuts-title', 'Keyboard Shortcuts'));
    const list = element('div', 'dialkit-shortcuts-list');
    for (const [path, shortcut] of Object.entries(panel?.shortcuts ?? {})) {
      const row = element('div', 'dialkit-shortcuts-row');
      const interaction = shortcut.interaction ?? 'scroll';
      row.append(element('span', 'dialkit-shortcuts-row-key', formatToggleShortcut(shortcut)), element('span', 'dialkit-shortcuts-row-label', DialStore.getControl(props.panelId, path)?.label ?? path), element('span', 'dialkit-shortcuts-row-mode', interaction === 'scroll-only' ? 'scroll' : `key+${interaction}`));
      list.append(row);
    }
    popup.append(list, element('div', 'dialkit-shortcuts-hint', 'See pill badges on controls for keys'));
  });
  const render = () => {
    trigger.style.display = Object.keys(DialStore.getPanel(props.panelId)?.shortcuts ?? {}).length ? '' : 'none';
    menu.refresh();
  };
  const stop = DialStore.subscribeGlobal(render);
  render();
  return {
    update(next) {
      props = next;
      render();
    }, destroy() {
      stop();
      menu.destroy();
      trigger.remove();
    }
  };
}
