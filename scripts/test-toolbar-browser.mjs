// Run npm run build, then node scripts/build-toolbar-fixtures.mjs.
// Serve .toolbar-fixtures on port 3011, or set DIALKIT_FIXTURE_URL.
// DIALKIT_PLAYWRIGHT can point to an existing Playwright installation.
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.DIALKIT_PLAYWRIGHT || "playwright"
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const base = process.env.DIALKIT_FIXTURE_URL || "http://127.0.0.1:3011";
// Drags the middle of a clip bar by dx pixels.
const drag = async (page, bar, dx) => {
  const box = await bar.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 8 });
  await page.mouse.up();
};
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
      assert.equal((await trigger.innerText()).trim(), "Version 2");
      assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      if (!kind) {
        await page
          .getByRole("textbox", { name: "Title", exact: true })
          .fill("Saved");
        await open();
        await page
          .getByRole("menuitemradio", { name: "Version 1", exact: true })
          .press("Enter");
        assert.equal(
          await page
            .getByRole("textbox", { name: "Title", exact: true })
            .inputValue(),
          "Original",
        );
        await open();
        await page
          .getByRole("menuitemradio", { name: "Version 2", exact: true })
          .press("Enter");
        assert.equal(
          await page
            .getByRole("textbox", { name: "Title", exact: true })
            .inputValue(),
          "Saved",
        );
      }
      await create();
      assert.equal((await trigger.innerText()).trim(), "Version 3");
      await open();
      await page
        .getByRole("menuitem", { name: "Delete Version 2", exact: true })
        .press("Enter");
      await page
        .getByRole("menuitem", { name: "New version", exact: true })
        .press("Enter");
      assert.equal((await trigger.innerText()).trim(), "Version 4");
      await open();
      for (const name of ["Version 3", "Version 4"]) {
        await page
          .getByRole("menuitem", { name: `Delete ${name}`, exact: true })
          .press("Enter");
      }
      assert.equal(await trigger.isEnabled(), true);
      await page
        .getByRole("menuitem", { name: "New version", exact: true })
        .press("Enter");
      assert.equal((await trigger.innerText()).trim(), "Version 2");
      await open();
      await page
        .getByRole("menuitemradio", { name: "Version 2", exact: true })
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

    // Every move of a drag edits the clip; the bar keeps the pointer to the end.
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/${framework}-clips.html`);
    const id = await page.evaluate(() => window.DialStore.getPanels("timeline")[0].id);
    const px = (await page.locator(".dialkit-timeline-ruler").boundingBox()).width / 3.5;
    const rowBar = (name) =>
      page.locator(".dialkit-timeline-row", { hasText: name }).locator(".dialkit-timeline-clip");
    await drag(page, rowBar("Title"), 0.4 * px);
    const titleAt = await page.evaluate((id) => window.DialStore.getValues(id)["title.at"], id);
    assert.ok(Math.abs(titleAt - 1.4) < 0.02, `Title dragged to ${titleAt}, expected 1.4`);

    assert.deepEqual(errors, []);
    await page.close();
    console.log(`${framework}-clips: drag checks passed`);
  }
} finally {
  await browser.close();
}
