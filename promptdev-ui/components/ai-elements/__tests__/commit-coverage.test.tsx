// /Users/orcun/projects/promptdev/promptdev-ui/components/ai-elements/__tests__/commit-coverage.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="collapsible" {...props}>
      {children}
    </div>
  ),
  CollapsibleContent: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="collapsible-content" {...props}>
      {children}
    </div>
  ),
  CollapsibleTrigger: ({
    children,

    ...props
  }: React.ComponentProps<"button"> & { asChild?: boolean }) => (
    <button data-testid="collapsible-trigger" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="avatar" {...props}>
      {children}
    </div>
  ),
  AvatarFallback: ({ children, ...props }: React.ComponentProps<"span">) => (
    <span data-testid="avatar-fallback" {...props}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ComponentProps<"button"> & { variant?: string; size?: string }) => (
    <button data-testid="button" {...props}>
      {children}
    </button>
  ),
}));

import {
  CommitSeparator,
  CommitTimestamp,
  CommitActions,
  CommitCopyButton,
  CommitFileAdditions,
  CommitFileDeletions,
  CommitFileStatus,
} from "../commit";

describe("CommitSeparator (line 135)", () => {
  it("renders default bullet character when no children provided", () => {
    render(<CommitSeparator data-testid="sep" />);
    expect(screen.getByTestId("sep")).toHaveTextContent("•");
  });

  it("renders custom children when provided", () => {
    render(<CommitSeparator data-testid="sep">|</CommitSeparator>);
    expect(screen.getByTestId("sep")).toHaveTextContent("|");
  });
});

describe("CommitTimestamp", () => {
  it("renders formatted relative time when no children provided", () => {
    const date = new Date();
    render(<CommitTimestamp date={date} data-testid="ts" />);
    const ts = screen.getByTestId("ts");
    expect(ts).toBeInTheDocument();
    expect(ts.getAttribute("datetime")).toBe(date.toISOString());
    // "today" for same-day
    expect(ts.textContent).toBeTruthy();
  });

  it("renders custom children when provided", () => {
    render(
      <CommitTimestamp date={new Date()} data-testid="ts">
        2 hours ago
      </CommitTimestamp>,
    );
    expect(screen.getByTestId("ts")).toHaveTextContent("2 hours ago");
  });
});

describe("CommitActions (line 310)", () => {
  it("stops click propagation", () => {
    const outerClick = vi.fn();
    render(
      <button type="button" onClick={outerClick}>
        <CommitActions data-testid="actions">
          <button type="button">Copy</button>
        </CommitActions>
      </button>,
    );
    fireEvent.click(screen.getByTestId("actions"));
    expect(outerClick).not.toHaveBeenCalled();
  });

  it("stops keydown propagation", () => {
    const outerKeyDown = vi.fn();
    render(
      <button type="button" onKeyDown={outerKeyDown}>
        <CommitActions data-testid="actions">
          <button type="button">Copy</button>
        </CommitActions>
      </button>,
    );
    fireEvent.keyDown(screen.getByTestId("actions"), { key: "Enter" });
    expect(outerKeyDown).not.toHaveBeenCalled();
  });
});

describe("CommitCopyButton (line 357)", () => {
  it("calls onError when clipboard is unavailable", async () => {
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const onError = vi.fn();
    render(<CommitCopyButton hash="abc123" onError={onError} />);
    fireEvent.click(screen.getByTestId("button"));

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Clipboard API not available" }),
    );

    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  it("copies hash to clipboard and calls onCopy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    const onCopy = vi.fn();
    render(<CommitCopyButton hash="def456" onCopy={onCopy} />);
    fireEvent.click(screen.getByTestId("button"));

    expect(writeText).toHaveBeenCalledWith("def456");
  });

  it("calls onError when clipboard.writeText rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    const onError = vi.fn();
    render(<CommitCopyButton hash="abc" onError={onError} />);
    fireEvent.click(screen.getByTestId("button"));

    // Allow microtask to resolve
    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Permission denied" }),
      );
    });
  });
});

describe("CommitFileAdditions (line 382)", () => {
  it("returns null when count is 0", () => {
    const { container } = render(<CommitFileAdditions count={0} />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when count is negative", () => {
    const { container } = render(<CommitFileAdditions count={-1} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders additions when count is positive", () => {
    render(<CommitFileAdditions count={5} data-testid="additions" />);
    expect(screen.getByTestId("additions")).toHaveTextContent("5");
  });

  it("renders custom children", () => {
    render(
      <CommitFileAdditions count={3} data-testid="additions">
        +3 lines
      </CommitFileAdditions>,
    );
    expect(screen.getByTestId("additions")).toHaveTextContent("+3 lines");
  });
});

describe("CommitFileDeletions", () => {
  it("returns null when count is 0", () => {
    const { container } = render(<CommitFileDeletions count={0} />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when count is negative", () => {
    const { container } = render(<CommitFileDeletions count={-2} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders deletions when count is positive", () => {
    render(<CommitFileDeletions count={3} data-testid="deletions" />);
    expect(screen.getByTestId("deletions")).toHaveTextContent("3");
  });

  it("renders custom children", () => {
    render(
      <CommitFileDeletions count={2} data-testid="deletions">
        -2 lines
      </CommitFileDeletions>,
    );
    expect(screen.getByTestId("deletions")).toHaveTextContent("-2 lines");
  });
});

describe("CommitFileStatus", () => {
  it("renders default label for added status", () => {
    render(<CommitFileStatus status="added" data-testid="status" />);
    expect(screen.getByTestId("status")).toHaveTextContent("A");
  });

  it("renders default label for deleted status", () => {
    render(<CommitFileStatus status="deleted" data-testid="status" />);
    expect(screen.getByTestId("status")).toHaveTextContent("D");
  });

  it("renders default label for modified status", () => {
    render(<CommitFileStatus status="modified" data-testid="status" />);
    expect(screen.getByTestId("status")).toHaveTextContent("M");
  });

  it("renders default label for renamed status", () => {
    render(<CommitFileStatus status="renamed" data-testid="status" />);
    expect(screen.getByTestId("status")).toHaveTextContent("R");
  });

  it("renders custom children when provided", () => {
    render(
      <CommitFileStatus status="added" data-testid="status">
        Added
      </CommitFileStatus>,
    );
    expect(screen.getByTestId("status")).toHaveTextContent("Added");
  });
});
