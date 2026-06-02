/**
 * Coverage completion for components/monitoring/charts.tsx
 * Targets: lines 59 (tickFormatter), 153 (tickFormatter truncation)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Capture tickFormatter props by mocking recharts axis components
const capturedTickFormatters: Array<(value: string) => string> = [];

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
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
    CartesianGrid: () => null,
    Area: () => null,
    Bar: () => null,
    Pie: () => null,
    XAxis: (props: Record<string, unknown>) => {
      if (typeof props.tickFormatter === "function") {
        capturedTickFormatters.push(props.tickFormatter as (v: string) => string);
      }
      return <div data-testid="x-axis" />;
    },
    YAxis: (props: Record<string, unknown>) => {
      if (typeof props.tickFormatter === "function") {
        capturedTickFormatters.push(props.tickFormatter as (v: string) => string);
      }
      return <div data-testid="y-axis" />;
    },
  };
});

import { DailyOperationsChart, TopToolsChart } from "../charts";

describe("charts.tsx branch coverage", () => {
  beforeEach(() => {
    capturedTickFormatters.length = 0;
  });

  it("DailyOperationsChart returns null when data is empty", () => {
    const { container } = render(<DailyOperationsChart data={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("DailyOperationsChart renders with data and tickFormatter slices date", () => {
    render(
      <DailyOperationsChart
        data={[{ date: "2025-01-15", count: 5 }]}
      />,
    );
    expect(screen.getByText("Daily Operations")).toBeInTheDocument();
    // Line 59: tickFormatter={(value: string) => value.slice(5)}
    const dateFormatter = capturedTickFormatters.find((fn) => fn("2025-01-15") === "01-15");
    expect(dateFormatter).toBeDefined();
    expect(dateFormatter!("2025-01-15")).toBe("01-15");
  });

  it("TopToolsChart returns null when data is empty", () => {
    const { container } = render(<TopToolsChart tools={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("TopToolsChart renders and tickFormatter truncates long names", () => {
    render(
      <TopToolsChart
        tools={[
          { toolName: "a-very-long-tool-name-exceeds-twelve", executionCount: 10, avgDurationMs: 500 },
          { toolName: "short", executionCount: 5, avgDurationMs: 200 },
        ]}
      />,
    );
    expect(screen.getByText("Most Used Tools")).toBeInTheDocument();
    // Line 153: tickFormatter truncation
    const toolFormatter = capturedTickFormatters.find(
      (fn) => fn("a-very-long-tool-name-exceeds-twelve").includes("..."),
    );
    expect(toolFormatter).toBeDefined();
    expect(toolFormatter!("a-very-long-tool-name-exceeds-twelve")).toBe("a-very-long-...");
    expect(toolFormatter!("short")).toBe("short");
  });
});
