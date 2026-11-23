import { readFileSync } from "node:fs";
import * as fontkit from "fontkit";
import { expect, it } from "vitest";

// Every letter the first four languages need, including the Kazakh additions to Cyrillic.
const need = "AaZz éèêëàâîïôûùüçœæÉÀÇŒ«» АаЯяЁё ӘәҒғҚқҢңӨөҰұҮүҺһІі";
const subsets = ["latin", "latin-ext", "cyrillic", "cyrillic-ext"];

// Speech is set in the serif, controls and labels in the sans. Both ship with the game,
// so it looks the same on every machine.
it.each(["noto-serif", "noto-sans"])("%s covers French, Russian and Kazakh", (family) => {
  const dir = `apps/client/node_modules/@fontsource/${family}/files`;
  const fonts = subsets.map((subset) => fontkit.openSync(`${dir}/${family}-${subset}-400-normal.woff2`) as fontkit.Font);
  const missing = [...need].filter(
    (ch) => ch !== " " && !fonts.some((font) => font.hasGlyphForCodePoint(ch.codePointAt(0)!)),
  );
  expect(missing).toEqual([]);
});

it("the app loads every subset the coverage test relies on", () => {
  const source = readFileSync("apps/client/src/ui/fonts.ts", "utf8");
  for (const family of ["noto-serif", "noto-sans"]) {
    for (const subset of subsets) expect(source).toContain(`@fontsource/${family}/${subset}-400.css`);
  }
});
