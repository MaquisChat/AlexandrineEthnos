import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { parseScene, SceneParseError, sceneJsonSchema } from "../src";
import valid from "./fixtures/valid.scene.json";

const broken = (edit: (s: any) => void) => {
  const s = structuredClone(valid) as any;
  edit(s);
  return s;
};

describe("parseScene", () => {
  it("accepts the valid fixture", () => {
    expect(parseScene(valid).id).toBe("waters-edge");
  });
  it.each([
    ["an edge to a missing node", (s: any) => s.walk.edges.push(["a", "nowhere"]), /^walk\.edges.*nowhere/],
    ["a missing start node", (s: any) => (s.walk.start = "z"), /^walk\.start/],
    ["a hotspot on a missing node", (s: any) => (s.hotspots[0].walkNode = "z"), /^hotspots\.0\.walkNode/],
    ["duplicate node ids", (s: any) => s.walk.nodes.push({ ...s.walk.nodes[0] }), /^walk\.nodes.*duplicate/],
    ["a palette without every role", (s: any) => delete s.palette.fog, /^palette/],
    ["a colour that is not #rrggbb", (s: any) => (s.palette.sky = "orange"), /^palette\.sky/],
    ["an engine-specific key", (s: any) => (s.three = {}), /three/],
    ["a model path that climbs out", (s: any) => (s.models[0].uri = "../x.glb"), /^models\.0\.uri/],
    ["fog that ends before it starts", (s: any) => (s.fog = { near: 9, far: 3 }), /^fog/],
  ])("rejects %s", (_name, edit, message) => {
    let error: unknown;
    try {
      parseScene(broken(edit));
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(SceneParseError);
    expect((error as SceneParseError).issues.join("\n")).toMatch(new RegExp(message.source, "m"));
  });
});

describe("published JSON Schema", () => {
  const validate = new Ajv2020({ strict: false }).compile(sceneJsonSchema);
  it("accepts what the parser accepts", () => expect(validate(valid)).toBe(true));
  it("rejects a wrong version", () => expect(validate({ ...valid, schemaVersion: 2 })).toBe(false));
  it("rejects unknown keys", () => expect(validate({ ...valid, three: {} })).toBe(false));
});
