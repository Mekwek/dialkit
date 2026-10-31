import { useCallback, useSyncExternalStore, type ReactNode } from 'react';
import { DialStore, type ControlMeta, type DialValue, type TransitionConfig } from '../store/DialStore';
import { ControlRenderer, loneTransition } from './ControlRenderer';
import { Folder } from './Folder';
import { TransitionControl } from './TransitionControl';
import { TransitionCopyMenu } from './TransitionCopy';

/** One row of a section: a control and the panel whose value it changes. */
export interface SectionRow {
  panelId: string;
  control: ControlMeta;
}

export interface SectionProps {
  /** The rows to draw, in order. They may come from several folders or panels. */
  rows: SectionRow[];
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  /** Controls the open state, as on a folder. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Shows a reset button in the header, visible while `changed` is true. A
   * section whose only row is a transition has the transition's own reset
   * when this is not given.
   */
  onReset?: () => void;
  changed?: boolean;
  /** Buttons beside the title. */
  actions?: ReactNode;
  /** Slide rows in and out as they come and go. */
  animateControls?: boolean;
  /** Drawn after the rows, such as a note for a section with none. */
  children?: ReactNode;
}

const EMPTY: Record<string, DialValue> = Object.freeze({}) as Record<string, DialValue>;
const noSubscription = () => () => {};
const noValues = () => EMPTY;

function usePanelValues(panelId: string | undefined): Record<string, DialValue> {
  const subscribe = useCallback(
    (callback: () => void) => DialStore.subscribe(panelId!, callback),
    [panelId]
  );
  const getValues = useCallback(() => DialStore.getValues(panelId!), [panelId]);
  return useSyncExternalStore(
    panelId === undefined ? noSubscription : subscribe,
    panelId === undefined ? noValues : getValues,
    panelId === undefined ? noValues : getValues
  );
}

/** Rows of one panel next to each other, drawn as that panel draws its rows. */
function SectionRun({ panelId, controls, animateControls }: { panelId: string; controls: ControlMeta[]; animateControls: boolean }) {
  const values = usePanelValues(panelId);
  return <ControlRenderer panelId={panelId} controls={controls} values={values} animateControls={animateControls} />;
}

/**
 * A folder of rows the host picks, possibly from several panels, drawn with
 * the rules of a panel's own folders: a section whose only row is a
 * transition shows one header, with the transition's reset and copy menu in
 * it. Each row keeps its panel, so it changes the same value wherever it
 * shows. The markup is a folder's: `.dialkit-folder > .dialkit-folder-content
 * > .dialkit-folder-inner`, with the rows inside.
 */
export function Section({
  rows,
  title,
  hint,
  defaultOpen = true,
  open,
  onOpenChange,
  onReset,
  changed,
  actions,
  animateControls = false,
  children,
}: SectionProps) {
  const only = loneTransition(rows.map((row) => row.control));
  const lone = only ? rows[0] : undefined;
  // Only a lone transition reads values here: its copy menu and its reset.
  const loneValues = usePanelValues(lone?.panelId);
  const loneValue = lone ? loneValues[lone.control.path] as TransitionConfig | undefined : undefined;

  // Each run of rows from one panel keeps its key while its rows come and go.
  const runs: { key: string; panelId: string; controls: ControlMeta[] }[] = [];
  if (!lone) {
    for (const row of rows) {
      const last = runs[runs.length - 1];
      if (last?.panelId === row.panelId) {
        last.controls.push(row.control);
      } else {
        const count = runs.filter((run) => run.panelId === row.panelId).length;
        runs.push({ key: `${row.panelId}:${count}`, panelId: row.panelId, controls: [row.control] });
      }
    }
  }

  const reset = onReset
    ? { onReset, changed }
    : lone
      ? {
          onReset: () => DialStore.resetFolder(lone.panelId, lone.control.path),
          changed: DialStore.isFolderChanged(lone.panelId, lone.control.path),
        }
      : {};
  const copyMenu = lone && loneValue
    ? <TransitionCopyMenu panelId={lone.panelId} path={lone.control.path} value={loneValue} />
    : null;

  const loneControl = lone && loneValue ? (
    <TransitionControl
      key={lone.control.path}
      panelId={lone.panelId}
      path={lone.control.path}
      label={lone.control.label}
      hint={lone.control.hint}
      value={loneValue}
      onChange={(value) => DialStore.updateValue(lone.panelId, lone.control.path, value)}
      bare
    />
  ) : null;

  return (
    <Folder
      title={title}
      defaultOpen={defaultOpen}
      hint={hint ?? lone?.control.hint}
      open={open}
      onOpenChange={onOpenChange}
      {...reset}
      actions={actions || copyMenu ? <>{actions}{copyMenu}</> : undefined}
    >
      {loneControl && (animateControls ? <div className="dialkit-control-wrapper">{loneControl}</div> : loneControl)}
      {runs.map((run) => (
        <SectionRun key={run.key} panelId={run.panelId} controls={run.controls} animateControls={animateControls} />
      ))}
      {children}
    </Folder>
  );
}
