import { DialStore } from './store/DialStore';
import type { CopiedTransition, TransitionConfig, TransitionMode } from './store/DialStore';
import { handleSegmentKey } from './control-keyboard';
import { ICON_CHECK, ICON_CLOSE, ICON_COPY, ICON_MORE, ICON_PASTE } from './icons';
import { springParams, springProgress, springRestDuration, springSettleDuration } from './transition-math';
import { applyTransitionPreset, defaultTransitionPresets, sameTransition, type TransitionPresetOption } from './transition-presets';

export interface TransitionPresetsProps {
  mode: TransitionMode;
  value: TransitionConfig;
  onChange: (value: TransitionConfig) => void;
}

export interface TransitionCopyProps {
  mode: TransitionMode;
  value: TransitionConfig;
  /** Applies a pasted transition and its mode. */
  onPaste: (copied: CopiedTransition) => void;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  if (el instanceof HTMLButtonElement) el.type = 'button';
  return el;
}

function svgIcon(paths: readonly string[], className: string, strokeWidth = 2) {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('class', className);
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', String(strokeWidth));
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('aria-hidden', 'true');
  for (const d of paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    icon.append(path);
  }
  return icon;
}

const THUMB_WIDTH = 24;
const THUMB_HEIGHT = 16;

/** A small picture of a curve or a spring; overshoot stays inside the box. */
function thumbnail(value: TransitionConfig) {
  const pad = 1.5;
  let points: [number, number][];
  if (value.type === 'easing') {
    const [x1, y1, x2, y2] = value.ease;
    points = [[0, 0], [x1, y1], [x2, y2], [1, 1]];
  } else {
    const params = springParams(value);
    const end = springSettleDuration(params);
    points = Array.from({ length: 25 }, (_, i) => [i / 24, springProgress(i / 24 * end, params)]);
  }
  const low = Math.min(0, ...points.map(([, y]) => y));
  const high = Math.max(1, ...points.map(([, y]) => y));
  const coords = points.map(([x, y]) =>
    `${pad + x * (THUMB_WIDTH - pad * 2)} ${THUMB_HEIGHT - pad - (y - low) / (high - low) * (THUMB_HEIGHT - pad * 2)}`);
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('class', 'dialkit-transition-preset-thumb');
  icon.setAttribute('viewBox', `0 0 ${THUMB_WIDTH} ${THUMB_HEIGHT}`);
  icon.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', value.type === 'easing' ? `M ${coords[0]} C ${coords.slice(1).join(', ')}` : `M ${coords.join(' L ')}`);
  icon.append(path);
  return icon;
}

/**
 * Defaults / Custom tabs over named curves (Easing) or springs (Time and
 * Physics). Custom lists the transitions saved with DialStore for the mode.
 */
