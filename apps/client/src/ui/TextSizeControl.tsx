import { useEffect, useState } from "react";
import { applyTextScale, initialTextScale, TEXT_SCALES } from "./textScale";

export { TEXT_SCALES } from "./textScale";

/** Two buttons that make all text smaller or larger. The choice is remembered. */
export function TextSizeControl() {
  const [index, setIndex] = useState(() => TEXT_SCALES.indexOf(initialTextScale()));

  useEffect(() => {
    applyTextScale(TEXT_SCALES[index]!, false);
  }, [index]);

  const step = (by: number) => {
    const next = Math.min(TEXT_SCALES.length - 1, Math.max(0, index + by));
    setIndex(next);
    applyTextScale(TEXT_SCALES[next]!, true);
  };

  return (
    <div className="text-size" role="group" aria-label="Text size">
      <button type="button" aria-label="Smaller text" disabled={index === 0} onClick={() => step(-1)}>
        A−
      </button>
      <button type="button" aria-label="Larger text" disabled={index === TEXT_SCALES.length - 1} onClick={() => step(1)}>
        A+
      </button>
    </div>
  );
}
