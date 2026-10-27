<script lang="ts">
  import SegmentedControl from './SegmentedControl.svelte';
  import type { ShortcutConfig } from 'dialkit/store';
  import { formatToggleShortcut } from '../../shortcut-utils';
  import { createHints } from '../hints.svelte.js';

  let { label, checked, onChange, shortcut, shortcutActive = false, hint } = $props<{
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    shortcut?: ShortcutConfig;
    shortcutActive?: boolean;
    hint?: string;
  }>();
  createHints(() => !!hint);
</script>

<div class="dialkit-labeled-control" data-hint={hint}>
  <span class="dialkit-labeled-control-label">
    {label}
    {#if shortcut}
      <span class={`dialkit-shortcut-pill${shortcutActive ? ' dialkit-shortcut-pill-active' : ''}`}>
        {formatToggleShortcut(shortcut)}
      </span>
    {/if}
  </span>
  <SegmentedControl
    options={[
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ]}
    value={checked ? 'on' : 'off'}
    onChange={(val) => onChange(val === 'on')}
  />
</div>
