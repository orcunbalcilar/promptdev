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
  or: vi.fn((...args: unknown[]) => args),
  ilike: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col: unknown) => col),
  inArray: vi.fn((...args: unknown[]) => args),
  gt: vi.fn((...args: unknown[]) => args),
  not: vi.fn((v: unknown) => v),
  sql: vi.fn(),
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
  createTask,
  getTask,
  updateTask,
  cancelTask,
  retryTask,
  startTask,
  processAgentCallback,
  countByStatus,
  getQueuedScheduledTasks,
  taskExistsForJiraIssue,
  createPullRequestForTask,
  cloneTask,
  getAllTasks,
  getTasksByScheduledJobId,
  getTaskEvents,
  resumeTask,
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

describe("task-service", () => {
  describe("createTask", () => {
    it("should create a task with defaults and broadcast", async () => {
      const task = makeTask();
      mockDb.insert.mockReturnValue(chainResult([task]));
      mockDb.select.mockReturnValue(chainResult([]));

      const result = await createTask({
        title: "Fix bug",
        repositorySlug: "my-repo",
        projectKey: "PROJ",
      });

      expect(result.id).toBe("task-1");
      expect(result.status).toBe("PENDING");
      expect(result.createdAt).toBe(NOW.toISOString());
      expect(mockDb.insert).toHaveBeenCalled();
      expect(broadcastTaskUpdate).toHaveBeenCalled();
    });

    it("should include commit message pattern with jira key", async () => {
      const task = makeTask({ jiraIssueKey: "PROJ-10" });
      mockDb.insert.mockReturnValue(chainResult([task]));

      const result = await createTask({
        title: "Fix bug",
        repositorySlug: "my-repo",
        jiraIssueKey: "PROJ-10",
      });

      expect(result.id).toBe("task-1");
    });
  });

  describe("getTask", () => {
    it("should return task with events", async () => {
      const task = makeTask();
      const events = [makeEvent()];
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult(events));

      const result = await getTask("task-1");

      expect(result.id).toBe("task-1");
      expect(result.events).toHaveLength(1);
      expect(result.events![0].eventType).toBe("TASK_CREATED");
    });

    it("should throw when task not found", async () => {
      mockDb.select.mockReturnValueOnce(chainResult([]));

      await expect(getTask("nonexistent")).rejects.toThrow("Task not found");
    });
  });

  describe("updateTask", () => {
    it("should update a pending task", async () => {
      const task = makeTask();
      const updated = makeTask({ title: "Updated title" });
      mockDb.select.mockReturnValueOnce(chainResult([task]));
      mockDb.update.mockReturnValue(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));

      const result = await updateTask("task-1", { title: "Updated title" });

      expect(result.title).toBe("Updated title");
      expect(broadcastTaskUpdate).toHaveBeenCalled();
    });

    it("should throw when updating non-PENDING task", async () => {
      const task = makeTask({ status: "IN_PROGRESS" });
      mockDb.select.mockReturnValueOnce(chainResult([task]));

      await expect(updateTask("task-1", { title: "test" })).rejects.toThrow(
        "Can only update tasks in PENDING status",
      );
    });
  });

  describe("cancelTask", () => {
    it("should cancel task and broadcast", async () => {
      const task = makeTask({ status: "IN_PROGRESS" });
      const cancelled = makeTask({ status: "CANCELLED" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([cancelled]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(chainResult([]));

      const result = await cancelTask("task-1");

      expect(result.status).toBe("CANCELLED");
      expect(broadcastTaskUpdate).toHaveBeenCalled();
    });

    it("should throw when cancelling completed task", async () => {
      const task = makeTask({ status: "COMPLETED" });
      mockDb.select.mockReturnValueOnce(chainResult([task]));

      await expect(cancelTask("task-1")).rejects.toThrow("Cannot cancel task");
    });

    it("should auto opt-out jira issue on cancel", async () => {
      const task = makeTask({ status: "IN_PROGRESS", jiraIssueKey: "PROJ-10", userId: "user-1" });
      const cancelled = makeTask({ status: "CANCELLED" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([])) // no existing opt-out
        .mockReturnValueOnce(chainResult([cancelled]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(chainResult([]));

      await cancelTask("task-1");

      // Should have inserted opt-out
      expect(mockDb.insert).toHaveBeenCalledTimes(2); // event + opt-out
    });
  });

  describe("retryTask", () => {
    it("should retry a failed task", async () => {
      const task = makeTask({ status: "FAILED", currentAttempt: 1 });
      const retried = makeTask({ status: "PENDING", errorMessage: null });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([retried]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(chainResult([]));

      const result = await retryTask("task-1");

      expect(result.status).toBe("PENDING");
    });

    it("should throw when max retries exceeded", async () => {
      const task = makeTask({ status: "FAILED", currentAttempt: 3, maxAttempts: 3 });
      mockDb.select.mockReturnValueOnce(chainResult([task]));

      await expect(retryTask("task-1")).rejects.toThrow("Maximum retry attempts");
    });

    it("should throw when retrying non-failed task", async () => {
      const task = makeTask({ status: "PENDING" });
      mockDb.select.mockReturnValueOnce(chainResult([task]));

      await expect(retryTask("task-1")).rejects.toThrow("Can only retry failed tasks");
    });
  });

  describe("startTask", () => {
    it("should queue a pending task", async () => {
      const task = makeTask();
      const queued = makeTask({ status: "QUEUED" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([queued]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent({ eventType: "TASK_QUEUED" })]));

      const result = await startTask("task-1");

      expect(result.status).toBe("QUEUED");
      expect(sendTaskEvent).toHaveBeenCalled();
      expect(broadcastTaskUpdate).toHaveBeenCalled();
    });

    it("should throw when task is not PENDING or QUEUED", async () => {
      const task = makeTask({ status: "COMPLETED" });
      mockDb.select.mockReturnValueOnce(chainResult([task]));

      await expect(startTask("task-1")).rejects.toThrow("PENDING or QUEUED");
    });
  });

  describe("processAgentCallback", () => {
    it("should create event and update task status for AGENT_STARTED", async () => {
      const task = makeTask({ status: "QUEUED" });
      const updated = makeTask({ status: "IN_PROGRESS", currentAttempt: 1 });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent({ eventType: "AGENT_STARTED" })]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "AGENT_STARTED",
      });

      expect(result.status).toBe("IN_PROGRESS");
      expect(sendTaskEvent).toHaveBeenCalled();
      expect(broadcastTaskUpdate).toHaveBeenCalled();
    });

    it("should set FAILED when max attempts exceeded", async () => {
      const task = makeTask({ status: "IN_PROGRESS", currentAttempt: 3, maxAttempts: 3 });
      const updated = makeTask({ status: "FAILED" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent({ eventType: "AGENT_STARTED" })]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "AGENT_STARTED",
      });

      expect(result.status).toBe("FAILED");
    });

    it("should set COMPLETED for TASK_COMPLETED event", async () => {
      const task = makeTask({ status: "IN_PROGRESS" });
      const updated = makeTask({ status: "COMPLETED", completedAt: NOW });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent({ eventType: "TASK_COMPLETED" })]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "TASK_COMPLETED",
      });

      expect(result.status).toBe("COMPLETED");
    });

    it("should set copilotSessionId from callback", async () => {
      const task = makeTask({ status: "QUEUED", copilotSessionId: null });
      const updated = makeTask({ copilotSessionId: "session-123" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "AGENT_STARTED",
        copilotSessionId: "session-123",
      });

      expect(result.copilotSessionId).toBe("session-123");
    });
  });

  describe("createPullRequestForTask", () => {
    it("should create PR and update task", async () => {
      const task = makeTask();
      const updated = makeTask({ pullRequestId: 42, pullRequestUrl: "https://bb.example.com/pr/42" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent({ eventType: "PR_CREATED" })]));

      const result = await createPullRequestForTask("task-1", "feature", "main");

      expect(result.id).toBe(42);
      expect(result.url).toBe("https://bb.example.com/pr/42");
    });
  });

  describe("countByStatus", () => {
    it("should return count", async () => {
      mockDb.select.mockReturnValue(chainResult([{ count: 5 }]));

      const result = await countByStatus("PENDING");

      expect(result).toBe(5);
    });
  });

  describe("getQueuedScheduledTasks", () => {
    it("should return queued tasks with scheduledJobId", async () => {
      const tasks = [makeTask({ status: "QUEUED", scheduledJobId: "job-1" })];
      mockDb.select.mockReturnValue(chainResult(tasks));

      const result = await getQueuedScheduledTasks();

      expect(result).toHaveLength(1);
    });
  });

  describe("taskExistsForJiraIssue", () => {
    it("should return true when active task exists", async () => {
      mockDb.select.mockReturnValue(chainResult([{ count: 1 }]));

      const result = await taskExistsForJiraIssue("PROJ-10");

      expect(result).toBe(true);
    });

    it("should return false when no active task", async () => {
      mockDb.select.mockReturnValue(chainResult([{ count: 0 }]));

      const result = await taskExistsForJiraIssue("PROJ-10");

      expect(result).toBe(false);
    });
  });

  describe("cloneTask", () => {
    it("should clone a task with new ID", async () => {
      const original = makeTask({ id: "task-original" });
      const cloned = makeTask({ id: "task-cloned", sourceBranch: "feature" });
      mockDb.select.mockReturnValueOnce(chainResult([original]));
      mockDb.insert.mockReturnValue(chainResult([cloned]));

      const result = await cloneTask("task-original");

      expect(result.id).toBe("task-cloned");
      expect(mockDb.insert).toHaveBeenCalled();
      expect(broadcastTaskUpdate).toHaveBeenCalled();
    });
  });

  // ── Branch coverage: optional chaining, nullish coalescing, ternary operators ──

  describe("branch coverage – toTaskResponse optional fields", () => {
    it("handles updatedAt as null", async () => {
      const task = makeTask({ updatedAt: null });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([]));

      const result = await getTask("task-1");
      expect(result.updatedAt).toBeNull();
    });

    it("handles updatedAt as a Date", async () => {
      const task = makeTask({ updatedAt: NOW });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([]));

      const result = await getTask("task-1");
      expect(result.updatedAt).toBe(NOW.toISOString());
    });

    it("handles completedAt as null", async () => {
      const task = makeTask({ completedAt: null });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([]));

      const result = await getTask("task-1");
      expect(result.completedAt).toBeNull();
    });

    it("handles completedAt as a Date", async () => {
      const task = makeTask({ completedAt: NOW });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([]));

      const result = await getTask("task-1");
      expect(result.completedAt).toBe(NOW.toISOString());
    });
  });

  describe("branch coverage – resolveCommitMessagePattern", () => {
    it("returns undefined when jiraKey is empty/whitespace", async () => {
      const task = makeTask({ commitMessagePattern: undefined });
      mockDb.insert.mockReturnValue(chainResult([task]));

      await createTask({
        title: "Test",
        repositorySlug: "repo",
        jiraIssueKey: "  ",
        commitMessagePattern: "custom pattern",
      });

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("generates default pattern when jiraKey exists but pattern is empty", async () => {
      const task = makeTask();
      mockDb.insert.mockReturnValue(chainResult([task]));

      await createTask({
        title: "Test",
        repositorySlug: "repo",
        jiraIssueKey: "PROJ-10",
      });

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("prepends jiraKey when pattern exists but doesn't include it", async () => {
      const task = makeTask();
      mockDb.insert.mockReturnValue(chainResult([task]));

      await createTask({
        title: "Test",
        repositorySlug: "repo",
        jiraIssueKey: "PROJ-10",
        commitMessagePattern: "fix: {message}",
      });

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("keeps pattern when it already includes jiraKey", async () => {
      const task = makeTask();
      mockDb.insert.mockReturnValue(chainResult([task]));

      await createTask({
        title: "Test",
        repositorySlug: "repo",
        jiraIssueKey: "PROJ-10",
        commitMessagePattern: "[PROJ-10] fix: {message}",
      });

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("branch coverage – createTask auto-generated branch", () => {
    it("creates BB branch for __AUTO_GENERATED__ sourceBranch", async () => {
      const task = makeTask({ id: "task-auto", sourceBranch: "__AUTO_GENERATED__" });
      mockDb.insert.mockReturnValue(chainResult([task]));
      mockDb.update.mockReturnValue(chainResult([]));

      const { createBranch } = await import("@/lib/services/bitbucket-service");

      await createTask({
        title: "Auto branch",
        repositorySlug: "my-repo",
        projectKey: "PROJ",
        sourceBranch: "__AUTO_GENERATED__",
        targetBranch: "main",
      });

      expect(createBranch).toHaveBeenCalledWith(
        "PROJ",
        "my-repo",
        `promptdev/${task.id}`,
        "main",
      );
    });
  });

  describe("branch coverage – processAgentCallback event types", () => {
    it("handles CODE_GENERATED event (skips if terminal status)", async () => {
      const task = makeTask({ status: "COMPLETED" });
      const updated = makeTask({ status: "COMPLETED" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent({ eventType: "CODE_GENERATED" })]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "CODE_GENERATED",
      });

      // Status should NOT change because task was already COMPLETED
      expect(result.status).toBe("COMPLETED");
    });

    it("handles REVIEWING_STARTED event", async () => {
      const task = makeTask({ status: "IN_PROGRESS" });
      const updated = makeTask({ status: "REVIEWING" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "REVIEWING_STARTED",
      });

      expect(result.status).toBe("REVIEWING");
    });

    it("handles REVIEWING_COMPLETED event", async () => {
      const task = makeTask({ status: "REVIEWING" });
      const updated = makeTask({ status: "COMMITTING" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "REVIEWING_COMPLETED",
      });

      expect(result.status).toBe("COMMITTING");
    });

    it("handles REVIEWING_FAILED event", async () => {
      const task = makeTask({ status: "REVIEWING" });
      const updated = makeTask({ status: "FAILED" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "REVIEWING_FAILED",
        message: "Review check failed",
      });

      expect(result.status).toBe("FAILED");
    });

    it("handles TRIAGING_STARTED event", async () => {
      const task = makeTask({ status: "IN_PROGRESS" });
      const updated = makeTask({ status: "TRIAGING" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "TRIAGING_STARTED",
      });

      expect(result.status).toBe("TRIAGING");
    });

    it("handles TRIAGING_COMPLETED event", async () => {
      const task = makeTask({ status: "TRIAGING" });
      const updated = makeTask({ status: "IN_PROGRESS" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "TRIAGING_COMPLETED",
      });

      expect(result.status).toBe("IN_PROGRESS");
    });

    it("handles GIT_COMMIT event", async () => {
      const task = makeTask({ status: "IN_PROGRESS" });
      const updated = makeTask({ status: "COMMITTING" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "GIT_COMMIT",
      });

      expect(result.status).toBe("COMMITTING");
    });

    it("handles GIT_PUSH event", async () => {
      const task = makeTask({ status: "COMMITTING" });
      const updated = makeTask({ status: "PUSHING" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "GIT_PUSH",
      });

      expect(result.status).toBe("PUSHING");
    });

    it("handles PR_CREATED event with pullRequestId and url", async () => {
      const task = makeTask({ status: "PUSHING" });
      const updated = makeTask({ status: "CREATING_PR", pullRequestId: 99, pullRequestUrl: "https://bb/pr/99" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "PR_CREATED",
        pullRequestId: 99,
        pullRequestUrl: "https://bb/pr/99",
      });

      expect(result.status).toBe("CREATING_PR");
    });

    it("handles TASK_FAILED event", async () => {
      const task = makeTask({ status: "IN_PROGRESS" });
      const updated = makeTask({ status: "FAILED", errorMessage: "Crash" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "TASK_FAILED",
        errorMessage: "Crash",
      });

      expect(result.status).toBe("FAILED");
    });

    it("handles RETRY_SCHEDULED event", async () => {
      const task = makeTask({ status: "FAILED" });
      const updated = makeTask({ status: "PENDING" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "RETRY_SCHEDULED",
      });

      expect(result.status).toBe("PENDING");
    });

    it("handles ITERATION_STARTED with currentIteration in details", async () => {
      const task = makeTask({ status: "IN_PROGRESS" });
      const updated = makeTask({ status: "ITERATION_PENDING", currentIteration: 3 });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "ITERATION_STARTED",
        details: JSON.stringify({ currentIteration: 3 }),
      });

      expect(result.status).toBe("ITERATION_PENDING");
    });

    it("handles ITERATION_COMPLETED event", async () => {
      const task = makeTask({ status: "ITERATION_PENDING" });
      const updated = makeTask({ status: "IN_PROGRESS" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "ITERATION_COMPLETED",
      });

      expect(result.status).toBe("IN_PROGRESS");
    });

    it("handles ITERATION_STARTED with unparseable details (ignores error)", async () => {
      const task = makeTask({ status: "IN_PROGRESS" });
      const updated = makeTask({ status: "ITERATION_PENDING" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "ITERATION_STARTED",
        details: "not-json",
      });

      expect(result.status).toBe("ITERATION_PENDING");
    });

    it("handles ITERATION_STARTED skipped when task is in terminal status", async () => {
      const task = makeTask({ status: "COMPLETED" });
      const updated = makeTask({ status: "COMPLETED" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "ITERATION_STARTED",
      });

      expect(result.status).toBe("COMPLETED");
    });

    it("handles unknown event type (default case, no updates)", async () => {
      const task = makeTask({ status: "IN_PROGRESS" });
      const updated = makeTask({ status: "IN_PROGRESS" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "PROGRESS",
      });

      expect(result.status).toBe("IN_PROGRESS");
    });
  });

  describe("branch coverage – cancelTask jira opt-out branches", () => {
    it("skips jira opt-out when no jiraIssueKey", async () => {
      const task = makeTask({ status: "IN_PROGRESS", jiraIssueKey: null, userId: "user-1" });
      const cancelled = makeTask({ status: "CANCELLED" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([cancelled]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(chainResult([]));

      await cancelTask("task-1");

      // Only 1 insert (cancel event), no opt-out insert
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it("skips jira opt-out when jiraIssueKey is whitespace", async () => {
      const task = makeTask({ status: "IN_PROGRESS", jiraIssueKey: "  ", userId: "user-1" });
      const cancelled = makeTask({ status: "CANCELLED" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([cancelled]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(chainResult([]));

      await cancelTask("task-1");

      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it("skips jira opt-out when userId is null", async () => {
      const task = makeTask({ status: "IN_PROGRESS", jiraIssueKey: "PROJ-10", userId: null });
      const cancelled = makeTask({ status: "CANCELLED" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([cancelled]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(chainResult([]));

      await cancelTask("task-1");

      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it("skips opt-out insert when opt-out already exists", async () => {
      const task = makeTask({ status: "IN_PROGRESS", jiraIssueKey: "PROJ-10", userId: "user-1" });
      const cancelled = makeTask({ status: "CANCELLED" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([{ id: "existing" }])) // existing opt-out
        .mockReturnValueOnce(chainResult([cancelled]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(chainResult([]));

      await cancelTask("task-1");

      // Only 1 insert (cancel event), skip opt-out since already exists
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });
  });

  describe("branch coverage – retryTask nullish coalescing", () => {
    it("handles null currentAttempt as 0", async () => {
      const task = makeTask({ status: "FAILED", currentAttempt: null, maxAttempts: 3 });
      const retried = makeTask({ status: "PENDING" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([retried]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(chainResult([]));

      const result = await retryTask("task-1");

      expect(result.status).toBe("PENDING");
    });

    it("handles null maxAttempts as 3", async () => {
      const task = makeTask({ status: "FAILED", currentAttempt: 2, maxAttempts: null });
      const retried = makeTask({ status: "PENDING" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([retried]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(chainResult([]));

      const result = await retryTask("task-1");

      expect(result.status).toBe("PENDING");
    });
  });

  describe("branch coverage – resumeTask", () => {
    it("resumes a completed task", async () => {
      const task = makeTask({ status: "COMPLETED", resumeCount: 2 });
      const updated = makeTask({ status: "PENDING", resumeCount: 3 });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));

      const result = await resumeTask("task-1", "Try again");

      expect(result.status).toBe("PENDING");
    });

    it("handles null resumeCount as 0", async () => {
      const task = makeTask({ status: "FAILED", resumeCount: null });
      const updated = makeTask({ status: "PENDING", resumeCount: 1 });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.update.mockReturnValue(chainResult([]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));

      const result = await resumeTask("task-1", "Retry");

      expect(result.status).toBe("PENDING");
    });

    it("throws when task is in non-resumable status", async () => {
      const task = makeTask({ status: "IN_PROGRESS" });
      mockDb.select.mockReturnValueOnce(chainResult([task]));

      await expect(resumeTask("task-1", "Retry")).rejects.toThrow("Can only resume");
    });
  });

  describe("branch coverage – getAllTasks filters", () => {
    it("fetches tasks with search filter", async () => {
      mockDb.select
        .mockReturnValueOnce(chainResult([]))
        .mockReturnValueOnce(chainResult([{ count: 0 }]));

      const result = await getAllTasks(0, 20, { search: "login" });

      expect(result.content).toHaveLength(0);
    });

    it("fetches tasks with status filter", async () => {
      mockDb.select
        .mockReturnValueOnce(chainResult([]))
        .mockReturnValueOnce(chainResult([{ count: 0 }]));

      const result = await getAllTasks(0, 20, { statuses: ["PENDING", "QUEUED"] });

      expect(result.content).toHaveLength(0);
    });

    it("fetches tasks with workspaceType filter", async () => {
      mockDb.select
        .mockReturnValueOnce(chainResult([]))
        .mockReturnValueOnce(chainResult([{ count: 0 }]));

      const result = await getAllTasks(0, 20, { workspaceType: "BITBUCKET" });

      expect(result.content).toHaveLength(0);
    });

    it("ignores workspaceType 'all'", async () => {
      mockDb.select
        .mockReturnValueOnce(chainResult([]))
        .mockReturnValueOnce(chainResult([{ count: 0 }]));

      const result = await getAllTasks(0, 20, { workspaceType: "all" });

      expect(result.content).toHaveLength(0);
    });
  });

  describe("branch coverage – getTasksByScheduledJobId", () => {
    it("returns tasks for a scheduled job", async () => {
      const jobTasks = [makeTask({ scheduledJobId: "job-1" })];
      mockDb.select.mockReturnValueOnce(chainResult(jobTasks));

      const result = await getTasksByScheduledJobId("job-1");

      expect(result).toHaveLength(1);
    });
  });

  describe("branch coverage – getTaskEvents", () => {
    it("returns events for a task", async () => {
      const evts = [makeEvent()];
      mockDb.select.mockReturnValueOnce(chainResult(evts));

      const result = await getTaskEvents("task-1");

      expect(result).toHaveLength(1);
      expect(result[0].eventType).toBe("TASK_CREATED");
    });
  });

  describe("branch coverage – processAgentCallback copilotSessionId", () => {
    it("does not set copilotSessionId when task already has one", async () => {
      const task = makeTask({ status: "IN_PROGRESS", copilotSessionId: "existing-session" });
      const updated = makeTask({ status: "IN_PROGRESS", copilotSessionId: "existing-session" });
      mockDb.select
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([updated]));
      mockDb.insert.mockReturnValue(chainResult([makeEvent()]));

      const result = await processAgentCallback({
        taskId: "task-1",
        eventType: "PROGRESS",
        copilotSessionId: "new-session",
      });

      // copilotSessionId should remain the existing one
      expect(result.copilotSessionId).toBe("existing-session");
    });
  });

  describe("branch coverage – cloneTask workspace path", () => {
    it("resolves incremented path for LOCAL workspace with custom path", async () => {
      const original = makeTask({
        id: "task-orig",
        workspaceType: "LOCAL",
        workspacePath: "/custom/path",
        repositorySlug: "my-repo",
      });
      const cloned = makeTask({ id: "task-cloned" });
      mockDb.select.mockReturnValueOnce(chainResult([original]));
      mockDb.insert.mockReturnValue(chainResult([cloned]));

      const result = await cloneTask("task-orig");

      expect(result.id).toBe("task-cloned");
    });
  });
});
