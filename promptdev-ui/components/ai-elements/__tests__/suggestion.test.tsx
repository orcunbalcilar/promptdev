import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ResizeObserver mock required for ScrollArea
globalThis.ResizeObserver = class ResizeObserver {
  observe() {
    /* noop */
  }
  unobserve() {
    /* noop */
  }
  disconnect() {
    /* noop */
  }
} as unknown as typeof ResizeObserver;

import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";

describe("Suggestions", () => {
  it("renders children", () => {
    render(
      <Suggestions>
        <span>suggestion child</span>
      </Suggestions>,
    );

    expect(screen.getByText("suggestion child")).toBeInTheDocument();
  });
});

describe("Suggestion", () => {
  it("renders suggestion text as button", () => {
    render(<Suggestion suggestion="Tell me more" />);

    const btn = screen.getByRole("button", { name: "Tell me more" });
    expect(btn).toBeInTheDocument();
  });

  it("renders custom children over suggestion text", () => {
    render(
      <Suggestion suggestion="original">
        <span>Custom label</span>
      </Suggestion>,
    );

    expect(screen.getByText("Custom label")).toBeInTheDocument();
  });

  it("calls onClick with suggestion string when clicked", () => {
    const handleClick = vi.fn();
    render(<Suggestion suggestion="Click me" onClick={handleClick} />);

    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledWith("Click me");
  });

  it("does not throw when onClick is not provided", () => {
    render(<Suggestion suggestion="No handler" />);

    expect(() => fireEvent.click(screen.getByRole("button"))).not.toThrow();
  });

  it("applies custom className", () => {
    render(<Suggestion suggestion="styled" className="extra-class" />);

    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("extra-class");
  });

  it("uses outline variant by default", () => {
    render(<Suggestion suggestion="test" />);

    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-slot", "button");
  });
});
