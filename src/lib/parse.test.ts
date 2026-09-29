import { describe, expect, it } from "vitest";
import { extractLabel, extractNumber } from "./parse.js";

describe("extractNumber", () => {
  it("reads the tagged answer line", () => {
    expect(extractNumber("Answer: 42")).toBe(42);
  });

  it("prefers the tagged answer over numbers in the reasoning", () => {
    expect(
      extractNumber("2200 x 0.9 = 1980.\nAnswer: $1,980\nThen 7 more"),
    ).toBe(1980);
  });

  it("skips an echoed prefix to reach the number", () => {
    // Prefilled prompts end on "Answer:", and the model sometimes repeats it.
    expect(extractNumber("Answer:Answer: 33")).toBe(33);
    expect(extractNumber("Answer: 1980\nThat is 2000 x 1.1 x 0.9")).toBe(1980);
  });

  it("handles decimals and negatives", () => {
    expect(extractNumber("answer: 67.2")).toBe(67.2);
    expect(extractNumber("Answer: -3")).toBe(-3);
  });

  it("falls back to the last number when the format is ignored", () => {
    expect(extractNumber("5 km uphill plus 10 km downhill is 15 km")).toBe(15);
  });

  it("returns null when there is no number", () => {
    expect(extractNumber("I am not sure.")).toBeNull();
  });
});

describe("extractLabel", () => {
  const labels = ["billing", "bug", "feature", "account"] as const;

  it("matches regardless of case", () => {
    expect(extractLabel("Billing.", labels)).toBe("billing");
  });

  it("picks the first label mentioned", () => {
    expect(extractLabel("This is a bug, not billing", labels)).toBe("bug");
  });

  it("returns null when no label appears", () => {
    expect(extractLabel("unsure", labels)).toBeNull();
  });
});
