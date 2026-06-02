/**
 * Coverage completion for review-results.tsx
 * Targets: lines 53-76 (severity sort), 262 (object parse), 321 (catch fallback)
 */
import { describe, it, expect } from "vitest";
import { parseReviewResults } from "../review-results";

describe("review-results.tsx – parseReviewResults branch coverage", () => {
  it("line 262: parses results from nested 'findings' key", () => {
    const input = JSON.stringify({
      findings: [{ severity: "error", filePath: "a.ts", description: "Bug" }],
    });
    const results = parseReviewResults(input);
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe("error");
  });

  it("line 262: parses results from nested 'results' key", () => {
    const input = JSON.stringify({
      results: [{ severity: "warning", filePath: "b.ts", description: "Warn" }],
    });
    const results = parseReviewResults(input);
    expect(results).toHaveLength(1);
  });

  it("line 262: parses results from nested 'issues' key", () => {
    const input = JSON.stringify({
      issues: [{ severity: "info", filePath: "c.ts", description: "Info" }],
    });
    const results = parseReviewResults(input);
    expect(results).toHaveLength(1);
  });

  it("returns empty array for undefined input", () => {
    expect(parseReviewResults()).toEqual([]);
  });

  it("returns single info result for non-JSON string (catch branch)", () => {
    const result = parseReviewResults("not json");
    expect(result).toEqual([
      {
        severity: "info",
        filePath: "review",
        description: "not json",
      },
    ]);
  });

  it("parses direct array format", () => {
    const input = JSON.stringify([
      { severity: "error", filePath: "x.ts", description: "E" },
    ]);
    const results = parseReviewResults(input);
    expect(results).toHaveLength(1);
  });

  it("returns empty for object without known keys", () => {
    const input = JSON.stringify({ unknown: "data" });
    const results = parseReviewResults(input);
    expect(results).toEqual([]);
  });
});
