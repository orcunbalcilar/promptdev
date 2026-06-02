import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1", email: "test@example.com" } },
  }),
  requireTaskOwnership: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/services/task-service", () => ({
  startTask: vi.fn(),
  cancelTask: vi.fn(),
  retryTask: vi.fn(),
  cloneTask: vi.fn(),
  resumeTask: vi.fn(),
}));

import { POST as startPOST } from "@/app/api/tasks/[taskId]/start/route";
import { POST as cancelPOST } from "@/app/api/tasks/[taskId]/cancel/route";
import { POST as retryPOST } from "@/app/api/tasks/[taskId]/retry/route";
import { POST as clonePOST } from "@/app/api/tasks/[taskId]/clone/route";
import { POST as resumePOST } from "@/app/api/tasks/[taskId]/resume/route";
import { requireAuth, requireTaskOwnership } from "@/lib/auth-guard";
import {
  startTask,
  cancelTask,
  retryTask,
  cloneTask,
  resumeTask,
} from "@/lib/services/task-service";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireTaskOwnership = requireTaskOwnership as ReturnType<typeof vi.fn>;
const mockStartTask = startTask as ReturnType<typeof vi.fn>;
const mockCancelTask = cancelTask as ReturnType<typeof vi.fn>;
const mockRetryTask = retryTask as ReturnType<typeof vi.fn>;
const mockCloneTask = cloneTask as ReturnType<typeof vi.fn>;
const mockResumeTask = resumeTask as ReturnType<typeof vi.fn>;

function makeRouteParams(taskId: string) {
  return { params: Promise.resolve({ taskId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1", email: "test@example.com" } },
  });
  mockRequireTaskOwnership.mockResolvedValue(null);
});

