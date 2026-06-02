import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("use-stick-to-bottom", () => {
  const Content = ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>;
  const StickToBottom = ({
    children,
    className,
  }: {
    children: unknown;
    className?: string;
  }) => (
    <div className={className}>
      {typeof children === "function"
        ? children({ isAtBottom: true })
        : children}
    </div>
  );
  StickToBottom.Content = Content;
  return {
    StickToBottom,
    useStickToBottomContext: () => ({
      isAtBottom: true,
      scrollToBottom: vi.fn(),
    }),
  };
});

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  ConversationDownload,
  messagesToMarkdown,
} from "@/components/ai-elements/conversation";
import type { ConversationMessage } from "@/components/ai-elements/conversation";

describe("Conversation", () => {
  it("renders children", () => {
    render(
      <Conversation>
        <span>Chat messages</span>
      </Conversation>,
    );
    expect(screen.getByText("Chat messages")).toBeInTheDocument();
  });
});

describe("ConversationContent", () => {
  it("renders children", () => {
    render(
      <Conversation>
        <ConversationContent>
          <span>Message list</span>
        </ConversationContent>
      </Conversation>,
    );
    expect(screen.getByText("Message list")).toBeInTheDocument();
  });
});

describe("ConversationEmptyState", () => {
  it("renders default title and description", () => {
    render(<ConversationEmptyState />);
    expect(screen.getByText("No messages yet")).toBeInTheDocument();
    expect(
      screen.getByText("Start a conversation to see messages here"),
    ).toBeInTheDocument();
  });

  it("renders custom title and description", () => {
    render(
      <ConversationEmptyState
        title="Custom Title"
        description="Custom Description"
      />,
    );
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom Description")).toBeInTheDocument();
  });

  it("renders icon", () => {
    render(
      <ConversationEmptyState icon={<span data-testid="icon">🤖</span>} />,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("renders children override", () => {
    render(
      <ConversationEmptyState>
        <span>Custom empty state</span>
      </ConversationEmptyState>,
    );
    expect(screen.getByText("Custom empty state")).toBeInTheDocument();
    expect(screen.queryByText("No messages yet")).not.toBeInTheDocument();
  });
});

describe("ConversationScrollButton", () => {
  it("does not render when at bottom", () => {
    const { container } = render(<ConversationScrollButton />);
    // Mock returns isAtBottom: true, so button should not render
    expect(container.querySelector("button")).not.toBeInTheDocument();
  });
});

describe("ConversationDownload", () => {
  const messages: ConversationMessage[] = [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" },
  ];

  it("renders download button", () => {
    render(<ConversationDownload messages={messages} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("creates a download link on click", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:url");
    const revokeObjectURL = vi.fn();
    globalThis.URL.createObjectURL = createObjectURL;
    globalThis.URL.revokeObjectURL = revokeObjectURL;

    const clickSpy = vi.fn();
    const removeSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === "a") {
        el.click = clickSpy;
        el.remove = removeSpy;
      }
      return el;
    });

    render(<ConversationDownload messages={messages} />);
    fireEvent.click(screen.getByRole("button"));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:url");

    vi.restoreAllMocks();
  });
});

describe("messagesToMarkdown", () => {
  it("creates markdown from messages", () => {
    const messages: ConversationMessage[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ];
    const markdown = messagesToMarkdown(messages);
    expect(markdown).toContain("**User:** Hello");
    expect(markdown).toContain("**Assistant:** Hi there!");
  });

  it("uses custom format function", () => {
    const messages: ConversationMessage[] = [
      { role: "user", content: "Hello" },
    ];
    const formatter = (msg: ConversationMessage) =>
      `[${msg.role}] ${msg.content}`;
    const markdown = messagesToMarkdown(messages, formatter);
    expect(markdown).toBe("[user] Hello");
  });
});
