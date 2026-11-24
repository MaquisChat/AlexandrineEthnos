import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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

const mentions = (dir: string, name: string) =>
  execSync(`git ls-files ${dir}`, { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((f) => readFileSync(f, "utf8").includes(name));
const dependencies = (pkgPath: string) => {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
};

// In the finished game the villager rules run in the service, never in the client.
it("the client does not depend on the villager library", () => {
  expect(dependencies("apps/client/package.json")).not.toContain("@fieldwork/villagers");
  expect(mentions("apps/client/src", "@fieldwork/villagers")).toEqual([]);
});

// The villager library must stay free of the gateway so a web page can bundle it.
it("the villager library does not depend on the AI gateway", () => {
  if (!existsSync("packages/villagers/package.json")) return;
  expect(dependencies("packages/villagers/package.json")).not.toContain("@fieldwork/gateway");
  expect(mentions("packages/villagers/src", "@fieldwork/gateway")).toEqual([]);
});

it("no key-shaped secrets are committed", () => {
  const files = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);
  const binary = /\.(png|glb|woff2?|ico)$/;
  const hits = files.filter((f) => !binary.test(f) && /sk-ant-[A-Za-z0-9_-]{20,}/.test(readFileSync(f, "utf8")));
  expect(hits).toEqual([]);
});
