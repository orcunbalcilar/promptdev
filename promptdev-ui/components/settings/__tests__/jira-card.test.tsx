import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JiraCard } from "../jira-card";
import { UserProfile } from "@/lib/user";

const mockUpdateUserSettings = vi.fn();
vi.mock("@/lib/user", () => ({
  updateUserSettings: (...args: unknown[]) => mockUpdateUserSettings(...args),
}));

const mockProfile: UserProfile = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  provider: "github",
  bitbucketTokenSet: false,
  copilotTokenSet: false,
  jiraTokenSet: false,
  jiraUrl: "https://jira.example.com",
  jiraProjectKey: "TEST",
  jiraUsername: "testuser",
  jiraAutoTaskEnabled: true,
  jiraAutoTaskModelId: "gpt-4",
  jiraAutoTaskRepository: "test-repo",
  jiraAutoTaskSourceBranch: "feature/test",
  jiraAutoTaskTargetBranch: "develop",
  jiraAutoTaskPrompt: "Fix this: {{summary}}",
  jiraAutoTaskIterative: false,
  jiraAutoTaskMaxIterations: 5,
  jiraAutoTaskReviewEnabled: false,
  byokApiKeySet: false,
};

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

describe("JiraCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateUserSettings.mockResolvedValue(mockProfile);
  });

  it("should render all fields including new settings", () => {
    renderWithProviders(<JiraCard userId="user-123" profile={mockProfile} />);

    expect(screen.getByLabelText("Jira Server URL")).toHaveValue(
      "https://jira.example.com",
    );
    expect(screen.getByLabelText("Default Project Key")).toHaveValue("TEST");

    // Check new fields
    expect(screen.getByLabelText("Custom Prompt Template")).toHaveValue(
      "Fix this: {{summary}}",
    );
    expect(screen.getByLabelText("Enable Code Review")).not.toBeChecked();
    expect(screen.getByLabelText("Iterative Mode")).not.toBeChecked();

    // Max iterations only shows when iterative mode is enabled
    expect(screen.queryByLabelText("Max Iterations")).not.toBeInTheDocument();
  });

  it("should show max iterations when iterative mode is enabled", async () => {
    const user = userEvent.setup();
    renderWithProviders(<JiraCard userId="user-123" profile={mockProfile} />);

    await user.click(screen.getByLabelText("Iterative Mode"));

    expect(screen.getByLabelText("Max Iterations")).toBeInTheDocument();
    expect(screen.getByLabelText("Max Iterations")).toHaveValue(5);
  });

  it("should save updated settings", async () => {
    const user = userEvent.setup();
    renderWithProviders(<JiraCard userId="user-123" profile={mockProfile} />);

    // Update settings
    await user.click(screen.getByLabelText("Enable Code Review")); // Toggle to true

    const promptInput = screen.getByLabelText("Custom Prompt Template");
    await user.clear(promptInput);
    await user.type(promptInput, "New prompt");

    await user.click(
      screen.getByRole("button", { name: /save jira settings/i }),
    );

    await waitFor(() => {
      expect(mockUpdateUserSettings).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          jiraAutoTaskReviewEnabled: true,
          jiraAutoTaskPrompt: "New prompt",
          jiraAutoTaskIterative: false, // Initial value
        }),
      );
    });
  });
});
