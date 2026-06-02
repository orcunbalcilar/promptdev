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
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col: unknown) => col),
  inArray: vi.fn((...args: unknown[]) => args),
  gt: vi.fn((...args: unknown[]) => args),
  not: vi.fn((v: unknown) => v),
  sql: vi.fn(),
  ilike: vi.fn((...args: unknown[]) => args),
  or: vi.fn((...args: unknown[]) => args),
}));
vi.mock("@/lib/services/sse-service", () => ({
  broadcastTaskUpdate: vi.fn(),
  sendTaskEvent: vi.fn(),
}));
vi.mock("@/lib/services/bitbucket-service", () => ({
  createBranch: vi.fn(),
  createPullRequest: vi.fn().mockResolvedValue({ id: 42, title: "PR" }),
  getPullRequestWebUrl: vi.fn().mockReturnValue("https://bb.example.com/pr/42"),
}));
vi.mock("@/lib/services/workspace-service", () => ({
  resolveIncrementedPath: vi.fn((p: string) => `${p}-1`),
}));

import {
  getAllTasks,
  getTaskEvents,
  getTasksByScheduledJobId,
  resumeTask,
  processAgentCallback,
  createTask,
  cancelTask,
  cloneTask,
} from "../task-service";
import { broadcastTaskUpdate, sendTaskEvent } from "../sse-service";

const NOW = new Date("2025-01-15T10:00:00Z");

function makeTask(overrides = {}) {
  return {
    id: "task-1",
    title: "Fix bug",
    prompt: "Fix the login bug",
    repositorySlug: "my-repo",
    projectKey: "PROJ",
    workspaceType: "BITBUCKET",
    workspacePath: null,
    sourceBranch: "main",
    targetBranch: "main",
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
    userId: null,
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
    updatedAt: null,
    completedAt: null,
    ...overrides,
  };
}

