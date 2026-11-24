import type { AiJob, Gateway, ProviderName } from "@fieldwork/gateway";
import type { Ask, AskPurpose } from "@fieldwork/villagers";
import type { CallCounter } from "./counter";
import { extractJson } from "./extractJson";

const JOB: Record<AskPurpose, AiJob> = { answer: "villager", check: "grounding_check", judge: "pre_read" };
const MAX_TOKENS: Record<AskPurpose, number> = { answer: 1200, check: 700, judge: 700 };

/**
 * Supplies the villager library's "ask a model" from the AI gateway.
 * Calls through the login draw on the owner's Claude plan, so those are counted against a ceiling.
 */
export function gatewayAsk(deps: { gateway: Gateway; counter: CallCounter; provider: ProviderName }): Ask {
  return async (request) => {
    if (deps.provider === "login") deps.counter.take();
    const response = await deps.gateway.run({
      job: JOB[request.purpose],
      system: request.instructions,
      messages: request.turns,
      maxTokens: MAX_TOKENS[request.purpose],
    });
    if (response.stopReason === "refusal") throw new Error("The model declined to answer.");
    return extractJson(response.text);
  };
}
