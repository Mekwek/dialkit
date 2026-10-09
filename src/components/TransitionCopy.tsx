import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ICON_CHECK, ICON_MORE } from '../icons';
import { DialStore } from '../store/DialStore';
import type { TransitionConfig } from '../store/DialStore';
import { TransitionLibrary } from '../store/TransitionLibrary';
import { describeCopied } from '../transition-presets';

const getCopied = () => TransitionLibrary.getCopied();

/** How long the check mark shows after a copy or a paste. */
const DONE_MS = 1200;

interface TransitionCopyProps {
  panelId: string;
  path: string;
  value: TransitionConfig;
}

/**
 * The "⋯" menu in a transition's header: Copy keeps the value and its tab
 * (Easing, Time or Physics), Paste puts both into this control. The copied
 * transition is shared by every transition control on the page, so it
 * pastes into another version or another clip.
 */
export function TransitionCopyMenu({ panelId, path, value }: TransitionCopyProps) {
  const copied = useSyncExternalStore(TransitionLibrary.subscribe, getCopied, getCopied);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const finish = () => {
    setOpen(false);
    clearTimeout(timer.current);
    setDone(true);
    timer.current = setTimeout(() => setDone(false), DONE_MS);
  };

  const copy = () => {
    TransitionLibrary.copyTransition(value, DialStore.getTransitionMode(panelId, path));
    finish();
  };

  const paste = () => {
    if (!copied) return;
    DialStore.updateTransitionMode(panelId, path, copied.mode);
    DialStore.updateValue(panelId, path, structuredClone(copied.value));
    finish();
  };

  return (
    // A click in the header must not open or close the folder.
    <div className="dialkit-copy-actions" ref={menu} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <button
        type="button"
        className="dialkit-copy-button"
        aria-label="Copy or paste"
        title="Copy or paste"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={done ? 2 : 3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {(done ? [ICON_CHECK] : ICON_MORE).map((d) => <path key={d} d={d} />)}
        </svg>
      </button>
      {open && (
        <div className="dialkit-copy-menu" role="menu">
          <button type="button" role="menuitem" onClick={copy}>
            Copy
          </button>
          <button type="button" role="menuitem" disabled={!copied} onClick={paste}>
            {copied ? `Paste ${describeCopied(copied)}` : 'Paste'}
          </button>
        </div>
      )}
    </div>
  );
}
