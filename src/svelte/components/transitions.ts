import type { TransitionConfig } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';

/** Fold the content without fading its controls or retaining scroll overflow. */
export function folderTransition(node: HTMLElement): TransitionConfig {
  const height = node.offsetHeight;
  return {
    duration: 220,
    easing: cubicOut,
    css: (t) => `height:${t * height}px;overflow-y:clip;`,
  };
}

/** Slide a control in or out, closing the row gap below it as it goes. */
export function controlTransition(node: HTMLElement): TransitionConfig {
  const height = node.offsetHeight;
  return {
    duration: 220,
    easing: cubicOut,
    css: (t) => `height:${t * height}px;margin-bottom:calc(var(--dial-row-gap) * ${t - 1});overflow-y:clip;`,
  };
}

export function dropdownTransition(node: Element, params?: { above?: boolean; duration?: number }): TransitionConfig {
  const above = params?.above ?? false;
  const duration = params?.duration ?? 150;
  const offset = above ? 8 : -8;

  return {
    duration,
    css: (t) => {
      const eased = t;
      const y = (1 - eased) * offset;
      const scale = 0.95 + 0.05 * eased;
      return `opacity:${eased};transform:translateY(${y}px) scale(${scale});`;
    },
  };
}
