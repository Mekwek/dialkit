import { createEffect, onCleanup, onMount } from 'solid-js';
import { mountColorControl, type ColorControlProps } from '../../color-control';

export function ColorControl(props: ColorControlProps) {
  let host!: HTMLDivElement;
  let control: ReturnType<typeof mountColorControl> | undefined;
  onMount(() => {
    control = mountColorControl(host, { ...props });
    createEffect(() => control?.update({ label: props.label, value: props.value, onChange: props.onChange }));
  });
  onCleanup(() => control?.destroy());
  return <div ref={host} class="dialkit-color-host" />;
}
