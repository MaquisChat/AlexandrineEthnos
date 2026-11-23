import type { AiJob, ProviderName } from "./types";

export interface UsageEntry {
  /** ISO 8601 time of the call. */
  at: string;
  job: AiJob;
  studyId?: string;
  provider: ProviderName;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface UsageLog {
  record(entry: UsageEntry): void;
  entries(): readonly UsageEntry[];
}

/** A usage log kept in memory. The service replaces it with a stored one. */
export function memoryUsageLog(): UsageLog {
  const list: UsageEntry[] = [];
  return {
    record: (entry) => void list.push(entry),
    entries: () => list,
  };
}
