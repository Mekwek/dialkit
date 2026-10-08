import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { stepInputKey } from '../control-keyboard';
import { ICON_LINK, ICON_RESET } from '../icons';
import { decimalsForStep, parseFieldInput, roundValue } from '../numeric';
import { DialStore } from '../store/DialStore';
import type { ControlMeta, DialValue } from '../store/DialStore';

interface FieldRowProps {
  panelId: string;
  control: ControlMeta;
  values: Record<string, DialValue>;
}

/** Pixels the pointer moves before a press becomes a drag. */
const DRAG_THRESHOLD = 3;

function StrokeIcon({ paths }: { paths: string[] }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/**
 * An X / Y / Z group: a folder set with `_fields: true`. The label and its
 * reset sit on a line above one row of short number fields, with the lock at
 * the right end of that line. The
 * folder's number children are the fields. A boolean child is a lock: the
 * host decides what a lock does, this row only shows and switches it.
 */
export function FieldRow({ panelId, control, values }: FieldRowProps) {
  const children = control.children ?? [];
  const axes = children.filter((child) => child.type === 'slider');
  const lock = children.find((child) => child.type === 'toggle');
  const locked = lock ? values[lock.path] === true : false;
  const paths = children.map((child) => child.path);

  return (
    <div className="dialkit-fields-group">
      <div className="dialkit-fields-label">
        <span className="dialkit-fields-label-text">{control.label}</span>
        <button
          type="button"
          className="dialkit-fields-button dialkit-fields-reset"
          aria-label={`Reset ${control.label}`}
          title="Reset"
          data-changed={DialStore.hasChanges(panelId, paths) || undefined}
          onClick={() => DialStore.resetPaths(panelId, paths)}
        >
          <StrokeIcon paths={ICON_RESET} />
        </button>
        {lock && (
          <button
            type="button"
            className="dialkit-fields-button dialkit-fields-lock"
            aria-label={`${lock.label} ${control.label}`}
            aria-pressed={locked}
            title={lock.label}
            onClick={() => DialStore.updateValue(panelId, lock.path, !locked)}
          >
            <StrokeIcon paths={ICON_LINK} />
          </button>
        )}
      </div>
      <div className="dialkit-fields">
        {axes.map((axis) => (
          <NumberField
            key={axis.path}
            panelId={panelId}
            control={axis}
            group={control.label}
            value={values[axis.path]}
            maxDecimals={control.fields?.decimals}
          />
        ))}
      </div>
    </div>
  );
}

interface NumberFieldProps {
  panelId: string;
  control: ControlMeta;
  group: string;
  value: DialValue | undefined;
  /** Most decimals shown. See FieldsConfig.decimals. */
  maxDecimals: number | undefined;
}

/** `value` with at most `decimals` decimals, no trailing zeros, never -0. */
function formatValue(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)) || 0);
}

/**
 * One field: drag the axis letter left or right to change the value (Shift
 * moves ten times as far), click the number to type it. Values show without
 * trailing zeros, and with at most `maxDecimals` decimals; typing starts from
 * the exact value.
 */
function NumberField({ panelId, control, group, value, maxDecimals }: NumberFieldProps) {
  const { min = 0, max = 1, step = 0.01, unit } = control;
  const current = typeof value === 'number' && Number.isFinite(value) ? value : min;
  const decimals = decimalsForStep(step, min, max);
  const exact = formatValue(current, decimals);
  const text = formatValue(current, Math.min(decimals, maxDecimals ?? decimals));
  const name = `${group} ${control.label}`;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);
  const press = useRef<{ id: number; x: number; start: number; moved: boolean } | null>(null);
  // Set when Enter or Escape already finished the edit, so the blur that
  // follows does not save a second time.
  const finished = useRef(false);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = (next: number) => {
    const clamped = Math.max(min, Math.min(max, next));
    DialStore.updateValue(panelId, control.path, roundValue(clamped, step, min, max));
  };

  const startEditing = () => {
    finished.current = false;
    setDraft(exact);
    setEditing(true);
  };

  const finish = (keep: boolean) => {
    // An entry left as it opened is not an edit.
    if (keep && draft !== exact) {
      const parsed = parseFieldInput(draft, unit);
      if (parsed !== null) commit(parsed);
    }
    finished.current = true;
    setEditing(false);
  };

  // One pixel of drag moves a thousandth of the range, at most one unit (a
  // wide range like a world position would otherwise jump) and never less
  // than one step.
  const perPixel = Math.max(step, Math.min((max - min) / 1000, 1));

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    press.current = { id: event.pointerId, x: event.clientX, start: current, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const p = press.current;
    if (!p || event.pointerId !== p.id) return;
    const dx = event.clientX - p.x;
    if (!p.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    p.moved = true;
    commit(p.start + dx * perPixel * (event.shiftKey ? 10 : 1));
  };

  const endPress = (event: ReactPointerEvent<HTMLElement>) => {
    if (press.current?.id === event.pointerId) press.current = null;
  };

  return (
    <div className="dialkit-field" data-editing={editing || undefined}>
      <span
        className="dialkit-field-axis"
        aria-hidden="true"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPress}
        onPointerCancel={endPress}
      >
        {control.label}
      </span>
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          className="dialkit-field-input"
          aria-label={name}
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (!finished.current) finish(true);
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            const stepped = stepInputKey(event, draft, current, min, max, step);
            if (stepped !== undefined) {
              commit(stepped);
              setDraft(formatValue(stepped, decimals));
              return;
            }
            if (event.key === 'Enter') finish(true);
            if (event.key === 'Escape') finish(false);
          }}
        />
      ) : (
        <button
          type="button"
          className="dialkit-field-value"
          aria-label={`${name}: ${text}${unit ?? ''}`}
          onClick={startEditing}
        >
          {text}
          {unit && (
            <span className="dialkit-slider-unit" data-spaced={/^\p{L}/u.test(unit) || undefined}>
              {unit}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
