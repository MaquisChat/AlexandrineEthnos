# Fieldwork (working title): game design

Date: 2026-11-23 (second draft, with the owner's answers of the same day)
Status: owner's decisions incorporated; sections 5.4, 7 and 9.5 are new and
contain author's proposals the owner has not yet read
Audience: the owner, and Claude Code as the builder

## 1. Summary

A two-player game about interpretation. One player, the **shaman**, invents a
culture by telling its myths. The other, the **anthropologist**, arrives in that
culture's village, watches, talks to its people, and writes an ethnography: a
short set of claims about what things mean there. The shaman reads the claims
and answers each one. The best outcome is a claim the shaman did not intend but
recognises as true.

The villagers are played by AI, built from what the shaman wrote. They never
invent the culture: when asked something the myths do not settle, they go and
ask the shaman, and the answer becomes part of the culture for good. A shaman
who is away, or who prefers it, can **hand off to the spirits**: an AI that
answers in keeping with everything the shaman has already established.

Each player uses their own language. The anthropologist can choose to do the
fieldwork in a language they are learning, so the game doubles as conversation
practice. The first languages are English, French, Kazakh and Russian.

The same machinery carries a **single-player mode about real cultures in their
real languages**, under stricter rules: only customs the community itself
presents publicly, every statement tied to a source, and nothing invented. The
first example is a Kazakh pack about being a guest at Nauryz, the spring new
year.

The game is a stylised 3D village of fixed, staged scenes, built in web
technology and shipped to Steam as a desktop app.

## 2. Why, and who decided what

The owner wants an exercise in symbolic analysis: a game where reading symbols,
oppositions and stories is the play itself. The intent is to release on Steam
eventually. This document is to be turned into build plans for Claude Code.

**Decided by the owner**

- Two roles: shaman (authors values and myths through a storytelling exercise)
  and anthropologist (analyses them through observation and conversation).
- Play works both when the players are online together and when they are not.
- Villagers are AI stand-ins. Where the culture is ambiguous or silent, they
  consult the shaman rather than decide.
- A round ends with the shaman reading the anthropologist's claims and giving
  each one of three answers (section 5.6).
- Between field days the anthropologist waits for the shaman's answers.
- There is a provision for AI to answer the questions instead, called
  something like "hand off to the spirits".
- Each player has their own language, with AI translation between them. The
  language side must be good enough to be a useful learning tool.
- The first languages are English, French, Kazakh and Russian.
- There is a provision for eliciting real cultures in their real languages,
  starting with a well-supported example whose customs are public and can be
  discussed without impinging on cultural sensitivities; Kazakh was suggested.
- Real cultures are a single-player mode.
- Full 3D, stylised, in the spirit of Kentucky Route Zero.
- Built in web technology (TypeScript and Three.js), wrapped in Electron for
  Steam, with three requirements that keep a later Godot or Unreal client
  cheap (section 10.1).
- There is no API key for now. The build goes ahead without one, uses the
  Claude Code login where that works, and hands the rest to the owner.

Everything else here is the author's proposal. The larger proposals are listed
in section 15 so they can be checked quickly.

## 3. Goals, non-goals, anti-goals

**Goals**

1. Two people can complete a whole study (defined in section 5) across several
   days without ever being online at the same time, and it is better still when
   they are.
2. Villagers feel like people inside a culture, and stay faithful to what the
   shaman wrote.
3. The anthropologist does real analysis: collects evidence, relates symbols,
   commits to claims.
4. A learner at lower-intermediate level can do the fieldwork in the target
   language and come away having practised reading, writing and (later)
   listening.
5. A real culture can be presented accurately, respectfully and in its own
   language, with people from that culture able to check and correct it.
6. Claude Code can build and check nearly all of it without a human in an
   editor.

**Non-goals (not in this design)**

- A Godot or Unreal client, consoles, mobile.
- More than two players in one study.
- A public library of player-made cultures, or matchmaking with strangers.
- Both players walking around a shared space in real time.
- Invented languages for the cultures.
- Free-roaming open world or free camera.
- Speech input in the first release.

**Anti-goals (these would make it a failure even if it works)**

- A villager makes up a belief, rule or meaning the shaman never gave.
- A villager explains the symbolism ("the heron represents the dead"). The
  analysis has to be the player's.
- The ethnography is marked against an answer key. Meaning here is negotiated,
  not looked up.
- The shaman's side feels like filling in forms or marking homework.
- The language side is drills with a village painted on.
- Invented cultures read as caricatures of real peoples.
- Anything is said about a real culture that no source or person from that
  culture stands behind, or the AI is presented as speaking for a real people.

## 4. Words used in this document

| Word | Meaning |
|---|---|
| Culture | What a shaman has authored: myths, customs, people, and the canon. |
| Canon | The record of what is true in a culture. The only source villagers may draw on for anything cultural. |
| Study | One anthropologist's fieldwork on one culture, from arrival to the final reveal. |
| Field day | One sitting of fieldwork with a limited number of encounters. |
| Consult | A question a villager carries to the shaman. |
| The spirits | The AI that answers consults, and if needed gives the Reading, when the shaman hands off. |
| Evidence card | Something the anthropologist saw or heard, saved to the notebook. |
| Claim | One statement in the ethnography, tied to evidence cards. |
| Field language | The language the villagers speak to the anthropologist. |
| Pack | A real culture prepared from public sources and reviewed by people from that culture (section 7). |
| Contributor | A person from a real culture who is interviewed to help build its pack. Not a player. |
| Scene | One fixed, staged 3D location. |
| Milestone | A build step (section 12). |

Phase names (the Telling, Fieldwork, the Reading, the Return) are working names.

## 5. A study from start to finish

This section describes an invented culture. Section 7 says what changes for a
real one.

### 5.1 The Telling (shaman, about 30 to 45 minutes, can be saved and resumed)

The shaman does not fill in a list of values. They tell stories, and an AI
**apprentice** draws the culture out of them.

1. **The land.** Choose a landscape, name the people and the place, and pick or
   type 8 to 12 things of that world (animals, plants, weather, materials,
   tools, things in the sky). These become the raw material for symbols.
2. **The myths.** Three are required, each answering a question every culture
   answers:
   - Origin: how did the people come to be here?
   - Rupture: what went wrong once, and what did it cost?
   - Debt: what is owed, and to whom?

   Up to two more are optional. Each is free text of roughly 100 to 500 words
   in the shaman's own language. Optional story cards (a figure, a thing, a
   turn of events) can be drawn for inspiration and ignored freely.
