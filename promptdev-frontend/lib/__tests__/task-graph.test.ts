import { buildTaskGraph, getGraphStats } from "@/lib/task-graph";
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
  ...overrides,
});

describe("task-graph", () => {
  describe("buildTaskGraph", () => {
    it("should create nodes for each task", () => {
      const tasks = [
        makeTask({ id: "1" }),
        makeTask({ id: "2" }),
      ];
      const graph = buildTaskGraph(tasks);
      expect(graph.nodes).toHaveLength(2);
    });

    it("should create edges between tasks in same repo", () => {
      const tasks = [
        makeTask({ id: "1", repositorySlug: "repo-a", createdAt: "2024-01-01T00:00:00Z" }),
        makeTask({ id: "2", repositorySlug: "repo-a", createdAt: "2024-01-02T00:00:00Z" }),
      ];
      const graph = buildTaskGraph(tasks);
      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0].source).toBe("1");
      expect(graph.edges[0].target).toBe("2");
    });

    it("should not create edges between tasks in different repos", () => {
      const tasks = [
        makeTask({ id: "1", repositorySlug: "repo-a" }),
        makeTask({ id: "2", repositorySlug: "repo-b" }),
      ];
      const graph = buildTaskGraph(tasks);
      expect(graph.edges).toHaveLength(0);
    });

    it("should sort tasks by creation date within repo", () => {
      const tasks = [
        makeTask({ id: "2", repositorySlug: "repo-a", createdAt: "2024-01-02T00:00:00Z" }),
        makeTask({ id: "1", repositorySlug: "repo-a", createdAt: "2024-01-01T00:00:00Z" }),
      ];
      const graph = buildTaskGraph(tasks);
      expect(graph.edges[0].source).toBe("1");
      expect(graph.edges[0].target).toBe("2");
    });

    it("should handle empty task list", () => {
      const graph = buildTaskGraph([]);
      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);
    });

    it("should assign different levels to different repos", () => {
      const tasks = [
        makeTask({ id: "1", repositorySlug: "repo-a" }),
        makeTask({ id: "2", repositorySlug: "repo-b" }),
      ];
      const graph = buildTaskGraph(tasks);
      const levels = graph.nodes.map((n) => n.level);
      expect(new Set(levels).size).toBe(2);
    });
  });

  describe("getGraphStats", () => {
    it("should calculate correct stats", () => {
      const graph = buildTaskGraph([
        makeTask({ id: "1", repositorySlug: "repo-a", createdAt: "2024-01-01T00:00:00Z" }),
        makeTask({ id: "2", repositorySlug: "repo-a", createdAt: "2024-01-02T00:00:00Z" }),
        makeTask({ id: "3", repositorySlug: "repo-b" }),
      ]);
      const stats = getGraphStats(graph);
      expect(stats.totalNodes).toBe(3);
      expect(stats.totalEdges).toBe(1);
      expect(stats.isolatedNodes).toBe(1);
    });

    it("should return zero stats for empty graph", () => {
      const stats = getGraphStats({ nodes: [], edges: [] });
      expect(stats.totalNodes).toBe(0);
      expect(stats.totalEdges).toBe(0);
      expect(stats.maxDepth).toBe(0);
      expect(stats.isolatedNodes).toBe(0);
    });
  });
});
