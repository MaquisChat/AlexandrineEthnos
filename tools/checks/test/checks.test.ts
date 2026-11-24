import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Culture, parseCulture } from "@fieldwork/contracts";
import { createGateway, FakeProvider } from "@fieldwork/gateway";
import type { Ask, Exchange } from "@fieldwork/villagers";
import { describe, expect, it } from "vitest";
import { CeilingReachedError, fileCounter, noCounter } from "../src/counter";
import { extractJson } from "../src/extractJson";
import { gatewayAsk } from "../src/gatewayAsk";
import { judgeByRule } from "../src/judge";
import { type Probe, validateProbes } from "../src/probes";
import { renderReport } from "../src/report";
import { runProbe } from "../src/run";

const load = (id: string): Culture => parseCulture(JSON.parse(readFileSync(`content/cultures/${id}.culture.json`, "utf8")));
const probesOf = (id: string): Probe[] => JSON.parse(readFileSync(`tools/checks/probes/${id}.json`, "utf8"));
const heron = load("heron");

describe("extractJson", () => {
  it.each([
    ["plain JSON", '{"a": 1}'],
    ["a fenced block", 'Here you go:\n```json\n{"a": 1}\n```'],
    ["a sentence before and after", 'Sure. {"a": 1} Hope that helps.'],
  ])("reads %s", (_name, text) => expect(extractJson(text)).toEqual({ a: 1 }));
  it("reads a list", () => expect(extractJson("[1, 2]")).toEqual([1, 2]));
  it("throws on prose", () => expect(() => extractJson("It is the heron.")).toThrowError(/no JSON/i));
  it("throws on the fake provider's echo", () => expect(() => extractJson("[fake] hello")).toThrowError());
});

describe("the call counter", () => {
  it("persists across instances and stops at the ceiling", () => {
    const path = join(mkdtempSync(join(tmpdir(), "fw-")), "calls.json");
    const first = fileCounter(path, 3);
    first.take();
    first.take();
    const second = fileCounter(path, 3);
    expect(second.used()).toBe(2);
    second.take();
    expect(() => second.take()).toThrowError(CeilingReachedError);
    expect(fileCounter(path, 3).used()).toBe(3);
  });
});

describe("gatewayAsk", () => {
  const request = (purpose: "answer" | "check" | "judge") =>
    ({ purpose, instructions: "RULES", turns: [{ role: "user" as const, content: "hello" }], model: "balanced" as const });

  it("sends instructions as the system text, maps purposes to jobs, and returns the JSON", async () => {
    const fake = new FakeProvider([{ reply: 'Sure: {"ok": true}' }]);
    const ask = gatewayAsk({ gateway: createGateway({ provider: fake }), counter: noCounter, provider: "fake" });
    for (const purpose of ["answer", "check", "judge"] as const) expect(await ask(request(purpose))).toEqual({ ok: true });
    expect(fake.calls.map((c) => c.job)).toEqual(["villager", "grounding_check", "pre_read"]);
    expect(fake.calls[0]).toMatchObject({ system: "RULES", messages: [{ role: "user", content: "hello" }] });
  });
  it("counts calls only when the provider is the login", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "fw-")), "calls.json");
    const gateway = createGateway({ provider: new FakeProvider([{ reply: "{}" }]) });
    await gatewayAsk({ gateway, counter: fileCounter(path, 5), provider: "fake" })(request("answer"));
    expect(fileCounter(path, 5).used()).toBe(0);
    await gatewayAsk({ gateway, counter: fileCounter(path, 5), provider: "login" })(request("answer"));
    expect(fileCounter(path, 5).used()).toBe(1);
  });
  it("makes no call once the ceiling is reached", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "fw-")), "calls.json");
    const fake = new FakeProvider([{ reply: "{}" }]);
    const ask = gatewayAsk({ gateway: createGateway({ provider: fake }), counter: fileCounter(path, 1), provider: "login" });
    await ask(request("answer"));
    await expect(ask(request("answer"))).rejects.toBeInstanceOf(CeilingReachedError);
    expect(fake.calls).toHaveLength(1);
  });
  it("rejects when the model declines or says nothing readable", async () => {
    const declined = new FakeProvider([{ reply: "", stopReason: "refusal" }]);
    await expect(gatewayAsk({ gateway: createGateway({ provider: declined }), counter: noCounter, provider: "fake" })(request("answer"))).rejects.toThrowError(/declined/);
    const prose = new FakeProvider([{ reply: "It is the heron." }]);
    await expect(gatewayAsk({ gateway: createGateway({ provider: prose }), counter: noCounter, provider: "fake" })(request("answer"))).rejects.toThrowError(/no JSON/i);
  });
});

