// Turns the built page into the fragment claude.ai publishes: no doctype, html, head or body tags,
// because the platform wraps the file in its own. Output: dist/villager-trial.html
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const html = readFileSync(`${dist}index.html`, "utf8");

const all = (pattern: RegExp) => [...html.matchAll(pattern)].map((match) => match[0]);
const title = all(/<title>[\s\S]*?<\/title>/g)[0];
const fitSides = all(/<meta name="claude:viewport-fit-sides"[^>]*>/g)[0];
const links = all(/<link rel="stylesheet"[^>]*>/g);
const styles = all(/<style[^>]*>[\s\S]*?<\/style>/g);
const scripts = all(/<script[^>]*>[\s\S]*?<\/script>/g);

if (!title || !fitSides || styles.length === 0 || scripts.length !== 1) {
  throw new Error("The built page does not have the parts expected (title, viewport tag, styles, one inline script).");
}
if (scripts[0]!.match(/<script[^>]+src=/)) throw new Error("The script was not inlined.");

const fragment = [title, fitSides, ...links, ...styles, '<div id="root"></div>', scripts[0]].join("\n") + "\n";
writeFileSync(`${dist}villager-trial.html`, fragment);
console.log(`wrote ${dist}villager-trial.html (${Math.round(fragment.length / 1024)} KB)`);