describe("Task Action Routes", () => {
  // ─── START ────────────────────────────────────────────────────
  describe("POST /api/tasks/[taskId]/start", () => {
    it("returns 401 when auth fails", async () => {
      const authError = Response.json({ error: "Unauthorized" }, { status: 401 });
      mockRequireAuth.mockResolvedValue({ session: null, error: authError });

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/start", { method: "POST" });
      const response = await startPOST(req, makeRouteParams("task-1"));

      expect(response.status).toBe(401);
    });

    it("returns ownership error", async () => {
      const ownershipError = Response.json({ error: "Forbidden" }, { status: 403 });
      mockRequireTaskOwnership.mockResolvedValue(ownershipError);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/start", { method: "POST" });
      const response = await startPOST(req, makeRouteParams("task-1"));

      expect(response.status).toBe(403);
    });

    it("starts the task successfully", async () => {
      const mockTask = { id: "task-1", status: "IN_PROGRESS" };
      mockStartTask.mockResolvedValue(mockTask);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/start", { method: "POST" });
      const response = await startPOST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockTask);
      expect(mockStartTask).toHaveBeenCalledWith("task-1");
    });

    it("returns 400 when start fails with Error", async () => {
      mockStartTask.mockRejectedValue(new Error("Already running"));

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/start", { method: "POST" });
      const response = await startPOST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: "Already running" });
    });

    it("returns generic message for non-Error throws", async () => {
      mockStartTask.mockRejectedValue("unexpected");

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/start", { method: "POST" });
      const response = await startPOST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: "Start failed" });
    });
  });

  // ─── CANCEL ───────────────────────────────────────────────────
  describe("POST /api/tasks/[taskId]/cancel", () => {
    it("returns 401 when auth fails", async () => {
      const authError = Response.json({ error: "Unauthorized" }, { status: 401 });
      mockRequireAuth.mockResolvedValue({ session: null, error: authError });

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/cancel", { method: "POST" });
      const response = await cancelPOST(req, makeRouteParams("task-1"));

      expect(response.status).toBe(401);
    });

    it("returns ownership error", async () => {
      const ownershipError = Response.json({ error: "Forbidden" }, { status: 403 });
      mockRequireTaskOwnership.mockResolvedValue(ownershipError);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/cancel", { method: "POST" });
      const response = await cancelPOST(req, makeRouteParams("task-1"));

      expect(response.status).toBe(403);
    });

    it("cancels the task successfully", async () => {
      const mockTask = { id: "task-1", status: "CANCELLED" };
      mockCancelTask.mockResolvedValue(mockTask);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/cancel", { method: "POST" });
      const response = await cancelPOST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockTask);
      expect(mockCancelTask).toHaveBeenCalledWith("task-1");
    });

    it("returns 400 when cancel fails", async () => {
      mockCancelTask.mockRejectedValue(new Error("Cannot cancel"));

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/cancel", { method: "POST" });
      const response = await cancelPOST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: "Cannot cancel" });
    });

    it("returns generic message for non-Error throws", async () => {
      mockCancelTask.mockRejectedValue(42);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/cancel", { method: "POST" });
      const response = await cancelPOST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: "Cancel failed" });
    });
  });

  // ─── RETRY ────────────────────────────────────────────────────
  describe("POST /api/tasks/[taskId]/retry", () => {
    it("returns 401 when auth fails", async () => {
      const authError = Response.json({ error: "Unauthorized" }, { status: 401 });
      mockRequireAuth.mockResolvedValue({ session: null, error: authError });

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/retry", { method: "POST" });
      const response = await retryPOST(req, makeRouteParams("task-1"));

      expect(response.status).toBe(401);
    });

    it("returns ownership error", async () => {
      const ownershipError = Response.json({ error: "Forbidden" }, { status: 403 });
      mockRequireTaskOwnership.mockResolvedValue(ownershipError);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/retry", { method: "POST" });
      const response = await retryPOST(req, makeRouteParams("task-1"));

      expect(response.status).toBe(403);
    });

    it("retries the task successfully", async () => {
      const mockTask = { id: "task-1", status: "QUEUED" };
      mockRetryTask.mockResolvedValue(mockTask);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/retry", { method: "POST" });
      const response = await retryPOST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockTask);
      expect(mockRetryTask).toHaveBeenCalledWith("task-1");
    });

    it("returns 400 when retry fails", async () => {
      mockRetryTask.mockRejectedValue(new Error("Max retries exceeded"));

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/retry", { method: "POST" });
      const response = await retryPOST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: "Max retries exceeded" });
    });

    it("returns generic message for non-Error throws", async () => {
      mockRetryTask.mockRejectedValue(null);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/retry", { method: "POST" });
      const response = await retryPOST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: "Retry failed" });
    });
  });

  // ─── CLONE ────────────────────────────────────────────────────
  describe("POST /api/tasks/[taskId]/clone", () => {
    it("returns 401 when auth fails", async () => {
      const authError = Response.json({ error: "Unauthorized" }, { status: 401 });
      mockRequireAuth.mockResolvedValue({ session: null, error: authError });

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/clone", { method: "POST" });
      const response = await clonePOST(req, makeRouteParams("task-1"));

      expect(response.status).toBe(401);
    });

    it("returns ownership error", async () => {
      const ownershipError = Response.json({ error: "Forbidden" }, { status: 403 });
      mockRequireTaskOwnership.mockResolvedValue(ownershipError);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/clone", { method: "POST" });
      const response = await clonePOST(req, makeRouteParams("task-1"));

      expect(response.status).toBe(403);
    });

    it("clones the task successfully with 201 status", async () => {
      const mockTask = { id: "task-2", title: "Cloned Task" };
      mockCloneTask.mockResolvedValue(mockTask);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/clone", { method: "POST" });
      const response = await clonePOST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toEqual(mockTask);
      expect(mockCloneTask).toHaveBeenCalledWith("task-1");
    });

    it("returns 400 when clone fails", async () => {
      mockCloneTask.mockRejectedValue(new Error("Clone limit reached"));

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/clone", { method: "POST" });
      const response = await clonePOST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: "Clone limit reached" });
    });

    it("returns generic message for non-Error throws", async () => {
      mockCloneTask.mockRejectedValue(undefined);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/clone", { method: "POST" });
      const response = await clonePOST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: "Clone failed" });
    });
  });

  // ─── RESUME ───────────────────────────────────────────────────
  describe("POST /api/tasks/[taskId]/resume", () => {
    it("returns 401 when auth fails", async () => {
      const authError = Response.json({ error: "Unauthorized" }, { status: 401 });
      mockRequireAuth.mockResolvedValue({ session: null, error: authError });

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumePrompt: "continue" }),
      });
      const response = await resumePOST(req, makeRouteParams("task-1"));

      expect(response.status).toBe(401);
    });

    it("returns ownership error", async () => {
      const ownershipError = Response.json({ error: "Forbidden" }, { status: 403 });
      mockRequireTaskOwnership.mockResolvedValue(ownershipError);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumePrompt: "continue" }),
      });
      const response = await resumePOST(req, makeRouteParams("task-1"));

      expect(response.status).toBe(403);
    });

    it("resumes the task with resumePrompt from body", async () => {
      const mockTask = { id: "task-1", status: "IN_PROGRESS" };
      mockResumeTask.mockResolvedValue(mockTask);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumePrompt: "Please continue with the fix" }),
      });
      const response = await resumePOST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockTask);
      expect(mockResumeTask).toHaveBeenCalledWith("task-1", "Please continue with the fix");
    });

    it("returns 400 when resume fails", async () => {
      mockResumeTask.mockRejectedValue(new Error("Task not resumable"));

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumePrompt: "continue" }),
      });
      const response = await resumePOST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: "Task not resumable" });
    });

    it("returns generic message for non-Error throws", async () => {
      mockResumeTask.mockRejectedValue({ code: "UNKNOWN" });

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumePrompt: "continue" }),
      });
      const response = await resumePOST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: "Resume failed" });
    });
  });
});
