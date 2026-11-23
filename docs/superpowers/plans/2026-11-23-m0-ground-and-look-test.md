# M0 Ground and Look Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A repository in which every later milestone can be built and checked, plus one scene in the game's look, with a walking figure and a dialogue strip, captured as a screenshot for the owner to judge.

**Architecture:** A pnpm workspace. `packages/contracts` defines the scene format once, as a parser and as published JSON Schema. `packages/gateway` is the single door to AI, with a scripted fake provider and a development-only provider that uses the Claude Code login. `tools/make-models` generates glTF files that are committed. `apps/client` is a Vite app: Three.js draws a scene from a scene file and model files, and React lays the dialogue strip over it as ordinary web text.

**Tech Stack:** Node 22, pnpm workspaces, TypeScript (strict), Vitest, Playwright, zod 4, Ajv, Three.js, @gltf-transform/core, React, Testing Library, @fontsource/noto-serif, fontkit (tests only).

**Spec:** `docs/superpowers/specs/2026-11-23-fieldwork-game-design.md` (sections 6, 8, 9.4, 9.5, 10 and 12 bear on this plan).

## Global Constraints

- All rules and game state live in the service. The client shows things and sends the player's intentions. M0 has no service, so anything the client says or shows beyond the scene is fixture data in `apps/client/src/demo.ts`.
- Scenes are data: a JSON file checked against a published schema, following glTF conventions (right-handed, Y up, metres), containing nothing specific to Three.js.
- The running game loads only standard files: glTF for models and animation, SVG and PNG for marks and interface, JSON for scenes. Scripts may generate these files; the game never draws its world purely from code.
- Look: flat unlit colour, hard-edged shapes, strong silhouettes, a limited palette, depth from fog and steps of brightness, shadows as flat shapes, no textures other than marks, dialogue set large in the lower third.
- No assets, scenes or characters copied from any existing game.
- All figures share one skeleton: in M0, the fixed node names in `FIGURE_NODES`.
- The default model for every AI job is `claude-opus-5-5`.
- Keys live in the environment, never in the repository.
- The login provider is a development tool and must never be part of the shipped game: `apps/client` must not depend on `@fieldwork/gateway`.
- Every test that is not about AI quality runs on the fake provider, with no network.
- Word boundaries for tapping come from data, not from splitting on spaces. Layout is direction-neutral (CSS logical properties). Text inputs must not act on Enter during input-method composition.
- Text size is adjustable, everything is reachable from the keyboard, colour is never the only carrier of meaning.
- The dialogue font must cover English, French, Russian and Kazakh, including ә ғ қ ң ө ұ ү һ і.
- Package scope is `@fieldwork/`. All paths below are relative to the repository root, the directory that holds `docs/superpowers`.
- In the Claude Code cloud container, do not run `playwright install`. Set `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`; the Playwright config reads it.
- Test snippets below omit their imports and give file paths from the repository root; resolve both from the test file. Test-only helpers used in them: `pngjs` and `@gltf-transform/functions` (`getBounds`).

## Review Focus

1. A model file named by a scene is missing or corrupt: the page shows a readable error naming the file, not a blank canvas. (Task 6)
2. WebGL cannot start on the player's machine: a plain message, no crash. (Task 6)
3. Kazakh, Russian or French text in the dialogue strip: no missing-glyph boxes. (Task 7)
4. `claude` is not installed, not logged in, hangs, or prints something that is not JSON: a typed error within the timeout, never a hang. (Task 3)
5. The player clicks again mid-walk, or clicks somewhere the path cannot reach: the figure never teleports or freezes. (Task 5)

---

### Task 1: Workspace and the scene contract

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.nvmrc` (contents `22`), `eslint.config.js`, `CLAUDE.md`, `docs/decisions.md`
- Create: `packages/contracts/package.json`, `packages/contracts/src/scene.ts`, `packages/contracts/src/index.ts`, `packages/contracts/scripts/export-json-schema.ts`, `packages/contracts/schemas/scene.schema.json` (generated, committed)
- Test: `packages/contracts/test/scene.test.ts`, `packages/contracts/test/fixtures/valid.scene.json`

**Interfaces:**
- Consumes: nothing.
- Produces, from `@fieldwork/contracts`:

```ts
export type Vec3 = [number, number, number];
export const PALETTE_ROLES = ["sky", "fog", "ground", "water", "structure",
  "figure", "accent", "shadow", "mark"] as const;
export type PaletteRole = (typeof PALETTE_ROLES)[number];
export interface SceneModel { id: string; uri: string; position: Vec3; rotationYDeg: number; scale: number }
export interface Scene {
  schemaVersion: 1; id: string; name: string;
  models: SceneModel[];
  camera: { fovDeg: number; rail: { position: Vec3; lookAt: Vec3 }[]; driftSeconds: number };
  walk: { nodes: { id: string; position: Vec3 }[]; edges: [string, string][]; start: string };
  hotspots: { id: string; kind: "person" | "object" | "exit"; label: string;
              position: Vec3; radius: number; walkNode: string }[];
  slots: { id: string; kind: "mark" | "prop" | "actor"; position: Vec3; rotationYDeg: number; size: number }[];
  palette: Record<PaletteRole, string>;
  fog: { near: number; far: number };
}
export class SceneParseError extends Error { readonly issues: string[] }
export function parseScene(input: unknown): Scene;
export const sceneJsonSchema: Record<string, unknown>;
```

- Root scripts, used by every later task and by CI: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm models`, `pnpm ai:try`, `pnpm e2e`, `pnpm shots`. Scripts whose targets do not exist yet are added by the task that creates the target.

Rules `parseScene` enforces beyond types: unknown keys are rejected at every level; ids are unique within `models`, `walk.nodes`, `hotspots` and `slots`; every edge end, `walk.start` and every `walkNode` names an existing node; `rail` and `walk.nodes` have at least one entry; every palette role is present as `#rrggbb`; a model `uri` is relative to the content root, ends in `.glb`, and contains no `..` or leading slash; `fog.near < fog.far`. Each issue message starts with the path of the offending value.

The fixture has id `waters-edge`, nodes `a`, `b`, `c`, edges a–b and b–c, start `a`, one hotspot with `walkNode: "c"`, one model, one slot.

- [ ] **Step 1: Create the workspace**

`git init -b main` if the root is not yet a repository. Root `package.json` is private with `"packageManager"` set to the installed pnpm version and `"engines": {"node": ">=22"}`. `pnpm-workspace.yaml` lists `packages/*`, `apps/*`, `tools/*`. `tsconfig.base.json` sets `strict`, `noUncheckedIndexedAccess`, `module` and `moduleResolution` suitable for Vite and Node 22 ESM. `.gitignore` covers `node_modules`, `dist`, `test-results`, `playwright-report`, `.env*`.

- [ ] **Step 2: Write the failing tests**

