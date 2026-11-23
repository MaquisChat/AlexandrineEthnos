import schema from "../schemas/scene.schema.json" with { type: "json" };

export * from "./scene";

/** The scene format as JSON Schema (draft 2020-12), for tools and engines that do not use this package. */
export const sceneJsonSchema: Record<string, unknown> = schema;
