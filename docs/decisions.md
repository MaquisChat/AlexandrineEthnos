# Decisions

Choices that change what a player experiences, or that a later builder would otherwise have to rediscover. Newest last.

## 2026-11-23: Scene cross-reference rules live in the parser, not in the JSON Schema

The published `scene.schema.json` checks the shape of a scene. It cannot express rules that link one part of a scene to another (unique ids within a list; walk edges, `walk.start` and hotspot `walkNode` naming existing nodes; `fog.near` less than `fog.far`). Those rules are enforced by `parseScene` in `@fieldwork/contracts` and are listed in the schema's description. A client in another engine must implement them itself.

## 2026-11-23: The login provider switches the command line's tools off

`LoginProvider` runs `claude -p --output-format json --system-prompt <ours> --tools "" --strict-mcp-config`, from a neutral directory. Measured on this date: with only `--system-prompt`, one call carried about 39,800 tokens of built-in instructions; with tools and connectors off, about 2,800. The requested model is not passed, so the login serves its own model (`claude-fable-5-2` in the test) and the response reports which. `maxTokens` cannot be set through the command line and is ignored by this provider. The provider is for development only and draws on the owner's Claude plan.

## 2026-11-23: The scene sits in a fixed 16:9 frame, and text is sized from the frame

The scene is drawn in a 16:9 frame as large as the window allows, on a dark surround, like looking into a lit model-theatre box. Interface text is sized as a share of the frame's width (CSS `cqi` units, with a pixel floor) and multiplied by the player's text-size setting, so the picture is composed the same at every window size. At a 1280-pixel frame the spoken line is 25.6px.

Two side effects. Browser zoom and the browser's own default font size barely change the text, so the in-game A−/A+ control is the way to change text size. On a portrait phone the game is a narrow band across the screen with small text; nothing is cut off, but the game is designed for a desktop window.

## 2026-11-23: Two bundled typefaces

Speech is set in Noto Serif and controls and labels in Noto Sans, both shipped with the game in the Latin, Latin Extended, Cyrillic and Cyrillic Extended subsets. This covers English, French, Russian and Kazakh, and makes the game look the same on every machine, which the screenshot comparison depends on. Both are under the SIL Open Font License.

## 2026-11-23: The interface wears the scene's palette

The dialogue strip and controls take their colours from the scene's palette through CSS variables (`--c-structure`, `--c-mark`, `--c-accent`), so a culture's palette colours its interface as well as its village.

## 2026-11-23: Figures are jointed, rigid parts with their own flat shadow

A figure is rigid parts on the fixed joints in `FIGURE_NODES`, animated by turning the joints, with no skinning. Each figure file carries a flat round shadow under its feet. Fixed shadows of the set (the post) are part of the set file.

## 2026-11-23: First composition of "the water's edge"

After looking at renders: the walking path runs from x = -4.6 to 4.8 so the figure stays inside the frame; the camera looks slightly down (look-at height 0.95 m) so feet stand clear of the dialogue strip; the ground extends towards the viewer so the lower third is dark behind the text.

## 2026-11-23: The owner approved the look

Shown `docs/look/waters-edge@2x.png` and `docs/look/waters-edge-kazakh@2x.png` and asked "is this the look?", the owner answered: "yes that's the look". This is the reference for later scenes: flat unlit colour, fog-stepped ranks of cut-outs, jointed silhouette figures with one accent band, the mark as the only texture, and speech set large in a dark strip across the lower third.

## 2026-11-24: A scene that cannot be fully loaded is not shown at all

If the scene file, a model or a mark cannot be loaded, the player sees one message naming the file ("Could not load content/marks/heron.svg."), and nothing of the scene stays running behind it. For a scene file that is not valid the message also lists what is wrong. Marks are treated like models, not as optional decoration, because they carry the culture's symbols and a scene missing one would mislead. The full error is written to the browser console.

## 2026-11-24: Playwright is pinned to the cloud container's browser

`@playwright/test` is pinned to exactly 1.63.0, the release whose Chromium (build 1243) is installed in the Claude Code cloud container. The screenshot baselines are made with that browser, and CI installs the same build, so the comparison is between like and like. When the container's browser changes, move the pin and regenerate the baselines together.

## 2026-11-24: How a villager's reply is decided (M1a)

A villager's reply is shown only after two checks: one by rule against the culture file, one by a faster model. A reply that fails is discarded and one of that villager's fixed lines is shown. If the failure is telling something guarded (an earned entry, a hidden meaning), the withholding line is shown, even if the reply also invented something, because the culture does hold an answer. A redirect must name what to ask about and someone who knows it.

## 2026-11-24: Wording tuned against real replies (M1a)

Two rounds, each after a run through the Claude login.

1. The checker flagged villagers for mentioning the shaman and for naming one another. It is now told who lives in the village and that saying "that is for the shaman" is always allowed. Each villager gained a pronoun, because villagers were guessing one another's.
2. A villager settled an open question by reasoning from a saying. The answer rules now say a saying or custom tells you what it says and no more, and the checker counts a conclusion the sources do not state as unsupported. The checker is also given each cited entry's topic, after it rejected a correct reply for a detail that came from the topic. The judge used in the checks is told the same always-allowed things.

Two test questions were replaced because the culture file itself answered them (where salt comes from; who mends the cairns).
