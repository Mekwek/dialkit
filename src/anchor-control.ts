import { ANCHOR_COLUMNS, ANCHOR_ROWS, anchorLabel, anchorValueFromKey, normalizeAnchorValue, type AnchorValue } from './anchor';
import { springParams } from './transition-math';

export type AnchorControlProps = {
  label: string;
  value: AnchorValue;
  onChange: (value: AnchorValue) => void;
  /** A short sentence shown while H is held over the control. */
  hint?: string;
};

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  return el;
}

/** The highlight's slide: a spring with no bounce, so critically damped. */
const PILL_SPRING = springParams({ type: 'spring', visualDuration: 0.3, bounce: 0 });
const PILL_OMEGA = Math.sqrt(PILL_SPRING.stiffness / PILL_SPRING.mass);
/** Long enough for that spring to come within a thousandth of the cell. */
const PILL_DURATION = 0.55;

type Slide = { from: [number, number]; velocity: [number, number]; to: [number, number]; animation: Animation };

/** Position and velocity, in cells, of one axis of a slide t seconds in. */
function slideAxis(from: number, velocity: number, to: number, t: number): [number, number] {
  const offset = from - to;
  const b = velocity + PILL_OMEGA * offset;
  const decay = Math.exp(-PILL_OMEGA * t);
  return [to + (offset + b * t) * decay, (velocity - PILL_OMEGA * b * t) * decay];
}

/** A 3 × 3 radio grid: one pick sets both axes, and the highlight slides to it. */
export function mountAnchorControl(host: HTMLElement, initial: AnchorControlProps) {
  let props = initial;
  let value = normalizeAnchorValue(props.value);
  let at: [number, number] | undefined;
  let slide: Slide | undefined;

  const grid = element('div', 'dialkit-anchor');
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
  host.append(grid);

  function move(to: [number, number]) {
    const from = at;
    at = to;
    pill.style.translate = `${to[0] * 100}% ${to[1] * 100}%`;
    if (!from || (from[0] === to[0] && from[1] === to[1])) return;
    if (typeof pill.animate !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // A pick during a slide turns the pill from where it is, at the speed it
    // has, so it never jumps.
    let start = from;
    let velocity: [number, number] = [0, 0];
    if (slide?.animation.playState === 'running') {
      const t = Number(slide.animation.currentTime ?? 0) / 1000;
      const { from: prev, velocity: v, to: target } = slide;
      const [x, vx] = slideAxis(prev[0], v[0], target[0], t);
      const [y, vy] = slideAxis(prev[1], v[1], target[1], t);
      start = [x, y];
      velocity = [vx, vy];
    }
    slide?.animation.cancel();
    const count = Math.ceil(PILL_DURATION * 60);
    const frames = Array.from({ length: count + 1 }, (_, index) => {
      const t = index / count * PILL_DURATION;
      const x = index === count ? to[0] : slideAxis(start[0], velocity[0], to[0], t)[0];
      const y = index === count ? to[1] : slideAxis(start[1], velocity[1], to[1], t)[0];
      return { translate: `${x * 100}% ${y * 100}%` };
    });
    slide = { from: start, velocity, to, animation: pill.animate(frames, { duration: PILL_DURATION * 1000, easing: 'linear' }) };
  }

  function render() {
    if (props.hint) grid.dataset.hint = props.hint;
    else delete grid.dataset.hint;
    grid.setAttribute('aria-label', props.label);
    move([ANCHOR_COLUMNS.indexOf(value.x), ANCHOR_ROWS.indexOf(value.y)]);
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
    destroy() {
      slide?.animation.cancel();
      grid.remove();
    },
  };
}
