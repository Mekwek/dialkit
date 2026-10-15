import {
  gradientColorAt, gradientFrame, stopCssColor, type BackgroundGradient, type GradientHandles, type GradientPoint, type GradientShape,
} from './background';

/**
 * The on-canvas gradient gizmo, as in Figma: handle dots that move, scale and
 * rotate the gradient, the stops as swatches on its line (or around its rim
 * for Angular) that slide along it, and a click on the line that adds a stop.
 * The maths below is pure (no DOM) so it is tested on its own; the gizmo
 * itself is plain DOM, mounted over the host's canvas.
 */

/** The canvas box in CSS pixels. */
export interface GizmoBox { width: number; height: number }
interface Vec { x: number; y: number }

const toPx = (p: GradientPoint, box: GizmoBox): Vec => ({ x: p.x * box.width, y: p.y * box.height });
const round4 = (n: number) => Math.round(n * 1e4) / 1e4 || 0;
const toFraction = (p: Vec, box: GizmoBox): GradientPoint => ({
  x: round4(p.x / Math.max(box.width, 1e-6)),
  y: round4(p.y / Math.max(box.height, 1e-6)),
});

/** The three handles as drawn, in pixels. The width handle is shown on the cross axis, at its radius. */
export function gizmoPoints(handles: GradientHandles, box: GizmoBox): { start: Vec; end: Vec; width: Vec } {
  const f = gradientFrame(handles, box.width, box.height);
  return {
    start: { x: f.cx, y: f.cy },
    end: { x: f.cx + f.ax * f.r1, y: f.cy + f.ay * f.r1 },
    width: { x: f.cx + f.nx * f.r2, y: f.cy + f.ny * f.r2 },
  };
}

/** The cross axis's side: 1 when n = (-a.y, a.x), -1 when it is the other way. */
function sideOf(handles: GradientHandles, box: GizmoBox): number {
  const f = gradientFrame(handles, box.width, box.height);
  return f.nx === -f.ay && f.ny === f.ax ? 1 : -1;
}

/** Handles from a centre, an end and a cross radius on a side, all in pixels. */
function fromFrame(start: Vec, end: Vec, r2: number, side: number, box: GizmoBox): GradientHandles {
  let ax = end.x - start.x;
  let ay = end.y - start.y;
  const length = Math.hypot(ax, ay);
  if (length < 1e-6) { ax = 0; ay = 1; } else { ax /= length; ay /= length; }
  const width = { x: start.x - ay * side * r2, y: start.y + ax * side * r2 };
  return { start: toFraction(start, box), end: toFraction(end, box), width: toFraction(width, box) };
}

/**
 * Turns the end and width handles around `start` by `radians` (positive is
 * clockwise on screen). Lengths and the ellipse's shape do not change.
 */
export function rotateGradientHandles(handles: GradientHandles, radians: number, box: GizmoBox): GradientHandles {
  const p = gizmoPoints(handles, box);
  const f = gradientFrame(handles, box.width, box.height);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const turn = (v: Vec): Vec => {
    const dx = v.x - p.start.x;
    const dy = v.y - p.start.y;
    return { x: p.start.x + dx * cos - dy * sin, y: p.start.y + dx * sin + dy * cos };
  };
  return fromFrame(p.start, turn(p.end), f.r2, sideOf(handles, box), box);
}

/**
 * The rotate button: a quarter turn clockwise on screen, as in Figma.
 *  - A Linear gradient still in a default place turns in canvas fractions
 *    around the canvas's centre, so it spreads over the other axis. A
 *    default place is a line through the centre, along one axis, the same
 *    distance in from both edges: 10% (the default handles) or 0% (edge to
 *    edge, as Figma's default and a converted legacy angle are).
 *  - Any other Linear turns in pixels around the middle of its line, so its
 *    length stays.
 *  - Radial, Angular and Diamond turn in pixels around their centre
 *    (`rotateGradientHandles`).
 */
