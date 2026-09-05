import { createEffect, onCleanup, onMount } from 'solid-js';
import { mountDialPad, type DialPadProps } from '../../dial-pad-control';

export function DialPad(props: DialPadProps) {
  let host!: HTMLDivElement;
  let control: ReturnType<typeof mountDialPad> | undefined;
  onMount(() => {
    control = mountDialPad(host, { ...props });
    createEffect(() => control?.update({ label: props.label, value: props.value, x: props.x, y: props.y, labels: props.labels, onChange: props.onChange }));
  });
  onCleanup(() => control?.destroy());
  return <div ref={host} class="dialkit-pad-host" />;
}
