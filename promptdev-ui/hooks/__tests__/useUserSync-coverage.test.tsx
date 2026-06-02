import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockGetUserProfile = vi.fn();
const mockSyncUser = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: {
      user: {
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        email: "test@example.com",
        name: "Test User",
        image: "https://example.com/avatar.png",
      },
    },
    status: "authenticated",
  })),
}));

vi.mock("@/lib/user", () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
  syncUser: (...args: unknown[]) => mockSyncUser(...args),
}));

import { useUserSync } from "../useUserSync";
import { useSession } from "next-auth/react";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useUserSync – coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches profile for UUID session id (line 22: isUuid=true)", async () => {
    const profile = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      email: "test@example.com",
    };
    mockGetUserProfile.mockResolvedValue(profile);

    const { result } = renderHook(() => useUserSync(), { wrapper });

    await waitFor(() => expect(result.current.userId).toBe(profile.id));
    expect(mockGetUserProfile).toHaveBeenCalledWith(
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    );
  });

  it("falls back to sync when profile fails for UUID user (line 51)", async () => {
    mockGetUserProfile.mockRejectedValue(new Error("Fail"));
    const profile = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      email: "test@example.com",
    };
    mockSyncUser.mockResolvedValue(profile);

    const { result } = renderHook(() => useUserSync(), { wrapper });

    await waitFor(() => expect(result.current.userId).toBe(profile.id));
    expect(mockSyncUser).toHaveBeenCalled();
  });

  it("syncs for non-UUID session id", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: "99999",
          email: "user@example.com",
          name: "User",
          image: null,
        },
        expires: "",
      },
      status: "authenticated",
      update: vi.fn(),
    });
    const profile = { id: "new-uuid-123", email: "user@example.com" };
    mockSyncUser.mockResolvedValue(profile);

    const { result } = renderHook(() => useUserSync(), { wrapper });

    await waitFor(() => expect(result.current.userId).toBe("new-uuid-123"));
  });

  it("returns loading state when session is loading", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    });

    const { result } = renderHook(() => useUserSync(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });
});
