# Prompting techniques: findings

A lab notebook for five small projects comparing zero-shot, few-shot, chain of thought (CoT) and Auto-CoT on the same data.

## Status (2026-09-29)

| # | Project | Script | State |
|---|---|---|---|
| 1 | Zero-shot ticket classifier | `npm run zero-shot` | Run and analyzed |
| 2 | Few-shot ticket classifier | `npm run few-shot` | Run and analyzed, 3 ablations done |
| 3 | CoT on math word problems | `npm run cot` | Run and analyzed, baseline fixed 4 times |
| 4 | Auto-CoT | `npm run auto-cot` | Run and analyzed |
| 5 | Showdown, all techniques in one table | `npm run showdown` | Run and analyzed |
| 6 | Flip rates, 5 runs per technique | `npm run flip-rates` | Tickets and math done |

## Setup

- Model: `gemini-3.5-flash-lite`, embeddings: `gemini-embedding-001`, SDK `@google/genai` 2.24
- Every call: `temperature: 0`, `thinkingLevel: MINIMAL`, `stopSequences: ["\nQ:"]`
- TypeScript, run with `tsx`, tests with `vitest` (`npm test`, `npm run typecheck`)
- Key in `.env` as `GEMINI_API_KEY` (see `.env.example`)
- Data: 12 support tickets (`src/data/tickets.ts`), 16 math problems in 4 families (`src/data/math.ts`)
- Plumbing in `src/lib/`: Gemini client with 429 backoff, answer parsing, eval loop, cosine k-means

## Projects 1 and 2: zero-shot vs few-shot

The ticket set has house rules the label names don't reveal: login and 2FA problems count as `account`, anything about money counts as `billing`, "why can't I" complaints count as `feature`. The few-shot examples carry those rules.

Only three tickets ever changed between runs. The other nine passed every time.

| Run | 2FA code | Locked out, 404 | Invite teammates | Score |
|---|---|---|---|---|
| Zero-shot | bug ✗ | account ✓ | feature ✓ | 11/12 |
| Few-shot, 4 examples | account ✓ | account ✓ | account ✗ | 11/12 |
| Few-shot, 3 examples (reset-password one removed) | bug ✗ | account ✓ | account ✗ | 10/12 |
| Few-shot format, 0 examples | account ✓ | bug ✗ | feature ✓ | 11/12 |

Input tokens: 546 zero-shot, 1566 few-shot (2.9x for the same score).

What we learned:

- **On this model, zero-shot and few-shot tie.** (Overturned by the flip-rate run: 92% vs 100%.) Gemini 3.5 Flash-Lite guesses most house rules without examples. Every score change came from three borderline tickets flipping on small prompt changes.
- **One example can flip one ticket.** Removing the reset-password example sent the 2FA ticket back to `bug`. That's a clean ablation: one change, one effect.
- **The effects don't add up.** The 2FA ticket passed with 0 examples, failed with 3 and passed with 4. Borderline inputs are sensitive to the whole prompt, not to single parts. This matches Zhao et al. 2021, "Calibrate Before Use".
- **Format alone moves answers.** The few-shot template with no examples fixed 2FA and broke the locked-out ticket.
- **Examples teach output format too.** With no examples the model echoed `Category: account` (34 output tokens). With examples it replied with the bare label (12 to 14 tokens). `extractLabel` searches the reply instead of expecting an exact match, which is why the echoes still passed.
- **Don't fix a failure by adding an example that looks like the failing ticket.** That tunes the prompt to the test set. State the rule in the instruction, or use examples from outside the test set.
- **Twelve cases are too few to rank techniques.** For real conclusions, run each prompt several times and count flip rates.

## Project 3: chain of thought

### The measurement took four fixes

Most of the work was making the "direct" baseline measure what it claims to. The model never changed.

| Change | Direct score | What it showed |
|---|---|---|
| Instruction only ("no working") | 16/16 | Fake. The model wrote out its reasoning anyway on 9 of 16. Output: 1220 tokens |
| `maxOutputTokens: 10` | 9/16 | 5 cut off mid-reasoning. `1980` came back as `198`, most likely the cap cutting the last digit |
| Cap 20 + `CUT OFF` flag from `finishReason` | 7/16 | 8 cut off. Which problems got cut changed between runs: noise, since the model never sees the cap |
| Prefill: prompt ends `A: Answer:` | **12/16** | Only 1 cut off. First honest measurement |

