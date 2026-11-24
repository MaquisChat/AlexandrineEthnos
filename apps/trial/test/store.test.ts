import { readFileSync } from "node:fs";
import { parseCulture } from "@fieldwork/contracts";
import { emptyState, type Exchange } from "@fieldwork/villagers";
import { expect, it } from "vitest";
import type { ConsultRecord } from "../src/consults";
import { connectStore, memoryStore } from "../src/store";

const cultures = ["heron", "sealed"].map((id) =>
  parseCulture(JSON.parse(readFileSync(`content/cultures/${id}.culture.json`, "utf8"))),
);
const exchange: Exchange = {
  visitor: "Hello",
  reply: "Hello yourself.",
  record: { basis: "small_talk", entries: [], myths: [], personalFacts: [], model: "balanced" },
};
const state = { history: [exchange], personalFacts: ["I mend nets."] };

/** A stand-in for the page runtime's db: documents in a map, by path. */
function fakeDb(seed: Record<string, Record<string, unknown>> = {}) {
  const docs = new Map(Object.entries(seed));
  const doc = (path: string) => ({
    get: async () => ({ id: path.split("/").at(-1)!, exists: docs.has(path), data: () => docs.get(path) }),
    set: async (data: Record<string, unknown>) => void docs.set(path, data),
    delete: async () => void docs.delete(path),
  });
  return {
    docs,
    doc,
    collection: (name: string) => ({
      doc: (id: string) => doc(`${name}/${id}`),
      get: async () => ({
        docs: [...docs.entries()]
          .filter(([path]) => path.startsWith(`${name}/`))
          .map(([path, data]) => ({ id: path.slice(name.length + 1), exists: true, data: () => data })),
      }),
    }),
  };
}
const withDb = (db: unknown) => ({ use: async (name: string) => (name === "db" ? db : null) });

it("keeps conversations, marks and reveals in memory when there is nowhere to save", async () => {
  const store = await connectStore(undefined, cultures);
  expect(store.durable).toBe(false);
  await store.saveConversation("heron/maelle", state);
  await store.addFlag({ at: "2026-11-24T00:00:00Z", cultureId: "heron", villagerId: "maelle", exchange, note: "too chatty" });
  await store.setRevealed("sealed");
  const saved = await store.load();
  expect(saved.ok).toBe(true);
  expect(saved.conversations["heron/maelle"]).toEqual(state);
  expect(saved.flags).toHaveLength(1);
  expect(saved.revealed).toEqual(["sealed"]);
  await store.clearConversation("heron/maelle");
  expect((await store.load()).conversations).toEqual({});
});

it("memoryStore starts empty", async () => {
  expect(await memoryStore().load()).toEqual({ conversations: {}, flags: [], revealed: [], consults: [], ok: true });
});

it("saves through the page's database when there is one", async () => {
  const db = fakeDb();
  const store = await connectStore(withDb(db), cultures);
  expect(store.durable).toBe(true);
  await store.saveConversation("heron/maelle", state);
  await store.addFlag({ at: "2026-11-24T00:00:00Z", cultureId: "heron", villagerId: "maelle", exchange, note: "wrong" });
  await store.setRevealed("sealed");
  expect(db.docs.get("conversations/heron__maelle")).toMatchObject({ cultureId: "heron", villagerId: "maelle" });
  expect([...db.docs.keys()].filter((k) => k.startsWith("flags/"))).toHaveLength(1);
  const again = await connectStore(withDb(db), cultures);
  expect(await again.load()).toMatchObject({ conversations: { "heron/maelle": state }, revealed: ["sealed"] });
  await again.clearConversation("heron/maelle");
  expect(db.docs.has("conversations/heron__maelle")).toBe(false);
});

it("skips saved conversations it cannot use and keeps the rest", async () => {
  const db = fakeDb({
    "conversations/heron__maelle": { cultureId: "heron", villagerId: "maelle", state },
    "conversations/heron__nobody": { cultureId: "heron", villagerId: "nobody", state },
    "conversations/atlantis__maelle": { cultureId: "atlantis", villagerId: "maelle", state },
    "conversations/heron__tam": { cultureId: "heron", villagerId: "tam", state: { history: "oops" } },
    "conversations/heron__besa": { cultureId: "heron", villagerId: "besa", state: { history: [{ visitor: 1 }], personalFacts: [] } },
    "flags/a": { note: 3 },
    "meta/revealed": { cultures: ["sealed", "atlantis", 7] },
  });
  const saved = await (await connectStore(withDb(db), cultures)).load();
  expect(Object.keys(saved.conversations)).toEqual(["heron/maelle"]);
  expect(saved.flags).toEqual([]);
  expect(saved.revealed).toEqual(["sealed"]);
});

it("loads nothing, without failing, when the database cannot be read", async () => {
  const broken = { doc: () => ({ get: async () => Promise.reject({ code: "unavailable" }) }), collection: () => ({ get: async () => Promise.reject({ code: "unavailable" }) }) };
  const saved = await (await connectStore(withDb(broken), cultures)).load();
  expect(saved).toEqual({ conversations: {}, flags: [], revealed: [], consults: [], ok: false }); // not ok: the page must not write over what it never read
  expect(emptyState()).toEqual({ history: [], personalFacts: [] });
});

// --- from the whole-branch review ---

