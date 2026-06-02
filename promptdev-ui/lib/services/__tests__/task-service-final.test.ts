/**
 * Tests for lib/services/task-service.ts — covering uncovered lines:
 * L234: auto-generated branch creation (sourceBranch === "__AUTO_GENERATED__")
 * L757: clone task auto-generated branch path
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

const mockCreateBranch = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/services/bitbucket-service", () => ({
  createBranch: (...args: unknown[]) => mockCreateBranch(...args),
  createPullRequest: vi.fn().mockResolvedValue({ id: 42, title: "PR" }),
  getPullRequestWebUrl: vi.fn().mockReturnValue("https://bb.example.com/pr/42"),
}));
vi.mock("@/lib/services/workspace-service", () => ({
  resolveIncrementedPath: vi.fn((p: string) => `${p}-1`),
}));

import { createTask, cloneTask } from "../task-service";

const NOW = new Date("2025-01-15T10:00:00Z");

function makeTask(overrides = {}) {
  return {
    id: "task-1",
    title: "Test task",
    prompt: "Do stuff",
    repositorySlug: "my-repo",
    projectKey: "PROJ",
    workspaceType: "BITBUCKET",
    workspacePath: null,
    sourceBranch: "__AUTO_GENERATED__",
    targetBranch: "main",
    status: "PENDING",
    currentAttempt: 0,
    maxAttempts: 3,
    modelId: "gpt-4.1",
    copilotSessionId: null,
    pullRequestId: null,
    pullRequestUrl: null,
    errorMessage: null,
    iterative: false,
    maxIterations: null,
    currentIteration: 0,
    currentStepIndex: 0,
    completionCriteria: null,
    steps: null,
    scheduledJobId: null,
    jiraIssueKey: null,
    userId: null,
    reviewEnabled: false,
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

describe("task-service – uncovered lines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  // ── L234: createTask with __AUTO_GENERATED__ branch ───────

  describe("createTask with auto-generated branch", () => {
    it("creates branch and updates task when sourceBranch is __AUTO_GENERATED__", async () => {
      const task = makeTask();
      const event = { id: "ev-1", taskId: task.id, eventType: "TASK_CREATED", message: "Task created successfully", timestamp: NOW };

      // insert (task) → returning task
      mockDb.insert.mockReturnValueOnce(chainResult([task]));
      // update (branch name) 
      mockDb.update.mockReturnValue(chainResult(undefined));
      // insert (event) → returning event
      mockDb.insert.mockReturnValueOnce(chainResult([event]));

      const result = await createTask({
        title: "Test task",
        repositorySlug: "my-repo",
        projectKey: "PROJ",
        sourceBranch: "__AUTO_GENERATED__",
        targetBranch: "main",
      });

      // Should have called createBranch
      expect(mockCreateBranch).toHaveBeenCalledWith(
        "PROJ",
        "my-repo",
        `promptdev/${task.id}`,
        "main",
      );

      // Should have updated the task's sourceBranch
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("warns but continues when branch creation fails", async () => {
      const task = makeTask();
      const event = { id: "ev-1", taskId: task.id, eventType: "TASK_CREATED", message: "Task created", timestamp: NOW };

      mockDb.insert
        .mockReturnValueOnce(chainResult([task]))
        .mockReturnValueOnce(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult(undefined));

      mockCreateBranch.mockRejectedValueOnce(new Error("Branch exists"));
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await createTask({
        title: "Test task",
        repositorySlug: "my-repo",
        sourceBranch: "__AUTO_GENERATED__",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to auto-create branch"),
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  // ── L757: cloneTask with __AUTO_GENERATED__ branch ────────

  describe("cloneTask with auto-generated branch", () => {
    it("creates branch for cloned task", async () => {
      const original = makeTask({ id: "orig-1" });
      const cloned = makeTask({ id: "clone-1", sourceBranch: "__AUTO_GENERATED__" });
      const event = { id: "ev-2", taskId: cloned.id, eventType: "TASK_CREATED", message: "Cloned" };

      // select (original task)
      mockDb.select.mockReturnValue(chainResult([original]));
      // insert (cloned task) → returning cloned task
      mockDb.insert
        .mockReturnValueOnce(chainResult([cloned]))
        .mockReturnValueOnce(chainResult([event]));
      // update (branch name)
      mockDb.update.mockReturnValue(chainResult(undefined));

      const result = await cloneTask("orig-1");

      expect(mockCreateBranch).toHaveBeenCalledWith(
        "PROJ",
        "my-repo",
        `promptdev/${cloned.id}`,
        "main",
      );
    });

    it("handles clone branch creation failure gracefully", async () => {
      const original = makeTask({ id: "orig-2" });
      const cloned = makeTask({ id: "clone-2", sourceBranch: "__AUTO_GENERATED__" });
      const event = { id: "ev-3", taskId: cloned.id, eventType: "TASK_CREATED", message: "Cloned" };

      mockDb.select.mockReturnValue(chainResult([original]));
      mockDb.insert
        .mockReturnValueOnce(chainResult([cloned]))
        .mockReturnValueOnce(chainResult([event]));
      mockDb.update.mockReturnValue(chainResult(undefined));
      mockCreateBranch.mockRejectedValueOnce(new Error("Repo offline"));

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await cloneTask("orig-2");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to auto-create branch"),
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });
});
