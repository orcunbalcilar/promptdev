import { renderHook, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useBackendUser } from "../useBackendUser";
import * as userLib from "@/lib/user";

// Mock next-auth
vi.mock("next-auth/react");

// Mock user lib
vi.mock("@/lib/user");

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  });

  function TestQueryProvider({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return TestQueryProvider;
};

describe("useBackendUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should sync user with backend after authentication", async () => {
    const mockSession = {
      user: {
        id: "oauth-provider-id-123",
        email: "test@example.com",
        name: "Test User",
        image: "https://avatar.url/image.png",
        provider: "github",
      },
      expires: "2099-12-31T23:59:59.999Z",
    };

    const mockBackendProfile = {
      id: "db-uuid-456",
      email: "test@example.com",
      name: "Test User",
      avatarUrl: "https://avatar.url/image.png",
      provider: "github",
      bitbucketTokenSet: false,
      copilotTokenSet: false,
      byokApiKeySet: false,
    };

    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: vi.fn(),
    });

    vi.mocked(userLib.syncUser).mockResolvedValue(mockBackendProfile);

    const { result } = renderHook(() => useBackendUser(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for the sync to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify syncUser was called with correct parameters
    expect(userLib.syncUser).toHaveBeenCalledWith({
      provider: "github",
      providerAccountId: "oauth-provider-id-123",
      email: "test@example.com",
      name: "Test User",
      avatarUrl: "https://avatar.url/image.png",
    });

    // Verify we got the database user ID
    expect(result.current.userId).toBe("db-uuid-456");
    expect(result.current.profile).toEqual(mockBackendProfile);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("should not sync when not authenticated", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    const { result } = renderHook(() => useBackendUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(userLib.syncUser).not.toHaveBeenCalled();
    expect(result.current.userId).toBeUndefined();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("should handle sync errors and not provide userId", async () => {
    const mockSession = {
      user: {
        id: "oauth-provider-id-123",
        email: "test@example.com",
        name: "Test User",
        provider: "github",
      },
      expires: "2099-12-31T23:59:59.999Z",
    };

    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: vi.fn(),
    });

    const syncError = new Error("Backend sync failed");
    vi.mocked(userLib.syncUser).mockRejectedValue(syncError);

    const { result } = renderHook(() => useBackendUser(), {
      wrapper: createWrapper(),
    });

    // Initially no userId
    expect(result.current.userId).toBeUndefined();

    // Verify syncUser was called
    await waitFor(() => {
      expect(userLib.syncUser).toHaveBeenCalled();
    });

    // userId should remain undefined after error
    expect(result.current.userId).toBeUndefined();
  });

  it("should use default provider when not specified", async () => {
    const mockSession = {
      user: {
        id: "oauth-provider-id-123",
        email: "test@example.com",
        name: "Test User",
        // No provider specified
      },
      expires: "2099-12-31T23:59:59.999Z",
    };

    const mockBackendProfile = {
      id: "db-uuid-456",
      email: "test@example.com",
      name: "Test User",
      provider: "github",
      bitbucketTokenSet: false,
      copilotTokenSet: false,
      byokApiKeySet: false,
    };

    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: vi.fn(),
    });

    vi.mocked(userLib.syncUser).mockResolvedValue(mockBackendProfile);

    const { result } = renderHook(() => useBackendUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should default to "github"
    expect(userLib.syncUser).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "github",
      }),
    );
  });

  it("should handle loading state", () => {
    vi.mocked(useSession).mockReturnValue({
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

  it("should fetch user profile directly if session ID is a UUID", async () => {
    const mockUuid = "123e4567-e89b-12d3-a456-426614174000";
    const mockSession = {
      user: {
        id: mockUuid,
        email: "test@example.com",
        name: "Test User",
        image: "https://avatar.url/image.png",
        provider: "github",
      },
      expires: "2099-12-31T23:59:59.999Z",
    };

    const mockBackendProfile = {
      id: mockUuid,
      email: "test@example.com",
      name: "Test User",
      avatarUrl: "https://avatar.url/image.png",
      provider: "github",
      bitbucketTokenSet: false,
      copilotTokenSet: false,
      byokApiKeySet: false,
    };

    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: vi.fn(),
    });

    // Mock getUserProfile instead of syncUser
    vi.mocked(userLib.getUserProfile).mockResolvedValue(mockBackendProfile);

    const { result } = renderHook(() => useBackendUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify getUserProfile was called with the UUID
    expect(userLib.getUserProfile).toHaveBeenCalledWith(mockUuid);

    // syncUser should NOT be called
    expect(userLib.syncUser).not.toHaveBeenCalled();

    expect(result.current.userId).toBe(mockUuid);
    expect(result.current.profile).toEqual(mockBackendProfile);
  });
});
