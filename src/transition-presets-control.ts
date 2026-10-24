import { DialStore } from './store/DialStore';
import type { CopiedTransition, TransitionConfig, TransitionMode } from './store/DialStore';
import { handleSegmentKey, openDropdownOnKey } from './control-keyboard';
import { getDialKitPortalRoot } from './dropdown-position';
import { observeDropdownKeyboard } from './dropdown-keyboard';
import { ICON_CLOSE, ICON_MORE } from './icons';
import { springParams, springProgress, springSettleDuration } from './transition-math';
import { applyTransitionPreset, defaultTransitionPresets, sameTransition, type TransitionPresetOption } from './transition-presets';

export interface TransitionPresetsProps {
  mode: TransitionMode;
  value: TransitionConfig;
  onChange: (value: TransitionConfig) => void;
}

export interface TransitionMenuProps {
  mode: TransitionMode;
  value: TransitionConfig;
  /** Applies a pasted transition and its mode. */
  onPaste: (copied: CopiedTransition) => void;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  if (el instanceof HTMLButtonElement) el.type = 'button';
  return el;
}

function svgIcon(paths: readonly string[], className: string, strokeWidth = 2) {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('class', className);
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', String(strokeWidth));
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('aria-hidden', 'true');
  for (const d of paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    icon.append(path);
  }
  return icon;
}

const THUMB_WIDTH = 24;
const THUMB_HEIGHT = 16;

/** A small picture of a curve or a spring; overshoot stays inside the box. */
function thumbnail(value: TransitionConfig) {
  const pad = 1.5;
  let points: [number, number][];
  if (value.type === 'easing') {
    const [x1, y1, x2, y2] = value.ease;
    points = [[0, 0], [x1, y1], [x2, y2], [1, 1]];
  } else {
    const params = springParams(value);
    const end = springSettleDuration(params);
    points = Array.from({ length: 25 }, (_, i) => [i / 24, springProgress(i / 24 * end, params)]);
  }
  const low = Math.min(0, ...points.map(([, y]) => y));
  const high = Math.max(1, ...points.map(([, y]) => y));
  const coords = points.map(([x, y]) =>
    `${pad + x * (THUMB_WIDTH - pad * 2)} ${THUMB_HEIGHT - pad - (y - low) / (high - low) * (THUMB_HEIGHT - pad * 2)}`);
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('class', 'dialkit-transition-preset-thumb');
  icon.setAttribute('viewBox', `0 0 ${THUMB_WIDTH} ${THUMB_HEIGHT}`);
  icon.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', value.type === 'easing' ? `M ${coords[0]} C ${coords.slice(1).join(', ')}` : `M ${coords.join(' L ')}`);
  icon.append(path);
  return icon;
}

/**
 * Defaults / Custom tabs over named curves (Easing) or springs (Time and
 * Physics). Custom lists the transitions saved with DialStore for the mode.
 */
