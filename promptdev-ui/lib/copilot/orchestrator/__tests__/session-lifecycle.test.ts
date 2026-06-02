import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all external dependencies BEFORE imports
vi.mock("@/lib/monitoring", () => ({
  trackOperation: vi.fn().mockResolvedValue(undefined),
  endMonitoringSession: vi.fn().mockResolvedValue(undefined),
  flushOperations: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/copilot/client", () => ({
  destroySession: vi.fn().mockResolvedValue(undefined),
  sendMessage: vi.fn().mockResolvedValue("msg-1"),
}));

vi.mock("../service-bridge", () => ({
  sendCallback: vi.fn().mockResolvedValue(undefined),
  fetchTask: vi.fn(),
  cleanupWorkspace: vi.fn(),
}));

vi.mock("../jira", () => ({
  addJiraComment: vi.fn().mockResolvedValue(undefined),
  transitionJiraIssue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../pull-request", () => ({
  createPullRequest: vi.fn().mockResolvedValue(undefined),
}));

// Mock the shared mutable state
vi.mock("../types", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../types")>();
  return {
    ...actual,
    reviewPending: new Set<string>(),
    taskSessions: new Map<string, string>(),
  };
});

import {
  handleSessionIdle,
  performReview,
  cleanupTaskSession,
} from "../session-lifecycle";
import { sendCallback, fetchTask, cleanupWorkspace } from "../service-bridge";
import { sendMessage, destroySession } from "@/lib/copilot/client";
import {
  endMonitoringSession,
  flushOperations,
  trackOperation,
} from "@/lib/monitoring";
import { addJiraComment, transitionJiraIssue } from "../jira";
import { createPullRequest } from "../pull-request";
import { reviewPending, taskSessions } from "../types";
import type { TaskData } from "../types";

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

beforeEach(() => {
  vi.clearAllMocks();
  reviewPending.clear();
  taskSessions.clear();
});

