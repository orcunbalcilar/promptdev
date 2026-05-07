/**
 * Coverage completion for task-card.tsx
 * Targets: lines 110-131 (formatRelativeDate branches), 195/201 (iterative badge)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type { Task } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { TaskCard } from "../task-card";

const baseTask: Task = {
  id: "t1",
  title: "Test Task",
  prompt: "do something",
  status: "IN_PROGRESS",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  modelId: "gpt-4",
  workspaceType: "BITBUCKET",
  repositorySlug: "my-repo",
  sourceBranch: "feature/test",
  targetBranch: "main",
  currentAttempt: 1,
  maxAttempts: 3,
};

describe("task-card.tsx branch coverage", () => {
  it("line 115: formatRelativeDate returns 'Xm' for minutes", () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    render(<TaskCard task={{ ...baseTask, createdAt: thirtyMinAgo }} />);
    expect(screen.getByText("30m")).toBeInTheDocument();
  });

  it("line 117: formatRelativeDate returns 'Xh' for hours", () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    render(<TaskCard task={{ ...baseTask, createdAt: fiveHoursAgo }} />);
    expect(screen.getByText("5h")).toBeInTheDocument();
  });

  it("line 119: formatRelativeDate returns 'Xd' for days", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    render(<TaskCard task={{ ...baseTask, createdAt: threeDaysAgo }} />);
    expect(screen.getByText("3d")).toBeInTheDocument();
  });

  it("line 120: formatRelativeDate returns localized date for >=7 days", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    render(<TaskCard task={{ ...baseTask, createdAt: tenDaysAgo }} />);
    // Should not show relative time
    expect(screen.queryByText(/\d+[dhm]/)).not.toBeInTheDocument();
  });

  it("lines 197-201: shows iterative badge with currentIteration fallback to 0", () => {
    render(
      <TaskCard
        task={{
          ...baseTask,
          iterative: true,
          maxIterations: 5,
          currentIteration: undefined,
        }}
      />,
    );
    expect(screen.getByText("0/5")).toBeInTheDocument();
  });

  it("lines 122-130: renders various status borders", () => {
    const statuses = ["COMPLETED", "FAILED", "CANCELLED", "REVIEWING", "TRIAGING", "ITERATION_PENDING"] as const;
    for (const status of statuses) {
      const { unmount } = render(
        <TaskCard task={{ ...baseTask, status }} />,
      );
      unmount();
    }
  });
});
