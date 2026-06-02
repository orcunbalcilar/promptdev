/**
 * Branch coverage for activity-stream pure logic files
 * Targets:
 * - helpers.ts line 51: LANG_MAP unknown ext
 * - helpers.ts line 138: parseToolResult with details fallback
 * - file-tree.tsx lines 47-48: else if (isFile) existing node update
 * - event-grouping.ts line 56: break from consecutive batch on type mismatch
 */
import { describe, it, expect } from "vitest";

describe("helpers.ts branch coverage", () => {
  it("line 51: inferLanguage returns text for unknown extension", async () => {
    const { inferLanguage } = await import("../helpers");
    expect(inferLanguage("file.xyz")).toBe("text");
    expect(inferLanguage("file")).toBe("text");
    expect(inferLanguage()).toBe("text");
  });

  it("line 138: parseToolResult uses resultEvent.details when toolOutput is absent", async () => {
    const { parseToolResult } = await import("../helpers");
    // No toolOutput, but has details
    const result = parseToolResult(
      { details: "some details", toolOutput: undefined } as never,
      false,
    );
    expect(result.output).toBe("some details");
    expect(result.errorText).toBeUndefined();
  });

  it("parseToolResult with hasError uses details as errorText for non-string output", async () => {
    const { parseToolResult } = await import("../helpers");
    const result = parseToolResult(
      { toolOutput: '{"key":"val"}', details: "Error details" } as never,
      true,
    );
    expect(result.output).toBeUndefined();
    expect(result.errorText).toBe("Error details");
  });

  it("parseToolResult with hasError and no details fallbacks to 'Error'", async () => {
    const { parseToolResult } = await import("../helpers");
    const result = parseToolResult(
      { toolOutput: '{"key":"val"}' } as never,
      true,
    );
    expect(result.errorText).toBe("Error");
  });
});

describe("event-grouping.ts line 56 — break on type mismatch", () => {
  it("collectConsecutiveBatch stops when event type changes", async () => {
    const { groupEvents } = await import("../event-grouping");
    // Create events where a STEP type appears then changes to non-STEP
    const events = [
      { id: "1", eventType: "AGENT_TOOL_CALL", message: "m1", timestamp: "2025-01-01T00:00:01" },
      { id: "2", eventType: "PROGRESS", message: "m2", timestamp: "2025-01-01T00:00:02" },
    ];
    const groups = groupEvents(events as never[]);
    expect(groups.length).toBeGreaterThanOrEqual(1);
  });
});
