import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DialStore, PanelConfig } from '../store/DialStore';
import { TimelineStore } from '../store/TimelineStore';
import { isDevDefault } from '../env';
import { Folder } from './Folder';
import { Panel } from './Panel';
import { ShortcutListener } from './ShortcutListener';
import { TimelineToggleButton } from './Timeline/TimelineToggleButton';
import { blockPanelDragClick, getPanelDragHandle, getPanelDragOffset, getPanelDragStart, getPanelOriginX, hasPanelDragMoved } from '../panel-drag';

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
  /**
   * Restrict which registered panels this root renders. Lets multiple
   * `DialRoot` instances split the same store — e.g. one popover root showing
   * only ungrouped panels, another inline root showing only a named group.
   * - `{ ungrouped: true }` — render only panels with no `group`.
   * - `{ groups: ['X'] }` — render only panels in the listed groups.
   * Both may be combined (OR). Omit to render every panel (the default).
   */
  include?: { groups?: string[]; ungrouped?: boolean };
}

export function DialRoot({ position = 'top-right', defaultOpen = true, mode = 'popover', theme = 'system', productionEnabled = isDevDefault, folderMode = 'independent', onOpenChange, include }: DialRootProps) {
  if (!productionEnabled) return null;
  const [panels, setPanels] = useState<PanelConfig[]>([]);
  const [timelineCount, setTimelineCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inline = mode === 'inline';

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

  // Optionally restrict which panels this root renders (lets multiple roots
  // split the same store — see the `include` prop). An include-filtered root
  // may legitimately show nothing, which is why the empty-check below uses
  // `visiblePanels.length` rather than the store's full `panels.length`.
  const visiblePanels = useMemo(() => {
    if (!include) return panels;
    return panels.filter((p) =>
      (include.ungrouped === true && !p.group) ||
      (!!include.groups && !!p.group && include.groups.includes(p.group)));
  }, [panels, include]);

  // Aggregate open-state tracking works over "root keys" — one per ungrouped
  // panel, plus one synthetic `group:X` key per distinct group — because a
  // grouped panel's open/close is reported at the merged shell level, not per
  // panel. Both the seeding effect and `handlePanelOpenChange` read this list.
  const rootKeys = useMemo(() => {
    const keys: string[] = [];
    const seenGroups = new Set<string>();
    for (const panel of visiblePanels) {
      if (!panel.group) {
        keys.push(panel.id);
      } else if (!seenGroups.has(panel.group)) {
        seenGroups.add(panel.group);
        keys.push(`group:${panel.group}`);
      }
    }
    return keys;
  }, [visiblePanels]);

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
      nextStates.set(key, panelOpenStatesRef.current.get(key) ?? fallbackOpen);
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
          const bubbleCenterX = currentDragOffset.x + 21;
          const midX = window.innerWidth / 2;
          setActivePosition(bubbleCenterX < midX ? 'top-left' : 'top-right');
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
    handle.setPointerCapture(e.pointerId);
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
      dragTarget.releasePointerCapture(e.pointerId);
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
    if (rootOpenRef.current === open) return;
    rootOpenRef.current = open;
    onOpenChange?.(open);
  }, [onOpenChange]);

  // Don't render on server
  if (!mounted || typeof window === 'undefined') {
    return null;
  }

  // Don't render if no editing surfaces are registered. An include-filtered
  // root may legitimately show nothing even when other panels exist elsewhere.
  if (visiblePanels.length === 0 && timelineCount === 0) {
    return null;
  }

  const dragStyle = dragOffset ? {
    top: dragOffset.y,
    left: dragOffset.x,
    right: 'auto' as const,
    bottom: 'auto' as const,
  } : undefined;
  const originX = getPanelOriginX(activePosition, dragOffset);
  const timelineToggle = timelineCount > 0 ? <TimelineToggleButton /> : null;

  // Group-aware rendering. Panels with no group render as independent
  // standalone shells (historical behavior — the timeline toggle rides along
  // in their toolbar). Panels sharing a non-empty group render as collapsible
  // sections inside ONE merged shell, emitted at the position of that group's
  // first panel so DOM order tracks registration order. Group shells do NOT
  // get the timeline toggle (grouped-shell + timeline coexistence is a
  // documented follow-up, not exercised here).
  const renderedGroups = new Set<string>();
  const panelNodes = visiblePanels.map((panel) => {
    const group = panel.group;
    if (!group) {
      return (
        <Panel
          key={panel.id}
          panel={panel}
          defaultOpen={inline || defaultOpen}
          inline={inline}
          folderMode={folderMode}
          toolbarExtra={timelineToggle}
          onOpenChange={(open) => handlePanelOpenChange(panel.id, open)}
        />
      );
    }
    if (renderedGroups.has(group)) return null;
    renderedGroups.add(group);
    const sectionPanels = visiblePanels.filter((p) => p.group === group);
    return (
      <div key={`group:${group}`} className="dialkit-panel-wrapper" data-group={group}>
        <Folder
          title={group}
          defaultOpen={inline || defaultOpen}
          isRoot
          inline={inline}
          panelHeightOffset={12}
          onOpenChange={(open) => handlePanelOpenChange(`group:${group}`, open)}
        >
          {sectionPanels.map((p) => (
            <Panel
              key={p.id}
              panel={p}
              variant="section"
              defaultOpen={inline || defaultOpen}
              inline={inline}
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
        data-mode={mode}
        style={dragStyle}
        onPointerDown={!inline ? handlePointerDown : undefined}
        onPointerMove={!inline ? handlePointerMove : undefined}
        onPointerUp={!inline ? handlePointerUp : undefined}
        onPointerCancel={!inline ? handlePointerUp : undefined}
      >
        {visiblePanels.length === 0 ? (
          <div className="dialkit-panel-wrapper">
            <Folder
              title="DialKit"
              defaultOpen={inline || defaultOpen}
              isRoot={true}
              inline={inline}
              onOpenChange={handleRootOpenChange}
              toolbar={timelineToggle}
              panelHeightOffset={2}
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
