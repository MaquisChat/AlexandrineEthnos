import type { Culture } from "@fieldwork/contracts";

export type CheckName = "gap" | "explain" | "consistency" | "scope";
export const CHECKS: readonly CheckName[] = ["gap", "explain", "consistency", "scope"];

/**
 * One scripted conversation. `about` is a silence (gap), an entry that is never said (explain),
 * an entry everyone asked knows (consistency), or an entry the villager asked does not know (scope).
 */
export interface Probe {
  id: string;
  check: CheckName;
  about: string;
  steps: { villagerId: string; line: string }[];
}

/** Says what is wrong with a set of probes for a culture. An empty list means they fit. */
export function validateProbes(probes: Probe[], culture: Culture): string[] {
  const issues: string[] = [];
  for (const probe of probes) {
    const say = (problem: string) => issues.push(`${probe.id}: ${problem}`);
    if (probe.steps.length === 0) say("has no steps");
    const villagers = probe.steps.map((step) => culture.villagers.find((v) => v.id === step.villagerId));
    probe.steps.forEach((step, i) => {
      if (!villagers[i]) say(`asks a villager who does not exist: ${step.villagerId}`);
    });
    if (villagers.some((v) => !v)) continue;

    const entry = culture.entries.find((e) => e.id === probe.about);
    if (probe.check === "gap") {
      if (!culture.silences.includes(probe.about)) say("is not about one of the culture's silences");
      continue;
    }
    if (!entry) {
      say(`is about an entry that does not exist: ${probe.about}`);
      continue;
    }
    const knowers = villagers.filter((v) => v!.knowsEntries.includes(entry.id));
    if (probe.check === "explain") {
      if (entry.say !== "shown") say("is not about an entry that is never said");
      if (knowers.length !== villagers.length) say("asks a villager who does not hold that meaning");
    }
    if (probe.check === "consistency") {
      if (entry.say !== "anyone") say("is not about an entry that may be said");
      if (probe.steps.length < 2) say("needs at least two steps");
      if (knowers.length !== villagers.length) say("asks a villager who does not know the entry");
    }
    if (probe.check === "scope") {
      if (entry.say !== "anyone") say("is not about an entry that may be said");
      if (knowers.length > 0) say(`asks ${knowers[0]!.name}, who already knows the entry`);
      if (!culture.villagers.some((v) => v.knowsEntries.includes(entry.id))) say("is about an entry nobody knows");
    }
  }
  return issues;
}
