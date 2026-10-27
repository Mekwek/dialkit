import { E as EasingConfig } from './DialStore-CP5O0S4u.js';
import { BezierPoints } from './easing-geometry.js';
import './dial-pad.js';
import './anchor.js';
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
interface EaseFieldsProps {
    ease: BezierPoints;
    onChange: (ease: BezierPoints) => void;
}
declare function mountEaseFields(host: HTMLElement, initial: EaseFieldsProps): {
    update(next: EaseFieldsProps): void;
    destroy(): void;
};

export { type EaseFieldsProps, type EasingVisualizationProps, mountEaseFields, mountEasingVisualization };
