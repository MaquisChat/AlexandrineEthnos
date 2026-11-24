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

test("a corrupt model file is reported, not hidden", async ({ page }) => {
  await page.route("**/waters-edge.glb", (route) =>
    route.fulfill({ status: 200, contentType: "model/gltf-binary", body: "this is not a model" }),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Could not load content/models/waters-edge.glb.");
});

test("a missing mark file is reported by name", async ({ page }) => {
  await page.route("**/heron.svg", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Could not load content/marks/heron.svg.");
});

test("says so when WebGL cannot start", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type.includes("webgl")) return null;
      return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("This game needs WebGL");
});

test("reaching a person opens what they say, and Escape closes it", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await expect(page.getByTestId("dialogue-strip")).toHaveCount(0);
  await page.getByRole("button", { name: "Maëlle" }).press("Enter");
  await expect(page.getByTestId("dialogue-strip")).toContainText("héron", { timeout: 15_000 });
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("dialogue-strip")).toHaveCount(0);
});

test("clicking a person walks to them and opens what they say", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  const box = (await page.locator("canvas").boundingBox())!;
  // Maëlle stands right of centre, about halfway down.
  await page.mouse.click(box.x + box.width * 0.73, box.y + box.height * 0.52);
  await expect(page.getByTestId("dialogue-strip")).toContainText("héron", { timeout: 15_000 });
});

test("the mark is drawn on the post", async ({ page }) => {
  await page.goto("/?shot=1");
  await ready(page);
  const png = PNG.sync.read(await page.locator("canvas").screenshot());
  // The post stands left of centre; the mark sits on its upper half. Count pixels in the mark colour (#f4ead7).
  let markPixels = 0;
  for (let y = Math.floor(png.height * 0.34); y < png.height * 0.48; y++) {
    for (let x = Math.floor(png.width * 0.32); x < png.width * 0.38; x++) {
      const i = (y * png.width + x) * 4;
      if (Math.abs(png.data[i]! - 244) < 14 && Math.abs(png.data[i + 1]! - 234) < 14 && Math.abs(png.data[i + 2]! - 215) < 14) {
        markPixels++;
      }
    }
  }
  expect(markPixels).toBeGreaterThan(80);
});

test("the scene is still drawn in the moment after the window changes size", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  const colours = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const canvas = document.querySelector("canvas")!;
        // Created after the stage's own observer, so it runs after it and before the browser paints.
        const probe = new ResizeObserver(() => {
          probe.disconnect();
          const copy = document.createElement("canvas");
          copy.width = 64;
          copy.height = 36;
          const context = copy.getContext("2d")!;
          context.drawImage(canvas, 0, 0, 64, 36);
          const data = context.getImageData(0, 0, 64, 36).data;
          const seen = new Set<string>();
          for (let i = 0; i < data.length; i += 4) seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
          resolve(seen.size);
        });
        probe.observe(canvas);
        document.querySelector<HTMLElement>(".frame")!.style.inlineSize = "900px";
      }),
  );
  expect(colours).toBeGreaterThanOrEqual(4);
});

test("an error message respects the chosen text size", async ({ page }) => {
  await page.route("**/waters-edge.glb", (route) => route.abort());
  const alertSize = async (url: string) => {
    await page.goto(url);
    return page.getByRole("alert").evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  };
  const normal = await alertSize("/");
  const large = await alertSize("/?textScale=2");
  expect(large).toBeCloseTo(normal * 2, 0);
});
