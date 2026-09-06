import { springParams, springProgress, springSettleDuration } from '../transition-math';
/** Native animations use the same spring math as the curve preview and timeline. */
export function animateSpring(node: HTMLElement, frame: (progress: number) => Keyframe, visualDuration = 0.35, bounce = 0.1): Animation | undefined {
  if (typeof node.animate !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return;
  const params = springParams({ type: 'spring', visualDuration, bounce });
  const duration = springSettleDuration(params);
  const count = Math.max(2, Math.ceil(duration * 60));
  const frames = Array.from({ length: count + 1 }, (_, index) => frame(index === count ? 1 : springProgress(index / count * duration, params)));
  return node.animate(frames, { duration: duration * 1000, easing: 'linear' });
}