export function mountTransitionPresets(host: HTMLElement, initial: TransitionPresetsProps) {
  let props = initial;
  const saved = () => DialStore.getTransitionPresets().filter(preset => preset.mode === props.mode);
  let tab: 'defaults' | 'custom' = saved().some(preset => sameTransition(preset.value, props.value, props.mode))
    && !defaultTransitionPresets(props.mode).some(preset => sameTransition(preset.value, props.value, props.mode)) ? 'custom' : 'defaults';
  let signature = '';
  let items: { root: HTMLElement; pick: HTMLButtonElement; option: TransitionPresetOption }[] = [];

  const root = element('div', 'dialkit-transition-presets');
  const tabs = element('div', 'dialkit-segmented dialkit-transition-preset-tabs');
  tabs.setAttribute('role', 'radiogroup');
  tabs.setAttribute('aria-label', 'Preset source');
  tabs.addEventListener('keydown', handleSegmentKey);
  const pill = element('div', 'dialkit-segmented-pill');
  pill.setAttribute('aria-hidden', 'true');
  tabs.append(pill);
  const tabButtons = (['defaults', 'custom'] as const).map(value => {
    const button = element('button', 'dialkit-segmented-button dialkit-transition-preset-tab', value === 'defaults' ? 'Defaults' : 'Custom');
    button.setAttribute('role', 'radio');
    button.addEventListener('click', () => { tab = value; render(); });
    tabs.append(button);
    return button;
  });
  const list = element('div', 'dialkit-transition-preset-list');
  list.setAttribute('role', 'group');
  // The list fades at each edge while more presets sit beyond it.
  const fade = () => {
    list.toggleAttribute('data-above', list.scrollTop > 0);
    list.toggleAttribute('data-below', list.scrollTop + list.clientHeight < list.scrollHeight - 1);
  };
  list.addEventListener('scroll', fade, { passive: true });
  const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fade);
  resize?.observe(list);
  const empty = element('p', 'dialkit-transition-preset-empty');
  const save = element('button', 'dialkit-transition-preset-save');
  save.addEventListener('click', () => DialStore.saveTransitionPreset(props.value, props.mode));
  root.append(tabs, list, empty, save);
  host.append(root);

  function buildItems(options: (TransitionPresetOption & { id?: string })[]) {
    items = options.map(option => {
      const item = element('div', 'dialkit-transition-preset');
      const pick = element('button', 'dialkit-transition-preset-pick');
      pick.append(thumbnail(option.value), element('span', 'dialkit-transition-preset-name', option.name));
      pick.addEventListener('click', () => props.onChange(applyTransitionPreset(props.value, option.value, props.mode)));
      item.append(pick);
      if (option.id) {
        const id = option.id;
        const remove = element('button', 'dialkit-transition-preset-delete');
        remove.setAttribute('aria-label', `Delete ${option.name}`);
        remove.title = remove.getAttribute('aria-label')!;
        remove.append(svgIcon([ICON_CLOSE], ''));
        remove.addEventListener('click', () => DialStore.deleteTransitionPreset(id));
        item.append(remove);
      }
      return { root: item, pick, option };
    });
    list.replaceChildren(...items.map(item => item.root));
  }

  function render() {
    const custom = saved();
    const options = tab === 'defaults' ? defaultTransitionPresets(props.mode) : custom.map(({ id, name, value }) => ({ id, name, value }));
    const nextSignature = `${props.mode}:${tab}:${tab === 'custom' ? custom.map(preset => preset.id).join(',') : ''}`;
    if (signature !== nextSignature) {
      // Keep keyboard focus on the same preset when the list is rebuilt.
      const focused = items.findIndex(item => item.root.contains(document.activeElement));
      signature = nextSignature;
      buildItems(options);
      if (focused >= 0) (items[Math.min(focused, items.length - 1)]?.pick ?? save).focus({ preventScroll: true });
    }
    tabButtons.forEach((button, index) => {
      const active = (index === 0) === (tab === 'defaults');
      button.dataset.active = String(active);
      button.setAttribute('aria-checked', String(active));
      button.tabIndex = active ? 0 : -1;
      if (active) pill.style.transform = `translateX(${index * 100}%)`;
    });
    for (const item of items) {
      const active = sameTransition(item.option.value, props.value, props.mode);
      item.root.dataset.active = String(active);
      item.pick.setAttribute('aria-pressed', String(active));
    }
    const noun = props.mode === 'easing' ? 'curve' : 'spring';
    list.setAttribute('aria-label', `${tab === 'defaults' ? 'Default' : 'Custom'} ${noun}s`);
    list.hidden = !items.length;
    empty.hidden = tab === 'defaults' || items.length > 0;
    empty.textContent = `No custom ${noun}s yet. Shape a ${noun}, then save it.`;
    save.hidden = tab === 'defaults';
    const savedAs = custom.find(preset => sameTransition(preset.value, props.value, props.mode));
    save.disabled = !!savedAs;
    save.textContent = savedAs ? `Saved as ${savedAs.name}` : `Save current ${noun}`;
    fade();
  }

  const stop = DialStore.subscribeTransitions(render);
  render();
  return {
    update(next: TransitionPresetsProps) {
      props = next;
      render();
    },
    destroy() { stop(); resize?.disconnect(); root.remove(); },
  };
}

