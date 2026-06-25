import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DialStore, PanelConfig } from '../store/DialStore';
import { Panel } from './Panel';
import { Folder } from './Folder';
import { ShortcutListener } from './ShortcutListener';

export type DialPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
export type DialMode = 'popover' | 'inline';
export type DialTheme = 'light' | 'dark' | 'system';

declare const process: { env?: { NODE_ENV?: string } } | undefined;

const isDevDefault = typeof process !== 'undefined' && process?.env?.NODE_ENV
  ? process.env.NODE_ENV !== 'production'
  : typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE
    ? (import.meta as any).env.MODE !== 'production'
    : true;

export type FolderMode = 'independent' | 'accordion';

interface DialRootProps {
  position?: DialPosition;
  defaultOpen?: boolean;
  mode?: DialMode;
  theme?: DialTheme;
  productionEnabled?: boolean;
  /**
   * First-level folder behavior. `'independent'` (default) keeps each top-level
   * folder open state isolated. `'accordion'` allows only one top-level folder
   * open at a time. Nested folders are unaffected.
   */
  folderMode?: FolderMode;
  /**
   * Fired when the aggregate open state changes — `true` when the first panel
   * expands, `false` when the last panel collapses to its bubble. Lets a host
   * react to "is the control surface showing anything." Fires on user-driven
   * open/close, not on mount.
   */
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

  // Aggregate open-state tracking for the optional `onOpenChange` callback.
  // Tracks which panels are currently expanded; fires the host callback only
  // when the aggregate flips (first open / last close), never on mount.
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const openPanelsRef = useRef<Set<string>>(new Set());
  const aggregateOpenRef = useRef<boolean | null>(null);

  const handlePanelOpenChange = useCallback((panelId: string, open: boolean) => {
    const set = openPanelsRef.current;
    if (open) set.add(panelId); else set.delete(panelId);
    const aggregate = set.size > 0;
    if (aggregate !== aggregateOpenRef.current) {
      aggregateOpenRef.current = aggregate;
      onOpenChangeRef.current?.(aggregate);
    }
  }, []);

  // Subscribe to global panel changes
  useEffect(() => {
    setMounted(true);
    setPanels(DialStore.getPanels());

    const unsubscribe = DialStore.subscribeGlobal(() => {
      setPanels(DialStore.getPanels());
    });

    return unsubscribe;
  }, []);

  // Seed the aggregate-open baseline exactly once, when panels first appear.
  // Panels mount in their `defaultOpen` state; seeding silently means the host
  // `onOpenChange` only fires on later user-driven toggles. Guarded so the
  // store's `notifyGlobal` re-renders (visibility re-eval) never re-seed and
  // clobber user toggle state.
  const seededOpenRef = useRef(false);
  useEffect(() => {
    if (seededOpenRef.current || panels.length === 0) return;
    seededOpenRef.current = true;
    if (inline || defaultOpen) {
      for (const p of panels) openPanelsRef.current.add(p.id);
    }
    aggregateOpenRef.current = openPanelsRef.current.size > 0;
  }, [panels, inline, defaultOpen]);

  // Watch for panel open/close — snap to corner on open, restore drag position on close
  useEffect(() => {
    if (!panelRef.current || inline) return;
    const observer = new MutationObserver(() => {
      const inner = panelRef.current?.querySelector('.dialkit-panel-inner');
      if (!inner) return;
      const collapsed = inner.getAttribute('data-collapsed') === 'true';

      if (!collapsed) {
        // Opening — save drag position, determine corner, snap
        if (dragOffset) {
          lastDragOffset.current = dragOffset;
          const bubbleCenterX = dragOffset.x + 21;
          const midX = window.innerWidth / 2;
          setActivePosition(bubbleCenterX < midX ? 'top-left' : 'top-right');
        } else {
          setActivePosition(position);
        }
        setDragOffset(null);
      } else if (lastDragOffset.current) {
        // Closing — restore the dragged position
        setDragOffset(lastDragOffset.current);
      }
    });
    observer.observe(panelRef.current, { subtree: true, attributes: true, attributeFilter: ['data-collapsed'] });
    return () => observer.disconnect();
  }, [inline, dragOffset, position]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only drag the collapsed bubble
    const inner = panelRef.current?.querySelector('.dialkit-panel-inner');
    if (!inner || inner.getAttribute('data-collapsed') !== 'true') return;

    const rect = panelRef.current!.getBoundingClientRect();
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      elX: rect.left,
      elY: rect.top,
    };
    didDragRef.current = false;
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current || !dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;

    if (!didDragRef.current && Math.abs(dx) + Math.abs(dy) < 4) return;
    didDragRef.current = true;

    setDragOffset({
      x: dragStartRef.current.elX + dx,
      y: dragStartRef.current.elY + dy,
    });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    dragStartRef.current = null;

    // If we actually dragged, prevent the click from opening the panel
    if (didDragRef.current) {
      e.stopPropagation();
      const inner = panelRef.current?.querySelector('.dialkit-panel-inner');
      if (inner) {
        const blocker = (ev: Event) => { ev.stopPropagation(); };
        inner.addEventListener('click', blocker, { capture: true, once: true });
      }
    }
  }, []);

  // Don't render on server
  if (!mounted || typeof window === 'undefined') {
    return null;
  }

  // Don't render if no panels registered
  if (panels.length === 0) {
    return null;
  }

  const dragStyle = dragOffset ? {
    top: dragOffset.y,
    left: dragOffset.x,
    right: 'auto' as const,
    bottom: 'auto' as const,
  } : undefined;

  // Optionally restrict which panels this root renders (lets multiple roots
  // split the same store — see the `include` prop).
  const visiblePanels = include
    ? panels.filter((p) =>
        (include.ungrouped === true && !p.group) ||
        (!!include.groups && !!p.group && include.groups.includes(p.group)))
    : panels;

  // Group-aware rendering. Panels with no group render as independent
  // standalone shells (historical behavior). Panels sharing a non-empty group
  // render as collapsible sections inside ONE merged shell, emitted at the
  // position of that group's first panel so DOM order tracks registration order.
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
          onOpenChange={(open) => handlePanelOpenChange(panel.id, open)}
        />
      );
    }
    if (renderedGroups.has(group)) return null;
    renderedGroups.add(group);
    const sectionPanels = panels.filter((p) => p.group === group);
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
        data-mode={mode}
        style={dragStyle}
        onPointerDown={!inline ? handlePointerDown : undefined}
        onPointerMove={!inline ? handlePointerMove : undefined}
        onPointerUp={!inline ? handlePointerUp : undefined}
      >
        {panelNodes}
      </div>
    </div>
  </ShortcutListener>
  );

  if (inline) {
    return content;
  }

  return createPortal(content, document.body);
}
