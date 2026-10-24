import { For, createEffect, createMemo, createSignal, on, onCleanup, onMount, untrack, type JSX } from 'solid-js';
import { animate } from 'motion';
import { DialStore } from '../../store/DialStore';
import type {
  ControlMeta,
  DialValue,
  SpringConfig,
  TransitionConfig,
} from '../../store/DialStore';
import { useShortcutContext } from './ShortcutListener';
import { ColorControl } from './ColorControl';
import { ImageControl } from './ImageControl';
import { DialPad } from './DialPad';
import type { DialPadValue } from '../../dial-pad';
import { Folder } from './Folder';
import { SelectControl } from './SelectControl';
import { Slider } from './Slider';
import { SpringControl } from './SpringControl';
import { TextControl } from './TextControl';
import { Toggle } from './Toggle';
import { TransitionControl, type TransitionDurationControl } from './TransitionControl';
import type { AnimationHandle } from '../primitives';
import { mergeControls } from '../../control-presence';

interface ControlRendererProps {
  panelId: string;
  controls: ControlMeta[];
  values: Record<string, DialValue>;
  transitionDuration?: TransitionDurationControl;
  /** Slide controls in and out as their visibility rules change. */
  animateControls?: boolean;
}

// Collapsing a control also closes the row gap below it.
const hiddenControl = { height: 0, marginBottom: 'calc(var(--dial-row-gap) * -1)' };
const shownControl = { height: 'auto', marginBottom: 'calc(var(--dial-row-gap) * 0)' };
const controlTransition = { type: 'spring' as const, visualDuration: 0.35, bounce: 0.1 };

/** Slides controls in as they appear, and out where they were as they leave. */
function AnimatedControls(props: { controls: ControlMeta[]; children: (control: () => ControlMeta) => JSX.Element }) {
  const [rows, setRows] = createSignal(props.controls);
  const present = createMemo(() => new Set(props.controls.map(control => control.path)));
  createEffect(on(() => props.controls, controls => setRows(rendered => mergeControls(rendered, controls)), { defer: true }));
  const remove = (path: string) => {
    if (!present().has(path)) setRows(rendered => rendered.filter(control => control.path !== path));
  };
  let mounted = false;
  onMount(() => { mounted = true; });

  return (
    <For each={rows().map(control => control.path)}>
      {(path) => {
        let latest = rows().find(control => control.path === path)!;
        const control = () => (latest = rows().find(row => row.path === path) ?? latest);
        let wrapper!: HTMLDivElement;
        let animation: AnimationHandle | null = null;
        const slide = (shown: boolean) => {
          animation?.stop();
          wrapper.style.overflowY = 'clip';
          animation = animate(wrapper, shown ? shownControl : hiddenControl, {
            ...controlTransition,
            onComplete: () => {
              animation = null;
              if (shown) wrapper.style.overflowY = '';
              else remove(path);
            },
          });
        };
        createEffect(on(() => present().has(path), slide, { defer: true }));
        onCleanup(() => animation?.stop());
        const content = untrack(() => props.children(control));
        return (
          <div
            ref={(el) => {
              wrapper = el;
              if (!mounted) return;
              el.style.height = '0px';
              el.style.marginBottom = hiddenControl.marginBottom;
              slide(true);
            }}
            class="dialkit-control-wrapper"
          >
            {content}
          </div>
        );
      }}
    </For>
  );
}

export function ControlRenderer(props: ControlRendererProps) {
  const shortcut = useShortcutContext();

  const renderControls = (controls: () => ControlMeta[]) => props.animateControls
    ? <AnimatedControls controls={controls()}>{(control) => renderControl(control(), () => control().children ?? [])}</AnimatedControls>
    : <For each={controls()}>{(control) => renderControl(control)}</For>;

  const renderControl = (control: ControlMeta, children = () => control.children ?? []) => {
    const value = () => props.values[control.path];
    switch (control.type) {
      case 'slider':
        return (
          <Slider
            label={control.label}
            value={value() as number}
            onChange={(next) => DialStore.updateValue(props.panelId, control.path, next)}
            min={control.min}
            max={control.max}
            step={control.step}
            shortcut={control.shortcut}
            shortcutActive={shortcut().activePanelId === props.panelId && shortcut().activePath === control.path}
          />
        );
      case 'toggle':
        return (
          <Toggle
            label={control.label}
            checked={value() as boolean}
            onChange={(next) => DialStore.updateValue(props.panelId, control.path, next)}
            shortcut={control.shortcut}
            shortcutActive={shortcut().activePanelId === props.panelId && shortcut().activePath === control.path}
          />
        );
      case 'spring':
        return (
          <SpringControl
            panelId={props.panelId}
            path={control.path}
            label={control.label}
            spring={value() as SpringConfig}
            onChange={(next) => DialStore.updateValue(props.panelId, control.path, next)}
          />
        );
      case 'transition':
        return (
          <TransitionControl
            panelId={props.panelId}
            path={control.path}
            label={control.label}
            value={value() as TransitionConfig}
            onChange={(next) => DialStore.updateValue(props.panelId, control.path, next)}
            durationControl={props.transitionDuration}
          />
        );
      case 'folder':
        return (
          <Folder title={control.label} defaultOpen={control.defaultOpen ?? true}>
            {renderControls(children)}
          </Folder>
        );
      case 'text':
        return (
          <TextControl
            label={control.label}
            value={value() as string}
            onChange={(next) => DialStore.updateValue(props.panelId, control.path, next)}
            placeholder={control.placeholder}
          />
        );
      case 'select':
        return (
          <SelectControl
            label={control.label}
            value={value() as string}
            options={control.options ?? []}
            onChange={(next) => DialStore.updateValue(props.panelId, control.path, next)}
          />
        );
      case 'color':
        return (
          <ColorControl
            label={control.label}
            value={value() as string}
            onChange={(next) => DialStore.updateValue(props.panelId, control.path, next)}
          />
        );
      case 'image':
        return (
          <ImageControl
            options={control.options}
            label={control.label}
            value={value() as string}
            onChange={(next) => DialStore.updateValue(props.panelId, control.path, next)}
          />
        );
      case 'pad':
        return (
          <DialPad
            label={control.label}
            value={value() as DialPadValue}
            x={control.pad?.x}
            y={control.pad?.y}
            labels={control.pad?.labels}
            onChange={(next) => DialStore.updateValue(props.panelId, control.path, next)}
          />
        );
      case 'action':
        return (
          <button class="dialkit-button" onClick={() => DialStore.triggerAction(props.panelId, control.path)}>
            {control.label}
          </button>
        );
      default:
        return null;
    }
  };

  return renderControls(() => props.controls);
}
