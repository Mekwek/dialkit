// The version gallery's spring, as a CSS linear() easing that the browser runs
// natively (Web Animations), so no animation runs on the main thread.

export type BakedSpring = {
  easing: string;
  /** Seconds. */
  duration: number;
  /** Seconds until progress first reaches `p`. */
  timeAt: (p: number) => number;
};

/** Wrap a pre-baked linear() easing so callers can time events along it. */
export function bakedSpring(easing: string, duration: number): BakedSpring {
  // Parse "linear(v [p%], …)". Stops without a position are spaced evenly
  // between their neighbours, as in CSS.
  const stops = easing.replace(/^linear\(|\)$/g, '').split(',').map((part) => {
    const [value, position] = part.trim().split(/\s+/);
    return { value: parseFloat(value), at: position ? parseFloat(position) / 100 : NaN };
  });
  if (isNaN(stops[0].at)) stops[0].at = 0;
  if (isNaN(stops[stops.length - 1].at)) stops[stops.length - 1].at = 1;
  for (let i = 1; i < stops.length; i++) {
    if (!isNaN(stops[i].at)) continue;
    let j = i;
    while (isNaN(stops[j].at)) j++;
    const step = (stops[j].at - stops[i - 1].at) / (j - i + 1);
    for (let n = i; n < j; n++) stops[n].at = stops[i - 1].at + step * (n - i + 1);
  }
  return {
    easing,
    duration,
    timeAt: (p) => {
      for (let i = 1; i < stops.length; i++) {
        const a = stops[i - 1];
        const b = stops[i];
        if (b.value < p) continue;
        const t = b.value === a.value ? b.at : a.at + ((p - a.value) / (b.value - a.value)) * (b.at - a.at);
        return Math.max(0, t) * duration;
      }
      return duration;
    },
  };
}

/** Used by both the save flight and the grid zoom: quick and soft, ~0.1% overshoot. */
export const GALLERY_SPRING = bakedSpring(
  'linear(0, 0.0043, 0.0162 1.83%, 0.0853 4.56%, 0.5106 15.52%, 0.6846 20.99%, 0.7529 23.73%, 0.8258 27.38%, 0.8684 30.12%, 0.9118, 0.9428 37.42%, 0.9686, 0.9842 46.55%, 0.9944, 0.9992 57.5%, 1.0013 64.8%, 1.0002 99.48%)',
  0.4681,
);