3. **The apprentice's questions.** After each myth the apprentice asks three to
   five questions about what the story implies ("The heron refuses the fish.
   Is refusing a gift honourable here, or shameful?"). It asks; it does not
   propose meanings unless the shaman asks what it thinks. From the answers it
   writes canon entries as plain sentences, which the shaman confirms, edits or
   deletes.
4. **The customs.** The apprentice proposes four to six customs that follow
   from the canon: a greeting, a daily practice, a ritual, a prohibition, a
   saying or two. Each has a visible part (what an outsider would see) and a
   reason (which stays hidden). The shaman accepts, edits or replaces them.
5. **The people.** The apprentice proposes six villagers: name, role, age,
   temperament, which stories they know, and their slant on them. At least one
   doubts or tells it differently, so the anthropologist has something to
   compare. The shaman may edit.
6. **The heart.** The shaman marks three to five canon entries as what they
   most hope will be understood.
7. **Sealing.** The culture is fixed, and the shaman chooses how the spirits
   may act (section 5.4). From here the canon changes only through consult
   answers, recognised claims and corrections, all logged with who caused
   them.

The shaman then invites the anthropologist by link. Each study works on its own
copy of the canon, so two studies of one culture cannot interfere.

### 5.2 Fieldwork (anthropologist, five field days by default)

A field day allows three **encounters** plus unlimited looking around and
notebook work. The limit exists so that choosing whom to spend time with
matters, so a sitting has a natural length of 20 to 30 minutes, and so AI cost
per study has a ceiling.

**Rhythm between days.** The game is paced like correspondence:

- Each day opens with **the morning**: villagers who went to ask come back
  with answers. Hearing them is free and uses no encounter.
- The next day opens as soon as the previous day's consults are answered, or
  24 hours after that day ended, whichever comes first. A day that raised no
  consults opens the next one at once.
- When both players are online, answers arrive within the day and there is no
  wait.

Encounter types:

- **Talk.** A conversation with one villager, up to about twelve exchanges.
  The anthropologist types freely or picks a suggested question.
- **Watch.** A custom is performed and narrated.
- **Join.** The anthropologist takes part in a custom, with two to four choice
  points. Villagers react to what they do, which is itself evidence.
- **Look** (free, not counted). Objects and places give short descriptions.

Everything said and seen is logged automatically. The anthropologist clips
passages into **evidence cards** and files them in the **notebook**, which has:

- the log of each day;
- a **symbol board**: cards for things, people and acts, joined by labelled
  links (stands for, opposed to, goes with, turns into), with evidence pinned
  to cards and links;
- the draft ethnography;
- a word list, when the learning layer is on (section 6).

Villagers warm to the visitor in three steps (stranger, guest, confidant).
Rapport grows with time spent and with respecting customs, and opens knowledge
the shaman marked as guarded. This is the first thing to cut if milestone 1
runs long.

What the field looks like (from milestone 4), for an English-speaking learner
of French. Villagers speak the field language; the controls are in the
learner's own:

```
┌──────────────────────────────────────────────────────────────┐
│                                                   Day 2  ◐   │
│          flat-colour scene: the water's edge at dusk         │
│                                                              │
│     ▲ heron mark on the post        ● Maëlle     ● a child   │
│  ──────────────────── walking path ───────────────────────   │
│                                                              │
│  MAËLLE                                                      │
│  « Le héron mange en premier. Nous, ensuite. »               │
│   tap any word · [say it more simply] · [translation] · [clip]│
│                                                              │
│  > Pourquoi le héron mange-t-il en premier ?_                │
│  or ask:  Qui lui donne à manger ?  ·  C'était toujours ainsi ?│
│                                      [Notebook]  [End day]   │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 Asking the shaman

A villager starts a consult when the anthropologist asks about belief, custom,
meaning, kinship rules or the people's history and the canon either says
nothing or can be read two ways.

- The villager defers in character ("That is for the shaman to say. I will
  ask.").
- The shaman receives the question as the villager would put it, the exchange
  that prompted it, and two or three draft answers written by the apprentice to
  fit the existing canon. The drafts are clearly marked as suggestions.
- The shaman can write their own answer, take or edit a draft, choose "people
  disagree about this", "this is not spoken of" or "there is no answer", or
  **hand off to the spirits**. Each outcome is recorded as canon.
- The shaman sets who may say it: anyone, only those the visitor has earned, or
  shown but never said.
- The villager brings the answer back in their own words on a later morning,
  or within the same day when both players are online.
- At most three new consults can be raised per field day, so at most fifteen
  in a study; similar questions merge. Past the limit, villagers say it is not
  theirs to say and no consult is made.

```
Maëlle asks, on the visitor's behalf:
  "The stranger wants to know what is done when a heron dies."
  (The visitor asked: « Que fait-on quand un héron meurt ? »)
Your stories do not say. The apprentice offers:
  a) It is left where it falls. No one touches it.
  b) Whoever finds it carries it to the water.
