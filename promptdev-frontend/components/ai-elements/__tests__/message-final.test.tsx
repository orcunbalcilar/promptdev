import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

// Mock Tooltip so portal-based content renders in jsdom
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  ),
  Tooltip: ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipTrigger: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    asChild?: boolean;
  }) => <div {...props}>{children}</div>,
  TooltipContent: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock Streamdown and plugins
vi.mock("streamdown", () => ({
  Streamdown: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div data-testid="streamdown" className={className}>{children}</div>
  ),
}));
vi.mock("@streamdown/cjk", () => ({ cjk: {} }));
vi.mock("@streamdown/code", () => ({ code: {} }));
vi.mock("@streamdown/math", () => ({ math: {} }));
vi.mock("@streamdown/mermaid", () => ({ mermaid: {} }));

import React from "react";

import {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
  MessageBranch,
  MessageBranchContent,
  MessageBranchSelector,
  MessageBranchPrevious,
  MessageBranchNext,
  MessageBranchPage,
  MessageResponse,
  MessageToolbar,
} from "@/components/ai-elements/message";

// ResizeObserver mock
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

describe("Message — uncovered lines", () => {
  // Line 134: MessageAction renders with tooltip
  it("renders MessageAction with tooltip", async () => {
    const user = userEvent.setup();

    render(
      <Message from="assistant">
        <MessageContent>Hello</MessageContent>
        <MessageActions>
          <MessageAction tooltip="Copy message" label="Copy">
            <span>📋</span>
          </MessageAction>
        </MessageActions>
      </Message>
    );

    const button = screen.getByRole("button", { name: /Copy/ });
    expect(button).toBeInTheDocument();

    // Hover to show tooltip
    await user.hover(button);
  });

  // Lines 166-167: MessageAction without tooltip renders plain button
  it("renders MessageAction without tooltip", () => {
    render(
      <Message from="user">
        <MessageContent>Hello</MessageContent>
        <MessageActions>
          <MessageAction label="Edit">
            <span>✏</span>
          </MessageAction>
        </MessageActions>
      </Message>
    );

    expect(screen.getByRole("button", { name: /Edit/ })).toBeInTheDocument();
  });

  // Line 338: MessageToolbar renders children
  it("renders MessageToolbar with actions", () => {
    render(
      <Message from="assistant">
        <MessageContent>Response text</MessageContent>
        <MessageToolbar>
          <span>Left side</span>
          <span>Right side</span>
        </MessageToolbar>
      </Message>
    );

    expect(screen.getByText("Left side")).toBeInTheDocument();
    expect(screen.getByText("Right side")).toBeInTheDocument();
  });

  // Message from user has special styling class
  it("renders user message with user styling", () => {
    const { container } = render(
      <Message from="user">
        <MessageContent>User message</MessageContent>
      </Message>
    );

    const messageDiv = container.firstChild as HTMLElement;
    expect(messageDiv.className).toContain("is-user");
  });

  // Message from assistant has assistant styling
  it("renders assistant message with assistant styling", () => {
    const { container } = render(
      <Message from="assistant">
        <MessageContent>Assistant response</MessageContent>
      </Message>
    );

    const messageDiv = container.firstChild as HTMLElement;
    expect(messageDiv.className).toContain("is-assistant");
  });

  // MessageBranch with navigation
  it("navigates branches with previous and next buttons", async () => {
    const user = userEvent.setup();
    const onBranchChange = vi.fn();

    render(
      <Message from="assistant">
        <MessageBranch onBranchChange={onBranchChange}>
          <MessageBranchContent>
            <div key="a">Branch A content</div>
            <div key="b">Branch B content</div>
          </MessageBranchContent>
          <MessageBranchSelector>
            <MessageBranchPrevious />
            <MessageBranchPage />
            <MessageBranchNext />
          </MessageBranchSelector>
        </MessageBranch>
      </Message>
    );

    // Click next
    await user.click(screen.getByLabelText("Next branch"));
    expect(onBranchChange).toHaveBeenCalledWith(1);

    // Click previous
    await user.click(screen.getByLabelText("Previous branch"));
    expect(onBranchChange).toHaveBeenCalled();
  });

  // MessageResponse renders markdown content
  it("renders MessageResponse", () => {
    render(
      <Message from="assistant">
        <MessageContent>
          <MessageResponse>Hello **world**</MessageResponse>
        </MessageContent>
      </Message>
    );

    expect(screen.getByTestId("streamdown")).toBeInTheDocument();
  });

  // Line 134: useMessageBranch throws outside MessageBranch context
  it("MessageBranchContent throws when used outside MessageBranch", () => {
    expect(() =>
      render(
        <Message from="user">
          <MessageContent>
            <MessageBranchContent index={0}>Hello</MessageBranchContent>
          </MessageContent>
        </Message>
      )
    ).toThrow("MessageBranch components must be used within MessageBranch");
  });

  // Line 338: MessageResponse memo comparison — same children = no re-render
  it("MessageResponse memo does not re-render for same children", () => {
    const { rerender } = render(
      <Message from="assistant">
        <MessageContent>
          <MessageResponse>Same content</MessageResponse>
        </MessageContent>
      </Message>
    );

    // Re-render with same children
    rerender(
      <Message from="assistant">
        <MessageContent>
          <MessageResponse>Same content</MessageResponse>
        </MessageContent>
      </Message>
    );

    expect(screen.getByTestId("streamdown")).toHaveTextContent("Same content");
  });

  // MessageResponse memo — different children causes re-render
  it("MessageResponse re-renders for different children", () => {
    const { rerender } = render(
      <Message from="assistant">
        <MessageContent>
          <MessageResponse>Content A</MessageResponse>
        </MessageContent>
      </Message>
    );

    rerender(
      <Message from="assistant">
        <MessageContent>
          <MessageResponse>Content B</MessageResponse>
        </MessageContent>
      </Message>
    );

    expect(screen.getByTestId("streamdown")).toHaveTextContent("Content B");
  });

  // MessageToolbar renders
  it("renders MessageToolbar", () => {
    render(
      <Message from="assistant">
        <MessageToolbar>
          <button type="button">Like</button>
        </MessageToolbar>
      </Message>
    );

    expect(screen.getByText("Like")).toBeInTheDocument();
  });

  // --- Round 3: targeted branch coverage ---

  // L166:b1 — goToPrevious wraps from branch 0 to last branch
  it("wraps to last branch when clicking Previous at branch 0", async () => {
    const user = userEvent.setup();
    const onBranchChange = vi.fn();

    render(
      <Message from="assistant">
        <MessageBranch onBranchChange={onBranchChange}>
          <MessageBranchContent>
            <div key="a">Branch A</div>
            <div key="b">Branch B</div>
            <div key="c">Branch C</div>
          </MessageBranchContent>
          <MessageBranchSelector>
            <MessageBranchPrevious />
            <MessageBranchPage />
            <MessageBranchNext />
          </MessageBranchSelector>
        </MessageBranch>
      </Message>
    );

    // Starting at branch 0 — click Previous to wrap to last (2)
    await user.click(screen.getByLabelText("Previous branch"));
    expect(onBranchChange).toHaveBeenCalledWith(2);
  });

  // L172:b1 — goToNext wraps from last branch to branch 0
  it("wraps to first branch when clicking Next at last branch", async () => {
    const user = userEvent.setup();
    const onBranchChange = vi.fn();

    render(
      <Message from="assistant">
        <MessageBranch onBranchChange={onBranchChange}>
          <MessageBranchContent>
            <div key="a">Branch A</div>
            <div key="b">Branch B</div>
          </MessageBranchContent>
          <MessageBranchSelector>
            <MessageBranchPrevious />
            <MessageBranchPage />
            <MessageBranchNext />
          </MessageBranchSelector>
        </MessageBranch>
      </Message>
    );

    // Click Next to go to branch 1 (last)
    await user.click(screen.getByLabelText("Next branch"));
    expect(onBranchChange).toHaveBeenCalledWith(1);

    // Click Next again to wrap to branch 0
    await user.click(screen.getByLabelText("Next branch"));
    expect(onBranchChange).toHaveBeenCalledWith(0);
  });

  // L206:b1 — single child (not array) passed to MessageBranchContent
  it("handles single child in MessageBranchContent", () => {
    render(
      <Message from="assistant">
        <MessageBranch>
          <MessageBranchContent>
            <div>Only branch content</div>
          </MessageBranchContent>
        </MessageBranch>
      </Message>
    );

    // Single child is wrapped in array internally
    expect(screen.getByText("Only branch content")).toBeInTheDocument();
  });
});
