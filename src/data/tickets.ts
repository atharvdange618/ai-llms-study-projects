import type { Case } from "../lib/eval.js";

export const LABELS = ["billing", "bug", "feature", "account"] as const;
export type Label = (typeof LABELS)[number];

// House rules the label names don't spell out (the few-shot examples teach them; in our runs
// the model guessed most of them anyway, see FINDINGS.md):
//   - login, password and 2FA problems are "account", even when they look like bugs
//   - anything about money is "billing", even when a bug caused it
//   - "why can't I" and "you still don't support" complaints are "feature"
export const TICKETS: Case<Label>[] = [
  {
    input:
      "I keep getting 'invalid code' when entering my 2FA code, even though it's correct.",
    expected: "account",
  },
  {
    input:
      "The app froze while processing my payment and now I see two charges on my card.",
    expected: "billing",
  },
  {
    input: "Honestly shocking that you still don't support dark mode.",
    expected: "feature",
  },
  {
    input:
      "Clicking 'Save' on the settings page does nothing, no error either.",
    expected: "bug",
  },
  {
    input: "How do I change the email address on my profile?",
    expected: "account",
  },
  {
    input: "Can I get an invoice with my company's VAT number on it?",
    expected: "billing",
  },
  {
    input:
      "The search results page crashes whenever my query contains an emoji.",
    expected: "bug",
  },
  {
    input: "Let me schedule reports to go out weekly by email, please.",
    expected: "feature",
  },
  {
    input:
      "I got locked out after the latest update and the 'forgot password' link gives a 404.",
    expected: "account",
  },
  {
    input: "Your pricing page says $10/month but I was billed $12.",
    expected: "billing",
  },
  {
    input: "Uploading a PDF over 10MB shows a spinner forever.",
    expected: "bug",
  },
  {
    input: "Why can't I invite more than 5 teammates on the Pro plan?",
    expected: "feature",
  },
];
