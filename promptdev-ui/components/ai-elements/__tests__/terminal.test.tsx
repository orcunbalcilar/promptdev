import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("ansi-to-react", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="ansi">{children}</span>
  ),
}));

vi.mock("@/components/ai-elements/shimmer", () => ({
  Shimmer: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="shimmer">{children}</span>
  ),
}));

import {
  Terminal,
  TerminalHeader,
  TerminalTitle,
  TerminalStatus,
  TerminalActions,
  TerminalCopyButton,
  TerminalClearButton,
  TerminalContent,
} from "@/components/ai-elements/terminal";

describe("Terminal", () => {
  it("renders children", () => {
    render(
      <Terminal output="test output">
        <span>custom child</span>
      </Terminal>,
    );

    expect(screen.getByText("custom child")).toBeInTheDocument();
  });

  it("renders default layout when no children", () => {
    render(<Terminal output="hello world" />);

    expect(screen.getByText("Terminal")).toBeInTheDocument();
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <Terminal output="" data-testid="terminal" className="custom">
        <span>content</span>
      </Terminal>,
    );

    expect(screen.getByTestId("terminal")).toHaveClass("custom");
  });
});

describe("TerminalHeader", () => {
  it("renders children", () => {
    render(
      <TerminalHeader>
        <span>header content</span>
      </TerminalHeader>,
    );

    expect(screen.getByText("header content")).toBeInTheDocument();
  });
});

describe("TerminalTitle", () => {
  it("renders default Terminal text", () => {
    render(<TerminalTitle />);

    expect(screen.getByText("Terminal")).toBeInTheDocument();
  });

  it("renders custom children", () => {
    render(<TerminalTitle>Build Output</TerminalTitle>);

    expect(screen.getByText("Build Output")).toBeInTheDocument();
  });
});

describe("TerminalStatus", () => {
  it("renders status badge when streaming", () => {
    render(
      <Terminal output="" isStreaming>
        <TerminalStatus />
      </Terminal>,
    );

    expect(screen.getByTestId("shimmer")).toHaveTextContent("Processing...");
  });

  it("returns null when not streaming", () => {
    render(
      <Terminal output="">
        <TerminalStatus data-testid="status" />
      </Terminal>,
    );

    expect(screen.queryByTestId("shimmer")).not.toBeInTheDocument();
  });
});

describe("TerminalActions", () => {
  it("renders children", () => {
    render(
      <TerminalActions>
        <span>action buttons</span>
      </TerminalActions>,
    );

    expect(screen.getByText("action buttons")).toBeInTheDocument();
  });
});

describe("TerminalCopyButton", () => {
  it("copies content to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(
      <Terminal output="copied content">
        <TerminalCopyButton />
      </Terminal>,
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("copied content");
    });
  });

  it("calls onCopy callback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });
    const onCopy = vi.fn();

    render(
      <Terminal output="text">
        <TerminalCopyButton onCopy={onCopy} />
      </Terminal>,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(onCopy).toHaveBeenCalled();
    });
  });

  it("calls onError when clipboard is unavailable", () => {
    Object.assign(navigator, {
      clipboard: undefined,
    });
    const onError = vi.fn();

    render(
      <Terminal output="text">
        <TerminalCopyButton onError={onError} />
      </Terminal>,
    );

    fireEvent.click(screen.getByRole("button"));
    expect(onError).toHaveBeenCalled();
  });
});

describe("TerminalClearButton", () => {
  it("calls onClear when clicked", () => {
    const onClear = vi.fn();

    render(
      <Terminal output="text" onClear={onClear}>
        <TerminalClearButton />
      </Terminal>,
    );

    fireEvent.click(screen.getByRole("button"));
    expect(onClear).toHaveBeenCalled();
  });

  it("returns null when no onClear provided", () => {
    render(
      <Terminal output="">
        <TerminalClearButton data-testid="clear-btn" />
      </Terminal>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("TerminalContent", () => {
  it("renders ANSI content", () => {
    render(
      <Terminal output="build successful">
        <TerminalContent />
      </Terminal>,
    );

    const ansi = screen.getByTestId("ansi");
    expect(ansi).toHaveTextContent("build successful");
  });

  it("shows cursor when streaming", () => {
    const { container } = render(
      <Terminal output="running..." isStreaming>
        <TerminalContent />
      </Terminal>,
    );

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("hides cursor when not streaming", () => {
    const { container } = render(
      <Terminal output="done">
        <TerminalContent />
      </Terminal>,
    );

    expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
  });

  it("renders custom children", () => {
    render(
      <Terminal output="">
        <TerminalContent>
          <span>custom output</span>
        </TerminalContent>
      </Terminal>,
    );

    expect(screen.getByText("custom output")).toBeInTheDocument();
  });
});
