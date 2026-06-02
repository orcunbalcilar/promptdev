import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MonitoringPage from "../monitoring/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock the monitoring client
vi.mock("@/lib/monitoring", () => ({
  getMonitoringDashboard: vi.fn(),
  getMonitoringSessions: vi.fn(),
  getMonitoringOperations: vi.fn(),
}));

// Mock recharts components (they don't render well in jsdom)
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    AreaChart: () => <div data-testid="area-chart" />,
    Area: () => null,
    BarChart: () => <div data-testid="bar-chart" />,
    Bar: () => null,
    PieChart: () => <div data-testid="pie-chart" />,
    Pie: () => null,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Cell: () => null,
  };
});

// Mock createPortal to avoid jsdom issues
vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

import {
  getMonitoringDashboard,
  getMonitoringSessions,
} from "@/lib/monitoring";

const mockGetDashboard = getMonitoringDashboard as ReturnType<typeof vi.fn>;
const mockGetSessions = getMonitoringSessions as ReturnType<typeof vi.fn>;

function makeDashboard(overrides = {}) {
  return {
    totalSessions: 15,
    activeSessions: 2,
    totalOperations: 120,
    totalErrors: 3,
    totalInputTokens: 50000,
    totalOutputTokens: 25000,
    operationsByType: { SEND_MESSAGE: 60, TOOL_EXECUTION: 40, ERROR: 3 },
    sessionsByModel: { "gpt-5.2": 10, "claude-4": 5 },
    sessionsBySource: { web: 12, api: 3 },
    topTools: [
      { toolName: "readFile", executionCount: 20, avgDurationMs: 150 },
      { toolName: "writeFile", executionCount: 15, avgDurationMs: 200 },
    ],
    dailyOperations: [
      { date: "2025-01-14", count: 40 },
      { date: "2025-01-15", count: 80 },
    ],
    recentErrors: [
      {
        id: "err-1",
        operationType: "TOOL_EXECUTION_ERROR",
        message: "File not found",
        errorMessage: "ENOENT",
        timestamp: new Date().toISOString(),
        sessionId: "sess-1",
      },
    ],
    recentSessions: [],
    ...overrides,
  };
}

function makeSessions() {
  return {
    content: [
      {
        id: "s1",
        sdkSessionId: "sdk-s1",
        model: "gpt-5.2",
        status: "ACTIVE",
        totalInputTokens: 1000,
        totalOutputTokens: 500,
        messageCount: 5,
        toolExecutionCount: 3,
        errorCount: 0,
        source: "web",
        createdAt: new Date().toISOString(),
      },
    ],
    totalElements: 1,
    totalPages: 1,
    size: 15,
    number: 0,
    first: true,
    last: true,
    empty: false,
  };
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDashboard.mockResolvedValue(makeDashboard());
  mockGetSessions.mockResolvedValue(makeSessions());
});

describe("MonitoringPage", () => {
  it("should render summary metrics", async () => {
    renderWithProviders(<MonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText("15")).toBeInTheDocument(); // total sessions
    });
    expect(screen.getByText("120")).toBeInTheDocument(); // total operations
    // "3" appears in both the error metric card and as a badge, so find it in the card
    const errorElements = screen.getAllByText("3");
    expect(errorElements.length).toBeGreaterThanOrEqual(1);
  });

  it("should display token usage", async () => {
    renderWithProviders(<MonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText("75.0K")).toBeInTheDocument(); // total tokens (50K + 25K)
    });
  });

  it("should display estimated cost", async () => {
    renderWithProviders(<MonitoringPage />);

    await waitFor(() => {
      // Cost: 50000 * 0.00001 + 25000 * 0.00003 = 0.5 + 0.75 = $1.25
      expect(screen.getByText("$1.25")).toBeInTheDocument();
    });
  });

  it("should show active sessions badge", async () => {
    renderWithProviders(<MonitoringPage />);

    await waitFor(() => {
      // The active badge and subtitle both contain "active" text
      const activeElements = screen.getAllByText(/active/i);
      expect(activeElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("should show error rate in subtitle", async () => {
    renderWithProviders(<MonitoringPage />);

    await waitFor(() => {
      // 3/120 * 100 = 2.5%
      expect(screen.getByText("2.5% error rate")).toBeInTheDocument();
    });
  });

  it("should respond to time range selector", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText("15")).toBeInTheDocument();
    });

    // Click 30d button
    await user.click(screen.getByText("30d"));

    expect(mockGetDashboard).toHaveBeenCalledWith(30);
  });

  it("should show loading state", () => {
    mockGetDashboard.mockReturnValue(new Promise(() => {}));
    mockGetSessions.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<MonitoringPage />);

    // Should show loading spinner
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("should show performance summary bar with tool stats", async () => {
    renderWithProviders(<MonitoringPage />);

    await waitFor(() => {
      // Avg latency: (150 + 200) / 2 = 175ms
      expect(screen.getByText("175ms")).toBeInTheDocument();
    });
  });

  it("should not show active badge when no active sessions", async () => {
    mockGetDashboard.mockResolvedValue(makeDashboard({ activeSessions: 0 }));

    renderWithProviders(<MonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText("15")).toBeInTheDocument();
    });

    expect(screen.queryByText("active")).not.toBeInTheDocument();
  });
});
