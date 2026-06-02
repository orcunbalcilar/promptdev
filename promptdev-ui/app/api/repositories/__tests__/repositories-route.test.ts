import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1", email: "test@example.com" } },
  }),
}));

vi.mock("@/lib/services/bitbucket-service", () => ({
  listAllRepositories: vi.fn(),
  listRepositories: vi.fn(),
}));

import { GET } from "@/app/api/repositories/route";
import { requireAuth } from "@/lib/auth-guard";
import {
  listAllRepositories,
  listRepositories,
} from "@/lib/services/bitbucket-service";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockListAll = listAllRepositories as ReturnType<typeof vi.fn>;
const mockListByProject = listRepositories as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1" } },
  });
});

describe("GET /api/repositories", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost:3000/api/repositories");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("calls listAllRepositories when no projectKey is provided", async () => {
    const repos = [{ slug: "repo-1" }, { slug: "repo-2" }];
    mockListAll.mockResolvedValue(repos);

    const req = new NextRequest("http://localhost:3000/api/repositories");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(repos);
    expect(mockListAll).toHaveBeenCalledOnce();
    expect(mockListByProject).not.toHaveBeenCalled();
  });

  it("calls listRepositories when projectKey is provided", async () => {
    const repos = [{ slug: "repo-a" }];
    mockListByProject.mockResolvedValue(repos);

    const req = new NextRequest(
      "http://localhost:3000/api/repositories?projectKey=PROJ",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(repos);
    expect(mockListByProject).toHaveBeenCalledWith("PROJ");
    expect(mockListAll).not.toHaveBeenCalled();
  });
});
