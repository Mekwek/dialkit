import { untrack } from 'svelte';
import { DialStore } from 'dialkit/store';
import {
  TimelineStore,
  buildTimelineMeta,
  buildTimelineValues,
  computeStaticTimeline,
  parseTimelineConfig,
  resolveTimelineLoop,
} from 'dialkit/timeline';
import type {
  DialTimelineOptions,
  DialTimelineValues,
  TimelineConfig,
} from 'dialkit/timeline';

export type CreateDialTimelineOptions = DialTimelineOptions;

let timelineInstance = 0;

export function createDialTimeline<T extends TimelineConfig>(
  name: string,
  config: T,
  options?: CreateDialTimelineOptions
): DialTimelineValues<T> {
  const hasStableId = options?.id !== undefined;
  const panelId = options?.id ?? `${name}-${++timelineInstance}`;
  const parsed = $derived(parseTimelineConfig(config));
  let flatValues = $state(DialStore.getValues(panelId));
  let transport = $state(TimelineStore.getTransport(panelId));
  const staticTimeline = $derived(computeStaticTimeline(parsed, flatValues));
  const actions = {
    play: () => TimelineStore.play(panelId),
    pause: () => TimelineStore.pause(panelId),
    replay: () => TimelineStore.replay(panelId),
    seek: (time: number) => TimelineStore.seek(panelId, time),
  };
  const resolved = $derived(buildTimelineValues<T>(
    staticTimeline.clips,
    transport,
    staticTimeline.duration,
    resolveTimelineLoop(options?.loop).start,
    actions
  ));

  $effect(() => {
    const currentParsed = parsed;
    const persist = options?.persist;
    const loop = options?.loop;
    const track = options?.track;
    const autoplay = options?.autoplay ?? true;
    // Store notifications must not become dependencies of this registration.
    return untrack(() => {
      DialStore.registerPanel(panelId, name, currentParsed.dialConfig, undefined, {
        retainOnUnmount: hasStableId,
        persist,
        kind: 'timeline',
      });
      const initialValues = DialStore.getValues(panelId);
      flatValues = initialValues;
      const initialStatic = computeStaticTimeline(currentParsed, initialValues);
      TimelineStore.register(
        buildTimelineMeta(panelId, name, initialStatic.duration, currentParsed, loop, track),
        { autoplay }
      );
      transport = TimelineStore.getTransport(panelId);

      const unsubscribeValues = DialStore.subscribe(panelId, () => {
        flatValues = DialStore.getValues(panelId);
      });
      const unsubscribeTransport = TimelineStore.subscribe(panelId, () => {
        transport = TimelineStore.getTransport(panelId);
      });

      return () => {
        unsubscribeValues();
        unsubscribeTransport();
        TimelineStore.unregister(panelId);
        DialStore.unregisterPanel(panelId);
      };
    });
  });

  $effect(() => {
    const meta = buildTimelineMeta(panelId, name, staticTimeline.duration, parsed, options?.loop, options?.track);
    untrack(() => TimelineStore.update(meta));
  });

  return reactiveProxy(() => resolved) as DialTimelineValues<T>;
}

function reactiveProxy(read: () => unknown, path: PropertyKey[] = []): unknown {
  const nested = new Map<PropertyKey, unknown>();
  return new Proxy({}, {
    get(_target, key) {
      const value = readPath(read(), [...path, key]);
      if (typeof value !== 'object' || value === null) return value;
      if (!nested.has(key)) nested.set(key, reactiveProxy(read, [...path, key]));
      return nested.get(key);
    },
    ownKeys() {
      const value = readPath(read(), path);
      return typeof value === 'object' && value !== null ? Reflect.ownKeys(value) : [];
    },
    getOwnPropertyDescriptor() {
      return { enumerable: true, configurable: true };
    },
  });
}

function readPath(source: unknown, path: PropertyKey[]): unknown {
  return path.reduce<unknown>((value, key) => {
    if (typeof value !== 'object' || value === null) return undefined;
    return Reflect.get(value, key);
  }, source);
}
