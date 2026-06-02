import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1" } },
  }),
  requireOwnership: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/services/user-service", () => ({
  getUserProfile: vi.fn(),
  updateSettings: vi.fn(),
  findOrCreateUser: vi.fn(),
}));

import * as userService from "@/lib/services/user-service";
import { requireAuth, requireOwnership } from "@/lib/auth-guard";

import { GET as profileGET } from "@/app/api/users/[userId]/profile/route";
import { PUT as settingsPUT } from "@/app/api/users/[userId]/settings/route";
import { POST as syncPOST } from "@/app/api/users/sync/route";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireOwnership = requireOwnership as ReturnType<typeof vi.fn>;

function makeRequest(
  url: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
) {
  return new NextRequest(`http://localhost:3000${url}`, init);
}

function makeUserParams(userId: string) {
  return { params: Promise.resolve({ userId }) };
}

const authError = new Response(JSON.stringify({ error: "Unauthorized" }), {
  status: 401,
  headers: { "content-type": "application/json" },
});

const forbiddenError = new Response(JSON.stringify({ error: "Forbidden" }), {
  status: 403,
  headers: { "content-type": "application/json" },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1" } },
  });
  mockRequireOwnership.mockReturnValue(null);
});

/* ────── User Profile ────── */

describe("GET /api/users/[userId]/profile", () => {
  it("returns user profile", async () => {
    const profile = { id: "user-1", name: "Test User" };
    vi.mocked(userService.getUserProfile).mockResolvedValue(profile);

    const req = makeRequest("/api/users/user-1/profile");
    const res = await profileGET(req, makeUserParams("user-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(profile);
    expect(mockRequireOwnership).toHaveBeenCalled();
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/users/user-1/profile");
    const res = await profileGET(req, makeUserParams("user-1"));

    expect(res.status).toBe(401);
  });

  it("returns 403 when user doesn't own the resource", async () => {
    mockRequireOwnership.mockReturnValue(forbiddenError);

    const req = makeRequest("/api/users/user-2/profile");
    const res = await profileGET(req, makeUserParams("user-2"));

    expect(res.status).toBe(403);
  });

  it("returns 404 when user not found", async () => {
    vi.mocked(userService.getUserProfile).mockRejectedValue(
      new Error("Not found"),
    );

    const req = makeRequest("/api/users/user-1/profile");
    const res = await profileGET(req, makeUserParams("user-1"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("User not found");
  });
});

/* ────── User Settings ────── */

describe("PUT /api/users/[userId]/settings", () => {
  it("updates settings successfully", async () => {
    const updated = { id: "user-1", theme: "dark" };
    vi.mocked(userService.updateSettings).mockResolvedValue(updated);

    const req = makeRequest("/api/users/user-1/settings", {
      method: "PUT",
      body: JSON.stringify({ theme: "dark" }),
      headers: { "content-type": "application/json" },
    });
    const res = await settingsPUT(req, makeUserParams("user-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(updated);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/users/user-1/settings", {
      method: "PUT",
      body: JSON.stringify({ theme: "dark" }),
      headers: { "content-type": "application/json" },
    });
    const res = await settingsPUT(req, makeUserParams("user-1"));

    expect(res.status).toBe(401);
  });

  it("returns 403 when user doesn't own the resource", async () => {
    mockRequireOwnership.mockReturnValue(forbiddenError);

    const req = makeRequest("/api/users/user-2/settings", {
      method: "PUT",
      body: JSON.stringify({ theme: "dark" }),
      headers: { "content-type": "application/json" },
    });
    const res = await settingsPUT(req, makeUserParams("user-2"));

    expect(res.status).toBe(403);
  });

  it("returns 400 on update error", async () => {
    vi.mocked(userService.updateSettings).mockRejectedValue(
      new Error("Invalid settings"),
    );

    const req = makeRequest("/api/users/user-1/settings", {
      method: "PUT",
      body: JSON.stringify({ theme: "invalid" }),
      headers: { "content-type": "application/json" },
    });
    const res = await settingsPUT(req, makeUserParams("user-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid settings");
  });
});

/* ────── User Sync ────── */

describe("POST /api/users/sync", () => {
  it("syncs user and returns profile", async () => {
    const user = { id: "user-1" };
    const profile = { id: "user-1", name: "Test", bitbucketTokenSet: true };
    vi.mocked(userService.findOrCreateUser).mockResolvedValue(user);
    vi.mocked(userService.getUserProfile).mockResolvedValue(profile);

    const req = makeRequest(
      "/api/users/sync?provider=github&providerAccountId=12345&email=test@example.com&name=Test",
      { method: "POST" },
    );
    const res = await syncPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(profile);
    expect(userService.findOrCreateUser).toHaveBeenCalledWith(
      "github",
      "12345",
      "test@example.com",
      "Test",
      undefined,
    );
    expect(userService.getUserProfile).toHaveBeenCalledWith("user-1");
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/users/sync?provider=github", {
      method: "POST",
    });
    const res = await syncPOST(req);

    expect(res.status).toBe(401);
  });

  it("uses empty string defaults for missing params", async () => {
    const user = { id: "user-1" };
    vi.mocked(userService.findOrCreateUser).mockResolvedValue(user);
    vi.mocked(userService.getUserProfile).mockResolvedValue({ id: "user-1" });

    const req = makeRequest("/api/users/sync", { method: "POST" });
    await syncPOST(req);

    expect(userService.findOrCreateUser).toHaveBeenCalledWith(
      "",
      "",
      "",
      undefined,
      undefined,
    );
  });
});
