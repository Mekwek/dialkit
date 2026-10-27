import { useReducer } from 'react';

/**
 * `onExitComplete` for an AnimatePresence whose child can reopen as it finishes
 * exiting. framer-motion before 13.4.6 removes exited children with a state
 * update that can land after a reopen has rendered, dropping the reopened child.
 * Re-rendering the owner in that same update makes AnimatePresence compare its
 * children again, so the reopened child stays mounted.
 */
export function usePresenceResync(): () => void {
  return useReducer((count: number) => count + 1, 0)[1];
}
