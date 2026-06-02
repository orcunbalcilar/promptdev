import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock AI element components
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
  Tool: ({
    children,
    defaultOpen,
  }: {
    children: React.ReactNode;
    defaultOpen?: boolean;
  }) => (
    <div data-testid="tool" data-default-open={defaultOpen}>
      {children}
    </div>
  ),
  ToolContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ToolHeader: ({
    title,
    state,
  }: {
    title: string;
    state: string;
  }) => (
    <div data-testid="tool-header" data-state={state}>
      {title}
    </div>
  ),
  ToolInput: () => <div data-testid="tool-input" />,
  ToolOutput: ({
    output,
    errorText,
  }: {
    output?: unknown;
    errorText?: string;
  }) => (
    <div data-testid="tool-output" data-error={errorText}>
      {String(output)}
    </div>
  ),
}));

vi.mock("@/components/ai-elements/message", () => ({
  Message: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="message">{children}</div>
  ),
  MessageContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="message-content">{children}</div>
  ),
  MessageResponse: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="message-response">{children}</div>
  ),
}));

import {
  CopilotMessageDisplay,
  StreamingAssistantMessage,
} from "@/components/copilot/copilot-messages";
import type {
  CopilotMessage,
  CopilotToolExecution,
} from "@/lib/copilot/types";

function makeTool(
  overrides: Partial<CopilotToolExecution> = {},
): CopilotToolExecution {
  return {
    id: "tool-1",
    name: "readFile",
    input: { path: "/src/index.ts" },
    state: "completed",
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeMessage(
  overrides: Partial<CopilotMessage> = {},
): CopilotMessage {
  return {
    id: "msg-1",
    role: "assistant",
    content: "Hello world",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe("ToolExecution - state mapping (uncovered lines 32-34, 38-40)", () => {
  it("maps pending state to input-streaming", () => {
    const { container } = render(
      <CopilotMessageDisplay
        message={makeMessage({
          tools: [makeTool({ state: "pending", name: "pendingTool" })],
        })}
        isLast={false}
        isStreaming={false}
        streamingContent=""
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    const header = container.querySelector(
      '[data-state="input-streaming"]',
    );
    expect(header).toBeTruthy();
  });

  it("maps running state to input-available", () => {
    const { container } = render(
      <CopilotMessageDisplay
        message={makeMessage({
          tools: [makeTool({ state: "running", name: "runningTool" })],
        })}
        isLast={false}
        isStreaming={false}
        streamingContent=""
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    const header = container.querySelector(
      '[data-state="input-available"]',
    );
    expect(header).toBeTruthy();
  });

  it("maps completed state to output-available", () => {
    const { container } = render(
      <CopilotMessageDisplay
        message={makeMessage({
          tools: [makeTool({ state: "completed", name: "completedTool" })],
        })}
        isLast={false}
        isStreaming={false}
        streamingContent=""
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    const header = container.querySelector(
      '[data-state="output-available"]',
    );
    expect(header).toBeTruthy();
  });

  it("maps error state to output-error", () => {
    const { container } = render(
      <CopilotMessageDisplay
        message={makeMessage({
          tools: [
            makeTool({
              state: "error",
              name: "errorTool",
              error: "Something went wrong",
            }),
          ],
        })}
        isLast={false}
        isStreaming={false}
        streamingContent=""
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    const header = container.querySelector(
      '[data-state="output-error"]',
    );
    expect(header).toBeTruthy();
  });

  it("defaults to input-streaming for unknown state", () => {
    const { container } = render(
      <CopilotMessageDisplay
        message={makeMessage({
          tools: [
            makeTool({
              state: "unknown" as any,
              name: "unknownTool",
            }),
          ],
        })}
        isLast={false}
        isStreaming={false}
        streamingContent=""
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    const header = container.querySelector(
      '[data-state="input-streaming"]',
    );
    expect(header).toBeTruthy();
  });
});

describe("ToolExecution - tool output and duration", () => {
  it("renders tool output when present", () => {
    render(
      <CopilotMessageDisplay
        message={makeMessage({
          tools: [
            makeTool({
              state: "completed",
              output: "File content here",
            }),
          ],
        })}
        isLast={false}
        isStreaming={false}
        streamingContent=""
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    expect(screen.getByTestId("tool-output")).toBeTruthy();
  });

  it("renders tool error when present", () => {
    render(
      <CopilotMessageDisplay
        message={makeMessage({
          tools: [
            makeTool({
              state: "error",
              error: "File not found",
            }),
          ],
        })}
        isLast={false}
        isStreaming={false}
        streamingContent=""
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    const output = screen.getByTestId("tool-output");
    expect(output.getAttribute("data-error")).toBe("File not found");
  });

  it("renders tool duration when present", () => {
    render(
      <CopilotMessageDisplay
        message={makeMessage({
          tools: [
            makeTool({
              state: "completed",
              duration: 1500,
              output: "done",
            }),
          ],
        })}
        isLast={false}
        isStreaming={false}
        streamingContent=""
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    expect(screen.getByText("Duration: 1500ms")).toBeTruthy();
  });

  it("does not render duration when not present", () => {
    render(
      <CopilotMessageDisplay
        message={makeMessage({
          tools: [
            makeTool({
              state: "completed",
              duration: undefined,
              output: "result",
            }),
          ],
        })}
        isLast={false}
        isStreaming={false}
        streamingContent=""
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    expect(screen.queryByText(/Duration/)).toBeNull();
  });
});

describe("getMessageContent - edge cases", () => {
  it("returns null when streaming with reasoning but no content", () => {
    render(
      <CopilotMessageDisplay
        message={makeMessage({ content: "" })}
        isLast={true}
        isStreaming={true}
        streamingContent=""
        streamingReasoning="I'm thinking..."
        activeTools={[]}
      />,
    );

    // No shimmer or MessageResponse for streaming content
    expect(screen.queryByTestId("shimmer")).toBeNull();
  });

  it("returns null when streaming with active tools but no content", () => {
    render(
      <CopilotMessageDisplay
        message={makeMessage({ content: "" })}
        isLast={true}
        isStreaming={true}
        streamingContent=""
        streamingReasoning=""
        activeTools={[makeTool({ state: "running" })]}
      />,
    );

    // Active tools present means no shimmer
    expect(screen.queryByTestId("shimmer")).toBeNull();
  });
});

describe("Tool defaultOpen", () => {
  it("sets defaultOpen true for error state", () => {
    const { container } = render(
      <CopilotMessageDisplay
        message={makeMessage({
          tools: [makeTool({ state: "error", error: "fail" })],
        })}
        isLast={false}
        isStreaming={false}
        streamingContent=""
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    const tool = container.querySelector('[data-default-open="true"]');
    expect(tool).toBeTruthy();
  });

  it("sets defaultOpen true for completed state", () => {
    const { container } = render(
      <CopilotMessageDisplay
        message={makeMessage({
          tools: [makeTool({ state: "completed" })],
        })}
        isLast={false}
        isStreaming={false}
        streamingContent=""
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    const tool = container.querySelector('[data-default-open="true"]');
    expect(tool).toBeTruthy();
  });

  it("sets defaultOpen false for running state", () => {
    const { container } = render(
      <CopilotMessageDisplay
        message={makeMessage({
          tools: [makeTool({ state: "running" })],
        })}
        isLast={false}
        isStreaming={false}
        streamingContent=""
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    const tool = container.querySelector('[data-default-open="false"]');
    expect(tool).toBeTruthy();
  });
});
