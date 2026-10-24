// Build isolated browser fixtures against the packaged adapters after npm run build.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const require = createRequire(path.join(root, "package.json"));
const { build } = require("esbuild");
const { compile, compileModule } = require("svelte/compiler");
const out = path.resolve(
  process.env.DIALKIT_FIXTURE_DIR || ".toolbar-fixtures",
);
fs.mkdirSync(out, { recursive: true });
const config = `{ title: 'Original', group: { amount: [10, 0, 100] } }`;
const entries = {
  react: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {DialRoot,useDialKit} from 'dialkit'; function App(){useDialKit('Fixture',${config});return React.createElement(DialRoot,{defaultOpen:true,theme:'light'});}createRoot(document.getElementById('app')).render(React.createElement(App));`,
  solid: `import {render} from 'solid-js/web'; import {createComponent} from 'solid-js'; import {DialRoot,createDialKit} from 'dialkit/solid'; function App(){createDialKit('Fixture',${config});return createComponent(DialRoot,{defaultOpen:true,theme:'light'});}render(()=>createComponent(App,{}),document.getElementById('app'));`,
  vue: `import {createApp,h} from 'vue';import {DialRoot,useDialKit} from 'dialkit/vue';createApp({setup(){useDialKit('Fixture',${config});return ()=>h(DialRoot,{defaultOpen:true,theme:'light'});}}).mount('#app');`,
  vanilla: `import {createDialKit,createDialRoot} from 'dialkit/vanilla';createDialKit('Fixture',${config});createDialRoot({defaultOpen:true,theme:'light'});`,
  svelte: `import {mount} from 'svelte';import App from './Fixture.svelte';mount(App,{target:document.getElementById('app')});`,
};
const timelineConfig = `{ enter: { at: 0, duration: 0.5, from: { opacity: 0 }, to: { opacity: 1 } } }`;
for (const name of ["react", "solid", "vue", "vanilla"]) {
  let source = entries[name]
    .replaceAll(config, timelineConfig)
    .replaceAll("DialRoot", "DialTimeline")
    .replaceAll("useDialKit", "useDialTimeline")
    .replaceAll("createDialKit", "createDialTimeline");
  if (name === "vanilla")
    source = source
      .replace("createDialTimeline({", "createDialTimelineRoot({")
      .replace(
        "createDialTimeline,createDialTimeline}",
        "createDialTimeline,createDialTimelineRoot}",
      );
  entries[name + "-timeline"] = source;
}
entries["svelte-timeline"] = entries.svelte.replace(
  "Fixture.svelte",
  "TimelineFixture.svelte",
);
fs.writeFileSync(
  path.join(out, "TimelineFixture.svelte"),
  `<script>import {DialTimeline,createDialTimeline} from 'dialkit/svelte';createDialTimeline('Fixture',${timelineConfig});</script><DialTimeline defaultOpen={true} theme={new URLSearchParams(location.search).get('theme') || 'light'} />`,
);
// Three plain clips with an Export button. The store is exposed so checks
// can read and edit values.
const clipsConfig = `{ duration: 3.5, intro: { at: 0, duration: 0.5 }, title: { at: 1, duration: 0.5 }, outro: { at: 2.5, duration: 0.5 } }`;
const onExport = `(timeline) => { window.exported = timeline; }`;
const adapterEntry = { react: "dialkit", solid: "dialkit/solid", vue: "dialkit/vue", vanilla: "dialkit/vanilla" };
const clipFixtures = {
  clips: `{ autoplay: false }`,
};
for (const [kind, options] of Object.entries(clipFixtures)) {
  for (const [name, entry] of Object.entries(adapterEntry)) {
    entries[`${name}-${kind}`] = `import {DialStore} from '${entry}';window.DialStore=DialStore;` + entries[name + "-timeline"]
      .replace(`('Fixture',${timelineConfig})`, `('Fixture',${clipsConfig},${options})`)
      .replace("{defaultOpen:true,theme:'light'}", `{defaultOpen:true,theme:'light',onExport:${onExport}}`);
  }
  const file = `${kind[0].toUpperCase()}${kind.slice(1)}Fixture.svelte`;
  entries[`svelte-${kind}`] = entries.svelte.replace("Fixture.svelte", file);
  fs.writeFileSync(
    path.join(out, file),
    `<script>import {DialStore,DialTimeline,createDialTimeline} from 'dialkit/svelte';window.DialStore=DialStore;createDialTimeline('Fixture',${clipsConfig},${options});</script><DialTimeline defaultOpen={true} theme={new URLSearchParams(location.search).get('theme') || 'light'} onExport={${onExport}} />`,
  );
}
fs.writeFileSync(
  path.join(out, "Fixture.svelte"),
  `<script>import {DialRoot,createDialKit} from 'dialkit/svelte';createDialKit('Fixture',${config});</script><DialRoot defaultOpen={true} theme={new URLSearchParams(location.search).get('theme') || 'light'} />`,
);
const sveltePlugin = {
  name: "svelte",
  setup(b) {
    b.onLoad({ filter: /\.svelte$/ }, async ({ path: p }) => ({
      contents: compile(fs.readFileSync(p, "utf8"), {
        filename: p,
        generate: "client",
      }).js.code,
      loader: "js",
      resolveDir: path.dirname(p),
    }));
    b.onLoad({ filter: /\.svelte\.js$/ }, async ({ path: p }) => ({
      contents: compileModule(fs.readFileSync(p, "utf8"), {
        filename: p,
        generate: "client",
      }).js.code,
      loader: "js",
      resolveDir: path.dirname(p),
    }));
  },
};
for (const [name, entry] of Object.entries(entries)) {
  const contents = entry.replaceAll(
    "theme:'light'",
    "theme: new URLSearchParams(location.search).get('theme') || 'light'",
  );
  await build({
    stdin: { contents, resolveDir: out, sourcefile: name + "-entry.js" },
    outfile: path.join(out, name + ".js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    conditions: ["browser", "svelte"],
    nodePaths: [path.join(root, "node_modules")],
    alias: Object.fromEntries(
      ["store", "solid", "vue", "vanilla", "svelte", "timeline"]
        .map((n) => ["dialkit/" + n, path.join(root, "dist", n, "index.js")])
        .concat([["dialkit", path.join(root, "dist/index.js")]]),
    ),
    define: { "process.env.NODE_ENV": '"development"' },
    plugins: [sveltePlugin],
    logLevel: "error",
  });
  fs.writeFileSync(
    path.join(out, name + ".html"),
    `<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body><h1>${name}</h1><div id="app"></div><script type="module" src="${name}.js"></script></body></html>`,
  );
}
fs.copyFileSync("dist/styles.css", path.join(out, "styles.css"));
console.log(out);
