import { StrictMode, createElement } from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useDialTimeline } from './hooks/useDialTimeline';
import { DialStore } from './store/DialStore';
import { TimelineStore } from './store/TimelineStore';
import type { TimelineConfig } from './timeline-core';

type TimelineSnapshot = {
  duration: number;
  dismiss: { duration: number };
};

let latest: TimelineSnapshot | null = null;

function TimelineHarness({
  id,
  config,
}: {
  id: string;
  config: TimelineConfig;
}) {
  latest = useDialTimeline('React Timeline Test', config, {
    id,
    autoplay: false,
  }) as unknown as TimelineSnapshot;
  return null;
}

describe('useDialTimeline (React)', () => {
  it('does not recursively update when a loop region is passed inline', () => {
    const id = 'react-timeline-inline-loop';
    const config = {
      intro: { at: 0, duration: 0.1 },
      orbit: { at: 0.1, duration: 1, loop: true },
    } as TimelineConfig;
    let renderer: ReactTestRenderer | undefined;

    function InlineLoopHarness() {
      useDialTimeline('React Inline Loop Test', config, {
        id,
        autoplay: false,
        loop: { from: 0.1 },
      });
      return null;
    }

    try {
      act(() => {
        renderer = create(createElement(InlineLoopHarness));
      });

      assert.equal(TimelineStore.getTimeline(id)?.loop, true);
      assert.equal(TimelineStore.getTimeline(id)?.loopStart, 0.1);
    } finally {
      act(() => renderer?.unmount());
    }
  });

  it('keeps the registered transport when a live edit swaps in a physics spring', () => {
    const id = 'react-timeline-live-duration';
    const config = {
      dismiss: {
        at: 1.8,
        duration: 0.35,
        from: { opacity: 1 },
        to: { opacity: 0 },
        transition: { type: 'easing', duration: 0.35, ease: [0.55, 0, 1, 0.45] },
      },
    } as TimelineConfig;
    let renderer: ReactTestRenderer | undefined;

    try {
      act(() => {
        renderer = create(createElement(TimelineHarness, { id, config }));
      });

      assert.equal(latest!.duration, 2.15);
      assert.equal(TimelineStore.getTransport(id).duration, 2.15);

      act(() => {
        DialStore.updateValue(id, 'dismiss.transition', {
          type: 'spring',
          stiffness: 200,
          damping: 25,
          mass: 1,
        });
      });

      // The spring would settle at 0.42s, but the authored 0.35s wins, so
      // the bar, the timeline and the transport all hold their lengths.
      assert.equal(latest!.dismiss.duration, 0.35);
      assert.equal(latest!.duration, 2.15);
      assert.equal(TimelineStore.getTimeline(id)?.duration, 2.15);
      assert.equal(TimelineStore.getTransport(id).duration, 2.15);
    } finally {
      act(() => renderer?.unmount());
    }
  });

  it('registers once under StrictMode and cleans up both stores on unmount', () => {
    const id = 'react-timeline-strict-lifecycle';
    const config = {
      dismiss: { at: 0, duration: 0.5 },
    } as TimelineConfig;
    let renderer: ReactTestRenderer | undefined;

    act(() => {
      renderer = create(
        createElement(
          StrictMode,
          null,
          createElement(TimelineHarness, { id, config })
        )
      );
    });

    assert.equal(TimelineStore.getTimelines().filter((timeline) => timeline.id === id).length, 1);
    assert.equal(DialStore.getPanel(id)?.kind, 'timeline');

    act(() => renderer?.unmount());

    assert.equal(TimelineStore.getTimeline(id), undefined);
    assert.equal(DialStore.getPanel(id), undefined);
  });
});
