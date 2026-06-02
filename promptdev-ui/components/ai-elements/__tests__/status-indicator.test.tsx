import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusIndicator } from "@/components/ai-elements/status-indicator";

describe("StatusIndicator", () => {
  it('renders "Streaming" label for streaming status', () => {
    render(<StatusIndicator status="streaming" />);
    expect(screen.getByText("Streaming")).toBeInTheDocument();
  });

  it('renders "Submitted" label for submitted status', () => {
    render(<StatusIndicator status="submitted" />);
    expect(screen.getByText("Submitted")).toBeInTheDocument();
  });

  it('renders "Error" label for error status', () => {
    render(<StatusIndicator status="error" />);
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it('renders "Complete" label for complete status', () => {
    render(<StatusIndicator status="complete" />);
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("shows icon by default (showIcon defaults to true)", () => {
    const { container } = render(<StatusIndicator status="streaming" />);
    // Loader2Icon renders an svg element
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("hides icon when showIcon=false", () => {
    const { container } = render(
      <StatusIndicator status="streaming" showIcon={false} />,
    );
    // With showIcon=false and no hasActions, there should be no SVGs
    const allSvgs = container.querySelectorAll("svg");
    expect(allSvgs).toHaveLength(0);
  });

  it("shows actions indicator when hasActions=true", () => {
    const { container } = render(
      <StatusIndicator status="complete" hasActions />,
    );
    // hasActions adds a CircleDotIcon svg in addition to the status icon
    const allSvgs = container.querySelectorAll("svg");
    expect(allSvgs.length).toBe(2);
  });

  it("applies correct color classes for each status", () => {
    const { rerender } = render(
      <StatusIndicator status="streaming" data-testid="indicator" />,
    );
    let el = screen.getByTestId("indicator");
    expect(el.className).toContain("text-blue-600");

    rerender(<StatusIndicator status="submitted" data-testid="indicator" />);
    el = screen.getByTestId("indicator");
    expect(el.className).toContain("text-amber-600");

    rerender(<StatusIndicator status="error" data-testid="indicator" />);
    el = screen.getByTestId("indicator");
    expect(el.className).toContain("text-red-600");

    rerender(<StatusIndicator status="complete" data-testid="indicator" />);
    el = screen.getByTestId("indicator");
    expect(el.className).toContain("text-green-600");
  });
});
