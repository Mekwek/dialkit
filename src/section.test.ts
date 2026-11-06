import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import { Children, createElement, type ReactElement, type ReactNode } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { ControlRenderer } from './components/ControlRenderer';
import { Folder } from './components/Folder';
import { Section } from './components/Section';
import { Slider } from './components/Slider';
import { TransitionCopyMenu } from './components/TransitionCopy';
import { TransitionControl } from './components/TransitionControl';
import { DialStore, type DialConfig } from './store/DialStore';

// A CommonJS module whose named export Node cannot see from ESM.
const { createRenderer: createShallowRenderer } = createRequire(import.meta.url)('react-test-renderer/shallow') as typeof import('react-test-renderer/shallow');

/** A drawn element, read one level deep. */
type Drawn = ReactElement<{ [prop: string]: unknown; children?: ReactNode; actions?: ReactNode }>;
const rowsOf = (element: ReactNode) => Children.toArray((element as Drawn).props.children) as Drawn[];
/** What a row or a folder of the renderer draws, one level further down. */
const drawnBy = (element: Drawn) => {
  const shallow = createShallowRenderer();
  shallow.render(element);
  const drawn = shallow.getRenderOutput() as Drawn;
  shallow.unmount();
  return drawn;
};

const byClass = (root: ReactTestInstance, className: string) =>
  root.findAll(node => typeof node.type === 'string' && typeof node.props.className === 'string' && node.props.className.split(' ').includes(className));
const control = (panelId: string, path: string) => {
  const found = DialStore.getControl(panelId, path);
  if (!found) throw new Error(`No control at ${path}`);
  return found;
};

