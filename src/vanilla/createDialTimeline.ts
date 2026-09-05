import { DialStore } from '../store/DialStore';
import { TimelineStore } from '../store/TimelineStore';
import { buildTimelineMeta, buildTimelineValues, computeStaticTimeline, parseTimelineConfig, resolveTimelineLoop, type DialTimelineOptions, type DialTimelineValues, type TimelineConfig } from '../timeline';
export type CreateDialTimelineOptions = DialTimelineOptions;
export interface DialTimelineController<T extends TimelineConfig> {
  readonly id: string;
  readonly values: DialTimelineValues<T>;
  getValues(): DialTimelineValues<T>;
  subscribe(listener: (values: DialTimelineValues<T>) => void, immediate?: boolean): () => void;
  play(): void;
  pause(): void;
  replay(): void;
  seek(time: number): void;
  updateConfig(config: T): void;
  destroy(): void;
}
let nextId = 0;
export function createDialTimeline<T extends TimelineConfig>(name: string, config: T, options: CreateDialTimelineOptions = {}): DialTimelineController<T> {
  const id = options.id ?? `vanilla-timeline-${name}-${++nextId}`;
  let parsed = parseTimelineConfig(config);
  let destroyed = false;
  const registration = { retainOnUnmount: options.id !== undefined, persist: options.persist, kind: 'timeline' as const };
  DialStore.registerPanel(id, name, parsed.dialConfig, undefined, registration);
  let compiled = computeStaticTimeline(parsed, DialStore.getValues(id));
  const meta = () => buildTimelineMeta(id, name, compiled.duration, parsed, options.loop);
  TimelineStore.register(meta(), { autoplay: options.autoplay ?? true });
  const actions = {
    play() {
      if (!destroyed)
        TimelineStore.play(id);
    },
    pause() {
      if (!destroyed)
        TimelineStore.pause(id);
    },
    replay() {
      if (!destroyed)
        TimelineStore.replay(id);
    },
    seek(time: number) {
      if (!destroyed)
        TimelineStore.seek(id, time);
    },
  };
  const listeners = new Set<(values: DialTimelineValues<T>) => void>();
  const getValues = () => buildTimelineValues<T>(compiled.clips, TimelineStore.getTransport(id), compiled.duration, resolveTimelineLoop(options.loop).start, actions);
  const notify = () => {
    const values = getValues();
    listeners.forEach(listener => listener(values));
  };
  const stopValues = DialStore.subscribe(id, () => {
    compiled = computeStaticTimeline(parsed, DialStore.getValues(id));
    TimelineStore.update(meta());
  });
  const stopTransport = TimelineStore.subscribe(id, notify);
  return {
    id, ...actions,
    get values() {
      return getValues();
    },
    getValues,
    subscribe(listener, immediate = true) {
      if (destroyed)
        return () => {
        };
      listeners.add(listener);
      if (immediate)
        listener(getValues());
      return () => {
        listeners.delete(listener);
      };
    },
    updateConfig(next) {
      if (destroyed)
        return;
      parsed = parseTimelineConfig(next);
      DialStore.updatePanel(id, name, parsed.dialConfig, undefined, registration);
    },
    destroy() {
      if (destroyed)
        return;
      destroyed = true;
      listeners.clear();
      stopValues();
      stopTransport();
      TimelineStore.unregister(id);
      DialStore.unregisterPanel(id);
    },
  };
}
