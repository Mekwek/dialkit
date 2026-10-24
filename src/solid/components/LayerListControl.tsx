import { createEffect, onCleanup, onMount } from 'solid-js';
import { mountLayerListControl, type LayerListControlProps } from '../../layer-list-control';

export function LayerListControl(props: LayerListControlProps) {
  let host!: HTMLDivElement;
  let control: ReturnType<typeof mountLayerListControl> | undefined;
  onMount(() => {
    control = mountLayerListControl(host, { ...props });
    createEffect(() => control?.update({
      label: props.label, value: props.value, onChange: props.onChange, onAction: props.onAction,
      addLabel: props.addLabel, addDisabled: props.addDisabled, empty: props.empty,
    }));
  });
  onCleanup(() => control?.destroy());
  return <div ref={host} class="dialkit-layers-host" />;
}
