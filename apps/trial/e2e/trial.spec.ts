import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { answerId } from "../src/ids";
import { type FakeScript, installFakeClaude } from "./fakeRuntime";

const canon = (over: Record<string, unknown> = {}) => ({
  reply: "The first fish goes to the heron. Then we eat.",
  basis: "canon",
  entries: ["h9"],
  myths: [],
  question: null,
  redirect: null,
  personalFacts: [],
  ...over,
});
const open = async (page: Page, script: FakeScript) => {
  await page.addInitScript(installFakeClaude, script);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Villager trial" })).toBeVisible();
};
const say = async (page: Page, line: string) => {
  const box = page.getByRole("textbox", { name: /^Say something to/ });
  await box.fill(line);
  await box.press("Enter");
};
const log = (page: Page) => page.getByRole("log");

test("a reply is shown only once it has been checked", async ({ page }) => {
  await open(page, { answers: [canon()], delayMs: 300 });
  await say(page, "Why does the heron eat first?");
  await expect(page.getByText("Maëlle is thinking…")).toBeVisible();
  await expect(log(page)).not.toContainText("The first fish goes to the heron.");
  await expect(log(page)).toContainText("The first fish goes to the heron. Then we eat.");
  expect(await page.evaluate(() => window.__fake.calls)).toEqual(["answer", "check"]);
  await expect(page.getByText("Maëlle is thinking…")).toHaveCount(0);
});

test("a refusal is listed as a question for the shaman", async ({ page }) => {
  await open(page, { answers: [canon({ basis: "deferral", entries: [], reply: "That I cannot tell you.", question: "What is done when a heron dies?" })] });
  await say(page, "What happens when a heron dies?");
  await expect(log(page)).toContainText("That I cannot tell you.");
  await page.getByText(/^Questions for the shaman \(1\)/).click();
  await expect(page.getByRole("list", { name: "Questions for the shaman" })).toContainText("What is done when a heron dies?");
});

test("a reply the check rejects is replaced, and the curtain shows what was caught", async ({ page }) => {
  await open(page, { answers: [canon({ reply: "We also burn the bones at midwinter." })], verdicts: [{ unsupported: ["burning bones"], explains: [], earned: [] }] });
  await say(page, "What else do you do?");
  await expect(log(page)).toContainText("That is for the shaman to say. I mend nets.");
  await expect(log(page)).not.toContainText("burn the bones");
  await page.getByRole("checkbox", { name: "Behind the curtain" }).check();
  await expect(log(page)).toContainText("We also burn the bones at midwinter.");
  await expect(log(page)).toContainText("refused to invent");
});

test("the curtain names what a reply drew on in the open culture", async ({ page }) => {
  await open(page, { answers: [canon()] });
  await say(page, "Why does the heron eat first?");
  await page.getByRole("checkbox", { name: "Behind the curtain" }).check();
  await expect(log(page)).toContainText("from the culture");
  await expect(log(page)).toContainText("The first fish of every catch is carried to the post");
});

test("marking a reply as wrong saves it with the note", async ({ page }) => {
  await open(page, { answers: [canon()] });
  await say(page, "Why does the heron eat first?");
  await page.getByRole("button", { name: "That's wrong" }).click();
  await page.getByRole("textbox", { name: "What is wrong with it?" }).fill("Too tidy for Maëlle.");
  await page.getByRole("button", { name: "Save the mark" }).click();
  await expect(page.getByText("Marked as wrong")).toBeVisible();
  const flags = await page.evaluate(() => Object.entries(window.__fake.db()).filter(([path]) => path.startsWith("flags/")).map(([, data]) => data));
  expect(flags).toHaveLength(1);
  expect(flags[0]).toMatchObject({ note: "Too tidy for Maëlle.", cultureId: "heron", villagerId: "maelle" });
});

test("the sealed culture keeps its truths hidden until it is revealed", async ({ page }) => {
  await open(page, { answers: [canon({ reply: "With salt on the tongue.", entries: ["s9"] })] });
  await page.getByRole("radio", { name: /sealed culture/i }).check();
  await expect(page.locator("summary", { hasText: "What is true here" })).toHaveCount(0);
  await page.getByRole("button", { name: /^Oreth/ }).click();
  await say(page, "How is a promise made?");
  await page.getByRole("checkbox", { name: "Behind the curtain" }).check();
  await expect(log(page)).toContainText("from the culture");
  await expect(log(page)).not.toContainText("A promise is spoken with a pinch of salt on the tongue.");
  await page.getByRole("button", { name: "End the blind play and reveal" }).click();
  await page.getByRole("button", { name: "Yes, reveal it" }).click();
  await expect(log(page)).toContainText("A promise is spoken with a pinch of salt on the tongue.");
  await page.locator("summary", { hasText: "What is true here" }).click();
  await expect(page.getByText("The first kept word")).toBeVisible();
});

