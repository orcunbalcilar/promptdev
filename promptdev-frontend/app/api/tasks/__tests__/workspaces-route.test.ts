/**
 * Tests for workspace and clone API routes:
 * - POST/DELETE /api/workspaces/[taskId]
 * - POST /api/workspaces/[taskId]/clone
 * - POST /api/tasks/[taskId]/clone
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth guard
vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1", email: "test@example.com" } },
  }),
  requireTaskOwnership: vi.fn().mockResolvedValue(null),
}));

// Mock services
vi.mock("@/lib/services/task-service", () => ({
  getTask: vi.fn(),
  cloneTask: vi.fn(),
}));

vi.mock("@/lib/services/workspace-service", () => ({
  createWorkspace: vi.fn(),
  createLocalWorkspace: vi.fn(),
  cleanupWorkspace: vi.fn(),
  cloneRepository: vi.fn(),
}));

vi.mock("@/lib/services/bitbucket-service", () => ({
  getCloneUrl: vi.fn(),
}));

import { requireAuth, requireTaskOwnership } from "@/lib/auth-guard";
import * as taskService from "@/lib/services/task-service";
import * as workspaceService from "@/lib/services/workspace-service";
import * as bitbucketService from "@/lib/services/bitbucket-service";

import {
  POST as workspacePOST,
  DELETE as workspaceDELETE,
} from "@/app/api/workspaces/[taskId]/route";
import { POST as cloneRepoPOST } from "@/app/api/workspaces/[taskId]/clone/route";
import { POST as cloneTaskPOST } from "@/app/api/tasks/[taskId]/clone/route";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireTaskOwnership = requireTaskOwnership as ReturnType<
  typeof vi.fn
>;

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

const ownershipError = new Response(JSON.stringify({ error: "Forbidden" }), {
  status: 403,
  headers: { "content-type": "application/json" },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1", email: "test@example.com" } },
  });
  mockRequireTaskOwnership.mockResolvedValue(null);
});

/* ────── POST /api/workspaces/[taskId] ────── */

