import { ANCHOR_COLUMNS, ANCHOR_ROWS, anchorLabel, anchorValueFromKey, normalizeAnchorValue, type AnchorValue } from './anchor';

export type AnchorControlProps = {
  label: string;
  value: AnchorValue;
  onChange: (value: AnchorValue) => void;
};

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  return el;
}

/** A 3 × 3 radio grid: one pick sets both axes, and the highlight slides to it. */
export function mountAnchorControl(host: HTMLElement, initial: AnchorControlProps) {
  let props = initial;
  let value = normalizeAnchorValue(props.value);

  const root = element('div', 'dialkit-anchor');
  const caption = element('div', 'dialkit-anchor-caption');
  const label = element('span', 'dialkit-anchor-label');
  const current = element('span', 'dialkit-anchor-value');
  // The checked radio already announces the position.
  current.setAttribute('aria-hidden', 'true');
  caption.append(label, current);
  const grid = element('div', 'dialkit-anchor-grid');
  grid.setAttribute('role', 'radiogroup');
  const pill = element('span', 'dialkit-anchor-pill');
  pill.setAttribute('aria-hidden', 'true');
  grid.append(pill);
  const cells = ANCHOR_ROWS.flatMap(y => ANCHOR_COLUMNS.map(x => {
    const cell = element('button', 'dialkit-anchor-cell');
    const option = { x, y };
    cell.type = 'button';
    cell.setAttribute('role', 'radio');
    cell.setAttribute('aria-label', anchorLabel(option));
    cell.append(element('span', 'dialkit-anchor-dot'));
    cell.addEventListener('click', () => commit(option));
    grid.append(cell);
    return { cell, option };
  }));
  root.append(caption, grid);
  host.append(root);

  function render() {
    label.textContent = props.label;
    label.title = props.label;
    current.textContent = anchorLabel(value);
    grid.setAttribute('aria-label', props.label);
    const column = ANCHOR_COLUMNS.indexOf(value.x);
    const row = ANCHOR_ROWS.indexOf(value.y);
    pill.style.transform = `translate(${column * 100}%, ${row * 100}%)`;
    for (const { cell, option } of cells) {
      const checked = option.x === value.x && option.y === value.y;
      cell.setAttribute('aria-checked', String(checked));
      cell.tabIndex = checked ? 0 : -1;
    }
  }

  function commit(next: AnchorValue) {
    if (next.x === value.x && next.y === value.y) return;
    value = next;
    render();
    props.onChange({ ...value });
  }

  grid.addEventListener('keydown', event => {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    const next = anchorValueFromKey(value, event.key);
    if (!next) return;
    event.preventDefault();
    event.stopPropagation();
    commit(next);
    cells.find(({ option }) => option.x === value.x && option.y === value.y)?.cell.focus({ preventScroll: true });
  });

  render();
  return {
    update(next: AnchorControlProps) {
      props = next;
      value = normalizeAnchorValue(next.value);
      render();
    },
    destroy() { root.remove(); },
  };
}
