import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeControls } from './control-presence';
import type { ControlMeta } from './store/DialStore';

const row = (path: string): ControlMeta => ({ type: 'slider', path, label: path });
const paths = (controls: ControlMeta[]) => controls.map(control => control.path);

describe('mergeControls', () => {
  it('keeps leaving controls after the row they followed while others enter', () => {
    const rendered = [row('radius'), row('outline'), row('opacity'), row('shadow'), row('spacing')];
    const controls = [row('radius'), row('outline'), row('width'), row('color'), row('opacity'), row('spacing')];
    assert.deepEqual(paths(mergeControls(rendered, controls)), ['radius', 'outline', 'width', 'color', 'opacity', 'shadow', 'spacing']);
  });

  it('keeps consecutive and leading leaving controls in order', () => {
    const rendered = [row('a'), row('b'), row('c'), row('d')];
    assert.deepEqual(paths(mergeControls(rendered, [row('d')])), ['a', 'b', 'c', 'd']);
  });

  it('uses the latest control for rows that stay', () => {
    const latest = row('a');
    assert.equal(mergeControls([row('a')], [latest])[0], latest);
  });
});
