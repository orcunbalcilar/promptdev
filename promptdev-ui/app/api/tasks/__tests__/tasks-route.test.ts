import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1", email: "test@example.com" } },
  }),
  ensureUserExists: vi.fn().mockResolvedValue("user-1"),
}));

vi.mock("@/lib/services/task-service", () => ({
  getAllTasks: vi.fn(),
  createTask: vi.fn(),
}));

vi.mock("@/lib/task-statuses", () => ({
  STATUS_GROUPS: [
    { label: "Active", statuses: ["IN_PROGRESS", "QUEUED"] },
    { label: "Done", statuses: ["COMPLETED", "FAILED"] },
  ],
}));

import { GET, POST } from "@/app/api/tasks/route";
import { requireAuth, ensureUserExists } from "@/lib/auth-guard";
import { getAllTasks, createTask } from "@/lib/services/task-service";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockEnsureUserExists = ensureUserExists as ReturnType<typeof vi.fn>;
const mockGetAllTasks = getAllTasks as ReturnType<typeof vi.fn>;
const mockCreateTask = createTask as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1", email: "test@example.com" } },
  });
  mockEnsureUserExists.mockResolvedValue("user-1");
});

describe("Tasks API Route", () => {
  describe("GET /api/tasks", () => {
    it("returns 401 when auth fails", async () => {
      const authError = Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
      mockRequireAuth.mockResolvedValue({ error: authError });

      const req = new NextRequest("http://localhost:3000/api/tasks");
      const response = await GET(req);

      expect(response.status).toBe(401);
    });

    it("returns paginated tasks with default page and size", async () => {
      const mockResult = { data: [{ id: "task-1" }], total: 1 };
      mockGetAllTasks.mockResolvedValue(mockResult);

      const req = new NextRequest("http://localhost:3000/api/tasks");
      const response = await GET(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockResult);
      expect(mockGetAllTasks).toHaveBeenCalledWith(0, 20, {
        search: undefined,
        statuses: undefined,
        workspaceType: undefined,
      });
    });

    it("passes custom page and size params", async () => {
      mockGetAllTasks.mockResolvedValue({ data: [], total: 0 });

      const req = new NextRequest(
        "http://localhost:3000/api/tasks?page=2&size=10",
      );
      await GET(req);

      expect(mockGetAllTasks).toHaveBeenCalledWith(2, 10, {
        search: undefined,
        statuses: undefined,
        workspaceType: undefined,
      });
    });

    it("filters by status group label", async () => {
      mockGetAllTasks.mockResolvedValue({ data: [], total: 0 });

      const req = new NextRequest(
        "http://localhost:3000/api/tasks?status=Active",
      );
      await GET(req);

      expect(mockGetAllTasks).toHaveBeenCalledWith(0, 20, {
        search: undefined,
        statuses: ["IN_PROGRESS", "QUEUED"],
        workspaceType: undefined,
      });
    });

    it("filters by comma-separated statuses when not a group label", async () => {
      mockGetAllTasks.mockResolvedValue({ data: [], total: 0 });

      const req = new NextRequest(
        "http://localhost:3000/api/tasks?status=COMPLETED,FAILED",
      );
      await GET(req);

      expect(mockGetAllTasks).toHaveBeenCalledWith(0, 20, {
        search: undefined,
        statuses: ["COMPLETED", "FAILED"],
        workspaceType: undefined,
      });
    });

    it("does not filter statuses when status=all", async () => {
      mockGetAllTasks.mockResolvedValue({ data: [], total: 0 });

      const req = new NextRequest("http://localhost:3000/api/tasks?status=all");
      await GET(req);

      expect(mockGetAllTasks).toHaveBeenCalledWith(0, 20, {
        search: undefined,
        statuses: undefined,
        workspaceType: undefined,
      });
    });

    it("filters by search query", async () => {
      mockGetAllTasks.mockResolvedValue({ data: [], total: 0 });

      const req = new NextRequest(
        "http://localhost:3000/api/tasks?search=fix+bug",
      );
      await GET(req);

      expect(mockGetAllTasks).toHaveBeenCalledWith(0, 20, {
        search: "fix bug",
        statuses: undefined,
        workspaceType: undefined,
      });
    });

    it("filters by workspaceType", async () => {
      mockGetAllTasks.mockResolvedValue({ data: [], total: 0 });

      const req = new NextRequest(
        "http://localhost:3000/api/tasks?workspaceType=github",
      );
      await GET(req);

      expect(mockGetAllTasks).toHaveBeenCalledWith(0, 20, {
        search: undefined,
        statuses: undefined,
        workspaceType: "github",
      });
    });

    it("treats workspaceType=all as undefined", async () => {
      mockGetAllTasks.mockResolvedValue({ data: [], total: 0 });

      const req = new NextRequest(
        "http://localhost:3000/api/tasks?workspaceType=all",
      );
      await GET(req);

      expect(mockGetAllTasks).toHaveBeenCalledWith(0, 20, {
        search: undefined,
        statuses: undefined,
        workspaceType: undefined,
      });
    });
  });

  describe("POST /api/tasks", () => {
    it("returns 401 when auth fails", async () => {
      const authError = Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
      mockRequireAuth.mockResolvedValue({ error: authError });

      const req = new NextRequest("http://localhost:3000/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Task" }),
      });
      const response = await POST(req);

      expect(response.status).toBe(401);
    });

    it("creates a task with userId from ensureUserExists", async () => {
      const mockTask = { id: "task-1", title: "New Task", userId: "user-1" };
      mockCreateTask.mockResolvedValue(mockTask);

      const req = new NextRequest("http://localhost:3000/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Task",
          repoUrl: "https://github.com/test/repo",
        }),
      });
      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toEqual(mockTask);
      expect(mockEnsureUserExists).toHaveBeenCalledWith({
        user: { id: "user-1", email: "test@example.com" },
      });
      expect(mockCreateTask).toHaveBeenCalledWith({
        title: "New Task",
        repoUrl: "https://github.com/test/repo",
        userId: "user-1",
      });
    });
  });
});
