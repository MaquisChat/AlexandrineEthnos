import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { cultureJsonSchema, CultureParseError, parseCulture } from "../src";
import valid from "./fixtures/valid.culture.json";

const broken = (edit: (c: any) => void) => {
  const c = structuredClone(valid) as any;
  edit(c);
  return c;
};

describe("parseCulture", () => {
  it("accepts the valid fixture", () => {
    const culture = parseCulture(valid);
    expect(culture.id).toBe("test-people");
    expect(culture.villagers.map((v) => v.name)).toEqual(["Maëlle", "Old Tam"]);
  });

  it.each([
    ["an entry from a myth that does not exist", (c: any) => (c.entries[1].origin.mythId = "m9"), /^entries\.1\.origin/],
    ["a villager who knows an entry that does not exist", (c: any) => c.villagers[1].knowsEntries.push("e9"), /^villagers\.1\.knowsEntries/],
    ["a villager who knows a myth that does not exist", (c: any) => (c.villagers[0].knowsMyths[0].mythId = "m9"), /^villagers\.0\.knowsMyths\.0/],
    ["a custom whose reason does not exist", (c: any) => c.customs[0].reasons.push("e9"), /^customs\.0\.reasons/],
    ["a heart entry that does not exist", (c: any) => c.heart.push("e9"), /^heart/],
    ["duplicate entry ids", (c: any) => c.entries.push({ ...c.entries[0] }), /^entries.*duplicate/],
    ["a redirect line with no place for a name", (c: any) => (c.villagers[0].lines.redirect = "Ask someone."), /^villagers\.0\.lines\.redirect/],
    ["an unknown key", (c: any) => (c.spirits = true), /spirits/],
    ["a villager who knows nothing", (c: any) => (c.villagers[0].knowsEntries = []), /^villagers\.0\.knowsEntries/],
    ["an unknown kind of entry", (c: any) => (c.entries[0].kind = "rumour"), /^entries\.0\.kind/],
    ["a villager with no way to be referred to", (c: any) => delete c.villagers[0].pronoun, /^villagers\.0\.pronoun/],
    ["a language other than English", (c: any) => (c.language = "fr"), /^language/],
  ])("rejects %s", (_name, edit, message) => {
    let error: unknown;
    try {
      parseCulture(broken(edit));
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(CultureParseError);
    expect((error as CultureParseError).issues.join("\n")).toMatch(new RegExp(message.source, "m"));
  });
});

describe("an entry that came from a consult", () => {
  const consult = (over: Record<string, unknown> = {}) =>
    broken((c: any) => (c.entries[3].origin = { type: "consult", by: "spirits", question: "What is done when a heron dies?", askedBy: "tam", ...over }));

  it("is accepted", () => {
    expect(parseCulture(consult()).entries[3]!.origin).toEqual({
      type: "consult",
      by: "spirits",
      question: "What is done when a heron dies?",
      askedBy: "tam",
    });
  });

  it("is rejected when carried by a villager who does not exist", () => {
    let error: unknown;
    try {
      parseCulture(consult({ askedBy: "nobody" }));
    } catch (e) {
      error = e;
    }
    expect((error as CultureParseError).issues).toContain('entries.3.origin.askedBy: names a villager that does not exist: "nobody"');
  });

  it("is rejected when answered by anyone but the shaman or the spirits", () => {
    expect(() => parseCulture(consult({ by: "apprentice" }))).toThrow(CultureParseError);
  });

  it("is published in the JSON Schema", () => {
    expect(JSON.stringify(cultureJsonSchema)).toContain('"consult"');
    expect(new Ajv2020({ strict: false }).compile(cultureJsonSchema)(consult())).toBe(true);
  });
});

describe("published culture JSON Schema", () => {
  const validate = new Ajv2020({ strict: false }).compile(cultureJsonSchema);
  it("accepts what the parser accepts", () => expect(validate(valid)).toBe(true));
  it("rejects a wrong version", () => expect(validate({ ...valid, schemaVersion: 2 })).toBe(false));
  it("rejects unknown keys", () => expect(validate({ ...valid, spirits: true })).toBe(false));
});
