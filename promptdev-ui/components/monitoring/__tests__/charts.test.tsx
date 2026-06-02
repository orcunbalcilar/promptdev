import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  DailyOperationsChart,
  OperationsByTypeChart,
  TopToolsChart,
  SessionsByModelChart,
} from "../charts";

// Mock recharts to avoid canvas/DOM measurement issues in jsdom
vi.mock("recharts", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

// ── DailyOperationsChart ────────────────────────────────────────

describe("DailyOperationsChart", () => {
  it("returns null when data is empty", () => {
    const { container } = render(<DailyOperationsChart data={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the card when data is provided", () => {
    render(
      <DailyOperationsChart
        data={[
          { date: "2026-01-01", count: 10 },
          { date: "2026-01-02", count: 20 },
        ]}
      />,
    );
    expect(screen.getByText("Daily Operations")).toBeInTheDocument();
    expect(
      screen.getByText("Operations over the selected time period"),
    ).toBeInTheDocument();
  });
});

// ── OperationsByTypeChart ───────────────────────────────────────

describe("OperationsByTypeChart", () => {
  it("returns null when data is empty", () => {
    const { container } = render(<OperationsByTypeChart data={{}} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the card with entries", () => {
    render(
      <OperationsByTypeChart
        data={{ MESSAGE_SENT: 5, TOOL_EXECUTION_START: 3 }}
      />,
    );
    expect(screen.getByText("Operations by Type")).toBeInTheDocument();
    expect(
      screen.getByText("Distribution of operation types"),
    ).toBeInTheDocument();
  });
});

// ── TopToolsChart ───────────────────────────────────────────────

describe("TopToolsChart", () => {
  it("returns null when tools array is empty", () => {
    const { container } = render(<TopToolsChart tools={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the chart card", () => {
    render(
      <TopToolsChart
        tools={[
          { toolName: "read_file", executionCount: 42, avgDurationMs: 120 },
          { toolName: "write_file", executionCount: 18, avgDurationMs: 200 },
        ]}
      />,
    );
    expect(screen.getByText("Most Used Tools")).toBeInTheDocument();
    expect(
      screen.getByText("Tool execution count and average duration"),
    ).toBeInTheDocument();
  });
});

// ── SessionsByModelChart ────────────────────────────────────────

describe("SessionsByModelChart", () => {
  it("returns null when data is empty", () => {
    const { container } = render(<SessionsByModelChart data={{}} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the card with model data", () => {
    render(<SessionsByModelChart data={{ "gpt-4": 10, "claude-3": 5 }} />);
    expect(screen.getByText("Sessions by Model")).toBeInTheDocument();
    expect(screen.getByText("AI model usage distribution")).toBeInTheDocument();
  });
});
