import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi
    .fn()
    .mockResolvedValue({ session: { user: { id: "u1" } }, error: null }),
  requireTaskOwnership: vi.fn().mockResolvedValue(null),
}));

const mockExecuteTask = vi.fn();
const mockCancelTaskSession = vi.fn();
const mockIsTaskRunning = vi.fn().mockReturnValue(false);
const mockGetTaskSessionId = vi.fn().mockReturnValue(null);

vi.mock("@/lib/copilot/orchestrator", () => ({
  executeTask: (...args: unknown[]) => mockExecuteTask(...args),
  cancelTaskSession: (...args: unknown[]) => mockCancelTaskSession(...args),
  isTaskRunning: (...args: unknown[]) => mockIsTaskRunning(...args),
  getTaskSessionId: (...args: unknown[]) => mockGetTaskSessionId(...args),
}));

import { POST, DELETE, GET } from "@/app/api/tasks/[taskId]/execute/route";

const routeParams = { params: Promise.resolve({ taskId: "task-1" }) };

describe("execute route – coverage (lines 105-107, 132-134)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsTaskRunning.mockReturnValue(false);
  });

  it("POST returns 409 when task is already running", async () => {
    mockIsTaskRunning.mockReturnValue(true);
    mockGetTaskSessionId.mockReturnValue("sess-1");
    const req = new NextRequest("http://localhost/api/tasks/task-1/execute", {
      method: "POST",
    });
    const res = await POST(req, routeParams);
    expect(res.status).toBe(409);
  });

  it("POST handles executeTask returning failure", async () => {
    mockExecuteTask.mockResolvedValue({ success: false, error: "Failed" });
    const req = new NextRequest("http://localhost/api/tasks/task-1/execute", {
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, routeParams);
    expect(res.status).toBe(500);
  });

  it("POST handles executeTask success with userGithubToken + byokProvider", async () => {
    mockExecuteTask.mockResolvedValue({ success: true, sessionId: "s1" });
    const req = new NextRequest("http://localhost/api/tasks/task-1/execute", {
      method: "POST",
      body: JSON.stringify({ userGithubToken: "tok", provider: { id: "p1" } }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, routeParams);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("POST handles empty body gracefully", async () => {
    mockExecuteTask.mockResolvedValue({ success: true, sessionId: "s1" });
    const req = new NextRequest("http://localhost/api/tasks/task-1/execute", {
      method: "POST",
    });
    const res = await POST(req, routeParams);
    expect(res.status).toBe(200);
  });

  it("POST catches exception (lines 73-76)", async () => {
    mockExecuteTask.mockRejectedValue(new Error("boom"));
    const req = new NextRequest("http://localhost/api/tasks/task-1/execute", {
      method: "POST",
    });
    const res = await POST(req, routeParams);
    expect(res.status).toBe(500);
  });

  it("DELETE cancels running task", async () => {
    mockIsTaskRunning.mockReturnValue(true);
    mockCancelTaskSession.mockResolvedValue(undefined);
    const req = new NextRequest("http://localhost/api/tasks/task-1/execute", {
      method: "DELETE",
    });
    const res = await DELETE(req, routeParams);
    expect(res.status).toBe(200);
  });

  it("DELETE returns 404 when task not running", async () => {
    mockIsTaskRunning.mockReturnValue(false);
    const req = new NextRequest("http://localhost/api/tasks/task-1/execute", {
      method: "DELETE",
    });
    const res = await DELETE(req, routeParams);
    expect(res.status).toBe(404);
  });

  it("DELETE catches exception (lines 105-107)", async () => {
    mockIsTaskRunning.mockReturnValue(true);
    mockCancelTaskSession.mockRejectedValue(new Error("cancel failed"));
    const req = new NextRequest("http://localhost/api/tasks/task-1/execute", {
      method: "DELETE",
    });
    const res = await DELETE(req, routeParams);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("cancel failed");
  });

  it("GET returns running status", async () => {
    mockIsTaskRunning.mockReturnValue(true);
    mockGetTaskSessionId.mockReturnValue("sess-1");
    const req = new NextRequest("http://localhost/api/tasks/task-1/execute");
    const res = await GET(req, routeParams);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.running).toBe(true);
    expect(data.sessionId).toBe("sess-1");
  });

  it("GET catches exception (lines 132-134)", async () => {
    mockIsTaskRunning.mockImplementation(() => {
      throw new Error("check failed");
    });
    const req = new NextRequest("http://localhost/api/tasks/task-1/execute");
    const res = await GET(req, routeParams);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("check failed");
  });
});
