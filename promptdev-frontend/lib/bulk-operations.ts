/**
 * Bulk task operations for batch processing multiple tasks.
 */
import type { Task } from "@/lib/api";
import * as api from "@/lib/api";

export type BulkOperation = "start" | "cancel" | "retry" | "delete";

export interface BulkResult {
  operation: BulkOperation;
  total: number;
  succeeded: number;
  failed: number;
  errors: { taskId: string; error: string }[];
}

const OPERATION_VALIDATORS: Record<BulkOperation, (task: Task) => boolean> = {
  start: (task) => task.status === "PENDING",
  cancel: (task) => ["IN_PROGRESS", "QUEUED", "TRIAGING", "REVIEWING", "VALIDATING"].includes(task.status),
  retry: (task) => ["FAILED", "CANCELLED"].includes(task.status),
  delete: () => true,
};

export function getEligibleTasks(tasks: Task[], operation: BulkOperation): Task[] {
  return tasks.filter(OPERATION_VALIDATORS[operation]);
}

export async function executeBulkOperation(
  taskIds: string[],
  operation: BulkOperation,
): Promise<BulkResult> {
  const result: BulkResult = {
    operation,
    total: taskIds.length,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  const operations: Record<BulkOperation, (id: string) => Promise<unknown>> = {
    start: api.startTask,
    cancel: api.cancelTask,
    retry: api.retryTask,
    delete: (id) => api.cancelTask(id), // Use cancel as delete proxy
  };

  const handler = operations[operation];

  // Execute in parallel with concurrency limit
  const CONCURRENCY = 5;
  for (let i = 0; i < taskIds.length; i += CONCURRENCY) {
    const batch = taskIds.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((id) => handler(id)));
    
    for (let j = 0; j < results.length; j++) {
      if (results[j].status === "fulfilled") {
        result.succeeded++;
      } else {
        result.failed++;
        result.errors.push({
          taskId: batch[j],
          error: (results[j] as PromiseRejectedResult).reason?.message ?? "Unknown error",
        });
      }
    }
  }

  return result;
}
