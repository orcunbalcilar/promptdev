/**
 * Final branch coverage for orchestrator files
 * Targets:
 * - event-tracking.ts line 178: tool_end with unknown toolId and EMPTY queue (neither if nor else-if)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/monitoring", () => ({
  trackOperation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/copilot/client", () => ({
  subscribeToSession: vi.fn(),
}));

vi.mock("../file-events", () => ({
  inferFileEventType: vi.fn().mockReturnValue(null),
  extractFilePath: vi.fn().mockReturnValue(undefined),
  getFileEventLabel: vi.fn().mockReturnValue("Modified"),
}));

vi.mock("../pull-request", () => ({
  createPullRequest: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../service-bridge", () => ({
  sendCallback: vi.fn().mockResolvedValue(undefined),
  serializeField: vi.fn((v: unknown) => (typeof v === "string" ? v : JSON.stringify(v))),
}));

vi.mock("../session-lifecycle", () => ({
  handleSessionIdle: vi.fn().mockResolvedValue(false),
  cleanupTaskSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../types", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../types")>();
  return {
    ...actual,
    reviewPending: new Set<string>(),
    taskSessions: new Map<string, string>(),
  };
});

import { setupEventTracking } from "../event-tracking";
import { subscribeToSession } from "@/lib/copilot/client";
import { sendCallback } from "../service-bridge";
import type { TypedCopilotEvent } from "@/lib/copilot/types";

function captureEventHandler() {
  return vi.mocked(subscribeToSession).mock.calls.at(-1)![1];
}

async function flushEventQueue() {
  await new Promise((r) => setTimeout(r, 10));
  await new Promise((r) => setTimeout(r, 10));
}

const BASE_TASK = {
  id: "task-1",
  title: "Test",
  prompt: "test",
  repositorySlug: "repo",
  projectKey: "PROJ",
  workspaceType: "BITBUCKET" as const,
  sourceBranch: "feature",
  targetBranch: "main",
};

describe("event-tracking.ts line 178 — implicit else branch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles tool_end with unknown toolId and EMPTY pending queue", async () => {
    setupEventTracking("task-1", "session-1", BASE_TASK);
    const handler = captureEventHandler();

    // Send tool.execution_end without any prior tool_start
    // This means pendingTools is empty AND pendingToolQueue is empty
    // Covers the implicit else branch at line 178
    handler({
      type: "tool.execution_end",
      data: { toolId: "unknown-tool-id", output: "result", toolName: "someTool" },
    } as TypedCopilotEvent);
    await flushEventQueue();

    expect(sendCallback).toHaveBeenCalledWith(
      "task-1",
      "AGENT_TOOL_RESULT",
      expect.objectContaining({
        toolName: "someTool",
      }),
    );
  });
});
