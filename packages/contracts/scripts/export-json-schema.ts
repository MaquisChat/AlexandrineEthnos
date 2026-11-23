import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { SceneShapeSchema } from "../src/scene";

const schema = {
  ...z.toJSONSchema(SceneShapeSchema),
  $id: "https://fieldwork.invalid/schemas/scene.schema.json",
  title: "Fieldwork scene",
  description:
    "One fixed, staged 3D location. Right-handed, Y up, metres, as in glTF. " +
    "This schema checks shape only. The parser in @fieldwork/contracts also checks rules that link parts " +
    "of a scene: ids are unique within each list; every walk edge, walk.start and hotspot walkNode names " +
    "an existing walk node; fog.near is less than fog.far.",
};

const out = fileURLToPath(new URL("../schemas/scene.schema.json", import.meta.url));
writeFileSync(out, JSON.stringify(schema, null, 2) + "\n");
console.log(`wrote ${out}`);
