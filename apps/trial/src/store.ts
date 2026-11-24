// Where the trial keeps conversations, marks, reveals and answered questions: the page's database when there is one,
// otherwise memory. Saved data is the owner's own; the builder can read it back when asked.
import { type Culture, CultureEntrySchema } from "@fieldwork/contracts";
import { BASES, type Exchange, type VillagerState } from "@fieldwork/villagers";
import { type ConsultRecord, consultId } from "./consults";

/** A reply the owner marked as wrong. */
export interface Flag {
  at: string;
  cultureId: string;
  villagerId: string;
  exchange: Exchange;
  note: string;
}

export interface Saved {
  /** By "<cultureId>/<villagerId>". */
  conversations: Record<string, VillagerState>;
  flags: Flag[];
  /** Ids of cultures whose blind play has been ended. */
  revealed: string[];
  /** What became of each question carried to the shaman: at most one outcome per question per villager. */
  consults: ConsultRecord[];
}

/** What was loaded. `ok` is false when the saved data could not be read, in which case it must not be written over. */
export type Loaded = Saved & { ok: boolean };

export interface TrialStore {
  /** False when nothing outlives this visit. */
  readonly durable: boolean;
  load(): Promise<Loaded>;
  saveConversation(key: string, state: VillagerState): Promise<void>;
  clearConversation(key: string): Promise<void>;
  addFlag(flag: Flag): Promise<void>;
  setRevealed(cultureId: string): Promise<void>;
  /** Replaces any earlier outcome for the same question from the same villager. */
  saveConsult(record: ConsultRecord): Promise<void>;
  removeConsult(record: ConsultRecord): Promise<void>;
}

const empty = (): Saved => ({ conversations: {}, flags: [], revealed: [], consults: [] });

