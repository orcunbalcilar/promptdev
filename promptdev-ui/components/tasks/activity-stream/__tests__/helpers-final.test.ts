import { describe, it, expect } from "vitest";
import {
  extractJsonContent,
  inferLanguage,
  formatTimestamp,
  parseFileChanges,
  parseTestResults,
  parseToolParam,
  parseToolResult,
  getReviewStatusText,
} from "@/components/tasks/activity-stream/helpers";

describe("parseFileChanges", () => {
  it("returns empty array for undefined", () => {
    expect(parseFileChanges(undefined)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseFileChanges("")).toEqual([]);
  });

  it("parses JSON array format", () => {
    const json = JSON.stringify([
      { path: "a.ts", status: "added" },
      { path: "b.ts", status: "modified" },
    ]);
    expect(parseFileChanges(json)).toEqual([
      { path: "a.ts", status: "added" },
      { path: "b.ts", status: "modified" },
    ]);
  });

  it("parses git-style text format (line 82: statusMap fallback to 'modified')", () => {
    // Line 82: statusMap[statusChar] ?? "modified" — unknown status chars default to modified
    const text = "A src/new.ts\nM src/old.ts\nD src/removed.ts\nX src/unknown.ts";
    const result = parseFileChanges(text);
    expect(result).toEqual([
      { path: "src/new.ts", status: "added" },
      { path: "src/old.ts", status: "modified" },
      { path: "src/removed.ts", status: "deleted" },
      { path: "src/unknown.ts", status: "modified" }, // unknown 'X' → modified
    ]);
  });

  it("returns empty array for valid JSON that is not an array", () => {
    expect(parseFileChanges(JSON.stringify({ foo: "bar" }))).toEqual([]);
  });
});

describe("extractJsonContent", () => {
  it("returns null for undefined", () => {
    expect(extractJsonContent(undefined)).toBeNull();
  });

  it("returns content from JSON with content field", () => {
    expect(extractJsonContent(JSON.stringify({ content: "hello" }))).toBe(
      "hello",
    );
  });

  it("returns null for JSON without content field", () => {
    expect(extractJsonContent(JSON.stringify({ data: "hello" }))).toBeNull();
  });

  it("returns null for non-JSON text", () => {
    expect(extractJsonContent("plain text")).toBeNull();
  });
});

describe("inferLanguage", () => {
  it("returns text for undefined", () => {
    expect(inferLanguage(undefined)).toBe("text");
  });

  it("returns typescript for .ts", () => {
    expect(inferLanguage("file.ts")).toBe("typescript");
  });

  it("returns text for unknown extension", () => {
    expect(inferLanguage("file.xyz")).toBe("text");
  });
});

describe("formatTimestamp", () => {
  it("formats ISO timestamp", () => {
    const result = formatTimestamp("2025-01-15T10:30:00Z");
    expect(result).toContain(":");
  });
});

// ── Additional branch coverage ──────────────────────────────────

describe("parseTestResults", () => {
  it("returns defaults for undefined", () => {
    const result = parseTestResults(undefined);
    expect(result).toEqual({
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      tests: [],
    });
  });

  it("parses valid JSON with all fields", () => {
    const json = JSON.stringify({
      passed: 5,
      failed: 2,
      skipped: 1,
      total: 8,
      duration: 1200,
      tests: [{ name: "test1", status: "passed" }],
    });
    const result = parseTestResults(json);
    expect(result.passed).toBe(5);
    expect(result.failed).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.total).toBe(8);
    expect(result.duration).toBe(1200);
    expect(result.tests).toHaveLength(1);
  });

  it("handles JSON with null fields using ?? 0 fallback", () => {
    const json = JSON.stringify({
      passed: null,
      failed: null,
      skipped: null,
      total: null,
      tests: null,
    });
    const result = parseTestResults(json);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.total).toBe(0);
    expect(result.tests).toEqual([]);
  });

  it("falls back to regex parsing for non-JSON text", () => {
    const text = "3 passed, 1 failed, 2 skipped";
    const result = parseTestResults(text);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(1);
    expect(result.skipped).toBe(2);
    expect(result.total).toBe(6);
  });

  it("returns 0 for regex when no matches found", () => {
    const text = "no results here";
    const result = parseTestResults(text);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe("parseToolParam", () => {
  it("returns undefined for undefined input", () => {
    expect(parseToolParam(undefined)).toBeUndefined();
  });

  it("parses valid JSON", () => {
    expect(parseToolParam(JSON.stringify({ key: "val" }))).toEqual({
      key: "val",
    });
  });

  it("returns raw string for non-JSON", () => {
    expect(parseToolParam("plain text")).toBe("plain text");
  });
});

describe("parseToolResult", () => {
  it("returns defaults for undefined resultEvent", () => {
    const result = parseToolResult(undefined, false);
    expect(result).toEqual({ output: undefined, errorText: undefined });
  });

  it("parses JSON toolOutput", () => {
    const event = {
      id: "e1",
      eventType: "AGENT_TOOL_RESULT" as const,
      message: "",
      timestamp: "",
      toolOutput: JSON.stringify({ data: "result" }),
    };
    const result = parseToolResult(event, false);
    expect(result.output).toEqual({ data: "result" });
    expect(result.errorText).toBeUndefined();
  });

  it("uses raw toolOutput when JSON parse fails", () => {
    const event = {
      id: "e1",
      eventType: "AGENT_TOOL_RESULT" as const,
      message: "",
      timestamp: "",
      toolOutput: "raw output text",
    };
    const result = parseToolResult(event, false);
    expect(result.output).toBe("raw output text");
  });

  it("falls back to details when no toolOutput", () => {
    const event = {
      id: "e1",
      eventType: "AGENT_TOOL_RESULT" as const,
      message: "",
      timestamp: "",
      details: "detail text",
    };
    const result = parseToolResult(event, false);
    expect(result.output).toBe("detail text");
  });

  it("returns errorText from string output when hasError", () => {
    const event = {
      id: "e1",
      eventType: "AGENT_TOOL_RESULT" as const,
      message: "",
      timestamp: "",
      toolOutput: "Some error message",
    };
    const result = parseToolResult(event, true);
    expect(result.errorText).toBe("Some error message");
    expect(result.output).toBeUndefined();
  });

  it("returns errorText from details when hasError and output is object", () => {
    const event = {
      id: "e1",
      eventType: "AGENT_TOOL_RESULT" as const,
      message: "",
      timestamp: "",
      toolOutput: JSON.stringify({ error: true }),
      details: "Error detail",
    };
    const result = parseToolResult(event, true);
    expect(result.errorText).toBe("Error detail");
    expect(result.output).toBeUndefined();
  });

  it("returns 'Error' when hasError, output is object, and no details", () => {
    const event = {
      id: "e1",
      eventType: "AGENT_TOOL_RESULT" as const,
      message: "",
      timestamp: "",
      toolOutput: JSON.stringify({ err: true }),
    };
    const result = parseToolResult(event, true);
    expect(result.errorText).toBe("Error");
  });
});

describe("getReviewStatusText", () => {
  it("returns 'Review failed' when hasFailed", () => {
    expect(getReviewStatusText(true, false)).toBe("Review failed");
  });

  it("returns 'Review complete' when hasCompleted", () => {
    expect(getReviewStatusText(false, true)).toBe("Review complete");
  });

  it("returns 'Reviewing code changes...' when neither", () => {
    expect(getReviewStatusText(false, false)).toBe(
      "Reviewing code changes...",
    );
  });
});
