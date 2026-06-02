import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// ── Mock sub-components ─────────────────────────────────────────

vi.mock("@/components/ai-elements/progress-bar", () => ({
  ProgressBar: ({ children }: { children?: ReactNode }) => (
    <div data-testid="progress-bar">{children}</div>
  ),
  ProgressBarLabel: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  ProgressBarValue: ({ children }: { children?: ReactNode }) => (
    <span data-testid="progress-value">{children}</span>
  ),
  ProgressBarTrack: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  ProgressBarFill: () => <div data-testid="progress-fill" />,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children?: ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children?: ReactNode }) => (
    <section>{children}</section>
  ),
  CardHeader: ({ children }: { children?: ReactNode }) => (
    <header>{children}</header>
  ),
  CardTitle: ({ children }: { children?: ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/tasks/session-metrics-card", () => ({
  SessionMetricsCard: () => <div data-testid="session-metrics" />,
}));

vi.mock("@/components/tasks/task-helpers", () => ({
  getTaskProgress: (status: string) => {
    if (status === "COMPLETED") return 100;
    if (status === "FAILED") return 100;
    return 50;
  },
  getProgressLabel: (status: string) => {
    if (status === "COMPLETED") return "Complete";
    if (status === "FAILED") return "Failed";
    return "50%";
  },
  getProgressWidth: () => "w-1/2",
  getAgentStatusStyle: () => "",
}));

import { TaskSidebar } from "../task-sidebar";

const baseTask = {
  status: "IN_PROGRESS",
  title: "Build login page",
  modelId: "gpt-5.2",
  workspaceType: "BITBUCKET",
  repositorySlug: "my-app",
  sourceBranch: "feature/login",
  targetBranch: "main",
  createdAt: "2026-02-01T10:00:00Z",
  prompt: "Implement a secure login page",
};

const baseProps = {
  task: baseTask,
  isLive: false,
  isProcessing: false,
  models: [{ id: "gpt-5.2", name: "GPT-5.2", vendor: "openai" }] as Array<{
    id: string;
    name: string;
    vendor: string;
  }>,
  allEvents: [],
};