/** How long the dots show a check after a copy or a paste. */
const COPY_DONE_MS = 1200;

/** The group widens or narrows, and fades, without a bounce, so its edge never wobbles. */
const COPY_GROUP_SPRING = { visualDuration: 0.15, bounce: 0 };
/** Each icon pops with a little bounce, 45ms after the one before it. */
const COPY_ICON_SPRING = { visualDuration: 0.2, bounce: 0.35 };
const COPY_ICON_STAGGER_MS = 45;
/** A closed icon: shrunk and nudged toward the dots. */
const COPY_ICON_HIDDEN = { scale: 0.6, x: 2 };

/**
 * Plays a spring from 0 to 1 through `frame`, for as long as Motion would
 * run it over `distance`, so the native animation moves and rests like
 * Motion's.
 */
function playSpring(node: HTMLElement, frame: (progress: number) => Keyframe, spring: { visualDuration: number; bounce: number }, distance: number, delay = 0) {
  const params = springParams({ type: 'spring', ...spring });
  const duration = springRestDuration(params, distance);
  const count = Math.max(2, Math.ceil(duration * 60));
  const frames = Array.from({ length: count + 1 }, (_, index) => frame(index === count ? 1 : springProgress(index / count * duration, params)));
  return node.animate(frames, { duration: duration * 1000, delay, easing: 'linear', fill: 'backwards' });
}

/**
 * The dots in a transition's header. Hovering, focusing or clicking them
 * opens Copy and Paste to their left: the group widens and fades in while
 * the icons pop out, the one by the dots first, and closing reverses it.
 * One click copies this transition with its mode, or pastes the copied
 * one. Paste stays disabled until a transition has been copied.
 */
