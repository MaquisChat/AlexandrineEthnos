import { expect, type Page, test } from "@playwright/test";
import { PNG } from "pngjs";

const ready = (page: Page) => page.waitForFunction(() => window.__stageReady === true);
const figureX = (page: Page) =>
  page.evaluate(() => (window.__stage as unknown as { figurePosition(): number[] }).figurePosition()[0]!);

test("the scene draws something", async ({ page }) => {
  await page.goto("/?shot=1");
  await ready(page);
  const png = PNG.sync.read(await page.locator("canvas").screenshot());
  const colours = new Set<string>();
  for (let i = 0; i < png.data.length; i += 4 * 97) colours.add(png.data.subarray(i, i + 3).join(","));
  expect(colours.size).toBeGreaterThanOrEqual(4);
});

test("choosing a person from the keyboard walks the figure there", async ({ page }) => {
  await page.goto("/?debug=1");
  await ready(page);
  expect(await figureX(page)).toBeCloseTo(-4.6, 1);
  await page.getByRole("button", { name: "Maëlle" }).press("Enter");
  await expect.poll(() => figureX(page), { timeout: 15_000 }).toBeCloseTo(2, 1);
});

test("clicking the ground walks the figure to the nearest point on the path", async ({ page }) => {
  await page.goto("/?debug=1");
  await ready(page);
  const box = (await page.locator("canvas").boundingBox())!;
  // Low and far right: ground near the last path node.
  await page.mouse.click(box.x + box.width * 0.9, box.y + box.height * 0.78);
  await expect.poll(() => figureX(page), { timeout: 20_000 }).toBeGreaterThan(-4);
});

test("a missing model file is reported, not hidden", async ({ page }) => {
  await page.route("**/waters-edge.glb", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Could not load content/models/waters-edge.glb.");
});

test("the debug handle is not exposed in normal play", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  expect(await page.evaluate(() => window.__stage === undefined)).toBe(true);
});
