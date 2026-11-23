# Fieldwork (working title): builder's guide

A two-player game about interpreting a culture, plus a single-player mode about real cultures.

- Design: `docs/superpowers/specs/2026-11-23-fieldwork-game-design.md`
- Plans, one per milestone: `docs/superpowers/plans/`
- Decisions that change what a player experiences: append to `docs/decisions.md` with the date and the reason.

## Commands (run from the repository root)

| Command | What it does |
|---|---|
| `pnpm lint` | ESLint over the whole repository |
| `pnpm typecheck` | TypeScript check of every package |
| `pnpm test` | All unit tests (Vitest). Tests run from the root, so file paths in tests are root-relative |
| `pnpm schemas` | Regenerate `packages/contracts/schemas/*.json` from the parsers |
| `pnpm ai:try "<prompt>"` | Send one prompt through the AI gateway. `AI_PROVIDER=fake` (default, scripted echo) or `AI_PROVIDER=login` (Claude Code login; development only, uses the owner's plan) |
| `pnpm models` | Regenerate the committed `.glb` files in `apps/client/public/content/models/` |
| `pnpm dev` | Run the client with live reload (Vite) |
| `pnpm build` | Build the client into `apps/client/dist` |
| `pnpm e2e` | Build, serve and run the browser tests (Playwright). In the cloud container, set `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium` first |

More commands are added to this table by the task that creates them.

## Layout

| Path | Role |
|---|---|
| `packages/contracts` | Shared definitions: the scene format as a parser and as published JSON Schema |
| `packages/gateway` | The single door to AI: providers, models per job, usage log |
| `tools/make-models` | Scripts that generate the glTF files the game loads |
| `apps/client` | The web client: Three.js scene with ordinary web text laid over it |

## Tooling notes

- TypeScript is pinned to 6.0.x. typescript-eslint does not support TypeScript 7 yet; move up when it does.
- Add `?debug=1` to the client URL to expose `window.__stage` for tests; `?shot=1` freezes the scene at time zero for screenshots.
- Packages export their TypeScript source directly (`exports` points at `src/index.ts`); there is no build step between packages.

## Constraints that apply to every task

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
- Package scope is `@fieldwork/`. All paths are relative to the repository root, the directory that holds `docs/superpowers`.
- In the Claude Code cloud container, do not run `playwright install`. Set `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`; the Playwright config reads it.
