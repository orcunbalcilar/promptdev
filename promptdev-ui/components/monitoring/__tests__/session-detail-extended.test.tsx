import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { MonitoringSession, MonitoringOperation } from "@/lib/monitoring";

// ── Mocks ───────────────────────────────────────────────────────

const mockGetSessionOperations = vi.fn();

vi.mock("@/lib/monitoring", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    getSessionOperations: (...args: unknown[]) =>
      mockGetSessionOperations(...args),
  };
});

vi.mock("@/components/ai-elements/tool", () => ({
  Tool: ({ children }: { children?: ReactNode }) => (
    <div data-testid="tool">{children}</div>
  ),
  ToolHeader: ({ title, state }: { title: string; state: string }) => (
    <div data-testid="tool-header" data-state={state}>
      {title}
    </div>
  ),
  ToolContent: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  ToolInput: ({ input }: { input: { message: string } }) => (
    <div data-testid="tool-input">{input.message}</div>
  ),
  ToolOutput: ({
    output,
    errorText,
  }: {
    output?: string;
    errorText?: string;
  }) => <div data-testid="tool-output">{errorText ?? output}</div>,
}));

vi.mock("@/components/ai-elements/stack-trace", () => ({
  StackTrace: ({ children }: { children?: ReactNode }) => (
    <div data-testid="stack-trace">{children}</div>
  ),
  StackTraceHeader: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  StackTraceError: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  StackTraceErrorType: () => <span data-testid="error-type" />,
  StackTraceErrorMessage: () => <span data-testid="error-message" />,
  StackTraceContent: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  StackTraceFrames: () => <div data-testid="stack-frames" />,
  StackTraceExpandButton: () => <button>Expand</button>,
}));

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
  ProgressBarFill: ({ value }: { value: number }) => (
    <div data-testid="progress-fill" data-value={value} />
  ),
}));

vi.mock("@/components/ai-elements/status-indicator", () => ({
  StatusIndicator: ({ status }: { status: string }) => (
    <div data-testid="status-indicator" data-status={status} />
  ),
}));

import { SessionDetail } from "../session-detail";

// ── Helpers ─────────────────────────────────────────────────────

function makeSession(
  overrides: Partial<MonitoringSession> = {},
): MonitoringSession {
  return {
    id: "sess-1",
    sdkSessionId: "sdk-sess-1",
    model: "gpt-5.2",
    status: "ENDED",
    totalInputTokens: 1500,
    totalOutputTokens: 500,
    messageCount: 10,
    toolExecutionCount: 3,
    errorCount: 0,
    source: "copilot",
    createdAt: "2026-02-28T10:00:00Z",
    endedAt: "2026-02-28T10:05:00Z",
    ...overrides,
  };
}

function makeOperation(
  overrides: Partial<MonitoringOperation> = {},
): MonitoringOperation {
  return {
    id: `op-${Math.random().toString(36).slice(2, 7)}`,
    operationType: "MESSAGE_SENT",
    timestamp: "2026-02-28T10:01:00Z",
    ...overrides,
  };
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSessionOperations.mockResolvedValue([]);
});

