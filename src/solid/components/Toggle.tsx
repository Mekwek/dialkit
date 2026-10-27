import { Show } from 'solid-js';
import { SegmentedControl } from './SegmentedControl';
import type { ShortcutConfig } from '../../store/DialStore';
import { formatToggleShortcut } from '../../shortcut-utils';
import { createHints } from '../primitives';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  shortcut?: ShortcutConfig;
  shortcutActive?: boolean;
  hint?: string;
}

export function Toggle(props: ToggleProps) {
  createHints(() => !!props.hint);
  return (
    <div class="dialkit-labeled-control" data-hint={props.hint}>
      <span class="dialkit-labeled-control-label">
        {props.label}
        <Show when={props.shortcut}>
          <span class={`dialkit-shortcut-pill${props.shortcutActive ? ' dialkit-shortcut-pill-active' : ''}`}>
            {formatToggleShortcut(props.shortcut!)}
          </span>
        </Show>
      </span>
      <SegmentedControl
        options={[
          { value: 'off' as const, label: 'Off' },
          { value: 'on' as const, label: 'On' },
        ]}
        value={props.checked ? 'on' : 'off'}
        onChange={(val) => props.onChange(val === 'on')}
      />
    </div>
  );
}
