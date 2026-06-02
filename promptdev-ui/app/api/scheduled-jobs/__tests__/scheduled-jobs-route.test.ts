import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1" } },
  }),
}));

vi.mock("@/lib/services/scheduled-job-service", () => ({
  getAllJobs: vi.fn(),
  createJob: vi.fn(),
}));

import { GET, POST } from "@/app/api/scheduled-jobs/route";
import { requireAuth } from "@/lib/auth-guard";
import { getAllJobs, createJob } from "@/lib/services/scheduled-job-service";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockGetAllJobs = getAllJobs as ReturnType<typeof vi.fn>;
const mockCreateJob = createJob as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1" } },
  });
});

describe("GET /api/scheduled-jobs", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("returns all jobs", async () => {
    const jobs = [{ id: "job-1", name: "Daily sync" }];
    mockGetAllJobs.mockResolvedValue(jobs);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(jobs);
    expect(mockGetAllJobs).toHaveBeenCalledOnce();
  });
});

describe("POST /api/scheduled-jobs", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost:3000/api/scheduled-jobs", {
      method: "POST",
      body: JSON.stringify({ name: "New job" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("creates a job and returns 201", async () => {
    const newJob = { id: "job-2", name: "New job" };
    mockCreateJob.mockResolvedValue(newJob);

    const req = new NextRequest("http://localhost:3000/api/scheduled-jobs", {
      method: "POST",
      body: JSON.stringify({ name: "New job" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(newJob);
    expect(mockCreateJob).toHaveBeenCalledWith({ name: "New job" });
  });
});
