import { activateOnKey } from '../control-keyboard';
import { createPanelSectionTransition, measurePanelHeight, observePanelHeader, observeScrollFades } from '../panel-size';
import { useState, useRef, useEffect, useLayoutEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ICON_CLOSE, ICON_PANEL, ICON_CHEVRON, ICON_RESET } from '../icons';
import { HINTS } from '../hints';
import { useHints } from '../hooks/useHints';

interface FolderProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  isRoot?: boolean;
  inline?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  toolbar?: ReactNode;
  /** Short text at the end of a nested folder's title row, such as the preset in use. */
  meta?: string;
  /** Buttons beside the title of a nested folder, such as a transition's copy and paste. */
  actions?: ReactNode;
  panelHeightOffset?: number;
  /** Shows a reset button after the title, visible while `changed` is true. */
  onReset?: () => void;
  changed?: boolean;
  hint?: string;
}

export function Folder({ title, children, open, defaultOpen = true, isRoot = false, inline = false, onOpenChange, toolbar, meta, actions, panelHeightOffset = 0, onReset, changed = false, hint }: FolderProps) {
  // A panel's own header, which closes the panel, has a hint by default.
  const headerHint = hint ?? (isRoot && !inline ? HINTS.panel : undefined);
  useHints(!!headerHint || (!isRoot && !!onReset));
  const [localOpen, setIsOpen] = useState(defaultOpen);
  const isOpen = open ?? localOpen;
  const isCollapsed = !isOpen;
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const sectionTransition = useRef<ReturnType<typeof createPanelSectionTransition> | null>(null);
  const isSection = !isRoot && !!toolbar;
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);

  useLayoutEffect(() => {
    if (!isSection || !sectionRef.current) return;
    const transition = createPanelSectionTransition(sectionRef.current, isOpen);
    sectionTransition.current = transition;
    return () => { transition.destroy(); sectionTransition.current = null; };
  }, [isSection]);

  useLayoutEffect(() => { sectionTransition.current?.setOpen(isOpen); }, [isOpen]);

  useEffect(() => {
    if (!isRoot) return;
    const onResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isRoot]);

  // Track content height for explicit panel sizing (no height: 'auto')
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const stopHeader = observePanelHeader(el);
    const stopFades = observeScrollFades(el);
    const ro = new ResizeObserver(() => {
      if (isOpen) {
        const h = measurePanelHeight(el);
        setContentHeight(prev => prev === h ? prev : h);
      }
    });
    ro.observe(el);
    return () => { ro.disconnect(); stopHeader(); stopFades(); };
  }, [isOpen]);

  const handleToggle = () => {
    if (inline && isRoot) return;
    const next = !isOpen;
    setIsOpen(next);
    onOpenChange?.(next);
  };

  const folderContent = (
    <div
      ref={isRoot ? contentRef : isSection ? sectionRef : undefined}
      className={`dialkit-folder ${isRoot ? 'dialkit-folder-root' : toolbar ? 'dialkit-folder-section' : ''}`}
      data-open={String(isOpen)}
    >
      <div className={`dialkit-folder-header ${isRoot ? 'dialkit-panel-header' : ''}`} onClick={handleToggle}>
        <div ref={headerRef} className="dialkit-folder-header-top" data-hint={headerHint} role={inline && isRoot ? undefined : "button"} tabIndex={inline && isRoot ? undefined : 0} aria-label={!isRoot && meta ? `${title}, ${meta}` : title} aria-expanded={isOpen} onKeyDown={(e) => activateOnKey(e, handleToggle)}>
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
              {meta && <span className="dialkit-folder-meta">{meta}</span>}
            </div>
          )}
          {isRoot && !inline && (
            <svg
              className="dialkit-panel-icon"
              viewBox={isOpen ? "0 0 24 24" : "0 0 16 16"}
              fill="none"
            >
              {isOpen ? <path d={ICON_CLOSE} stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : <>
              <path opacity="0.5" d={ICON_PANEL.path} fill="currentColor"/>
              {ICON_PANEL.circles.map((c, i) => (
                <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill="currentColor" stroke="currentColor" strokeWidth="1.25"/>
              ))}
              </>}
            </svg>
          )}
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

        {!isRoot && onReset && (
          <button
            type="button"
            className="dialkit-folder-reset"
            aria-label={`Reset ${title}`}
            data-hint={HINTS.sectionReset}
            data-changed={String(changed)}
            onClick={(e) => {
              e.stopPropagation();
              // The button hides once the values are back; keep focus in the header.
              headerRef.current?.focus();
              onReset();
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICON_RESET.map((d, i) => <path key={i} d={d} />)}
            </svg>
          </button>
        )}
        {actions && !isRoot && (
          <div className="dialkit-folder-actions">{actions}</div>
        )}

        {isSection ? (
          <div className="dialkit-panel-section-toolbar-clip">
            <div className="dialkit-panel-section-toolbar" onClick={(e) => e.stopPropagation()}>{toolbar}</div>
          </div>
        ) : toolbar && isOpen ? (
          <div className="dialkit-panel-toolbar" onClick={(e) => e.stopPropagation()}>{toolbar}</div>
        ) : null}
      </div>

      {isSection ? (
        <div className="dialkit-folder-content">
          <div className="dialkit-folder-inner">{children}</div>
        </div>
      ) : <AnimatePresence initial={false}>
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
      </AnimatePresence>}
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
      ? { width: 280, height: contentHeight !== undefined ? Math.min(contentHeight + panelHeightOffset, windowHeight - 32) : 'auto' as const, borderRadius: 14, boxShadow: 'var(--dial-shadow)', cursor: undefined as string | undefined, overflowY: 'auto' as const }
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
