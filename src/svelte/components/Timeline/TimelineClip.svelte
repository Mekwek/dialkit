<script lang="ts">
  import { DialStore } from 'dialkit/store';
  import {
    TimelineStore,
    clampClipResizeEnd,
    clampClipResizeStart,
    clampStepResize,
    clampTrackDelay,
    dragTimelineClip,
    formatSeconds,
    timelineClipProgress,
  } from 'dialkit/timeline';
  import type {
    TimelineClipDragBounds,
    TimelineClipLoop,
    TimelineClipMeta,
    TimelineStepStatic,
  } from 'dialkit/timeline';

  const DRAG_THRESHOLD_PX = 3;

  type DragState = {
    mode: 'move' | 'start' | 'end' | 'boundary';
    boundaryIndex?: number;
    pointerX: number;
    at: number;
    duration: number;
    bounds: TimelineClipDragBounds;
    stepDurations?: number[];
    clickEl: HTMLElement | null;
    moved: boolean;
  };

  let {
    timelineId,
    clip,
    at,
    duration,
    loop,
    steps,
    fixedDuration,
    composite = false,
    single = false,
    baseAt = 0,
    delayMode = false,
    pxPerSecond,
    viewStart,
    timelineDuration,
    selected,
    selectedStepKey,
    getDragBounds,
    onSelect,
    onClick,
    onDrag,
  } = $props<{
    timelineId: string;
    clip: TimelineClipMeta;
    at: number;
    duration: number;
    loop: TimelineClipLoop;
    steps?: TimelineStepStatic[];
    fixedDuration: boolean;
    composite?: boolean;
    /** Single track: the bar carries its name and fills as the playhead crosses it. */
    single?: boolean;
    baseAt?: number;
    delayMode?: boolean;
    pxPerSecond: number;
    viewStart: number;
    timelineDuration: number;
    selected: boolean;
    selectedStepKey?: string;
    getDragBounds: (clipKey: string) => TimelineClipDragBounds;
    /** Single track: pressing the bar, not an edge, selects it. */
    onSelect?: (clipKey: string) => void;
    onClick: (clip: TimelineClipMeta, rect: DOMRect, stepKey?: string) => void;
    onDrag: () => void;
  }>();

  let drag: DragState | null = null;
  let dragging = $state(false);
  const isSteps = $derived(Boolean(steps?.length));
  const width = $derived(Math.max(duration * pxPerSecond, 14));
  const resizable = $derived(duration > 0 && !fixedDuration && !composite);
  const durationText = $derived(`${fixedDuration && !composite ? '~' : ''}${formatSeconds(duration)}`);
  const looping = $derived(loop === 'repeat' && duration > 0);
  // Single track: the part of the bar the playhead has crossed.
  let time = $state(0);
  $effect(() => {
    if (!single) return;
    const id = timelineId;
    time = TimelineStore.getTransport(id).time;
    return TimelineStore.subscribe(id, () => {
      time = TimelineStore.getTransport(id).time;
    });
  });
  const played = $derived(timelineClipProgress(time, at, duration));
  const ghostCycles = $derived.by(() => {
    const result: Array<{ start: number; duration: number; index: number }> = [];
    if (!looping) return result;
    const first = Math.max(1, Math.floor((viewStart - at) / duration));
    for (let offset = 0; offset < 256; offset++) {
      const index = first + offset;
      const start = at + duration * index;
      if (start >= timelineDuration - 1e-6) break;
      result.push({ start, duration: Math.min(duration, timelineDuration - start), index });
    }
    return result;
  });
  const boundaries = $derived.by(() => {
    let total = 0;
    return steps?.map((step: TimelineStepStatic) => (total += step.duration)) ?? [];
  });
  const barTitle = $derived(composite
    ? `${clip.label} — composite of its property tracks${looping ? ' · repeats through timeline' : ''} · click to expand`
    : `${clip.label} — ${formatSeconds(at)} for ${durationText}${fixedDuration ? ' (duration set by spring physics)' : ''}${looping ? ' · repeats through timeline' : ''}${delayMode ? ' · drag to phase-shift' : ''}`);

  function handlePointerDown(event: PointerEvent) {
    if (event.shiftKey) return;
    event.stopPropagation();
    const target = event.target as HTMLElement;
    let mode: DragState['mode'] = 'move';
    let boundaryIndex: number | undefined;
    if (target.dataset.boundary !== undefined) {
      mode = 'boundary';
      boundaryIndex = Number(target.dataset.boundary);
    } else if (!fixedDuration) {
      const edge = target.dataset.edge as 'start' | 'end' | undefined;
      if (edge) mode = edge;
    }
    if (mode === 'move') onSelect?.(clip.key);
    drag = {
      mode,
      boundaryIndex,
      pointerX: event.clientX,
      at,
      duration,
      bounds: getDragBounds(clip.key),
      stepDurations: steps?.map((step: TimelineStepStatic) => step.duration),
      clickEl: target.closest?.('[data-step]') as HTMLElement | null,
      moved: false,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent) {
    if (!drag || pxPerSecond <= 0) return;
    const dx = event.clientX - drag.pointerX;
    if (!drag.moved) {
      if (Math.abs(dx) <= DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      dragging = true;
      onDrag();
    }
    const dt = dx / pxPerSecond;
    if (drag.mode === 'boundary' && steps && drag.stepDurations) {
      const index = drag.boundaryIndex ?? 0;
      const others = drag.stepDurations.reduce((sum, value, stepIndex) => stepIndex === index ? sum : sum + value, 0);
      DialStore.updateValue(
        timelineId,
        `${clip.key}.${steps[index].key ?? ''}.duration`,
        clampStepResize(drag.stepDurations[index] + dt, drag.at, others, timelineDuration)
      );
    } else if (!delayMode && drag.mode !== 'boundary' && !(drag.mode === 'start' && steps)) {
      // Clip bars. Cmd (Ctrl elsewhere) snaps to other clips and the playhead.
      const next = dragTimelineClip(drag.mode, drag, dt, drag.bounds, event.metaKey || event.ctrlKey);
      DialStore.updateValues(timelineId, {
        ...(drag.mode !== 'end' && { [`${clip.key}.at`]: next.at }),
        ...(drag.mode !== 'move' && { [`${clip.key}.duration`]: next.duration }),
      });
    } else if (drag.mode === 'move' && delayMode) {
      // Track rows: moving the bar shifts the property's phase.
      DialStore.updateValue(timelineId, `${clip.key}.delay`, clampTrackDelay(drag.at + dt - baseAt, baseAt, drag.duration, timelineDuration));
    } else if (drag.mode === 'end') {
      DialStore.updateValue(timelineId, `${clip.key}.duration`, clampClipResizeEnd(drag.duration + dt, drag.at, timelineDuration));
    } else if (steps && drag.stepDurations) {
      const next = clampClipResizeStart(Math.max(drag.at + dt, Math.max(baseAt, 0)), drag.at, drag.stepDurations[0]);
      DialStore.updateValues(timelineId, {
        [delayMode ? `${clip.key}.delay` : `${clip.key}.at`]: delayMode ? Math.max(0, next.at - baseAt) : next.at,
        [`${clip.key}.${steps[0].key ?? ''}.duration`]: next.duration,
      });
    } else {
      const next = clampClipResizeStart(Math.max(drag.at + dt, Math.max(baseAt, 0)), drag.at, drag.duration);
      DialStore.updateValues(timelineId, {
        [delayMode ? `${clip.key}.delay` : `${clip.key}.at`]: delayMode ? Math.max(0, next.at - baseAt) : next.at,
        [`${clip.key}.duration`]: next.duration,
      });
    }
  }

  function finish(event?: PointerEvent) {
    const previous = drag;
    drag = null;
    dragging = false;
    if (previous && !previous.moved && event) {
      const anchor = previous.clickEl ?? event.currentTarget as HTMLElement;
      onClick(clip, anchor.getBoundingClientRect(), previous.clickEl?.dataset.step);
    }
  }
</script>

{#each ghostCycles as cycle (cycle.index)}
  <div
    class="dialkit-timeline-clip-ghost"
    data-steps={isSteps || undefined}
    aria-hidden="true"
    style:left={`${(cycle.start - viewStart) * pxPerSecond + 1}px`}
    style:width={`${Math.max(1, cycle.duration * pxPerSecond - 2)}px`}
    style:background={clip.color}
  >
    {#each steps ?? [] as step, index (step.key ?? index)}
      <span class="dialkit-timeline-clip-ghost-segment" style:width={`${step.duration * pxPerSecond}px`}></span>
    {/each}
  </div>
{/each}

<!-- A single-track bar draws 1px short of its span on each side, so butted bars keep a hairline of lane between them. -->
<div
  class="dialkit-timeline-clip"
  data-steps={isSteps || undefined}
  data-composite={composite || undefined}
  data-selected={selected || undefined}
  data-dragging={dragging || undefined}
  style:left={`${(at - viewStart) * pxPerSecond + (single ? 1 : 0)}px`}
  style:width={`${single ? Math.max(width - 2, 12) : width}px`}
  style:background={single ? undefined : composite ? `${clip.color}80` : clip.color}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={finish}
  onpointercancel={() => finish()}
  onlostpointercapture={() => finish()}
  title={barTitle}
  role="button"
  tabindex="0"
  aria-label={barTitle}
>
  {#if composite}
    {#if width > 56}<span class="dialkit-timeline-clip-duration">{durationText}</span>{/if}
  {:else if isSteps}
    {#each steps ?? [] as step, index (step.key ?? index)}
      <div
        class="dialkit-timeline-clip-segment"
        data-step={step.key ?? undefined}
        data-selected={selectedStepKey === step.key || undefined}
        style:width={`${step.duration * pxPerSecond}px`}
      >
        {#if step.duration * pxPerSecond > 52}
          <span class="dialkit-timeline-clip-duration">{formatSeconds(step.duration)}</span>
        {/if}
      </div>
    {/each}
    {#each steps ?? [] as step, index (step.key ?? index)}
      {#if !step.isPhysics}
        <div class="dialkit-timeline-clip-handle" data-boundary={index} style:left={`${boundaries[index] * pxPerSecond - 4}px`}></div>
      {/if}
    {/each}
    {#if !steps?.[0]?.isPhysics}<div class="dialkit-timeline-clip-handle" data-edge="start"></div>{/if}
  {:else}
    {#if single}<span class="dialkit-timeline-clip-fill" style:width={`${played * 100}%`} aria-hidden="true"></span>{/if}
    {#if resizable}<div class="dialkit-timeline-clip-handle" data-edge="start"></div>{/if}
    {#if single}<span class="dialkit-timeline-clip-name">{clip.label}</span>{/if}
    {#if width > 56}<span class="dialkit-timeline-clip-duration">{durationText}</span>{/if}
    {#if resizable}<div class="dialkit-timeline-clip-handle" data-edge="end"></div>{/if}
  {/if}
</div>

{#if looping}
  <span class="dialkit-timeline-loop-infinity" aria-hidden="true" title="Repeats indefinitely">∞</span>
{/if}
