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
| `pnpm test` | 255 passed |
| `pnpm e2e` | 19 passed for the game client, 20 for the trial page |
| Villager probes through the Claude login | see below |
| The published page's storage | the owner can read and write it; a lower access level sees nothing |

## What the villager probes showed

Forty scripted conversations, twenty per culture, answered by `claude-fable-5-2` through the Claude login. Transcripts are in `docs/checks/`.

| Run | Wording | Passed the judge | Replies caught and replaced |
|---|---|---|---|
| First full run | as first written, after one small fix | 35 of 40 | 3 of 50 turns |
| Second full run | after two rounds of tuning | 40 of 40 | 2 of 50 |
| Third full run | after the independent review's fixes | 39 of 40 | 5 of 50, all five over-strict |
| Rerun of the 7 affected probes | after a third round of tuning | 7 of 7 | 0 of 10 |

The third full run is the last one made on all forty probes. It showed that the stricter checker the review asked for was discarding good answers over harmless phrasing ("so it has always been done"), which left a villager refusing an ordinary question. The third round of tuning tells the checker that such colour is allowed. Only the seven affected probes were rerun after it, to stay inside the call ceiling.

How far to trust these numbers:

- **They are indicative.** The model that answered is the one the login serves. It is not the one the trial page uses on the owner's account, and not the one the shipped game will use.
- **The page's own checker has never run.** In the probes, the answer and the check were both made by the login's model. On the page the check is made by the quick class of model, which is the only guard on a reply's text, and that has not been exercised anywhere.
- **They are optimistic.** The wording was tuned three times against these same forty probes, and there is no held-back set.
- **The probes are polite.** None asks for a story, makes a guess about a meaning for the villager to confirm, or tries to break the frame. The wording now guards against all three, and tests pin the structure, but no real reply to such a question has been seen.
- **One rule failure is a limit of the rule, not of the villager.** Asked whether a promise without salt binds, the villager quoted the people's saying and declined to go further. The rule check only sees that she spoke from the culture.
- **The builder read about thirty exchanges in full** across the runs. No person has yet read a sample to confirm the judge; the owner's marks in the trial page are meant to be that check.
- **A caught reply can read oddly.** In one probe a child said a saying, was asked to repeat it, had the repeat caught, and answered "I don't know! Ask the shaman."

## Calls through the Claude login

497 of the 600 allowed: 28 for the first small run, three full runs of 140, and reruns of 22 and 27.

## The independent review

A fresh reviewer read the whole branch. It found two critical gaps and seven important ones; all nine were acted on.

| Finding | What was done |
|---|---|
| The checker's verdict could be misread as clean when findings were written as objects, or a list was missing | Anything that is not text is kept as a finding; a verdict without all three lists is unreadable |
| The question for the shaman and newly improvised personal facts were shown and remembered without being checked | Both are now part of what the checker reads; a new fact is no longer offered as its own source; a rule catches any guarded statement said word for word |
| Saved conversations could be overwritten if loading was slow or failed | Nothing can be sent until loading ends; if saved data cannot be read, the visit keeps to memory and says so |
| A damaged saved record could blank the page | Every field of a saved record is checked; a fallback screen replaces a blank page |
| Myths contained material their own entries marked earned or never said | Both cultures were repaired: glosses removed from two myths, three entries re-marked or reworded, and villagers who know a story now know the sayable entries that come from it. Tests keep this true |
| A visitor's guess could be confirmed, and the checker saw no earlier exchanges | A rule against confirming or denying a guess; the checker now sees the last two exchanges, with the visitor's line and the reply marked as data |
| "That's wrong" marks were tied to a position in the list | A mark belongs to the reply it was made on and comes back after a reload |
| Starting over during a pending reply was undone | Clearing is blocked while a reply is on its way; writes to one document are made in order |
| The report overstated what the probes covered | This section and the one above |

## Decisions made while building

