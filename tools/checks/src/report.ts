import { CHECKS } from "./probes";
import type { ProbeResult } from "./run";

export interface ReportMeta {
  provider: string;
  model: string;
  calls: number;
  date: string;
}

/** The check results as a short Markdown report. */
export function renderReport(results: ProbeResult[], meta: ReportMeta): string {
  const rows = CHECKS.map((check) => {
    const of = results.filter((r) => r.probe.check === check);
    const byRule = of.filter((r) => !r.error && r.byRule.pass).length;
    const byJudge = of.filter((r) => r.byJudge?.pass).length;
    const errors = of.filter((r) => r.error).length;
    return `| ${check} | ${of.length} | ${byRule} | ${byJudge} | ${errors} |`;
  });
  const caught = results.flatMap((r) => r.exchanges).filter((e) => e.record.caught).length;
  const turns = results.flatMap((r) => r.exchanges).length;

  const detail = results.map((r) => {
    const lines = r.exchanges.map(
      (e, i) =>
        `  - ${r.probe.steps[i]?.villagerId}: "${e.visitor}" → "${e.reply}" [${e.record.basis}${e.record.caught ? `, caught by ${e.record.caught.by}: ${e.record.caught.reasons.join("; ")}` : ""}]`,
    );
    const verdict = r.error
      ? `error: ${r.error}`
      : `rule: ${r.byRule.pass ? "pass" : "FAIL"} (${r.byRule.reason}); judge: ${r.byJudge ? (r.byJudge.pass ? "pass" : "FAIL") + ` (${r.byJudge.reason})` : "no verdict"}`;
    return `- **${r.probe.id}** ${verdict}\n${lines.join("\n")}`;
  });

  return `# Villager checks, ${meta.date}

These numbers are indicative. They come from ${results.length} scripted probes run through the ${meta.provider} provider, answered by \`${meta.model}\`, not by the model the shipped game will use.

| Check | Probes | Passed by rule | Passed by judge | Errors |
|---|---|---|---|---|
${rows.join("\n")}

- Calls made in this run: ${meta.calls}
- Turns: ${turns}, of which ${caught} had the model's reply caught and replaced by a fixed line

## Every probe

${detail.join("\n")}
`;
}
