import { observeDropdownKeyboard } from '../dropdown-keyboard';
import { openDropdownOnKey } from '../control-keyboard';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getDialKitPortalRoot, getDropdownPosition, observeDropdownPosition, type DropdownPosition } from '../dropdown-position';
import { ICON_CHEVRON, ICON_PLUS } from '../icons';
import { SegmentedControl } from './SegmentedControl';
import { useHint } from './Hint';

type SelectOption = string | { value: string; label: string; icon?: string };

interface SelectControlProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  hint?: string;
}

interface SelectAdd {
  label: string;
  hint?: string;
  onClick: () => void;
}

/** The + button after a dropdown (SelectConfig.add), as tall as the
 *  dropdown, like flip and rotate after the gradient type. */
function SelectAddButton({ label, hint, onClick }: SelectAdd) {
  const { hintRow } = useHint(hint);
  return (
    <button type="button" className="dialkit-bg-icon-button dialkit-select-add" aria-label={label} onClick={onClick} {...hintRow}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICON_PLUS.map((d) => <path key={d} d={d} />)}
      </svg>
    </button>
  );
}

function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeOptions(options: SelectOption[]): Exclude<SelectOption, string>[] {
  return options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: toTitleCase(opt) } : opt
  );
}

interface SelectPillsProps extends SelectControlProps {
  hideLabel?: boolean;
}

/** A select shown as pills: next to its label like the toggle row, or
 *  filling the row with no label. */
export function SelectPills({ label, value, options, onChange, hideLabel = false, hint }: SelectPillsProps) {
  const { hintRow } = useHint(hint);
  if (hideLabel) {
    return (
      <div className="dialkit-hint-target" {...hintRow}>
        <SegmentedControl options={normalizeOptions(options)} value={value} onChange={onChange} fill ariaLabel={label} />
      </div>
    );
  }
  return (
    <div className="dialkit-labeled-control" {...hintRow}>
      <span className="dialkit-labeled-control-label">{label}</span>
      <SegmentedControl options={normalizeOptions(options)} value={value} onChange={onChange} />
    </div>
  );
}

export function SelectControl({ label, value, options, onChange, hint, add }: SelectControlProps & { add?: SelectAdd }) {
  const { hintRow } = useHint(hint);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<DropdownPosition | null>(null);
  // --dial-select-add-style picks where `add` sits: 1, a + button after the
  // dropdown; 2, the dropdown's first row. Read on each open.
  const [addInMenu, setAddInMenu] = useState(false);
  const normalized = normalizeOptions(options);
  const selectedOption = normalized.find((o) => o.value === value);

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el || !portalTarget) return;
    // Estimate dropdown height: 8px padding + 36px per option
    const rows = normalized.length + (addInMenu ? 1 : 0);
    const dropdownHeight = dropdownRef.current ? dropdownRef.current.scrollHeight + 2 : 10 + rows * 36;
    setPos(getDropdownPosition(el, portalTarget, { dropdownHeight, fixed: true }));
  }, [normalized.length, addInMenu, portalTarget]);

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
    // With a + button the dropdown and the button each carry their own
    // hint, as the gradient type and its buttons do.
    <div className="dialkit-select-row" data-add={add ? '' : undefined} {...(add ? {} : hintRow)}>
      <button
        {...(add ? hintRow : {})}
        ref={triggerRef}
        className="dialkit-select-trigger"
        onClick={() => {
          if (!isOpen && add) setAddInMenu(getComputedStyle(triggerRef.current!).getPropertyValue('--dial-select-add-style').trim() === '2');
          setIsOpen(!isOpen);
        }}
        data-open={String(isOpen)}
        type="button" aria-haspopup="listbox" aria-expanded={isOpen} disabled={!options.length}
        onKeyDown={(e) => openDropdownOnKey(e, () => {
          if (add) setAddInMenu(getComputedStyle(triggerRef.current!).getPropertyValue('--dial-select-add-style').trim() === '2');
          setIsOpen(true);
        })}
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
      {add && <SelectAddButton {...add} />}

      {portalTarget && createPortal(
        <AnimatePresence>
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
              {add && addInMenu && (
                <button
                  type="button"
                  className="dialkit-select-option dialkit-select-add-option"
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
