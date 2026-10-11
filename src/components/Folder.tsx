import { activateOnKey } from '../control-keyboard';
import { createPanelSectionTransition, observePanelHeader, observeScrollFades } from '../panel-size';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ICON_CLOSE, ICON_PANEL, ICON_CHEVRON, ICON_RESET } from '../icons';
import { useHint } from './Hint';

interface FolderProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  isRoot?: boolean;
  inline?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  toolbar?: ReactNode;
  /** Shows a reset icon in a section header. See ControlMeta.reset. */
  onReset?: () => void;
  /** True when a value inside differs from its default. */
  changed?: boolean;
  /** Short text on the right of a section header, left of the arrow. */
  meta?: ReactNode;
  /** Buttons on the right of a section header, left of the arrow. */
  actions?: ReactNode;
  /**
   * A short sentence about the section. It shows while the hint key is held
   * over the header. A panel's own header, which closes the panel, has one
   * by default.
   */
  hint?: string;
}

/** The hint of a panel's own header: clicking it closes the panel. */
const PANEL_HEADER_HINT = 'Closes the panel to a small button. Click the button to open it again.';

export function Folder({ title, children, open, defaultOpen = true, isRoot = false, inline = false, onOpenChange, toolbar, onReset, changed, meta, actions, hint }: FolderProps) {
  const { hintRow } = useHint(hint ?? (isRoot && !inline ? PANEL_HEADER_HINT : undefined));
  const [localOpen, setIsOpen] = useState(defaultOpen);
  const isOpen = open ?? localOpen;
  const isCollapsed = !isOpen;
  // A panel shown as a section of a group passes its toolbar. Its header
  // and toolbar stay pinned under the panel title while the panel scrolls.
  const isSection = !isRoot && !!toolbar;
  const rootRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const sectionTransition = useRef<ReturnType<typeof createPanelSectionTransition> | null>(null);
  // A section keeps its controls while it folds shut, then drops them.
  const [sectionMounted, setSectionMounted] = useState(isOpen);

  useLayoutEffect(() => {
    if (!isSection || !sectionRef.current) return;
    const transition = createPanelSectionTransition(sectionRef.current, isOpen, setSectionMounted);
    sectionTransition.current = transition;
    return () => { transition.destroy(); sectionTransition.current = null; };
  }, [isSection]);

  useLayoutEffect(() => { sectionTransition.current?.setOpen(isOpen); }, [isOpen]);

  // Section headers pin below the panel title: publish its height.
  // Section headers pin below the panel title: publish its height.
  // Section headers pin below the panel title: publish its height. The scroll
  // fades need a script only where CSS scroll-state queries are missing.
  useEffect(() => {
    if (!isRoot || !rootRef.current) return;
    const stopHeader = observePanelHeader(rootRef.current);
    const stopFades = observeScrollFades(rootRef.current);
    return () => {
      stopHeader();
      stopFades();
    };
  }, [isRoot]);

  const handleToggle = () => {
    if (inline && isRoot) return;
    const next = !isOpen;
    setIsOpen(next);
    onOpenChange?.(next);
  };

  // A mouse click takes the focus off the header. Left on it, the next key
  // press (the hint key, D) shows the focus ring, and Enter or Space toggles
  // the folder again. Keyboard use is unchanged: Enter and Space toggle
  // through onKeyDown, and a click they cause has no mouse (detail 0).
  const handleHeaderClick = (event: MouseEvent<HTMLDivElement>) => {
    handleToggle();
    const focused = document.activeElement;
    if (event.detail > 0 && focused instanceof HTMLElement && event.currentTarget.contains(focused)) focused.blur();
  };

  const folderContent = (
    <div
      ref={isRoot ? rootRef : isSection ? sectionRef : undefined}
      className={`dialkit-folder ${isRoot ? 'dialkit-folder-root' : isSection ? 'dialkit-folder-section' : ''}`}
      data-open={String(isOpen)}
    >
      <div className={`dialkit-folder-header ${isRoot ? 'dialkit-panel-header' : ''}`} data-reset={!isRoot && onReset ? '' : undefined} data-actions={!isRoot && actions ? '' : undefined} onClick={handleHeaderClick}>
        <div className="dialkit-folder-header-top" {...hintRow} role={inline && isRoot ? undefined : "button"} tabIndex={inline && isRoot ? undefined : 0} aria-label={title} aria-expanded={isOpen} onKeyDown={(e) => activateOnKey(e, handleToggle)}>
          {isRoot ? (
            isOpen && (
              <div className="dialkit-folder-title-row">
                <span className="dialkit-folder-title dialkit-folder-title-root">
                  {title}
                </span>
              </div>
            )
          ) : (
            <div className="dialkit-folder-title-row">
              <span className="dialkit-folder-title">
                {title}
              </span>
            </div>
          )}
          {isRoot && !inline && (
            <svg
              className="dialkit-panel-icon"
              viewBox={isOpen ? '0 0 24 24' : '0 0 16 16'}
              fill="none"
            >
              {/* An open panel shows a close icon; a closed one, the panel icon. */}
              {isOpen ? (
                <path d={ICON_CLOSE} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <>
                  <path opacity="0.5" d={ICON_PANEL.path} fill="currentColor"/>
                  {ICON_PANEL.circles.map((c, i) => (
                    <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill="currentColor" stroke="currentColor" strokeWidth="1.25"/>
                  ))}
                </>
              )}
            </svg>
          )}
          {!isRoot && meta != null && <span className="dialkit-folder-meta">{meta}</span>}
          {!isRoot && (
            <motion.svg
              className="dialkit-folder-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ type: 'spring', visualDuration: 0.35, bounce: 0.15 }}
            >
              <path d={ICON_CHEVRON} />
            </motion.svg>
          )}
        </div>

        {/* The reset sits right of the title, but outside the header
            button: a button inside a button cannot be reached. A hidden
            copy of the title, in the title's own font, sets its place. */}
        {!isRoot && onReset && (
          <div className="dialkit-section-reset-line">
            <span className="dialkit-folder-title">
              <span className="dialkit-section-reset-spacer" aria-hidden="true">
                {title}
              </span>
              <button
                type="button"
                className="dialkit-section-reset"
                aria-label={`Reset ${title}`}
                title="Reset"
                data-changed={changed || undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  onReset();
                }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {ICON_RESET.map((d) => <path key={d} d={d} />)}
                </svg>
              </button>
            </span>
          </div>
        )}

        {/* Outside the header button too, at the right end. */}
        {!isRoot && actions && <div className="dialkit-folder-actions">{actions}</div>}

        {isSection ? (
          <div className="dialkit-panel-section-toolbar-clip">
            <div className="dialkit-panel-section-toolbar" data-hint-align="" onClick={(e) => e.stopPropagation()}>
              {toolbar}
            </div>
          </div>
        ) : isRoot && toolbar && isOpen ? (
          <div className="dialkit-panel-toolbar" data-hint-align="" onClick={(e) => e.stopPropagation()}>
            {toolbar}
          </div>
        ) : null}
      </div>

      {isSection ? (
        // The fold animates this box from panel-size.ts, in step with the
        // panel's height.
        <div className="dialkit-folder-content">
          <div className="dialkit-folder-inner">{isOpen || sectionMounted ? children : null}</div>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              className="dialkit-folder-content"
              initial={isRoot ? undefined : { height: 0 }}
              animate={isRoot ? undefined : { height: 'auto' }}
              exit={isRoot ? undefined : { height: 0 }}
              transition={isRoot ? undefined : { type: 'spring', visualDuration: 0.35, bounce: 0.1 }}
            >
              <div className="dialkit-folder-inner">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );

  if (isRoot) {
    if (inline) {
      return (
        <div className="dialkit-panel-inner dialkit-panel-inline">
          {folderContent}
        </div>
      );
    }

    const panelStyle = isOpen
      ? { width: 280, height: 'auto' as const, maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto' as const, borderRadius: 14, boxShadow: 'var(--dial-shadow)', cursor: undefined as string | undefined }
      : { width: 42, height: 42, borderRadius: '50%', boxSizing: 'border-box' as const, boxShadow: 'var(--dial-shadow-collapsed)', overflow: 'hidden' as const, cursor: 'pointer' as const };

    return (
      <motion.div
        className="dialkit-panel-inner"
        tabIndex={-1}
        style={panelStyle}
        onClick={!isOpen ? handleToggle : undefined}
        data-collapsed={isCollapsed}
        whileTap={!isOpen ? { scale: 0.9 } : undefined}
        transition={{ type: 'spring', visualDuration: 0.15, bounce: 0.3 }}
      >
        {folderContent}
      </motion.div>
    );
  }

  return folderContent;
}
