import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { HexAlphaColorPicker } from 'react-colorful';
import { getDialKitPortalRoot, getDropdownPosition } from '../dropdown-position';

interface ColorControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
// Panel = picker (200) + strips + footer row. Used to decide above/below.
const PICKER_PANEL_HEIGHT = 250;

/** Any accepted hex form → the 8-digit form the picker needs. A value with
 *  no alpha is fully opaque. */
function toEightDigitHex(hex: string): string {
  if (!HEX_COLOR_REGEX.test(hex)) return '#000000ff';
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}ff`;
  }
  if (hex.length === 7) return `${hex}ff`;
  return hex;
}

/** Drop a fully-opaque alpha on the way out, so a value the user never made
 *  transparent stays byte-identical to what every existing project stored. */
function normalizeOut(hex: string): string {
  const eight = toEightDigitHex(hex);
  return eight.slice(7).toLowerCase() === 'ff' ? eight.slice(0, 7) : eight;
}

/** Alpha as a percentage, for the readout next to the hex field. */
function alphaPercent(hex: string): number {
  return Math.round((parseInt(toEightDigitHex(hex).slice(7), 16) / 255) * 100);
}

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

export function ColorControl({ label, value, onChange }: ColorControlProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const swatchRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);
  // Null while not being typed in — the field then shows the live value.
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const [alphaDraft, setAlphaDraft] = useState<string | null>(null);

  // The row shows the six-digit colour only; the alpha lives in the panel.
  const colourOnly = toEightDigitHex(value).slice(0, 7);

  // Sync editValue when value changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(colourOnly);
    }
  }, [colourOnly, isEditing]);

  // Resolve portal target (closest .dialkit-root, so the panel inherits the
  // active theme's tokens without re-declaring them).
  useEffect(() => {
    setPortalTarget(getDialKitPortalRoot(swatchRef.current) ?? document.body);
  }, []);

  const updatePos = useCallback(() => {
    const el = swatchRef.current;
    if (!el || !portalTarget) return;
    const placed = getDropdownPosition(el, portalTarget, {
      dropdownHeight: PICKER_PANEL_HEIGHT,
    });
    // Right-align the panel to the swatch — the swatch sits at the row's end,
    // so a left-aligned panel would hang off the panel's edge.
    setPos({ top: placed.top, left: placed.left + placed.width - 216, above: placed.above });
  }, [portalTarget]);

  useEffect(() => {
    if (!isOpen) return;
    updatePos();
  }, [isOpen, updatePos]);

  // Close on click outside / Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        swatchRef.current && !swatchRef.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  /** The panel's hex field edits the COLOUR only — the alpha already set
   *  stays, so typing a colour never silently resets transparency. */
  function commitHexDraft() {
    const draft = hexDraft;
    setHexDraft(null);
    if (draft === null) return;
    const typed = draft.trim().startsWith('#') ? draft.trim() : `#${draft.trim()}`;
    if (!HEX_COLOR_REGEX.test(typed)) return;
    const colour = toEightDigitHex(typed).slice(0, 7);
    onChange(normalizeOut(colour + toEightDigitHex(value).slice(7)));
  }

  function commitAlphaDraft() {
    const draft = alphaDraft;
    setAlphaDraft(null);
    if (draft === null) return;
    const percent = Number.parseFloat(draft.replace('%', '').trim());
    if (!Number.isFinite(percent)) return;
    const clamped = Math.min(100, Math.max(0, percent));
    const byte = Math.round((clamped / 100) * 255)
      .toString(16)
      .padStart(2, '0');
    onChange(normalizeOut(toEightDigitHex(value).slice(0, 7) + byte));
  }

  function handleTextSubmit() {
    setIsEditing(false);
    if (HEX_COLOR_REGEX.test(editValue)) {
      // Typing a colour never resets the transparency already set.
      onChange(
        normalizeOut(
          toEightDigitHex(editValue).slice(0, 7) + toEightDigitHex(value).slice(7)
        )
      );
    } else {
      setEditValue(colourOnly);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(colourOnly);
    }
  }

  // Chromium-only; the button is hidden everywhere else.
  const EyeDropperApi = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
  const pickFromScreen = async () => {
    if (!EyeDropperApi) return;
    try {
      const picked = await new EyeDropperApi().open();
      // The eyedropper reads opaque pixels — keep the alpha already set.
      onChange(normalizeOut(picked.sRGBHex + toEightDigitHex(value).slice(7)));
    } catch {
      // The user dismissed the eyedropper — nothing to do.
    }
  };

  return (
    <div className="dialkit-color-control">
      <span className="dialkit-color-label">{label}</span>
      <div className="dialkit-color-inputs">
        {isEditing ? (
          <input
            type="text"
            className="dialkit-color-hex-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleTextSubmit}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <span
            className="dialkit-color-hex"
            onClick={() => setIsEditing(true)}
          >
            {colourOnly.toUpperCase()}
          </span>
        )}
        <button
          ref={swatchRef}
          className="dialkit-color-swatch"
          onClick={() => setIsOpen((open) => !open)}
          data-open={String(isOpen)}
          title="Pick color"
        >
          <span
            className="dialkit-color-swatch-fill"
            style={{ backgroundColor: toEightDigitHex(value) }}
          />
        </button>
      </div>

      {portalTarget && createPortal(
        <AnimatePresence>
          {isOpen && pos && (
            <motion.div
              ref={panelRef}
              className="dialkit-color-panel"
              initial={{ opacity: 0, y: pos.above ? 8 : -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                y: pos.above ? 8 : -8,
                scale: 0.95,
                transition: { duration: 0.1, ease: [0.23, 1, 0.32, 1] },
              }}
              // Closing is the system responding, so it runs faster than
              // opening. A duration with a strong ease-out curve, not a
              // spring — a spring keeps settling past its stated time.
              transition={{
                duration: 0.15,
                ease: [0.23, 1, 0.32, 1],
              }}
              style={{
                position: 'absolute',
                left: pos.left,
                top: pos.top,
                // The panel is right-aligned to the swatch, so it grows out
                // of the swatch's own corner rather than the panel's edge.
                transformOrigin: pos.above ? 'bottom right' : 'top right',
              }}
            >
              <HexAlphaColorPicker
                color={toEightDigitHex(value)}
                onChange={(next) => onChange(normalizeOut(next))}
              />
              <div className="dialkit-color-panel-footer">
                {EyeDropperApi && (
                  <button
                    className="dialkit-color-eyedropper"
                    onClick={pickFromScreen}
                    title="Pick a color from the screen"
                    aria-label="Pick a color from the screen"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m2 22 1-1h3l9-9" />
                      <path d="M3 21v-3l9-9" />
                      <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
                    </svg>
                  </button>
                )}
                <input
                  type="text"
                  className="dialkit-color-panel-hex"
                  value={hexDraft ?? toEightDigitHex(value).slice(0, 7).toUpperCase()}
                  onChange={(e) => setHexDraft(e.target.value)}
                  onBlur={commitHexDraft}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    else if (e.key === 'Escape') setHexDraft(null);
                  }}
                  spellCheck={false}
                  aria-label="Hex value"
                />
                <div className="dialkit-color-panel-alpha">
                  <input
                    type="text"
                    className="dialkit-color-panel-alpha-input"
                    value={alphaDraft ?? String(alphaPercent(value))}
                    onChange={(e) => setAlphaDraft(e.target.value)}
                    onBlur={commitAlphaDraft}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      else if (e.key === 'Escape') setAlphaDraft(null);
                    }}
                    spellCheck={false}
                    aria-label="Alpha percentage"
                  />
                  <span className="dialkit-color-panel-alpha-unit">%</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        portalTarget
      )}
    </div>
  );
}