export function rotateGradientQuarter(shape: GradientShape, handles: GradientHandles, box: GizmoBox): GradientHandles {
  if (shape !== 'linear') return rotateGradientHandles(handles, Math.PI / 2, box);
  const { start, end, width } = handles;
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-4;
  const evenInset = (a: number, b: number) => near(a + b, 1) && (near(Math.min(a, b), 0.1) || near(Math.min(a, b), 0));
  const atDefault = (near(start.x, 0.5) && near(end.x, 0.5) && evenInset(start.y, end.y))
    || (near(start.y, 0.5) && near(end.y, 0.5) && evenInset(start.x, end.x));
  if (atDefault) {
    const turn = (p: GradientPoint): GradientPoint => ({ x: round4(1 - p.y), y: round4(p.x) });
    return { start: turn(start), end: turn(end), width: turn(width) };
  }
  const s = toPx(start, box);
  const e = toPx(end, box);
  const mid = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
  const turn = (p: GradientPoint): GradientPoint => {
    const v = toPx(p, box);
    return toFraction({ x: mid.x - (v.y - mid.y), y: mid.y + (v.x - mid.x) }, box);
  };
  return { start: turn(start), end: turn(end), width: turn(width) };
}

/**
 * The end handle follows the pointer; the centre stays. The main radius and
 * the direction change together, and the cross radius scales with the main
 * one, so the ellipse keeps its shape. The end stays at least 1px from the
 * centre: on the centre both radii would be 0, the shape's ratio would be
 * lost, and the next move would rebuild it as a circle.
 */
export function dragGradientEnd(handles: GradientHandles, pointer: Vec, box: GizmoBox): GradientHandles {
  const f = gradientFrame(handles, box.width, box.height);
  const start = { x: f.cx, y: f.cy };
  const reach = Math.hypot(pointer.x - start.x, pointer.y - start.y);
  // Closer than 1px: 1px out along the current main axis.
  const end = reach >= 1 ? pointer : { x: start.x + f.ax, y: start.y + f.ay };
  const r1 = Math.max(reach, 1);
  return fromFrame(start, end, f.r2 * (r1 / f.r1), sideOf(handles, box), box);
}

/** The centre (start) follows the pointer; the end handle stays, and the ellipse keeps its shape. */
export function dragGradientCentre(handles: GradientHandles, pointer: Vec, box: GizmoBox): GradientHandles {
  const f = gradientFrame(handles, box.width, box.height);
  const end = { x: f.cx + f.ax * f.r1, y: f.cy + f.ay * f.r1 };
  const r1 = Math.hypot(end.x - pointer.x, end.y - pointer.y);
  return fromFrame(pointer, end, f.r2 * (r1 / f.r1), sideOf(handles, box), box);
}

/**
 * The width handle sets the cross radius only: the pointer's distance from
 * the main axis. Crossing the axis moves the handle to the other side.
 */
export function dragGradientWidth(handles: GradientHandles, pointer: Vec, box: GizmoBox): GradientHandles {
  const f = gradientFrame(handles, box.width, box.height);
  const start = { x: f.cx, y: f.cy };
  const end = { x: f.cx + f.ax * f.r1, y: f.cy + f.ay * f.r1 };
  const signed = (pointer.x - start.x) * -f.ay + (pointer.y - start.y) * f.ax;
  const r2 = Math.max(Math.abs(signed), 1);
  return fromFrame(start, end, r2, signed < 0 ? -1 : 1, box);
}

/**
 * The stop position (0..100) under a pointer: its projection on the line from
 * the centre to the end handle, or for Angular its angle around the centre
 * from the end handle's direction.
 */
export function stopPositionAt(shape: GradientShape, handles: GradientHandles, pointer: Vec, box: GizmoBox): number {
  const f = gradientFrame(handles, box.width, box.height);
  const dx = pointer.x - f.cx;
  const dy = pointer.y - f.cy;
  const u = (dx * f.ax + dy * f.ay) / f.r1;
  if (shape !== 'angular') return Math.min(100, Math.max(0, u * 100));
  const v = (dx * f.nx + dy * f.ny) / f.r2;
  const turn = Math.atan2(v, u) / (2 * Math.PI);
  return (turn < 0 ? turn + 1 : turn) * 100;
}

/**
 * The ghost's position (0..100) under a pointer: the nearest point of the
 * line, or of the Angular rim. Unlike stopPositionAt's angle around the
 * centre, moving straight across an elliptical rim does not move it.
 */