### Final result

| Technique | Accuracy | Input tokens | Output tokens |
|---|---|---|---|
| Direct (prefilled) | 12/16 (12 of 15 answered, 80%) | 990 | 94 |
| Zero-shot CoT | 16/16 | 1038 | 3330 |
| Few-shot CoT (manual demos) | 16/16 | 6750 | 1260 |

Bare-answer misses, all fixed by CoT:

- Overtime pay: 891 instead of 882
- Sara's marbles: 23 instead of 21. Wrong in all 3 bare runs, right in all 5 CoT runs. The most stable CoT effect in the set
- Glasses: 11 instead of 13

What we learned:

- **CoT helps most on problems with many intermediate values.** The misses needed 3 or more values held at once. One- and two-step problems passed bare.
- **CoT costs 13 to 35 times the output tokens** for 80% to 100% here. Whether that's worth it depends on what a wrong answer costs.
- **Modern models reason by default.** Instruction tuning absorbed "let's think step by step". The 2022 papers saw huge gains (PaLM on GSM8K went from 18% to 57%) because models then didn't reason unless asked. This model reasons even when told not to.
- **Instructions are requests, config and prefill are enforced.** "No working" failed about half the time. A token cap stopped the reasoning but mixed compliance with ability. Prefill removed the spot where reasoning would go.
- **Written reasoning lets the model catch its own mistakes.** In one zero-shot CoT run on the widgets problem, it wrote "wait, let's look at the rate per machine" and redid the problem a second way.
- **Few-shot demos control output style and length.** The terse manual demos cut output to about a third of zero-shot CoT. They also taught a sloppy phrase ("3.5, rounded down is 3 marbles left") that caused one failure in one run and got recovered in others.
- **Temperature 0 is not deterministic on hosted models.** Server-side batching and floating-point order change from call to call. Single runs can't separate an effect from a coin flip.

## Project 4: Auto-CoT

### Clusters vs the real families

| Cluster | Members | Family match |
|---|---|---|
| 1 | shirt, pens, overtime, investment, **glasses** | 4 of 5 money. Glasses (counting) joined because it says "60%" |
| 2 | cyclist, train, fuel | 3 of 3 rates, but tank and widgets went elsewhere |
| 3 | Tom, Maya, Ben, **tank, Priya, Sara** | all 3 ages plus 3 strays |
| 4 | muffins, widgets | 1 counting, 1 rates |

11 of 16 landed with their family's majority. Money and ages came out close to whole. Counting scattered across three clusters.

### Result

| Technique | Accuracy | Input tokens | Output tokens |
|---|---|---|---|
| Zero-shot CoT (project 3) | 16/16 | 1038 | 3330 |
| Few-shot CoT, manual demos (project 3) | 16/16 | 6750 | 1260 |
| Auto-CoT | 16/16 | 16046 | 3316 |

Demos picked: pens, cyclist, tank, muffins. All four had correct answers.

What we learned:

- **Embeddings cluster by topic words, not by the math.** `$` and `%` pulled the glasses problem into money. Counting is a way of solving, not a topic, so it had no words to hold it together. That's fine for Auto-CoT, which only needs diverse demos. It's not a way to label problem types.
- **Auto-CoT cost the most and gained nothing here.** Same score as zero-shot CoT with 15x the input. The paper's gain came from fixing zero-shot CoT's errors on 2022 models. This model already scores 16/16 with zero-shot CoT, so there was nothing left to fix.
- **Demos set the output style, again.** The demos were zero-shot CoT replies, so answers copied their bold headers and LaTeX, and output matched zero-shot CoT (3316 vs 3330). Manual terse demos stay the only thing that cut output.
- **The line-count check measures formatting, not reasoning.** The shirt chain failed the 8-line check, so the cluster fell back to pens, its easiest problem. All three rate chains failed too, so cluster 2 used its fallback (the 13-line cyclist chain). Markdown bullets inflate the count. The paper counts reasoning steps.
- **Test-set demos leak.** The 4 demo questions came back almost word for word from their own demos. Read 16/16 as 12 real plus 4 near-free.
- **The paper's main claim went untested.** It says diverse demos survive a wrong one. None was wrong, so this run can't speak to it.
- **The model echoed the trigger.** 3 of 4 demos read "Let's think step by step. Let's think step by step." The model repeats the phrase and `buildAutoDemos` prepends it again. It did no visible harm.

