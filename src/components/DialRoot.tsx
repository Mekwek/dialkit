import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DialStore, PanelConfig } from '../store/DialStore';
import { TimelineStore } from '../store/TimelineStore';
import { isAccordionPanel, pruneOpenFolders } from '../accordion';
import { isDevDefault } from '../env';
import { filterRootPanels, groupRootKey, layoutRootPanels, type PanelRootEntry, type PanelRootFilter } from '../panel-groups';
import { Folder } from './Folder';
import { Panel } from './Panel';
import type { DialVersions } from '../versions/gallery';
import { ShortcutListener } from './ShortcutListener';
import { TimelineToggleButton } from './Timeline/TimelineToggleButton';
import { observePointerFocus } from '../pointer-focus';
import { blockPanelDragClick, capturePanelPointer, releasePanelPointer, getPanelCorner, getPanelDragHandle, getPanelDragOffset, getPanelDragStart, getPanelOriginX, getPanelOriginY, hasPanelDragMoved } from '../panel-drag';

export type DialPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
export type DialMode = 'popover' | 'inline';
export type DialTheme = 'light' | 'dark' | 'system';

interface DialRootProps {
  position?: DialPosition;
  defaultOpen?: boolean;
  mode?: DialMode;
  theme?: DialTheme;
  productionEnabled?: boolean;
  /** How saved versions appear: captured thumbnails (default), or a menu. */
  versions?: DialVersions;
  accordion?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Draws only some panels, so several roots can share one store:
   * `{ ungrouped: true }` the panels without a `group`, `{ groups: ['X'] }`
   * the panels in the listed groups, or both. Without it, every panel.
   */
  include?: PanelRootFilter;
}

