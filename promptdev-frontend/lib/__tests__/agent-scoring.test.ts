import { scoreModel, rankModels } from "@/lib/agent-scoring";
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

describe("agent-scoring", () => {
  describe("scoreModel", () => {
    it("should score a model with completed tasks", () => {
      const tasks = [
        makeTask({ modelId: "gpt-4", status: "COMPLETED" }),
        makeTask({ modelId: "gpt-4", status: "COMPLETED" }),
      ];
      const score = scoreModel("gpt-4", tasks);
      expect(score.totalTasks).toBe(2);
      expect(score.successCount).toBe(2);
      expect(score.successRate).toBe(100);
      expect(score.score).toBeGreaterThan(0);
      expect(score.score).toBeLessThanOrEqual(100);
    });

    it("should calculate failure count", () => {
      const tasks = [
        makeTask({ modelId: "gpt-4", status: "COMPLETED" }),
        makeTask({ modelId: "gpt-4", status: "FAILED" }),
        makeTask({ modelId: "gpt-4", status: "CANCELLED" }),
      ];
      const score = scoreModel("gpt-4", tasks);
      expect(score.failureCount).toBe(2);
      expect(score.successRate).toBeCloseTo(33.3, 0);
    });

    it("should calculate average duration", () => {
      const tasks = [
        makeTask({
          modelId: "gpt-4",
          createdAt: "2024-01-15T10:00:00Z",
          completedAt: "2024-01-15T11:00:00Z",
        }),
      ];
      const score = scoreModel("gpt-4", tasks);
      expect(score.avgDurationMs).toBe(3600000); // 1 hour
    });

    it("should calculate average iterations", () => {
      const tasks = [
        makeTask({ modelId: "gpt-4", currentIteration: 3 }),
        makeTask({ modelId: "gpt-4", currentIteration: 5 }),
      ];
      const score = scoreModel("gpt-4", tasks);
      expect(score.avgIterations).toBe(4);
    });

    it("should return zero score for model with no tasks", () => {
      const score = scoreModel("nonexistent", []);
      expect(score.totalTasks).toBe(0);
      // speedScore=50, efficiencyScore=50 defaults => 0*0.6 + 50*0.2 + 50*0.2 = 20
      expect(score.score).toBe(20);
    });

    it("should filter tasks to only the specified model", () => {
      const tasks = [
        makeTask({ modelId: "gpt-4", status: "COMPLETED" }),
        makeTask({ modelId: "claude-3", status: "FAILED" }),
      ];
      const score = scoreModel("gpt-4", tasks);
      expect(score.totalTasks).toBe(1);
      expect(score.successCount).toBe(1);
    });
  });

  describe("rankModels", () => {
    it("should rank models by score descending", () => {
      const tasks = [
        makeTask({ modelId: "gpt-4", status: "COMPLETED" }),
        makeTask({ modelId: "gpt-4", status: "COMPLETED" }),
        makeTask({ modelId: "claude-3", status: "COMPLETED" }),
        makeTask({ modelId: "claude-3", status: "FAILED" }),
      ];
      const ranked = rankModels(tasks);
      expect(ranked).toHaveLength(2);
      expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
    });

    it("should handle empty tasks", () => {
      const ranked = rankModels([]);
      expect(ranked).toHaveLength(0);
    });

    it("should skip tasks without modelId", () => {
      const tasks = [
        makeTask({ modelId: undefined }),
        makeTask({ modelId: "gpt-4" }),
      ];
      const ranked = rankModels(tasks);
      expect(ranked).toHaveLength(1);
      expect(ranked[0].modelId).toBe("gpt-4");
    });
  });
});
