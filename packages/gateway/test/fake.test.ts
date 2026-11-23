import { expect, it } from "vitest";
import { type AiJob, FakeProvider, type ProviderRequest } from "../src";

const req = (text: string, job: AiJob = "villager"): ProviderRequest => ({
  job,
  system: "s",
  messages: [{ role: "user", content: text }],
  maxTokens: 100,
  model: "m",
});

it("answers with the first matching rule and records the call", async () => {
  const fake = new FakeProvider([
    { job: "spirits", reply: "the spirits" },
    { match: /heron/, reply: "It's the heron. You feed it first." },
    { reply: (r) => `echo:${r.messages.at(-1)!.content}` },
  ]);
  expect((await fake.complete(req("what is the heron?"))).text).toBe("It's the heron. You feed it first.");
  expect((await fake.complete(req("hello"))).text).toBe("echo:hello");
  expect(fake.calls).toHaveLength(2);
});

it("fails loudly when nothing matches", async () => {
  await expect(new FakeProvider([{ job: "spirits", reply: "x" }]).complete(req("hello"))).rejects.toThrowError(
    /villager.*hello/s,
  );
});

it("counts tokens deterministically", async () => {
  const r = await new FakeProvider([{ reply: "12345678" }]).complete(req("abc"));
  expect(r.usage).toEqual({ inputTokens: 1, outputTokens: 2 }); // ("s" + "abc") = 4 chars; 8 chars
  expect(r.provider).toBe("fake");
});
