/** The background control's helpers, host hooks and gradient gizmo, exported by every entry. */
export {
  GRADIENT_SHAPES, defaultBackgroundValue, defaultGradientHandles, gradientFrame, gradientParamAt, legacyGradientHandles,
  normalizeBackgroundValue, switchGradientShape,
} from './background';
export type { GradientFrame } from './background';
export { paintBackgroundPreview } from './background-paint';
export {
  dragGradientCentre, dragGradientEnd, dragGradientWidth, formatGizmoAngle, gizmoAngle, gizmoPoints, mountGradientGizmo,
  rotateGradientHandles, stopPlacement, stopPositionAt,
} from './gradient-gizmo';
export type { GizmoBox, GradientGizmoCallbacks, GradientGizmoProps } from './gradient-gizmo';
export {
  getBackgroundHost, getSavedGradients, hasBackgroundHost, setBackgroundHost, setSavedGradients, subscribeBackgroundHost,
} from './store/BackgroundHost';
export type { BackgroundHost } from './store/BackgroundHost';
