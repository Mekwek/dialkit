import type { DialKitPersistOptions } from '../store/DialStore';
import type { TimelineMeta, TimelineTransport } from '../store/TimelineStore';
import { loopSpan } from '../store/TimelineStore';
import {
  computeClipState,
  type DialTimelineValues,
  type ParsedTimeline,
  type TimelineClipStatic,
  type TimelineConfig,
} from '../timeline-core';

export interface DialTimelineOptions {
  id?: string;
  persist?: DialKitPersistOptions;
  /** Start playing on mount. Defaults to true. */
  autoplay?: boolean;
  /**
   * Loop when the playhead reaches the end. `true` restarts the whole
   * timeline; `{ from }` wraps back to that time instead, so clips before it
   * play once and looping clips keep cycling forever. Defaults to false.
   */
  loop?: boolean | { from: number };
  /**
   * `'single'`: every clip shares ONE lane — no overlap (drags and resizes
   * clamp against neighbors), labels drawn inside the bars, `tail` windows
   * rendered. Simple from/to clips only. Defaults to `'rows'` (one lane per
   * clip, the classic dock).
   */
  track?: 'rows' | 'single';
  /**
   * Single track only: hold the opening bar's start at wherever it begins.
   * That bar cannot be dragged along the lane and loses its start handle,
   * so the timeline can never open with a lead gap. Its end handle still
   * resizes it, and reordering still works — whichever bar ends up first
   * inherits the pin. Defaults to false.
   */
  pinStart?: boolean;
}

export type TimelineActions = {
  play: () => void;
  pause: () => void;
  replay: () => void;
  seek: (time: number) => void;
};

/** One resolution of the public loop option, shared by every adapter. */
export function resolveTimelineLoop(
  loop: DialTimelineOptions['loop']
): { enabled: boolean; start: number } {
  if (typeof loop === 'object' && loop !== null) {
    return {
      enabled: true,
      start: Number.isFinite(loop.from) ? Math.max(0, loop.from) : 0,
    };
  }
  return { enabled: Boolean(loop), start: 0 };
}

export function buildTimelineMeta(
  id: string,
  name: string,
  duration: number,
  parsed: ParsedTimeline,
  loop: DialTimelineOptions['loop'],
  track?: DialTimelineOptions['track'],
  pinStart?: DialTimelineOptions['pinStart']
): TimelineMeta {
  const resolvedLoop = resolveTimelineLoop(loop);
  return {
    id,
    name,
    duration,
    loop: resolvedLoop.enabled,
    loopStart: resolvedLoop.start,
    clips: parsed.clips,
    ...(track === 'single' ? { singleTrack: true } : {}),
    ...(track === 'single' && pinStart ? { pinStart: true } : {}),
  };
}

/**
 * Framework-neutral frame pass. Adapters only own lifecycle and reactivity;
 * the value shape and loop-cycle math stay identical everywhere.
 */
export function buildTimelineValues<T extends TimelineConfig>(
  staticClips: TimelineClipStatic[],
  transport: TimelineTransport,
  timelineDuration: number,
  loopStart: number,
  actions: TimelineActions
): DialTimelineValues<T> {
  const result: Record<string, unknown> = {
    time: transport.time,
    playing: transport.playing,
    duration: timelineDuration,
    ...actions,
  };

  const span = loopSpan(transport.duration, loopStart);
  const cycleTime = (span > 0 ? transport.wraps * span : 0) + transport.time;
  for (const clip of staticClips) {
    const state = computeClipState(clip, transport.time, cycleTime);
    if (clip.group) {
      const bucket = (result[clip.group] ??= {}) as Record<string, unknown>;
      bucket[clip.childKey] = state;
    } else {
      result[clip.key] = state;
    }
  }

  return result as DialTimelineValues<T>;
}
