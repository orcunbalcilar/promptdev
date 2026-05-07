import { getEligibleTasks, executeBulkOperation } from "@/lib/bulk-operations";
import type { Task } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  startTask: vi.fn(),
  cancelTask: vi.fn(),
  retryTask: vi.fn(),
}));

import * as api from "@/lib/api";

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "Test Task",
  prompt: "Do something",
  repositorySlug: "my-repo",
  workspaceType: "LOCAL",
  sourceBranch: "feature/test",
  targetBranch: "main",
  status: "COMPLETED",
  currentAttempt: 1,
  maxAttempts: 3,
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T11:00:00Z",
  ...overrides,
});

describe("bulk-operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getEligibleTasks", () => {
    const tasks = [
      makeTask({ id: "1", status: "PENDING" }),
      makeTask({ id: "2", status: "IN_PROGRESS" }),
      makeTask({ id: "3", status: "FAILED" }),
      makeTask({ id: "4", status: "COMPLETED" }),
      makeTask({ id: "5", status: "CANCELLED" }),
    ];

    it("should filter tasks eligible for start", () => {
      const eligible = getEligibleTasks(tasks, "start");
      expect(eligible).toHaveLength(1);
      expect(eligible[0].id).toBe("1");
    });

    it("should filter tasks eligible for cancel", () => {
      const eligible = getEligibleTasks(tasks, "cancel");
      expect(eligible).toHaveLength(1);
      expect(eligible[0].id).toBe("2");
    });

    it("should filter tasks eligible for retry", () => {
      const eligible = getEligibleTasks(tasks, "retry");
      expect(eligible).toHaveLength(2);
    });

    it("should allow all tasks for delete", () => {
      const eligible = getEligibleTasks(tasks, "delete");
      expect(eligible).toHaveLength(5);
    });
  });

  describe("executeBulkOperation", () => {
    it("should execute start on multiple tasks", async () => {
      vi.mocked(api.startTask).mockResolvedValue(makeTask());
      const result = await executeBulkOperation(["t1", "t2", "t3"], "start");
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
      expect(api.startTask).toHaveBeenCalledTimes(3);
    });

    it("should track failures", async () => {
      vi.mocked(api.cancelTask).mockRejectedValue(new Error("Not found"));
      const result = await executeBulkOperation(["t1", "t2"], "cancel");
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].error).toBe("Not found");
    });

    it("should handle mixed success and failure", async () => {
      vi.mocked(api.retryTask)
        .mockResolvedValueOnce(makeTask())
        .mockRejectedValueOnce(new Error("Error"));
      const result = await executeBulkOperation(["t1", "t2"], "retry");
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
    });

    it("should return correct total count", async () => {
      vi.mocked(api.startTask).mockResolvedValue(makeTask());
      const result = await executeBulkOperation(["t1", "t2", "t3"], "start");
      expect(result.total).toBe(3);
      expect(result.operation).toBe("start");
    });

    it("should handle empty task list", async () => {
      const result = await executeBulkOperation([], "start");
      expect(result.total).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
    });
  });
});
