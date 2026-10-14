import type { BackgroundGradient, BackgroundMedia, SavedGradient } from '../background';

/**
 * What the host gives the background control. The control never uploads or
 * stores anything itself: it calls these.
 */
export interface BackgroundHost {
  /** Uploads a file and returns its storage key. Without it, the Media tab shows a disabled message. */
  upload?: (file: File) => Promise<BackgroundMedia>;
  /** The URL that shows a stored media file. */
  mediaUrl?: (media: BackgroundMedia) => string;
  /** Saves a gradient. Without it, the Save gradient button is hidden. */
  saveGradient?: (gradient: BackgroundGradient) => Promise<SavedGradient>;
  /** Deletes a saved gradient. Without it, saved gradients show no delete button. */
  deleteGradient?: (id: string) => Promise<void>;
}

type Listener = () => void;

interface BackgroundHostState {
  host: BackgroundHost;
  saved: SavedGradient[];
  listeners: Set<Listener>;
}

/**
 * One state for every copy of this module. The React, Vanilla and Svelte
 * entries each bundle their own copy, so a host that calls
 * `setBackgroundHost` from `dialkit/store` still reaches the control that
 * `dialkit` drew.
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

function cloneSaved(list: SavedGradient[]): SavedGradient[] {
  return list.map(saved => ({
    id: saved.id,
    gradient: { shape: saved.gradient.shape, angle: saved.gradient.angle, stops: saved.gradient.stops.map(stop => ({ ...stop })) },
  }));
}

/** Sets the host's upload, media URL and saved-gradient hooks. Replaces the previous host. */
export function setBackgroundHost(host: BackgroundHost): void {
  state().host = { ...host };
  notify();
}

export function getBackgroundHost(): BackgroundHost {
  return state().host;
}

/** Sets the saved gradients every background control shows. */
export function setSavedGradients(list: SavedGradient[]): void {
  state().saved = cloneSaved(list);
  notify();
}

export function getSavedGradients(): SavedGradient[] {
  return state().saved;
}

/** Calls `listener` when the host or the saved gradients change. Returns the unsubscribe. */
export function subscribeBackgroundHost(listener: Listener): () => void {
  const listeners = state().listeners;
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
