import { SegmentedControl } from './SegmentedControl';
import type { ShortcutConfig } from '../store/DialStore';
import { formatToggleShortcut } from '../shortcut-utils';
import { useHint } from './Hint';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  shortcut?: ShortcutConfig;
  shortcutActive?: boolean;
  hint?: string;
}

export function Toggle({ label, checked, onChange, shortcut, shortcutActive, hint }: ToggleProps) {
  const { hintRow } = useHint(hint);
  return (
    <div className="dialkit-labeled-control" {...hintRow}>
      <span className="dialkit-labeled-control-label">
        {label}
        {shortcut && (
          <span className={`dialkit-shortcut-pill${shortcutActive ? ' dialkit-shortcut-pill-active' : ''}`}>
            {formatToggleShortcut(shortcut)}
          </span>
        )}
      </span>
      <SegmentedControl
        options={[
          { value: 'off' as const, label: 'Off' },
          { value: 'on' as const, label: 'On' },
        ]}
        value={checked ? 'on' : 'off'}
        onChange={(val) => onChange(val === 'on')}
      />
    </div>
  );
}
