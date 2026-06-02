import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1" } },
  }),
}));

vi.mock("@/lib/services/scheduled-job-service", () => ({
  toggleJob: vi.fn(),
}));

import { POST } from "@/app/api/scheduled-jobs/[id]/toggle/route";
import { requireAuth } from "@/lib/auth-guard";
import { toggleJob } from "@/lib/services/scheduled-job-service";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockToggleJob = toggleJob as ReturnType<typeof vi.fn>;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1" } },
  });
});

describe("POST /api/scheduled-jobs/[id]/toggle", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest(
      "http://localhost:3000/api/scheduled-jobs/job-1/toggle",
      { method: "POST" },
    );
    const res = await POST(req, makeParams("job-1"));

    expect(res.status).toBe(401);
  });

  it("toggles the job and returns updated job", async () => {
    const toggled = { id: "job-1", enabled: false };
    mockToggleJob.mockResolvedValue(toggled);

    const req = new NextRequest(
      "http://localhost:3000/api/scheduled-jobs/job-1/toggle",
      { method: "POST" },
    );

    const res = await POST(req, makeParams("job-1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(toggled);
    expect(mockToggleJob).toHaveBeenCalledWith("job-1");
  });

  it("returns 404 when toggleJob throws", async () => {
    mockToggleJob.mockRejectedValue(new Error("not found"));

    const req = new NextRequest(
      "http://localhost:3000/api/scheduled-jobs/job-1/toggle",
      { method: "POST" },
    );

    const res = await POST(req, makeParams("job-1"));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Job not found");
  });
});
