import { useRef, useState, useSyncExternalStore } from 'react';
import { stepInputKey } from '../control-keyboard';
import type { BezierPoints } from '../easing-geometry';
import { TransitionLibrary } from '../store/TransitionLibrary';
import type { SpringConfig } from '../store/DialStore';
import { springParams, springProgress, springSettleDuration } from '../transition-math';
import { EASING_CURVES, SPRING_PRESETS, curveNameFor, customSpringNameFor, springPresetConfig, springPresetNameFor, type EasingCurve, type SpringMode } from '../transition-presets';
import { SegmentedControl } from './SegmentedControl';
import { HintZone, useHint } from './Hint';

const getCurves = () => TransitionLibrary.getCustomCurves();
const getSprings = () => TransitionLibrary.getCustomSprings();

export function useCustomCurves() {
  return useSyncExternalStore(TransitionLibrary.subscribe, getCurves, getCurves);
}

export function useCustomSprings() {
  return useSyncExternalStore(TransitionLibrary.subscribe, getSprings, getSprings);
}

// ─── The 4 values ────────────────────────────────────────────

const FIELD_NAMES = ['Start X', 'Start Y', 'End X', 'End Y'];

/** Two decimals at most, no trailing zeros, never -0. */
function formatPart(value: number): string {
  return String(Number(value.toFixed(2)) || 0);
}

/** Pixels the pointer moves before a press becomes a drag. */
const DRAG_THRESHOLD = 3;

/**
 * The 4 bezier values as 4 fields in a row. X is 0 to 1, Y is -1 to 2.
 * Drag a field left or right to change its value by 0.01 a pixel (Shift
 * moves ten times as far), or click it to type. Enter or leaving a field
 * saves it, Escape cancels, the arrow keys step by 0.01 (Shift by 0.1).
 */
export function EaseFields({ ease, onChange }: { ease: BezierPoints; onChange: (ease: BezierPoints) => void }) {
  return (
    <div className="dialkit-ease-fields">
      {ease.map((value, index) => (
        <EaseField
          key={FIELD_NAMES[index]}
          name={FIELD_NAMES[index]}
          value={value}
          min={index % 2 === 0 ? 0 : -1}
          max={index % 2 === 0 ? 1 : 2}
          onChange={(next) => {
            const updated = [...ease] as BezierPoints;
            updated[index] = next;
            onChange(updated);
          }}
        />
      ))}
    </div>
  );
}

function EaseField({ name, value, min, max, onChange }: { name: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const press = useRef<{ id: number; x: number; start: number; moved: boolean } | null>(null);
  const commit = (text: string) => {
    const parsed = Number(text.trim().replace(',', '.'));
    if (text.trim() !== '' && Number.isFinite(parsed)) onChange(Number(Math.max(min, Math.min(max, parsed)).toFixed(3)));
    setDraft(null);
  };
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      aria-label={name}
      className="dialkit-ease-field"
      value={draft ?? formatPart(value)}
      // A press on a field that is not open for typing waits: moved, it
      // drags the value; released in place, it opens the field.
      onPointerDown={(event) => {
        if (event.button !== 0 || document.activeElement === event.currentTarget) return;
        event.preventDefault();
        press.current = { id: event.pointerId, x: event.clientX, start: value, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const p = press.current;
        if (!p || event.pointerId !== p.id) return;
        const dx = event.clientX - p.x;
        if (!p.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
        p.moved = true;
        const next = p.start + dx * 0.01 * (event.shiftKey ? 10 : 1);
        onChange(Number(Math.max(min, Math.min(max, next)).toFixed(2)));
      }}
      onPointerUp={(event) => {
        const p = press.current;
        if (!p || event.pointerId !== p.id) return;
        press.current = null;
        if (!p.moved) event.currentTarget.focus();
      }}
      onPointerCancel={() => {
        press.current = null;
      }}
      onFocus={(event) => {
        setDraft(formatPart(value));
        event.currentTarget.select();
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft !== null) commit(draft);
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        const stepped = stepInputKey(event, draft ?? String(value), value, min, max, 0.01);
        if (stepped !== undefined) {
          const next = Number(stepped.toFixed(3));
          onChange(next);
          setDraft(formatPart(next));
          return;
        }
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          setDraft(null);
          event.currentTarget.blur();
        }
      }}
    />
  );
}

// ─── Pictures ────────────────────────────────────────────────

const THUMB_W = 24;
const THUMB_H = 16;

/** A small picture of a curve. Overshoot stays inside the box. */
function CurveThumb({ ease }: { ease: BezierPoints }) {
  const [x1, y1, x2, y2] = ease;
  const low = Math.min(0, y1, y2);
  const high = Math.max(1, y1, y2);
  const pad = 1.5;
  const px = (x: number) => pad + x * (THUMB_W - pad * 2);
  const py = (y: number) => THUMB_H - pad - ((y - low) / (high - low)) * (THUMB_H - pad * 2);
  return (
    <svg className="dialkit-preset-thumb" viewBox={`0 0 ${THUMB_W} ${THUMB_H}`} aria-hidden="true">
      <path d={`M ${px(0)} ${py(0)} C ${px(x1)} ${py(y1)}, ${px(x2)} ${py(y2)}, ${px(1)} ${py(1)}`} />
    </svg>
  );
}

