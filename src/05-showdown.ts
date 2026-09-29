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
import { evaluate, printTable, type Report } from "./lib/eval.js";

// Every technique on the same data, same model, temperature 0. The only variable is the prompt.
const ticketReports: Report[] = [];
for (const technique of [zeroShot, fewShot])
  ticketReports.push(await evaluate(technique, TICKETS));

console.log("\nBuilding Auto-CoT demos...");
const autoCot = fewShotCot(
  "auto-CoT",
  await buildAutoDemos(MATH.map((c) => c.input)),
);

const mathReports: Report[] = [];
for (const technique of [direct, zeroShotCot, manualCot, autoCot])
  mathReports.push(await evaluate(technique, MATH));

console.log("\nTicket classification");
printTable(ticketReports);
console.log("\nMath word problems");
printTable(mathReports);
