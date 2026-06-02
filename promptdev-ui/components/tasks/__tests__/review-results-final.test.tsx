import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ReviewResults,
  parseReviewResults,
  type ReviewResult,
} from "@/components/tasks/review-results";

describe("ReviewResults", () => {
  it("renders 'No issues found' badge when results is empty", () => {
    render(<ReviewResults results={[]} />);
    expect(screen.getByText("No issues found")).toBeInTheDocument();
    expect(
      screen.getByText("All checks passed — no issues found."),
    ).toBeInTheDocument();
  });

  it("renders review model and duration meta info (lines 111-113)", () => {
    // Lines 111-113: reviewModel and duration rendering
    const results: ReviewResult[] = [
      {
        severity: "info",
        filePath: "src/app.ts",
        description: "Consider adding type annotations",
      },
    ];
    render(
      <ReviewResults
        results={results}
        reviewModel="gpt-4o"
        duration={5500}
      />,
    );
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
    expect(screen.getByText("5s")).toBeInTheDocument();
  });

  it("renders findings sorted by severity with all severity types", () => {
    const results: ReviewResult[] = [
      {
        severity: "info",
        filePath: "src/a.ts",
        description: "Info finding",
      },
      {
        severity: "error",
        filePath: "src/b.ts",
        description: "Error finding",
        line: 42,
        suggestion: "Fix this",
        codeSnippet: "const x = 1;",
      },
      {
        severity: "warning",
        filePath: "src/c.ts",
        description: "Warning finding",
      },
    ];
    render(<ReviewResults results={results} />);
    // Should render all 3 findings
    expect(screen.getByText("Error finding")).toBeInTheDocument();
    expect(screen.getByText("Warning finding")).toBeInTheDocument();
    expect(screen.getByText("Info finding")).toBeInTheDocument();
    expect(screen.getByText("3 issues found")).toBeInTheDocument();
  });
});

describe("parseReviewResults", () => {
  it("returns empty array for undefined details", () => {
    expect(parseReviewResults()).toEqual([]);
  });

  it("parses JSON array directly (line 337)", () => {
    const arr: ReviewResult[] = [
      { severity: "error", filePath: "a.ts", description: "bad" },
    ];
    expect(parseReviewResults(JSON.stringify(arr))).toEqual(arr);
  });

  it("parses object with findings key", () => {
    const findings = [
      { severity: "warning", filePath: "b.ts", description: "warn" },
    ];
    expect(parseReviewResults(JSON.stringify({ findings }))).toEqual(findings);
  });

  it("parses object with results key", () => {
    const results = [
      { severity: "info", filePath: "c.ts", description: "info" },
    ];
    expect(parseReviewResults(JSON.stringify({ results }))).toEqual(results);
  });

  it("parses object with issues key", () => {
    const issues = [
      { severity: "error", filePath: "d.ts", description: "err" },
    ];
    expect(parseReviewResults(JSON.stringify({ issues }))).toEqual(issues);
  });

  it("returns single info result for non-JSON text", () => {
    const result = parseReviewResults("Some raw review text");
    expect(result).toEqual([
      {
        severity: "info",
        filePath: "review",
        description: "Some raw review text",
      },
    ]);
  });

  it("returns empty array for JSON object with no known keys", () => {
    expect(parseReviewResults(JSON.stringify({ foo: "bar" }))).toEqual([]);
  });
});

describe("formatDuration coverage via ReviewResults", () => {
  it("renders duration < 1000ms as milliseconds (line 111: ms < 1000)", () => {
    const results: ReviewResult[] = [
      { severity: "info", filePath: "a.ts", description: "hint" },
    ];
    render(<ReviewResults results={results} duration={500} />);
    expect(screen.getByText("500ms")).toBeInTheDocument();
  });

  it("renders duration >= 60s as minutes and seconds (line 113: mins > 0)", () => {
    const results: ReviewResult[] = [
      { severity: "warning", filePath: "b.ts", description: "check" },
    ];
    render(<ReviewResults results={results} duration={125000} />);
    expect(screen.getByText("2m 5s")).toBeInTheDocument();
  });

  it("renders only warning and info badges when no errors", () => {
    const results: ReviewResult[] = [
      { severity: "warning", filePath: "a.ts", description: "warn1" },
      { severity: "info", filePath: "b.ts", description: "info1" },
    ];
    render(<ReviewResults results={results} />);
    expect(screen.getByText("2 issues found")).toBeInTheDocument();
  });
});