describe("POST /api/workspaces/[taskId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/workspaces/task-1", { method: "POST" });
    const res = await workspacePOST(req, makeParams("task-1"));

    expect(res.status).toBe(401);
  });

  it("creates remote workspace when workspaceType is not LOCAL", async () => {
    vi.mocked(taskService.getTask).mockResolvedValue({
      id: "task-1",
      workspaceType: "BITBUCKET",
      workspacePath: null,
    } as Awaited<ReturnType<typeof taskService.getTask>>);
    vi.mocked(workspaceService.createWorkspace).mockReturnValue(
      "/tmp/workspaces/task-1",
    );

    const req = makeRequest("/api/workspaces/task-1", { method: "POST" });
    const res = await workspacePOST(req, makeParams("task-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.path).toBe("/tmp/workspaces/task-1");
    expect(workspaceService.createWorkspace).toHaveBeenCalledWith("task-1");
  });

  it("creates local workspace when workspaceType is LOCAL with workspacePath", async () => {
    vi.mocked(taskService.getTask).mockResolvedValue({
      id: "task-1",
      workspaceType: "LOCAL",
      workspacePath: "/home/user/project",
    } as Awaited<ReturnType<typeof taskService.getTask>>);
    vi.mocked(workspaceService.createLocalWorkspace).mockReturnValue(
      "/home/user/project",
    );

    const req = makeRequest("/api/workspaces/task-1", { method: "POST" });
    const res = await workspacePOST(req, makeParams("task-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.path).toBe("/home/user/project");
    expect(workspaceService.createLocalWorkspace).toHaveBeenCalledWith(
      "/home/user/project",
    );
  });

  it("falls back to createWorkspace when LOCAL but no workspacePath", async () => {
    vi.mocked(taskService.getTask).mockResolvedValue({
      id: "task-1",
      workspaceType: "LOCAL",
      workspacePath: null,
    } as Awaited<ReturnType<typeof taskService.getTask>>);
    vi.mocked(workspaceService.createWorkspace).mockReturnValue(
      "/tmp/workspaces/task-1",
    );

    const req = makeRequest("/api/workspaces/task-1", { method: "POST" });
    const res = await workspacePOST(req, makeParams("task-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.path).toBe("/tmp/workspaces/task-1");
    expect(workspaceService.createWorkspace).toHaveBeenCalledWith("task-1");
    expect(workspaceService.createLocalWorkspace).not.toHaveBeenCalled();
  });

  it("returns 400 when workspace creation fails", async () => {
    vi.mocked(taskService.getTask).mockRejectedValue(
      new Error("Task not found"),
    );

    const req = makeRequest("/api/workspaces/task-1", { method: "POST" });
    const res = await workspacePOST(req, makeParams("task-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Task not found");
  });

  it("returns generic error message for non-Error throws", async () => {
    vi.mocked(taskService.getTask).mockRejectedValue("unknown");

    const req = makeRequest("/api/workspaces/task-1", { method: "POST" });
    const res = await workspacePOST(req, makeParams("task-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Workspace creation failed");
  });
});

/* ────── DELETE /api/workspaces/[taskId] ────── */

describe("DELETE /api/workspaces/[taskId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/workspaces/task-1", { method: "DELETE" });
    const res = await workspaceDELETE(req, makeParams("task-1"));

    expect(res.status).toBe(401);
  });

  it("cleans up workspace and returns 204", async () => {
    const req = makeRequest("/api/workspaces/task-1", { method: "DELETE" });
    const res = await workspaceDELETE(req, makeParams("task-1"));

    expect(res.status).toBe(204);
    expect(workspaceService.cleanupWorkspace).toHaveBeenCalledWith("task-1");
  });
});

/* ────── POST /api/workspaces/[taskId]/clone ────── */

describe("POST /api/workspaces/[taskId]/clone", () => {
  it("clones repository with provided credentials", async () => {
    vi.mocked(bitbucketService.getCloneUrl).mockReturnValue(
      "https://bitbucket.example.com/scm/PRJ/repo.git",
    );
    vi.mocked(workspaceService.cloneRepository).mockReturnValue(
      "/tmp/workspaces/task-1",
    );

    const req = makeRequest("/api/workspaces/task-1/clone", {
      method: "POST",
      body: JSON.stringify({
        projectKey: "PRJ",
        repoSlug: "repo",
        username: "user",
        token: "tok",
        sourceBranch: "main",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await cloneRepoPOST(req, makeParams("task-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.path).toBe("/tmp/workspaces/task-1");
    expect(bitbucketService.getCloneUrl).toHaveBeenCalledWith("PRJ", "repo");
    expect(workspaceService.cloneRepository).toHaveBeenCalledWith(
      "task-1",
      "https://bitbucket.example.com/scm/PRJ/repo.git",
      "user",
      "tok",
      "main",
    );
  });

  it("returns 400 when clone fails", async () => {
    vi.mocked(bitbucketService.getCloneUrl).mockImplementation(() => {
      throw new Error("Invalid project key");
    });

    const req = makeRequest("/api/workspaces/task-1/clone", {
      method: "POST",
      body: JSON.stringify({
        projectKey: "",
        repoSlug: "repo",
        username: "user",
        token: "tok",
        sourceBranch: "main",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await cloneRepoPOST(req, makeParams("task-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid project key");
  });

  it("returns generic error for non-Error throws", async () => {
    vi.mocked(bitbucketService.getCloneUrl).mockImplementation(() => {
      throw "unexpected";
    });

    const req = makeRequest("/api/workspaces/task-1/clone", {
      method: "POST",
      body: JSON.stringify({
        projectKey: "PRJ",
        repoSlug: "repo",
        username: "user",
        token: "tok",
        sourceBranch: "main",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await cloneRepoPOST(req, makeParams("task-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Clone failed");
  });
});

/* ────── POST /api/tasks/[taskId]/clone ────── */

describe("POST /api/tasks/[taskId]/clone", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/tasks/task-1/clone", { method: "POST" });
    const res = await cloneTaskPOST(req, makeParams("task-1"));

    expect(res.status).toBe(401);
  });

  it("returns 403 when user does not own task", async () => {
    mockRequireTaskOwnership.mockResolvedValue(ownershipError);

    const req = makeRequest("/api/tasks/task-1/clone", { method: "POST" });
    const res = await cloneTaskPOST(req, makeParams("task-1"));

    expect(res.status).toBe(403);
  });

  it("clones task and returns 201", async () => {
    const clonedTask = { id: "task-2", title: "Clone of Task 1" };
    vi.mocked(taskService.cloneTask).mockResolvedValue(
      clonedTask as Awaited<ReturnType<typeof taskService.cloneTask>>,
    );

    const req = makeRequest("/api/tasks/task-1/clone", { method: "POST" });
    const res = await cloneTaskPOST(req, makeParams("task-1"));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual(clonedTask);
    expect(taskService.cloneTask).toHaveBeenCalledWith("task-1");
  });

  it("returns 400 when clone fails with Error", async () => {
    vi.mocked(taskService.cloneTask).mockRejectedValue(
      new Error("Task is still running"),
    );

    const req = makeRequest("/api/tasks/task-1/clone", { method: "POST" });
    const res = await cloneTaskPOST(req, makeParams("task-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Task is still running");
  });

  it("returns generic error for non-Error throws", async () => {
    vi.mocked(taskService.cloneTask).mockRejectedValue(42);

    const req = makeRequest("/api/tasks/task-1/clone", { method: "POST" });
    const res = await cloneTaskPOST(req, makeParams("task-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Clone failed");
  });
});
