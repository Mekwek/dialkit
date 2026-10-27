import { For, batch, createMemo, createSignal, on } from 'solid-js';
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

interface ControlRendererProps {
  panelId: string;
  controls: ControlMeta[];
  values: Record<string, DialValue>;
  transitionDuration?: TransitionDurationControl;
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

  const renderControl = (control: ControlMeta) => {
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
      case 'folder':
        return (
          <Folder
            title={control.label}
            defaultOpen={control.defaultOpen ?? true}
            {...reset}
          >
            <For each={control.children ?? []}>{renderControl}</For>
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

  return <For each={props.controls}>{renderControl}</For>;
}
