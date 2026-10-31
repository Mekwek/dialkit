import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import { createElement, type ReactElement } from 'react';
import { DialTimeline } from './components/Timeline/DialTimeline';

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
