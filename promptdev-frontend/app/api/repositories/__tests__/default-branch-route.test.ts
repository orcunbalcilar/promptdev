import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/bitbucket-service", () => ({
  getDefaultBranch: vi.fn(),
}));

import { GET } from "@/app/api/repositories/[slug]/default-branch/route";
import { getDefaultBranch } from "@/lib/services/bitbucket-service";

const mockGetDefaultBranch = getDefaultBranch as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe("GET /api/repositories/[slug]/default-branch", () => {
  it("returns 400 when projectKey is missing", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/repositories/my-repo/default-branch",
    );

    const res = await GET(req, makeParams("my-repo"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("projectKey is required");
  });

  it("returns the default branch", async () => {
    const branch = { displayId: "main", latestCommit: "abc123" };
    mockGetDefaultBranch.mockResolvedValue(branch);

    const req = new NextRequest(
      "http://localhost:3000/api/repositories/my-repo/default-branch?projectKey=PROJ",
    );

    const res = await GET(req, makeParams("my-repo"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(branch);
    expect(mockGetDefaultBranch).toHaveBeenCalledWith("PROJ", "my-repo");
  });

  it("returns 404 when getDefaultBranch throws", async () => {
    mockGetDefaultBranch.mockRejectedValue(new Error("not found"));

    const req = new NextRequest(
      "http://localhost:3000/api/repositories/my-repo/default-branch?projectKey=PROJ",
    );

    const res = await GET(req, makeParams("my-repo"));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Default branch not found");
  });
});
