import { readFileSync } from "node:fs";
import { type Culture, parseCulture } from "@fieldwork/contracts";
import type { Ask, AskRequest } from "../src";

export const culture: Culture = parseCulture(
  JSON.parse(readFileSync("packages/contracts/test/fixtures/valid.culture.json", "utf8")),
);

export const CLEAN = { unsupported: [], explains: [], earned: [] };

export const draft = (over: Record<string, unknown> = {}) => ({
  reply: "The first fish goes to the heron. Then we eat.",
  basis: "canon",
  entries: ["e2"],
  myths: [],
  question: null,
  redirect: null,
  personalFacts: [],
  ...over,
});

export const SPIRIT_CLEAN = { contradicts: [], explains: [], unfit: [] };

export const spiritDraft = (over: Record<string, unknown> = {}) => ({
  kind: "answer",
  statement: "When a heron dies it is left where it falls, and no one touches it.",
  topic: "a dead heron",
  entryKind: "custom",
  say: "anyone",
  entries: ["e2"],
  ...over,
});

/** A stand-in for a model: answers in order by purpose and remembers every request it was sent. */
export function scripted(answers: unknown[], verdicts: unknown[] = [], more: { spirits?: unknown[]; spiritVerdicts?: unknown[] } = {}) {
  const requests: AskRequest[] = [];
  const spirits = [...(more.spirits ?? [])];
  const spiritVerdicts = [...(more.spiritVerdicts ?? [])];
  const ask: Ask = async (request) => {
    requests.push(request);
    if (request.purpose === "spirits") {
      if (spirits.length === 0) throw new Error("the script has no more spirit answers");
      return spirits.shift();
    }
    if (request.purpose === "spirits_check") return spiritVerdicts.length > 0 ? spiritVerdicts.shift() : SPIRIT_CLEAN;
    if (request.purpose === "answer") {
      if (answers.length === 0) throw new Error("the script has no more answers");
      return answers.shift();
    }
    return verdicts.length > 0 ? verdicts.shift() : CLEAN;
  };
  return { ask, requests };
}
