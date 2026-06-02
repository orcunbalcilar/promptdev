import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("streamdown", () => ({
  Streamdown: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="streamdown" className={className}>
      {children}
    </div>
  ),
}));
vi.mock("@streamdown/cjk", () => ({ cjk: vi.fn() }));
vi.mock("@streamdown/code", () => ({ code: vi.fn() }));
vi.mock("@streamdown/math", () => ({ math: vi.fn() }));
vi.mock("@streamdown/mermaid", () => ({ mermaid: vi.fn() }));

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

describe("Message", () => {
  it("renders children", () => {
    render(<Message from="user">Hello world</Message>);

    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("applies user role className", () => {
    const { container } = render(<Message from="user">User msg</Message>);

    expect(container.firstChild).toHaveClass("is-user");
  });

  it("applies assistant role className", () => {
    const { container } = render(<Message from="assistant">Bot msg</Message>);

    expect(container.firstChild).toHaveClass("is-assistant");
  });
});

describe("MessageContent", () => {
  it("renders children", () => {
    render(<MessageContent>Content text</MessageContent>);

    expect(screen.getByText("Content text")).toBeInTheDocument();
  });

  it("applies className", () => {
    const { container } = render(
      <MessageContent className="custom">Text</MessageContent>,
    );

    expect(container.firstChild).toHaveClass("custom");
  });
});

describe("MessageActions", () => {
  it("renders children", () => {
    render(
      <MessageActions>
        <button>Action 1</button>
      </MessageActions>,
    );

    expect(screen.getByText("Action 1")).toBeInTheDocument();
  });
});

describe("MessageAction", () => {
  it("renders button with icon", () => {
    render(
      <MessageAction label="Copy">
        <span>📋</span>
      </MessageAction>,
    );

    expect(screen.getByRole("button", { name: /Copy/ })).toBeInTheDocument();
  });

  it("renders with tooltip when provided", () => {
    render(
      <MessageAction tooltip="Copy to clipboard">
        <span>📋</span>
      </MessageAction>,
    );

    expect(
      screen.getByRole("button", { name: /Copy to clipboard/ }),
    ).toBeInTheDocument();
  });
});

describe("MessageBranch", () => {
  it("renders branch navigation", () => {
    render(
      <MessageBranch>
        <MessageBranchContent>
          <div key="branch-0">Branch 0</div>
          <div key="branch-1">Branch 1</div>
        </MessageBranchContent>
        <MessageBranchSelector>
          <MessageBranchPrevious />
          <MessageBranchPage />
          <MessageBranchNext />
        </MessageBranchSelector>
      </MessageBranch>,
    );

    expect(screen.getByText("Branch 0")).toBeVisible();
    expect(screen.getByLabelText("Previous branch")).toBeInTheDocument();
    expect(screen.getByLabelText("Next branch")).toBeInTheDocument();
  });
});

describe("MessageBranchPrevious", () => {
  it("renders previous button", () => {
    render(
      <MessageBranch>
        <MessageBranchContent>
          <div key="b0">B0</div>
          <div key="b1">B1</div>
        </MessageBranchContent>
        <MessageBranchPrevious />
      </MessageBranch>,
    );

    expect(screen.getByLabelText("Previous branch")).toBeInTheDocument();
  });
});

describe("MessageBranchNext", () => {
  it("renders next button", () => {
    render(
      <MessageBranch>
        <MessageBranchContent>
          <div key="b0">B0</div>
          <div key="b1">B1</div>
        </MessageBranchContent>
        <MessageBranchNext />
      </MessageBranch>,
    );

    expect(screen.getByLabelText("Next branch")).toBeInTheDocument();
  });
});

describe("MessageBranchPage", () => {
  it("shows current/total pages", () => {
    render(
      <MessageBranch>
        <MessageBranchContent>
          <div key="b0">B0</div>
          <div key="b1">B1</div>
        </MessageBranchContent>
        <MessageBranchPage />
      </MessageBranch>,
    );

    expect(screen.getByText("1 of 2")).toBeInTheDocument();
  });

  it("updates page on navigation", () => {
    render(
      <MessageBranch>
        <MessageBranchContent>
          <div key="b0">B0</div>
          <div key="b1">B1</div>
        </MessageBranchContent>
        <MessageBranchNext />
        <MessageBranchPage />
      </MessageBranch>,
    );

    fireEvent.click(screen.getByLabelText("Next branch"));
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
  });
});

describe("MessageResponse", () => {
  it("renders markdown content via Streamdown", () => {
    render(<MessageResponse>Hello **world**</MessageResponse>);

    const streamdown = screen.getByTestId("streamdown");
    expect(streamdown).toBeInTheDocument();
    expect(streamdown).toHaveTextContent("Hello **world**");
  });

  it("applies className", () => {
    render(<MessageResponse className="custom-md">Content</MessageResponse>);

    expect(screen.getByTestId("streamdown")).toHaveClass("custom-md");
  });
});

describe("MessageToolbar", () => {
  it("renders children", () => {
    render(
      <MessageToolbar>
        <span>Toolbar content</span>
      </MessageToolbar>,
    );

    expect(screen.getByText("Toolbar content")).toBeInTheDocument();
  });

  it("applies className", () => {
    const { container } = render(
      <MessageToolbar className="custom-toolbar">
        <span>Items</span>
      </MessageToolbar>,
    );

    expect(container.firstChild).toHaveClass("custom-toolbar");
  });
});
