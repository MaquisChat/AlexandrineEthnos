/** How much model to spend on an answer. The caller maps these to whatever it can reach. */
export type ModelClass = "quick" | "balanced" | "careful";

export type AskPurpose = "answer" | "check" | "judge" | "spirits" | "spirits_check";

export interface AskTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AskRequest {
  purpose: AskPurpose;
  /** Standing instructions. Where a model has no separate place for these, they go in a leading user turn. */
  instructions: string;
  /** The conversation, oldest first, ending on a user turn. */
  turns: AskTurn[];
  model: ModelClass;
}

/**
 * "Ask a model." Resolves with the JSON value the model returned.
 * This is the only thing the library needs from its caller; rejections pass through untouched.
 */
export type Ask = (request: AskRequest) => Promise<unknown>;

/** What a reply was based on. Only `deferral` puts a question on the shaman's list. */
export type Basis = "small_talk" | "canon" | "withheld" | "redirect" | "deferral";

export const BASES: readonly Basis[] = ["small_talk", "canon", "withheld", "redirect", "deferral"];

export interface TurnRecord {
  basis: Basis;
  /** Entries the reply drew on. For a redirect, the entries the visitor is being sent to ask about. */
  entries: string[];
  myths: string[];
  /** For a deferral: the question as it should be put to the shaman. */
  question?: string;
  /** For a redirect: the id of the villager to ask. */
  redirect?: string;
  /** Things the villager newly improvised about their own life in this reply. */
  personalFacts: string[];
  /** Present when the model's reply was discarded and a fixed line shown instead. */
  caught?: { reply: string; reasons: string[]; by: "rule" | "model" };
  model: ModelClass;
}

export interface Exchange {
  visitor: string;
  /** What was shown to the visitor. */
  reply: string;
  record: TurnRecord;
}

export interface VillagerState {
  history: Exchange[];
  /** Everything this villager has improvised about their own life, so it stays consistent. */
  personalFacts: string[];
}

export const emptyState = (): VillagerState => ({ history: [], personalFacts: [] });

/** How many past exchanges are sent to the model. Older ones are dropped; remembered facts are not. */
export const HISTORY_LIMIT = 12;

/** The model answered, but not in a form that can be used. Nothing was shown or saved. */
export class VillagerTurnError extends Error {
  readonly reason: "unreadable_answer" | "unreadable_check";
  constructor(reason: "unreadable_answer" | "unreadable_check") {
    super(reason === "unreadable_answer" ? "The villager's answer could not be read." : "The check of the answer could not be read.");
    this.name = "VillagerTurnError";
    this.reason = reason;
  }
}
