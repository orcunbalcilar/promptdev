import { describe, it, expect } from "vitest";
import {
  buildFilterPredicates,
  filterTasks,
  getActiveFilterCount,
} from "../task-filters";
import type { Task } from "@/lib/api";

const makeTask = (overrides: Partial<Task> = {}): Task =>
  ({
    id: "t1",
    title: "Test Task",
    prompt: "test prompt",
    repositorySlug: "my-repo",
    status: "COMPLETED" as Task["status"],
    workspaceType: "PERSISTENT" as Task["workspaceType"],
    modelId: "gpt-4",
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
    errorMessage: undefined,
    iterative: false,
    pullRequestUrl: undefined,
    ...overrides,
  }) as Task;

describe("task-filters – branch coverage", () => {
  it("workspaceType filter (line 66)", () => {
    const preds = buildFilterPredicates({
      workspaceType: "PERSISTENT" as Task["workspaceType"],
    });
    expect(preds).toHaveLength(1);
    expect(
      preds[0](
        makeTask({ workspaceType: "PERSISTENT" as Task["workspaceType"] }),
      ),
    ).toBe(true);
    expect(
      preds[0](
        makeTask({ workspaceType: "TEMPORARY" as Task["workspaceType"] }),
      ),
    ).toBe(false);
  });

  it("modelId filter (line 67)", () => {
    const preds = buildFilterPredicates({ modelId: "gpt-4" });
    expect(preds).toHaveLength(1);
    expect(preds[0](makeTask({ modelId: "gpt-4" }))).toBe(true);
    expect(preds[0](makeTask({ modelId: "claude-3" }))).toBe(false);
  });

  it("hasError=true filter (line 69)", () => {
    const preds = buildFilterPredicates({ hasError: true });
    expect(preds[0](makeTask({ errorMessage: "some error" }))).toBe(true);
    expect(preds[0](makeTask({ errorMessage: undefined }))).toBe(false);
  });

  it("hasError=false filter (line 69)", () => {
    const preds = buildFilterPredicates({ hasError: false });
    expect(preds[0](makeTask({ errorMessage: undefined }))).toBe(true);
    expect(preds[0](makeTask({ errorMessage: "err" }))).toBe(false);
  });

  it("isIterative filter (line 71)", () => {
    const preds = buildFilterPredicates({ isIterative: true });
    expect(preds[0](makeTask({ iterative: true }))).toBe(true);
    expect(preds[0](makeTask({ iterative: false }))).toBe(false);
  });

  it("hasPullRequest=true filter (line 72)", () => {
    const preds = buildFilterPredicates({ hasPullRequest: true });
    expect(
      preds[0](makeTask({ pullRequestUrl: "https://github.com/pr/1" })),
    ).toBe(true);
    expect(preds[0](makeTask({ pullRequestUrl: undefined }))).toBe(false);
  });

  it("hasPullRequest=false filter (line 72)", () => {
    const preds = buildFilterPredicates({ hasPullRequest: false });
    expect(preds[0](makeTask({ pullRequestUrl: undefined }))).toBe(true);
    expect(preds[0](makeTask({ pullRequestUrl: "https://x" }))).toBe(false);
  });

  it("repositorySlug filter (line 73)", () => {
    const preds = buildFilterPredicates({ repositorySlug: "my-repo" });
    expect(preds[0](makeTask({ repositorySlug: "my-repo" }))).toBe(true);
    expect(preds[0](makeTask({ repositorySlug: "other" }))).toBe(false);
  });

  it("filterTasks with empty predicates returns all tasks", () => {
    const tasks = [makeTask(), makeTask({ id: "t2" })];
    expect(filterTasks(tasks, {})).toHaveLength(2);
  });

  it("filterTasks with combined filters", () => {
    const tasks = [
      makeTask({
        id: "t1",
        status: "COMPLETED" as Task["status"],
        iterative: true,
      }),
      makeTask({
        id: "t2",
        status: "FAILED" as Task["status"],
        iterative: false,
      }),
    ];
    const result = filterTasks(tasks, {
      statuses: ["COMPLETED" as Task["status"]],
      isIterative: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t1");
  });

  it("getActiveFilterCount counts all active filters", () => {
    expect(
      getActiveFilterCount({
        search: "test",
        statuses: ["COMPLETED" as Task["status"]],
        workspaceType: "PERSISTENT" as Task["workspaceType"],
        modelId: "gpt-4",
        dateRange: { from: new Date(), to: new Date() },
        hasError: false,
        isIterative: true,
        hasPullRequest: true,
        repositorySlug: "repo",
      }),
    ).toBe(9);
  });

  it("dateRange filter", () => {
    const from = new Date("2024-01-01");
    const to = new Date("2024-01-31");
    const preds = buildFilterPredicates({ dateRange: { from, to } });
    expect(preds[0](makeTask({ createdAt: "2024-01-15T00:00:00Z" }))).toBe(
      true,
    );
    expect(preds[0](makeTask({ createdAt: "2024-02-15T00:00:00Z" }))).toBe(
      false,
    );
  });

  it("search filter matches across multiple fields", () => {
    const preds = buildFilterPredicates({ search: "error" });
    expect(preds[0](makeTask({ errorMessage: "some error occurred" }))).toBe(
      true,
    );
    expect(preds[0](makeTask({ title: "Task with error" }))).toBe(true);
    expect(preds[0](makeTask({ prompt: "fix error" }))).toBe(true);
    expect(preds[0](makeTask())).toBe(false);
  });
});
