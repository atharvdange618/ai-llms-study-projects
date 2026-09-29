import { LABELS, TICKETS, type Label } from "./data/tickets.js";
import {
  evaluate,
  isMain,
  printTable,
  type Case,
  type Technique,
} from "./lib/eval.js";
import { extractLabel } from "./lib/parse.js";

// One example per label, each picked to show a house rule the label name alone doesn't reveal.
// None of these appear in the test set, or we'd be grading the model on questions we answered for it.
const EXAMPLES: Case<Label>[] = [
  {
    input: "The reset password email never arrives, I've tried 5 times.",
    expected: "account",
  },
  {
    input:
      "Your app crashed during checkout and I got charged anyway. I want my money back.",
    expected: "billing",
  },
  {
    input: "Why is there no way to export my data to CSV? This is ridiculous.",
    expected: "feature",
  },
  {
    input:
      "The dashboard chart shows last month's numbers even after I refresh.",
    expected: "bug",
  },
];

// Few-shot: same instruction as zero-shot, plus worked examples. The prompt ends on
// "Category:" so the model's most likely next token is a label, in the same format as the examples.
export const fewShot: Technique<Label> = {
  name: "few-shot",
  prompt: (
    ticket,
  ) => `Classify each support ticket into exactly one category: ${LABELS.join(", ")}.

${EXAMPLES.map((e) => `Ticket: ${e.input}\nCategory: ${e.expected}`).join("\n\n")}

Ticket: ${ticket}
Category:`,
  parse: (reply) => extractLabel(reply, LABELS),
};

if (isMain(import.meta.url))
  printTable([await evaluate(fewShot, TICKETS, true)]);
