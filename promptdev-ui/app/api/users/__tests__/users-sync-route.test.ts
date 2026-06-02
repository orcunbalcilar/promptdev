import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1", email: "test@example.com" } },
  }),
}));

vi.mock("@/lib/services/user-service", () => ({
  findOrCreateUser: vi.fn(),
  getUserProfile: vi.fn(),
}));

import { POST } from "@/app/api/users/sync/route";
import { requireAuth } from "@/lib/auth-guard";
import { findOrCreateUser, getUserProfile } from "@/lib/services/user-service";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockFindOrCreate = findOrCreateUser as ReturnType<typeof vi.fn>;
const mockGetProfile = getUserProfile as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1" } },
  });
});

describe("POST /api/users/sync", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost:3000/api/users/sync");
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("syncs user and returns profile", async () => {
    const user = { id: "user-42" };
    const profile = {
      id: "user-42",
      email: "bob@test.com",
      bitbucketTokenSet: false,
    };
    mockFindOrCreate.mockResolvedValue(user);
    mockGetProfile.mockResolvedValue(profile);

    const req = new NextRequest(
      "http://localhost:3000/api/users/sync?provider=bitbucket&providerAccountId=123&email=bob@test.com&name=Bob&avatarUrl=http://img.png",
    );

    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(profile);
    expect(mockFindOrCreate).toHaveBeenCalledWith(
      "bitbucket",
      "123",
      "bob@test.com",
      "Bob",
      "http://img.png",
    );
    expect(mockGetProfile).toHaveBeenCalledWith("user-42");
  });

  it("passes empty strings for missing optional params", async () => {
    const user = { id: "user-99" };
    const profile = { id: "user-99", email: "" };
    mockFindOrCreate.mockResolvedValue(user);
    mockGetProfile.mockResolvedValue(profile);

    const req = new NextRequest("http://localhost:3000/api/users/sync");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockFindOrCreate).toHaveBeenCalledWith(
      "",
      "",
      "",
      undefined,
      undefined,
    );
  });
});
