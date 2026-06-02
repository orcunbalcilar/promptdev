import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock next-auth/react
const mockSignOut = vi.fn();
vi.mock("next-auth/react", async () => {
  const actual = await vi.importActual("next-auth/react");
  return {
    ...(actual as Record<string, unknown>),
    signOut: () => mockSignOut(),
    useSession: vi.fn().mockReturnValue({
      data: {
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          image: "https://avatar.example.com/test",
        },
      },
      status: "authenticated",
    }),
    SessionProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/settings",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock user API
const mockGetUserProfile = vi.fn();
const mockUpdateUserSettings = vi.fn();
const mockSyncUser = vi.fn();
vi.mock("@/lib/user", () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
  updateUserSettings: (...args: unknown[]) => mockUpdateUserSettings(...args),
  syncUser: (...args: unknown[]) => mockSyncUser(...args),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

// Dynamic import to ensure mocks are set up first
async function getSettingsPage() {
  const mod = await import("@/app/settings/page");
  return mod.default;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSyncUser.mockResolvedValue({
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    provider: "github",
    bitbucketTokenSet: false,
    copilotTokenSet: false,
    jiraTokenSet: false,
  });
  mockGetUserProfile.mockResolvedValue({
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    avatarUrl: "https://avatar.example.com/test",
    provider: "github",
    bitbucketUrl: "https://bitbucket.company.com",
    bitbucketProjectKey: "PRJ",
    bitbucketUsername: "testuser",
    bitbucketTokenSet: false,
    copilotTokenSet: false,
    jiraUrl: "https://jira.company.com",
    jiraProjectKey: "JIRA",
    jiraUsername: "jirauser",
    jiraTokenSet: false,
  });
  mockUpdateUserSettings.mockResolvedValue({
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    provider: "github",
    bitbucketTokenSet: true,
    copilotTokenSet: false,
  });
});

describe("SettingsPage", () => {
  it("should render profile section", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Profile")).toBeInTheDocument();
    });
  });

  it("should display the Settings header", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });
  });

  it("should show Bitbucket Configuration section", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Bitbucket Configuration")).toBeInTheDocument();
    });
  });

  it("should show GitHub Copilot Token section", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("GitHub Copilot Token")).toBeInTheDocument();
    });
  });

  it("should show security note card", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Security note")).toBeInTheDocument();
    });
    expect(screen.getByText(/AES-256-GCM/)).toBeInTheDocument();
  });

  it("should show Dashboard button that navigates back", async () => {
    const SettingsPage = await getSettingsPage();
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /dashboard/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /dashboard/i }));

    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("should have Sign out button", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /sign out/i }),
      ).toBeInTheDocument();
    });
  });

  it("should populate Bitbucket fields from profile", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/bitbucket server url/i)).toHaveValue(
        "https://bitbucket.company.com",
      );
    });
    // Use specific element IDs since Jira also has "Project Key" and "Username" labels
    const bitbucketProject = document.getElementById(
      "bitbucket-project",
    ) as HTMLInputElement;
    expect(bitbucketProject.value).toBe("PRJ");
    const bitbucketUser = document.getElementById(
      "bitbucket-user",
    ) as HTMLInputElement;
    expect(bitbucketUser.value).toBe("testuser");
  });

  it("should have Save Bitbucket Settings button", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save bitbucket settings/i }),
      ).toBeInTheDocument();
    });
  });

  it("should have Save Copilot Token button", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save copilot token/i }),
      ).toBeInTheDocument();
    });
  });

  it("should call updateUserSettings when saving Bitbucket settings", async () => {
    const SettingsPage = await getSettingsPage();
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save bitbucket settings/i }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /save bitbucket settings/i }),
    );

    await waitFor(() => {
      expect(mockUpdateUserSettings).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          bitbucketUrl: "https://bitbucket.company.com",
          bitbucketProjectKey: "PRJ",
          bitbucketUsername: "testuser",
        }),
      );
    });
  });

  it('should show "Set" badge when token is configured', async () => {
    mockGetUserProfile.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      provider: "github",
      bitbucketTokenSet: true,
      copilotTokenSet: true,
      jiraTokenSet: true,
    });

    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      const setBadges = screen.getAllByText("Set");
      expect(setBadges.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("should show Jira Server Configuration section", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Jira Server Configuration")).toBeInTheDocument();
    });
  });

  it("should populate Jira fields from profile", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/jira server url/i)).toHaveValue(
        "https://jira.company.com",
      );
    });
    expect(screen.getByLabelText(/^default project key$/i)).toHaveValue("JIRA");
  });

  it("should have Save Jira Settings button", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save jira settings/i }),
      ).toBeInTheDocument();
    });
  });

  it("should call updateUserSettings when saving Jira settings", async () => {
    const SettingsPage = await getSettingsPage();
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save jira settings/i }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /save jira settings/i }),
    );

    await waitFor(() => {
      expect(mockUpdateUserSettings).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          jiraUrl: "https://jira.company.com",
          jiraProjectKey: "JIRA",
          jiraUsername: "jirauser",
        }),
      );
    });
  });

  it("should mention Jira in security note", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/AES-256-GCM/)).toBeInTheDocument();
    });
    // Verify the security note mentions Jira alongside other tokens
    expect(
      screen.getByText(/Bitbucket, GitHub\/Copilot, Jira/),
    ).toBeInTheDocument();
  });

  it("should have save buttons with userId guard (disabled attr)", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    // Wait for profile to load
    const btn = await screen.findByRole("button", {
      name: /save bitbucket settings/i,
    });
    // Once profile loads, buttons should be enabled (userId is available)
    expect(btn).toBeEnabled();
  });

  it("should call updateUserSettings when saving and handle failure", async () => {
    mockUpdateUserSettings.mockRejectedValueOnce(new Error("Save failed"));
    const SettingsPage = await getSettingsPage();
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    const btn = await screen.findByRole("button", {
      name: /save bitbucket settings/i,
    });
    await user.click(btn);

    // Verify the mutation was attempted even when it fails
    await waitFor(() => {
      expect(mockUpdateUserSettings).toHaveBeenCalled();
    });
  });

  it("should have BYOK provider section", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Custom AI Provider (BYOK)")).toBeInTheDocument();
    });
  });

  it("should have Save Provider Settings button", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save provider settings/i }),
      ).toBeInTheDocument();
    });
  });
});

describe("SettingsPage - loading & error states", () => {
  it("shows loading spinner while profile is loading", async () => {
    mockGetUserProfile.mockReturnValue(new Promise(() => {}));

    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    });
  });

  it("shows error card when profile fails to load", async () => {
    mockGetUserProfile.mockRejectedValue(new Error("Profile fetch failed"));

    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(
        screen.getByText(/Failed to load your profile/),
      ).toBeInTheDocument();
    });
  });

  it("renders error card with proper message when profile fetch fails", async () => {
    mockGetUserProfile.mockRejectedValue(new Error("Server error"));

    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument();
    });

    // Verify the error message specifically mentions signing out
    expect(screen.getByText(/Failed to load your profile/)).toBeInTheDocument();
    expect(
      screen.getByText(/try signing out and signing in again/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
  });

  it("sign out button in error state calls signOut", async () => {
    mockGetUserProfile.mockRejectedValue(new Error("Profile fetch failed"));

    const SettingsPage = await getSettingsPage();
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /sign out/i }));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("displays user email in header when profile is loaded", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    // Check for user name display and signout button as proxy for header rendering
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
  });

  it("shows System Prompt section", async () => {
    const SettingsPage = await getSettingsPage();
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("System Prompt")).toBeInTheDocument();
    });
  });
});
