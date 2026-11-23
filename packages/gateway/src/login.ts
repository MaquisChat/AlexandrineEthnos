import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import type { AiProvider, AiResponse, ProviderRequest } from "./types";

/**
 * Runs the Claude Code command line once. Rejects with `code: "ENOENT"` when the command
 * does not exist and with `timedOut: true` when it runs past the timeout.
 */
export type RunClaude = (
  args: string[],
  stdin: string,
  timeoutMs: number,
) => Promise<{ code: number; stdout: string; stderr: string }>;

export type LoginFailure = "not_installed" | "not_logged_in" | "timeout" | "bad_output" | "failed";

export class LoginProviderError extends Error {
  readonly reason: LoginFailure;
  constructor(reason: LoginFailure, message: string) {
    super(message);
    this.name = "LoginProviderError";
    this.reason = reason;
  }
}

/** Makes a runner for the given command. It runs in a neutral directory so no project instructions are picked up. */
export function spawnRunner(command: string): RunClaude {
  return (args, stdin, timeoutMs) =>
    new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd: tmpdir(), stdio: ["pipe", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
        reject(Object.assign(new Error(`${command} did not answer within ${timeoutMs} ms`), { timedOut: true }));
      }, timeoutMs);

      child.stdout.on("data", (chunk) => (stdout += chunk));
      child.stderr.on("data", (chunk) => (stderr += chunk));
      child.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (!timedOut) resolve({ code: code ?? 1, stdout, stderr });
      });
      // The process may exit before reading its input; that is reported through "close" or "error".
      child.stdin.on("error", () => {});
      child.stdin.end(stdin);
    });
}

/**
 * Print mode, JSON out, our own system prompt, and no built-in tools or connectors.
 * Switching tools off cuts the built-in instructions sent with each call from about 40,000 tokens to about 3,000.
 * The requested model is not passed: the login serves whatever model it serves.
 */
export function buildClaudeArgs(req: ProviderRequest): string[] {
  return ["-p", "--output-format", "json", "--system-prompt", req.system, "--tools", "", "--strict-mcp-config"];
}

/** One user message is sent as it is. A longer conversation is sent as labelled blocks. */
export function buildClaudeStdin(req: ProviderRequest): string {
  const [only] = req.messages;
  if (req.messages.length === 1 && only?.role === "user") return only.content;
  return req.messages.map((m) => `[${m.role}]\n${m.content}`).join("\n\n");
}

const LOOKS_LIKE_NO_LOGIN = /\/login|log ?in|authenticat|api key|unauthori[sz]ed/i;

interface PrintResult {
  is_error?: boolean;
  result?: string;
  stop_reason?: string;
  usage?: {
    input_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    output_tokens?: number;
  };
  modelUsage?: Record<string, unknown>;
}

function stopReason(raw: string | undefined): AiResponse["stopReason"] {
  if (raw === "refusal") return "refusal";
  if (raw === "max_tokens") return "max_tokens";
  return "end";
}

/**
 * Development only. Sends each request through the Claude Code command line, using the
 * login already present on the machine, so prompts can be tried without an API key.
 * It draws on the owner's Claude plan, runs on whichever model the login serves, and
 * ignores `maxTokens`. It must never be part of the shipped game.
 */
export class LoginProvider implements AiProvider {
  readonly name = "login" as const;
  private readonly run: RunClaude;
  private readonly timeoutMs: number;

  constructor(opts: { run?: RunClaude; timeoutMs?: number } = {}) {
    this.run = opts.run ?? spawnRunner("claude");
    this.timeoutMs = opts.timeoutMs ?? 120_000;
  }

  async complete(req: ProviderRequest): Promise<AiResponse> {
    let out: { code: number; stdout: string; stderr: string };
    try {
      out = await this.run(buildClaudeArgs(req), buildClaudeStdin(req), this.timeoutMs);
    } catch (error) {
      const e = error as { code?: string; timedOut?: boolean; message?: string };
      if (e.code === "ENOENT") {
        throw new LoginProviderError("not_installed", "The claude command was not found. Install Claude Code, or use AI_PROVIDER=fake.");
      }
      if (e.timedOut) {
        throw new LoginProviderError("timeout", `The claude command did not answer within ${this.timeoutMs} ms.`);
      }
      throw new LoginProviderError("failed", `The claude command could not be run: ${e.message ?? String(error)}`);
    }

    if (out.code !== 0) throw this.failure(`${out.stderr}\n${out.stdout}`.trim(), `exit code ${out.code}`);

    let parsed: PrintResult;
    try {
      parsed = JSON.parse(out.stdout) as PrintResult;
    } catch {
      throw new LoginProviderError("bad_output", `The claude command did not print JSON: ${out.stdout.slice(0, 200)}`);
    }
    if (parsed === null || typeof parsed !== "object" || typeof parsed.result !== "string") {
      throw new LoginProviderError("bad_output", "The claude command printed JSON without a result.");
    }
    if (parsed.is_error) throw this.failure(parsed.result, "the command reported an error");

    const usage = parsed.usage ?? {};
    return {
      text: parsed.result,
      stopReason: stopReason(parsed.stop_reason),
      usage: {
        inputTokens:
          (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
        outputTokens: usage.output_tokens ?? 0,
      },
      model: Object.keys(parsed.modelUsage ?? {})[0] ?? "unknown",
      provider: this.name,
    };
  }

  private failure(detail: string, summary: string): LoginProviderError {
    return LOOKS_LIKE_NO_LOGIN.test(detail)
      ? new LoginProviderError("not_logged_in", `Claude Code is not logged in (${summary}). Run claude and log in, or use AI_PROVIDER=fake.`)
      : new LoginProviderError("failed", `The claude command failed (${summary}): ${detail.slice(0, 300)}`);
  }
}
