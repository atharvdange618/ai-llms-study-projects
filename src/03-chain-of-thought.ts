import { MATH } from "./data/math.js";
import {
  evaluate,
  isMain,
  printTable,
  type Report,
  type Technique,
} from "./lib/eval.js";
import { extractNumber } from "./lib/parse.js";

export interface Demo {
  question: string;
  reasoning: string; // worked steps ending in "Answer: <n>"
}

// Baseline: force the answer with no room to work. The model has to do every step
// "in its head" inside a single token prediction. Modern models are trained to reason
// out loud and ignore "no working" about half the time, so the prompt prefills
// "Answer:" and the model's first words have to be the number. Parse puts the prefill
// back in front, so the first number after it counts, not anything explained afterwards.
export const direct: Technique<number> = {
  name: "direct",
  prompt: (q) =>
    `Q: ${q}\nGive only the final answer, no working, as "Answer: <number>".\nA: Answer:`,
  parse: (reply) => extractNumber(`Answer:${reply}`),
  // Gemini splits numbers into single digits, so "Answer: 1980" takes more tokens than it
  // looks. At 10, "Answer: 1980" came back as "Answer: 198", most likely cut off.
  // 20 fits any answer here but leaves no room for reasoning.
  maxOutputTokens: 20,
};

// Zero-shot CoT (Kojima et al. 2022): one magic phrase, no examples. Every step the model
// writes becomes input for the next step, so it gets more compute per problem.
export const zeroShotCot: Technique<number> = {
  name: "zero-shot CoT",
  prompt: (q) =>
    `Q: ${q}\nEnd your reply with a final line "Answer: <number>".\nA: Let's think step by step.`,
  parse: extractNumber,
};

// Few-shot CoT (Wei et al. 2022): examples that show the reasoning, not just the answer.
// Shared with Auto-CoT, which uses the same format with machine-written demos.
export function fewShotCot(
  name: string,
  demos: readonly Demo[],
): Technique<number> {
  return {
    name,
    prompt: (q) =>
      `${demos.map((d) => `Q: ${d.question}\nA: ${d.reasoning}`).join("\n\n")}\n\nQ: ${q}\nA:`,
    parse: extractNumber,
  };
}

// Hand-written demos, one per problem family, none from the test set.
const MANUAL_DEMOS: Demo[] = [
  {
    question:
      "A phone plan costs $25 per month plus $0.10 per text. Mia sends 340 texts in a month. What is her bill in dollars?",
    reasoning:
      "The texts cost 340 x 0.10 = 34 dollars. Adding the monthly fee gives 25 + 34 = 59.\nAnswer: 59",
  },
  {
    question:
      "Lena is twice as old as her brother. Six years ago she was three times as old as him. How old is Lena now?",
    reasoning:
      "Call the brother's age b, so Lena is 2b. Six years ago: 2b - 6 = 3(b - 6), so 2b - 6 = 3b - 18, which gives b = 12. Lena is 2 x 12 = 24.\nAnswer: 24",
  },
  {
    question:
      "A printer prints 30 pages per minute. How many minutes does it take to print 5 copies of a 42-page report?",
    reasoning:
      "5 copies of 42 pages is 5 x 42 = 210 pages. At 30 pages per minute that takes 210 / 30 = 7 minutes.\nAnswer: 7",
  },
  {
    question:
      "A farmer has 15 cows. He buys 3 times as many sheep as cows, then sells 10 sheep. How many animals does he have now?",
    reasoning:
      "He buys 3 x 15 = 45 sheep. After selling 10 he has 45 - 10 = 35 sheep. With the 15 cows that is 15 + 35 = 50 animals.\nAnswer: 50",
  },
];

export const manualCot = fewShotCot("few-shot CoT (manual)", MANUAL_DEMOS);

if (isMain(import.meta.url)) {
  const reports: Report[] = [];
  for (const technique of [direct, zeroShotCot, manualCot])
    reports.push(await evaluate(technique, MATH, true));
  printTable(reports);
}
