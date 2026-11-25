import { type Culture, type CultureEntry, parseCulture, type Say } from "@fieldwork/contracts";
import {
  type Ask,
  askSpirits,
  consultEntry,
  emptyState,
  type Exchange,
  type ModelClass,
  shamanQuestions,
  villagerTurn,
  VillagerTurnError,
} from "@fieldwork/villagers";
import { Component, type FormEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import heronJson from "../../../content/cultures/heron.culture.json";
import sealedJson from "../../../content/cultures/sealed.culture.json";
import { type ConsultRecord, consultId, findConsult, withAdditions } from "./consults";
import { anyOf, BASIS_COPY, FAILURE_COPY, SAVED_NOTE, SAY_CHOICES, SPEEDS, SPIRITS_UNREADABLE, WENT_TO_ASK } from "./copy";
import { answerId } from "./ids";
import { AskError, type AskFailure, connectAsk } from "./runtime";
import { connectStore, memoryStore, type Saved, type TrialStore } from "./store";

/** The cultures as their authors wrote them. What the spirits and the shaman have answered since is added on top. */
const CULTURES: Culture[] = [parseCulture(heronJson), parseCulture(sealedJson)];
/** The culture whose truths can be read from the start. The other is played blind. */
const OPEN_CULTURE = "heron";

const SAY_LABEL = { anyone: "anyone may say it", earned: "earned", shown: "never said" } as const;

/** Marks an entry that was not in the culture as written, and says whose answer it is. */
function Provenance({ entry }: { entry: CultureEntry }) {
  return entry.origin.type === "consult" ? <span className="tag">from the {entry.origin.by}</span> : null;
}

/** Who can be asked about entries that already settle a question: everyone who knows one that may be put into words. */
function whoKnows(culture: Culture, entryIds: string[]): string[] {
  const sayable = culture.entries.filter((e) => entryIds.includes(e.id) && e.say !== "shown").map((e) => e.id);
  return culture.villagers.filter((v) => v.knowsEntries.some((id) => sayable.includes(id))).map((v) => v.name);
}

const settledWords = (culture: Culture, entryIds: string[]) => {
  const names = whoKnows(culture, entryIds);
  return names.length > 0 ? `Ask ${anyOf(names)}.` : "It is not something that is said aloud.";
};

/** The form in which the owner answers a question as the shaman. Nothing here is sent to a model. */
function ShamanForm({
  question,
  onSave,
  onCancel,
}: {
  question: string;
  onSave: (answer: { statement: string; topic: string; say: Say }) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [statement, setStatement] = useState("");
  const [topic, setTopic] = useState(() => question.replace(/[?.!\s]+$/, "").split(/\s+/).slice(0, 12).join(" "));
  const [say, setSay] = useState<Say>("anyone");
  const tidy = (text: string) => text.trim().replace(/\s+/g, " ");
  const ready = tidy(statement) !== "" && tidy(topic) !== "";
  return (
    <form
      className="flag"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) onSave({ statement: tidy(statement), topic: tidy(topic), say });
      }}
    >
      <label htmlFor={`${id}-statement`}>The shaman's answer</label>
      <textarea id={`${id}-statement`} rows={2} value={statement} onChange={(event) => setStatement(event.target.value)} />
      <label htmlFor={`${id}-topic`}>What it is about</label>
      <input id={`${id}-topic`} type="text" autoComplete="off" value={topic} onChange={(event) => setTopic(event.target.value)} />
      <p className="quiet">A few neutral words. The other villagers are told this much, so they can send a visitor to the right person.</p>
      <label htmlFor={`${id}-say`}>Who may say it</label>
      <select id={`${id}-say`} value={say} onChange={(event) => setSay(event.target.value as Say)}>
        {SAY_CHOICES.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.label}
          </option>
        ))}
      </select>
      <div className="actions">
        <button type="submit" disabled={!ready}>
          Save the answer
        </button>
        <button type="button" onClick={onCancel}>
          Never mind
        </button>
      </div>
    </form>
  );
}

