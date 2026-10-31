import type { TimelineClipDragBounds, TimelineClipLoop, TimelineClipMeta, TimelineStepStatic } from 'dialkit/timeline';
type $$ComponentProps = {
    timelineId: string;
    clip: TimelineClipMeta;
    at: number;
    duration: number;
    loop: TimelineClipLoop;
    steps?: TimelineStepStatic[];
    fixedDuration: boolean;
    composite?: boolean;
    /** Single track: the bar carries its name and fills as the playhead crosses it. */
    single?: boolean;
    baseAt?: number;
    delayMode?: boolean;
    pxPerSecond: number;
    viewStart: number;
    timelineDuration: number;
    selected: boolean;
    selectedStepKey?: string;
    getDragBounds: (clipKey: string) => TimelineClipDragBounds;
    /** Single track: pressing the bar, not an edge, selects it. */
    onSelect?: (clipKey: string) => void;
    onClick: (clip: TimelineClipMeta, rect: DOMRect, stepKey?: string) => void;
    onDrag: () => void;
};
declare const TimelineClip: import("svelte").Component<$$ComponentProps, {}, "">;
type TimelineClip = ReturnType<typeof TimelineClip>;
export default TimelineClip;
//# sourceMappingURL=TimelineClip.svelte.d.ts.map