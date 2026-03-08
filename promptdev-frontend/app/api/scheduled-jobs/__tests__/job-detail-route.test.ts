import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1" } },
  }),
}));

vi.mock("@/lib/services/scheduled-job-service", () => ({
  getJob: vi.fn(),
  deleteJob: vi.fn(),
}));

import { GET, DELETE } from "@/app/api/scheduled-jobs/[id]/route";
import { requireAuth } from "@/lib/auth-guard";
import { getJob, deleteJob } from "@/lib/services/scheduled-job-service";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockGetJob = getJob as ReturnType<typeof vi.fn>;
const mockDeleteJob = deleteJob as ReturnType<typeof vi.fn>;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1" } },
  });
});

describe("GET /api/scheduled-jobs/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost:3000/api/scheduled-jobs/job-1");
    const res = await GET(req, makeParams("job-1"));

    expect(res.status).toBe(401);
  });

  it("returns the job detail", async () => {
    const job = { id: "job-1", name: "Daily sync", enabled: true };
    mockGetJob.mockResolvedValue(job);

    const req = new NextRequest("http://localhost:3000/api/scheduled-jobs/job-1");
    const res = await GET(req, makeParams("job-1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(job);
    expect(mockGetJob).toHaveBeenCalledWith("job-1");
  });

  it("returns 404 when getJob throws", async () => {
    mockGetJob.mockRejectedValue(new Error("not found"));

    const req = new NextRequest("http://localhost:3000/api/scheduled-jobs/job-1");
    const res = await GET(req, makeParams("job-1"));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Job not found");
  });
});

describe("DELETE /api/scheduled-jobs/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost:3000/api/scheduled-jobs/job-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("job-1"));

    expect(res.status).toBe(401);
  });

  it("deletes the job and returns 204", async () => {
    mockDeleteJob.mockResolvedValue(undefined);

    const req = new NextRequest("http://localhost:3000/api/scheduled-jobs/job-1", {
      method: "DELETE",
    });

    const res = await DELETE(req, makeParams("job-1"));

    expect(res.status).toBe(204);
    expect(mockDeleteJob).toHaveBeenCalledWith("job-1");
  });
});
