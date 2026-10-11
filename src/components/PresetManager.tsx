import { observeDropdownKeyboard } from '../dropdown-keyboard';
import { getDropdownPosition } from '../dropdown-position';
import { openDropdownOnKey } from '../control-keyboard';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { DialStore, Preset } from '../store/DialStore';
import { ICON_CHECK, ICON_CHEVRON, ICON_MORE, ICON_PENCIL, ICON_PLUS, ICON_TRASH, ICON_LOCK, ICON_LOCK_OPEN } from '../icons';
import { useHint } from './Hint';

interface PresetManagerProps {
  panelId: string;
  presets: Preset[];
  activePresetId: string | null;
  onAdd: () => void;
  /** Extra class for the portal'd dropdown — the portal escapes the host's DOM
   *  context, so hosts (e.g. the timeline dock) need this to scope styling. */
  dropdownClassName?: string;
  /** What a preset is called in the hint and the list: a version (default) or a sequence. */
  noun?: 'version' | 'sequence';
}

/** The picker's hint names only the actions its list offers. */
function pickerHint(noun: string, editable: boolean, lockable: boolean): string {
  const actions = lockable ? 'Rename, lock or delete' : editable ? 'Rename or delete' : 'Delete';
  return `Switches to another ${noun}. ${actions} a ${noun} from the list.`;
}

/** The list's mark for the current preset (upstream's menu style); an empty
 *  box keeps the names aligned. */
function PresetCheck({ active }: { active: boolean }) {
  return (
    <svg className="dialkit-preset-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      {active && <path d={ICON_CHECK} />}
    </svg>
  );
}

type RowDrag = { id: string; startY: number; lifted: boolean };

/**
 * A row being dragged to a new place, as drawn: it follows the pointer by
 * `offset` px, and the rows between its old index `from` and its new index
 * `to` slide one row (`step` px) aside. `settling` is the glide into its
 * new place after the release, before the store takes the new order.
 */
type RowDragView = { id: string; from: number; to: number; offset: number; step: number; settling: boolean };

// Minimum pointer travel (px) before a press on a row turns into a reorder
// drag rather than a click-to-select.
const DRAG_LIFT_PX = 4;
// Widest a preset dropdown gets before names truncate.
const PRESET_DROPDOWN_MAX_WIDTH = 280;

