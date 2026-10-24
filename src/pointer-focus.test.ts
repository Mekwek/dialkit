import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { observePointerFocus } from './pointer-focus';

const originalDocument = globalThis.document;
afterEach(() => { globalThis.document = originalDocument; });

function setup() {
  const listeners = new Map<string, EventListener>();
  const doc = {
    activeElement: null as unknown,
    addEventListener: (type: string, listener: EventListener) => { listeners.set(type, listener); },
    removeEventListener: (type: string, listener: EventListener) => { if (listeners.get(type) === listener) listeners.delete(type); },
  };
  globalThis.document = doc as unknown as Document;
  const field = (inRoot = true) => {
    const attributes = new Set<string>();
    return {
      attributes,
      closest: (selector: string) => (selector === '.dialkit-root' && inRoot ? {} : null),
      setAttribute: (name: string) => { attributes.add(name); },
      removeAttribute: (name: string) => { attributes.delete(name); },
    };
  };
  const fire = (type: string, init: Record<string, unknown> = {}) => listeners.get(type)?.(init as unknown as Event);
  const focus = (target: ReturnType<typeof field>) => { doc.activeElement = target; fire('focusin', { target }); };
  const blur = (target: ReturnType<typeof field>) => { doc.activeElement = null; fire('focusout', { target }); };
  return { listeners, doc, field, fire, focus, blur };
}

describe('pointer focus', () => {
  it('marks a field focused by a pointer until it blurs', () => {
    const { field, fire, focus, blur } = setup();
    const stop = observePointerFocus();
    try {
      const input = field();
      fire('pointerdown');
      focus(input);
      assert.equal(input.attributes.has('data-pointer-focus'), true);
      blur(input);
      assert.equal(input.attributes.has('data-pointer-focus'), false);
    } finally { stop(); }
  });

  it('ignores modifier keys between the pointer and the focus', () => {
    const { field, fire, focus } = setup();
    const stop = observePointerFocus();
    try {
      const input = field();
      fire('pointerdown');
      fire('keydown', { key: 'Shift' });
      focus(input);
      assert.equal(input.attributes.has('data-pointer-focus'), true);
    } finally { stop(); }
  });

  it('leaves keyboard focus and controls outside a root unmarked', () => {
    const { field, fire, focus } = setup();
    const stop = observePointerFocus();
    try {
      const input = field();
      fire('pointerdown');
      fire('keydown', { key: 'Tab' });
      focus(input);
      assert.equal(input.attributes.has('data-pointer-focus'), false);
      const outside = field(false);
      fire('pointerdown');
      focus(outside);
      assert.equal(outside.attributes.has('data-pointer-focus'), false);
    } finally { stop(); }
  });

  it('keeps the mark while the window loses focus', () => {
    const { field, fire, focus } = setup();
    const stop = observePointerFocus();
    try {
      const input = field();
      fire('pointerdown');
      focus(input);
      fire('focusout', { target: input });
      assert.equal(input.attributes.has('data-pointer-focus'), true);
    } finally { stop(); }
  });

  it('listens while any root is mounted and once for all of them', () => {
    const { listeners } = setup();
    const first = observePointerFocus();
    const second = observePointerFocus();
    assert.deepEqual([...listeners.keys()].sort(), ['focusin', 'focusout', 'keydown', 'pointerdown']);
    first();
    first();
    assert.equal(listeners.size, 4);
    second();
    assert.equal(listeners.size, 0);
  });
});
