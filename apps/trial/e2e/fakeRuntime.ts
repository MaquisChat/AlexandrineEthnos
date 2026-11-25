// A stand-in for the claude.ai page runtime, injected before the page loads.
// It answers from a script and keeps its "database" in localStorage so it survives a reload.
export interface FakeScript {
  answers?: unknown[];
  verdicts?: unknown[];
  /** What the spirits return, in order, and what their check returns (clean when the list runs out). */
  spirits?: unknown[];
  spiritVerdicts?: unknown[];
  /** The runtime error code every call rejects with, until the test clears it. */
  failWith?: string | null;
  /** No window.claude at all. */
  noRuntime?: boolean;
  delayMs?: number;
  /** Every database read waits this long. */
  dbDelayMs?: number;
  /** Every database read is refused. Writes still work, so a test can see whether the page wrote. */
  dbFails?: boolean;
  db?: Record<string, Record<string, unknown>>;
}

declare global {
  interface Window {
    __fake: { calls: string[]; failWith: string | null; db: () => Record<string, Record<string, unknown>> };
  }
}

export function installFakeClaude(script: FakeScript): void {
  const KEY = "fake-db";
  const read = (): Record<string, Record<string, unknown>> => JSON.parse(localStorage.getItem(KEY) ?? "null") ?? script.db ?? {};
  const write = (docs: Record<string, Record<string, unknown>>) => localStorage.setItem(KEY, JSON.stringify(docs));
  if (localStorage.getItem(KEY) === null && script.db) write(script.db);

  const answers = [...(script.answers ?? [])];
  const verdicts = [...(script.verdicts ?? [])];
  const spirits = [...(script.spirits ?? [])];
  const spiritVerdicts = [...(script.spiritVerdicts ?? [])];
  window.__fake = { calls: [], failWith: script.failWith ?? null, db: read };
  if (script.noRuntime) return;

  const json = async (input: { role: string; content: string }[]) => {
    // A request is told apart by how its standing instructions begin.
    const start = input[0]!.content;
    const purpose = start.startsWith("You are checking one new statement")
      ? "spirits_check"
      : start.startsWith("You are checking")
        ? "check"
        : start.startsWith("You are the spirits")
          ? "spirits"
          : "answer";
    window.__fake.calls.push(purpose);
    if (script.delayMs) await new Promise((resolve) => setTimeout(resolve, script.delayMs));
    if (window.__fake.failWith) throw { code: window.__fake.failWith, message: "scripted failure" };
    if (purpose === "check") return verdicts.length > 0 ? verdicts.shift() : { unsupported: [], explains: [], earned: [] };
    if (purpose === "spirits_check") return spiritVerdicts.length > 0 ? spiritVerdicts.shift() : { contradicts: [], explains: [], unfit: [] };
    if (purpose === "spirits") {
      if (spirits.length === 0) throw { code: "upstream_error", message: "the script has no more spirit answers" };
      return spirits.shift();
    }
    if (answers.length === 0) throw { code: "upstream_error", message: "the script has no more answers" };
    return answers.shift();
  };
  const beforeRead = async () => {
    if (script.dbDelayMs) await new Promise((resolve) => setTimeout(resolve, script.dbDelayMs));
    if (script.dbFails) throw { code: "unavailable", message: "scripted failure" };
  };
  const doc = (path: string) => ({
    get: async () => (await beforeRead(), { id: path.split("/").at(-1), exists: path in read(), data: () => read()[path] }),
    set: async (data: Record<string, unknown>) => write({ ...read(), [path]: data }),
    delete: async () => {
      const docs = read();
      delete docs[path];
      write(docs);
    },
  });
  const db = {
    doc,
    collection: (name: string) => ({
      doc: (id: string) => doc(`${name}/${id}`),
      get: async () => (await beforeRead(), {
        docs: Object.entries(read())
          .filter(([path]) => path.startsWith(`${name}/`))
          .map(([path, data]) => ({ id: path.slice(name.length + 1), exists: true, data: () => data })),
      }),
    }),
  };
  (window as unknown as { claude: unknown }).claude = {
    use: async (name: string) => (name === "sample" ? Object.assign(async () => ({ text: "" }), { json }) : name === "db" ? db : null),
  };
}
