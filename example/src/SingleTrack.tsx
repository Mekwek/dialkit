import { DialTimeline, useDialTimeline, type TimelineConfig } from 'dialkit';

/**
 * Single-track timeline demo
 *
 * `track: 'single'` puts every clip on ONE lane (no overlap, labels inside
 * the bars). `pinStart` holds the first bar at its start. `onExport` adds an
 * Export button to the dock's actions row.
 */
const sequence = {
  fadeIn: {
    at: 0,
    duration: 0.4,
    label: 'Fade in',
    from: { opacity: 0 },
    to: { opacity: 1 },
    transition: { type: 'easing', duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
  slide: {
    at: 0.4,
    duration: 0.6,
    tail: 0.2,
    from: { x: -40 },
    to: { x: 0 },
    transition: { type: 'spring', visualDuration: 0.6, bounce: 0.2 },
  },
  settle: {
    at: 1.2,
    duration: 0.5,
    from: { scale: 1.05 },
    to: { scale: 1 },
    transition: { type: 'easing', duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
} satisfies TimelineConfig;

export function SingleTrack() {
  const timeline = useDialTimeline('Single Track', sequence, {
    id: 'single-track-demo',
    track: 'single',
    pinStart: true,
    loop: true,
    autoplay: false,
  });

  return (
    <>
      <div
        data-testid="single-track-demo"
        data-time={timeline.time.toFixed(3)}
        data-playing={String(timeline.playing)}
        style={{
          position: 'fixed',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          background: '#f4f4f4',
          color: '#111',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: 24,
            background: '#2d6cdf',
            opacity: timeline.fadeIn.current.opacity,
            transform: `translateX(${timeline.slide.current.x}px) scale(${timeline.settle.current.scale})`,
          }}
        />
      </div>
      <DialTimeline theme="light" onExport={() => console.log('[example] export')} />
    </>
  );
}