test("a reply that looks like markup is shown as text and runs nothing", async ({ page }) => {
  await open(page, { answers: [canon({ basis: "small_talk", entries: [], reply: "<img src=x onerror=\"window.__xss=1\"> hello" })] });
  await say(page, "Hello");
  await expect(log(page)).toContainText('<img src=x onerror="window.__xss=1"> hello');
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
});

for (const [code, message] of [
  ["not_granted", "not allowed"],
  ["rate_limited", "usage limit"],
  ["session_expired", "signed out"],
  ["invalid_json", "did not answer in a way this page could read"],
] as const) {
  test(`when Claude cannot be reached (${code}) the line is kept and nothing retries by itself`, async ({ page }) => {
    await open(page, { answers: [canon()], failWith: code });
    await say(page, "Why does the heron eat first?");
    await expect(page.getByRole("alert")).toContainText(message);
    await expect(page.getByRole("textbox", { name: /^Say something to/ })).toHaveValue("Why does the heron eat first?");
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => window.__fake.calls)).toEqual(["answer"]);
    await page.evaluate(() => (window.__fake.failWith = null));
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(log(page)).toContainText("The first fish goes to the heron. Then we eat.");
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}

test("outside the Claude viewer the page says so and still shows the cultures", async ({ page }) => {
  await open(page, { noRuntime: true });
  await say(page, "Hello");
  await expect(page.getByRole("alert")).toContainText("opened on claude.ai");
  await expect(page.getByRole("textbox", { name: /^Say something to/ })).toHaveValue("Hello");
  await page.locator("summary", { hasText: "What is true here" }).click();
  await expect(page.getByText("The woman and the heron")).toBeVisible();
});

test("conversations come back after a reload, and damaged saves are skipped", async ({ page }) => {
  await open(page, {
    answers: [canon(), canon()],
    db: { "conversations/heron__nobody": { cultureId: "heron", villagerId: "nobody", state: { history: [], personalFacts: [] } } },
  });
  await say(page, "Why does the heron eat first?");
  await expect(log(page)).toContainText("The first fish goes to the heron. Then we eat.");
  await page.reload();
  await expect(log(page)).toContainText("Why does the heron eat first?");
  await expect(log(page)).toContainText("The first fish goes to the heron. Then we eat.");
});

test("starting over clears one villager's conversation", async ({ page }) => {
  await open(page, { answers: [canon()] });
  await say(page, "Why does the heron eat first?");
  await expect(log(page)).toContainText("Then we eat.");
  await page.getByRole("button", { name: "Start over with Maëlle" }).click();
  await page.getByRole("button", { name: "Yes, clear it" }).click();
  await expect(log(page)).not.toContainText("Then we eat.");
});

// --- from the whole-branch review ---

test("nothing can be sent until earlier conversations have been looked for", async ({ page }) => {
  await open(page, { answers: [canon()], dbDelayMs: 700 });
  await expect(page.getByRole("textbox", { name: /^Say something to/ })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: /^Say something to/ })).toBeEnabled();
});

test("when earlier conversations cannot be read, the page says so and does not write over them", async ({ page }) => {
  await open(page, { answers: [canon()], dbFails: true, db: { "conversations/heron__maelle": { cultureId: "heron", villagerId: "maelle", state: { history: [], personalFacts: ["kept"] } } } });
  await expect(page.getByRole("status").filter({ hasText: "could not be loaded" })).toBeVisible();
  await say(page, "Why does the heron eat first?");
  await expect(log(page)).toContainText("Then we eat.");
  const kept = await page.evaluate(() => window.__fake.db()["conversations/heron__maelle"]);
  expect(kept).toMatchObject({ state: { personalFacts: ["kept"] } });
});

