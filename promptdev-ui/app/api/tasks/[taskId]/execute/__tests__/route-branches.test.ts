/**
 * Branch-coverage completion tests for execute route.
 * Targets: auth errors, ownership errors, non-Error throws, sessionId ?? null
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAuth = vi.fn();
const mockRequireTaskOwnership = vi.fn();
vi.mock("@/lib/auth-guard", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  requireTaskOwnership: (...args: unknown[]) => mockRequireTaskOwnership(...args),
}));

const mockExecuteTask = vi.fn();
const mockCancelTaskSession = vi.fn();
const mockIsTaskRunning = vi.fn();
const mockGetTaskSessionId = vi.fn();

vi.mock("@/lib/copilot/orchestrator", () => ({
  executeTask: (...args: unknown[]) => mockExecuteTask(...args),
  cancelTaskSession: (...args: unknown[]) => mockCancelTaskSession(...args),
  isTaskRunning: (...args: unknown[]) => mockIsTaskRunning(...args),
  getTaskSessionId: (...args: unknown[]) => mockGetTaskSessionId(...args),
}));

import { POST, DELETE, GET } from "@/app/api/tasks/[taskId]/execute/route";

const routeParams = { params: Promise.resolve({ taskId: "task-1" }) };

function makeReq(method = "GET") {
  return new NextRequest("http://localhost/api/tasks/task-1/execute", {
    method,
    ...(method === "POST"
      ? { body: JSON.stringify({}), headers: { "content-type": "application/json" } }
      : {}),
  });
}

const authErr = new Response(JSON.stringify({ error: "Unauthorized" }), {
  status: 401,
  headers: { "content-type": "application/json" },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ session: { user: { id: "u1" } }, error: null });
  mockRequireTaskOwnership.mockResolvedValue(null);
  mockIsTaskRunning.mockReturnValue(false);
  mockGetTaskSessionId.mockReturnValue(null);
});

describe("execute route – branch coverage", () => {
  // Auth error branches for all methods
  it("POST returns auth error when requireAuth fails", async () => {
    mockRequireAuth.mockResolvedValue({ session: null, error: authErr });
    const res = await POST(makeReq("POST"), routeParams);
    expect(res.status).toBe(401);
  });

  it("DELETE returns auth error when requireAuth fails", async () => {
    mockRequireAuth.mockResolvedValue({ session: null, error: authErr });
    const res = await DELETE(makeReq("DELETE"), routeParams);
    expect(res.status).toBe(401);
  });

  it("GET returns auth error when requireAuth fails", async () => {
    mockRequireAuth.mockResolvedValue({ session: null, error: authErr });
    const res = await GET(makeReq(), routeParams);
    expect(res.status).toBe(401);
  });

  // Ownership error branches
  it("POST returns ownership error", async () => {
    const ownershipErr = new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
    mockRequireTaskOwnership.mockResolvedValue(ownershipErr);
    const res = await POST(makeReq("POST"), routeParams);
    expect(res.status).toBe(403);
  });

  it("DELETE returns ownership error", async () => {
    const ownershipErr = new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
    mockRequireTaskOwnership.mockResolvedValue(ownershipErr);
    const res = await DELETE(makeReq("DELETE"), routeParams);
    expect(res.status).toBe(403);
  });

  // Non-Error throws (error instanceof Error === false)
  it("POST catch with non-Error object uses default message", async () => {
    mockExecuteTask.mockRejectedValue("string error");
    const res = await POST(makeReq("POST"), routeParams);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to execute task");
  });

  it("DELETE catch with non-Error object uses default message", async () => {
    mockIsTaskRunning.mockReturnValue(true);
    mockCancelTaskSession.mockRejectedValue({ code: 123 });
    const res = await DELETE(makeReq("DELETE"), routeParams);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to cancel execution");
  });

  it("GET catch with non-Error object uses default message", async () => {
    const nonError = { code: 999 };
    mockIsTaskRunning.mockImplementation(() => {
      throw nonError;
    });
    const res = await GET(makeReq(), routeParams);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to check execution");
  });

  // GET with not-running task (sessionId null → null in response)
  it("GET returns not-running status with null sessionId", async () => {
    mockIsTaskRunning.mockReturnValue(false);
    mockGetTaskSessionId.mockReturnValue(undefined);
    const res = await GET(makeReq(), routeParams);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.running).toBe(false);
    expect(data.sessionId).toBeNull();
  });

  // GET with running task and real sessionId
  it("GET returns running with sessionId", async () => {
    mockIsTaskRunning.mockReturnValue(true);
    mockGetTaskSessionId.mockReturnValue("sess-99");
    const res = await GET(makeReq(), routeParams);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.running).toBe(true);
    expect(data.sessionId).toBe("sess-99");
  });
});
