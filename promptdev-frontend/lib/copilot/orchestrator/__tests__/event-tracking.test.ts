import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all external dependencies BEFORE imports
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
  serializeField: vi.fn((v: unknown) => {
    if (v == null) return undefined;
    if (typeof v === "string") return v;
    return JSON.stringify(v);
  }),
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
import { trackOperation } from "@/lib/monitoring";
import { sendCallback } from "../service-bridge";
import { handleSessionIdle, cleanupTaskSession } from "../session-lifecycle";
import { inferFileEventType, extractFilePath } from "../file-events";
import type { TaskData } from "../types";
import type { TypedCopilotEvent } from "@/lib/copilot/types";

const BASE_TASK: TaskData = {
  id: "task-1",
  title: "Test task",
  prompt: "Do something",
  repositorySlug: "my-repo",
  projectKey: "PROJ",
  workspaceType: "LOCAL",
  sourceBranch: "main",
  targetBranch: "main",
};

// Helper to capture the event callback from subscribeToSession
function captureEventHandler(): (event: TypedCopilotEvent) => void {
  const call = vi.mocked(subscribeToSession).mock.calls[0];
  return call[1] as (event: TypedCopilotEvent) => void;
}

// Helper to wait for async event queue processing
async function flushEventQueue(): Promise<void> {
  // Allow microtasks to settle
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(subscribeToSession).mockReturnValue(vi.fn());
});

