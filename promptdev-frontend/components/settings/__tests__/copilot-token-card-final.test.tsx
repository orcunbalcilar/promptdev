import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/user", () => ({
  updateUserSettings: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/errors", () => ({
  showErrorToast: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { CopilotTokenCard } from "@/components/settings/copilot-token-card";
import { updateUserSettings } from "@/lib/user";

const mockedUpdate = vi.mocked(updateUserSettings);

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("CopilotTokenCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders card with token input and save button (line 34: mutation.mutate)", () => {
    // Line 34: the mutation that calls updateUserSettings with copilotToken
    const profile = {
      id: "u1",
      email: "test@test.com",
      name: "Test",
      provider: "github",
      bitbucketTokenSet: false,
      copilotTokenSet: false,
      byokApiKeySet: false,
      jiraTokenSet: false,
      customSystemPrompt: undefined,
      jiraUrl: undefined,
      jiraProjectKey: undefined,
      jiraUsername: undefined,
      jiraAutoTaskEnabled: false,
      jiraAutoTaskModelId: undefined,
      jiraAutoTaskRepository: undefined,
      jiraAutoTaskSourceBranch: undefined,
      jiraAutoTaskTargetBranch: undefined,
      jiraAutoTaskPrompt: undefined,
      jiraAutoTaskIterative: false,
      jiraAutoTaskMaxIterations: 1,
      jiraAutoTaskReviewEnabled: true,
    };
    renderWithQuery(<CopilotTokenCard userId="u1" profile={profile} />);
    expect(screen.getByText("GitHub Copilot Token")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Save Copilot Token/i }),
    ).toBeInTheDocument();
  });

  it("calls updateUserSettings with copilotToken on save", async () => {
    mockedUpdate.mockResolvedValue({} as never);
    const profile = {
      id: "u1",
      email: "test@test.com",
      name: "Test",
      provider: "github",
      bitbucketTokenSet: false,
      copilotTokenSet: true,
      byokApiKeySet: false,
      jiraTokenSet: false,
      customSystemPrompt: undefined,
      jiraUrl: undefined,
      jiraProjectKey: undefined,
      jiraUsername: undefined,
      jiraAutoTaskEnabled: false,
      jiraAutoTaskModelId: undefined,
      jiraAutoTaskRepository: undefined,
      jiraAutoTaskSourceBranch: undefined,
      jiraAutoTaskTargetBranch: undefined,
      jiraAutoTaskPrompt: undefined,
      jiraAutoTaskIterative: false,
      jiraAutoTaskMaxIterations: 1,
      jiraAutoTaskReviewEnabled: true,
    };
    renderWithQuery(<CopilotTokenCard userId="u1" profile={profile} />);
    await userEvent.click(
      screen.getByRole("button", { name: /Save Copilot Token/i }),
    );
    expect(mockedUpdate).toHaveBeenCalledWith("u1", {
      copilotToken: undefined,
    });
  });

  it("handles save error via showErrorToast (branch: mutation.onError)", async () => {
    const { showErrorToast } = await import("@/lib/errors");
    mockedUpdate.mockRejectedValue(new Error("Token save error"));
    const profile = {
      id: "u1",
      email: "test@test.com",
      name: "Test",
      provider: "github",
      bitbucketTokenSet: false,
      copilotTokenSet: false,
      byokApiKeySet: false,
      jiraTokenSet: false,
      customSystemPrompt: undefined,
      jiraUrl: undefined,
      jiraProjectKey: undefined,
      jiraUsername: undefined,
      jiraAutoTaskEnabled: false,
      jiraAutoTaskModelId: undefined,
      jiraAutoTaskRepository: undefined,
      jiraAutoTaskSourceBranch: undefined,
      jiraAutoTaskTargetBranch: undefined,
      jiraAutoTaskPrompt: undefined,
      jiraAutoTaskIterative: false,
      jiraAutoTaskMaxIterations: 1,
      jiraAutoTaskReviewEnabled: true,
    };
    renderWithQuery(<CopilotTokenCard userId="u1" profile={profile} />);
    await userEvent.click(
      screen.getByRole("button", { name: /Save Copilot Token/i }),
    );
    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith(
        expect.any(Error),
        "save Copilot token",
      );
    });
  });
});
