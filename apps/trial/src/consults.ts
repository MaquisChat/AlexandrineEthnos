// What became of each question a villager refused to invent an answer to, as the trial page saves it.
import type { Culture, CultureEntry } from "@fieldwork/contracts";
import { addConsultEntry } from "@fieldwork/villagers";
import { fingerprint } from "./ids";

/** One question from one villager, and what was last decided about it. Every outcome is saved, the silent ones too. */
export interface ConsultRecord {
  cultureId: string;
  villagerId: string;
  /** The question as it would be put to the shaman. */
  question: string;
  at: string;
  outcome:
    | { status: "answered"; by: "shaman" | "spirits"; entry: CultureEntry }
    | { status: "settled"; entries: string[] }
    | { status: "silent"; reasons: string[]; discarded?: string };
}

type Which = Pick<ConsultRecord, "cultureId" | "villagerId" | "question">;

const plain = (id: string) => id.replace(/[^A-Za-z0-9_]/g, "_");

/** Stable for one question from one villager, and safe as a database document id. */
export function consultId(of: Which): string {
  return `${plain(of.cultureId)}__${plain(of.villagerId)}__${fingerprint(of.question)}`;
}

export function findConsult(consults: ConsultRecord[], of: Which): ConsultRecord | undefined {
  return consults.find((c) => c.cultureId === of.cultureId && c.villagerId === of.villagerId && c.question === of.question);
}

/** The base culture plus every saved answer for it, oldest first. An answer that no longer fits is left out. */
export function withAdditions(base: Culture, consults: ConsultRecord[]): Culture {
  const answers = consults
    .filter((c) => c.cultureId === base.id && c.outcome.status === "answered")
    .sort((x, y) => x.at.localeCompare(y.at));
  let culture = base;
  for (const record of answers) {
    if (record.outcome.status !== "answered") continue;
    culture = addConsultEntry(culture, record.outcome.entry) ?? culture;
  }
  return culture;
}
