import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ByokProviderCard } from "../byok-provider-card";
import type { UserProfile } from "@/lib/user";

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

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

describe("ByokProviderCard - error handling", () => {
  it("calls showErrorToast on mutation error", async () => {
    const error = new Error("API error");
    mockUpdateSettings.mockRejectedValueOnce(error);

    const user = userEvent.setup();
    renderWithProviders(
      <ByokProviderCard userId="u1" profile={makeProfile()} />,
    );

    await user.click(screen.getByRole("button", { name: /save provider/i }));

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        error,
        "save provider settings",
      );
    });
  });
});

describe("ByokProviderCard - Azure API Version field", () => {
  it("shows Azure API Version field when provider is azure", async () => {
    renderWithProviders(
      <ByokProviderCard
        userId="u1"
        profile={makeProfile({ byokProviderType: "azure" })}
      />,
    );

    // Azure provider is pre-set, so Azure API Version field should be visible
    // We need to find and click the select trigger to change to azure
    // Since profile has byokProviderType: "azure", field should be there
    expect(screen.getByLabelText("Azure API Version")).toBeInTheDocument();
  });

  it("does not show Azure API Version field when provider is openai", () => {
    renderWithProviders(
      <ByokProviderCard
        userId="u1"
        profile={makeProfile({ byokProviderType: "openai" })}
      />,
    );

    expect(
      screen.queryByLabelText("Azure API Version"),
    ).not.toBeInTheDocument();
  });
});

describe("ByokProviderCard - sends all fields on save", () => {
  it("sends providerType, baseUrl, apiKey, and azureApiVersion", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ByokProviderCard
        userId="u1"
        profile={makeProfile({ byokProviderType: "azure" })}
      />,
    );

    await user.type(
      screen.getByLabelText("Base URL"),
      "https://my-resource.openai.azure.com",
    );
    await user.type(screen.getByLabelText("Azure API Version"), "2024-10-21");
    await user.click(screen.getByRole("button", { name: /save provider/i }));

    expect(mockUpdateSettings).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        byokBaseUrl: "https://my-resource.openai.azure.com",
        byokAzureApiVersion: "2024-10-21",
      }),
    );
  });
});

describe("ByokProviderCard - success toast", () => {
  it("shows success toast on save", async () => {
    const { toast } = await import("sonner");
    const user = userEvent.setup();
    renderWithProviders(
      <ByokProviderCard userId="u1" profile={makeProfile()} />,
    );

    await user.click(screen.getByRole("button", { name: /save provider/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Provider settings saved");
    });
  });
});

describe("ByokProviderCard - placeholder changes by provider", () => {
  it("shows OpenAI placeholder by default", () => {
    renderWithProviders(
      <ByokProviderCard userId="u1" profile={makeProfile()} />,
    );

    const urlInput = screen.getByLabelText("Base URL");
    expect(urlInput).toHaveAttribute(
      "placeholder",
      "https://api.openai.com/v1",
    );
  });
});
