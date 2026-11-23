import { expect, it } from "vitest";
import { AI_JOBS, createGateway, FakeProvider, memoryUsageLog } from "../src";

it("uses claude-opus-5-5 for every job unless told otherwise", async () => {
  const fake = new FakeProvider([{ reply: "ok" }]);
  const gw = createGateway({ provider: fake, models: { marks: "other-model" } });
  for (const job of AI_JOBS) {
    await gw.run({ job, system: "", messages: [{ role: "user", content: "x" }], maxTokens: 10 });
  }
  const used = Object.fromEntries(fake.calls.map((c) => [c.job, c.model]));
  expect(used.marks).toBe("other-model");
  expect(new Set(AI_JOBS.filter((j) => j !== "marks").map((j) => used[j]))).toEqual(new Set(["claude-opus-5-5"]));
});

it("logs one usage entry per call, with study and time", async () => {
  const usage = memoryUsageLog();
  const gw = createGateway({
    provider: new FakeProvider([{ reply: "ok" }]),
    usage,
    now: () => new Date("2026-11-23T00:00:00Z"),
  });
  await gw.run({
    job: "villager",
    system: "",
    messages: [{ role: "user", content: "x" }],
    maxTokens: 10,
    studyId: "st1",
  });
  expect(usage.entries()).toEqual([
    expect.objectContaining({
      at: "2026-11-23T00:00:00.000Z",
      job: "villager",
      studyId: "st1",
      provider: "fake",
      model: "claude-opus-5-5",
    }),
  ]);
});

it("returns a refusal as a result, not an exception", async () => {
  const gw = createGateway({ provider: new FakeProvider([{ reply: "", stopReason: "refusal" }]) });
  const r = await gw.run({ job: "villager", system: "", messages: [{ role: "user", content: "x" }], maxTokens: 10 });
  expect(r.stopReason).toBe("refusal");
});
