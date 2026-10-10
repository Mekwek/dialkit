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
 *
 * The store keeps the hovered rows itself, last entered last. A row inside
 * another row (a button in a header) is entered after it, so the innermost
 * one shows. One list, not a listener per row: two rows that each showed
 * their own hint on every change replaced each other without end.
 */
class HintStoreClass {
  private key = 'h';
  private keyHeld = false;
  private shown: ShownHint | null = null;
  private hovered: { anchor: HTMLElement; text: string }[] = [];
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
    const top = this.hovered[this.hovered.length - 1];
    if (!held) this.shown = null;
    else if (top) this.shown = { text: top.text, anchor: top.anchor, box: top.anchor };
    this.notify();
  }

  getShown = (): ShownHint | null => this.shown;

  /** The pointer entered `anchor`, a row with a hint. */
  enter(anchor: HTMLElement, text: string): void {
    this.hovered = this.hovered.filter((row) => row.anchor !== anchor);
    this.hovered.push({ anchor, text });
    if (this.keyHeld) this.show(text, anchor);
  }

  /**
   * The pointer left `anchor`. Its hint stays while the key is held, so the
   * gap between two rows does not flicker: the next row replaces it.
   */
  leave(anchor: HTMLElement): void {
    this.hovered = this.hovered.filter((row) => row.anchor !== anchor);
  }

  /** A hovered row's text changed. */
  retext(anchor: HTMLElement, text: string): void {
    const row = this.hovered.find((entry) => entry.anchor === anchor);
    if (!row) return;
    row.text = text;
    if (this.shown?.anchor === anchor) this.show(text, anchor);
  }

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
