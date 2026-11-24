import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** The owner's ceiling on calls made through the login for this piece of work has been reached. */
export class CeilingReachedError extends Error {
  constructor(ceiling: number) {
    super(`The ceiling of ${ceiling} calls through the Claude login has been reached. Nothing more was sent.`);
    this.name = "CeilingReachedError";
  }
}

export interface CallCounter {
  used(): number;
  /** Counts one call. Throws CeilingReachedError, counting nothing, if the ceiling is already reached. */
  take(): void;
  readonly ceiling: number;
}

/** A counter that never stops anything, for providers that cost the owner nothing. */
export const noCounter: CallCounter = { used: () => 0, take: () => {}, ceiling: Infinity };

/** Counts calls in a small file so the tally survives between runs. */
export function fileCounter(path: string, ceiling: number): CallCounter {
  const read = (): number => {
    if (!existsSync(path)) return 0;
    try {
      const calls = (JSON.parse(readFileSync(path, "utf8")) as { calls?: unknown }).calls;
      return typeof calls === "number" && calls >= 0 ? calls : 0;
    } catch {
      return 0;
    }
  };
  return {
    ceiling,
    used: read,
    take() {
      const calls = read();
      if (calls >= ceiling) throw new CeilingReachedError(ceiling);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify({ calls: calls + 1, ceiling }) + "\n");
    },
  };
}
