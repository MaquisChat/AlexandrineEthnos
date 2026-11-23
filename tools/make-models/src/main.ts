// Writes the model files the client loads. Run with: pnpm models
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { KHRMaterialsUnlit } from "@gltf-transform/extensions";
import { buildFigure } from "./figure";
import { buildWatersEdge } from "./watersEdge";

const outDir = fileURLToPath(new URL("../../../apps/client/public/content/models/", import.meta.url));
mkdirSync(outDir, { recursive: true });

const io = new NodeIO().registerExtensions([KHRMaterialsUnlit]);
for (const [name, build] of [
  ["figure.glb", buildFigure],
  ["waters-edge.glb", buildWatersEdge],
] as const) {
  await io.write(`${outDir}${name}`, build());
  console.log(`wrote ${outDir}${name}`);
}
