import { Fragment, defineComponent, h, type PropType } from 'vue';
import { AnimatePresence, motion } from 'motion-v';
import { DialStore } from '../../store/DialStore';
import type { ControlMeta, DialValue, SpringConfig, TransitionConfig } from '../../store/DialStore';
import { ColorControl } from './ColorControl';
import { ImageControl } from './ImageControl';
import { DialPad } from './DialPad';
import { AnchorControl } from './AnchorControl';
import { Fields } from './Fields';
import { BackgroundControl } from './BackgroundControl';
import type { DialPadValue } from '../../dial-pad';
import type { AnchorValue } from '../../anchor';
import { hasActionHints } from '../../hints';
import { useHints } from '../useHints';
import type { BackgroundValue } from '../../background';
import { Folder } from './Folder';
import { SelectControl } from './SelectControl';
import { ShortcutKey } from './ShortcutListener';
import { Slider } from './Slider';
import { SpringControl } from './SpringControl';
import { TextControl } from './TextControl';
import { Toggle } from './Toggle';
import { TransitionControl, type TransitionDurationControl } from './TransitionControl';
import { inject, ref } from 'vue';

// A control fades with its height, and collapsing it also closes the row gap below it.
// It clips only while sliding, so a settled control's popovers and focus rings are not cut off.
const hiddenControl = { opacity: 0, height: 0, marginBottom: 'calc(var(--dial-row-gap) * -1)', overflowY: 'clip' as const };
const shownControl = { opacity: 1, height: 'auto', marginBottom: 'calc(var(--dial-row-gap) * 0)', overflowY: 'clip' as const, transitionEnd: { overflowY: 'visible' as const } };

export const ControlRenderer = defineComponent({
  name: 'DialKitControlRenderer',
  props: {
    panelId: { type: String, required: true },
    controls: { type: Array as PropType<ControlMeta[]>, required: true },
    values: { type: Object as PropType<Record<string, DialValue>>, required: true },
    transitionDuration: Object as PropType<TransitionDurationControl>,
    /** Path of the one open top-level folder in accordion mode, or null when all are closed. */
    openFolder: { type: String as PropType<string | null>, default: undefined },
    /** Slide controls in and out as their visibility rules change. */
    animateControls: Boolean,
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
    const renderControls = (controls: ControlMeta[], topLevel = false) => props.animateControls
      ? [h(AnimatePresence, { initial: false }, {
        default: () => controls.map((control) => h(motion.div, {
          key: control.path,
          class: 'dialkit-control-wrapper',
          initial: hiddenControl,
          animate: shownControl,
          exit: hiddenControl,
          transition: { type: 'spring', visualDuration: 0.25, bounce: 0.1 },
        }, () => [renderControl(control, topLevel)])),
      })]
      : controls.map((control) => renderControl(control, topLevel));
    // Hinted action buttons are the renderer's own rows; each control mounts its own.
    useHints(() => hasActionHints(props.controls));
    const renderControl = (control: ControlMeta, topLevel = false): ReturnType<typeof h> | null => {
      const value = props.values[control.path];
      switch (control.type) {
        case 'slider':
          return h(Slider, {
            key: control.path,
            label: control.label,
            hint: control.hint,
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
            hint: control.hint,
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
            hint: control.hint,
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
            hint: control.hint,
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
              hint: control.hint,
              onChange: (next: Record<string, DialValue>) => DialStore.updateValues(props.panelId, next),
            });
          }
          // Accordion mode controls top-level folders; nested folders keep their own state.
          const accordion = topLevel && props.openFolder !== undefined;
          return h(Folder, {
            key: control.path,
            title: control.label,
            defaultOpen: control.defaultOpen ?? true,
            hint: control.hint,
            ...resetProps(control),
            open: accordion ? props.openFolder === control.path : undefined,
            onOpenChange: accordion ? (open: boolean) => emit('openFolderChange', open ? control.path : null) : undefined,
          }, { default: () => renderControls(control.children ?? []) });
        }
        case 'text':
          return h(TextControl, {
            key: control.path,
            label: control.label,
            hint: control.hint,
            value: value as string,
            placeholder: control.placeholder,
            onChange: (next: string) => DialStore.updateValue(props.panelId, control.path, next),
          });
        case 'select':
          return h(SelectControl, {
            key: control.path,
            label: control.label,
            hint: control.hint,
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
            hint: control.hint,
            value: value as string,
            onChange: (next: string) => DialStore.updateValue(props.panelId, control.path, next),
          });
        case 'image':
          return h(ImageControl, {
            key: control.path,
            options: control.options,
            label: control.label,
            hint: control.hint,
            value: value as string,
            onChange: (next: string) => DialStore.updateValue(props.panelId, control.path, next),
          });
        case 'pad':
          return h(DialPad, {
            key: control.path,
            label: control.label,
            hint: control.hint,
            value: value as DialPadValue,
            x: control.pad?.x,
            y: control.pad?.y,
            labels: control.pad?.labels,
            hideLabel: control.pad?.hideLabel,
            dragLabels: control.pad?.dragLabels,
            onChange: (next: DialPadValue) => DialStore.updateValue(props.panelId, control.path, next),
          });
        case 'background':
          return h(Folder, {
            key: control.path,
            title: control.label,
            defaultOpen: true,
            hint: control.hint,
          }, {
            default: () => h(BackgroundControl, {
              panelId: props.panelId,
              label: control.label,
              value: value as BackgroundValue,
              upload: control.background?.upload,
              onChange: (next: BackgroundValue) => DialStore.updateValue(props.panelId, control.path, next),
            }),
          });
        case 'anchor':
          return h(AnchorControl, {
            key: control.path,
            label: control.label,
            hint: control.hint,
            value: value as AnchorValue,
            onChange: (next: AnchorValue) => DialStore.updateValue(props.panelId, control.path, next),
          });
        case 'action':
          return h('button', {
            key: control.path,
            class: 'dialkit-button',
            'data-hint': control.hint,
            onClick: () => DialStore.triggerAction(props.panelId, control.path),
          }, control.label);
        default:
          return null;
      }
    };
    return () => h(Fragment, null, renderControls(props.controls, true));
  },
});
