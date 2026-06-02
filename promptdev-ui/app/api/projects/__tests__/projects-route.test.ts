import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1" } },
  }),
}));

vi.mock("@/lib/services/bitbucket-service", () => ({
  listProjects: vi.fn(),
}));

import * as bitbucketService from "@/lib/services/bitbucket-service";
import { requireAuth } from "@/lib/auth-guard";

import { GET } from "@/app/api/projects/route";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

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

describe("GET /api/projects", () => {
  it("returns list of projects", async () => {
    const projects = [{ id: 1, key: "PROJ", name: "Project" }];
    vi.mocked(bitbucketService.listProjects).mockResolvedValue(projects);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(projects);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const res = await GET();

    expect(res.status).toBe(401);
  });
});
