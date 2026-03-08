import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/bitbucket-service", () => ({
  listBranches: vi.fn(),
}));

import { GET } from "@/app/api/repositories/[slug]/branches/route";
import { listBranches } from "@/lib/services/bitbucket-service";

const mockListBranches = listBranches as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe("GET /api/repositories/[slug]/branches", () => {
  it("returns 400 when projectKey is missing", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/repositories/my-repo/branches",
    );

    const res = await GET(req, makeParams("my-repo"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("projectKey is required");
  });

  it("returns branches for given projectKey and slug", async () => {
    const branches = [{ displayId: "main" }, { displayId: "develop" }];
    mockListBranches.mockResolvedValue(branches);

    const req = new NextRequest(
      "http://localhost:3000/api/repositories/my-repo/branches?projectKey=PROJ",
    );

    const res = await GET(req, makeParams("my-repo"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(branches);
    expect(mockListBranches).toHaveBeenCalledWith("PROJ", "my-repo", undefined);
  });

  it("passes filterText to listBranches when provided", async () => {
    mockListBranches.mockResolvedValue([{ displayId: "feature/foo" }]);

    const req = new NextRequest(
      "http://localhost:3000/api/repositories/my-repo/branches?projectKey=PROJ&filterText=feature",
    );

    const res = await GET(req, makeParams("my-repo"));

    expect(res.status).toBe(200);
    expect(mockListBranches).toHaveBeenCalledWith(
      "PROJ",
      "my-repo",
      "feature",
    );
  });
});