[write your own] [people disagree] [not spoken of] [no answer]
[hand off to the spirits]
Who may say this?   anyone · those who have earned it · shown, never said
```

The shaman can also read the field log at any time, translated into their
language. If a villager misrepresented the culture, the shaman flags the line.
The villager later takes it back in character, and the incident is recorded as
an AI error for testing.

Target: the shaman spends no more than ten minutes per field day.

### 5.4 Handing off to the spirits

The spirits are an AI that answers as the culture would, in keeping with
everything already in the canon. The shaman uses them in two ways.

**On one question.** "Hand off to the spirits" is a choice on any consult.

**As a standing instruction**, chosen at sealing and changeable at any time:

| Setting | What happens |
|---|---|
| I answer everything | Unanswered questions stay open. On the morning after the wait, the villager reports that the shaman has not yet spoken. |
| The spirits answer what I have not (default) | When the 24-hour wait runs out, the spirits answer whatever is still open, so every morning brings answers. |
| The spirits keep this culture | Every consult goes straight to the spirits with no wait, and the spirits also give the Reading. The culture can be studied with its shaman absent. |

Rules:

- A spirit answer enters the canon marked as the spirits'. The shaman sees
  every one and can let it stand, amend it or withdraw it. An amendment reaches
  the anthropologist the same way a correction does: the villager takes it
  back.
- The anthropologist is told at the time, in the fiction ("The shaman was
  silent. The spirits spoke."), and the Return lists which answers were whose.
- For an invented culture the spirits may extend the canon, but never
  contradict it. They may also answer "people disagree" or "this is not spoken
  of". For a real culture they may not extend anything (section 7).
- The spirits never speak as the shaman. An audience (section 5.8) is always
  with the human.
- **The spirits' Reading.** If the culture is kept by the spirits, if the
  shaman hands the Reading off, or if the shaman has not given it seven days
  after submission and the anthropologist asks, the spirits answer the claims.
  Their answers are labelled as theirs. A claim they find true but unintended
  is noted, and enters the main culture only if the shaman later agrees.

A culture kept by the spirits can be played alone. That gives a first-time
player something to do before they have a partner.

### 5.5 The ethnography

Five to nine claims. Each is at most 400 characters and cites one to four
evidence cards. Sentence frames are offered but free text is allowed:

- "___ stands for ___."
- "___ is to ___ as ___ is to ___."
- "One must (never) ___, because ___."
- "What matters most here is ___."
- "The story of ___ is really about ___."

Claims can be drafted at any time and written in either language. The
ethnography is submitted after the last field day, or earlier if the
anthropologist chooses to stop. Submission follows the same rhythm as a new
day: it opens once the last day's consults are answered or 24 hours have
passed, and there is a final morning first.

### 5.6 The Reading (shaman, target 15 minutes)

The apprentice pre-reads each claim: it finds the nearest canon entries,
suggests an answer with a one-line reason, and flags evidence that does not
support the claim. The shaman always gives the answer:

- **I meant that.**
- **I didn't mean that, but it's true.** The claim enters the canon, credited
  to the anthropologist.
- **No.**

Each answer can carry a short reply, and the shaman can add a closing letter.

```
Claim 3 of 7
  "The heron stands for the dead, who must be fed before the living."
  Evidence: Maëlle, day 2 · Watching the evening meal, day 3
  Apprentice: close to what you said about the heron after the second
  myth. Suggests: I meant that.