export function ghostPositionAt(shape: GradientShape, handles: GradientHandles, pointer: Vec, box: GizmoBox): number {
  if (shape !== 'angular') return stopPositionAt(shape, handles, pointer, box);
  const f = gradientFrame(handles, box.width, box.height);
  const dx = pointer.x - f.cx;
  const dy = pointer.y - f.cy;
  const u = dx * f.ax + dy * f.ay;
  const v = dx * f.nx + dy * f.ny;
  // Newton's method on the squared distance to (r1 cos θ, r2 sin θ), from the angle around the centre.
  let theta = Math.atan2(v / f.r2, u / f.r1);
  for (let i = 0; i < 8; i++) {
    const sin = Math.sin(theta);
    const cos = Math.cos(theta);
    const g = (f.r2 * f.r2 - f.r1 * f.r1) * sin * cos + u * f.r1 * sin - v * f.r2 * cos;
    const dg = (f.r2 * f.r2 - f.r1 * f.r1) * (cos * cos - sin * sin) + u * f.r1 * cos + v * f.r2 * sin;
    if (Math.abs(dg) < 1e-9) break;
    const step = g / dg;
    theta -= step;
    if (Math.abs(step) < 1e-7) break;
  }
  const turn = theta / (2 * Math.PI);
  return (turn - Math.floor(turn)) * 100;
}

/**
 * Where a stop's swatch goes. `x, y` is the stop's point on the line (or on
 * the ellipse's rim for Angular); `ox, oy` the unit direction the swatch
 * stands off in (one side of the line, or outward from the rim); `rotation`
 * turns the swatch so its pointer points back at the line.
 */
export function stopPlacement(shape: GradientShape, handles: GradientHandles, at: number, box: GizmoBox): { x: number; y: number; ox: number; oy: number; rotation: number } {
  const f = gradientFrame(handles, box.width, box.height);
  const t = at / 100;
  let x: number;
  let y: number;
  let ox: number;
  let oy: number;
  if (shape === 'angular') {
    const theta = t * 2 * Math.PI;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    x = f.cx + f.ax * f.r1 * cos + f.nx * f.r2 * sin;
    y = f.cy + f.ay * f.r1 * cos + f.ny * f.r2 * sin;
    // The ellipse's outward normal at that point.
    const nx = f.ax * cos / f.r1 + f.nx * sin / f.r2;
    const ny = f.ay * cos / f.r1 + f.ny * sin / f.r2;
    const length = Math.hypot(nx, ny) || 1;
    ox = nx / length;
    oy = ny / length;
  } else {
    x = f.cx + f.ax * f.r1 * t;
    y = f.cy + f.ay * f.r1 * t;
    // Swatches stand on the line's left, seen from the centre: above a line
    // that runs left to right, below one that runs right to left.
    ox = f.ay;
    oy = -f.ax;
  }
  return { x, y, ox, oy, rotation: Math.atan2(ox, -oy) };
}

/**
 * The angle the tooltip shows: the main axis's direction (centre to end
 * handle), in whole degrees, 0 when it points down, -90 right, 90 left,
 * 180 up, as Figma shows it. Any handle's rotate ring shows this same value.
 */
export function gizmoAngle(handles: GradientHandles, box: GizmoBox): number {
  const f = gradientFrame(handles, box.width, box.height);
  let degrees = Math.atan2(f.ay, f.ax) * 180 / Math.PI - 90;
  if (degrees <= -180) degrees += 360;
  if (degrees > 180) degrees -= 360;
  return Math.round(degrees) || 0;
}

export const formatGizmoAngle = (degrees: number) => `${degrees}°`;

/** How far a swatch's centre stands off the line: 4px gap, the 4px pointer, half the 20px swatch. */
export const GIZMO_SWATCH_OFFSET = 18;
/**
 * The ghost's hover band, as Figma measures it: on the swatch side out to the
 * real swatches' outer edge, on the other side 8px. Taken from the swatch's
 * own size and offset, so the two stay in step.
 */
export const GHOST_BAND_OUT = GIZMO_SWATCH_OFFSET + 10;
export const GHOST_BAND_IN = 8;

/**
 * The ghost band as an SVG path: a strip along the line (Linear, and the main
 * axis of Radial and Diamond), or a ring around the rim (Angular), from
 * GHOST_BAND_IN on the far side to GHOST_BAND_OUT on the swatch side.
 */
