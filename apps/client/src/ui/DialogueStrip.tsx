import { useState } from "react";

/** One piece of a spoken line. Word boundaries come from the service, never from splitting on spaces. */
export interface Token {
  text: string;
  /** True for a word the player can tap for its meaning; false for spaces and punctuation. */
  word: boolean;
}

export interface DialogueStripProps {
  speaker: string;
  tokens: Token[];
  suggestions: string[];
  /** Called with the index of the tapped token. */
  onTapWord(index: number): void;
  onSay(text: string): void;
  onSimpler(): void;
  onTranslation(): void;
  onClip(): void;
}

/** What someone in the scene is saying, set large in the lower third, with the player's reply underneath. */
export function DialogueStrip(props: DialogueStripProps) {
  const [draft, setDraft] = useState("");

  const send = () => {
    const text = draft.trim();
    if (text === "") return;
    props.onSay(text);
    setDraft("");
  };

  return (
    <section className="strip" data-testid="dialogue-strip" aria-label={`${props.speaker} is speaking`}>
      <p className="strip-speaker">{props.speaker}</p>
      <p className="strip-line">
        {props.tokens.map((token, index) =>
          token.word ? (
            <button key={index} type="button" className="strip-word" onClick={() => props.onTapWord(index)}>
              {token.text}
            </button>
          ) : (
            <span key={index}>{token.text}</span>
          ),
        )}
      </p>
      <div className="strip-aids">
        <button type="button" onClick={props.onSimpler}>
          say it more simply
        </button>
        <button type="button" onClick={props.onTranslation}>
          translation
        </button>
        <button type="button" onClick={props.onClip}>
          clip
        </button>
      </div>
      <input
        className="strip-say"
        type="text"
        placeholder="Say something…"
        aria-label="Say something"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          // While an input method is composing (Chinese, Japanese, Korean), Enter belongs to it.
          if (event.key === "Enter" && !event.nativeEvent.isComposing) send();
        }}
      />
      {props.suggestions.length > 0 && (
        <div className="strip-suggestions">
          <span className="strip-or">or ask:</span>
          {props.suggestions.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => props.onSay(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
