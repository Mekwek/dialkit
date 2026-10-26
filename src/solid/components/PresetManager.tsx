import { observeDropdownKeyboard } from '../../dropdown-keyboard';
import { observePresetMenu, versionNamePrefix } from '../../preset-menu';
import { openDropdownOnKey } from '../../control-keyboard';
import { createSignal, createEffect, on, onMount, onCleanup, Show, For } from 'solid-js';
import { Portal } from 'solid-js/web';
import { animate } from 'motion';
import { ICON_CHEVRON, ICON_TRASH, ICON_PLUS, ICON_CHECK, ICON_MORE, ICON_PENCIL, ICON_LOCK, ICON_LOCK_OPEN } from '../../icons';
import { getDialKitPortalRoot, getDropdownPosition } from '../../dropdown-position';
import { DialStore } from '../../store/DialStore';
import type { Preset } from '../../store/DialStore';
import { versionHints } from '../../hints';
import { createDropdownDismiss, createDropdownPresence, createHints, type AnimationHandle } from '../primitives';

interface PresetManagerProps {
  panelId: string;
  presets: Preset[];
  activePresetId: string | null;
  onAdd?: () => void;
  /** What a version is called in the menu: a version (default) or, in a timeline, a sequence. */
  noun?: 'version' | 'sequence';
}