```ts
// packages/contracts/test/scene.test.ts
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import { parseScene, SceneParseError, sceneJsonSchema } from "../src";
import valid from "./fixtures/valid.scene.json";

const broken = (edit: (s: any) => void) => { const s = structuredClone(valid) as any; edit(s); return s; };

describe("parseScene", () => {
  it("accepts the valid fixture", () => {
    expect(parseScene(valid).id).toBe("waters-edge");
  });
  it.each([
    ["an edge to a missing node", (s: any) => s.walk.edges.push(["a", "nowhere"]), /^walk\.edges.*nowhere/],
    ["a missing start node", (s: any) => (s.walk.start = "z"), /^walk\.start/],
    ["a hotspot on a missing node", (s: any) => (s.hotspots[0].walkNode = "z"), /^hotspots\.0\.walkNode/],
    ["duplicate node ids", (s: any) => s.walk.nodes.push({ ...s.walk.nodes[0] }), /^walk\.nodes.*duplicate/],
    ["a palette without every role", (s: any) => delete s.palette.fog, /^palette/],
    ["a colour that is not #rrggbb", (s: any) => (s.palette.sky = "orange"), /^palette\.sky/],
    ["an engine-specific key", (s: any) => (s.three = {}), /three/],
    ["a model path that climbs out", (s: any) => (s.models[0].uri = "../x.glb"), /^models\.0\.uri/],
    ["fog that ends before it starts", (s: any) => (s.fog = { near: 9, far: 3 }), /^fog/],
  ])("rejects %s", (_name, edit, message) => {
    let error: unknown;
    try { parseScene(broken(edit)); } catch (e) { error = e; }
    expect(error).toBeInstanceOf(SceneParseError);
    expect((error as SceneParseError).issues.join("\n")).toMatch(new RegExp(message.source, "m"));
  });
});

describe("published JSON Schema", () => {
  const validate = new Ajv2020({ strict: false }).compile(sceneJsonSchema);
  it("accepts what the parser accepts", () => expect(validate(valid)).toBe(true));
  it("rejects a wrong version", () => expect(validate({ ...valid, schemaVersion: 2 })).toBe(false));
  it("rejects unknown keys", () => expect(validate({ ...valid, three: {} })).toBe(false));
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `pnpm test`
Expected: FAIL, cannot resolve `../src`.

- [ ] **Step 4: Implement `parseScene` and the schema export**

Define the scene with zod strict objects and a `superRefine` for the cross-reference rules. `parseScene` throws `SceneParseError` whose `issues` are `"<dotted.path>: <message>"`. `scripts/export-json-schema.ts` writes `schemas/scene.schema.json` using zod's built-in JSON Schema export; `src/index.ts` re-exports that file as `sceneJsonSchema`. Add root script `pnpm schemas` and run it. The cross-reference rules cannot be expressed in JSON Schema; say so in the schema's `description`.

- [ ] **Step 5: Run all checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS, 13 tests.

- [ ] **Step 6: Write the builder's guide and decision notes**

`CLAUDE.md` states: where the spec and plans are; the root scripts; the Global Constraints above, verbatim; that decisions which change what a player experiences are appended to `docs/decisions.md` with date and reason. `docs/decisions.md` starts with one entry: the scene format's cross-reference rules live in the parser, not in the JSON Schema.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: workspace and scene contract"
```

---

### Task 2: AI gateway with the fake provider

**Files:**
- Create: `packages/gateway/package.json`, `packages/gateway/src/types.ts`, `packages/gateway/src/fake.ts`, `packages/gateway/src/usage.ts`, `packages/gateway/src/gateway.ts`, `packages/gateway/src/index.ts`
- Test: `packages/gateway/test/fake.test.ts`, `packages/gateway/test/gateway.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces, from `@fieldwork/gateway`:

```ts
export const AI_JOBS = ["apprentice", "elicitation", "villager", "grounding_check",
  "consult_draft", "spirits", "record", "language_help", "translation",
  "pre_read", "staging", "marks"] as const;
export type AiJob = (typeof AI_JOBS)[number];
export const DEFAULT_MODEL = "claude-opus-5-5";
export type ProviderName = "fake" | "login" | "key";
export interface AiMessage { role: "user" | "assistant"; content: string }
export interface AiRequest { job: AiJob; system: string; messages: AiMessage[]; maxTokens: number; studyId?: string }
export interface ProviderRequest extends AiRequest { model: string }
export interface AiResponse {
  text: string; stopReason: "end" | "max_tokens" | "refusal";
  usage: { inputTokens: number; outputTokens: number }; model: string; provider: ProviderName;
}
export interface AiProvider { readonly name: ProviderName; complete(req: ProviderRequest): Promise<AiResponse> }

export interface FakeRule { job?: AiJob; match?: RegExp;
  reply: string | ((req: ProviderRequest) => string); stopReason?: AiResponse["stopReason"] }
export class FakeProviderNoMatchError extends Error {}
export class FakeProvider implements AiProvider {
  constructor(rules: FakeRule[]); readonly name: "fake"; readonly calls: ProviderRequest[];
  complete(req: ProviderRequest): Promise<AiResponse>;
}

export interface UsageEntry { at: string; job: AiJob; studyId?: string; provider: ProviderName;
  model: string; inputTokens: number; outputTokens: number }
export interface UsageLog { record(entry: UsageEntry): void; entries(): readonly UsageEntry[] }
export function memoryUsageLog(): UsageLog;

export interface Gateway { run(req: AiRequest): Promise<AiResponse> }
export function createGateway(opts: { provider: AiProvider;
  models?: Partial<Record<AiJob, string>>; usage?: UsageLog; now?: () => Date }): Gateway;
```

Fake behaviour: rules are tried in order; a rule matches when its `job` (if given) equals the request's and its `match` (if given) tests true against the last user message. No match throws `FakeProviderNoMatchError` naming the job and quoting the last user message. Token counts are deterministic: characters divided by four, rounded up, over system plus messages for input and over the reply for output.

- [ ] **Step 1: Write the failing tests**

```ts
// packages/gateway/test/fake.test.ts
const req = (text: string, job: AiJob = "villager"): ProviderRequest =>
  ({ job, system: "s", messages: [{ role: "user", content: text }], maxTokens: 100, model: "m" });

it("answers with the first matching rule and records the call", async () => {
  const fake = new FakeProvider([
    { job: "spirits", reply: "the spirits" },
    { match: /heron/, reply: "It's the heron. You feed it first." },
    { reply: (r) => `echo:${r.messages.at(-1)!.content}` },
  ]);
  expect((await fake.complete(req("what is the heron?"))).text).toBe("It's the heron. You feed it first.");
  expect((await fake.complete(req("hello"))).text).toBe("echo:hello");
  expect(fake.calls).toHaveLength(2);
});
it("fails loudly when nothing matches", async () => {
  await expect(new FakeProvider([{ job: "spirits", reply: "x" }]).complete(req("hello")))
    .rejects.toThrowError(/villager.*hello/s);
});
it("counts tokens deterministically", async () => {
  const r = await new FakeProvider([{ reply: "12345678" }]).complete(req("abc"));
  expect(r.usage).toEqual({ inputTokens: 1, outputTokens: 2 }); // ("s"+"abc") = 4 chars; 8 chars
  expect(r.provider).toBe("fake");
});

