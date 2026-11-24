import { type Culture, parseCulture } from "@fieldwork/contracts";
import {
  type Ask,
  emptyState,
  type Exchange,
  type ModelClass,
  shamanQuestions,
  villagerTurn,
  VillagerTurnError,
} from "@fieldwork/villagers";
import { Component, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import heronJson from "../../../content/cultures/heron.culture.json";
import sealedJson from "../../../content/cultures/sealed.culture.json";
import { BASIS_COPY, FAILURE_COPY, SAVED_NOTE, SPEEDS } from "./copy";
import { AskError, type AskFailure, connectAsk } from "./runtime";
import { connectStore, memoryStore, type Saved, type TrialStore } from "./store";

const CULTURES: Culture[] = [parseCulture(heronJson), parseCulture(sealedJson)];
/** The culture whose truths can be read from the start. The other is played blind. */
const OPEN_CULTURE = "heron";

const SAY_LABEL = { anyone: "anyone may say it", earned: "earned", shown: "never said" } as const;

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
function Truths({ culture }: { culture: Culture }) {
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

  const [saved, setSaved] = useState<Saved>({ conversations: {}, flags: [], revealed: [] });
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

  const culture = CULTURES.find((c) => c.id === cultureId)!;
  const villager = culture.villagers.find((v) => v.id === chosen[cultureId]) ?? culture.villagers[0]!;
  const key = `${culture.id}/${villager.id}`;
  const state = saved.conversations[key] ?? emptyState();
  const sealed = culture.id !== OPEN_CULTURE && !saved.revealed.includes(culture.id);
  const questions = useMemo(
    () => culture.villagers.flatMap((v) => shamanQuestions((saved.conversations[`${culture.id}/${v.id}`] ?? emptyState()).history).map((q) => ({ ...q, asker: v.name }))),
    [culture, saved.conversations],
  );
  const store = async () => (await storeRef.current) ?? memoryStore();
  const saving = (work: Promise<void>) => work.catch(() => setSaveProblem(true));

  const send = async (line: string) => {
    const text = line.trim();
    if (text === "" || pending !== null) return;
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
    if (pending !== null) return;
    change();
    setFailure(null);
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
            disabled={pending !== null || !loaded}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" disabled={pending !== null || !loaded || draft.trim() === ""}>
            Say it
          </button>
        </form>
      </section>

      <details className="panel">
        <summary>Questions for the shaman ({questions.length})</summary>
        {questions.length === 0 ? (
          <p className="quiet">When a villager refuses to invent an answer, the question is listed here. Nothing answers them yet.</p>
        ) : (
          <ul aria-label="Questions for the shaman">
            {questions.map((q, index) => (
              <li key={index}>
                {q.question} <span className="tag">{q.asker}</span>
                {q.raisedByCatch && <span className="tag">raised by a catch</span>}
              </li>
            ))}
          </ul>
        )}
      </details>

      {!sealed && (
        <details className="panel">
          <summary>What is true here</summary>
          <Truths culture={culture} />
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
            <button type="button" disabled={pending !== null} onClick={() => setConfirming("reveal")}>
              End the blind play and reveal
            </button>
          ))}
        {state.history.length > 0 &&
          (confirming === "clear" ? (
            <span>
              This forgets everything {villager.name} has said to you.{" "}
              <button type="button" disabled={pending !== null} onClick={() => void clear()}>
                Yes, clear it
              </button>{" "}
              <button type="button" onClick={() => setConfirming(null)}>
                Keep it
              </button>
            </span>
          ) : (
            <button type="button" disabled={pending !== null} onClick={() => setConfirming("clear")}>
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
        <p>Each reply is two requests to Claude on your own account: one to answer, one to check the answer.</p>
      </footer>
    </main>
  );
}
