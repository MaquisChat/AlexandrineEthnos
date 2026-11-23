import { expect, type Page, test } from "@playwright/test";

const ready = async (page: Page) => {
  await page.waitForFunction(() => window.__stageReady === true);
  await page.evaluate(() => document.fonts.ready);
};

test("the look has not changed", async ({ page }) => {
  await page.goto("/?shot=1");
  await ready(page);
  await expect(page).toHaveScreenshot("waters-edge.png", { maxDiffPixelRatio: 0.01 });
});

test("Kazakh text sets without missing glyphs or overflow", async ({ page }) => {
  await page.goto("/?shot=1&line=kk");
  await ready(page);
  await expect(page.getByRole("button", { name: "шығыңыз" })).toBeVisible();
  await expect(page).toHaveScreenshot("waters-edge-kazakh.png", { maxDiffPixelRatio: 0.01 });
});

test("speech is set in the bundled serif and controls in the bundled sans", async ({ page }) => {
  await page.goto("/?shot=1&line=kk");
  await ready(page);
  const result = await page.evaluate(() => {
    const first = (selector: string) =>
      getComputedStyle(document.querySelector(selector)!).fontFamily.split(",")[0]!.replaceAll('"', "").trim();
    const loaded = new Set([...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replaceAll('"', "")));
    return {
      line: first(".strip-line"),
      aids: first(".strip-aids button"),
      speaker: first(".strip-speaker"),
      serifLoaded: loaded.has("Noto Serif"),
      sansLoaded: loaded.has("Noto Sans"),
    };
  });
  expect(result).toEqual({
    line: "Noto Serif",
    aids: "Noto Sans",
    speaker: "Noto Sans",
    serifLoaded: true,
    sansLoaded: true,
  });
});

for (const [name, url, size] of [
  ["small window", "/?shot=1", { width: 800, height: 600 }],
  ["largest text", "/?shot=1&textScale=2", { width: 1280, height: 720 }],
  ["largest text in a small window", "/?shot=1&textScale=2", { width: 800, height: 600 }],
] as const) {
  test(`the strip stays in its place: ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto(url);
    await ready(page);
    const box = (await page.getByTestId("dialogue-strip").boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(size.height * 0.5);
    expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
