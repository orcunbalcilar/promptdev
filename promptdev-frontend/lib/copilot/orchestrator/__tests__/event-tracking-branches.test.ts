/**
 * Tests for lib/copilot/orchestrator/event-tracking.ts — covering uncovered branches:
 * - handleAssistantMessage with alternative field names (data.text, data.message)
 * - handleToolStart with alternative field names (data.name, data.tool, data.id, data.arguments, etc.)
 * - handleToolEnd with alternative field names and FIFO fallback
 * - handleUsage/handleSessionUsage with alternative field names
 * - handleSessionError triggers
 * - routeEvent with all event type variants
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTrackOperation = vi.fn().mockResolvedValue(undefined);
vi.mock("../../../monitoring", () => ({
  trackOperation: (...args: unknown[]) => mockTrackOperation(...args),
}));

let subscriptionCallback: ((event: { type: string; data: unknown }) => void) | null = null;
vi.mock("../../client", () => ({
  subscribeToSession: vi.fn((id: string, cb: (event: { type: string; data: unknown }) => void) => {
    subscriptionCallback = cb;
    return vi.fn();
  }),
}));

const mockSendCallback = vi.fn().mockResolvedValue(undefined);
const mockSerializeField = vi.fn((v: unknown) =>
  typeof v === "string" ? v : JSON.stringify(v),
);
vi.mock("../service-bridge", () => ({
  sendCallback: (...args: unknown[]) => mockSendCallback(...args),
  serializeField: (v: unknown) => mockSerializeField(v),
}));

vi.mock("../session-lifecycle", () => ({
  cleanupTaskSession: vi.fn().mockResolvedValue(undefined),
  handleSessionIdle: vi.fn().mockResolvedValue(false),
}));

vi.mock("../pull-request", () => ({
  createPullRequest: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../file-events", () => ({
  extractFilePath: vi.fn((input: Record<string, unknown>) => input?.file_path as string | undefined),
  getFileEventLabel: vi.fn((event: string) => event),
  inferFileEventType: vi.fn((toolName: string) => {
    if (toolName.includes("write") || toolName.includes("create")) return "FILE_CREATED";
    if (toolName.includes("edit")) return "FILE_MODIFIED";
    return null;
  }),
}));

vi.mock("../types", () => ({
  reviewPending: new Map(),
}));

import { setupEventTracking } from "../event-tracking";

function createTaskData() {
  return {
    id: "task-1",
    title: "Test Task",
    repositorySlug: "my-repo",
    projectKey: "PROJ",
    workspaceType: "BITBUCKET" as const,
    sourceBranch: "main",
    targetBranch: "develop",
    status: "IN_PROGRESS",
    userId: "user-1",
    commitMessagePattern: null,
    reviewEnabled: false,
    reviewModelId: null,
    iterative: false,
    maxIterations: 10,
    currentIteration: 0,
    completionCriteria: null,
    steps: null,
    currentStepIndex: null,
    resumePrompt: null,
    systemPrompt: null,
    bootScript: null,
    skills: null,
  };
}

describe("event-tracking – branch coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionCallback = null;
  });

  function setup() {
    const taskData = createTaskData();
    const unsubscribe = setupEventTracking("task-1", "sess-1", taskData);
    return { taskData, unsubscribe, fireEvent: subscriptionCallback! };
  }

  // ── handleAssistantMessage alternative field names ──────────

  describe("handleAssistantMessage – field name fallbacks", () => {
    it("uses data.text when data.content is absent", async () => {
      const { fireEvent } = setup();
      fireEvent({ type: "assistant.message", data: { text: "Response via text" } });

      await vi.waitFor(() => {
        expect(mockSendCallback).toHaveBeenCalledWith(
          "task-1", "LOG",
          expect.objectContaining({ details: expect.objectContaining({ content: "Response via text" }) }),
        );
      });
    });

    it("uses data.message when data.content and data.text are absent", async () => {
      const { fireEvent } = setup();
      fireEvent({ type: "assistant.message", data: { message: "Response via message" } });

      await vi.waitFor(() => {
        expect(mockSendCallback).toHaveBeenCalledWith(
          "task-1", "LOG",
          expect.objectContaining({ details: expect.objectContaining({ content: "Response via message" }) }),
        );
      });
    });

    it("uses empty string when no content field present", async () => {
      const { fireEvent } = setup();
      fireEvent({ type: "assistant.message", data: {} });

      await vi.waitFor(() => {
        expect(mockTrackOperation).toHaveBeenCalledWith(
          expect.objectContaining({ operationType: "MESSAGE_RECEIVED", message: "" }),
        );
      });
    });

    it("stringifies non-string content", async () => {
      const { fireEvent } = setup();
      fireEvent({ type: "assistant.message", data: { content: { key: "value" } } });

      await vi.waitFor(() => {
        expect(mockTrackOperation).toHaveBeenCalledWith(
          expect.objectContaining({ message: '{"key":"value"}' }),
        );
      });
    });
  });

  // ── handleToolStart alternative field names ─────────────────

  describe("handleToolStart – field name fallbacks", () => {
    it("uses data.name when data.toolName is absent", async () => {
      const { fireEvent } = setup();
      fireEvent({
        type: "tool.execution_start",
        data: { name: "readFile", id: "tool-id-1", arguments: { path: "/tmp" } },
      });

      await vi.waitFor(() => {
        expect(mockTrackOperation).toHaveBeenCalledWith(
          expect.objectContaining({ toolName: "readFile" }),
        );
      });
    });

    it("uses data.tool when data.toolName and data.name are absent", async () => {
      const { fireEvent } = setup();
      fireEvent({
        type: "tool.execution_start",
        data: { tool: "writeFile", tool_call_id: "tc-1", params: { content: "..." } },
      });

      await vi.waitFor(() => {
        expect(mockTrackOperation).toHaveBeenCalledWith(
          expect.objectContaining({ toolName: "writeFile" }),
        );
      });
    });

    it("uses 'unknown' when no tool name field present", async () => {
      const { fireEvent } = setup();
      fireEvent({ type: "tool.execution_start", data: {} });

      await vi.waitFor(() => {
        expect(mockTrackOperation).toHaveBeenCalledWith(
          expect.objectContaining({ toolName: "unknown" }),
        );
      });
    });

    it("generates fallback toolId when no id fields present", async () => {
      const { fireEvent } = setup();
      fireEvent({ type: "tool.execution_start", data: { toolName: "test" } });

      await vi.waitFor(() => {
        expect(mockTrackOperation).toHaveBeenCalledWith(
          expect.objectContaining({ operationType: "TOOL_EXECUTION_START" }),
        );
      });
    });

    it("uses data.parameters as fallback for tool input", async () => {
      const { fireEvent } = setup();
      fireEvent({
        type: "tool.execution_start",
        data: { toolName: "test", parameters: { key: "val" } },
      });

      await vi.waitFor(() => {
        expect(mockSendCallback).toHaveBeenCalledWith(
          "task-1", "AGENT_TOOL_CALL",
          expect.objectContaining({ toolInput: { key: "val" } }),
        );
      });
    });

    it("detects git commit in Bash tool", async () => {
      const { fireEvent } = setup();
      fireEvent({
        type: "tool.execution_start",
        data: { toolName: "Bash", input: { command: "git commit -m 'fix'" } },
      });

      await vi.waitFor(() => {
        expect(mockSendCallback).toHaveBeenCalledWith(
          "task-1", "GIT_COMMIT",
          expect.objectContaining({ message: "Git commit in progress" }),
        );
      });
    });

    it("detects git push in Bash tool", async () => {
      const { fireEvent } = setup();
      fireEvent({
        type: "tool.execution_start",
        data: { toolName: "Bash", input: { command: "git push origin main" } },
      });

      await vi.waitFor(() => {
        expect(mockSendCallback).toHaveBeenCalledWith(
          "task-1", "GIT_PUSH",
          expect.objectContaining({ message: "Git push in progress" }),
        );
      });
    });
  });

  // ── handleToolEnd alternative field names ────────────────────

  describe("handleToolEnd – field name fallbacks", () => {
    it("uses data.result as fallback for tool output", async () => {
      const { fireEvent } = setup();
      // Start a tool first
      fireEvent({
        type: "tool.execution_start",
        data: { toolName: "readFile", toolId: "t1", input: {} },
      });
      await vi.waitFor(() => expect(mockTrackOperation).toHaveBeenCalled());
      mockTrackOperation.mockClear();
      mockSendCallback.mockClear();

      // End with data.result instead of data.output
      fireEvent({
        type: "tool.execution_end",
        data: { toolId: "t1", result: "file contents" },
      });

      await vi.waitFor(() => {
        expect(mockSendCallback).toHaveBeenCalledWith(
          "task-1", "AGENT_TOOL_RESULT",
          expect.objectContaining({ toolOutput: "file contents" }),
        );
      });
    });

    it("uses data.errorMessage as fallback for tool error", async () => {
      const { fireEvent } = setup();
      fireEvent({
        type: "tool.execution_start",
        data: { toolName: "readFile", toolId: "t2", input: {} },
      });
      await vi.waitFor(() => expect(mockTrackOperation).toHaveBeenCalled());
      mockTrackOperation.mockClear();
      mockSendCallback.mockClear();

      fireEvent({
        type: "tool.execution_end",
        data: { toolId: "t2", errorMessage: "File not found" },
      });

      await vi.waitFor(() => {
        expect(mockSendCallback).toHaveBeenCalledWith(
          "task-1", "ERROR",
          expect.objectContaining({ message: "Tool error: File not found" }),
        );
      });
    });

    it("uses FIFO fallback when tool ID doesn't match", async () => {
      const { fireEvent } = setup();
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Start a tool
      fireEvent({
        type: "tool.execution_start",
        data: { toolName: "readFile", toolId: "expected-id", input: {} },
      });
      await vi.waitFor(() => expect(mockTrackOperation).toHaveBeenCalled());
      mockTrackOperation.mockClear();

      // End with DIFFERENT tool ID
      fireEvent({
        type: "tool.execution_end",
        data: { toolId: "mismatched-id", output: "result" },
      });

      await vi.waitFor(() => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining("Tool ID mismatch"),
        );
      });
      logSpy.mockRestore();
    });

    it("handles tool.execution_complete as alias for tool.execution_end", async () => {
      const { fireEvent } = setup();
      fireEvent({
        type: "tool.execution_start",
        data: { toolName: "test", toolId: "t3", input: {} },
      });
      await vi.waitFor(() => expect(mockTrackOperation).toHaveBeenCalled());
      mockTrackOperation.mockClear();

      fireEvent({
        type: "tool.execution_complete",
        data: { toolId: "t3", output: "done" },
      });

      await vi.waitFor(() => {
        expect(mockTrackOperation).toHaveBeenCalledWith(
          expect.objectContaining({ operationType: "TOOL_EXECUTION_END" }),
        );
      });
    });

    it("resolves toolName from data.name when data.toolName absent", async () => {
      const { fireEvent } = setup();
      fireEvent({
        type: "tool.execution_start",
        data: { toolName: "Bash", toolId: "t4", input: {} },
      });
      await vi.waitFor(() => expect(mockTrackOperation).toHaveBeenCalled());
      mockTrackOperation.mockClear();

      // End with name instead of toolName
      fireEvent({
        type: "tool.execution_end",
        data: { toolId: "t4", name: "Bash", output: "ok" },
      });

      await vi.waitFor(() => {
        expect(mockTrackOperation).toHaveBeenCalledWith(
          expect.objectContaining({ toolName: "Bash" }),
        );
      });
    });
  });

  // ── handleUsage alternative field names ──────────────────────

  describe("handleUsage – field name fallbacks", () => {
    it("uses data.input_tokens and data.output_tokens", async () => {
      const { fireEvent } = setup();
      fireEvent({
        type: "assistant.usage",
        data: { input_tokens: 100, output_tokens: 50 },
      });

      await vi.waitFor(() => {
        expect(mockTrackOperation).toHaveBeenCalledWith(
          expect.objectContaining({
            operationType: "USAGE",
            inputTokens: 100,
            outputTokens: 50,
          }),
        );
      });
    });

    it("uses data.promptTokens and data.completionTokens", async () => {
      const { fireEvent } = setup();
      fireEvent({
        type: "assistant.usage",
        data: { promptTokens: 200, completionTokens: 100 },
      });

      await vi.waitFor(() => {
        expect(mockTrackOperation).toHaveBeenCalledWith(
          expect.objectContaining({
            inputTokens: 200,
            outputTokens: 100,
          }),
        );
      });
    });

    it("defaults to 0 when no token fields present", async () => {
      const { fireEvent } = setup();
      fireEvent({ type: "assistant.usage", data: {} });

      await vi.waitFor(() => {
        expect(mockTrackOperation).toHaveBeenCalledWith(
          expect.objectContaining({
            inputTokens: 0,
            outputTokens: 0,
          }),
        );
      });
    });
  });

  // ── handleSessionUsage alternative field names ──────────────

  describe("handleSessionUsage – field name fallbacks", () => {
    it("uses data.totalInputTokens and data.totalOutputTokens", async () => {
      const { fireEvent } = setup();
      fireEvent({
        type: "session.usage_info",
        data: { totalInputTokens: 1000, totalOutputTokens: 500 },
      });

      await vi.waitFor(() => {
        expect(mockTrackOperation).toHaveBeenCalledWith(
          expect.objectContaining({
            inputTokens: 1000,
            outputTokens: 500,
          }),
        );
      });
    });

    it("defaults to 0 when no token fields present", async () => {
      const { fireEvent } = setup();
      fireEvent({ type: "session.usage_info", data: {} });

      await vi.waitFor(() => {
        expect(mockTrackOperation).toHaveBeenCalledWith(
          expect.objectContaining({
            inputTokens: 0,
            outputTokens: 0,
          }),
        );
      });
    });
  });

  // ── handleSessionError ──────────────────────────────────────

  describe("handleSessionError", () => {
    it("handles error event type", async () => {
      const { fireEvent } = setup();
      fireEvent({
        type: "error",
        data: { message: "Fatal error occurred" },
      });

      await vi.waitFor(() => {
        expect(mockSendCallback).toHaveBeenCalledWith(
          "task-1", "TASK_FAILED",
          expect.objectContaining({ message: expect.stringContaining("Fatal error occurred") }),
        );
      });
    });

    it("handles session.error event type", async () => {
      const { fireEvent } = setup();
      fireEvent({
        type: "session.error",
        data: { message: "Session terminated" },
      });

      await vi.waitFor(() => {
        expect(mockSendCallback).toHaveBeenCalledWith(
          "task-1", "TASK_FAILED",
          expect.objectContaining({ message: expect.stringContaining("Session terminated") }),
        );
      });
    });

    it("falls back to 'Session error occurred' when no message", async () => {
      const { fireEvent } = setup();
      fireEvent({
        type: "error",
        data: {},
      });

      await vi.waitFor(() => {
        expect(mockSendCallback).toHaveBeenCalledWith(
          "task-1", "TASK_FAILED",
          expect.objectContaining({ message: expect.stringContaining("Session error occurred") }),
        );
      });
    });
  });

  // ── routeEvent – error handling in event queue ─────────────

  describe("routeEvent – error handling", () => {
    it("logs and continues when event handler throws", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { fireEvent } = setup();

      // Make trackOperation throw on first call
      mockTrackOperation.mockRejectedValueOnce(new Error("Track failed"));

      fireEvent({ type: "assistant.message", data: { content: "hello" } });

      await vi.waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining("Error handling event"),
          expect.any(Error),
        );
      });
      errorSpy.mockRestore();
    });
  });
});
