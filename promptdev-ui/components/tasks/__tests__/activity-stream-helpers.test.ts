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
} from "../activity-stream/helpers";
import type { TaskEvent } from "@/lib/api";

describe("extractJsonContent", () => {
  it("returns null for undefined", () => {
    expect(extractJsonContent(undefined)).toBeNull();
  });

  it("returns null for non-JSON text", () => {
    expect(extractJsonContent("hello world")).toBeNull();
  });

  it("returns null for JSON without content key", () => {
    expect(extractJsonContent('{"foo": "bar"}')).toBeNull();
  });

  it("extracts content from JSON", () => {
    expect(extractJsonContent('{"content": "hello"}')).toBe("hello");
  });

  it("converts non-string content to string", () => {
    expect(extractJsonContent('{"content": 42}')).toBe("42");
  });
});

describe("inferLanguage", () => {
  it('returns "text" for no file path', () => {
    expect(inferLanguage(undefined)).toBe("text");
  });

  it("infers typescript for .ts files", () => {
    expect(inferLanguage("src/index.ts")).toBe("typescript");
  });

  it("infers tsx for .tsx files", () => {
    expect(inferLanguage("Component.tsx")).toBe("tsx");
  });

  it("infers python for .py files", () => {
    expect(inferLanguage("main.py")).toBe("python");
  });

  it("infers json for .json files", () => {
    expect(inferLanguage("package.json")).toBe("json");
  });

  it("returns text for unknown extension", () => {
    expect(inferLanguage("image.png")).toBe("text");
  });

  it("infers bash for .sh files", () => {
    expect(inferLanguage("script.sh")).toBe("bash");
  });

  it("infers yaml for .yml files", () => {
    expect(inferLanguage("config.yml")).toBe("yaml");
  });
});

describe("formatTimestamp", () => {
  it("formats ISO timestamp to time", () => {
    const result = formatTimestamp("2026-01-15T14:30:45Z");
    // Locale-dependent, just check it contains digits
    expect(result).toMatch(/\d/);
  });
});

describe("parseFileChanges", () => {
  it("returns empty array for undefined", () => {
    expect(parseFileChanges(undefined)).toEqual([]);
  });

  it("parses JSON array", () => {
    const changes = JSON.stringify([
      { path: "src/index.ts", status: "added", additions: 10, deletions: 0 },
    ]);
    const result = parseFileChanges(changes);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/index.ts");
    expect(result[0].status).toBe("added");
  });

  it("parses line-based format", () => {
    const changes = "A src/new-file.ts\nM src/existing.ts\nD src/old.ts";
    const result = parseFileChanges(changes);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ path: "src/new-file.ts", status: "added" });
    expect(result[1]).toEqual({ path: "src/existing.ts", status: "modified" });
    expect(result[2]).toEqual({ path: "src/old.ts", status: "deleted" });
  });

  it("handles unknown status char with modified default", () => {
    const changes = "X src/unknown.ts";
    const result = parseFileChanges(changes);
    expect(result[0].status).toBe("modified");
  });
});

describe("parseTestResults", () => {
  it("returns zeros for undefined", () => {
    const result = parseTestResults(undefined);
    expect(result.total).toBe(0);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("parses JSON test results", () => {
    const details = JSON.stringify({
      passed: 10,
      failed: 2,
      skipped: 1,
      total: 13,
      duration: 5000,
      tests: [{ name: "test1", status: "passed" }],
    });
    const result = parseTestResults(details);
    expect(result.passed).toBe(10);
    expect(result.failed).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.total).toBe(13);
    expect(result.duration).toBe(5000);
    expect(result.tests).toHaveLength(1);
  });

  it("parses text-based test results", () => {
    const details = "10 passed, 2 failed, 1 skipped";
    const result = parseTestResults(details);
    expect(result.passed).toBe(10);
    expect(result.failed).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.total).toBe(13);
  });

  it("handles partial text matches", () => {
    const details = "5 passed";
    const result = parseTestResults(details);
    expect(result.passed).toBe(5);
    expect(result.failed).toBe(0);
    expect(result.total).toBe(5);
  });
});

describe("parseToolParam", () => {
  it("returns undefined for undefined", () => {
    expect(parseToolParam(undefined)).toBeUndefined();
  });

  it("parses JSON string", () => {
    expect(parseToolParam('{"key": "value"}')).toEqual({ key: "value" });
  });

  it("returns raw string for non-JSON", () => {
    expect(parseToolParam("plain text")).toBe("plain text");
  });
});

describe("parseToolResult", () => {
  it("returns undefined output when no result event", () => {
    const { output, errorText } = parseToolResult(undefined);
    expect(output).toBeUndefined();
    expect(errorText).toBeUndefined();
  });

  it("returns parsed JSON output", () => {
    const event = {
      id: "1",
      taskId: "task-1",
      eventType: "AGENT_TOOL_RESULT" as const,
      toolOutput: '{"result": "ok"}',
      timestamp: "2026-01-15T10:00:00Z",
      message: "",
    } as TaskEvent;
    const { output } = parseToolResult(event);
    expect(output).toEqual({ result: "ok" });
  });

  it("returns raw string output for non-JSON", () => {
    const event = {
      id: "1",
      taskId: "task-1",
      eventType: "AGENT_TOOL_RESULT" as const,
      toolOutput: "plain result",
      timestamp: "2026-01-15T10:00:00Z",
      message: "",
    } as TaskEvent;
    const { output } = parseToolResult(event);
    expect(output).toBe("plain result");
  });

  it("returns errorText when hasError is true", () => {
    const event = {
      id: "1",
      taskId: "task-1",
      eventType: "AGENT_TOOL_RESULT" as const,
      details: "Something went wrong",
      timestamp: "2026-01-15T10:00:00Z",
      message: "",
    } as TaskEvent;
    const { output, errorText } = parseToolResult(event, true);
    expect(output).toBeUndefined();
    expect(errorText).toBe("Something went wrong");
  });

  it("falls back to details when no toolOutput", () => {
    const event = {
      id: "1",
      taskId: "task-1",
      eventType: "AGENT_TOOL_RESULT" as const,
      details: "detail text",
      timestamp: "2026-01-15T10:00:00Z",
      message: "",
    } as TaskEvent;
    const { output } = parseToolResult(event);
    expect(output).toBe("detail text");
  });
});

describe("getReviewStatusText", () => {
  it("returns failure text when failed", () => {
    expect(getReviewStatusText(true, false)).toBe("Review failed");
  });

  it("returns complete text when completed", () => {
    expect(getReviewStatusText(false, true)).toBe("Review complete");
  });

  it("returns in-progress text when neither", () => {
    expect(getReviewStatusText(false, false)).toBe("Reviewing code changes...");
  });
});
