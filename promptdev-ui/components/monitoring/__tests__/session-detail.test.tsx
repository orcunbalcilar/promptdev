import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionDetail } from "../session-detail";
import type { MonitoringSession, MonitoringOperation } from "@/lib/monitoring";

// Mock ai-elements used by session-detail
vi.mock("@/components/ai-elements/tool", () => ({
  Tool: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tool">{children}</div>
  ),
  ToolHeader: ({ title }: { title?: string }) => (
    <div data-testid="tool-header">{title}</div>
  ),
  ToolContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ToolInput: ({ input }: { input?: unknown }) => (
    <div data-testid="tool-input">{JSON.stringify(input)}</div>
  ),
  ToolOutput: ({
    output,
    errorText,
  }: {
    output?: unknown;
    errorText?: string;
  }) => (
    <div data-testid="tool-output">{errorText ?? JSON.stringify(output)}</div>
  ),
}));

vi.mock("@/components/ai-elements/stack-trace", () => ({
  StackTrace: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stack-trace">{children}</div>
  ),
  StackTraceHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  StackTraceError: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  StackTraceErrorType: () => <span />,
  StackTraceErrorMessage: () => <span />,
  StackTraceContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  StackTraceFrames: () => <div />,
  StackTraceExpandButton: () => <button aria-label="Expand" />,
}));

vi.mock("@/components/ai-elements/progress-bar", () => ({
  ProgressBar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="progress-bar">{children}</div>
  ),
  ProgressBarLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ProgressBarValue: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  ProgressBarTrack: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ProgressBarFill: () => <div />,
}));

vi.mock("@/components/ai-elements/status-indicator", () => ({
  StatusIndicator: ({ status }: { status: string }) => (
    <span data-testid="status-indicator">{status}</span>
  ),
}));

const mockGetSessionOperations = vi.fn();
vi.mock("@/lib/monitoring", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    getSessionOperations: (...args: unknown[]) =>
      mockGetSessionOperations(...args),
  };
});

function makeSession(
  overrides: Partial<MonitoringSession> = {},
): MonitoringSession {
  return {
    id: "sess-1",
    sdkSessionId: "sdk-abc123",
    model: "gpt-4",
    status: "ENDED",
    totalInputTokens: 1500,
    totalOutputTokens: 800,
    messageCount: 10,
    toolExecutionCount: 4,
    errorCount: 1,
    source: "web",
    createdAt: "2026-01-15T10:00:00Z",
    endedAt: "2026-01-15T10:05:00Z",
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

describe("SessionDetail", () => {
  it("renders session info", () => {
    const session = makeSession();
    renderWithProviders(<SessionDetail session={session} onBack={vi.fn()} />);
    expect(screen.getByText("Session Details")).toBeInTheDocument();
    expect(screen.getByText("sdk-abc123")).toBeInTheDocument();
    expect(screen.getByText("gpt-4")).toBeInTheDocument();
    expect(screen.getByText("web")).toBeInTheDocument();
  });

  it("renders metrics", () => {
    const session = makeSession();
    renderWithProviders(<SessionDetail session={session} onBack={vi.fn()} />);
    expect(screen.getByText("10")).toBeInTheDocument(); // messageCount
    expect(screen.getByText("4")).toBeInTheDocument(); // toolExecutionCount
    expect(screen.getByText("1")).toBeInTheDocument(); // errorCount
  });

  it("calls onBack when back button is clicked", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={onBack} />,
    );
    await user.click(screen.getByRole("button", { name: /back to sessions/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("shows status indicator for ACTIVE session", () => {
    renderWithProviders(
      <SessionDetail
        session={makeSession({ status: "ACTIVE" })}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByTestId("status-indicator")).toHaveTextContent(
      "streaming",
    );
  });

  it("shows status indicator for ERROR session", () => {
    renderWithProviders(
      <SessionDetail
        session={makeSession({ status: "ERROR" })}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByTestId("status-indicator")).toHaveTextContent("error");
  });

  it("shows progress 100% for ENDED session", () => {
    renderWithProviders(
      <SessionDetail
        session={makeSession({ status: "ENDED" })}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("displays operations timeline section", () => {
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    expect(screen.getByText("Operations Timeline")).toBeInTheDocument();
  });

  it("shows loading state for operations", () => {
    mockGetSessionOperations.mockReturnValue(new Promise(() => {}));
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    // The operations list will show loading
    expect(screen.getByText(/0 total/)).toBeInTheDocument();
  });

  it("shows empty state when no operations", async () => {
    mockGetSessionOperations.mockResolvedValue([]);
    renderWithProviders(
      <SessionDetail session={makeSession()} onBack={vi.fn()} />,
    );
    expect(
      await screen.findByText(/no operations recorded/i),
    ).toBeInTheDocument();
  });

  it("renders ENDED status badge", () => {
    renderWithProviders(
      <SessionDetail
        session={makeSession({ status: "ENDED" })}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText("ENDED")).toBeInTheDocument();
  });
});
