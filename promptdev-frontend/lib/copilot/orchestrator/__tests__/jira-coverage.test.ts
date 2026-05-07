// lib/copilot/orchestrator/__tests__/jira-coverage.test.ts
// Covers: transitionJiraIssue find predicate (line 26), addJiraComment (line 40)
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetTransitions = vi.fn();
const mockTransitionIssue = vi.fn();
const mockAddComment = vi.fn();

vi.mock("@/lib/services/jira-service", () => ({
  getTransitions: (...args: unknown[]) => mockGetTransitions(...args),
  transitionIssue: (...args: unknown[]) => mockTransitionIssue(...args),
  addComment: (...args: unknown[]) => mockAddComment(...args),
}));

import { transitionJiraIssue, addJiraComment } from "../jira";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("transitionJiraIssue", () => {
  it("finds matching transition by name (case-insensitive) and calls transitionIssue", async () => {
    mockGetTransitions.mockResolvedValue({
      transitions: [
        { id: "10", name: "To Do", to: { name: "To Do", id: "1" } },
        { id: "21", name: "In Progress", to: { name: "In Progress", id: "2" } },
        { id: "31", name: "Done", to: { name: "Done", id: "3" } },
      ],
    });
    mockTransitionIssue.mockResolvedValue(undefined);

    await transitionJiraIssue("PROJ-123", "in progress");

    expect(mockGetTransitions).toHaveBeenCalledWith("PROJ-123");
    expect(mockTransitionIssue).toHaveBeenCalledWith("PROJ-123", "21");
  });

  it("does not call transitionIssue when no matching transition found", async () => {
    mockGetTransitions.mockResolvedValue({
      transitions: [
        { id: "10", name: "To Do", to: { name: "To Do", id: "1" } },
        { id: "31", name: "Done", to: { name: "Done", id: "3" } },
      ],
    });

    await transitionJiraIssue("PROJ-123", "In Review");

    expect(mockGetTransitions).toHaveBeenCalledWith("PROJ-123");
    expect(mockTransitionIssue).not.toHaveBeenCalled();
  });

  it("handles partial name match via includes", async () => {
    mockGetTransitions.mockResolvedValue({
      transitions: [
        { id: "50", name: "Move to Done", to: { name: "Done", id: "3" } },
      ],
    });
    mockTransitionIssue.mockResolvedValue(undefined);

    await transitionJiraIssue("PROJ-456", "done");

    expect(mockTransitionIssue).toHaveBeenCalledWith("PROJ-456", "50");
  });

  it("does not throw when getTransitions fails", async () => {
    mockGetTransitions.mockRejectedValue(new Error("Jira unavailable"));

    await expect(
      transitionJiraIssue("PROJ-789", "Done"),
    ).resolves.toBeUndefined();
    expect(mockTransitionIssue).not.toHaveBeenCalled();
  });

  it("does not throw when transitionIssue fails", async () => {
    mockGetTransitions.mockResolvedValue({
      transitions: [{ id: "10", name: "Done", to: { name: "Done", id: "3" } }],
    });
    mockTransitionIssue.mockRejectedValue(new Error("Transition failed"));

    await expect(
      transitionJiraIssue("PROJ-789", "Done"),
    ).resolves.toBeUndefined();
  });

  it("handles null/undefined transitions result gracefully", async () => {
    mockGetTransitions.mockResolvedValue(null);

    await expect(
      transitionJiraIssue("PROJ-100", "Done"),
    ).resolves.toBeUndefined();
  });
});

describe("addJiraComment", () => {
  it("calls jiraService.addComment with issueKey and comment", async () => {
    mockAddComment.mockResolvedValue(undefined);

    await addJiraComment("PROJ-123", "Task completed successfully");

    expect(mockAddComment).toHaveBeenCalledWith(
      "PROJ-123",
      "Task completed successfully",
    );
  });

  it("does not throw when addComment fails", async () => {
    mockAddComment.mockRejectedValue(new Error("Network error"));

    await expect(
      addJiraComment("PROJ-456", "Some comment"),
    ).resolves.toBeUndefined();
  });
});
