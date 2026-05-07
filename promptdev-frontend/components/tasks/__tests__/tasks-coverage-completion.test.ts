/**
 * Coverage completion for tasks components:
 * - review-results.tsx: parseReviewResults catch+fallback branches
 * - activity-stream/helpers.ts: parseFileChanges catch, parseToolResult branches
 * - activity-stream/event-grouping.ts: empty events
 * - task-changes/event-processors.ts: processFileEvent no filePath, processTestEvent branches
 * - task-changes/types.ts: buildFolderStructure root-level, getSuiteStatus skipped
 */
import { describe, it, expect } from "vitest";
import type { EventType } from "@/lib/api";

function makeEvent(overrides: Partial<{
  id: string;
  eventType: EventType;
  message: string;
  details: string;
  toolOutput: string;
  filePath: string;
  timestamp: string;
}> = {}) {
  return {
    id: overrides.id ?? "e1",
    eventType: overrides.eventType ?? "AGENT_TOOL_RESULT",
    message: overrides.message ?? "msg",
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    ...(overrides.details !== undefined && { details: overrides.details }),
    ...(overrides.toolOutput !== undefined && { toolOutput: overrides.toolOutput }),
    ...(overrides.filePath !== undefined && { filePath: overrides.filePath }),
  };
}

describe("review-results – parseReviewResults", () => {
  it("returns single info result for invalid JSON (catch branch)", async () => {
    const { parseReviewResults } = await import("@/components/tasks/review-results");
    const result = parseReviewResults("not valid json");
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("info");
    expect(result[0].description).toBe("not valid json");
  });

  it("returns empty array for undefined", async () => {
    const { parseReviewResults } = await import("@/components/tasks/review-results");
    expect(parseReviewResults()).toEqual([]);
  });

  it("returns empty for object with no findings/results/issues", async () => {
    const { parseReviewResults } = await import("@/components/tasks/review-results");
    const result = parseReviewResults(JSON.stringify({ unrelated: true }));
    expect(result).toEqual([]);
  });

  it("handles object with findings", async () => {
    const { parseReviewResults } = await import("@/components/tasks/review-results");
    const result = parseReviewResults(
      JSON.stringify({ findings: [{ severity: "warning", filePath: "a.ts", description: "x" }] }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("warning");
  });

  it("handles direct array", async () => {
    const { parseReviewResults } = await import("@/components/tasks/review-results");
    const result = parseReviewResults(
      JSON.stringify([{ severity: "error", filePath: "b.ts", description: "y" }]),
    );
    expect(result).toHaveLength(1);
  });
});

describe("activity-stream/helpers.ts – parseFileChanges + parseToolResult", () => {
  it("parseFileChanges handles non-JSON input (catch branch)", async () => {
    const { parseFileChanges } = await import(
      "@/components/tasks/activity-stream/helpers"
    );
    const result = parseFileChanges("A src/file.ts\nM lib/utils.ts\nD old.js");
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ path: "src/file.ts", status: "added" });
    expect(result[1]).toEqual({ path: "lib/utils.ts", status: "modified" });
    expect(result[2]).toEqual({ path: "old.js", status: "deleted" });
  });

  it("parseFileChanges with unknown status char falls back to modified", async () => {
    const { parseFileChanges } = await import(
      "@/components/tasks/activity-stream/helpers"
    );
    const result = parseFileChanges("X weird.ts");
    expect(result[0].status).toBe("modified");
  });

  it("parseToolResult with invalid JSON in toolOutput (catch)", async () => {
    const { parseToolResult } = await import(
      "@/components/tasks/activity-stream/helpers"
    );
    const result = parseToolResult(makeEvent({ toolOutput: "not-json{" }));
    expect(result.output).toBe("not-json{");
  });

  it("parseToolResult with details but no toolOutput (else if)", async () => {
    const { parseToolResult } = await import(
      "@/components/tasks/activity-stream/helpers"
    );
    const result = parseToolResult(makeEvent({ details: "some details" }));
    expect(result.output).toBe("some details");
  });
});

describe("activity-stream/event-grouping.ts", () => {
  it("groupEvents with empty events returns empty array", async () => {
    const { groupEvents } = await import(
      "@/components/tasks/activity-stream/event-grouping"
    );
    const result = groupEvents([]);
    expect(result).toEqual([]);
  });
});

describe("task-changes/event-processors.ts", () => {
  it("processFileEvent with no filePath falls back to 'unknown'", async () => {
    const { processFileEvent } = await import(
      "@/components/tasks/task-changes/event-processors"
    );
    const map = new Map();
    const counters = { additions: 0, deletions: 0 };
    processFileEvent(
      makeEvent({ eventType: "FILE_CREATED" as EventType }),
      map,
      counters,
    );
    expect(map.has("unknown")).toBe(true);
  });

  it("processTestEvent with name only (no tests array)", async () => {
    const { processTestEvent } = await import(
      "@/components/tasks/task-changes/event-processors"
    );
    const result = processTestEvent(
      makeEvent({
        eventType: "TESTS_PASSED" as EventType,
        details: JSON.stringify({ name: "test-one", status: "passed", duration: 100 }),
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("test-one");
  });

  it("processTestEvent returns empty for no test details", async () => {
    const { processTestEvent } = await import(
      "@/components/tasks/task-changes/event-processors"
    );
    const result = processTestEvent(
      makeEvent({
        eventType: "TESTS_PASSED" as EventType,
        details: JSON.stringify({ unrelated: true }),
      }),
    );
    expect(result).toEqual([]);
  });
});

describe("task-changes/types.ts", () => {
  it("buildFolderStructure with root-level file uses '.' folder", async () => {
    const { buildFolderStructure } = await import(
      "@/components/tasks/task-changes/types"
    );
    const result = buildFolderStructure([
      { filePath: "README.md", type: "modified" },
    ]);
    expect(result.get(".")).toBeDefined();
    expect(result.get(".")![0].filePath).toBe("README.md");
  });

  it("getSuiteStatus returns 'skipped' when not all passed and none failed", async () => {
    const { getSuiteStatus } = await import(
      "@/components/tasks/task-changes/types"
    );
    expect(getSuiteStatus(2, 0, 3)).toBe("skipped");
  });
});