## Project 5: showdown

One fresh run of every technique. The showdown doesn't print per-case output, so we can't see which cases failed.

| Task | Technique | Accuracy | Input | Output | Cut off | vs earlier run |
|---|---|---|---|---|---|---|
| Tickets | Zero-shot | 11/12 | 546 | 12 | 0 | same |
| Tickets | Few-shot | 11/12 | 1566 | 12 | 0 | same |
| Math | Direct (prefilled) | 12/16 | 990 | 115 | 3 | same score, cut-offs up from 1 |
| Math | Zero-shot CoT | 16/16 | 1038 | 3408 | 0 | same |
| Math | Few-shot CoT, manual | 15/16 | 6750 | 1199 | 0 | down from 16/16 |
| Math | Auto-CoT | 16/16 | 16734 | 3639 | 0 | same score, input up from 16046 |

What we learned:

- **The main results held.** Tickets tied for the third time. Direct stayed at 12/16. Both zero-shot CoT and Auto-CoT stayed at 16/16.
- **Manual few-shot CoT dropped one.** Project 3 saw its terse demos cause a one-off miss on Sara's marbles, so that's the likely case, but this run can't confirm it. Either way, "ties zero-shot CoT" was one run's result.
- **Auto-CoT's demos changed between runs.** The clusters are deterministic, but the chains zero-shot CoT writes for them aren't. Input grew by 688 tokens, so at least one demo came out different. Nondeterminism reaches the prompt itself, not just the answers.
- **Prefill is less firm than one run suggested.** Three direct answers got cut off this time, against one before.

### Second run (2026-09-30)

| Task | Technique | Run 1 | Run 2 | Input, run 2 | Output, run 2 | Cut off, run 2 |
|---|---|---|---|---|---|---|
| Tickets | Zero-shot | 11/12 | 11/12 | 546 | 12 | 0 |
| Tickets | Few-shot | 11/12 | **12/12** | 1566 | 14 | 0 |
| Math | Direct (prefilled) | 12/16 | 12/16 | 990 | 104 | 2 |
| Math | Zero-shot CoT | 16/16 | 16/16 | 1038 | 3449 | 0 |
| Math | Few-shot CoT, manual | 15/16 | **16/16** | 6750 | 1260 | 0 |
| Math | Auto-CoT | 16/16 | 16/16 | 16798 | 3488 | 0 |

- **Both run 1 changes undid themselves.** Manual few-shot CoT went back to 16/16, so its 15/16 was a one-off. Few-shot tickets hit 12/12 for the first time in four single runs, which fits the partial flip-rate totals (few-shot 98%, zero-shot 88%).
- **Direct sits at 12/16 in every run, but cut-offs wander:** 1, 3, then 2. The score holds because the cut-off problems overlap with the ones it gets wrong anyway, or because the prefill answer usually fits in the cap even when the model rambles. We can't tell which without per-case output.
- **Auto-CoT's input changed a third time:** 16046, 16734, 16798. Every run builds a different prompt from the same clusters.
- **Zero-shot CoT is the only technique that never moved** on score across five runs of it (projects 3, 4, and two showdowns).
- **Single runs mislead in both directions.** Run 1 made manual CoT look worse than it is. Run 2 makes few-shot look like a clear win on tickets. Only the flip-rate totals can settle either.

### Verdict for this model

