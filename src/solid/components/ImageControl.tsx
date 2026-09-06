import { createEffect, onCleanup, onMount } from 'solid-js';
import { mountImageControl, type ImageControlProps } from '../../image-control';

export function ImageControl(props: ImageControlProps) {
  let host!: HTMLDivElement;
  let control: ReturnType<typeof mountImageControl> | undefined;
  onMount(() => {
    control = mountImageControl(host, { ...props });
    createEffect(() => control?.update({ label: props.label, value: props.value, options: props.options, onChange: props.onChange }));
  });
  onCleanup(() => control?.destroy());
  return <div ref={host} class="dialkit-image-host" />;
}