export function PresetManager(props: PresetManagerProps) {
  createHints(() => true);
  const hints = () => versionHints(props.noun);
  const [pos, setPos] = createSignal({ top: 0, left: 0, width: 0 });
  const [portalTarget, setPortalTarget] = createSignal<HTMLElement | null>(null);
  const [editingId, setEditingId] = createSignal<string | null>(null);
  let triggerRef!: HTMLButtonElement;
  let dropdownRef: HTMLDivElement | undefined;
  let chevronRef!: SVGSVGElement;
  let chevronAnim: AnimationHandle | null = null;

  const activePreset = () => props.presets.find((p) => p.id === props.activePresetId);

  const dropdown = createDropdownPresence((el, done) =>
    animate(
      el,
      { opacity: 0, y: 4, scale: 0.97 },
      { type: 'spring', visualDuration: 0.15, bounce: 0, onComplete: done }
    )
  );

  onMount(() => {
    setPortalTarget(getDialKitPortalRoot(triggerRef) ?? document.body);
    onCleanup(() => chevronAnim?.stop());
  });

  // Renders at its resting state via inline style; animate on changes only.
  createEffect(on(dropdown.isOpen, (open) => {
    if (!chevronRef) return;
    chevronAnim?.stop();
    chevronAnim = animate(
      chevronRef,
      { rotate: open ? 180 : 0, opacity: 0.6 },
      { type: 'spring', visualDuration: 0.2, bounce: 0.15 }
    );
  }, { defer: true }));

  const updatePos = () => {
    const root = portalTarget();
    if (!triggerRef || !root) return;
    setPos(getDropdownPosition(triggerRef, root, { fixed: true, dropdownHeight: (dropdownRef?.scrollHeight ?? 0) + 2 }));
  };

  const openDropdown = () => {
    updatePos();
    setEditingId(null);
    dropdown.open();
  };

  const toggle = () => {
    if (dropdown.isOpen()) dropdown.close();
    else openDropdown();
  };

  createDropdownDismiss({
    isOpen: dropdown.isOpen,
    contains: (target) => triggerRef?.contains(target) || dropdown.contains(target),
    onDismiss: dropdown.close,
    onViewportChange: updatePos,
  });

  createEffect(() => {
    if (!dropdown.isOpen()) return;
    onCleanup(observeDropdownKeyboard(triggerRef, () => dropdownRef, dropdown.close, 'presets'));
    onCleanup(observePresetMenu(() => dropdownRef, (ids) => DialStore.reorderPresets(props.panelId, ids)));
  });

  const handleSelect = (presetId: string | null) => {
    if (presetId) DialStore.loadPreset(props.panelId, presetId);
    else DialStore.clearActivePreset(props.panelId);
    dropdown.close();
  };

  const handleRename = (input: HTMLInputElement, presetId: string) => {
    DialStore.renamePreset(props.panelId, presetId, input.value);
    setEditingId(null);
  };

  const lockButton = (preset: Preset) => (
    <button type="button" class="dialkit-preset-lock" aria-label={`${preset.locked ? 'Unlock' : 'Lock'} ${preset.name}`} onClick={() => DialStore.setPresetLocked(props.panelId, preset.id, !preset.locked)}>
      <Icon paths={preset.locked ? ICON_LOCK : ICON_LOCK_OPEN} />
    </button>
  );

  return (
    <div class="dialkit-preset-manager">
      <button
        ref={triggerRef}
        class="dialkit-preset-trigger"
        onClick={toggle}
        data-open={String(dropdown.isOpen())}
        data-has-preset={String(!!activePreset())}
        type="button" aria-haspopup="menu" aria-expanded={dropdown.isOpen()}
        aria-label="Versions" data-hint={hints().versions} onKeyDown={(e) => openDropdownOnKey(e, openDropdown)}
      >
        <span class="dialkit-preset-label">
          {activePreset() ? activePreset()!.name : DialStore.getBaseName(props.panelId)}
        </span>
        <svg
          ref={chevronRef}
          class="dialkit-select-chevron"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          style={{ opacity: 0.6 }}
        >
          <path d={ICON_CHEVRON} />
        </svg>
      </button>

      <Show when={!!portalTarget()}>
        <Portal mount={portalTarget()!}>
          <Show when={dropdown.mounted()}>
            <div
              ref={(el) => {
                dropdownRef = el;
                dropdown.setRef(el);
                animate(
                  el,
                  { opacity: [0, 1], y: [4, 0], scale: [0.97, 1] },
                  { type: 'spring', visualDuration: 0.15, bounce: 0 }
                );
              }}
              class="dialkit-root dialkit-preset-dropdown"
              style={{
                position: 'fixed',
                top: `${pos().top}px`,
                left: `${pos().left}px`,
                'min-width': `${pos().width}px`,
              }}
            >
              <div
                class="dialkit-preset-item"
                data-active={String(!props.activePresetId)}
                onClick={() => handleSelect(null)}
              >
                <svg class="dialkit-preset-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><Show when={!props.activePresetId}><path d={ICON_CHECK} /></Show></svg>
                <button type="button" class="dialkit-preset-name">{DialStore.getBaseName(props.panelId)}</button>
              </div>

              <For each={props.presets}>
                {(preset) => (
                  <div
                    class="dialkit-preset-item"
                    data-active={String(preset.id === props.activePresetId)}
                    data-preset-id={preset.id}
                    data-locked={String(!!preset.locked)}
                    onClick={(e) => { if (!(e.target as HTMLElement).closest('input, .dialkit-preset-actions')) handleSelect(preset.id); }}
                  >
                    <svg class="dialkit-preset-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><Show when={preset.id === props.activePresetId}><path d={ICON_CHECK} /></Show></svg>
                    <Show
                      when={editingId() === preset.id}
                      fallback={<>
                        <button type="button" class="dialkit-preset-name">{preset.name}</button>
                        {/* Keyboard order: the icon shown at rest (the menu icon, or a locked row's lock), then the actions it reveals. */}
                        <div class="dialkit-preset-actions">
                          <Show when={!preset.locked} fallback={lockButton(preset)}>
                            <button type="button" class="dialkit-preset-more" aria-label={`More actions for ${preset.name}`} data-hint={hints().versionActions}>
                              <Icon paths={ICON_MORE} />
                            </button>
                          </Show>
                          <button type="button" class="dialkit-preset-rename" aria-label={`Rename ${preset.name}`} onClick={() => setEditingId(preset.id)}>
                            <Icon paths={ICON_PENCIL} />
                          </button>
                          <Show when={!preset.locked}>
                            {lockButton(preset)}
                            <button type="button" class="dialkit-preset-delete" aria-label={`Delete ${preset.name}`} onClick={() => DialStore.deletePreset(props.panelId, preset.id)}>
                              <Icon paths={ICON_TRASH} />
                            </button>
                          </Show>
                        </div>
                      </>}
                    >
                      <input
                        ref={(el) => queueMicrotask(() => el.focus())}
                        class="dialkit-preset-input"
                        value={preset.name}
                        aria-label="Version name"
                        onFocus={(e) => e.currentTarget.select()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(e.currentTarget, preset.id);
                          else if (e.key === 'Escape') { e.currentTarget.value = preset.name; setEditingId(null); }
                          else return;
                          e.preventDefault();
                        }}
                        onBlur={(e) => handleRename(e.currentTarget, preset.id)}
                      />
                    </Show>
                  </div>
                )}
              </For>
              <div class="dialkit-preset-divider" role="separator" />
              <button type="button" class="dialkit-preset-create" onClick={() => { if (props.onAdd) props.onAdd(); else DialStore.saveNewPreset(props.panelId, versionNamePrefix(props.noun)); dropdown.close(); triggerRef.focus(); }}>
                <svg class="dialkit-preset-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d={ICON_PLUS[0]} /></svg>
                New {props.noun ?? 'version'}
              </button>
            </div>
          </Show>
        </Portal>
      </Show>
    </div>
  );
}

function Icon(props: { paths: readonly string[] }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <For each={props.paths}>{(d) => <path d={d} />}</For>
    </svg>
  );
}
