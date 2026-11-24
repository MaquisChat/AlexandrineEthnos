# M0 report: ground and look test

Date: 2026-11-24. Plan: `docs/superpowers/plans/2026-11-23-m0-ground-and-look-test.md`.

## What exists now

- A workspace where every later milestone can be built and checked: lint, type checks, 93 unit tests, 19 browser tests, and a CI workflow.
- The scene format, as a parser and as published JSON Schema (`packages/contracts`).
- The AI gateway with a scripted provider and a development provider that uses the Claude Code login (`packages/gateway`). Tried live on 2026-11-23: it answered without an API key.
- A generator for the model files, and the two files it makes (`tools/make-models`).
- The client: one scene, "the water's edge", with a walking figure, a mark on a post, a person to walk to, and a dialogue strip (`apps/client`).
- The look, approved by the owner on 2026-11-23 from `docs/look/waters-edge@2x.png`.

## Checks on the final code

| Check | Result |
|---|---|
| `pnpm lint` | clean |
| `pnpm typecheck` | clean in all four packages |
| `pnpm test` | 93 passed |
| `pnpm e2e` | 19 passed, including the two screenshot comparisons |
| `AI_PROVIDER=login pnpm ai:try` | answered "ok" through the login (run once, on 2026-11-23) |

The CI workflow first ran on 2026-11-24, when the repository was pushed to GitHub, and passed, including the screenshot comparison on GitHub's machines: https://github.com/MaquisChat/AlexandrineEthnos/actions/runs/45302414126

## Independent review

A fresh reviewer read the whole branch and exercised the five risks the plan named. All five held when tried for real (missing or corrupt models, no WebGL, Kazakh/Russian/French glyphs, a missing or hanging `claude` command, clicking mid-walk). It found nothing critical and three important items. All three were acted on, along with two smaller ones a player would notice:

| Finding | What was done |
|---|---|
| Failures in content other than models gave a vague message, named no file, logged nothing, and left the scene running behind the message | A missing mark is now reported by name; an invalid scene file lists what is wrong; every failure is logged to the console; a failed scene is stopped and its buttons removed |
| The named risks and the main interaction were only checked by hand | Browser tests added: WebGL unavailable, a corrupt model, a missing mark, reaching a person by keyboard and by click opens their line and Escape closes it, the mark is drawn. Each was confirmed to fail when the behaviour is broken on purpose |
| CI would compare screenshots made by a different browser build | Playwright pinned to the release matching the browser the baselines were made with. A first real CI run is still needed |
| The scene blinked blank for a frame whenever the window was resized | It redraws at once after a resize |
| An error message ignored the player's chosen text size | The text size is applied at startup, and the size control is shown on the error screen |

## Decisions made while building

Each is small and reversible. The cost if it turns out wrong is in brackets.

1. No separate working copy; work was done on a branch in place. (None.)
2. `window.__stage`, a handle for tests, is exposed only with `?shot=1`, `?debug=1` or in development. (None.)
3. TypeScript pinned to 6.0.x because the lint tooling refuses 7. (None; move up later.)
4. The login provider adds `--tools "" --strict-mcp-config` and runs from the temp directory, cutting overhead from about 39,800 to about 2,800 tokens per call. (A renamed flag would break login runs; `ai:try` would show it.)
5. Each figure carries its own flat round shadow; the set carries the post's long shadow. (One mesh to move.)
6. The scene's composition was changed after seeing renders: walking path from x = -4.6 to 4.8, ground extended towards the viewer, hut moved, camera tilted down slightly. (A few numbers.)
7. `Stage` gained `ready` and `activateHotspot` beyond the planned interface. (None; additive.)
8. The scene sits in a fixed 16:9 frame on a dark surround. (One CSS rule. On a portrait phone the game is a narrow band.)
9. Text is sized from the frame's width, not from the browser's font size. (One CSS value. Browser zoom barely changes the text; the in-game control does.)
10. The speaker's name is in spaced capitals, not small capitals. (One CSS rule.)
11. The interface takes its colours from the scene's palette. (None; it falls back to fixed colours.)
12. Controls and labels use a bundled Noto Sans, not the system font. (About 100 KB.)
13. The planned font test could not fail, so it was replaced by one that can. (None.)
14. A mark that cannot be loaded stops the scene with a named error, like a model. (If marks should be optional, one branch to change.)
15. Playwright pinned to exactly 1.63.0 to match the container's browser. (Moving the pin means regenerating the baselines.)
16. The repository was left on its work branch, with `main` holding only the design and plan, for the owner to merge. (None.)

Things the reviewer set aside, and the ruling on each:

17. Portrait phones and very small windows: left as they are. The game is for a desktop window. (A poor experience if a playtester opens it on a phone.)
18. The strip stays open if the player walks away, and a half-typed line is lost on Escape: left. Conversation state belongs to the service from M1.
19. The strip can only be closed with Escape: left for M0; M1 needs a visible way to leave a conversation. (A mouse-only user cannot close it in this demo.)
20. If WebGL is lost mid-session the scene goes blank with no message: left; to be handled with the village in M4. (Rare.)
21. No language tag or screen-reader announcement on the spoken line: left for M2, when languages arrive.
22. Click-to-walk assumes flat ground: left; it matches the plan and the scenes are flat.
23. The login provider is untested on Windows: left; it is a development tool.
24. Nothing stops `AI_PROVIDER=login` in production: left, since there is no service yet. The M1 service must refuse it.
25. The client bundle is about 910 KB: left; no budget was set.
26. The Kazakh demo line is unreviewed by a speaker: left, and marked as such in `demo.ts`.
27. Graphics memory is not freed when a scene is closed: left until scenes switch in M4.
28. Interface contrast under other palettes: left until there is a second palette.
29. About 2,800 tokens still ride along on each login call: left; more flags can be tried in M1.
30. Visual taste: not reviewed, because the owner approved the look.

## Left for later

Smaller findings from the review, not acted on. They are a ready list for the M1 plan.

1. A timed-out `claude` call kills only the direct process; a wrapper script's child can linger for about 30 seconds.
2. The login provider passes the system prompt as a command-line argument, which fails above roughly 128 KB. Use `--system-prompt-file` once the canon goes into prompts.
3. Any mouse button walks the figure, including a right-click.
4. Keyboard focus drops to the page when Escape closes the strip.
5. A refused `walkTo` still cancels a pending "walk to this person".
6. Safari may send a line on the Enter that confirms an input-method composition; add the usual `keyCode === 229` guard. The Escape handler has no composition check either. Not reproducible here.
7. The mark's SVG has no width or height, which Firefox may fail to draw to a canvas. Not reproducible here.
8. The screenshot comparison allows 1% of pixels to differ, which is more than the whole mark. A separate test now checks the mark is drawn; tighten the tolerance when convenient.
9. Nothing fails if a generator is edited and the generated files are not regenerated. Add a CI step that regenerates and checks for differences.
10. The model path rule accepts a full web address or an encoded `..`. Harmless today.
11. `overflow-y` in `strip.css` is a physical property; the constraint asks for logical ones.
12. `AI_PROVIDER=""` gives an error instead of the default.
13. The boundary test would miss a relative-path import of the gateway.
14. There is no loading state before the scene appears.
15. Add `eslint-plugin-react-hooks`.

## What the owner needs to do

- Done on 2026-11-24: the repository is on GitHub and the first CI run passed.
- Nothing else is needed before M1 is planned. The API key, playtest server and reviewers are needed at the points listed in section 16 of the design.
