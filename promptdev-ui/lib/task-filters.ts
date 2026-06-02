/**
 * Advanced task filtering engine with composable filter predicates.
 */
import type { Task, TaskStatus, WorkspaceType } from "@/lib/api";

export interface TaskFilter {
  search?: string;
  statuses?: TaskStatus[];
  workspaceType?: WorkspaceType;
  modelId?: string;
  dateRange?: { from: Date; to: Date };
  hasError?: boolean;
  isIterative?: boolean;
  hasPullRequest?: boolean;
  repositorySlug?: string;
}

type FilterPredicate = (task: Task) => boolean;

function createSearchPredicate(search: string): FilterPredicate {
  const lower = search.toLowerCase();
  return (task) =>
    task.title.toLowerCase().includes(lower) ||
    task.prompt.toLowerCase().includes(lower) ||
    task.repositorySlug.toLowerCase().includes(lower) ||
    (task.errorMessage?.toLowerCase().includes(lower) ?? false);
}

function createStatusPredicate(statuses: TaskStatus[]): FilterPredicate {
  const statusSet = new Set(statuses);
  return (task) => statusSet.has(task.status);
}

function createDateRangePredicate(range: {
  from: Date;
  to: Date;
}): FilterPredicate {
  return (task) => {
    const created = new Date(task.createdAt);
    return created >= range.from && created <= range.to;
  };
}

export function buildFilterPredicates(filter: TaskFilter): FilterPredicate[] {
  const predicates: FilterPredicate[] = [];

  if (filter.search) predicates.push(createSearchPredicate(filter.search));
  if (filter.statuses?.length)
    predicates.push(createStatusPredicate(filter.statuses));
  if (filter.workspaceType)
    predicates.push((t) => t.workspaceType === filter.workspaceType);
  if (filter.modelId) predicates.push((t) => t.modelId === filter.modelId);
  if (filter.dateRange)
    predicates.push(createDateRangePredicate(filter.dateRange));
  if (filter.hasError !== undefined)
    predicates.push((t) =>
      filter.hasError ? !!t.errorMessage : !t.errorMessage,
    );
  if (filter.isIterative !== undefined)
    predicates.push((t) => t.iterative === filter.isIterative);
  if (filter.hasPullRequest !== undefined)
    predicates.push((t) =>
      filter.hasPullRequest ? !!t.pullRequestUrl : !t.pullRequestUrl,
    );
  if (filter.repositorySlug)
    predicates.push((t) => t.repositorySlug === filter.repositorySlug);

  return predicates;
}

export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  const predicates = buildFilterPredicates(filter);
  if (predicates.length === 0) return tasks;
  return tasks.filter((task) => predicates.every((pred) => pred(task)));
}

export function getActiveFilterCount(filter: TaskFilter): number {
  let count = 0;
  if (filter.search) count++;
  if (filter.statuses?.length) count++;
  if (filter.workspaceType) count++;
  if (filter.modelId) count++;
  if (filter.dateRange) count++;
  if (filter.hasError !== undefined) count++;
  if (filter.isIterative !== undefined) count++;
  if (filter.hasPullRequest !== undefined) count++;
  if (filter.repositorySlug) count++;
  return count;
}