describe("SessionDetail – extended operation rendering", () => {
  // ── Progress calculation for ACTIVE sessions ──────────────────

  it("shows 0% progress for ACTIVE session with no operations", () => {
    renderWithProviders(
      <SessionDetail
        session={makeSession({ status: "ACTIVE" })}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByTestId("progress-value")).toHaveTextContent("0%");
  });

  it("computes progress for ACTIVE with mixed operations", async () => {
    const ops = [
      makeOperation({ operationType: "MESSAGE_SENT" }),
      makeOperation({ operationType: "TOOL_EXECUTION_END" }),
      makeOperation({ operationType: "MESSAGE_RECEIVED" }),
      makeOperation({ operationType: "TOOL_EXECUTION_START" }),
    ];
    mockGetSessionOperations.mockResolvedValue(ops);

    renderWithProviders(
      <SessionDetail
        session={makeSession({ status: "ACTIVE" })}
        onBack={vi.fn()}
      />,
    );
    // 2 completed / 4 = 50%
    expect(await screen.findByText("50%")).toBeInTheDocument();
  });

  it("counts SESSION_DESTROYED in progress", async () => {
    const ops = [
      makeOperation({ operationType: "SESSION_DESTROYED" }),
      makeOperation({ operationType: "MESSAGE_SENT" }),
    ];
    mockGetSessionOperations.mockResolvedValue(ops);

    renderWithProviders(
      <SessionDetail
        session={makeSession({ status: "ACTIVE" })}
        onBack={vi.fn()}
      />,
    );
    expect(await screen.findByText("50%")).toBeInTheDocument();
  });

  it("shows 100% progress for ERROR session regardless of operations", () => {
    renderWithProviders(
      <SessionDetail
        session={makeSession({ status: "ERROR" })}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByTestId("progress-value")).toHaveTextContent("100%");
  });

  it("shows complete status indicator for ENDED session", () => {
    renderWithProviders(
      <SessionDetail
        session={makeSession({ status: "ENDED" })}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByTestId("status-indicator")).toHaveAttribute(
      "data-status",
      "complete",
    );
  });

  // ── Token formatting ──────────────────────────────────────────

  it("formats token counts (thousands)", () => {
    renderWithProviders(
      <SessionDetail
        session={makeSession({
          totalInputTokens: 2000,
          totalOutputTokens: 500,
        })}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText("2.0K")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
  });

  // ── TOOL operations ───────────────────────────────────────────

  it("renders TOOL_EXECUTION_START with input-available state", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "TOOL_EXECUTION_START",
        toolName: "readFile",
        message: "Reading file",
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    const header = await screen.findByTestId("tool-header");
    expect(header).toHaveTextContent("readFile");
    expect(header).toHaveAttribute("data-state", "input-available");
  });

  it("renders TOOL_EXECUTION_END with output-available state", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "TOOL_EXECUTION_END",
        toolName: "writeFile",
        message: "done",
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    const header = await screen.findByTestId("tool-header");
    expect(header).toHaveAttribute("data-state", "output-available");
  });

  it("renders TOOL_EXECUTION_ERROR with output-error state", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "TOOL_EXECUTION_ERROR",
        toolName: "compile",
        success: false,
        errorMessage: "Build failed",
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    const header = await screen.findByTestId("tool-header");
    expect(header).toHaveAttribute("data-state", "output-error");
    expect(screen.getByTestId("tool-output")).toHaveTextContent("Build failed");
  });

  it("renders tool with success=false as output-error state", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "TOOL_EXECUTION_START",
        toolName: "exec",
        success: false,
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    const header = await screen.findByTestId("tool-header");
    expect(header).toHaveAttribute("data-state", "output-error");
  });

  it("renders tool operation with token counts", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "TOOL_EXECUTION_START",
        toolName: "search",
        inputTokens: 100,
        outputTokens: 200,
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    expect(await screen.findByText("In: 100")).toBeInTheDocument();
    expect(screen.getByText("Out: 200")).toBeInTheDocument();
  });

  it("renders tool operation with duration", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "TOOL_EXECUTION_END",
        durationMs: 350,
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    expect(await screen.findByText("350ms")).toBeInTheDocument();
  });

  it("renders tool operation with message as ToolInput", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "TOOL_EXECUTION_START",
        toolName: "run",
        message: "executing command",
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    expect(await screen.findByTestId("tool-input")).toHaveTextContent(
      "executing command",
    );
  });

  it("renders tool operation with operationType as fallback title", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "TOOL_EXECUTION_START",
        toolName: undefined,
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    const header = await screen.findByTestId("tool-header");
    expect(header).toHaveTextContent("TOOL_EXECUTION_START");
  });

  // ── ERROR operations ──────────────────────────────────────────

  it("renders ERROR operation as StackTrace", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "ERROR",
        errorMessage: "Something went wrong",
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    expect(await screen.findByTestId("stack-trace")).toBeInTheDocument();
  });

  it("renders error operations with duration when present", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "ERROR",
        errorMessage: "fail",
        durationMs: 42,
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    expect(await screen.findByText("42ms")).toBeInTheDocument();
  });

  it("renders TOOL_EXECUTION_ERROR as error operation", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "TOOL_EXECUTION_ERROR",
        errorMessage: "tool crash",
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    // TOOL ops are rendered as ToolOperation, not ErrorOperation,
    // because operationType includes "TOOL"
    expect(await screen.findByTestId("tool")).toBeInTheDocument();
  });

  it("renders non-tool operation with success=false and errorMessage as error", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "MESSAGE_SENT",
        success: false,
        errorMessage: "delivery failed",
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    expect(await screen.findByTestId("stack-trace")).toBeInTheDocument();
  });

  it("renders error operation using message when no errorMessage", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "ERROR",
        message: "timeout occurred",
        errorMessage: undefined,
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    expect(await screen.findByTestId("stack-trace")).toBeInTheDocument();
  });

  // ── Default operations (non-TOOL, non-ERROR) ─────────────────

  it("renders default operation with badge and message", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "SESSION_CREATED",
        message: "Session started",
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    expect(await screen.findByText("SESSION_CREATED")).toBeInTheDocument();
    expect(screen.getByText("Session started")).toBeInTheDocument();
  });

  it("renders default operation with toolName badge", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "SESSION_DESTROYED",
        toolName: "cleanup",
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    expect(await screen.findByText("cleanup")).toBeInTheDocument();
  });

  it("renders default operation with durationMs", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "SESSION_DESTROYED",
        durationMs: 123,
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    expect(await screen.findByText("123ms")).toBeInTheDocument();
  });

  it("renders default operation with errorMessage", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "WARNING",
        errorMessage: "rate limited",
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    expect(await screen.findByText("rate limited")).toBeInTheDocument();
  });

  it("renders default operation with token counts", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({
        operationType: "MESSAGE_RECEIVED",
        inputTokens: 50,
        outputTokens: 75,
      }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    expect(await screen.findByText("In: 50")).toBeInTheDocument();
    expect(screen.getByText("Out: 75")).toBeInTheDocument();
  });

  // ── Fallback / edge cases ─────────────────────────────────────

  it("uses fallback STATUS_CONFIG for unknown status", () => {
    const session = makeSession({
      status: "UNKNOWN" as MonitoringSession["status"],
    });
    renderWithProviders(<SessionDetail session={session} onBack={vi.fn()} />);
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
  });

  it("shows operations count in timeline description", async () => {
    mockGetSessionOperations.mockResolvedValue([
      makeOperation({ operationType: "SESSION_CREATED" }),
      makeOperation({ operationType: "MESSAGE_SENT" }),
    ]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    expect(await screen.findByText(/2 total/)).toBeInTheDocument();
  });

  it("renders ACTIVE status badge", () => {
    renderWithProviders(
      <SessionDetail
        session={makeSession({ status: "ACTIVE" })}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });
});
