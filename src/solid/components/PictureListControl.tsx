import { createEffect, onCleanup, onMount } from 'solid-js';
import { mountPictureListControl, type PictureListControlProps } from '../../picture-list-control';

export function PictureListControl(props: PictureListControlProps) {
  let host!: HTMLDivElement;
  let control: ReturnType<typeof mountPictureListControl> | undefined;
  onMount(() => {
    control = mountPictureListControl(host, { ...props });
    createEffect(() => control?.update({ label: props.label, families: props.families, value: props.value, onPick: props.onPick, hint: props.hint }));
  });
  onCleanup(() => control?.destroy());
  return <div ref={host} class="dialkit-pictures-host" />;
}
