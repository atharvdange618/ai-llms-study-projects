import { describe, expect, it } from "vitest";
import type { Report } from "./eval.js";
import { flipRows, summaryRows } from "./flips.js";

const report = (
  results: Report["results"],
  extra: Partial<Report> = {},
): Report => ({
  name: "t",
  correct: results.filter((r) => r.ok).length,
  total: results.length,
  inputTokens: 100,
  outputTokens: 10,
  truncated: 0,
  results,
  ...extra,
});

const cases = [
  { input: "stable question", expected: 1 },
  { input: "flaky question", expected: 21 },
];

describe("flipRows", () => {
  it("counts passes per case and groups wrong answers", () => {
    const runs = new Map([
      [
        "cot",
        [
          report([
            { got: "1", ok: true },
            { got: "21", ok: true },
          ]),
          report([
            { got: "1", ok: true },
            { got: "23", ok: false },
          ]),
          report([
            { got: "1", ok: true },
            { got: "23", ok: false },
          ]),
          report([
            { got: "1", ok: true },
            { got: "null", ok: false },
          ]),
        ],
      ],
    ]);
    expect(flipRows(cases, runs)).toEqual([
      { case: "stable question", cot: "4/4" },
      { case: "flaky question", cot: "1/4 (23 x2, null x1)" },
    ]);
  });

  it("gives each technique its own column", () => {
    const runs = new Map([
      [
        "a",
        [
          report([
            { got: "1", ok: true },
            { got: "21", ok: true },
          ]),
        ],
      ],
      [
        "b",
        [
          report([
            { got: "2", ok: false },
            { got: "21", ok: true },
          ]),
        ],
      ],
    ]);
    expect(flipRows(cases, runs)[0]).toEqual({
      case: "stable question",
      a: "1/1",
      b: "0/1 (2 x1)",
    });
  });
});

describe("summaryRows", () => {
  it("lists every run's score and averages accuracy and cost", () => {
    const runs = new Map([
      [
        "cot",
        [
          report(
            [
              { got: "1", ok: true },
              { got: "21", ok: true },
            ],
            {
              inputTokens: 100,
              truncated: 1,
            },
          ),
          report(
            [
              { got: "1", ok: true },
              { got: "23", ok: false },
            ],
            {
              inputTokens: 200,
            },
          ),
        ],
      ],
    ]);
    expect(summaryRows(runs)).toEqual([
      {
        technique: "cot",
        "score per run": "2/2 1/2",
        "mean accuracy": "75%",
        "avg input tokens": 150,
        "avg output tokens": 10,
        "cut off (all runs)": 1,
      },
    ]);
  });
});
