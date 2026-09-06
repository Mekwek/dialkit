import { mkdir, readFile, writeFile } from 'node:fs/promises';

const css = await readFile('src/styles/theme.css', 'utf8');
await mkdir('dist/vanilla', { recursive: true });
await writeFile('dist/styles.css', css);
// Plain HTML can run entirely offline. Keep the shared theme and its font
// fallback, with no remote font request in the dependency-free entry.
await writeFile('dist/vanilla/styles.css', css.replace(/^@import\s+url\([^\n]+\);\s*\n/gm, ''));