- **Tickets:** few-shot, overturned by the flip-rate run below. Zero-shot misses about one ticket per run, almost always 2FA. Stating the 2FA rule in the zero-shot instruction might close the gap at a third of the input, but that's untested.
- **Math, accuracy first:** zero-shot CoT. 80/80 in the flip-rate run, and the cheapest input of any CoT variant.
- **Math, output cost first:** manual few-shot CoT at about a third of the output, with 1 miss in 80. It's cheaper per call whenever output tokens cost more than 2.6x input.
- **Auto-CoT:** never the right pick here. It matches zero-shot CoT's score at 16x the input. It would earn its cost on a task where zero-shot CoT makes mistakes.

## Flip rates: tickets (2026-09-30)

A clean run of `npm run flip-rates -- tickets`: 5 runs per technique, per-case results saved.

| Case | Zero-shot | Few-shot |
|---|---|---|
| 2FA "invalid code" | **1/5** (bug x4) | 5/5 |
| Locked out after update | 4/5 (bug x1) | 5/5 |
| Other 10 tickets | 5/5 each | 5/5 each |

| Technique | Scores per run | Mean | Avg input |
|---|---|---|---|
| Zero-shot | 11, 10, 11, 12, 11 | 92% | 546 |
| Few-shot | 12, 12, 12, 12, 12 | 100% | 1566 |

With yesterday's partial run (per-case data lost) added: zero-shot 108/120 (90%), few-shot 107/108 (99%).

What we learned:

- **Few-shot wins on tickets. The tie was an artifact of single runs.** Three single runs tied at 11/12, and the per-run spread of zero-shot (10 to 12) is wide enough to hide a one-ticket gap every time.
- **The whole gap is one house rule.** All 5 of zero-shot's misses today were 2FA (4) or lockout (1) going to `bug`. The model can't guess "2FA counts as `account`"; it can guess the money and "why can't I" rules. Few-shot's examples carry that rule, and the other examples add nothing measurable.
- **The teammates miss from project 2 was rare.** Few-shot put "invite teammates" in `account` in two single runs, then passed it 5 of 5 today. Yesterday's one lost few-shot miss may have been that ticket.
- **Rare flips need many runs to show.** Lockout failed 1 in 5 for zero-shot. A single run catches a 20% flip only 1 time in 5, which is how we built a story around it in project 2.
- **Retries didn't hurt.** Almost every report hit the per-minute limit and backed off up to 32s. All 120 calls finished in one sitting.

The harness saves each report as it finishes (`results/flip-rates.jsonl`) and resumes from there, and the client stops at once on the daily cap instead of backing off.

## Flip rates: math (2026-10-01)

The daily cap stopped the first attempt in Auto-CoT run 4 on 2026-09-30. The harness resumed from the 15 saved reports and finished the last 5 today, through the usual per-minute backoffs.

| Technique | Scores per run | Total | Avg input | Avg output | Cut off |
|---|---|---|---|---|---|
| Direct (prefilled) | 12, 11, 13, 13, 12 | 61/80 (76%) | 990 | 102 | 9 |
| Zero-shot CoT | 16, 16, 16, 16, 16 | 80/80 | 1038 | 3446 | 0 |
| Few-shot CoT, manual | 15, 16, 16, 16, 16 | 79/80 (99%) | 6750 | 1256 | 0 |
| Auto-CoT | 16, 16, 16, 16, 16 | 80/80 | 16190 (15742 to 16894) | 3394 | 0 |

Every miss, by case:

| Case | Direct | Few-shot CoT, manual |
|---|---|---|
| Overtime (882) | 0/5: cut off 4 times (read as `1`), 900 once | 5/5 |
| Sara's marbles (21) | 0/5: 23 x3, 22 once, cut off once | 4/5: 20 once |
| Glasses (13) | 0/5: 11 every time | 5/5 |
| Ben's father | 3/5, cut off twice | 5/5 |
| Train, cyclist | 4/5 each, cut off once | 5/5 |
| Other 10 problems | 5/5 each | 5/5 each |

What we learned:

