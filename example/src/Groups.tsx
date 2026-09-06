import { useDialKit } from 'dialkit';

/**
 * Grouped panels demo
 *
 * Two panels share `group: 'Scene'` and render as collapsible sections inside
 * ONE merged shell; the third panel has no group and stays a standalone shell.
 * `presetsLockable` / `presetsEditable` show the preset row lock, rename, and
 * drag-reorder controls in the dropdown.
 */
export function Groups() {
  const camera = useDialKit(
    'Camera',
    {
      fov: [60, 20, 120, 1],
      near: [0.1, 0.01, 10, 0.01],
      orbit: {
        _collapsed: false,
        speed: [0.5, 0, 2, 0.05],
        autoRotate: true,
      },
      framing: {
        _collapsed: true,
        padding: [0.2, 0, 1, 0.01],
        center: true,
      },
    },
    { id: 'groups-camera', group: 'Scene', presetsLockable: true }
  );

  const lights = useDialKit(
    'Lights',
    {
      intensity: [1, 0, 4, 0.1],
      warmth: [0.5, 0, 1, 0.01],
      shadows: true,
    },
    { id: 'groups-lights', group: 'Scene' }
  );

  const solo = useDialKit(
    'Standalone',
    {
      opacity: [0.8, 0, 1, 0.01],
      label: { type: 'text' as const, default: 'ungrouped' },
    },
    { id: 'groups-solo' }
  );

  return (
    <div
      data-testid="groups-demo"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: '#111',
        color: '#eee',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <pre style={{ fontSize: 13, opacity: solo.opacity }}>
        {JSON.stringify({ camera, lights, solo }, null, 2)}
      </pre>
    </div>
  );
}
