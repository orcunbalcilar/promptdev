/**
 * Task analytics and performance metrics calculations.
 */
import type { Task, TaskStatus } from "@/lib/api";

export interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  successRate: number;
  averageDurationMs: number;
  medianDurationMs: number;
  p95DurationMs: number;
  tasksByStatus: Record<string, number>;
  tasksByModel: Record<string, number>;
  tasksByWorkspace: Record<string, number>;
  completionTrend: { date: string; count: number }[];
}

function getDurationMs(task: Task): number | null {
  const end = task.completedAt ?? (["FAILED", "CANCELLED"].includes(task.status) ? task.updatedAt : null);
  if (!end || !task.createdAt) return null;
  return new Date(end).getTime() - new Date(task.createdAt).getTime();
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

export function calculateTaskMetrics(tasks: Task[]): TaskMetrics {
  const completed = tasks.filter((t) => t.status === "COMPLETED");
  const failed = tasks.filter((t) => ["FAILED", "CANCELLED"].includes(t.status));
  
  const durations = tasks
    .map(getDurationMs)
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b);

  const avg = durations.length > 0
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length
    : 0;

  const tasksByStatus: Record<string, number> = {};
  const tasksByModel: Record<string, number> = {};
  const tasksByWorkspace: Record<string, number> = {};

  for (const task of tasks) {
    tasksByStatus[task.status] = (tasksByStatus[task.status] ?? 0) + 1;
    if (task.modelId) {
      tasksByModel[task.modelId] = (tasksByModel[task.modelId] ?? 0) + 1;
    }
    tasksByWorkspace[task.workspaceType] = (tasksByWorkspace[task.workspaceType] ?? 0) + 1;
  }

  // Completion trend (tasks completed per day, last 30 days)
  const trendMap = new Map<string, number>();
  for (const task of completed) {
    if (task.completedAt) {
      const date = task.completedAt.split("T")[0];
      trendMap.set(date, (trendMap.get(date) ?? 0) + 1);
    }
  }
  const completionTrend = Array.from(trendMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalTasks: tasks.length,
    completedTasks: completed.length,
    failedTasks: failed.length,
    successRate: tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0,
    averageDurationMs: Math.round(avg),
    medianDurationMs: Math.round(percentile(durations, 50)),
    p95DurationMs: Math.round(percentile(durations, 95)),
    tasksByStatus,
    tasksByModel,
    tasksByWorkspace,
    completionTrend,
  };
}

/**
 * Format milliseconds into a human-readable duration string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Compare performance metrics between two models.
 */
export function compareModels(
  tasks: Task[],
  modelA: string,
  modelB: string,
): { modelA: TaskMetrics; modelB: TaskMetrics } {
  return {
    modelA: calculateTaskMetrics(tasks.filter((t) => t.modelId === modelA)),
    modelB: calculateTaskMetrics(tasks.filter((t) => t.modelId === modelB)),
  };
}