describe("judgeByRule", () => {
  const ex = (basis: Exchange["record"]["basis"], over: Partial<Exchange["record"]> = {}, reply = "x"): Exchange => ({
    visitor: "q",
    reply,
    record: { basis, entries: [], myths: [], personalFacts: [], model: "balanced", ...over },
  });
  const probe = (check: Probe["check"], about: string): Probe => ({ id: "p", check, about, steps: [{ villagerId: "maelle", line: "q" }] });

  it("gap: passes on a refusal and fails on an answer from the culture", () => {
    expect(judgeByRule(probe("gap", heron.silences[0]!), [ex("deferral")], heron).pass).toBe(true);
    expect(judgeByRule(probe("gap", heron.silences[0]!), [ex("canon", { entries: ["h9"] })], heron).pass).toBe(false);
  });
  it("explain: fails when the hidden entry is cited as said, or its wording appears", () => {
    expect(judgeByRule(probe("explain", "h1"), [ex("canon", { entries: ["h9"] })], heron).pass).toBe(true);
    expect(judgeByRule(probe("explain", "h1"), [ex("canon", { entries: ["h1"] })], heron).pass).toBe(false);
    const leaked = ex("small_talk", {}, "Well, THE HERON STANDS FOR THE DEAD, who gave to the living before they were asked.");
    expect(judgeByRule(probe("explain", "h1"), [leaked], heron).pass).toBe(false);
  });
  it("scope: passes only on a redirect to someone who knows", () => {
    expect(judgeByRule(probe("scope", "h23"), [ex("redirect", { redirect: "maelle", entries: ["h23"] })], heron).pass).toBe(true);
    expect(judgeByRule(probe("scope", "h23"), [ex("redirect", { redirect: "tam" })], heron).pass).toBe(false);
    expect(judgeByRule(probe("scope", "h23"), [ex("canon", { entries: ["h9"] })], heron).pass).toBe(false);
  });
  it("consistency: leaves the verdict to the judge", () => {
    expect(judgeByRule(probe("consistency", "h9"), [ex("canon")], heron)).toEqual({ pass: true, reason: "the judge decides" });
  });
  it("fails any probe that produced no exchange", () => {
    expect(judgeByRule(probe("gap", heron.silences[0]!), [], heron).pass).toBe(false);
  });
});

describe("runProbe", () => {
  const gap: Probe = { id: "g", check: "gap", about: heron.silences[0]!, steps: [{ villagerId: "maelle", line: "What do you do when a heron dies?" }] };
  const answering =
    (answer: unknown, judge: unknown = { pass: true, reason: "refused, invented nothing" }): Ask =>
    async (request) =>
      request.purpose === "answer" ? answer : request.purpose === "check" ? { unsupported: [], explains: [], earned: [] } : judge;

  it("returns the exchanges and both verdicts", async () => {
    const result = await runProbe({ ask: answering({ reply: "Not mine to say.", basis: "deferral", question: "What is done when a heron dies?" }) }, heron, gap);
    expect(result.exchanges).toHaveLength(1);
    expect(result.byRule.pass).toBe(true);
    expect(result.byJudge).toEqual({ pass: true, reason: "refused, invented nothing" });
    expect(result.error).toBeUndefined();
  });
  it("records an unreadable turn as an error instead of throwing", async () => {
    const result = await runProbe({ ask: answering("prose") }, heron, gap);
    expect(result.error).toMatch(/could not be read/);
    expect(result.byRule.pass).toBe(false);
    expect(result.byJudge).toBeNull();
  });
  it("records an unreadable judge as no verdict", async () => {
    const result = await runProbe({ ask: answering({ reply: "Not mine.", basis: "deferral" }, "fine") }, heron, gap);
    expect(result.byJudge).toBeNull();
    expect(result.error).toBeUndefined();
  });
  it("keeps one conversation per villager across steps", async () => {
    const seen: number[] = [];
    const ask: Ask = async (request) => {
      if (request.purpose === "answer") seen.push(request.turns.length);
      return request.purpose === "answer"
        ? { reply: "The heron eats first, we eat after.", basis: "canon", entries: ["h10"] }
        : request.purpose === "check" ? { unsupported: [], explains: [], earned: [] } : { pass: true, reason: "same" };
    };
    const twice: Probe = { id: "c", check: "consistency", about: "h10", steps: [{ villagerId: "minnow", line: "a" }, { villagerId: "minnow", line: "b" }] };
    await runProbe({ ask }, heron, twice);
    expect(seen).toEqual([1, 3]);
  });
});

describe("the report", () => {
  it("shows passes per check by rule and by judge, with the provider, model and calls", () => {
    const base = { exchanges: [], byRule: { pass: true, reason: "" }, byJudge: { pass: false, reason: "" } };
    const text = renderReport(
      [
        { ...base, probe: { id: "a", check: "gap", about: "", steps: [] } },
        { ...base, probe: { id: "b", check: "gap", about: "", steps: [] }, byRule: { pass: false, reason: "" }, byJudge: null, error: "boom" },
      ],
      { provider: "login", model: "claude-fable-5-2", calls: 12, date: "2026-11-24" },
    );
    expect(text).toContain("| gap | 2 | 1 | 0 | 1 |");
    expect(text).toContain("login");
    expect(text).toContain("claude-fable-5-2");
    expect(text).toContain("12");
    expect(text).toContain("indicative");
  });
});

describe.each(["heron", "sealed"])("the %s probes", (id) => {
  const culture = load(id);
  const probes = probesOf(id);
  it("hold five probes for each check", () => {
    for (const check of ["gap", "explain", "consistency", "scope"]) {
      expect(probes.filter((p) => p.check === check), check).toHaveLength(5);
    }
  });
  it("fit the culture they probe", () => expect(validateProbes(probes, culture)).toEqual([]));
  it("have unique ids", () => expect(new Set(probes.map((p) => p.id)).size).toBe(probes.length));
});

it("validateProbes names what does not fit", () => {
  const issues = validateProbes(
    [
      { id: "a", check: "gap", about: "not a silence", steps: [{ villagerId: "maelle", line: "q" }] },
      { id: "b", check: "scope", about: "h9", steps: [{ villagerId: "maelle", line: "q" }] },
      { id: "c", check: "explain", about: "h9", steps: [{ villagerId: "nobody", line: "q" }] },
    ],
    heron,
  );
  expect(issues.join("\n")).toMatch(/a: .*silence/);
  expect(issues.join("\n")).toMatch(/b: .*already knows/);
  expect(issues.join("\n")).toMatch(/c: .*nobody/);
});
