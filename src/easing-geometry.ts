import type { EasingConfig } from './store/DialStore';

export type BezierPoints = EasingConfig['ease'];
export type GraphPoint = { x: number; y: number };

const clampY = (value: number) => Math.max(-1, Math.min(2, value));

export const easingPresets: Record<string, BezierPoints> = {
  linear: [0, 0, 1, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
};

export function formatEase(ease: BezierPoints): string {
  return ease.join(', ');
}

export function parseEase(text: string): BezierPoints | null {
  const parts = text.split(',').map(part => part.trim());
  if (parts.length !== 4 || parts.some(part => !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(part))) return null;
  const values = parts.map(Number);
  if (!values.every(Number.isFinite) || values[0] < 0 || values[0] > 1 || values[2] < 0 || values[2] > 1) return null;
  values[1] = clampY(values[1]);
  values[3] = clampY(values[3]);
  return values as BezierPoints;
}

/** Defensive rendering for externally supplied values; valid overshoot is never clamped. */
export function normalizeEase(ease: BezierPoints): BezierPoints {
  return ease.map((value, index) => {
    const finite = Number.isFinite(value) ? value : (index < 2 ? 0 : 1);
    return index % 2 === 0 ? Math.max(0, Math.min(1, finite)) : finite;
  }) as BezierPoints;
}

/** Fit both axes equally so the 0→1 reference stays at 45°, including during overshoot. */
export function fitEasingGraph(ease: BezierPoints, width: number, height: number) {
  const value = normalizeEase(ease);
  // The 24px handle target can reach the edge without clipping its circle or focus ring.
  const padding = Math.min(12, width / 4, height / 4);
  const radiusY = Math.max(0.5, Math.abs(value[1] - 0.5), Math.abs(value[3] - 0.5));
  const unit = Math.min(width - padding * 2, (height / 2 - padding) / radiusY);
  const scale = { x: unit, y: unit };
  const project = (x: number, y: number): GraphPoint => ({
    x: width / 2 + (x - 0.5) * scale.x,
    y: height / 2 - (y - 0.5) * scale.y,
  });
  return { scale, padding, start: project(0, 0), end: project(1, 1), handles: [project(value[0], value[1]), project(value[2], value[3])], project };
}

/** Deltas use the pointer-down scale so refitting the display cannot amplify a drag. */
export function moveEasingHandle(ease: BezierPoints, handle: 0 | 1, dx: number, dy: number, scale: GraphPoint): BezierPoints {
  const next = [...ease] as BezierPoints;
  if (!Number.isFinite(scale.x) || !Number.isFinite(scale.y) || scale.x <= 0 || scale.y <= 0) return next;
  const index = handle * 2;
  const x = ease[index] + dx / scale.x;
  const y = ease[index + 1] - dy / scale.y;
  if (dx !== 0) next[index] = Number(Math.max(0, Math.min(1, x)).toFixed(2));
  if (dy !== 0 && Number.isFinite(y)) next[index + 1] = Number(clampY(y).toFixed(2));
  return next;
}

export function easingHandleFromKey(ease: BezierPoints, handle: 0 | 1, key: string, shift: boolean): BezierPoints | undefined {
  const delta = shift ? 0.1 : 0.01;
  const scale = { x: 1, y: 1 };
  if (key === 'ArrowLeft') return moveEasingHandle(ease, handle, -delta, 0, scale);
  if (key === 'ArrowRight') return moveEasingHandle(ease, handle, delta, 0, scale);
  if (key === 'ArrowUp') return moveEasingHandle(ease, handle, 0, -delta, scale);
  if (key === 'ArrowDown') return moveEasingHandle(ease, handle, 0, delta, scale);
}

/** Stop the tangent at the handle's outer radius, including when the handle meets an endpoint. */
export function easingGuideEnd(start: GraphPoint, handle: GraphPoint, radius = 5): GraphPoint {
  const dx = handle.x - start.x;
  const dy = handle.y - start.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= radius) return { ...start };
  return { x: handle.x - dx / distance * radius, y: handle.y - dy / distance * radius };
}
