import {
  filterTasks,
  buildFilterPredicates,
  getActiveFilterCount,
} from "@/lib/task-filters";
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

describe("task-filters", () => {
  const tasks = [
    makeTask({
      id: "1",
      title: "Fix login bug",
      status: "COMPLETED",
      modelId: "gpt-4",
      repositorySlug: "auth-repo",
    }),
    makeTask({
      id: "2",
      title: "Add search feature",
      status: "IN_PROGRESS",
      modelId: "claude-3",
      repositorySlug: "search-repo",
      errorMessage: "timeout",
    }),
    makeTask({
      id: "3",
      title: "Refactor DB layer",
      status: "FAILED",
      modelId: "gpt-4",
      repositorySlug: "db-repo",
      iterative: true,
    }),
    makeTask({
      id: "4",
      title: "Update docs",
      status: "PENDING",
      workspaceType: "BITBUCKET",
      pullRequestUrl: "https://pr.example.com/1",
    }),
    makeTask({
      id: "5",
      title: "Security audit",
      status: "CANCELLED",
      repositorySlug: "auth-repo",
      createdAt: "2024-02-01T10:00:00Z",
    }),
  ];

  describe("filterTasks", () => {
    it("should return all tasks when filter is empty", () => {
      const result = filterTasks(tasks, {});
      expect(result).toHaveLength(5);
    });

    it("should filter by search text in title", () => {
      const result = filterTasks(tasks, { search: "login" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("should filter by status", () => {
      const result = filterTasks(tasks, { statuses: ["COMPLETED", "FAILED"] });
      expect(result).toHaveLength(2);
    });

    it("should filter by workspace type", () => {
      const result = filterTasks(tasks, { workspaceType: "BITBUCKET" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("4");
    });

    it("should filter by model", () => {
      const result = filterTasks(tasks, { modelId: "gpt-4" });
      expect(result).toHaveLength(2);
    });

    it("should filter by date range", () => {
      const result = filterTasks(tasks, {
        dateRange: {
          from: new Date("2024-01-20T00:00:00Z"),
          to: new Date("2024-02-28T00:00:00Z"),
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("5");
    });

    it("should filter by hasError", () => {
      const result = filterTasks(tasks, { hasError: true });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("should filter by isIterative", () => {
      const result = filterTasks(tasks, { isIterative: true });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("3");
    });

    it("should filter by hasPullRequest", () => {
      const result = filterTasks(tasks, { hasPullRequest: true });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("4");
    });

    it("should filter by repositorySlug", () => {
      const result = filterTasks(tasks, { repositorySlug: "auth-repo" });
      expect(result).toHaveLength(2);
    });

    it("should combine multiple filters with AND logic", () => {
      const result = filterTasks(tasks, {
        modelId: "gpt-4",
        statuses: ["COMPLETED"],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });
  });

  describe("buildFilterPredicates", () => {
    it("should return empty array for empty filter", () => {
      expect(buildFilterPredicates({})).toHaveLength(0);
    });

    it("should create predicates for each active filter", () => {
      const predicates = buildFilterPredicates({
        search: "test",
        modelId: "gpt-4",
      });
      expect(predicates).toHaveLength(2);
    });
  });

  describe("getActiveFilterCount", () => {
    it("should return 0 for empty filter", () => {
      expect(getActiveFilterCount({})).toBe(0);
    });

    it("should count active filters", () => {
      expect(
        getActiveFilterCount({
          search: "test",
          modelId: "gpt-4",
          hasError: true,
        }),
      ).toBe(3);
    });
  });
});