1. Work was done on a branch in the GitHub clone, with no separate working copy. (None.)
2. The builder proceeded without a plan review, on the owner's "go ahead and build". (The owner might have wanted per-task review.)
3. The ceiling on login calls was set at the design's recommended 600, the owner having named no figure. (More of the owner's Claude usage than they wanted.)
4. Telling what is guarded outranks inventing, when a reply does both: the withholding line is shown. (One branch.)
5. A redirect must name what to ask about and someone who knows it. (More refusals than strictly needed.)
6. `gatewayAsk` takes the provider's name so that only login calls are counted. (None.)
7. A dry run writes no report. (None.)
8. `connectStore` takes the cultures, and stores say whether anything is saved. (None.)
9. The build writes a second file, a fragment without document tags, for publishing. (One script.)
10. React is bundled into the page. (About 200 KB.)
11. For a sealed culture the curtain hides a caught reply's text as well as entry text. (One condition.)
12. Villagers gained a pronoun field after they were seen guessing one another's. (One field.)
13. Two probes and one silence were replaced because the culture file itself answered them. (None.)
14. The numbers are reported as optimistic. (None.)
15. The branch is left unmerged for the owner. (None.)

Things the reviewer set aside, and the ruling on each:

16. Slants that voice the gist of a heart entry: left. A slant is the author's text and is meant to be sayable; worth a second look when the owner has played.
17. The fixed refusal names the shaman after any catch: left, as the design says. A second attempt at an answer would read better and is listed below.
18. The kind of fixed line signals whether the culture holds an answer: left, as the design says.
19. The sealed culture can be read in the page's source and the public repository: left, accepted in the design.
20. The login provider flattens a conversation into labelled blocks: left; M0 code.
21. "Balanced" maps to the everyday model thinking only a little: left, as planned; to be judged from the owner's experience of speed.
22. Topic labels reveal that a hidden opposition exists: left; it is what a topic is for.
23. No probes for earned knowledge: left; the design names four checks.
24. No text-size control on the trial page: left; it is a bench.
25. The live page's capabilities were not re-inspected by the reviewer: checked by the builder at publish time.
26. The page's address is in `CLAUDE.md`: left; the page is private.

## What could not be checked here

The trial page reaches Claude only when it is opened on claude.ai. Its behaviour there has not been exercised: whether the two requests per reply work as the documentation describes, how long a reply takes, how the quick-class checker behaves, and how the answers read on the owner's own model. The page was tested here against a scripted stand-in for that runtime.

## What the owner is asked to do

1. Open the link and talk to someone in the heron people. Read "What is true here" first, then try to make a villager say something that is not there, or explain what the heron stands for.
2. Switch to the sealed culture and play blind. Work out what these people believe, then reveal it and see how close you were.
3. Use "That's wrong" on any reply that is. Those marks are saved, and the builder will read them back and compare them with what the checker said.

## Left for later

From the build:

1. A held-back set of probes that includes story requests, guesses and attempts to break the frame.
2. The rule check for gap probes cannot tell quoting a saying from settling a question.
3. A second attempt at an answer when a reply is caught, so a villager does not refuse an ordinary question.
4. Saving per viewer, so a friend given the link can keep their own conversations.

Smaller findings from the review, not acted on:

5. A redirect is caught if any cited entry is unknown to the person named; the plan said only if none is known.
6. The name in a redirect's wording is not compared with the villager the record names.
7. An answer that claims to speak from the culture but lists no entries becomes a question for the shaman, not "did not answer".
8. A question about the outside world may be sent to the shaman; the design says "I wouldn't know" is small talk.
9. Nothing stops a villager repeating a myth's sentences word for word; the design says the author's exact text stays hidden.
10. After consent is declined, "Try again" cannot succeed without reloading the page; the message should say so.
11. Two rarer failures (a request too large, an empty answer) get the generic message, and the text box has no length limit.
12. The curtain shows the speed that was asked for, which may not be the class of model that answered.
13. There is no way to stop a long wait on the careful setting.
14. The browser tests load the ordinary build; the published fragment is only inspected, not run.
15. The page declares the `user` capability and does not use it.
16. The "could not be saved" notice never clears.
17. CI uploads test results for the game client only.
18. The text box does not guard against Enter during input-method composition.
