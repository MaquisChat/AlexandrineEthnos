import { expect, it } from "vitest";
import {
  buildClaudeStdin,
  type LoginFailure,
  LoginProvider,
  type ProviderRequest,
  type RunClaude,
  spawnRunner,
} from "../src";
import sample from "./fixtures/claude-print-sample.json";

const req: ProviderRequest = {
  job: "villager",
  system: "Be brief.",
  maxTokens: 50,
  model: "claude-opus-5-5",
  messages: [{ role: "user", content: "hello" }],
};
const ok =
  (stdout: string): RunClaude =>
  async () => ({ code: 0, stdout, stderr: "" });

it("passes the system prompt as a flag, switches tools off, and sends the message on stdin", async () => {
  let seen: { args: string[]; stdin: string } | undefined;
  const run: RunClaude = async (args, stdin) => {
    seen = { args, stdin };
    return { code: 0, stdout: JSON.stringify(sample), stderr: "" };
  };
  await new LoginProvider({ run }).complete(req);
  expect(seen).toEqual({
    args: ["-p", "--output-format", "json", "--system-prompt", "Be brief.", "--tools", "", "--strict-mcp-config"],
    stdin: "hello",
  });
});

it("maps the sample to a response", async () => {
  const r = await new LoginProvider({ run: ok(JSON.stringify(sample)) }).complete(req);
  expect(r.provider).toBe("login");
  expect(r.text).toBe("ok");
  expect(r.stopReason).toBe("end");
  expect(r.usage).toEqual({ inputTokens: 2767, outputTokens: 71 }); // input counts cached tokens too
  expect(r.model).toBe("claude-fable-5-2"); // whatever the login served, not the model asked for
});

it("labels a multi-message conversation", () => {
  expect(
    buildClaudeStdin({
      ...req,
      messages: [
        { role: "user", content: "a" },
        { role: "assistant", content: "b" },
        { role: "user", content: "c" },
      ],
    }),
  ).toBe("[user]\na\n\n[assistant]\nb\n\n[user]\nc");
});

it.each([
  [
    "not_installed",
    async () => {
      throw Object.assign(new Error("spawn claude ENOENT"), { code: "ENOENT" });
    },
  ],
  [
    "timeout",
    async () => {
      throw Object.assign(new Error("timed out"), { timedOut: true });
    },
  ],
  ["bad_output", ok("Welcome! not json")],
  ["not_logged_in", async () => ({ code: 1, stdout: "", stderr: "Please run /login to authenticate" })],
  ["failed", async () => ({ code: 2, stdout: "", stderr: "boom" })],
] as [LoginFailure, RunClaude][])("reports %s as a typed error", async (reason, run) => {
  await expect(new LoginProvider({ run }).complete(req)).rejects.toMatchObject({ reason });
});

it("reports an error result from the command line as a failure", async () => {
  const run = ok(JSON.stringify({ ...sample, is_error: true, result: "Something went wrong" }));
  await expect(new LoginProvider({ run }).complete(req)).rejects.toMatchObject({ reason: "failed" });
});

it("gives up at the timeout instead of hanging", async () => {
  const started = Date.now();
  await expect(spawnRunner("sleep")(["5"], "", 50)).rejects.toMatchObject({ timedOut: true });
  expect(Date.now() - started).toBeLessThan(1000);
});

it("reports a command that does not exist", async () => {
  await expect(spawnRunner("no-such-command-fieldwork")([], "", 1000)).rejects.toMatchObject({ code: "ENOENT" });
});
