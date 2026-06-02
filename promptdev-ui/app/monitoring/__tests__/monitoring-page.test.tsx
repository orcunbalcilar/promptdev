import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock recharts to avoid DOM measurement issues in jsdom
vi.mock("recharts", () => {
  const MockChart = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-chart">{children}</div>
  );
  return {
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

import MonitoringPage from "@/app/monitoring/page";
import {
  getMonitoringDashboard,
  getMonitoringSessions,
  getSessionOperations,
} from "@/lib/monitoring";
import type { MonitoringDashboard } from "@/lib/monitoring";

const mockGetDashboard = getMonitoringDashboard as ReturnType<typeof vi.fn>;
const mockGetSessions = getMonitoringSessions as ReturnType<typeof vi.fn>;
const mockGetSessionOperations = getSessionOperations as ReturnType<
  typeof vi.fn
>;

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
    {
      id: "sess-2",
      sdkSessionId: "sdk-002",
      model: "claude-sonnet-4",
      status: "ACTIVE" as const,
      totalInputTokens: 1200,
      totalOutputTokens: 800,
      messageCount: 4,
      toolExecutionCount: 2,
      errorCount: 1,
      source: "task-orchestrator",
      createdAt: "2025-01-21T11:00:00Z",
    },
  ],
  totalElements: 2,
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
  mockGetSessionOperations.mockResolvedValue([]);
});

describe("MonitoringPage", () => {
  it("should render loading state initially", () => {
    // Make dashboard hang forever
    mockGetDashboard.mockReturnValue(new Promise(() => {}));
    render(<MonitoringPage />, { wrapper: createWrapper() });

    expect(screen.getByText("Monitoring")).toBeInTheDocument();
  });

  it("should render dashboard metrics after loading", async () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    // "Sessions" appears in both the MetricCard title and the tab trigger
    const sessionsElements = screen.getAllByText("Sessions");
    expect(sessionsElements.length).toBeGreaterThanOrEqual(1);
    // "3 active" appears in both the badge and MetricCard subtitle
    const activeElements = screen.getAllByText(/3 active/);
    expect(activeElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Operations")).toBeInTheDocument();
  });

  it("should render overview and sessions tabs", async () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /sessions/i })).toBeInTheDocument();
  });

  it("should show sessions table when clicking Sessions tab", async () => {
    const user = userEvent.setup();
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    const sessionsTab = screen.getByRole("tab", { name: /sessions/i });
    await user.click(sessionsTab);

    await waitFor(() => {
      // sdkSessionId is sliced to 12 chars + "..."
      expect(screen.getByText("sdk-001...")).toBeInTheDocument();
      expect(screen.getByText("sdk-002...")).toBeInTheDocument();
    });
  });

  it("should format token numbers correctly", async () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      // 100000 + 56000 = 156000 → formatTokens → "156.0K"
      expect(screen.getByText("156.0K")).toBeInTheDocument();
    });
  });

  it("should have refresh button", async () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    // Refresh is an icon-only button wrapped in a Tooltip; find by the RefreshCw icon's parent button
    const allButtons = screen.getAllByRole("button");
    const refreshButton = allButtons.find(
      (btn) =>
        btn.querySelector('[class*="lucide-refresh"]') !== null ||
        btn.querySelector("svg") !== null,
    );
    expect(refreshButton).toBeDefined();
  });

  it("should navigate back when clicking Back button", async () => {
    const user = userEvent.setup();
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    // The back button is an icon button (size="icon") with an ArrowLeft icon
    // It's the first ghost button in the header
    const allGhostButtons = screen.getAllByRole("button");
    // Click the first button in the component (the back/ArrowLeft button)
    await user.click(allGhostButtons[0]);

    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("should display charts on overview tab", async () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    // Charts should be rendered (mocked)
    expect(screen.getByText("Daily Operations")).toBeInTheDocument();
    expect(screen.getByText("Operations by Type")).toBeInTheDocument();
    expect(screen.getByText("Most Used Tools")).toBeInTheDocument();
    expect(screen.getByText("Sessions by Model")).toBeInTheDocument();
  });

  it("should display recent errors when clicking Errors tab", async () => {
    const user = userEvent.setup();
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    const errorsTab = screen.getByRole("tab", { name: /errors/i });
    await user.click(errorsTab);

    await waitFor(() => {
      expect(screen.getByText("Recent Errors")).toBeInTheDocument();
      expect(screen.getByText("File not found")).toBeInTheDocument();
    });
  });

  it("should show session models in sessions table", async () => {
    const user = userEvent.setup();
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    const sessionsTab = screen.getByRole("tab", { name: /sessions/i });
    await user.click(sessionsTab);

    await waitFor(() => {
      expect(screen.getByText("gpt-4.1")).toBeInTheDocument();
      expect(screen.getByText("claude-sonnet-4")).toBeInTheDocument();
    });
  });

  it("should show session statuses with badges", async () => {
    const user = userEvent.setup();
    render(<MonitoringPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    const sessionsTab = screen.getByRole("tab", { name: /sessions/i });
    await user.click(sessionsTab);

    await waitFor(() => {
      expect(screen.getByText("ENDED")).toBeInTheDocument();
      expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    });
  });
});
