import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, it } from 'node:test';
import { createElement, StrictMode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { createRenderer, defineComponent, h } from 'vue';
import { compileModule } from 'svelte/compiler';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import { useDialKitController } from './hooks/useDialKit';
import { useDialKitController as useVueDialKitController } from './vue/useDialKit';
import { DialStore, type DialConfig } from './store/DialStore';

const config = { group: { position: { type: 'pad' } } } satisfies DialConfig;
const changed = { x: 0.75, y: -0.4 };

describe('DialPad framework values', () => {
  it('updates and resets the React controller under StrictMode', () => {
    const id = 'pad-react';
    let dial: ReturnType<typeof useDialKitController<typeof config>>;
    let renderer: ReactTestRenderer | undefined;
    function Harness() { dial = useDialKitController('Pad', config, { id }); return null; }
    try {
      act(() => { renderer = create(createElement(StrictMode, null, createElement(Harness))); });
      assert.deepEqual(dial!.values.group.position, { x: 0, y: 0 });
      act(() => dial.setValues({ group: { position: changed } }));
      assert.deepEqual(dial!.values.group.position, changed);
      act(() => dial.resetValues());
      assert.deepEqual(dial!.values.group.position, { x: 0, y: 0 });
    } finally { act(() => renderer?.unmount()); }
    assert.equal(DialStore.getPanel(id), undefined);
  });

  it('updates and resets the Vue computed controller values', () => {
    const id = 'pad-vue';
    let dial: ReturnType<typeof useVueDialKitController<typeof config>>;
    // The hook needs a mounted owner but no browser DOM or rendered controls.
    const renderer = createRenderer<object, object>({
      patchProp() {}, insert() {}, remove() {},
      createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
      setText() {}, setElementText() {}, parentNode: () => null, nextSibling: () => null,
      querySelector: () => null, setScopeId() {}, insertStaticContent: () => [{}, {}],
    });
    const app = renderer.createApp(defineComponent({
      setup() { dial = useVueDialKitController('Pad', config, { id }); return () => h('div'); },
    }));
    try {
      app.mount({});
      assert.deepEqual(dial!.values.value.group.position, { x: 0, y: 0 });
      dial!.setValues({ group: { position: changed } });
      assert.deepEqual(dial!.values.value.group.position, changed);
      dial!.resetValues();
      assert.deepEqual(dial!.values.value.group.position, { x: 0, y: 0 });
    } finally { app.unmount(); }
    assert.equal(DialStore.getPanel(id), undefined);
  });

  it('updates the Solid store in its browser condition', () => {
    const script = `
      import assert from 'node:assert/strict';
      import { createRoot } from 'solid-js';
      import { createDialKitController } from './src/solid/createDialKit.ts';
      import { DialStore } from './src/store/DialStore.ts';
      let dispose, dial;
      createRoot(cleanup => {
        dispose = cleanup;
        dial = createDialKitController('Pad', ${JSON.stringify(config)}, { id: 'pad-solid' });
      });
      await new Promise(resolve => queueMicrotask(resolve));
      assert.deepEqual(JSON.parse(JSON.stringify(dial.values().group.position)), { x: 0, y: 0 });
      dial.setValues({ group: { position: ${JSON.stringify(changed)} } });
      assert.deepEqual(JSON.parse(JSON.stringify(dial.values().group.position)), ${JSON.stringify(changed)});
      dial.resetValues();
      assert.deepEqual(JSON.parse(JSON.stringify(dial.values().group.position)), { x: 0, y: 0 });
      dispose();
      assert.equal(DialStore.getPanel('pad-solid'), undefined);
    `;
    const result = spawnSync(process.execPath, ['--conditions=browser', '--import', 'tsx', '--input-type=module', '-e', script], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  });

  it('keeps Svelte pad values as reactive pairs instead of recursing into the axis config', () => {
    const source = readFileSync('src/svelte/createDialKit.svelte.ts', 'utf8')
      .replaceAll("from 'dialkit/store'", `from '${pathToFileURL(join(process.cwd(), 'src/store/DialStore.ts')).href}'`);
    const harness = `
      import { flushSync } from 'svelte';
      import assert from 'node:assert/strict';
      export function verify() {
        let dial;
        const dispose = $effect.root(() => {
          dial = createDialKitController('Pad', ${JSON.stringify(config)}, { id: 'pad-svelte' });
        });
        try {
          flushSync();
          assert.deepEqual(JSON.parse(JSON.stringify(dial.values.group.position)), { x: 0, y: 0 });
          dial.setValues({ group: { position: ${JSON.stringify(changed)} } });
          flushSync();
          assert.deepEqual(JSON.parse(JSON.stringify(dial.values.group.position)), ${JSON.stringify(changed)});
          dial.resetValues();
          flushSync();
          assert.deepEqual(JSON.parse(JSON.stringify(dial.values.group.position)), { x: 0, y: 0 });
        } finally { dispose(); }
        assert.equal(DialStore.getPanel('pad-svelte'), undefined);
      }
    `;
    const javascript = transpileModule(source + harness, { compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2020 } }).outputText;
    const compiled = compileModule(javascript, { filename: 'pad-test.svelte.js', generate: 'client' });
    const directory = mkdtempSync(join(process.cwd(), '.dial-pad-test-'));
    const file = join(directory, 'pad.mjs');
    try {
      writeFileSync(file, compiled.js.code);
      const script = `const { verify } = await import(${JSON.stringify(pathToFileURL(file).href)}); verify();`;
      const result = spawnSync(process.execPath, ['--conditions=browser', '--import', 'tsx', '--input-type=module', '-e', script], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
