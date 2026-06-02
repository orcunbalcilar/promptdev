/**
 * Extended tests for stream routes covering uncovered lines.
 * Tests subscribe callback forwarding, heartbeat mechanism, and abort cleanup.
 *
 * - GET /api/stream/tasks (global stream) — subscribe callback, heartbeat, abort
 * - GET /api/stream/tasks/[taskId] (per-task stream) — subscribe callback, heartbeat, abort
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1" } },
  }),
}));

const mockSubscribe = vi.fn();

vi.mock("@/lib/services/sse-service", () => ({
  subscribe: (...args: unknown[]) => mockSubscribe(...args),
}));

import { GET as tasksStreamGET } from "@/app/api/stream/tasks/route";
import { GET as taskStreamGET } from "@/app/api/stream/tasks/[taskId]/route";

function makeRequest(url: string) {
  return new NextRequest(`http://localhost:3000${url}`);
}

function makeAbortableRequest(url: string) {
  const abortController = new AbortController();
  const req = new NextRequest(`http://localhost:3000${url}`, {
    signal: abortController.signal,
  });
  return { req, abortController };
}

function makeParams(taskId: string) {
  return { params: Promise.resolve({ taskId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

/* ────── Global tasks stream extended ────── */

describe("GET /api/stream/tasks - extended", () => {
  it("forwards events from subscribe callback to the SSE stream", async () => {
    let subscribeCb: ((type: string, data: unknown) => void) | undefined;
    mockSubscribe.mockImplementation(
      (cb: (type: string, data: unknown) => void) => {
        subscribeCb = cb;
        return () => {};
      },
    );

    const req = makeRequest("/api/stream/tasks");
    const res = await tasksStreamGET(req);
    const reader = res.body!.getReader();

    // Read initial heartbeat
    await reader.read();

    // Fire an event through the subscribe callback
    subscribeCb!("task_updated", { id: "task-1", status: "COMPLETED" });

    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain("event: task_updated");
    expect(text).toContain('"id":"task-1"');
    expect(text).toContain('"status":"COMPLETED"');
    reader.releaseLock();
  });

  it("handles enqueue error silently in subscribe callback", async () => {
    let subscribeCb: ((type: string, data: unknown) => void) | undefined;
    mockSubscribe.mockImplementation(
      (cb: (type: string, data: unknown) => void) => {
        subscribeCb = cb;
        return () => {};
      },
    );

    const req = makeRequest("/api/stream/tasks");
    const res = await tasksStreamGET(req);
    const reader = res.body!.getReader();

    // Read initial heartbeat
    await reader.read();

    // Cancel reader to close the stream
    await reader.cancel();

    // Should not throw even though stream is closed
    expect(() => {
      subscribeCb!("task_updated", { id: "task-1" });
    }).not.toThrow();
  });

  it("sends periodic heartbeat", async () => {
    vi.useFakeTimers();
    mockSubscribe.mockReturnValue(() => {});

    const req = makeRequest("/api/stream/tasks");
    const res = await tasksStreamGET(req);
    const reader = res.body!.getReader();

    // Read initial heartbeat
    await reader.read();

    // Advance past heartbeat interval (30s)
    vi.advanceTimersByTime(30_000);

    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    expect(text).toContain(": heartbeat");

    reader.releaseLock();
    vi.useRealTimers();
  });

  it("cleans up on abort: unsubscribes, clears heartbeat, closes stream", async () => {
    const mockUnsubscribe = vi.fn();
    mockSubscribe.mockReturnValue(mockUnsubscribe);

    const { req, abortController } = makeAbortableRequest("/api/stream/tasks");
    const res = await tasksStreamGET(req);
    const reader = res.body!.getReader();

    // Read initial heartbeat
    await reader.read();

    // Trigger abort
    abortController.abort();

    // Stream should end
    const { done } = await reader.read();
    expect(done).toBe(true);
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

/* ────── Per-task stream extended ────── */

describe("GET /api/stream/tasks/[taskId] - extended", () => {
  it("forwards events from subscribe callback to the SSE stream", async () => {
    let subscribeCb: ((_type: string, data: unknown) => void) | undefined;
    mockSubscribe.mockImplementation(
      (cb: (_type: string, data: unknown) => void) => {
        subscribeCb = cb;
        return () => {};
      },
    );

    const req = makeRequest("/api/stream/tasks/task-1");
    const res = await taskStreamGET(req, makeParams("task-1"));
    const reader = res.body!.getReader();

    // Read initial heartbeat
    await reader.read();

    // Fire an event
    subscribeCb!("task_updated", { id: "task-1", status: "IN_PROGRESS" });

    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain('"id":"task-1"');
    expect(text).toContain('"status":"IN_PROGRESS"');
    reader.releaseLock();
  });

  it("handles enqueue error silently in subscribe callback", async () => {
    let subscribeCb: ((_type: string, data: unknown) => void) | undefined;
    mockSubscribe.mockImplementation(
      (cb: (_type: string, data: unknown) => void) => {
        subscribeCb = cb;
        return () => {};
      },
    );

    const req = makeRequest("/api/stream/tasks/task-1");
    const res = await taskStreamGET(req, makeParams("task-1"));
    const reader = res.body!.getReader();

    // Read initial heartbeat
    await reader.read();

    // Cancel reader to close stream
    await reader.cancel();

    // Should not throw
    expect(() => {
      subscribeCb!("task_updated", { id: "task-1" });
    }).not.toThrow();
  });

  it("sends periodic heartbeat", async () => {
    vi.useFakeTimers();
    mockSubscribe.mockReturnValue(() => {});

    const req = makeRequest("/api/stream/tasks/task-1");
    const res = await taskStreamGET(req, makeParams("task-1"));
    const reader = res.body!.getReader();

    // Read initial heartbeat
    await reader.read();

    // Advance past heartbeat interval (30s)
    vi.advanceTimersByTime(30_000);

    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    expect(text).toContain(": heartbeat");

    reader.releaseLock();
    vi.useRealTimers();
  });

  it("cleans up on abort: unsubscribes, clears heartbeat, closes stream", async () => {
    const mockUnsubscribe = vi.fn();
    mockSubscribe.mockReturnValue(mockUnsubscribe);

    const { req, abortController } = makeAbortableRequest(
      "/api/stream/tasks/task-1",
    );
    const res = await taskStreamGET(req, makeParams("task-1"));
    const reader = res.body!.getReader();

    // Read initial heartbeat
    await reader.read();

    // Trigger abort
    abortController.abort();

    // Stream should end
    const { done } = await reader.read();
    expect(done).toBe(true);
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("per-task stream only sends data (no event field) unlike global stream", async () => {
    let subscribeCb: ((_type: string, data: unknown) => void) | undefined;
    mockSubscribe.mockImplementation(
      (cb: (_type: string, data: unknown) => void) => {
        subscribeCb = cb;
        return () => {};
      },
    );

    const req = makeRequest("/api/stream/tasks/task-1");
    const res = await taskStreamGET(req, makeParams("task-1"));
    const reader = res.body!.getReader();

    // Read initial heartbeat
    await reader.read();

    subscribeCb!("task_updated", { id: "task-1" });

    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    // Per-task stream uses `data:` only (no `event:` field)
    expect(text).toContain("data:");
    expect(text).not.toContain("event:");
    reader.releaseLock();
  });
});
