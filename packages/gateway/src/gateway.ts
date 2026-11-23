import { type AiJob, type AiProvider, type AiRequest, type AiResponse, DEFAULT_MODEL } from "./types";
import { memoryUsageLog, type UsageLog } from "./usage";

export interface Gateway {
  run(req: AiRequest): Promise<AiResponse>;
}

/**
 * The single door to AI. It chooses the model for the job, calls the provider and
 * records what was used. A refusal comes back as a response with stopReason "refusal".
 */
export function createGateway(opts: {
  provider: AiProvider;
  models?: Partial<Record<AiJob, string>>;
  usage?: UsageLog;
  now?: () => Date;
}): Gateway {
  const usage = opts.usage ?? memoryUsageLog();
  const now = opts.now ?? (() => new Date());

  return {
    async run(req) {
      const model = opts.models?.[req.job] ?? DEFAULT_MODEL;
      const response = await opts.provider.complete({ ...req, model });
      usage.record({
        at: now().toISOString(),
        job: req.job,
        ...(req.studyId === undefined ? {} : { studyId: req.studyId }),
        provider: response.provider,
        model: response.model,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      });
      return response;
    },
  };
}
