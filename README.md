# Prompting techniques study

Five small TypeScript scripts that test zero-shot, few-shot, chain of thought (CoT) and Auto-CoT on the same Gemini model and the same data. Each script prints every prompt, every reply and a score table, so you can see why a technique passed or failed.

Results and lessons from our runs are in [FINDINGS.md](FINDINGS.md). Short version: on this model, zero-shot won for classification, zero-shot CoT won for math, and Auto-CoT never paid for its cost.

## Setup

You need Node 20.12 or later (we used 24) and a free Gemini API key.

```sh
npm install
cp .env.example .env   # then paste your key from https://aistudio.google.com/apikey
npm test               # offline, checks the parser and k-means
```

## Run the experiments

| Command | What it tests | API calls | Time on free tier |
|---|---|---|---|
| `npm run zero-shot` | Classify 12 support tickets from instructions alone | 12 | under 1 min |
| `npm run few-shot` | Same tickets with 4 worked examples | 12 | under 1 min |
| `npm run cot` | 16 math problems: direct answer vs zero-shot CoT vs hand-written CoT demos | 48 | 3 to 5 min |
| `npm run auto-cot` | Math with CoT demos the model writes for itself | 21 to 30 | 2 to 3 min |
| `npm run showdown` | Everything above, tables only | about 95 | 5 to 8 min |
| `npm run flip-rates` | Everything 5 times, counting how often each case passes. Add `-- tickets` or `-- math` to run one task | about 475 (120 tickets, 355 math) | 35 to 45 min |

The free tier allows about 15 requests a minute and 500 a day per model. The client backs off and retries on the per-minute limit, so `Rate limited, retrying in 8s` lines are normal. `flip-rates` saves each finished report to `results/flip-rates.jsonl` and skips saved work on restart, so if it hits the daily cap, run it again the next day. Delete that file to start over.

Reading the table:

- **accuracy**: cases where the parsed answer matched the expected one.
- **input / output tokens**: totals across all cases. This is the cost side of each technique.
- **cut off**: replies that hit the output token cap. A cut-off reply usually scores as wrong, so check this column before blaming the model.

Results vary a little between runs even at temperature 0. Run a script twice before trusting a one-case difference.

## Try your own experiment

- **Change a prompt:** each technique is one object with a `prompt` function, in `src/01-zero-shot.ts` through `src/04-auto-cot.ts`.
- **Change the data:** tickets live in `src/data/tickets.ts`, math problems in `src/data/math.ts`. Keep few-shot examples out of the test set, or you're grading the model on answers you gave it.
- **Change the model or settings:** `src/lib/gemini.ts` holds the model name, temperature and thinking level for every call.
- **Add a technique:** write a `Technique` (a name, a `prompt` and a `parse`) and pass it to `evaluate` from `src/lib/eval.ts`. The existing scripts show the pattern.

## Layout

```
src/
  01-zero-shot.ts ... 06-flip-rates.ts one script per experiment
  data/                                test cases with expected answers
  lib/gemini.ts                        API client, retries, token counts
  lib/eval.ts                          runs a technique over cases, prints the table
  lib/flips.ts                         per-case pass counts across repeated runs
  lib/parse.ts                         pulls the label or number out of a reply
  lib/kmeans.ts                        clustering for Auto-CoT
```
