import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import { createElement, type ReactElement } from 'react';
import { DialTimeline, runBarClick } from './components/Timeline/DialTimeline';

// A CommonJS module whose named export Node cannot see from ESM.
const { createRenderer: createShallowRenderer } = createRequire(import.meta.url)('react-test-renderer/shallow') as typeof import('react-test-renderer/shallow');

describe('DialTimeline', () => {
  it('hands the host export action to the dock, and draws nothing when production is off', () => {
    const onExport = () => {};
    const shallow = createShallowRenderer();
    shallow.render(createElement(DialTimeline, { productionEnabled: true, onExport }));
    assert.equal((shallow.getRenderOutput() as ReactElement<{ onExport?: () => void }>).props.onExport, onExport);
    shallow.render(createElement(DialTimeline, { productionEnabled: false, onExport }));
    assert.equal(shallow.getRenderOutput(), null);
  });
});

describe('DialTimeline clip clicks and host slots', () => {
  const spy = () => {
    const calls: string[] = [];
    return {
      calls,
      actions: {
        onClipClick: (key: string) => { calls.push(`click:${key}`); },
        toggleTracks: (key: string) => { calls.push(`tracks:${key}`); },
        openPopover: () => { calls.push('popover'); },
      },
    };
  };

  it('with clipPopover false, a clip click tells the host and opens no popover', () => {
    const { calls, actions } = spy();
    runBarClick({ key: 'shot-2' }, undefined, false, actions);
    runBarClick({ key: 'shot-3' }, 'leg', false, actions);
    assert.deepEqual(calls, ['click:shot-2', 'click:shot-3']);
  });

  it('opens the clip popover after telling the host by default, and expands a props clip instead', () => {
    const { calls, actions } = spy();
    runBarClick({ key: 'shot-2' }, undefined, true, actions);
    runBarClick({ key: 'props', tracks: [{ prop: 'x' } as never] }, undefined, true, actions);
    assert.deepEqual(calls, ['click:shot-2', 'popover', 'click:props', 'tracks:props']);
  });

  it('hands the clip, join and action options to the dock', () => {
    const renderJoin = () => null;
    const onTrackPress = () => {};
    const actionsStart = createElement('span');
    const shallow = createShallowRenderer();
    shallow.render(createElement(DialTimeline, { productionEnabled: true, clipPopover: false, selectedClipKey: 'shot-2', renderJoin, onTrackPress, actionsStart }));
    const props = (shallow.getRenderOutput() as ReactElement<Record<string, unknown>>).props;
    assert.equal(props.clipPopover, false);
    assert.equal(props.selectedClipKey, 'shot-2');
    assert.equal(props.renderJoin, renderJoin);
    assert.equal(props.onTrackPress, onTrackPress);
    assert.equal(props.actionsStart, actionsStart);
    assert.equal(props.onExport, undefined);
  });
});
