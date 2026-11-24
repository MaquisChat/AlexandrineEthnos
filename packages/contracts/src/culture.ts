import { z } from "zod";

/** What kind of thing a culture entry records. */
export const ENTRY_KINDS = [
  "symbol_meaning",
  "value",
  "opposition",
  "prohibition",
  "obligation",
  "custom",
  "saying",
  "person",
  "place",
  "fact",
] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

/**
 * Who may say an entry aloud to a visitor.
 * "anyone": freely. "earned": only to a visitor who has earned it. "shown": never said; it shows in what people do.
 */
export type Say = "anyone" | "earned" | "shown";

export interface CultureMyth {
  id: string;
  title: string;
  text: string;
}

export interface CultureEntry {
  id: string;
  kind: EntryKind;
  /** A neutral label of a few words saying what the entry is about, without giving its content. */
  topic: string;
  /** What is true, as one plain sentence. */
  statement: string;
  origin: { type: "myth"; mythId: string } | { type: "gloss" };
  say: Say;
  variation?: string;
}

export interface CultureCustom {
  id: string;
  name: string;
  /** What an outsider would see. */
  visible: string;
  /** The entries that are the custom's reason. */
  reasons: string[];
}

export interface CultureVillager {
  id: string;
  name: string;
  role: string;
  age: number;
  temperament: string;
  /** True for someone who doubts the stories or tells them differently. */
  doubts: boolean;
  knowsEntries: string[];
  /** `version`, when present, is the author's shorter or partial telling and is all this villager knows of the myth. */
  knowsMyths: { mythId: string; version?: string }[];
  /** How this villager feels about the stories and what they tell differently, in the author's words. */
  slant: string;
  /** Shown without calling a model, when a reply has been caught. `redirect` contains {name}. */
  lines: { refusal: string; withholding: string; redirect: string };
}

export interface Culture {
  schemaVersion: 1;
  id: string;
  name: string;
  language: "en";
  land: string;
  myths: CultureMyth[];
  entries: CultureEntry[];
  customs: CultureCustom[];
  villagers: CultureVillager[];
  /** The entries the author most hopes will be understood. */
  heart: string[];
  /** Things the culture deliberately does not settle. Used by the checks; never shown to villagers. */
  silences: string[];
}

const id = z.string().min(1);
const text = z.string().min(1);

const shape = z.strictObject({
  schemaVersion: z.literal(1),
  id,
  name: text,
  language: z.literal("en"),
  land: text,
  myths: z.array(z.strictObject({ id, title: text, text })).min(1),
  entries: z
    .array(
      z.strictObject({
        id,
        kind: z.enum(ENTRY_KINDS),
        topic: text,
        statement: text,
        origin: z.union([
          z.strictObject({ type: z.literal("myth"), mythId: id }),
          z.strictObject({ type: z.literal("gloss") }),
        ]),
        say: z.enum(["anyone", "earned", "shown"]),
        variation: text.optional(),
      }),
    )
    .min(1),
  customs: z.array(z.strictObject({ id, name: text, visible: text, reasons: z.array(id) })),
  villagers: z
    .array(
      z.strictObject({
        id,
        name: text,
        role: text,
        age: z.number().int().positive(),
        temperament: text,
        doubts: z.boolean(),
        knowsEntries: z.array(id).min(1, "a villager must know at least one entry"),
        knowsMyths: z.array(z.strictObject({ mythId: id, version: text.optional() })),
        slant: text,
        lines: z.strictObject({
          refusal: text,
          withholding: text,
          redirect: z.string().regex(/\{name\}/, "must contain {name}, where the other villager's name goes"),
        }),
      }),
    )
    .min(1),
  heart: z.array(id),
  silences: z.array(text),
});

type Issue = { path: (string | number)[]; message: string };

/** Rules that link one part of a culture to another. JSON Schema cannot express these. */
function crossReferenceIssues(culture: Culture): Issue[] {
  const issues: Issue[] = [];
  const missing = (what: string, name: string) => `names ${what} that does not exist: "${name}"`;

  for (const [name, list] of Object.entries({
    myths: culture.myths,
    entries: culture.entries,
    customs: culture.customs,
    villagers: culture.villagers,
  })) {
    const seen = new Set<string>();
    list.forEach((item, index) => {
      if (seen.has(item.id)) issues.push({ path: [name, index, "id"], message: `duplicate id "${item.id}"` });
      seen.add(item.id);
    });
  }

  const myths = new Set(culture.myths.map((m) => m.id));
  const entries = new Set(culture.entries.map((e) => e.id));

  culture.entries.forEach((entry, i) => {
    if (entry.origin.type === "myth" && !myths.has(entry.origin.mythId)) {
      issues.push({ path: ["entries", i, "origin", "mythId"], message: missing("a myth", entry.origin.mythId) });
    }
  });
  culture.customs.forEach((custom, i) => {
    custom.reasons.forEach((reason, j) => {
      if (!entries.has(reason)) issues.push({ path: ["customs", i, "reasons", j], message: missing("an entry", reason) });
    });
  });
  culture.villagers.forEach((villager, i) => {
    villager.knowsEntries.forEach((entry, j) => {
      if (!entries.has(entry)) {
        issues.push({ path: ["villagers", i, "knowsEntries", j], message: missing("an entry", entry) });
      }
    });
    villager.knowsMyths.forEach((known, j) => {
      if (!myths.has(known.mythId)) {
        issues.push({ path: ["villagers", i, "knowsMyths", j, "mythId"], message: missing("a myth", known.mythId) });
      }
    });
  });
  culture.heart.forEach((entry, i) => {
    if (!entries.has(entry)) issues.push({ path: ["heart", i], message: missing("an entry", entry) });
  });
  return issues;
}

/** The culture format, without the cross-reference rules. This is what the published JSON Schema is made from. */
export const CultureShapeSchema: z.ZodType<Culture> = shape;

/** The full culture format. */
export const CultureSchema: z.ZodType<Culture> = shape.superRefine((culture, ctx) => {
  for (const issue of crossReferenceIssues(culture)) {
    ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
  }
});

export class CultureParseError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`Culture is not valid:\n${issues.join("\n")}`);
    this.name = "CultureParseError";
    this.issues = issues;
  }
}

/** Checks a value against the culture format and returns it typed. Throws CultureParseError listing every problem. */
export function parseCulture(input: unknown): Culture {
  const result = CultureSchema.safeParse(input);
  if (result.success) return result.data;
  throw new CultureParseError(
    result.error.issues.map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : "(root)"}: ${issue.message}`),
  );
}
