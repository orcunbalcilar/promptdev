import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getUserProfile, syncUser, updateUserSettings } from "../user";

describe("user.ts – coverage (lines 96-135)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getUserProfile calls fetch with correct URL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(JSON.stringify({ id: "u1", email: "test@test.com" })),
    });

    const result = await getUserProfile("u1");
    expect(result).toEqual({ id: "u1", email: "test@test.com" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/users/u1/profile"),
      expect.any(Object),
    );
  });

  it("syncUser sends correct params", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ id: "u1" })),
    });

    const result = await syncUser({
      provider: "github",
      providerAccountId: "12345",
      email: "test@test.com",
      name: "Test",
      avatarUrl: "https://example.com/avatar.png",
    });

    expect(result).toEqual({ id: "u1" });
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/users/sync");
    expect(url).toContain("provider=github");
    expect(url).toContain("name=Test");
    expect(url).toContain("avatarUrl=");
    expect(opts.method).toBe("POST");
  });

  it("syncUser omits optional params when not provided", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ id: "u1" })),
    });

    await syncUser({
      provider: "google",
      providerAccountId: "67890",
      email: "user@test.com",
    });

    const [url] = mockFetch.mock.calls[0];
    expect(url).not.toContain("name=");
    expect(url).not.toContain("avatarUrl=");
  });

  it("updateUserSettings sends PUT request", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ id: "u1" })),
    });

    await updateUserSettings("u1", { bitbucketToken: "token123" } as Parameters<
      typeof updateUserSettings
    >[1]);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/users/u1/settings");
    expect(opts.method).toBe("PUT");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve("Not found"),
    });

    await expect(getUserProfile("u1")).rejects.toThrow(
      "User API request failed: 404",
    );
  });

  it("returns empty object for empty response body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });

    const result = await getUserProfile("u1");
    expect(result).toEqual({});
  });
});
