import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getHintPosition, HintStore, isHintKey, mountHints, setHint } from './hints';
import { DialStore, flattenDialValueUpdates, resolveDialValues, type DialConfig } from './store/DialStore';

const press = (key: string, extra: Partial<KeyboardEvent> = {}) => ({
  key, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, target: null, ...extra,
});

function withStorage(storage: Partial<Storage> | undefined, run: () => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: storage ? { localStorage: storage } : {
    get localStorage(): Storage { throw new Error('blocked'); },
  } });
  try { run(); }
  finally {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  }
}

// Just enough DOM for the hint listeners: elements matched by class, id and
// data-* attributes, and listeners counted per event type.
class FakeElement {
  attributes = new Map<string, string>();
  children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  style: Record<string, string> = {};
  textContent = '';
  offsetWidth = 100;
  offsetHeight = 30;
  constructor(public tagName = 'DIV', className = '') { if (className) this.attributes.set('class', className); }
  get className() { return this.attributes.get('class') ?? ''; }
  set className(value: string) { this.attributes.set('class', value); }
  get id() { return this.attributes.get('id') ?? ''; }
  set id(value: string) { this.attributes.set('id', value); }
  dataset = new Proxy({} as Record<string, string | undefined>, {
    get: (_, key: string) => this.attributes.get(`data-${key}`),
    set: (_, key: string, value: string) => { this.attributes.set(`data-${key}`, value); return true; },
    deleteProperty: (_, key: string) => this.attributes.delete(`data-${key}`) || true,
  });
  get isConnected(): boolean { return this.parentElement ? this.parentElement.isConnected : this.tagName === 'BODY'; }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  removeAttribute(name: string) { this.attributes.delete(name); }
  hasAttribute(name: string) { return this.attributes.has(name); }
  toggleAttribute(name: string, force: boolean) { if (force) this.setAttribute(name, ''); else this.removeAttribute(name); }
  append(...children: FakeElement[]) { for (const child of children) { child.remove(); child.parentElement = this; this.children.push(child); } return this; }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); this.parentElement = null; }
  contains(other: FakeElement | null): boolean { for (let el = other; el; el = el.parentElement) if (el === this) return true; return false; }
  matches(selectors: string) {
    return selectors.split(',').some((selector) => {
      selector = selector.trim();
      if (selector.startsWith('.')) return this.className.split(' ').includes(selector.slice(1));
      if (selector.startsWith('[')) return this.attributes.has(selector.slice(1, -1));
      return this.tagName === selector.toUpperCase();
    });
  }
  closest(selectors: string) { for (let el: FakeElement | null = this; el; el = el.parentElement) if (el.matches(selectors)) return el; return null; }
  querySelector(selectors: string): FakeElement | null {
    for (const child of this.children) { const found = child.matches(selectors) ? child : child.querySelector(selectors); if (found) return found; }
    return null;
  }
  getBoundingClientRect() { return { left: 0, top: 100, right: 100, bottom: 130, width: 100, height: 30 }; }
}

type Dom = { body: FakeElement; listeners: Map<string, Set<unknown>>; fire: (type: string, event?: object) => void; doc: { activeElement: FakeElement | null }; mutate: () => void };

// Listeners come off a microtask after the last destroy, so rows that remount
// in one go keep them.
const settle = () => new Promise(resolve => setImmediate(resolve));

