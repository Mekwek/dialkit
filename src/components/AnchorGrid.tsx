import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { DialStore } from '../store/DialStore';
import type { ControlMeta, DialValue, SelectOption } from '../store/DialStore';

type Option = Exclude<SelectOption, string>;

function optionsOf(control: ControlMeta): Option[] {
  return (control.options ?? []).map((option) => (typeof option === 'string' ? { value: option, label: option } : option));
}

interface AnchorGridProps {
  panelId: string;
  label: string;
  /** The select whose options are the columns, left to right. */
  columns: ControlMeta;
  /** The select whose options are the rows, top to bottom. */
  rows: ControlMeta;
  values: Record<string, DialValue>;
}

/** The pill slides to a picked cell like Arqé's: a spring with no bounce. */
const PILL_SPRING = { type: 'spring', visualDuration: 0.3, bounce: 0 } as const;

/**
 * Two selects as one grid of dots: one dot per pair of options. A click on a
 * dot sets both selects. The picked cell holds a pill that slides to the
 * next pick, and a hover shows a faint pill and a brighter dot. Arrow keys
 * move the pick.
 */
export function AnchorGrid({ panelId, label, columns, rows, values }: AnchorGridProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const cols = optionsOf(columns);
  const rowOptions = optionsOf(rows);
  const col = Math.max(0, cols.findIndex((option) => option.value === values[columns.path]));
  const row = Math.max(0, rowOptions.findIndex((option) => option.value === values[rows.path]));

  const pick = (c: number, r: number) => {
    DialStore.updateValues(panelId, { [columns.path]: cols[c].value, [rows.path]: rowOptions[r].value });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    event.stopPropagation();
    const c = Math.min(cols.length - 1, Math.max(0, col + move[0]));
    const r = Math.min(rowOptions.length - 1, Math.max(0, row + move[1]));
    pick(c, r);
    // Keep the focus on the picked dot.
    const target = event.currentTarget.querySelector<HTMLButtonElement>(`[data-cell="${c}-${r}"]`);
    target?.focus();
  };

  const [hc, hr] = hovered ? hovered.split('-').map(Number) : [-1, -1];
  // A hover shows a faint pill on the hovered cell, except the picked one.
  const showHoverPill = hovered !== null && (hc !== col || hr !== row);

  return (
    <div
      className="dialkit-anchor"
      role="radiogroup"
      aria-label={label}
      style={{ '--dial-anchor-columns': cols.length, '--dial-anchor-rows': rowOptions.length } as React.CSSProperties}
      onKeyDown={onKeyDown}
      onPointerLeave={() => setHovered(null)}
    >
      {showHoverPill && (
        <span
          className="dialkit-anchor-pill dialkit-anchor-pill-hover"
          aria-hidden="true"
          style={{ transform: `translate(${hc * 100}%, ${hr * 100}%)` }}
        />
      )}
      <motion.span
        className="dialkit-anchor-pill"
        aria-hidden="true"
        initial={false}
        animate={{ x: `${col * 100}%`, y: `${row * 100}%` }}
        transition={PILL_SPRING}
      />
      {rowOptions.map((r, ri) =>
        cols.map((c, ci) => {
          const picked = ci === col && ri === row;
          return (
            <button
              key={`${ci}-${ri}`}
              type="button"
              role="radio"
              aria-checked={picked}
              aria-label={`${r.label}, ${c.label}`}
              title={`${r.label}, ${c.label}`}
              tabIndex={picked ? 0 : -1}
              data-cell={`${ci}-${ri}`}
              className="dialkit-anchor-cell"
              onPointerEnter={() => setHovered(`${ci}-${ri}`)}
              onClick={() => pick(ci, ri)}
            >
              <span className="dialkit-anchor-dot" />
            </button>
          );
        })
      )}
    </div>
  );
}
