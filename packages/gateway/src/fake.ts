import type { AiJob, AiProvider, AiResponse, ProviderRequest } from "./types";

export interface FakeRule {
  /** Only match requests for this job. */
  job?: AiJob;
  /** Only match when this tests true against the last user message. */
  match?: RegExp;
  reply: string | ((req: ProviderRequest) => string);
  stopReason?: AiResponse["stopReason"];
}

export class FakeProviderNoMatchError extends Error {
  constructor(req: ProviderRequest, lastUserMessage: string) {
    super(`FakeProvider has no rule for job "${req.job}" with last user message: ${JSON.stringify(lastUserMessage)}`);
    this.name = "FakeProviderNoMatchError";
  }
}

const tokens = (text: string) => Math.ceil(text.length / 4);

/**
 * Answers from a script instead of a model, so tests need no network and cost nothing.
 * Rules are tried in order. A request no rule matches is an error, so a test never
 * passes on a reply nobody wrote.
 */
export class FakeProvider implements AiProvider {
  readonly name = "fake" as const;
  readonly calls: ProviderRequest[] = [];
  private readonly rules: FakeRule[];

  constructor(rules: FakeRule[]) {
    this.rules = rules;
  }

  async complete(req: ProviderRequest): Promise<AiResponse> {
    this.calls.push(req);
    const lastUser = req.messages.findLast((m) => m.role === "user")?.content ?? "";
    const rule = this.rules.find(
      (r) => (r.job === undefined || r.job === req.job) && (r.match === undefined || r.match.test(lastUser)),
    );
    if (!rule) throw new FakeProviderNoMatchError(req, lastUser);

    const text = typeof rule.reply === "function" ? rule.reply(req) : rule.reply;
    const input = req.system + req.messages.map((m) => m.content).join("");
    return {
      text,
      stopReason: rule.stopReason ?? "end",
      usage: { inputTokens: tokens(input), outputTokens: tokens(text) },
      model: req.model,
      provider: this.name,
    };
  }
}
