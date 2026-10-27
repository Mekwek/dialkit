import { For, batch, createEffect, createMemo, createSignal, on, onCleanup, onMount, untrack, type JSX } from 'solid-js';
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
import { AnchorControl } from './AnchorControl';
import { Fields } from './Fields';
import type { DialPadValue } from '../../dial-pad';
import type { AnchorValue } from '../../anchor';
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
  /** Path of the one open top-level folder in accordion mode, or null when all are closed. */
  openFolder?: string | null;
  onOpenFolderChange?: (path: string | null) => void;
  /** Slide controls in and out as their visibility rules change. */
  animateControls?: boolean;
}

// A control fades with its height, and collapsing it also closes the row gap below it.
const hiddenControl = { opacity: 0, height: 0, marginBottom: 'calc(var(--dial-row-gap) * -1)' };
const shownControl = { opacity: 1, height: 'auto', marginBottom: 'calc(var(--dial-row-gap) * 0)' };
const controlTransition = { type: 'spring' as const, visualDuration: 0.25, bounce: 0.1 };

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
              el.style.opacity = '0';
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
  // Counts folder resets, so sliders can spring to the values a reset sets.
  const [resetCount, setResetCount] = createSignal(0);

  // The reset button of the folder a control draws: a `_reset` folder, a spring, or a transition.
  const resetProps = (control: ControlMeta) => {
    if (!control.reset) return {};
    const changed = createMemo(on(() => props.values, () => DialStore.isFolderChanged(props.panelId, control.path)));
    return {
      get changed() { return changed(); },
      // One batch, so sliders see the new count with their new values.
      onReset: () => batch(() => {
        setResetCount((count) => count + 1);
        DialStore.resetFolder(props.panelId, control.path);
      }),
    };
  };

  const renderControls = (controls: () => ControlMeta[], topLevel = false) => props.animateControls
    ? <AnimatedControls controls={controls()}>{(control) => renderControl(control(), () => control().children ?? [], topLevel)}</AnimatedControls>
    : <For each={controls()}>{(control) => renderControl(control, undefined, topLevel)}</For>;

  const renderControl = (control: ControlMeta, children = () => control.children ?? [], topLevel = false) => {
    const value = () => props.values[control.path];
    const reset = resetProps(control);
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
            unit={control.unit}
            shortcut={control.shortcut}
            shortcutActive={shortcut().activePanelId === props.panelId && shortcut().activePath === control.path}
            resetCount={resetCount()}
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
            {...reset}
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
            {...reset}
          />
        );
      case 'folder': {
        if (control.fields) {
          return (
            <Fields
              label={control.label}
              controls={control.children ?? []}
              values={props.values}
              defaults={DialStore.getDefaultValues(props.panelId)}
              onChange={(next) => DialStore.updateValues(props.panelId, next)}
            />
          );
        }
        // Accordion mode controls top-level folders; nested folders keep their own state.
        const accordion = () => topLevel && props.openFolder !== undefined;
        return (
          <Folder
            title={control.label}
            defaultOpen={control.defaultOpen ?? true}
            {...reset}
            open={accordion() ? props.openFolder === control.path : undefined}
            onOpenChange={accordion() ? (open) => props.onOpenFolderChange?.(open ? control.path : null) : undefined}
          >
            {renderControls(children)}
          </Folder>
        );
      }
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
            display={control.display}
            hideLabel={control.hideLabel}
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
            hideLabel={control.pad?.hideLabel}
            dragLabels={control.pad?.dragLabels}
            onChange={(next) => DialStore.updateValue(props.panelId, control.path, next)}
          />
        );
      case 'anchor':
        return (
          <AnchorControl
            label={control.label}
            value={value() as AnchorValue}
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

  return renderControls(() => props.controls, true);
}
