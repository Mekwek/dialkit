import { observeDropdownKeyboard } from '../dropdown-keyboard';
import { openDropdownOnKey } from '../control-keyboard';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getDialKitPortalRoot, getDropdownPosition, observeDropdownPosition, type DropdownPosition } from '../dropdown-position';
import { ICON_CHEVRON, ICON_PLUS } from '../icons';
import { useHints } from '../hooks/useHints';
import type { SelectConfig, SelectOption } from '../store/DialStore';
import { SegmentedControl } from './SegmentedControl';
import { usePresenceResync } from '../hooks/usePresenceResync';

interface SelectControlProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  display?: SelectConfig['display'];
  hideLabel?: boolean;
  hint?: string;
  /** Dropdown only: the first row of the dropdown, which adds an option. See `SelectConfig.add`. */
  add?: { label: string; hint?: string; onClick: () => void };
}

function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeOptions(options: SelectOption[]): Exclude<SelectOption, string>[] {
  return options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: toTitleCase(opt) } : opt
  );
}

export function SelectControl(props: SelectControlProps) {
  useHints(!!props.hint || !!props.add?.hint);
  return props.display === 'segmented' ? <SegmentedSelect {...props} /> : <SelectDropdown {...props} />;
}

function SegmentedSelect({ label, value, options, onChange, hideLabel, hint }: SelectControlProps) {
  return (
    <div className="dialkit-labeled-control" data-hide-label={hideLabel ? 'true' : undefined} data-hint={hint}>
      {!hideLabel && <span className="dialkit-labeled-control-label">{label}</span>}
      <SegmentedControl
        options={normalizeOptions(options)}
        value={value}
        onChange={onChange}
        label={label}
      />
    </div>
  );
}

function SelectDropdown({ label, value, options, onChange, hint, add }: SelectControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const resyncPresence = usePresenceResync();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<DropdownPosition | null>(null);
  const normalized = normalizeOptions(options);
  const selectedOption = normalized.find((o) => o.value === value);

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el || !portalTarget) return;
    // Estimate dropdown height: 8px padding + 36px per option
    const rows = normalized.length + (add ? 1 : 0);
    const dropdownHeight = dropdownRef.current ? dropdownRef.current.scrollHeight + 2 : 10 + rows * 36;
    setPos(getDropdownPosition(el, portalTarget, { dropdownHeight, fixed: true }));
  }, [normalized.length, add, portalTarget]);

  // Resolve portal target (closest .dialkit-root)
  useEffect(() => {
    setPortalTarget(getDialKitPortalRoot(triggerRef.current) ?? document.body);
  }, []);

  // Position dropdown when opening
  useEffect(() => {
    if (!isOpen) return;
    if (!triggerRef.current) return;
    const stopPosition = observeDropdownPosition(triggerRef.current, updatePos, () => dropdownRef.current);
    const stopKeyboard = observeDropdownKeyboard(triggerRef.current, () => dropdownRef.current, () => setIsOpen(false));
    return () => { stopKeyboard(); stopPosition(); };
  }, [isOpen, updatePos]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <div className="dialkit-select-row" data-hint={hint}>
      <button
        ref={triggerRef}
        className="dialkit-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        data-open={String(isOpen)}
        type="button" aria-haspopup="listbox" aria-expanded={isOpen} disabled={!options.length && !add}
        onKeyDown={(e) => openDropdownOnKey(e, () => setIsOpen(true))}
      >
        <span className="dialkit-select-label">{label}</span>
        <div className="dialkit-select-right">
          <span className="dialkit-select-value">{selectedOption?.label ?? value}</span>
          <motion.svg
            className="dialkit-select-chevron"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ type: 'spring', visualDuration: 0.2, bounce: 0.15 }}
          >
            <path d={ICON_CHEVRON} />
          </motion.svg>
        </div>
      </button>

      {portalTarget && createPortal(
        <AnimatePresence onExitComplete={resyncPresence}>
          {isOpen && pos && (
            <motion.div
              ref={dropdownRef}
              className="dialkit-select-dropdown"
              initial={{ opacity: 0, y: pos.above ? 8 : -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: pos.above ? 8 : -8, scale: 0.95 }}
              transition={{ type: 'spring', visualDuration: 0.15, bounce: 0 }}
              style={{
                position: 'fixed',
                left: pos.left,
                top: pos.top,
                width: pos.width,
                maxHeight: pos.maxHeight,
                transformOrigin: pos.above ? 'bottom' : 'top',
              }}
            >
              {add && (
                <button
                  type="button"
                  className="dialkit-select-option dialkit-select-add-option"
                  data-hint={add.hint}
                  onClick={() => {
                    setIsOpen(false);
                    add.onClick();
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {ICON_PLUS.map((d) => <path key={d} d={d} />)}
                  </svg>
                  {add.label}
                </button>
              )}
              {normalized.map((option) => (
                <button
                  key={option.value}
                  className="dialkit-select-option"
                  data-selected={String(option.value === value)}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        portalTarget
      )}
    </div>
  );
}
