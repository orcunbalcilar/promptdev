/**
 * Coverage completion for hooks:
 * - useBackendUser.ts lines 28, 47-48 (UUID check + provider extraction)
 * - useUserSync.ts lines 28, 45-46 (UUID check + provider extraction)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock next-auth
const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

// Mock user service
const mockGetUserProfile = vi.fn();
const mockSyncUser = vi.fn();
vi.mock("@/lib/user", () => ({
  getUserProfile: (...a: unknown[]) => mockGetUserProfile(...a),
  syncUser: (...a: unknown[]) => mockSyncUser(...a),
}));

import { useBackendUser } from "@/hooks/useBackendUser";
import { useUserSync } from "@/hooks/useUserSync";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("useBackendUser.ts branch coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("line 28: returns userId when session.user.id is already a UUID", async () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    mockUseSession.mockReturnValue({
      data: { user: { id: uuid, name: "Test", email: "t@t.com" } },
      status: "authenticated",
    });
    mockGetUserProfile.mockResolvedValue({
      id: uuid,
      email: "t@t.com",
      name: "Test",
      provider: "github",
    });

    const { result } = renderHook(() => useBackendUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.userId).toBe(uuid);
    });
    expect(mockGetUserProfile).toHaveBeenCalledWith(uuid);
  });

  it("lines 47-48: syncs via provider info for non-UUID session ID", async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "12345",
          name: "GH",
          email: "gh@test.com",
          image: "https://img.png",
        },
      },
      status: "authenticated",
    });
    mockSyncUser.mockResolvedValue({
      id: "new-uuid",
      email: "gh@test.com",
      name: "GH",
      provider: "github",
    });

    const { result } = renderHook(() => useBackendUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.userId).toBe("new-uuid");
    });
    expect(mockSyncUser).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "github",
        providerAccountId: "12345",
        email: "gh@test.com",
      }),
    );
  });
});

describe("useUserSync.ts branch coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("line 28: returns userId when session.user.id is UUID", async () => {
    const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    mockUseSession.mockReturnValue({
      data: { user: { id: uuid, name: "Test", email: "t@t.com" } },
      status: "authenticated",
    });
    mockGetUserProfile.mockResolvedValue({
      id: uuid,
      email: "t@t.com",
      name: "Test",
      provider: "bitbucket",
    });

    const { result } = renderHook(() => useUserSync(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.userId).toBe(uuid);
    });
  });

  it("lines 45-46: syncs non-UUID provider:id session", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "99999", name: "GH User", email: "gh@e.com" } },
      status: "authenticated",
    });
    mockSyncUser.mockResolvedValue({
      id: "synced-uuid",
      email: "gh@e.com",
      name: "GH User",
      provider: "github",
    });

    const { result } = renderHook(() => useUserSync(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.userId).toBe("synced-uuid");
    });
  });
});
