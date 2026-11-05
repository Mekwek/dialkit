// Main hook
export { useDialKit, useDialKitController } from './hooks/useDialKit';
export type { DialKitController, UseDialOptions } from './hooks/useDialKit';

// Root component (user mounts once)
export { DialRoot } from './components/DialRoot';
export type { DialPosition, DialMode, DialTheme } from './components/DialRoot';
export type { DialVersions } from './versions/gallery';

// Timeline (prototype)
export { useDialTimeline } from './hooks/useDialTimeline';
export type {
  TimelineClipConfig,
  TimelineClipCss,
  TimelineClipLoop,
  TimelineConfig,
  TimelineClipValues,
  TimelineGroupConfig,
  TimelineGroupValues,
  TimelinePropConfig,
  TimelinePropStepConfig,
  TimelineStepConfig,
  TimelineStepValues,
  DialTimelineValues,
  UseDialTimelineOptions,
} from './hooks/useDialTimeline';
export { DialTimeline } from './components/Timeline/DialTimeline';
export type { DialTimelineProps } from './components/Timeline/DialTimeline';
export { formatClock } from './timeline-core';
export { TimelineStore } from './store/TimelineStore';
export type {
  TimelineMeta,
  TimelineClipMeta,
  TimelineClipTrackMeta,
  TimelineTransport,
} from './store/TimelineStore';

// Individual components (for advanced usage)
export { ControlRenderer } from './components/ControlRenderer';
export { Slider } from './components/Slider';
export { Toggle } from './components/Toggle';
export { Folder } from './components/Folder';
export { ButtonGroup } from './components/ButtonGroup';
export { SpringControl } from './components/SpringControl';
export { SpringVisualization } from './components/SpringVisualization';
export { TransitionControl } from './components/TransitionControl';
export { TransitionCopyMenu } from './components/TransitionCopy';
export type { TransitionCopyMenuProps } from './components/TransitionCopy';
export { Section } from './components/Section';
export type { SectionProps, SectionRow } from './components/Section';
export { EasingVisualization } from './components/EasingVisualization';
export { TextControl } from './components/TextControl';
export { SelectControl } from './components/SelectControl';
export { ColorControl } from './components/ColorControl';
export { ImageControl } from './components/ImageControl';
export { DialPad } from './components/DialPad';
export type { DialPadProps } from './dial-pad-control';
export { AnchorControl } from './components/AnchorControl';
export type { AnchorControlProps } from './anchor-control';
export { BackgroundControl } from './components/BackgroundControl';
export type { BackgroundControlProps } from './background-control';
export { LayerListControl } from './components/LayerListControl';
export type { LayerListControlProps } from './layer-list-control';
export { layerAction, normalizeLayersValue, parseLayerAction } from './layers';
export { PictureListControl } from './components/PictureListControl';
export type { PictureListControlProps } from './picture-list-control';
export * from './picture-api';
export { backgroundGradientCss, backgroundMediaCss, paintGradient } from './background';
export * from './background-api';
export { PresetManager } from './components/PresetManager';
export { VersionGallery } from './components/VersionGallery';
export { VersionActions, VersionPictures } from './components/VersionPictures';
export { openVersionPicturesGrid, versionOfPicture, versionPictureId } from './versions/pictures';
export type { VersionActionsProps, VersionPicturesGridOptions, VersionPicturesProps } from './versions/pictures';
export type { VersionGridHandle } from './versions/grid';
export { BASE_VERSION } from './versions/thumbnails';
export { ShortcutsMenu } from './components/ShortcutsMenu';

// Hints (hold H over a control to read what it does)
export { HintStore } from './hints';
export { HintTip, HintTooltip } from './components/Hint';

// Store (for advanced usage)
export { DialStore, withVisibility } from './store/DialStore';
export type {
  SpringConfig,
  EasingConfig,
  TransitionConfig,
  ActionConfig,
  SelectConfig,
  SelectOption,
  ColorConfig,
  ImageConfig,
  ImageOption,
  DialPadAxis,
  DialPadConfig,
  DialPadValue,
  BackgroundConfig,
  BackgroundValue,
  BackgroundValueUpdate,
  BackgroundGradient,
  BackgroundMedia,
  BackgroundMediaDisplay,
  BackgroundMediaFit,
  BackgroundMediaRatio,
  BackgroundMode,
  GradientHandles,
  GradientPoint,
  GradientStop,
  GradientShape,
  SavedGradient,
  AnchorConfig,
  AnchorValue,
  TextConfig,
  DialKitPersistOptions,
  ShortcutConfig,
  ShortcutMode,
  ShortcutInteraction,
  Preset,
  TransitionMode,
  TransitionPreset,
  CopiedTransition,
  DialValue,
  DialConfig,
  DialKitValueUpdates,
  ResolvedValues,
  SelectAddConfig,
  RowConfig,
  InlineLabelsConfig,
  PadGroupConfig,
  FieldsConfig,
  RangeConfig,
  LayerItem,
  LayersConfig,
  LayersValue,
  LayerActionKind,
  ControlMeta,
  PanelConfig,
  FolderMode,
  VisibleWhen,
  VisibleWhenValue,
  ControlWithVisibility,
} from './store/DialStore';
