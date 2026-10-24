import { observeDropdownKeyboard } from '../dropdown-keyboard';
import { observePresetMenu } from '../preset-menu';
import { openDropdownOnKey } from '../control-keyboard';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { DialStore, Preset } from '../store/DialStore';
import { ICON_CHEVRON, ICON_TRASH, ICON_PLUS, ICON_CHECK, ICON_MORE, ICON_PENCIL, ICON_LOCK, ICON_LOCK_OPEN } from '../icons';

interface PresetManagerProps {
  panelId: string;
  presets: Preset[];
  activePresetId: string | null;
  onAdd?: () => void;
}

export function PresetManager({ panelId, presets, activePresetId, onAdd }: PresetManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);

  const activePreset = presets.find((p) => p.id === activePresetId);

  const open = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setEditingId(null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

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
    const stopMenu = observePresetMenu(() => dropdownRef.current, (ids) => DialStore.reorderPresets(panelId, ids));
    document.addEventListener('mousedown', handler);
    return () => { stopKeyboard(); stopMenu(); document.removeEventListener('mousedown', handler); };
  }, [isOpen, close, panelId]);

  const handleSelect = (presetId: string | null) => {
    if (presetId) {
      DialStore.loadPreset(panelId, presetId);
    } else {
      DialStore.clearActivePreset(panelId);
    }
    close();
  };

  const handleRename = (input: HTMLInputElement, presetId: string) => {
    DialStore.renamePreset(panelId, presetId, input.value);
    setEditingId(null);
  };

  return (
    <div className="dialkit-preset-manager">
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
              className="dialkit-root dialkit-preset-dropdown"
              style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.width }}
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97, pointerEvents: 'none' as any }}
              transition={{ type: 'spring', visualDuration: 0.15, bounce: 0 }}
            >
              <div
                className="dialkit-preset-item"
                data-active={String(!activePresetId)}
                onClick={() => handleSelect(null)}
              >
                <svg className="dialkit-preset-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{!activePresetId && <path d={ICON_CHECK} />}</svg>
                <button type="button" className="dialkit-preset-name">Version 1</button>
              </div>

              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="dialkit-preset-item"
                  data-active={String(preset.id === activePresetId)}
                  data-preset-id={preset.id}
                  data-locked={String(!!preset.locked)}
                  onClick={(e) => { if (!(e.target as HTMLElement).closest('input, .dialkit-preset-actions')) handleSelect(preset.id); }}
                >
                  <svg className="dialkit-preset-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{preset.id === activePresetId && <path d={ICON_CHECK} />}</svg>
                  {editingId === preset.id ? (
                    <input
                      className="dialkit-preset-input"
                      defaultValue={preset.name}
                      aria-label="Version name"
                      autoFocus
                      onFocus={(e) => e.currentTarget.select()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(e.currentTarget, preset.id);
                        else if (e.key === 'Escape') { e.currentTarget.value = preset.name; setEditingId(null); }
                        else return;
                        e.preventDefault();
                      }}
                      onBlur={(e) => handleRename(e.currentTarget, preset.id)}
                    />
                  ) : (
                    <>
                      <button type="button" className="dialkit-preset-name">{preset.name}</button>
                      <div className="dialkit-preset-actions">
                        <button type="button" className="dialkit-preset-rename" title={`Rename ${preset.name}`} onClick={() => setEditingId(preset.id)}>
                          <Icon paths={ICON_PENCIL} />
                        </button>
                        <button type="button" className="dialkit-preset-lock" title={`${preset.locked ? 'Unlock' : 'Lock'} ${preset.name}`} onClick={() => DialStore.setPresetLocked(panelId, preset.id, !preset.locked)}>
                          <Icon paths={preset.locked ? ICON_LOCK : ICON_LOCK_OPEN} />
                        </button>
                        {!preset.locked && (
                          <>
                            <button type="button" className="dialkit-preset-delete" title={`Delete ${preset.name}`} onClick={() => DialStore.deletePreset(panelId, preset.id)}>
                              <Icon paths={ICON_TRASH} />
                            </button>
                            <span className="dialkit-preset-more" aria-hidden="true">
                              <Icon paths={ICON_MORE} />
                            </span>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div className="dialkit-preset-divider" role="separator" />
              <button type="button" className="dialkit-preset-create" onClick={() => { if (onAdd) onAdd(); else DialStore.saveNewPreset(panelId); close(); triggerRef.current?.focus(); }}>
                <svg className="dialkit-preset-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d={ICON_PLUS[0]} /></svg>
                New version
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

function Icon({ paths }: { paths: readonly string[] }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
