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
  const [pillStyle, setPillStyle] = useState<{ left: string; width: string } | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    labelSegmentedControl(container);
    const activeButton = container.querySelector('[data-active="true"]') as HTMLElement | null;
    if (!activeButton) return;
    // Fractions of the row stay exact at fractional sizes and under transforms.
    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    if (!containerRect.width) return;
    setPillStyle({
      left: `${(buttonRect.left - containerRect.left) / containerRect.width * 100}%`,
      width: `${buttonRect.width / containerRect.width * 100}%`,
    });
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [value, options.length, measure]);

  // Keep the pill aligned when the container itself resizes (e.g. panel width).
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
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
