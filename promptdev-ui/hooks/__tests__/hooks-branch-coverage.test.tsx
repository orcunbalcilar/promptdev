/**
 * Branch coverage for hooks
 * Targets:
 * - useBackendUser.ts lines 28, 47-48: session.user.id fallbacks, provider fallback
 * - useUserSync.ts lines 28, 45-46: same patterns
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockGetUserProfile = vi.fn();
const mockSyncUser = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/lib/user", () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
  syncUser: (...args: unknown[]) => mockSyncUser(...args),
}));

import { useSession } from "next-auth/react";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useBackendUser.ts branch coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lines 28, 47-48: falls back through non-UUID path with provider fallback", async () => {
    // session.user.id is a GitHub numeric ID (not UUID) → triggers sync path
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: "12345",
          email: "test@test.com",
          name: "Test",
          image: null,
        },
        expires: "",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const profile = {
      id: "uuid-1",
      name: "Test",
      email: "test@test.com",
      provider: "github",
    };
    mockSyncUser.mockResolvedValue(profile);

    const { useBackendUser } = await import("@/hooks/useBackendUser");
    const { result } = renderHook(() => useBackendUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.profile).toBeDefined());
    expect(mockSyncUser).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "github", // line 47-48: fallback
        providerAccountId: "12345",
      }),
    );
  });

  it("line 28: uses empty string when session.user.id is falsy", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: "", email: "test@test.com", name: null, image: undefined },
        expires: "",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    // Should throw because providerAccountId and email checks fail
    const { useBackendUser } = await import("@/hooks/useBackendUser");
    const { result } = renderHook(() => useBackendUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBeDefined());
  });

  it("handles UUID session ID with failed profile fetch → falls back to sync", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: "12345678-1234-1234-1234-123456789abc",
          email: "test@test.com",
          name: "Test",
          image: null,
        },
        expires: "",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    mockGetUserProfile.mockRejectedValueOnce(new Error("Not found"));
    const profile = {
      id: "uuid-2",
      name: "Test",
      email: "test@test.com",
      provider: "github",
    };
    mockSyncUser.mockResolvedValue(profile);

    const { useBackendUser } = await import("@/hooks/useBackendUser");
    const { result } = renderHook(() => useBackendUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.profile).toBeDefined());
    expect(mockGetUserProfile).toHaveBeenCalled();
    expect(mockSyncUser).toHaveBeenCalled();
  });
});

describe("useUserSync.ts branch coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lines 28, 45-46: falls back through non-UUID path with provider fallback", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: "67890",
          email: "sync@test.com",
          name: "Sync",
          image: null,
        },
        expires: "",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const profile = {
      id: "uuid-3",
      name: "Sync",
      email: "sync@test.com",
      provider: "github",
    };
    mockSyncUser.mockResolvedValue(profile);

    const { useUserSync } = await import("@/hooks/useUserSync");
    const { result } = renderHook(() => useUserSync(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.profile).toBeDefined());
    expect(mockSyncUser).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "github",
        providerAccountId: "67890",
      }),
    );
  });

  it("line 28: handles empty user.id string", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: "", email: "x@x.com", name: undefined, image: undefined },
        expires: "",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const { useUserSync } = await import("@/hooks/useUserSync");
    const { result } = renderHook(() => useUserSync(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBeDefined());
  });
});
