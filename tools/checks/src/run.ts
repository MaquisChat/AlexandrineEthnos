import type { Culture } from "@fieldwork/contracts";
import { type Ask, emptyState, type Exchange, type VillagerState, villagerTurn } from "@fieldwork/villagers";
import { buildJudgeRequest, judgeByRule, parseJudgement, type Verdict } from "./judge";
import type { Probe } from "./probes";

export interface ProbeResult {
  probe: Probe;
  exchanges: Exchange[];
  byRule: Verdict;
  /** Null when the judge could not be reached or read, or the probe did not finish. */
  byJudge: Verdict | null;
  error?: string;
}

/** Plays one scripted conversation through the villager library and judges it. Never throws. */
export async function runProbe(deps: { ask: Ask }, culture: Culture, probe: Probe): Promise<ProbeResult> {
  const states = new Map<string, VillagerState>();
  const exchanges: Exchange[] = [];
  try {
    for (const step of probe.steps) {
      const result = await villagerTurn(deps, {
        culture,
        villagerId: step.villagerId,
        state: states.get(step.villagerId) ?? emptyState(),
        line: step.line,
        model: "balanced",
      });
      states.set(step.villagerId, result.state);
      exchanges.push(result.exchange);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return { probe, exchanges, byRule: { pass: false, reason: "the probe did not finish" }, byJudge: null, error: message };
  }

  // A judge that cannot be reached or read gives no verdict; it does not fail the probe.
  const byJudge = await deps
    .ask(buildJudgeRequest(culture, probe, exchanges))
    .then(parseJudgement)
    .catch(() => null);
  return { probe, exchanges, byRule: judgeByRule(probe, exchanges, culture), byJudge };
}