// packages/gateway/test/gateway.test.ts
it("uses claude-opus-5-5 for every job unless told otherwise", async () => {
  const fake = new FakeProvider([{ reply: "ok" }]);
  const gw = createGateway({ provider: fake, models: { marks: "other-model" } });
  for (const job of AI_JOBS) await gw.run({ job, system: "", messages: [{ role: "user", content: "x" }], maxTokens: 10 });
  const used = Object.fromEntries(fake.calls.map((c) => [c.job, c.model]));
  expect(used.marks).toBe("other-model");
  expect(new Set(AI_JOBS.filter((j) => j !== "marks").map((j) => used[j]))).toEqual(new Set(["claude-opus-5-5"]));
});
it("logs one usage entry per call, with study and time", async () => {
  const usage = memoryUsageLog();
  const gw = createGateway({ provider: new FakeProvider([{ reply: "ok" }]), usage, now: () => new Date("2026-11-23T00:00:00Z") });
  await gw.run({ job: "villager", system: "", messages: [{ role: "user", content: "x" }], maxTokens: 10, studyId: "st1" });
  expect(usage.entries()).toEqual([expect.objectContaining(
    { at: "2026-11-23T00:00:00.000Z", job: "villager", studyId: "st1", provider: "fake", model: "claude-opus-5-5" })]);
});
it("returns a refusal as a result, not an exception", async () => {
  const gw = createGateway({ provider: new FakeProvider([{ reply: "", stopReason: "refusal" }]) });
  expect((await gw.run({ job: "villager", system: "", messages: [{ role: "user", content: "x" }], maxTokens: 10 })).stopReason).toBe("refusal");
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test`
Expected: FAIL, exports missing.

- [ ] **Step 3: Implement the types, `FakeProvider`, `memoryUsageLog` and `createGateway`** with the signatures above.

- [ ] **Step 4: Run all checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: AI gateway with fake provider and usage log"
```

---

### Task 3: Login provider and `ai:try`

**Files:**
- Create: `packages/gateway/src/login.ts`, `packages/gateway/src/select.ts`, `packages/gateway/scripts/try.ts`
- Modify: `packages/gateway/src/index.ts`, root `package.json` (script `ai:try`)
- Test: `packages/gateway/test/login.test.ts`, `packages/gateway/test/select.test.ts`, `packages/gateway/test/fixtures/claude-print-sample.json`

**Interfaces:**
- Consumes: `AiProvider`, `ProviderRequest`, `AiResponse`, `FakeProvider` from Task 2.
- Produces:

```ts
export type RunClaude = (args: string[], stdin: string, timeoutMs: number) =>
  Promise<{ code: number; stdout: string; stderr: string }>;
export type LoginFailure = "not_installed" | "not_logged_in" | "timeout" | "bad_output" | "failed";
export class LoginProviderError extends Error { readonly reason: LoginFailure }
export function spawnRunner(command: string): RunClaude; // LoginProvider's default is spawnRunner("claude")
export function buildClaudeArgs(req: ProviderRequest): string[];
export function buildClaudeStdin(req: ProviderRequest): string;
export class LoginProvider implements AiProvider {
  constructor(opts?: { run?: RunClaude; timeoutMs?: number }); // default timeout 120_000
  readonly name: "login";
  complete(req: ProviderRequest): Promise<AiResponse>;
}
export function selectProvider(env: Record<string, string | undefined>): AiProvider;
```

`buildClaudeArgs` returns `["-p", "--output-format", "json", "--system-prompt", req.system]`. The request's `model` is not passed: the login serves whatever model it serves, and `AiResponse.model` reports which. `buildClaudeStdin` returns the content of a single user message unchanged; for longer conversations it joins messages as `"[user]\n<content>"` and `"[assistant]\n<content>"` blocks separated by blank lines. The default `run` spawns `claude`, writes stdin, and kills the process at the timeout. A `run` that rejects with code `ENOENT` means `not_installed`; a rejection carrying `timedOut: true` means `timeout`. `selectProvider` reads `AI_PROVIDER`: unset or `fake` gives a `FakeProvider` with one rule that echoes the last user message prefixed `[fake] `; `login` gives a `LoginProvider`; anything else throws an error that lists `fake` and `login` and says the key provider arrives in M1.

- [ ] **Step 1: Capture a real sample and confirm the flags**

Run: `claude --help` and confirm `-p`, `--output-format` and `--system-prompt` exist. If one is missing, record the substitute in `docs/decisions.md` and use it in `buildClaudeArgs` and its test.
Run: `claude -p "Reply with the single word: ok" --output-format json --system-prompt "You answer in one word." > packages/gateway/test/fixtures/claude-print-sample.json`
Expected: one JSON object. Note which fields hold the reply text, the error flag, `usage.input_tokens`, `usage.output_tokens`, and the model name (the key of `modelUsage`). If no login is available, write the fixture by hand with those fields and say so in `docs/decisions.md`.

- [ ] **Step 2: Write the failing tests**

```ts
// packages/gateway/test/login.test.ts
import sample from "./fixtures/claude-print-sample.json";
const req: ProviderRequest = { job: "villager", system: "Be brief.", maxTokens: 50, model: "claude-opus-5-5",
  messages: [{ role: "user", content: "hello" }] };
const ok = (stdout: string): RunClaude => async () => ({ code: 0, stdout, stderr: "" });

it("passes the system prompt as a flag and the message on stdin", async () => {
  let seen: { args: string[]; stdin: string } | undefined;
  const run: RunClaude = async (args, stdin) => { seen = { args, stdin }; return { code: 0, stdout: JSON.stringify(sample), stderr: "" }; };
  await new LoginProvider({ run }).complete(req);
  expect(seen).toEqual({ args: ["-p", "--output-format", "json", "--system-prompt", "Be brief."], stdin: "hello" });
});
it("maps the sample to a response", async () => {
  const r = await new LoginProvider({ run: ok(JSON.stringify(sample)) }).complete(req);
  expect(r.provider).toBe("login");
  expect(r.text.length).toBeGreaterThan(0);
  expect(r.usage.outputTokens).toBeGreaterThan(0);
  expect(r.model).not.toBe("");
});
it("labels a multi-message conversation", () => {
  expect(buildClaudeStdin({ ...req, messages: [
    { role: "user", content: "a" }, { role: "assistant", content: "b" }, { role: "user", content: "c" }] }))
    .toBe("[user]\na\n\n[assistant]\nb\n\n[user]\nc");
});
it.each([
  ["not_installed", async () => { throw Object.assign(new Error("spawn claude ENOENT"), { code: "ENOENT" }); }],
  ["timeout", async () => { throw Object.assign(new Error("timed out"), { timedOut: true }); }],
  ["bad_output", ok("Welcome! not json")],
  ["not_logged_in", async () => ({ code: 1, stdout: "", stderr: "Please run /login to authenticate" })],
  ["failed", async () => ({ code: 2, stdout: "", stderr: "boom" })],
] as [LoginFailure, RunClaude][])("reports %s as a typed error", async (reason, run) => {
  await expect(new LoginProvider({ run }).complete(req)).rejects.toMatchObject({ reason });
});
it("gives up at the timeout instead of hanging", async () => {
  const started = Date.now();
  await expect(spawnRunner("sleep")(["5"], "", 50)).rejects.toMatchObject({ timedOut: true });
  expect(Date.now() - started).toBeLessThan(1000);
});

// packages/gateway/test/select.test.ts
it("defaults to the fake provider", () => expect(selectProvider({}).name).toBe("fake"));
it("selects login", () => expect(selectProvider({ AI_PROVIDER: "login" }).name).toBe("login"));
it("rejects unknown names and names the accepted ones", () =>
  expect(() => selectProvider({ AI_PROVIDER: "key" })).toThrowError(/fake.*login.*M1/s));
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `pnpm test`
Expected: FAIL, `LoginProvider` missing.

- [ ] **Step 4: Implement `spawnRunner`, `buildClaudeArgs`, `buildClaudeStdin`, `LoginProvider`, `selectProvider`**, and `scripts/try.ts`, which sends its first argument through `createGateway({ provider: selectProvider(process.env) })` as a `villager` job and prints the reply, provider, model and token counts.

- [ ] **Step 5: Run all checks, then the live check**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.
Run: `AI_PROVIDER=login pnpm ai:try "Reply with the single word: ok"`
Expected: a one-word reply, `provider: login`, a model name. If the login is unavailable, expected output is the `not_logged_in` or `not_installed` message; record that in the task report, since this check then belongs to the hand-off.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: login provider for development and ai:try"
```

---

### Task 4: Model files

**Files:**
- Create: `tools/make-models/package.json`, `tools/make-models/src/shapes.ts`, `tools/make-models/src/figure.ts`, `tools/make-models/src/watersEdge.ts`, `tools/make-models/src/main.ts`
- Create: `packages/contracts/src/figure.ts`; modify `packages/contracts/src/index.ts`
- Create (generated, committed): `apps/client/public/content/models/figure.glb`, `apps/client/public/content/models/waters-edge.glb`
- Create (hand-drawn, original): `apps/client/public/content/marks/heron.svg`
- Test: `tools/make-models/test/models.test.ts`

**Interfaces:**
- Consumes: `PALETTE_ROLES` from Task 1.
- Produces, from `@fieldwork/contracts`:

```ts
export const FIGURE_NODES = ["root", "hips", "torso", "head", "arm_l", "arm_r", "leg_l", "leg_r"] as const;
export const FIGURE_ANIMATIONS = ["idle", "walk"] as const;
export const FIGURE_HEIGHT_M = 1.7;
```

- Produces, from the tool: `buildFigure(): Document`, `buildWatersEdge(): Document` (gltf-transform documents) and root script `pnpm models`, which writes both `.glb` files.

File conventions later tasks rely on:
- Every material is named `role:<PaletteRole>` and carries the `KHR_materials_unlit` extension. Base colours in the file are placeholders; the client recolours by role.
- No textures, no vertex normals needed, no skins. The figure is rigid parts on the `FIGURE_NODES` hierarchy (`root` > `hips` > `torso` > `head`, `arm_l`, `arm_r`; `hips` > `leg_l`, `leg_r`), animated by node rotation.
- The figure is 1.7 m tall with feet at y = 0, facing +Z. `idle` loops in 2.0 s, `walk` in 1.0 s. Body parts use `role:figure`; one band across the torso uses `role:accent`.
- `waters-edge.glb` holds, in metres: a ground slab from x −12 to 12 (`role:ground`); a water plane behind it from z −1 (`role:water`); a jetty running back from x = 5 (`role:structure`); a post 2.2 m tall and 0.3 m square at x = −2, z = 0 (`role:structure`); a hut silhouette around x = 8, z = −3 (`role:structure`); three ranks of flat reed and hill cut-outs at z = −4, −9 and −16 (`role:structure`); a flat ellipse on the ground under x = 3, z = 0.4 (`role:shadow`).
- `heron.svg` is a single-colour silhouette on a transparent ground, `viewBox="0 0 100 100"`, fill `currentColor`.
- Generation is deterministic: no timestamps, no random numbers.

- [ ] **Step 1: Write the failing tests**

```ts
// tools/make-models/test/models.test.ts
const io = new NodeIO().registerExtensions([KHRMaterialsUnlit]);
const read = (name: string) => io.read(`apps/client/public/content/models/${name}`);
const names = (list: { getName(): string }[]) => list.map((n) => n.getName());

it("figure has the shared node names and animations", async () => {
  const root = (await read("figure.glb")).getRoot();
  expect(names(root.listNodes())).toEqual(expect.arrayContaining([...FIGURE_NODES]));
  expect(names(root.listAnimations()).sort()).toEqual(["idle", "walk"]);
});
it("figure stands 1.7 m tall on y = 0", async () => {
  const { min, max } = getBounds((await read("figure.glb")).getRoot().listScenes()[0]!);
  expect(min[1]).toBeCloseTo(0, 2);
  expect(max[1]).toBeCloseTo(1.7, 2);
});
it.each(["figure.glb", "waters-edge.glb"])("%s uses only unlit role materials and no textures", async (file) => {
  const root = (await read(file)).getRoot();
  expect(root.listTextures()).toHaveLength(0);
  for (const m of root.listMaterials()) {
    expect(m.getName()).toMatch(new RegExp(`^role:(${PALETTE_ROLES.join("|")})$`));
    expect(m.getExtension("KHR_materials_unlit")).not.toBeNull();
  }
});
it("generation is deterministic", async () => {
  const a = await io.writeBinary(buildFigure());
  const b = await io.writeBinary(buildFigure());
  expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
});
it("the mark is a single-colour silhouette", () => {
  const svg = readFileSync("apps/client/public/content/marks/heron.svg", "utf8");
  expect(svg).toMatch(/viewBox="0 0 100 100"/);
  expect(svg).toMatch(/currentColor/);
  expect(svg).not.toMatch(/<image|href=/);
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test`
Expected: FAIL, model files not found.

- [ ] **Step 3: Implement the generators**

`shapes.ts` holds small builders that return positions and indices for a box, a prism from a 2D outline (for cut-outs), and a flat ellipse. Faces are not smoothed. `figure.ts` and `watersEdge.ts` assemble documents with gltf-transform; `main.ts` writes them. Keep silhouettes simple and readable at a distance: the owner judges the look in Task 8, not here.

- [ ] **Step 4: Generate and run all checks**

Run: `pnpm models && pnpm lint && pnpm typecheck && pnpm test`
Expected: two `.glb` files written; PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: generated model files for the figure and the water's edge"
```

---

### Task 5: Walking and camera maths

**Files:**
- Create: `apps/client/package.json`, `apps/client/tsconfig.json`, `apps/client/src/stage/walk.ts`, `apps/client/src/stage/rail.ts`
- Test: `apps/client/test/walk.test.ts`, `apps/client/test/rail.test.ts`

**Interfaces:**
- Consumes: `Scene`, `Vec3` from Task 1.
- Produces:

```ts
// walk.ts
export function shortestPath(walk: Scene["walk"], from: string, to: string): string[] | null; // by distance; null if unreachable
export function nearestNode(walk: Scene["walk"], point: Vec3): string;
export interface WalkerState { position: Vec3; headingRad: number; moving: boolean }
export class Walker {
  constructor(walk: Scene["walk"], speedMps?: number); // default 1.2; starts at walk.start
  goTo(nodeId: string): boolean;   // false, and no change, if unreachable or unknown
  update(dtSeconds: number): WalkerState;
  readonly atNode: string | null;  // node id when standing on one, else null
}
// rail.ts
export function railPose(rail: Scene["camera"]["rail"], seconds: number, driftSeconds: number):
  { position: Vec3; lookAt: Vec3 };
```

`Walker.goTo` called mid-walk replans from where the figure stands: it may head for either end of the edge it is on, whichever gives the shorter route, so it can turn back at once. `headingRad` is the angle about Y of the direction of travel, 0 facing +Z, and keeps its last value when standing. `railPose` moves from the first keyframe to the last and back over `2 × driftSeconds` with smooth easing at each end; with one keyframe it is constant.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/client/test/walk.test.ts
const line: Scene["walk"] = { start: "a", edges: [["a", "b"], ["b", "c"]],
  nodes: [{ id: "a", position: [0, 0, 0] }, { id: "b", position: [3, 0, 0] }, { id: "c", position: [6, 0, 0] },
          { id: "island", position: [0, 0, 9] }] };
const dist = (p: Vec3, q: Vec3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

it("finds the path along edges", () => expect(shortestPath(line, "a", "c")).toEqual(["a", "b", "c"]));
it("prefers the shorter of two routes", () => {
  const tri = { ...line, edges: [...line.edges, ["a", "c"]] as [string, string][],
    nodes: line.nodes.map((n) => (n.id === "b" ? { ...n, position: [3, 0, 8] as Vec3 } : n)) };
  expect(shortestPath(tri, "a", "c")).toEqual(["a", "c"]);
});
it("returns null for an unreachable node", () => expect(shortestPath(line, "a", "island")).toBeNull());
it("finds the nearest node to a point", () => expect(nearestNode(line, [5.2, 0, 0.4])).toBe("c"));

it("walks at its speed and arrives", () => {
  const w = new Walker(line, 1.2);
  expect(w.goTo("c")).toBe(true);
  expect(w.update(1).position[0]).toBeCloseTo(1.2, 5);
  let s = w.update(0); for (let i = 0; i < 100; i++) s = w.update(0.1);
  expect(s).toMatchObject({ position: [6, 0, 0], moving: false });
  expect(w.atNode).toBe("c");
});
it("never teleports when told to turn back mid-walk", () => {
  const w = new Walker(line, 1.2); w.goTo("c");
  let last = w.update(1).position; w.goTo("a");
  for (let i = 0; i < 200; i++) {
    const p = w.update(0.05).position;
    expect(dist(p, last)).toBeLessThanOrEqual(1.2 * 0.05 + 1e-9);
    last = p;
  }
  expect(last).toEqual([0, 0, 0]);
});
it("refuses a place it cannot reach and stays put", () => {
  const w = new Walker(line);
  expect(w.goTo("island")).toBe(false);
  expect(w.goTo("nowhere")).toBe(false);
  expect(w.update(1)).toMatchObject({ position: [0, 0, 0], moving: false });
});
it("does not overshoot on a long frame", () => {
  const w = new Walker(line, 1.2); w.goTo("b");
  expect(w.update(60).position).toEqual([3, 0, 0]);
});

// apps/client/test/rail.test.ts
const rail = [{ position: [0, 2, 15] as Vec3, lookAt: [0, 1, 0] as Vec3 },
              { position: [2, 2, 15] as Vec3, lookAt: [1, 1, 0] as Vec3 }];
it("starts at the first keyframe", () => expect(railPose(rail, 0, 40).position).toEqual([0, 2, 15]));
it("reaches the last keyframe after driftSeconds", () => expect(railPose(rail, 40, 40).position[0]).toBeCloseTo(2, 5));
it("returns to the start after twice driftSeconds", () => expect(railPose(rail, 80, 40).position[0]).toBeCloseTo(0, 5));
it("eases: a quarter of the way in time is less than a quarter in distance", () =>
  expect(railPose(rail, 10, 40).position[0]).toBeLessThan(0.5));
it("is constant with one keyframe", () => expect(railPose([rail[0]!], 123, 40)).toEqual(rail[0]));
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test`
Expected: FAIL, modules missing.

- [ ] **Step 3: Implement `walk.ts` and `rail.ts`** with the signatures above. These files import nothing from Three.js.

- [ ] **Step 4: Run all checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: walking and camera rail maths"
```

---

### Task 6: The scene on screen

**Files:**
- Create: `apps/client/index.html`, `apps/client/vite.config.ts`, `apps/client/src/main.tsx`, `apps/client/src/App.tsx`, `apps/client/src/demo.ts`, `apps/client/src/stage/errors.ts`, `apps/client/src/stage/loadScene.ts`, `apps/client/src/stage/palette.ts`, `apps/client/src/stage/Stage.ts`, `apps/client/playwright.config.ts`
- Create: `apps/client/public/content/scenes/waters-edge.scene.json`
- Modify: root `package.json` (scripts `build`, `e2e`)
- Test: `apps/client/test/loadScene.test.ts`, `apps/client/test/palette.test.ts`, `apps/client/test/App.test.tsx`, `apps/client/e2e/stage.spec.ts`

**Interfaces:**
- Consumes: `parseScene`, `Scene`, `Vec3` (Task 1); `FIGURE_ANIMATIONS` (Task 4); `Walker`, `nearestNode`, `railPose` (Task 5); the model and mark files (Task 4).
- Produces:

```ts
// errors.ts
export type SceneLoadFailure = "scene_not_found" | "scene_invalid" | "model_missing";
export class SceneLoadError extends Error {
  constructor(kind: SceneLoadFailure, file: string, detail?: string);
  readonly kind: SceneLoadFailure; readonly file: string;
}
export class WebGLUnavailableError extends Error {}
// loadScene.ts
export interface LoadedScene { scene: Scene; models: Map<string, GLTF>; figure: GLTF }
export function loadScene(contentRoot: string, sceneFile: string, figureFile: string,
  deps?: { fetchJson?: (url: string) => Promise<unknown>; loadGltf?: (url: string) => Promise<GLTF> }): Promise<LoadedScene>;
// palette.ts
export function applyPalette(root: THREE.Object3D, palette: Scene["palette"]): void;
// Stage.ts
export interface StageOptions { fixedTimeSeconds?: number; marks?: Record<string, string>;
  actors?: { slot: string; name: string }[]; onHotspot?: (id: string) => void }
export class Stage {
  constructor(canvas: HTMLCanvasElement, loaded: LoadedScene, opts?: StageOptions); // throws WebGLUnavailableError
  start(): void; dispose(): void;
  walkTo(nodeId: string): boolean; figurePosition(): Vec3;
}
// demo.ts
export const DEMO: { contentRoot: "content/"; sceneFile: "scenes/waters-edge.scene.json";
  figureFile: "models/figure.glb"; marks: { "post-mark": "marks/heron.svg" };
  actors: [{ slot: "actor-maelle"; name: "Maëlle" }] };
```

Behaviour:
- `loadScene` maps a failed scene fetch to `scene_not_found`, a `SceneParseError` to `scene_invalid` (message includes the issues), and any failed model load to `model_missing`; `file` is the path that failed.
- `applyPalette` sets the colour of every material named `role:<role>` and throws an error naming the material if the role is not in the palette.
- `Stage` uses unlit materials only, sets the clear colour from `sky`, fog colour from `fog` with the scene's `near` and `far`, places the camera with `railPose`, puts the player's figure at `walk.start`, places one idle figure per entry in `actors` at that slot, and draws each mark as a flat plane at its slot, coloured `mark`. A click on a hotspot walks to its `walkNode` and calls `onHotspot` on arrival; a click elsewhere on the ground walks to `nearestNode`. Hotspots are also reachable by Tab and activated by Enter, through visually hidden buttons laid over the canvas, each labelled with the hotspot's `label`.
- With `fixedTimeSeconds` set, the stage renders that instant only, with animations at that time, and never advances.
- `App` reads `?shot=1` (meaning `fixedTimeSeconds: 0`), shows a panel with `role="alert"` for `SceneLoadError` ("Could not load <file>.") and for `WebGLUnavailableError` ("This game needs WebGL, which is not available in this browser."), sets `window.__stageReady = true` after the first frame, and, when `?shot=1` or in development, exposes `window.__stage`.

The scene file:

```json
{
  "schemaVersion": 1,
  "id": "waters-edge",
  "name": "The water's edge",
  "models": [{ "id": "set", "uri": "models/waters-edge.glb", "position": [0, 0, 0], "rotationYDeg": 0, "scale": 1 }],
  "camera": { "fovDeg": 28, "driftSeconds": 40, "rail": [
    { "position": [0, 2.2, 15], "lookAt": [0, 1.4, 0] },
    { "position": [1.5, 2.2, 15], "lookAt": [1.0, 1.4, 0] } ] },
  "walk": { "start": "w1",
    "nodes": [ { "id": "w1", "position": [-6, 0, 1] }, { "id": "w2", "position": [-2, 0, 1] },
               { "id": "w3", "position": [2, 0, 1] }, { "id": "w4", "position": [6, 0, 1] } ],
    "edges": [["w1", "w2"], ["w2", "w3"], ["w3", "w4"]] },
  "hotspots": [
    { "id": "post", "kind": "object", "label": "A post with a mark", "position": [-2, 1.1, 0], "radius": 0.8, "walkNode": "w2" },
    { "id": "maelle", "kind": "person", "label": "Maëlle", "position": [3, 0.9, 0.4], "radius": 0.9, "walkNode": "w3" } ],
  "slots": [
    { "id": "post-mark", "kind": "mark", "position": [-2, 1.6, 0.16], "rotationYDeg": 0, "size": 0.5 },
    { "id": "actor-maelle", "kind": "actor", "position": [3, 0, 0.4], "rotationYDeg": -90, "size": 1 } ],
  "palette": { "sky": "#f2c9a0", "fog": "#e9b98f", "ground": "#3b2f3a", "water": "#6f7f95",
    "structure": "#241c26", "figure": "#141018", "accent": "#d9502f", "shadow": "#1b1520", "mark": "#f4ead7" },
  "fog": { "near": 12, "far": 42 }
}
```

- [ ] **Step 1: Write the failing unit tests**

```ts
// apps/client/test/loadScene.test.ts
const good = JSON.parse(readFileSync("apps/client/public/content/scenes/waters-edge.scene.json", "utf8"));
const gltf = {} as GLTF;
it("the shipped scene file is valid", () => expect(parseScene(good).id).toBe("waters-edge"));
it("loads the scene, its models and the figure", async () => {
  const urls: string[] = [];
  const loaded = await loadScene("content/", "scenes/waters-edge.scene.json", "models/figure.glb",
    { fetchJson: async () => good, loadGltf: async (u) => { urls.push(u); return gltf; } });
  expect(urls.sort()).toEqual(["content/models/figure.glb", "content/models/waters-edge.glb"]);
  expect(loaded.models.get("set")).toBe(gltf);
});
it.each([
  ["scene_not_found", { fetchJson: async () => { throw new Error("404"); }, loadGltf: async () => gltf }, /waters-edge\.scene\.json/],
  ["scene_invalid", { fetchJson: async () => ({ ...good, walk: { ...good.walk, start: "zz" } }), loadGltf: async () => gltf }, /walk\.start/],
  ["model_missing", { fetchJson: async () => good, loadGltf: async (u: string) => { if (u.includes("waters-edge")) throw new Error("404"); return gltf; } }, /waters-edge\.glb/],
] as const)("reports %s", async (kind, deps, message) => {
  await expect(loadScene("content/", "scenes/waters-edge.scene.json", "models/figure.glb", deps))
    .rejects.toMatchObject({ kind, message: expect.stringMatching(message) });
});

// apps/client/test/palette.test.ts
it("colours materials by role", () => {
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ name: "role:structure" }));
  applyPalette(mesh, good.palette);
  expect("#" + (mesh.material as THREE.MeshBasicMaterial).color.getHexString()).toBe("#241c26");
});
it("names a material whose role is unknown", () => {
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ name: "role:lava" }));
  expect(() => applyPalette(mesh, good.palette)).toThrowError(/role:lava/);
});

