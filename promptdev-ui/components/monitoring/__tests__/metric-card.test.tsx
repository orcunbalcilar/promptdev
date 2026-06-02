import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricCard } from "../metric-card";
import { Activity } from "lucide-react";

describe("MetricCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title and value", () => {
    render(<MetricCard title="Sessions" value={42} icon={Activity} />);
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders string value", () => {
    render(<MetricCard title="Tokens" value="1.5K" icon={Activity} />);
    expect(screen.getByText("1.5K")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(
      <MetricCard
        title="Active"
        value={10}
        subtitle="Currently running"
        icon={Activity}
      />,
    );
    expect(screen.getByText("Currently running")).toBeInTheDocument();
  });

  it("does not render subtitle when not provided", () => {
    render(<MetricCard title="Active" value={10} icon={Activity} />);
    expect(screen.queryByText("Currently running")).not.toBeInTheDocument();
  });

  it("shows increasing trend indicator when trend is up", () => {
    render(
      <MetricCard title="Requests" value={100} icon={Activity} trend="up" />,
    );
    expect(screen.getByText("Increasing")).toBeInTheDocument();
  });

  it("does not show trend indicator when trend is down", () => {
    render(
      <MetricCard title="Requests" value={100} icon={Activity} trend="down" />,
    );
    expect(screen.queryByText("Increasing")).not.toBeInTheDocument();
  });

  it("does not show trend indicator when trend is neutral", () => {
    render(
      <MetricCard
        title="Requests"
        value={100}
        icon={Activity}
        trend="neutral"
      />,
    );
    expect(screen.queryByText("Increasing")).not.toBeInTheDocument();
  });

  it("does not show trend indicator when trend is not provided", () => {
    render(<MetricCard title="Requests" value={100} icon={Activity} />);
    expect(screen.queryByText("Increasing")).not.toBeInTheDocument();
  });

  it("renders the icon component", () => {
    const TestIcon = ({ className }: { className?: string }) => (
      <span data-testid="test-icon" className={className} />
    );
    render(<MetricCard title="Test" value={1} icon={TestIcon} />);
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });
});
