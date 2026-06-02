import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock ResizeObserver for Radix UI
globalThis.ResizeObserver = class ResizeObserver {
  observe() {
    /* noop */
  }
  unobserve() {
    /* noop */
  }
  disconnect() {
    /* noop */
  }
} as unknown as typeof ResizeObserver;

vi.mock("@/lib/user", () => ({
  updateUserSettings: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/errors", () => ({
  showErrorToast: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { JiraCard } from "@/components/settings/jira-card";
import { updateUserSettings } from "@/lib/user";

const mockedUpdate = vi.mocked(updateUserSettings);

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const baseProfile = {
  id: "u1",
  email: "test@test.com",
  name: "Test",
  provider: "github",
  bitbucketTokenSet: false,
  copilotTokenSet: false,
  byokApiKeySet: false,
  jiraTokenSet: false,
  customSystemPrompt: undefined as string | undefined,
  jiraUrl: "https://jira.example.com",
  jiraProjectKey: "PROJ",
  jiraUsername: "user1",
  jiraAutoTaskEnabled: true,
  jiraAutoTaskModelId: "gpt-4",
  jiraAutoTaskRepository: "my-repo",
  jiraAutoTaskSourceBranch: "develop",
  jiraAutoTaskTargetBranch: "main",
  jiraAutoTaskPrompt: "auto prompt",
  jiraAutoTaskIterative: true,
  jiraAutoTaskMaxIterations: 5,
  jiraAutoTaskReviewEnabled: true,
};

describe("JiraCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders Jira settings fields (line 125: auto-task enabled section)", () => {
    // Line 125: autoTaskEnabled && renders the auto-task configuration grid
    renderWithQuery(<JiraCard userId="u1" profile={baseProfile} />);
    expect(screen.getByText("Jira Server Configuration")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("https://jira.example.com"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("PROJ")).toBeInTheDocument();
    expect(screen.getByText("Auto-Task Creation")).toBeInTheDocument();
    // Auto-task fields visible when enabled
    expect(screen.getByDisplayValue("my-repo")).toBeInTheDocument();
  });

  it("calls updateUserSettings with all jira fields on save (line 183)", async () => {
    // Line 183: the mutation mutate call
    mockedUpdate.mockResolvedValue({} as never);
    renderWithQuery(<JiraCard userId="u1" profile={baseProfile} />);

    const saveButtons = screen.getAllByRole("button", {
      name: /Save Jira Settings/i,
    });
    await userEvent.click(saveButtons[0]);

    expect(mockedUpdate).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        jiraUrl: "https://jira.example.com",
        jiraProjectKey: "PROJ",
        jiraUsername: "user1",
        jiraAutoTaskEnabled: true,
      }),
    );
  });

  it("hides auto-task section when autoTaskEnabled is false (branch: !autoTaskEnabled)", () => {
    const profile = { ...baseProfile, jiraAutoTaskEnabled: false };
    renderWithQuery(<JiraCard userId="u1" profile={profile} />);
    expect(screen.getByText("Auto-Task Creation")).toBeInTheDocument();
    // Auto-task detail fields should NOT be visible
    expect(screen.queryByDisplayValue("my-repo")).not.toBeInTheDocument();
  });

  it("handles save error via showErrorToast (branch: onError)", async () => {
    const { showErrorToast } = await import("@/lib/errors");
    mockedUpdate.mockRejectedValue(new Error("Save failed"));
    renderWithQuery(<JiraCard userId="u1" profile={baseProfile} />);

    const saveButtons = screen.getAllByRole("button", {
      name: /Save Jira Settings/i,
    });
    await userEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith(
        expect.any(Error),
        "save Jira settings",
      );
    });
  });
});