export function ghostBandPath(shape: GradientShape, handles: GradientHandles, box: GizmoBox): string {
  const edge = (at: number, offset: number) => {
    const p = stopPlacement(shape, handles, at, box);
    return `${(p.x + p.ox * offset).toFixed(2)} ${(p.y + p.oy * offset).toFixed(2)}`;
  };
  if (shape !== 'angular') return `M${edge(0, GHOST_BAND_OUT)}L${edge(100, GHOST_BAND_OUT)}L${edge(100, -GHOST_BAND_IN)}L${edge(0, -GHOST_BAND_IN)}Z`;
  const steps = 120;
  const outer: string[] = [];
  const inner: string[] = [];
  for (let i = 0; i < steps; i++) {
    outer.push(edge(i / steps * 100, GHOST_BAND_OUT));
    inner.push(edge((steps - i) / steps * 100, -GHOST_BAND_IN));
  }
  return `M${outer.join('L')}ZM${inner.join('L')}Z`;
}
export const formatGizmoPercent = (at: number) => `${Math.round(at)}%`;

// ── The gizmo ──────────────────────────────────────────────────────────────

export interface GradientGizmoProps {
  gradient: BackgroundGradient;
  /** The selected stop's index. */
  selected: number;
  /**
   * The panel's DialKit root: the gizmo copies its `--dial-*` tokens, so it
   * draws with the panel's theme. The gizmo is not a `.dialkit-root` itself:
   * hosts style those as panels (theca makes every `.dialkit-root` a fixed,
   * full-screen layer whose children take the pointer), and the gizmo must
   * take presses only on its own parts.
   */
  themeSource?: HTMLElement | null;
  /** Its stacking order: under the DialKit panel, above the host's canvas. */
  zIndex?: number;
}

export interface GradientGizmoCallbacks {
  onHandles: (handles: GradientHandles) => void;
  onSelect: (index: number) => void;
  /** Moves the selected stop (it is selected while it is dragged). */
  onStopMove: (index: number, at: number) => void;
  /** Adds a stop at `at`; the new stop becomes the selected one. */
  onStopAdd: (at: number) => void;
}

const SVG = 'http://www.w3.org/2000/svg';
/** Half the dot, plus a little: pressing within it moves the handle; around it, to the 15px hit circle's edge, rotates. */
const MOVE_RADIUS = 7;
const SWATCH_OFFSET = GIZMO_SWATCH_OFFSET;
/** On the line, this close to a real stop's point the stop wins over the ghost (Figma: about 2.5pt either side). */
const STOP_STRIP = 2.5;
/** How far a % tooltip's near edge stands off the line: past the swatch (its centre plus half its 20px), then a 6px gap. */
const TIP_EDGE = SWATCH_OFFSET + 10 + 6;
/** Pointer travel before a press on the line or a swatch counts as a drag. */
const DRAG_THRESHOLD = 3;
/** A handle's arrow keys: the direction each one moves it, on screen. */
const ARROW_STEPS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

const cursors = new Map<number, string>();
/** A curved double arrow, turned to face away from the handle, like Figma's rotate cursor. */
function rotateCursor(degrees: number): string {
  const step = Math.round(degrees / 15) * 15;
  let cursor = cursors.get(step);
  if (!cursor) {
    const arc = 'M6 15a7.5 7.5 0 0 1 12 0';
    const heads = 'M4 12.5 6 15l3-.5M20 12.5 18 15l-3-.5';
    const svg = `<svg xmlns="${SVG}" width="24" height="24" viewBox="0 0 24 24"><g transform="rotate(${step + 90} 12 12)" fill="none" stroke-linecap="round" stroke-linejoin="round">`
      + `<path d="${arc}" stroke="#fff" stroke-width="4"/><path d="${heads}" stroke="#fff" stroke-width="4"/>`
      + `<path d="${arc}" stroke="#000" stroke-width="1.5"/><path d="${heads}" stroke="#000" stroke-width="1.5"/></g></svg>`;
    cursor = `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, grab`;
    cursors.set(step, cursor);
  }
  return cursor;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  return el;
}
function svgElement<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

type Role = 'start' | 'end' | 'width';
type Press =
  | { kind: 'move'; role: Role; id: number }
  | { kind: 'rotate'; id: number; from: number; base: GradientHandles }
  | { kind: 'stop'; id: number; x: number; y: number; moved: boolean };

/**
 * Mounts the gizmo over `target`: a fixed overlay sized to the target's box,
 * in document.body, above the host's canvas and under the DialKit panel.
 * Presses on the gizmo stop there, so a colour picker open in the panel stays
 * open; everything else passes through to the canvas.
 */
