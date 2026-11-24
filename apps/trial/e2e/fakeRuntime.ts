// A stand-in for the claude.ai page runtime, injected before the page loads.
// It answers from a script and keeps its "database" in localStorage so it survives a reload.
export interface FakeScript {
  answers?: unknown[];
  verdicts?: unknown[];
  /** The runtime error code every call rejects with, until the test clears it. */
  failWith?: string | null;
  /** No window.claude at all. */
  noRuntime?: boolean;
  delayMs?: number;
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
  window.__fake = { calls: [], failWith: script.failWith ?? null, db: read };
  if (script.noRuntime) return;

  const json = async (input: { role: string; content: string }[]) => {
    const purpose = input[0]!.content.startsWith("You are checking") ? "check" : "answer";
    window.__fake.calls.push(purpose);
    if (script.delayMs) await new Promise((resolve) => setTimeout(resolve, script.delayMs));
    if (window.__fake.failWith) throw { code: window.__fake.failWith, message: "scripted failure" };
    if (purpose === "check") return verdicts.length > 0 ? verdicts.shift() : { unsupported: [], explains: [], earned: [] };
    if (answers.length === 0) throw { code: "upstream_error", message: "the script has no more answers" };
    return answers.shift();
  };
  const doc = (path: string) => ({
    get: async () => ({ id: path.split("/").at(-1), exists: path in read(), data: () => read()[path] }),
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
      get: async () => ({
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
