# M1b, questions to the shaman and the spirits: design

Date: 2026-11-24
Status: built on the owner's "looks good, keep building"; the calls below are the author's and have not been read by the owner
Parent: `docs/superpowers/specs/2026-11-23-fieldwork-game-design.md`, sections 5.3 and 5.4. Builds on M1a (`2026-11-24-m1a-villagers-design.md`).

## 1. Summary

When a villager refuses to invent an answer, the question can now be answered. In the trial page the owner either sends it to the spirits, an AI that answers in keeping with the culture, or, in the open culture, answers it as the shaman. The answer becomes part of that culture for good, and the villager brings it back and says who answered.

## 2. Goals, non-goals, anti-goals

**Goals**

1. A refusal can be sent to the spirits with one press.
2. A spirit answer never contradicts the culture. It is checked before it is kept.
3. If the culture already settles the question, the spirits say so and add nothing.
4. In the open culture the owner can answer as the shaman instead.
5. An answer joins the culture's record, marked with who gave it, and the villager who asked now knows it.
6. The villager brings the answer back in their own words and says whether the shaman or the spirits spoke.
7. In the sealed culture, the text of an answer stays hidden until the culture is revealed; the owner hears it only from the villager.

**Non-goals**

- Amending or withdrawing an answer. The wait between days and the cap of three questions a day. A second player. Drafted answers offered to the shaman. The spirits' Reading. These need field days, accounts or the ethnography.

**Anti-goals**

- A spirit answer that contradicts an entry or a myth is kept.
- A spirit answer is shown or remembered without being checked.
- The spirits speak as the shaman.

## 3. How a question is answered

A **consult** is a refusal: the villager who refused, the question as it would be put to the shaman, and the visitor's own line.

**The spirits** are given the whole culture, including what is never said and what is earned, and the question. They return one of:

| Kind | Meaning | What joins the culture |
|---|---|---|
| `answer` | The spirits settle it | A new entry: a plain-sentence statement, a neutral topic, a kind, and who may say it |
| `people_disagree` | The people hold more than one view | A new entry stating the disagreement, sayable by anyone |
| `not_spoken_of` | It is not spoken of | A new prohibition on speaking of it, sayable by anyone |
| `already_settled` | The culture already answers it | Nothing. The answer names the entries; the page says who knows them |

Checks, in order:

1. **By rule:** the statement and topic are present and short; every entry it says it builds on exists; `already_settled` names at least one entry.
2. **By model:** a second call reads the statement against every entry and myth and reports contradictions. For `already_settled` this call is skipped.

If either check fails, the spirits are **silent**: nothing joins the culture, the consult stays open, and the owner may ask again. There is no automatic second attempt.

**The shaman's own answer** (open culture only) is a statement and who may say it. It is the author's word, so it is not checked.

A new entry's origin records the consult and whether the shaman or the spirits gave it. The villager who asked knows the entry. Other villagers learn only its topic, as with any entry they do not know.

## 4. Bringing it back

After an answer the conversation shows a line: who went to ask and who answered ("The shaman was silent. The spirits spoke."). A button lets the owner hear what the villager brings back. That is an ordinary checked turn: the villager is told what they went to ask and what they were told, and answers in their own words. If the answer may not be said to a stranger, the villager says only that an answer was given and that it is not for the visitor yet.

## 5. On the page

- Under a refusal: "Ask the spirits", and in the open culture "Answer as the shaman".
- "Questions for the shaman" shows each question's state: open, answered by the spirits, answered by the shaman, already settled (with who to ask), or the spirits were silent.
- "What is true here" lists added entries, marked "from the spirits" or "from the shaman".
- For the sealed culture before reveal, neither the list nor the curtain shows an added entry's text.
- Added entries are saved with the page, so the culture keeps growing between visits.

## 6. Checks

A fifth check, **spirits**: for five of each culture's silences, ask the spirits, then have the judge say whether the answer contradicts the culture. Ten probes, about thirty calls through the login.

## 7. Calls made by the author

1. The spirits see the whole culture, hidden meanings included, so they can answer in keeping with it.
2. A failed check makes the spirits silent; nothing is retried automatically.
3. Only the villager who asked learns a new entry.
4. The shaman's own answer is not checked.
5. In the trial the owner chooses when to ask the spirits; there is no standing instruction yet.
6. An answer cannot yet be amended or withdrawn.
