// Run npm run build, then node scripts/build-toolbar-fixtures.mjs.
// Serve .toolbar-fixtures on port 3011, or set DIALKIT_FIXTURE_URL.
// DIALKIT_PLAYWRIGHT can point to an existing Playwright installation.
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.DIALKIT_PLAYWRIGHT || "playwright"
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const base = process.env.DIALKIT_FIXTURE_URL || "http://127.0.0.1:3011";
// Drags the middle of a clip bar by dx pixels; snap holds Control.
const drag = async (page, bar, dx, snap = false) => {
  const box = await bar.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  if (snap) await page.keyboard.down("Control");
  await page.mouse.move(x + dx, y, { steps: 8 });
  await page.mouse.up();
  if (snap) await page.keyboard.up("Control");
};
const near = (actual, expected, label) =>
  assert.ok(
    Math.abs(actual - expected) < 3,
    `${label}: expected ${actual} ≈ ${expected}`,
  );
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

    // Header, ruler, Loop toggle and drags, on three clips.
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/${framework}-clips.html`);
    const id = await page.evaluate(() => window.DialStore.getPanels("timeline")[0].id);

    // The header shows no name, so the section carries it for assistive tech.
    const name = await page.evaluate(() => window.DialStore.getPanels("timeline")[0].name);
    assert.equal(await page.getByRole("group", { name, exact: true }).count(), 1);

    // Play, replay and loop sit at the header's left edge; versions, Copy
    // and collapse at its right edge.
    const header = await page.locator(".dialkit-timeline-header").boundingBox();
    const transport = page.locator(".dialkit-timeline-transport");
    const actions = page.locator(".dialkit-timeline-actions");
    assert.equal(await transport.getByRole("button").count(), 3);
    assert.equal(await transport.getByRole("button", { name: "Loop", exact: true }).count(), 1);
    assert.equal(await actions.getByRole("button", { name: "Versions", exact: true }).count(), 1);
    assert.equal(await actions.getByRole("button", { name: "Copy parameters", exact: true }).count(), 1);
    near((await transport.boundingBox()).x, header.x, "Transport starts at the header's left edge");
    const actionsBox = await actions.boundingBox();
    near(actionsBox.x + actionsBox.width, header.x + header.width, "Actions end at the header's right edge");

    // Copy is drawn like play, and collapse is as square as both.
    const look = (locator) =>
      locator.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return { width: rect.width, height: rect.height, background: style.backgroundColor, ink: getComputedStyle(node.querySelector("svg")).color };
      });
    const play = await look(transport.getByRole("button").first());
    const copy = await look(actions.getByRole("button", { name: "Copy parameters", exact: true }));
    const collapse = await look(actions.locator(".dialkit-timeline-chevron"));
    assert.deepEqual(copy, play, "Copy looks like play");
    near(collapse.width, play.width, "Collapse is as wide as play");
    near(collapse.height, play.height, "Collapse is as tall as play");

    // Ticks hang from the ruler's foot, a tenth of a major step apart, and
    // each label sits above its tick.
    const rulerBox = await page.locator(".dialkit-timeline-ruler").boundingBox();
    const ticks = await page.locator(".dialkit-timeline-tick").evaluateAll((nodes) =>
      nodes
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return { x: rect.x, bottom: rect.bottom, major: !/medium|fine/.test(node.className) };
        })
        .sort((a, b) => a.x - b.x),
    );
    const majors = ticks.filter((tick) => tick.major);
    assert.ok(majors.length >= 2, `expected major ticks, got ${majors.length}`);
    const fineStep = (majors[1].x - majors[0].x) / 10;
    ticks.forEach((tick, index) => {
      near(tick.bottom, rulerBox.y + rulerBox.height, `Tick ${index} hangs from the ruler's foot`);
      if (index > 0) near(tick.x - ticks[index - 1].x, fineStep, `Tick ${index} is a tenth of a step on`);
    });
    const labels = await page.locator(".dialkit-timeline-tick-label").evaluateAll((nodes) =>
      nodes.map((node) => {
        const label = node.getBoundingClientRect();
        const tick = node.parentElement.getBoundingClientRect();
        return { top: label.top, bottom: label.bottom, left: label.left, tickTop: tick.top, tickX: tick.x };
      }),
    );
    assert.equal(labels.length, majors.length);
    for (const label of labels) {
      assert.ok(label.top >= rulerBox.y - 1 && label.bottom <= label.tickTop, "Label sits above its tick");
      near(label.left, label.tickX, "Label starts at its tick");
    }
    // The playhead's flag hugs its digits and centres on a hairline stem.
    const scale = rulerBox.width / 3.5;
    await page.mouse.click(rulerBox.x + 1.75 * scale, rulerBox.y + rulerBox.height / 2);
    const flag = await page.locator(".dialkit-timeline-playhead-flag").boundingBox();
    const stem = await page.locator(".dialkit-timeline-playhead-stem").boundingBox();
    assert.ok(flag.width <= 38, `Flag is ${flag.width}px wide, expected at most 38`);
    assert.equal(stem.width, 1);
    near(flag.x + flag.width / 2, stem.x + stem.width / 2, "Flag centres on the stem");
    near(stem.x, rulerBox.x + 1.75 * scale, "Stem stands at the playhead");

    const loop = page.getByRole("button", { name: "Loop", exact: true });
    assert.equal(await loop.getAttribute("aria-pressed"), "false");
    await loop.click();
    assert.equal(await loop.getAttribute("aria-pressed"), "true");
    await loop.click();
    assert.equal(await loop.getAttribute("aria-pressed"), "false");

    // Every move of a drag edits the clip; the bar keeps the pointer to the end.
    const px = (await page.locator(".dialkit-timeline-ruler").boundingBox()).width / 3.5;
    const rowBar = (name) =>
      page.locator(".dialkit-timeline-row", { hasText: name }).locator(".dialkit-timeline-clip");
    await drag(page, rowBar("Title"), 0.4 * px);
    const titleAt = await page.evaluate((id) => window.DialStore.getValues(id)["title.at"], id);
    assert.ok(Math.abs(titleAt - 1.4) < 0.02, `Title dragged to ${titleAt}, expected 1.4`);

    assert.deepEqual(errors, []);
    await page.close();
    console.log(`${framework}-clips: header, ruler, loop and drag checks passed`);

    // Single track: every clip on one lane, no overlap, snapping drags.
    const trackPage = await browser.newPage();
    const trackErrors = [];
    trackPage.on("pageerror", (error) => trackErrors.push(error.message));
    await trackPage.goto(`${base}/${framework}-track.html`);
    const section = trackPage.locator('.dialkit-timeline-section[data-track="single"]');
    assert.equal(await section.locator(".dialkit-timeline-lane").count(), 1);
    assert.deepEqual(
      await section.locator(".dialkit-timeline-clip-name").allInnerTexts(),
      ["Intro", "Title", "Outro"],
    );
    const ruler = await trackPage.locator(".dialkit-timeline-ruler").boundingBox();
    const trackPx = ruler.width / 3.5;
    const bar = (name) => section.locator(".dialkit-timeline-clip", { hasText: name });
    const box = (name) => bar(name).boundingBox();

    // No label column: the lane and the ruler start at the body's edge.
    const body = await section.locator(".dialkit-timeline-body").boundingBox();
    near((await section.locator(".dialkit-timeline-lane").boundingBox()).x, body.x, "Lane starts at the body");
    near(ruler.x, body.x, "Ruler starts at the body");
    near((await box("Outro")).x, ruler.x + 2.5 * trackPx, "Outro sits at 2.5s on the ruler");

    // The lane is taller; bars draw in the dock's greys with a grip per edge.
    near((await section.locator(".dialkit-timeline-lane").boundingBox()).height, 34, "Lane is 34px");
    assert.equal(await bar("Intro").evaluate((node) => node.style.background), "");
    assert.deepEqual(
      await bar("Intro").locator(".dialkit-timeline-clip-handle").evaluateAll((nodes) =>
        nodes.map((node) => getComputedStyle(node, "::after").width),
      ),
      ["2px", "2px"],
    );

    // Dragged far left, Title stops at Intro's end instead of overlapping.
    await drag(trackPage, bar("Title"), -2 * trackPx);
    const intro = await box("Intro");
    near((await box("Title")).x, intro.x + intro.width, "Title stops at Intro");

    // Snapping lands Title's end on Outro's start (a free drag would stop at 1.4s).
    await drag(trackPage, bar("Title"), 0.9 * trackPx, true);
    const outro = await box("Outro");
    const title = await box("Title");
    near(title.x + title.width, outro.x, "Title snaps to Outro");

    // Seeking parks the playhead at 1.2s; snapping lands Title's start on it.
    const playheadX = ruler.x + 1.2 * trackPx;
    await trackPage.mouse.click(playheadX, ruler.y + ruler.height / 2);
    await drag(trackPage, bar("Title"), -0.75 * trackPx, true);
    near((await box("Title")).x, playheadX, "Title snaps to the playhead");

    // The dragged bar stays selected; pressing the empty lane lets it go.
    const selected = () =>
      section
        .locator(".dialkit-timeline-clip[data-selected] .dialkit-timeline-clip-name")
        .allInnerTexts();
    assert.deepEqual(await selected(), ["Title"]);
    const lane = await section.locator(".dialkit-timeline-lane").boundingBox();
    await trackPage.mouse.click(ruler.x + 3.25 * trackPx, lane.y + lane.height / 2);
    assert.deepEqual(await selected(), []);

    // Each bar fills as far as the playhead has crossed it.
    await trackPage.mouse.click(ruler.x + 1.45 * trackPx, ruler.y + ruler.height / 2);
    const played = (name) =>
      bar(name).evaluate(
        (node) => node.querySelector(".dialkit-timeline-clip-fill").getBoundingClientRect().width / node.clientWidth,
      );
    for (const [name, part] of [["Intro", 1], ["Title", 0.5], ["Outro", 0]]) {
      const actual = await played(name);
      assert.ok(Math.abs(actual - part) < 0.05, `${name} is ${actual} played, expected ${part}`);
    }

    assert.deepEqual(trackErrors, []);
    await trackPage.close();
    console.log(`${framework}-track: single track and snapping checks passed`);
  }
} finally {
  await browser.close();
}
