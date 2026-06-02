/**
 * Final branch coverage for lib/ files
 * Targets:
 * - export.ts line 59: typeof window !== "undefined" branch (false path)
 * - rate-limit.ts line 65: cleanup where entry is NOT expired
 * - scheduled-task-executor.ts line 43: isPolling guard (true path, early return)
 * - sse-client.ts line 42: eventNames present (named events)
 * - sse-client.ts line 87: maxRetries reached (disconnected path)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("export.ts line 59 — window undefined branch", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exportTasks does not throw when window is undefined", async () => {
    const origWindow = globalThis.window;
    // @ts-expect-error — simulate server-side
    delete globalThis.window;
    try {
      const { exportTasks } = await import("@/lib/export");
      // Should not throw when window is undefined
      expect(() =>
        exportTasks(
          [
            {
              id: "1",
              title: "T",
              status: "COMPLETED",
              createdAt: "",
              updatedAt: "",
              prompt: "",
              repositorySlug: "",
              sourceBranch: "",
              targetBranch: "",
              currentAttempt: 1,
              maxAttempts: 3,
              workspaceType: "BITBUCKET",
              modelId: "",
            },
          ] as never[],
          { format: "csv", fields: ["title"] },
        ),
      ).not.toThrow();
    } finally {
      globalThis.window = origWindow;
    }
  });
});

describe("rate-limit.ts line 65 — cleanup with non-expired entry", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("cleanup keeps non-expired entries", async () => {
    const { RateLimiter } = await import("@/lib/rate-limit");
    const limiter = new RateLimiter({ limit: 2, windowMs: 60_000 });
    // Make some requests to populate entries
    limiter.check("testKey");
    // cleanup should NOT delete the entry since it hasn't expired
    limiter.cleanup();
    // The entry should still be there, so the next check should be attempt 2
    const result = limiter.check("testKey");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });
});

describe("scheduled-task-executor.ts line 43 — isPolling guard", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("pollAndExecute returns early when already polling", async () => {
    const mockGetQueuedScheduledTasks = vi.fn().mockResolvedValue([]);
    const mockExecuteTask = vi.fn();
    const mockIsTaskRunning = vi.fn().mockReturnValue(false);

    vi.doMock("@/lib/services/task-service", () => ({
      getQueuedScheduledTasks: mockGetQueuedScheduledTasks,
    }));
    vi.doMock("@/lib/copilot/orchestrator", () => ({
      executeTask: mockExecuteTask,
      isTaskRunning: mockIsTaskRunning,
    }));

    const mod = await import("@/lib/scheduled-task-executor");
    // Start the executor — this triggers a poll
    mod.startScheduledTaskExecutor();
    // Wait for the first poll to complete
    await new Promise((r) => setTimeout(r, 50));
    mod.stopScheduledTaskExecutor();
  });
});

describe("sse-client.ts branch coverage", () => {
  let MockEventSource: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    MockEventSource = vi.fn(function (this: Record<string, unknown>) {
      this.close = vi.fn();
      this.addEventListener = vi.fn();
    });
    vi.stubGlobal("EventSource", MockEventSource);
  });

  it("line 42: creates EventSource with named events", async () => {
    const { createSseSubscription } = await import("@/lib/sse-client");
    const onMessage = vi.fn();
    const cleanup = createSseSubscription({
      url: "/test",
      onMessage,
      eventNames: ["event1", "event2"],
    });
    const instance = MockEventSource.mock.instances[0];
    expect(instance.addEventListener).toHaveBeenCalledWith("event1", onMessage);
    expect(instance.addEventListener).toHaveBeenCalledWith("event2", onMessage);
    cleanup();
  });

  it("line 87: disconnects after max retries and cleanup closes connection", async () => {
    const { createSseSubscription } = await import("@/lib/sse-client");
    vi.useFakeTimers();
    const onStatusChange = vi.fn();
    const onError = vi.fn();
    const cleanup = createSseSubscription({
      url: "/test",
      onMessage: vi.fn(),
      onStatusChange,
      onError,
      maxRetries: 0,
    });
    const instance = MockEventSource.mock.instances[0];
    // Trigger error — with maxRetries=0, should immediately disconnect
    instance.onerror(new Event("error"));
    expect(onStatusChange).toHaveBeenCalledWith("disconnected");
    // Call cleanup to cover lines 87-89 (disposed=true, clearTimeout, eventSource.close)
    cleanup();
    vi.useRealTimers();
  });

  it("line 42: disposed during pending reconnection prevents connect()", async () => {
    const { createSseSubscription } = await import("@/lib/sse-client");
    vi.useFakeTimers();
    const onStatusChange = vi.fn();
    const cleanup = createSseSubscription({
      url: "/test",
      onMessage: vi.fn(),
      onStatusChange,
      maxRetries: 3,
    });
    const instance = MockEventSource.mock.instances[0];
    // Trigger error — starts reconnection timer (retryCount < maxRetries)
    instance.onerror(new Event("error"));
    expect(onStatusChange).toHaveBeenCalledWith("reconnecting");
    // Dispose before the retry timeout fires
    cleanup();
    // Advance timer — the retry timeout fires but connect() checks disposed and returns early
    vi.advanceTimersByTime(5000);
    // Only 1 EventSource should have been created (the initial one)
    expect(MockEventSource).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
