// Core API
export { createDialKit, createDialKitController } from './createDialKit';
export type { CreateDialOptions, DialKitController } from './createDialKit';

// Timeline
export { createDialTimeline } from './createDialTimeline';
export type { CreateDialTimelineOptions } from './createDialTimeline';
export type {
  DialTimelineValues,
  TimelineClipConfig,
  TimelineClipCss,
  TimelineClipLoop,
  TimelineClipValues,
  TimelineConfig,
  TimelineGroupConfig,
  TimelineGroupValues,
  TimelinePropConfig,
  TimelinePropStepConfig,
  TimelineStepConfig,
  TimelineStepValues,
} from '../timeline';

// Root component
export { DialRoot } from './components/DialRoot';
export type { DialPosition, DialMode, DialTheme } from './components/DialRoot';
export { DialTimeline } from './components/Timeline/DialTimeline';
export type { DialTimelineProps } from './components/Timeline/DialTimeline';

// Component exports
export { Slider } from './components/Slider';
export { Toggle } from './components/Toggle';
export { Folder } from './components/Folder';
export { RootPanel } from './components/RootPanel';
export { ButtonGroup } from './components/ButtonGroup';
export { SpringControl } from './components/SpringControl';
export { SpringVisualization } from './components/SpringVisualization';
export { TransitionControl } from './components/TransitionControl';
export { EasingVisualization } from './components/EasingVisualization';
export { TextControl } from './components/TextControl';
export { SelectControl } from './components/SelectControl';
export { ColorControl } from './components/ColorControl';
export { ImageControl } from './components/ImageControl';
export { DialPad } from './components/DialPad';
export type { DialPadProps } from '../dial-pad-control';
export { BackgroundControl } from './components/BackgroundControl';
export type { BackgroundControlProps } from '../background-control';
export { LayerListControl } from './components/LayerListControl';
export type { LayerListControlProps } from '../layer-list-control';
export {
  setBackgroundHost,
  getBackgroundHost,
  setSavedGradients,
  getSavedGradients,
  subscribeBackgroundHost,
  defaultGradientHandles,
  legacyGradientHandles,
  switchGradientShape,
  gradientFrame,
  gradientParamAt,
  GRADIENT_SHAPES,
  paintBackgroundPreview,
  mountGradientGizmo,
  rotateGradientHandles,
  dragGradientEnd,
  dragGradientCentre,
  dragGradientWidth,
  stopPositionAt,
  stopPlacement,
  gizmoAngle,
  formatGizmoAngle,
  gizmoPoints,
  backgroundGradientCss,
  defaultBackgroundValue,
  normalizeBackgroundValue,
  normalizeLayersValue,
  layerAction,
  parseLayerAction,
} from '../store/DialStore';
export { PresetManager } from './components/PresetManager';
export { ShortcutsMenu } from './components/ShortcutsMenu';
export { ControlRenderer } from './components/ControlRenderer';

// Store exports
export { DialStore, withVisibility, unwrapVisibility } from '../store/DialStore';
export type {
  SpringConfig,
  EasingConfig,
  TransitionConfig,
  ActionConfig,
  SelectConfig,
  ColorConfig,
  ImageConfig,
  ImageOption,
  BackgroundConfig,
  LayerItem,
  LayersConfig,
  LayersValue,
  LayerActionKind,
  BackgroundGradient,
  BackgroundMedia,
  BackgroundMediaDisplay,
  BackgroundStop,
  BackgroundValue,
  BackgroundHost,
  SavedGradient,
  GradientShape,
  GradientPoint,
  GradientHandles,
  GradientFrame,
  GradientGizmoProps,
  GradientGizmoCallbacks,
  GizmoBox,
  DialPadAxis,
  DialPadConfig,
  DialPadValue,
  TextConfig,
  ShortcutConfig,
  Preset,
  DialValue,
  DialConfig,
  DialKitPersistOptions,
  DialKitValueUpdates,
  ResolvedValues,
  ControlMeta,
  PanelConfig,
  VisibleWhen,
  VisibleWhenValue,
  ControlWithVisibility,
} from '../store/DialStore';
