import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { CultureShapeSchema } from "../src/culture";
import { SceneShapeSchema } from "../src/scene";

const NOTE = "This schema checks shape only. The parser in @fieldwork/contracts also checks rules that link parts together: ";

const schemas = {
  "scene.schema.json": {
    ...z.toJSONSchema(SceneShapeSchema),
    $id: "https://fieldwork.invalid/schemas/scene.schema.json",
    title: "Fieldwork scene",
    description:
      "One fixed, staged 3D location. Right-handed, Y up, metres, as in glTF. " +
      "This schema checks shape only. The parser in @fieldwork/contracts also checks rules that link parts " +
      "of a scene: ids are unique within each list; every walk edge, walk.start and hotspot walkNode names " +
      "an existing walk node; fog.near is less than fog.far.",
  },
  "culture.schema.json": {
    ...z.toJSONSchema(CultureShapeSchema),
    $id: "https://fieldwork.invalid/schemas/culture.schema.json",
    title: "Fieldwork culture",
    description:
      "An invented culture: its myths, what is true in it, its customs and its people. " +
      NOTE +
      "ids are unique within each list; every myth, entry and reason that is referred to exists; " +
      "every heart entry exists.",
  },
};

for (const [file, schema] of Object.entries(schemas)) {
  const out = fileURLToPath(new URL(`../schemas/${file}`, import.meta.url));
  writeFileSync(out, JSON.stringify(schema, null, 2) + "\n");
  console.log(`wrote ${out}`);
}
