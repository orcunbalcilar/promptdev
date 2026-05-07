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

import { SystemPromptCard } from "@/components/settings/system-prompt-card";
import { updateUserSettings } from "@/lib/user";

const mockedUpdate = vi.mocked(updateUserSettings);

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("SystemPromptCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders card with prompt textarea and save button (line 36: mutation.mutate)", () => {
    // Line 36: the mutation calling updateUserSettings with customSystemPrompt
    const profile = {
      id: "u1",
      email: "test@test.com",
      name: "Test",
      provider: "github",
      bitbucketTokenSet: false,
      copilotTokenSet: false,
      byokApiKeySet: false,
      jiraTokenSet: false,
      customSystemPrompt: "My custom prompt",
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
    renderWithQuery(<SystemPromptCard userId="u1" profile={profile} />);
    expect(screen.getByText("Default System Prompt")).toBeInTheDocument();
    expect(screen.getByDisplayValue("My custom prompt")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Save System Prompt/i }),
    ).toBeInTheDocument();
  });

  it("calls updateUserSettings with customSystemPrompt on save", async () => {
    mockedUpdate.mockResolvedValue({} as never);
    const profile = {
      id: "u1",
      email: "test@test.com",
      name: "Test",
      provider: "github",
      bitbucketTokenSet: false,
      copilotTokenSet: false,
      byokApiKeySet: false,
      jiraTokenSet: false,
      customSystemPrompt: "Test prompt",
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
    renderWithQuery(<SystemPromptCard userId="u1" profile={profile} />);
    await userEvent.click(
      screen.getByRole("button", { name: /Save System Prompt/i }),
    );
    expect(mockedUpdate).toHaveBeenCalledWith("u1", {
      customSystemPrompt: "Test prompt",
    });
  });

  it("handles save error via showErrorToast (branch: mutation.onError)", async () => {
    const { showErrorToast } = await import("@/lib/errors");
    mockedUpdate.mockRejectedValue(new Error("Save error"));
    const profile = {
      id: "u1",
      email: "test@test.com",
      name: "Test",
      provider: "github",
      bitbucketTokenSet: false,
      copilotTokenSet: false,
      byokApiKeySet: false,
      jiraTokenSet: false,
      customSystemPrompt: "",
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
    renderWithQuery(<SystemPromptCard userId="u1" profile={profile} />);
    await userEvent.click(
      screen.getByRole("button", { name: /Save System Prompt/i }),
    );
    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith(
        expect.any(Error),
        "save system prompt",
      );
    });
  });

  it("sends undefined when prompt is empty string (branch: prompt || undefined)", async () => {
    mockedUpdate.mockResolvedValue({} as never);
    const profile = {
      id: "u1",
      email: "test@test.com",
      name: "Test",
      provider: "github",
      bitbucketTokenSet: false,
      copilotTokenSet: false,
      byokApiKeySet: false,
      jiraTokenSet: false,
      customSystemPrompt: undefined as string | undefined,
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
    renderWithQuery(<SystemPromptCard userId="u1" profile={profile} />);
    await userEvent.click(
      screen.getByRole("button", { name: /Save System Prompt/i }),
    );
    expect(mockedUpdate).toHaveBeenCalledWith("u1", {
      customSystemPrompt: undefined,
    });
  });
});
