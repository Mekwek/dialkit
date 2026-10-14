import { createEffect, onCleanup, onMount } from 'solid-js';
import { mountBackgroundControl, type BackgroundControlProps } from '../../background-control';

export function BackgroundControl(props: BackgroundControlProps) {
  let host!: HTMLDivElement;
  let control: ReturnType<typeof mountBackgroundControl> | undefined;
  onMount(() => {
    control = mountBackgroundControl(host, { ...props });
    createEffect(() => control?.update({ label: props.label, value: props.value, onChange: props.onChange }));
  });
  onCleanup(() => control?.destroy());
  return <div ref={host} class="dialkit-bg-host" />;
}
