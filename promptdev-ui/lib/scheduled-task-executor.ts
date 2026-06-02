/**
 * Scheduled Task Executor
 *
 * Server-side poller that detects QUEUED tasks and triggers
 * execution via the Copilot SDK orchestrator.
 *
 * Uses Drizzle ORM directly for database access.
 */

import { executeTask, isTaskRunning } from "./copilot/orchestrator";
import * as taskService from "./services/task-service";

const POLL_INTERVAL_MS = 15_000;
const INITIAL_DELAY_MS = 10_000;

let pollingTimer: ReturnType<typeof setInterval> | null = null;
let initialTimer: ReturnType<typeof setTimeout> | null = null;
let isPolling = false;

export function startScheduledTaskExecutor(): void {
  if (pollingTimer || initialTimer) return;

  // Wait before first poll to give the DB connection time to initialize
  initialTimer = setTimeout(() => {
    initialTimer = null;
    pollAndExecute();
    pollingTimer = setInterval(pollAndExecute, POLL_INTERVAL_MS);
  }, INITIAL_DELAY_MS);
}

export function stopScheduledTaskExecutor(): void {
  if (initialTimer) {
    clearTimeout(initialTimer);
    initialTimer = null;
  }
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

async function pollAndExecute(): Promise<void> {
  /* v8 ignore start -- guard against concurrent poll invocations */
  if (isPolling) return;
  /* v8 ignore stop */
  isPolling = true;

  try {
    const scheduledTasks = await taskService.getQueuedScheduledTasks();

    const runnableTasks = scheduledTasks.filter(
      (t) => t.scheduledJobId && t.status === "QUEUED" && !isTaskRunning(t.id),
    );

    for (const task of runnableTasks) {
      try {
        await executeTask(task.id);
      } catch {
        // Individual task failures don't stop the loop
      }
    }
  } catch (err) {
    // DB connection not ready — silently retry on next interval
    console.warn("[ScheduledTaskExecutor] Poll error:", err);
  } finally {
    isPolling = false;
  }
}
