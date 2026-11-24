import { BASES, type Basis } from "./types";

/** A reply as the model proposes it, before any check. */
export interface Draft {
  reply: string;
  basis: Basis;
  entries: string[];
  myths: string[];
  question: string | null;
  redirect: string | null;
  personalFacts: string[];
}

/** What the checking model found wrong with a reply. Empty lists mean nothing. */
export interface Verdict {
  unsupported: string[];
  explains: string[];
  earned: string[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A list of strings; `undefined` or `null` counts as empty; anything else is unreadable. */
function strings(value: unknown): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

const optionalText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

/** Reads the model's answer. Returns null for anything that is not a usable draft. */
export function parseDraft(value: unknown): Draft | null {
  if (!isObject(value)) return null;
  if (typeof value.reply !== "string" || value.reply.trim() === "") return null;
  if (typeof value.basis !== "string" || !BASES.includes(value.basis as Basis)) return null;
  const entries = strings(value.entries);
  const myths = strings(value.myths);
  const personalFacts = strings(value.personalFacts);
  if (entries === null || myths === null || personalFacts === null) return null;
  return {
    reply: value.reply.trim(),
    basis: value.basis as Basis,
    entries,
    myths,
    question: optionalText(value.question),
    redirect: optionalText(value.redirect),
    personalFacts,
  };
}

/** Reads the checking model's verdict. Returns null unless it has at least one of the three lists. */
export function parseVerdict(value: unknown): Verdict | null {
  if (!isObject(value)) return null;
  if (!("unsupported" in value) && !("explains" in value) && !("earned" in value)) return null;
  const unsupported = strings(value.unsupported);
  const explains = strings(value.explains);
  const earned = strings(value.earned);
  if (unsupported === null || explains === null || earned === null) return null;
  return { unsupported, explains, earned };
}
