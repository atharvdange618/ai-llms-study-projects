import { LABELS, TICKETS, type Label } from "./data/tickets.js";
import { evaluate, isMain, printTable, type Technique } from "./lib/eval.js";
import { extractLabel } from "./lib/parse.js";

// Zero-shot: instructions only, no examples. The model has to guess what each label
// means from its name, so it falls back on its own idea of "bug" vs "account".
export const zeroShot: Technique<Label> = {
  name: "zero-shot",
  prompt: (
    ticket,
  ) => `Classify this support ticket into exactly one category: ${LABELS.join(", ")}.
Reply with only the category name.

Ticket: ${ticket}`,
  parse: (reply) => extractLabel(reply, LABELS),
};

if (isMain(import.meta.url))
  printTable([await evaluate(zeroShot, TICKETS, true)]);
