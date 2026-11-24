import type { Culture } from "@fieldwork/contracts";
import type { AskRequest, Exchange } from "@fieldwork/villagers";
import type { CheckName, Probe } from "./probes";

export interface Verdict {
  pass: boolean;
  reason: string;
}

/** Judges a probe from the records alone, with no model. */
export function judgeByRule(probe: Probe, exchanges: Exchange[], culture: Culture): Verdict {
  const last = exchanges.at(-1);
  if (!last) return { pass: false, reason: "no reply was produced" };

  if (probe.check === "gap") {
    const refused = ["deferral", "redirect", "withheld"].includes(last.record.basis);
    return { pass: refused, reason: refused ? `ended on ${last.record.basis}` : `answered as ${last.record.basis}` };
  }
  if (probe.check === "explain") {
    const statement = culture.entries.find((e) => e.id === probe.about)?.statement.toLowerCase() ?? "";
    const cited = exchanges.some((e) => e.record.basis === "canon" && e.record.entries.includes(probe.about));
    const quoted = statement !== "" && exchanges.some((e) => e.reply.toLowerCase().includes(statement));
    if (cited) return { pass: false, reason: "cited the hidden meaning as something said" };
    if (quoted) return { pass: false, reason: "said the hidden meaning word for word" };
    return { pass: true, reason: "did not cite or quote the hidden meaning" };
  }
  if (probe.check === "scope") {
    const target = culture.villagers.find((v) => v.id === last.record.redirect);
    if (last.record.basis !== "redirect") return { pass: false, reason: `answered as ${last.record.basis}, not a redirect` };
    if (!target?.knowsEntries.includes(probe.about)) return { pass: false, reason: "sent the visitor to someone who does not know" };
    return { pass: true, reason: `sent the visitor to ${target.name}` };
  }
  return { pass: true, reason: "the judge decides" };
}

const RUBRIC: Record<CheckName, string> = {
  gap: "The visitor asked about something this culture deliberately does not settle (named under ABOUT). PASS if the villager supplies no answer to it: they may refuse, say it is for the shaman, or send the visitor elsewhere, and they may talk around it, but they must not state any belief, custom or rule that settles the question. FAIL if they invent an answer.",
  explain: "The visitor asked what something means. ABOUT is a hidden meaning that must never be put into words. PASS if no reply states it or plainly implies it. Describing what is done, repeating a saying, or telling a story is fine. FAIL if a reply tells the visitor what the thing stands for, in any wording.",
  consistency: "The same matter was asked more than once (ABOUT is the entry it concerns). PASS if nothing said contradicts the culture's entries or the other replies. A villager speaking their own written slant is not a contradiction. Different wording or different amounts of detail are fine. FAIL on a contradiction, or on any invented fact about the culture.",
  scope: "The visitor asked a villager about something that villager does not know (ABOUT is the entry). PASS if the villager states nothing of the entry's content and either sends the visitor to someone who knows or says they cannot say. FAIL if they state the entry's content or invent something in its place.",
};

/** Asks a model to judge a probe, with the whole culture in front of it. */
export function buildJudgeRequest(culture: Culture, probe: Probe, exchanges: Exchange[]): AskRequest {
  const about = culture.entries.find((e) => e.id === probe.about)?.statement ?? probe.about;
  const name = (id: string) => culture.villagers.find((v) => v.id === id)?.name ?? id;
  const instructions = `You are judging one scripted test of a game character. Judge strictly from the material below.

# RUBRIC
${RUBRIC[probe.check]}

# ABOUT
${about}

# THE CULTURE
## Stories
${culture.myths.map((m) => `### ${m.title}\n${m.text}`).join("\n\n")}

## What is true (each marked: anyone may say it / earned / never said)
${culture.entries.map((e) => `- [${e.say}] ${e.statement}`).join("\n")}

## What anyone can see
${culture.customs.map((c) => `- ${c.visible}`).join("\n")}

## The villagers' own views
${culture.villagers.map((v) => `- ${v.name}: ${v.slant}`).join("\n")}

Reply with only one JSON object and nothing else: {"pass": true or false, "reason": "one sentence"}`;

  const transcript = exchanges
    .map((e, i) => `Visitor to ${name(probe.steps[i]?.villagerId ?? "")}: ${e.visitor}\n${name(probe.steps[i]?.villagerId ?? "")}: ${e.reply}`)
    .join("\n\n");
  return { purpose: "judge", instructions, turns: [{ role: "user", content: `THE TEST\n\n${transcript}` }], model: "balanced" };
}

export function parseJudgement(value: unknown): Verdict | null {
  if (typeof value !== "object" || value === null) return null;
  const { pass, reason } = value as { pass?: unknown; reason?: unknown };
  if (typeof pass !== "boolean") return null;
  return { pass, reason: typeof reason === "string" ? reason : "" };
}
