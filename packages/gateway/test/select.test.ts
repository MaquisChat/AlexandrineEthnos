import { expect, it } from "vitest";
import { selectProvider } from "../src";

it("defaults to the fake provider", () => expect(selectProvider({}).name).toBe("fake"));
it("the default fake echoes, so a development run always answers", async () => {
  const r = await selectProvider({ AI_PROVIDER: "fake" }).complete({
    job: "villager",
    system: "",
    messages: [{ role: "user", content: "hello" }],
    maxTokens: 10,
    model: "m",
  });
  expect(r.text).toBe("[fake] hello");
});
it("selects login", () => expect(selectProvider({ AI_PROVIDER: "login" }).name).toBe("login"));
it("rejects unknown names and names the accepted ones", () =>
  expect(() => selectProvider({ AI_PROVIDER: "key" })).toThrowError(/fake.*login.*M1/s));
