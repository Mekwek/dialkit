import { E as EasingConfig } from './DialStore-Cgyh9K8s.js';
import { BezierPoints } from './easing-geometry.js';
import './dial-pad.js';
import './background.js';

interface EasingVisualizationProps {
    easing: EasingConfig;
    /** Enables pointer and keyboard editing of the two control points. */
    onChange?: (ease: BezierPoints) => void;
}
/** One interaction and fitting implementation for React, Solid, Vue, and Svelte. */
declare function mountEasingVisualization(host: HTMLElement, initial: EasingVisualizationProps): {
    update(next: EasingVisualizationProps): void;
    destroy(): void;
};

export { type EasingVisualizationProps, mountEasingVisualization };
