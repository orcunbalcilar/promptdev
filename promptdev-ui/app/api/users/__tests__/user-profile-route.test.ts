import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1" } },
  }),
  requireOwnership: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/services/user-service", () => ({
  getUserProfile: vi.fn(),
  updateSettings: vi.fn(),
}));

import { GET } from "@/app/api/users/[userId]/profile/route";
import { PUT } from "@/app/api/users/[userId]/settings/route";
import { requireAuth, requireOwnership } from "@/lib/auth-guard";
import { getUserProfile, updateSettings } from "@/lib/services/user-service";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireOwnership = requireOwnership as ReturnType<typeof vi.fn>;
const mockGetProfile = getUserProfile as ReturnType<typeof vi.fn>;
const mockUpdateSettings = updateSettings as ReturnType<typeof vi.fn>;

function makeParams(userId: string) {
  return { params: Promise.resolve({ userId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1" } },
  });
  mockRequireOwnership.mockReturnValue(null);
});

// ─── GET /api/users/[userId]/profile ───────────────────────

describe("GET /api/users/[userId]/profile", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest(
      "http://localhost:3000/api/users/user-1/profile",
    );
    const res = await GET(req, makeParams("user-1"));

    expect(res.status).toBe(401);
  });

  it("returns 403 when ownership check fails", async () => {
    mockRequireOwnership.mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const req = new NextRequest(
      "http://localhost:3000/api/users/other-user/profile",
    );
    const res = await GET(req, makeParams("other-user"));

    expect(res.status).toBe(403);
  });

  it("returns the user profile", async () => {
    const profile = { id: "user-1", email: "a@b.com", bitbucketTokenSet: true };
    mockGetProfile.mockResolvedValue(profile);

    const req = new NextRequest(
      "http://localhost:3000/api/users/user-1/profile",
    );
    const res = await GET(req, makeParams("user-1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(profile);
    expect(mockGetProfile).toHaveBeenCalledWith("user-1");
  });

  it("returns 404 when getUserProfile throws", async () => {
    mockGetProfile.mockRejectedValue(new Error("not found"));

    const req = new NextRequest(
      "http://localhost:3000/api/users/user-1/profile",
    );
    const res = await GET(req, makeParams("user-1"));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("User not found");
  });
});

// ─── PUT /api/users/[userId]/settings ──────────────────────

describe("PUT /api/users/[userId]/settings", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest(
      "http://localhost:3000/api/users/user-1/settings",
      {
        method: "PUT",
        body: JSON.stringify({ theme: "dark" }),
      },
    );
    const res = await PUT(req, makeParams("user-1"));

    expect(res.status).toBe(401);
  });

  it("returns 403 when ownership check fails", async () => {
    mockRequireOwnership.mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const req = new NextRequest(
      "http://localhost:3000/api/users/other/settings",
      {
        method: "PUT",
        body: JSON.stringify({ theme: "dark" }),
      },
    );
    const res = await PUT(req, makeParams("other"));

    expect(res.status).toBe(403);
  });

  it("updates settings and returns profile", async () => {
    const profile = { id: "user-1", theme: "dark" };
    mockUpdateSettings.mockResolvedValue(profile);

    const req = new NextRequest(
      "http://localhost:3000/api/users/user-1/settings",
      {
        method: "PUT",
        body: JSON.stringify({ theme: "dark" }),
      },
    );

    const res = await PUT(req, makeParams("user-1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(profile);
    expect(mockUpdateSettings).toHaveBeenCalledWith("user-1", {
      theme: "dark",
    });
  });

  it("returns 400 when updateSettings throws", async () => {
    mockUpdateSettings.mockRejectedValue(new Error("Invalid settings"));

    const req = new NextRequest(
      "http://localhost:3000/api/users/user-1/settings",
      {
        method: "PUT",
        body: JSON.stringify({ bad: "data" }),
      },
    );

    const res = await PUT(req, makeParams("user-1"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid settings");
  });
});
