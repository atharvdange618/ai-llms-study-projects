const NUMBER = /-?\d[\d,]*(?:\.\d+)?/g;

// We ask for a final "Answer: <n>" line, but models drift from formats, so fall back to the last number in the reply.
export function extractNumber(reply: string): number | null {
  const raw =
    reply.match(/answer:\s*\$?(-?\d[\d,]*(?:\.\d+)?)/i)?.[1] ??
    reply.match(NUMBER)?.at(-1);
  if (raw === undefined) return null;
  const n = Number(raw.replaceAll(",", ""));
  return Number.isNaN(n) ? null : n;
}

// The label mentioned first wins, so "bug, not billing" reads as bug.
export function extractLabel<L extends string>(
  reply: string,
  labels: readonly L[],
): L | null {
  const lower = reply.toLowerCase();
  let best: L | null = null;
  let bestIndex = Infinity;
  for (const label of labels) {
    const i = lower.indexOf(label);
    if (i !== -1 && i < bestIndex) {
      best = label;
      bestIndex = i;
    }
  }
  return best;
}