/** A small picture of a spring's motion from 0 to its settle time. */
function SpringThumb({ spring }: { spring: SpringConfig }) {
  const params = springParams(spring);
  const end = springSettleDuration(params);
  const samples = Array.from({ length: 25 }, (_, i) => springProgress((i / 24) * end, params));
  const high = Math.max(1, ...samples);
  const pad = 1.5;
  const points = samples.map((y, i) => `${pad + (i / 24) * (THUMB_W - pad * 2)} ${THUMB_H - pad - (y / high) * (THUMB_H - pad * 2)}`);
  return (
    <svg className="dialkit-preset-thumb" viewBox={`0 0 ${THUMB_W} ${THUMB_H}`} aria-hidden="true">
      <path d={`M ${points.join(' L ')}`} />
    </svg>
  );
}

// ─── Lists ───────────────────────────────────────────────────

interface PresetItem {
  name: string;
  picture: React.ReactNode;
  pick: () => void;
  remove?: () => void;
  /** How the preset moves. A saved one has none: its shape is the user's. */
  hint?: string;
}

function PresetList({ items, active, label, noun }: { items: PresetItem[]; active: string | undefined; label: string; noun: string }) {
  return (
    <div className="dialkit-presets" role="listbox" aria-label={label}>
      {items.map((item) => (
        <div key={item.name} className="dialkit-preset" data-active={item.name === active || undefined}>
          <PresetPick item={item} active={item.name === active} noun={noun} />
          {item.remove && (
            <button type="button" className="dialkit-preset-remove" aria-label={`Delete ${item.name}`} title="Delete" onClick={item.remove}>
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3 3l6 6M9 3l-6 6" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** One preset's button. Its hint says how the preset moves, or, for a
 *  saved one, what a click does. */
function PresetPick({ item, active, noun }: { item: PresetItem; active: boolean; noun: string }) {
  const { hintRow } = useHint(item.hint ?? `Uses this ${noun}.`);
  return (
    <button type="button" role="option" aria-selected={active} className="dialkit-preset-pick" onClick={item.pick} {...hintRow}>
      <span className="dialkit-preset-name">{item.name}</span>
      {item.picture}
    </button>
  );
}

interface TabbedPickerProps {
  /** "curve" or "spring": names the lists and the save button. */
  noun: string;
  defaults: PresetItem[];
  custom: PresetItem[];
  defaultName: string | undefined;
  customName: string | undefined;
  onSave: () => void;
}

/** Defaults / Custom tabs over a list of named presets and the user's
 *  saved ones, with a button that saves the current value. */
function TabbedPicker({ noun, defaults, custom, defaultName, customName, onSave }: TabbedPickerProps) {
  const [tab, setTab] = useState<'defaults' | 'custom'>(() => (!defaultName && customName ? 'custom' : 'defaults'));
  return (
    <div className="dialkit-curve-picker">
      <HintZone hint={`Defaults: the ready-made ${noun}s. Custom: the ${noun}s you saved.`}>
        <SegmentedControl
          fill
          ariaLabel={`${noun[0].toUpperCase()}${noun.slice(1)} presets`}
          options={[
            { value: 'defaults' as const, label: 'Defaults' },
            { value: 'custom' as const, label: 'Custom' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </HintZone>
      {tab === 'defaults' ? (
        <PresetList label={`Default ${noun}s`} items={defaults} active={defaultName} noun={noun} />
      ) : (
        <>
          {custom.length > 0 ? (
            <PresetList label={`Custom ${noun}s`} items={custom} active={customName} noun={noun} />
          ) : (
            <p className="dialkit-preset-empty">No custom {noun}s yet. Shape a {noun}, then save it.</p>
          )}
          <button type="button" className="dialkit-preset-save" disabled={!!customName} onClick={onSave}>
            {customName ? `Saved as ${customName}` : `Save current ${noun}`}
          </button>
        </>
      )}
    </div>
  );
}

/** The Defaults / Custom curve picker of an easing transition. */
export function CurvePicker({ ease, onPick }: { ease: BezierPoints; onPick: (ease: BezierPoints) => void }) {
  const custom = useCustomCurves();
  const toItem = (curve: EasingCurve, removable: boolean): PresetItem => ({
    name: curve.name,
    picture: <CurveThumb ease={curve.ease} />,
    pick: () => onPick(curve.ease),
    remove: removable ? () => TransitionLibrary.removeCustomCurve(curve.name) : undefined,
    hint: removable ? undefined : curve.hint,
  });
  return (
    <TabbedPicker
      noun="curve"
      defaults={EASING_CURVES.map((curve) => toItem(curve, false))}
      custom={custom.map((curve) => toItem(curve, true))}
      defaultName={curveNameFor(ease, EASING_CURVES)}
      customName={curveNameFor(ease, custom)}
      onSave={() => TransitionLibrary.saveCustomCurve(ease)}
    />
  );
}

/** The Defaults / Custom presets of a Time or Physics spring. Each mode has
 *  its own saved springs. */
export function SpringPresetPicker({ spring, mode, onPick }: { spring: SpringConfig; mode: SpringMode; onPick: (spring: SpringConfig) => void }) {
  const saved = useCustomSprings().filter((item) => item.mode === mode);
  return (
    <TabbedPicker
      key={mode}
      noun="spring"
      defaults={SPRING_PRESETS.map((preset) => {
        const config = springPresetConfig(preset, mode);
        return { name: preset.name, picture: <SpringThumb spring={config} />, pick: () => onPick(config), hint: preset.hint };
      })}
      custom={saved.map((item) => ({
        name: item.name,
        picture: <SpringThumb spring={item.spring} />,
        pick: () => onPick({ ...item.spring }),
        remove: () => TransitionLibrary.removeCustomSpring(item.name, mode),
      }))}
      defaultName={springPresetNameFor(spring, mode)}
      customName={customSpringNameFor(spring, mode, saved)}
      onSave={() => TransitionLibrary.saveCustomSpring(spring, mode)}
    />
  );
}