export function DialRoot({ position = 'top-right', defaultOpen = true, mode = 'popover', theme = 'system', productionEnabled = isDevDefault, versions = 'thumbnails', accordion = false, onOpenChange, include }: DialRootProps) {
  if (!productionEnabled) return null;
  const [allPanels, setPanels] = useState<PanelConfig[]>([]);
  const [timelineCount, setTimelineCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inline = mode === 'inline';
  const [shellOpen, setShellOpen] = useState(inline || defaultOpen);
  const shellOpenRef = useRef(shellOpen);
  // Open state per group shell, by group name, so a grouped panel asked to
  // open can open the shell that holds it.
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({});

  // Drag state
  const panelRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [activePosition, setActivePosition] = useState(position);
  const lastDragOffset = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; elX: number; elY: number } | null>(null);
  const didDragRef = useRef(false);
  const dragTargetRef = useRef<HTMLElement | null>(null);
  const panelOpenStatesRef = useRef<Map<string, boolean>>(new Map());
  const rootOpenRef = useRef<boolean | null>(null);
  // Panels remount when the root switches between one panel and several, so
  // the root keeps each panel's accordion folder by panel ID.
  const [openFolders, setOpenFolders] = useState<Record<string, string | null>>({});
  const setOpenFolder = (id: string, path: string | null) => setOpenFolders(prev => ({ ...prev, [id]: path }));

  useEffect(() => observePointerFocus(), []);

  // Subscribe to registered editing surfaces. Timeline-backed panels render
  // in DialTimeline, but their presence adds a visibility toggle here.
  useEffect(() => {
    setMounted(true);
    setPanels(DialStore.getPanels('panel'));
    setTimelineCount(TimelineStore.getTimelines().length);

    const unsubscribePanels = DialStore.subscribeGlobal(() => {
      setPanels(DialStore.getPanels('panel'));
    });
    const unsubscribeTimelines = TimelineStore.subscribeGlobal(() => {
      setTimelineCount(TimelineStore.getTimelines().length);
    });

    return () => {
      unsubscribePanels();
      unsubscribeTimelines();
    };
  }, []);

  // The panels this root draws (`include`), and the shells they draw in.
  const includeKey = JSON.stringify(include ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const panels = useMemo(() => filterRootPanels(allPanels, include), [allPanels, includeKey]);
  const slots = useMemo(() => layoutRootPanels(panels, { placeBeside: !inline }), [panels, inline]);
  // The panels without a group, and the open-state keys of every other
  // shell: a group's, or a panel drawn on its own beside the column.
  const ungroupedIds = useMemo(() => panels.filter(panel => !panel.group && !panel.beside).map(panel => panel.id), [panels]);
  const otherKeys = useMemo(() => slots.flatMap(({ entry, beside }) => [
    ...(entry.kind === 'group' ? [entry.key] : entry.kind === 'panel' && entry.panel.beside ? [entry.key] : []),
    ...beside.map(panel => panel.id),
  ]), [slots]);
  const mergedUngrouped = slots.some(({ entry }) => entry.kind === 'shell');

  useEffect(() => {
    setOpenFolders(prev => pruneOpenFolders(prev, allPanels.map(panel => panel.id)));
  }, [allPanels]);

  useEffect(() => {
    const fallbackOpen = inline || defaultOpen;
    const nextStates = new Map<string, boolean>();
    for (const key of [...ungroupedIds, ...otherKeys]) {
      nextStates.set(key, panelOpenStatesRef.current.get(key) ?? DialStore.getPanelOpen(key) ?? fallbackOpen);
    }
    panelOpenStatesRef.current = nextStates;
    rootOpenRef.current = Array.from(nextStates.values()).some(Boolean);
  }, [defaultOpen, inline, ungroupedIds, otherKeys]);

  /** Whether any shell is open: the panels without a group, then every other shell. */
  const anyShellOpen = useCallback((ungroupedOpen?: boolean) => {
    const fallbackOpen = inline || defaultOpen;
    const stateOf = (key: string) => panelOpenStatesRef.current.get(key) ?? fallbackOpen;
    const ungrouped = ungroupedOpen ?? (mergedUngrouped ? shellOpenRef.current : ungroupedIds.some(stateOf));
    return ungrouped || otherKeys.some(stateOf);
  }, [defaultOpen, inline, mergedUngrouped, ungroupedIds, otherKeys]);

  // Watch for panel open/close — snap to corner on open, restore drag position on close
  useEffect(() => {
    if (!panelRef.current || inline) return;
    const observer = new MutationObserver(() => {
      const inners = panelRef.current?.querySelectorAll('.dialkit-panel-inner');
      if (!inners || inners.length === 0) return;
      const collapsed = Array.from(inners).every(
        (el) => el.getAttribute('data-collapsed') === 'true'
      );
      const currentDragOffset = dragOffset;

      if (!collapsed) {
        // Opening — save drag position, determine corner, snap
        if (currentDragOffset) {
          lastDragOffset.current = currentDragOffset;
          setActivePosition(getPanelCorner(position, currentDragOffset));
        } else {
          setActivePosition(position);
        }
        setDragOffset(null);
      } else if (currentDragOffset) {
        lastDragOffset.current = currentDragOffset;
      } else if (lastDragOffset.current) {
        // Closing — restore the dragged position
        setDragOffset(lastDragOffset.current);
      }
    });
    observer.observe(panelRef.current, { subtree: true, attributes: true, attributeFilter: ['data-collapsed'] });
    return () => observer.disconnect();
  }, [inline, dragOffset, position]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const panel = panelRef.current;
    const handle = getPanelDragHandle(e.target, panel);
    if (!panel || !handle) return;

    dragTargetRef.current = handle;
    dragStartRef.current = getPanelDragStart(e.clientX, e.clientY, panel);
    didDragRef.current = false;
    draggingRef.current = true;
    capturePanelPointer(handle, e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current || !dragStartRef.current) return;

    if (!didDragRef.current && !hasPanelDragMoved(dragStartRef.current, e.clientX, e.clientY)) return;
    didDragRef.current = true;

    setDragOffset(getPanelDragOffset(dragStartRef.current, e.clientX, e.clientY));
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    dragStartRef.current = null;
    const dragTarget = dragTargetRef.current;

    if (dragTarget?.hasPointerCapture(e.pointerId)) {
      releasePanelPointer(dragTarget, e.pointerId);
    }

    // If we actually dragged, prevent the click from opening the panel
    if (didDragRef.current) {
      e.stopPropagation();
      if (dragTarget) {
        blockPanelDragClick(dragTarget);
      }
    }
    dragTargetRef.current = null;
  }, []);

  // A shell drawn as one panel reports by its panel id; a group shell by its group key.
  const handlePanelOpenChange = useCallback((key: string, open: boolean) => {
    panelOpenStatesRef.current.set(key, open);
    const nextRootOpen = anyShellOpen();

    if (rootOpenRef.current === nextRootOpen) return;
    rootOpenRef.current = nextRootOpen;
    onOpenChange?.(nextRootOpen);
  }, [anyShellOpen, onOpenChange]);

  // The "DialKit" shell: the panels without a group, or the timeline alone.
  const handleRootOpenChange = useCallback((open: boolean) => {
    setShellOpen(open);
    shellOpenRef.current = open;
    const nextRootOpen = anyShellOpen(open);
    if (rootOpenRef.current === nextRootOpen) return;
    rootOpenRef.current = nextRootOpen;
    onOpenChange?.(nextRootOpen);
  }, [anyShellOpen, onOpenChange]);

  const handleGroupOpenChange = useCallback((group: string, open: boolean) => {
    setGroupOpen(prev => (prev[group] === open ? prev : { ...prev, [group]: open }));
    handlePanelOpenChange(groupRootKey(group), open);
  }, [handlePanelOpenChange]);

  // A panel asked to open from code opens the shell that holds it.
  useEffect(() => DialStore.subscribePanelOpen((id, open) => {
    for (const { entry, beside } of slots) {
      if (beside.some(panel => panel.id === id) || (entry.kind === 'panel' && entry.panel.id === id)) {
        handlePanelOpenChange(id, open);
        return;
      }
      if (entry.kind !== 'panel' && entry.panels.some(panel => panel.id === id)) {
        if (!open) return;
        if (entry.kind === 'shell') handleRootOpenChange(true);
        else handleGroupOpenChange(entry.group, true);
        return;
      }
    }
  }), [slots, handleRootOpenChange, handlePanelOpenChange, handleGroupOpenChange]);

  // Don't render on server
  if (!mounted || typeof window === 'undefined') {
    return null;
  }

  // Don't render if no editing surfaces are registered.
  if (panels.length === 0 && timelineCount === 0) {
    return null;
  }

  const dragStyle = dragOffset ? {
    top: dragOffset.y,
    left: dragOffset.x,
    right: 'auto' as const,
    bottom: 'auto' as const,
  } : undefined;
  const originX = getPanelOriginX(activePosition, dragOffset);
  const originY = getPanelOriginY(activePosition, dragOffset);
  const hasMultiplePanels = panels.length > 1;
  const timelineToggle = timelineCount > 0 ? <TimelineToggleButton /> : null;
  // A panel with `beside` sits next to its shell, toward the middle of the
  // screen: left of a root docked on the right, right of one on the left.
  const besideSide = originX === 'left' ? 'right' : 'left';

  const panelProps = (panel: PanelConfig) => ({
    panel,
    accordion: isAccordionPanel(panel, accordion),
    openFolder: openFolders[panel.id],
    onOpenFolderChange: (path: string | null) => setOpenFolder(panel.id, path),
    versions,
    theme,
  });

  // Every shell is a root folder; the timeline toggle rides in the first one.
  const renderEntry = (entry: PanelRootEntry, first: boolean) => {
    const toggle = first ? timelineToggle : null;
    if (entry.kind === 'panel') {
      return (
        <Panel
          key={entry.key}
          {...panelProps(entry.panel)}
          defaultOpen={inline || defaultOpen}
          inline={inline}
          toolbarExtra={toggle}
          onOpenChange={(open) => handlePanelOpenChange(entry.panel.id, open)}
        />
      );
    }
    // A group panel with groupHeader puts its toolbar in the group's header and has no section.
    const header = entry.kind === 'group' ? entry.panels.find(panel => panel.groupHeader) : undefined;
    const sections = entry.panels.filter(panel => panel !== header);
    return (
      <div key={entry.key} className="dialkit-panel-wrapper" data-merged="true" data-group={entry.kind === 'group' ? entry.group : undefined}>
        <Folder
          title={entry.kind === 'group' ? entry.group : 'DialKit'}
          open={entry.kind === 'group' ? groupOpen[entry.group] ?? (inline || defaultOpen) : shellOpen}
          defaultOpen={inline || defaultOpen}
          isRoot={true}
          inline={inline}
          onOpenChange={entry.kind === 'group' ? (open) => handleGroupOpenChange(entry.group, open) : handleRootOpenChange}
          toolbar={header ? <Panel {...panelProps(header)} variant="toolbar" toolbarExtra={toggle} /> : toggle}
        >
          {sections.map((panel) => (
            <Panel key={panel.id} {...panelProps(panel)} defaultOpen={true} variant="section" />
          ))}
        </Folder>
      </div>
    );
  };

  const panelNodes = slots.flatMap(({ entry, beside }, index) => [
    renderEntry(entry, index === 0),
    ...beside.map((panel) => (
      <Panel
        key={panel.id}
        {...panelProps(panel)}
        beside={besideSide}
        defaultOpen={defaultOpen}
        onOpenChange={(open) => handlePanelOpenChange(panel.id, open)}
      />
    )),
  ]);
  // The merged shell's look (theme.css) once covered the whole root; with
  // several shells, each merged one carries `data-merged` instead.
  const onlyShell = slots.length === 1 && slots[0].beside.length === 0;

  const content = (
  <ShortcutListener>
    <div className="dialkit-root" data-mode={mode} data-theme={theme}>
      <div
        ref={panelRef}
        className="dialkit-panel"
        data-position={inline ? undefined : (dragOffset ? undefined : activePosition)}
        data-origin-x={inline ? undefined : originX}
        data-origin-y={inline ? undefined : originY}
        data-mode={mode}
        data-multiple={hasMultiplePanels && onlyShell ? 'true' : undefined}
        data-stacked={!inline && slots.length > 1 ? 'true' : undefined}
        data-accordion={accordion ? 'true' : undefined}
        style={dragStyle}
        onPointerDown={!inline ? handlePointerDown : undefined}
        onPointerMove={!inline ? handlePointerMove : undefined}
        onPointerUp={!inline ? handlePointerUp : undefined}
        onPointerCancel={!inline ? handlePointerUp : undefined}
      >
        {panels.length === 0 ? (
          <div className="dialkit-panel-wrapper">
            <Folder
              title="DialKit"
              open={shellOpen}
              defaultOpen={inline || defaultOpen}
              isRoot={true}
              inline={inline}
              onOpenChange={handleRootOpenChange}
              toolbar={timelineToggle}
            >
              <div className="dialkit-timeline-toolkit-only">Timeline</div>
            </Folder>
          </div>
        ) : (
          panelNodes
        )}
      </div>
    </div>
  </ShortcutListener>
  );

  if (inline) {
    return content;
  }

  return createPortal(content, document.body);
}