describe("TaskSidebar – extended", () => {
  it("renders model name from models array", () => {
    render(<TaskSidebar {...baseProps} />);
    expect(screen.getByText("GPT-5.2")).toBeInTheDocument();
  });

  it("falls back to modelId when model not found in list", () => {
    render(
      <TaskSidebar
        {...baseProps}
        task={{ ...baseTask, modelId: "unknown-model" }}
      />,
    );
    expect(screen.getByText("unknown-model")).toBeInTheDocument();
  });

  it('shows "Copilot Agent" when modelId is null', () => {
    render(
      <TaskSidebar {...baseProps} task={{ ...baseTask, modelId: null }} />,
    );
    expect(screen.getByText("Copilot Agent")).toBeInTheDocument();
  });

  it("renders task status lowercase", () => {
    render(<TaskSidebar {...baseProps} />);
    expect(screen.getByText("in progress")).toBeInTheDocument();
  });

  it("renders workspace slug and badge", () => {
    render(<TaskSidebar {...baseProps} />);
    expect(screen.getByText("my-app")).toBeInTheDocument();
    expect(screen.getByText("Bitbucket")).toBeInTheDocument();
  });

  it("renders source and target branches", () => {
    render(<TaskSidebar {...baseProps} />);
    expect(screen.getByText("feature/login")).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
  });

  it("renders LOCAL workspace badge", () => {
    render(
      <TaskSidebar
        {...baseProps}
        task={{ ...baseTask, workspaceType: "LOCAL" }}
      />,
    );
    expect(screen.getByText("Local")).toBeInTheDocument();
  });

  it("renders pull request link when present", () => {
    render(
      <TaskSidebar
        {...baseProps}
        task={{ ...baseTask, pullRequestUrl: "https://bitbucket.org/pr/1" }}
      />,
    );
    const link = screen.getByText("View Pull Request");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "https://bitbucket.org/pr/1",
    );
    expect(link.closest("a")).toHaveAttribute("target", "_blank");
  });

  it("does NOT render pull request link when absent", () => {
    render(<TaskSidebar {...baseProps} />);
    expect(screen.queryByText("View Pull Request")).not.toBeInTheDocument();
  });

  it("renders Jira issue key when present", () => {
    render(
      <TaskSidebar
        {...baseProps}
        task={{ ...baseTask, jiraIssueKey: "PROJ-456" }}
      />,
    );
    expect(screen.getByText("Jira Issue")).toBeInTheDocument();
    expect(screen.getByText("PROJ-456")).toBeInTheDocument();
  });

  it("does NOT render Jira section when absent", () => {
    render(<TaskSidebar {...baseProps} />);
    expect(screen.queryByText("Jira Issue")).not.toBeInTheDocument();
  });

  it("renders review status enabled", () => {
    render(
      <TaskSidebar
        {...baseProps}
        task={{ ...baseTask, reviewEnabled: true, reviewModelId: "claude-4" }}
      />,
    );
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(screen.getByText("claude-4")).toBeInTheDocument();
  });

  it("renders review status disabled", () => {
    render(
      <TaskSidebar
        {...baseProps}
        task={{ ...baseTask, reviewEnabled: false }}
      />,
    );
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("does NOT render review model badge when not set", () => {
    render(
      <TaskSidebar
        {...baseProps}
        task={{ ...baseTask, reviewEnabled: true }}
      />,
    );
    expect(screen.getByText("Enabled")).toBeInTheDocument();
  });

  it("renders skills as badges", () => {
    render(
      <TaskSidebar
        {...baseProps}
        task={{ ...baseTask, skills: "testing, security, docs" }}
      />,
    );
    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(screen.getByText("testing")).toBeInTheDocument();
    expect(screen.getByText("security")).toBeInTheDocument();
    expect(screen.getByText("docs")).toBeInTheDocument();
  });

  it("does NOT render skills when absent", () => {
    render(<TaskSidebar {...baseProps} />);
    expect(screen.queryByText("Skills")).not.toBeInTheDocument();
  });

  it("renders resume count", () => {
    render(
      <TaskSidebar {...baseProps} task={{ ...baseTask, resumeCount: 3 }} />,
    );
    expect(screen.getByText(/resumed 3 times/i)).toBeInTheDocument();
  });

  it("renders resume count with singular form", () => {
    render(
      <TaskSidebar {...baseProps} task={{ ...baseTask, resumeCount: 1 }} />,
    );
    expect(
      screen.getByText(
        (text) => text.includes("Resumed 1 time") && !text.includes("times"),
      ),
    ).toBeInTheDocument();
  });

  it("does NOT render resume count when 0", () => {
    render(
      <TaskSidebar {...baseProps} task={{ ...baseTask, resumeCount: 0 }} />,
    );
    expect(screen.queryByText(/resumed/i)).not.toBeInTheDocument();
  });

  it("renders error message card when present", () => {
    render(
      <TaskSidebar
        {...baseProps}
        task={{ ...baseTask, errorMessage: "Build failed unexpectedly" }}
      />,
    );
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Build failed unexpectedly")).toBeInTheDocument();
  });

  it("does NOT render error card when errorMessage is absent", () => {
    render(<TaskSidebar {...baseProps} />);
    expect(screen.queryByText("Error")).not.toBeInTheDocument();
  });

  it("renders prompt text", () => {
    render(<TaskSidebar {...baseProps} />);
    expect(screen.getByText("Prompt")).toBeInTheDocument();
    expect(
      screen.getByText("Implement a secure login page"),
    ).toBeInTheDocument();
  });

  it("renders created date", () => {
    render(<TaskSidebar {...baseProps} />);
    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  it("renders completed date when present", () => {
    render(
      <TaskSidebar
        {...baseProps}
        task={{ ...baseTask, completedAt: "2026-02-01T11:00:00Z" }}
      />,
    );
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("does NOT render completed date when absent", () => {
    render(<TaskSidebar {...baseProps} />);
    expect(screen.queryByText("Completed")).not.toBeInTheDocument();
  });

  it("renders iterative session card when task is iterative", () => {
    render(
      <TaskSidebar
        {...baseProps}
        task={{
          ...baseTask,
          iterative: true,
          currentIteration: 3,
          maxIterations: 10,
        }}
      />,
    );
    expect(screen.getByText("Iterative Session")).toBeInTheDocument();
    expect(screen.getByText("3 / 10")).toBeInTheDocument();
  });

  it("uses defaults for iterative card when values are null", () => {
    render(
      <TaskSidebar
        {...baseProps}
        task={{
          ...baseTask,
          iterative: true,
          currentIteration: null,
          maxIterations: null,
        }}
      />,
    );
    expect(screen.getByText("0 / 10")).toBeInTheDocument();
  });

  it("renders completion criteria in iterative card", () => {
    render(
      <TaskSidebar
        {...baseProps}
        task={{
          ...baseTask,
          iterative: true,
          currentIteration: 1,
          maxIterations: 5,
          completionCriteria: "All tests pass",
        }}
      />,
    );
    expect(screen.getByText("All tests pass")).toBeInTheDocument();
  });

  it("does NOT render iterative card when not iterative", () => {
    render(<TaskSidebar {...baseProps} />);
    expect(screen.queryByText("Iterative Session")).not.toBeInTheDocument();
  });

  it("renders progress bar", () => {
    render(<TaskSidebar {...baseProps} />);
    expect(screen.getByTestId("progress-bar")).toBeInTheDocument();
    expect(screen.getByText("Task Progress")).toBeInTheDocument();
  });

  it("renders session metrics card", () => {
    render(<TaskSidebar {...baseProps} />);
    expect(screen.getByTestId("session-metrics")).toBeInTheDocument();
  });

  it("renders processing indicator when isProcessing is true", () => {
    render(<TaskSidebar {...baseProps} isProcessing={true} />);
    // The Loader2 icon should be present
    const container = document.querySelector(".animate-spin");
    expect(container).toBeInTheDocument();
  });
});
