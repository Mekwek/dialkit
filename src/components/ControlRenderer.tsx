import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DialStore, ControlMeta, DialValue, SpringConfig, TransitionConfig } from '../store/DialStore';
import { mergeControls } from '../control-presence';
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
  /** Path of the one open top-level folder in accordion mode, or null when all are closed. */
  openFolder?: string | null;
  onOpenFolderChange?: (path: string | null) => void;
  /** Slide controls in and out as their visibility rules change. */
  animateControls?: boolean;
}

// A control fades with its height, and collapsing it also closes the row gap below it.
// It clips only while sliding, so a settled control's popovers and focus rings are not cut off.
const hiddenControl = { opacity: 0, height: 0, marginBottom: 'calc(var(--dial-row-gap) * -1)', overflowY: 'clip' as const };
const shownControl = { opacity: 1, height: 'auto', marginBottom: 'calc(var(--dial-row-gap) * 0)', overflowY: 'clip' as const, transitionEnd: { overflowY: 'visible' as const } };

/** Slides controls in as they appear, and out where they were as they leave. */
function AnimatedControls({ controls, children }: { controls: ControlMeta[]; children: (control: ControlMeta) => ReactNode }) {
  const [rows, setRows] = useState({ controls, rendered: controls });
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; }, []);

  if (rows.controls !== controls) setRows({ controls, rendered: mergeControls(rows.rendered, controls) });
  const present = new Set(controls.map(control => control.path));
  const remove = (path: string) => setRows(current => ({
    ...current,
    rendered: current.rendered.filter(control => control.path !== path || current.controls.some(shown => shown.path === path)),
  }));

  return rows.rendered.map((control) => (
    <AnimatePresence key={control.path} initial={mounted.current} onExitComplete={() => remove(control.path)}>
      {present.has(control.path) && (
        <motion.div
          key={control.path}
          className="dialkit-control-wrapper"
          initial={hiddenControl}
          animate={shownControl}
          exit={hiddenControl}
          transition={{ type: 'spring', visualDuration: 0.25, bounce: 0.1 }}
        >
          {children(control)}
        </motion.div>
      )}
    </AnimatePresence>
  ));
}

// Renders a ControlMeta tree with the standard DialKit controls.
// Shared by the panel and the timeline clip popover.
export function ControlRenderer({ panelId, controls, values, transitionDuration, openFolder, onOpenFolderChange, animateControls = false }: ControlRendererProps) {
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

  const renderControls = (controls: ControlMeta[], topLevel = false) => animateControls
    ? <AnimatedControls controls={controls}>{(control) => renderControl(control, topLevel)}</AnimatedControls>
    : controls.map((control) => renderControl(control, topLevel));

  const renderControl = (control: ControlMeta, topLevel = false) => {
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

      case 'folder': {
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
        // Accordion mode controls top-level folders; nested folders keep their own state.
        const accordion = topLevel && openFolder !== undefined;
        return (
          <Folder
            key={control.path}
            title={control.label}
            defaultOpen={control.defaultOpen ?? true}
            {...resetProps(control)}
            open={accordion ? openFolder === control.path : undefined}
            onOpenChange={accordion ? (open) => onOpenFolderChange?.(open ? control.path : null) : undefined}
          >
            {renderControls(control.children ?? [])}
          </Folder>
        );
      }

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

  return <>{renderControls(controls, true)}</>;
}
