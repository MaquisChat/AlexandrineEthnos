import type { Culture } from "@fieldwork/contracts";
import type { Draft } from "./draft";

/**
 * "invention": the reply leans on something that is not there, so the villager should have deferred.
 * "guarded": the reply tells something this visitor may not be told.
 */
export interface RuleFinding {
  failure: "invention" | "guarded";
  reason: string;
}

/** Checks a draft against the culture file, with no model. An empty list means it passes. */
export function checkByRule(culture: Culture, villagerId: string, draft: Draft): RuleFinding[] {
  const villager = culture.villagers.find((v) => v.id === villagerId);
  if (!villager) throw new Error(`The culture "${culture.id}" has no villager "${villagerId}".`);
  const findings: RuleFinding[] = [];
  const invention = (reason: string) => findings.push({ failure: "invention", reason });
  const entry = (id: string) => culture.entries.find((e) => e.id === id);

  for (const id of draft.entries) {
    if (!entry(id)) invention(`cites an entry that does not exist: ${id}`);
  }
  for (const id of draft.myths) {
    if (!culture.myths.some((m) => m.id === id)) invention(`cites a story that does not exist: ${id}`);
    else if (!villager.knowsMyths.some((k) => k.mythId === id)) invention(`cites a story ${villager.name} does not know: ${id}`);
  }

  // Everything the model wrote that a visitor could come to see: the reply, the question for the shaman, new facts.
  const written = [draft.reply, draft.question ?? "", ...draft.personalFacts].join("\n").toLowerCase().replace(/\s+/g, " ");
  for (const guarded of culture.entries.filter((e) => e.say !== "anyone")) {
    if (written.includes(guarded.statement.toLowerCase().replace(/\s+/g, " "))) {
      findings.push({
        failure: "guarded",
        reason: guarded.say === "earned" ? `says word for word what is earned: ${guarded.id}` : `says word for word what is never said: ${guarded.id}`,
      });
    }
  }

  if (draft.basis === "redirect") {
    const target = culture.villagers.find((v) => v.id === draft.redirect);
    if (!target || target.id === villager.id) {
      invention(`sends the visitor to someone who is not there: ${draft.redirect ?? "nobody"}`);
    } else if (draft.entries.length === 0) {
      invention("sends the visitor to someone without naming what to ask about");
    } else {
      for (const id of draft.entries) {
        if (entry(id) && !target.knowsEntries.includes(id)) invention(`sends the visitor to ${target.name}, who does not know ${id}`);
      }
    }
    return findings;
  }

  for (const id of draft.entries) {
    const found = entry(id);
    if (!found) continue;
    if (!villager.knowsEntries.includes(id)) invention(`cites an entry ${villager.name} does not know: ${id}`);
    else if (found.say !== "anyone" && draft.basis !== "withheld" && draft.basis !== "deferral") {
      findings.push({
        failure: "guarded",
        reason: found.say === "earned" ? `tells a stranger what is earned: ${id}` : `puts into words what is never said: ${id}`,
      });
    }
  }

  if (draft.basis === "canon" && draft.entries.length === 0 && draft.myths.length === 0) {
    invention("claims to speak from the culture but cites nothing");
  }
  return findings;
}
