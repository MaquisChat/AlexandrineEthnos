# M1a report: villagers first

Date: 2026-11-24. Design: `docs/superpowers/specs/2026-11-24-m1a-villagers-design.md`. Plan: `docs/superpowers/plans/2026-11-24-m1a-villagers.md`.

## What exists now

- **The culture format** (`packages/contracts`): myths, entries with who may say them, customs, villagers and what each knows, the heart, and what the culture leaves unsettled. Parser and published JSON Schema.
- **Two invented cultures** (`content/cultures`): the heron people, continuing the approved scene, and a sealed culture set in a different land. Each has three myths, about thirty entries, five customs and six villagers.
- **The villager library** (`packages/villagers`): one checked turn of conversation. It asks a model for a reply, checks it by rule against the culture file, checks it again with a faster model, and replaces a reply that fails with one of the villager's fixed lines.
- **The checks** (`tools/checks`): forty scripted conversations that probe four rules, judged by rule and by a separate judge.
- **The trial page** (`apps/trial`): published privately at https://claude.ai/artifact/GP9yXT7i4t9MY3u3gCucje.

## Checks on the final code

| Check | Result |
|---|---|
| `pnpm lint`, `pnpm typecheck` | clean |
| `pnpm test` | 233 passed |
| `pnpm e2e` | 19 passed for the game client, 15 for the trial page |
| Villager probes through the Claude login | see below |
| The published page's storage | the owner can read and write it; a lower access level sees nothing |

## What the villager probes showed

Forty scripted conversations, twenty per culture, answered by `claude-fable-5-2` through the Claude login. Full transcripts are in `docs/checks/2026-11-24-m1a.md`.

| Rule probed | Probes | Passed by rule | Passed by judge |
|---|---|---|---|
| Gap: asked about something the culture leaves open, invents nothing | 10 | 9 | 10 |
| Explain: asked what something means, does not say | 10 | 10 | 10 |
| Consistency: the same question twice, no contradiction | 10 | not judged by rule | 10 |
| Scope: asked what they do not know, sends the visitor on | 10 | 10 | 10 |

In 2 of 50 turns the villager's own reply was caught and replaced by a fixed line.

How far to trust these numbers:

- **They are indicative.** The model that answered is the one the login serves, not the one the trial page uses on the owner's account, and not the one the shipped game will use.
- **They are optimistic.** The wording was tuned twice against these same forty probes, and there is no held-back set. Before tuning, 35 of 40 passed the judge.
- **The one rule failure is a limit of the rule, not of the villager.** Asked whether a promise without salt binds, the villager quoted the people's saying and declined to go further. The rule check only sees that she spoke from the culture.
- **Nobody has yet read a sample to confirm the judge.** The owner's marks in the trial page are meant to be that check.

## Calls through the Claude login

330 of the 600 allowed: 28 for the first small run, 140 for the first full run, 22 for a rerun of six probes, 140 for the final run.

## What could not be checked here

The trial page reaches Claude only when it is opened on claude.ai. Its behaviour there has not been exercised: whether the two requests per reply work as the documentation describes, how long a reply takes, and how the answers read on the owner's own model. The page was tested here against a scripted stand-in for that runtime.

## What the owner is asked to do

1. Open the link and talk to someone in the heron people. Read "What is true here" first, then try to make a villager say something that is not there, or explain what the heron stands for.
2. Switch to the sealed culture and play blind. Work out what these people believe, then reveal it and see how close you were.
3. Use "That's wrong" on any reply that is. Those marks are saved, and the builder will read them back and compare them with what the checker said.

## Left for later

- A held-back set of probes, so the numbers are not measured on the questions the wording was tuned on.
- The rule check for gap probes cannot tell quoting a saying from settling a question.
- A villager whose reply is caught refuses with a fixed line that mentions the shaman, even when the question was an ordinary one. A second attempt at an answer would read better and costs one more call.
- The trial page saves to paths only the owner can use. A friend given the link could talk to the villagers but nothing of theirs would be saved.
- The page's first screen does not say how long a reply will take, because that is not yet known.
