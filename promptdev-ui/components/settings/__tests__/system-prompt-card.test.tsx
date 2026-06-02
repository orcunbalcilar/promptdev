import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SystemPromptCard } from "../system-prompt-card";
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

describe("SystemPromptCard", () => {
  it("renders the card title", () => {
    renderWithProviders(
      <SystemPromptCard userId="u1" profile={makeProfile()} />,
    );
    expect(screen.getByText("Default System Prompt")).toBeInTheDocument();
  });

  it("renders textarea", () => {
    renderWithProviders(
      <SystemPromptCard userId="u1" profile={makeProfile()} />,
    );
    expect(screen.getByLabelText("System Prompt")).toBeInTheDocument();
  });

  it("pre-fills from profile", () => {
    renderWithProviders(
      <SystemPromptCard
        userId="u1"
        profile={makeProfile({ customSystemPrompt: "You are a helpful bot" })}
      />,
    );
    expect(screen.getByLabelText("System Prompt")).toHaveValue(
      "You are a helpful bot",
    );
  });

  it("calls updateUserSettings on save", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SystemPromptCard userId="u1" profile={makeProfile()} />,
    );

    await user.type(screen.getByLabelText("System Prompt"), "Be concise");
    await user.click(
      screen.getByRole("button", { name: /save system prompt/i }),
    );

    expect(mockUpdateSettings).toHaveBeenCalledWith("u1", {
      customSystemPrompt: "Be concise",
    });
  });

  it("shows save button", () => {
    renderWithProviders(
      <SystemPromptCard userId="u1" profile={makeProfile()} />,
    );
    expect(
      screen.getByRole("button", { name: /save system prompt/i }),
    ).toBeInTheDocument();
  });

  it("renders description text", () => {
    renderWithProviders(
      <SystemPromptCard userId="u1" profile={makeProfile()} />,
    );
    expect(screen.getByText(/custom system prompt/i)).toBeInTheDocument();
  });
});
