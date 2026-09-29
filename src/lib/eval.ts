import { pathToFileURL } from "node:url";
import { ask } from "./gemini.js";

export interface Case<A> {
  input: string;
  expected: A;
}

export interface Technique<A> {
  name: string;
  prompt: (input: string) => string;
  parse: (reply: string) => A | null;
  // Hard cap on reply length. Instructions like "no working" are requests; this is enforced.
  maxOutputTokens?: number;
}

export interface Report {
  name: string;
  correct: number;
  total: number;
  inputTokens: number;
  outputTokens: number;
  truncated: number;
}

export async function evaluate<A>(
  technique: Technique<A>,
  cases: readonly Case<A>[],
  verbose = false,
): Promise<Report> {
  console.log(`\n=== ${technique.name} ===`);
  const first = cases[0];
  if (verbose && first)
    console.log(
      `Full prompt for the first case:\n---\n${technique.prompt(first.input)}\n---\n`,
    );

  const report: Report = {
    name: technique.name,
    correct: 0,
    total: cases.length,
    inputTokens: 0,
    outputTokens: 0,
    truncated: 0,
  };
  for (const c of cases) {
    const reply = await ask(
      technique.prompt(c.input),
      technique.maxOutputTokens,
    );
    const got = technique.parse(reply.text);
    const ok = got === c.expected;
    if (ok) report.correct++;
    report.inputTokens += reply.inputTokens;
    report.outputTokens += reply.outputTokens;
    if (reply.truncated) report.truncated++;
    if (verbose) {
      console.log(
        `${ok ? "PASS" : "FAIL"}${reply.truncated ? " (CUT OFF)" : ""}  expected ${String(c.expected)}, got ${String(got)}`,
      );
      console.log(`  Q: ${c.input}`);
      console.log(`  ${reply.text.trim().replaceAll("\n", "\n  ")}\n`);
    }
  }
  console.log(`${technique.name}: ${report.correct}/${report.total} correct`);
  return report;
}

export function printTable(reports: Report[]): void {
  console.table(
    reports.map((r) => ({
      technique: r.name,
      accuracy: `${r.correct}/${r.total}`,
      "input tokens": r.inputTokens,
      "output tokens": r.outputTokens,
      "cut off": r.truncated,
    })),
  );
}

// True when this file was run directly (tsx src/01-zero-shot.ts), false when another file imports it.
export const isMain = (moduleUrl: string) =>
  moduleUrl === pathToFileURL(process.argv[1] ?? "").href;
