<script lang="ts">
  import { handleSegmentKey, labelSegmentedControl } from '../../control-keyboard';
  import { iconPaths } from '../../icons';

  export interface SegmentedControlOption<T extends string = string> {
    value: T;
    label: string;
    /** SVG path data in a 24 × 24 box, shown in place of the label. */
    icon?: string | string[];
  }

  let { options, value, onChange, label } = $props<{
    options: SegmentedControlOption[];
    value: string;
    onChange: (value: string) => void;
    /** Accessible name for the group. */
    label?: string;
  }>();

  let containerRef = $state<HTMLDivElement | undefined>(undefined);
  let hasAnimated = false;
  let pillLeft = $state<number | null>(null);
  let pillWidth = $state<number | null>(null);

  function measure() {
    if (!containerRef) return;
    labelSegmentedControl(containerRef);
    const activeButton = containerRef.querySelector('[data-active="true"]') as HTMLElement | null;
    if (!activeButton) return;
    // Fractions of the row stay exact at fractional sizes and under transforms.
    const containerRect = containerRef.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    if (!containerRect.width) return;
    pillLeft = (buttonRect.left - containerRect.left) / containerRect.width * 100;
    pillWidth = buttonRect.width / containerRect.width * 100;
  }

  $effect(() => {
    void value;
    void options.length;
    measure();
  });

  // Keep the pill aligned when the container itself resizes (e.g. panel width).
  $effect(() => {
    if (!containerRef) return;
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef);
    return () => ro.disconnect();
  });

  let shouldAnimate = $derived.by(() => {
    if (!hasAnimated) {
      hasAnimated = true;
      return false;
    }
    return true;
  });
</script>

<div class="dialkit-segmented" bind:this={containerRef} role="radiogroup" aria-label={label} tabindex="-1" onkeydown={handleSegmentKey}>
  {#if pillLeft !== null && pillWidth !== null}
    <div
      class="dialkit-segmented-pill"
      style:left="{pillLeft}%"
      style:width="{pillWidth}%"
      style:transition={shouldAnimate
        ? 'left 0.2s cubic-bezier(0.25, 1, 0.5, 1), width 0.2s cubic-bezier(0.25, 1, 0.5, 1)'
        : 'none'}
    ></div>
  {/if}

  {#each options as option (option.value)}
    <button
      onclick={() => onChange(option.value)}
      class="dialkit-segmented-button"
      data-active={String(value === option.value)}
      type="button" role="radio" aria-checked={value === option.value} tabindex={value === option.value ? 0 : -1}
      title={option.icon ? option.label : undefined}
      aria-label={option.icon ? option.label : undefined}
    >
      {#if option.icon}
        <svg class="dialkit-segmented-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          {#each iconPaths(option.icon) as path}<path d={path} />{/each}
        </svg>
      {:else}
        {option.label}
      {/if}
    </button>
  {/each}
</div>
