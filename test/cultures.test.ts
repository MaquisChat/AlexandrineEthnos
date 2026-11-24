import { readFileSync } from "node:fs";
import { type Culture, parseCulture } from "@fieldwork/contracts";
import { describe, expect, it } from "vitest";

const load = (id: string): Culture =>
  parseCulture(JSON.parse(readFileSync(`content/cultures/${id}.culture.json`, "utf8")));
const words = (text: string) => text.trim().split(/\s+/).length;

describe.each(["heron", "sealed"])("the %s culture", (id) => {
  const culture = load(id);
  const say = (kind: string) => culture.entries.filter((e) => e.say === kind);

  it("has the id its file name says", () => expect(culture.id).toBe(id));
  it("has three myths of 150 to 300 words", () => {
    expect(culture.myths).toHaveLength(3);
    for (const myth of culture.myths) {
      expect(words(myth.text), myth.title).toBeGreaterThanOrEqual(150);
      expect(words(myth.text), myth.title).toBeLessThanOrEqual(300);
    }
  });
  it("has 25 to 35 entries, at least six never said and at least four earned", () => {
    expect(culture.entries.length).toBeGreaterThanOrEqual(25);
    expect(culture.entries.length).toBeLessThanOrEqual(35);
    expect(say("shown").length).toBeGreaterThanOrEqual(6);
    expect(say("earned").length).toBeGreaterThanOrEqual(4);
  });
  it("has four or five customs", () => {
    expect(culture.customs.length).toBeGreaterThanOrEqual(4);
    expect(culture.customs.length).toBeLessThanOrEqual(5);
  });
  it("has six villagers, one a child and at least one who doubts", () => {
    expect(culture.villagers).toHaveLength(6);
    expect(culture.villagers.filter((v) => v.age < 13)).toHaveLength(1);
    expect(culture.villagers.some((v) => v.doubts)).toBe(true);
  });
  it("gives every doubter a slant of at least 40 words", () => {
    for (const v of culture.villagers.filter((v) => v.doubts)) expect(words(v.slant), v.name).toBeGreaterThanOrEqual(40);
  });
  it("has a heart of three to five entries, all never said", () => {
    expect(culture.heart.length).toBeGreaterThanOrEqual(3);
    expect(culture.heart.length).toBeLessThanOrEqual(5);
    for (const entryId of culture.heart) {
      expect(culture.entries.find((e) => e.id === entryId)!.say, entryId).toBe("shown");
    }
  });
  it("names at least ten silences", () => expect(culture.silences.length).toBeGreaterThanOrEqual(10));
  it("has every entry known by someone, and nobody who knows everything", () => {
    for (const entry of culture.entries) {
      expect(culture.villagers.some((v) => v.knowsEntries.includes(entry.id)), entry.id).toBe(true);
    }
    for (const v of culture.villagers) expect(v.knowsEntries.length, v.name).toBeLessThan(culture.entries.length);
  });
  it("has every villager knowing at least one myth, and the child only shorter versions", () => {
    for (const v of culture.villagers) expect(v.knowsMyths.length, v.name).toBeGreaterThanOrEqual(1);
    const child = culture.villagers.find((v) => v.age < 13)!;
    for (const known of child.knowsMyths) expect(known.version, known.mythId).toBeTruthy();
  });
  it("keeps topics short and neutral", () => {
    for (const entry of culture.entries) {
      expect(words(entry.topic), entry.id).toBeLessThanOrEqual(8);
      expect(entry.topic, entry.id).not.toContain(".");
    }
  });
  it("never has a story, as any villager knows it, say a guarded statement word for word", () => {
    const guarded = culture.entries.filter((e) => e.say !== "anyone");
    for (const v of culture.villagers) {
      for (const known of v.knowsMyths) {
        const telling = (known.version ?? culture.myths.find((m) => m.id === known.mythId)!.text).toLowerCase();
        for (const entry of guarded) expect(telling.includes(entry.statement.toLowerCase()), `${v.name} / ${entry.id}`).toBe(false);
      }
    }
  });
  it("has every villager who knows a story in full also know the sayable entries that come from it", () => {
    for (const v of culture.villagers) {
      for (const known of v.knowsMyths.filter((k) => k.version === undefined)) {
        const fromIt = culture.entries.filter((e) => e.say === "anyone" && e.origin.type === "myth" && e.origin.mythId === known.mythId);
        for (const entry of fromIt) expect(v.knowsEntries.includes(entry.id), `${v.name} knows ${known.mythId} but not ${entry.id}`).toBe(true);
      }
    }
  });
  it("gives no villager a duplicate entry or myth", () => {
    for (const v of culture.villagers) {
      expect(new Set(v.knowsEntries).size, v.name).toBe(v.knowsEntries.length);
      expect(new Set(v.knowsMyths.map((m) => m.mythId)).size, v.name).toBe(v.knowsMyths.length);
    }
  });
});

it("the heron people include Maëlle the net-mender and the approved line", () => {
  const heron = load("heron");
  expect(heron.name).toBe("The heron people");
  expect(heron.villagers.find((v) => v.name === "Maëlle")?.role).toBe("net-mender");
  expect(heron.entries.some((e) => e.statement.includes("the heron eats first, we eat after"))).toBe(true);
});

it("the two cultures share no villager name and no land", () => {
  const [heron, sealed] = [load("heron"), load("sealed")];
  const names = new Set(heron.villagers.map((v) => v.name));
  expect(sealed.villagers.filter((v) => names.has(v.name))).toEqual([]);
  expect(sealed.land).not.toMatch(/water|river|heron|net/i);
  expect(JSON.stringify(sealed)).not.toMatch(/heron/i);
});
