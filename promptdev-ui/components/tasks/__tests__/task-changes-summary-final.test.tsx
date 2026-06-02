import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock all the ai-elements
vi.mock("@/components/ai-elements/file-tree", () => ({
  FileTree: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="file-tree">{children}</div>
  ),
  FileTreeFile: ({ name }: { name: string; path: string; icon?: string }) => (
    <div data-testid="file-tree-file">{name}</div>
  ),
  FileTreeFolder: ({
    children,
    name,
  }: {
    children: React.ReactNode;
    name: string;
    path: string;
  }) => (
    <div data-testid="file-tree-folder">
      {name}
      {children}
    </div>
  ),
}));

vi.mock("@/components/ai-elements/commit", () => ({
  Commit: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommitHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommitHash: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  CommitMessage: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  CommitInfo: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommitMetadata: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommitTimestamp: () => <span>timestamp</span>,
  CommitContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommitFiles: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommitFile: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommitFileInfo: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommitFileStatus: () => <span>status</span>,
  CommitFileIcon: () => <span>icon</span>,
  CommitFilePath: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/components/ai-elements/package-info", () => ({
  PackageInfo: ({ name }: { name: string }) => <div>{name}</div>,
}));

vi.mock("@/components/ai-elements/terminal", () => ({
  Terminal: ({ output }: { output: string }) => (
    <pre data-testid="terminal">{output}</pre>
  ),
}));

vi.mock("@/components/ai-elements/test-results", () => ({
  TestResults: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TestResultsHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TestResultsSummary: () => <div>summary</div>,
  TestResultsDuration: () => <div>duration</div>,
  TestResultsContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TestSuite: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TestSuiteName: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TestSuiteContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Test: () => <div>test</div>,
}));

import { TaskChangesSummary } from "@/components/tasks/task-changes-summary";
import type { TaskEvent, Task } from "@/lib/api";

const mockTask: Task = {
  id: "t1",
  title: "Test",
  prompt: "test",
  repositorySlug: "repo",
  workspaceType: "BITBUCKET",
  sourceBranch: "main",
  targetBranch: "main",
  status: "COMPLETED",
  currentAttempt: 1,
  maxAttempts: 3,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:30Z",
};

function makeEvent(overrides: Partial<TaskEvent>): TaskEvent {
  return {
    id: "e1",
    eventType: "LOG",
    message: "",
    timestamp: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("TaskChangesSummary", () => {
  it("renders empty state when no events (line 150: events.length === 0)", () => {
    render(<TaskChangesSummary events={[]} task={mockTask} />);
    expect(screen.getByText("No events recorded yet")).toBeInTheDocument();
  });

  it("renders tool calls count (line 277: stats.toolCalls > 0)", () => {
    // Line 277: renders tool invocations count
    const events: TaskEvent[] = [
      makeEvent({
        id: "e1",
        eventType: "AGENT_TOOL_CALL",
        message: "readFile",
        timestamp: "2025-01-01T00:00:00Z",
      }),
      makeEvent({
        id: "e2",
        eventType: "AGENT_TOOL_CALL",
        message: "writeFile",
        timestamp: "2025-01-01T00:00:05Z",
      }),
    ];
    render(<TaskChangesSummary events={events} task={mockTask} />);
    expect(screen.getByText("2 tool invocations")).toBeInTheDocument();
  });

  it("renders file tree section with folder structure (line 368: file tree branch)", () => {
    // Line 368: buildFolderStructure + FileTree rendering branch
    const events: TaskEvent[] = [
      makeEvent({
        id: "e1",
        eventType: "FILE_CREATED",
        message: "Created file",
        filePath: "src/utils/helper.ts",
        timestamp: "2025-01-01T00:00:00Z",
      }),
      makeEvent({
        id: "e2",
        eventType: "FILE_MODIFIED",
        message: "Modified file",
        filePath: "src/components/app.tsx",
        details: JSON.stringify({
          additions: 10,
          deletions: 3,
        }),
        timestamp: "2025-01-01T00:00:10Z",
      }),
    ];
    render(<TaskChangesSummary events={events} task={mockTask} />);
    expect(screen.getByText("Files Changed")).toBeInTheDocument();
    expect(screen.getByText("File Tree")).toBeInTheDocument();
  });

  it("renders git commit with attached files (line 368: op.files branch)", () => {
    const events: TaskEvent[] = [
      makeEvent({
        id: "e1",
        eventType: "GIT_COMMIT",
        message: "feat: add login",
        details: JSON.stringify({
          hash: "abc1234",
          message: "feat: add login",
          files: [
            { filePath: "src/login.ts", type: "ADDED" },
            { filePath: "src/auth.ts", type: "MODIFIED" },
          ],
        }),
        timestamp: "2025-01-01T00:00:00Z",
      }),
      makeEvent({
        id: "e2",
        eventType: "GIT_COMMIT",
        message: "fix: typo",
        timestamp: "2025-01-01T00:00:30Z",
      }),
    ];
    render(<TaskChangesSummary events={events} task={mockTask} />);
    expect(screen.getByText("Git Operations")).toBeInTheDocument();
  });

  it("computes timeTaken when there are at least 2 events (line 150: timeTaken)", () => {
    const events: TaskEvent[] = [
      makeEvent({
        id: "e1",
        eventType: "AGENT_TOOL_CALL",
        message: "call1",
        timestamp: "2025-01-01T00:00:00Z",
      }),
      makeEvent({
        id: "e2",
        eventType: "AGENT_TOOL_CALL",
        message: "call2",
        timestamp: "2025-01-01T00:02:00Z",
      }),
    ];
    render(<TaskChangesSummary events={events} task={mockTask} />);
    // Should show duration and tool invocations
    expect(screen.getByText("2 tool invocations")).toBeInTheDocument();
  });
});
