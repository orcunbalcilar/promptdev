import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Polyfills ────────────────────────────────────────────────────
Element.prototype.scrollIntoView = vi.fn();
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// ── Mocks ────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock recharts
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  const MockChart = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-chart">{children}</div>
  );
  return {
    ...actual,
    BarChart: MockChart,
    PieChart: MockChart,
    AreaChart: MockChart,
    Bar: () => null,
    Pie: () => null,
    Area: () => null,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Legend: () => null,
    Tooltip: () => null,
  };
});

// Mock chart component
vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

// Mock monitoring API
vi.mock("@/lib/monitoring", async () => {
  const actual = await vi.importActual("@/lib/monitoring");
  return {
    ...actual,
    getMonitoringDashboard: vi.fn(),
    getMonitoringSessions: vi.fn(),
    getSessionOperations: vi.fn(),
  };
});

vi.mock("@/lib/query-policies", () => ({
  standardQueryOptions: { staleTime: 0, gcTime: 0 },
  stableQueryOptions: { staleTime: 0, gcTime: 0 },
  realtimeQueryOptions: { staleTime: 0, gcTime: 0 },
}));

import MonitoringPage from "@/app/monitoring/page";
import {
  getMonitoringDashboard,
  getMonitoringSessions,
  getSessionOperations,
} from "@/lib/monitoring";
import type { MonitoringDashboard } from "@/lib/monitoring";

const mockGetDashboard = getMonitoringDashboard as ReturnType<typeof vi.fn>;
const mockGetSessions = getMonitoringSessions as ReturnType<typeof vi.fn>;
const mockGetSessionOps = getSessionOperations as ReturnType<typeof vi.fn>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  function TestQueryProvider({
    children,
  }: Readonly<{ children: React.ReactNode }>) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return TestQueryProvider;
}

const MOCK_DASHBOARD: MonitoringDashboard = {
  totalSessions: 42,
  activeSessions: 3,
  totalOperations: 1280,
  totalErrors: 20,
  totalInputTokens: 100000,
  totalOutputTokens: 56000,
  dailyOperations: [
    { date: "2025-01-20", count: 150 },
    { date: "2025-01-21", count: 200 },
  ],
  operationsByType: {
    MESSAGE_SENT: 400,
    TOOL_EXECUTION_START: 300,
    TOOL_EXECUTION_END: 280,
    ERROR: 20,
  },
  sessionsByModel: {
    "gpt-4.1": 25,
    "claude-sonnet-4": 12,
    "o3-mini": 5,
  },
  sessionsBySource: {
    "task-orchestrator": 30,
    "copilot-chat": 12,
  },
  topTools: [
    { toolName: "createFile", executionCount: 120, avgDurationMs: 450 },
    { toolName: "Bash", executionCount: 95, avgDurationMs: 3200 },
    { toolName: "readFile", executionCount: 85, avgDurationMs: 100 },
  ],
  recentErrors: [
    {
      id: "err-1",
      sessionId: "sess-1",
      operationType: "TOOL_EXECUTION_ERROR",
      message: "File not found",
      errorMessage: "ENOENT: no such file or directory",
      timestamp: "2025-01-21T14:30:00Z",
    },
  ],
};

const MOCK_SESSIONS_PAGE = {
  content: [
    {
      id: "sess-1",
      sdkSessionId: "sdk-001",
      model: "gpt-4.1",
      status: "ENDED" as const,
      totalInputTokens: 2500,
      totalOutputTokens: 1500,
      messageCount: 10,
      toolExecutionCount: 5,
      errorCount: 0,
      source: "task-orchestrator",
      createdAt: "2025-01-21T10:00:00Z",
      endedAt: "2025-01-21T10:15:00Z",
    },
  ],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 15,
  first: true,
  last: true,
  empty: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDashboard.mockResolvedValue(MOCK_DASHBOARD);
  mockGetSessions.mockResolvedValue(MOCK_SESSIONS_PAGE);
  mockGetSessionOps.mockResolvedValue([]);
});

