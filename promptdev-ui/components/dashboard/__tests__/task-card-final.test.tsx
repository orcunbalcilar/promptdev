import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskCard } from "@/components/dashboard/task-card";
import type { Task } from "@/lib/api";

describe("TaskCard", () => {
  it("shows duration for failed task with updatedAt (line 212)", () => {
    // Line 212: (task.completedAt ?? (task.updatedAt && ['FAILED', 'CANCELLED'].includes...))
    // This exercises the updatedAt fallback for FAILED tasks
    const task: Task = {
      id: "t1",
      title: "Failed Task",
      prompt: "do something",
      repositorySlug: "my-repo",
      workspaceType: "BITBUCKET",
      sourceBranch: "feature",
      targetBranch: "main",
      status: "FAILED",
      currentAttempt: 1,
      maxAttempts: 3,
      errorMessage: "Something went wrong",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:05:00Z",
      completedAt: undefined,
    };
    render(<TaskCard task={task} />);
    // Duration should be calculated from updatedAt - createdAt = 5 minutes
    expect(screen.getByTitle("Duration")).toBeInTheDocument();
    expect(screen.getByTitle("Duration").textContent).toContain("5m");
  });

  it("shows live dot for in-progress task without completedAt", () => {
    const task: Task = {
      id: "t2",
      title: "Running Task",
      prompt: "run",
      repositorySlug: "repo",
      workspaceType: "BITBUCKET",
      sourceBranch: "main",
      targetBranch: "main",
      status: "IN_PROGRESS",
      currentAttempt: 1,
      maxAttempts: 3,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:01:00Z",
    };
    render(<TaskCard task={task} />);
    expect(screen.getByTitle("Running")).toBeInTheDocument();
  });

  it("renders PR link when pullRequestUrl is set", () => {
    const task: Task = {
      id: "t3",
      title: "PR Task",
      prompt: "pr",
      repositorySlug: "repo",
      workspaceType: "BITBUCKET",
      sourceBranch: "main",
      targetBranch: "main",
      status: "COMPLETED",
      currentAttempt: 1,
      maxAttempts: 3,
      pullRequestUrl: "https://github.com/org/repo/pull/1",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:02:00Z",
      completedAt: "2025-01-01T00:02:00Z",
    };
    render(<TaskCard task={task} />);
    expect(screen.getByTitle("Open Pull Request")).toBeInTheDocument();
  });

  it("shows duration for CANCELLED task using updatedAt (branch: CANCELLED in status list)", () => {
    const task: Task = {
      id: "t4",
      title: "Cancelled Task",
      prompt: "cancel me",
      repositorySlug: "repo",
      workspaceType: "BITBUCKET",
      sourceBranch: "main",
      targetBranch: "main",
      status: "CANCELLED",
      currentAttempt: 1,
      maxAttempts: 3,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:45Z",
      completedAt: undefined,
    };
    render(<TaskCard task={task} />);
    expect(screen.getByTitle("Duration")).toBeInTheDocument();
    expect(screen.getByTitle("Duration").textContent).toContain("45s");
  });

  it("shows duration in seconds-only format when < 1 min (branch: mins === 0)", () => {
    const task: Task = {
      id: "t5",
      title: "Quick Task",
      prompt: "fast",
      repositorySlug: "repo",
      workspaceType: "BITBUCKET",
      sourceBranch: "main",
      targetBranch: "main",
      status: "COMPLETED",
      currentAttempt: 1,
      maxAttempts: 3,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:30Z",
      completedAt: "2025-01-01T00:00:30Z",
    };
    render(<TaskCard task={task} />);
    expect(screen.getByTitle("Duration").textContent).toBe("30s");
  });

  it("shows iterative badge when task is iterative with maxIterations (branch)", () => {
    const task: Task = {
      id: "t6",
      title: "Iterative Task",
      prompt: "iterate",
      repositorySlug: "repo",
      workspaceType: "BITBUCKET",
      sourceBranch: "main",
      targetBranch: "main",
      status: "IN_PROGRESS",
      currentAttempt: 1,
      maxAttempts: 3,
      iterative: true,
      maxIterations: 10,
      currentIteration: 3,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:01:00Z",
    };
    render(<TaskCard task={task} />);
    expect(screen.getByText("3/10")).toBeInTheDocument();
    expect(screen.getByTitle("Running")).toBeInTheDocument();
  });

  it("renders LOCAL workspace icon instead of git branch icon", () => {
    const task: Task = {
      id: "t7",
      title: "Local Task",
      prompt: "local",
      repositorySlug: "my-project",
      workspaceType: "LOCAL",
      sourceBranch: "main",
      targetBranch: "main",
      status: "COMPLETED",
      currentAttempt: 1,
      maxAttempts: 3,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:01:00Z",
      completedAt: "2025-01-01T00:01:00Z",
    };
    render(<TaskCard task={task} />);
    expect(screen.getByText("my-project")).toBeInTheDocument();
  });

  it("shows model badge with last segment when modelId contains /", () => {
    const task: Task = {
      id: "t8",
      title: "Model Task",
      prompt: "model",
      repositorySlug: "repo",
      workspaceType: "BITBUCKET",
      sourceBranch: "main",
      targetBranch: "main",
      status: "COMPLETED",
      currentAttempt: 1,
      maxAttempts: 3,
      modelId: "openai/gpt-4o",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:01:00Z",
      completedAt: "2025-01-01T00:01:00Z",
    };
    render(<TaskCard task={task} />);
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
  });
});
