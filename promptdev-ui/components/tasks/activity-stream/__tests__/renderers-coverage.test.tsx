import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Task, TaskEvent, EventType } from "@/lib/api";
import type { EventGroup } from "../types";

// ── Mocks ──────────────────────────────────────────────────────

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/components/ai-elements/agent", () => ({
  Agent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AgentHeader: ({ name, model }: { name: string; model: string }) => (
    <div>
      {name} - {model}
    </div>
  ),
}));

vi.mock("@/components/ai-elements/chain-of-thought", () => ({
  ChainOfThought: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ChainOfThoughtContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ChainOfThoughtHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ChainOfThoughtStep: ({
    label,
    status,
    description,
  }: {
    label: string;
    status: string;
    description?: string;
  }) => (
    <div>
      {label} ({status}){description && <span>{description}</span>}
    </div>
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

vi.mock("@/components/ai-elements/code-block", () => ({
  CodeBlockContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CodeBlockContent: ({ code }: { code: string }) => <pre>{code}</pre>,
  CodeBlockHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CodeBlockTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ai-elements/commit", () => ({
  Commit: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommitContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommitFile: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommitFileAdditions: ({ count }: { count: number }) => <span>+{count}</span>,
  CommitFileChanges: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommitFileDeletions: ({ count }: { count: number }) => <span>-{count}</span>,
  CommitFileInfo: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommitFilePath: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  CommitFileStatus: ({ status }: { status: string }) => <span>{status}</span>,
  CommitFiles: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommitHash: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  CommitHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommitInfo: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommitMessage: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

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
      {name}@{newVersion} ({changeType})
    </div>
  ),
}));

vi.mock("@/components/ai-elements/plan", () => ({
  Plan: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PlanAction: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PlanContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PlanDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PlanHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PlanTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PlanTrigger: () => <button>toggle</button>,
}));

vi.mock("@/components/ai-elements/queue", () => ({
  Queue: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  QueueItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  QueueItemContent: ({
    children,
  }: {
    children: React.ReactNode;
    completed: boolean;
  }) => <span>{children}</span>,
  QueueItemIndicator: ({ completed }: { completed: boolean }) => (
    <span>{completed ? "✓" : "○"}</span>
  ),
}));

vi.mock("@/components/ai-elements/reasoning", () => ({
  Reasoning: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ReasoningContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ReasoningTrigger: () => <button>reasoning</button>,
}));

vi.mock("@/components/ai-elements/stack-trace", () => ({
  StackTrace: ({
    children,
    trace,
  }: {
    children: React.ReactNode;
    trace: string;
  }) => (
    <div data-testid="stack-trace" data-trace={trace}>
      {children}
    </div>
  ),
  StackTraceContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  StackTraceError: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  StackTraceErrorMessage: () => <span>error-message</span>,
  StackTraceErrorType: () => <span>error-type</span>,
  StackTraceExpandButton: () => <button>expand</button>,
  StackTraceFrames: () => <div>frames</div>,
  StackTraceHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ai-elements/terminal", () => ({
  Terminal: ({ output }: { output: string }) => (
    <div data-testid="terminal">{output}</div>
  ),
}));

vi.mock("@/components/ai-elements/test-results", () => ({
  Test: ({ name, status }: { name: string; status: string }) => (
    <div>
      {name}: {status}
    </div>
  ),
  TestResults: ({
    children,
  }: {
    children: React.ReactNode;
    summary?: unknown;
  }) => <div>{children}</div>,
  TestResultsContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TestResultsHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TestResultsSummary: () => <div>summary</div>,
}));

vi.mock("@/components/ai-elements/tool", () => ({
  Tool: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ToolContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ToolHeader: ({
    title,
    state,
  }: {
    title: string;
    type: string;
    state: string;
  }) => (
    <div>
      {title} [{state}]
    </div>
  ),
  ToolInput: ({ input }: { input: unknown }) => (
    <pre>{JSON.stringify(input)}</pre>
  ),
  ToolOutput: ({
    output,
    errorText,
  }: {
    output?: unknown;
    errorText?: string;
  }) => (
    <div>
      {output !== undefined && <pre>{JSON.stringify(output)}</pre>}
      {errorText && <span>{errorText}</span>}
    </div>
  ),
}));

vi.mock("@/components/tasks/review-results", () => ({
  ReviewResults: ({ results }: { results: unknown[] }) => (
    <div data-testid="review-results">{results.length} results</div>
  ),
  parseReviewResults: (details?: string) => {
    if (!details) return [];
    try {
      return JSON.parse(details);
    } catch {
      return [];
    }
  },
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => <span {...props}>{children}</span>,
}));

// ── Import under test after mocks ──────────────────────────────

import { renderGroupedEvent } from "../event-renderers";

// ── Helpers ─────────────────────────────────────────────────────

function makeTask(overrides?: Partial<Task>): Task {
  return {
    id: "task-1",
    title: "Test Task",
    prompt: "Do something",
    repositorySlug: "repo",
    workspaceType: "BITBUCKET",
    sourceBranch: "feature",
    targetBranch: "main",
    status: "IN_PROGRESS",
    currentAttempt: 1,
    maxAttempts: 3,
    modelId: "gpt-5.2",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeEvent(
  overrides: Partial<TaskEvent> & { eventType: EventType },
): TaskEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 8)}`,
    message: "",
    timestamp: "2026-01-01T12:00:00Z",
    ...overrides,
  };
}

function makeGroup(type: EventGroup["type"], events: TaskEvent[]): EventGroup {
  return { type, events, key: `group-${events[0]?.id}` };
}

// ── Tests ───────────────────────────────────────────────────────

describe("renderGroupedEvent – uncovered single event types", () => {
  const task = makeTask();

  it("renders CODE_GENERATED without filePath as checkpoint (line 219)", () => {
    const event = makeEvent({
      eventType: "CODE_GENERATED",
      message: "Code generation completed",
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    expect(container.textContent).toContain("Code generation completed");
    expect(screen.getByTestId("checkpoint")).toBeInTheDocument();
  });

  it("renders DEPENDENCY_INSTALLED with version (lines 565-571)", () => {
    const event = makeEvent({
      eventType: "DEPENDENCY_INSTALLED",
      message: "installed @tanstack/react-query@5.0.0",
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    expect(screen.getByTestId("package-info")).toBeInTheDocument();
    expect(container.textContent).toContain("@tanstack/react-query");
    expect(container.textContent).toContain("5.0.0");
  });

  it("renders DEPENDENCY_INSTALLED without match using message fallback (lines 565-567)", () => {
    const event = makeEvent({
      eventType: "DEPENDENCY_INSTALLED",
      message: undefined as unknown as string,
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    expect(screen.getByTestId("package-info")).toBeInTheDocument();
    expect(container.textContent).toContain("dependency");
  });

  it("renders LogEvent fallback for non-agent-response (lines 602-605)", () => {
    const event = makeEvent({
      eventType: "LOG",
      message: "Plain log entry",
      details: "Some detail text",
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    expect(container.textContent).toContain("Plain log entry");
    expect(container.textContent).toContain("Some detail text");
  });

  it("renders TASK_FAILED with details via ErrorEvent (line 701)", () => {
    const event = makeEvent({
      eventType: "TASK_FAILED",
      message: "Task failed",
      details: "Error: Something went wrong\n  at main.ts:10",
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    expect(screen.getByTestId("stack-trace")).toBeInTheDocument();
  });

  it("renders TASK_FAILED without details as checkpoint (lines 704-712)", () => {
    const event = makeEvent({
      eventType: "TASK_FAILED",
      message: "Task Failed",
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    expect(screen.getByTestId("checkpoint")).toBeInTheDocument();
    expect(container.textContent).toContain("Task Failed");
  });

  it("renders TASK_COMPLETED with multiline message (lines 718-727)", () => {
    const event = makeEvent({
      eventType: "TASK_COMPLETED",
      message: "Task Completed\nFiles: 5\nCommits: 2",
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    expect(container.textContent).toContain("Task Completed");
    expect(container.textContent).toContain("Files: 5, Commits: 2");
  });

  it("renders TASK_QUEUED as QueuedEvent (line 721)", () => {
    const event = makeEvent({
      eventType: "TASK_QUEUED",
      message: "Task queued for processing",
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    expect(container.textContent).toContain("Task queued for processing");
  });

  it("renders unknown event type as LogEvent fallback", () => {
    const event = makeEvent({
      eventType: "TRIAGING_COMPLETED" as EventType,
      message: "Unknown event type content",
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    expect(container.textContent).toContain("Unknown event type content");
  });

  // ── Lines 704-706: AGENT_TOOL_CALL, AGENT_TOOL_RESULT, CODE_GENERATING ──
  it("renders AGENT_TOOL_CALL via ToolCallEvent (line 704)", () => {
    const event = makeEvent({
      eventType: "AGENT_TOOL_CALL",
      message: "readFile",
      toolName: "readFile",
      toolInput: JSON.stringify({ path: "/src/index.ts" }),
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    expect(container.textContent).toContain("readFile");
  });

  it("renders AGENT_TOOL_RESULT as LogEvent (line 705)", () => {
    const event = makeEvent({
      eventType: "AGENT_TOOL_RESULT",
      message: "Tool result returned",
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    expect(container.textContent).toContain("Tool result returned");
  });

  it("renders CODE_GENERATING as LogEvent (line 706)", () => {
    const event = makeEvent({
      eventType: "CODE_GENERATING",
      message: "Generating code for feature",
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    expect(container.textContent).toContain("Generating code for feature");
  });

  // ── Lines 710-712: FILE_DELETED, GIT_CHECKOUT, GIT_BRANCH_CREATED ──
  it("renders FILE_DELETED as CodeChangeEvent (line 710)", () => {
    const event = makeEvent({
      eventType: "FILE_DELETED",
      message: "Deleted old file",
      filePath: "src/old.ts",
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    // CodeChangeEvent renders checkpoint; just verify something rendered
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it("renders GIT_CHECKOUT as LogEvent (line 711)", () => {
    const event = makeEvent({
      eventType: "GIT_CHECKOUT",
      message: "Checked out branch develop",
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    expect(container.textContent).toContain("Checked out branch develop");
  });

  it("renders GIT_BRANCH_CREATED as LogEvent (line 712)", () => {
    const event = makeEvent({
      eventType: "GIT_BRANCH_CREATED",
      message: "Created branch feature/xyz",
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    expect(container.textContent).toContain("Created branch feature/xyz");
  });

  // ── Line 718: TESTS_RUNNING ──
  it("renders TESTS_RUNNING as TestEvent with isRunning (line 718)", () => {
    const event = makeEvent({
      eventType: "TESTS_RUNNING",
      message: "Running tests...",
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    // TestEvent is mocked — just verify it renders
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  // ── Line 721: TEST_RESULT ──
  it("renders TEST_RESULT as TestEvent (line 721)", () => {
    const event = makeEvent({
      eventType: "TEST_RESULT",
      message: "Test results available",
      details: JSON.stringify({ passed: 5, failed: 0, total: 5 }),
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    // TestEvent is mocked — just verify it renders something
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  // ── Lines 726-727: PROGRESS, RETRY_SCHEDULED ──
  it("renders PROGRESS as LogEvent (line 726)", () => {
    const event = makeEvent({
      eventType: "PROGRESS",
      message: "50% complete",
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    expect(container.textContent).toContain("50% complete");
  });

  it("renders RETRY_SCHEDULED as LogEvent (line 727)", () => {
    const event = makeEvent({
      eventType: "RETRY_SCHEDULED",
      message: "Retry in 30s",
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), task, false)}</>,
    );
    expect(container.textContent).toContain("Retry in 30s");
  });
});

describe("renderGroupedEvent – grouped event types", () => {
  const task = makeTask();

  it("renders triage group with completed event (line 442-443)", () => {
    const events = [
      makeEvent({ eventType: "TRIAGING_STARTED", message: "Triage started" }),
      makeEvent({
        eventType: "TRIAGING_COMPLETED",
        message: "Done",
        details: "Task is well-defined",
      }),
    ];
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("triage", events), task, false)}</>,
    );
    expect(container.textContent).toContain("Triage complete");
    expect(container.textContent).toContain("Task is well-defined");
  });

  it("renders triage group in active state when processing (line 442-443)", () => {
    const events = [
      makeEvent({ eventType: "TRIAGING_STARTED", message: "Triage started" }),
    ];
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("triage", events), task, true)}</>,
    );
    expect(container.textContent).toContain("Processing...");
  });

  it("renders step group with failed step (line 122 – getStepStatusIcon isFailed)", () => {
    const events = [
      makeEvent({ eventType: "STEP_STARTED", message: "Running linter" }),
      makeEvent({ eventType: "STEP_FAILED", message: "Lint failed" }),
    ];
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("step", events), task, false)}</>,
    );
    expect(container.textContent).toContain("Running linter");
    expect(container.textContent).toContain("Lint failed");
  });

  it("renders step group with completed and validation passed steps", () => {
    const events = [
      makeEvent({ eventType: "STEP_STARTED", message: "Build step" }),
      makeEvent({ eventType: "STEP_COMPLETED", message: "Build passed" }),
      makeEvent({
        eventType: "STEP_VALIDATION_PASSED",
        message: "Validation ok",
      }),
    ];
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("step", events), task, false)}</>,
    );
    expect(container.textContent).toContain("Build passed");
  });

  it("renders iteration group", () => {
    const events = [
      makeEvent({
        eventType: "ITERATION_STARTED",
        message: "Iteration 1 started",
      }),
      makeEvent({
        eventType: "ITERATION_COMPLETED",
        message: "Iteration 1 done",
      }),
    ];
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("iteration", events), task, false)}</>,
    );
    expect(container.textContent).toContain("Iteration 1 started");
    expect(container.textContent).toContain("✓");
  });

  it("renders review group with structured results", () => {
    const events = [
      makeEvent({
        eventType: "REVIEWING_STARTED",
        message: "Review started",
      }),
      makeEvent({
        eventType: "REVIEWING_COMPLETED",
        message: "Review done",
        details: '[{"severity":"warning","message":"Consider adding tests"}]',
      }),
    ];
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("review", events), task, false)}</>,
    );
    expect(container.textContent).toContain("Code Review");
    expect(screen.getByTestId("review-results")).toBeInTheDocument();
  });

  it("renders review group with failed review", () => {
    const events = [
      makeEvent({
        eventType: "REVIEWING_STARTED",
        message: "Review started",
      }),
      makeEvent({
        eventType: "REVIEWING_FAILED",
        message: "Review service unavailable",
      }),
    ];
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("review", events), task, false)}</>,
    );
    expect(container.textContent).toContain("Review service unavailable");
  });

  it("renders tool-pair group with result and error", () => {
    const events = [
      makeEvent({
        eventType: "AGENT_TOOL_CALL",
        toolName: "readFile",
        toolInput: '{"path":"src/index.ts"}',
      }),
      makeEvent({
        eventType: "AGENT_TOOL_RESULT",
        details: "error: file not found",
      }),
    ];
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("tool-pair", events), task, false)}</>,
    );
    expect(container.textContent).toContain("readFile");
    expect(container.textContent).toContain("output-error");
  });

  it("renders PR_CREATED with pullRequestUrl from task", () => {
    const t = makeTask({ pullRequestUrl: "https://bitbucket.org/pr/1" });
    const event = makeEvent({
      eventType: "PR_CREATED",
      message: "PR #1 created",
    });
    const { container } = render(
      <>{renderGroupedEvent(makeGroup("single", [event]), t, false)}</>,
    );
    expect(container.textContent).toContain("Pull Request Created");
    expect(container.textContent).toContain("View PR →");
  });
});
