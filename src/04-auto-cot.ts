import { fewShotCot, zeroShotCot, type Demo } from "./03-chain-of-thought.js";
import { MATH } from "./data/math.js";
import { evaluate, isMain, printTable } from "./lib/eval.js";
import { ask, embed } from "./lib/gemini.js";
import { clusterByCosine } from "./lib/kmeans.js";

const CLUSTERS = 4;
// Paper heuristic: prefer short chains. Long ones are more likely to hide a mistake,
// and a wrong demo teaches the model to repeat that mistake. The paper counts reasoning steps;
// counting non-blank lines is cruder, since markdown bullets inflate it.
const MAX_REASONING_LINES = 8;

/**
 * Auto-CoT (Zhang et al. 2022). Builds few-shot CoT demos with no human-written reasoning:
 *   1. Embed the unlabeled questions and cluster them, so demos cover different kinds of problem.
 *   2. For each cluster, walk out from the question nearest the centre, let zero-shot CoT
 *      write a reasoning chain, and keep the first chain that passes the heuristics.
 * Nobody checks whether the demo answers are right. The paper's finding is that diverse
 * demos stay useful even when a few of them are wrong.
 */
export async function buildAutoDemos(
  questions: string[],
  log = false,
): Promise<Demo[]> {
  const clusters = clusterByCosine(await embed(questions), CLUSTERS);
  const demos: Demo[] = [];

  for (const [c, members] of clusters.entries()) {
    if (log)
      console.log(
        `\nCluster ${c + 1}:\n${members.map((m) => `  - ${questions[m]}`).join("\n")}`,
      );

    let chosen: Demo | undefined;
    let fallback: Demo | undefined;
    for (const m of members) {
      const question = questions[m]!;
      const reply = await ask(zeroShotCot.prompt(question));
      const demo = {
        question,
        reasoning: `Let's think step by step. ${reply.text.trim()}`,
      };
      fallback ??= demo;
      const lines = demo.reasoning
        .split("\n")
        .filter((line) => line.trim()).length;
      if (/answer:/i.test(demo.reasoning) && lines <= MAX_REASONING_LINES) {
        chosen = demo;
        break;
      }
    }
    // No chain passed the heuristics; the one nearest the centre beats having no demo for this cluster.
    if (fallback) demos.push(chosen ?? fallback);
  }
  return demos;
}

if (isMain(import.meta.url)) {
  // The demos come from the test questions themselves, like in the paper. That's fair here
  // because no answers are used: the model labels its own examples.
  const demos = await buildAutoDemos(
    MATH.map((c) => c.input),
    true,
  );
  console.log(
    "\nGenerated demos (check them: some may be wrong, and that's part of the experiment):",
  );
  for (const d of demos) console.log(`\nQ: ${d.question}\nA: ${d.reasoning}`);

  printTable([await evaluate(fewShotCot("auto-CoT", demos), MATH, true)]);
}
