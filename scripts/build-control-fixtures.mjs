// Browser fixtures exercise the published framework entries, including Svelte's packaged imports.
import { build } from 'esbuild';
import { solidPlugin } from 'esbuild-plugin-solid';
import { compile, compileModule } from 'svelte/compiler';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const out = resolve('example/public/control-fixtures');
await mkdir(out, { recursive: true });
const config = JSON.stringify({ cover: { type: 'image', options: [{ value: '/photos/one.avif', label: 'Photo 01' }, { value: '/photos/two.avif', label: 'Photo 02' }, { value: '/photos/three.avif', label: 'Photo 03' }, { value: '/photos/four.avif', label: 'Photo 04' }] }, uploadOnly: { type: 'image' }, accent: 'oklch(0.65 0.18 285 / 0.6)', choices: { type: 'select', options: Array.from({ length: 40 }, (_, i) => `Option ${i + 1}`) }, radius: [12, 0, 32], precise: [0.25, 0.05, 1.05, 0.1], title: { type: 'text', default: 'Example' }, notes: { type: 'text', default: 'Saved note.\nContinue here.', placeholder: 'Add some notes…' }, Details: { _collapsed: true, enabled: true, caption: { type: 'text', default: 'Example' } } });
const sources = {
  react: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {DialRoot, ShortcutsMenu, useDialKitController} from 'dialkit';
    function App(){const kit=useDialKitController('React',${config},{id:'fixture',defaultCollapsed:true,shortcuts:{radius:{key:'r'}}});return <><button onClick={()=>kit.setOpen(true)}>Open panel</button><button onClick={()=>kit.setOpen(false)}>Close panel</button><button onClick={()=>kit.resetValues()}>Reset values</button><output>{kit.values.accent}</output><img alt="Selected cover" src={kit.values.cover} width="180"/><div className="dialkit-root"><ShortcutsMenu panelId="fixture"/></div><DialRoot position={new URLSearchParams(location.search).get("position") || "bottom-right"} mode={new URLSearchParams(location.search).has('inline') ? 'inline' : 'popover'} productionEnabled theme="dark"/></>};createRoot(document.getElementById('app')).render(<App/>);`,
  solid: `import {render} from 'solid-js/web'; import {DialRoot,ShortcutsMenu,createDialKitController} from 'dialkit/solid';
    function App(){const kit=createDialKitController('Solid',${config},{id:'fixture',defaultCollapsed:true,shortcuts:{radius:{key:'r'}}});return <><button onClick={()=>kit.setOpen(true)}>Open panel</button><button onClick={()=>kit.setOpen(false)}>Close panel</button><button onClick={()=>kit.resetValues()}>Reset values</button><output>{kit.values().accent}</output><img alt="Selected cover" src={kit.values().cover} width="180"/><div class="dialkit-root"><ShortcutsMenu panelId="fixture"/></div><DialRoot position={new URLSearchParams(location.search).get("position") || "bottom-right"} mode={new URLSearchParams(location.search).has('inline') ? 'inline' : 'popover'} productionEnabled theme="dark"/></>};render(()=> <App/>,document.getElementById('app'));`,
  vue: `import {createApp,h} from 'vue'; import {DialRoot,ShortcutsMenu,useDialKitController} from 'dialkit/vue';
    createApp({setup(){const kit=useDialKitController('Vue',${config},{id:'fixture',defaultCollapsed:true,shortcuts:{radius:{key:'r'}}});return ()=>[h('button',{onClick:()=>kit.setOpen(true)},'Open panel'),h('button',{onClick:()=>kit.setOpen(false)},'Close panel'),h('button',{onClick:()=>kit.resetValues()},'Reset values'),h('output',kit.values.value.accent),h('img',{alt:'Selected cover',src:kit.values.value.cover,width:180}),h('div',{class:'dialkit-root'},[h(ShortcutsMenu,{panelId:'fixture'})]),h(DialRoot,{productionEnabled:true,theme:'dark',position:new URLSearchParams(location.search).get('position')||'bottom-right',mode:new URLSearchParams(location.search).has('inline')?'inline':'popover'})]}}).mount('#app');`,
  svelte: `<script>import {DialRoot,ShortcutsMenu,createDialKitController} from 'dialkit/svelte'; const kit=createDialKitController('Svelte',${config},{id:'fixture',defaultCollapsed:true,shortcuts:{radius:{key:'r'}}});</script><button onclick={()=>kit.setOpen(true)}>Open panel</button><button onclick={()=>kit.setOpen(false)}>Close panel</button><button onclick={()=>kit.resetValues()}>Reset values</button><output>{kit.values.accent}</output><img alt="Selected cover" src={kit.values.cover} width="180"/><div class="dialkit-root"><ShortcutsMenu panelId="fixture"/></div><DialRoot position={new URLSearchParams(location.search).get("position") || "bottom-right"} mode={new URLSearchParams(location.search).has('inline') ? 'inline' : 'popover'} productionEnabled theme="dark"/>`,
};
for (const [framework, original] of Object.entries(sources)) {
  const entryName = framework === 'react' ? 'dialkit' : `dialkit/${framework}`;
  const extra = `import {DialStore} from '${entryName}'; if(new URLSearchParams(location.search).has('multiple')) DialStore.registerPanel('second','Second panel',{speed:1});`;
  const source = framework === 'svelte' ? original.replace('<script>', '<script>' + extra) : extra + original;
  const entry = resolve(out, `${framework}.${framework === 'svelte' ? 'svelte' : 'tsx'}`);
  await writeFile(entry, source);
  let contents = source;
  if (framework === 'svelte') contents = `import {mount} from 'svelte';import App from './svelte.svelte';mount(App,{target:document.getElementById('app')});`;
  const main = framework === 'svelte' ? resolve(out, 'svelte-main.ts') : entry;
  if (framework === 'svelte') await writeFile(main, contents);
  await build({ entryPoints: [main], bundle: true, format: 'esm', outfile: resolve(out, `${framework}.js`), conditions: ['browser'], alias: { react: resolve('node_modules/react'), 'react-dom': resolve('node_modules/react-dom') }, define: { 'process.env.NODE_ENV': '"development"' }, plugins: [
    ...(framework === 'solid' ? [solidPlugin()] : []),
    { name: 'svelte-fixture', setup(b) { b.onLoad({ filter: /\.svelte\.js$/ }, async args => ({ contents: compileModule(await readFile(args.path, 'utf8'), { filename: args.path, generate: 'client' }).js.code, loader: 'js' })); b.onLoad({ filter: /\.svelte$/ }, async args => ({ contents: compile(await readFile(args.path, 'utf8'), { filename: args.path, generate: 'client' }).js.code, loader: 'js' })); } },
  ] });
  await writeFile(resolve(out, `${framework}.html`), `<!doctype html><html><head><meta charset="utf-8"><title>${framework} controls</title><link rel="stylesheet" href="/node_modules/dialkit/dist/styles.css"><style>*{box-sizing:border-box}body{margin:24px;background:#171717;color:#ddd;font:13px system-ui}#app>button{margin-right:8px}output{display:block;margin:16px 0}</style></head><body><div id="app"></div><script type="module" src="./${framework}.js"></script></body></html>`);
}
console.log('Framework fixtures: /control-fixtures/{react,solid,vue,svelte}.html');
