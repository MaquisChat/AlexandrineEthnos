// Runs the scripted villager probes. Usage: pnpm checks -- --per-check 5 [--culture heron] [--ids a,b]
// AI_PROVIDER=login uses the Claude Code login and counts against the owner's ceiling.
// With AI_PROVIDER unset this is a dry run: the fake provider answers nothing readable.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseCulture } from "@fieldwork/contracts";
import { createGateway, memoryUsageLog, selectProvider } from "@fieldwork/gateway";
import { fileCounter, noCounter } from "./counter";
import { gatewayAsk } from "./gatewayAsk";
import { CHECKS, type Probe, validateProbes } from "./probes";
import { renderReport } from "./report";
import { type ProbeResult, runProbe } from "./run";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const CEILING = 600;
const args = process.argv.slice(2);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const perCheck = Number(option("per-check") ?? "1");
const only = option("culture");
const ids = option("ids")?.split(",");

const provider = selectProvider(process.env);
const usage = memoryUsageLog();
const counter = provider.name === "login" ? fileCounter(`${root}.fieldwork/login-calls.json`, CEILING) : noCounter;
const ask = gatewayAsk({ gateway: createGateway({ provider, usage }), counter, provider: provider.name });

const work: { cultureId: string; probe: Probe }[] = [];
const cultures = new Map<string, ReturnType<typeof parseCulture>>();
for (const cultureId of ["heron", "sealed"].filter((id) => !only || id === only)) {
  const culture = parseCulture(JSON.parse(readFileSync(`${root}content/cultures/${cultureId}.culture.json`, "utf8")));
  const probes = JSON.parse(readFileSync(`${root}tools/checks/probes/${cultureId}.json`, "utf8")) as Probe[];
  const issues = validateProbes(probes, culture);
  if (issues.length > 0) throw new Error(`Probes do not fit the ${cultureId} culture:\n${issues.join("\n")}`);
  cultures.set(cultureId, culture);
  for (const check of CHECKS) {
    const chosen = ids ? probes.filter((p) => p.check === check && ids.includes(p.id)) : probes.filter((p) => p.check === check).slice(0, perCheck);
    for (const probe of chosen) work.push({ cultureId, probe });
  }
}

// Two calls a turn (answer, check) and one for the judge.
const needed = work.reduce((sum, w) => sum + w.probe.steps.length * 2 + 1, 0);
if (provider.name === "login" && counter.used() + needed > CEILING) {
  console.error(`This run could need ${needed} calls; ${counter.used()} of ${CEILING} are used. Not starting.`);
  process.exit(1);
}
console.log(`${work.length} probes through the ${provider.name} provider, up to ${needed} calls.`);

const results: ProbeResult[] = new Array(work.length);
let next = 0;
const before = counter.used();
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < work.length) {
      const index = next++;
      const { cultureId, probe } = work[index]!;
      results[index] = await runProbe({ ask }, cultures.get(cultureId)!, probe);
      const r = results[index]!;
      console.log(`${probe.id}: ${r.error ? `error (${r.error.slice(0, 60)})` : `rule ${r.byRule.pass ? "pass" : "FAIL"}, judge ${r.byJudge ? (r.byJudge.pass ? "pass" : "FAIL") : "none"}`}`);
    }
  }),
);

const date = new Date().toISOString().slice(0, 10);
const model = usage.entries()[0]?.model ?? "unknown";
const calls = provider.name === "login" ? counter.used() - before : usage.entries().length;
const outDir = `${root}docs/checks/`;
mkdirSync(outDir, { recursive: true });
const name = ids ? `${date}-m1a-rerun` : `${date}-m1a`;
if (provider.name === "login") {
  writeFileSync(`${outDir}${name}.md`, renderReport(results, { provider: provider.name, model, calls, date }));
  writeFileSync(`${outDir}${name}.json`, JSON.stringify({ provider: provider.name, model, calls, date, results }, null, 2) + "\n");
  console.log(`wrote ${outDir}${name}.md  (login calls used so far: ${counter.used()} of ${CEILING})`);
} else {
  console.log("Dry run: nothing written. Set AI_PROVIDER=login for a real run.");
}
