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

vi.mock("@/lib/services/task-service", () => ({
  processAgentCallback: vi.fn(),
}));

import { requireAuth } from "@/lib/auth-guard";
import * as taskService from "@/lib/services/task-service";

import { GET as tasksStreamGET } from "@/app/api/stream/tasks/route";
import { GET as taskStreamGET } from "@/app/api/stream/tasks/[taskId]/route";
import { POST as callbackPOST } from "@/app/api/stream/callback/route";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

function makeRequest(
  url: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
) {
  return new NextRequest(`http://localhost:3000${url}`, init);
}

function makeParams(taskId: string) {
  return { params: Promise.resolve({ taskId }) };
}

const authError = new Response(JSON.stringify({ error: "Unauthorized" }), {
  status: 401,
  headers: { "content-type": "application/json" },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1" } },
  });
});

/* ────── Callback ────── */

describe("POST /api/stream/callback", () => {
  it("processes agent callback successfully", async () => {
    const task = { id: "task-1", status: "completed" } as unknown as Awaited<
      ReturnType<typeof taskService.processAgentCallback>
    >;
    vi.mocked(taskService.processAgentCallback).mockResolvedValue(task);

    const req = makeRequest("/api/stream/callback", {
      method: "POST",
      body: JSON.stringify({ taskId: "task-1", status: "completed" }),
      headers: { "content-type": "application/json" },
    });
    const res = await callbackPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(task);
  });

  it("returns 400 on callback error", async () => {
    vi.mocked(taskService.processAgentCallback).mockRejectedValue(
      new Error("Invalid callback"),
    );

    const req = makeRequest("/api/stream/callback", {
      method: "POST",
      body: JSON.stringify({ taskId: "task-1" }),
      headers: { "content-type": "application/json" },
    });
    const res = await callbackPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid callback");
  });
});

/* ────── Tasks Stream (global) ────── */

describe("GET /api/stream/tasks", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/stream/tasks");
    const res = await tasksStreamGET(req);

    expect(res.status).toBe(401);
  });

  it("returns SSE stream with correct headers", async () => {
    mockSubscribe.mockReturnValue(() => {});

    const req = makeRequest("/api/stream/tasks");
    const res = await tasksStreamGET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(res.headers.get("cache-control")).toBe("no-cache");
  });

  it("sends initial heartbeat", async () => {
    mockSubscribe.mockReturnValue(() => {});

    const req = makeRequest("/api/stream/tasks");
    const res = await tasksStreamGET(req);

    const reader = res.body!.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain(": heartbeat");
    reader.releaseLock();
  });

  it("subscribes without taskId for global stream", async () => {
    mockSubscribe.mockReturnValue(() => {});

    const req = makeRequest("/api/stream/tasks");
    await tasksStreamGET(req);

    expect(mockSubscribe).toHaveBeenCalledWith(expect.any(Function));
  });
});

/* ────── Task Stream (per-task) ────── */

describe("GET /api/stream/tasks/[taskId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/stream/tasks/task-1");
    const res = await taskStreamGET(req, makeParams("task-1"));

    expect(res.status).toBe(401);
  });

  it("returns SSE stream with correct headers", async () => {
    mockSubscribe.mockReturnValue(() => {});

    const req = makeRequest("/api/stream/tasks/task-1");
    const res = await taskStreamGET(req, makeParams("task-1"));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
  });

  it("subscribes with taskId for per-task stream", async () => {
    mockSubscribe.mockReturnValue(() => {});

    const req = makeRequest("/api/stream/tasks/task-1");
    await taskStreamGET(req, makeParams("task-1"));

    expect(mockSubscribe).toHaveBeenCalledWith(expect.any(Function), "task-1");
  });
});
