import { readFileSync } from "node:fs";
import * as THREE from "three";
import { expect, it } from "vitest";
import { applyPalette } from "../src/stage/palette";

const good = JSON.parse(readFileSync("apps/client/public/content/scenes/waters-edge.scene.json", "utf8"));

it("colours materials by role", () => {
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ name: "role:structure" }));
  applyPalette(mesh, good.palette);
  expect("#" + (mesh.material as THREE.MeshBasicMaterial).color.getHexString()).toBe("#241c26");
});

it("reaches materials on children and in lists", () => {
  const group = new THREE.Group();
  const child = new THREE.Mesh(new THREE.BufferGeometry(), [
    new THREE.MeshBasicMaterial({ name: "role:figure" }),
    new THREE.MeshBasicMaterial({ name: "role:accent" }),
  ]);
  group.add(child);
  applyPalette(group, good.palette);
  const hex = (child.material as THREE.MeshBasicMaterial[]).map((m) => "#" + m.color.getHexString());
  expect(hex).toEqual(["#141018", "#d9502f"]);
});

it("names a material whose role is unknown", () => {
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ name: "role:lava" }));
  expect(() => applyPalette(mesh, good.palette)).toThrowError(/role:lava/);
});
