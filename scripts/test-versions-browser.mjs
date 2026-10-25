// Run after npm run build. Exercises the version gallery end to end: save with
// capture and flash, thumbnails, rename, and the grid, in the plain-HTML bundle
// and (when served) every framework fixture.
// DIALKIT_PLAYWRIGHT may point to an existing Playwright installation.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.DIALKIT_PLAYWRIGHT || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const [script, styles] = await Promise.all([readFile('dist/vanilla/browser.global.js', 'utf8'), readFile('dist/vanilla/styles.css', 'utf8')]);
try {
  await page.setContent(`<!doctype html><style>${styles} body { margin: 0; background: #f2efe9; } #card { width: 200px; height: 200px; margin: 120px; }</style><div id="card"></div>`);
  await page.addScriptTag({ content: script });
  await page.evaluate(() => {
    const kit = DialKit.createDialKit('Card', { color: { type: 'color', default: '#ff5b2e' } });
    const paint = () => { document.getElementById('card').style.background = kit.values.color; };
    kit.subscribe(paint);
    window.kit = kit;
    window.root = DialKit.createDialRoot({ versions: 'thumbnails' });
  });
  const thumbs = page.locator('.dialkit-version-thumb');
  const toggle = page.getByRole('button', { name: /^All versions/ });

  // One version: no thumbnails, no grid toggle.
  assert.equal(await page.locator('.dialkit-versions-strip').isVisible(), false);
  assert.equal(await toggle.isVisible(), false);

  await page.getByRole('button', { name: 'Save version' }).click();
  // The shutter flashes opaque white over the page before the flight.
  const flash = await page.locator('.dialkit-appshot-shutter').evaluate(node => new Promise(resolve => {
    const check = () => {
      const style = getComputedStyle(node);
      if (Number(style.opacity) >= 0.99) resolve(style.backgroundColor);
      else requestAnimationFrame(check);
    };
    check();
  }));
  assert.equal(flash, 'rgb(255, 255, 255)');
  await page.locator('.dialkit-appshot').waitFor({ state: 'detached' });
  assert.equal(await thumbs.count(), 2);
  assert.equal(await thumbs.locator('img').count(), 2);
  assert.deepEqual(await thumbs.locator('.dialkit-version-thumb-label').allInnerTexts(), ['V1', 'V2']);

  // Inline rename.
  await thumbs.nth(1).locator('.dialkit-version-thumb-label').dblclick();
  await page.keyboard.type('Ember');
  await page.keyboard.press('Enter');
  assert.equal(await thumbs.nth(1).locator('.dialkit-version-thumb-label').innerText(), 'Ember');

  // Edit V2, then pick V1 from the grid; values follow.
  await page.evaluate(() => kit.setValues({ color: '#2e6bff' }));
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  await page.locator('.dialkit-version-overlay:not([data-animating])').waitFor();
  await page.locator('.dialkit-version-card-frame').first().click();
  await page.locator('.dialkit-version-overlay').waitFor({ state: 'detached' });
  assert.equal(await page.evaluate(() => kit.values.color), '#ff5b2e');
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');

  // The toggle closes the grid too.
  await toggle.click();
  await page.locator('.dialkit-version-overlay:not([data-animating])').waitFor();
  await toggle.click();
  await page.locator('.dialkit-version-overlay').waitFor({ state: 'detached' });

  // With the grid open, a panel thumbnail zooms into its version.
  await toggle.click();
  await page.locator('.dialkit-version-overlay:not([data-animating])').waitFor();
  await thumbs.nth(1).locator('.dialkit-version-thumb-frame').click();
  await page.locator('.dialkit-version-overlay').waitFor({ state: 'detached' });
  assert.equal(await page.evaluate(() => kit.values.color), '#2e6bff');

  assert.deepEqual(errors, []);
  console.log('vanilla bundle: version gallery checks passed');

  // Every framework mounts the same gallery; check each packaged adapter.
  // Run node scripts/build-toolbar-fixtures.mjs and serve .toolbar-fixtures
  // on port 3011 (or set DIALKIT_FIXTURE_URL) to include them.
  const fixtures = process.env.DIALKIT_FIXTURE_URL || 'http://127.0.0.1:3011';
  if (await fetch(`${fixtures}/react.html`).then(r => r.ok, () => false)) {
    for (const name of ['react', 'solid', 'vue', 'svelte', 'vanilla']) {
      const fixture = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const fixtureErrors = [];
      fixture.on('pageerror', error => fixtureErrors.push(error.message));
      await fixture.goto(`${fixtures}/${name}.html?versions=thumbnails`);
      const cards = fixture.locator('.dialkit-version-thumb');
      const all = fixture.getByRole('button', { name: /^All versions/ });
      await fixture.getByRole('button', { name: 'Copy parameters' }).waitFor();
      assert.equal(await all.isVisible(), false, `${name}: grid toggle hidden with one version`);
      await fixture.getByRole('button', { name: 'Save version' }).click();
      const white = await fixture.locator('.dialkit-appshot-shutter').evaluate(node => getComputedStyle(node).backgroundColor);
      assert.equal(white, 'rgb(255, 255, 255)', `${name}: white flash`);
      await fixture.locator('.dialkit-appshot').waitFor({ state: 'detached' });
      assert.equal(await cards.locator('img').count(), 2, `${name}: two thumbnails`);
      await cards.nth(1).locator('.dialkit-version-thumb-label').dblclick();
      await fixture.keyboard.type('Ember');
      await fixture.keyboard.press('Enter');
      assert.equal(await cards.nth(1).locator('.dialkit-version-thumb-label').innerText(), 'Ember', `${name}: rename`);
      await all.click();
      await fixture.locator('.dialkit-version-overlay:not([data-animating])').waitFor();
      assert.equal(await fixture.getByRole('button', { name: 'Copy parameters' }).isDisabled(), true, `${name}: copy disabled in grid`);
      await fixture.locator('.dialkit-version-card-frame').first().click();
      await fixture.locator('.dialkit-version-overlay').waitFor({ state: 'detached' });
      assert.equal(await cards.first().getAttribute('data-active'), 'true', `${name}: V1 selected from grid`);
      assert.equal(await fixture.getByRole('button', { name: 'Copy parameters' }).isDisabled(), false, `${name}: copy enabled after grid`);
      assert.deepEqual(fixtureErrors, [], `${name}: no page errors`);
      await fixture.close();
      console.log(`${name}: version gallery checks passed`);
    }
  } else {
    console.log(`Framework fixtures not served at ${fixtures}; skipped.`);
  }
} finally {
  await browser.close();
}
