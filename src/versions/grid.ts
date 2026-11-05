// "View all" versions overlay.
//
// The live page is never transformed. A fixed overlay renders the versions as
// cached screenshots and moves the whole grid like a camera: zoomed into one
// card (which then exactly covers the viewport) or at rest. When a version is
// chosen, its values load into the real page underneath while the camera zooms
// into its card; once settled, the overlay fades and the live page takes over.
// This mirrors Open Layer's gallery → demo transition.
//
// Motion is a CSS linear() spring run by the browser (Web Animations), and an
// interrupted transition continues from wherever the camera currently is.

import { ICON_CLOSE } from '../icons';
import { element, icon } from '../vanilla/dom';
import { GALLERY_SPRING } from './spring';
import type { Thumbnail } from './thumbnails';

export type GridVersion = {
  key: string;
  name: string;
  thumbnail?: Thumbnail;
};

export type VersionGridOptions = {
  versions: GridVersion[];
  activeKey: string;
  theme?: 'light' | 'dark' | 'system';
  /**
   * The element the grid fills, instead of the window. The chosen card grows
   * to fill this element, so the live view under the grid must sit in the
   * same box.
   */
  host?: HTMLElement;
  /** Fills a card's picture box, instead of its thumbnail. Returns the release. */
  picture?: (key: string, picture: HTMLElement, tile: HTMLElement) => () => void;
  /** Load a version into the live page. Called before the zoom-in starts. */
  onSelect: (key: string) => void;
  /** Rename a version (double-click its name). */
  onRename?: (key: string, name: string) => void;
  /** Whether a version's name can change. Every version's can without it. */
  canRename?: (key: string) => boolean;
  /**
   * Takes over the grid's scroll, for example to smooth it. It runs while the
   * grid rests, so no scroll moves a card during a zoom. Returns the release.
   */
  scroll?: (scroller: HTMLElement, content: HTMLElement) => () => void;
  onClose?: () => void;
};

export type VersionGridHandle = {
  /** Zoom into a version's card, load it, then hand off to the live page. */
  select: (key: string) => void;
  /** Zoom back into the active version, then hand off to the live page. */
  dismiss: () => void;
  /** Remove immediately. */
  close: () => void;
  update: (versions: GridVersion[], activeKey: string) => void;
};

const CARD_RADIUS = 14;
const SETTLE_FADE_MS = 140; // Open Layer: settled preview fades off the live page

let current: VersionGridHandle | null = null;

