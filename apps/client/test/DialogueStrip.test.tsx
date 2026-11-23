// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { DialogueStrip, type DialogueStripProps, type Token } from "../src/ui/DialogueStrip";

afterEach(cleanup);

const tokens: Token[] = [
  { text: "Le", word: true },
  { text: " ", word: false },
  { text: "héron", word: true },
  { text: ".", word: false },
];
const setup = (over: Partial<DialogueStripProps> = {}) => {
  const props = {
    speaker: "Maëlle",
    tokens,
    suggestions: ["Qui lui donne à manger ?"],
    onTapWord: vi.fn(),
    onSay: vi.fn(),
    onSimpler: vi.fn(),
    onTranslation: vi.fn(),
    onClip: vi.fn(),
    ...over,
  };
  render(<DialogueStrip {...props} />);
  return props;
};

it("names the speaker", () => {
  setup();
  expect(screen.getByText("Maëlle")).toBeInTheDocument();
});

it("makes each word a button and leaves punctuation alone", async () => {
  const p = setup();
  expect(screen.getAllByRole("button", { name: /^(Le|héron)$/ })).toHaveLength(2);
  expect(screen.queryByRole("button", { name: "." })).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "héron" }));
  expect(p.onTapWord).toHaveBeenCalledWith(2);
});

it("does not split words itself", () => {
  setup({ tokens: [{ text: "үйлерімізде", word: true }] });
  expect(screen.getByRole("button", { name: "үйлерімізде" })).toBeInTheDocument();
});

it("keeps a word with a space inside it as one button", () => {
  setup({ tokens: [{ text: "parce que", word: true }] });
  expect(screen.getByRole("button", { name: "parce que" })).toBeInTheDocument();
});

it("sends typed text on Enter and clears the box", async () => {
  const p = setup();
  const box = screen.getByPlaceholderText("Say something…");
  await userEvent.type(box, "Pourquoi ?{Enter}");
  expect(p.onSay).toHaveBeenCalledWith("Pourquoi ?");
  expect(box).toHaveValue("");
});

it("ignores Enter on an empty box and during composition", () => {
  const p = setup();
  const box = screen.getByPlaceholderText("Say something…");
  fireEvent.keyDown(box, { key: "Enter" });
  fireEvent.change(box, { target: { value: "こん" } });
  fireEvent.keyDown(box, { key: "Enter", isComposing: true });
  expect(p.onSay).not.toHaveBeenCalled();
  expect(box).toHaveValue("こん");
});

it("sends a suggestion when it is chosen", async () => {
  const p = setup();
  await userEvent.click(screen.getByRole("button", { name: "Qui lui donne à manger ?" }));
  expect(p.onSay).toHaveBeenCalledWith("Qui lui donne à manger ?");
});

it("offers the three aids by name", async () => {
  const p = setup();
  await userEvent.click(screen.getByRole("button", { name: "say it more simply" }));
  await userEvent.click(screen.getByRole("button", { name: "translation" }));
  await userEvent.click(screen.getByRole("button", { name: "clip" }));
  expect(p.onSimpler).toHaveBeenCalledTimes(1);
  expect(p.onTranslation).toHaveBeenCalledTimes(1);
  expect(p.onClip).toHaveBeenCalledTimes(1);
});

it("can be worked from the keyboard alone", async () => {
  const p = setup();
  await userEvent.tab();
  expect(screen.getByRole("button", { name: "Le" })).toHaveFocus();
  await userEvent.keyboard("{Enter}");
  expect(p.onTapWord).toHaveBeenCalledWith(0);
});