[ I meant that ]   [ I didn't mean that, but it's true ]   [ No ]
Reply (optional): ____________________________________________
```

### 5.7 The Return

Both players see the answers and replies. The anthropologist can now read the
myths as the shaman told them, the canon including the heart, and what they
never found. The shaman can read the whole notebook. Consult answers that came
after submission are shown here, consults never answered are listed as "the
shaman did not speak", and every answer shows whether it came from the shaman
or the spirits.

The result is shared, not competitive, because the shaman is the judge. It
shows the count of each answer and how much of the heart was found, plus a
light score (starting values: 2 for "meant", 3 for "true but unintended", 0 for
"no", and a bonus per heart entry reached). The values are to be tuned in
play.

The study produces a **monograph**: one page holding the myths, the claims, the
answers and the replies, which either player can keep and share.

Afterwards the players can swap roles with a new culture, or the anthropologist
can return for a second season. The culture will have grown from the first.

### 5.8 Playing at the same time

Being online together changes speed, not rules.

- Each player can see that the other is present.
- Consults arrive at once, and the villager can be seen walking to the
  shaman's hut and back.
- **Audience.** The anthropologist may visit the shaman's hut. If the shaman
  accepts, they talk directly. The shaman types in their own language; the
  anthropologist reads it in the field language at their level. This uses an
  encounter.
- The shaman can watch the fieldwork as it happens, read-only.

When the shaman player is away, the shaman is in seclusion and no audience is
possible.

## 6. Language

- Each player sets an interface language. A study also has a field language
  and, for learners, a level.
- If the field language is the anthropologist's own, the learning layer is off
  and nothing else changes.
- The canon is stored in the author's language, which is the source of truth.
- **Term list.** Every culture keeps a list of its names, coined terms and
  symbol words with one fixed rendering in the field language. It is made at
  sealing and grows with the canon. All generated text must use it. A symbol
  that is "le héron" on day one must not become "l'aigrette" on day three, or
  the analysis becomes impossible.
- Villagers' lines are written directly in the field language at the learner's
  level, not written in the author's language and then translated.
- Levels at launch run from A2 to C1 on the European scale. A1 is supported
  only through suggested questions.

Learning aids, all outside the fiction (villagers never stop to teach):

| Aid | Behaviour |
|---|---|
| Tap a word | Meaning in this sentence, dictionary form, a short note. Adds it to the word list. |
| Say it more simply | The villager rephrases at a lower level. |
| Translation | Shows the whole line in the learner's language. Free, but counted. |
| Suggested questions | Three questions at the learner's level, relevant to the conversation. |
| Margin correction | After the villager replies, a corrected version of what the learner wrote appears in the margin. |
| Evening review | The day's words come back for review, spaced across days. |
| Summary | At the Return: words met, lines understood without help. |

Villagers understand imperfect language and answer the most plausible reading.
If they cannot tell what was meant, they ask again in simple words.

**First languages: English, French, Kazakh and Russian**, each as an interface
language and as a field language, in any pairing.

A language is added as a **language pack**, not by changing code. A pack holds
level guidance, fonts, the style of word notes, a test set and (later) a voice.
What the first four need:

| Language | Notes for the pack |
|---|---|
| English, French | No special handling. |
| Russian | Optional stress marks on villager lines, on request, since stress is not written and learners need it. |
| Kazakh | Cyrillic script, which is the working standard; the planned move to Latin has no deadline, and models do markedly worse on Latin-script Kazakh. Fonts must cover ә ғ қ ң ө ұ ү һ і. Words are built from a stem and a chain of endings, so a word note must show the parts (үйлерімізде = үй "house" + лер plural + іміз "our" + де "in"). |

Requirements that keep further languages possible: word boundaries for tapping
come from the service, not from splitting on spaces; the interface uses
direction-neutral layout; text inputs work with input methods for Chinese,
Japanese and Korean.

Each language passes separately. It counts as supported when the automated
checks in section 9.6 pass for it and a fluent speaker has reviewed a sample of
villager lines, word notes and corrections. AI quality in Kazakh is expected to
be lower than in the other three (section 7.5), so Kazakh may need more work,
and if it misses the bar the owner decides whether to hold it back or label it
experimental.

Sound comes later (milestone 6): spoken villager lines with slow replay,
behind a provider-neutral interface. The AI model used for text does not
produce speech, so a separate speech service is needed. For Kazakh, open
voices exist (section 7.4).

## 7. Real cultures in their real languages

### 7.1 A single-player mode

Real cultures are played alone. The player is a **guest**. The people they
meet are AI hosts, and questions the hosts cannot answer go to **the record**,
an AI that answers only from the pack. There is no second player, so there is
no waiting: mornings come at once, and the record gives the Reading as soon as
the player submits.

A real culture reaches the game as a **pack**, built in two ways that can be
combined:

1. **From public sources.** The game's makers assemble entries from published
   material, each with its citation.
2. **By elicitation.** A **contributor** who belongs to the culture is
   interviewed by the apprentice, in their own language, about customs as they
   are actually practised ("How is a guest received in your family's house?
   Who sits where? What is said?"). Nothing is invented. Their answers become
   entries attributed to them, with phrases such as "in my family" or "in our
   region" kept, because customs vary. This is the Telling turned into an
   interview, used as a pack-building tool. The contributor is not a player
   and is never online during anyone's game.

Either way, people from the culture review the pack before release.

### 7.2 Rules for any real culture

- **Public customs only.** A custom is included only if the community's own
  institutions present it publicly: for example UNESCO intangible-heritage
  nominations (which require the community's consent and are published),
  national museums and cultural bodies, and school materials.
- **Left out by default:** religious doctrine and worship; healing and spirit
  practices; funerals and mourning; clan, tribal or ethnic politics; current
  politics and painful recent history; real named people; anything the culture
  restricts by age, gender or initiation; anything a reviewer asks to
  withhold.
- **Every entry is attributed.** An entry cites a published source or is
  attributed to a contributor. No unattributed statement about a real culture
  reaches a player.
- **The AI never extends a real culture.** Where the pack is silent, a host
  says they cannot say ("I don't know how others do it. You would have to ask
  someone older."), and the gap is logged for the pack's curators, who may
  fill it from a source or a contributor in a later version of the pack.
- **Variation is normal.** Entries can carry "in some regions" or "in some
  families". Hosts speak for their household, not for a nation.
- **Present day, fictional people.** The setting is now, not a timeless past,
  and no character is a real person.
- **Neutral role names, set per pack.** The visitor is a guest, the people are
  hosts, the AI answerer is "the record". The words shaman, villagers,
  anthropologist and spirits are not used. In the Kazakh case, healers and
  ancestors' spirits are living matters, not game furniture.
- **Fresh wording.** Text is written from the facts and cites its sources. It
  does not copy them.
- **Documented motifs only.** Visual marks and ornaments are redrawn from
  documented ones and reviewed. They are never invented by AI.
- **Review before release.** At least two reviewers from the culture, fluent
  in the language, approve content, wording, names and visuals. Every line in
  a real-culture study has a "this is wrong" control that reaches the
  curators.

### 7.3 What changes in play

| Invented culture (two players) | Real culture (one player) |
|---|---|
| The shaman invents myths | A pack is prepared from sources and contributors |
| Consults go to the shaman, with a wait | Questions go to the record at once; gaps are logged |
| The spirits may extend the canon | The record answers only from attributed entries |
| "I meant that" / "not meant, but true" / "no" | "The sources say so" / "the sources do not say" / "the sources say otherwise", each with its citation |
| Key terms are translated by the term list | Key terms stay in the culture's language in every interface language, with a gloss |
| AI-drawn marks | Documented motifs, redrawn |
| Generic scenes | The pack's own scenes |
| The Return reveals the shaman's myths | The Return shows the sources behind what the player met, and suggests further reading |

The record never claims to speak for the people. Its answers say what the
pack's sources and contributors say, and where.

The rest of the loop is unchanged: field days with three encounters, the
notebook and symbol board, five to nine claims tied to evidence, and all the
language aids.

A pack contains: attributed canon entries, hosts, customs with staging, term
list, scenes, role names, its list of what is left out, its source list, its
contributors (with their consent to be credited or to stay anonymous), and
the reviewers' sign-off.

### 7.4 The first pack: a guest at Nauryz (Kazakh)

The owner suggested Kazakh. It fits the brief well.

**Why it qualifies**

- It is a large, living national culture whose own institutions present these
  customs to outsiders. Kazakhstan has fourteen elements on UNESCO's
  Representative List by its foreign ministry's count in December 2024,
  including Nauryz, yurt-making, dombra kuy, aitys, assyk games, kuresi
  wrestling, the horse breeders' spring rites, orteke and betashar.
- The customs proposed are festive, domestic and public.
- They are rich in exactly what the game is about: recurring numbers, colours,
  placement and objects that carry meaning.
- Kazakh is a state language with a standard written form, and open speech
  resources exist: Nazarbayev University's ISSAI publishes KazakhTTS2 (271
  hours, five voices), described as available for academic and commercial use
  with attribution. The exact licence must be confirmed before use.

**Setting.** The guest arrives in a present-day village during Nauryz and is
received by one family.

**Proposed content** (to be confirmed against sources and by reviewers):

| Custom | What the guest meets | Why it suits analysis |
|---|---|---|
| Қонақасы, hospitality to a guest | Being fed and lodged; refusing food offends | Obligation, honour, the stranger |
| The yurt: шаңырақ and төр | The crown of the roof; the place of honour at the back, where guests are received | The shanyraq stands for the family's continuity and sits at the centre of the state emblem; seating maps honour |
| Наурыз and наурыз көже | The spring new year; a dish of seven ingredients | The number seven; renewal; sources list the ingredients differently |
| Тұсау кесу | A child's first steps; a striped cord on the legs is cut | A life stage marked by cutting; the cord's colours |
| Беташар | The song at which a bride's face is unveiled | Entering a new family; public naming of relations |
| Бата | A blessing given with open palms | Elders, words that bind |
| Асық | Games played with sheep knucklebones | Play, skill, childhood |
| Күй and айтыс | Dombra pieces; duels of improvised verse | Story without words; wit as honour |

**Left out of this pack:** religious practice; the baqsy and healing; beliefs
about ancestors' spirits; funerals and memorial feasts; clan and zhuz
affiliation; bride abduction; twentieth-century history and present politics.
The rule of knowing seven generations of ancestors is included only if the
reviewers agree.

**Scenes:** the road in across the steppe; the festival ground with swings,
games and wrestling; the yurt from outside; inside the yurt; the yard where
the nauryz dish is cooked.

**Languages.** Kazakh is the pack's own language. It can also be played with
Russian, French or English as the field language, with key terms kept in
Kazakh.

### 7.5 Cautions

- **AI cannot be trusted on this from memory.** Published evaluations of large
  models in Kazakh are thin and mixed. In one 2026 comparison Claude and GPT
  models traded places across tasks, and on a 500-question Kazakh ethnographic
  benchmark reported in September 2026 a leading model scored about 36%. This
  is why the record answers only from attributed entries and why reviewers are
  required.
- **Sources disagree on details.** For example, lists of the seven ingredients
  differ, and accounts differ on which son inherits the shanyraq (the better
  sources say the youngest). Entries carry the variation and the citation, and
  reviewers settle doubtful points.
- **Framing.** A game about an outsider studying a people can go wrong fast
  with a real people. The guest framing, present-day setting, neutral role
  names and review are there to prevent that, and the reviewers have the last
  word on whether it works.

## 8. The world and its look

**Structure.** A place is a set of scenes. An invented culture uses a generic
village of six: the arrival, the commons, the water (or the land's main
feature), a dwelling interior, the sacred place, and the shaman's hut. A pack
brings its own scenes. Each scene is a fixed framing with a slow camera drift
along a rail. The player clicks to walk along paths and clicks people and
objects. There is no free camera.

**Look.** Flat unlit colour, hard-edged shapes and strong silhouettes. A
limited palette per culture. Depth comes from layers of fog and steps of
brightness, and shadows are flat shapes. There are no textures other than the
culture's own marks. Figures are simple, read by silhouette and dress. Text is
part of the picture: dialogue and narration are set large in the lower third.

Kentucky Route Zero is the reference for stillness and theatrical staging. The
game's own idea is the model theatre: the visitor looks into framed, lit
boxes. No assets, scenes or characters are to be copied from any existing
game.

**How an invented culture shapes its village**

1. **Palette**, from the land and one choice by the shaman.
2. **Marks.** At sealing, the AI draws three flat emblem options for each key
   symbol and the shaman picks one. Marks appear on lintels, cloth, pots and
   bodies, in named slots in the scene.
3. **Placement.** Each custom names the scene where it happens, and its
   objects appear in that scene's slots.

Everything more specific is carried by text, as in the sketch in 5.2.

**Customs performed.** Each custom gets a small staging script made at sealing:
who stands where, which of about sixteen stock gestures they make, which
objects they hold, and the narration. Scripts are checked against the scene
data, and the shaman can preview them.

**Art files.** The running game loads only standard files: glTF for models and
animation, SVG and PNG for marks and interface, JSON for scenes. Scripts in the
repository may generate these files, but the game never draws its world purely
from code. All figures share one skeleton so every gesture works on everyone.

## 9. How the AI must behave

### 9.1 Canon

Every entry has: an identifier, a kind (symbol meaning, value, opposition,
prohibition, obligation, custom, saying, person, place, fact of the world,
consult answer, recognised claim), a plain-sentence statement, its origin (a
myth passage, an answer to the apprentice, a consult answered by the shaman, a
consult answered by the spirits, a claim, a published source with its
citation, or a contributor's account), who may say it (anyone, earned, shown never
said), an optional note on variation, and a timestamp. A symbol may carry
several meanings in different settings; that is expected and useful.

A culture's canon is expected to stay under roughly 15,000 tokens, and the
whole of it is given to the AI on every call. No search index is needed at
this size. If cultures outgrow it, the builder proposes a change.

### 9.2 Rules for villagers and hosts

1. **Never invent culture.** Anything about belief, custom, meaning, kinship
   rules or history comes from the canon. Otherwise the villager defers (and a
   consult is made) or sends the visitor to someone who knows.
2. **Never explain the symbolism.** Villagers speak from inside: stories,
   sayings, what one does, how they feel about it. Asked "what does the heron
   mean?", an acceptable answer is "It's the heron. You feed it first."
3. **Small talk is free.** A villager's own life, work and opinions may be
   improvised. What is improvised is stored for that villager so it stays
   consistent, and it must not carry new cultural facts.
4. **Know only your share.** Each villager knows some stories, with their own
   slant, and respects who may say what.
5. **Stay in the field language at the learner's level**, using the term list.
6. **React as the culture would** to what the visitor says and does.

Every reply carries a hidden record: whether it was small talk, drawn from
canon (with the entries used) or a deferral. The service decides what happens
next from that record, not the client.

### 9.3 Rules for the spirits and the record

- **The spirits** (invented cultures) may add to the canon. Each answer must
  be consistent with every existing entry, must name the entries it builds on,
  and is stored as the spirits'.
- **The record** (real cultures) may only restate attributed entries, with
  their citations. If nothing covers the question it says so. It never
  speculates, generalises about a people, or draws on the model's own
  knowledge of the culture.

### 9.4 AI jobs and the gateway

Jobs: apprentice (interview, canon writing, customs, people), elicitation
interview for contributors, villager, grounding check on villager replies, consult
drafting, the spirits, the record, language help (word notes, simpler
rephrasing, corrections, suggestions), translation for the author, claim
pre-reading, staging scripts, mark drawing.

All of them go through one module in the service, the **AI gateway**, which
owns:

- prompts, kept in the repository and versioned;
- the model for each job, set in configuration. The default for every job is
  `claude-opus-5-5`. Moving a job to a cheaper model is the owner's decision,
  taken after the checks in 9.6 show quality holds;
- prompt caching, with the instructions and canon as the stable front part of
  every request;
- streaming for villager speech, and structured output for decisions;
- handling of declined requests (the model can refuse with a distinct stop
  reason): the villager declines in character, and server-side fallback is
  switched on;
- a usage log per study and per job, and enforcement of budgets;
- three interchangeable **providers** (section 9.5).

Notes for the builder on current model behaviour: reasoning cannot be switched
off on the default model and is controlled by an effort setting (start low for
villager turns and measure); forcing a specific tool call and prefilling the
reply are not available, so use structured output for the hidden record.
Confirm details against the Claude API documentation when implementing.

### 9.5 Working without an API key

There is no key yet. The gateway has three providers so the build does not
wait for one.

| Provider | Used for | Needs |
|---|---|---|
| Fake | Every ordinary test and all development of rules, pages and scenes. Returns scripted replies. | Nothing |
| Login | Trying prompts and running small quality checks during the build. Sends each request through the Claude Code command line in non-interactive mode, using the login already present. | A Claude Code login |
| Key | The real game, the playtest, and the full quality checks. | An Anthropic API key |

The login route was tried on 2026-11-23 in the build environment and answered
without a key. Its limits:

- it draws on the owner's Claude plan;
- it runs on whichever model the login serves (the test was served by a
  different model from the game's default), so results are indicative, not
  final;
- each call carries the command line's own built-in instructions, which makes
  calls slow and heavy unless the builder replaces them, so runs stay small;
- it is a development tool and must never be part of the shipped game.

So the builder does everything it can on the fake and login providers, reports
login-run numbers as indicative, and prepares the rest as a **hand-off**: one
command for the full checks and one for starting the playtest, with a short
guide saying what to set, roughly what it will cost and what passing looks
like.

### 9.6 Checks (evals)

Four fixture cultures written by the builder, one authored in each of the
first languages, plus the Kazakh pack once it exists, and sets of scripted
probes. Starting targets:

| Probe | Passing means | Target |
|---|---|---|
| Gap | Asked about something the canon lacks, the villager defers or redirects and asserts nothing new | 95% |
| Explain | Asked what something means, the villager does not state a hidden meaning outright | 95% |
| Consistency | Same question to different villagers and days never contradicts canon | 98% |
| Scope | A villager asked about what they do not know redirects | 90% |
| Spirits | A spirit answer contradicts no canon entry | 98% |
| Record | Every statement in a real-culture reply traces to an attributed entry | 100% |
| Level | Replies sit within the learner's level | 90% |
| Term list | Fixed renderings are always used | 100% |
| Consult round trip | Question and answer keep their meaning across translation both ways | 95% |
| Pre-read | Suggested answers on labelled claims match the labels | 85% |

Checks combine code tests with an AI judge using a written rubric.

**Who writes and reviews what.** The builder writes the fixture cultures, the
probes and the labelled claims. Because that is AI-written material judged by
AI, human inputs are required before the numbers are trusted:

- the first culture the owner authors by playing the Telling is added as a
  fixture and the checks are run again on it;
- the owner reads a sample of about 40 judged villager replies and confirms
  the judge's verdicts;
- a fluent speaker of each of French, Russian and Kazakh reviews that
  language's fixture and a sample of its output.

**Sizes.** While tuning, the builder uses small sets (about 40 probes per
check), on the login provider. The full sets (about 200 per check, enough to
tell 95% from 98%) run on the key provider and are part of the hand-off.

## 10. Architecture

### 10.1 Three requirements (owner-approved)

1. **All rules and game state live in the service.** The client shows things
   and sends the player's intentions. It cannot decide that a consult exists,
   how many encounters remain, or what a villager knows.
2. **Scenes are data.** A scene is a JSON file checked against a published
   schema: references to model files, camera rail, walking graph, clickable
   spots, slots for marks, objects and actors, and palette and lighting roles.
   It follows glTF conventions (right-handed, Y up, metres) and contains
   nothing specific to Three.js.
3. **Art is stored in standard formats** (section 8).

A second client in another engine should need only the service's interface,
the scene schema and the art files.

### 10.2 Parts

| Part | Role |
|---|---|
| Client | Web app. Three.js draws the scenes; the interface (dialogue, notebook, the shaman's pages) is ordinary web text laid over it. |
| Service | Interface for the client (requests plus a live channel), database, AI gateway, background jobs, notifications. |
| Contracts | Shared definitions of every message, the scene format, the canon and the pack format, also published as JSON Schema. |
| Desktop shell | Electron wrapper with a thin Steam adapter (milestone 7). |
| Content | Scene files, art files, fixture cultures, packs, language packs, prompts. |

Local movement, camera and hover stay in the client and are not rules. The
client tells the service which scene the player is in, for presence.

### 10.3 Things the service stores

Account; culture and canon entries with history and origin; villager, including
improvised personal facts; custom and its staging script; term list entry;
source (for packs); study and its copy of the canon; field day; encounter; log
line (original text, speaker, hidden record); evidence card; symbol board card
and link; consult, with who answered it; claim; answer; reported error; word
list entry; usage record.

### 10.4 Technical choices (author's, replaceable with a note)

TypeScript throughout, in one repository with workspaces. Client: Vite,
Three.js, React for the interface. Service: Node with a small web framework,
PostgreSQL, WebSocket for the live channel, the official Anthropic TypeScript
SDK. Tests: Vitest and Playwright. Local running through Docker Compose.

Until milestone 7, accounts are lightweight and joined by invite link. The
account model must allow Steam sign-in to be added without migration pain.

## 11. Constraints

- **Steam and AI.** Steam requires games to disclose AI content generated
  while the game runs and to describe the guardrails against illegal output;
  players can report such content through the overlay; adult sexual content
  generated live is not allowed. So: content rules in every AI job, a check on
  the shaman's text at sealing, a report control on every AI line and every
  line of player text, and the ability to leave a study and block a player.
  Confirm Valve's current wording at milestone 7.
- **Invented cultures stay invented.** The Telling says so, asks shamans not
  to transcribe the sacred stories of real peoples, and an advisory check at
  sealing flags close matches. Real cultures enter only through section 7.
- **Cost.** Every study uses paid AI calls. A rough, unmeasured estimate on the
  default model is single-digit US dollars for a fully played study, based on
  about 100 to 180 villager exchanges at a few cents each plus the Telling and
  sealing. The real figure is measured as soon as a key exists. Budgets per
  study are enforced by the service: until the real figure is known, a study
  stops making AI calls at 15 US dollars and tells both players plainly.
- **Online only.** The game needs a connection. This must be stated on the
  store page.
- **Privacy.** Logs and authored text are stored. Deleting an account removes
  the player's personal data; a partner keeps the monograph.
- **Access.** Text size is adjustable, nothing is timed, colour is never the
  only carrier of meaning, and the whole game can be played from the keyboard.
- **Secrets.** Keys live in the environment, never in the repository.

## 12. Milestones

The order puts the riskiest questions first: are the villagers convincing, does
asking the shaman work, is the shaman's workload bearable. The 3D comes after
those are answered, with one early look test so the visual direction is not a
late surprise.

Each milestone ends with checks Claude Code can run itself, a hand-off where a
key or a person is needed, and a short list only the owner can judge.

**M0. Ground and look test**
Repository, contracts, automated checks on every change, the gateway with its
fake and login providers, a builder's guide file for Claude Code, and one scene
in the intended look with a walking figure and the dialogue strip.
- Self-check: tests pass; a screenshot of the scene is produced and compared.
- Owner: is this the look?

**M1. The whole loop in plain pages** (English only, not live)
The Telling, sealing, fieldwork with Talk, Look and narrated Watch, the rhythm
between days, consults, the spirits in all three settings including the
spirits' Reading, the notebook with a simple list-style symbol board, the
ethnography, the Reading, the Return and the monograph. Two accounts joined by
invite link. Fixture cultures and the gap, explain, consistency, scope, spirits
and pre-read checks.

The playtest is private. M1 delivers a container setup that runs on one small
server, or on the owner's machine behind a tunnel, supplied by the owner.
Entry is by invite link only, with no open sign-up, and the per-study budget
and request limits are on. A public, hardened deployment is not part of M1.
- Self-check: a scripted two-player run completes a study end to end on the
  fake provider, and a scripted solo run completes a study of a culture kept
  by the spirits; small check sets run on the login provider and are reported
  as indicative.
- Hand-off: the full checks, the cost measurement and the playtest, each
  needing a key.
- Owner: play a study alone against the spirits, then a full study with a
  friend. Are the villagers convincing? Is the shaman's side light enough? Is
  writing claims satisfying? Then the human inputs in section 9.6.

**M2. Language**
Field language different from the player's own, term list, levels, all aids in
the table in section 6, translation of consults, claims and logs, the four
language packs, and the level, term list and round-trip checks for each.
- Self-check: checks run per language; a scripted study runs for each of the
  twelve pairings on the fake provider and for a sample on the login provider.
- Owner: a learner plays a day in each language available to them; fluent
  speakers review French, Russian and Kazakh.

**M3. Real cultures (single-player mode)**
The single-player loop for packs, built on the solo loop from M1: the guest
role, hosts, the record and its check, the record's Reading, and no waiting.
Attribution on every entry, the pack format and the tools to build one, the
elicitation interview for contributors, the "this is wrong" route to curators,
and a first draft of the Kazakh pack written from cited public sources.
- Self-check: the record check; every entry in the pack has a citation; the
  pack validates against its format; a scripted solo run completes the pack
  on the fake provider.
- Owner: find two reviewers from Kazakhstan who are fluent in Kazakh, and
  approve the list of what is left out. The pack is not released, even to
  testers outside the team, until both reviewers sign off.

**M4. The village**
Scene format, the six generic scenes and the Kazakh pack's scenes, walking and
clicking, palette, marks, staged customs for Watch and Join, the spatial symbol
board, and the earlier pages re-housed as overlays in the 3D frame.
- Self-check: every scene file validates; screenshots of each scene and of a
  staged custom are produced and compared; the scripted studies still pass.
- Owner: look, pacing, readability. Reviewers: the Kazakh scenes and motifs.

**M5. Playing together**
Presence, live consults with the walk to the hut, audiences, the shaman's live
view, and email notices for play apart.
- Self-check: a two-browser scripted session covers each live feature.
- Owner: play a live session.

**M6. Sound**
Spoken villager lines with slow replay, ambient sound, a speech provider behind
a neutral interface, with a Kazakh voice. Speech input is optional and last.

**M7. Steam**
Electron shell, Steam sign-in and friend invites, overlay and reporting, usage
metering tied to whatever purchase model is chosen, store disclosures, and a
check on Steam Deck. The Steam library for Electron should be chosen then: the
original `steamworks.js` is lightly maintained and the overlay inside Electron
is a known rough spot, so keep Steam behind a thin adapter and test the overlay
first.

## 13. Later, not designed here

- A library where shamans publish cultures for any anthropologist. Cultures
  kept by the spirits, and packs, already give a new player something to play
  alone, which eases the problem of needing a partner on day one.
- More packs and more languages.
- A Godot or Unreal client.

## 14. Left to the builder

Prompt wording; exact schemas; interface layout within the sketches; library
choices within 10.4; hosting; the list of stock gestures; how the hidden record
is produced and streamed; score values; how models are generated; the form of
the spaced review; how the login provider strips the command line's built-in
instructions; anything not stated above. Where a choice here would change what
a player experiences, record it in the repository's decision notes.

## 15. Proposals by the author, for the owner to check

New since the first draft:

1. The spirits have three standing settings, and the default is that they
   answer what the shaman has not answered when the wait runs out (5.4).
2. The anthropologist is told in the fiction when the spirits answered, and
   the shaman can amend or withdraw any spirit answer (5.4).
3. The spirits can give the Reading when the shaman hands it off, or after
   seven days if the anthropologist asks (5.4).
4. Real cultures follow the rules in 7.2: public customs only, a default list
   of what is left out, attribution on everything, no AI extension, two
   reviewers before release. "Eliciting" is read as interviewing a contributor
   from the culture to help build a pack, not as a second player (7.1).
5. For real cultures the role names change and the AI answerer is called "the
   record", not "the spirits" (7.2).
6. The Kazakh pack's theme, proposed content, list of what is left out, and
   present-day setting (7.4).
7. Kazakh is written in Cyrillic (6).
8. Kazakh may trail the other three languages if it misses the quality bar
   (6).
9. The login provider as a development stand-in for a key (9.5).
10. Real cultures are their own milestone, after languages and before the 3D
    village (12).

From the first draft, unchanged:

11. The Telling is three required myths, an AI apprentice who asks questions,
    then customs, people and a marked "heart" (5.1).
12. Fieldwork is five days of three encounters each (5.2).
13. Villagers may improvise small talk; only cultural matters go to the shaman
    (9.2).
14. Consults carry drafted answers, and there are at most three new ones per
    day (5.3).
15. The shaman can read the field log and correct a villager who got the
    culture wrong (5.3).
16. A simple rapport system gates guarded knowledge (5.2).
17. The result is shared between the players, with a light score (5.7).
18. "At the same time" means live consults, audiences and watching, not two
    bodies in one space (5.8).
19. The learning aids in section 6, with villagers who never break character
    to teach.
20. Sound in milestone 6; speech input later.
21. Six fixed scenes in a model-theatre style; the culture shows through
    palette, marks and staged customs, with detail carried by text (8).
22. The default AI model is `claude-opus-5-5` for every job (9.4).
23. The whole loop in plain pages before the 3D village (12).
24. The builder writes the test cultures; human review is required before the
    numbers are trusted (9.6).
25. The M1 playtest is private and invite-only (12).
26. A provisional limit of 15 US dollars of AI cost per study (11).

## 16. What the owner supplies, and when

| When | What |
|---|---|
| Before building starts | A code repository for the project, so work is kept. |
| For the M1 hand-off | An Anthropic API key with access to the default model, and a small server or a machine with a tunnel for the playtest. |
| End of M1 | A played culture of the owner's own, and a review of about 40 judged replies. |
| M2 | One fluent reviewer each for French, Russian and Kazakh. |
| M3 | Two reviewers from Kazakhstan, and approval of what the pack leaves out. |
| Before M7 | How players pay for ongoing AI cost on Steam; the game's name; the speech service; whether strangers can ever be paired; where the public service is hosted. |

## 17. Approaches considered

**How a round ends**

| Approach | Trade-off | Outcome |
|---|---|---|
| Scored against a hidden answer chart | Easy to build, clear win, but treats meaning as having one right answer | Rejected |
| Read and answered by the shaman | Slower and needs both players to care, but is the real experience of interpretation | **Chosen by the owner** |
| No verdict at all | Truest to interpretation, but no closure | Rejected |

**What the game is built in**

| Approach | Trade-off | Outcome |
|---|---|---|
| Web technology in a desktop wrapper | Claude Code can build and visually check all of it; best text and language handling; playable by link. No scene editor; lower graphical ceiling | **Chosen by the owner**, with the three requirements in 10.1 |
| Godot 4 | Real engine with text-based scenes and an editor. Harder for Claude Code to see its work; heavier text work; two programming languages | Kept open as a later port |
| Unreal Engine 5 | Highest ceiling. Levels and materials are binary editor files Claude Code cannot write; needs a person in the editor | Rejected for now; a later port remains possible |

**Pace between field days**

| Approach | Trade-off | Outcome |
|---|---|---|
| Wait for the shaman, up to 24 hours | Answers are heard and used; the anthropologist is paced by the shaman | **Chosen by the owner**, with the spirits as the way out |
| Never wait | No delay, but most answers arrive too late to matter | Rejected |

## Sources consulted

Steam and tooling
- https://www.pcgamer.com/software/ai/steam-updates-ai-disclosure-form-to-specify-that-its-focused-on-ai-generated-content-that-is-consumed-by-players-not-efficiency-tools-used-behind-the-scenes/
- https://pcgamer.com/valve-updates-its-steam-policy-on-ai-so-it-can-release-the-vast-majority-of-games-that-use-it
- https://www.npmjs.com/package/steamworks.js
- https://dev.to/arty_prof/steamworks-ffi-node-a-steamworks-sdk-library-for-javascript-game-frameworks-15h1

Kazakh heritage and customs (starting points for the pack, not yet its
citations)
- UNESCO, Kazakh traditional Assyk games: https://ich.unesco.org/en/RL/kazakh-traditional-assyk-games-01086
- UNESCO, yurt-making: https://ich.unesco.org/en/RL/traditional-knowledge-and-skills-in-making-kyrgyz-kazakh-and-karakalpak-yurts-turkic-nomadic-dwellings-02284
- Kazakhstan foreign ministry on Betashar and the count of inscribed elements: https://www.gov.kz/memleket/entities/mfa/press/region-news/details/22399?lang=en
- National inventory of intangible heritage: https://nmrk.kz/en/structure/scientific-activity/national-list/
- Encyclopedia of signs and symbols of Kazakh culture: https://cultural.kz/?p=3548
- Astana Times on Shanyrak Day: https://astanatimes.com/2024/03/nauryz-festivities-continue-with-shanyrak-day-honoring-family-and-tradition/
- Abai Institute, traditions and customs: https://oq.gov.kz/en/abai/saltdasturler
- Government pages on culture and customs: https://www.gov.kz/article/64578?lang=en

Kazakh language and AI
- ISSAI on Latin-script Kazakh and language models (EMNLP 2026): https://issai.nu.edu.kz/2026/10/27/issai-researchers-present-research-on-kazakh-latin-script-and-large-language-models-at-emnlp-2026-an-a-conference/
- Evaluating large models for Kazakh educational tasks: https://www.mdpi.com/2078-2489/17/10/1014
- Qazinform on a Kazakh ethnographic benchmark: https://qazinform.com/news/ai-trained-in-kazakh-language-and-culture-to-help-preserve-historical-heritage-5cb499
- Kazakh alphabets and the Latin transition: https://en.wikipedia.org/wiki/Kazakh_alphabets
- ISSAI KazakhTTS: https://issai.nu.edu.kz/tts and https://www.github.com/IS2AI/Kazakh_TTS
