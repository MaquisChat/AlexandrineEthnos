import type { AskRequest } from "@fieldwork/villagers";
import { expect, it } from "vitest";
import { type AskFailure, connectAsk } from "../src/runtime";

const request = (model: AskRequest["model"]): AskRequest => ({
  purpose: "answer",
  instructions: "RULES",
  turns: [{ role: "user", content: "hello" }],
  model,
});
const runtime = (json: (input: unknown, options: unknown) => Promise<unknown>) => ({
  use: async (name: string) => (name === "sample" ? Object.assign(async () => ({ text: "" }), { json }) : null),
});

it("has no way to ask when the page is not inside the Claude viewer", async () => {
  expect(await connectAsk(undefined)).toBeNull();
  expect(await connectAsk({ use: async () => null })).toBeNull();
  expect(await connectAsk({ use: async () => { throw new Error("boom"); } })).toBeNull();
});

it("sends the instructions as a leading turn, never from the cache, on the chosen class of model", async () => {
  const calls: { input: unknown; options: unknown }[] = [];
  const ask = (await connectAsk(runtime(async (input, options) => (calls.push({ input, options }), { ok: true }))))!;
  expect(await ask(request("balanced"))).toEqual({ ok: true });
  await ask(request("quick"));
  await ask(request("careful"));
  expect(calls[0]!.input).toEqual([{ role: "user", content: "RULES" }, { role: "user", content: "hello" }]);
  expect(calls.map((c) => c.options)).toEqual([
    { cache: false, modelTier: "default", effort: "low" },
    { cache: false, modelTier: "quick" },
    { cache: false, modelTier: "complex" },
  ]);
});

it.each([
  ["not_granted", "declined"],
  ["sampling_disabled", "declined"],
  ["not_declared", "declined"],
  ["capability_disabled", "declined"],
  ["capability_removed", "declined"],
  ["rate_limited", "rate_limited"],
  ["session_expired", "signed_out"],
  ["refused", "refused"],
  ["invalid_json", "unreadable"],
  ["upstream_error", "failed"],
  ["something_new", "failed"],
] as [string, AskFailure][])("turns the runtime's %s into %s", async (code, expected) => {
  const ask = (await connectAsk(runtime(async () => Promise.reject({ code, message: "x" }))))!;
  await expect(ask(request("balanced"))).rejects.toMatchObject({ code: expected });
});
