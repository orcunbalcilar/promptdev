import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@/components/ai-elements/progress-bar", () => ({
  ProgressBar: ({ children }: { children?: ReactNode }) => (
    <div data-testid="progress-bar">{children}</div>
  ),
  ProgressBarLabel: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  ProgressBarValue: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  ProgressBarTrack: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  ProgressBarFill: () => <div data-testid="progress-fill" />,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
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

vi.mock("@/app/tasks/_components/index", () => ({
  getTaskProgress: () => 50,
  getProgressLabel: () => "In progress",
  getProgressWidth: () => "w-1/2",
  getAgentStatusStyle: () => "",
  SessionMetricsCard: () => <div data-testid="session-metrics" />,
}));

vi.mock("lucide-react", () => {
  const Icon = ({ className }: { className?: string }) => (
    <svg data-testid="icon" className={className} />
  );

  return {
    AlertCircle: Icon,
    BookOpen: Icon,
    Bot: Icon,
    Bug: Icon,
    Calendar: Icon,
    CheckCircle2: Icon,
    FolderOpen: Icon,
    GitBranch: Icon,
    GitPullRequest: Icon,
    Loader2: ({ className }: { className?: string }) => (
      <svg data-testid="loader-icon" className={className} />
    ),
    RefreshCcw: Icon,
    Shield: Icon,
  };
});

import { TaskSidebar } from "@/components/tasks/task-sidebar";

describe("TaskSidebar", () => {
  const baseProps = {
    task: {
      status: "IN_PROGRESS",
      title: "Test task",
      modelId: "gpt-5.2",
      workspaceType: "LOCAL",
      repositorySlug: "owner/repo",
      sourceBranch: "feature/test",
      targetBranch: "main",
      createdAt: new Date().toISOString(),
      prompt: "Implement feature",
    },
    isLive: true,
    models: [],
    allEvents: [],
  };

  it("shows sidebar spinner while processing", () => {
    render(<TaskSidebar {...baseProps} isProcessing={true} />);

    expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
  });

  it("hides sidebar spinner when not processing", () => {
    render(<TaskSidebar {...baseProps} isProcessing={false} />);

    expect(screen.queryByTestId("loader-icon")).not.toBeInTheDocument();
  });
});