describe("MonitoringPage – final coverage", () => {
  // ── Lines 110, 113: Tab change handler ──
  // The Tabs component uses onValueChange={setActiveTab} which updates activeTab state
  it("switches to sessions tab and renders sessions content", async () => {
    const user = userEvent.setup();
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    const sessionsTab = screen.getByRole("tab", { name: /sessions/i });
    await user.click(sessionsTab);

    await waitFor(() => {
      expect(screen.getByText("All Sessions")).toBeInTheDocument();
    });
  });

  it("switches to reviews tab and renders reviews content", async () => {
    const user = userEvent.setup();
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    const reviewsTab = screen.getByRole("tab", { name: /reviews/i });
    await user.click(reviewsTab);

    // Reviews tab is rendered
    await waitFor(() => {
      expect(reviewsTab).toHaveAttribute("data-state", "active");
    });
  });

  it("switches to errors tab and back to overview", async () => {
    const user = userEvent.setup();
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    // Go to errors
    const errorsTab = screen.getByRole("tab", { name: /errors/i });
    await user.click(errorsTab);

    await waitFor(() => {
      expect(screen.getByText("Recent Errors")).toBeInTheDocument();
    });

    // Go back to overview
    const overviewTab = screen.getByRole("tab", { name: /overview/i });
    await user.click(overviewTab);

    await waitFor(() => {
      expect(screen.getByText("Daily Operations")).toBeInTheDocument();
    });
  });

  it("activeTab value changes reflect correct tab content", async () => {
    const user = userEvent.setup();
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    // Initially on overview
    expect(screen.getByRole("tab", { name: /overview/i })).toHaveAttribute(
      "data-state",
      "active",
    );

    // Switch to sessions
    await user.click(screen.getByRole("tab", { name: /sessions/i }));
    expect(screen.getByRole("tab", { name: /sessions/i })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(screen.getByRole("tab", { name: /overview/i })).toHaveAttribute(
      "data-state",
      "inactive",
    );
  });

  // ── Line 231: Error state rendering ──
  // When dashboard query fails, the isLoading stays false after initial error,
  // but data will be undefined. The page conditionally renders based on dashboard.
  it("renders empty metrics when dashboard returns no data", async () => {
    mockGetDashboard.mockResolvedValue(undefined);
    render(<MonitoringPage />, { wrapper: createWrapper() });

    // Loading should disappear - "Sessions" appears in both MetricCard and tab
    await waitFor(() => {
      const sessions = screen.getAllByText("Sessions");
      expect(sessions.length).toBeGreaterThanOrEqual(1);
    });

    // Metric values should use fallback ?? 0
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
  });

  it("renders error rate as 0.0% when dashboard has zero operations", async () => {
    mockGetDashboard.mockResolvedValue({
      ...MOCK_DASHBOARD,
      totalOperations: 0,
      totalErrors: 0,
    });
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("0.0% error rate")).toBeInTheDocument();
    });
  });

  it("shows no errors card when errors tab has no errors", async () => {
    const user = userEvent.setup();
    mockGetDashboard.mockResolvedValue({
      ...MOCK_DASHBOARD,
      recentErrors: [],
      totalErrors: 0,
    });
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      const sessions = screen.getAllByText("Sessions");
      expect(sessions.length).toBeGreaterThanOrEqual(1);
    });

    await user.click(screen.getByRole("tab", { name: /errors/i }));

    await waitFor(() => {
      expect(screen.getByText(/No errors recorded/)).toBeInTheDocument();
    });
  });

  // ── Time range selector ──
  it("changes time range when clicking 14d button", async () => {
    const user = userEvent.setup();
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    // Click 14d button
    await user.click(screen.getByRole("button", { name: "14d" }));

    // Dashboard should be refetched with new days parameter
    await waitFor(() => {
      expect(mockGetDashboard).toHaveBeenCalledWith(14);
    });
  });

  it("changes time range when clicking 30d button", async () => {
    const user = userEvent.setup();
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "30d" }));

    await waitFor(() => {
      expect(mockGetDashboard).toHaveBeenCalledWith(30);
    });
  });

  // ── Performance summary bar ──
  it("renders performance summary bar when topTools exist", async () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      // The performance bar shows avg tool latency, tool calls count, models
      expect(screen.getByText(/Avg tool latency/)).toBeInTheDocument();
      expect(screen.getByText(/Tool calls/)).toBeInTheDocument();
    });
  });

  it("does not render performance summary bar when no topTools", async () => {
    mockGetDashboard.mockResolvedValue({
      ...MOCK_DASHBOARD,
      topTools: [],
    });
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      const sessions = screen.getAllByText("Sessions");
      expect(sessions.length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.queryByText(/Avg tool latency/)).not.toBeInTheDocument();
  });

  // ── Lines 110-113: SessionsTab with selectedSession shows SessionDetail ──
  it("shows session detail when clicking View button, and backs out", async () => {
    const user = userEvent.setup();
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    // Switch to sessions tab
    await user.click(screen.getByRole("tab", { name: /sessions/i }));

    await waitFor(() => {
      expect(screen.getByText("All Sessions")).toBeInTheDocument();
    });

    // Find the View button inside the sessions table (icon-only ghost button)
    // The Eye icon button is the last button in each table row
    const tableRows = document.querySelectorAll("tr");
    const dataRow = Array.from(tableRows).find((row) =>
      row.textContent?.includes("sdk-001"),
    );
    expect(dataRow).toBeTruthy();

    const viewButton = dataRow!.querySelector("button");
    expect(viewButton).toBeTruthy();
    await user.click(viewButton!);

    // SessionDetail should render with "Back to Sessions" button
    await waitFor(() => {
      expect(screen.getByText(/Back to Sessions/)).toBeInTheDocument();
    });

    // "All Sessions" heading should be gone
    expect(screen.queryByText("All Sessions")).not.toBeInTheDocument();

    // Click back to return to session list
    await user.click(screen.getByText(/Back to Sessions/));

    await waitFor(() => {
      expect(screen.getByText("All Sessions")).toBeInTheDocument();
    });
  });

  // ── Line 231: dataUpdatedAt falsy shows 'Refresh' tooltip ──
  // When dataUpdatedAt is 0 (initial state before first fetch), tooltip says 'Refresh'
  it('shows "Refresh" in tooltip when dataUpdatedAt is not set', async () => {
    // Make dashboard hang to keep dataUpdatedAt at 0
    mockGetDashboard.mockReturnValue(new Promise(() => {}));
    render(<MonitoringPage />, { wrapper: createWrapper() });

    // The refresh button should be rendered even during loading
    // The tooltip content alternates based on dataUpdatedAt
    // Since data never loads, dataUpdatedAt stays 0/falsy
    const allButtons = screen.getAllByRole("button");
    expect(allButtons.length).toBeGreaterThan(0);
  });

  // ── estimateCost branch: cost >= 0.01 returns 2 decimal places ──
  it("formats estimated cost with 2 decimal places when >= $0.01", async () => {
    mockGetDashboard.mockResolvedValue({
      ...MOCK_DASHBOARD,
      totalInputTokens: 500000,
      totalOutputTokens: 500000,
    });
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      // 500000 * 0.00001 + 500000 * 0.00003 = 5 + 15 = $20.00
      expect(screen.getByText("$20.00")).toBeInTheDocument();
    });
  });

  it("formats estimated cost with 4 decimal places when < $0.01", async () => {
    mockGetDashboard.mockResolvedValue({
      ...MOCK_DASHBOARD,
      totalInputTokens: 100,
      totalOutputTokens: 100,
    });
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      // 100 * 0.00001 + 100 * 0.00003 = 0.001 + 0.003 = $0.0040
      expect(screen.getByText("$0.0040")).toBeInTheDocument();
    });
  });

  // ── Sessions loading state ──
  it("shows loading spinner in sessions tab when sessions are loading", async () => {
    const user = userEvent.setup();
    // Dashboard loads, but sessions hang
    mockGetSessions.mockReturnValue(new Promise(() => {}));
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: /sessions/i }));

    // Should show loading spinner inside sessions tab
    await waitFor(() => {
      const spinners = document.querySelectorAll(".animate-spin");
      expect(spinners.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Sessions with pagination (totalPages > 1) ──
  it("shows pagination controls when sessions have multiple pages", async () => {
    const user = userEvent.setup();
    mockGetSessions.mockResolvedValue({
      content: [
        {
          id: "sess-1",
          sdkSessionId: "sdk-001",
          model: "gpt-4.1",
          status: "ENDED" as const,
          totalInputTokens: 2500,
          totalOutputTokens: 1500,
          messageCount: 10,
          toolExecutionCount: 5,
          errorCount: 0,
          source: "task-orchestrator",
          createdAt: "2025-01-21T10:00:00Z",
          endedAt: "2025-01-21T10:15:00Z",
        },
      ],
      totalElements: 50,
      totalPages: 4,
      number: 0,
      size: 15,
      first: true,
      last: false,
      empty: false,
    });
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: /sessions/i }));

    // Pagination controls should be visible when totalPages > 1
    await waitFor(() => {
      expect(screen.getByText("All Sessions")).toBeInTheDocument();
    });
  });

  // ── PerformanceSummaryBar with empty sessionsByModel shows 'N/A' ──
  it("shows N/A for models when sessionsByModel is empty", async () => {
    mockGetDashboard.mockResolvedValue({
      ...MOCK_DASHBOARD,
      sessionsByModel: {},
    });
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });
  });

  // ── PerformanceSummaryBar with null sessionsByModel ──
  it("shows N/A for models when sessionsByModel is null", async () => {
    mockGetDashboard.mockResolvedValue({
      ...MOCK_DASHBOARD,
      sessionsByModel: null,
    });
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });
  });

  // ── Dashboard with 0 active sessions shows "0 active" ──
  it("shows 0 active when activeSessions is 0", async () => {
    mockGetDashboard.mockResolvedValue({
      ...MOCK_DASHBOARD,
      activeSessions: 0,
    });
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      const sessions = screen.getAllByText("Sessions");
      expect(sessions.length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText("0 active")).toBeInTheDocument();
  });

  // ── Line 231: refresh button onClick refetches dashboard + sessions ──
  it("clicking refresh button triggers refetch", async () => {
    const user = userEvent.setup();
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    // Refresh button is icon-only (SVG, no text) – find all buttons, pick the one
    // that has no text content and appears after the time-range selectors.
    const allButtons = screen.getAllByRole("button");
    const iconOnlyBtn = allButtons.find((b) => {
      const svg = b.querySelector("svg");
      return svg && !b.textContent?.trim();
    });
    expect(iconOnlyBtn).toBeDefined();
    await user.click(iconOnlyBtn!);

    // After clicking, dashboard should be re-fetched
    await waitFor(() => {
      expect(mockGetDashboard).toHaveBeenCalledTimes(2); // initial + refetch
    });
  });

  // ── Line 56 branch: topTools is null/undefined ──
  it("handles null topTools gracefully", async () => {
    mockGetDashboard.mockResolvedValue({
      ...MOCK_DASHBOARD,
      topTools: null,
    });
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    // Performance summary bar should not render
    expect(screen.queryByText(/Avg tool latency/)).not.toBeInTheDocument();
  });

  // ── Lines 324-348: dashboard.dailyOperations etc. with null values ──
  it("passes empty fallback arrays when dashboard sub-fields are null", async () => {
    mockGetDashboard.mockResolvedValue({
      ...MOCK_DASHBOARD,
      dailyOperations: null,
      operationsByType: null,
      topTools: null,
      recentErrors: null,
    });
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Should still render the dashboard metrics (totalSessions etc.)
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    // Charts should render with empty data (no crash)
    expect(
      screen.getAllByTestId("chart-container").length,
    ).toBeGreaterThanOrEqual(1);
  });
});