export function memoryStore(): TrialStore {
  const saved = empty();
  return {
    durable: false,
    load: async () => ({
      conversations: { ...saved.conversations },
      flags: [...saved.flags],
      revealed: [...saved.revealed],
      consults: [...saved.consults],
      ok: true,
    }),
    saveConversation: async (key, state) => void (saved.conversations[key] = state),
    clearConversation: async (key) => void delete saved.conversations[key],
    addFlag: async (flag) => void saved.flags.push(flag),
    setRevealed: async (id) => void (saved.revealed.includes(id) || saved.revealed.push(id)),
    saveConsult: async (record) => void (saved.consults = [...saved.consults.filter((c) => consultId(c) !== consultId(record)), record]),
    removeConsult: async (record) => void (saved.consults = saved.consults.filter((c) => consultId(c) !== consultId(record))),
  };
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");

const MODELS = ["quick", "balanced", "careful"];
const optionalText = (value: unknown) => value === undefined || typeof value === "string";

function isCaught(value: unknown): boolean {
  if (value === undefined) return true;
  return isObject(value) && (value.by === "rule" || value.by === "model") && typeof value.reply === "string" && isStrings(value.reasons);
}

/** Every field the page will later show or act on is checked, so one damaged record cannot break the page. */
function isExchange(value: unknown): value is Exchange {
  if (!isObject(value) || typeof value.visitor !== "string" || typeof value.reply !== "string") return false;
  const record = value.record;
  return (
    isObject(record) &&
    BASES.includes(record.basis as never) &&
    isStrings(record.entries) &&
    isStrings(record.myths) &&
    isStrings(record.personalFacts) &&
    MODELS.includes(record.model as string) &&
    optionalText(record.question) &&
    optionalText(record.redirect) &&
    isCaught(record.caught)
  );
}

function isState(value: unknown): value is VillagerState {
  return isObject(value) && Array.isArray(value.history) && value.history.every(isExchange) && isStrings(value.personalFacts);
}

/** A saved outcome is used only if every part the page will show or build on is sound. */
function isConsult(value: unknown): value is ConsultRecord {
  if (!isObject(value) || typeof value.question !== "string" || value.question === "" || typeof value.at !== "string") return false;
  const outcome = value.outcome;
  if (!isObject(outcome)) return false;
  if (outcome.status === "settled") return isStrings(outcome.entries);
  if (outcome.status === "silent") return isStrings(outcome.reasons) && optionalText(outcome.discarded);
  if (outcome.status !== "answered") return false;
  const entry = CultureEntrySchema.safeParse(outcome.entry);
  return (
    entry.success &&
    entry.data.origin.type === "consult" &&
    entry.data.origin.askedBy === value.villagerId &&
    entry.data.origin.by === outcome.by
  );
}

interface Doc {
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
}
interface Db {
  doc(path: string): Doc;
  collection(name: string): { doc(id: string): Doc; get(): Promise<{ docs: { id: string; data(): Record<string, unknown> | undefined }[] }> };
}

const LOAD_LIMIT_MS = 10_000;
const docId = (key: string) => key.replace("/", "__");

function dbStore(db: Db, cultures: Culture[]): TrialStore {
  const known = (cultureId: unknown, villagerId: unknown) =>
    cultures.some((c) => c.id === cultureId && c.villagers.some((v) => v.id === villagerId));

  const read = async (): Promise<Saved> => {
    const saved = empty();
    const [conversations, flags, revealed, consults] = await Promise.all([
      db.collection("conversations").get(),
      db.collection("flags").get(),
      db.doc("meta/revealed").get(),
      db.collection("consults").get(),
    ]);
    for (const doc of conversations.docs) {
      const data = doc.data();
      // Anything that no longer fits (a villager that is gone, a damaged record) is skipped, not fatal.
      if (!data || !known(data.cultureId, data.villagerId) || !isState(data.state)) continue;
      saved.conversations[`${data.cultureId}/${data.villagerId}`] = data.state;
    }
    for (const doc of flags.docs) {
      const data = doc.data();
      if (data && typeof data.note === "string" && typeof data.at === "string" && known(data.cultureId, data.villagerId) && isExchange(data.exchange)) {
        saved.flags.push(data as unknown as Flag);
      }
    }
    for (const doc of consults.docs) {
      const data = doc.data();
      if (data && known(data.cultureId, data.villagerId) && isConsult(data)) saved.consults.push(data);
    }
    const ids = revealed.exists ? revealed.data()?.cultures : [];
    if (Array.isArray(ids)) saved.revealed = ids.filter((id): id is string => cultures.some((c) => c.id === id));
    return saved;
  };

  // One write at a time per document, in the order asked, as the database requires.
  const tails = new Map<string, Promise<void>>();
  const inOrder = (path: string, write: () => Promise<void>): Promise<void> => {
    const next = (tails.get(path) ?? Promise.resolve()).catch(() => {}).then(write);
    tails.set(path, next);
    return next;
  };
  const unread = (): Loaded => ({ ...empty(), ok: false });

  return {
    durable: true,
    // A store that cannot be read, or does not answer in time, loads as empty and says so: the page still
    // works, and the caller must then not write over what was never read.
    load: () =>
      Promise.race([
        read().then((saved): Loaded => ({ ...saved, ok: true })),
        new Promise<Loaded>((resolve) => setTimeout(() => resolve(unread()), LOAD_LIMIT_MS)),
      ]).catch(unread),
    saveConversation: (key, state) => {
      const [cultureId, villagerId] = key.split("/");
      const path = `conversations/${docId(key)}`;
      return inOrder(path, () => db.doc(path).set({ cultureId, villagerId, state, updatedAt: new Date().toISOString() } as Record<string, unknown>));
    },
    clearConversation: (key) => {
      const path = `conversations/${docId(key)}`;
      return inOrder(path, () => db.doc(path).delete());
    },
    addFlag: (flag) =>
      db
        .collection("flags")
        .doc(`f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`)
        .set(flag as unknown as Record<string, unknown>),
    saveConsult: (record) => {
      const path = `consults/${consultId(record)}`;
      return inOrder(path, () => db.doc(path).set(record as unknown as Record<string, unknown>));
    },
    removeConsult: (record) => {
      const path = `consults/${consultId(record)}`;
      return inOrder(path, () => db.doc(path).delete());
    },
    setRevealed: (cultureId) =>
      inOrder("meta/revealed", async () => {
        const current = await db.doc("meta/revealed").get();
        const before = current.exists ? current.data()?.cultures : [];
        const ids = Array.isArray(before) ? before.filter((id): id is string => typeof id === "string") : [];
        if (!ids.includes(cultureId)) await db.doc("meta/revealed").set({ cultures: [...ids, cultureId] });
      }),
  };
}

/** The database-backed store when the page runtime offers one, otherwise memory. */
export async function connectStore(claude: unknown, cultures: Culture[]): Promise<TrialStore> {
  try {
    const db = (await (claude as { use?: (name: string) => Promise<unknown> } | undefined)?.use?.("db")) as Db | null | undefined;
    if (db && typeof db.doc === "function" && typeof db.collection === "function") return dbStore(db, cultures);
  } catch {
    // fall through to memory
  }
  return memoryStore();
}
