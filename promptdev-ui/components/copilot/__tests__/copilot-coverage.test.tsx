/**
 * Coverage completion for copilot components:
 * - copilot-messages.tsx lines 111,124,152
 * - session-history-sidebar.tsx line 54 (catch block)
 * - settings-dialog.tsx line 41 (supportsReasoning fallback)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

// ── Mock ai-elements ──────────────────────────────────────────
vi.mock("@/components/ai-elements/reasoning", () => ({
  Reasoning: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="reasoning">{children}</div>
  ),
  ReasoningContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ReasoningTrigger: () => <button>Toggle reasoning</button>,
}));
vi.mock("@/components/ai-elements/shimmer", () => ({
  Shimmer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shimmer">{children}</div>
  ),
}));
vi.mock("@/components/ai-elements/tool", () => ({
  Tool: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tool">{children}</div>
  ),
  ToolContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ToolHeader: ({ title }: { title?: string }) => <div>{title}</div>,
  ToolInput: ({ input }: { input?: Record<string, unknown> }) => (
    <div>{JSON.stringify(input)}</div>
  ),
  ToolOutput: ({ output }: { output?: string }) => <div>{output}</div>,
}));
vi.mock("@/components/ai-elements/message", () => ({
  Message: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="message">{children}</div>
  ),
  MessageContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  MessageResponse: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="msg-response">{children}</div>
  ),
}));

import {
  CopilotMessageDisplay,
  StreamingAssistantMessage,
} from "../copilot-messages";
import type { CopilotMessage, CopilotToolExecution } from "@/lib/copilot/types";

const baseMsg: CopilotMessage = {
  id: "m1",
  role: "assistant",
  content: "Hello",
  timestamp: new Date().toISOString(),
};

const baseTool: CopilotToolExecution = {
  id: "t1",
  name: "readFile",
  input: { path: "a.ts" },
  output: "contents",
  state: "completed",
  startedAt: new Date().toISOString(),
};

describe("copilot-messages.tsx branch coverage", () => {
  it("line 111: isLast=false skips streaming reasoning branch", () => {
    render(
      <CopilotMessageDisplay
        message={{ ...baseMsg, reasoning: "deep thought" }}
        isLast={false}
        isStreaming={true}
        streamingContent=""
        streamingReasoning="active reasoning"
        activeTools={[]}
      />,
    );
    // Should render reasoning block with message.reasoning (not streaming)
    expect(screen.getByTestId("reasoning")).toBeInTheDocument();
  });

  it("line 124: isLast=true with activeTools shows active tool executions", () => {
    render(
      <CopilotMessageDisplay
        message={baseMsg}
        isLast={true}
        isStreaming={true}
        streamingContent=""
        streamingReasoning=""
        activeTools={[baseTool]}
      />,
    );
    expect(screen.getAllByTestId("tool")).toHaveLength(1);
  });

  it("line 124: isLast=false hides active tools", () => {
    render(
      <CopilotMessageDisplay
        message={baseMsg}
        isLast={false}
        isStreaming={true}
        streamingContent=""
        streamingReasoning=""
        activeTools={[baseTool]}
      />,
    );
    // Only message.tools would show, not activeTools
    expect(screen.queryAllByTestId("tool")).toHaveLength(0);
  });

  it("line 152: StreamingAssistantMessage with reasoning but no content shows reasoning", () => {
    render(
      <StreamingAssistantMessage
        streamingContent=""
        streamingReasoning="thinking hard"
        tools={[]}
      />,
    );
    expect(screen.getByTestId("reasoning")).toBeInTheDocument();
    // No shimmer because streamingReasoning is truthy
    expect(screen.queryByTestId("shimmer")).not.toBeInTheDocument();
  });

  it("line 152: StreamingAssistantMessage with no reasoning and no tools shows shimmer", () => {
    render(
      <StreamingAssistantMessage
        streamingContent=""
        streamingReasoning=""
        tools={[]}
      />,
    );
    expect(screen.getByTestId("shimmer")).toBeInTheDocument();
  });
});

// ── settings-dialog.tsx ────────────────────────────────────────
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
  }) => (
    <button data-testid="select" onClick={() => onValueChange?.("test")}>
      {children}
    </button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => <span>value</span>,
}));

import { SettingsDialog } from "../settings-dialog";

describe("settings-dialog.tsx branch coverage", () => {
  it("line 41: supportsReasoning falls back to false for unknown model", () => {
    render(
      <SettingsDialog
        model="unknown-model"
        setModel={vi.fn()}
        reasoningEffort="medium"
        setReasoningEffort={vi.fn()}
        models={[
          {
            id: "gpt-4",
            name: "GPT-4",
            capabilities: {
              supports: { reasoningEffort: true, vision: false },
              limits: { max_context_window_tokens: 128000 },
            },
          },
        ]}
      />,
    );
    // Renders without reasoning effort selector since model is not found
    expect(screen.queryByText("Reasoning Effort")).not.toBeInTheDocument();
  });
});

// ── session-history-sidebar.tsx ────────────────────────────────
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

describe("session-history-sidebar.tsx branch coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("line 54: catch block on fetch error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("network fail"),
    );
    const { SessionHistorySidebar } =
      await import("../session-history-sidebar");
    render(
      <SessionHistorySidebar
        activeSessionId="s1"
        onResumeSession={vi.fn()}
        onNewSession={vi.fn()}
        onDeleteSession={vi.fn()}
      />,
    );
    // Should not crash — catch is non-critical
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });
    vi.restoreAllMocks();
  });
});
