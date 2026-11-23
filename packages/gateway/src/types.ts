/** Every kind of work the game asks an AI model to do. Each job can be given its own model. */
export const AI_JOBS = [
  "apprentice",
  "elicitation",
  "villager",
  "grounding_check",
  "consult_draft",
  "spirits",
  "record",
  "language_help",
  "translation",
  "pre_read",
  "staging",
  "marks",
] as const;
export type AiJob = (typeof AI_JOBS)[number];

/** The model every job uses unless configuration says otherwise. */
export const DEFAULT_MODEL = "claude-opus-5-5";

export type ProviderName = "fake" | "login" | "key";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiRequest {
  job: AiJob;
  system: string;
  messages: AiMessage[];
  maxTokens: number;
  studyId?: string;
}

/** A request as a provider receives it: the gateway has chosen the model. */
export interface ProviderRequest extends AiRequest {
  model: string;
}

export interface AiResponse {
  text: string;
  /** "refusal" means the model declined. Callers must check this before using `text`. */
  stopReason: "end" | "max_tokens" | "refusal";
  usage: { inputTokens: number; outputTokens: number };
  /** The model that actually answered, which a provider may choose itself. */
  model: string;
  provider: ProviderName;
}

export interface AiProvider {
  readonly name: ProviderName;
  complete(req: ProviderRequest): Promise<AiResponse>;
}