export function mountTransitionCopy(host: HTMLElement, initial: TransitionCopyProps) {
  let props = initial;
  let open = false;
  let quiet = false;
  // The click that ends the hover or press that opened the group keeps it open.
  let opening = false;
  let doneTimer: ReturnType<typeof setTimeout> | undefined;
  let motion: Animation[] = [];
  const root = element('div', 'dialkit-copy-actions');
  const group = element('div', 'dialkit-copy-group');
  const action = (label: string, paths: readonly string[], run: () => void) => {
    const button = element('button', 'dialkit-copy-action');
    button.setAttribute('aria-label', label);
    button.title = label;
    button.append(svgIcon(paths, ''));
    button.addEventListener('click', () => { run(); finish(); });
    return button;
  };
  const copy = action('Copy transition', ICON_COPY, () => DialStore.copyTransition(props.value, props.mode));
  const paste = action('Paste transition', ICON_PASTE, () => {
    const copied = DialStore.getCopiedTransition();
    if (copied) props.onPaste(copied);
  });
  const dots = element('button', 'dialkit-copy-button');
  dots.setAttribute('aria-label', 'Copy or paste');
  group.append(copy, paste);
  root.append(group, dots);
  host.append(root);

  function render() {
    root.dataset.open = String(open);
    group.inert = !open;
    dots.setAttribute('aria-expanded', String(open));
    paste.disabled = !DialStore.getCopiedTransition();
  }
  // Opens or closes the group from wherever its last motion left it.
  function animateGroup() {
    const toIcon = open ? { scale: 1, x: 0 } : COPY_ICON_HIDDEN;
    const settle = () => {
      group.style.width = open ? '' : '0px';
      group.style.opacity = open ? '' : '0';
      for (const icon of [copy, paste]) icon.style.transform = open ? '' : `translateX(${toIcon.x}px) scale(${toIcon.scale})`;
    };
    if (typeof group.animate !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (const animation of motion) animation.cancel();
      settle();
      group.hidden = !open;
      return;
    }
    const shown = !group.hidden;
    const style = getComputedStyle(group);
    const fromWidth = shown ? parseFloat(style.width) : 0;
    const fromOpacity = shown ? Number(style.opacity) : 0;
    const icons = [copy, paste].map((icon) => {
      if (!shown) return { icon, ...COPY_ICON_HIDDEN };
      const matrix = new DOMMatrixReadOnly(getComputedStyle(icon).transform);
      return { icon, scale: matrix.a, x: matrix.e };
    });
    for (const animation of motion) animation.cancel();
    group.hidden = false;
    group.style.width = '';
    const toWidth = open ? parseFloat(getComputedStyle(group).width) : 0;
    const toOpacity = open ? 1 : 0;
    settle();
    motion = [
      playSpring(group, p => ({ width: `${fromWidth + (toWidth - fromWidth) * p}px` }), COPY_GROUP_SPRING, toWidth - fromWidth),
      playSpring(group, p => ({ opacity: String(fromOpacity + (toOpacity - fromOpacity) * p) }), COPY_GROUP_SPRING, toOpacity - fromOpacity),
    ];
    // Opening starts with the icon by the dots, closing with the far one.
    (open ? [...icons].reverse() : icons).forEach(({ icon, scale, x }, index) => {
      motion.push(playSpring(icon, p => ({
        transform: `translateX(${x + (toIcon.x - x) * p}px) scale(${scale + (toIcon.scale - scale) * p})`,
      }), COPY_ICON_SPRING, Math.max(Math.abs(toIcon.x - x), Math.abs(toIcon.scale - scale)), index * COPY_ICON_STAGGER_MS));
    });
    if (open) return;
    const closing = motion;
    Promise.all(closing.map(animation => animation.finished)).then(() => {
      if (motion === closing) group.hidden = true;
    }, () => {});
  }
  function setOpen(next: boolean) {
    if (open === next) return;
    // Focus leaves the group before it turns inert.
    if (!next && group.contains(document.activeElement)) focusDots();
    open = next;
    opening = false;
    if (open) document.addEventListener('pointerdown', pointerOutside, true);
    else document.removeEventListener('pointerdown', pointerOutside, true);
    render();
    animateGroup();
  }
  // A tap does not focus the dots everywhere, so a press outside also closes the group.
  function pointerOutside(event: PointerEvent) {
    if (!event.composedPath().includes(root)) setOpen(false);
  }
  function showDots(done: boolean) {
    dots.replaceChildren(done ? svgIcon([ICON_CHECK], '') : svgIcon(ICON_MORE, '', 3));
  }
  // Focus goes back to the dots without opening the group again.
  function focusDots() {
    quiet = true;
    dots.focus({ preventScroll: true });
    quiet = false;
  }
  // After a copy or a paste the group closes and the dots show a check.
  function finish() {
    setOpen(false);
    showDots(true);
    clearTimeout(doneTimer);
    doneTimer = setTimeout(() => showDots(false), COPY_DONE_MS);
  }

  // The actions sit in the folder header; using them must not fold the folder.
  root.addEventListener('click', event => event.stopPropagation());
  // Only a mouse opens the group by hovering; a touch opens it with a tap.
  dots.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse' || open) return;
    setOpen(true);
    opening = true;
  });
  dots.addEventListener('pointerdown', () => { if (!open) opening = true; });
  root.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse' && !root.contains(document.activeElement)) setOpen(false);
  });
  dots.addEventListener('focus', () => {
    if (quiet) return;
    const keep = opening;
    setOpen(true);
    opening = keep;
  });
  dots.addEventListener('click', () => {
    const toggle = open && !opening;
    opening = false;
    setOpen(!toggle);
  });
  root.addEventListener('focusout', event => {
    if (!root.contains(event.relatedTarget as Node | null) && !root.matches(':hover')) setOpen(false);
  });
  root.addEventListener('keydown', event => {
    if (!open) return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
    }
  });

  showDots(false);
  group.hidden = true;
  render();
  const stop = DialStore.subscribeTransitions(render);
  return {
    update(next: TransitionCopyProps) { props = next; },
    destroy() {
      stop();
      clearTimeout(doneTimer);
      for (const animation of motion) animation.cancel();
      document.removeEventListener('pointerdown', pointerOutside, true);
      root.remove();
    },
  };
}
