// Reaches Claude through the claude.ai page runtime, on the viewer's own account.
import type { Ask, ModelClass } from "@fieldwork/villagers";

/** Why a villager could not answer, in terms the page can explain to the visitor. */
export type AskFailure = "unavailable" | "declined" | "rate_limited" | "signed_out" | "refused" | "unreadable" | "failed";

export class AskError extends Error {
  readonly code: AskFailure;
  constructor(code: AskFailure) {
    super(`Claude could not be asked: ${code}`);
    this.name = "AskError";
    this.code = code;
  }
}

// "balanced" asks the everyday model to think only a little, so a conversation keeps moving.
const OPTIONS: Record<ModelClass, Record<string, unknown>> = {
  quick: { modelTier: "quick" },
  balanced: { modelTier: "default", effort: "low" },
  careful: { modelTier: "complex" },
};

const FAILURES: Record<string, AskFailure> = {
  not_granted: "declined",
  sampling_disabled: "declined",
  not_declared: "declined",
  capability_disabled: "declined",
  capability_removed: "declined",
  rate_limited: "rate_limited",
  session_expired: "signed_out",
  refused: "refused",
  invalid_json: "unreadable",
};

interface Sample {
  json(input: { role: "user" | "assistant"; content: string }[], options: Record<string, unknown>): Promise<unknown>;
}

/**
 * Returns the villager library's "ask a model", or null when this view cannot reach Claude at all
 * (the page is open somewhere other than the Claude viewer). Never retries.
 */
export async function connectAsk(claude: unknown): Promise<Ask | null> {
  let sample: Sample | null;
  try {
    sample = ((await (claude as { use?: (name: string) => Promise<unknown> } | undefined)?.use?.("sample")) ?? null) as Sample | null;
  } catch {
    return null;
  }
  if (!sample || typeof sample.json !== "function") return null;
  const reachable = sample;

  return async (request) => {
    try {
      // The runtime has no system prompt: standing instructions go in a leading turn.
      return await reachable.json(
        [{ role: "user", content: request.instructions }, ...request.turns],
        { cache: false, ...OPTIONS[request.model] },
      );
    } catch (error) {
      const code = (error as { code?: unknown } | null)?.code;
      throw new AskError((typeof code === "string" && FAILURES[code]) || "failed");
    }
  };
}
