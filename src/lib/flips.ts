import type { Case, Report } from "./eval.js";

// Reports keyed by technique name, one report per run.
export type Runs = ReadonlyMap<string, readonly Report[]>;

/**
 * One row per case: how many runs each technique passed it, plus the wrong answers it gave.
 * "3/5 (23 x2)" means it passed 3 of 5 runs and answered 23 in the other two.
 */
export function flipRows(
  cases: readonly Case<unknown>[],
  runs: Runs,
): Record<string, string>[] {
  return cases.map((c, i) => {
    const row: Record<string, string> = { case: c.input.slice(0, 40) };
    for (const [name, reports] of runs) {
      const results = reports.map((r) => r.results[i]!);
      const wrong = new Map<string, number>();
      for (const r of results)
        if (!r.ok) wrong.set(r.got, (wrong.get(r.got) ?? 0) + 1);
      const passes = results.filter((r) => r.ok).length;
      const detail = [...wrong].map(([got, n]) => `${got} x${n}`).join(", ");
      row[name] = `${passes}/${results.length}${detail ? ` (${detail})` : ""}`;
    }
    return row;
  });
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

// One row per technique: the score of every run, so the spread is visible, plus average cost.
export function summaryRows(runs: Runs) {
  return [...runs].map(([name, reports]) => ({
    technique: name,
    "score per run": reports.map((r) => `${r.correct}/${r.total}`).join(" "),
    "mean accuracy": `${Math.round(mean(reports.map((r) => r.correct / r.total)) * 100)}%`,
    "avg input tokens": Math.round(mean(reports.map((r) => r.inputTokens))),
    "avg output tokens": Math.round(mean(reports.map((r) => r.outputTokens))),
    "cut off (all runs)": reports.reduce((sum, r) => sum + r.truncated, 0),
  }));
}
