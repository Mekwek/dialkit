import { useContext, useState } from 'react';
import { DialStore, ControlMeta, DialValue, SpringConfig, TransitionConfig } from '../store/DialStore';
import { ShortcutContext } from './ShortcutListener';
import { Folder } from './Folder';
import { Slider } from './Slider';
import { Toggle } from './Toggle';
import { SpringControl } from './SpringControl';
import { TransitionControl } from './TransitionControl';
import { TextControl } from './TextControl';
import { SelectControl } from './SelectControl';
import { ColorControl } from './ColorControl';
import { ImageControl } from './ImageControl';
import { DialPad } from './DialPad';
import { AnchorControl } from './AnchorControl';
import { Fields } from './Fields';
import type { DialPadValue } from '../dial-pad';
import type { AnchorValue } from '../anchor';

interface ControlRendererProps {
  panelId: string;
  controls: ControlMeta[];
  values: Record<string, DialValue>;
  /** Optional timeline-owned duration rendered inside the transition editor. */
  transitionDuration?: {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
  };
}

// Renders a ControlMeta tree with the standard DialKit controls.
// Shared by the panel and the timeline clip popover.
export function ControlRenderer({ panelId, controls, values, transitionDuration }: ControlRendererProps) {
  const shortcutCtx = useContext(ShortcutContext);
  // Counts folder resets, so sliders can spring to the values a reset sets.
  const [resetCount, setResetCount] = useState(0);

  // The reset button of the folder a control draws: a `_reset` folder, a spring, or a transition.
  const resetProps = (control: ControlMeta) => control.reset ? {
    changed: DialStore.isFolderChanged(panelId, control.path),
    onReset: () => {
      setResetCount((count) => count + 1);
      DialStore.resetFolder(panelId, control.path);
    },
  } : {};

  const renderControl = (control: ControlMeta) => {
    const value = values[control.path];

    switch (control.type) {
      case 'slider':
        return (
          <Slider
            key={control.path}
            label={control.label}
            value={value as number}
            onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
            min={control.min}
            max={control.max}
            step={control.step}
            unit={control.unit}
            shortcut={control.shortcut}
            shortcutActive={shortcutCtx.activePanelId === panelId && shortcutCtx.activePath === control.path}
            resetCount={resetCount}
          />
        );

      case 'toggle':
        return (
          <Toggle
            key={control.path}
            label={control.label}
            checked={value as boolean}
            onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
            shortcut={control.shortcut}
            shortcutActive={shortcutCtx.activePanelId === panelId && shortcutCtx.activePath === control.path}
          />
        );

      case 'spring':
        return (
          <SpringControl
            key={control.path}
            panelId={panelId}
            path={control.path}
            label={control.label}
            spring={value as SpringConfig}
            onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
            {...resetProps(control)}
          />
        );

      case 'transition':
        return (
          <TransitionControl
            key={control.path}
            panelId={panelId}
            path={control.path}
            label={control.label}
            value={value as TransitionConfig}
            onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
            durationControl={transitionDuration}
            {...resetProps(control)}
          />
        );

      case 'folder':
        if (control.fields) {
          return (
            <Fields
              key={control.path}
              label={control.label}
              controls={control.children ?? []}
              values={values}
              defaults={DialStore.getDefaultValues(panelId)}
              onChange={(v) => DialStore.updateValues(panelId, v)}
            />
          );
        }
        return (
          <Folder
            key={control.path}
            title={control.label}
            defaultOpen={control.defaultOpen ?? true}
            {...resetProps(control)}
          >
            {control.children?.map(renderControl)}
          </Folder>
        );

      case 'text':
        return (
          <TextControl
            key={control.path}
            label={control.label}
            value={value as string}
            onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
            placeholder={control.placeholder}
          />
        );

      case 'select':
        return (
          <SelectControl
            key={control.path}
            label={control.label}
            value={value as string}
            options={control.options ?? []}
            onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
            display={control.display}
            hideLabel={control.hideLabel}
          />
        );

      case 'color':
        return (
          <ColorControl
            key={control.path}
            label={control.label}
            value={value as string}
            onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
          />
        );

      case 'image':
        return (
          <ImageControl
            key={control.path}
            options={control.options}
            label={control.label}
            value={value as string}
            onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
          />
        );

      case 'pad':
        return (
          <DialPad
            key={control.path}
            label={control.label}
            value={value as DialPadValue}
            x={control.pad?.x}
            y={control.pad?.y}
            labels={control.pad?.labels}
            hideLabel={control.pad?.hideLabel}
            dragLabels={control.pad?.dragLabels}
            onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
          />
        );

      case 'anchor':
        return (
          <AnchorControl
            key={control.path}
            label={control.label}
            value={value as AnchorValue}
            onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
          />
        );

      case 'action':
        return (
          <button
            key={control.path}
            className="dialkit-button"
            onClick={() => DialStore.triggerAction(panelId, control.path)}
          >
            {control.label}
          </button>
        );

      default:
        return null;
    }
  };

  return <>{controls.map(renderControl)}</>;
}