test("a damaged saved record does not blank the page", async ({ page }) => {
  const record = { basis: "deferral", entries: [], myths: [], personalFacts: [], model: "balanced" };
  await open(page, {
    answers: [canon()],
    db: {
      "conversations/heron__maelle": { cultureId: "heron", villagerId: "maelle", state: { history: [{ visitor: "a", reply: "b", record: { ...record, question: { x: 1 } } }], personalFacts: [] } },
      "conversations/heron__tam": { cultureId: "heron", villagerId: "tam", state: { history: [{ visitor: "a", reply: "b", record: { ...record, caught: "oops" } }], personalFacts: [] } },
    },
  });
  await page.getByRole("checkbox", { name: "Behind the curtain" }).check();
  await page.getByRole("button", { name: /^Old Tam/ }).click();
  await say(page, "Hello");
  await expect(log(page)).toContainText("Then we eat.");
});

test("a mark belongs to the reply it was made on, survives a reload, and does not carry over after starting again", async ({ page }) => {
  await open(page, { answers: [canon()] });
  await say(page, "Why does the heron eat first?");
  await page.getByRole("button", { name: "That's wrong" }).click();
  await page.getByRole("textbox", { name: "What is wrong with it?" }).fill("no");
  await page.getByRole("button", { name: "Save the mark" }).click();
  await expect(page.getByText("Marked as wrong")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Marked as wrong")).toBeVisible();
  await page.getByRole("button", { name: "Start over with Maëlle" }).click();
  await page.getByRole("button", { name: "Yes, clear it" }).click();
  // The stand-in starts its script again after a reload, so the same words come back to a new question.
  await say(page, "And now?");
  await expect(log(page)).toContainText("And now?");
  await expect(log(page)).toContainText("Then we eat.");
  await expect(page.getByText("Marked as wrong")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "That's wrong" })).toBeVisible();
});

test("a conversation cannot be cleared while a reply is on its way", async ({ page }) => {
  await open(page, { answers: [canon(), canon({ reply: "Second." })], delayMs: 600 });
  await say(page, "One");
  await expect(log(page)).toContainText("Then we eat.");
  await say(page, "Two");
  await expect(page.getByRole("button", { name: "Start over with Maëlle" })).toBeDisabled();
  await expect(log(page)).toContainText("Second.");
  await expect(page.getByRole("button", { name: "Start over with Maëlle" })).toBeEnabled();
});

// --- questions to the shaman and the spirits ---

const STATEMENT = "When a heron dies it is left where it falls, and no one touches it.";
/** The id the page gives the answer to Maëlle's question, so a scripted reply can draw on it. */
const ADDED = answerId({ villagerId: "maelle", question: "What is done when a heron dies?" });
const refusal = (over: Record<string, unknown> = {}) =>
  canon({ basis: "deferral", entries: [], reply: "That I cannot tell you.", question: "What is done when a heron dies?", ...over });
const spirit = (over: Record<string, unknown> = {}) => ({ kind: "answer", statement: STATEMENT, topic: "a dead heron", entryKind: "custom", say: "anyone", entries: ["h9"], ...over });
const calls = (page: Page) => page.evaluate(() => window.__fake.calls);
const savedConsults = (page: Page) =>
  page.evaluate(() => Object.entries(window.__fake.db()).filter(([path]) => path.startsWith("consults/")).map(([, data]) => data as { outcome: { status: string } }));
const refused = async (page: Page, script: FakeScript) => {
  await open(page, { answers: [refusal()], ...script });
  await say(page, "What happens when a heron dies?");
  await expect(log(page)).toContainText("That I cannot tell you.");
};
const truths = async (page: Page) => {
  await page.locator("summary", { hasText: "What is true here" }).click();
  return page.locator(".truths");
};

