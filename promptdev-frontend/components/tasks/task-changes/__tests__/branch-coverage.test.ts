/**
 * Branch coverage for task-changes logic
 * Targets:
 * - types.ts line 57: inferLanguage optional chaining
 * - types.ts line 104: getFileName .pop() fallback
 * - event-processors.ts line 96: testDetails?.tests branch
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { inferLanguage, getFileName } from "../types";

describe("types.ts branch coverage", () => {
  it("line 57: inferLanguage handles file with unknown extension", () => {
    expect(inferLanguage("file.xyz")).toBe("text");
  });

  it("line 57: inferLanguage handles file with no extension", () => {
    // Dockerfile has a special mapping → use a truly unknown name
    expect(inferLanguage("randomfile")).toBe("text");
  });

  it("line 104: getFileName extracts file name from path", () => {
    expect(getFileName("src/components/Button.tsx")).toBe("Button.tsx");
  });

  it("line 104: getFileName returns full path when no slashes", () => {
    expect(getFileName("Button.tsx")).toBe("Button.tsx");
  });
});

describe("event-processors.ts line 96 — testDetails?.tests", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("processes test details with tests array", async () => {
    const { processTestEvent } = await import("../event-processors");
    const event = {
      id: "1",
      eventType: "TEST_RUN" as const,
      taskId: "t1",
      message: "Tests",
      timestamp: "2025-01-01T00:00:00Z",
      details: JSON.stringify({
        tests: [
          { name: "test1", status: "passed", duration: 100 },
          { name: "test2", status: "failed", duration: 200, error: "fail" },
        ],
      }),
    };
    const result = processTestEvent(event as never);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ name: "test1", status: "passed" });
  });

  it("returns empty array when testDetails has no tests", async () => {
    const { processTestEvent } = await import("../event-processors");
    const event = {
      id: "2",
      eventType: "TEST_RUN" as const,
      taskId: "t1",
      message: "Tests",
      timestamp: "2025-01-01T00:00:00Z",
      details: JSON.stringify({ summary: "all passed" }),
    };
    const result = processTestEvent(event as never);
    expect(result).toEqual([]);
  });
});
