import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { createElement } from 'react';
import { Slider } from './components/Slider';
import { TransitionControl } from './components/TransitionControl';
import { DialStore, type DialConfig, type TransitionConfig } from './store/DialStore';

// A CommonJS module whose named export Node cannot see from ESM.
const { createRenderer: createShallowRenderer } = createRequire(import.meta.url)('react-test-renderer/shallow') as typeof import('react-test-renderer/shallow');

type Drawn = ReactElement<{ [prop: string]: unknown; children?: ReactNode }>;

/** Every element of a type in a drawn tree, read through children only. */
function findAll(node: ReactNode, type: unknown): Drawn[] {
  const found: Drawn[] = [];
  const visit = (child: ReactNode) => {
    if (!isValidElement(child)) return;
    const element = child as Drawn;
    if (element.type === type) found.push(element);
    Children.forEach(element.props.children, visit);
  };
  visit(node);
  return found;
}

/** The transition's body, drawn one level deep. */
function drawBody(panelId: string, path: string, props: Partial<Parameters<typeof TransitionControl>[0]> = {}) {
  const shallow = createShallowRenderer();
  shallow.render(createElement(TransitionControl, {
    panelId,
    path,
    label: 'Enter',
    value: DialStore.getValue(panelId, path) as TransitionConfig,
    onChange: (value: TransitionConfig) => DialStore.updateValue(panelId, path, value),
    bare: true,
    ...props,
  }));
  return shallow.getRenderOutput();
}

const slider = (body: ReactNode, label: string) => {
  const found = findAll(body, Slider).find((element) => element.props.label === label);
  if (!found) throw new Error(`No ${label} slider`);
  return found.props as { value: number; min: number; max: number; onChange: (value: number) => void };
};

describe('TransitionControl', () => {
  it('lets an easing and a time spring run up to 5 seconds', () => {
    const id = 'transition-ceiling';
    const config = {
      easing: { type: 'easing', duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      spring: { type: 'spring', visualDuration: 0.3, bounce: 0.2 },
    } satisfies DialConfig;
    try {
      DialStore.registerPanel(id, 'Ceiling', config);
      assert.equal(slider(drawBody(id, 'easing'), 'Duration').max, 5);
      assert.equal(slider(drawBody(id, 'spring'), 'Duration').max, 5);
      // A host that owns the duration still sets its own ceiling.
      const owned = drawBody(id, 'easing', { durationControl: { value: 0.3, onChange: () => {}, max: 1.5 } });
      assert.equal(slider(owned, 'Duration').max, 1.5);
    } finally { DialStore.unregisterPanel(id); }
  });
});
