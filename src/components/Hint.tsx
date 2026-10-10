import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { getDialKitPortalRoot } from '../dropdown-position';
import { HintStore } from '../store/HintStore';
import type { ShownHint } from '../store/HintStore';

/** The handlers a hint puts on a control's row. Empty when there is no hint. */
export interface HintProps {
  onPointerEnter?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerLeave?: () => void;
}

/**
 * A control's hint. Spread `hintRow` on the control's outer element: while
 * the hint key (I) is held over the row, the hint shows above it and the
 * rest of the panel dims.
 *
 * The row listens to the store instead of re-rendering on the key: a
 * re-render of every control on each press froze the page for about
 * 100 ms. While the key is held, the hint stays after the pointer leaves
 * its row, so the gap between two rows does not flicker. The next row,
 * leaving the panel (HintTooltip) or releasing the key replaces or hides it.
 */
export function useHint(hint: string | undefined): { hintRow: HintProps } {
  const row = useRef<HTMLElement | null>(null);
  // Refs, not state: a hover or a key press must not re-render the control.
  const hovered = useRef(false);
  const text = useRef(hint);
  text.current = hint;

  const showIfHeld = () => {
    if (!text.current || !hovered.current || !row.current || !HintStore.isKeyHeld()) return;
    HintStore.show(text.current, row.current);
  };

  useEffect(() => {
    if (!hint) return;
    return HintStore.subscribe(showIfHeld);
  }, [hint]);

  // A control that leaves the page takes its hint with it.
  useEffect(
    () => () => {
      if (row.current) HintStore.hide(row.current);
    },
    []
  );

  if (!hint) return { hintRow: {} };

  return {
    hintRow: {
      onPointerEnter: (event) => {
        row.current = event.currentTarget;
        hovered.current = true;
        showIfHeld();
      },
      onPointerLeave: () => {
        hovered.current = false;
      },
    },
  };
}

/**
 * Gives a part with no row of its own a hint, like the tabs of a
 * transition. It adds no box of its own to the layout.
 */
export function HintZone({ hint, children }: { hint?: string; children: ReactNode }) {
  const { hintRow } = useHint(hint);
  if (!hint) return <>{children}</>;
  return (
    <div className="dialkit-hint-zone" {...hintRow}>
      {children}
    </div>
  );
}

/** An element's box. A zone has no box, so its first child stands in. */
function boxOf(element: HTMLElement): DOMRect {
  const box = element.getBoundingClientRect();
  if (box.width || box.height) return box;
  return element.firstElementChild?.getBoundingClientRect() ?? box;
}

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/** Which mounted tooltip draws: the first one. A page can hold several roots. */
const tooltips: symbol[] = [];

const radiusOf = (element: Element) => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;

/**
 * The area the dim covers: the clip popover or panel a row sits in. A panel's
 * outer box is the rounded one; its root folder inside can be taller and scroll.
 */
function dimAreaOf(row: HTMLElement): Element | null {
  return row.closest('.dialkit-timeline-popover') ?? row.closest('.dialkit-panel-inner') ?? row.closest('.dialkit-folder-root');
}

/** How long the tooltip and the dim take to fade out. Matches theme.css. */
const FADE_OUT_MS = 120;

/** The gap between the hint and the row, and the room kept from the window edge. */
const GAP = 6;
const MARGIN = 8;

/**
 * The one hint on screen, and the dim behind it. DialRoot mounts it. It
 * listens for the hint key, except while a field takes typing.
 */
