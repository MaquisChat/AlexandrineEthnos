import { z } from "zod";

/** A point or direction in metres. Right-handed, Y up, as in glTF. */
export type Vec3 = [number, number, number];

export const PALETTE_ROLES = [
  "sky",
  "fog",
  "ground",
  "water",
  "structure",
  "figure",
  "accent",
  "shadow",
  "mark",
] as const;
export type PaletteRole = (typeof PALETTE_ROLES)[number];

export interface SceneModel {
  id: string;
  uri: string;
  position: Vec3;
  rotationYDeg: number;
  scale: number;
}

export interface Scene {
  schemaVersion: 1;
  id: string;
  name: string;
  models: SceneModel[];
  camera: { fovDeg: number; rail: { position: Vec3; lookAt: Vec3 }[]; driftSeconds: number };
  walk: { nodes: { id: string; position: Vec3 }[]; edges: [string, string][]; start: string };
  hotspots: {
    id: string;
    kind: "person" | "object" | "exit";
    label: string;
    position: Vec3;
    radius: number;
    walkNode: string;
  }[];
  slots: { id: string; kind: "mark" | "prop" | "actor"; position: Vec3; rotationYDeg: number; size: number }[];
  palette: Record<PaletteRole, string>;
  fog: { near: number; far: number };
}

const vec3 = z.tuple([z.number(), z.number(), z.number()]);
const id = z.string().min(1);
const colour = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a colour written as #rrggbb");
// Relative to the content root: no leading slash, no "..", and a .glb file.
const modelUri = z
  .string()
  .regex(/^(?!\/)(?!.*\.\.).+\.glb$/, "must be a .glb path relative to the content root, without '..'");

const palette = z.strictObject({
  sky: colour,
  fog: colour,
  ground: colour,
  water: colour,
  structure: colour,
  figure: colour,
  accent: colour,
  shadow: colour,
  mark: colour,
});

const shape = z.strictObject({
  schemaVersion: z.literal(1),
  id,
  name: z.string().min(1),
  models: z.array(
    z.strictObject({ id, uri: modelUri, position: vec3, rotationYDeg: z.number(), scale: z.number().positive() }),
  ),
  camera: z.strictObject({
    fovDeg: z.number().gt(0).lt(180),
    rail: z.array(z.strictObject({ position: vec3, lookAt: vec3 })).min(1),
    driftSeconds: z.number().positive(),
  }),
  walk: z.strictObject({
    nodes: z.array(z.strictObject({ id, position: vec3 })).min(1),
    edges: z.array(z.tuple([id, id])),
    start: id,
  }),
  hotspots: z.array(
    z.strictObject({
      id,
      kind: z.enum(["person", "object", "exit"]),
      label: z.string().min(1),
      position: vec3,
      radius: z.number().positive(),
      walkNode: id,
    }),
  ),
  slots: z.array(
    z.strictObject({
      id,
      kind: z.enum(["mark", "prop", "actor"]),
      position: vec3,
      rotationYDeg: z.number(),
      size: z.number().positive(),
    }),
  ),
  palette,
  fog: z.strictObject({ near: z.number().nonnegative(), far: z.number().positive() }),
});

type Issue = { path: (string | number)[]; message: string };

/** Rules that link one part of a scene to another. JSON Schema cannot express these. */
function crossReferenceIssues(scene: Scene): Issue[] {
  const issues: Issue[] = [];

  const lists = { models: scene.models, "walk.nodes": scene.walk.nodes, hotspots: scene.hotspots, slots: scene.slots };
  for (const [name, list] of Object.entries(lists)) {
    const seen = new Set<string>();
    list.forEach((item, index) => {
      if (seen.has(item.id)) {
        issues.push({ path: [...name.split("."), index, "id"], message: `duplicate id "${item.id}"` });
      }
      seen.add(item.id);
    });
  }

  const nodes = new Set(scene.walk.nodes.map((n) => n.id));
  scene.walk.edges.forEach((edge, index) => {
    for (const end of edge) {
      if (!nodes.has(end)) {
        issues.push({ path: ["walk", "edges", index], message: `names a node that does not exist: "${end}"` });
      }
    }
  });
  if (!nodes.has(scene.walk.start)) {
    issues.push({ path: ["walk", "start"], message: `names a node that does not exist: "${scene.walk.start}"` });
  }
  scene.hotspots.forEach((hotspot, index) => {
    if (!nodes.has(hotspot.walkNode)) {
      issues.push({
        path: ["hotspots", index, "walkNode"],
        message: `names a node that does not exist: "${hotspot.walkNode}"`,
      });
    }
  });

  if (scene.fog.near >= scene.fog.far) {
    issues.push({ path: ["fog"], message: "near must be less than far" });
  }
  return issues;
}

/** The scene format, without the cross-reference rules. This is what the published JSON Schema is made from. */
export const SceneShapeSchema: z.ZodType<Scene> = shape;

/** The full scene format. */
export const SceneSchema: z.ZodType<Scene> = shape.superRefine((scene, ctx) => {
  for (const issue of crossReferenceIssues(scene)) {
    ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
  }
});

export class SceneParseError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`Scene is not valid:\n${issues.join("\n")}`);
    this.name = "SceneParseError";
    this.issues = issues;
  }
}

/** Checks a value against the scene format and returns it typed. Throws SceneParseError listing every problem. */
export function parseScene(input: unknown): Scene {
  const result = SceneSchema.safeParse(input);
  if (result.success) return result.data;
  throw new SceneParseError(
    result.error.issues.map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : "(root)"}: ${issue.message}`),
  );
}
