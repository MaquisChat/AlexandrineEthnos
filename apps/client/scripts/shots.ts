// Builds the client and saves screenshots of the look for the owner, at twice normal sharpness.
// Usage: pnpm shots        (in the cloud container: PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm shots)
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { build, preview } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = fileURLToPath(new URL("../../../docs/look/", import.meta.url));
mkdirSync(outDir, { recursive: true });

const SHOTS = [
  ["waters-edge@2x.png", "?shot=1"],
  ["waters-edge-kazakh@2x.png", "?shot=1&line=kk"],
] as const;

await build({ root, logLevel: "warn" });
const server = await preview({ root, preview: { port: 4174, strictPort: true }, logLevel: "warn" });
const browser = await chromium.launch({
  ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  for (const [file, query] of SHOTS) {
    await page.goto(`http://localhost:4174/${query}`);
    await page.waitForFunction(() => window.__stageReady === true);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: outDir + file });
    console.log(`wrote ${outDir}${file}`);
  }
} finally {
  await browser.close();
  await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
}