// apps/client/test/App.test.tsx  (jsdom; Stage and loadScene are injected through props for testing)
it("shows which file could not be loaded", async () => {
  render(<App load={async () => { throw new SceneLoadError("model_missing", "content/models/waters-edge.glb"); }} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load content/models/waters-edge.glb.");
});
it("explains when WebGL is unavailable", async () => {
  render(<App load={async () => ({} as LoadedScene)} createStage={() => { throw new WebGLUnavailableError(); }} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("This game needs WebGL");
});
```

`App` therefore takes optional props `load` and `createStage`, defaulting to the real functions.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test`
Expected: FAIL, modules and scene file missing.

- [ ] **Step 3: Add the scene file and implement `errors.ts`, `loadScene.ts`, `palette.ts`, `Stage.ts`, `App.tsx`, `main.tsx`, `demo.ts`**

Use Three's `GLTFLoader` for the default `loadGltf`. Create the renderer inside a `try` and throw `WebGLUnavailableError` if no context is returned. Each actor and the player get their own clone of the figure with its own animation mixer.

- [ ] **Step 4: Run the unit checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 5: Write the browser tests**

`playwright.config.ts`: one Chromium project, viewport 1280×720, device scale factor 1, `webServer` running `vite preview` on a fixed port after `pnpm build`, `launchOptions.executablePath` from `process.env.PW_CHROMIUM_PATH` when set, and launch args `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` so WebGL runs without a GPU. Traces off.

```ts
// apps/client/e2e/stage.spec.ts
const ready = (page: Page) => page.waitForFunction(() => (window as any).__stageReady === true);

test("the scene draws something", async ({ page }) => {
  await page.goto("/?shot=1"); await ready(page);
  const png = PNG.sync.read(await page.locator("canvas").screenshot());
  const colours = new Set<string>();
  for (let i = 0; i < png.data.length; i += 4 * 97) colours.add(png.data.slice(i, i + 3).join(","));
  expect(colours.size).toBeGreaterThanOrEqual(4);
});
test("clicking a person walks the figure there", async ({ page }) => {
  await page.goto("/"); await ready(page);
  const before = await page.evaluate(() => (window as any).__stage.figurePosition());
  await page.getByRole("button", { name: "Maëlle" }).press("Enter");
  await expect.poll(() => page.evaluate(() => (window as any).__stage.figurePosition()[0]), { timeout: 15_000 })
    .toBeCloseTo(2, 1);
  expect(before[0]).toBeCloseTo(-6, 1);
});
test("a missing model file is reported, not hidden", async ({ page }) => {
  await page.route("**/waters-edge.glb", (r) => r.abort());
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Could not load content/models/waters-edge.glb.");
});
```

- [ ] **Step 6: Run the browser tests**

Run: `pnpm e2e`
Expected: 3 passed. If the first test sees a blank canvas, WebGL did not start: adjust the launch args, and record the working set in `docs/decisions.md`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scene loading and the stage"
```

---

### Task 7: The dialogue strip

**Files:**
- Create: `apps/client/src/ui/DialogueStrip.tsx`, `apps/client/src/ui/TextSizeControl.tsx`, `apps/client/src/ui/strip.css`, `apps/client/src/ui/fonts.ts`
- Modify: `apps/client/src/App.tsx`, `apps/client/src/demo.ts`
- Test: `apps/client/test/DialogueStrip.test.tsx`, `apps/client/test/TextSizeControl.test.tsx`, `apps/client/test/fontCoverage.test.ts`

**Interfaces:**
- Consumes: `App`, `DEMO`, `onHotspot` (Task 6).
- Produces:

```ts
export interface Token { text: string; word: boolean }
export interface DialogueStripProps {
  speaker: string; tokens: Token[]; suggestions: string[];
  onTapWord(index: number): void; onSay(text: string): void;
  onSimpler(): void; onTranslation(): void; onClip(): void;
}
export function DialogueStrip(props: DialogueStripProps): JSX.Element;
export const TEXT_SCALES = [1, 1.25, 1.5, 2] as const;
export function TextSizeControl(): JSX.Element; // sets --text-scale on <html>, remembers it in localStorage
```

`DEMO` gains `dialogue: { speaker: "Maëlle", tokens, suggestions }` where the tokens spell `« Le héron mange en premier. Nous, ensuite. »` with each word a `word: true` token and each space or punctuation mark a `word: false` token, and the suggestions are `Qui lui donne à manger ?` and `C'était toujours ainsi ?`. `App` shows the strip when `onHotspot("maelle")` fires and hides it on Escape. In `?shot=1` the strip is shown from the start.

Layout: the strip sits in the lower third over the scene, on a flat panel in the `structure` colour at 85% opacity with text in `mark`; the speaker's name is small capitals; the line is Noto Serif at `calc(1.6rem * var(--text-scale))`; controls are labelled `say it more simply`, `translation`, `clip`; the input's placeholder is `Say something…`. Use logical properties only (`inline`, `block`), no `left` or `right`. `fonts.ts` imports the `latin`, `latin-ext`, `cyrillic` and `cyrillic-ext` subsets of `@fontsource/noto-serif` at weight 400.

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/client/test/DialogueStrip.test.tsx
const tokens: Token[] = [{ text: "Le", word: true }, { text: " ", word: false },
  { text: "héron", word: true }, { text: ".", word: false }];
const setup = (over: Partial<DialogueStripProps> = {}) => {
  const props = { speaker: "Maëlle", tokens, suggestions: ["Qui lui donne à manger ?"], onTapWord: vi.fn(),
    onSay: vi.fn(), onSimpler: vi.fn(), onTranslation: vi.fn(), onClip: vi.fn(), ...over };
  render(<DialogueStrip {...props} />); return props;
};

it("makes each word a button and leaves punctuation alone", async () => {
  const p = setup();
  expect(screen.getAllByRole("button", { name: /^(Le|héron)$/ })).toHaveLength(2);
  await userEvent.click(screen.getByRole("button", { name: "héron" }));
  expect(p.onTapWord).toHaveBeenCalledWith(2);
});
it("does not split words itself", () => {
  setup({ tokens: [{ text: "үйлерімізде", word: true }] });
  expect(screen.getByRole("button", { name: "үйлерімізде" })).toBeInTheDocument();
});
it("sends typed text on Enter and clears the box", async () => {
  const p = setup(); const box = screen.getByPlaceholderText("Say something…");
  await userEvent.type(box, "Pourquoi ?{Enter}");
  expect(p.onSay).toHaveBeenCalledWith("Pourquoi ?");
  expect(box).toHaveValue("");
});
it("ignores Enter on an empty box and during composition", () => {
  const p = setup(); const box = screen.getByPlaceholderText("Say something…");
  fireEvent.keyDown(box, { key: "Enter" });
  fireEvent.change(box, { target: { value: "こん" } });
  fireEvent.keyDown(box, { key: "Enter", isComposing: true });
  expect(p.onSay).not.toHaveBeenCalled();
});
it("sends a suggestion when it is chosen", async () => {
  const p = setup();
  await userEvent.click(screen.getByRole("button", { name: "Qui lui donne à manger ?" }));
  expect(p.onSay).toHaveBeenCalledWith("Qui lui donne à manger ?");
});
it("offers the three aids by name", async () => {
  const p = setup();
  await userEvent.click(screen.getByRole("button", { name: "say it more simply" }));
  await userEvent.click(screen.getByRole("button", { name: "translation" }));
  await userEvent.click(screen.getByRole("button", { name: "clip" }));
  expect([p.onSimpler, p.onTranslation, p.onClip].every((f) => f.mock.calls.length === 1)).toBe(true);
});

// apps/client/test/TextSizeControl.test.tsx
it("steps the text scale up and down within its range and remembers it", async () => {
  render(<TextSizeControl />);
  const scale = () => document.documentElement.style.getPropertyValue("--text-scale");
  await userEvent.click(screen.getByRole("button", { name: "Larger text" }));
  expect(scale()).toBe("1.25");
  for (let i = 0; i < 5; i++) await userEvent.click(screen.getByRole("button", { name: "Larger text" }));
  expect(scale()).toBe("2");
  expect(localStorage.getItem("textScale")).toBe("2");
  for (let i = 0; i < 5; i++) await userEvent.click(screen.getByRole("button", { name: "Smaller text" }));
  expect(scale()).toBe("1");
});

// apps/client/test/fontCoverage.test.ts
const need = "AaZz éèêëàâîïôûùüçœæÉÀÇŒ«» АаЯяЁё ӘәҒғҚқҢңӨөҰұҮүҺһІі";
it("the dialogue font covers French, Russian and Kazakh", () => {
  const dir = "node_modules/@fontsource/noto-serif/files"; // resolve from apps/client
  const fonts = ["latin", "latin-ext", "cyrillic", "cyrillic-ext"]
    .map((s) => fontkit.openSync(`${dir}/noto-serif-${s}-400-normal.woff2`));
  const missing = [...need].filter((ch) => ch !== " " && !fonts.some((f) => f.hasGlyphForCodePoint(ch.codePointAt(0)!)));
  expect(missing).toEqual([]);
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test`
Expected: FAIL, components missing.

- [ ] **Step 3: Implement `DialogueStrip`, `TextSizeControl`, `strip.css`, `fonts.ts`, and wire them into `App` and `DEMO`.** If the font package's file names differ from the test's, correct the test's path, not the list of characters.

- [ ] **Step 4: Run all checks**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: dialogue strip and text size control"
```

---

### Task 8: The look screenshot, the boundary check and CI

**Files:**
- Create: `apps/client/e2e/look.spec.ts`, `apps/client/scripts/shots.ts`, `test/boundaries.test.ts`, `.github/workflows/ci.yml`
- Create (generated, committed): `apps/client/e2e/look.spec.ts-snapshots/*`, `docs/look/waters-edge@2x.png`, `docs/look/waters-edge-kazakh@2x.png`
- Modify: root `package.json` (script `shots`), `CLAUDE.md`

**Interfaces:**
- Consumes: the running client with `?shot=1` (Tasks 6 and 7).
- Produces: `pnpm shots`, which writes the two PNG files at device scale factor 2; a CI workflow that runs `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm e2e` on every push and pull request.

`?shot=1&line=kk` swaps the demo line for the Kazakh `Төрге шығыңыз, қонақ.` (tokens supplied in `demo.ts`, speaker `Айгүл`), so the second screenshot shows Kazakh text in the strip. This is fixture text for a font and layout check only; it is not pack content.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/client/e2e/look.spec.ts
const ready = (page: Page) => page.waitForFunction(() => (window as any).__stageReady === true);

test("the look has not changed", async ({ page }) => {
  await page.goto("/?shot=1"); await ready(page); await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot("waters-edge.png", { maxDiffPixelRatio: 0.01 });
});
test("Kazakh text sets without missing glyphs or overflow", async ({ page }) => {
  await page.goto("/?shot=1&line=kk"); await ready(page); await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("button", { name: "шығыңыз" })).toBeVisible();
  await expect(page).toHaveScreenshot("waters-edge-kazakh.png", { maxDiffPixelRatio: 0.01 });
});
for (const [name, url, size] of [
  ["small window", "/?shot=1", { width: 800, height: 600 }],
  ["largest text", "/?shot=1&textScale=2", { width: 1280, height: 720 }],
] as const) {
  test(`the strip stays in its place: ${name}`, async ({ page }) => {
    await page.setViewportSize(size); await page.goto(url); await ready(page);
    const box = (await page.getByTestId("dialogue-strip").boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(size.height * 0.5);
    expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

// test/boundaries.test.ts
it("the client does not depend on the AI gateway", () => {
  const pkg = JSON.parse(readFileSync("apps/client/package.json", "utf8"));
  expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })).not.toContain("@fieldwork/gateway");
});
it("no key-shaped secrets are committed", () => {
  const files = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);
  const hits = files.filter((f) => !f.endsWith(".png") && !f.endsWith(".glb") && /sk-ant-[A-Za-z0-9_-]{20,}/.test(readFileSync(f, "utf8")));
  expect(hits).toEqual([]);
});
```

`App` reads `?textScale=` and applies it, and gives the strip `data-testid="dialogue-strip"`.

- [ ] **Step 2: Run and confirm the right failures**

Run: `pnpm test && pnpm e2e`
Expected: the boundary tests PASS; the screenshot tests FAIL with "A snapshot doesn't exist"; fix any layout failure in the two "stays in its place" tests before going on.

- [ ] **Step 3: Look before accepting the baseline**

Run: `pnpm shots`, then open `docs/look/waters-edge@2x.png` and check it against the Look constraint line by line: flat unlit colour; hard edges; silhouettes that read at a glance; a limited palette; depth from fog; a flat shadow; no texture except the mark; the line large in the lower third. Fix what fails in the model generator, the scene file or the CSS, regenerate, and look again. Repeat until every item holds.

- [ ] **Step 4: Accept the baseline and run everything**

Run: `pnpm e2e --update-snapshots && pnpm lint && pnpm typecheck && pnpm test && pnpm e2e`
Expected: PASS on the second run without updating.

- [ ] **Step 5: Add CI and finish the guide**

`.github/workflows/ci.yml` uses Node 22 and pnpm, installs with a frozen lockfile, installs Playwright's Chromium (CI only), and runs the five scripts. Add to `CLAUDE.md`: how to run the client, how to take screenshots, that snapshot baselines are made on Linux with software rendering and must be regenerated there, and that the look may only be re-baselined after the check in Step 3.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: look screenshot, boundary checks and CI"
```

- [ ] **Step 7: Hand the look to the owner**

Send `docs/look/waters-edge@2x.png` and `docs/look/waters-edge-kazakh@2x.png` with one question: is this the look? Record the answer in `docs/decisions.md`. M0 is done when the owner says yes or names what to change.
