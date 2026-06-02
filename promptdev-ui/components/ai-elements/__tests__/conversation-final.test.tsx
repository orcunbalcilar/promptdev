import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mock use-stick-to-bottom
vi.mock("use-stick-to-bottom", () => {
  const StickToBottom = ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="stick-to-bottom" {...props}>
      {children}
    </div>
  );
  StickToBottom.Content = ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="stick-content" {...props}>
      {children}
    </div>
  );

  return {
    StickToBottom,
    useStickToBottomContext: vi.fn(),
  };
});

import { ConversationScrollButton } from "@/components/ai-elements/conversation";
import { useStickToBottomContext } from "use-stick-to-bottom";

const mockUseStickToBottomContext = vi.mocked(useStickToBottomContext);

describe("ConversationScrollButton (line 81)", () => {
  it("renders scroll button when not at bottom", () => {
    const scrollToBottom = vi.fn();
    mockUseStickToBottomContext.mockReturnValue({
      isAtBottom: false,
      scrollToBottom,
    } as never);

    render(<ConversationScrollButton />);

    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(scrollToBottom).toHaveBeenCalled();
  });

  it("does not render when at bottom (line 81 - conditional render)", () => {
    mockUseStickToBottomContext.mockReturnValue({
      isAtBottom: true,
      scrollToBottom: vi.fn(),
    } as never);

    const { container } = render(<ConversationScrollButton />);
    expect(container.innerHTML).toBe("");
  });
});
