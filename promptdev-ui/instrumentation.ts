/**
 * Next.js Instrumentation
 *
 * Runs once when the Next.js server starts.
 * Starts the scheduled task executor to pick up QUEUED tasks
 * created by the scheduled job service.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduledTaskExecutor } =
      await import("./lib/scheduled-task-executor");
    startScheduledTaskExecutor();
  }
}
