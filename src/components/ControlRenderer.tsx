import { useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DialStore, ControlMeta, DialValue, SpringConfig, TransitionConfig } from '../store/DialStore';
import { CONTROL_ANIM } from './control-motion';
import { ShortcutContext } from './ShortcutListener';
import { Folder } from './Folder';
import { Slider } from './Slider';
import { FieldRow } from './FieldRow';
import { Toggle } from './Toggle';
import { SpringControl } from './SpringControl';
import { TransitionControl } from './TransitionControl';
import { TransitionCopyMenu } from './TransitionCopy';
import { TextControl } from './TextControl';
import { SelectControl, SelectPills } from './SelectControl';
import { ColorControl } from './ColorControl';
import { ImageControl } from './ImageControl';
import { DialPad } from './DialPad';
import { PadGroup } from './PadGroup';
import type { DialPadValue } from '../dial-pad';

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

  const renderControlInner = (control: ControlMeta, depth: number, bare: boolean) => {
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
            {...valueResetProps(control.path)}
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
            bare={bare}
            {...valueResetProps(control.path)}
          />
        );

      case 'folder': {
        if (control.fields) {
          return <FieldRow key={control.path} panelId={panelId} control={control} values={values} />;
        }
        if (control.padGroup) {
          return <PadGroup key={control.path} panelId={panelId} control={control} values={values} />;
        }
        // Controlled accordion open state only applies to depth-0 folders
        // when the caller opted into accordion mode by passing
        // onAccordionToggle. Nested folders always stay independent
        // (uncontrolled) regardless of mode.
        const controlledProps =
          depth === 0 && onAccordionToggle
            ? {
                open: accordionOpenPath === control.path,
                onOpenChange: (next: boolean) => onAccordionToggle(control.path, next),
              }
            : {};
        // A section reset that runs an action hides that action's row.
        const rows = control.children?.filter((child) => child.path !== control.reset) ?? [];
        // A section whose only row is a transition shows one header: the
        // section's. The transition draws no header of its own.
        const only = rows.length === 1 && rows[0].type === 'transition' ? rows[0] : undefined;
        const children = rows.map((child) => renderControl(child, depth + 1, child === only));
        const resetProps = control.reset
          ? {
              onReset: () => DialStore.resetSection(panelId, control.path),
              changed: DialStore.sectionHasChanges(panelId, control.path),
            }
          : only
            ? valueResetProps(only.path)
            : {};
        return (
          <Folder
            key={control.path}
            title={control.label}
            defaultOpen={control.defaultOpen ?? true}
            {...controlledProps}
            {...resetProps}
            actions={only ? <TransitionCopyMenu panelId={panelId} path={only.path} value={values[only.path] as TransitionConfig} /> : undefined}
          >
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
        if (control.display === 'pills') {
          return (
            <SelectPills
              key={control.path}
              label={control.label}
              value={value as string}
              options={control.options ?? []}
              onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
              hideLabel={control.hideLabel}
            />
          );
        }
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
            mapping={control.pad?.mapping}
            hideLabel={control.pad?.hideLabel}
            dragFields={control.pad?.dragFields}
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

  // A spring or transition control draws a section header, so it gets the
  // section reset icon too. The icon puts its one value back to the default.
  const valueResetProps = (path: string) => ({
    onReset: () => DialStore.resetPaths(panelId, [path]),
    changed: DialStore.hasChanges(panelId, [path]),
  });

  const renderControl = (control: ControlMeta, depth = 0, bare = false) => {
    const inner = renderControlInner(control, depth, bare);
    if (inner === null || !animateControls) return inner;

    // Every control is wrapped in a motion.div so it can animate its
    // enter/exit when conditional visibility hides/shows it. The marker
    // classes let theme.css target folder wrappers specifically (for the
    // adjacent-divider collapse rule) without needing :has(). Spring and
    // transition controls render as Folder internally.
    // An X / Y / Z group or a pad group is a folder in the store, but draws
    // no Folder: it is a plain row and keeps the row gap.
    const drawsFolder = control.type === 'folder' && !control.fields && !control.padGroup;
    const isFolder = drawsFolder || control.type === 'spring' || (control.type === 'transition' && !bare);
    const wrapClassName = isFolder
      ? 'dialkit-control-wrap dialkit-control-wrap-folder'
      : control.fields
        ? 'dialkit-control-wrap dialkit-control-wrap-fields'
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
