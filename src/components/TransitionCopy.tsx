import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ICON_CHECK, ICON_COPY, ICON_MORE, ICON_PASTE } from '../icons';
import { DialStore } from '../store/DialStore';
import type { TransitionConfig } from '../store/DialStore';
import { TransitionLibrary } from '../store/TransitionLibrary';
import { describeCopied } from '../transition-presets';
import { GROUP_MOTION, ICON_MOTION } from './action-motion';
import { useHint } from './Hint';

const getCopied = () => TransitionLibrary.getCopied();

/** How long the check mark shows after a copy or a paste. */
const DONE_MS = 1200;

/** The hints of the dots and of the two actions they open. */
const DOTS_HINT = 'Shows copy and paste for this transition.';
const COPY_HINT = 'Copies this transition and its tab (Easing, Time or Physics).';
const PASTE_HINT = 'Pastes the transition you copied, with its tab.';

interface TransitionCopyProps {
  panelId: string;
  path: string;
  value: TransitionConfig;
}

function Icon({ paths, width = 2 }: { paths: string[]; width?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/**
 * The "⋯" in a transition's header, which opens copy and paste like the
 * version menu's dots: hovering or clicking them pops the two icons out to
 * their left, one after another, and leaving the group closes it. Copy keeps
 * the value and its tab (Easing, Time or Physics), paste puts both into this
 * control. The copied transition is shared by every transition control on
 * the page, so it pastes into another version or another clip. After either,
 * the dots show a check for a moment.
 */
export function TransitionCopyMenu({ panelId, path, value }: TransitionCopyProps) {
  const copied = useSyncExternalStore(TransitionLibrary.subscribe, getCopied, getCopied);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const { hintRow: dotsHint } = useHint(DOTS_HINT);
  const { hintRow: copyHint } = useHint(COPY_HINT);
  const { hintRow: pasteHint } = useHint(copied ? `${PASTE_HINT} Now: ${describeCopied(copied)}.` : PASTE_HINT);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

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
    // The control animates a curve pasted onto a curve; anything else
    // switches at once.
    if (!TransitionLibrary.pasteInto(panelId, path)) {
      DialStore.updateTransitionMode(panelId, path, copied.mode);
      DialStore.updateValue(panelId, path, structuredClone(copied.value));
    }
    finish();
  };

  return (
    // A click in the header must not open or close the folder.
    <div
      className="dialkit-copy-actions"
      data-open={open || undefined}
      // A touch ends with a pointer leave: only a mouse closes the group by
      // leaving it. A touch closes it by focusing elsewhere.
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setOpen(false); }}
      // Focus leaving closes the group, unless the pointer is still over it:
      // a copy or paste removes its own button, and that is no reason to
      // close a group the pointer has just opened again.
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null) || e.currentTarget.matches(':hover')) return;
        setOpen(false);
      }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="dialkit-copy-group" variants={GROUP_MOTION} initial="hidden" animate="shown" exit="hidden">
            <motion.button type="button" variants={ICON_MOTION} className="dialkit-copy-action" aria-label="Copy transition" onClick={copy} {...copyHint}>
              <Icon paths={ICON_COPY} />
            </motion.button>
            <motion.button type="button" variants={ICON_MOTION} className="dialkit-copy-action" aria-label="Paste transition" disabled={!copied} onClick={paste} {...pasteHint}>
              <Icon paths={ICON_PASTE} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        className="dialkit-copy-button"
        aria-label="Copy or paste"
        aria-expanded={open}
        {...dotsHint}
        onPointerEnter={(e) => {
          dotsHint.onPointerEnter?.(e);
          if (e.pointerType === 'mouse') setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
      >
        <Icon paths={done ? [ICON_CHECK] : ICON_MORE} width={done ? 2 : 3} />
      </button>
    </div>
  );
}
