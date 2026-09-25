/** Deterministic bar widths (1-4px) derived from a string, so a trip always prints the same code. */
function widthsFor(seed: string, bars: number): number[] {
  let state = 0;
  for (const char of seed) state = (state * 31 + char.charCodeAt(0)) >>> 0;

  const widths: number[] = [];
  for (let i = 0; i < bars; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    widths.push(1 + ((state >>> 24) % 4));
  }
  return widths;
}

/** Decorative ticket barcode; carries no data and is hidden from assistive tech. */
export function Barcode({ seed }: { seed: string }) {
  return (
    <div className="barcode" aria-hidden="true">
      {widthsFor(seed, 44).map((width, index) => (
        <i key={index} style={{ width }} />
      ))}
    </div>
  );
}
