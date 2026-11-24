# M1a, villagers first: design

Date: 2026-11-24
Status: approved by the owner on 2026-11-24 ("the spec looks good go ahead and build")
Parent: `docs/superpowers/specs/2026-11-23-fieldwork-game-design.md` (called "the game design" below). This document scopes the first piece of its milestone M1.
Audience: the owner, and Claude Code as the builder

## 1. Summary

The owner opens a private link and talks, in English, to the villagers of two small invented cultures. The villagers are AI. They must stay faithful to what is true in their culture, speak from inside it without explaining its symbols, and refuse to invent what the culture does not settle. A switch shows, for every reply, what it was based on.

The villager logic is written once, as a library. The trial page uses it; the checks run by the builder use it; the game's online service will use it later.

## 2. Why, and who decided what

The game design names its riskiest question: are AI villagers convincing, and do they stay faithful to the culture? This piece answers it first, and lets the owner feel the answer directly, with no API key and nothing to install.

**Decided by the owner**

- M1 is built as several pieces, and villagers come first.
- The owner tries it through a link.

Everything else here is the author's proposal. The larger ones are listed in section 12.

## 3. Goals, non-goals, anti-goals

**Goals**

1. The owner can open a link, pick a villager, and hold a conversation in English.
2. Villagers follow the rules in section 6.
3. Every reply carries a record of what it was based on, and the owner can see it.
4. A question the culture does not settle is refused in character and listed as a question for the shaman.
5. The owner can mark a reply as wrong, with a note, and the builder can read those marks later.
6. The same villager logic runs in the trial page and in the builder's checks.
7. Scripted checks probe the rules and report numbers, labelled as indicative.

**Non-goals (later pieces of M1, or later milestones)**

- Field days, encounter limits, the notebook, evidence cards, the symbol board.
- Answers to the listed questions, by a shaman or by the spirits.
- The Telling: cultures here are written by the builder.
- Accounts, the online service, a database, a second player.
- Other languages, language levels and learning aids.
- Rapport. Knowledge marked "earned" is simply withheld in this piece.
- The 3D scene. The trial is a plain page.
- The provider that uses an API key.

**Anti-goals**

- A villager states something about the culture that the culture's record does not contain.
- A villager explains what a symbol means.
- The trial page and the checks run different villager logic.
- The trial page is mistaken for the game, or grows into it. It is a bench.

## 4. What the owner sees

Two cultures, each with six villagers.

- **The open culture.** Its myths and everything true in it can be read on the page. The owner reads them, then tries to catch the villagers out. This tests faithfulness.
- **The sealed culture.** Nothing is shown. The owner plays blind, as the anthropologist will, and can end the blind play at any time to reveal what was true. This tests the experience.

```
┌ Fieldwork: villager trial ───────────────────────────────────────┐
│ Culture:  (•) The heron people (open)   ( ) The sealed culture   │
│ Talk to:  Maëlle, net-mender · Old Tam · Ysolt · the child · …   │
│ Speed:    quick · balanced · careful        [ ] Behind the curtain│
├──────────────────────────────────────────────────────────────────┤
│ You      What happens when a heron dies?                         │
│ Maëlle   That is for the shaman to say.                          │
│          ▸ refused to invent: nothing in the culture covers this │
│          [that's wrong]                                          │
│ You      Why does the heron eat first?                           │
│ Maëlle   It's the heron. You feed it first. My mother did, and   │
│          hers.                                                   │
│          ▸ from the culture: entries 7, 12 · checked, nothing    │
│            invented, nothing explained                           │
│ > _                                                              │
├──────────────────────────────────────────────────────────────────┤
│ Questions for the shaman (1)   What is true here   Start over    │
└──────────────────────────────────────────────────────────────────┘
```

- **Behind the curtain** shows each reply's basis: small talk, from the culture (which entries), withheld, sent to someone else, or refused. It also shows when a reply was caught and replaced, with the reply that was caught. For the sealed culture it shows the kind of basis but not the entries' text, until the owner reveals the culture.
- **That's wrong** saves the exchange, its record and a note from the owner.
- **Questions for the shaman** lists every refusal as the villager would put it to the shaman. Nothing answers them yet.
- **Speed** chooses which class of model answers (section 8), so the owner can compare.
- **Start over** clears a conversation. Conversations otherwise persist between visits.

While a villager is answering, the page says so. Replies are shown only after they have been checked, so nothing invented appears and is then withdrawn.