export function HintTooltip() {
  const shown = useSyncExternalStore(HintStore.subscribe, HintStore.getShown, HintStore.getShown);
  const [id] = useState(() => Symbol('hint-tooltip'));
  const [owner, setOwner] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // `y` is the edge that faces the row: the tooltip's bottom when it sits
  // above the row, its top when below. A new hint of another height then
  // grows away from the row instead of jumping.
  const [place, setPlace] = useState<{ left: number; y: number; above: boolean } | null>(null);
  // A tooltip already on screen slides to the next row instead of showing anew.
  const [slide, setSlide] = useState(false);
  // The panel dims, except the row whose hint shows. The area is the panel;
  // the hole is the row, relative to the panel.
  const [dim, setDim] = useState<{
    area: { left: number; top: number; width: number; height: number; radius: number };
    hole: { x: number; y: number; width: number; height: number; radius: number };
  } | null>(null);

  // A hidden hint stays on screen while it fades out. It is kept in the
  // same render that hides it, so the fade starts from what is on screen.
  const last = useRef<ShownHint | null>(null);
  if (shown) last.current = shown;
  const [, setFadedOut] = useState(0);
  useEffect(() => {
    if (shown || !last.current) return;
    const timer = setTimeout(() => {
      last.current = null;
      setPlace(null);
      setDim(null);
      setSlide(false);
      setFadedOut((count) => count + 1);
    }, FADE_OUT_MS);
    return () => clearTimeout(timer);
  }, [shown]);

  useEffect(() => {
    tooltips.push(id);
    setOwner(tooltips[0] === id);
    return () => {
      tooltips.splice(tooltips.indexOf(id), 1);
    };
  }, [id]);

  useEffect(() => {
    if (!owner) return;
    const down = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== HintStore.getKey()) return;
      if (event.metaKey || event.ctrlKey || event.altKey || isEditable(event.target)) return;
      HintStore.setKeyHeld(true);
    };
    const up = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === HintStore.getKey()) HintStore.setKeyHeld(false);
    };
    const release = () => HintStore.setKeyHeld(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', release);
      release();
    };
  }, [owner]);

  // The hint stays when the pointer leaves its row, so it hides here when
  // the pointer leaves the panel, or the window.
  useEffect(() => {
    const area = owner && shown ? dimAreaOf(shown.box) : null;
    if (!area) return;
    const over = (event: PointerEvent) => {
      if (!(event.target instanceof Node && area.contains(event.target))) HintStore.hide();
    };
    const out = (event: PointerEvent) => {
      if (!event.relatedTarget) HintStore.hide();
    };
    document.addEventListener('pointerover', over);
    document.addEventListener('pointerout', out);
    return () => {
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerout', out);
    };
  }, [owner, shown]);

  // Above the row, lined up with its left edge, kept inside the window.
  // Below the row when there is no room above.
  useLayoutEffect(() => {
    const tooltip = ref.current;
    // A hint that fades out keeps its place.
    if (!shown || !tooltip) return;
    setSlide(place !== null);
    const target = boxOf(shown.box);
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const above = target.top - GAP - height >= MARGIN;
    const left = Math.min(Math.max(MARGIN, target.left), window.innerWidth - width - MARGIN);
    setPlace({ left, y: above ? target.top - GAP : target.bottom + GAP, above });
  }, [shown]);

  useLayoutEffect(() => {
    // A hint that fades out keeps its dim.
    if (!shown) return;
    const area = dimAreaOf(shown.box);
    if (!area) {
      setDim(null);
      return;
    }
    const outer = area.getBoundingClientRect();
    const row = boxOf(shown.box);
    // A zone has no box of its own: its first child gives the corner radius.
    const box = shown.box.getBoundingClientRect();
    const rowElement = box.width || box.height ? shown.box : (shown.box.firstElementChild ?? shown.box);
    setDim({
      area: { left: outer.left, top: outer.top, width: outer.width, height: outer.height, radius: radiusOf(area) },
      hole: {
        x: row.left - outer.left,
        y: row.top - outer.top,
        width: row.width,
        height: row.height,
        // A row's outer element can be square while the control in it is
        // rounded: fall back to the controls' radius.
        radius: radiusOf(rowElement) || Number.parseFloat(getComputedStyle(rowElement).getPropertyValue('--dial-radius')) || 0,
      },
    });
  }, [shown]);

  const current = shown ?? last.current;
  if (!owner || !current) return null;
  const root = getDialKitPortalRoot(current.anchor) ?? document.body;
  const fading = !shown || undefined;

  return createPortal(
    <>
      {/* The dim is the panel's shape. Inside it, a box over the row casts
          a shadow that fills the rest: that shadow is the dim, and the box
          is the hole. The box slides to the next row (theme.css). */}
      {dim && (
        <div
          className="dialkit-hint-dim"
          data-leaving={fading}
          aria-hidden="true"
          style={{ left: dim.area.left, top: dim.area.top, width: dim.area.width, height: dim.area.height, borderRadius: dim.area.radius }}
        >
          <div
            className="dialkit-hint-dim-hole"
            style={{
              transform: `translate(${dim.hole.x}px, ${dim.hole.y}px)`,
              width: dim.hole.width,
              height: dim.hole.height,
              borderRadius: dim.hole.radius,
            }}
          />
        </div>
      )}
      <div
        ref={ref}
        className="dialkit-hint"
        role="tooltip"
        data-above={place?.above ?? true}
        data-slide={slide || undefined}
        data-leaving={fading}
        style={{
          // The scale is a variable so theme.css can animate it without
          // touching the position: the tooltip scales in and out.
          transform: `translate(${place?.left ?? 0}px, ${place?.y ?? 0}px) translateY(${place?.above === false ? '0%' : '-100%'}) scale(var(--dial-hint-scale))`,
          visibility: place ? 'visible' : 'hidden',
        }}
      >
        {current.text}
      </div>
    </>,
    root
  );
}
