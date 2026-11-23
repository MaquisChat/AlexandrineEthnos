import { readFileSync } from "node:fs";
import { parseScene } from "@fieldwork/contracts";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { expect, it } from "vitest";
import { loadScene } from "../src/stage/loadScene";

const good = JSON.parse(readFileSync("apps/client/public/content/scenes/waters-edge.scene.json", "utf8"));
const gltf = {} as GLTF;

it("the shipped scene file is valid", () => expect(parseScene(good).id).toBe("waters-edge"));

it("loads the scene, its models and the figure", async () => {
  const urls: string[] = [];
  const loaded = await loadScene("content/", "scenes/waters-edge.scene.json", "models/figure.glb", {
    fetchJson: async () => good,
    loadGltf: async (u) => {
      urls.push(u);
      return gltf;
    },
  });
  expect(urls.sort()).toEqual(["content/models/figure.glb", "content/models/waters-edge.glb"]);
  expect(loaded.models.get("set")).toBe(gltf);
  expect(loaded.scene.id).toBe("waters-edge");
});

it.each([
  [
    "scene_not_found",
    {
      fetchJson: async () => {
        throw new Error("404");
      },
      loadGltf: async () => gltf,
    },
    /waters-edge\.scene\.json/,
  ],
  [
    "scene_invalid",
    { fetchJson: async () => ({ ...good, walk: { ...good.walk, start: "zz" } }), loadGltf: async () => gltf },
    /walk\.start/,
  ],
  [
    "model_missing",
    {
      fetchJson: async () => good,
      loadGltf: async (u: string) => {
        if (u.includes("waters-edge")) throw new Error("404");
        return gltf;
      },
    },
    /waters-edge\.glb/,
  ],
] as const)("reports %s", async (kind, deps, message) => {
  await expect(
    loadScene("content/", "scenes/waters-edge.scene.json", "models/figure.glb", deps),
  ).rejects.toMatchObject({ kind, message: expect.stringMatching(message) });
});

it("names the figure file when that is the one missing", async () => {
  await expect(
    loadScene("content/", "scenes/waters-edge.scene.json", "models/figure.glb", {
      fetchJson: async () => good,
      loadGltf: async (u: string) => {
        if (u.includes("figure")) throw new Error("404");
        return gltf;
      },
    }),
  ).rejects.toMatchObject({ kind: "model_missing", file: "content/models/figure.glb" });
});
