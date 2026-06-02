import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TokenUsageDisplay } from "../token-usage-display";

describe("TokenUsageDisplay", () => {
  it("should render token counts", () => {
    render(<TokenUsageDisplay inputTokens={1500} outputTokens={800} />);

    expect(screen.getByText("1.5K")).toBeInTheDocument();
    expect(screen.getByText("800")).toBeInTheDocument();
  });

  it("should compute total tokens", () => {
    render(<TokenUsageDisplay inputTokens={500} outputTokens={300} />);

    // Total = 800 shown next to the Coins icon
    expect(screen.getByText("800")).toBeInTheDocument();
  });

  it("should format large token counts with K suffix", () => {
    render(<TokenUsageDisplay inputTokens={15000} outputTokens={8000} />);

    expect(screen.getByText("15.0K")).toBeInTheDocument();
    expect(screen.getByText("8.0K")).toBeInTheDocument();
    // Total = 23K
    expect(screen.getByText("23.0K")).toBeInTheDocument();
  });

  it("should format million token counts with M suffix", () => {
    render(<TokenUsageDisplay inputTokens={1500000} outputTokens={500000} />);

    expect(screen.getByText("1.5M")).toBeInTheDocument();
    expect(screen.getByText("500.0K")).toBeInTheDocument();
    // Total = 2M
    expect(screen.getByText("2.0M")).toBeInTheDocument();
  });

  it("should render zero tokens", () => {
    render(<TokenUsageDisplay inputTokens={0} outputTokens={0} />);

    // Three "0" values: total, input, output
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBe(3);
  });

  it("should accept className prop", () => {
    const { container } = render(
      <TokenUsageDisplay
        inputTokens={100}
        outputTokens={50}
        className="extra-class"
      />,
    );

    expect(container.firstChild).toHaveClass("extra-class");
  });

  it("should have title attributes for accessibility", () => {
    render(<TokenUsageDisplay inputTokens={100} outputTokens={50} />);

    expect(screen.getByTitle("Total tokens")).toBeInTheDocument();
    expect(screen.getByTitle("Input tokens")).toBeInTheDocument();
    expect(screen.getByTitle("Output tokens")).toBeInTheDocument();
  });
});
