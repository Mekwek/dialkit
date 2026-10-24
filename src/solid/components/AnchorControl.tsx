import { createEffect, onCleanup, onMount } from 'solid-js';
import { mountAnchorControl, type AnchorControlProps } from '../../anchor-control';

export function AnchorControl(props: AnchorControlProps) {
  let host!: HTMLDivElement;
  let control: ReturnType<typeof mountAnchorControl> | undefined;
  onMount(() => {
    control = mountAnchorControl(host, { ...props });
    createEffect(() => control?.update({ label: props.label, value: props.value, onChange: props.onChange }));
  });
  onCleanup(() => control?.destroy());
  return <div ref={host} class="dialkit-anchor-host" />;
}
