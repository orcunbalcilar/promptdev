import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Minimal mocks for ai-elements
vi.mock("@/components/ai-elements/package-info", () => ({
  PackageInfo: ({
    name,
    newVersion,
    changeType,
  }: {
    name: string;
    newVersion?: string;
    changeType: string;
  }) => (
    <div data-testid="package-info">
      {name}@{newVersion ?? "?"} ({changeType})
    </div>
  ),
}));

vi.mock("@/components/ai-elements/stack-trace", () => ({
  StackTrace: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  StackTraceHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  StackTraceError: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  StackTraceErrorType: () => <span>ErrorType</span>,
  StackTraceErrorMessage: () => <span>ErrorMessage</span>,
  StackTraceExpandButton: () => null,
  StackTraceContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  StackTraceFrames: () => null,
}));

vi.mock("@/components/ai-elements/queue", () => ({
  Queue: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  QueueItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  QueueItemContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  QueueItemDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  QueueItemTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  QueueItemBadge: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ai-elements/checkpoint", () => ({
  Checkpoint: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="checkpoint">{children}</div>
  ),
  CheckpointIcon: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// We test individual event renderers via renderSingleEvent / renderGroupedEvent
// Import the entire module to access exported functions
import { renderGroupedEvent } from "@/components/tasks/activity-stream/event-renderers";
import type { TaskEvent, Task } from "@/lib/api";
import type { EventGroup } from "@/components/tasks/activity-stream/types";

function makeEvent(overrides: Partial<TaskEvent>): TaskEvent {
  return {
    id: "evt-1",
    eventType: "LOG",
    message: "",
    timestamp: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

const mockTask: Task = {
  id: "t1",
  title: "Test Task",
  prompt: "test",
  repositorySlug: "repo",
  workspaceType: "BITBUCKET",
  sourceBranch: "main",
  targetBranch: "main",
  status: "IN_PROGRESS",
  currentAttempt: 1,
  maxAttempts: 3,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("DependencyEvent regex parsing (lines 570-571)", () => {
  it("parses name and version from 'installed @scope/pkg@1.2.3'", () => {
    const event = makeEvent({
      eventType: "DEPENDENCY_INSTALLED",
      message: "installed @myorg/mypackage@2.0.0",
    });
    const group: EventGroup = { type: "single", events: [event], key: "g1" };
    const { container } = render(
      <>{renderGroupedEvent(group, mockTask, false)}</>,
    );
    expect(container.textContent).toContain("@myorg/mypackage");
    expect(container.textContent).toContain("2.0.0");
  });

  it("handles dependency message without version", () => {
    const event = makeEvent({
      eventType: "DEPENDENCY_INSTALLED",
      message: "installed lodash",
    });
    const group: EventGroup = { type: "single", events: [event], key: "g2" };
    const { container } = render(
      <>{renderGroupedEvent(group, mockTask, false)}</>,
    );
    expect(container.textContent).toContain("lodash");
  });

  it("falls back to event message display when message is empty", () => {
    const event = makeEvent({
      eventType: "DEPENDENCY_INSTALLED",
      message: "",
    });
    const group: EventGroup = { type: "single", events: [event], key: "g3" };
    const { container } = render(
      <>{renderGroupedEvent(group, mockTask, false)}</>,
    );
    // Empty message still matches regex with @? — PackageInfo renders with extracted name
    expect(container.textContent).toContain("added");
  });
});

describe("LogEvent agent response detection (lines 704-706, 710-712, 718, 721)", () => {
  it("renders agent response with Bot icon when message starts with 'Agent response'", () => {
    const event = makeEvent({
      eventType: "LOG",
      message: "Agent response received",
      details: null as unknown as undefined,
    });
    const group: EventGroup = { type: "single", events: [event], key: "g4" };
    render(<>{renderGroupedEvent(group, mockTask, false)}</>);
    // isAgentResponse branch - renders with primary/10 background
    expect(screen.getByText("Agent response received")).toBeInTheDocument();
  });

  it("renders log with extractedDetails JSON content", () => {
    const event = makeEvent({
      eventType: "LOG",
      message: "Some message",
      details: JSON.stringify({ content: "Extracted detail content" }),
    });
    const group: EventGroup = { type: "single", events: [event], key: "g5" };
    render(<>{renderGroupedEvent(group, mockTask, false)}</>);
    expect(screen.getByText("Extracted detail content")).toBeInTheDocument();
  });

  it("renders plain log when no agent response or JSON content", () => {
    const event = makeEvent({
      eventType: "LOG",
      message: "Plain log message",
      details: "simple details",
    });
    const group: EventGroup = { type: "single", events: [event], key: "g6" };
    render(<>{renderGroupedEvent(group, mockTask, false)}</>);
    expect(screen.getByText("Plain log message")).toBeInTheDocument();
    expect(screen.getByText("simple details")).toBeInTheDocument();
  });
});

describe("TaskCompletedEvent message parsing (lines 726-727)", () => {
  it("parses multi-line completed message into title and stats", () => {
    const event = makeEvent({
      eventType: "TASK_COMPLETED",
      message: "Task Completed Successfully\nFiles: 5\nCommits: 2",
    });
    const group: EventGroup = { type: "single", events: [event], key: "g7" };
    render(<>{renderGroupedEvent(group, mockTask, false)}</>);
    expect(screen.getByText("Task Completed Successfully")).toBeInTheDocument();
    expect(screen.getByText("Files: 5, Commits: 2")).toBeInTheDocument();
  });

  it("renders default text when message is empty", () => {
    const event = makeEvent({
      eventType: "TASK_COMPLETED",
      message: "",
    });
    const group: EventGroup = { type: "single", events: [event], key: "g8" };
    render(<>{renderGroupedEvent(group, mockTask, false)}</>);
    expect(screen.getByText("Task Completed")).toBeInTheDocument();
  });
});
