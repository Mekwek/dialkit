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
      // A timeline calls its versions sequences.
      const newItem = kind ? "New sequence" : "New version";
      const version = (n) => (kind ? `Sequence ${n}` : `V${n}`);
      const create = async () => {
        await open();
        await page
          .getByRole("menuitem", { name: newItem, exact: true })
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
      assert.equal((await trigger.innerText()).trim(), version(2));
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
          .getByRole("menuitemradio", { name: version(2), exact: true })
          .press("Enter");
        assert.equal(
          await page
            .getByRole("textbox", { name: "Title", exact: true })
            .inputValue(),
          "Saved",
        );
      }
      await create();
      assert.equal((await trigger.innerText()).trim(), version(3));
      await open();
      await page
        .getByRole("menuitem", { name: `Delete ${version(2)}`, exact: true })
        .press("Enter");
      await page
        .getByRole("menuitem", { name: newItem, exact: true })
        .press("Enter");
      assert.equal((await trigger.innerText()).trim(), version(4));
      await open();
      for (const name of [version(3), version(4)]) {
        await page
          .getByRole("menuitem", { name: `Delete ${name}`, exact: true })
          .press("Enter");
      }
      assert.equal(await trigger.isEnabled(), true);
      await page
        .getByRole("menuitem", { name: newItem, exact: true })
        .press("Enter");
      assert.equal((await trigger.innerText()).trim(), version(2));
      const item = (role, name) => page.getByRole(role, { name, exact: true });
      const order = async (expected) => {
        for (let tries = 0; tries < 50; tries++) {
          const names = await page.getByRole("menuitemradio").allInnerTexts();
          if (names.join() === expected.join()) return;
          await page.waitForTimeout(20);
        }
        assert.deepEqual(await page.getByRole("menuitemradio").allInnerTexts(), expected);
      };
      const focused = (locator) => locator.evaluate((el) => el === document.activeElement);
      await create();
      await open();
      await item("menuitem", `Rename ${version(2)}`).press("Enter");
      const name = item("textbox", "Version name");
      assert.equal(await focused(name), true);
      await page.keyboard.type("Warm");
      await page.keyboard.press("Enter");
      assert.equal(await trigger.getAttribute("aria-expanded"), "true");
      await item("menuitem", "Rename Warm").press("Enter");
      await page.keyboard.type("Cold");
      await page.keyboard.press("Escape");
      assert.equal(await trigger.getAttribute("aria-expanded"), "true");
      await order(["V1", "Warm", version(3)]);
      await page.locator(".dialkit-preset-item[data-preset-id]").first().locator(".dialkit-preset-more").click();
      assert.equal(await focused(item("menuitem", "More actions for Warm")), true);
      assert.equal(await trigger.getAttribute("aria-expanded"), "true");
      // The arrows go from a row's name to its menu icon, then through the actions it reveals.
      await item("menuitemradio", "Warm").focus();
      for (const next of ["More actions for Warm", "Rename Warm", "Lock Warm", "Delete Warm"]) {
        await page.keyboard.press("ArrowDown");
        assert.equal(await focused(item("menuitem", next)), true);
      }

      await item("menuitem", "Lock Warm").press("Enter");
      await item("menuitem", "Unlock Warm").waitFor();
      assert.equal(await item("menuitem", "Delete Warm").count(), 0);
      // A locked row's lock takes the menu icon's place in the order too.
      await item("menuitemradio", "Warm").focus();
      for (const next of ["Unlock Warm", "Rename Warm"]) {
        await page.keyboard.press("ArrowDown");
        assert.equal(await focused(item("menuitem", next)), true);
      }
      if (!kind) {
        await item("menuitemradio", "Warm").press("Enter");
        const title = page.getByRole("textbox", { name: "Title", exact: true });
        const saved = await title.inputValue();
        await title.fill("Edited");
        await open();
        await item("menuitemradio", "V1").press("Enter");
        await open();
        await item("menuitemradio", "Warm").press("Enter");
        assert.equal(await title.inputValue(), saved);
        await open();
      }

      await item("menuitemradio", "Warm").press("Alt+ArrowDown");
      await order(["V1", version(3), "Warm"]);
      assert.equal(await focused(item("menuitemradio", "Warm")), true);
      const label = (await trigger.innerText()).trim();
      await item("menuitemradio", "Warm").scrollIntoViewIfNeeded();
      const from = await item("menuitemradio", "Warm").boundingBox();
      const to = await item("menuitemradio", version(3)).boundingBox();
      await page.mouse.move(from.x + 10, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(from.x + 10, to.y + to.height / 2, { steps: 8 });
      await page.mouse.up();
      await order(["V1", "Warm", version(3)]);
      assert.equal(await trigger.getAttribute("aria-expanded"), "true");
      assert.equal((await trigger.innerText()).trim(), label);

      await item("menuitem", "Unlock Warm").press("Enter");
      await item("menuitem", "Delete Warm").press("Enter");
      await item("menuitem", `Delete ${version(3)}`).press("Enter");
      await order(["V1"]);
      await item("menuitem", newItem).press("Enter");
      assert.equal((await trigger.innerText()).trim(), version(2));
      await open();
      await page
        .getByRole("menuitemradio", { name: version(2), exact: true })
        .press("Escape");
      assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      assert.equal(
        await trigger.evaluate((el) => el === document.activeElement),
        true,
      );
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        `${framework}${kind}: version lifecycle, actions and keyboard checks passed`,
      );
    }
  }
} finally {
  await browser.close();
}