export function openVersionGrid(options: VersionGridOptions): VersionGridHandle {
  current?.close();
  registerSceneProperties();

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let versions = options.versions;
  let activeKey = options.activeKey;
  let focusKey = activeKey;
  let closing = false;
  let animations: Animation[] = [];
  let releases: (() => void)[] = [];
  let releaseScroll: (() => void) | undefined;
  const { host } = options;

  const overlay = element('div', 'dialkit-version-overlay');
  overlay.dataset.theme = options.theme ?? 'system';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Versions');
  if (host) overlay.dataset.hosted = 'true';

  const scroller = element('div', 'dialkit-version-overlay-scroll');
  const grid = element('div', 'dialkit-version-overlay-grid');
  const close = element('button', 'dialkit-version-overlay-close');
  close.setAttribute('aria-label', 'Close versions');
  close.append(icon(ICON_CLOSE));
  scroller.append(grid);
  overlay.append(scroller, close);

  const cards = new Map<string, HTMLElement>();
  const focusCard = (key: string, opts?: FocusOptions) =>
    cards.get(key)?.querySelector<HTMLElement>('.dialkit-version-card-frame')?.focus(opts);

  const releasePictures = () => {
    releases.forEach((release) => release());
    releases = [];
  };

  const render = () => {
    releasePictures();
    grid.textContent = '';
    cards.clear();
    const area = overlay.getBoundingClientRect();
    grid.style.setProperty('--dialkit-version-aspect', String(area.width / area.height));
    grid.style.setProperty('--dialkit-version-columns', String(columnsFor(versions.length, area.width)));
    for (const version of versions) {
      const card = element('div', 'dialkit-version-card');
      card.dataset.key = version.key;
      const frame = element('button', 'dialkit-version-card-frame');
      frame.setAttribute('aria-label', version.name);
      if (options.picture) {
        const picture = element('div', 'dialkit-version-card-picture');
        frame.append(picture);
        releases.push(options.picture(version.key, picture, frame));
      } else if (version.thumbnail) {
        const img = element('img');
        img.src = version.thumbnail.src;
        img.alt = '';
        img.draggable = false;
        img.decoding = 'sync';
        frame.append(img);
      }
      const label = element('span', 'dialkit-version-card-label');
      label.textContent = version.name;
      if (options.canRename?.(version.key) !== false) {
        label.title = 'Double-click to rename';
        label.addEventListener('dblclick', () => editLabel(version.key, label, frame));
      }
      card.append(frame, label);
      frame.addEventListener('click', () => choose(version.key, true));
      frame.addEventListener('focus', () => { focusKey = version.key; });
      cards.set(version.key, card);
      grid.append(card);
    }
    reserveDialKitSpace();
  };

  // Inline rename: Enter saves, Escape cancels, blur saves.
  const editLabel = (key: string, label: HTMLElement, frame: HTMLElement) => {
    if (closing || !options.onRename) return;
    const previous = versions.find((v) => v.key === key)?.name ?? label.textContent ?? '';
    const input = element('input', 'dialkit-version-card-input');
    input.value = previous;
    input.setAttribute('aria-label', 'Version name');
    let done = false;
    const end = (save: boolean) => {
      if (done) return;
      done = true;
      const name = input.value.trim();
      if (save && name && name !== previous) {
        versions = versions.map((v) => (v.key === key ? { ...v, name } : v));
        options.onRename!(key, name);
        label.textContent = name;
        frame.setAttribute('aria-label', name);
      }
      input.replaceWith(label);
      frame.focus({ preventScroll: true });
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); end(true); }
      else if (e.key === 'Escape') { e.preventDefault(); end(false); }
    });
    input.addEventListener('blur', () => end(true));
    label.replaceWith(input);
    input.focus();
    input.select();
  };

  // Keep cards out from under the DialKit panel when it's docked on a side.
  const reserveDialKitSpace = () => {
    if (host) return;
    const panel = document.querySelector('.dialkit-panel:not([data-mode="inline"])');
    const rect = panel?.getBoundingClientRect();
    const gutter = 32;
    scroller.style.paddingRight = '';
    scroller.style.paddingLeft = '';
    if (!rect || rect.width === 0) return;
    if (rect.left > window.innerWidth / 2) scroller.style.paddingRight = `${window.innerWidth - rect.left + gutter}px`;
    else scroller.style.paddingLeft = `${rect.right + gutter}px`;
  };

  // Camera transform that makes `key`'s card exactly cover the overlay.
  const zoomedInto = (key: string): string | null => {
    // The card, because its frame is larger while the pointer lifts it.
    const card = cards.get(key);
    if (!card) return null;
    const prev = grid.style.transform;
    grid.style.transform = 'none';
    const home = card.getBoundingClientRect();
    const origin = grid.getBoundingClientRect();
    grid.style.transform = prev;
    const area = overlay.getBoundingClientRect();
    const s = area.width / home.width;
    const tx = area.x - origin.x - s * (home.x - origin.x);
    const ty = area.y - origin.y - s * (home.y - origin.y);
    return `translate3d(${tx}px, ${ty}px, 0) scale(${s})`;
  };

  // Spring the camera, scene value (labels, chrome), and card radius together,
  // starting from whatever is on screen now.
  const animateTo = (transform: string, scene: 0 | 1): Promise<void> => {
    const style = getComputedStyle(grid);
    const from = {
      transform: style.transform === 'none' ? 'translate3d(0px, 0px, 0) scale(1)' : style.transform,
      scene: parseFloat(getComputedStyle(overlay).getPropertyValue('--dialkit-scene')) || 0,
      radius: style.getPropertyValue('--dialkit-card-radius').trim() || '0px',
    };
    animations.forEach((a) => a.cancel());
    const scale = scaleOf(transform);
    const timing: KeyframeAnimationOptions = {
      duration: reduceMotion ? 0 : GALLERY_SPRING.duration * 1000,
      easing: GALLERY_SPRING.easing,
      fill: 'forwards',
    };
    overlay.dataset.animating = 'true';
    animations = [
      grid.animate([
        { transform: from.transform, '--dialkit-card-radius': from.radius },
        { transform, '--dialkit-card-radius': `${(cardRadius * scene) / scale}px` },
      ], timing),
      overlay.animate([{ '--dialkit-scene': from.scene }, { '--dialkit-scene': scene }], timing),
    ];
    return Promise.all(animations.map((a) => a.finished)).then(
      () => { delete overlay.dataset.animating; },
      () => {}, // superseded by a newer transition
    );
  };

  const stopScroll = () => {
    releaseScroll?.();
    releaseScroll = undefined;
  };

  const finish = () => {
    stopScroll();
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onResize);
    if (current === handle) current = null;
    const fade = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: reduceMotion ? 0 : SETTLE_FADE_MS,
      easing: 'linear',
      fill: 'forwards',
    });
    fade.onfinish = () => {
      releasePictures();
      overlay.remove();
    };
    options.onClose?.();
  };

  // A click on a card always selects, also on the active card. Closing the
  // grid selects only when the version changes.
  const choose = (key: string, clicked = false) => {
    if (closing) return;
    closing = true;
    stopScroll();
    overlay.dataset.closing = 'true';
    if (clicked || key !== activeKey) {
      options.onSelect(key);
      activeKey = key;
    }
    const target = zoomedInto(key);
    if (!target) { finish(); return; }
    let done = false;
    const settle = () => { if (!done) { done = true; finish(); } };
    animateTo(target, 0).then(settle);
    // The curve is within ~0.1% of rest by here; hand off to the live page.
    setTimeout(settle, GALLERY_SPRING.duration * 750);
  };

  const onKey = (e: KeyboardEvent) => {
    // Typing a name owns the keyboard.
    if (e.target instanceof HTMLInputElement && overlay.contains(e.target)) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      choose(activeKey);
      return;
    }
    const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const arrows: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
    if (e.key in arrows) {
      e.preventDefault();
      const index = versions.findIndex((v) => v.key === focusKey);
      const next = versions[Math.max(0, Math.min(versions.length - 1, (index < 0 ? 0 : index) + arrows[e.key]))];
      focusCard(next.key);
    }
  };

  const onResize = () => {
    if (closing) return;
    animations.forEach((a) => a.cancel());
    render();
  };

  close.addEventListener('click', () => choose(activeKey));
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', onResize);

  // Build the first frame fully zoomed in, then insert it, so the very first
  // paint is the live page's twin rather than the resting grid.
  overlay.style.setProperty('--dialkit-scene', '0');
  overlay.style.visibility = 'hidden';
  (host ?? document.body).append(overlay);
  // A hosted grid takes the host's own card radius.
  const cardRadius = (host && parseFloat(getComputedStyle(overlay).getPropertyValue('--dial-pictures-radius'))) || CARD_RADIUS;
  if (host) overlay.style.setProperty('--dialkit-card-radius', `${cardRadius}px`);
  render();
  const anchor = cards.get(activeKey);
  if (anchor) scroller.scrollTop = Math.max(0, anchor.offsetTop - (scroller.clientHeight - anchor.offsetHeight) / 2);
  const start = zoomedInto(activeKey);
  if (start) {
    grid.style.transform = start;
    grid.style.setProperty('--dialkit-card-radius', '0px');
  }
  overlay.style.visibility = '';
  animateTo('translate3d(0px, 0px, 0) scale(1)', 1).then(() => {
    if (closing) return;
    // Settle into plain resting styles so scrolling and hover behave normally.
    overlay.style.setProperty('--dialkit-scene', '1');
    grid.style.transform = '';
    grid.style.removeProperty('--dialkit-card-radius');
    animations.forEach((a) => a.cancel());
    animations = [];
    releaseScroll = options.scroll?.(scroller, grid);
  });
  focusCard(activeKey, { preventScroll: true });

  const handle: VersionGridHandle = {
    select: (key) => choose(key),
    dismiss: () => choose(activeKey),
    close: () => {
      if (closing) return;
      closing = true;
      animations.forEach((a) => a.cancel());
      finish();
    },
    update: (next, nextActive) => {
      const changed = next.length !== versions.length
        || next.some((version, index) => version.key !== versions[index]?.key || version.name !== versions[index]?.name);
      versions = next;
      activeKey = nextActive;
      // A live picture needs no refresh, so only a changed list renders again.
      if (options.picture) {
        if (changed && !closing) render();
        return;
      }
      // Only refresh thumbnails in place; re-rendering would reset motion.
      for (const version of versions) {
        const img = cards.get(version.key)?.querySelector('img');
        if (img && version.thumbnail && img.src !== version.thumbnail.src) img.src = version.thumbnail.src;
      }
    },
  };
  current = handle;
  return handle;
}

function scaleOf(transform: string): number {
  const match = /scale\(([^)]+)\)/.exec(transform);
  return match ? parseFloat(match[1]) : 1;
}

let registered = false;
function registerSceneProperties() {
  if (registered || typeof CSS === 'undefined' || !('registerProperty' in CSS)) return;
  registered = true;
  for (const [name, syntax, initialValue] of [
    ['--dialkit-scene', '<number>', '1'],
    ['--dialkit-card-radius', '<length>', `${CARD_RADIUS}px`],
  ]) {
    try {
      CSS.registerProperty({ name, syntax, inherits: true, initialValue });
    } catch { /* already registered */ }
  }
}

function columnsFor(count: number, width: number): number {
  const max = width >= 1100 ? 3 : width >= 680 ? 2 : 1;
  return Math.max(1, Math.min(max, Math.max(count, 2)));
}
