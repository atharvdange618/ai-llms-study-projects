# Prompting techniques study

Learning project: five small TypeScript scripts comparing zero-shot, few-shot, chain of thought and Auto-CoT on Gemini.

**Read `FINDINGS.md` first.** It has the current status, every result so far, the gotchas we hit and the next step.

- Run a project: `npm run zero-shot | few-shot | cot | auto-cot | showdown | flip-rates`
- Checks: `npm run typecheck` and `npm test`
- Live runs spend the user's Gemini free-tier quota. Let the user run them and paste the output, unless they ask otherwise.
- After each analyzed run, add the results and lessons to `FINDINGS.md`.