export function PresetManager({ panelId, presets, activePresetId, onAdd, dropdownClassName, noun = 'version' }: PresetManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, above: false });

  // Inline rename
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const cancelledRef = useRef(false);

  // Drag-anywhere-on-row reorder
  const [rowDrag, setRowDrag] = useState<RowDragView | null>(null);
  const draggingId = rowDrag?.id ?? null;
  const dragRef = useRef<RowDrag | null>(null);
  const suppressClickRef = useRef(false);

  const editable = DialStore.isPresetsEditable(panelId);
  const lockable = editable && DialStore.isPresetsLockable(panelId);
  const { hintRow } = useHint(pickerHint(noun, editable, lockable));

  const activePreset = presets.find((p) => p.id === activePresetId);

  const open = useCallback(() => {
    const trigger = triggerRef.current;
    if (trigger) {
      // Flip above the trigger when there isn't room below (mirrors SelectControl).
      // +1 row for the default "Version 1" entry; 36px/row + 8px padding.
      // The New row and its divider add 41px.
      const dropdownHeight = 8 + (presets.length + 1) * 36 + 41;
      // The keyboard observer re-positions the open menu every frame with the
      // same helper; this first pass only has to land close and pick the side.
      const { top, left, width, above } = getDropdownPosition(trigger, document.body, { dropdownHeight, fixed: true });
      setPos({ top, left, width, above });
    }
    setIsOpen(true);
  }, [presets.length]);

  const close = useCallback(() => {
    setIsOpen(false);
    setEditingId(null);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, open, close]);

  // Close on any mousedown outside trigger + dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return;
      close();
    };

    const stopKeyboard = observeDropdownKeyboard(triggerRef.current!, () => dropdownRef.current, close, 'presets');
    document.addEventListener('mousedown', handler);
    return () => { stopKeyboard(); document.removeEventListener('mousedown', handler); };
  }, [isOpen, close]);

  const handleSelect = (presetId: string | null) => {
    if (presetId) {
      DialStore.loadPreset(panelId, presetId);
    } else {
      DialStore.clearActivePreset(panelId);
    }
    close();
  };

  const handleDelete = (e: React.MouseEvent, presetId: string) => {
    e.stopPropagation();
    DialStore.deletePreset(panelId, presetId);
  };

  const startEdit = (preset: Preset) => {
    cancelledRef.current = false;
    setEditingId(preset.id);
    setDraft(preset.name);
  };

  const commitEdit = () => {
    if (!editingId) return;
    DialStore.renamePreset(panelId, editingId, draft);
    setEditingId(null);
  };

  const cancelEdit = () => {
    cancelledRef.current = true;
    setEditingId(null);
  };

  const handleRowPointerDown = (e: React.PointerEvent<HTMLDivElement>, preset: Preset) => {
    if (!editable) return;
    if (editingId === preset.id) return;
    if (e.button !== 0) return;
    // A row still gliding into its new place takes no new drag.
    if (rowDrag) return;
    dragRef.current = { id: preset.id, startY: e.clientY, lifted: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleRowPointerMove = (e: React.PointerEvent<HTMLDivElement>, preset: Preset) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== preset.id) return;
    const dy = e.clientY - drag.startY;

    if (!drag.lifted) {
      if (Math.abs(dy) <= DRAG_LIFT_PX) return;
      drag.lifted = true;
    }

    const from = presets.findIndex((p) => p.id === drag.id);
    if (from < 0) return;
    // One row's travel: its height plus the gap, measured from the rows as
    // they sit before the drag moves any of them.
    let step = rowDrag?.step ?? 0;
    if (!step) {
      const rows = dropdownRef.current?.querySelectorAll<HTMLElement>('.dialkit-preset-item[data-preset-id]');
      const first = rows?.[0]?.getBoundingClientRect();
      const second = rows?.[1]?.getBoundingClientRect();
      step = first && second ? second.top - first.top : (first?.height ?? 32);
    }
    // The row stays inside the list, and its new place is the slot its
    // centre is over.
    const offset = Math.min(Math.max(dy, -from * step), (presets.length - 1 - from) * step);
    const to = Math.min(Math.max(Math.round(from + offset / step), 0), presets.length - 1);
    setRowDrag({ id: drag.id, from, to, offset, step, settling: false });
  };

  /** Puts the dragged row at its new place in the store's order. */
  const commitReorder = (view: RowDragView) => {
    const ids = presets.map((p) => p.id).filter((id) => id !== view.id);
    ids.splice(view.to, 0, view.id);
    DialStore.reorderPresets(panelId, ids);
    setRowDrag(null);
  };

  const handleRowPointerEnd = (_e: React.PointerEvent<HTMLDivElement>, preset: Preset) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.id !== preset.id) return;

    if (drag.lifted && rowDrag && !rowDrag.settling) {
      // The row glides from the pointer into its new place; the store
      // takes the new order when the glide ends (onTransitionEnd), so the
      // rows never jump.
      const view = { ...rowDrag, settling: true };
      setRowDrag(view);
      // No glide to wait for: the row already sits in its place, or the
      // user asked for reduced motion (no transition, so no transitionend).
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduced || view.offset === (view.to - view.from) * view.step) commitReorder(view);
      // The click that follows this release must not select the row. It is
      // dispatched inside the same input task, so a macrotask reset still
      // runs after it — and clears the flag when no click follows at all
      // (release outside the row), so the next real click is not swallowed.
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    } else if (!drag.lifted) {
      setRowDrag(null);
    }
  };

  /** How far a row is drawn from its place while a row is dragged. */
  const rowShift = (preset: Preset, index: number): number => {
    if (!rowDrag) return 0;
    const { id, from, to, offset, step, settling } = rowDrag;
    if (preset.id === id) return settling ? (to - from) * step : offset;
    if (from < to && index > from && index <= to) return -step;
    if (to < from && index >= to && index < from) return step;
    return 0;
  };

  return (
    <div className="dialkit-preset-manager" {...hintRow}>
      <button
        ref={triggerRef}
        className="dialkit-preset-trigger"
        onClick={toggle}
        data-open={String(isOpen)}
        data-has-preset={String(!!activePreset)}
        type="button" aria-haspopup="menu" aria-expanded={isOpen}
        aria-label="Versions" onKeyDown={(e) => openDropdownOnKey(e, open)}
      >
        <span className="dialkit-preset-label">
          {activePreset ? activePreset.name : 'Version 1'}
        </span>
        <motion.svg
          className="dialkit-select-chevron"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ rotate: isOpen ? 180 : 0, opacity: 0.6 }}
          transition={{ type: 'spring', visualDuration: 0.2, bounce: 0.15 }}
        >
          <path d={ICON_CHEVRON} />
        </motion.svg>
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={dropdownRef}
              className={`dialkit-root dialkit-preset-dropdown${dropdownClassName ? ` ${dropdownClassName}` : ''}`}
              data-dragging={draggingId ? 'true' : undefined}
              data-settling={rowDrag?.settling ? 'true' : undefined}
              style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                minWidth: pos.width,
                // Grow for long names, but never past the viewport's right
                // edge or a sane cap — a long name truncates (ellipsis on
                // .dialkit-preset-name) instead of pushing the icons off
                // screen where the rename control can't be reached.
                maxWidth: Math.max(pos.width, Math.min(PRESET_DROPDOWN_MAX_WIDTH, window.innerWidth - pos.left - 8)),
                transformOrigin: pos.above ? 'bottom' : 'top',
              }}
              initial={{ opacity: 0, y: pos.above ? 8 : -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: pos.above ? 8 : -8, scale: 0.97, pointerEvents: 'none' as any }}
              transition={{ type: 'spring', visualDuration: 0.15, bounce: 0 }}
            >
              <div
                className="dialkit-preset-item"
                data-active={String(!activePresetId)}
                onClick={() => handleSelect(null)}
              >
                <PresetCheck active={!activePresetId} />
                <button type="button" className="dialkit-preset-name">Version 1</button>
              </div>

              {presets.map((preset, index) => {
                const isEditing = editingId === preset.id;
                const shift = rowShift(preset, index);
                return (
                  <div
                    key={preset.id}
                    className="dialkit-preset-item"
                    data-active={String(preset.id === activePresetId)}
                    data-preset-id={preset.id}
                    data-locked={preset.locked ? 'true' : undefined}
                    data-dragging={draggingId === preset.id ? 'true' : undefined}
                    style={shift ? { transform: `translateY(${shift}px)` } : undefined}
                    onTransitionEnd={(e) => {
                      if (rowDrag?.settling && preset.id === rowDrag.id && e.target === e.currentTarget && e.propertyName === 'transform') {
                        commitReorder(rowDrag);
                      }
                    }}
                    onClick={() => {
                      if (isEditing) return;
                      if (suppressClickRef.current) {
                        suppressClickRef.current = false;
                        return;
                      }
                      handleSelect(preset.id);
                    }}
                    onPointerDown={(e) => handleRowPointerDown(e, preset)}
                    onPointerMove={(e) => handleRowPointerMove(e, preset)}
                    onPointerUp={(e) => handleRowPointerEnd(e, preset)}
                    onPointerCancel={(e) => handleRowPointerEnd(e, preset)}
                    onLostPointerCapture={(e) => handleRowPointerEnd(e, preset)}
                  >
                    <PresetCheck active={preset.id === activePresetId} />
                    {isEditing ? (
                      <input
                        className="dialkit-preset-input"
                        value={draft}
                        autoFocus
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitEdit();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEdit();
                          }
                        }}
                        onBlur={() => {
                          if (cancelledRef.current) {
                            cancelledRef.current = false;
                            return;
                          }
                          commitEdit();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <button type="button" className="dialkit-preset-name">{preset.name}</button>
                    )}

                    {!isEditing && (
                      <PresetActions
                        id={preset.id}
                        noun={noun}
                        locked={!!preset.locked}
                        editable={editable}
                        lockable={lockable}
                        onRename={() => startEdit(preset)}
                        onToggleLock={() => DialStore.setPresetLocked(panelId, preset.id, !preset.locked)}
                        onDelete={(e) => handleDelete(e, preset.id)}
                      />
                    )}
                  </div>
                );
              })}

              {/* Upstream's New row: the add button's action, at the end of the list. */}
              <div className="dialkit-preset-divider" role="separator" />
              <button
                type="button"
                className="dialkit-preset-create"
                onClick={() => { onAdd(); close(); triggerRef.current?.focus(); }}
              >
                <svg className="dialkit-preset-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d={ICON_PLUS[0]} />
                </svg>
                New {noun}
              </button>

            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

