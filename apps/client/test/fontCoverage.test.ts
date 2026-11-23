import * as fontkit from "fontkit";
import { expect, it } from "vitest";

// Every letter the first four languages need, including the Kazakh additions to Cyrillic.
const need = "AaZz éèêëàâîïôûùüçœæÉÀÇŒ«» АаЯяЁё ӘәҒғҚқҢңӨөҰұҮүҺһІі";

it("the dialogue font covers French, Russian and Kazakh", () => {
  const dir = "apps/client/node_modules/@fontsource/noto-serif/files";
  const fonts = ["latin", "latin-ext", "cyrillic", "cyrillic-ext"].map(
    (subset) => fontkit.openSync(`${dir}/noto-serif-${subset}-400-normal.woff2`) as fontkit.Font,
  );
  const missing = [...need].filter(
    (ch) => ch !== " " && !fonts.some((font) => font.hasGlyphForCodePoint(ch.codePointAt(0)!)),
  );
  expect(missing).toEqual([]);
});

it("the app loads every subset the coverage test relies on", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync("apps/client/src/ui/fonts.ts", "utf8");
  for (const subset of ["latin", "latin-ext", "cyrillic", "cyrillic-ext"]) {
    expect(source).toContain(`@fontsource/noto-serif/${subset}-400.css`);
  }
});
