import { createEffect, createUniqueId, onCleanup, onMount } from 'solid-js';
import { observeTextSize } from '../../text-autosize';

interface TextControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextControl(props: TextControlProps) {
  const inputId = createUniqueId();
  let inputRef!: HTMLTextAreaElement;
  let size: ReturnType<typeof observeTextSize> | undefined;
  onMount(() => { size = observeTextSize(inputRef); });
  onCleanup(() => size?.destroy());
  createEffect(() => { props.value; props.placeholder; size?.update(); });

  return (
    <div class="dialkit-text-control">
      <label class="dialkit-text-label" for={inputId}>{props.label}</label>
      <textarea
        ref={inputRef}
        id={inputId}
        rows={1}
        class="dialkit-text-input"
        value={props.value}
        onInput={(e) => props.onChange(e.currentTarget.value)}
        placeholder={props.placeholder}
      />
    </div>
  );
}
