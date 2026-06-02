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
  Tool: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tool">{children}</div>
  ),
  ToolContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ToolHeader: ({ title }: { title: string }) => <div>{title}</div>,
  ToolInput: () => <div data-testid="tool-input" />,
  ToolOutput: () => <div data-testid="tool-output" />,
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

function makeTool(overrides: Partial<CopilotToolExecution> = {}): CopilotToolExecution {
  return {
    id: "tool-1",
    name: "readFile",
    input: { path: "/src/index.ts" },
    state: "completed",
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeMessage(overrides: Partial<CopilotMessage> = {}): CopilotMessage {
  return {
    id: "msg-1",
    role: "assistant",
    content: "Hello world",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe("CopilotMessageDisplay", () => {
  it("renders message content", () => {
    render(
      <CopilotMessageDisplay
        message={makeMessage()}
        isLast={false}
        isStreaming={false}
        streamingContent=""
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    expect(screen.getByText("Hello world")).toBeDefined();
  });

  it("renders message tools with unique keys", () => {
    const tools = [
      makeTool({ id: "t-1", name: "readFile" }),
      makeTool({ id: "t-2", name: "writeFile" }),
    ];

    const { container } = render(
      <CopilotMessageDisplay
        message={makeMessage({ tools })}
        isLast={false}
        isStreaming={false}
        streamingContent=""
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    const toolElements = container.querySelectorAll("[data-testid='tool']");
    expect(toolElements.length).toBe(2);
  });

  it("renders active tools alongside message tools without key collision", () => {
    const messageTools = [
      makeTool({ id: "t-1", name: "readFile" }),
    ];
    const activeTools = [
      makeTool({ id: "t-1", name: "readFile" }), // Same ID — should not cause key collision
      makeTool({ id: "t-2", name: "writeFile" }),
    ];

    // This should NOT produce a console warning about duplicate keys
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <CopilotMessageDisplay
        message={makeMessage({ tools: messageTools })}
        isLast={true}
        isStreaming={true}
        streamingContent=""
        streamingReasoning=""
        activeTools={activeTools}
      />,
    );

    // Check no duplicate key warnings
    const keyWarnings = consoleSpy.mock.calls.filter(
      (args) => typeof args[0] === "string" && args[0].includes("unique \"key\""),
    );
    expect(keyWarnings).toHaveLength(0);

    consoleSpy.mockRestore();
  });

  it("handles tools with undefined IDs gracefully", () => {
    const tools = [
      makeTool({ id: undefined as unknown as string, name: "readFile" }),
      makeTool({ id: undefined as unknown as string, name: "writeFile" }),
    ];

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <CopilotMessageDisplay
        message={makeMessage({ tools })}
        isLast={false}
        isStreaming={false}
        streamingContent=""
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    const keyWarnings = consoleSpy.mock.calls.filter(
      (args) => typeof args[0] === "string" && args[0].includes("unique \"key\""),
    );
    expect(keyWarnings).toHaveLength(0);

    consoleSpy.mockRestore();
  });

  it("renders reasoning when present", () => {
    render(
      <CopilotMessageDisplay
        message={makeMessage({ reasoning: "I think therefore I am" })}
        isLast={false}
        isStreaming={false}
        streamingContent=""
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    expect(screen.getByText("I think therefore I am")).toBeDefined();
  });

  it("shows streaming content for last message", () => {
    render(
      <CopilotMessageDisplay
        message={makeMessage({ content: "" })}
        isLast={true}
        isStreaming={true}
        streamingContent="Streaming response..."
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    expect(screen.getByText("Streaming response...")).toBeDefined();
  });

  it("shows shimmer when streaming with no content", () => {
    render(
      <CopilotMessageDisplay
        message={makeMessage({ content: "" })}
        isLast={true}
        isStreaming={true}
        streamingContent=""
        streamingReasoning=""
        activeTools={[]}
      />,
    );

    expect(screen.getByTestId("shimmer")).toBeDefined();
    expect(screen.getByText("Thinking...")).toBeDefined();
  });
});

describe("StreamingAssistantMessage", () => {
  it("renders streaming content", () => {
    render(
      <StreamingAssistantMessage
        streamingContent="Working on it..."
        streamingReasoning=""
        tools={[]}
      />,
    );

    expect(screen.getByText("Working on it...")).toBeDefined();
  });

  it("renders tools with unique keys", () => {
    const tools = [
      makeTool({ id: "t-1", name: "readFile" }),
      makeTool({ id: "t-2", name: "writeFile" }),
    ];

    const { container } = render(
      <StreamingAssistantMessage
        streamingContent=""
        streamingReasoning=""
        tools={tools}
      />,
    );

    const toolElements = container.querySelectorAll("[data-testid='tool']");
    expect(toolElements.length).toBe(2);
  });

  it("shows shimmer when no streaming content", () => {
    render(
      <StreamingAssistantMessage
        streamingContent=""
        streamingReasoning=""
        tools={[]}
      />,
    );

    expect(screen.getByTestId("shimmer")).toBeDefined();
  });
});
