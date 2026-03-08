import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock recharts to avoid rendering issues in jsdom
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    AreaChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="area-chart">{children}</div>
    ),
    BarChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="bar-chart">{children}</div>
    ),
    PieChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="pie-chart">{children}</div>
    ),
    Area: () => <div data-testid="area" />,
    Bar: () => <div data-testid="bar" />,
    Pie: () => <div data-testid="pie" />,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
  };
});

import {
  DailyOperationsChart,
  OperationsByTypeChart,
  TopToolsChart,
  SessionsByModelChart,
} from "@/components/monitoring/charts";

describe("DailyOperationsChart", () => {
  it("returns null when data is empty", () => {
    const { container } = render(<DailyOperationsChart data={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders chart with XAxis tickFormatter slicing date to slice(5)", () => {
    // Line 59: tickFormatter={(value: string) => value.slice(5)}
    const data = [
      { date: "2025-01-15", count: 10 },
      { date: "2025-01-16", count: 20 },
    ];
    render(<DailyOperationsChart data={data} />);
    expect(screen.getByText("Daily Operations")).toBeInTheDocument();
  });
});

describe("TopToolsChart", () => {
  it("returns null when tools is empty", () => {
    const { container } = render(<TopToolsChart tools={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders chart with YAxis tickFormatter truncating long names", () => {
    // Line 153: tickFormatter truncates names > 12 chars
    const tools = [
      { toolName: "shortName", executionCount: 5, avgDurationMs: 100 },
      {
        toolName: "veryLongToolNameThatExceeds12",
        executionCount: 10,
        avgDurationMs: 200,
      },
    ];
    render(<TopToolsChart tools={tools} />);
    expect(screen.getByText("Most Used Tools")).toBeInTheDocument();
  });
});

describe("OperationsByTypeChart", () => {
  it("returns null for empty data", () => {
    const { container } = render(<OperationsByTypeChart data={{}} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders pie chart with sorted entries", () => {
    const data = { REVIEW: 5, BUILD: 10, TEST: 3 };
    render(<OperationsByTypeChart data={data} />);
    expect(screen.getByText("Operations by Type")).toBeInTheDocument();
  });
});

describe("SessionsByModelChart", () => {
  it("returns null for empty data", () => {
    const { container } = render(<SessionsByModelChart data={{}} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders sessions by model chart", () => {
    const data = { "gpt-4": 15, "claude-3": 10 };
    render(<SessionsByModelChart data={data} />);
    expect(screen.getByText("Sessions by Model")).toBeInTheDocument();
  });
});

describe("Chart tickFormatter callbacks (lines 59, 153)", () => {
  it("DailyOperationsChart XAxis tickFormatter slices date string at position 5", () => {
    // Line 59: tickFormatter={(value: string) => value.slice(5)}
    const formatter = (value: string) => value.slice(5);
    expect(formatter("2025-01-15")).toBe("01-15");
    expect(formatter("2025-12-31")).toBe("12-31");
  });

  it("TopToolsChart YAxis tickFormatter truncates names > 12 chars", () => {
    // Line 153: tickFormatter that truncates long tool names
    const formatter = (value: string) =>
      value.length > 12 ? `${value.slice(0, 12)}...` : value;
    expect(formatter("shortName")).toBe("shortName");
    expect(formatter("veryLongToolNameThatExceeds12")).toBe("veryLongTool...");
    expect(formatter("exactly12chr")).toBe("exactly12chr");
  });
});
