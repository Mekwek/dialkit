import { observeDropdownKeyboard } from '../../dropdown-keyboard';
import { observePresetMenu, versionNamePrefix } from '../../preset-menu';
import { openDropdownOnKey } from '../../control-keyboard';
import { Teleport, defineComponent, h, ref, watch, type PropType, type VNode } from 'vue';
import { AnimatePresence, motion } from 'motion-v';
import { ICON_CHEVRON, ICON_TRASH, ICON_PLUS, ICON_CHECK, ICON_MORE, ICON_PENCIL, ICON_LOCK, ICON_LOCK_OPEN } from '../../icons';
import { DialStore } from '../../store/DialStore';
import type { Preset } from '../../store/DialStore';

export const PresetManager = defineComponent({
  name: 'DialKitPresetManager',
  props: {
    panelId: { type: String, required: true },
    presets: {
      type: Array as PropType<Preset[]>,
      required: true,
    },
    activePresetId: {
      type: String as PropType<string | null>,
      required: false,
      default: null,
    },
    /** What a version is called in the menu: a version (default) or, in a timeline, a sequence. */
    noun: {
      type: String as PropType<'version' | 'sequence'>,
      default: 'version',
    },
  },
  setup(props) {
    const isOpen = ref(false);
    const editingId = ref<string | null>(null);

    const triggerRef = ref<HTMLElement | null>(null);
    const dropdownRef = ref<HTMLElement | null>(null);

    const activePreset = () => props.presets.find((preset) => preset.id === props.activePresetId);

    const open = () => {
      editingId.value = null;
      isOpen.value = true;
    };

    const close = () => {
      isOpen.value = false;
    };

    const setDropdownRef = (node: unknown) => {
      if (node instanceof HTMLElement) {
        dropdownRef.value = node;
        return;
      }

      if (node && typeof node === 'object' && '$el' in node) {
        const el = (node as { $el?: unknown }).$el;
        dropdownRef.value = el instanceof HTMLElement ? el : null;
        return;
      }

      dropdownRef.value = null;
    };

    const toggle = () => {
      if (isOpen.value) close();
      else open();
    };

    watch(isOpen, (open, _, onCleanup) => {
      if (!open) return;

      const handler = (event: MouseEvent) => {
        const target = event.target as Node;
        if (triggerRef.value?.contains(target) || dropdownRef.value?.contains(target)) return;
        close();
      };

      const stopKeyboard = observeDropdownKeyboard(triggerRef.value!, () => dropdownRef.value, close, 'presets');
      const stopMenu = observePresetMenu(() => dropdownRef.value, (ids) => DialStore.reorderPresets(props.panelId, ids));
      document.addEventListener('mousedown', handler);
      onCleanup(() => {
        stopKeyboard();
        stopMenu();
        document.removeEventListener('mousedown', handler);
      });
    });

    const handleSelect = (presetId: string | null) => {
      if (presetId) {
        DialStore.loadPreset(props.panelId, presetId);
      } else {
        DialStore.clearActivePreset(props.panelId);
      }
      close();
    };

    const handleRename = (input: HTMLInputElement, presetId: string) => {
      DialStore.renamePreset(props.panelId, presetId, input.value);
      editingId.value = null;
    };
    const lockButton = (preset: Preset) => h('button', { type: 'button', class: 'dialkit-preset-lock', title: `${preset.locked ? 'Unlock' : 'Lock'} ${preset.name}`, onClick: () => DialStore.setPresetLocked(props.panelId, preset.id, !preset.locked) }, [icon(preset.locked ? ICON_LOCK : ICON_LOCK_OPEN)]);

    const icon = (paths: readonly string[]) => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, paths.map((d) => h('path', { d })));
    const glyph = (path: string | null) => h('svg', { class: 'dialkit-preset-check', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'aria-hidden': 'true' }, path ? [h('path', { d: path })] : []);

    return () => h('div', { class: 'dialkit-preset-manager' }, [
      h('button', {
        ref: triggerRef,
        class: 'dialkit-preset-trigger',
        onClick: toggle,
        'data-open': String(isOpen.value),
        'data-has-preset': String(!!activePreset()),
        type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': isOpen.value,
        'aria-label': 'Versions', onKeydown: (e: KeyboardEvent) => openDropdownOnKey(e, open),
      }, [
        h('span', { class: 'dialkit-preset-label' }, activePreset()?.name ?? DialStore.getBaseName(props.panelId)),
        h(motion.svg, {
          class: 'dialkit-select-chevron',
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '2.5',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          animate: { rotate: isOpen.value ? 180 : 0, opacity: 0.6 },
          transition: { type: 'spring', visualDuration: 0.2, bounce: 0.15 },
        }, [h('path', { d: ICON_CHEVRON })]),
      ]),

      h(Teleport, { to: 'body' }, [
        h(AnimatePresence, null, {
          default: () => isOpen.value
            ? [h(motion.div, {
              key: 'dialkit-preset-dropdown',
              ref: setDropdownRef,
              class: 'dialkit-root dialkit-preset-dropdown',
              // observeDropdownKeyboard places the menu; a top/left given here would be restored on every update.
              style: { position: 'fixed' },
              initial: { opacity: 0, y: 4, scale: 0.97 },
              animate: { opacity: 1, y: 0, scale: 1 },
              exit: { opacity: 0, y: 4, scale: 0.97, pointerEvents: 'none' },
              transition: { type: 'spring', visualDuration: 0.15, bounce: 0 },
            }, [
              h('div', {
                class: 'dialkit-preset-item',
                'data-active': String(!props.activePresetId),
                onClick: () => handleSelect(null),
              }, [glyph(!props.activePresetId ? ICON_CHECK : null), h('button', { type: 'button', class: 'dialkit-preset-name' }, DialStore.getBaseName(props.panelId))]),

              ...props.presets.map((preset) => h('div', {
                key: preset.id,
                class: 'dialkit-preset-item',
                'data-active': String(preset.id === props.activePresetId),
                'data-preset-id': preset.id,
                'data-locked': String(!!preset.locked),
                onClick: (event: MouseEvent) => { if (!(event.target as HTMLElement).closest('input, .dialkit-preset-actions')) handleSelect(preset.id); },
              }, [
                glyph(preset.id === props.activePresetId ? ICON_CHECK : null),
                ...(editingId.value === preset.id ? [
                  h('input', {
                    class: 'dialkit-preset-input',
                    value: preset.name,
                    'aria-label': 'Version name',
                    onVnodeMounted: (vnode: VNode) => (vnode.el as HTMLInputElement).focus(),
                    onFocus: (event: FocusEvent) => (event.currentTarget as HTMLInputElement).select(),
                    onKeydown: (event: KeyboardEvent) => {
                      const input = event.currentTarget as HTMLInputElement;
                      if (event.key === 'Enter') handleRename(input, preset.id);
                      else if (event.key === 'Escape') { input.value = preset.name; editingId.value = null; }
                      else return;
                      event.preventDefault();
                    },
                    onBlur: (event: FocusEvent) => handleRename(event.currentTarget as HTMLInputElement, preset.id),
                  }),
                ] : [
                  h('button', { type: 'button', class: 'dialkit-preset-name' }, preset.name),
                  // Keyboard order: the icon shown at rest (the menu icon, or a locked row's lock), then the actions it reveals.
                  h('div', { class: 'dialkit-preset-actions' }, [
                    preset.locked ? lockButton(preset) : h('button', { type: 'button', class: 'dialkit-preset-more', 'aria-label': `More actions for ${preset.name}` }, [icon(ICON_MORE)]),
                    h('button', { type: 'button', class: 'dialkit-preset-rename', title: `Rename ${preset.name}`, onClick: () => { editingId.value = preset.id; } }, [icon(ICON_PENCIL)]),
                    ...(preset.locked ? [] : [
                      lockButton(preset),
                      h('button', { type: 'button', class: 'dialkit-preset-delete', title: `Delete ${preset.name}`, onClick: () => DialStore.deletePreset(props.panelId, preset.id) }, [icon(ICON_TRASH)]),
                    ]),
                  ]),
                ]),
              ])),
              h('div', { class: 'dialkit-preset-divider', role: 'separator' }),
              h('button', { type: 'button', class: 'dialkit-preset-create', onClick: () => { DialStore.saveNewPreset(props.panelId, versionNamePrefix(props.noun)); close(); triggerRef.value?.focus(); } }, [glyph(ICON_PLUS[0]), `New ${props.noun}`]),
            ])]
            : [],
        }),
      ]),
    ]);
  },
});
