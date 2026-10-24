import type { ControlMeta } from './store/DialStore';

/**
 * Rows to render while controls come and go: the current controls in order,
 * with each control that left kept after the row it followed, so it can
 * slide out where it was.
 */
export function mergeControls(rendered: ControlMeta[], controls: ControlMeta[]): ControlMeta[] {
  const present = new Set(controls.map(control => control.path));
  const rows = [...controls];
  let previous: string | undefined;
  for (const row of rendered) {
    if (!present.has(row.path)) {
      rows.splice(previous === undefined ? 0 : rows.findIndex(control => control.path === previous) + 1, 0, row);
    }
    previous = row.path;
  }
  return rows;
}
