/**
 * Adapts a backend TaskResponse to the frontend Task interface.
 * Centralizes null-to-undefined coercion in one place.
 */
import type { Task } from "@/lib/api";
import type { TaskResponse } from "@/lib/services/task-service";

// Fields that are nullable in TaskResponse but optional (undefined) in Task.
// Keep in sync with the Task interface in @/lib/api.
const NULLABLE_FIELDS = [
  "projectKey",
  "workspacePath",
  "modelId",
  "copilotSessionId",
  "pullRequestId",
  "pullRequestUrl",
  "errorMessage",
  "iterative",
  "maxIterations",
  "currentIteration",
  "currentStepIndex",
  "completionCriteria",
  "steps",
  "scheduledJobId",
  "jiraIssueKey",
  "reviewEnabled",
  "reviewModelId",
  "resumePrompt",
  "resumeCount",
  "commitMessagePattern",
  "bootScript",
  "skills",
  "additionalRepositories",
  "systemPrompt",
  "completedAt",
] as const;

export function adaptTask(t: TaskResponse): Task {
  const result: Record<string, unknown> = {
    ...t,
    prompt: t.prompt ?? "",
    sourceBranch: t.sourceBranch ?? "",
    targetBranch: t.targetBranch ?? "",
    updatedAt: t.updatedAt ?? new Date().toISOString(),
  };

  for (const field of NULLABLE_FIELDS) {
    result[field] = t[field] ?? undefined;
  }

  return result as unknown as Task;
}
