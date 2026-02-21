import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/copilot/orchestrator", () => ({
  executeTask: vi.fn(),
  isTaskRunning: vi.fn(),
}));

vi.mock("@/lib/services/task-service", () => ({
  getQueuedScheduledTasks: vi.fn(),
}));

import {
  startScheduledTaskExecutor,
  stopScheduledTaskExecutor,
} from "@/lib/scheduled-task-executor";
import { executeTask, isTaskRunning } from "@/lib/copilot/orchestrator";
import { getQueuedScheduledTasks } from "@/lib/services/task-service";

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  stopScheduledTaskExecutor();
});

afterEach(() => {
  stopScheduledTaskExecutor();
  vi.useRealTimers();
});

describe("Scheduled Task Executor", () => {
  it("should wait before first poll (initial delay)", async () => {
    vi.mocked(getQueuedScheduledTasks).mockResolvedValue([]);

    startScheduledTaskExecutor();

    // Before initial delay: no call
    await vi.advanceTimersByTimeAsync(5_000);
    expect(getQueuedScheduledTasks).not.toHaveBeenCalled();

    // After initial delay: call happens
    await vi.advanceTimersByTimeAsync(6_000);
    expect(getQueuedScheduledTasks).toHaveBeenCalled();
  });

  it("should execute QUEUED tasks with scheduledJobId", async () => {
    const tasks = [
      { id: "task-1", status: "QUEUED", scheduledJobId: "job-1" },
      { id: "task-2", status: "QUEUED", scheduledJobId: null },
      { id: "task-3", status: "QUEUED", scheduledJobId: "job-2" },
    ];

    vi.mocked(getQueuedScheduledTasks).mockResolvedValue(tasks as never);
    vi.mocked(isTaskRunning).mockReturnValue(false);
    vi.mocked(executeTask).mockResolvedValue({
      success: true,
      sessionId: "s-1",
    });

    startScheduledTaskExecutor();
    await vi.advanceTimersByTimeAsync(11_000);

    expect(executeTask).toHaveBeenCalledTimes(2);
    expect(executeTask).toHaveBeenCalledWith("task-1");
    expect(executeTask).toHaveBeenCalledWith("task-3");
  });

  it("should skip tasks that are already running", async () => {
    const tasks = [
      { id: "task-1", status: "QUEUED", scheduledJobId: "job-1" },
    ];

    vi.mocked(getQueuedScheduledTasks).mockResolvedValue(tasks as never);
    vi.mocked(isTaskRunning).mockReturnValue(true);

    startScheduledTaskExecutor();
    await vi.advanceTimersByTimeAsync(11_000);

    expect(executeTask).not.toHaveBeenCalled();
  });

  it("should handle query errors silently", async () => {
    vi.mocked(getQueuedScheduledTasks).mockRejectedValue(new Error("ECONNREFUSED"));

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    startScheduledTaskExecutor();
    await vi.advanceTimersByTimeAsync(11_000);

    expect(executeTask).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("should handle individual execution errors without stopping", async () => {
    const tasks = [
      { id: "task-1", status: "QUEUED", scheduledJobId: "job-1" },
      { id: "task-2", status: "QUEUED", scheduledJobId: "job-2" },
    ];

    vi.mocked(getQueuedScheduledTasks).mockResolvedValue(tasks as never);
    vi.mocked(isTaskRunning).mockReturnValue(false);
    vi.mocked(executeTask)
      .mockRejectedValueOnce(new Error("Failed"))
      .mockResolvedValueOnce({ success: true, sessionId: "s-2" });

    startScheduledTaskExecutor();
    await vi.advanceTimersByTimeAsync(11_000);

    // Both tasks should be attempted despite the first one failing
    expect(executeTask).toHaveBeenCalledTimes(2);
  });

  it("should not start multiple executors", async () => {
    vi.mocked(getQueuedScheduledTasks).mockResolvedValue([]);

    startScheduledTaskExecutor();
    startScheduledTaskExecutor(); // no-op

    await vi.advanceTimersByTimeAsync(11_000);

    // Only one initial query
    expect(getQueuedScheduledTasks).toHaveBeenCalledTimes(1);
  });

  it("should stop polling on stopScheduledTaskExecutor", async () => {
    vi.mocked(getQueuedScheduledTasks).mockResolvedValue([]);

    startScheduledTaskExecutor();
    await vi.advanceTimersByTimeAsync(11_000);

    const callCount = vi.mocked(getQueuedScheduledTasks).mock.calls.length;
    stopScheduledTaskExecutor();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(vi.mocked(getQueuedScheduledTasks).mock.calls.length).toBe(callCount);
  });
});