describe("event-tracking", () => {
  // ── setupEventTracking ────────────────────────────────────────

  describe("setupEventTracking", () => {
    it("should subscribe to session events", () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);

      expect(subscribeToSession).toHaveBeenCalledWith(
        "session-1",
        expect.any(Function),
      );
    });

    it("should return an unsubscribe function", () => {
      const mockUnsub = vi.fn();
      vi.mocked(subscribeToSession).mockReturnValue(mockUnsub);

      const unsub = setupEventTracking("task-1", "session-1", BASE_TASK);

      expect(typeof unsub).toBe("function");
      unsub();
      expect(mockUnsub).toHaveBeenCalled();
    });
  });

  // ── routeEvent: assistant.message ─────────────────────────────

  describe("assistant.message events", () => {
    it("should track message and send LOG callback", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "assistant.message",
        data: { content: "Hello world" },
      } as TypedCopilotEvent);

      await flushEventQueue();

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "session-1",
          taskId: "task-1",
          operationType: "MESSAGE_RECEIVED",
          message: "Hello world",
        }),
      );

      expect(sendCallback).toHaveBeenCalledWith("task-1", "LOG", {
        message: "Agent response #1",
        details: { content: "Hello world" },
        copilotSessionId: "session-1",
      });
    });

    it("should extract content from text field", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "assistant.message",
        data: { text: "From text field" },
      } as TypedCopilotEvent);

      await flushEventQueue();

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "From text field",
        }),
      );
    });

    it("should extract content from message field", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "assistant.message",
        data: { message: "From message field" },
      } as TypedCopilotEvent);

      await flushEventQueue();

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({ message: "From message field" }),
      );
    });

    it("should JSON.stringify non-string content", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "assistant.message",
        data: { content: { key: "value" } },
      } as TypedCopilotEvent);

      await flushEventQueue();

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '{"key":"value"}',
        }),
      );
    });

    it("should skip LOG callback for empty messages", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "assistant.message",
        data: { content: "   " },
      } as TypedCopilotEvent);

      await flushEventQueue();

      // trackOperation is still called, but sendCallback should NOT be called with LOG
      expect(trackOperation).toHaveBeenCalled();
      expect(sendCallback).not.toHaveBeenCalledWith(
        "task-1",
        "LOG",
        expect.any(Object),
      );
    });

    it("should increment message count", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "assistant.message",
        data: { content: "First" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      handler({
        type: "assistant.message",
        data: { content: "Second" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith("task-1", "LOG", {
        message: "Agent response #2",
        details: { content: "Second" },
        copilotSessionId: "session-1",
      });
    });
  });

  // ── routeEvent: tool.execution_start ──────────────────────────

  describe("tool.execution_start events", () => {
    it("should track tool start and send AGENT_TOOL_CALL callback", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: {
          toolName: "read_file",
          toolId: "tool-1",
          input: { path: "/src/main.ts" },
        },
      } as TypedCopilotEvent);

      await flushEventQueue();

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: "TOOL_EXECUTION_START",
          toolName: "read_file",
        }),
      );

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "AGENT_TOOL_CALL",
        expect.objectContaining({
          toolName: "read_file",
          toolInput: { path: "/src/main.ts" },
        }),
      );
    });

    it("should detect git commit and send GIT_COMMIT callback", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: {
          toolName: "Bash",
          toolId: "tool-2",
          input: { command: 'git commit -m "fix: something"' },
        },
      } as TypedCopilotEvent);

      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "GIT_COMMIT",
        expect.objectContaining({ message: "Git commit in progress" }),
      );
    });

    it("should detect git push and send GIT_PUSH callback", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: {
          toolName: "Bash",
          toolId: "tool-3",
          input: { command: "git push origin main" },
        },
      } as TypedCopilotEvent);

      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "GIT_PUSH",
        expect.objectContaining({ message: "Git push in progress" }),
      );
    });

    it("should use fallback field names for tool data", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: {
          name: "my_tool",
          id: "id-1",
          arguments: { arg1: "val" },
        },
      } as TypedCopilotEvent);

      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "AGENT_TOOL_CALL",
        expect.objectContaining({
          toolName: "my_tool",
          toolInput: { arg1: "val" },
        }),
      );
    });
  });

  // ── routeEvent: tool.execution_end ────────────────────────────

  describe("tool.execution_end events", () => {
    it("should track tool end and send AGENT_TOOL_RESULT callback", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      // Start tool first
      handler({
        type: "tool.execution_start",
        data: { toolName: "write_file", toolId: "t-1", input: { path: "a.ts" } },
      } as TypedCopilotEvent);
      await flushEventQueue();

      // End tool
      handler({
        type: "tool.execution_end",
        data: { toolId: "t-1", output: "File written" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: "TOOL_EXECUTION_END",
          toolName: "write_file",
          success: true,
        }),
      );

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "AGENT_TOOL_RESULT",
        expect.objectContaining({
          message: "Tool completed: write_file",
          toolName: "write_file",
        }),
      );
    });

    it("should handle tool errors", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: { toolName: "run_tests", toolId: "t-err", input: {} },
      } as TypedCopilotEvent);
      await flushEventQueue();

      handler({
        type: "tool.execution_end",
        data: { toolId: "t-err", error: "Tests failed" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: "TOOL_EXECUTION_ERROR",
          success: false,
          errorMessage: "Tests failed",
        }),
      );

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "ERROR",
        expect.objectContaining({
          errorMessage: "Tests failed",
        }),
      );
    });

    it("should emit file events for file-related tools", async () => {
      vi.mocked(inferFileEventType).mockReturnValue("FILE_MODIFIED");
      vi.mocked(extractFilePath).mockReturnValue("src/app.ts");

      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: { toolName: "edit_file", toolId: "t-file", input: { path: "src/app.ts" } },
      } as TypedCopilotEvent);
      await flushEventQueue();

      handler({
        type: "tool.execution_end",
        data: { toolId: "t-file", output: "Done" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "FILE_MODIFIED",
        expect.objectContaining({
          filePath: "src/app.ts",
        }),
      );
    });

    it("should use FIFO fallback for tool ID mismatch", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: { toolName: "first_tool", toolId: "t-original", input: {} },
      } as TypedCopilotEvent);
      await flushEventQueue();

      // End with different tool ID
      handler({
        type: "tool.execution_end",
        data: { toolId: "t-different", output: "result" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      // Should still resolve to the pending tool name via FIFO
      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "AGENT_TOOL_RESULT",
        expect.objectContaining({
          toolName: "first_tool",
        }),
      );
    });

    it("should handle tool.execution_complete event type", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: { toolName: "some_tool", toolId: "t-c", input: {} },
      } as TypedCopilotEvent);
      await flushEventQueue();

      handler({
        type: "tool.execution_complete" as TypedCopilotEvent["type"],
        data: { toolId: "t-c", output: "done" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: "TOOL_EXECUTION_END",
        }),
      );
    });
  });

  // ── routeEvent: assistant.usage ───────────────────────────────

  describe("assistant.usage events", () => {
    it("should track token usage", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "assistant.usage",
        data: { inputTokens: 100, outputTokens: 50 },
      } as TypedCopilotEvent);

      await flushEventQueue();

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: "USAGE",
          inputTokens: 100,
          outputTokens: 50,
        }),
      );

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "PROGRESS",
        expect.objectContaining({
          details: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        }),
      );
    });

    it("should use fallback field names for token data", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "assistant.usage",
        data: { input_tokens: 200, output_tokens: 100 },
      } as TypedCopilotEvent);

      await flushEventQueue();

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          inputTokens: 200,
          outputTokens: 100,
        }),
      );
    });
  });

  // ── routeEvent: session.usage_info ────────────────────────────

  describe("session.usage_info events", () => {
    it("should track session-level usage", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "session.usage_info",
        data: { inputTokens: 500, outputTokens: 300 },
      } as TypedCopilotEvent);

      await flushEventQueue();

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: "USAGE",
          message: "Session tokens: 500 in / 300 out",
        }),
      );
    });
  });

  // ── routeEvent: session.idle ──────────────────────────────────

  describe("session.idle events", () => {
    it("should call handleSessionIdle", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "session.idle",
        data: {},
      } as TypedCopilotEvent);

      await flushEventQueue();

      expect(handleSessionIdle).toHaveBeenCalledWith(
        "task-1",
        "session-1",
        BASE_TASK,
        "",
        0,
        0,
      );
    });

    it("should not call handleSessionIdle again after task is complete", async () => {
      vi.mocked(handleSessionIdle).mockResolvedValue(true); // returns complete

      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      // First idle — marks task complete
      handler({ type: "session.idle", data: {} } as TypedCopilotEvent);
      await flushEventQueue();

      // Second idle — should be ignored
      handler({ type: "session.idle", data: {} } as TypedCopilotEvent);
      await flushEventQueue();

      expect(handleSessionIdle).toHaveBeenCalledTimes(1);
    });
  });

  // ── routeEvent: error / session.error ─────────────────────────

  describe("error events", () => {
    it("should handle error event and cleanup", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "error",
        data: { message: "Something went wrong" },
      } as TypedCopilotEvent);

      await flushEventQueue();

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: "ERROR",
          message: "Something went wrong",
          success: false,
        }),
      );

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "TASK_FAILED",
        expect.objectContaining({
          message: "Session error: Something went wrong",
        }),
      );

      expect(cleanupTaskSession).toHaveBeenCalledWith(
        "task-1",
        "session-1",
        BASE_TASK,
      );
    });

    it("should handle session.error event type", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "session.error",
        data: { message: "Session crashed" },
      } as TypedCopilotEvent);

      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "TASK_FAILED",
        expect.objectContaining({
          message: "Session error: Session crashed",
        }),
      );
    });

    it("should use fallback message when error has no message", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "error",
        data: {},
      } as TypedCopilotEvent);

      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "TASK_FAILED",
        expect.objectContaining({
          message: "Session error: Session error occurred",
        }),
      );
    });
  });

  // ── Event queue error handling ────────────────────────────────

  describe("event queue", () => {
    it("should catch and log errors in event processing", async () => {
      vi.mocked(trackOperation).mockRejectedValueOnce(
        new Error("Track failed"),
      );
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "assistant.message",
        data: { content: "test" },
      } as TypedCopilotEvent);

      await flushEventQueue();

      // Should not throw, and should have logged error
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ── Branch coverage: alternative field names ──────────────────

  describe("branch coverage – handleToolStart alternative field names", () => {
    it("uses data.name when data.toolName is missing", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: { name: "alt_tool", id: "tid-1", arguments: { key: "val" } },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "AGENT_TOOL_CALL",
        expect.objectContaining({ toolName: "alt_tool" }),
      );
    });

    it("uses data.tool when data.toolName and data.name are missing", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: { tool: "fallback_tool", tool_call_id: "tc-1", params: {} },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "AGENT_TOOL_CALL",
        expect.objectContaining({ toolName: "fallback_tool" }),
      );
    });

    it("uses data.parameters as fallback input", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: { toolName: "my_tool", toolId: "t-params", parameters: { x: 1 } },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "AGENT_TOOL_CALL",
        expect.objectContaining({ toolInput: { x: 1 } }),
      );
    });

    it("uses 'unknown' when no tool name fields are present", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: {},
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "AGENT_TOOL_CALL",
        expect.objectContaining({ toolName: "unknown" }),
      );
    });
  });

  describe("branch coverage – handleToolEnd alternative field names", () => {
    it("uses data.result as output fallback", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: { toolName: "t", toolId: "tid", input: {} },
      } as TypedCopilotEvent);
      await flushEventQueue();

      handler({
        type: "tool.execution_end",
        data: { toolId: "tid", result: "myresult" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "AGENT_TOOL_RESULT",
        expect.objectContaining({ toolOutput: "myresult" }),
      );
    });

    it("uses data.content as output fallback", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: { toolName: "t", toolId: "tid2", input: {} },
      } as TypedCopilotEvent);
      await flushEventQueue();

      handler({
        type: "tool.execution_end",
        data: { toolId: "tid2", content: "contentval" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "AGENT_TOOL_RESULT",
        expect.objectContaining({ toolOutput: "contentval" }),
      );
    });

    it("uses data.errorMessage as error fallback", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: { toolName: "t", toolId: "tid3", input: {} },
      } as TypedCopilotEvent);
      await flushEventQueue();

      handler({
        type: "tool.execution_end",
        data: { toolId: "tid3", errorMessage: "bad input" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: "TOOL_EXECUTION_ERROR",
          errorMessage: "bad input",
        }),
      );
    });

    it("resolves toolName via data.name when pending not found and data.name exists", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      // End without matching start — and no queue entries
      handler({
        type: "tool.execution_end",
        data: { toolId: "orphan", name: "orphan_tool", output: "ok" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "AGENT_TOOL_RESULT",
        expect.objectContaining({ toolName: "orphan_tool" }),
      );
    });

    it("uses data.id as toolId fallback", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: { toolName: "t", id: "alt-id", input: {} },
      } as TypedCopilotEvent);
      await flushEventQueue();

      handler({
        type: "tool.execution_end",
        data: { id: "alt-id", output: "done" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "AGENT_TOOL_RESULT",
        expect.objectContaining({ toolName: "t" }),
      );
    });

    it("uses data.tool_call_id as toolId fallback", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: { toolName: "t", tool_call_id: "tcid", input: {} },
      } as TypedCopilotEvent);
      await flushEventQueue();

      handler({
        type: "tool.execution_end",
        data: { tool_call_id: "tcid", output: "done" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "AGENT_TOOL_RESULT",
        expect.objectContaining({ toolName: "t" }),
      );
    });
  });

  describe("branch coverage – handleUsage alternative field names", () => {
    it("uses promptTokens/completionTokens fields", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "assistant.usage",
        data: { promptTokens: 50, completionTokens: 30 },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({ inputTokens: 50, outputTokens: 30 }),
      );
    });

    it("defaults to 0 when no token fields are present", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "assistant.usage",
        data: {},
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({ inputTokens: 0, outputTokens: 0 }),
      );
    });
  });

  describe("branch coverage – handleSessionUsage alternative field names", () => {
    it("uses totalInputTokens/totalOutputTokens", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "session.usage_info",
        data: { totalInputTokens: 1000, totalOutputTokens: 500 },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          inputTokens: 1000,
          outputTokens: 500,
          message: "Session tokens: 1000 in / 500 out",
        }),
      );
    });

    it("defaults to 0 when no session usage fields are present", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "session.usage_info",
        data: {},
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          inputTokens: 0,
          outputTokens: 0,
        }),
      );
    });
  });

  describe("branch coverage – handleToolEnd with file events", () => {
    it("emits file event when inferFileEventType returns non-null", async () => {
      vi.mocked(inferFileEventType).mockReturnValueOnce("FILE_MODIFIED");
      vi.mocked(extractFilePath).mockReturnValueOnce("/src/index.ts");

      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: { toolName: "write_to_file", toolId: "fid", input: { path: "/src/index.ts" } },
      } as TypedCopilotEvent);
      await flushEventQueue();

      handler({
        type: "tool.execution_end",
        data: { toolId: "fid", output: "file written" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "FILE_MODIFIED",
        expect.objectContaining({
          filePath: "/src/index.ts",
          codeSnippet: "file written",
        }),
      );
    });

    it("does not emit file event when extractFilePath returns undefined", async () => {
      vi.mocked(inferFileEventType).mockReturnValueOnce("FILE_MODIFIED");
      vi.mocked(extractFilePath).mockReturnValueOnce(undefined);

      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: { toolName: "read_file", toolId: "fid2", input: {} },
      } as TypedCopilotEvent);
      await flushEventQueue();

      handler({
        type: "tool.execution_end",
        data: { toolId: "fid2", output: "contents" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(sendCallback).not.toHaveBeenCalledWith(
        "task-1",
        "FILE_MODIFIED",
        expect.anything(),
      );
    });
  });

  describe("branch coverage – handleToolEnd error sends ERROR callback", () => {
    it("sends ERROR callback when toolError is present", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "tool.execution_start",
        data: { toolName: "bad_tool", toolId: "et", input: {} },
      } as TypedCopilotEvent);
      await flushEventQueue();

      handler({
        type: "tool.execution_end",
        data: { toolId: "et", error: "Permission denied" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "ERROR",
        expect.objectContaining({
          message: "Tool error: Permission denied",
          errorMessage: "Permission denied",
        }),
      );
    });
  });

  describe("branch coverage – handleAssistantMessage content fallbacks", () => {
    it("uses data.text when content is missing", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "assistant.message",
        data: { text: "response via text" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "LOG",
        expect.objectContaining({
          details: { content: "response via text" },
        }),
      );
    });

    it("uses data.message when content and text are missing", async () => {
      setupEventTracking("task-1", "session-1", BASE_TASK);
      const handler = captureEventHandler();

      handler({
        type: "assistant.message",
        data: { message: "via message" },
      } as TypedCopilotEvent);
      await flushEventQueue();

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "LOG",
        expect.objectContaining({
          details: { content: "via message" },
        }),
      );
    });
  });
});
