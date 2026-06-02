// /Users/orcun/projects/promptdev/promptdev-ui/components/ai-elements/__tests__/reasoning-coverage.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@radix-ui/react-use-controllable-state", async () => {
  const react = await import("react");
  return {
    useControllableState: ({
      defaultProp,
      prop,
    }: {
      defaultProp: unknown;
      prop?: unknown;
      onChange?: (v: unknown) => void;
    }) => {
      const [val, setVal] = react.useState(
        prop === undefined ? defaultProp : prop
      );
      return [val, setVal] as const;
    },
  };
});

vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="collapsible" {...props}>
      {children}
    </div>
  ),
  CollapsibleContent: ({
    children,
    ...props
  }: React.ComponentProps<"div">) => (
    <div data-testid="collapsible-content" {...props}>
      {children}
    </div>
  ),
  CollapsibleTrigger: ({
    children,
    ...props
  }: React.ComponentProps<"button">) => (
    <button data-testid="collapsible-trigger" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("streamdown", () => ({
  Streamdown: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="streamdown" {...props}>
      {children}
    </div>
  ),
}));

vi.mock("@streamdown/cjk", () => ({ cjk: {} }));
vi.mock("@streamdown/code", () => ({ code: {} }));
vi.mock("@streamdown/math", () => ({ math: {} }));
vi.mock("@streamdown/mermaid", () => ({ mermaid: {} }));

vi.mock("@/components/ai-elements/shimmer", () => ({
  Shimmer: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="shimmer">{children}</span>
  ),
}));

import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "../reasoning";

describe("ReasoningTrigger (lines 97-105)", () => {
  it("renders default thinking message with brain icon when not streaming", () => {
    render(
      <Reasoning isStreaming={false} defaultOpen={true}>
        <ReasoningTrigger />
      </Reasoning>
    );
    const trigger = screen.getByTestId("collapsible-trigger");
    expect(trigger).toBeInTheDocument();
    // Should show "Thought for a few seconds" when not streaming and duration is undefined
    expect(trigger).toHaveTextContent("Thought for a few seconds");
  });

  it("renders thinking shimmer when streaming", () => {
    render(
      <Reasoning isStreaming={true}>
        <ReasoningTrigger />
      </Reasoning>
    );
    expect(screen.getByTestId("shimmer")).toHaveTextContent("Thinking...");
  });

  it("renders with custom getThinkingMessage", () => {
    render(
      <Reasoning isStreaming={false} defaultOpen={true}>
        <ReasoningTrigger
          getThinkingMessage={(isStreaming) =>
            isStreaming ? "Working..." : "Done thinking"
          }
        />
      </Reasoning>
    );
    expect(screen.getByTestId("collapsible-trigger")).toHaveTextContent(
      "Done thinking"
    );
  });

  it("renders custom children instead of default content", () => {
    render(
      <Reasoning isStreaming={false} defaultOpen={true}>
        <ReasoningTrigger>
          <span>Custom trigger</span>
        </ReasoningTrigger>
      </Reasoning>
    );
    expect(screen.getByText("Custom trigger")).toBeInTheDocument();
  });
});

describe("ReasoningContent (lines 116-127)", () => {
  it("renders children via Streamdown", () => {
    render(
      <Reasoning isStreaming={false} defaultOpen={true}>
        <ReasoningContent>Some reasoning text</ReasoningContent>
      </Reasoning>
    );
    expect(screen.getByTestId("streamdown")).toHaveTextContent(
      "Some reasoning text"
    );
  });

  it("renders with custom className", () => {
    render(
      <Reasoning isStreaming={false} defaultOpen={true}>
        <ReasoningContent className="extra-class">Content</ReasoningContent>
      </Reasoning>
    );
    const content = screen.getByTestId("collapsible-content");
    expect(content).toBeInTheDocument();
    expect(content.className).toContain("extra-class");
  });
});
