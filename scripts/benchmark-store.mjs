// Run with: node --import tsx scripts/benchmark-store.mjs [path/to/DialStore.ts]
// Each sample includes real snapshot work; timings are local comparisons, not browser FPS.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const { DialStore } = await import(pathToFileURL(resolve(process.argv[2] ?? 'src/store/DialStore.ts')).href);
const samples = 7;
function measure(run) {
  run();
  return Array.from({ length: samples }, () => {
    const start = performance.now();
    run();
    return performance.now() - start;
  }).sort((a, b) => a - b)[Math.floor(samples / 2)];
}

const results = [];
for (const count of [25, 250, 1000]) {
  const config = { group: Object.fromEntries(Array.from({ length: count }, (_, i) => [`value${i}`, [0, 0, 100, 1]])) };
  const id = `benchmark-${count}`;
  const path = `group.value${count - 1}`;
  const register = measure(() => {
    for (let i = 0; i < 100; i++) {
      DialStore.registerPanel(id, 'Benchmark', config);
      DialStore.unregisterPanel(id);
    }
  });
  DialStore.registerPanel(id, 'Benchmark', config);
  try {
    const changed = measure(() => {
      for (let i = 0; i < 5000; i++) DialStore.updateValue(id, path, i % 100);
    });
    const unchanged = measure(() => {
      for (let i = 0; i < 5000; i++) DialStore.updateValue(id, path, 99);
    });
    results.push({ controls: count, register100Ms: +register.toFixed(2), changed5000Ms: +changed.toFixed(2), unchanged5000Ms: +unchanged.toFixed(2) });
  } finally { DialStore.unregisterPanel(id); }
}
console.log(JSON.stringify(results, null, 2));
