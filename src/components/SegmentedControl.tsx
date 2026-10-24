import { handleSegmentKey, labelSegmentedControl } from '../control-keyboard';
import { iconPaths } from '../icons';
import { useRef, useState, useLayoutEffect, useCallback } from 'react';

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  /** SVG path data in a 24 × 24 box, shown in place of the label. */
  icon?: string | string[];
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  label?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number } | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    labelSegmentedControl(container);
    const activeButton = container.querySelector('[data-active="true"]') as HTMLElement | null;
    if (!activeButton) return;
    // Fractional bounds keep the pill exact when segments share the row's width.
    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    setPillStyle({
      left: buttonRect.left - containerRect.left,
      width: buttonRect.width,
    });
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [value, options.length, measure]);

  // Keep the pill aligned when the container itself resizes (e.g. panel width).
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [measure]);

  // Enable transition after first render
  const shouldAnimate = hasAnimated.current;
  hasAnimated.current = true;

  return (
    <div className="dialkit-segmented" ref={containerRef} role="radiogroup" aria-label={label} onKeyDown={handleSegmentKey}>
      {pillStyle && (
        <div
          className="dialkit-segmented-pill"
          style={{
            left: pillStyle.left,
            width: pillStyle.width,
            transition: shouldAnimate
              ? 'left 0.2s cubic-bezier(0.25, 1, 0.5, 1), width 0.2s cubic-bezier(0.25, 1, 0.5, 1)'
              : 'none',
          }}
        />
      )}

      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className="dialkit-segmented-button"
            data-active={String(isActive)}
            type="button" role="radio" aria-checked={isActive} tabIndex={isActive ? 0 : -1}
            title={option.icon ? option.label : undefined}
            aria-label={option.icon ? option.label : undefined}
          >
            {option.icon ? (
              <svg className="dialkit-segmented-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {iconPaths(option.icon).map((d, i) => <path key={i} d={d} />)}
              </svg>
            ) : option.label}
          </button>
        );
      })}
    </div>
  );
}
