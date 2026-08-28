import { useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DialStore, ControlMeta, DialValue, SpringConfig, TransitionConfig } from '../store/DialStore';
import { CONTROL_ANIM } from './control-motion';
import { ShortcutContext } from './ShortcutListener';
import { Folder } from './Folder';
import { Slider } from './Slider';
import { Toggle } from './Toggle';
import { SpringControl } from './SpringControl';
import { TransitionControl } from './TransitionControl';
import { TextControl } from './TextControl';
import { SelectControl } from './SelectControl';
import { ColorControl } from './ColorControl';

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
  /** Cap (seconds) on the settle a physics spring's params may produce —
   *  threaded into TransitionControl's physics sliders (see its
   *  physicsSettleCap doc). */
  physicsSettleCap?: number;
  /**
   * Opt-in enter/exit animation for each rendered control (used so
   * conditionally-visible controls animate in/out when their `visibleWhen`
   * rule flips). Defaults to false so callers like the Timeline clip
   * popover stay vanilla — no motion wrapper, no AnimatePresence.
   */
  animateControls?: boolean;
  /**
   * Path of the currently-open top-level (depth 0) folder when the caller is
   * running accordion mode. Only consulted when `onAccordionToggle` is also
   * provided; nested folders (depth > 0) always stay independent.
   */
  accordionOpenPath?: string | null;
  /** Fired when a depth-0 folder is toggled in accordion mode. Receives the folder's path and its requested next open state. */
  onAccordionToggle?: (path: string, next: boolean) => void;
}

// Renders a ControlMeta tree with the standard DialKit controls.
// Shared by the panel and the timeline clip popover.
export function ControlRenderer({
  panelId,
  controls,
  values,
  transitionDuration,
  physicsSettleCap,
  animateControls = false,
  accordionOpenPath,
  onAccordionToggle,
}: ControlRendererProps) {
  const shortcutCtx = useContext(ShortcutContext);

  const renderControlInner = (control: ControlMeta, depth: number) => {
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
            shortcut={control.shortcut}
            shortcutActive={shortcutCtx.activePanelId === panelId && shortcutCtx.activePath === control.path}
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
            physicsSettleCap={physicsSettleCap}
          />
        );

      case 'folder': {
        // Controlled accordion open state only applies to depth-0 folders
        // when the caller opted into accordion mode by passing
        // onAccordionToggle. Nested folders always stay independent
        // (uncontrolled) regardless of mode.
        const controlledProps =
          depth === 0 && onAccordionToggle
            ? {
                open: accordionOpenPath === control.path,
                onToggle: (next: boolean) => onAccordionToggle(control.path, next),
              }
            : {};
        const children = control.children?.map((child) => renderControl(child, depth + 1));
        return (
          <Folder key={control.path} title={control.label} defaultOpen={control.defaultOpen ?? true} {...controlledProps}>
            {animateControls ? <AnimatePresence initial={false}>{children}</AnimatePresence> : children}
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

  const renderControl = (control: ControlMeta, depth = 0) => {
    const inner = renderControlInner(control, depth);
    if (inner === null || !animateControls) return inner;

    // Every control is wrapped in a motion.div so it can animate its
    // enter/exit when conditional visibility hides/shows it. The marker
    // classes let theme.css target folder wrappers specifically (for the
    // adjacent-divider collapse rule) without needing :has(). Spring and
    // transition controls render as Folder internally.
    const isFolder = control.type === 'folder' || control.type === 'spring' || control.type === 'transition';
    const wrapClassName = isFolder
      ? 'dialkit-control-wrap dialkit-control-wrap-folder'
      : 'dialkit-control-wrap';

    return (
      <motion.div key={control.path} className={wrapClassName} {...CONTROL_ANIM}>
        {inner}
      </motion.div>
    );
  };

  if (!animateControls) {
    return <>{controls.map((control) => renderControl(control, 0))}</>;
  }

  return (
    <AnimatePresence initial={false}>
      {controls.map((control) => renderControl(control, 0))}
    </AnimatePresence>
  );
}
