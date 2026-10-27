import { Fragment, defineComponent, h, type PropType } from 'vue';
import { DialStore } from '../../store/DialStore';
import type { ControlMeta, DialValue, SpringConfig, TransitionConfig } from '../../store/DialStore';
import { ColorControl } from './ColorControl';
import { ImageControl } from './ImageControl';
import { DialPad } from './DialPad';
import { AnchorControl } from './AnchorControl';
import { Fields } from './Fields';
import type { DialPadValue } from '../../dial-pad';
import type { AnchorValue } from '../../anchor';
import { Folder } from './Folder';
import { SelectControl } from './SelectControl';
import { ShortcutKey } from './ShortcutListener';
import { Slider } from './Slider';
import { SpringControl } from './SpringControl';
import { TextControl } from './TextControl';
import { Toggle } from './Toggle';
import { TransitionControl, type TransitionDurationControl } from './TransitionControl';
import { inject, ref } from 'vue';

export const ControlRenderer = defineComponent({
  name: 'DialKitControlRenderer',
  props: {
    panelId: { type: String, required: true },
    controls: { type: Array as PropType<ControlMeta[]>, required: true },
    values: { type: Object as PropType<Record<string, DialValue>>, required: true },
    transitionDuration: Object as PropType<TransitionDurationControl>,
    /** Path of the one open top-level folder in accordion mode, or null when all are closed. */
    openFolder: { type: String as PropType<string | null>, default: undefined },
  },
  emits: ['openFolderChange'],
  setup(props, { emit }) {
    const shortcut = inject(ShortcutKey, undefined);
    // Counts folder resets, so sliders can spring to the values a reset sets.
    const resetCount = ref(0);
    // The reset button of the folder a control draws: a `_reset` folder, a spring, or a transition.
    const resetProps = (control: ControlMeta) => control.reset ? {
      changed: DialStore.isFolderChanged(props.panelId, control.path),
      onReset: () => {
        resetCount.value++;
        DialStore.resetFolder(props.panelId, control.path);
      },
    } : {};
    const renderControl = (control: ControlMeta, topLevel = false): ReturnType<typeof h> | null => {
      const value = props.values[control.path];
      switch (control.type) {
        case 'slider':
          return h(Slider, {
            key: control.path,
            label: control.label,
            value: value as number,
            min: control.min,
            max: control.max,
            step: control.step,
            unit: control.unit,
            shortcut: control.shortcut,
            shortcutActive: shortcut?.activePanelId.value === props.panelId && shortcut.activePath.value === control.path,
            resetCount: resetCount.value,
            onChange: (next: number) => DialStore.updateValue(props.panelId, control.path, next),
          });
        case 'toggle':
          return h(Toggle, {
            key: control.path,
            label: control.label,
            checked: value as boolean,
            shortcut: control.shortcut,
            shortcutActive: shortcut?.activePanelId.value === props.panelId && shortcut.activePath.value === control.path,
            onChange: (next: boolean) => DialStore.updateValue(props.panelId, control.path, next),
          });
        case 'spring':
          return h(SpringControl, {
            key: control.path,
            panelId: props.panelId,
            path: control.path,
            label: control.label,
            spring: value as SpringConfig,
            onChange: (next: SpringConfig) => DialStore.updateValue(props.panelId, control.path, next),
            ...resetProps(control),
          });
        case 'transition':
          return h(TransitionControl, {
            key: control.path,
            panelId: props.panelId,
            path: control.path,
            label: control.label,
            value: value as TransitionConfig,
            durationControl: props.transitionDuration,
            onChange: (next: TransitionConfig) => DialStore.updateValue(props.panelId, control.path, next),
            ...resetProps(control),
          });
        case 'folder': {
          if (control.fields) {
            return h(Fields, {
              key: control.path,
              label: control.label,
              controls: control.children ?? [],
              values: props.values,
              defaults: DialStore.getDefaultValues(props.panelId),
              onChange: (next: Record<string, DialValue>) => DialStore.updateValues(props.panelId, next),
            });
          }
          // Accordion mode controls top-level folders; nested folders keep their own state.
          const accordion = topLevel && props.openFolder !== undefined;
          return h(Folder, {
            key: control.path,
            title: control.label,
            defaultOpen: control.defaultOpen ?? true,
            ...resetProps(control),
            open: accordion ? props.openFolder === control.path : undefined,
            onOpenChange: accordion ? (open: boolean) => emit('openFolderChange', open ? control.path : null) : undefined,
          }, { default: () => (control.children ?? []).map((child) => renderControl(child)) });
        }
        case 'text':
          return h(TextControl, {
            key: control.path,
            label: control.label,
            value: value as string,
            placeholder: control.placeholder,
            onChange: (next: string) => DialStore.updateValue(props.panelId, control.path, next),
          });
        case 'select':
          return h(SelectControl, {
            key: control.path,
            label: control.label,
            value: value as string,
            options: control.options ?? [],
            display: control.display,
            hideLabel: control.hideLabel,
            onChange: (next: string) => DialStore.updateValue(props.panelId, control.path, next),
          });
        case 'color':
          return h(ColorControl, {
            key: control.path,
            label: control.label,
            value: value as string,
            onChange: (next: string) => DialStore.updateValue(props.panelId, control.path, next),
          });
        case 'image':
          return h(ImageControl, {
            key: control.path,
            options: control.options,
            label: control.label,
            value: value as string,
            onChange: (next: string) => DialStore.updateValue(props.panelId, control.path, next),
          });
        case 'pad':
          return h(DialPad, {
            key: control.path,
            label: control.label,
            value: value as DialPadValue,
            x: control.pad?.x,
            y: control.pad?.y,
            labels: control.pad?.labels,
            hideLabel: control.pad?.hideLabel,
            dragLabels: control.pad?.dragLabels,
            onChange: (next: DialPadValue) => DialStore.updateValue(props.panelId, control.path, next),
          });
        case 'anchor':
          return h(AnchorControl, {
            key: control.path,
            label: control.label,
            value: value as AnchorValue,
            onChange: (next: AnchorValue) => DialStore.updateValue(props.panelId, control.path, next),
          });
        case 'action':
          return h('button', {
            key: control.path,
            class: 'dialkit-button',
            onClick: () => DialStore.triggerAction(props.panelId, control.path),
          }, control.label);
        default:
          return null;
      }
    };
    return () => h(Fragment, null, props.controls.map((control) => renderControl(control, true)));
  },
});
