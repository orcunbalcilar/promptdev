/**
 * Tests for lib/copilot/orchestrator/index.ts — covering uncovered lines:
 * L80: Workspace creation failure fallback (warn and continue)
 * L94: model capabilities fetch failure (listAvailableModels throws)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────

vi.mock("@/lib/monitoring", () => ({
  registerMonitoringSession: vi.fn().mockResolvedValue(undefined),
  endMonitoringSession: vi.fn().mockResolvedValue(undefined),
}));

const mockSendCallback = vi.fn().mockResolvedValue(undefined);
const mockFetchTask = vi.fn();
const mockCreateWorkspace = vi.fn();
const mockCloneRepository = vi.fn();
vi.mock("../service-bridge", () => ({
  sendCallback: (...args: unknown[]) => mockSendCallback(...args),
  fetchTask: (...args: unknown[]) => mockFetchTask(...args),
  createWorkspace: (...args: unknown[]) => mockCreateWorkspace(...args),
  cloneRepository: (...args: unknown[]) => mockCloneRepository(...args),
}));

const mockCreateCopilotSession = vi.fn();
const mockDestroySession = vi.fn();
const mockGetSession = vi.fn();
const mockListAvailableModels = vi.fn();
const mockSendMessage = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/copilot/client", () => ({
  createCopilotSession: (...args: unknown[]) =>
    mockCreateCopilotSession(...args),
  destroySession: (...args: unknown[]) => mockDestroySession(...args),
  getSession: (...args: unknown[]) => mockGetSession(...args),
  listAvailableModels: (...args: unknown[]) => mockListAvailableModels(...args),
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));

vi.mock("../event-tracking", () => ({
  setupEventTracking: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock("../jira", () => ({
  transitionJiraIssue: vi.fn().mockResolvedValue(undefined),
  addJiraComment: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../system-prompt", () => ({
  buildSystemPrompt: vi.fn().mockReturnValue("System prompt"),
}));

vi.mock("../types", () => ({
  taskSessions: new Map(),
}));

import { executeTask } from "@/lib/copilot/orchestrator/index";

describe("orchestrator – uncovered lines", () => {
  const baseTask = {
    id: "task-1",
    title: "Test task",
    prompt: "Do something",
    repositorySlug: "my-repo",
    workspaceType: "LOCAL",
    modelId: "gpt-4.1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchTask.mockResolvedValue(baseTask);
    mockCreateCopilotSession.mockResolvedValue({ id: "sess-1" });
    mockListAvailableModels.mockResolvedValue([
      { id: "gpt-4.1", capabilities: { supports: { reasoningEffort: false } } },
    ]);
  });

  // ── L80: workspace creation failure ───────────────────────

  describe("workspace creation failure", () => {
    it("warns and continues when createWorkspace throws", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockCreateWorkspace.mockRejectedValue(new Error("Disk full"));

      const result = await executeTask("task-1");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Workspace creation failed"),
        expect.any(Error),
      );
      expect(result.success).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  // ── L94: model capabilities fetch error ───────────────────

  describe("model capabilities fetch failure", () => {
    it("warns and defaults supportsReasoning to false", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockCreateWorkspace.mockResolvedValue("/tmp/ws");
      mockListAvailableModels.mockRejectedValue(new Error("API down"));

      const result = await executeTask("task-1");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to fetch model capabilities"),
        expect.any(Error),
      );
      // Session should still be created (without reasoning)
      expect(mockCreateCopilotSession).toHaveBeenCalledWith(
        expect.objectContaining({
          reasoningEffort: undefined,
        }),
        undefined,
      );
      expect(result.success).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  // ── Successful flow for completeness ──────────────────────

  describe("successful task execution", () => {
    it("completes when all steps succeed", async () => {
      mockCreateWorkspace.mockResolvedValue("/tmp/ws");

      const result = await executeTask("task-1");

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe("sess-1");
      expect(mockSendMessage).toHaveBeenCalledWith("sess-1", "Do something");
    });
  });

  // ── Branch coverage: resumePrompt conditional ─────────────

  describe("branch coverage – resumePrompt", () => {
    it("constructs resume prompt when task has resumePrompt", async () => {
      mockCreateWorkspace.mockResolvedValue("/tmp/ws");
      mockFetchTask.mockResolvedValue({
        ...baseTask,
        resumePrompt: "Try a different approach",
      });

      const result = await executeTask("task-1");

      expect(result.success).toBe(true);
      expect(mockSendMessage).toHaveBeenCalledWith(
        "sess-1",
        expect.stringContaining("Resume the previous session"),
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        "sess-1",
        expect.stringContaining("Try a different approach"),
      );
    });
  });

  // ── Branch coverage: jiraIssueKey conditional ─────────────

  describe("branch coverage – jiraIssueKey", () => {
    it("transitions Jira issue when jiraIssueKey is present", async () => {
      mockCreateWorkspace.mockResolvedValue("/tmp/ws");
      mockFetchTask.mockResolvedValue({
        ...baseTask,
        jiraIssueKey: "PROJ-42",
      });

      const { transitionJiraIssue, addJiraComment } = await import("../jira");

      const result = await executeTask("task-1");

      expect(result.success).toBe(true);
      expect(transitionJiraIssue).toHaveBeenCalledWith(
        "PROJ-42",
        "In Progress",
      );
      expect(addJiraComment).toHaveBeenCalledWith(
        "PROJ-42",
        expect.stringContaining("PromptDev AI agent started"),
      );
    });

    it("skips Jira integration when jiraIssueKey is absent", async () => {
      mockCreateWorkspace.mockResolvedValue("/tmp/ws");
      mockFetchTask.mockResolvedValue({ ...baseTask, jiraIssueKey: undefined });

      const { transitionJiraIssue } = await import("../jira");

      await executeTask("task-1");

      expect(transitionJiraIssue).not.toHaveBeenCalled();
    });
  });

  // ── Branch coverage: BITBUCKET workspace clone ────────────

  describe("branch coverage – BITBUCKET cloneRepository", () => {
    it("clones repo when workspaceType is BITBUCKET", async () => {
      mockCreateWorkspace.mockResolvedValue("/tmp/ws");
      mockCloneRepository.mockReturnValue("/tmp/ws/repo");
      mockFetchTask.mockResolvedValue({
        ...baseTask,
        workspaceType: "BITBUCKET",
        projectKey: "PROJ",
        sourceBranch: "feature/x",
      });

      const result = await executeTask("task-1");

      expect(result.success).toBe(true);
      expect(mockCloneRepository).toHaveBeenCalledWith(
        "task-1",
        "PROJ",
        "my-repo",
        "feature/x",
      );
    });
  });

  // ── Branch coverage: supportsReasoning ────────────────────

  describe("branch coverage – supportsReasoning", () => {
    it("passes reasoningEffort 'high' when model supports it", async () => {
      mockCreateWorkspace.mockResolvedValue("/tmp/ws");
      mockListAvailableModels.mockResolvedValue([
        {
          id: "gpt-4.1",
          capabilities: { supports: { reasoningEffort: true } },
        },
      ]);

      await executeTask("task-1");

      expect(mockCreateCopilotSession).toHaveBeenCalledWith(
        expect.objectContaining({ reasoningEffort: "high" }),
        undefined,
      );
    });

    it("passes undefined reasoningEffort when model doesn't support it", async () => {
      mockCreateWorkspace.mockResolvedValue("/tmp/ws");
      mockListAvailableModels.mockResolvedValue([
        {
          id: "gpt-4.1",
          capabilities: { supports: { reasoningEffort: false } },
        },
      ]);

      await executeTask("task-1");

      expect(mockCreateCopilotSession).toHaveBeenCalledWith(
        expect.objectContaining({ reasoningEffort: undefined }),
        undefined,
      );
    });

    it("passes undefined when model is not found in models list", async () => {
      mockCreateWorkspace.mockResolvedValue("/tmp/ws");
      mockListAvailableModels.mockResolvedValue([
        {
          id: "other-model",
          capabilities: { supports: { reasoningEffort: true } },
        },
      ]);

      await executeTask("task-1");

      expect(mockCreateCopilotSession).toHaveBeenCalledWith(
        expect.objectContaining({ reasoningEffort: undefined }),
        undefined,
      );
    });
  });

  // ── Branch coverage: userGithubToken / byokProvider forwarding ──

  describe("branch coverage – userGithubToken and byokProvider", () => {
    it("passes userGithubToken to createCopilotSession", async () => {
      mockCreateWorkspace.mockResolvedValue("/tmp/ws");

      await executeTask("task-1", "ghp_my-token");

      expect(mockCreateCopilotSession).toHaveBeenCalledWith(
        expect.anything(),
        "ghp_my-token",
      );
    });

    it("passes byokProvider to session creation", async () => {
      mockCreateWorkspace.mockResolvedValue("/tmp/ws");

      const byok = {
        type: "openai",
        apiKey: "sk-123",
        baseUrl: "https://api.openai.com",
      };
      await executeTask("task-1", undefined, byok as never);

      expect(mockCreateCopilotSession).toHaveBeenCalledWith(
        expect.objectContaining({ provider: byok }),
        undefined,
      );
    });
  });
});
