import cultureSchema from "../schemas/culture.schema.json" with { type: "json" };
import sceneSchema from "../schemas/scene.schema.json" with { type: "json" };

export * from "./scene";
export * from "./figure";
export * from "./culture";

/** The scene format as JSON Schema (draft 2020-12), for tools and engines that do not use this package. */
export const sceneJsonSchema: Record<string, unknown> = sceneSchema;

/** The culture format as JSON Schema (draft 2020-12). */
export const cultureJsonSchema: Record<string, unknown> = cultureSchema;
