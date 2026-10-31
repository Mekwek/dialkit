import { normalizeGradient, type BackgroundGradient, type BackgroundMedia, type SavedGradient } from '../background';

/**
 * What a host gives every background control: where uploads go, how a
 * stored file is shown, where saved gradients live, and the canvas the
 * gradient gizmo draws over.
 *
 * Once a host sets any of these, it owns the media and the saved gradients:
 * - Uploads go to a control's own `upload`, else to the host's. With
 *   neither, the Media tab says uploads are not available here; files are
 *   never read into data URLs.
 * - Saved gradients are only the list given to `setSavedGradients`. The
 *   control saves and deletes through `saveGradient` and `deleteGradient`,
 *   and hides each button the host leaves out. Nothing is kept in the panel
 *   or in browser storage.
 * Without a host (or after `setBackgroundHost({})`), a control keeps its
 * saved gradients in its panel and reads files up to 10 MB as data URLs.
 */
export type BackgroundHost = {
  /** Stores a dropped or picked file and returns the media to keep: its `src` (a URL, or the host's own storage key) and kind. */
  upload?: (file: File) => Promise<BackgroundMedia>;
  /** The URL that shows a media in the control's preview, for a host that keeps a storage key in `src`. Without it, `src` is the URL. */
  mediaUrl?: (media: BackgroundMedia) => string;
  /** Saves a gradient and returns it with its id. Without it, the Save gradient button is hidden. */
  saveGradient?: (gradient: BackgroundGradient) => Promise<SavedGradient>;
  /** Deletes a saved gradient. Without it, saved gradients show no delete button. */
  deleteGradient?: (id: string) => Promise<void>;
  /**
   * The element the gradient gizmo draws over, usually the host's canvas.
   * The gradient's handles are fractions of its box. Opening a stop's color
   * picker shows the gizmo; without a target there is none.
   */
  gizmoTarget?: () => HTMLElement | null;
};

type Listener = () => void;

type BackgroundHostState = {
  host: BackgroundHost;
  saved: SavedGradient[];
  listeners: Set<Listener>;
};

/**
 * One state for every copy of this module: each entry (React, Solid, Vue,
 * Svelte, vanilla) bundles its own, so a host set through one still reaches
 * a control drawn by another.
 */
const STATE_KEY = Symbol.for('dialkit.backgroundHost');

function state(): BackgroundHostState {
  const scope = globalThis as unknown as Record<symbol, BackgroundHostState | undefined>;
  let current = scope[STATE_KEY];
  if (!current) {
    current = { host: {}, saved: [], listeners: new Set() };
    scope[STATE_KEY] = current;
  }
  return current;
}

function notify(): void {
  state().listeners.forEach(listener => listener());
}

/** Sets the host's hooks, replacing the previous host. `setBackgroundHost({})` removes it. */
export function setBackgroundHost(host: BackgroundHost): void {
  state().host = { ...host };
  notify();
}

export function getBackgroundHost(): BackgroundHost {
  return state().host;
}

/** Whether a host is set: any of its hooks is given. */
export function hasBackgroundHost(): boolean {
  return Object.values(state().host).some(hook => hook !== undefined);
}

/** Sets the saved gradients every background control shows while a host is set. Each is made valid. */
export function setSavedGradients(list: readonly SavedGradient[]): void {
  state().saved = list.map(saved => ({ id: saved.id, gradient: normalizeGradient(saved.gradient) }));
  notify();
}

export function getSavedGradients(): SavedGradient[] {
  return state().saved;
}

/**
 * Where a control's dropped or picked file goes: the control's own `upload`,
 * else the host's, else, with no host set, `fallback` (the control reads the
 * file as a data URL). Undefined when a host is set without an upload:
 * uploads are not available. The result rejects when the host's upload
 * returns no usable media.
 */
export function backgroundUploader(
  own: ((file: File) => Promise<string>) | undefined,
  fallback: (file: File) => Promise<string>,
): ((file: File, kind: BackgroundMedia['kind']) => Promise<BackgroundMedia>) | undefined {
  if (own) return async (file, kind) => ({ src: await own(file), kind });
  const hosted = getBackgroundHost().upload;
  if (hosted) {
    return async file => {
      const media = await hosted(file);
      if (!media || typeof media.src !== 'string' || !media.src || (media.kind !== 'image' && media.kind !== 'video')) {
        throw new Error('The upload returned no file.');
      }
      return { src: media.src, kind: media.kind };
    };
  }
  if (hasBackgroundHost()) return undefined;
  return async (file, kind) => ({ src: await fallback(file), kind });
}

/** Calls `listener` when the host or the saved gradients change. Returns the unsubscribe. */
export function subscribeBackgroundHost(listener: Listener): () => void {
  const listeners = state().listeners;
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
