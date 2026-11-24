import type { Culture } from "@fieldwork/contracts";
import { checkByRule } from "./checks";
import { type Draft, parseDraft, parseVerdict } from "./draft";
import { buildAnswerRequest, buildCheckRequest } from "./requests";
import { type Ask, type Exchange, type ModelClass, type TurnRecord, type VillagerState, VillagerTurnError } from "./types";

type Caught = NonNullable<TurnRecord["caught"]>;

/**
 * One turn of conversation: ask for a reply, check it by rule, check it by model, and decide what is shown.
 * A reply that fails either check is discarded and one of the villager's fixed lines is shown instead.
 * Rejects, changing nothing, if the model cannot be reached or its output cannot be read.
 */
export async function villagerTurn(
  deps: { ask: Ask },
  input: { culture: Culture; villagerId: string; state: VillagerState; line: string; model: ModelClass },
): Promise<{ exchange: Exchange; state: VillagerState }> {
  const { culture, villagerId, state, line, model } = input;
  const villager = culture.villagers.find((v) => v.id === villagerId);
  if (!villager) throw new Error(`The culture "${culture.id}" has no villager "${villagerId}".`);

  const draft = parseDraft(await deps.ask(buildAnswerRequest(culture, villagerId, state, line, model)));
  if (!draft) throw new VillagerTurnError("unreadable_answer");

  // The three ways a discarded reply is replaced. Fixed lines need no model, so they are always safe.
  const refuse = (caught: Caught): Exchange => ({
    visitor: line,
    reply: villager.lines.refusal,
    record: { basis: "deferral", entries: [], myths: [], question: line, personalFacts: [], caught, model },
  });
  const withhold = (caught: Caught): Exchange => ({
    visitor: line,
    reply: villager.lines.withholding,
    record: { basis: "withheld", entries: draft.entries, myths: [], personalFacts: [], caught, model },
  });
  const redirectPlainly = (caught: Caught, target: { id: string; name: string }): Exchange => ({
    visitor: line,
    reply: villager.lines.redirect.replaceAll("{name}", target.name),
    record: { basis: "redirect", entries: draft.entries, myths: [], redirect: target.id, personalFacts: [], caught, model },
  });
  const accept = (accepted: Draft): Exchange => ({
    visitor: line,
    reply: accepted.reply,
    record: {
      basis: accepted.basis,
      entries: accepted.entries,
      myths: accepted.myths,
      ...(accepted.basis === "deferral" ? { question: accepted.question ?? line } : {}),
      ...(accepted.basis === "redirect" && accepted.redirect ? { redirect: accepted.redirect } : {}),
      personalFacts: accepted.personalFacts,
      model,
    },
  });

  let exchange: Exchange;
  const ruleFindings = checkByRule(culture, villagerId, draft);
  if (ruleFindings.length > 0) {
    // Decided without a second call: the culture file alone shows the reply cannot stand.
    const caught: Caught = { by: "rule", reply: draft.reply, reasons: ruleFindings.map((f) => f.reason) };
    // As on the model path below: telling what is guarded outranks inventing.
    exchange = ruleFindings.some((f) => f.failure === "guarded") ? withhold(caught) : refuse(caught);
  } else {
    const verdict = parseVerdict(await deps.ask(buildCheckRequest(culture, villagerId, state, line, draft)));
    if (!verdict) throw new VillagerTurnError("unreadable_check");

    const reasons = [
      ...verdict.explains.map((r) => `explains what something means: ${r}`),
      ...verdict.earned.map((r) => `tells a stranger what is earned: ${r}`),
      ...verdict.unsupported.map((r) => `states something the culture does not support: ${r}`),
    ];
    const caught: Caught = { by: "model", reply: draft.reply, reasons };
    const target = culture.villagers.find((v) => v.id === draft.redirect);

    if (reasons.length === 0) exchange = accept(draft);
    // Telling what is guarded outranks inventing: the culture does hold an answer, it is just not for this visitor.
    else if (verdict.explains.length > 0 || verdict.earned.length > 0) exchange = withhold(caught);
    else if (draft.basis === "redirect" && target) exchange = redirectPlainly(caught, target);
    else exchange = refuse(caught);
  }

  const remembered = exchange.record.personalFacts.filter((fact) => !state.personalFacts.includes(fact));
  return {
    exchange,
    state: { history: [...state.history, exchange], personalFacts: [...state.personalFacts, ...remembered] },
  };
}

/** Everything a villager refused to invent, as questions for the shaman, oldest first. */
export function shamanQuestions(history: Exchange[]): { question: string; raisedByCatch: boolean }[] {
  return history
    .filter((exchange) => exchange.record.basis === "deferral")
    .map((exchange) => ({
      question: exchange.record.question ?? exchange.visitor,
      raisedByCatch: exchange.record.caught !== undefined,
    }));
}