export function mountTransitionPresets(host: HTMLElement, initial: TransitionPresetsProps) {
  let props = initial;
  const saved = () => DialStore.getTransitionPresets().filter(preset => preset.mode === props.mode);
  let tab: 'defaults' | 'custom' = saved().some(preset => sameTransition(preset.value, props.value, props.mode))
    && !defaultTransitionPresets(props.mode).some(preset => sameTransition(preset.value, props.value, props.mode)) ? 'custom' : 'defaults';
  let signature = '';
  let items: { root: HTMLElement; pick: HTMLButtonElement; option: TransitionPresetOption }[] = [];
  let described: TransitionPresetOption | undefined;

  const root = element('div', 'dialkit-transition-presets');
  const tabs = element('div', 'dialkit-segmented dialkit-transition-preset-tabs');
  tabs.setAttribute('role', 'radiogroup');
  tabs.setAttribute('aria-label', 'Preset source');
  tabs.addEventListener('keydown', handleSegmentKey);
  const pill = element('div', 'dialkit-segmented-pill');
  pill.setAttribute('aria-hidden', 'true');
  tabs.append(pill);
  const tabButtons = (['defaults', 'custom'] as const).map(value => {
    const button = element('button', 'dialkit-segmented-button dialkit-transition-preset-tab', value === 'defaults' ? 'Defaults' : 'Custom');
    button.setAttribute('role', 'radio');
    button.addEventListener('click', () => { tab = value; render(); });
    tabs.append(button);
    return button;
  });
  const list = element('div', 'dialkit-transition-preset-list');
  list.setAttribute('role', 'group');
  const empty = element('p', 'dialkit-transition-preset-empty');
  const description = element('p', 'dialkit-transition-preset-description');
  description.setAttribute('aria-live', 'polite');
  const save = element('button', 'dialkit-transition-preset-save');
  save.addEventListener('click', () => DialStore.saveTransitionPreset(props.value, props.mode));
  root.append(tabs, list, empty, description, save);
  host.append(root);

  const describe = (option?: TransitionPresetOption) => {
    described = option;
    const active = items.find(item => sameTransition(item.option.value, props.value, props.mode))?.option;
    description.textContent = (option ?? active)?.description ?? '';
  };

  function buildItems(options: (TransitionPresetOption & { id?: string })[]) {
    items = options.map(option => {
      const item = element('div', 'dialkit-transition-preset');
      const pick = element('button', 'dialkit-transition-preset-pick');
      pick.append(element('span', 'dialkit-transition-preset-name', option.name), thumbnail(option.value));
      pick.addEventListener('click', () => props.onChange(applyTransitionPreset(props.value, option.value, props.mode)));
      pick.addEventListener('pointerenter', () => describe(option));
      pick.addEventListener('pointerleave', () => describe());
      pick.addEventListener('focus', () => describe(option));
      pick.addEventListener('blur', () => describe());
      item.append(pick);
      if (option.id) {
        const id = option.id;
        const remove = element('button', 'dialkit-transition-preset-delete');
        remove.setAttribute('aria-label', `Delete ${option.name}`);
        remove.title = remove.getAttribute('aria-label')!;
        remove.append(svgIcon([ICON_CLOSE], ''));
        remove.addEventListener('click', () => DialStore.deleteTransitionPreset(id));
        item.append(remove);
      }
      return { root: item, pick, option };
    });
    list.replaceChildren(...items.map(item => item.root));
  }

  function render() {
    const custom = saved();
    const options = tab === 'defaults' ? defaultTransitionPresets(props.mode) : custom.map(({ id, name, value }) => ({ id, name, value }));
    const nextSignature = `${props.mode}:${tab}:${tab === 'custom' ? custom.map(preset => preset.id).join(',') : ''}`;
    if (signature !== nextSignature) {
      // Keep keyboard focus on the same preset when the list is rebuilt.
      const focused = items.findIndex(item => item.root.contains(document.activeElement));
      signature = nextSignature;
      buildItems(options);
      if (focused >= 0) (items[Math.min(focused, items.length - 1)]?.pick ?? save).focus({ preventScroll: true });
    }
    tabButtons.forEach((button, index) => {
      const active = (index === 0) === (tab === 'defaults');
      button.dataset.active = String(active);
      button.setAttribute('aria-checked', String(active));
      button.tabIndex = active ? 0 : -1;
      if (active) pill.style.transform = `translateX(${index * 100}%)`;
    });
    for (const item of items) {
      const active = sameTransition(item.option.value, props.value, props.mode);
      item.root.dataset.active = String(active);
      item.pick.setAttribute('aria-pressed', String(active));
    }
    const noun = props.mode === 'easing' ? 'curve' : 'spring';
    list.setAttribute('aria-label', `${tab === 'defaults' ? 'Default' : 'Custom'} ${noun}s`);
    list.hidden = !items.length;
    empty.hidden = tab === 'defaults' || items.length > 0;
    empty.textContent = `No saved ${noun}s yet.`;
    save.hidden = tab === 'defaults';
    const savedAs = custom.find(preset => sameTransition(preset.value, props.value, props.mode));
    save.disabled = !!savedAs;
    save.textContent = savedAs ? `Saved as ${savedAs.name}` : `Save current ${noun}`;
    describe(described && items.some(item => item.option === described) ? described : undefined);
    description.hidden = !description.textContent;
  }

  const stop = DialStore.subscribeTransitions(render);
  render();
  return {
    update(next: TransitionPresetsProps) {
      props = next;
      render();
    },
    destroy() { stop(); root.remove(); },
  };
}

/** The "···" menu in a transition's header: copy this transition, or paste the copied one. */
export function mountTransitionMenu(host: HTMLElement, initial: TransitionMenuProps) {
  let props = initial;
  let popup: HTMLDivElement | undefined;
  let stopKeyboard: (() => void) | undefined;
  const trigger = element('button', 'dialkit-transition-menu-trigger');
  trigger.setAttribute('aria-label', 'Transition actions');
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.title = 'Copy or paste this transition';
  trigger.append(svgIcon(ICON_MORE, '', 3));
  host.append(trigger);

  const outside = (event: Event) => {
    if (!trigger.contains(event.target as Node) && !popup?.contains(event.target as Node)) close();
  };
  function populate() {
    if (!popup) return;
    const copy = element('button', 'dialkit-transition-menu-item', 'Copy');
    copy.addEventListener('click', () => {
      DialStore.copyTransition(props.value, props.mode);
      close();
    });
    popup.replaceChildren(copy);
    // Paste is offered once a transition has been copied.
    const copied = DialStore.getCopiedTransition();
    if (copied) {
      const paste = element('button', 'dialkit-transition-menu-item', 'Paste');
      paste.addEventListener('click', () => {
        close();
        props.onPaste(copied);
      });
      popup.append(paste);
    }
  }
  function open() {
    if (popup) return;
    popup = element('div', 'dialkit-preset-dropdown dialkit-transition-menu');
    popup.style.position = 'fixed';
    (getDialKitPortalRoot(trigger) ?? document.body).append(popup);
    populate();
    trigger.dataset.open = 'true';
    trigger.setAttribute('aria-expanded', 'true');
    stopKeyboard = observeDropdownKeyboard(trigger, () => popup, close, 'menu');
    document.addEventListener('pointerdown', outside);
  }
  function close() {
    stopKeyboard?.();
    stopKeyboard = undefined;
    popup?.remove();
    popup = undefined;
    trigger.dataset.open = 'false';
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside);
  }
  trigger.addEventListener('click', event => {
    // The menu sits in the folder header; opening it must not fold the folder.
    event.stopPropagation();
    if (popup) close();
    else open();
  });
  trigger.addEventListener('keydown', event => openDropdownOnKey(event, open));
  const stop = DialStore.subscribeTransitions(populate);
  return {
    update(next: TransitionMenuProps) { props = next; },
    destroy() { stop(); close(); trigger.remove(); },
  };
}
