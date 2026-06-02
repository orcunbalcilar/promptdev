/**
 * Agent performance scoring and model comparison metrics.
 */
import type { Task } from "@/lib/api";

export interface ModelScore {
  modelId: string;
  totalTasks: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDurationMs: number;
  avgIterations: number;
  score: number; // 0-100 composite score
}

function computeDuration(task: Task): number | null {
  const end =
    task.completedAt ??
    (["FAILED", "CANCELLED"].includes(task.status) ? task.updatedAt : null);
  if (!end) return null;
  return new Date(end).getTime() - new Date(task.createdAt).getTime();
}

export function scoreModel(modelId: string, tasks: Task[]): ModelScore {
  const modelTasks = tasks.filter((t) => t.modelId === modelId);
  const completed = modelTasks.filter((t) => t.status === "COMPLETED");
  const failed = modelTasks.filter((t) =>
    ["FAILED", "CANCELLED"].includes(t.status),
  );

  const durations = modelTasks
    .map(computeDuration)
    .filter((d): d is number => d !== null);

  const avgDuration =
    durations.length > 0
      ? durations.reduce((s, d) => s + d, 0) / durations.length
      : 0;

  const iterations = modelTasks
    .filter((t) => t.currentIteration != null)
    .map((t) => t.currentIteration!);

  const avgIterations =
    iterations.length > 0
      ? iterations.reduce((s, i) => s + i, 0) / iterations.length
      : 0;

  const successRate =
    modelTasks.length > 0 ? (completed.length / modelTasks.length) * 100 : 0;

  // Composite score: 60% success rate + 20% speed (inverse) + 20% efficiency (fewer iterations)
  const speedScore =
    avgDuration > 0 ? Math.max(0, 100 - avgDuration / 60000) : 50;
  const efficiencyScore =
    avgIterations > 0 ? Math.max(0, 100 - avgIterations * 10) : 50;
  const score = Math.round(
    successRate * 0.6 + speedScore * 0.2 + efficiencyScore * 0.2,
  );

  return {
    modelId,
    totalTasks: modelTasks.length,
    successCount: completed.length,
    failureCount: failed.length,
    successRate: Math.round(successRate * 10) / 10,
    avgDurationMs: Math.round(avgDuration),
    avgIterations: Math.round(avgIterations * 10) / 10,
    score: Math.min(100, Math.max(0, score)),
  };
}

export function rankModels(tasks: Task[]): ModelScore[] {
  const models = new Set<string>();
  for (const task of tasks) {
    if (task.modelId) models.add(task.modelId);
  }

  return [...models]
    .map((modelId) => scoreModel(modelId, tasks))
    .sort((a, b) => b.score - a.score);
}
