import { DialStore } from '../store/DialStore';
import type { ControlMeta, DialValue } from '../store/DialStore';
import type { DialPadAxis } from '../dial-pad';
import { DialPad } from './DialPad';

interface PadGroupProps {
  panelId: string;
  control: ControlMeta;
  values: Record<string, DialValue>;
}

/**
 * A pad group: a folder set with `_pad`. Its first two number children are
 * the pad's X and Y. Each keeps its own path, so a host stores, resets and
 * restores them as two plain values.
 */
export function PadGroup({ panelId, control, values }: PadGroupProps) {
  const [x, y] = (control.children ?? []).filter((child) => child.type === 'slider');
  if (!x || !y) return null;
  const options = control.padGroup ?? {};

  const axis = (child: ControlMeta): DialPadAxis => {
    const min = child.min ?? 0;
    const max = child.max ?? 1;
    const reset = DialStore.getResetValue(panelId, child.path);
    return [typeof reset === 'number' ? reset : min, min, max, child.step];
  };
  const current = (child: ControlMeta) => {
    const value = values[child.path];
    return typeof value === 'number' ? value : (child.min ?? 0);
  };

  return (
    <DialPad
      label={control.label}
      hint={control.hint}
      value={{ x: current(x), y: current(y) }}
      x={axis(x)}
      y={axis(y)}
      labels={options.labels}
      mapping={options.mapping}
      hideLabel={options.hideLabel}
      dragFields={options.dragFields}
      onChange={(next) => DialStore.updateValues(panelId, { [x.path]: next.x, [y.path]: next.y })}
    />
  );
}
