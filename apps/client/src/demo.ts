// M0 has no service. Everything the client shows beyond the scene itself is this fixture data.
import type { Token } from "./ui/DialogueStrip";

/** A line as data: a plain string is spacing or punctuation, a one-item list is a word. */
const line = (...parts: (string | [string])[]): Token[] =>
  parts.map((part) => (typeof part === "string" ? { text: part, word: false } : { text: part[0], word: true }));

export const DEMO = {
  contentRoot: "content/",
  sceneFile: "scenes/waters-edge.scene.json",
  figureFile: "models/figure.glb",
  marks: { "post-mark": "marks/heron.svg" },
  actors: [{ slot: "actor-maelle", name: "Maëlle" }],
  /** Shown when the player reaches Maëlle. An English-speaking learner of French, as in the design's sketch. */
  dialogue: {
    speaker: "Maëlle",
    tokens: line(
      "« ",
      ["Le"],
      " ",
      ["héron"],
      " ",
      ["mange"],
      " ",
      ["en"],
      " ",
      ["premier"],
      ". ",
      ["Nous"],
      ", ",
      ["ensuite"],
      ". »",
    ),
    suggestions: ["Qui lui donne à manger ?", "C'était toujours ainsi ?"],
  },
} as const;
