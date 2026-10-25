// Version thumbnails: small WebP captures of the page, one per version. They
// live in memory and, when the panel persists its versions, next to them in
// the same storage under `<persist key>:thumbnails`.

import { DialStore } from '../store/DialStore';
import { rasterizeViewport } from './capture';

export const BASE_VERSION = 'base';

export type Thumbnail = {
  src: string;
  width: number;
  height: number;
  capturedAt: number;
};

export type Capture = {
  /** Full-resolution frame for on-screen motion. Not persisted. */
  canvas: HTMLCanvasElement;
  thumbnail: Thumbnail;
};

const THUMBNAIL_WIDTH = 720;
const THUMBNAIL_QUALITY = 0.8;
const IGNORE_SELECTOR = '.dialkit-root, .dialkit-version-overlay, [data-dialkit-ignore]';

export function versionKey(presetId: string | null): string {
  return presetId ?? BASE_VERSION;
}

type Listener = () => void;

class ThumbnailStoreImpl {
  private cache = new Map<string, Record<string, Thumbnail>>();
  private listeners = new Set<Listener>();

  get(panelId: string, key: string): Thumbnail | undefined {
    return this.read(panelId)[key];
  }

  getAll(panelId: string): Record<string, Thumbnail> {
    return this.read(panelId);
  }

  set(panelId: string, key: string, thumbnail: Thumbnail): void {
    const next = { ...this.read(panelId), [key]: thumbnail };
    this.write(panelId, next);
  }

  delete(panelId: string, key: string): void {
    const current = this.read(panelId);
    if (!(key in current)) return;
    const next = { ...current };
    delete next[key];
    this.write(panelId, next);
  }

  /** Drop thumbnails whose versions no longer exist. */
  prune(panelId: string, keys: string[]): void {
    const current = this.read(panelId);
    const keep = new Set(keys);
    if (Object.keys(current).every((key) => keep.has(key))) return;
    const next: Record<string, Thumbnail> = {};
    for (const key of keys) if (current[key]) next[key] = current[key];
    this.write(panelId, next);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private read(panelId: string): Record<string, Thumbnail> {
    const cached = this.cache.get(panelId);
    if (cached) return cached;
    let parsed: Record<string, Thumbnail> = {};
    try {
      const raw = storageFor(panelId)?.getItem(storageKey(panelId));
      if (raw) parsed = JSON.parse(raw);
    } catch { /* storage unavailable or corrupt */ }
    this.cache.set(panelId, parsed);
    return parsed;
  }

  private write(panelId: string, value: Record<string, Thumbnail>): void {
    // Keep the in-memory copy even when storage is full, so the session still works.
    this.cache.set(panelId, value);
    this.persist(panelId, value);
    this.listeners.forEach((fn) => fn());
  }

  private persist(panelId: string, value: Record<string, Thumbnail>): void {
    const storage = storageFor(panelId);
    if (!storage) return;
    const entries = Object.entries(value).sort((a, b) => b[1].capturedAt - a[1].capturedAt);
    // On quota errors, drop the oldest captures from storage (not from memory).
    for (let keep = entries.length; keep >= 0; keep--) {
      try {
        storage.setItem(storageKey(panelId), JSON.stringify(Object.fromEntries(entries.slice(0, keep))));
        return;
      } catch { /* try with fewer */ }
    }
  }
}

function storageFor(panelId: string): Storage | null {
  const config = DialStore.getPresetStorage(panelId);
  if (!config || typeof window === 'undefined') return null;
  try {
    return config.storage === 'sessionStorage' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function storageKey(panelId: string): string {
  return `${DialStore.getPresetStorage(panelId)!.key}:thumbnails`;
}

export const ThumbnailStore = new ThumbnailStoreImpl();

/**
 * Capture the visible viewport, excluding DialKit's own UI.
 * Resolves null when the page can't be rasterized (e.g. tainted canvas).
 */
export async function captureViewport(): Promise<Capture | null> {
  if (typeof window === 'undefined') return null;
  try {
    const canvas = await rasterizeViewport({
      ignore: IGNORE_SELECTOR,
      scale: Math.min(window.devicePixelRatio || 1, 2),
    });
    return { canvas, thumbnail: toThumbnail(canvas, window.innerWidth, window.innerHeight) };
  } catch {
    return null;
  }
}

function toThumbnail(canvas: HTMLCanvasElement, width: number, height: number): Thumbnail {
  const scale = Math.min(1, THUMBNAIL_WIDTH / width);
  const out = document.createElement('canvas');
  out.width = Math.round(width * scale);
  out.height = Math.round(height * scale);
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return {
    src: out.toDataURL('image/webp', THUMBNAIL_QUALITY),
    width,
    height,
    capturedAt: Date.now(),
  };
}
