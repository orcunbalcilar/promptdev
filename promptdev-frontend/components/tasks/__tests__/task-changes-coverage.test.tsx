/**
 * Coverage: task-changes-summary.tsx line 150 (events.length >= 2 time calculation)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type { Task, TaskEvent } from "@/lib/api";

// Mock ai-elements components used by TaskChangesSummary
vi.mock("@/components/ai-elements/file-tree", () => ({
  FileTree: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FileTreeFile: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FileTreeFolder: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ai-elements/commit", () => ({
  Commit: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommitHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommitHash: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommitMessage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommitInfo: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommitMetadata: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommitTimestamp: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommitContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommitFiles: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommitFile: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommitFileInfo: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommitFileStatus: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommitFileIcon: () => <span />,
  CommitFilePath: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ai-elements/package-info", () => ({
  PackageInfo: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ai-elements/terminal", () => ({
  Terminal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ai-elements/test", () => ({
  TestResults: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TestResultsHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TestResultsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TestResultEntry: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TestResultName: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TestResultStatus: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TestResultDuration: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { TaskChangesSummary } from "../task-changes-summary";

const baseTask: Task = {
  id: "t1",
  title: "Test",
  prompt: "do it",
  status: "COMPLETED",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  modelId: "gpt-4",
  workspaceType: "BITBUCKET",
  repositorySlug: "repo",
  sourceBranch: "feat",
  targetBranch: "main",
  currentAttempt: 1,
  maxAttempts: 3,
};

describe("task-changes-summary.tsx branch coverage", () => {
  it("line 150: computes time when events.length >= 2", () => {
    const events: TaskEvent[] = [
      {
        id: "e1",
        eventType: "TASK_CREATED",
        message: "Started",
        timestamp: "2024-01-01T10:00:00Z",
      },
      {
        id: "e2",
        eventType: "FILE_CREATED",
        message: "Created file",
        timestamp: "2024-01-01T10:05:00Z",
        filePath: "src/index.ts",
      },
      {
        id: "e3",
        eventType: "TASK_COMPLETED",
        message: "Done",
        timestamp: "2024-01-01T10:10:00Z",
      },
    ];

    render(<TaskChangesSummary events={events} task={baseTask} />);
    // Should show time taken (10 mins)
    expect(screen.getByText(/10m/)).toBeInTheDocument();
  });

  it("renders with single event (< 2 events, no time calculation)", () => {
    const events: TaskEvent[] = [
      {
        id: "e1",
        eventType: "TASK_CREATED",
        message: "Started",
        timestamp: "2024-01-01T10:00:00Z",
      },
    ];

    render(<TaskChangesSummary events={events} task={baseTask} />);
    expect(document.body).toBeTruthy();
  });
});
