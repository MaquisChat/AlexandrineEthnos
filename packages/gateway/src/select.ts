import { FakeProvider } from "./fake";
import { LoginProvider } from "./login";
import type { AiProvider } from "./types";

/** Chooses the provider from the AI_PROVIDER environment variable. The default costs nothing and needs no network. */
export function selectProvider(env: Record<string, string | undefined>): AiProvider {
  const name = env.AI_PROVIDER ?? "fake";
  if (name === "fake") {
    return new FakeProvider([{ reply: (req) => `[fake] ${req.messages.findLast((m) => m.role === "user")?.content ?? ""}` }]);
  }
  if (name === "login") return new LoginProvider();
  throw new Error(
    `AI_PROVIDER is "${name}". Accepted values are "fake" and "login". The key provider arrives in M1.`,
  );
}