/** Under a refusal: what became of the question, and what can be done about it. */
function ConsultLine({
  name,
  culture,
  record,
  open,
  sealed,
  curtain,
  busy,
  asking,
  answering,
  heard,
  failure,
  question,
  on,
}: {
  name: string;
  culture: Culture;
  record: ConsultRecord | undefined;
  /** The open culture, where the owner may answer as the shaman. */
  open: boolean;
  sealed: boolean;
  curtain: boolean;
  busy: boolean;
  /** The spirits are being asked this question now. */
  asking: boolean;
  answering: boolean;
  /** A later reply in this conversation already drew on the answer. */
  heard: boolean;
  failure: AskFailure | null;
  question: string;
  on: { spirits: () => void; shaman: () => void; save: (answer: { statement: string; topic: string; say: Say }) => void; cancel: () => void; again: () => void };
}) {
  const outcome = record?.outcome;
  const choices = (again: boolean, spirits = true) => (
    <div className="actions">
      {spirits && (
        <button type="button" disabled={busy} onClick={on.spirits}>
          {again ? "Ask the spirits again" : "Ask the spirits"}
        </button>
      )}
      {open && (
        <button type="button" disabled={busy} onClick={on.shaman}>
          Answer as the shaman
        </button>
      )}
    </div>
  );

  return (
    <div className="consult">
      {asking ? (
        <p className="stage">The spirits are asked…</p>
      ) : answering ? (
        <ShamanForm question={question} onSave={on.save} onCancel={on.cancel} />
      ) : outcome?.status === "answered" ? (
        <>
          <p className="stage">{WENT_TO_ASK[outcome.by](name)}</p>
          {curtain &&
            (sealed ? (
              <div className="curtain">
                <p>What was added is hidden until you reveal the culture.</p>
              </div>
            ) : (
              <div className="curtain">
                <p>
                  Added to the culture: {outcome.entry.statement} <span className="tag">{SAY_LABEL[outcome.entry.say]}</span>
                  <Provenance entry={outcome.entry} />
                </p>
              </div>
            ))}
          {!heard && (
            <button type="button" disabled={busy} onClick={on.again}>
              Ask {name} again
            </button>
          )}
        </>
      ) : outcome?.status === "settled" ? (
        <>
          <p className="stage">The spirits say this is already known here. {settledWords(culture, outcome.entries)}</p>
          {open && choices(false, false)}
        </>
      ) : outcome?.status === "silent" ? (
        <>
          <p className="stage">The spirits were silent.</p>
          {curtain &&
            (sealed ? (
              <div className="curtain">
                <p>Why is hidden until you reveal the culture.</p>
              </div>
            ) : (
              <div className="curtain">
                {outcome.discarded !== undefined && <p className="discarded">{outcome.discarded}</p>}
                <ul>
                  {outcome.reasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
            ))}
          {choices(true)}
        </>
      ) : (
        choices(false)
      )}
      {failure !== null && (
        <p role="alert" className="failure">
          {failure === "unreadable" ? SPIRITS_UNREADABLE : FAILURE_COPY[failure]("The spirits")}
        </p>
      )}
    </div>
  );
}

/** What a reply was based on, for "Behind the curtain". Entry text is hidden while a culture is sealed. */
function Curtain({ exchange, culture, sealed }: { exchange: Exchange; culture: Culture; sealed: boolean }) {
  const { record } = exchange;
  const entries = culture.entries.filter((e) => record.entries.includes(e.id));
  const myths = culture.myths.filter((m) => record.myths.includes(m.id));
  const redirect = culture.villagers.find((v) => v.id === record.redirect);
  const drawn = entries.length + myths.length;

  return (
    <div className="curtain">
      <p>
        <strong>{BASIS_COPY[record.basis]}</strong>
        {redirect ? `: ${redirect.name}` : ""} · answered on the {record.model} setting
      </p>
      {drawn > 0 && sealed && (
        <p>
          Drew on {entries.length} {entries.length === 1 ? "entry" : "entries"}
          {myths.length > 0 ? ` and ${myths.length} ${myths.length === 1 ? "story" : "stories"}` : ""}. Their text is hidden
          until you reveal the culture.
        </p>
      )}
      {drawn > 0 && !sealed && (
        <ul>
          {entries.map((entry) => (
            <li key={entry.id}>
              {entry.statement} <span className="tag">{SAY_LABEL[entry.say]}</span>
              <Provenance entry={entry} />
            </li>
          ))}
          {myths.map((myth) => (
            <li key={myth.id}>The story “{myth.title}”</li>
          ))}
        </ul>
      )}
      {record.question !== undefined && <p>Question for the shaman: {record.question}</p>}
      {record.personalFacts.length > 0 && <p>Made up about their own life: {record.personalFacts.join(" ")}</p>}
      {record.caught && (
        <div className="caught">
          <p>
            The villager's own reply was caught {record.caught.by === "rule" ? "by a rule" : "by the check"} and replaced with
            a fixed line.
          </p>
          {sealed ? (
            <p>What it said is hidden until you reveal the culture.</p>
          ) : (
            <>
              <p className="discarded">{record.caught.reply}</p>
              <ul>
                {record.caught.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Everything that is true in a culture, for reading before (open) or after (sealed) the conversations. */
function Truths({ culture, busy, onWithdraw }: { culture: Culture; busy: boolean; onWithdraw: (entry: CultureEntry) => void }) {
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  return (
    <div className="truths">
      <p>{culture.land}</p>
      <h3>Stories</h3>
      {culture.myths.map((myth) => (
        <section key={myth.id}>
          <h4>{myth.title}</h4>
          <p className="story">{myth.text}</p>
        </section>
      ))}
      <h3>What is true</h3>
      <ul>
        {culture.entries.map((entry) => (
          <li key={entry.id}>
            {entry.statement} <span className="tag">{SAY_LABEL[entry.say]}</span>
            {culture.heart.includes(entry.id) && <span className="tag heart">the heart</span>}
            <Provenance entry={entry} />
            {entry.origin.type === "consult" &&
              (withdrawing === entry.id ? (
                <span className="confirm">
                  {" "}
                  This takes it out of the culture. Nobody takes it back in character.{" "}
                  <button type="button" disabled={busy} onClick={() => (setWithdrawing(null), onWithdraw(entry))}>
                    Yes, withdraw it
                  </button>{" "}
                  <button type="button" onClick={() => setWithdrawing(null)}>
                    Leave it
                  </button>
                </span>
              ) : (
                <>
                  {" "}
                  <button type="button" className="small" disabled={busy} onClick={() => setWithdrawing(entry.id)}>
                    Withdraw
                  </button>
                </>
              ))}
          </li>
        ))}
      </ul>
      <h3>What an outsider sees</h3>
      <ul>
        {culture.customs.map((custom) => (
          <li key={custom.id}>
            <strong>{custom.name}.</strong> {custom.visible}
          </li>
        ))}
      </ul>
      <h3>The people</h3>
      <ul>
        {culture.villagers.map((villager) => (
          <li key={villager.id}>
            <strong>
              {villager.name}, {villager.role}, {villager.age}.
            </strong>{" "}
            {villager.slant} Knows {villager.knowsEntries.length} of {culture.entries.length} entries.
          </li>
        ))}
      </ul>
      <h3>What the culture leaves unsettled</h3>
      <ul>
        {culture.silences.map((silence) => (
          <li key={silence}>{silence}</li>
        ))}
      </ul>
    </div>
  );
}

/** A last line of defence: if something still cannot be drawn, say so instead of showing a blank page. */
class Safely extends Component<{ children: ReactNode }, { broken: boolean }> {
  state = { broken: false };
  static getDerivedStateFromError() {
    return { broken: true };
  }
  render() {
    if (!this.state.broken) return this.props.children;
    return (
      <main className="page">
        <h1>Villager trial</h1>
        <p role="alert">This page hit a problem it could not recover from. Reload it. If it happens again, tell Claude what you were doing.</p>
      </main>
    );
  }
}

export function App({ claude }: { claude: unknown }) {
  return (
    <Safely>
      <Trial claude={claude} />
    </Safely>
  );
}

function Trial({ claude }: { claude: unknown }) {
  // Both connections are made once. Sending a line waits for them, so nothing is lost if the visitor is quick.
  const askRef = useRef<Promise<Ask | null> | null>(null);
  const storeRef = useRef<Promise<TrialStore> | null>(null);
  askRef.current ??= connectAsk(claude);
  storeRef.current ??= connectStore(claude, CULTURES);

  const [saved, setSaved] = useState<Saved>({ conversations: {}, flags: [], revealed: [], consults: [] });
  const [loaded, setLoaded] = useState(false);
  const [durable, setDurable] = useState(true);
  const [cultureId, setCultureId] = useState(OPEN_CULTURE);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [speed, setSpeed] = useState<ModelClass>("balanced");
  const [curtain, setCurtain] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<AskFailure | null>(null);
  const [flagging, setFlagging] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [unread, setUnread] = useState(false);
  const [confirming, setConfirming] = useState<"reveal" | "clear" | null>(null);
  const [saveProblem, setSaveProblem] = useState(false);
  /** The question the spirits are being asked now, by its consult id. */
  const [consulting, setConsulting] = useState<string | null>(null);
  /** The question the owner is answering as the shaman. */
  const [answering, setAnswering] = useState<string | null>(null);
  const [consultFailure, setConsultFailure] = useState<{ id: string; code: AskFailure } | null>(null);

  useEffect(() => {
    let cancelled = false;
    storeRef.current!.then(async (store) => {
      const { ok, ...data } = await store.load();
      if (cancelled) return;
      if (!ok) {
        // What is saved could not be read, so this visit keeps to memory and writes over nothing.
        storeRef.current = Promise.resolve(memoryStore());
        setUnread(true);
      }
      setDurable(store.durable && ok);
      setSaved(data);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Each culture as it now stands: as written, plus every answer the spirits or the shaman have given.
  const cultures = useMemo(() => CULTURES.map((base) => withAdditions(base, saved.consults)), [saved.consults]);
  const culture = cultures.find((c) => c.id === cultureId)!;
  const villager = culture.villagers.find((v) => v.id === chosen[cultureId]) ?? culture.villagers[0]!;
  const key = `${culture.id}/${villager.id}`;
  const state = saved.conversations[key] ?? emptyState();
  const sealed = culture.id !== OPEN_CULTURE && !saved.revealed.includes(culture.id);
  const questions = useMemo(
    () =>
      culture.villagers.flatMap((v) =>
        shamanQuestions((saved.conversations[`${culture.id}/${v.id}`] ?? emptyState()).history).map((q) => ({
          ...q,
          asker: v.name,
          consult: findConsult(saved.consults, { cultureId: culture.id, villagerId: v.id, question: q.question }),
        })),
      ),
    [culture, saved.conversations, saved.consults],
  );
  // One thing at a time: a reply on its way, or a question with the spirits.
  const busy = pending !== null || consulting !== null;
  const store = async () => (await storeRef.current) ?? memoryStore();
  const saving = (work: Promise<void>) => work.catch(() => setSaveProblem(true));

  const send = async (line: string) => {
    const text = line.trim();
    if (text === "" || busy) return;
    setPending(text);
    setFailure(null);
    try {
      const ask = await askRef.current;
      if (!ask) throw new AskError("unavailable");
      const result = await villagerTurn({ ask }, { culture, villagerId: villager.id, state, line: text, model: speed });
      setSaved((before) => ({ ...before, conversations: { ...before.conversations, [key]: result.state } }));
      setDraft("");
      void saving((await store()).saveConversation(key, result.state));
    } catch (error) {
      // The typed line stays in the box. Nothing is sent again until the visitor asks.
      setFailure(error instanceof AskError ? error.code : error instanceof VillagerTurnError ? "unreadable" : "failed");
    } finally {
      setPending(null);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send(draft);
  };

  // A mark belongs to the reply it was made on, not to its place in the list, and comes back with the saved marks.
  const isMarked = (exchange: Exchange) =>
    saved.flags.some(
      (flag) => flag.cultureId === culture.id && flag.villagerId === villager.id && flag.exchange.visitor === exchange.visitor && flag.exchange.reply === exchange.reply,
    );

  const saveFlag = async (index: number) => {
    const exchange = state.history[index]!;
    const flag = { at: new Date().toISOString(), cultureId: culture.id, villagerId: villager.id, exchange, note: note.trim() };
    setSaved((before) => ({ ...before, flags: [...before.flags, flag] }));
    setFlagging(null);
    setNote("");
    void saving((await store()).addFlag(flag));
  };

  /** The question a refusal raised, as the page files it. */
  const consultOf = (exchange: Exchange) => ({
    cultureId: culture.id,
    villagerId: villager.id,
    question: exchange.record.question ?? exchange.visitor,
  });

  const keepConsult = async (record: ConsultRecord) => {
    setSaved((before) => ({ ...before, consults: [...before.consults.filter((c) => consultId(c) !== consultId(record)), record] }));
    void saving((await store()).saveConsult(record));
  };

  const askTheSpirits = async (exchange: Exchange) => {
    if (busy) return;
    const which = consultOf(exchange);
    const id = consultId(which);
    setConsulting(id);
    setConsultFailure(null);
    setAnswering(null);
    try {
      const ask = await askRef.current;
      if (!ask) throw new AskError("unavailable");
      const outcome = await askSpirits(
        { ask },
        {
          culture,
          consult: { villagerId: which.villagerId, question: which.question, visitorLine: exchange.visitor },
          // What the spirits say is kept for good, so they are never asked on the quickest setting.
          model: speed === "quick" ? "balanced" : speed,
          entryId: answerId(which),
        },
      );
      await keepConsult({
        ...which,
        at: new Date().toISOString(),
        outcome:
          outcome.status === "answered"
            ? { status: "answered", by: "spirits", entry: outcome.entry }
            : outcome.status === "settled"
              ? { status: "settled", entries: outcome.entries }
              : { status: "silent", reasons: outcome.reasons, ...(outcome.discarded === undefined ? {} : { discarded: outcome.discarded }) },
      });
    } catch (error) {
      // Nothing was kept. Nothing is asked again until the owner asks.
      setConsultFailure({ id, code: error instanceof AskError ? error.code : error instanceof VillagerTurnError ? "unreadable" : "failed" });
    } finally {
      setConsulting(null);
    }
  };

  const answerAsShaman = async (exchange: Exchange, answer: { statement: string; topic: string; say: Say }) => {
    if (busy) return;
    const which = consultOf(exchange);
    const entry = consultEntry(
      culture,
      { villagerId: which.villagerId, question: which.question, visitorLine: exchange.visitor },
      { by: "shaman", kind: "fact", ...answer },
      answerId(which),
    );
    setAnswering(null);
    setConsultFailure(null);
    await keepConsult({ ...which, at: new Date().toISOString(), outcome: { status: "answered", by: "shaman", entry } });
  };

  /** On this bench, withdrawing an answer simply takes it out of the culture. */
  const withdraw = async (entry: CultureEntry) => {
    const record = saved.consults.find((c) => c.cultureId === culture.id && c.outcome.status === "answered" && c.outcome.entry.id === entry.id);
    if (!record || busy) return;
    setSaved((before) => ({ ...before, consults: before.consults.filter((c) => consultId(c) !== consultId(record)) }));
    void saving((await store()).removeConsult(record));
  };

  const reveal = async () => {
    setConfirming(null);
    setSaved((before) => ({ ...before, revealed: [...before.revealed, culture.id] }));
    void saving((await store()).setRevealed(culture.id));
  };

  const clear = async () => {
    setConfirming(null);
    setFailure(null);
    setSaved((before) => {
      const conversations = { ...before.conversations };
      delete conversations[key];
      return { ...before, conversations };
    });
    void saving((await store()).clearConversation(key));
  };

  const switchTo = (change: () => void) => {
    if (busy) return;
    change();
    setFailure(null);
    setAnswering(null);
    setConsultFailure(null);
    setFlagging(null);
    setConfirming(null);
    setDraft("");
  };

  return (
    <main className="page">
      <header>
        <h1>Villager trial</h1>
        <p className="lede">
          Talk to the people of two invented cultures. They should speak from inside their own ways, never explain what
          anything means, and refuse to make up what their culture does not settle. Try to catch them out.
        </p>
      </header>

      <section className="controls" aria-label="Settings">
        <fieldset>
          <legend>Culture</legend>
          {CULTURES.map((c) => (
            <label key={c.id}>
              <input type="radio" name="culture" id={`culture-${c.id}`} checked={c.id === cultureId} onChange={() => switchTo(() => setCultureId(c.id))} />
              {c.id === OPEN_CULTURE ? `${c.name} (open)` : saved.revealed.includes(c.id) ? `${c.name} (revealed)` : "The sealed culture"}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Speed</legend>
          {SPEEDS.map((s) => (
            <label key={s.id} title={s.hint}>
              <input type="radio" name="speed" id={`speed-${s.id}`} checked={speed === s.id} onChange={() => setSpeed(s.id)} />
              {s.label}
            </label>
          ))}
        </fieldset>
        <label className="toggle">
          <input type="checkbox" id="curtain" checked={curtain} onChange={(event) => setCurtain(event.target.checked)} />
          Behind the curtain
        </label>
      </section>

      <p className="hint">
        {culture.id === OPEN_CULTURE
          ? "Open: read “What is true here” below first, then see whether the villagers stay faithful to it."
          : sealed
            ? "Sealed: nothing is shown. Work out what these people believe from what they say, then reveal it."
            : "Revealed: you can now read what was true all along."}
      </p>

      <nav className="villagers" aria-label="Talk to">
        {culture.villagers.map((v) => (
          <button key={v.id} type="button" aria-pressed={v.id === villager.id} onClick={() => switchTo(() => setChosen((before) => ({ ...before, [cultureId]: v.id })))}>
            <span className="name">{v.name}</span>, {v.role}
          </button>
        ))}
      </nav>

      <section className="talk" aria-label={`Conversation with ${villager.name}`}>
        <div className="log" role="log" aria-live="polite">
          {!loaded && <p className="quiet">Looking for your earlier conversations…</p>}
          {loaded && state.history.length === 0 && pending === null && (
            <p className="quiet">
              {villager.name} is {villager.temperament}. Say something to begin.
            </p>
          )}
          {state.history.map((exchange, index) => (
            <article key={index} className="exchange">
              <p className="visitor">
                <span className="who">You</span> {exchange.visitor}
              </p>
              <p className="reply">
                <span className="who">{villager.name}</span> {exchange.reply}
              </p>
              {curtain && <Curtain exchange={exchange} culture={culture} sealed={sealed} />}
              {exchange.record.basis === "deferral" &&
                (() => {
                  const which = consultOf(exchange);
                  const id = consultId(which);
                  const record = findConsult(saved.consults, which);
                  const added = record?.outcome.status === "answered" ? record.outcome.entry.id : null;
                  return (
                    <ConsultLine
                      name={villager.name}
                      culture={culture}
                      record={record}
                      open={culture.id === OPEN_CULTURE}
                      sealed={sealed}
                      curtain={curtain}
                      busy={busy}
                      asking={consulting === id}
                      answering={answering === id}
                      heard={added !== null && state.history.slice(index + 1).some((later) => later.record.entries.includes(added))}
                      failure={consultFailure?.id === id ? consultFailure.code : null}
                      question={which.question}
                      on={{
                        spirits: () => void askTheSpirits(exchange),
                        shaman: () => (setAnswering(id), setConsultFailure(null)),
                        save: (answer) => void answerAsShaman(exchange, answer),
                        cancel: () => setAnswering(null),
                        // The visitor's own question, asked again as an ordinary turn.
                        again: () => (setDraft(exchange.visitor), void send(exchange.visitor)),
                      }}
                    />
                  );
                })()}
              <div className="marks">
                {isMarked(exchange) ? (
                  <span className="quiet">Marked as wrong</span>
                ) : flagging === index ? (
                  <form
                    className="flag"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveFlag(index);
                    }}
                  >
                    <label htmlFor={`note-${index}`}>What is wrong with it?</label>
                    <textarea id={`note-${index}`} rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
                    <button type="submit">Save the mark</button>
                    <button type="button" onClick={() => setFlagging(null)}>
                      Never mind
                    </button>
                  </form>
                ) : (
                  <button type="button" className="link" onClick={() => (setFlagging(index), setNote(""))}>
                    That's wrong
                  </button>
                )}
              </div>
            </article>
          ))}
          {pending !== null && (
            <article className="exchange">
              <p className="visitor">
                <span className="who">You</span> {pending}
              </p>
              <p className="reply quiet">{villager.name} is thinking…</p>
            </article>
          )}
        </div>

        {failure !== null && (
          <div role="alert" className="failure">
            <p>{FAILURE_COPY[failure](villager.name)}</p>
            <button type="button" onClick={() => void send(draft)}>
              Try again
            </button>
          </div>
        )}

        <form className="say" onSubmit={submit}>
          <input
            id="say"
            type="text"
            autoComplete="off"
            aria-label={`Say something to ${villager.name}`}
            placeholder={`Say something to ${villager.name}…`}
            value={draft}
            disabled={busy || !loaded}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" disabled={busy || !loaded || draft.trim() === ""}>
            Say it
          </button>
        </form>
      </section>

      <details className="panel">
        <summary>Questions for the shaman ({questions.length})</summary>
        {questions.length === 0 ? (
          <p className="quiet">
            When a villager refuses to invent an answer, the question is listed here. Under the refusal you can send it to the spirits
            {culture.id === OPEN_CULTURE ? ", or answer it yourself as the shaman." : "."}
          </p>
        ) : (
          <ul aria-label="Questions for the shaman">
            {questions.map((q, index) => (
              <li key={index}>
                {q.question} <span className="tag">{q.asker}</span>
                {q.raisedByCatch && <span className="tag">raised by a catch</span>}
                <span className="tag">
                  {q.consult === undefined
                    ? "open"
                    : q.consult.outcome.status === "answered"
                      ? `answered by the ${q.consult.outcome.by}`
                      : q.consult.outcome.status === "settled"
                        ? `already known here. ${settledWords(culture, q.consult.outcome.entries)}`
                        : "the spirits were silent"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </details>

      {!sealed && (
        <details className="panel">
          <summary>What is true here</summary>
          <Truths culture={culture} busy={busy} onWithdraw={(entry) => void withdraw(entry)} />
        </details>
      )}

      <section className="actions">
        {sealed &&
          (confirming === "reveal" ? (
            <span>
              This ends the blind play for good.{" "}
              <button type="button" onClick={() => void reveal()}>
                Yes, reveal it
              </button>{" "}
              <button type="button" onClick={() => setConfirming(null)}>
                Keep playing
              </button>
            </span>
          ) : (
            <button type="button" disabled={busy} onClick={() => setConfirming("reveal")}>
              End the blind play and reveal
            </button>
          ))}
        {state.history.length > 0 &&
          (confirming === "clear" ? (
            <span>
              This forgets everything {villager.name} has said to you.{" "}
              <button type="button" disabled={busy} onClick={() => void clear()}>
                Yes, clear it
              </button>{" "}
              <button type="button" onClick={() => setConfirming(null)}>
                Keep it
              </button>
            </span>
          ) : (
            <button type="button" disabled={busy} onClick={() => setConfirming("clear")}>
              Start over with {villager.name}
            </button>
          ))}
      </section>

      <footer>
        {unread && (
          <p role="status">
            Your earlier conversations could not be loaded. Nothing from this visit will be saved, so nothing of yours is written over.
            Reload the page to try again.
          </p>
        )}
        <p>{durable ? SAVED_NOTE : "Nothing can be saved in this view, so conversations last only until you close the page."}</p>
        {saveProblem && <p role="status">The last change could not be saved. It is still on this screen.</p>}
        <p>
          Each reply is two requests to Claude on your own account: one to answer, one to check the answer. Asking the spirits is two
          more.
        </p>
      </footer>
    </main>
  );
}
