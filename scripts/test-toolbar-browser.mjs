// Run npm run build, then node scripts/build-toolbar-fixtures.mjs.
// Serve .toolbar-fixtures on port 3011, or set DIALKIT_FIXTURE_URL.
// DIALKIT_PLAYWRIGHT can point to an existing Playwright installation.
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
const { chromium } = await import(
  process.env.DIALKIT_PLAYWRIGHT || "playwright"
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const base = process.env.DIALKIT_FIXTURE_URL || "http://127.0.0.1:3011";
try {
  for (const framework of ["react", "solid", "vue", "svelte", "vanilla"]) {
    for (const kind of ["", "-timeline"]) {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${base}/${framework}${kind}.html`);
      const trigger = page.getByRole("button", {
        name: "Versions",
        exact: true,
      });
      const open = async () => {
        await trigger.press("ArrowDown");
        await page.getByRole("menu").waitFor();
      };
      const create = async () => {
        await open();
        await page
          .getByRole("menuitem", { name: "New version", exact: true })
          .press("Enter");
      };
      assert.equal(await trigger.isEnabled(), true);
      assert.equal(
        await page
          .getByRole("button", { name: "Add preset", exact: true })
          .count(),
        0,
      );
      await create();
      assert.equal((await trigger.innerText()).trim(), "V2");
      assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      if (!kind) {
        await page
          .getByRole("textbox", { name: "Title", exact: true })
          .fill("Saved");
        await open();
        await page
          .getByRole("menuitemradio", { name: "V1", exact: true })
          .press("Enter");
        assert.equal(
          await page
            .getByRole("textbox", { name: "Title", exact: true })
            .inputValue(),
          "Original",
        );
        await open();
        await page
          .getByRole("menuitemradio", { name: "V2", exact: true })
          .press("Enter");
        assert.equal(
          await page
            .getByRole("textbox", { name: "Title", exact: true })
            .inputValue(),
          "Saved",
        );
      }
      await create();
      assert.equal((await trigger.innerText()).trim(), "V3");
      await open();
      await page
        .getByRole("menuitem", { name: "Delete V2", exact: true })
        .press("Enter");
      await page
        .getByRole("menuitem", { name: "New version", exact: true })
        .press("Enter");
      assert.equal((await trigger.innerText()).trim(), "V4");
      await open();
      for (const name of ["V3", "V4"]) {
        await page
          .getByRole("menuitem", { name: `Delete ${name}`, exact: true })
          .press("Enter");
      }
      assert.equal(await trigger.isEnabled(), true);
      await page
        .getByRole("menuitem", { name: "New version", exact: true })
        .press("Enter");
      assert.equal((await trigger.innerText()).trim(), "V2");
      await open();
      await page
        .getByRole("menuitemradio", { name: "V2", exact: true })
        .press("Escape");
      assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      assert.equal(
        await trigger.evaluate((el) => el === document.activeElement),
        true,
      );
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        `${framework}${kind}: version lifecycle and keyboard checks passed`,
      );
    }
  }
  // Accordion roots: one top-level folder open per panel, nested folders and
  // panel sections independent, and the open folder kept across config changes.
  for (const framework of ["react", "solid", "vue", "svelte", "vanilla"]) {
    for (const query of ["", "?multiple"]) {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${base}/${framework}-accordion.html${query}`);
      const header = (name) => page.getByRole("button", { name, exact: true });
      const expectOpen = async (expected) => {
        const read = () =>
          Promise.all(
            Object.keys(expected).map(async (name) => [
              name,
              // One read per header: a folder leaving between a count and a
              // getAttribute would make the latter wait for it until timeout.
              await header(name).evaluateAll(
                (buttons) => buttons[0]?.getAttribute("aria-expanded") ?? "missing",
              ),
            ]),
          ).then(Object.fromEntries);
        for (let i = 0; i < 20; i++) {
          if (isDeepStrictEqual(await read(), expected)) break;
          await page.waitForTimeout(50);
        }
        assert.deepEqual(await read(), expected);
      };
      const updateConfig = (config) =>
        page.evaluate(
          (config) =>
            window.DialStore.updatePanel("accordion", "Fixture", config),
          config,
        );
      await header("Camera").waitFor();
      await expectOpen({
        Camera: "true",
        Lens: "true",
        Lighting: "false",
        Effects: "false",
      });
      if (query) {
        await expectOpen({ Second: "true", Alpha: "true", Beta: "false" });
        await header("Beta").click();
        await expectOpen({
          Second: "true",
          Fixture: "true",
          Alpha: "false",
          Beta: "true",
          Camera: "true",
        });
      } else {
        await header("Lighting").click();
        await expectOpen({
          Camera: "false",
          Lighting: "true",
          Effects: "false",
        });
        await header("Lighting").click();
        await expectOpen({
          Camera: "false",
          Lighting: "false",
          Effects: "false",
        });
        await header("Effects").press("Enter");
        await expectOpen({
          Camera: "false",
          Lighting: "false",
          Effects: "true",
        });
        await header("Camera").click();
        await header("Lens").click();
        await expectOpen({ Camera: "true", Lens: "false", Effects: "false" });
        // Switching between one panel and several keeps the open folder.
        await header("Lighting").click();
        await expectOpen({ Camera: "false", Lighting: "true" });
        await page.evaluate(() =>
          window.DialStore.registerPanel("second", "Second", {
            alpha: { a: [1, 0, 2] },
          }),
        );
        await header("Second").waitFor();
        await expectOpen({ Camera: "false", Lighting: "true" });
        await page.evaluate(() => window.DialStore.unregisterPanel("second"));
        await header("Second").waitFor({ state: "detached" });
        await expectOpen({ Camera: "false", Lighting: "true" });
        // A panel registered again under the same ID starts from its default.
        await page.evaluate(() => window.DialStore.unregisterPanel("accordion"));
        await header("Camera").waitFor({ state: "detached" });
        const fixtureConfig = {
          camera: { distance: [8, 1, 20], lens: { zoom: [1, 0, 4] } },
          lighting: { flash: { type: "action" } },
          effects: { bloom: [0.8, 0, 1] },
        };
        await page.evaluate(
          (config) =>
            window.DialStore.registerPanel("accordion", "Fixture", config),
          fixtureConfig,
        );
        await expectOpen({ Camera: "true", Lighting: "false", Effects: "false" });
        // A config change keeps the open folder while it exists.
        await header("Lighting").click();
        await updateConfig({
          camera: { distance: [8, 1, 30], lens: { zoom: [1, 0, 4] } },
          lighting: { flash: { type: "action" } },
          effects: { bloom: [0.8, 0, 1] },
        });
        await expectOpen({
          Camera: "false",
          Lighting: "true",
          Effects: "false",
        });
        // Removing it opens the first folder again.
        await updateConfig({
          camera: { distance: [8, 1, 30], lens: { zoom: [1, 0, 4] } },
          effects: { bloom: [0.8, 0, 1] },
        });
        await expectOpen({
          Camera: "true",
          Lighting: "missing",
          Effects: "false",
        });
        // Unregistering and registering in the same tick, as a hot reload
        // does, keeps the open folder while the panel stays mounted. Solid
        // and vanilla rebuild the panel, so it starts from its default.
        await header("Effects").click();
        await page.evaluate((config) => {
          window.DialStore.unregisterPanel("accordion");
          window.DialStore.registerPanel("accordion", "Fixture", config);
        }, fixtureConfig);
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        const remounts = framework === "solid" || framework === "vanilla";
        await expectOpen({
          Camera: String(remounts),
          Lighting: "false",
          Effects: String(!remounts),
        });
      }
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}-accordion${query}: accordion checks passed`);
    }
  }
} finally {
  await browser.close();
}
