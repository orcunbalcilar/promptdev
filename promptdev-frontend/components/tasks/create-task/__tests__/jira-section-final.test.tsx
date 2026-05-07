import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/jira", () => ({
  getJiraIssue: vi.fn(),
}));

const mockSetTitle = vi.fn();
const mockSetPrompt = vi.fn();
const mockSetIterative = vi.fn();
const mockSetMaxIterations = vi.fn();

vi.mock("@/components/tasks/create-task/_form-context", () => ({
  useTaskForm: () => ({
    title: "",
    setTitle: mockSetTitle,
    prompt: "",
    setPrompt: mockSetPrompt,
    jiraIssueKey: "PROJ-123",
    setJiraIssueKey: vi.fn(),
    setIterative: mockSetIterative,
    setMaxIterations: mockSetMaxIterations,
  }),
}));

import { JiraSection } from "@/components/tasks/create-task/jira-section";
import { getJiraIssue } from "@/lib/jira";

const mockedGetJira = vi.mocked(getJiraIssue);

describe("JiraSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches and populates title/prompt on success (lines 72-73)", async () => {
    // Lines 72-73: setTitle and setPrompt after successful fetch
    mockedGetJira.mockResolvedValue({
      key: "PROJ-123",
      self: "https://jira.example.com/rest/api/2/issue/PROJ-123",
      fields: {
        summary: "Fix the login bug",
        description: "Users cannot log in after password reset",
        status: { name: "Open" },
        issuetype: { name: "Bug" },
        priority: { name: "High" },
      },
    });

    render(<JiraSection />);

    await userEvent.click(
      screen.getByRole("button", { name: /Fetch & Triage/i }),
    );

    await waitFor(() => {
      expect(mockSetTitle).toHaveBeenCalledWith(
        "[PROJ-123] Fix the login bug",
      );
    });
    expect(mockSetPrompt).toHaveBeenCalledWith(
      expect.stringContaining("Fix the login bug"),
    );
    expect(mockSetIterative).toHaveBeenCalledWith(true);
    expect(mockSetMaxIterations).toHaveBeenCalledWith(1);
  });

  it("shows error on fetch failure", async () => {
    mockedGetJira.mockRejectedValue(new Error("Not found"));
    render(<JiraSection />);

    await userEvent.click(
      screen.getByRole("button", { name: /Fetch & Triage/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Not found")).toBeInTheDocument();
    });
  });
});
