import { readFileSync } from "node:fs";
import { FIGURE_NODES, PALETTE_ROLES } from "@fieldwork/contracts";
import { NodeIO } from "@gltf-transform/core";
import { KHRMaterialsUnlit } from "@gltf-transform/extensions";
import { getBounds } from "@gltf-transform/functions";
import { expect, it } from "vitest";
import { buildFigure } from "../src/figure";

const io = new NodeIO().registerExtensions([KHRMaterialsUnlit]);
const read = (name: string) => io.read(`apps/client/public/content/models/${name}`);
const names = (list: { getName(): string }[]) => list.map((n) => n.getName());

it("figure has the shared node names and animations", async () => {
  const root = (await read("figure.glb")).getRoot();
  expect(names(root.listNodes())).toEqual(expect.arrayContaining([...FIGURE_NODES]));
  expect(names(root.listAnimations()).sort()).toEqual(["idle", "walk"]);
});

it("figure stands 1.7 m tall on y = 0", async () => {
  const { min, max } = getBounds((await read("figure.glb")).getRoot().listScenes()[0]!);
  expect(min[1]).toBeCloseTo(0, 2);
  expect(max[1]).toBeCloseTo(1.7, 2);
});

it("figure animations loop in the stated times", async () => {
  const root = (await read("figure.glb")).getRoot();
  const length = (name: string) =>
    Math.max(
      ...root
        .listAnimations()
        .find((a) => a.getName() === name)!
        .listSamplers()
        .map((s) => Math.max(...s.getInput()!.getArray()!)),
    );
  expect(length("idle")).toBeCloseTo(2.0, 5);
  expect(length("walk")).toBeCloseTo(1.0, 5);
});

it.each(["figure.glb", "waters-edge.glb"])("%s uses only unlit role materials and no textures", async (file) => {
  const root = (await read(file)).getRoot();
  expect(root.listTextures()).toHaveLength(0);
  expect(root.listMaterials().length).toBeGreaterThan(0);
  for (const m of root.listMaterials()) {
    expect(m.getName()).toMatch(new RegExp(`^role:(${PALETTE_ROLES.join("|")})$`));
    expect(m.getExtension("KHR_materials_unlit")).not.toBeNull();
  }
});

it("the set has a post 2.2 m tall at x = -2", async () => {
  const root = (await read("waters-edge.glb")).getRoot();
  const post = root.listNodes().find((n) => n.getName() === "post")!;
  const { min, max } = getBounds(post);
  expect([min[1], max[1]]).toEqual([expect.closeTo(0, 2), expect.closeTo(2.2, 2)]);
  expect((min[0] + max[0]) / 2).toBeCloseTo(-2, 2);
});

it("generation is deterministic", async () => {
  const a = await io.writeBinary(buildFigure());
  const b = await io.writeBinary(buildFigure());
  expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
});

it("the mark is a single-colour silhouette", () => {
  const svg = readFileSync("apps/client/public/content/marks/heron.svg", "utf8");
  expect(svg).toMatch(/viewBox="0 0 100 100"/);
  expect(svg).toMatch(/currentColor/);
  expect(svg).not.toMatch(/<image|href=/);
});
