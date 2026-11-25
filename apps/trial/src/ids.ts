// Ids made from text. This file imports nothing, so the browser tests can use it too.

/** A short, stable fingerprint of a piece of text. */
export function fingerprint(text: string): string {
  let a = 0x811c9dc5;
  let b = 5381;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    a = Math.imul(a ^ code, 0x01000193) >>> 0;
    b = (Math.imul(b, 33) + code) >>> 0;
  }
  return a.toString(36) + b.toString(36);
}

/**
 * The id of the entry that answers one question from one villager. It is the same every time, so an id is never
 * given to a different answer after one has been withdrawn, and an old reply never points at the wrong entry.
 */
export function answerId(of: { villagerId: string; question: string }): string {
  return `a${fingerprint(`${of.villagerId}\n${of.question}`)}`;
}
