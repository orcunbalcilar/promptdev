import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock user lib
vi.mock("@/lib/user", () => ({
  syncUser: vi.fn(),
  getUserProfile: vi.fn(),
}));

import { useBackendUser } from "@/hooks/useBackendUser";
import { useSession } from "next-auth/react";
import { syncUser, getUserProfile } from "@/lib/user";

const mockUseSession = vi.mocked(useSession);
const mockSyncUser = vi.mocked(syncUser);
const mockGetUserProfile = vi.mocked(getUserProfile);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0, gcTime: 0 },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
}

describe("useBackendUser (lines 22, 53)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 'No session available' when session.user.id is missing (line 22)", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: undefined } } as never,
      status: "authenticated",
      update: vi.fn(),
    });

    const { result } = renderHook(() => useBackendUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.error).toBeTruthy();
      },
      { timeout: 5000 },
    );

    expect(result.current.error?.message).toBe("No session available");
  });

  it("throws 'Session missing required user fields' when providerAccountId or email is empty (line 53)", async () => {
    // Non-UUID ID triggers OAuth sync path; empty email triggers the error
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "12345", email: "", name: "Test", image: null },
        expires: "2099-01-01",
      } as never,
      status: "authenticated",
      update: vi.fn(),
    });

    const { result } = renderHook(() => useBackendUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.error).toBeTruthy();
      },
      { timeout: 5000 },
    );

    expect(result.current.error?.message).toBe(
      "Session missing required user fields (id, email)",
    );
  });

  it("falls back to syncUser when getUserProfile fails for UUID session", async () => {
    const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    mockUseSession.mockReturnValue({
      data: {
        user: { id: uuid, email: "test@test.com", name: "Test", image: null },
        expires: "2099-01-01",
      } as never,
      status: "authenticated",
      update: vi.fn(),
    });

    mockGetUserProfile.mockRejectedValue(new Error("User deleted"));
    mockSyncUser.mockResolvedValue({
      id: uuid,
      email: "test@test.com",
      name: "Test",
    } as never);

    const { result } = renderHook(() => useBackendUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.userId).toBe(uuid);
    });

    expect(mockGetUserProfile).toHaveBeenCalledWith(uuid);
    expect(mockSyncUser).toHaveBeenCalled();
  });

  // ── Branch coverage: successful UUID profile fetch path ──

  it("returns profile directly when UUID user exists", async () => {
    const uuid = "b2c3d4e5-f6a7-8901-bcde-f12345678901";
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: uuid,
          email: "existing@test.com",
          name: "Existing",
          image: null,
        },
        expires: "2099-01-01",
      } as never,
      status: "authenticated",
      update: vi.fn(),
    });

    mockGetUserProfile.mockResolvedValue({
      id: uuid,
      email: "existing@test.com",
      name: "Existing",
    } as never);

    const { result } = renderHook(() => useBackendUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.userId).toBe(uuid);
    });

    expect(mockGetUserProfile).toHaveBeenCalledWith(uuid);
    expect(mockSyncUser).not.toHaveBeenCalled();
  });

  // ── Branch coverage: OAuth sync (non-UUID session) ────────

  it("syncs via OAuth when session ID is not a UUID", async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "67890",
          email: "oauth@test.com",
          name: "OAuth User",
          image: "https://avatar.com",
        },
        expires: "2099-01-01",
      } as never,
      status: "authenticated",
      update: vi.fn(),
    });

    mockSyncUser.mockResolvedValue({
      id: "synced-uuid",
      email: "oauth@test.com",
      name: "OAuth User",
    } as never);

    const { result } = renderHook(() => useBackendUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.userId).toBe("synced-uuid");
    });

    expect(mockSyncUser).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "github",
        providerAccountId: "67890",
        email: "oauth@test.com",
        name: "OAuth User",
        avatarUrl: "https://avatar.com",
      }),
    );
  });

  // ── Branch coverage: unauthenticated/loading states ───────

  it("returns loading state when status is 'loading'", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    });

    const { result } = renderHook(() => useBackendUser(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.userId).toBeUndefined();
  });

  it("returns not authenticated when status is 'unauthenticated'", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    const { result } = renderHook(() => useBackendUser(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.userId).toBeUndefined();
  });
});
