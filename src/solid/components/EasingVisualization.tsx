import { createEffect, onCleanup, onMount } from 'solid-js';
import { mountEasingVisualization, type EasingVisualizationProps } from '../../easing-control';

export { easingPresets } from '../../easing-geometry';

export function EasingVisualization(props: EasingVisualizationProps) {
  let host!: HTMLDivElement;
  let control: ReturnType<typeof mountEasingVisualization> | undefined;
  onMount(() => {
    control = mountEasingVisualization(host, { ...props });
    createEffect(() => control?.update({ easing: props.easing, onChange: props.onChange }));
  });
  onCleanup(() => control?.destroy());
  return <div ref={host} class="dialkit-easing-host" />;
}