/** How long a row's action group takes to open or close. */
const GROUP_SPRING = { type: 'spring', visualDuration: 0.15, bounce: 0 } as const;

/**
 * The group widens over the name while its icons pop out one after another,
 * the one next to the dots first; closing pops them in the other way.
 */
const GROUP_MOTION = {
  hidden: { width: 0, opacity: 0, transition: { ...GROUP_SPRING, staggerChildren: 0.045, staggerDirection: 1 } },
  shown: { width: 'auto', opacity: 1, transition: { ...GROUP_SPRING, staggerChildren: 0.045, staggerDirection: -1 } },
};

/** The icons pop with a little bounce; the group's width does not, so its
    faded edge never wobbles over the name. */
const ICON_SPRING = { type: 'spring', visualDuration: 0.2, bounce: 0.35 } as const;

const ICON_MOTION = {
  hidden: { scale: 0.6, x: 2, transition: ICON_SPRING },
  shown: { scale: 1, x: 0, transition: ICON_SPRING },
};

/** Stops a press on a row's action from selecting or dragging the row. */
const keepPress = {
  onMouseDown: (e: ReactMouseEvent) => e.stopPropagation(),
  onPointerDown: (e: ReactPointerEvent) => e.stopPropagation(),
};

function Icon({ paths }: { paths: string[] }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/**
 * A row's actions at its right end, so the name keeps the rest of the row.
 * An unlocked row shows three dots; hovering or clicking them opens rename,
 * lock and delete to their left, over the name, and leaving the group closes
 * it. A locked row shows its closed lock there instead (a click unlocks it):
 * rename, its only action, pops in on row hover. The lock and rename slide
 * between the two layouts when the row locks or unlocks.
 */
/** The dots' hint names the actions they open, as the picker's hint does. */
function dotsHint(noun: string, editable: boolean, lockable: boolean): string {
  const actions = lockable ? 'rename, lock and delete' : editable ? 'rename and delete' : 'delete';
  return `Shows ${actions} for this ${noun}.`;
}

function PresetActions({ id, noun, locked, editable, lockable, onRename, onToggleLock, onDelete }: {
  id: string;
  noun: string;
  locked: boolean;
  editable: boolean;
  lockable: boolean;
  onRename: () => void;
  onToggleLock: () => void;
  onDelete: (e: ReactMouseEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rowHover, setRowHover] = useState(false);
  const { hintRow: dotsHintRow } = useHint(dotsHint(noun, editable, lockable));
  const host = useRef<HTMLDivElement>(null);
  const rename = editable;
  const lockInGroup = lockable && !locked;
  const remove = !locked;
  const hasGroup = rename || lockInGroup || remove;
  // A locked row shows rename directly, no dots.
  const directRename = locked && lockable && rename;

  // Direct rename follows the row's hover and focus, not the dots'.
  useEffect(() => {
    const row = host.current?.parentElement;
    if (!directRename || !row) return;
    setRowHover(row.matches(':hover') || row.contains(document.activeElement));
    const show = () => setRowHover(true);
    const hide = () => setRowHover(false);
    const focusOut = (e: FocusEvent) => { if (!row.contains(e.relatedTarget as Node | null)) hide(); };
    row.addEventListener('pointerenter', show);
    row.addEventListener('pointerleave', hide);
    row.addEventListener('focusin', show);
    row.addEventListener('focusout', focusOut);
    return () => {
      row.removeEventListener('pointerenter', show);
      row.removeEventListener('pointerleave', hide);
      row.removeEventListener('focusin', show);
      row.removeEventListener('focusout', focusOut);
    };
  }, [directRename]);

  if (!hasGroup && !(locked && lockable)) return null;

  // The lock and rename keep one identity across the group and the locked
  // layout, so they slide instead of jumping.
  const lockId = `dialkit-preset-lock-${id}`;
  const renameId = `dialkit-preset-rename-${id}`;
  const slide = { layout: GROUP_SPRING };

  const lockedLock = locked && lockable && (
    <motion.button
      type="button"
      layoutId={lockId}
              layoutCrossfade={false}
      transition={slide}
      className="dialkit-preset-lock"
      data-locked="true"
      aria-label="Unlock preset"
      onClick={onToggleLock}
      {...keepPress}
    >
      <Icon paths={ICON_LOCK} />
    </motion.button>
  );
  const dots = hasGroup && !directRename && (
    <button
      type="button"
      className="dialkit-preset-more"
      aria-label="More actions"
      aria-expanded={open}
      {...dotsHintRow}
      onPointerEnter={(e) => {
        dotsHintRow.onPointerEnter?.(e);
        if (e.pointerType === 'mouse') setOpen(true);
      }}
      onFocus={() => setOpen(true)}
      onClick={() => setOpen(true)}
      {...keepPress}
    >
      <Icon paths={ICON_MORE} />
    </button>
  );

  return (
    <div
      ref={host}
      className="dialkit-preset-actions"
      data-open={open || (directRename && rowHover) || undefined}
      // A touch ends with a pointer leave: only a mouse closes the group by
      // leaving it. A touch closes it by focusing elsewhere.
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setOpen(false); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* DOM order is right to left (the row is reversed). */}
      {lockedLock}
      {dots}
      {directRename && (
        // The same group as the dots open, so rename widens and fades in and
        // out like the other icons. Mounted already shown when the row locks
        // under the pointer (initial={false}): rename then only slides.
        <AnimatePresence initial={false}>
          {rowHover && (
            <motion.div
              className="dialkit-preset-actions-group"
              variants={GROUP_MOTION}
              initial="hidden"
              animate="shown"
              exit="hidden"
            >
              <motion.button
                type="button"
                layoutId={renameId}
                layoutCrossfade={false}
                variants={ICON_MOTION}
                transition={slide}
                className="dialkit-preset-rename dialkit-preset-direct"
                aria-label="Rename preset"
                onClick={onRename}
                {...keepPress}
              >
                <Icon paths={ICON_PENCIL} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
      <AnimatePresence initial={false}>
        {open && hasGroup && !directRename && (
          <motion.div
            className="dialkit-preset-actions-group"
            variants={GROUP_MOTION}
            initial="hidden"
            animate="shown"
            exit="hidden"
          >
            {rename && (
              <motion.button type="button" layoutId={renameId}
              layoutCrossfade={false} transition={slide} variants={ICON_MOTION} className="dialkit-preset-rename" aria-label="Rename preset" onClick={onRename} {...keepPress}>
                <Icon paths={ICON_PENCIL} />
              </motion.button>
            )}
            {lockInGroup && (
              <motion.button type="button" layoutId={lockId}
              layoutCrossfade={false} transition={slide} variants={ICON_MOTION} className="dialkit-preset-lock" data-locked="false" aria-label="Lock preset" onClick={onToggleLock} {...keepPress}>
                <Icon paths={ICON_LOCK_OPEN} />
              </motion.button>
            )}
            {remove && (
              <motion.button type="button" variants={ICON_MOTION} className="dialkit-preset-delete" aria-label="Delete preset" onClick={onDelete} {...keepPress}>
                <Icon paths={ICON_TRASH} />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

