import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1" } },
  }),
}));

vi.mock("@/lib/services/scheduled-job-service", () => ({
  getJobHistory: vi.fn(),
  getJob: vi.fn(),
  markJobRun: vi.fn(),
}));

vi.mock("@/lib/services/task-service", () => ({
  createTask: vi.fn(),
  startTask: vi.fn(),
}));

import * as scheduledJobService from "@/lib/services/scheduled-job-service";
import * as taskService from "@/lib/services/task-service";
import { requireAuth } from "@/lib/auth-guard";

import { GET as historyGET } from "@/app/api/scheduled-jobs/[id]/history/route";
import { POST as runPOST } from "@/app/api/scheduled-jobs/[id]/run/route";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

function makeRequest(url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) {
  return new NextRequest(`http://localhost:3000${url}`, init);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
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

/* ────── Job History ────── */

describe("GET /api/scheduled-jobs/[id]/history", () => {
  it("returns job history", async () => {
    const history = [{ id: "run-1", status: "success" }];
    vi.mocked(scheduledJobService.getJobHistory).mockResolvedValue(history);

    const req = makeRequest("/api/scheduled-jobs/job-1/history");
    const res = await historyGET(req, makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(history);
    expect(scheduledJobService.getJobHistory).toHaveBeenCalledWith("job-1");
  });
});

/* ────── Run Job ────── */

describe("POST /api/scheduled-jobs/[id]/run", () => {
  const mockJob = {
    id: "job-1",
    name: "Nightly Build",
    promptTemplate: "Run build",
    workspaceRef: "repo-slug",
    projectKey: "PROJ",
    workspaceType: "bitbucket",
    sourceBranch: "develop",
    targetBranch: "main",
    modelId: "gpt-5.2",
    maxIterations: 5,
  };

  it("creates and starts task from job template", async () => {
    vi.mocked(scheduledJobService.getJob).mockResolvedValue(mockJob);
    const task = { id: "task-1", title: "[Scheduled] Nightly Build" };
    vi.mocked(taskService.createTask).mockResolvedValue(task);
    vi.mocked(taskService.startTask).mockResolvedValue(undefined);
    vi.mocked(scheduledJobService.markJobRun).mockResolvedValue(undefined);

    const req = makeRequest("/api/scheduled-jobs/job-1/run", { method: "POST" });
    const res = await runPOST(req, makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe("task-1");
    expect(taskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "[Scheduled] Nightly Build",
        prompt: "Run build",
        repositorySlug: "repo-slug",
        projectKey: "PROJ",
        sourceBranch: "develop",
        targetBranch: "main",
        modelId: "gpt-5.2",
        maxIterations: 5,
      }),
    );
    expect(scheduledJobService.markJobRun).toHaveBeenCalledWith("job-1", "task-1");
    expect(taskService.startTask).toHaveBeenCalledWith("task-1");
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/scheduled-jobs/job-1/run", { method: "POST" });
    const res = await runPOST(req, makeParams("job-1"));

    expect(res.status).toBe(401);
  });

  it("returns 400 when job not found", async () => {
    vi.mocked(scheduledJobService.getJob).mockRejectedValue(
      new Error("Job not found"),
    );

    const req = makeRequest("/api/scheduled-jobs/job-1/run", { method: "POST" });
    const res = await runPOST(req, makeParams("job-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Job not found");
  });

  it("uses fallback values for optional job fields", async () => {
    const minimalJob = {
      ...mockJob,
      projectKey: null,
      sourceBranch: null,
      targetBranch: null,
      modelId: null,
      maxIterations: null,
    };
    vi.mocked(scheduledJobService.getJob).mockResolvedValue(minimalJob);
    vi.mocked(taskService.createTask).mockResolvedValue({ id: "task-2" });
    vi.mocked(taskService.startTask).mockResolvedValue(undefined);
    vi.mocked(scheduledJobService.markJobRun).mockResolvedValue(undefined);

    const req = makeRequest("/api/scheduled-jobs/job-1/run", { method: "POST" });
    await runPOST(req, makeParams("job-1"));

    expect(taskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        projectKey: undefined,
        sourceBranch: "main",
        targetBranch: "main",
        modelId: "gpt-5.2",
        maxIterations: 10,
      }),
    );
  });
});
