import { DialStore } from '../store/DialStore';
import { applySliderDelta, DRAG_SENSITIVITY, getActiveModifier, getEffectiveStep, isInputFocused } from '../shortcut-utils';
export type ActiveShortcut = {
  panelId: string;
  path: string;
} | null;
let users = 0;
let stop: (() => void) | undefined;
let active: ActiveShortcut = null;
const listeners = new Set<(target: ActiveShortcut) => void>();
export function subscribeShortcut(listener: (target: ActiveShortcut) => void) {
  listeners.add(listener);
  listener(active);
  return () => {
    listeners.delete(listener);
  };
}
function setActive(target: ActiveShortcut) {
  active = target;
  listeners.forEach(listener => listener(target));
}
/** Roots share one listener, so mounting two editing surfaces never doubles a shortcut. */
export function mountShortcutListener() {
  if (users++ === 0)
    stop = listen();
  let destroyed = false;
  return {
    destroy() {
      if (destroyed)
        return;
      destroyed = true;
      if (--users === 0) {
        stop?.();
        stop = undefined;
      }
    }
  };
}
function listen() {
  const keys = new Set<string>();
  let modifier: 'alt' | 'shift' | 'meta' | undefined;
  let dragging = false, lastX: number | undefined, accumulator = 0;
  const targetFor = (...interactions: string[]) => {
    for (const key of keys) {
      const target = DialStore.resolveShortcutTarget(key, modifier);
      if (target?.control.type === 'slider' && interactions.includes(target.control.shortcut?.interaction ?? 'scroll'))
        return target;
    }
    return null;
  };
  const resetMouse = () => {
    dragging = false;
    lastX = undefined;
    accumulator = 0;
  };
  const keydown = (event: KeyboardEvent) => {
    if (isInputFocused())
      return;
    modifier = getActiveModifier(event);
    if (event.key.startsWith('Arrow') && keys.size) {
      const target = targetFor('scroll', 'drag', 'move');
      if (target) {
        event.preventDefault();
        applySliderDelta(target.panelId, target.path, target.control, getEffectiveStep(target.control, target.control.shortcut!), ['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1);
        return;
      }
    }
    const key = event.key.toLowerCase(), held = keys.has(key);
    keys.add(key);
    const target = DialStore.resolveShortcutTarget(key, modifier);
    if (target) {
      setActive(target);
      if (!held && target.control.type === 'toggle')
        DialStore.updateValue(target.panelId, target.path, !DialStore.getValue(target.panelId, target.path));
    }
    if (!held) {
      lastX = undefined;
      accumulator = 0;
    }
  };
  const keyup = (event: KeyboardEvent) => {
    keys.delete(event.key.toLowerCase());
    modifier = getActiveModifier(event);
    resetMouse();
    setActive([...keys].map(key => DialStore.resolveShortcutTarget(key, modifier)).find(Boolean) ?? null);
  };
  const wheel = (event: WheelEvent) => {
    if (isInputFocused())
      return;
    modifier = getActiveModifier(event);
    const target = targetFor('scroll') ?? DialStore.resolveScrollOnlyTargets().find(t => t.control.type === 'slider');
    if (!target)
      return;
    event.preventDefault();
    applySliderDelta(target.panelId, target.path, target.control, getEffectiveStep(target.control, target.control.shortcut!), event.deltaY > 0 ? -1 : 1);
  };
  const mousedown = (event: MouseEvent) => {
    if (event.button !== 0 || isInputFocused())
      return;
    modifier = getActiveModifier(event);
    if (targetFor('drag')) {
      dragging = true;
      lastX = event.clientX;
      accumulator = 0;
      event.preventDefault();
    }
  };
  const mousemove = (event: MouseEvent) => {
    if (isInputFocused())
      return;
    modifier = getActiveModifier(event);
    const target = targetFor(dragging ? 'drag' : 'move');
    if (!target)
      return;
    if (lastX === undefined) {
      lastX = event.clientX;
      return;
    }
    accumulator += event.clientX - lastX;
    lastX = event.clientX;
    const steps = Math.trunc(accumulator / DRAG_SENSITIVITY);
    if (steps) {
      accumulator -= steps * DRAG_SENSITIVITY;
      applySliderDelta(target.panelId, target.path, target.control, getEffectiveStep(target.control, target.control.shortcut!), steps);
    }
  };
  const blur = () => {
    keys.clear();
    resetMouse();
    setActive(null);
  };
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('wheel', wheel, { passive: false });
  window.addEventListener('mousedown', mousedown);
  window.addEventListener('mousemove', mousemove);
  window.addEventListener('mouseup', resetMouse);
  window.addEventListener('blur', blur);
  return () => {
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    window.removeEventListener('wheel', wheel);
    window.removeEventListener('mousedown', mousedown);
    window.removeEventListener('mousemove', mousemove);
    window.removeEventListener('mouseup', resetMouse);
    window.removeEventListener('blur', blur);
    blur();
  };
}
