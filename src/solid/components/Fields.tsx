import { createEffect, onCleanup, onMount } from 'solid-js';
import { mountFields, type FieldsProps } from '../../fields-control';

export function Fields(props: FieldsProps) {
  let host!: HTMLDivElement;
  let control: ReturnType<typeof mountFields> | undefined;
  onMount(() => {
    control = mountFields(host, { ...props });
    createEffect(() => control?.update({ label: props.label, controls: props.controls, values: props.values, defaults: props.defaults, onChange: props.onChange, hint: props.hint }));
  });
  onCleanup(() => control?.destroy());
  return <div ref={host} class="dialkit-fields-host" />;
}
