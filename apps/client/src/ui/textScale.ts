/** The sizes the player can choose for all text. */
export const TEXT_SCALES = [1, 1.25, 1.5, 2] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

const KEY = "textScale";

const asScale = (value: unknown): TextScale | null => {
  const n = Number(value);
  return (TEXT_SCALES as readonly number[]).includes(n) ? (n as TextScale) : null;
};

/** The scale to start with: one named in the address (?textScale=), else the remembered one, else 1. */
export function initialTextScale(): TextScale {
  const fromAddress = asScale(new URLSearchParams(window.location.search).get("textScale") ?? undefined);
  if (fromAddress !== null) return fromAddress;
  try {
    return asScale(localStorage.getItem(KEY) ?? undefined) ?? 1;
  } catch {
    return 1;
  }
}

export function applyTextScale(scale: TextScale, remember: boolean): void {
  document.documentElement.style.setProperty("--text-scale", String(scale));
  if (!remember) return;
  try {
    localStorage.setItem(KEY, String(scale));
  } catch {
    // Storage can be blocked. The size still applies for this visit.
  }
}
