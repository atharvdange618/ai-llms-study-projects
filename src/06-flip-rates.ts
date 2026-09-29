import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { zeroShot } from "./01-zero-shot.js";
import { fewShot } from "./02-few-shot.js";
import {
  direct,
  fewShotCot,
  manualCot,
  zeroShotCot,
} from "./03-chain-of-thought.js";
import { buildAutoDemos } from "./04-auto-cot.js";
import { MATH } from "./data/math.js";
import { TICKETS } from "./data/tickets.js";
import {
  evaluate,
  type Case,
  type Report,
  type Technique,
} from "./lib/eval.js";
import { flipRows, summaryRows } from "./lib/flips.js";

// Runs every technique several times and counts, per case, how often it passed.
// One run can't tell an effect from noise: temperature 0 still varies on hosted models,
// and our first showdown flipped a result we had already written down.
// Auto-CoT rebuilds its demos every run, because writing the demos is part of the
// technique and varies between runs too.
const RUNS = 5;

type Task = "tickets" | "math";
interface Saved {
  task: Task;
  run: number;
  report: Report;
}

// Each finished report is saved at once, and a restart skips what's already saved.
// The free tier allows 500 requests a day per model and a full job needs about 490,
// so a job may take two days. Delete the file to start over.
const SAVE_FILE = "results/flip-rates.jsonl";
const saved: Saved[] = existsSync(SAVE_FILE)
  ? readFileSync(SAVE_FILE, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Saved)
  : [];
mkdirSync(dirname(SAVE_FILE), { recursive: true });

const isDone = (task: Task, run: number, name: string) =>
  saved.some((s) => s.task === task && s.run === run && s.report.name === name);

async function record<A>(
  task: Task,
  run: number,
  technique: Technique<A>,
  cases: readonly Case<A>[],
) {
  if (isDone(task, run, technique.name)) return;
  const entry: Saved = { task, run, report: await evaluate(technique, cases) };
  saved.push(entry);
  appendFileSync(SAVE_FILE, `${JSON.stringify(entry)}\n`);
}

// Pass "tickets" or "math" to run one task and spend less quota. No argument runs both.
const only = process.argv[2];
if (only !== undefined && only !== "tickets" && only !== "math")
  throw new Error(`Unknown task "${only}". Use "tickets", "math" or nothing.`);

for (let run = 1; run <= RUNS; run++) {
  console.log(`\n########## Run ${run} of ${RUNS}`);
  if (only !== "math")
    for (const t of [zeroShot, fewShot])
      await record("tickets", run, t, TICKETS);
  if (only !== "tickets") {
    for (const t of [direct, zeroShotCot, manualCot])
      await record("math", run, t, MATH);
    // Checked here so a resumed run doesn't spend calls building demos it won't use.
    if (!isDone("math", run, "auto-CoT")) {
      const demos = await buildAutoDemos(MATH.map((c) => c.input));
      await record("math", run, fewShotCot("auto-CoT", demos), MATH);
    }
  }
}

for (const [title, task, cases] of [
  ["Tickets", "tickets", TICKETS],
  ["Math", "math", MATH],
] as const) {
  const runs = new Map<string, Report[]>();
  for (const s of saved)
    if (s.task === task)
      runs.set(s.report.name, [...(runs.get(s.report.name) ?? []), s.report]);
  if (runs.size === 0) continue;
  console.log(`\n${title}: passes per case`);
  console.table(flipRows(cases, runs));
  console.log(`\n${title}: score per run`);
  console.table(summaryRows(runs));
}
