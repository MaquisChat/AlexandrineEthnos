/**
 * Reads one JSON value out of a model's reply: the whole reply, else the body of one Markdown
 * code fence, else the text from the first { or [ to the last } or ]. Throws if none can be read.
 */
export function extractJson(text: string): unknown {
  const candidates: string[] = [text.trim()];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) candidates.push(fence[1].trim());
  for (const [open, close] of [["{", "}"], ["[", "]"]] as const) {
    const start = text.indexOf(open);
    const end = text.lastIndexOf(close);
    if (start !== -1 && end > start) candidates.push(text.slice(start, end + 1));
  }
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next way of reading it
    }
  }
  throw new Error(`The reply holds no JSON value: ${text.slice(0, 120)}`);
}