describe('Section', () => {
  it('draws rows from several panels inside one folder, each changing its own panel', () => {
    const a = 'section-a';
    const b = 'section-b';
    let renderer: ReactTestRenderer | undefined;
    const resets: string[] = [];
    try {
      DialStore.registerPanel(a, 'A', { zoom: [1, 0, 4, 0.1], grid: true });
      DialStore.registerPanel(b, 'B', { gap: [8, 0, 32, 1] });
      const rows = [
        { panelId: a, control: control(a, 'zoom') },
        { panelId: b, control: control(b, 'gap') },
        { panelId: a, control: control(a, 'grid') },
      ];
      const draw = (changed: boolean) => createElement(Section, {
        rows, title: 'Canvas', hint: 'The canvas.', changed, onReset: () => resets.push('canvas'),
      });
      act(() => { renderer = create(draw(false)); });
      const root = renderer!.root;
      // The folder markup a host finds rows by.
      const [folder] = byClass(root, 'dialkit-folder');
      const [content] = byClass(folder, 'dialkit-folder-content');
      assert.equal(byClass(content, 'dialkit-folder-inner').length, 1);
      // One renderer per run of rows from the same panel.
      assert.deepEqual(root.findAllByType(ControlRenderer).map(run => [run.props.panelId, run.props.controls.map((c: { path: string }) => c.path)]), [
        [a, ['zoom']], [b, ['gap']], [a, ['grid']],
      ]);
      const reset = root.findByProps({ className: 'dialkit-folder-reset' });
      assert.equal(reset.props['data-changed'], 'false');
      act(() => renderer!.update(draw(true)));
      assert.equal(root.findByProps({ className: 'dialkit-folder-reset' }).props['data-changed'], 'true');
      act(() => root.findByProps({ className: 'dialkit-folder-reset' }).props.onClick({ stopPropagation() {} }));
      assert.deepEqual(resets, ['canvas']);
      // A row follows its own panel's value.
      act(() => DialStore.updateValue(b, 'gap', 20));
      assert.equal(root.findByProps({ label: 'Gap' }).props.value, 20);
    } finally {
      act(() => renderer?.unmount());
      DialStore.unregisterPanel(a);
      DialStore.unregisterPanel(b);
    }
  });

  it('redraws only the row whose value changed', () => {
    const id = 'section-rows';
    let renderer: ReactTestRenderer | undefined;
    try {
      DialStore.registerPanel(id, 'Rows', { zoom: [1, 0, 4, 0.1], gap: [8, 0, 32, 1] });
      const rows = [{ panelId: id, control: control(id, 'zoom') }, { panelId: id, control: control(id, 'gap') }];
      act(() => { renderer = create(createElement(Section, { rows, title: 'Canvas' })); });
      const slider = (label: string) => renderer!.root.findAllByType(Slider).find(row => row.props.label === label)!;
      const zoom = slider('Zoom').props;
      const gap = slider('Gap').props;
      act(() => DialStore.updateValue(id, 'gap', 20));
      assert.equal(slider('Zoom').props, zoom);
      assert.notEqual(slider('Gap').props, gap);
      assert.equal(slider('Gap').props.value, 20);
    } finally {
      act(() => renderer?.unmount());
      DialStore.unregisterPanel(id);
    }
  });

  it('shows one header for a lone transition, in a section and in a panel folder', () => {
    const id = 'section-lone';
    const config = {
      motion: { ease: { type: 'spring', visualDuration: 0.3, bounce: 0.2 } },
      grouped: { ease: { type: 'spring', visualDuration: 0.3, bounce: 0.2 }, speed: [1, 0, 3, 0.1] },
      ease: { type: 'spring', visualDuration: 0.4, bounce: 0.1 },
    } satisfies DialConfig;
    // The copy menu mounts its buttons in an effect, which needs a DOM: draw one level only.
    const shallow = createShallowRenderer();
    try {
      DialStore.registerPanel(id, 'Lone', config);
      const section = () => {
        shallow.render(createElement(Section, { rows: [{ panelId: id, control: control(id, 'ease') }], title: 'Spring' }));
        return shallow.getRenderOutput() as Drawn;
      };
      let folder = section();
      assert.equal(folder.type, Folder);
      assert.equal(folder.props.title, 'Spring');
      const [lone] = rowsOf(folder);
      assert.equal(lone.type, TransitionControl);
      assert.equal(lone.props.bare, true);
      const menu = rowsOf(folder.props.actions);
      assert.deepEqual(menu.map(item => [item.type, item.props.path]), [[TransitionCopyMenu, 'ease']]);
      // Without a host reset, the header resets the transition.
      assert.equal(folder.props.changed, false);
      DialStore.updateValue(id, 'ease', { type: 'spring', visualDuration: 0.8, bounce: 0.1 });
      folder = section();
      assert.equal(folder.props.changed, true);
      (folder.props.onReset as () => void)();
      assert.deepEqual(DialStore.getValue(id, 'ease'), config.ease);

      // A panel folder whose only row is a transition draws the same way.
      const folderOf = (path: string) => {
        shallow.render(createElement(ControlRenderer, { panelId: id, controls: DialStore.getPanel(id)!.controls.filter(c => c.path === path), values: DialStore.getValues(id) }));
        return drawnBy(rowsOf(shallow.getRenderOutput())[0]);
      };
      folder = folderOf('motion');
      assert.equal(folder.type, Folder);
      const row = drawnBy(rowsOf(folder)[0]);
      assert.equal(row.type, TransitionControl);
      assert.equal(row.props.bare, true);
      const actions = folder.props.actions as Drawn;
      assert.equal(actions.type, TransitionCopyMenu);
      assert.equal(actions.props.path, 'motion.ease');
      assert.equal(typeof folder.props.onReset, 'function');
      // A transition with other rows keeps its own folder.
      folder = folderOf('grouped');
      assert.equal(folder.props.actions, undefined);
      assert.equal(folder.props.onReset, undefined);
      const first = drawnBy(rowsOf(folder)[0]);
      assert.equal(first.type, TransitionControl);
      assert.equal(first.props.bare, false);
    } finally {
      shallow.unmount();
      DialStore.unregisterPanel(id);
    }
  });
});
