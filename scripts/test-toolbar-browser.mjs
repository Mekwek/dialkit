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

    // Loop toggle and drags, on three clips.
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/${framework}-clips.html`);
    const id = await page.evaluate(() => window.DialStore.getPanels("timeline")[0].id);
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
    console.log(`${framework}-clips: loop and drag checks passed`);

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
    const near = (actual, expected, label) =>
      assert.ok(
        Math.abs(actual - expected) < 3,
        `${label}: expected ${actual} ≈ ${expected}`,
      );

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
