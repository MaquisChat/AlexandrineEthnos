import type { Basis } from "@fieldwork/villagers";
import type { AskFailure } from "./runtime";

/** What to tell the visitor when a villager could not answer. `name` is the villager. */
export const FAILURE_COPY: Record<AskFailure, (name: string) => string> = {
  unavailable: () => "This page can only reach Claude when it is opened on claude.ai while you are signed in.",
  declined: () => "Claude is not allowed for this page. Allow it when asked, or check the page's permissions, then try again.",
  rate_limited: () => "Claude is busy, or you have reached a usage limit. Wait a little, then try again.",
  signed_out: () => "You have been signed out. Sign in again, then try again.",
  refused: () => "Claude declined to answer that. Try putting it another way.",
  unreadable: (name) => `${name} did not answer in a way this page could read. Try again.`,
  failed: () => "Something went wrong reaching Claude. Try again.",
};

export const BASIS_COPY: Record<Basis, string> = {
  small_talk: "small talk, nothing from the culture",
  canon: "from the culture",
  withheld: "withheld: known, but not for a stranger",
  redirect: "sent you to someone else",
  deferral: "refused to invent: the culture does not settle this",
};

export const SPEEDS = [
  { id: "quick", label: "Quick", hint: "fastest model, answers at once" },
  { id: "balanced", label: "Balanced", hint: "everyday model, a few seconds" },
  { id: "careful", label: "Careful", hint: "most capable model, slowest" },
] as const;

export const SAVED_NOTE =
  "What you type here is saved with this page, so your conversations are still here next time and so Claude can read them back when you ask it to. Only you can open this page.";
