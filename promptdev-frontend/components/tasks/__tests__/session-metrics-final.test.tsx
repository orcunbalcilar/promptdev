import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { SessionMetricsCard } from "@/components/tasks/session-metrics-card";

// Mock task-helpers
vi.mock("@/components/tasks/task-helpers", () => ({
  formatTokenCount: (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  },
}));

describe("SessionMetricsCard", () => {
  it("returns null when events are empty (line 24: computeEventMetrics returns null)", () => {
    // Line 24: if (events.length === 0) return null
    const { container } = render(
      <SessionMetricsCard events={[]} session={null} />,
    );
    // When eventMetrics is null and no session, the card should render nothing meaningful
    // or return null path
    expect(container.textContent).toBe("");
  });

  it("renders metrics from session data when provided", () => {
    const session = {
      id: "s1",
      sdkSessionId: "sdk-s1",
      status: "ACTIVE" as const,
      model: "gpt-4",
      totalInputTokens: 5000,
      totalOutputTokens: 3000,
      messageCount: 20,
      toolExecutionCount: 10,
      errorCount: 1,
      source: "copilot",
      createdAt: "2025-01-01T00:00:00Z",
    };
    const { container } = render(
      <SessionMetricsCard session={session} events={[]} />,
    );
    expect(container.textContent).toContain("5.0K");
    expect(container.textContent).toContain("3.0K");
  });

  it("computes metrics from events when no session", () => {
    const events = [
      {
        id: "e1",
        eventType: "AGENT_TOOL_CALL" as const,
        message: "call",
        timestamp: "2025-01-01T00:00:00Z",
      },
      {
        id: "e2",
        eventType: "LOG" as const,
        message: "log",
        timestamp: "2025-01-01T00:00:01Z",
      },
      {
        id: "e3",
        eventType: "PROGRESS" as const,
        message: "progress",
        details: JSON.stringify({ inputTokens: 2000, outputTokens: 1000 }),
        timestamp: "2025-01-01T00:00:02Z",
      },
    ];
    const { container } = render(<SessionMetricsCard events={events} />);
    expect(container.textContent).toContain("2.0K");
    expect(container.textContent).toContain("1.0K");
  });
});
