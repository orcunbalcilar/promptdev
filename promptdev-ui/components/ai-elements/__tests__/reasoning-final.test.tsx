import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Streamdown and plugins
vi.mock("streamdown", () => ({
  Streamdown: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="streamdown">{children}</div>
  ),
}));
vi.mock("@streamdown/cjk", () => ({ cjk: {} }));
vi.mock("@streamdown/code", () => ({ code: {} }));
vi.mock("@streamdown/math", () => ({ math: {} }));
vi.mock("@streamdown/mermaid", () => ({ mermaid: {} }));

import {
  Reasoning,
  ReasoningTrigger,
  useReasoning,
} from "@/components/ai-elements/reasoning";

describe("Reasoning component — uncovered lines", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Line 43: useReasoning throws when used outside of Reasoning
  it("useReasoning throws when used outside Reasoning context", () => {
    const Boom = () => {
      useReasoning();
      return null;
    };
    expect(() => render(<Boom />)).toThrow(
      "Reasoning components must be used within Reasoning",
    );
  });

  // Lines 96-97, 116-118, 121: auto-close after streaming ends
  it("auto-closes after streaming ends (after delay)", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Reasoning isStreaming={true} onOpenChange={onOpenChange}>
        <ReasoningTrigger />
      </Reasoning>,
    );

    // The collapsible should be open when streaming
    const trigger = screen.getByRole("button");
    expect(trigger).toBeInTheDocument();

    // Stop streaming — should trigger auto-close after AUTO_CLOSE_DELAY (1000ms)
    rerender(
      <Reasoning isStreaming={false} onOpenChange={onOpenChange}>
        <ReasoningTrigger />
      </Reasoning>,
    );

    // Advance past the auto-close delay
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // Lines 96-97: duration calculation when streaming stops
  it("computes duration in seconds when streaming stops", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const { rerender } = render(
      <Reasoning isStreaming={true}>
        <ReasoningTrigger />
      </Reasoning>,
    );

    // Advance 3 seconds
    vi.setSystemTime(now + 3000);

    rerender(
      <Reasoning isStreaming={false}>
        <ReasoningTrigger />
      </Reasoning>,
    );

    // The trigger should show "Thought for 3 seconds"
    expect(screen.getByText("Thought for 3 seconds")).toBeInTheDocument();
  });

  // Line 127: handleOpenChange — manual toggle via user click
  it("allows manual toggling via click", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();

    const onOpenChange = vi.fn();
    render(
      <Reasoning defaultOpen={false} onOpenChange={onOpenChange}>
        <ReasoningTrigger />
      </Reasoning>,
    );

    const trigger = screen.getByRole("button");
    await user.click(trigger);

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  // Line 43 + context: defaultGetThinkingMessage with duration=0
  it("shows 'Thinking...' shimmer when streaming", () => {
    render(
      <Reasoning isStreaming={true}>
        <ReasoningTrigger />
      </Reasoning>,
    );

    expect(screen.getByText("Thinking...")).toBeInTheDocument();
  });

  // defaultGetThinkingMessage with duration undefined and not streaming
  it("shows 'Thought for a few seconds' when no duration", () => {
    render(
      <Reasoning isStreaming={false}>
        <ReasoningTrigger />
      </Reasoning>,
    );

    expect(screen.getByText("Thought for a few seconds")).toBeInTheDocument();
  });

  // explicit duration prop
  it("shows duration from prop when provided", () => {
    render(
      <Reasoning duration={5} isStreaming={false}>
        <ReasoningTrigger />
      </Reasoning>,
    );

    expect(screen.getByText("Thought for 5 seconds")).toBeInTheDocument();
  });

  // defaultOpen=false prevents auto-open
  it("does not auto-open when defaultOpen is explicitly false", () => {
    const onOpenChange = vi.fn();
    render(
      <Reasoning
        defaultOpen={false}
        isStreaming={true}
        onOpenChange={onOpenChange}
      >
        <ReasoningTrigger />
      </Reasoning>,
    );

    // Should NOT have been called with true because defaultOpen is explicitly false
    expect(onOpenChange).not.toHaveBeenCalledWith(true);
  });
});
