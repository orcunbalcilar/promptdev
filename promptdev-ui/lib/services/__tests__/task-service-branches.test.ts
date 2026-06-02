/**
 * Tests for lib/services/task-service.ts — covering uncovered branches:
 * - createTask without optional fields (triggers all ?? defaults)
 * - resolveCommitMessagePattern edge cases
 * - buildTaskUpdates with null currentAttempt/maxAttempts
 * - cloneTask with LOCAL workspace path increment (line 697)
 * - cloneTask auto-generated branch with null targetBranch/projectKey (lines 748-751)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { chainResult } from "./db-mock-helper";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb, getDb: () => mockDb }));
vi.mock("@/lib/db/schema", () => ({
  tasks: {},
  taskEvents: {},
  jiraIssueOptOuts: {},
  users: {},
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col: unknown) => col),
  inArray: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  gt: vi.fn((...args: unknown[]) => args),
  not: vi.fn((val: unknown) => val),
  sql: vi.fn(),
  ilike: vi.fn((...args: unknown[]) => args),
  or: vi.fn((...args: unknown[]) => args),
}));

const mockBroadcast = vi.fn();
const mockSendEvent = vi.fn();
vi.mock("../sse-service", () => ({
  broadcastTaskUpdate: (...args: unknown[]) => mockBroadcast(...args),
  sendTaskEvent: (...args: unknown[]) => mockSendEvent(...args),
}));

const mockCreateBranch = vi.fn().mockResolvedValue(undefined);
const mockCreatePR = vi.fn().mockResolvedValue({ id: 1, title: "PR" });
const mockGetPRUrl = vi.fn().mockReturnValue("https://bb/pr/1");
vi.mock("../bitbucket-service", () => ({
  createBranch: (...args: unknown[]) => mockCreateBranch(...args),
  createPullRequest: (...args: unknown[]) => mockCreatePR(...args),
  getPullRequestWebUrl: (...args: unknown[]) => mockGetPRUrl(...args),
}));

const mockResolvePath = vi.fn((p: string) => `${p}_2`);
vi.mock("../workspace-service", () => ({
  resolveIncrementedPath: (p: string) => mockResolvePath(p),
}));

import {
  createTask,
  processAgentCallback,
  cloneTask,
  cancelTask,
} from "../task-service";

const NOW = new Date("2025-01-15T10:00:00Z");

function makeTask(overrides = {}) {
  return {
    id: "task-1",
    title: "Test Task",
    prompt: "Do stuff",
    repositorySlug: "my-repo",
    projectKey: "PROJ",
    workspaceType: "BITBUCKET",
    workspacePath: null,
    sourceBranch: "main",
    targetBranch: "develop",
    status: "PENDING",
    currentAttempt: 0,
    maxAttempts: 3,
    modelId: "gpt-5.2",
    copilotSessionId: null,
    pullRequestId: null,
    pullRequestUrl: null,
    errorMessage: null,
    iterative: false,
    maxIterations: 10,
    currentIteration: 0,
    currentStepIndex: 0,
    completionCriteria: null,
    steps: null,
    scheduledJobId: null,
    jiraIssueKey: null,
    userId: "user-1",
    reviewEnabled: true,
    reviewModelId: null,
    resumePrompt: null,
    resumeCount: 0,
    commitMessagePattern: null,
    bootScript: null,
    skills: null,
    additionalRepositories: null,
    systemPrompt: null,
    environmentVariablesEncrypted: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    ...overrides,
  };
}

function makeEvent(overrides = {}) {
  return {
    id: "evt-1",
    taskId: "task-1",
    eventType: "TASK_CREATED",
    message: "Task created",
    details: null,
    codeSnippet: null,
    filePath: null,
    actionType: null,
    fileChanges: null,
    toolName: null,
    toolInput: null,
    toolOutput: null,
    timestamp: NOW,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("task-service – branch coverage", () => {
  // ── createTask with all defaults ──────────────────────────

  describe("createTask – ?? default branches", () => {
    it("uses all default values when optional fields omitted", async () => {
      const task = makeTask({
        workspaceType: "BITBUCKET",
        sourceBranch: "main",
        modelId: "gpt-5.2",
        maxAttempts: 3,
        iterative: false,
        maxIterations: 10,
        reviewEnabled: true,
      });
      const event = makeEvent();

      mockDb.insert
        .mockReturnValueOnce(chainResult([task])) // insert task
        .mockReturnValueOnce(chainResult([event])); // insert event

      const result = await createTask({
        title: "Minimal Task",
        repositorySlug: "repo",
        // NO optional fields → triggers all ?? defaults
      });

      expect(result.title).toBe("Test Task");
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it("uses provided values and skips defaults", async () => {
      const task = makeTask({
        workspaceType: "LOCAL",
        sourceBranch: "feature/x",
        modelId: "claude-sonnet-4",
        maxAttempts: 5,
        iterative: true,
        maxIterations: 20,
        reviewEnabled: false,
      });
      const event = makeEvent();

      mockDb.insert
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([event]));

      const result = await createTask({
        title: "Full Task",
        repositorySlug: "repo",
        workspaceType: "LOCAL",
        sourceBranch: "feature/x",
        modelId: "claude-sonnet-4",
        maxAttempts: 5,
        iterative: true,
        maxIterations: 20,
        reviewEnabled: false,
      });

      expect(result.title).toBe("Test Task");
    });
  });

  // ── createTask auto-generated branch with null projectKey/targetBranch ─

  describe("createTask – auto-generated branch with null fields", () => {
    it("uses empty string for null projectKey and 'main' for null targetBranch", async () => {
      const task = makeTask({
        id: "task-auto-1",
        sourceBranch: "__AUTO_GENERATED__",
        projectKey: null,
        targetBranch: null,
      });
      const event = makeEvent();

      mockDb.insert
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult([]));

      await createTask({
        title: "Auto Branch Task",
        repositorySlug: "repo",
        sourceBranch: "__AUTO_GENERATED__",
      });

      // createBranch should be called with "" for projectKey and "main" for startPoint
      expect(mockCreateBranch).toHaveBeenCalledWith(
        "",
        "my-repo",
        "promptdev/task-auto-1",
        "main",
      );
    });

    it("catches branch creation failure without throwing", async () => {
      const task = makeTask({
        id: "task-auto-2",
        sourceBranch: "__AUTO_GENERATED__",
      });
      const event = makeEvent();

      mockDb.insert
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockCreateBranch.mockRejectedValueOnce(new Error("Branch exists"));

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await createTask({
        title: "Fail Branch Task",
        repositorySlug: "repo",
        sourceBranch: "__AUTO_GENERATED__",
      });

      expect(warnSpy).toHaveBeenCalled();
      expect(result).toBeDefined();
      warnSpy.mockRestore();
    });
  });

  // ── processAgentCallback – AGENT_STARTED with null currentAttempt/maxAttempts ─

  describe("processAgentCallback – buildTaskUpdates branches", () => {
    it("handles AGENT_STARTED with null currentAttempt (uses ?? 0)", async () => {
      const task = makeTask({
        currentAttempt: null,
        maxAttempts: null,
        status: "QUEUED",
      });
      const event = makeEvent({ eventType: "AGENT_STARTED" });
      const updated = makeTask({ status: "IN_PROGRESS", currentAttempt: 1 });

      mockDb.select
        .mockReturnValueOnce(chainResult([task])) // find task
        .mockReturnValueOnce(chainResult([updated])); // get updated
      mockDb.insert.mockReturnValue(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "AGENT_STARTED",
      });

      expect(result.status).toBe("IN_PROGRESS");
    });

    it("handles AGENT_STARTED when max attempts exceeded", async () => {
      const task = makeTask({
        currentAttempt: 3,
        maxAttempts: 3,
        status: "QUEUED",
      });
      const event = makeEvent({ eventType: "AGENT_STARTED" });
      const updated = makeTask({ status: "FAILED" });

      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "AGENT_STARTED",
      });

      expect(result.status).toBe("FAILED");
    });

    it("handles CODE_GENERATED when task is not in terminal status", async () => {
      const task = makeTask({ status: "IN_PROGRESS" });
      const event = makeEvent({ eventType: "CODE_GENERATED" });
      const updated = makeTask({ status: "CODE_GENERATED" });

      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult([]));

      await processAgentCallback({
        taskId: "task-1",
        eventType: "CODE_GENERATED",
      });
    });

    it("does NOT update status for CODE_GENERATED when already in terminal status", async () => {
      const task = makeTask({ status: "COMPLETED" });
      const event = makeEvent({ eventType: "CODE_GENERATED" });
      const updated = makeTask({ status: "COMPLETED" });

      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "CODE_GENERATED",
      });

      expect(result.status).toBe("COMPLETED");
    });

    it("handles ITERATION_STARTED with details containing currentIteration", async () => {
      const task = makeTask({ status: "IN_PROGRESS" });
      const event = makeEvent({ eventType: "ITERATION_STARTED" });
      const updated = makeTask({
        status: "ITERATION_PENDING",
        currentIteration: 2,
      });

      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult([]));

      await processAgentCallback({
        taskId: "task-1",
        eventType: "ITERATION_STARTED",
        details: JSON.stringify({ currentIteration: 2 }),
      });
    });

    it("handles ITERATION_STARTED with invalid JSON details gracefully", async () => {
      const task = makeTask({ status: "IN_PROGRESS" });
      const event = makeEvent({ eventType: "ITERATION_STARTED" });
      const updated = makeTask({ status: "ITERATION_PENDING" });

      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult([]));

      // Should not throw despite invalid JSON
      await processAgentCallback({
        taskId: "task-1",
        eventType: "ITERATION_STARTED",
        details: "not-json",
      });
    });

    it("handles ITERATION_COMPLETED", async () => {
      const task = makeTask({ status: "ITERATION_PENDING" });
      const event = makeEvent({ eventType: "ITERATION_COMPLETED" });
      const updated = makeTask({ status: "IN_PROGRESS" });

      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult([]));

      await processAgentCallback({
        taskId: "task-1",
        eventType: "ITERATION_COMPLETED",
      });
    });

    it("sets copilotSessionId when callback includes it and task has none", async () => {
      const task = makeTask({ copilotSessionId: null });
      const event = makeEvent({ eventType: "PROGRESS" });
      const updated = makeTask({ copilotSessionId: "sdk-sess-1" });

      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult([]));

      await processAgentCallback({
        taskId: "task-1",
        eventType: "PROGRESS",
        copilotSessionId: "sdk-sess-1",
      });
    });

    it("handles REVIEWING_STARTED", async () => {
      const task = makeTask({ status: "IN_PROGRESS" });
      const event = makeEvent({ eventType: "REVIEWING_STARTED" });
      const updated = makeTask({ status: "REVIEWING" });

      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult([]));

      await processAgentCallback({
        taskId: "task-1",
        eventType: "REVIEWING_STARTED",
      });
    });

    it("handles REVIEWING_COMPLETED", async () => {
      const task = makeTask({ status: "REVIEWING" });
      const event = makeEvent({ eventType: "REVIEWING_COMPLETED" });
      const updated = makeTask({ status: "COMMITTING" });

      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult([]));

      await processAgentCallback({
        taskId: "task-1",
        eventType: "REVIEWING_COMPLETED",
      });
    });

    it("handles REVIEWING_FAILED", async () => {
      const task = makeTask({ status: "REVIEWING" });
      const event = makeEvent({
        eventType: "REVIEWING_FAILED",
        message: "Review issues found",
      });
      const updated = makeTask({ status: "FAILED" });

      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult([]));

      await processAgentCallback({
        taskId: "task-1",
        eventType: "REVIEWING_FAILED",
        message: "Review issues found",
      });
    });

    it("handles PR_CREATED with pullRequestId and pullRequestUrl", async () => {
      const task = makeTask({ status: "PUSHING" });
      const event = makeEvent({ eventType: "PR_CREATED" });
      const updated = makeTask({
        status: "CREATING_PR",
        pullRequestId: 42,
        pullRequestUrl: "https://bb/pr/42",
      });

      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult([]));

      await processAgentCallback({
        taskId: "task-1",
        eventType: "PR_CREATED",
        pullRequestId: 42,
        pullRequestUrl: "https://bb/pr/42",
      });
    });

    it("handles unknown event type without updating status", async () => {
      const task = makeTask({ status: "IN_PROGRESS" });
      const event = makeEvent({ eventType: "SOME_UNKNOWN_EVENT" });
      const updated = makeTask({ status: "IN_PROGRESS" });

      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "SOME_UNKNOWN_EVENT",
        message: "Custom event",
      });

      expect(result.status).toBe("IN_PROGRESS");
    });
  });

  // ── cloneTask – LOCAL workspace path increment (line 697) ─────

  describe("cloneTask – workspace path branches", () => {
    it("increments workspace path for LOCAL tasks with custom path", async () => {
      const original = makeTask({
        workspaceType: "LOCAL",
        workspacePath: "/home/user/project",
        repositorySlug: "my-repo",
        sourceBranch: "main",
      });
      const clone = makeTask({
        id: "task-clone-1",
        workspacePath: "/home/user/project_2",
        sourceBranch: "main",
      });
      const event = makeEvent();

      mockDb.select.mockReturnValueOnce(chainResult([original]));
      mockDb.insert
        .mockReturnValueOnce(chainResult([clone]))
        .mockReturnValueOnce(chainResult([event]));

      const result = await cloneTask("task-1");

      expect(mockResolvePath).toHaveBeenCalledWith("/home/user/project");
      expect(result).toBeDefined();
    });

    it("does NOT increment path for LOCAL tasks where path matches slug", async () => {
      const original = makeTask({
        workspaceType: "LOCAL",
        workspacePath: "my-repo",
        repositorySlug: "my-repo",
        sourceBranch: "main",
      });
      const clone = makeTask({ id: "task-clone-2", sourceBranch: "main" });
      const event = makeEvent();

      mockDb.select.mockReturnValueOnce(chainResult([original]));
      mockDb.insert
        .mockReturnValueOnce(chainResult([clone]))
        .mockReturnValueOnce(chainResult([event]));

      await cloneTask("task-1");

      expect(mockResolvePath).not.toHaveBeenCalled();
    });

    it("does NOT increment path for LOCAL tasks with null/empty workspace path", async () => {
      const original = makeTask({
        workspaceType: "LOCAL",
        workspacePath: "",
        sourceBranch: "main",
      });
      const clone = makeTask({ id: "task-clone-3", sourceBranch: "main" });
      const event = makeEvent();

      mockDb.select.mockReturnValueOnce(chainResult([original]));
      mockDb.insert
        .mockReturnValueOnce(chainResult([clone]))
        .mockReturnValueOnce(chainResult([event]));

      await cloneTask("task-1");

      expect(mockResolvePath).not.toHaveBeenCalled();
    });
  });

  // ── cloneTask – BITBUCKET auto-generated branch ───────────────

  describe("cloneTask – Bitbucket auto-generated branch (lines 748-751)", () => {
    it("creates auto-generated branch with null targetBranch/projectKey", async () => {
      const original = makeTask({
        workspaceType: "BITBUCKET",
        targetBranch: null,
        projectKey: null,
      });
      const clone = makeTask({
        id: "task-clone-bb",
        sourceBranch: "__AUTO_GENERATED__",
        targetBranch: null,
        projectKey: null,
      });
      const event = makeEvent();

      mockDb.select.mockReturnValueOnce(chainResult([original]));
      mockDb.insert
        .mockReturnValueOnce(chainResult([clone]))
        .mockReturnValueOnce(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult([]));

      await cloneTask("task-1");

      // targetBranch ?? "main" and projectKey ?? ""
      expect(mockCreateBranch).toHaveBeenCalledWith(
        "",
        "my-repo",
        "promptdev/task-clone-bb",
        "main",
      );
    });

    it("catches branch creation failure during clone", async () => {
      const original = makeTask({ workspaceType: "BITBUCKET" });
      const clone = makeTask({
        id: "task-clone-fail",
        sourceBranch: "__AUTO_GENERATED__",
      });
      const event = makeEvent();

      mockDb.select.mockReturnValueOnce(chainResult([original]));
      mockDb.insert
        .mockReturnValueOnce(chainResult([clone]))
        .mockReturnValueOnce(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockCreateBranch.mockRejectedValueOnce(new Error("Already exists"));

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await cloneTask("task-1");

      expect(warnSpy).toHaveBeenCalled();
      expect(result).toBeDefined();
      warnSpy.mockRestore();
    });
  });

  // ── cancelTask – Jira opt-out branches ────────────────────────

  describe("cancelTask – jira opt-out branches", () => {
    it("creates Jira opt-out when task has jiraIssueKey", async () => {
      const task = makeTask({
        status: "IN_PROGRESS",
        jiraIssueKey: "PROJ-123",
        userId: "user-1",
      });
      const updated = makeTask({ status: "CANCELLED" });
      const event = makeEvent({ eventType: "ERROR" });

      mockDb.select
        .mockReturnValueOnce(chainResult([task])) // find task
        .mockReturnValueOnce(chainResult([])) // check existing opt-out
        .mockReturnValueOnce(chainResult([updated])); // get updated
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert
        .mockReturnValueOnce(chainResult([event])) // insert event
        .mockReturnValueOnce(chainResult([])); // insert opt-out

      await cancelTask("task-1");

      // Should attempt to create opt-out
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it("does NOT create duplicate Jira opt-out", async () => {
      const task = makeTask({
        status: "IN_PROGRESS",
        jiraIssueKey: "PROJ-123",
        userId: "user-1",
      });
      const updated = makeTask({ status: "CANCELLED" });
      const event = makeEvent({ eventType: "ERROR" });

      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([{ id: "opt-1" }])) // existing opt-out
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValueOnce(chainResult([event]));

      await cancelTask("task-1");

      // Should NOT insert opt-out (only event)
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it("skips opt-out when no jiraIssueKey", async () => {
      const task = makeTask({
        status: "IN_PROGRESS",
        jiraIssueKey: null,
      });
      const updated = makeTask({ status: "CANCELLED" });
      const event = makeEvent({ eventType: "ERROR" });

      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValueOnce(chainResult([event]));

      await cancelTask("task-1");
    });
  });
});