it.each([
  ["a caught note that is not a record", { caught: "oops" }],
  ["a question that is not text", { basis: "deferral", question: { a: 1 } }],
  ["a redirect that is not text", { basis: "redirect", redirect: 7 }],
  ["a model that is not one of the three", { model: "turbo" }],
  ["caught reasons that are not text", { caught: { by: "model", reply: "x", reasons: [1] } }],
])("skips a saved exchange with %s", async (_name, recordOver) => {
  const bad = { ...exchange, record: { ...exchange.record, ...recordOver } };
  const db = fakeDb({
    "conversations/heron__maelle": { cultureId: "heron", villagerId: "maelle", state: { history: [bad], personalFacts: [] } },
    "conversations/heron__tam": { cultureId: "heron", villagerId: "tam", state },
  });
  const saved = await (await connectStore(withDb(db), cultures)).load();
  expect(Object.keys(saved.conversations)).toEqual(["heron/tam"]);
});

it("writes to one document one at a time, in the order asked", async () => {
  const order: string[] = [];
  const slow = (path: string) => ({
    get: async () => ({ id: "x", exists: false, data: () => undefined }),
    set: async () => {
      order.push(`set start ${path}`);
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push(`set end ${path}`);
    },
    delete: async () => void order.push(`delete ${path}`),
  });
  const db = { doc: slow, collection: (name: string) => ({ doc: (id: string) => slow(`${name}/${id}`), get: async () => ({ docs: [] }) }) };
  const store = await connectStore(withDb(db), cultures);
  await Promise.all([store.saveConversation("heron/maelle", state), store.clearConversation("heron/maelle")]);
  expect(order).toEqual(["set start conversations/heron__maelle", "set end conversations/heron__maelle", "delete conversations/heron__maelle"]);
});

const consult = (over: Partial<ConsultRecord> = {}): ConsultRecord => ({
  cultureId: "heron",
  villagerId: "maelle",
  question: "What is done when a heron dies?",
  at: "2026-11-24T09:00:00Z",
  outcome: {
    status: "answered",
    by: "spirits",
    entry: {
      id: "a1",
      kind: "custom",
      topic: "a dead heron",
      statement: "A dead heron is left where it falls.",
      origin: { type: "consult", by: "spirits", question: "What is done when a heron dies?", askedBy: "maelle" },
      say: "anyone",
    },
  },
  ...over,
});

it.each([
  ["memory", () => connectStore(undefined, cultures)],
  ["the database", () => connectStore(withDb(fakeDb()), cultures)],
])("saves an outcome in %s and loads it back", async (_name, connect) => {
  const store = await connect();
  await store.saveConsult(consult());
  expect((await store.load()).consults).toEqual([consult()]);
});

it("replaces an earlier outcome for the same question", async () => {
  const db = fakeDb();
  const store = await connectStore(withDb(db), cultures);
  await store.saveConsult(consult({ outcome: { status: "silent", reasons: ["contradicts the culture: x"], discarded: "A dead heron is eaten." } }));
  await store.saveConsult(consult());
  const { consults } = await store.load();
  expect(consults).toHaveLength(1);
  expect(consults[0]!.outcome.status).toBe("answered");
  expect([...db.docs.keys()].filter((path) => path.startsWith("consults/"))).toHaveLength(1);
});

it("removes an outcome", async () => {
  for (const store of [await connectStore(undefined, cultures), await connectStore(withDb(fakeDb()), cultures)]) {
    await store.saveConsult(consult());
    const tams = consult({ villagerId: "tam" });
    if (tams.outcome.status === "answered") tams.outcome = { ...tams.outcome, entry: { ...tams.outcome.entry, id: "a2", origin: { type: "consult", by: "spirits", question: tams.question, askedBy: "tam" } } };
    await store.saveConsult(tams);
    await store.removeConsult(consult());
    expect((await store.load()).consults.map((c) => c.villagerId)).toEqual(["tam"]);
  }
});

it("skips a saved outcome it cannot use and keeps the rest", async () => {
  const good = consult();
  const answeredWith = (entry: unknown) => ({ ...good, outcome: { status: "answered", by: "spirits", entry } });
  const db = fakeDb({
    "consults/good": good as unknown as Record<string, unknown>,
    "consults/settled": { ...good, question: "s", outcome: { status: "settled", entries: ["h9"] } },
    "consults/silent": { ...good, question: "t", outcome: { status: "silent", reasons: ["x"] } },
    "consults/no-entry": { ...good, question: "a", outcome: { status: "answered", by: "spirits" } },
    "consults/damaged-entry": answeredWith({ id: "a2", statement: 7 }),
    "consults/not-a-consult": answeredWith({ ...(good.outcome as { entry: object }).entry, origin: { type: "gloss" } }),
    "consults/wrong-asker": { ...answeredWith({ ...(good.outcome as { entry: object }).entry }), villagerId: "tam" },
    "consults/gone": { ...good, villagerId: "nobody" },
    "consults/unknown-status": { ...good, question: "b", outcome: { status: "prophecy" } },
    "consults/by-nobody": { ...good, question: "c", outcome: { ...good.outcome, by: "apprentice" } },
    "consults/bad-reasons": { ...good, question: "d", outcome: { status: "silent", reasons: "x" } },
    "consults/no-question": { ...good, question: 3 },
  });
  const { consults, ok } = await (await connectStore(withDb(db), cultures)).load();
  expect(ok).toBe(true);
  expect(consults.map((c) => c.outcome.status).sort()).toEqual(["answered", "settled", "silent"]);
});

it("loads as before when nothing has ever been asked of the shaman", async () => {
  const db = fakeDb({ "conversations/heron__maelle": { cultureId: "heron", villagerId: "maelle", state } });
  const saved = await (await connectStore(withDb(db), cultures)).load();
  expect(saved).toMatchObject({ ok: true, consults: [] });
  expect(saved.conversations["heron/maelle"]).toEqual(state);
});
