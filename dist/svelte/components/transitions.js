import { cubicOut } from 'svelte/easing';
import { springParams, springProgress, springSettleDuration } from '../../transition-math';
/** Fold the content without fading its controls or retaining scroll overflow. */
export function folderTransition(node) {
    const height = node.offsetHeight;
    return {
        duration: 220,
        easing: cubicOut,
        css: (t) => `height:${t * height}px;overflow-y:clip;`,
    };
}
const controlSpring = springParams({ type: 'spring', visualDuration: 0.25, bounce: 0.1 });
/** Slide a control in or out on the other adapters' spring, fading it and closing the row gap below it as it goes. */
export function controlTransition(node) {
    const height = node.offsetHeight;
    const duration = springSettleDuration(controlSpring);
    return {
        duration: duration * 1000,
        easing: (t) => springProgress(t * duration, controlSpring),
        css: (t) => `opacity:${t};height:${Math.max(0, t) * height}px;margin-bottom:calc(var(--dial-row-gap) * ${t - 1});overflow-y:clip;`,
    };
}
export function dropdownTransition(node, params) {
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
