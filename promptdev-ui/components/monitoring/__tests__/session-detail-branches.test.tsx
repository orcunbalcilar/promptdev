/**
 * Branch coverage for session-detail.tsx
 * Targets: lines 119 (ErrorOperation message fallback), 249 (ToolInput message),
 *          273 (ToolOutput errorMessage/message), 307 (toolName Badge)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockGetSessionOperations = vi.fn();
vi.mock("@/lib/monitoring", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, getSessionOperations: (...a: unknown[]) => mockGetSessionOperations(...a) };
});

vi.mock("@/components/ai-elements/tool", () => ({
  Tool: ({ children }: { children: React.ReactNode }) => <div data-testid="tool">{children}</div>,
  ToolHeader: ({ title }: { title?: string }) => <div data-testid="tool-header">{title}</div>,
  ToolContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ToolInput: ({ input }: { input: { message: string } }) => <div data-testid="tool-input">{input.message}</div>,
  ToolOutput: ({ output, errorText }: { output?: string; errorText?: string }) => (
    <div data-testid="tool-output">{errorText ?? output}</div>
  ),
}));

vi.mock("@/components/ai-elements/stack-trace", () => ({
  StackTrace: ({ children, trace }: { children: React.ReactNode; trace: string }) => (
    <div data-testid="stack-trace" data-trace={trace}>{children}</div>
  ),
  StackTraceHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StackTraceError: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StackTraceErrorType: () => <span />,
  StackTraceErrorMessage: () => <span />,
  StackTraceContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StackTraceFrames: () => <div />,
  StackTraceExpandButton: () => <button aria-label="expand" />,
}));

vi.mock("@/components/ai-elements/progress-bar", () => ({
  ProgressBar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ProgressBarLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ProgressBarValue: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ProgressBarTrack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ProgressBarFill: () => <div />,
}));

vi.mock("@/components/ai-elements/status-indicator", () => ({
  StatusIndicator: () => <div />,
}));

import { SessionDetail } from "../session-detail";

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const baseSession = {
  id: "s1",
  sdkSessionId: "sdk-1",
  model: "gpt-4",
  status: "ENDED" as const,
  source: "task-orchestrator",
  createdAt: new Date().toISOString(),
  taskId: "t1",
  totalInputTokens: 100,
  totalOutputTokens: 50,
  messageCount: 3,
  toolExecutionCount: 1,
  errorCount: 0,
};

describe("session-detail.tsx branch coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("line 119: ErrorOperation uses message fallback when errorMessage is absent", async () => {
    mockGetSessionOperations.mockResolvedValue([
      {
        id: "op-err",
        sessionId: "s1",
        operationType: "ERROR",
        success: false,
        createdAt: new Date().toISOString(),
        message: "Something went wrong",
        // no errorMessage → falls through to op.message ?? op.operationType
      },
    ]);
    renderWithQuery(<SessionDetail session={baseSession} onBack={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId("stack-trace")).toBeInTheDocument();
    });
    // traceText should be the message, not errorMessage
    expect(screen.getByTestId("stack-trace").dataset.trace).toBe("Something went wrong");
  });

  it("line 119: ErrorOperation falls back to operationType when both absent", async () => {
    mockGetSessionOperations.mockResolvedValue([
      {
        id: "op-err2",
        sessionId: "s1",
        operationType: "ERROR",
        success: false,
        createdAt: new Date().toISOString(),
        // no errorMessage, no message → falls back to operationType
      },
    ]);
    renderWithQuery(<SessionDetail session={baseSession} onBack={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId("stack-trace")).toBeInTheDocument();
    });
    expect(screen.getByTestId("stack-trace").dataset.trace).toBe("ERROR");
  });

  it("lines 249+273: ToolOperation renders ToolInput and ToolOutput with message", async () => {
    mockGetSessionOperations.mockResolvedValue([
      {
        id: "op-tool",
        sessionId: "s1",
        operationType: "TOOL_EXECUTION_END",
        success: true,
        toolName: "list_files",
        message: "Listed files successfully",
        createdAt: new Date().toISOString(),
      },
    ]);
    renderWithQuery(<SessionDetail session={baseSession} onBack={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId("tool-input")).toBeInTheDocument();
    });
    expect(screen.getByTestId("tool-input")).toHaveTextContent("Listed files successfully");
    expect(screen.getByTestId("tool-output")).toBeInTheDocument();
  });

  it("line 273: ToolOperation renders ToolOutput with errorMessage", async () => {
    // TOOL_EXECUTION_ERROR contains 'TOOL', so it routes to ToolOperation
    mockGetSessionOperations.mockResolvedValue([
      {
        id: "op-tool-err",
        sessionId: "s1",
        operationType: "TOOL_EXECUTION_ERROR",
        success: false,
        toolName: "run_command",
        errorMessage: "Command failed",
        createdAt: new Date().toISOString(),
      },
    ]);
    renderWithQuery(<SessionDetail session={baseSession} onBack={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId("tool-output")).toBeInTheDocument();
    });
    expect(screen.getByTestId("tool-output")).toHaveTextContent("Command failed");
  });

  it("line 307: DefaultOperation renders toolName badge", async () => {
    mockGetSessionOperations.mockResolvedValue([
      {
        id: "op-default",
        sessionId: "s1",
        operationType: "SESSION_START",
        success: true,
        toolName: "initializer",
        createdAt: new Date().toISOString(),
      },
    ]);
    renderWithQuery(<SessionDetail session={baseSession} onBack={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText("initializer")).toBeInTheDocument();
    });
  });
});
