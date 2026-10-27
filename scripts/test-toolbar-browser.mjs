// Run npm run build, then node scripts/build-toolbar-fixtures.mjs.
// Serve .toolbar-fixtures on port 3011, or set DIALKIT_FIXTURE_URL.
// DIALKIT_PLAYWRIGHT can point to an existing Playwright installation.
import assert from "node:assert/strict";
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
      if (!kind) {
        // A click lights the field without a ring; keyboard focus adds one.
        const style = (selector, property) =>
          page
            .locator(selector)
            .first()
            .evaluate((el, name) => getComputedStyle(el)[name], property);
        const title = page.getByRole("textbox", { name: "Title", exact: true });
        await title.click();
        assert.equal(await title.getAttribute("data-pointer-focus"), "");
        assert.equal(
          await style(".dialkit-text-control", "outlineStyle"),
          "none",
        );
        assert.equal(
          await style(".dialkit-text-control", "backgroundColor"),
          "rgba(0, 0, 0, 0.08)",
        );
        await page.keyboard.press("Tab");
        const hex = page.getByRole("textbox", {
          name: "Accent color value",
          exact: true,
        });
        assert.equal(await hex.getAttribute("data-pointer-focus"), null);
        assert.equal(await title.getAttribute("data-pointer-focus"), null);
        assert.equal(
          await style(".dialkit-color-control", "outlineStyle"),
          "solid",
        );
        assert.equal(
          await style(".dialkit-text-control", "outlineStyle"),
          "none",
        );
        await page.locator("h1").click();
        await hex.click();
        assert.equal(
          await style(".dialkit-color-control", "outlineStyle"),
          "none",
        );
        assert.deepEqual(
          await hex.evaluate((el) => [el.selectionStart, el.selectionEnd]),
          [0, 7],
        );
        // Values and folder titles take the focus color under the pointer.
        await page.locator("h1").click();
        await page.locator(".dialkit-color-control").hover();
        await page.waitForFunction(
          () =>
            getComputedStyle(document.querySelector(".dialkit-color-value"))
              .color === "rgb(0, 0, 0)",
        );
        await page.getByRole("button", { name: "Group", exact: true }).hover();
        await page.waitForFunction(
          () =>
            getComputedStyle(
              document.querySelector(
                ".dialkit-folder:not(.dialkit-folder-root) .dialkit-folder-title",
              ),
            ).color === "rgb(0, 0, 0)",
        );
        // An invalid hex stays red under the pointer.
        await hex.click();
        await page.keyboard.type("zz");
        await page.keyboard.press("Enter");
        assert.equal(await hex.getAttribute("aria-invalid"), "true");
        await page.locator(".dialkit-color-control").hover();
        await page.waitForTimeout(200);
        assert.equal(
          await style(".dialkit-color-value", "color"),
          "rgb(239, 119, 119)",
        );
        await page.keyboard.press("Escape");
        // The transition editor's Bézier field follows the same rule.
        const bezier = page.getByRole("textbox", {
          name: "Bézier coordinates",
          exact: true,
        });
        const easeRow = ".dialkit-labeled-control:has(.dialkit-text-input)";
        await bezier.click();
        assert.equal(await style(easeRow, "outlineStyle"), "none");
        assert.equal(
          await style(easeRow, "backgroundColor"),
          "rgba(0, 0, 0, 0.08)",
        );
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        assert.equal(await bezier.getAttribute("data-pointer-focus"), null);
        assert.equal(await style(easeRow, "outlineStyle"), "solid");
        // A folder header clicked with the mouse keeps no focus.
        const group = page.getByRole("button", { name: "Group", exact: true });
        for (const expanded of ["false", "true"]) {
          await group.click();
          assert.equal(await group.getAttribute("aria-expanded"), expanded);
          assert.equal(
            await group.evaluate((el) => el === document.activeElement),
            false,
          );
        }
        // A slider pressed with the pointer keeps no ring when its arrows are used.
        const slider = page.locator(".dialkit-slider").first();
        await slider.click();
        await page.keyboard.press("ArrowRight");
        assert.equal(await style(".dialkit-slider", "outlineStyle"), "none");
      }
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        `${framework}${kind}: version lifecycle${kind ? " and keyboard" : ", keyboard and focus"} checks passed`,
      );
    }
  }
} finally {
  await browser.close();
}