test("the spirits answer a refusal and the villager can be asked again", async ({ page }) => {
  await refused(page, {
    answers: [refusal(), canon({ reply: "The shaman was silent. The spirits spoke: it is left where it falls.", entries: [ADDED] })],
    spirits: [spirit()],
  });
  await page.getByRole("button", { name: "Ask the spirits" }).click();
  await expect(log(page)).toContainText("Maëlle went to ask. The shaman was silent. The spirits spoke.");
  expect(await calls(page)).toEqual(["answer", "check", "spirits", "spirits_check"]);
  await expect(log(page)).not.toContainText(STATEMENT); // heard only from the villager, unless the curtain is open

  await page.getByRole("button", { name: "Ask Maëlle again" }).click();
  await expect(log(page)).toContainText("The spirits spoke: it is left where it falls.");
  await expect(log(page).getByText("What happens when a heron dies?")).toHaveCount(2); // the visitor's own line, asked again
  await expect(page.getByRole("button", { name: "Ask Maëlle again" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ask the spirits" })).toHaveCount(0);

  await page.getByText(/^Questions for the shaman \(1\)/).click();
  await expect(page.getByRole("list", { name: "Questions for the shaman" })).toContainText("answered by the spirits");
});

test("an answer from the spirits is kept after a reload and listed as theirs", async ({ page }) => {
  await refused(page, { spirits: [spirit()] });
  await page.getByRole("button", { name: "Ask the spirits" }).click();
  await expect(log(page)).toContainText("The spirits spoke.");
  await page.reload();
  await expect(log(page)).toContainText("Maëlle went to ask. The shaman was silent. The spirits spoke.");
  const list = await truths(page);
  await expect(list.getByRole("listitem").filter({ hasText: STATEMENT })).toContainText("from the spirits");
  await page.getByRole("checkbox", { name: "Behind the curtain" }).check();
  await expect(log(page)).toContainText(STATEMENT);
});

test("the sealed culture never shows a spirit answer's text, and offers no shaman's answer", async ({ page }) => {
  const statement = "A cairn struck by lightning is rebuilt by whoever sees it first.";
  await open(page, {
    answers: [refusal({ reply: "That is beyond me.", question: "What is done when lightning strikes a cairn?" })],
    spirits: [spirit({ statement, topic: "a struck cairn", entries: ["s9"] })],
  });
  await page.getByRole("radio", { name: /sealed culture/i }).check();
  await say(page, "What if lightning strikes a cairn?");
  await expect(log(page)).toContainText("That is beyond me.");
  await expect(page.getByRole("button", { name: "Answer as the shaman" })).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Behind the curtain" }).check();
  await page.getByRole("button", { name: "Ask the spirits" }).click();
  await expect(log(page)).toContainText("Oreth went to ask. The shaman was silent. The spirits spoke.");
  await expect(log(page)).toContainText("hidden until you reveal the culture");
  await page.getByText(/^Questions for the shaman \(1\)/).click();
  await expect(page.locator("body")).not.toContainText("rebuilt by whoever sees it first");
});

test("the spirits are silent when the check finds a contradiction", async ({ page }) => {
  await refused(page, { spirits: [spirit()], spiritVerdicts: [{ contradicts: ["the heron is fed, never left"], explains: [], unfit: [] }] });
  await page.getByRole("button", { name: "Ask the spirits" }).click();
  await expect(log(page)).toContainText("The spirits were silent.");
  await expect(page.getByRole("button", { name: "Ask the spirits again" })).toBeVisible();
  expect((await savedConsults(page)).map((c) => c.outcome.status)).toEqual(["silent"]);
  await expect(await truths(page)).not.toContainText(STATEMENT);
  await page.getByRole("checkbox", { name: "Behind the curtain" }).check();
  await expect(log(page)).toContainText("contradicts the culture: the heron is fed, never left");
  await expect(log(page)).toContainText(STATEMENT);
});

test("the spirits can say the culture already answers it, and who to ask", async ({ page }) => {
  await refused(page, { spirits: [{ kind: "already_settled", entries: ["h21", "h1"] }] });
  await page.getByRole("button", { name: "Ask the spirits" }).click();
  await expect(log(page)).toContainText("The spirits say this is already known here. Ask Ysolt, Corin or Besa.");
  expect(await calls(page)).toEqual(["answer", "check", "spirits"]);
  expect((await savedConsults(page)).map((c) => c.outcome.status)).toEqual(["settled"]);
});

test("what already answers it may be something never said aloud", async ({ page }) => {
  await refused(page, { spirits: [{ kind: "already_settled", entries: ["h1"] }] });
  await page.getByRole("button", { name: "Ask the spirits" }).click();
  await expect(log(page)).toContainText("The spirits say this is already known here. It is not something that is said aloud.");
});

test("an unreadable answer from the spirits keeps nothing", async ({ page }) => {
  await refused(page, { spirits: ["The heron is left where it falls."] });
  await page.getByRole("button", { name: "Ask the spirits" }).click();
  await expect(page.getByRole("alert")).toContainText("The spirits did not answer in a way this page could read.");
  expect(await savedConsults(page)).toEqual([]);
  await expect(page.getByRole("button", { name: "Ask the spirits" })).toBeEnabled();
});

test("Claude declining during a consult keeps nothing and retries nothing", async ({ page }) => {
  await refused(page, { spirits: [spirit()] });
  await page.evaluate(() => (window.__fake.failWith = "not_granted"));
  await page.getByRole("button", { name: "Ask the spirits" }).click();
  await expect(page.getByRole("alert")).toContainText("not allowed");
  await page.waitForTimeout(600);
  expect(await calls(page)).toEqual(["answer", "check", "spirits"]);
  expect(await savedConsults(page)).toEqual([]);
  await expect(page.getByRole("button", { name: "Ask the spirits" })).toBeEnabled();
});

test("the owner can answer as the shaman in the open culture, with no call to Claude", async ({ page }) => {
  await refused(page, {});
  await page.getByRole("button", { name: "Answer as the shaman" }).click();
  await expect(page.getByRole("textbox", { name: "What it is about" })).toHaveValue("What is done when a heron dies");
  await page.getByRole("textbox", { name: "The shaman's answer" }).fill("It is carried to the water at dusk.");
  await page.getByRole("combobox", { name: "Who may say it" }).selectOption("earned");
  await page.getByRole("button", { name: "Save the answer" }).click();
  await expect(log(page)).toContainText("Maëlle went to ask. The shaman has answered.");
  expect(await calls(page)).toEqual(["answer", "check"]);
  const item = (await truths(page)).getByRole("listitem").filter({ hasText: "It is carried to the water at dusk." });
  await expect(item).toContainText("from the shaman");
  await expect(item).toContainText("earned");
});

test("the shaman's answer cannot be saved empty", async ({ page }) => {
  await refused(page, {});
  await page.getByRole("button", { name: "Answer as the shaman" }).click();
  await page.getByRole("textbox", { name: "The shaman's answer" }).fill("   ");
  await expect(page.getByRole("button", { name: "Save the answer" })).toBeDisabled();
  await page.getByRole("button", { name: "Never mind" }).click();
  await expect(page.getByRole("button", { name: "Answer as the shaman" })).toBeVisible();
});

test("asking the spirits twice at once makes one answer", async ({ page }) => {
  await refused(page, { spirits: [spirit(), spirit({ statement: "A second answer." })], delayMs: 400 });
  const button = page.getByRole("button", { name: "Ask the spirits" });
  await button.click();
  await expect(log(page)).toContainText("The spirits are asked…");
  await expect(page.getByRole("button", { name: "Ask the spirits" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: /^Say something to/ })).toBeDisabled();
  await expect(log(page)).toContainText("The spirits spoke.");
  expect((await calls(page)).filter((c) => c === "spirits")).toHaveLength(1);
  expect(await savedConsults(page)).toHaveLength(1);
});

test("the same question refused twice is one question", async ({ page }) => {
  await refused(page, { answers: [refusal(), refusal()], spirits: [spirit()] });
  await say(page, "But what happens when a heron dies?");
  await expect(log(page).getByText("That I cannot tell you.")).toHaveCount(2);
  await page.getByRole("button", { name: "Ask the spirits" }).first().click();
  await expect(log(page).getByText("Maëlle went to ask. The shaman was silent. The spirits spoke.")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Ask the spirits" })).toHaveCount(0);
  expect(await savedConsults(page)).toHaveLength(1);
});

test("a withdrawn answer leaves the culture", async ({ page }) => {
  await refused(page, { spirits: [spirit()] });
  await page.getByRole("button", { name: "Ask the spirits" }).click();
  await expect(log(page)).toContainText("The spirits spoke.");
  const list = await truths(page);
  await list.getByRole("button", { name: "Withdraw" }).click();
  await list.getByRole("button", { name: "Yes, withdraw it" }).click();
  await expect(list).not.toContainText(STATEMENT);
  expect(await savedConsults(page)).toEqual([]);
  await expect(page.getByRole("button", { name: "Ask the spirits" })).toBeVisible();
});

test("a damaged saved outcome does not break the page", async ({ page }) => {
  await open(page, {
    answers: [canon()],
    db: { "consults/x": { cultureId: "heron", villagerId: "maelle", question: "q", at: "2026-11-24T09:00:00Z", outcome: { status: "answered", by: "spirits" } } },
  });
  await say(page, "Why does the heron eat first?");
  await expect(log(page)).toContainText("Then we eat.");
  await expect(await truths(page)).not.toContainText("from the spirits");
});

test("the published file carries everything inline and only Google Fonts from outside", async () => {
  const html = readFileSync("dist/villager-trial.html", "utf8");
  expect(html).not.toMatch(/<script[^>]+src=/);
  expect(html).not.toMatch(/<!doctype|<html|<head|<body/i);
  const links = [...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map((m) => m[1]!);
  expect(links.length).toBeGreaterThan(0);
  for (const href of links) expect(href).toMatch(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//);
  expect(html).toMatch(/<title>Villager Trial<\/title>/);
  expect(html.length).toBeLessThan(1_500_000);
});
