import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1", email: "test@example.com" } },
  }),
  requireTaskOwnership: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/services/task-service", () => ({
  createPullRequestForTask: vi.fn(),
}));

import { POST } from "@/app/api/tasks/[taskId]/create-pr/route";
import { requireAuth, requireTaskOwnership } from "@/lib/auth-guard";
import { createPullRequestForTask } from "@/lib/services/task-service";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireTaskOwnership = requireTaskOwnership as ReturnType<typeof vi.fn>;
const mockCreatePR = createPullRequestForTask as ReturnType<typeof vi.fn>;

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

describe("Task Create PR API Route", () => {
  describe("POST /api/tasks/[taskId]/create-pr", () => {
    it("returns 401 when auth fails", async () => {
      const authError = Response.json({ error: "Unauthorized" }, { status: 401 });
      mockRequireAuth.mockResolvedValue({ session: null, error: authError });

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/create-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName: "feature/fix",
          targetBranch: "main",
          title: "Fix bug",
          description: "Fixes the bug",
        }),
      });
      const response = await POST(req, makeRouteParams("task-1"));

      expect(response.status).toBe(401);
    });

    it("returns ownership error when user does not own the task", async () => {
      const ownershipError = Response.json({ error: "Forbidden" }, { status: 403 });
      mockRequireTaskOwnership.mockResolvedValue(ownershipError);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/create-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName: "feature/fix",
          targetBranch: "main",
          title: "Fix bug",
          description: "Fixes the bug",
        }),
      });
      const response = await POST(req, makeRouteParams("task-1"));

      expect(response.status).toBe(403);
    });

    it("creates a pull request with body params", async () => {
      const mockResult = { url: "https://github.com/test/repo/pull/1", number: 1 };
      mockCreatePR.mockResolvedValue(mockResult);

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/create-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName: "feature/fix-login",
          targetBranch: "main",
          title: "Fix login bug",
          description: "Resolves the login issue",
        }),
      });
      const response = await POST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockResult);
      expect(mockCreatePR).toHaveBeenCalledWith(
        "task-1",
        "feature/fix-login",
        "main",
        "Fix login bug",
        "Resolves the login issue",
      );
    });

    it("returns 400 when PR creation fails with Error", async () => {
      mockCreatePR.mockRejectedValue(new Error("Branch not found"));

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/create-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName: "nonexistent",
          targetBranch: "main",
          title: "PR",
          description: "",
        }),
      });
      const response = await POST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: "Branch not found" });
    });

    it("returns generic message for non-Error throws", async () => {
      mockCreatePR.mockRejectedValue("network error");

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/create-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName: "feature/x",
          targetBranch: "main",
          title: "PR",
          description: "",
        }),
      });
      const response = await POST(req, makeRouteParams("task-1"));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: "PR creation failed" });
    });
  });
});