export function mountGradientGizmo(target: HTMLElement, initial: GradientGizmoProps, callbacks: GradientGizmoCallbacks) {
  let props = initial;
  let box: GizmoBox = { width: 1, height: 1 };
  let press: Press | undefined;
  let hoverStop = -1;
  let destroyed = false;

  // Only the handle dots are reachable from the keyboard; the lines, the
  // swatches, the ghost and the tooltip stay hidden from assistive tech.
  const root = element('div', 'dialkit-bg-gizmo');
  const svg = svgElement('svg', { class: 'dialkit-bg-gizmo-lines', 'aria-hidden': 'true' });
  const shadowLine = svgElement('line', { class: 'dialkit-bg-gizmo-shadow' });
  const line = svgElement('line', { class: 'dialkit-bg-gizmo-line' });
  const shadowRim = svgElement('ellipse', { class: 'dialkit-bg-gizmo-shadow' });
  const rim = svgElement('ellipse', { class: 'dialkit-bg-gizmo-line' });
  // The ghost's hover band: hovering it shows the ghost, a press adds the stop.
  const band = svgElement('path', { class: 'dialkit-bg-gizmo-hit', 'fill-rule': 'evenodd' });
  svg.append(shadowRim, rim, shadowLine, line, band);
  const handles: Record<Role, HTMLDivElement> = {
    start: element('div', 'dialkit-bg-gizmo-handle'),
    end: element('div', 'dialkit-bg-gizmo-handle'),
    width: element('div', 'dialkit-bg-gizmo-handle'),
  };
  for (const [role, el] of Object.entries(handles)) {
    el.dataset.role = role;
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown ArrowLeft ArrowRight');
    el.append(element('span', 'dialkit-bg-gizmo-dot'));
  }
  const swatchLayer = element('div', 'dialkit-bg-gizmo-stops');
  swatchLayer.setAttribute('aria-hidden', 'true');
  const ghost = element('div', 'dialkit-bg-gizmo-stop dialkit-bg-gizmo-ghost');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.hidden = true;
  const tip = element('div', 'dialkit-bg-gizmo-tip');
  tip.setAttribute('aria-hidden', 'true');
  tip.hidden = true;
  let swatches: HTMLDivElement[] = [];
  root.append(svg, swatchLayer, ghost, handles.width, handles.start, handles.end, tip);
  document.body.append(root);

  // Presses on the gizmo end here: the panel's colour picker closes on a
  // press anywhere else in the document, and this one is not "elsewhere".
  root.addEventListener('pointerdown', event => event.stopPropagation());
  // The same for the focus: tabbing to a handle must not close the picker,
  // which would close the gizmo with it.
  root.addEventListener('focusin', event => event.stopPropagation());

  const local = (event: PointerEvent): Vec => {
    const rect = root.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const showTip = (text: string, x: number, y: number, place: 'right' | 'center') => {
    tip.textContent = text;
    tip.hidden = false;
    tip.dataset.place = place;
    tip.style.transform = `translate(${x}px, ${y}px)`;
  };
  const hideTip = () => { tip.hidden = true; };
  /**
   * A % tooltip beside a stop's swatch, on the side the swatch stands, the
   * same gap from the swatch whatever the line's direction. The tooltip is
   * wider than tall, so how far it reaches towards the swatch depends on
   * that direction: half its width times the sideways part plus half its
   * height times the upright part (on a slanted line its corner comes
   * closest). Measured once the text is in.
   */
  const percentTipAt = (text: string, place: { x: number; y: number; ox: number; oy: number }) => {
    showTip(text, place.x, place.y, 'center');
    const reach = TIP_EDGE + (tip.offsetWidth / 2) * Math.abs(place.ox) + (tip.offsetHeight / 2) * Math.abs(place.oy);
    tip.style.transform = `translate(${place.x + place.ox * reach}px, ${place.y + place.oy * reach}px)`;
  };

  // ── Handles: the dot moves, the ring around it rotates ──
  const zone = (role: Role, p: Vec) => {
    const point = gizmoPoints(props.gradient.handles, box)[role];
    return Math.hypot(p.x - point.x, p.y - point.y) <= MOVE_RADIUS ? 'move' : 'rotate';
  };
  const angleText = () => formatGizmoAngle(gizmoAngle(props.gradient.handles, box));
  for (const [key, el] of Object.entries(handles)) {
    const role = key as Role;
    el.addEventListener('pointermove', event => {
      const p = local(event);
      if (press) {
        if (press.id !== event.pointerId) return;
        if (press.kind === 'move') {
          const h = props.gradient.handles;
          callbacks.onHandles(role === 'end' ? dragGradientEnd(h, p, box) : role === 'start' ? dragGradientCentre(h, p, box) : dragGradientWidth(h, p, box));
        } else if (press.kind === 'rotate') {
          const centre = gizmoPoints(press.base, box).start;
          const angle = Math.atan2(p.y - centre.y, p.x - centre.x);
          callbacks.onHandles(rotateGradientHandles(press.base, angle - press.from, box));
          el.style.cursor = rotateCursor(angle * 180 / Math.PI);
          showTip(angleText(), p.x, p.y, 'right');
        }
        return;
      }
      if (zone(role, p) === 'move') {
        el.style.cursor = 'move';
        hideTip();
      } else {
        const point = gizmoPoints(props.gradient.handles, box)[role];
        el.style.cursor = rotateCursor(Math.atan2(p.y - point.y, p.x - point.x) * 180 / Math.PI);
        showTip(angleText(), p.x, p.y, 'right');
      }
    });
    el.addEventListener('pointerleave', () => { if (!press) hideTip(); });
    el.addEventListener('pointerdown', event => {
      if (event.button !== 0 || press) return;
      event.preventDefault();
      const p = local(event);
      if (zone(role, p) === 'move') {
        press = { kind: 'move', role, id: event.pointerId };
        hideTip();
      } else {
        const centre = gizmoPoints(props.gradient.handles, box).start;
        press = { kind: 'rotate', id: event.pointerId, from: Math.atan2(p.y - centre.y, p.x - centre.x), base: props.gradient.handles };
        showTip(angleText(), p.x, p.y, 'right');
      }
      root.dataset.active = 'true';
      try { el.setPointerCapture(event.pointerId); } catch { press = undefined; }
    });
    // The arrow keys move the focused handle by 1% of the canvas (Shift: 10%),
    // as if the pointer had dragged its dot there. Other keys pass on, so
    // Escape still reaches the control and closes the gizmo.
    el.addEventListener('keydown', event => {
      const step = ARROW_STEPS[event.key];
      if (!step || press || event.altKey || event.metaKey || event.ctrlKey) return;
      event.preventDefault();
      event.stopPropagation();
      const share = event.shiftKey ? 0.1 : 0.01;
      const point = gizmoPoints(props.gradient.handles, box)[role];
      const p = { x: point.x + step[0] * share * box.width, y: point.y + step[1] * share * box.height };
      const h = props.gradient.handles;
      callbacks.onHandles(role === 'end' ? dragGradientEnd(h, p, box) : role === 'start' ? dragGradientCentre(h, p, box) : dragGradientWidth(h, p, box));
    });
    const end = (event: PointerEvent) => {
      if (!press || press.id !== event.pointerId || press.kind === 'stop') return;
      press = undefined;
      delete root.dataset.active;
      if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
      hideTip();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }

  // ── Stops: a swatch slides along the line (or the rim); the line adds a stop ──
  const percentTip = (index: number) => {
    const stop = props.gradient.stops[index];
    if (!stop) return;
    percentTipAt(formatGizmoPercent(stop.at), stopPlacement(props.gradient.shape, props.gradient.handles, stop.at, box));
  };
  const startStopDrag = (event: PointerEvent, el: Element, moved: boolean) => {
    const p = local(event);
    press = { kind: 'stop', id: event.pointerId, x: p.x, y: p.y, moved };
    root.dataset.active = 'true';
    try { el.setPointerCapture(event.pointerId); } catch { press = undefined; }
  };
  const stopMove = (event: PointerEvent) => {
    if (!press || press.kind !== 'stop' || press.id !== event.pointerId) return false;
    const p = local(event);
    if (!press.moved && Math.hypot(p.x - press.x, p.y - press.y) < DRAG_THRESHOLD) return true;
    press.moved = true;
    const at = Math.round(stopPositionAt(props.gradient.shape, props.gradient.handles, p, box));
    callbacks.onStopMove(props.selected, at);
    percentTip(props.selected);
    return true;
  };
  const stopEnd = (event: PointerEvent, el: Element) => {
    if (!press || press.kind !== 'stop' || press.id !== event.pointerId) return;
    press = undefined;
    delete root.dataset.active;
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    if (hoverStop < 0) hideTip();
  };
  const buildSwatches = () => {
    swatchLayer.replaceChildren();
    swatches = props.gradient.stops.map((_, i) => {
      const el = element('div', 'dialkit-bg-gizmo-stop');
      el.addEventListener('pointerenter', () => { hoverStop = i; if (!press) percentTip(i); });
      el.addEventListener('pointerleave', () => { hoverStop = -1; if (!press) hideTip(); });
      el.addEventListener('pointerdown', event => {
        if (event.button !== 0 || press) return;
        event.preventDefault();
        callbacks.onSelect(i);
        startStopDrag(event, el, false);
        percentTip(props.selected);
      });
      el.addEventListener('pointermove', event => { stopMove(event); });
      el.addEventListener('pointerup', event => stopEnd(event, el));
      el.addEventListener('pointercancel', event => stopEnd(event, el));
      el.addEventListener('lostpointercapture', event => stopEnd(event, el));
      swatchLayer.append(el);
      return el;
    });
  };

  // The ghost: inside the band it stands at the cursor's projection on the
  // line (or the rim), continuously, never stepped; its tooltip shows the
  // nearest whole percent. A press adds the stop where the ghost stands (to
  // a tenth of a percent), and drags it. On the line within STOP_STRIP of a
  // real stop, that stop wins: no ghost, and a press takes the stop.
  const stopUnder = (at: number): number => {
    const { shape, handles: h, stops } = props.gradient;
    const point = stopPlacement(shape, h, at, box);
    let found = -1;
    let best = STOP_STRIP;
    stops.forEach((stop, i) => {
      const p = stopPlacement(shape, h, stop.at, box);
      const d = Math.hypot(p.x - point.x, p.y - point.y);
      if (d <= best) { best = d; found = i; }
    });
    return found;
  };
  const hideGhost = () => { ghost.hidden = true; delete root.dataset.ghost; };
  band.addEventListener('pointermove', event => {
    if (stopMove(event)) { hideGhost(); return; }
    if (press) return;
    const { shape, handles: h, stops } = props.gradient;
    const at = ghostPositionAt(shape, h, local(event), box);
    const under = stopUnder(at);
    if (under >= 0) {
      hideGhost();
      band.style.cursor = 'move';
      percentTip(under);
      return;
    }
    band.style.cursor = '';
    const place = stopPlacement(shape, h, at, box);
    ghost.hidden = false;
    root.dataset.ghost = 'true';
    ghost.style.setProperty('--dial-bg-stop', stopCssColor(gradientColorAt(stops, at)));
    placeSwatch(ghost, place);
    percentTipAt(formatGizmoPercent(at), place);
  });
  band.addEventListener('pointerleave', () => { if (!press) { hideGhost(); hideTip(); } });
  band.addEventListener('pointerdown', event => {
    if (event.button !== 0 || press) return;
    event.preventDefault();
    hideGhost();
    const { shape, handles: h } = props.gradient;
    const at = ghostPositionAt(shape, h, local(event), box);
    const under = stopUnder(at);
    if (under >= 0) callbacks.onSelect(under);
    else callbacks.onStopAdd(Math.round(at * 10) / 10);
    startStopDrag(event, band, false);
    percentTip(props.selected);
  });
  band.addEventListener('pointerup', event => stopEnd(event, band));
  band.addEventListener('pointercancel', event => stopEnd(event, band));
  band.addEventListener('lostpointercapture', event => stopEnd(event, band));

  /** The panel's theme tokens, copied at once when its theme changes. */
  let tokensFrom = '';
  function copyTokens() {
    const source = props.themeSource;
    const key = source ? `${source.dataset.theme ?? ''}` : '';
    if (!source || key === tokensFrom) return;
    tokensFrom = key;
    writeTokens(source);
  }
  function writeTokens(source: HTMLElement) {
    const styles = getComputedStyle(source);
    for (const property of Array.from(styles)) {
      if (property.startsWith('--dial-')) root.style.setProperty(property, styles.getPropertyValue(property));
    }
  }
  /**
   * A Look panel can change --dial-* variables in place, with no theme
   * change, so every update copies them again, at most once a frame: a
   * drag updates on every pointer move, and reading every computed style
   * that often would cost more than the drawing.
   */
  let tokenFrame = 0;
  function refreshTokens() {
    if (tokenFrame || typeof requestAnimationFrame !== 'function') return;
    tokenFrame = requestAnimationFrame(() => {
      tokenFrame = 0;
      if (!destroyed && props.themeSource) writeTokens(props.themeSource);
    });
  }

  function placeSwatch(el: HTMLElement, place: ReturnType<typeof stopPlacement>) {
    const x = place.x + place.ox * SWATCH_OFFSET;
    const y = place.y + place.oy * SWATCH_OFFSET;
    el.style.transform = `translate(${x}px, ${y}px) rotate(${place.rotation}rad)`;
  }

  // ── Layout: the overlay follows the target's box ──
  const fit = () => {
    if (destroyed) return;
    const rect = target.getBoundingClientRect();
    Object.assign(root.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    const changed = rect.width !== box.width || rect.height !== box.height;
    box = { width: Math.max(rect.width, 1), height: Math.max(rect.height, 1) };
    if (changed) draw();
  };
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : undefined;
  resize?.observe(target);
  window.addEventListener('scroll', fit, true);
  window.addEventListener('resize', fit);

  function draw() {
    const { shape, handles: h, stops } = props.gradient;
    copyTokens();
    if (props.zIndex !== undefined) root.style.zIndex = String(props.zIndex);
    root.dataset.shape = shape;
    const p = gizmoPoints(h, box);
    const f = gradientFrame(h, box.width, box.height);
    for (const l of [shadowLine, line]) {
      l.setAttribute('x1', String(p.start.x));
      l.setAttribute('y1', String(p.start.y));
      l.setAttribute('x2', String(p.end.x));
      l.setAttribute('y2', String(p.end.y));
    }
    const turn = Math.atan2(f.ay, f.ax) * 180 / Math.PI;
    for (const e of [shadowRim, rim]) {
      e.setAttribute('cx', String(p.start.x));
      e.setAttribute('cy', String(p.start.y));
      e.setAttribute('rx', String(f.r1));
      e.setAttribute('ry', String(f.r2));
      e.setAttribute('transform', `rotate(${turn} ${p.start.x} ${p.start.y})`);
    }
    // Angular draws its ellipse and takes clicks on the rim; the others on the line.
    const angular = shape === 'angular';
    shadowRim.style.display = rim.style.display = angular ? '' : 'none';
    band.setAttribute('d', ghostBandPath(shape, h, box));
    for (const [key, el] of Object.entries(handles)) {
      const point = p[key as Role];
      el.style.transform = `translate(${point.x}px, ${point.y}px)`;
      const name = key === 'start' ? (shape === 'linear' ? 'start' : 'centre') : key;
      el.setAttribute('aria-label', `Gradient ${name}, ${Math.round(point.x / box.width * 100)}% across, ${Math.round(point.y / box.height * 100)}% down`);
    }
    // Linear has two handles; the others a third, for the cross radius.
    handles.width.hidden = shape === 'linear';
    if (swatches.length !== stops.length) buildSwatches();
    stops.forEach((stop, i) => {
      const el = swatches[i];
      el.style.setProperty('--dial-bg-stop', stopCssColor(stop));
      el.toggleAttribute('data-selected', i === props.selected);
      // Over the handles' rings; the selected swatch over the others.
      el.style.zIndex = i === props.selected ? '3' : '2';
      placeSwatch(el, stopPlacement(shape, h, stop.at, box));
    });
  }

  fit();
  draw();
  return {
    element: root,
    update(next: GradientGizmoProps) {
      props = next;
      fit();
      draw();
      refreshTokens();
      if (press?.kind === 'stop' && press.moved) percentTip(props.selected);
      else if (press?.kind === 'rotate') { /* the tooltip follows the pointer */ }
      else if (hoverStop >= 0 && !press) percentTip(hoverStop);
    },
    destroy() {
      destroyed = true;
      if (tokenFrame) cancelAnimationFrame(tokenFrame);
      resize?.disconnect();
      window.removeEventListener('scroll', fit, true);
      window.removeEventListener('resize', fit);
      root.remove();
    },
  };
}
