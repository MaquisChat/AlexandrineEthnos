import { readFileSync } from "node:fs";
import { type CultureEntry, parseCulture } from "@fieldwork/contracts";
import { expect, it } from "vitest";
import { type ConsultRecord, consultId, findConsult, withAdditions } from "../src/consults";

const heron = parseCulture(JSON.parse(readFileSync("content/cultures/heron.culture.json", "utf8")));
const entry = (id: string, askedBy = "maelle", statement = "A dead heron is left where it falls."): CultureEntry => ({
  id,
  kind: "custom",
  topic: "a dead heron",
  statement,
  origin: { type: "consult", by: "spirits", question: "What is done when a heron dies?", askedBy },
  say: "anyone",
});
const answered = (e: CultureEntry, at: string, over: Partial<ConsultRecord> = {}): ConsultRecord => ({
  cultureId: "heron",
  villagerId: e.origin.type === "consult" ? e.origin.askedBy : "maelle",
  question: `question about ${e.id}`,
  at,
  outcome: { status: "answered", by: "spirits", entry: e },
  ...over,
});

it("gives the same id for the same question and a different one for another villager or culture", () => {
  const of = { cultureId: "heron", villagerId: "maelle", question: "What is done when a heron dies?" };
  expect(consultId(of)).toBe(consultId({ ...of }));
  expect(consultId({ ...of, villagerId: "tam" })).not.toBe(consultId(of));
  expect(consultId({ ...of, cultureId: "sealed" })).not.toBe(consultId(of));
  expect(consultId({ ...of, question: "What is done when a heron is born?" })).not.toBe(consultId(of));
});

it("uses only letters, digits and underscores in an id", () => {
  expect(consultId({ cultureId: "heron", villagerId: "maelle", question: "Qu'est-ce qu'on fait / quand un héron meurt ?" })).toMatch(/^[A-Za-z0-9_]+$/);
});

it("adds saved answers to the base culture in the order they were given", () => {
  const culture = withAdditions(heron, [answered(entry("a2", "tam"), "2026-11-24T10:00:00Z"), answered(entry("a1"), "2026-11-24T09:00:00Z")]);
  expect(culture.entries.slice(-2).map((e) => e.id)).toEqual(["a1", "a2"]);
  expect(culture.villagers.find((v) => v.id === "maelle")!.knowsEntries).toContain("a1");
  expect(culture.villagers.find((v) => v.id === "tam")!.knowsEntries).toContain("a2");
  expect(() => parseCulture(culture)).not.toThrow();
});

it("leaves out an answer whose villager is gone or whose id is taken, and keeps the rest", () => {
  const culture = withAdditions(heron, [
    answered(entry("a1", "nobody"), "2026-11-24T09:00:00Z"),
    answered(entry("h1"), "2026-11-24T09:01:00Z"),
    answered(entry("a2"), "2026-11-24T09:02:00Z"),
  ]);
  expect(culture.entries.map((e) => e.id).filter((id) => id.startsWith("a"))).toEqual(["a2"]);
  expect(culture.entries).toHaveLength(heron.entries.length + 1);
});

it("takes only answers given to this culture, and nothing from a silence or a settled question", () => {
  const culture = withAdditions(heron, [
    answered(entry("a1"), "2026-11-24T09:00:00Z", { cultureId: "sealed" }),
    { cultureId: "heron", villagerId: "maelle", question: "q", at: "2026-11-24T09:00:00Z", outcome: { status: "silent", reasons: ["x"] } },
    { cultureId: "heron", villagerId: "maelle", question: "r", at: "2026-11-24T09:00:00Z", outcome: { status: "settled", entries: ["h9"] } },
  ]);
  expect(culture.entries).toHaveLength(heron.entries.length);
});

it("does not change the base culture", () => {
  const before = JSON.stringify(heron);
  withAdditions(heron, [answered(entry("a1"), "2026-11-24T09:00:00Z")]);
  expect(JSON.stringify(heron)).toBe(before);
});

it("finds the outcome for one question from one villager", () => {
  const record = answered(entry("a1"), "2026-11-24T09:00:00Z");
  expect(findConsult([record], { cultureId: "heron", villagerId: "maelle", question: "question about a1" })).toBe(record);
  expect(findConsult([record], { cultureId: "heron", villagerId: "tam", question: "question about a1" })).toBeUndefined();
});
