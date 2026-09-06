import { observeDropdownKeyboard } from '../dropdown-keyboard';
import { getDropdownPosition } from '../dropdown-position';
import { openDropdownOnKey } from '../control-keyboard';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { DialStore, Preset } from '../store/DialStore';
import { ICON_CHEVRON, ICON_PENCIL, ICON_TRASH, ICON_LOCK, ICON_LOCK_OPEN } from '../icons';

interface PresetManagerProps {
  panelId: string;
  presets: Preset[];
  activePresetId: string | null;
  onAdd: () => void;
  /** Extra class for the portal'd dropdown — the portal escapes the host's DOM
   *  context, so hosts (e.g. the timeline dock) need this to scope styling. */
  dropdownClassName?: string;
}

type RowDrag = { id: string; startY: number; lifted: boolean; slot: number | null };

// Minimum pointer travel (px) before a press on a row turns into a reorder
// drag rather than a click-to-select.
const DRAG_LIFT_PX = 4;
// Widest a preset dropdown gets before names truncate.
const PRESET_DROPDOWN_MAX_WIDTH = 280;

export function PresetManager({ panelId, presets, activePresetId, onAdd, dropdownClassName }: PresetManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, above: false });

  // Inline rename
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const cancelledRef = useRef(false);

  // Drag-anywhere-on-row reorder
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [cueTop, setCueTop] = useState<number | null>(null);
  const dragRef = useRef<RowDrag | null>(null);
  const suppressClickRef = useRef(false);

  const editable = DialStore.isPresetsEditable(panelId);
  const lockable = editable && DialStore.isPresetsLockable(panelId);

  const hasPresets = presets.length > 0;
  const activePreset = presets.find((p) => p.id === activePresetId);

  const open = useCallback(() => {
    if (!hasPresets) return;
    const trigger = triggerRef.current;
    if (trigger) {
      // Flip above the trigger when there isn't room below (mirrors SelectControl).
      // +1 row for the default "Version 1" entry; 36px/row + 8px padding.
      const dropdownHeight = 8 + (presets.length + 1) * 36;
      // The keyboard observer re-positions the open menu every frame with the
      // same helper; this first pass only has to land close and pick the side.
      const { top, left, width, above } = getDropdownPosition(trigger, document.body, { dropdownHeight, fixed: true });
      setPos({ top, left, width, above });
    }
    setIsOpen(true);
  }, [hasPresets, presets.length]);

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
    dragRef.current = { id: preset.id, startY: e.clientY, lifted: false, slot: null };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleRowPointerMove = (e: React.PointerEvent<HTMLDivElement>, preset: Preset) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== preset.id) return;

    if (!drag.lifted) {
      if (Math.abs(e.clientY - drag.startY) <= DRAG_LIFT_PX) return;
      drag.lifted = true;
      setDraggingId(drag.id);
    }

    const dropdownEl = dropdownRef.current;
    if (!dropdownEl) return;
    const rows = Array.from(dropdownEl.querySelectorAll<HTMLElement>('.dialkit-preset-item[data-preset-id]'));
    if (rows.length === 0) return;

    const dropdownRect = dropdownEl.getBoundingClientRect();
    let slot = rows.length;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        slot = i;
        break;
      }
    }
    drag.slot = slot;

    const top = slot < rows.length
      ? rows[slot].getBoundingClientRect().top - dropdownRect.top
      : rows[rows.length - 1].getBoundingClientRect().bottom - dropdownRect.top;
    setCueTop(top);
  };

  const handleRowPointerEnd = (e: React.PointerEvent<HTMLDivElement>, preset: Preset) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.id !== preset.id) return;

    if (drag.lifted && drag.slot !== null) {
      const currentIds = presets.map((p) => p.id);
      const idx = currentIds.indexOf(drag.id);
      const withoutDragged = currentIds.filter((id) => id !== drag.id);
      const adjustedSlot = idx >= 0 && drag.slot > idx ? drag.slot - 1 : drag.slot;
      withoutDragged.splice(adjustedSlot, 0, drag.id);
      DialStore.reorderPresets(panelId, withoutDragged);
      // The click that follows this release must not select the row. It is
      // dispatched inside the same input task, so a macrotask reset still
      // runs after it — and clears the flag when no click follows at all
      // (release outside the row), so the next real click is not swallowed.
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    setDraggingId(null);
    setCueTop(null);
  };

  return (
    <div className="dialkit-preset-manager">
      <button
        ref={triggerRef}
        className="dialkit-preset-trigger"
        onClick={toggle}
        data-open={String(isOpen)}
        data-has-preset={String(!!activePreset)}
        data-disabled={String(!hasPresets)}
        type="button" aria-haspopup="menu" aria-expanded={isOpen} disabled={!hasPresets}
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
          animate={{ rotate: isOpen ? 180 : 0, opacity: hasPresets ? 0.6 : 0.25 }}
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
                <button type="button" className="dialkit-preset-name">Version 1</button>
              </div>

              {presets.map((preset) => {
                const isEditing = editingId === preset.id;
                return (
                  <div
                    key={preset.id}
                    className="dialkit-preset-item"
                    data-active={String(preset.id === activePresetId)}
                    data-preset-id={preset.id}
                    data-locked={preset.locked ? 'true' : undefined}
                    data-dragging={draggingId === preset.id ? 'true' : undefined}
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
                      <>
                        {editable && (
                          <button
                            className="dialkit-preset-rename"
                            title="Rename preset"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(preset);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              {ICON_PENCIL.map((d, i) => (
                                <path key={i} d={d} />
                              ))}
                            </svg>
                          </button>
                        )}
                        {lockable && (
                          <button
                            className="dialkit-preset-lock"
                            data-locked={String(!!preset.locked)}
                            title={preset.locked ? 'Unlock preset' : 'Lock preset'}
                            onClick={(e) => {
                              e.stopPropagation();
                              DialStore.setPresetLocked(panelId, preset.id, !preset.locked);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              {(preset.locked ? ICON_LOCK : ICON_LOCK_OPEN).map((d, i) => (
                                <path key={i} d={d} />
                              ))}
                            </svg>
                          </button>
                        )}
                        {!preset.locked && (
                          <button
                            className="dialkit-preset-delete"
                            onClick={(e) => handleDelete(e, preset.id)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            title="Delete preset"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              {ICON_TRASH.map((d, i) => (
                                <path key={i} d={d} />
                              ))}
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {draggingId && cueTop !== null && (
                <div className="dialkit-preset-drop-cue" style={{ top: cueTop }} />
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
