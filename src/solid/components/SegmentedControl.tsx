import { handleSegmentKey, labelSegmentedControl } from '../../control-keyboard';
import { iconPaths } from '../../icons';
import { createSignal, createEffect, on, onMount, onCleanup, For, Show } from 'solid-js';

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

export function SegmentedControl<T extends string>(props: SegmentedControlProps<T>) {
  let containerRef: HTMLDivElement | undefined;
  const [pillStyle, setPillStyle] = createSignal<{ left: number; width: number } | null>(null);
  // The pill jumps into place on first paint, then animates on value changes.
  const [hasChanged, setHasChanged] = createSignal(false);

  const measure = () => {
    if (!containerRef) return;
    labelSegmentedControl(containerRef);
    const activeButton = containerRef.querySelector('[data-active="true"]') as HTMLElement | null;
    if (!activeButton) return;
    // Fractions of the row stay exact at fractional sizes and under transforms.
    const containerRect = containerRef.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    if (!containerRect.width) return;
    setPillStyle({
      left: (buttonRect.left - containerRect.left) / containerRect.width * 100,
      width: buttonRect.width / containerRect.width * 100,
    });
  };

  createEffect(on(() => [props.value, props.options.length] as const, measure));

  createEffect(on(() => props.value, () => setHasChanged(true), { defer: true }));

  // Keep the pill aligned when the container itself resizes (e.g. panel width).
  onMount(() => {
    if (!containerRef) return;
    labelSegmentedControl(containerRef);
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef);
    onCleanup(() => ro.disconnect());
  });

  const transition = () => (
    hasChanged()
      ? 'left 0.2s cubic-bezier(0.25, 1, 0.5, 1), width 0.2s cubic-bezier(0.25, 1, 0.5, 1)'
      : 'none'
  );

  return (
    <div class="dialkit-segmented" ref={containerRef} role="radiogroup" aria-label={props.label} onKeyDown={handleSegmentKey}>
      <Show when={pillStyle()}>
        {(style) => (
          <div
            class="dialkit-segmented-pill"
            style={{
              left: `${style().left}%`,
              width: `${style().width}%`,
              transition: transition(),
            }}
          />
        )}
      </Show>
      <For each={props.options}>
        {(option) => (
          <button
            onClick={() => props.onChange(option.value)}
            class="dialkit-segmented-button"
            data-active={String(props.value === option.value)}
            type="button" role="radio" aria-checked={props.value === option.value} tabIndex={props.value === option.value ? 0 : -1}
            aria-label={option.icon ? option.label : undefined}
          >
            <Show when={option.icon} fallback={option.label}>
              {(icon) => (
                <svg class="dialkit-segmented-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <For each={iconPaths(icon())}>{(d) => <path d={d} />}</For>
                </svg>
              )}
            </Show>
          </button>
        )}
      </For>
    </div>
  );
}
