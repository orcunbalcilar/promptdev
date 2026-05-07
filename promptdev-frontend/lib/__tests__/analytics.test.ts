import { calculateTaskMetrics, formatDuration, compareModels } from "@/lib/analytics";
import type { Task } from "@/lib/api";

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
  completedAt: "2024-01-15T11:00:00Z",
  ...overrides,
});

describe("analytics", () => {
  describe("calculateTaskMetrics", () => {
    it("should count total, completed, and failed tasks", () => {
      const tasks = [
        makeTask({ status: "COMPLETED" }),
        makeTask({ status: "COMPLETED" }),
        makeTask({ status: "FAILED" }),
        makeTask({ status: "IN_PROGRESS", completedAt: undefined }),
      ];
      const metrics = calculateTaskMetrics(tasks);
      expect(metrics.totalTasks).toBe(4);
      expect(metrics.completedTasks).toBe(2);
      expect(metrics.failedTasks).toBe(1);
    });

    it("should calculate success rate", () => {
      const tasks = [
        makeTask({ status: "COMPLETED" }),
        makeTask({ status: "FAILED" }),
      ];
      const metrics = calculateTaskMetrics(tasks);
      expect(metrics.successRate).toBe(50);
    });

    it("should calculate average duration", () => {
      const tasks = [
        makeTask({
          createdAt: "2024-01-15T10:00:00Z",
          completedAt: "2024-01-15T11:00:00Z",
        }),
        makeTask({
          createdAt: "2024-01-15T10:00:00Z",
          completedAt: "2024-01-15T12:00:00Z",
        }),
      ];
      const metrics = calculateTaskMetrics(tasks);
      // 1h and 2h => avg 1.5h = 5400000ms
      expect(metrics.averageDurationMs).toBe(5400000);
    });

    it("should group tasks by status", () => {
      const tasks = [
        makeTask({ status: "COMPLETED" }),
        makeTask({ status: "COMPLETED" }),
        makeTask({ status: "FAILED" }),
      ];
      const metrics = calculateTaskMetrics(tasks);
      expect(metrics.tasksByStatus["COMPLETED"]).toBe(2);
      expect(metrics.tasksByStatus["FAILED"]).toBe(1);
    });

    it("should group tasks by model", () => {
      const tasks = [
        makeTask({ modelId: "gpt-4" }),
        makeTask({ modelId: "gpt-4" }),
        makeTask({ modelId: "claude-3" }),
      ];
      const metrics = calculateTaskMetrics(tasks);
      expect(metrics.tasksByModel["gpt-4"]).toBe(2);
      expect(metrics.tasksByModel["claude-3"]).toBe(1);
    });

    it("should return zero metrics for empty tasks", () => {
      const metrics = calculateTaskMetrics([]);
      expect(metrics.totalTasks).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.averageDurationMs).toBe(0);
    });

    it("should generate completion trend", () => {
      const tasks = [
        makeTask({ status: "COMPLETED", completedAt: "2024-01-15T10:00:00Z" }),
        makeTask({ status: "COMPLETED", completedAt: "2024-01-15T11:00:00Z" }),
        makeTask({ status: "COMPLETED", completedAt: "2024-01-16T10:00:00Z" }),
      ];
      const metrics = calculateTaskMetrics(tasks);
      expect(metrics.completionTrend).toEqual([
        { date: "2024-01-15", count: 2 },
        { date: "2024-01-16", count: 1 },
      ]);
    });
  });

  describe("formatDuration", () => {
    it("should format milliseconds", () => {
      expect(formatDuration(500)).toBe("500ms");
    });

    it("should format seconds", () => {
      expect(formatDuration(5000)).toBe("5s");
    });

    it("should format minutes and seconds", () => {
      expect(formatDuration(125000)).toBe("2m 5s");
    });

    it("should format hours and minutes", () => {
      expect(formatDuration(3720000)).toBe("1h 2m");
    });
  });

  describe("compareModels", () => {
    it("should compare two models", () => {
      const tasks = [
        makeTask({ modelId: "gpt-4", status: "COMPLETED" }),
        makeTask({ modelId: "gpt-4", status: "FAILED" }),
        makeTask({ modelId: "claude-3", status: "COMPLETED" }),
      ];
      const result = compareModels(tasks, "gpt-4", "claude-3");
      expect(result.modelA.totalTasks).toBe(2);
      expect(result.modelB.totalTasks).toBe(1);
    });
  });

  // ── Branch coverage: getDurationMs edge cases ───────────────

  describe("branch coverage – getDurationMs", () => {
    it("uses updatedAt for FAILED tasks when completedAt is missing", () => {
      const tasks = [
        makeTask({
          status: "FAILED",
          completedAt: undefined,
          updatedAt: "2024-01-15T10:30:00Z",
          createdAt: "2024-01-15T10:00:00Z",
        }),
      ];
      const metrics = calculateTaskMetrics(tasks);
      expect(metrics.averageDurationMs).toBe(1800000);
    });

    it("uses updatedAt for CANCELLED tasks when completedAt is missing", () => {
      const tasks = [
        makeTask({
          status: "CANCELLED",
          completedAt: undefined,
          updatedAt: "2024-01-15T10:15:00Z",
          createdAt: "2024-01-15T10:00:00Z",
        }),
      ];
      const metrics = calculateTaskMetrics(tasks);
      expect(metrics.averageDurationMs).toBe(900000);
    });

    it("returns null duration for IN_PROGRESS without completedAt or end status", () => {
      const tasks = [
        makeTask({ status: "IN_PROGRESS", completedAt: undefined }),
      ];
      const metrics = calculateTaskMetrics(tasks);
      expect(metrics.averageDurationMs).toBe(0);
      expect(metrics.medianDurationMs).toBe(0);
    });

    it("handles tasks without modelId in tasksByModel", () => {
      const tasks = [
        makeTask({ modelId: undefined }),
      ];
      const metrics = calculateTaskMetrics(tasks);
      expect(Object.keys(metrics.tasksByModel)).toHaveLength(0);
    });

    it("handles completed tasks without completedAt in completionTrend", () => {
      const tasks = [
        makeTask({ status: "COMPLETED", completedAt: undefined }),
      ];
      const metrics = calculateTaskMetrics(tasks);
      expect(metrics.completionTrend).toEqual([]);
    });
  });
});
