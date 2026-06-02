import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReviewResult } from "@/components/tasks/review-results";

// ============================================================================
// Mocks — ai-elements (Shiki won't work in jsdom)
// ============================================================================

vi.mock("@/components/ai-elements/code-block", () => ({
  CodeBlockContainer: ({
    children,
  }: Readonly<{ children: React.ReactNode }>) => (
    <div data-testid="code-block">{children}</div>
  ),
  CodeBlockHeader: ({ children }: Readonly<{ children: React.ReactNode }>) => (
    <div>{children}</div>
  ),
  CodeBlockTitle: ({ children }: Readonly<{ children: React.ReactNode }>) => (
    <div>{children}</div>
  ),
  CodeBlockContent: ({ code }: Readonly<{ code: string }>) => <pre>{code}</pre>,
}));

// ============================================================================
// Import components under test AFTER mocks
// ============================================================================

import {
  ReviewResults,
  parseReviewResults,
} from "@/components/tasks/review-results";

// ============================================================================
// Factories
// ============================================================================

function createResult(
  overrides: Partial<ReviewResult> & { severity: ReviewResult["severity"] },
): ReviewResult {
  return {
    filePath: "src/index.ts",
    description: "Test finding",
    ...overrides,
  };
}

// ============================================================================
// ReviewResults component tests
// ============================================================================

describe("ReviewResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- 1. No issues found badge ----------
  it('renders "No issues found" badge when results array is empty', () => {
    render(<ReviewResults results={[]} />);
    expect(screen.getByText("No issues found")).toBeInTheDocument();
  });

  // ---------- 2. All checks passed message ----------
  it('renders "All checks passed" message when results array is empty', () => {
    render(<ReviewResults results={[]} />);
    expect(screen.getByText(/All checks passed/)).toBeInTheDocument();
  });

  // ---------- 3. Error findings ----------
  it("renders error findings with correct severity styling", () => {
    const results = [
      createResult({ severity: "error", description: "Missing null check" }),
    ];
    render(<ReviewResults results={results} />);
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Missing null check")).toBeInTheDocument();
  });

  // ---------- 4. Warning findings ----------
  it("renders warning findings", () => {
    const results = [
      createResult({ severity: "warning", description: "Unused variable" }),
    ];
    render(<ReviewResults results={results} />);
    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(screen.getByText("Unused variable")).toBeInTheDocument();
  });

  // ---------- 5. Info findings ----------
  it("renders info findings", () => {
    const results = [
      createResult({ severity: "info", description: "Consider using const" }),
    ];
    render(<ReviewResults results={results} />);
    expect(screen.getByText("Info")).toBeInTheDocument();
    expect(screen.getByText("Consider using const")).toBeInTheDocument();
  });

  // ---------- 6. Sorts results: errors first, then warnings, then info ----------
  it("sorts results: errors first, then warnings, then info", () => {
    const results = [
      createResult({ severity: "info", description: "Info finding" }),
      createResult({ severity: "error", description: "Error finding" }),
      createResult({ severity: "warning", description: "Warning finding" }),
    ];
    render(<ReviewResults results={results} />);

    const badges = screen.getAllByText(/^(Error|Warning|Info)$/);
    expect(badges[0]).toHaveTextContent("Error");
    expect(badges[1]).toHaveTextContent("Warning");
    expect(badges[2]).toHaveTextContent("Info");
  });

  // ---------- 7. Shows review model name ----------
  it("shows review model name when provided", () => {
    render(<ReviewResults results={[]} reviewModel="gpt-4o" />);
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
  });

  // ---------- 8. Shows duration ----------
  it("shows duration when provided", () => {
    render(<ReviewResults results={[]} duration={3030} />);
    expect(screen.getByText("3s")).toBeInTheDocument();
  });

  // ---------- 9. Renders suggestion text ----------
  it("renders suggestion text when present", () => {
    const results = [
      createResult({
        severity: "warning",
        suggestion: "Use optional chaining instead",
      }),
    ];
    render(<ReviewResults results={results} />);
    expect(
      screen.getByText("Use optional chaining instead"),
    ).toBeInTheDocument();
  });

  // ---------- 10. Renders code snippet ----------
  it("renders code snippet when present", () => {
    const results = [
      createResult({
        severity: "error",
        filePath: "src/app.tsx",
        codeSnippet: "const x = null.foo",
      }),
    ];
    render(<ReviewResults results={results} />);
    expect(screen.getByText("const x = null.foo")).toBeInTheDocument();
  });

  // ---------- 11. Renders file path and line number ----------
  it("renders file path and line number", () => {
    const results = [
      createResult({
        severity: "error",
        filePath: "src/utils.ts",
        line: 42,
      }),
    ];
    render(<ReviewResults results={results} />);
    expect(screen.getByText("src/utils.ts")).toBeInTheDocument();
    expect(screen.getByText(":42")).toBeInTheDocument();
  });

  // ---------- 12. Shows correct issue count badge ----------
  it("shows correct issue count badge", () => {
    const results = [
      createResult({ severity: "error" }),
      createResult({ severity: "warning" }),
      createResult({ severity: "info" }),
    ];
    render(<ReviewResults results={results} />);
    expect(screen.getByText("3 issues found")).toBeInTheDocument();
  });
});

// ============================================================================
// parseReviewResults tests
// ============================================================================

describe("parseReviewResults", () => {
  // ---------- 13. Undefined input ----------
  it("returns empty array for undefined input", () => {
    expect(parseReviewResults(undefined)).toEqual([]);
  });

  // ---------- 14. Parses JSON array ----------
  it("parses JSON array of results", () => {
    const input: ReviewResult[] = [
      { severity: "error", filePath: "a.ts", description: "bad" },
    ];
    const result = parseReviewResults(JSON.stringify(input));
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("error");
    expect(result[0].description).toBe("bad");
  });

  // ---------- 15. Parses nested findings format ----------
  it("parses nested { findings: [...] } format", () => {
    const input = {
      findings: [
        { severity: "warning", filePath: "b.ts", description: "warn" },
      ],
    };
    const result = parseReviewResults(JSON.stringify(input));
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("warning");
  });

  // ---------- 16. Parses nested results format ----------
  it("parses nested { results: [...] } format", () => {
    const input = {
      results: [{ severity: "info", filePath: "c.ts", description: "note" }],
    };
    const result = parseReviewResults(JSON.stringify(input));
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("info");
  });

  // ---------- 17. Parses nested issues format ----------
  it("parses nested { issues: [...] } format", () => {
    const input = {
      issues: [{ severity: "error", filePath: "d.ts", description: "issue" }],
    };
    const result = parseReviewResults(JSON.stringify(input));
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("issue");
  });

  // ---------- 18. Non-JSON text returns single info result ----------
  it("returns single info result for non-JSON text", () => {
    const result = parseReviewResults("This is plain text feedback");
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("info");
    expect(result[0].filePath).toBe("review");
    expect(result[0].description).toBe("This is plain text feedback");
  });

  // ---------- 19. Empty JSON array ----------
  it("returns empty array for empty JSON array", () => {
    const result = parseReviewResults("[]");
    expect(result).toEqual([]);
  });
});