- **Direct fails the same three problems every run.** Overtime, Sara and glasses, the three with the most intermediate values, never passed bare. Its ceiling is 13/16. Every point below that was a cut-off on an easy problem (4 in 5 runs, 2 of them on Ben).
- **All of math's run-to-run noise lives in direct's cut-offs.** The model's wrong answers barely move. What moves is whether it tries to reason past the prefill. The 9 cut-offs: overtime 4, Ben 2, Sara, train and cyclist 1 each. Overtime's cut-offs cost nothing since it's wrong anyway, which is why the showdowns saw cut-offs wander while the score held.
- **Two kinds of wrong.** Glasses came back as 11 five times out of five: a stable wrong method. Sara wandered (23, 22): closer to a slip. CoT fixed both every time.
- **Every manual few-shot CoT miss in the whole study is Sara.** Here 1 in 80. The terse demos do cause it, rarely. Claim #3 is now fully overturned.
- **Zero-shot CoT and Auto-CoT both scored 80/80.** Auto-CoT paid 15.6x the input for nothing, and 20 of its 80 passes are the leaked demo questions. Its prompt changed on every build.
- **Cost break-even between the CoT variants.** Zero-shot CoT costs 1038 in + 3446 out per call, manual few-shot CoT 6750 in + 1256 out. They cost the same when output is priced at 2.6x input. Above that ratio, the few-shot version is cheaper per call, and it's always faster, since output length drives latency. Its prefix is the same every call, so context caching would cut the input side further.

## Gotchas hit along the way

- **`thinkingBudget: 0` returns a generic 400 on Gemini 3 models.** Use `thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }`. `MINIMAL` is not a hard off switch the way budget 0 was.
- **`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`** on Windows with Node 24 is exit noise after an uncaught error. Fix the real error and it goes away.
- **Gemini tokenizes numbers digit by digit,** so `Answer: 1980` costs more tokens than it looks. Leave slack in any output cap.
- **Always check `finishReason`.** A cut-off reply parsed with a fallback looks like a wrong answer (`got 1`, `got 60`). `MAX_TOKENS` tells you it was cut.
- **Free tier also caps at 500 requests a day per model**, reset at midnight Pacific. A full day of experiments reaches it. The error names `GenerateRequestsPerDayPerProjectPerModel-FreeTier`.
- **Free tier rate limit** is about 15 requests a minute. `withRetry` in `src/lib/gemini.ts` backs off 2s, 4s, 8s and on up. Runs still finish.
- **The soft prefill** (`Answer:` at the end of the user message) worked on 15 of 16. True prefill (text inside the model's own turn) would be stricter if needed.

## Claims that turned out wrong

These are worth remembering. Each one was a plausible story that a rerun disproved.

1. "The reset-password example over-generalized and pushed the teammates ticket to `account`." Removing it didn't fix teammates.
2. "The missing `account` example made `account` a catch-all." Teammates went to `account` with the account example present too.
3. "Terse demos teach terse thinking and cause the Sara failure." It passed the next run with the same demos. (Partly restored by the math flip rates: Sara is manual CoT's only miss, about 1 run in 4. "Passed once" never proved a cause wrong.)
4. "The model senses which problems need reasoning." The set of cut-off problems changed between runs.
5. "Temperature 0 makes runs repeatable." Only roughly.
6. "On this model, zero-shot and few-shot tie on tickets." Four single runs said so. Five repeated runs gave 92% vs 100%, all from one rule the model can't guess.

Lesson: test every explanation of why a model did something, the same way you'd test a code change.

## Next steps

All five projects and both flip-rate runs are done. The flip rates overturned the tickets tie and confirmed every math result. The follow-up worth doing first:

- Add "login and 2FA problems count as `account`" to the zero-shot instruction and rerun flip rates on tickets (about 15 min). Tests whether one stated rule matches few-shot at a third of the input.

Other ideas, rough time each:

- Plant one wrong demo in Auto-CoT and see if its cluster's problems fail (about 10 min). Tests the paper's main claim, which the clean run couldn't.
- Hold out the demo questions from Auto-CoT scoring (about 10 min). Removes the leak.
- Harder math, GSM-Hard style with larger numbers (about 15 min). Current problems sit at the model's ceiling.
- Add a `thoughtsTokenCount` column to catch hidden thinking under `MINIMAL` (about 5 min).
- Ticket rules no model could guess, such as "anything mentioning the mobile app is `bug`" (about 15 min). Would give few-shot a real gap.
