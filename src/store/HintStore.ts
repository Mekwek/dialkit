type Listener = () => void;

/** The hint on screen: its text, and the row it sits above. */
export interface ShownHint {
  text: string;
  anchor: HTMLElement;
  box: HTMLElement;
}

/**
 * The hint key and the one hint on screen, shared by every control. While
 * the hint key (H) is held, the control under the pointer shows its hint.
 */
class HintStoreClass {
  private key = 'h';
  private keyHeld = false;
  private shown: ShownHint | null = null;
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  /** The key held to show hints. */
  getKey = (): string => this.key;

  setKey(key: string): void {
    this.key = key.toLowerCase();
    this.notify();
  }

  isKeyHeld = (): boolean => this.keyHeld;

  setKeyHeld(held: boolean): void {
    if (held === this.keyHeld) return;
    this.keyHeld = held;
    if (!held) this.shown = null;
    this.notify();
  }

  getShown = (): ShownHint | null => this.shown;

  /** Shows `text` above `box`, the row; `anchor` is the element that asked. */
  show(text: string, anchor: HTMLElement, box: HTMLElement = anchor): void {
    if (this.shown?.anchor === anchor && this.shown.text === text) return;
    this.shown = { text, anchor, box };
    this.notify();
  }

  /** Hides the hint, if `anchor` is the one it points at. */
  hide(anchor?: HTMLElement): void {
    if (!this.shown || (anchor && this.shown.anchor !== anchor)) return;
    this.shown = null;
    this.notify();
  }
}

export const HintStore = new HintStoreClass();