function makeEvent(overrides = {}) {
  return {
    id: "event-1",
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

describe("task-service - extended coverage", () => {
  // ── getAllTasks ────────────────────────────────────────────────

  describe("getAllTasks", () => {
    it("should return paginated results with defaults", async () => {
      const tasks = [makeTask()];
      mockDb.select
        .mockReturnValueOnce(chainResult(tasks))
        .mockReturnValueOnce(chainResult([{ count: 1 }]));

      const result = await getAllTasks();

      expect(result.content).toHaveLength(1);
      expect(result.totalElements).toBe(1);
      expect(result.number).toBe(0);
      expect(result.size).toBe(20);
    });

    it("should apply search filter", async () => {
      const tasks = [makeTask({ title: "Search match" })];
      mockDb.select
        .mockReturnValueOnce(chainResult(tasks))
        .mockReturnValueOnce(chainResult([{ count: 1 }]));

      const result = await getAllTasks(0, 10, { search: "match" });

      expect(result.content).toHaveLength(1);
    });

    it("should apply status filter", async () => {
      mockDb.select
        .mockReturnValueOnce(chainResult([]))
        .mockReturnValueOnce(chainResult([{ count: 0 }]));

      const result = await getAllTasks(0, 10, {
        statuses: ["PENDING", "COMPLETED"],
      });

      expect(result.content).toEqual([]);
      expect(result.totalElements).toBe(0);
    });

    it("should apply workspace type filter", async () => {
      mockDb.select
        .mockReturnValueOnce(chainResult([]))
        .mockReturnValueOnce(chainResult([{ count: 0 }]));

      const result = await getAllTasks(0, 10, { workspaceType: "LOCAL" });

      expect(result.content).toEqual([]);
    });

    it('should ignore "all" workspace type', async () => {
      mockDb.select
        .mockReturnValueOnce(chainResult([makeTask()]))
        .mockReturnValueOnce(chainResult([{ count: 1 }]));

      const result = await getAllTasks(0, 10, { workspaceType: "all" });

      expect(result.content).toHaveLength(1);
    });

    it("should calculate totalPages correctly", async () => {
      mockDb.select
        .mockReturnValueOnce(chainResult([makeTask()]))
        .mockReturnValueOnce(chainResult([{ count: 25 }]));

      const result = await getAllTasks(0, 10);

      expect(result.totalPages).toBe(3);
    });

    it("should paginate with custom page/size", async () => {
      mockDb.select
        .mockReturnValueOnce(chainResult([]))
        .mockReturnValueOnce(chainResult([{ count: 50 }]));

      const result = await getAllTasks(2, 5);

      expect(result.number).toBe(2);
      expect(result.size).toBe(5);
      expect(result.totalElements).toBe(50);
      expect(result.totalPages).toBe(10);
    });
  });

  // ── getTaskEvents ─────────────────────────────────────────────

  describe("getTaskEvents", () => {
    it("should return events for a task", async () => {
      const events = [makeEvent(), makeEvent({ id: "event-2", eventType: "PROGRESS" })];
      mockDb.select.mockReturnValue(chainResult(events));

      const result = await getTaskEvents("task-1");

      expect(result).toHaveLength(2);
      expect(result[0].eventType).toBe("TASK_CREATED");
      expect(result[1].eventType).toBe("PROGRESS");
    });
  });

  // ── getTasksByScheduledJobId ──────────────────────────────────

  describe("getTasksByScheduledJobId", () => {
    it("should return tasks for a scheduled job", async () => {
      const tasks = [
        makeTask({ scheduledJobId: "job-1" }),
        makeTask({ id: "task-2", scheduledJobId: "job-1" }),
      ];
      mockDb.select.mockReturnValue(chainResult(tasks));

      const result = await getTasksByScheduledJobId("job-1");

      expect(result).toHaveLength(2);
    });
  });

  // ── resumeTask ────────────────────────────────────────────────

  describe("resumeTask", () => {
    it("should resume a completed task", async () => {
      const task = makeTask({ status: "COMPLETED", resumeCount: 0 });
      const updated = makeTask({
        status: "PENDING",
        resumePrompt: "Continue from here",
        resumeCount: 1,
      });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(
        chainResult([makeEvent({ eventType: "TASK_QUEUED" })]),
      );

      const result = await resumeTask("task-1", "Continue from here");

      expect(result.status).toBe("PENDING");
      expect(result.resumeCount).toBe(1);
      expect(sendTaskEvent).toHaveBeenCalled();
      expect(broadcastTaskUpdate).toHaveBeenCalled();
    });

    it("should resume a failed task", async () => {
      const task = makeTask({ status: "FAILED", resumeCount: 2 });
      const updated = makeTask({
        status: "PENDING",
        resumePrompt: "Try again",
        resumeCount: 3,
      });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(
        chainResult([makeEvent({ eventType: "TASK_QUEUED" })]),
      );

      const result = await resumeTask("task-1", "Try again");

      expect(result.resumeCount).toBe(3);
    });

    it("should throw when task not found", async () => {
      mockDb.select.mockReturnValueOnce(chainResult([]));

      await expect(resumeTask("nonexistent", "resume")).rejects.toThrow(
        "Task not found",
      );
    });

    it("should throw when task is not completed or failed", async () => {
      const task = makeTask({ status: "IN_PROGRESS" });
      mockDb.select.mockReturnValueOnce(chainResult([task]));

      await expect(resumeTask("task-1", "resume")).rejects.toThrow(
        "Can only resume completed or failed tasks",
      );
    });
  });

  // ── processAgentCallback - additional event types ─────────────

  describe("processAgentCallback - additional event types", () => {
    function setupForCallback(
      taskOverrides = {},
      updatedOverrides = {},
    ) {
      const task = makeTask(taskOverrides);
      const updated = makeTask(updatedOverrides);
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));
    }

    it("should handle CODE_GENERATED event", async () => {
      setupForCallback(
        { status: "IN_PROGRESS" },
        { status: "CODE_GENERATED" },
      );

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "CODE_GENERATED",
      });

      expect(result.status).toBe("CODE_GENERATED");
    });

    it("should not change status for CODE_GENERATED when terminal", async () => {
      setupForCallback(
        { status: "COMPLETED" },
        { status: "COMPLETED" },
      );

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "CODE_GENERATED",
      });

      expect(result.status).toBe("COMPLETED");
    });

    it("should handle REVIEWING_STARTED event", async () => {
      setupForCallback(
        { status: "CODE_GENERATED" },
        { status: "REVIEWING" },
      );

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "REVIEWING_STARTED",
      });

      expect(result.status).toBe("REVIEWING");
    });

    it("should handle REVIEWING_COMPLETED event", async () => {
      setupForCallback(
        { status: "REVIEWING" },
        { status: "COMMITTING" },
      );

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "REVIEWING_COMPLETED",
      });

      expect(result.status).toBe("COMMITTING");
    });

    it("should handle REVIEWING_FAILED event", async () => {
      setupForCallback(
        { status: "REVIEWING" },
        { status: "FAILED" },
      );

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "REVIEWING_FAILED",
        message: "Code quality threshold not met",
      });

      expect(result.status).toBe("FAILED");
    });

    it("should handle TRIAGING_STARTED event", async () => {
      setupForCallback(
        { status: "IN_PROGRESS" },
        { status: "TRIAGING" },
      );

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "TRIAGING_STARTED",
      });

      expect(result.status).toBe("TRIAGING");
    });

    it("should handle TRIAGING_COMPLETED event", async () => {
      setupForCallback(
        { status: "TRIAGING" },
        { status: "IN_PROGRESS" },
      );

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "TRIAGING_COMPLETED",
      });

      expect(result.status).toBe("IN_PROGRESS");
    });

    it("should handle GIT_COMMIT event", async () => {
      setupForCallback(
        { status: "CODE_GENERATED" },
        { status: "COMMITTING" },
      );

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "GIT_COMMIT",
      });

      expect(result.status).toBe("COMMITTING");
    });

    it("should handle GIT_PUSH event", async () => {
      setupForCallback(
        { status: "COMMITTING" },
        { status: "PUSHING" },
      );

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "GIT_PUSH",
      });

      expect(result.status).toBe("PUSHING");
    });

    it("should handle PR_CREATED event with PR data", async () => {
      setupForCallback(
        { status: "PUSHING" },
        { status: "CREATING_PR", pullRequestId: 99, pullRequestUrl: "https://bb/pr/99" },
      );

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "PR_CREATED",
        pullRequestId: 99,
        pullRequestUrl: "https://bb/pr/99",
      });

      expect(result.status).toBe("CREATING_PR");
      expect(result.pullRequestId).toBe(99);
    });

    it("should handle TASK_FAILED event", async () => {
      setupForCallback(
        { status: "IN_PROGRESS" },
        { status: "FAILED", errorMessage: "build failed" },
      );

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "TASK_FAILED",
        errorMessage: "build failed",
      });

      expect(result.status).toBe("FAILED");
    });

    it("should handle RETRY_SCHEDULED event", async () => {
      setupForCallback(
        { status: "FAILED" },
        { status: "PENDING" },
      );

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "RETRY_SCHEDULED",
      });

      expect(result.status).toBe("PENDING");
    });

    it("should handle ITERATION_STARTED event", async () => {
      setupForCallback(
        { status: "IN_PROGRESS" },
        { status: "ITERATION_PENDING", currentIteration: 2 },
      );

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "ITERATION_STARTED",
        details: JSON.stringify({ currentIteration: 2 }),
      });

      expect(result.currentIteration).toBe(2);
    });

    it("should handle ITERATION_COMPLETED event", async () => {
      setupForCallback(
        { status: "ITERATION_PENDING" },
        { status: "IN_PROGRESS" },
      );

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "ITERATION_COMPLETED",
      });

      expect(result.status).toBe("IN_PROGRESS");
    });

    it("should handle ITERATION_STARTED with invalid JSON details", async () => {
      setupForCallback(
        { status: "IN_PROGRESS" },
        { status: "ITERATION_PENDING" },
      );

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "ITERATION_STARTED",
        details: "not valid json",
      });

      expect(result.status).toBe("ITERATION_PENDING");
    });

    it("should handle TASK_QUEUED event", async () => {
      setupForCallback(
        { status: "PENDING" },
        { status: "QUEUED" },
      );

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "TASK_QUEUED",
      });

      expect(result.status).toBe("QUEUED");
    });

    it("should handle unknown event type (no status change)", async () => {
      setupForCallback(
        { status: "IN_PROGRESS" },
        { status: "IN_PROGRESS" },
      );

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "SOME_CUSTOM_EVENT",
      });

      expect(result.status).toBe("IN_PROGRESS");
    });

    it("should throw when task not found", async () => {
      mockDb.select.mockReturnValueOnce(chainResult([]));

      await expect(
        processAgentCallback({ taskId: "nonexistent", eventType: "PROGRESS" }),
      ).rejects.toThrow("Task not found");
    });
  });

  // ── createTask - branch auto-generation ───────────────────────

  describe("createTask - branch auto-generation", () => {
    it("should auto-generate branch when sourceBranch is __AUTO_GENERATED__", async () => {
      const task = makeTask({ id: "task-auto", sourceBranch: "__AUTO_GENERATED__" });
      mockDb.insert.mockReturnValue(chainResult([task]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.select.mockReturnValue(chainResult([]));

      const result = await createTask({
        title: "Auto branch",
        repositorySlug: "my-repo",
        projectKey: "PROJ",
        sourceBranch: "__AUTO_GENERATED__",
        targetBranch: "develop",
      });

      expect(result.id).toBe("task-auto");
    });
  });

  // ── cancelTask - no jira key / no userId path ─────────────────

  describe("cancelTask - edge cases", () => {
    it("should cancel without jira opt-out when no jiraIssueKey", async () => {
      const task = makeTask({ status: "IN_PROGRESS", jiraIssueKey: null });
      const cancelled = makeTask({ status: "CANCELLED" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([cancelled]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(chainResult([]));

      const result = await cancelTask("task-1");

      expect(result.status).toBe("CANCELLED");
      // Only 1 insert for the event, not 2
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it("should cancel without opt-out when jiraIssueKey but empty string", async () => {
      const task = makeTask({
        status: "IN_PROGRESS",
        jiraIssueKey: "  ",
        userId: "user-1",
      });
      const cancelled = makeTask({ status: "CANCELLED" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([cancelled]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(chainResult([]));

      const result = await cancelTask("task-1");

      expect(result.status).toBe("CANCELLED");
    });

    it("should skip opt-out when existing opt-out exists", async () => {
      const task = makeTask({
        status: "IN_PROGRESS",
        jiraIssueKey: "PROJ-10",
        userId: "user-1",
      });
      const cancelled = makeTask({ status: "CANCELLED" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([{ id: "existing-optout" }])) // existing opt-out
        .mockReturnValueOnce(chainResult([cancelled]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(chainResult([]));

      const result = await cancelTask("task-1");

      expect(result.status).toBe("CANCELLED");
      // Only 1 insert for the event
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });
  });

  // ── cloneTask with LOCAL workspace ────────────────────────────

  describe("cloneTask - LOCAL workspace with path", () => {
    it("should increment path for LOCAL workspace", async () => {
      const original = makeTask({
        id: "task-orig",
        workspaceType: "LOCAL",
        workspacePath: "/projects/my-project",
      });
      const cloned = makeTask({
        id: "task-clone",
        workspaceType: "LOCAL",
        workspacePath: "/projects/my-project-1",
      });
      mockDb.select.mockReturnValueOnce(chainResult([original]));
      mockDb.insert
        .mockReturnValueOnce(chainResult([cloned])) // clone insert
        .mockReturnValueOnce(chainResult([makeEvent()])); // event insert
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await cloneTask("task-orig");

      expect(result.workspacePath).toBe("/projects/my-project-1");
    });

    it("should not increment when LOCAL workspace path matches repoSlug", async () => {
      const original = makeTask({
        id: "task-orig",
        workspaceType: "LOCAL",
        workspacePath: "my-repo",
        repositorySlug: "my-repo",
      });
      const cloned = makeTask({
        id: "task-clone",
        workspaceType: "LOCAL",
        workspacePath: "my-repo",
      });
      mockDb.select.mockReturnValueOnce(chainResult([original]));
      mockDb.insert
        .mockReturnValueOnce(chainResult([cloned]))
        .mockReturnValueOnce(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await cloneTask("task-orig");

      expect(result.workspacePath).toBe("my-repo");
    });

    it("should handle BITBUCKET clone with auto-generated branch", async () => {
      const original = makeTask({
        id: "task-orig",
        workspaceType: "BITBUCKET",
        sourceBranch: "feature",
      });
      const cloned = makeTask({
        id: "task-clone",
        workspaceType: "BITBUCKET",
        sourceBranch: "__AUTO_GENERATED__",
      });
      mockDb.select.mockReturnValueOnce(chainResult([original]));
      mockDb.insert
        .mockReturnValueOnce(chainResult([cloned]))
        .mockReturnValueOnce(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await cloneTask("task-orig");

      expect(result.id).toBe("task-clone");
    });
  });
});
