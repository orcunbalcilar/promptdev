import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

vi.mock("@/lib/errors", () => ({
  showErrorToast: vi.fn(),
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
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateSettings.mockResolvedValue({});
});

describe("BitbucketCard", () => {
  it("renders the card title", () => {
    renderWithProviders(<BitbucketCard userId="u1" profile={makeProfile()} />);
    expect(screen.getByText("Bitbucket Configuration")).toBeInTheDocument();
  });

  it("renders input fields", () => {
    renderWithProviders(<BitbucketCard userId="u1" profile={makeProfile()} />);
    expect(screen.getByLabelText("Bitbucket Server URL")).toBeInTheDocument();
    expect(screen.getByLabelText(/default project key/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
  });

  it("pre-fills values from profile", () => {
    renderWithProviders(
      <BitbucketCard
        userId="u1"
        profile={makeProfile({
          bitbucketUrl: "https://bb.example.com",
          bitbucketProjectKey: "PRJ",
          bitbucketUsername: "jdoe",
        })}
      />,
    );
    expect(screen.getByLabelText("Bitbucket Server URL")).toHaveValue(
      "https://bb.example.com",
    );
    expect(screen.getByLabelText(/default project key/i)).toHaveValue("PRJ");
    expect(screen.getByLabelText("Username")).toHaveValue("jdoe");
  });

  it("calls updateUserSettings on save", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BitbucketCard userId="u1" profile={makeProfile()} />);

    await user.type(
      screen.getByLabelText("Bitbucket Server URL"),
      "https://bb.co",
    );
    await user.click(screen.getByRole("button", { name: /save bitbucket/i }));

    expect(mockUpdateSettings).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        bitbucketUrl: "https://bb.co",
      }),
    );
  });

  it("shows save button", () => {
    renderWithProviders(<BitbucketCard userId="u1" profile={makeProfile()} />);
    expect(
      screen.getByRole("button", { name: /save bitbucket/i }),
    ).toBeInTheDocument();
  });
});
