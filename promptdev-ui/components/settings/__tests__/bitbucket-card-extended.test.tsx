import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BitbucketCard } from "../bitbucket-card";
import type { UserProfile } from "@/lib/user";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockUpdateSettings = vi.fn();
vi.mock("@/lib/user", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    updateUserSettings: (...args: unknown[]) => mockUpdateSettings(...args),
  };
});

const mockShowErrorToast = vi.fn();
vi.mock("@/lib/errors", () => ({
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}));

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "u1",
    email: "test@test.com",
    name: "Test",
    provider: "github",
    bitbucketTokenSet: false,
    copilotTokenSet: false,
    byokApiKeySet: false,
    jiraTokenSet: false,
    jiraAutoTaskEnabled: false,
    ...overrides,
  };
}

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

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateSettings.mockResolvedValue({});
});

describe("BitbucketCard - error handling", () => {
  it("calls showErrorToast on mutation error", async () => {
    const error = new Error("Network error");
    mockUpdateSettings.mockRejectedValueOnce(error);

    const user = userEvent.setup();
    renderWithProviders(<BitbucketCard userId="u1" profile={makeProfile()} />);

    await user.click(screen.getByRole("button", { name: /save bitbucket/i }));

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        error,
        "save Bitbucket settings",
      );
    });
  });
});

describe("BitbucketCard - shows token set indicator", () => {
  it("shows Set badge when token is set", () => {
    renderWithProviders(
      <BitbucketCard
        userId="u1"
        profile={makeProfile({ bitbucketTokenSet: true })}
      />,
    );

    expect(screen.getByText("Set")).toBeInTheDocument();
  });
});

describe("BitbucketCard - sends all fields on save", () => {
  it("sends all four Bitbucket fields", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BitbucketCard userId="u1" profile={makeProfile()} />);

    await user.type(
      screen.getByLabelText("Bitbucket Server URL"),
      "https://bb.co",
    );
    await user.type(screen.getByLabelText(/default project key/i), "PRJ");
    await user.type(screen.getByLabelText("Username"), "admin");
    await user.click(screen.getByRole("button", { name: /save bitbucket/i }));

    expect(mockUpdateSettings).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        bitbucketUrl: "https://bb.co",
        bitbucketProjectKey: "PRJ",
        bitbucketUsername: "admin",
      }),
    );
  });
});

describe("BitbucketCard - success toast and token reset", () => {
  it("shows success toast and resets token field on save", async () => {
    const { toast } = await import("sonner");
    const user = userEvent.setup();
    renderWithProviders(<BitbucketCard userId="u1" profile={makeProfile()} />);

    await user.click(screen.getByRole("button", { name: /save bitbucket/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Bitbucket settings saved");
    });
  });
});
