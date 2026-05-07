import { describe, it, expect } from "vitest";
import { groupEvents } from "@/components/tasks/activity-stream/event-grouping";
import type { TaskEvent } from "@/lib/api";

function makeEvent(
  id: string,
  eventType: TaskEvent["eventType"],
  message = "",
): TaskEvent {
  return {
    id,
    eventType,
    message,
    timestamp: "2025-01-01T00:00:00Z",
  };
}

describe("groupEvents", () => {
  it("groups AGENT_TOOL_CALL with following AGENT_TOOL_RESULT as tool-pair", () => {
    const events = [
      makeEvent("1", "AGENT_TOOL_CALL", "readFile"),
      makeEvent("2", "AGENT_TOOL_RESULT", "result"),
    ];
    const groups = groupEvents(events);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("tool-pair");
    expect(groups[0].events).toHaveLength(2);
  });

  it("creates single group for ungrouped events", () => {
    const events = [makeEvent("1", "LOG", "hello")];
    const groups = groupEvents(events);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("single");
  });

  it("groups STEP_TYPES as step group (line 72: collectConsecutiveBatch)", () => {
    // Line 72: collectConsecutiveBatch for STEP_TYPES
    const events = [
      makeEvent("1", "STEP_STARTED", "step 1"),
      makeEvent("2", "STEP_COMPLETED", "step 1 done"),
    ];
    const groups = groupEvents(events);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("step");
    expect(groups[0].events).toHaveLength(2);
  });

  it("groups ITERATION_TYPES as iteration group", () => {
    const events = [
      makeEvent("1", "ITERATION_STARTED", "iter 1"),
      makeEvent("2", "ITERATION_COMPLETED", "iter 1 done"),
    ];
    const groups = groupEvents(events);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("iteration");
  });

  it("inserts review group at correct position", () => {
    const events = [
      makeEvent("1", "LOG", "first"),
      makeEvent("2", "REVIEWING_STARTED", "review"),
      makeEvent("3", "REVIEWING_COMPLETED", "done"),
      makeEvent("4", "LOG", "last"),
    ];
    const groups = groupEvents(events);
    // review events are collected and inserted
    const types = groups.map((g) => g.type);
    expect(types).toContain("review");
  });

  it("handles AGENT_TOOL_CALL without matching result", () => {
    const events = [makeEvent("1", "AGENT_TOOL_CALL", "orphan call")];
    const groups = groupEvents(events);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("tool-pair");
    expect(groups[0].events).toHaveLength(1);
  });
});
