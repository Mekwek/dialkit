import { handleSegmentKey, labelSegmentedControl } from '../control-keyboard';
import { useRef, useState, useLayoutEffect, useCallback } from 'react';

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  /** SVG path data in a 16 × 16 box. The segment shows the icon instead
   *  of the label, and the label becomes its hover and accessible name. */
  icon?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Full-width track: equal segments on the track's own surface. */
  fill?: boolean;
  /** Accessible name for the group when no row label names it. */
  ariaLabel?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  fill = false,
  ariaLabel,
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
    setPillStyle({
      left: activeButton.offsetLeft,
      width: activeButton.offsetWidth,
    });
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [value, options.length, measure]);

  // Enable transition after first render
  const shouldAnimate = hasAnimated.current;
  hasAnimated.current = true;

  return (
    <div className="dialkit-segmented" ref={containerRef} role="radiogroup" aria-label={ariaLabel} data-fill={fill || undefined} onKeyDown={handleSegmentKey}>
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
        const icon = option.icon;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className="dialkit-segmented-button"
            data-active={String(isActive)}
            type="button" role="radio" aria-checked={isActive} tabIndex={isActive ? 0 : -1}
            aria-label={icon ? option.label : undefined}
            title={icon ? option.label : undefined}
          >
            {icon ? (
              <svg className="dialkit-segmented-icon" viewBox="0 0 16 16" aria-hidden="true">
                <path d={icon} />
              </svg>
            ) : (
              <span className="dialkit-segmented-text">{option.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
