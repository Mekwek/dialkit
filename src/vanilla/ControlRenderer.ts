import { DialStore, type ControlMeta, type DialValue, type SpringConfig, type TransitionConfig } from '../store/DialStore';
import { mountColorControl } from '../color-control';
import { mountImageControl } from '../image-control';
import { mountDialPad } from '../dial-pad-control';
import { mountFields } from '../fields-control';
import type { DialPadValue } from '../dial-pad';
import { mountAnchorControl } from '../anchor-control';
import type { AnchorValue } from '../anchor';
import { setHint } from '../hints';
import { mountFolder, mountSlider, mountTextControl, mountToggle } from './controls';
import { mountSelectControl } from './menus';
import { mountSpringControl, mountTransitionControl, type TransitionControlProps } from './transitions';
import { subscribeShortcut, type ActiveShortcut } from './shortcuts';
import { element, type Mounted } from './dom';
import { animateSpring } from './animation';
import { mergeControls } from '../control-presence';
export interface ControlRendererProps {
  panelId: string;
  controls: ControlMeta[];
  values: Record<string, DialValue>;
  transitionDuration?: TransitionControlProps['durationControl'];
  /** Path of the one open top-level folder in accordion mode, or null when all are closed. */
  openFolder?: string | null;
  onOpenFolderChange?: (path: string | null) => void;
  /** Slide controls in and out as their visibility rules change. */
  animateControls?: boolean;
}
interface Entry {
  update(): void;
  destroy(): void;
}
/** A control in its own wrapper, kept by path so it can slide in and out. */
interface Row {
  control: ControlMeta;
  wrapper: HTMLElement;
  entries: Entry[];
  body?: HTMLElement;
  rows: Row[];
  leaving: boolean;
  gone: boolean;
  animation?: Animation;
}
const rowSignature = (control: ControlMeta) => JSON.stringify({ ...control, children: undefined });
export function mountControlRenderer(host: HTMLElement, initial: ControlRendererProps): Mounted<ControlRendererProps> {
  let props = initial;
  let active: ActiveShortcut = null;
  let signature = '';
  // Counts folder resets, so sliders can spring to the values a reset sets.
  let resetCount = 0;
  // The reset button of the folder a control draws: a `_reset` folder, a spring, or a transition.
  const resetProps = (control: ControlMeta) => control.reset ? {
    changed: DialStore.isFolderChanged(props.panelId, control.path),
    onReset: () => {
      resetCount++;
      DialStore.resetFolder(props.panelId, control.path);
    },
  } : {};
  let mounted: Entry[] = [];
  let rows: Row[] = [];
  let rendered: ControlMeta[] | undefined;
  // Mounts one control into `target` and returns a folder's body for its children.
  function mountControl(control: ControlMeta, target: HTMLElement, entries: Entry[], topLevel = false): HTMLElement | undefined {
    const value = () => props.values[control.path];
    const change = (v: DialValue) => DialStore.updateValue(props.panelId, control.path, v);
    const shortcut = () => ({ shortcut: control.shortcut, shortcutActive: active?.panelId === props.panelId && active?.path === control.path });
    function mount<P>(factory: (host: HTMLElement, props: P) => Mounted<P>, getProps: () => P) {
      const instance = factory(target, getProps());
      entries.push({ update: () => instance.update(getProps()), destroy: instance.destroy });
    }
    switch (control.type) {
      case 'folder': {
        if (control.fields) {
          mount(mountFields, () => ({ label: control.label, controls: control.children ?? [], values: props.values, defaults: DialStore.getDefaultValues(props.panelId), onChange: (v: Record<string, DialValue>) => DialStore.updateValues(props.panelId, v) }));
          return undefined;
        }
        // Accordion mode controls top-level folders; nested folders keep their own state.
        const open = () => topLevel && props.openFolder !== undefined ? props.openFolder === control.path : undefined;
        const folderProps = () => ({
          title: control.label, defaultOpen: control.defaultOpen, hint: control.hint, open: open(),
          onOpenChange: open() === undefined ? undefined : (next: boolean) => props.onOpenFolderChange?.(next ? control.path : null),
          ...resetProps(control),
        });
        const folder = mountFolder(target, folderProps());
        entries.push({ update: () => folder.update(folderProps()), destroy: folder.destroy });
        return folder.body;
      }
      case 'slider':
        mount(mountSlider, () => ({ label: control.label, hint: control.hint, value: value() as number, min: control.min, max: control.max, step: control.step, unit: control.unit, resetCount, onChange: change, ...shortcut() }));
        break;
      case 'toggle':
        mount(mountToggle, () => ({ label: control.label, hint: control.hint, checked: value() as boolean, onChange: change, ...shortcut() }));
        break;
      case 'text':
        mount(mountTextControl, () => ({ label: control.label, hint: control.hint, value: value() as string, placeholder: control.placeholder, onChange: change }));
        break;
      case 'select':
        mount(mountSelectControl, () => ({ label: control.label, hint: control.hint, value: value() as string, options: control.options ?? [], display: control.display, hideLabel: control.hideLabel, onChange: change }));
        break;
      case 'color':
        mount(mountColorControl, () => ({ label: control.label, hint: control.hint, value: value() as string, onChange: change }));
        break;
      case 'image':
        mount(mountImageControl, () => ({ label: control.label, hint: control.hint, value: value() as string, options: control.options, onChange: change }));
        break;
      case 'pad':
        mount(mountDialPad, () => ({ ...control.pad, label: control.label, hint: control.hint, value: value() as DialPadValue, onChange: change }));
        break;
      case 'anchor':
        mount(mountAnchorControl, () => ({ label: control.label, value: value() as AnchorValue, onChange: change }));
        break;
      case 'spring':
        mount(mountSpringControl, () => ({ panelId: props.panelId, path: control.path, label: control.label, hint: control.hint, spring: value() as SpringConfig, onChange: change, ...resetProps(control) }));
        break;
      case 'transition':
        mount(mountTransitionControl, () => ({ panelId: props.panelId, path: control.path, label: control.label, hint: control.hint, value: value() as TransitionConfig, durationControl: props.transitionDuration, onChange: change, ...resetProps(control) }));
        break;
      case 'action': {
        const b = element('button', 'dialkit-button', control.label);
        setHint(b, control.hint);
        b.addEventListener('click', () => DialStore.triggerAction(props.panelId, control.path));
        target.append(b);
        entries.push({
          update() {
          }, destroy() {
            setHint(b, undefined);
            b.remove();
          }
        });
        break;
      }
    }
  }
  // Keep controls as direct children: folder spacing depends on this DOM structure.
  function build(controls: ControlMeta[], target: HTMLElement, topLevel = false) {
    for (const control of controls) {
      const body = mountControl(control, target, mounted, topLevel);
      if (body)
        build(control.children ?? [], body);
    }
  }
  // The wrapper starts detached; syncRows places it.
  function createRow(control: ControlMeta, topLevel: boolean): Row {
    const wrapper = element('div', 'dialkit-control-wrapper');
    const row: Row = { control, wrapper, entries: [], rows: [], leaving: false, gone: false };
    row.body = mountControl(control, wrapper, row.entries, topLevel);
    if (row.body)
      row.rows = syncRows(row.body, [], control.children ?? [], false);
    return row;
  }
  function destroyRow(row: Row) {
    if (row.gone)
      return;
    row.gone = true;
    row.animation?.cancel();
    row.rows.forEach(destroyRow);
    row.entries.forEach(entry => entry.destroy());
    row.wrapper.remove();
  }
  // A control fades with its height, and collapsing it also closes the row gap below it.
  function slide(row: Row, shown: boolean, from = row.wrapper.getBoundingClientRect().height) {
    row.animation?.cancel();
    row.leaving = !shown;
    const natural = row.wrapper.offsetHeight;
    const to = shown ? natural : 0;
    row.animation = animateSpring(row.wrapper, p => {
      const height = Math.max(0, from + (to - from) * p);
      const shownPart = natural ? height / natural : 0;
      return { opacity: shownPart, height: `${height}px`, marginBottom: `calc(var(--dial-row-gap) * ${shownPart - 1})`, overflowY: 'clip' };
    }, 0.25);
    if (shown)
      return;
    if (row.animation)
      row.animation.onfinish = () => destroyRow(row);
    else
      destroyRow(row);
  }
  function syncRows(target: HTMLElement, current: Row[], controls: ControlMeta[], animate: boolean, topLevel = false): Row[] {
    const present = new Map(controls.map(control => [control.path, control]));
    const kept = new Map<string, Row>();
    const replaced = new Set<string>();
    const entering: Row[] = [];
    for (const row of current) {
      if (row.gone)
        continue;
      const next = present.get(row.control.path);
      // A control whose own config changed mounts again instead of sliding.
      if (next && rowSignature(next) !== rowSignature(row.control)) {
        destroyRow(row);
        replaced.add(next.path);
      }
      else
        kept.set(row.control.path, row);
    }
    const next = mergeControls([...kept.values()].map(row => row.control), controls).map(control => {
      const row = kept.get(control.path);
      if (!row) {
        const created = createRow(control, topLevel);
        if (animate && !replaced.has(control.path))
          entering.push(created);
        return created;
      }
      if (!present.has(control.path)) {
        if (!row.leaving)
          slide(row, false);
        return row;
      }
      row.control = control;
      if (row.body)
        row.rows = syncRows(row.body, row.rows, control.children ?? [], animate);
      if (row.leaving)
        slide(row, true);
      return row;
    });
    // New rows are still detached, so placing them leaves the rows around them
    // (and any focused control) where they are; only reordered rows move.
    let anchor: HTMLElement | null = null;
    for (const row of [...next].reverse()) {
      if (row.wrapper.parentElement !== target || row.wrapper.nextElementSibling !== anchor)
        target.insertBefore(row.wrapper, anchor);
      anchor = row.wrapper;
    }
    entering.forEach(row => slide(row, true, 0));
    return next;
  }
  function updateRows(list: Row[]) {
    for (const row of list) {
      // Leaving rows may show controls whose values are already gone.
      if (row.gone || row.leaving)
        continue;
      row.entries.forEach(entry => entry.update());
      updateRows(row.rows);
    }
  }
  function clear() {
    mounted.forEach(c => c.destroy());
    mounted = [];
    rows.forEach(destroyRow);
    rows = [];
    rendered = undefined;
  }
  function render() {
    if (props.animateControls) {
      if (signature !== props.panelId) {
        clear();
        signature = props.panelId;
      }
      if (rendered !== props.controls) {
        rows = syncRows(host, rows, props.controls, rendered !== undefined, true);
        rendered = props.controls;
      }
      updateRows(rows);
      return;
    }
    const next = JSON.stringify([props.panelId, props.controls]);
    if (signature !== next) {
      clear();
      signature = next;
      build(props.controls, host, true);
    }
    else
      mounted.forEach(c => c.update());
  }
  const stopShortcut = subscribeShortcut(next => {
    active = next;
    mounted.forEach(c => c.update());
    updateRows(rows);
  });
  render();
  return {
    update(next) {
      props = next;
      render();
    }, destroy() {
      stopShortcut();
      clear();
    }
  };
}