describe("session-lifecycle", () => {
  // ── handleSessionIdle ─────────────────────────────────────────

  describe("handleSessionIdle", () => {
    it("should send CODE_GENERATED and TASK_COMPLETED for simple task", async () => {
      const result = await handleSessionIdle(
        "task-1",
        "session-1",
        BASE_TASK,
        "Done!",
        5,
        10,
      );

      expect(result).toBe(true);
      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "CODE_GENERATED",
        expect.objectContaining({
          message: "AI agent completed code generation",
        }),
      );
      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "TASK_COMPLETED",
        expect.objectContaining({
          message: expect.stringContaining("5 messages"),
        }),
      );
    });

    it("should create PR for BITBUCKET workspace before finalizing", async () => {
      const bbTask: TaskData = {
        ...BASE_TASK,
        workspaceType: "BITBUCKET",
      };

      await handleSessionIdle("task-1", "session-1", bbTask, "Done", 1, 1);

      expect(createPullRequest).toHaveBeenCalledWith("task-1", bbTask);
    });

    it("should not create PR for LOCAL workspace", async () => {
      await handleSessionIdle("task-1", "session-1", BASE_TASK, "Done", 1, 1);

      expect(createPullRequest).not.toHaveBeenCalled();
    });

    it("should start review when reviewEnabled and return false", async () => {
      const reviewTask: TaskData = { ...BASE_TASK, reviewEnabled: true };

      const result = await handleSessionIdle(
        "task-1",
        "session-1",
        reviewTask,
        "Done",
        3,
        5,
      );

      expect(result).toBe(false);
      expect(reviewPending.has("task-1")).toBe(true);
      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "REVIEWING_STARTED",
        expect.any(Object),
      );
      expect(sendMessage).toHaveBeenCalledWith(
        "session-1",
        expect.stringContaining("CODE REVIEW"),
      );
    });

    it("should finalize review when reviewPending and idle fires again", async () => {
      reviewPending.add("task-1");
      const reviewTask: TaskData = { ...BASE_TASK, reviewEnabled: true };

      const result = await handleSessionIdle(
        "task-1",
        "session-1",
        reviewTask,
        "No issues found",
        5,
        10,
      );

      expect(result).toBe(true);
      expect(reviewPending.has("task-1")).toBe(false);
      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "REVIEWING_COMPLETED",
        expect.objectContaining({ message: "Code review completed" }),
      );
    });

    it("should create PR after review for BITBUCKET workspace", async () => {
      reviewPending.add("task-1");
      const bbReviewTask: TaskData = {
        ...BASE_TASK,
        workspaceType: "BITBUCKET",
        reviewEnabled: true,
      };

      await handleSessionIdle(
        "task-1",
        "session-1",
        bbReviewTask,
        "Review done",
        5,
        10,
      );

      expect(createPullRequest).toHaveBeenCalledWith("task-1", bbReviewTask);
    });

    it("should add Jira comment and transition on finalize", async () => {
      const jiraTask: TaskData = {
        ...BASE_TASK,
        jiraIssueKey: "PROJ-123",
      };

      await handleSessionIdle("task-1", "session-1", jiraTask, "Done", 3, 7);

      expect(addJiraComment).toHaveBeenCalledWith(
        "PROJ-123",
        expect.stringContaining("completed"),
      );
      expect(transitionJiraIssue).toHaveBeenCalledWith("PROJ-123", "Done");
    });

    // ── Iterative checks ──────────────────────────────────────────

    it("should continue iterating when criteria not met", async () => {
      const iterTask: TaskData = {
        ...BASE_TASK,
        iterative: true,
        maxIterations: 5,
        currentIteration: 0,
        completionCriteria: "All tests pass",
      };

      vi.mocked(fetchTask).mockResolvedValue(iterTask);

      const result = await handleSessionIdle(
        "task-1",
        "session-1",
        iterTask,
        "Still working on it",
        3,
        5,
      );

      expect(result).toBe(false);
      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "ITERATION_COMPLETED",
        expect.objectContaining({
          message: expect.stringContaining("Continuing"),
        }),
      );
      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "ITERATION_STARTED",
        expect.any(Object),
      );
      expect(sendMessage).toHaveBeenCalledWith(
        "session-1",
        expect.stringContaining("Continue working"),
      );
    });

    it("should stop iterating when completion criteria met", async () => {
      const iterTask: TaskData = {
        ...BASE_TASK,
        iterative: true,
        maxIterations: 5,
        currentIteration: 1,
        completionCriteria: "All tests pass",
      };

      vi.mocked(fetchTask).mockResolvedValue(iterTask);

      const result = await handleSessionIdle(
        "task-1",
        "session-1",
        iterTask,
        "All tests pass successfully",
        5,
        10,
      );

      expect(result).toBe(true);
      expect(sendMessage).not.toHaveBeenCalledWith(
        "session-1",
        expect.stringContaining("Continue working"),
      );
    });

    it("should stop at max iterations", async () => {
      const iterTask: TaskData = {
        ...BASE_TASK,
        iterative: true,
        maxIterations: 3,
        currentIteration: 2, // fetchTask returns this, so currentIteration+1 = 3 = max
      };

      vi.mocked(fetchTask).mockResolvedValue(iterTask);

      const result = await handleSessionIdle(
        "task-1",
        "session-1",
        iterTask,
        "Still going",
        5,
        10,
      );

      expect(result).toBe(true);
      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "ITERATION_COMPLETED",
        expect.objectContaining({
          message: expect.stringContaining("Maximum iterations reached"),
        }),
      );
    });

    it("should use original task data when fetchTask fails", async () => {
      const iterTask: TaskData = {
        ...BASE_TASK,
        iterative: true,
        maxIterations: 2,
        currentIteration: 1, // +1=2 >= max(2) => finalize
      };

      vi.mocked(fetchTask).mockRejectedValue(new Error("DB error"));

      const result = await handleSessionIdle(
        "task-1",
        "session-1",
        iterTask,
        "Working",
        5,
        10,
      );

      // Should still finalize since currentIteration+1 = 2 >= max 2
      expect(result).toBe(true);
    });

    it("should detect completion via various indicator phrases", async () => {
      const iterTask: TaskData = {
        ...BASE_TASK,
        iterative: true,
        maxIterations: 10,
        currentIteration: 0,
        completionCriteria: "finish the task",
      };

      vi.mocked(fetchTask).mockResolvedValue(iterTask);

      const indicators = [
        "all tests pass",
        "implementation complete",
        "criteria met",
        "task complete",
        "all requirements fulfilled",
        "done",
        "finished",
        "completed successfully",
      ];

      for (const phrase of indicators) {
        vi.clearAllMocks();
        vi.mocked(fetchTask).mockResolvedValue(iterTask);

        const result = await handleSessionIdle(
          "task-1",
          "session-1",
          iterTask,
          `The work is: ${phrase}.`,
          5,
          10,
        );

        expect(result).toBe(true);
      }
    });

    it("should default maxIterations to 10 when not set", async () => {
      const iterTask: TaskData = {
        ...BASE_TASK,
        iterative: true,
        currentIteration: 0,
        completionCriteria: "Tests pass",
        // maxIterations not set
      };

      vi.mocked(fetchTask).mockResolvedValue(iterTask);

      const result = await handleSessionIdle(
        "task-1",
        "session-1",
        iterTask,
        "Still working",
        1,
        1,
      );

      // currentIteration = 0+1 = 1 < 10, criteria not met => continue
      expect(result).toBe(false);
      expect(sendMessage).toHaveBeenCalled();
    });
  });

  // ── performReview ─────────────────────────────────────────────

  describe("performReview", () => {
    it("should send REVIEWING_STARTED callback", async () => {
      await performReview("task-1", "session-1");

      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "REVIEWING_STARTED",
        expect.objectContaining({
          message: "Starting code review & validation...",
        }),
      );
    });

    it("should send review prompt to session", async () => {
      await performReview("task-1", "session-1");

      expect(sendMessage).toHaveBeenCalledWith(
        "session-1",
        expect.stringContaining("CODE REVIEW & FIX mode"),
      );
    });

    it("should track the review message operation", async () => {
      await performReview("task-1", "session-1");

      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "session-1",
          taskId: "task-1",
          operationType: "MESSAGE_SENT",
        }),
      );
    });
  });

  // ── cleanupTaskSession ────────────────────────────────────────

  describe("cleanupTaskSession", () => {
    it("should end monitoring, flush, destroy session, and remove from map", async () => {
      taskSessions.set("task-1", "session-1");

      await cleanupTaskSession("task-1", "session-1", BASE_TASK);

      expect(endMonitoringSession).toHaveBeenCalledWith("session-1");
      expect(flushOperations).toHaveBeenCalled();
      expect(destroySession).toHaveBeenCalledWith("session-1");
      expect(taskSessions.has("task-1")).toBe(false);
    });

    it("should cleanup workspace for non-LOCAL types", async () => {
      const bbTask: TaskData = { ...BASE_TASK, workspaceType: "BITBUCKET" };

      await cleanupTaskSession("task-1", "session-1", bbTask);

      expect(cleanupWorkspace).toHaveBeenCalledWith("task-1");
    });

    it("should NOT cleanup workspace for LOCAL type", async () => {
      await cleanupTaskSession("task-1", "session-1", BASE_TASK);

      expect(cleanupWorkspace).not.toHaveBeenCalled();
    });

    it("should handle cleanup errors gracefully", async () => {
      vi.mocked(destroySession).mockRejectedValueOnce(
        new Error("Session gone"),
      );
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await expect(
        cleanupTaskSession("task-1", "session-1", BASE_TASK),
      ).resolves.not.toThrow();

      consoleSpy.mockRestore();
    });
  });
});
