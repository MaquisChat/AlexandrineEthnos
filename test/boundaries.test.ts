import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("the client does not depend on the AI gateway", () => {
  const pkg = JSON.parse(readFileSync("apps/client/package.json", "utf8"));
  expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })).not.toContain("@fieldwork/gateway");
});

it("no client source file imports the AI gateway", () => {
  const files = execSync("git ls-files apps/client/src", { encoding: "utf8" }).split("\n").filter(Boolean);
  expect(files.length).toBeGreaterThan(0);
  const hits = files.filter((f) => readFileSync(f, "utf8").includes("@fieldwork/gateway"));
  expect(hits).toEqual([]);
});

it("no key-shaped secrets are committed", () => {
  const files = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);
  const binary = /\.(png|glb|woff2?|ico)$/;
  const hits = files.filter((f) => !binary.test(f) && /sk-ant-[A-Za-z0-9_-]{20,}/.test(readFileSync(f, "utf8")));
  expect(hits).toEqual([]);
});
