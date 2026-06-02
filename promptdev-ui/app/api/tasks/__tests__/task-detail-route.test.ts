import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1", email: "test@example.com" } },
  }),
  requireTaskOwnership: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/services/task-service", () => ({
  getTask: vi.fn(),
  updateTask: vi.fn(),
}));

import { GET, PATCH } from "@/app/api/tasks/[taskId]/route";
import { requireAuth, requireTaskOwnership } from "@/lib/auth-guard";
import { getTask, updateTask } from "@/lib/services/task-service";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireTaskOwnership = requireTaskOwnership as ReturnType<
  typeof vi.fn
>;
const mockGetTask = getTask as ReturnType<typeof vi.fn>;
const mockUpdateTask = updateTask as ReturnType<typeof vi.fn>;

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

describe("Task Detail API Route", () => {
  describe("GET /api/tasks/[taskId]", () => {
    it("returns 401 when auth fails", async () => {
      const authError = Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
      mockRequireAuth.mockResolvedValue({ error: authError });

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1");
      const response = await GET(req, makeRouteParams("task-1"));

      expect(response.status).toBe(401);
    });

    it("returns the task", async () => {
      const mockTask = { id: "task-1", title: "Test Task" };
      mockGetTask.mockResolvedValue(mockTask);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1");
      const response = await GET(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockTask);
      expect(mockGetTask).toHaveBeenCalledWith("task-1");
    });

    it("returns 404 when task is not found", async () => {
      mockGetTask.mockRejectedValue(new Error("Not found"));

      const req = new NextRequest("http://localhost:3000/api/tasks/task-999");
      const response = await GET(req, makeRouteParams("task-999"));
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toEqual({ error: "Task not found" });
    });
  });

  describe("PATCH /api/tasks/[taskId]", () => {
    it("returns 401 when auth fails", async () => {
      const authError = Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
      mockRequireAuth.mockResolvedValue({ session: null, error: authError });

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      });
      const response = await PATCH(req, makeRouteParams("task-1"));

      expect(response.status).toBe(401);
    });

    it("returns ownership error when user does not own the task", async () => {
      const ownershipError = Response.json(
        { error: "Forbidden" },
        { status: 403 },
      );
      mockRequireTaskOwnership.mockResolvedValue(ownershipError);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      });
      const response = await PATCH(req, makeRouteParams("task-1"));

      expect(response.status).toBe(403);
    });

    it("updates the task successfully", async () => {
      const mockTask = { id: "task-1", title: "Updated Title" };
      mockUpdateTask.mockResolvedValue(mockTask);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Title" }),
      });
      const response = await PATCH(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockTask);
      expect(mockUpdateTask).toHaveBeenCalledWith("task-1", {
        title: "Updated Title",
      });
    });

    it("returns 400 when update fails", async () => {
      mockUpdateTask.mockRejectedValue(new Error("Validation error"));

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      });
      const response = await PATCH(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: "Validation error" });
    });

    it("returns generic error message for non-Error throws", async () => {
      mockUpdateTask.mockRejectedValue("something went wrong");

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      });
      const response = await PATCH(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: "Update failed" });
    });
  });
});
