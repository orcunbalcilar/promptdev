/**
 * Coverage completion for:
 * - orchestrator/index.ts lines 86 (model fallback), 154 (setupEventTracking), 178 (non-Error catch)
 * - orchestrator/session-lifecycle.ts lines 161, 204 (iterative checks via handleSessionIdle)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── orchestrator/index.ts ─────────────────────

describe("orchestrator/index.ts branch coverage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("line 86: falls back to gpt-4.1 when task has no modelId", async () => {
    const mockCreateSession = vi.fn().mockResolvedValue({ id: "session-1" });
    const mockSendMessage = vi.fn().mockResolvedValue(undefined);
    const mockSendCallback = vi.fn().mockResolvedValue(undefined);
    const mockFetchTask = vi.fn().mockResolvedValue({
      id: "task-1",
      title: "Test",
      prompt: "do it",
      modelId: "",
      repositorySlug: "repo",
      sourceBranch: "feat",
      targetBranch: "main",
      workspaceType: "BITBUCKET",
      projectKey: "PRJ",
    });
    const mockListModels = vi.fn().mockResolvedValue([]);

    vi.doMock("@/lib/copilot/client", () => ({
      createCopilotSession: mockCreateSession,
      sendMessage: mockSendMessage,
      getSession: vi.fn(),
      destroySession: vi.fn(),
      listAvailableModels: mockListModels,
    }));
    vi.doMock("@/lib/copilot/orchestrator/event-tracking", () => ({
      setupEventTracking: vi.fn(),
    }));
    vi.doMock("@/lib/copilot/orchestrator/system-prompt", () => ({
      buildSystemPrompt: vi.fn().mockReturnValue("system prompt"),
    }));
    vi.doMock("@/lib/copilot/orchestrator/service-bridge", () => ({
      createWorkspace: vi.fn().mockResolvedValue("/tmp/ws"),
      cloneRepository: vi.fn().mockReturnValue("/tmp/ws/repo"),
      fetchTask: mockFetchTask,
      sendCallback: mockSendCallback,
    }));
    vi.doMock("@/lib/monitoring", () => ({
      registerMonitoringSession: vi.fn().mockResolvedValue(undefined),
      endMonitoringSession: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("@/lib/copilot/orchestrator/jira", () => ({
      addJiraComment: vi.fn().mockResolvedValue(undefined),
      transitionJiraIssue: vi.fn().mockResolvedValue(undefined),
    }));

    const { executeTask } = await import("@/lib/copilot/orchestrator/index");
    const result = await executeTask("task-1");
    expect(result.success).toBe(true);
    // createSession should be called with default model "gpt-4.1"
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-4.1" }),
      undefined,
    );
  });

  it("line 178: catches non-Error thrown objects", async () => {
    const mockSendCallback = vi.fn().mockResolvedValue(undefined);
    const mockFetchTask = vi.fn().mockRejectedValue("string error");

    vi.doMock("@/lib/copilot/client", () => ({
      createCopilotSession: vi.fn(),
      sendMessage: vi.fn(),
      getSession: vi.fn(),
      destroySession: vi.fn(),
      listAvailableModels: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/copilot/orchestrator/event-tracking", () => ({
      setupEventTracking: vi.fn(),
    }));
    vi.doMock("@/lib/copilot/orchestrator/system-prompt", () => ({
      buildSystemPrompt: vi.fn().mockReturnValue("prompt"),
    }));
    vi.doMock("@/lib/copilot/orchestrator/service-bridge", () => ({
      createWorkspace: vi.fn().mockResolvedValue("/tmp/ws"),
      cloneRepository: vi.fn(),
      fetchTask: mockFetchTask,
      sendCallback: mockSendCallback,
    }));
    vi.doMock("@/lib/monitoring", () => ({
      registerMonitoringSession: vi.fn(),
      endMonitoringSession: vi.fn(),
    }));
    vi.doMock("@/lib/copilot/orchestrator/jira", () => ({
      addJiraComment: vi.fn(),
      transitionJiraIssue: vi.fn(),
    }));

    const { executeTask } = await import("@/lib/copilot/orchestrator/index");
    const result = await executeTask("task-1");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Unknown error during task execution");
  });
});

// ── session-lifecycle.ts ─────────────────────

describe("session-lifecycle.ts branch coverage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("line 161: iterative task continues when current iteration < max and criteria not met", async () => {
    const mockSendCallback = vi.fn().mockResolvedValue(undefined);
    const mockSendMessage = vi.fn().mockResolvedValue(undefined);
    const mockFetchTask = vi.fn().mockResolvedValue({
      id: "t1",
      currentIteration: null,
      maxIterations: 5,
      iterative: true,
      completionCriteria: "all tests pass",
    });

    vi.doMock("@/lib/copilot/orchestrator/service-bridge", () => ({
      fetchTask: mockFetchTask,
      sendCallback: mockSendCallback,
      cleanupWorkspace: vi.fn(),
    }));
    vi.doMock("@/lib/copilot/client", () => ({
      sendMessage: mockSendMessage,
      destroySession: vi.fn(),
    }));
    vi.doMock("@/lib/monitoring", () => ({
      endMonitoringSession: vi.fn(),
      flushOperations: vi.fn(),
      trackOperation: vi.fn(),
    }));
    vi.doMock("@/lib/copilot/orchestrator/jira", () => ({
      addJiraComment: vi.fn(),
      transitionJiraIssue: vi.fn(),
    }));
    vi.doMock("@/lib/copilot/orchestrator/pull-request", () => ({
      createPullRequest: vi.fn(),
    }));

    const { handleSessionIdle } =
      await import("@/lib/copilot/orchestrator/session-lifecycle");
    const task = {
      id: "t1",
      iterative: true,
      maxIterations: 5,
      currentIteration: null,
      completionCriteria: "all tests pass",
      title: "Iterative Task",
      workspaceType: "BITBUCKET",
    };
    // "working on it" does NOT match completion indicators, so iteration continues
    const isDone = await handleSessionIdle(
      "t1",
      "s1",
      task as never,
      "working on it",
      5,
      3,
    );
    expect(isDone).toBe(false);
    // Should have sent ITERATION_COMPLETED and ITERATION_STARTED callbacks
    expect(mockSendCallback).toHaveBeenCalledWith(
      "t1",
      "ITERATION_COMPLETED",
      expect.anything(),
    );
    expect(mockSendCallback).toHaveBeenCalledWith(
      "t1",
      "ITERATION_STARTED",
      expect.anything(),
    );
    // Should have sent continue message
    expect(mockSendMessage).toHaveBeenCalledWith(
      "s1",
      expect.stringContaining("Continue working"),
    );
  });

  it("line 204: max iterations reached finalizes task", async () => {
    const mockSendCallback = vi.fn().mockResolvedValue(undefined);
    const mockSendMessage = vi.fn().mockResolvedValue(undefined);
    const mockDestroySession = vi.fn().mockResolvedValue(undefined);
    const mockFetchTask = vi.fn().mockResolvedValue({
      id: "t1",
      currentIteration: 4,
      maxIterations: 5,
      iterative: true,
    });

    vi.doMock("@/lib/copilot/orchestrator/service-bridge", () => ({
      fetchTask: mockFetchTask,
      sendCallback: mockSendCallback,
      cleanupWorkspace: vi.fn(),
    }));
    vi.doMock("@/lib/copilot/client", () => ({
      sendMessage: mockSendMessage,
      destroySession: mockDestroySession,
    }));
    vi.doMock("@/lib/monitoring", () => ({
      endMonitoringSession: vi.fn().mockResolvedValue(undefined),
      flushOperations: vi.fn().mockResolvedValue(undefined),
      trackOperation: vi.fn(),
    }));
    vi.doMock("@/lib/copilot/orchestrator/jira", () => ({
      addJiraComment: vi.fn().mockResolvedValue(undefined),
      transitionJiraIssue: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("@/lib/copilot/orchestrator/pull-request", () => ({
      createPullRequest: vi.fn().mockResolvedValue(undefined),
    }));

    const { handleSessionIdle } =
      await import("@/lib/copilot/orchestrator/session-lifecycle");
    const task = {
      id: "t1",
      iterative: true,
      maxIterations: 5,
      currentIteration: 4,
      title: "Iterative Task",
      workspaceType: "BITBUCKET",
    };
    // currentIteration 4 + 1 = 5 >= maxIterations 5 → max reached
    const isDone = await handleSessionIdle(
      "t1",
      "s1",
      task as never,
      "all done",
      10,
      5,
    );
    expect(isDone).toBe(true);
    expect(mockSendCallback).toHaveBeenCalledWith(
      "t1",
      "ITERATION_COMPLETED",
      expect.objectContaining({
        message: expect.stringContaining("Maximum iterations reached"),
      }),
    );
  });
});
