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
import { TransitionCopyMenu } from './TransitionCopy';
import { TextControl } from './TextControl';
import { SelectControl } from './SelectControl';
import { ColorControl } from './ColorControl';
import { ImageControl } from './ImageControl';
import { DialPad } from './DialPad';
import { PadGroup } from './PadGroup';
import { AnchorControl } from './AnchorControl';
import { Fields } from './Fields';
import { BackgroundControl } from './BackgroundControl';
import { LayerListControl } from './LayerListControl';
import { PictureListControl } from './PictureListControl';
import type { DialPadValue } from '../dial-pad';
import type { AnchorValue } from '../anchor';
import { layerAction, type LayersValue } from '../layers';
import { pictureAction, type PicturesValue } from '../pictures';
import { hasActionHints } from '../hints';
import { useHints } from '../hooks/useHints';
import { useControlValue, useFolderChanged, usePanelValues } from '../hooks/usePanelValues';
import type { BackgroundValue } from '../background';

interface ControlRendererProps {
  panelId: string;
  controls: ControlMeta[];
  /**
   * Values to draw in place of the store's, such as a timeline clip's. Without
   * them each row reads its own value from the store, so a write redraws only
   * the rows it changes.
   */
  values?: Record<string, DialValue>;
  /** Optional timeline-owned duration rendered inside the transition editor. */
  transitionDuration?: {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    /** Replaces the curve's own Duration hint. */
    hint?: string;
  };
  /** Longest settle a physics spring may reach. See TransitionControl. */
  physicsSettleCap?: number;
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

/**
 * A section whose only row is a transition shows one header, the section's:
 * the transition draws no folder of its own, and its reset and copy menu
 * move into the section's header.
 */
export function loneTransition(rows: ControlMeta[]): ControlMeta | undefined {
  return rows.length === 1 && rows[0].type === 'transition' ? rows[0] : undefined;
}

interface RowProps {
  panelId: string;
  control: ControlMeta;
  values: Record<string, DialValue> | undefined;
}

interface ControlRowProps extends RowProps, Pick<ControlRendererProps, 'transitionDuration' | 'physicsSettleCap'> {
  /** A transition drawn without its own folder header. */
  bare: boolean;
}

/** One control. It reads its own value, so a write to another row leaves it as it is. */
function ControlRow({ panelId, control, values, transitionDuration, physicsSettleCap, bare }: ControlRowProps) {
  const shortcutCtx = useContext(ShortcutContext);
  const stored = useControlValue(values ? undefined : panelId, control.path);
  const value = values ? values[control.path] : stored;
  // The reset button of the folder a control draws: a spring, a transition, or a background.
  const changed = useFolderChanged(panelId, control.reset ? control.path : undefined);
  const reset = control.reset ? { changed, onReset: () => DialStore.resetFolder(panelId, control.path) } : {};

  switch (control.type) {
    case 'slider':
      return (
        <Slider
          key={control.path}
          label={control.label}
          hint={control.hint}
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
          hint={control.hint}
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
          hint={control.hint}
          spring={value as SpringConfig}
          onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
          {...reset}
        />
      );

    case 'transition':
      return (
        <TransitionControl
          key={control.path}
          panelId={panelId}
          path={control.path}
          label={control.label}
          hint={control.hint}
          value={value as TransitionConfig}
          onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
          durationControl={transitionDuration}
          physicsSettleCap={physicsSettleCap}
          bare={bare}
          {...reset}
        />
      );

    case 'text':
      return (
        <TextControl
          key={control.path}
          label={control.label}
          hint={control.hint}
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
          hint={control.hint}
          value={value as string}
          options={control.options ?? []}
          onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
          display={control.display}
          hideLabel={control.hideLabel}
          add={control.add ? { ...control.add, onClick: () => DialStore.triggerAction(panelId, `${control.path}.add`) } : undefined}
        />
      );

    case 'color':
      return (
        <ColorControl
          key={control.path}
          label={control.label}
          hint={control.hint}
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
          hint={control.hint}
          value={value as string}
          onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
        />
      );

    case 'pad':
      return (
        <DialPad
          key={control.path}
          label={control.label}
          hint={control.hint}
          value={value as DialPadValue}
          x={control.pad?.x}
          y={control.pad?.y}
          labels={control.pad?.labels}
          mapping={control.pad?.mapping}
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
          hint={control.hint}
          value={value as AnchorValue | null}
          onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
        />
      );

    case 'layers':
      return (
        <LayerListControl
          key={control.path}
          label={control.label}
          hint={control.hint}
          value={value as LayersValue}
          addLabel={control.layers?.addLabel}
          addDisabled={control.layers?.addDisabled}
          empty={control.layers?.empty}
          onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
          onAction={(kind, id) => DialStore.triggerAction(panelId, layerAction(control.path, kind, id))}
        />
      );

    case 'pictures':
      return (
        <PictureListControl
          key={control.path}
          label={control.label}
          hint={control.hint}
          families={control.pictures?.families ?? []}
          value={value as PicturesValue}
          onPick={(id) => DialStore.triggerAction(panelId, pictureAction(control.path, id))}
        />
      );

    case 'background':
      return (
        <Folder key={control.path} title={control.label} defaultOpen={DialStore.isFolderOpen(panelId, control.path, true)} onOpenChange={(open) => DialStore.rememberFolder(panelId, control.path, open)} hint={control.hint} {...reset}>
          <BackgroundControl
            panelId={panelId}
            label={control.label}
            value={value as BackgroundValue}
            upload={control.background?.upload}
            onChange={(v) => DialStore.updateValue(panelId, control.path, v)}
          />
        </Folder>
      );

    case 'action':
      return (
        <button
          key={control.path}
          className="dialkit-button"
          data-hint={control.hint}
          onClick={() => DialStore.triggerAction(panelId, control.path)}
        >
          {control.label}
        </button>
      );

    default:
      return null;
  }
}

/** Fields read several values, so they follow the whole panel. */
function FieldsRow({ panelId, control, values }: RowProps) {
  const stored = usePanelValues(values ? undefined : panelId);
  return (
    <Fields
      label={control.label}
      controls={control.children ?? []}
      values={values ?? stored}
      defaults={DialStore.getResetValues(panelId)}
      hint={control.hint}
      decimals={control.decimals}
      trim={control.trim}
      onChange={(v) => DialStore.updateValues(panelId, v)}
    />
  );
}

interface ControlFolderProps extends RowProps {
  /** The folder's lone transition, whose reset and copy menu sit in the folder's header. */
  only: ControlMeta | undefined;
  open: boolean | undefined;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/** A folder control. Its header reads what it shows, so the rows inside do not redraw with it. */
function ControlFolder({ panelId, control, values, only, open, onOpenChange, children }: ControlFolderProps) {
  const owner = control.reset || !only ? control : only;
  const changed = useFolderChanged(panelId, owner.reset ? owner.path : undefined);
  const stored = useControlValue(values ? undefined : panelId, only?.path);
  const onlyValue = only && values ? values[only.path] : stored;
  return (
    <Folder
      title={control.label}
      defaultOpen={DialStore.isFolderOpen(panelId, control.path, control.defaultOpen ?? true)}
      hint={control.hint ?? only?.hint}
      {...(owner.reset ? { changed, onReset: () => DialStore.resetFolder(panelId, owner.path) } : {})}
      actions={only ? <TransitionCopyMenu panelId={panelId} path={only.path} value={onlyValue as TransitionConfig} /> : undefined}
      open={open}
      onOpenChange={onOpenChange}
    >
      {children}
    </Folder>
  );
}

// Renders a ControlMeta tree with the standard DialKit controls.
// Shared by the panel and the timeline clip popover.
export function ControlRenderer({ panelId, controls, values, transitionDuration, physicsSettleCap, openFolder, onOpenFolderChange, animateControls = false }: ControlRendererProps) {
  // Hinted action buttons are the renderer's own rows; each control mounts its own.
  useHints(hasActionHints(controls));

  // `bare` names a transition drawn without its own folder header.
  const renderControls = (controls: ControlMeta[], topLevel = false, bare?: ControlMeta) => animateControls
    ? <AnimatedControls controls={controls}>{(control) => renderControl(control, topLevel, control === bare)}</AnimatedControls>
    : controls.map((control) => renderControl(control, topLevel, control === bare));

  const renderControl = (control: ControlMeta, topLevel = false, bare = false): ReactNode => {
    if (control.type !== 'folder') {
      return (
        <ControlRow
          key={control.path}
          panelId={panelId}
          control={control}
          values={values}
          transitionDuration={transitionDuration}
          physicsSettleCap={physicsSettleCap}
          bare={bare}
        />
      );
    }
    if (control.fields) {
      return <FieldsRow key={control.path} panelId={panelId} control={control} values={values} />;
    }
    if (control.padGroup) {
      return <PadGroup key={control.path} panelId={panelId} control={control} values={values} />;
    }
    // A row draws its two controls side by side. --dial-row-label-style
    // picks where the labels sit (theme.css): 1, a title above each
    // control; 2, inside the controls, with `_inlineLabels` names.
    if (control.row) {
      return (
        <div key={control.path} className="dialkit-row-group">
          {(control.children ?? []).slice(0, 2).map((child) => {
            const inline = control.inlineLabels?.[child.path.slice(control.path.length + 1)];
            // Segmented options fill their cell, as a row of their own does.
            const shown = child.type === 'select' && child.display === 'segmented' ? { ...child, hideLabel: true } : child;
            return (
              <div key={child.path} className="dialkit-row-cell" data-inline-label={inline === '' ? 'none' : undefined}>
                <span className="dialkit-row-label">{child.label}</span>
                {renderControl(inline ? { ...shown, label: inline } : shown)}
              </div>
            );
          })}
        </div>
      );
    }
    // Accordion mode controls top-level folders; nested folders keep their own state.
    const accordion = topLevel && openFolder !== undefined;
    const rows = control.children ?? [];
    const only = loneTransition(rows);
    return (
      <ControlFolder
        key={control.path}
        panelId={panelId}
        control={control}
        values={values}
        only={only}
        open={accordion ? openFolder === control.path : undefined}
        onOpenChange={accordion ? (open) => onOpenFolderChange?.(open ? control.path : null) : (open) => DialStore.rememberFolder(panelId, control.path, open)}
      >
        {renderControls(rows, false, only)}
      </ControlFolder>
    );
  };

  return <>{renderControls(controls, true)}</>;
}
