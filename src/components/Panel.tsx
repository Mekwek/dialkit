import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DialStore, PanelConfig } from '../store/DialStore';
import { buildCopyInstruction } from '../copy-instruction';
import { ICON_CLIPBOARD, ICON_CHECK, ICON_ADD_PRESET } from '../icons';
import { ControlRenderer } from './ControlRenderer';
import { Folder } from './Folder';
import { PresetManager } from './PresetManager';

interface PanelProps {
  panel: PanelConfig;
  defaultOpen?: boolean;
  inline?: boolean;
  /**
   * How first-level (top-level) folders behave. `'independent'` (default) keeps
   * each folder's open state isolated — the historical behavior. `'accordion'`
   * allows only one top-level folder open at a time; opening one closes the
   * other. Nested folders (depth > 0) are unaffected in either mode.
   */
  folderMode?: 'independent' | 'accordion';
  onOpenChange?: (open: boolean) => void;
  /**
   * How this panel renders. `'root'` (default) is the historical standalone
   * shell — its own collapsible bubble with the panel-inner sizing. `'section'`
   * renders the panel as a plain nested folder with no bubble, so several
   * panels can be stacked as collapsible sections inside one shared merged
   * shell (see `DialRoot` group rendering).
   */
  variant?: 'root' | 'section';
  toolbarExtra?: ReactNode;
}

export function Panel({ panel, defaultOpen = true, inline = false, folderMode = 'independent', onOpenChange, variant = 'root', toolbarExtra }: PanelProps) {
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(copyTimeout.current), []);
  const subscribe = useCallback(
    (callback: () => void) => DialStore.subscribe(panel.id, callback),
    [panel.id]
  );
  const getSnapshot = useCallback(
    () => DialStore.getValues(panel.id),
    [panel.id]
  );
  const getOpenSnapshot = useCallback(
    () => DialStore.getPanelOpen(panel.id),
    [panel.id]
  );

  // Section de-nesting: when a section panel's controls are exactly one folder,
  // that folder is visually redundant with the section header (same single
  // collapse). Render the folder's CHILDREN directly under the section instead.
  // This is purely a render concern — control `path`s (and therefore every
  // store value, bridge handler, and visibleWhen rule) are unchanged.
  const hoistedFolder =
    variant === 'section' &&
    panel.controls.length === 1 &&
    panel.controls[0].type === 'folder'
      ? panel.controls[0]
      : null;
  const topLevelControls = hoistedFolder ? (hoistedFolder.children ?? []) : panel.controls;

  // Accordion coordination for first-level folders. Holds the path of the
  // currently-open top-level folder (or null). Initialized to the first
  // top-level folder DialKit would have opened, so the one-open invariant
  // holds from first paint even when several groups default open.
  const [openFolder, setOpenFolder] = useState<string | null>(() => {
    if (folderMode !== 'accordion') return null;
    const first = topLevelControls.find(
      (c) => c.type === 'folder' && (c.defaultOpen ?? true)
    );
    return first?.path ?? null;
  });
  const accordion = folderMode === 'accordion';

  // Subscribe to panel value changes
  const values = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // The store owns open/collapsed state so it can be driven programmatically.
  const storeOpen = useSyncExternalStore(subscribe, getOpenSnapshot, getOpenSnapshot);
  const isOpen = storeOpen ?? defaultOpen;

  useEffect(() => {
    DialStore.initPanelOpen(panel.id, defaultOpen);
  }, [panel.id, defaultOpen]);

  const presets = DialStore.getPresets(panel.id);
  const activePresetId = DialStore.getActivePresetId(panel.id);

  const handleAddPreset = () => {
    const nextNum = presets.length + 2;
    DialStore.savePreset(panel.id, `Version ${nextNum}`);
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(buildCopyInstruction('useDialKit', panel.name, values)); }
    catch { return; }
    setCopied(true);
    clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 1500);
  };

  const handleAccordionToggle = useCallback((path: string, next: boolean) => {
    setOpenFolder(next ? path : null);
  }, []);

  // The store owns the open state; DialRoot's aggregate `onOpenChange` only
  // fires for root panels (sections are shell-level, not panel-level).
  const handleOpenChange = useCallback((open: boolean) => {
    DialStore.setPanelOpen(panel.id, open);
    onOpenChange?.(open);
  }, [onOpenChange, panel.id]);

  const renderControls = () => (
    <ControlRenderer
      panelId={panel.id}
      controls={topLevelControls}
      values={values}
      animateControls
      accordionOpenPath={accordion ? openFolder : undefined}
      onAccordionToggle={accordion ? handleAccordionToggle : undefined}
    />
  );

  const iconTransition = { type: 'spring' as const, visualDuration: 0.4, bounce: 0.1 };

  const toolbar = (
    <>
      <motion.button
        className="dialkit-toolbar-add"
        onClick={handleAddPreset}
        title="Add preset"
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', visualDuration: 0.15, bounce: 0.3 }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {ICON_ADD_PRESET.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </svg>
      </motion.button>

      <PresetManager
        panelId={panel.id}
        presets={presets}
        activePresetId={activePresetId}
        onAdd={handleAddPreset}
      />

      <motion.button
        className="dialkit-toolbar-add"
        onClick={handleCopy}
        title="Copy parameters"
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', visualDuration: 0.15, bounce: 0.3 }}
      >
        <span style={{ position: 'relative', width: 16, height: 16 }}>
          <AnimatePresence initial={false} mode="wait">
            {copied ? (
              <motion.svg
                key="check"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', inset: 0, width: 16, height: 16, color: 'var(--dial-text-label)' }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.08 }}
              >
                <path d={ICON_CHECK} />
              </motion.svg>
            ) : (
              <motion.svg
                key="clipboard"
                viewBox="0 0 24 24"
                fill="none"
                style={{ position: 'absolute', inset: 0, width: 16, height: 16, color: 'var(--dial-text-label)' }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.08 }}
              >
                <path d={ICON_CLIPBOARD.board} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d={ICON_CLIPBOARD.sparkle} fill="currentColor"/>
                <path d={ICON_CLIPBOARD.body} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </motion.svg>
            )}
          </AnimatePresence>
        </span>
      </motion.button>

      {toolbarExtra}
    </>
  );

  // Section variant: render as a plain nested folder (no bubble, no panel-inner
  // sizing) so the parent merged shell owns the outer chrome. The preset/copy
  // toolbar moves inside the section body; host CSS can hide it per-section.
  if (variant === 'section') {
    return (
      <div className="dialkit-panel-section" data-panel-name={panel.name}>
        <Folder title={panel.name} open={isOpen} onOpenChange={handleOpenChange}>
          <div className="dialkit-panel-section-toolbar" onClick={(e) => e.stopPropagation()}>
            {toolbar}
          </div>
          {renderControls()}
        </Folder>
      </div>
    );
  }

  return (
    <div className="dialkit-panel-wrapper">
      <Folder title={panel.name} open={isOpen} isRoot={true} inline={inline} onOpenChange={handleOpenChange} toolbar={toolbar}>
        {renderControls()}
      </Folder>
    </div>
  );
}
