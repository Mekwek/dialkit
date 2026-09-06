import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DialStore, PanelConfig } from '../store/DialStore';
import { TimelineStore } from '../store/TimelineStore';
import { isDevDefault } from '../env';
import { groupRootKey, partitionPanels } from '../panel-groups';
import { Folder } from './Folder';
import { Panel } from './Panel';
import { ShortcutListener } from './ShortcutListener';
import { TimelineToggleButton } from './Timeline/TimelineToggleButton';
import { blockPanelDragClick, capturePanelPointer, releasePanelPointer, getPanelCorner, getPanelDragHandle, getPanelDragOffset, getPanelDragStart, getPanelOriginX, getPanelOriginY, hasPanelDragMoved } from '../panel-drag';

export type DialPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
export type DialMode = 'popover' | 'inline';
export type DialTheme = 'light' | 'dark' | 'system';

/**
 * First-level folder behavior. `'independent'` (default) keeps each top-level
 * folder open state isolated. `'accordion'` allows only one top-level folder
 * open at a time. Nested folders are unaffected.
 */
export type FolderMode = 'independent' | 'accordion';

interface DialRootProps {
  position?: DialPosition;
  defaultOpen?: boolean;
  mode?: DialMode;
  theme?: DialTheme;
  productionEnabled?: boolean;
  /** See {@link FolderMode}. */
  folderMode?: FolderMode;
  onOpenChange?: (open: boolean) => void;
}

export function DialRoot({ position = 'top-right', defaultOpen = true, mode = 'popover', theme = 'system', productionEnabled = isDevDefault, folderMode = 'independent', onOpenChange }: DialRootProps) {
  if (!productionEnabled) return null;
  const [panels, setPanels] = useState<PanelConfig[]>([]);
  const [timelineCount, setTimelineCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inline = mode === 'inline';
  const [shellOpen, setShellOpen] = useState(inline || defaultOpen);
  // Controlled open state per merged group shell, keyed by group name, so a
  // member panel's setOpen(true) can reveal the shell that contains it.
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

  // Root shells: one per ungrouped panel, plus one merged shell per distinct
  // group. Aggregate open-state tracking works over their keys (panel ids and
  // synthetic `group:X` keys) because a grouped panel's open/close is
  // reported at the shell level, not per panel. Both the seeding effect and
  // `handlePanelOpenChange` read this list.
  const rootEntries = useMemo(() => partitionPanels(panels), [panels]);
  const rootKeys = useMemo(() => rootEntries.map((entry) => entry.key), [rootEntries]);

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

  useEffect(() => {
    const fallbackOpen = inline || defaultOpen;
    const nextStates = new Map<string, boolean>();
    for (const key of rootKeys) {
      // Ungrouped keys are panel ids, so the store's own open state (a
      // `defaultCollapsed` option) seeds them; synthetic group keys fall
      // back to the root default.
      nextStates.set(key, panelOpenStatesRef.current.get(key) ?? DialStore.getPanelOpen(key) ?? fallbackOpen);
    }
    panelOpenStatesRef.current = nextStates;
    rootOpenRef.current = Array.from(nextStates.values()).some(Boolean);
  }, [defaultOpen, inline, rootKeys]);

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

  const handlePanelOpenChange = useCallback((panelId: string, open: boolean) => {
    panelOpenStatesRef.current.set(panelId, open);
    const fallbackOpen = inline || defaultOpen;
    const nextRootOpen = rootKeys.some((key) => (
      panelOpenStatesRef.current.get(key) ?? fallbackOpen
    ));

    if (rootOpenRef.current === nextRootOpen) return;
    rootOpenRef.current = nextRootOpen;
    onOpenChange?.(nextRootOpen);
  }, [defaultOpen, inline, onOpenChange, rootKeys]);

  const handleRootOpenChange = useCallback((open: boolean) => {
    setShellOpen(open);
    if (rootOpenRef.current === open) return;
    rootOpenRef.current = open;
    onOpenChange?.(open);
  }, [onOpenChange]);

  const handleGroupOpenChange = useCallback((group: string, open: boolean) => {
    setGroupOpen((prev) => (prev[group] === open ? prev : { ...prev, [group]: open }));
    handlePanelOpenChange(groupRootKey(group), open);
  }, [handlePanelOpenChange]);

  // Programmatic open requests: an ungrouped panel reports its own state; a
  // grouped panel asking to open reveals the merged shell that contains it
  // (the section itself is already store-driven inside Panel).
  useEffect(() => DialStore.subscribePanelOpen((id, open) => {
    const panel = panels.find(p => p.id === id);
    if (!panel) return;
    if (panel.group) {
      if (open) handleGroupOpenChange(panel.group, true);
    } else {
      handlePanelOpenChange(id, open);
    }
  }), [panels, handleGroupOpenChange, handlePanelOpenChange]);

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
  const timelineToggle = timelineCount > 0 ? <TimelineToggleButton /> : null;

  // Group-aware rendering. Panels with no group render as independent
  // standalone shells (historical behavior — the timeline toggle rides along
  // in their toolbar). Panels sharing a non-empty group render as collapsible
  // sections inside ONE merged shell, emitted at the position of that group's
  // first panel so DOM order tracks registration order. Group shells do NOT
  // get the timeline toggle (grouped-shell + timeline coexistence is a
  // documented follow-up, not exercised here).
  const panelNodes = rootEntries.map((entry) => {
    if (entry.kind === 'panel') {
      const panel = entry.panel;
      return (
        <Panel
          key={entry.key}
          panel={panel}
          defaultOpen={inline || defaultOpen}
          inline={inline}
          folderMode={folderMode}
          toolbarExtra={timelineToggle}
          onOpenChange={(open) => handlePanelOpenChange(panel.id, open)}
        />
      );
    }
    const { group } = entry;
    return (
      <div key={entry.key} className="dialkit-panel-wrapper" data-group={group}>
        <Folder
          title={group}
          open={groupOpen[group] ?? (inline || defaultOpen)}
          defaultOpen={inline || defaultOpen}
          isRoot
          inline={inline}
          panelHeightOffset={2}
          onOpenChange={(open) => handleGroupOpenChange(group, open)}
        >
          {entry.panels.map((p) => (
            <Panel
              key={p.id}
              panel={p}
              variant="section"
              defaultOpen={true}
              folderMode={folderMode}
            />
          ))}
        </Folder>
      </div>
    );
  });

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