## 5. The culture format

A culture is one JSON file, checked by a parser in `@fieldwork/contracts` and published as JSON Schema, in the same way as scenes. It follows section 9.1 of the game design.

| Part | Contents |
|---|---|
| Identity | id, name, the language it is written in, a short description of the land |
| Myths | id, title, text |
| Entries | id; kind (symbol meaning, value, opposition, prohibition, obligation, custom, saying, person, place, fact of the world); a plain-sentence statement; origin (a myth passage, or the author's own gloss); who may say it (anyone, earned, shown never said); optional note on variation |
| Customs | id, name, what an outsider sees, the entries that are its reason |
| Villagers | id, name, role, age, temperament, the entries they know, the myths they know (each in whole or in part), their slant written out as the author's text, three fixed lines (section 6.4) |
| Heart | the three to five entries the author most hopes will be understood |
| Silences | a list of things the culture deliberately does not settle, for the checks; never shown to villagers |

Each of the two cultures has three myths (an origin, a rupture, a debt) of 150 to 300 words, 25 to 35 entries of which at least six are "shown, never said" and at least four are "earned", four or five customs, and six villagers including a child and one who doubts or tells it differently. The open culture is the heron people at the water's edge, continuing the scene and the line the owner has already approved. The sealed culture is set in a different land with different symbols. Both are written by the builder.

## 6. How a villager answers

### 6.1 Rules

From section 9.2 of the game design, as they apply here:

1. **Never invent culture.** Belief, custom, meaning, kinship rules and history come only from what the villager knows: their entries, their myths and their written slant.
2. **Never explain the symbolism.** A villager speaks from inside: stories, sayings, what one does, how they feel. Entries marked "shown, never said" shape how a villager behaves and are never stated.
3. **Small talk is free.** A villager may improvise about their own life, work and opinions. What they improvise is remembered for that villager and must not carry new facts about the culture.
4. **Know only your share.** A villager draws only on the entries and myths listed for them.
5. **Guard what is earned.** In this piece, an "earned" entry is withheld from the visitor.

**Telling the myths.** A villager may tell a myth they know, and this is meant: hearing the stories is fieldwork. They tell it in their own words, at the length of a spoken answer (about 120 words at most), and only the part they know. They add no event, person or rule that the myth's text does not contain. The author's exact text stays hidden until the culture is revealed. What a story means is never explained.

**Slant.** A villager's slant is written by the culture's author in that villager's entry: how they feel about a story, what they doubt, what they tell differently. It is a source for that villager alone. Saying what their slant says is faithful, not a contradiction. Going beyond it is invention.

### 6.2 One turn

1. **Answer.** The model is given the culture, the villager, what the villager has improvised before, the conversation so far and the visitor's new line. It writes the reply in the villager's own voice, whatever the basis, and returns it with a record. A refusal, a withholding and a redirect are written by the model too, so they sound like the person and differ from one time to the next.
2. **Check by rule,** with no model: every cited entry and myth exists and is known to this villager; every cited entry may be said to anyone; a reply "from the culture" cites at least one entry or myth; a villager named in a redirect exists and knows something on the matter.
3. **Check by model.** A second, faster call reads the reply against its sources (the cited entries, the cited myths' text, the villager's slant and their remembered personal facts) and against the list of hidden meanings. It answers two questions: does the reply state anything about the culture that those sources do not support, and does it state a hidden meaning or explain a symbol? Every model-written reply is checked, refusals included, because a refusal can carry an invention too.
4. **Decide.** If both checks pass, the reply is shown. If either fails, the reply is discarded and one of the villager's fixed lines is shown instead (section 6.4). The discarded reply and the reasons are kept in the record. There is no second attempt.

### 6.3 The record

Every turn produces:

| Field | Meaning |
|---|---|
| basis | `small_talk`, `canon`, `withheld`, `redirect` or `deferral` |
| entries, myths | what the reply drew on |
| question | for a deferral, the question as the villager would put it to the shaman |
| redirect | for a redirect, the villager to ask |
| personal facts | anything newly improvised about the villager's own life |
| caught | if the reply was replaced: the discarded reply and why |
| model | which class of model answered |

What each basis means:

| Basis | When |
|---|---|
| `small_talk` | The line is about the villager's own life or about nothing cultural. "I wouldn't know" to a question about the outside world is small talk |
| `canon` | The villager answers from entries or myths they know and may say |
| `withheld` | The villager knows, but it is earned, or it is a hidden meaning they will not put into words |
| `redirect` | The culture settles it, this villager does not know it, and they name someone who does |
| `deferral` | The culture does not settle it, or can be read two ways. This is the only basis that puts a question on the shaman's list |

### 6.4 Fixed lines

Each villager has three lines written in the culture file, shown without calling a model, and only when a reply has been caught. They are what makes a replaced reply safe.

| A reply is caught for | Shown instead | Basis becomes | On the shaman's list |
|---|---|---|---|
| Stating something about the culture its sources do not support, or redirecting to someone who does not exist or does not know | The refusal ("That is for the shaman to say.") | `deferral` | Yes, with the visitor's own line as the question, marked as raised by a catch |
| Citing or stating an earned entry, or stating a hidden meaning or explaining a symbol | The withholding ("That is not for a stranger.") | `withheld` | No |

The third fixed line, a redirect ("Ask {name}."), is used when the model's redirect names the right person but its wording is caught.

## 7. The library

A new package, `@fieldwork/villagers`. It holds the turn in 6.2 and nothing about how a model is reached.

- It depends only on `@fieldwork/contracts`. It must not depend on `@fieldwork/gateway`, so that a web page can bundle it.
- It takes one function from its caller: "ask a model", given standing instructions, the turns of a conversation, a class of model, and whether JSON is wanted. Everything else is ordinary code.
- It is deterministic apart from that function, so it is tested with scripted answers.
- `apps/client` must not depend on it. In the finished game these rules run in the service (requirement 1 of the game design); the boundary test is extended to say so.

Two callers supply the "ask" function:

| Caller | Reaches a model through |
|---|---|
| The trial page | the page's own Claude access on claude.ai, on the viewer's account |
| The checks | the AI gateway from M0, with the fake provider in tests and the login provider for real runs |

## 8. The trial page

A new app, `apps/trial`: a small React page that bundles the library and both cultures into one HTML file, which the builder publishes as a private page on claude.ai and hands to the owner as a link.

- **Reaching Claude.** The page uses the claude.ai page runtime's `sample` capability. Each call is independent: the page sends the standing instructions, the culture and the conversation every time. There is no system prompt, so instructions go in a leading turn. The culture and a long conversation fit well inside the 256 KiB limit.
- **Speed.** The answer call uses the class of model the owner picks: quick, balanced (the default) or careful. The check call always uses quick. The documentation says balanced and careful think before writing, so a reply may take from a few seconds to a minute; this is unmeasured until the owner first opens the page.
- **Cost.** Calls spend the viewer's own Claude usage, and the first call asks the viewer's consent. A turn is two calls.
- **Saving.** Conversations, records, improvised facts, questions for the shaman and "that's wrong" marks are saved with the page's `db` capability, so they persist between visits and the builder can read them when the owner asks. The page says plainly that what is typed is saved and who can read it.
- **When Claude cannot be reached.** If the capability is absent, declined, rate-limited or fails, the page says which in plain words, keeps what was typed, and offers a manual "try again". It never retries by itself.
- **Look.** A plain, legible page in the game's two typefaces and the approved palette. It has light and dark themes as claude.ai pages require.
- **Privacy.** The page is private to the owner's account. The sealed culture's record is inside the page's source; the owner is trusted not to read it there.

The page reaches Claude only when opened on claude.ai, so the builder cannot exercise real replies before handing over the link. The builder tests the page here with a scripted stand-in for the runtime, then the owner's first conversation is the first real run.

## 9. Checks

Four of the checks in section 9.6 of the game design apply to this piece.

| Probe | Passing means |
|---|---|
| Gap | Asked about one of the culture's silences, the villager refuses or redirects and states nothing new |
| Explain | Asked what something means, the villager does not state a hidden meaning |
| Consistency | The same question to different villagers, and to one villager twice, never contradicts the culture. A villager speaking their own written slant is not a contradiction |
| Scope | Asked about something the culture settles but they do not know, a villager redirects to someone who does and states nothing of it themselves |

- Probes are scripted conversations written by the builder, run against both cultures through the library and the gateway.
- Each result is judged twice: by rule from the record, and by a separate judge call with a written rubric that sees the whole culture. The judge is a different prompt from the checker in 6.2.
- Real runs use the login provider, which draws on the owner's Claude plan. The builder also needs real replies while writing the prompts: prompts written only against scripted answers will need at least one revision once a real model answers. Order of work: write the prompts against scripted answers; tune them on the login provider with a handful of conversations; then make one check run of ten probes per check (about 80 turns and 240 calls); only then hand over the link. The ceiling on login calls for all of this is 600 (section 12). The builder stops and reports when it is reached, and reports the numbers as indicative.
- The owner's "that's wrong" marks are the human check on the judge. The builder compares them with what the checker and judge said about the same replies.

Numbers from this piece are indicative three times over: the trial uses the viewer's account model, the checks use the login's model, and the shipped game will use the API default.

## 10. Constraints

- English only.
- The default model for every AI job remains `claude-opus-5-5` wherever the caller can choose one. The trial page cannot choose a model by name unless the owner asks; it chooses a class.
- No key and no server are used.
- No real culture is used; both are invented.
- Nothing the villagers say is shown as HTML: model output is always set as text.
- The repository is public, so both culture files, including the sealed one, are publicly readable.

## 11. Done when

- The library's tests pass with scripted answers, covering every row of the record and every way a reply can be caught.
- The page's browser tests pass against a scripted stand-in for the claude.ai runtime: a conversation, a refusal listed for the shaman, a caught reply replaced, a "that's wrong" mark saved, the sealed culture hiding entry text until revealed, each way Claude can be unreachable.
- The prompts have been tuned on the login provider and the first small check run has been made and reported, within the owner's ceiling, before the link is handed over.
- The page is published privately and the link is in the owner's hands.
- The owner has held at least one conversation in each culture and said what they found. Their marks have been read back and compared with the checker's verdicts.

## 12. Proposals by the author, for the owner to check

1. Two cultures, one open and one sealed, both written by the builder (4, 5).
2. The open culture continues the heron people from the approved scene (5).
3. A reply is shown only after it is checked; a caught reply is replaced by a fixed refusal, with no second attempt (6.2).
4. "Earned" knowledge is simply withheld in this piece (6.1).
5. The owner can choose the speed, and so the class of model, to compare them (8).
6. What the owner types is saved so the builder can read it back on request (8).
7. The first real check run is small, and comes before the link is handed over (9).
8. Villagers write their own refusals, withholdings and redirects, so these vary and sound like the person; the fixed lines appear only when a reply is caught (6.2, 6.4).
9. Villagers may tell the myths they know, in their own words and at spoken length; the author's exact text stays hidden until the culture is revealed. A villager's slant is written by the author and is a source for that villager alone (6.1).
10. The rest of M1 follows in this order, each piece tried by link on the same library until the last: questions to the shaman and the spirits; field days and the notebook; the ethnography, the Reading and the Return; the Telling; then the online service, accounts, a second player, the key provider, the full checks and the playtest setup. Only "villagers first" is decided; the order after it is a proposal to confirm piece by piece.

**Not answered by the owner**

- The ceiling on calls made through the login while tuning prompts and running the first checks. They count against the owner's own Claude usage. The owner approved the design without naming a figure, so the builder works to the author's recommendation of 600 calls for this piece, reports the count, and lowers it if the owner says so.

## 13. Left to the builder

Prompt wording; exact schemas; the wording of the two cultures; how the page is bundled into one file; the layout within the sketch; where and under what rules the page saves its data; the probe scripts and the judge's rubric; how the "ask" function is typed. Decisions that change what the owner experiences go in `docs/decisions.md`.

## 14. Approaches considered

| Approach | Trade-off | Outcome |
|---|---|---|
| One shared villager library, with a trial page on top | The logic is written once and is what both the owner and the checks exercise. For the trial, rules run in the browser, which the finished game must not do | **Chosen** (the owner left the how to the author) |
| Build the online service first and point a page at it | The final architecture from the start, but it needs an API key and a server now | Rejected for this piece |
| A throwaway page with the logic inside it | Fastest, but rewritten for the game, and the checks could not test what the owner played | Rejected |

How the owner tries it:

| Way | Trade-off | Outcome |
|---|---|---|
| A private link on claude.ai | No key, nothing to install; a bench, not the game; may not work for a friend outside the owner's organization | **Chosen by the owner** |
| The owner's own computer | Closest to the real game; needs Node and Claude Code installed | Not chosen |
| Transcripts only | No effort for the owner, but they would not feel it | Not chosen |
