import { useSyncExternalStore } from 'react';
import { HintStore } from '../hints';
import { useHints } from '../hooks/useHints';

const subscribe = (listener: () => void) => HintStore.subscribe(listener);
const getTipSeen = () => HintStore.isTipSeen();
const getServerTipSeen = () => true;
const getKey = () => HintStore.getKey();

/**
 * Tells a first-time user what the hint key does: the line at the end of
 * every open panel, until a hint has shown once in that browser. A server
 * render shows nothing. `always` shows it whatever the user did, for a
 * specimen of the line.
 */
export function HintTip({ always = false }: { always?: boolean }) {
  const seen = useSyncExternalStore(subscribe, getTipSeen, getServerTipSeen);
  const key = useSyncExternalStore(subscribe, getKey, getKey);
  if (seen && !always) return null;
  return (
    <p className="dialkit-hint-tip">
      Hold <kbd className="dialkit-hint-tip-key">{key.toUpperCase()}</kbd> over a control to see what it does.
    </p>
  );
}

/**
 * Shows hints in a host's own layout: while it is mounted, holding the hint
 * key over any element with a `data-hint` inside a `.dialkit-root` shows that
 * hint, even where no DialKit control with a hint is drawn. Mark a box the
 * hint should dim with `data-hint-area`. It draws nothing itself.
 */
export function HintTooltip() {
  useHints(true);
  return null;
}