async function withDom(run: (dom: Dom) => void | Promise<void>) {
  const listeners = new Map<string, Set<unknown>>();
  const target = () => ({
    addEventListener: (type: string, listener: unknown) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type)!.add(listener); },
    removeEventListener: (type: string, listener: unknown) => { listeners.get(type)?.delete(listener); if (!listeners.get(type)?.size) listeners.delete(type); },
  });
  const body = new FakeElement('BODY');
  const doc = { ...target(), activeElement: null as FakeElement | null, visibilityState: 'visible', createElement: (tag: string) => new FakeElement(tag.toUpperCase()) };
  const win = { ...target(), innerWidth: 800, innerHeight: 600, get localStorage(): Storage { throw new Error('blocked'); } };
  const watchers = new Set<() => void>();
  const MutationObserver = class { constructor(private callback: () => void) {} observe() { watchers.add(this.callback); } disconnect() { watchers.delete(this.callback); } };
  const mutate = () => watchers.forEach(callback => callback());
  const globals = { document: doc, window: win, Element: FakeElement, Node: FakeElement, HTMLElement: FakeElement, ResizeObserver: class { observe() {} disconnect() {} }, MutationObserver };
  const originals = Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const fire = (type: string, event: object = {}) => listeners.get(type)?.forEach(listener => (listener as (event: object) => void)({ altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, target: null, ...event }));
  try { await run({ body, listeners, fire, doc, mutate }); }
  finally {
    for (const [key, original] of originals) {
      if (original) Object.defineProperty(globalThis, key, original);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

/** The hint layer a root holds while it shows a hint, and the hint and the dim in it. */
const layerIn = (root: FakeElement) => root.children.find(child => child.className === 'dialkit-hint-layer');
const partIn = (root: FakeElement, className: string) => layerIn(root)?.children.find(child => child.className === className);

/** A root with one hinted row, inside a panel folder or straight in the root as a custom layout does. */
function layout(body: FakeElement, folderClass?: string) {
  const root = new FakeElement('DIV', 'dialkit-root');
  const row = new FakeElement('DIV', 'dialkit-slider-wrapper');
  row.setAttribute('data-hint', `Hint in ${folderClass ?? 'a custom layout'}`);
  const control = new FakeElement('BUTTON');
  row.append(control);
  const panel = folderClass ? new FakeElement('DIV', `dialkit-folder ${folderClass}`) : root;
  if (panel !== root) root.append(panel);
  panel.append(row);
  body.append(root);
  return { root, panel, row, control };
}

describe('hints', () => {
  it('reads _hints from each folder without adding controls or values', () => {
    const id = 'hints-config';
    const config = {
      _hints: { radius: 'Rounds the corners.', shadow: 'The shadow under the card.' },
      radius: [12, 0, 32],
      shadow: { _hints: { blur: 'Softens the edge of the shadow.' }, blur: [8, 0, 40], visible: true },
    } satisfies DialConfig;
    try {
      DialStore.registerPanel(id, 'Hints', config);
      const controls = DialStore.getPanel(id)!.controls;
      assert.deepEqual(controls.map(control => [control.path, control.hint]), [['radius', 'Rounds the corners.'], ['shadow', 'The shadow under the card.']]);
      assert.deepEqual(controls[1].children!.map(control => [control.path, control.hint]), [['shadow.blur', 'Softens the edge of the shadow.'], ['shadow.visible', undefined]]);
      assert.deepEqual(resolveDialValues(config, DialStore.getValues(id)), { radius: 12, shadow: { blur: 8, visible: true } });
      assert.deepEqual(flattenDialValueUpdates(config, { radius: 4 }), { radius: 4 });

      DialStore.updatePanel(id, 'Hints', { radius: [12, 0, 32], shadow: { blur: [8, 0, 40] } });
      assert.equal(DialStore.getPanel(id)!.controls[0].hint, undefined);
    } finally { DialStore.unregisterPanel(id); }
  });

  it('holds H only for a plain press outside fields', () => {
    assert.equal(isHintKey(press('h')), true);
    assert.equal(isHintKey(press('j')), false);
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const) {
      assert.equal(isHintKey(press('h', { [modifier]: true })), false, modifier);
    }
    for (const target of [{ tagName: 'INPUT' }, { tagName: 'TEXTAREA' }, { tagName: 'SELECT' }, { tagName: 'DIV', isContentEditable: true }]) {
      assert.equal(isHintKey(press('h', { target: target as unknown as EventTarget })), false, target.tagName);
    }
    assert.equal(isHintKey(press('h', { target: { tagName: 'BUTTON' } as unknown as EventTarget })), true);
    assert.equal(isHintKey({ ...press('h'), key: undefined as unknown as string }), false);
  });

  it('gives a shortcut assigned to H precedence', () => {
    const id = 'hints-shortcut';
    try {
      DialStore.registerPanel(id, 'Shortcut', { visible: true }, { visible: { key: 'h', modifier: 'shift' } });
      assert.equal(isHintKey(press('h')), true);
      DialStore.updatePanel(id, 'Shortcut', { visible: true }, { visible: { key: 'H' } });
      assert.equal(isHintKey(press('h')), false);
    } finally { DialStore.unregisterPanel(id); }
    assert.equal(isHintKey(press('h')), true);
  });

  it('places a hint above its row, below it near the top, and inside the viewport', () => {
    const viewport = { width: 400, height: 600 };
    const size = { width: 200, height: 40 };
    assert.deepEqual(getHintPosition({ left: 50, top: 300, bottom: 336 }, { left: 0, top: 0 }, size, viewport), { left: 50, y: 294, above: true });
    assert.deepEqual(getHintPosition({ left: 50, top: 20, bottom: 56 }, { left: 0, top: 0 }, size, viewport), { left: 50, y: 62, above: false });
    assert.equal(getHintPosition({ left: 300, top: 300, bottom: 336 }, { left: 0, top: 0 }, size, viewport).left, 192);
    assert.deepEqual(getHintPosition({ left: 50, top: 300, bottom: 336 }, { left: 20, top: 100 }, size, viewport), { left: 30, y: 194, above: true });
  });

  // HintStore is shared, so these steps run in order: once a hint has shown,
  // the tip stays hidden for the rest of the page.
  it('shows the tip until a hint first shows, then remembers it', () => {
    const saved = new Map<string, string>();
    const storage = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => void saved.set(key, value) };
    assert.equal(HintStore.isTipSeen(), true, 'no tip on the server');
    withStorage(undefined, () => assert.equal(HintStore.isTipSeen(), false, 'blocked storage still shows the tip'));
    withStorage(storage, () => {
      assert.equal(HintStore.isTipSeen(), false);
      saved.set('dialkit-hint-tip-seen', '1');
      assert.equal(HintStore.isTipSeen(), true, 'seen in an earlier visit');
      saved.clear();
      let calls = 0;
      const stop = HintStore.subscribe(() => calls++);
      HintStore.markTipSeen();
      HintStore.markTipSeen();
      stop();
      assert.equal(calls, 1);
      assert.equal(saved.get('dialkit-hint-tip-seen'), '1');
      assert.equal(HintStore.isTipSeen(), true);
    });
    withStorage(undefined, () => {
      assert.doesNotThrow(() => HintStore.markTipSeen());
      assert.equal(HintStore.isTipSeen(), true);
    });
  });

  it('shares one set of listeners between every renderer', async () => {
    await withDom(async ({ listeners }) => {
      const first = mountHints();
      const second = mountHints();
      assert.equal(listeners.get('keydown')?.size, 1);
      assert.equal(listeners.get('pointerover')?.size, 1);
      first.destroy();
      first.destroy();
      assert.equal(listeners.get('keydown')?.size, 1, 'a second destroy keeps the other renderer\'s listeners');
      second.destroy();
      const third = mountHints();
      assert.equal(listeners.get('keydown')?.size, 1, 'a remount in one go keeps the listeners');
      third.destroy();
      await settle();
      assert.equal(listeners.size, 0);
      const fourth = mountHints();
      assert.equal(listeners.get('keydown')?.size, 1);
      fourth.destroy();
      await settle();
    });
  });

  it('mounts the listeners while a lone control has a hint', async () => {
    await withDom(async ({ body, listeners, fire, mutate }) => {
      const { root, row, control } = layout(body);
      row.removeAttribute('data-hint');
      setHint(row as unknown as HTMLElement, 'A lone hint.');
      setHint(row as unknown as HTMLElement, 'A new sentence.');
      assert.equal(row.getAttribute('data-hint'), 'A new sentence.');
      assert.equal(listeners.get('keydown')?.size, 1);
      fire('pointerover', { target: control });
      fire('keydown', { key: 'h' });
      const tooltip = partIn(root, 'dialkit-hint')!;
      assert.equal(tooltip.textContent, 'A new sentence.');
      row.setAttribute('data-hint', 'Changed while it shows.');
      mutate();
      assert.equal(tooltip.textContent, 'Changed while it shows.', 'the hint follows its row');
      setHint(row as unknown as HTMLElement, undefined);
      setHint(row as unknown as HTMLElement, 'Remounted.');
      fire('pointerover', { target: control });
      assert.equal(tooltip.textContent, 'Remounted.', 'a row that remounts mid-hold keeps the hold');
      fire('keyup', { key: 'h' });
      setHint(row as unknown as HTMLElement, undefined);
      assert.equal(row.hasAttribute('data-hint'), false);
      setHint(row as unknown as HTMLElement, undefined);
      await settle();
      assert.equal(listeners.size, 0);
    });
  });

  it('shows the hint of whichever panel holds the pointer, with or without a DialRoot', async () => {
    await withDom(async ({ body, fire, doc, mutate }) => {
      const one = mountHints();
      const two = mountHints();
      const tooltip = () => body.children.map(root => partIn(root, 'dialkit-hint')).find(Boolean);
      const dim = () => body.children.map(root => partIn(root, 'dialkit-hint-dim')).find(Boolean);
      const rootOf = (part?: FakeElement) => part?.parentElement?.parentElement;
      try {
        const first = layout(body, 'dialkit-folder-root');
        const second = layout(body, 'dialkit-folder-root');
        const custom = layout(body);

        fire('pointerover', { target: first.control });
        fire('keydown', { key: 'h' });
        assert.equal(rootOf(tooltip()), first.root);
        assert.equal(tooltip()?.textContent, 'Hint in dialkit-folder-root');
        assert.equal(first.panel.hasAttribute('data-hinting'), true);
        assert.equal(dim()?.hasAttribute('data-open'), true, 'the rest of the panel dims');
        assert.equal(dim()?.children[0].style.width, '100px', 'around a hole the size of the row');
        assert.equal(first.row.hasAttribute('data-hint-shown'), true);
        assert.equal(first.control.getAttribute('aria-describedby'), 'dialkit-hint');
        fire('keydown', { key: 'h' });
        assert.equal(body.children.filter(root => layerIn(root)).length, 1, 'one tooltip for every panel');

        fire('pointerover', { target: second.row });
        assert.equal(rootOf(tooltip()), second.root);
        assert.equal(first.panel.hasAttribute('data-hinting'), false);
        assert.equal(first.control.hasAttribute('aria-describedby'), false);
        assert.equal(second.panel.hasAttribute('data-hinting'), true);

        fire('pointerover', { target: custom.control });
        assert.equal(rootOf(tooltip()), custom.root);
        assert.equal(tooltip()?.textContent, 'Hint in a custom layout');
        assert.equal(second.panel.hasAttribute('data-hinting'), false);
        assert.equal(custom.root.hasAttribute('data-hinting'), true);

        fire('keyup', { key: 'h' });
        assert.equal(tooltip()?.hasAttribute('data-open'), false);
        assert.equal(custom.root.hasAttribute('data-hinting'), false);
        assert.equal(custom.row.hasAttribute('data-hint-shown'), false);
        assert.equal(dim()?.hasAttribute('data-open'), false);
        assert.equal(dim()?.hasAttribute('data-leaving'), true, 'the dim fades out where it is');

        doc.activeElement = second.control;
        fire('pointerout', { relatedTarget: null });
        fire('keydown', { key: 'h' });
        assert.equal(rootOf(tooltip()), second.root, 'the focused control explains itself');
        assert.equal(dim()?.hasAttribute('data-leaving'), false, 'a new hint ends the fade');
        assert.equal(dim()?.hasAttribute('data-open'), true);
        second.row.removeAttribute('data-hint');
        mutate();
        assert.equal(second.panel.hasAttribute('data-hinting'), false, 'a row that loses its hint hides it');
        fire('blur');
        assert.equal(second.panel.hasAttribute('data-hinting'), false);
      } finally {
        one.destroy();
        two.destroy();
      }
      await settle();
      assert.equal(tooltip(), undefined);
    });
  });

  it('mounts nothing on the server', () => {
    assert.equal(typeof document, 'undefined');
    assert.doesNotThrow(() => mountHints().destroy());
  });
});
