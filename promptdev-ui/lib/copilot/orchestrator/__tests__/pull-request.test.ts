import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// Mock external dependencies BEFORE imports
vi.mock("@/lib/services/task-service", () => ({
  createPullRequestForTask: vi.fn(),
}));

vi.mock("../service-bridge", () => ({
  sendCallback: vi.fn().mockResolvedValue(undefined),
  serializeField: vi.fn((v: unknown) => {
    if (v == null) return undefined;
    if (typeof v === "string") return v;
    return JSON.stringify(v);
  }),
}));

import { createPullRequest } from "../pull-request";
import * as taskService from "@/lib/services/task-service";
import { sendCallback } from "../service-bridge";
import type { TaskData } from "../types";

const BASE_TASK: TaskData = {
  id: "task-1",
  title: "Test task",
  prompt: "Do something",
  repositorySlug: "my-repo",
  projectKey: "PROJ",
  workspaceType: "BITBUCKET",
  sourceBranch: "promptdev/task-1",
  targetBranch: "main",
};

describe("pull-request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  describe("createPullRequest", () => {
    it("should create PR on first attempt", async () => {
      vi.mocked(taskService.createPullRequestForTask).mockResolvedValue({
        id: 42,
        url: "https://bitbucket.example.com/pr/42",
      });

      await createPullRequest("task-1", BASE_TASK);

      expect(taskService.createPullRequestForTask).toHaveBeenCalledTimes(1);
      expect(taskService.createPullRequestForTask).toHaveBeenCalledWith(
        "task-1",
        "promptdev/task-1",
        "main",
        "Test task",
        expect.stringContaining("Automated PR"),
      );

      expect(sendCallback).toHaveBeenCalledWith("task-1", "PR_CREATED", {
        message: "Pull request created: https://bitbucket.example.com/pr/42",
        pullRequestId: 42,
        pullRequestUrl: "https://bitbucket.example.com/pr/42",
      });
    });

    it("should use fallback branch name when sourceBranch is missing", async () => {
      vi.mocked(taskService.createPullRequestForTask).mockResolvedValue({
        id: 1,
        url: "https://example.com/pr/1",
      });

      const task = { ...BASE_TASK, sourceBranch: undefined as unknown as string };
      await createPullRequest("task-99", task);

      expect(taskService.createPullRequestForTask).toHaveBeenCalledWith(
        "task-99",
        "proj/task-99", // projectKey lowercased + taskId
        "main",
        expect.any(String),
        expect.any(String),
      );
    });

    it("should use 'main' as default target branch when targetBranch is missing", async () => {
      vi.mocked(taskService.createPullRequestForTask).mockResolvedValue({
        id: 1,
        url: "",
      });

      const task = { ...BASE_TASK, targetBranch: undefined as unknown as string };
      await createPullRequest("task-1", task);

      expect(taskService.createPullRequestForTask).toHaveBeenCalledWith(
        "task-1",
        expect.any(String),
        "main",
        expect.any(String),
        expect.any(String),
      );
    });

    it("should use taskId as title fallback when title is missing", async () => {
      vi.mocked(taskService.createPullRequestForTask).mockResolvedValue({
        id: 1,
        url: "",
      });

      const task = { ...BASE_TASK, title: undefined as unknown as string };
      await createPullRequest("task-1", task);

      expect(taskService.createPullRequestForTask).toHaveBeenCalledWith(
        "task-1",
        expect.any(String),
        expect.any(String),
        "PromptDev: task-1",
        expect.any(String),
      );
    });

    it("should handle PR created without URL", async () => {
      vi.mocked(taskService.createPullRequestForTask).mockResolvedValue({
        id: 10,
        url: "",
      });

      await createPullRequest("task-1", BASE_TASK);

      expect(sendCallback).toHaveBeenCalledWith("task-1", "PR_CREATED", {
        message: "Pull request created",
        pullRequestId: 10,
        pullRequestUrl: "",
      });
    });

    it("should retry up to 3 times on failure", async () => {
      vi.mocked(taskService.createPullRequestForTask)
        .mockRejectedValueOnce(new Error("Push not propagated"))
        .mockRejectedValueOnce(new Error("Push not propagated"))
        .mockResolvedValueOnce({ id: 5, url: "https://example.com/pr/5" });

      const promise = createPullRequest("task-1", BASE_TASK);

      // After first failure, advance timer for retry delay
      await vi.advanceTimersByTimeAsync(5000);
      // After second failure, advance timer for retry delay
      await vi.advanceTimersByTimeAsync(5000);

      await promise;

      expect(taskService.createPullRequestForTask).toHaveBeenCalledTimes(3);
      expect(sendCallback).toHaveBeenCalledWith(
        "task-1",
        "PR_CREATED",
        expect.objectContaining({ pullRequestId: 5 }),
      );
    });

    it("should send ERROR callback after all retries exhausted", async () => {
      vi.mocked(taskService.createPullRequestForTask)
        .mockRejectedValue(new Error("Service unavailable"));

      const promise = createPullRequest("task-1", BASE_TASK);

      await vi.advanceTimersByTimeAsync(5000);
      await vi.advanceTimersByTimeAsync(5000);

      await promise;

      expect(taskService.createPullRequestForTask).toHaveBeenCalledTimes(3);
      expect(sendCallback).toHaveBeenCalledWith("task-1", "ERROR", {
        message: "Failed to create pull request",
        errorMessage: "Service unavailable",
      });
    });

    it("should stringify non-Error objects in error callback", async () => {
      vi.mocked(taskService.createPullRequestForTask)
        .mockRejectedValue("string error");

      const promise = createPullRequest("task-1", BASE_TASK);

      await vi.advanceTimersByTimeAsync(5000);
      await vi.advanceTimersByTimeAsync(5000);

      await promise;

      expect(sendCallback).toHaveBeenCalledWith("task-1", "ERROR", {
        message: "Failed to create pull request",
        errorMessage: "string error",
      });
    });

    it("should not send ERROR callback on intermediate failures", async () => {
      vi.mocked(taskService.createPullRequestForTask)
        .mockRejectedValueOnce(new Error("First fail"))
        .mockResolvedValueOnce({ id: 1, url: "https://example.com/pr/1" });

      const promise = createPullRequest("task-1", BASE_TASK);
      await vi.advanceTimersByTimeAsync(5000);
      await promise;

      // Should NOT have sent ERROR callback since it recovered
      const errorCalls = vi
        .mocked(sendCallback)
        .mock.calls.filter(([, type]) => type === "ERROR");
      expect(errorCalls).toHaveLength(0);
    });

    it("should use promptdev as default projectKey in branch name", async () => {
      vi.mocked(taskService.createPullRequestForTask).mockResolvedValue({
        id: 1,
        url: "",
      });

      const task = {
        ...BASE_TASK,
        sourceBranch: undefined as unknown as string,
        projectKey: undefined as unknown as string,
      };
      await createPullRequest("task-1", task);

      expect(taskService.createPullRequestForTask).toHaveBeenCalledWith(
        "task-1",
        "promptdev/task-1",
        expect.any(String),
        expect.any(String),
        expect.any(String),
      );
    });
  });
});
