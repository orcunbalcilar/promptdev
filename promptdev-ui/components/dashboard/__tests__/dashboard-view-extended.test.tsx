/**
 * dashboard-view-extended.test.tsx — covers SSE event handling (lines 101-122),
 * loading state (line 159), filter clear button, URL sync, status counts edge cases.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Task, PagedResponse } from "@/lib/api";

const mockPush = vi.fn();
const mockGet = vi.fn().mockReturnValue(null);
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  useSearchParams: vi.fn(() => ({
    get: mockGet,
  })),
}));

// Mock next/dynamic to render stubs that expose onTaskClick
let capturedOnTaskClick: ((task: Task) => void) | null = null;
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (loader: () => Promise<{ default: React.ComponentType }>) => {
    const Stub = (props: Record<string, unknown>) => {
      if (typeof props.onTaskClick === "function") {
        capturedOnTaskClick = props.onTaskClick as (task: Task) => void;
      }
      return <div data-testid="dynamic-component" />;
    };
    Stub.displayName = "DynamicStub";
    return Stub;
  },
}));

// Capture SSE subscription callback
let capturedSseCallback: ((event: MessageEvent) => void) | null = null;
const mockSseCleanup = vi.fn();

vi.mock("@/lib/sse-client", () => ({
  createSseSubscription: vi.fn(
    (opts: { onMessage: (e: MessageEvent) => void }) => {
      capturedSseCallback = opts.onMessage;
      return mockSseCleanup;
    },
  ),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

Element.prototype.hasPointerCapture =
  Element.prototype.hasPointerCapture ?? (() => false);
Element.prototype.setPointerCapture =
  Element.prototype.setPointerCapture ?? (() => {});
Element.prototype.releasePointerCapture =
  Element.prototype.releasePointerCapture ?? (() => {});
Element.prototype.scrollIntoView =
  Element.prototype.scrollIntoView ?? (() => {});

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    createPortal: (children: React.ReactNode) => children,
  };
});

const mockGetTasks = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    getTasks: (...args: unknown[]) => mockGetTasks(...args),
    API_BASE_URL: "http://localhost:3001",
  };
});

vi.mock("@/lib/query-policies", () => ({
  realtimeQueryOptions: {
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  },
}));

import { DashboardView } from "../dashboard-view";

// ── Helpers ─────────────────────────────────────────────────────

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Test Task",
    prompt: "Test prompt",
    repositorySlug: "test-repo",
    workspaceType: "BITBUCKET",
    sourceBranch: "main",
    targetBranch: "main",
    status: "PENDING",
    currentAttempt: 1,
    maxAttempts: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createPagedResponse(tasks: Task[]): PagedResponse<Task> {
  return {
    content: tasks,
    number: 0,
    size: tasks.length,
    totalElements: tasks.length,
    totalPages: 1,
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

// ── Setup ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  capturedSseCallback = null;
  capturedOnTaskClick = null;
  mockGetTasks.mockResolvedValue(createPagedResponse([]));
});

// ── SSE Event Handling (lines 101-122) ──────────────────────────

describe("DashboardView – SSE events", () => {
  it("shows success toast when task is COMPLETED", async () => {
    const tasks = [
      createTask({ id: "1", status: "IN_PROGRESS", title: "Build App" }),
    ];
    const data = createPagedResponse(tasks);
    renderWithProviders(<DashboardView initialTasks={data} />);

    // SSE callback should be captured
    expect(capturedSseCallback).toBeTruthy();

    // Simulate SSE event for task completion
    capturedSseCallback!(
      new MessageEvent("task-update", {
        data: JSON.stringify({
          id: "1",
          status: "COMPLETED",
          title: "Build App",
        }),
      }),
    );

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Task completed: Build App",
        expect.objectContaining({ action: expect.anything() }),
      );
    });
  });

  it("shows error toast when task FAILED", async () => {
    const tasks = [
      createTask({ id: "1", status: "IN_PROGRESS", title: "Deploy" }),
    ];
    const data = createPagedResponse(tasks);
    renderWithProviders(<DashboardView initialTasks={data} />);

    capturedSseCallback!(
      new MessageEvent("task-update", {
        data: JSON.stringify({
          id: "1",
          status: "FAILED",
          title: "Deploy",
        }),
      }),
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Task failed: Deploy",
        expect.objectContaining({ action: expect.anything() }),
      );
    });
  });

  it("handles SSE event with taskId instead of id", async () => {
    const tasks = [createTask({ id: "1" })];
    const data = createPagedResponse(tasks);
    renderWithProviders(<DashboardView initialTasks={data} />);

    capturedSseCallback!(
      new MessageEvent("task-update", {
        data: JSON.stringify({
          taskId: "task-99",
          status: "COMPLETED",
          title: "Legacy Task",
        }),
      }),
    );

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Task completed: Legacy Task",
        expect.objectContaining({ action: expect.anything() }),
      );
    });
  });

  it("handles SSE event with no id (no action on toast)", async () => {
    const tasks = [createTask({ id: "1" })];
    const data = createPagedResponse(tasks);
    renderWithProviders(<DashboardView initialTasks={data} />);

    capturedSseCallback!(
      new MessageEvent("task-update", {
        data: JSON.stringify({
          status: "COMPLETED",
        }),
      }),
    );

    // Toast is still called but title falls back to "Task"
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Task completed: Task",
        expect.objectContaining({ action: undefined }),
      );
    });
  });

  it("handles malformed SSE event data gracefully", async () => {
    const tasks = [createTask({ id: "1" })];
    const data = createPagedResponse(tasks);
    renderWithProviders(<DashboardView initialTasks={data} />);

    // Simulate malformed JSON
    capturedSseCallback!(
      new MessageEvent("task-update", {
        data: "not-json",
      }),
    );

    // Should not crash - the catch block invalidates queries
    // No toast should be called since JSON.parse would throw
  });

  it("handles SSE event with status that does not trigger toast", async () => {
    const tasks = [createTask({ id: "1" })];
    const data = createPagedResponse(tasks);
    renderWithProviders(<DashboardView initialTasks={data} />);

    capturedSseCallback!(
      new MessageEvent("task-update", {
        data: JSON.stringify({
          id: "1",
          status: "IN_PROGRESS",
          title: "Working",
        }),
      }),
    );

    // No toast for IN_PROGRESS
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("cleans up SSE subscription on unmount", () => {
    const tasks = [createTask()];
    const data = createPagedResponse(tasks);
    const { unmount } = renderWithProviders(
      <DashboardView initialTasks={data} />,
    );

    unmount();
    expect(mockSseCleanup).toHaveBeenCalled();
  });
});

// ── Loading state (line 159) ────────────────────────────────────

describe("DashboardView – loading state", () => {
  it("shows loading spinner when no initial data and query is loading", () => {
    mockGetTasks.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithProviders(<DashboardView />);

    // The loading state should show a Loader2 spinner
    const spinners = document.querySelectorAll(".animate-spin");
    expect(spinners.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Filter clear button ─────────────────────────────────────────

describe("DashboardView – filter interactions", () => {
  it("clears all filters when Clear button is clicked", async () => {
    const user = userEvent.setup();
    const tasks = [createTask({ id: "1", title: "A" })];
    const data = createPagedResponse(tasks);
    mockGetTasks.mockResolvedValue(data);
    renderWithProviders(<DashboardView initialTasks={data} />);

    // Type in search to show Clear button
    const search = screen.getByPlaceholderText("Search tasks...");
    await user.type(search, "test");

    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: /clear/i }),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Click clear
    await user.click(screen.getByRole("button", { name: /clear/i }));

    await waitFor(() => {
      expect(search).toHaveValue("");
    });
  });
});

// ── Status counts edge cases ────────────────────────────────────

describe("DashboardView – status counts", () => {
  it("shows VALIDATING and ITERATION_PENDING as running", () => {
    const tasks = [
      createTask({ id: "1", status: "VALIDATING" }),
      createTask({ id: "2", status: "ITERATION_PENDING" }),
    ];
    const data = createPagedResponse(tasks);
    renderWithProviders(<DashboardView initialTasks={data} />);

    expect(screen.getByText("2 tasks")).toBeInTheDocument();
    expect(screen.getByText(/2 running/)).toBeInTheDocument();
  });

  it("shows CANCELLED as failed", () => {
    const tasks = [createTask({ id: "1", status: "CANCELLED" })];
    const data = createPagedResponse(tasks);
    renderWithProviders(<DashboardView initialTasks={data} />);

    expect(screen.getByText(/1 failed/)).toBeInTheDocument();
  });

  it("does not show running count when zero active", () => {
    const tasks = [createTask({ id: "1", status: "COMPLETED" })];
    const data = createPagedResponse(tasks);
    renderWithProviders(<DashboardView initialTasks={data} />);

    expect(screen.queryByText(/running/)).not.toBeInTheDocument();
  });
});

// ── URL sync with search params ─────────────────────────────────

describe("DashboardView – URL sync", () => {
  it("reads initial search from URL params", () => {
    mockGet.mockImplementation((key: string) => {
      if (key === "search") return "hello";
      if (key === "status") return "Active";
      if (key === "workspaceType") return "LOCAL";
      return null;
    });

    const tasks = [createTask()];
    const data = createPagedResponse(tasks);
    mockGetTasks.mockResolvedValue(data);
    renderWithProviders(<DashboardView initialTasks={data} />);

    expect(screen.getByPlaceholderText("Search tasks...")).toHaveValue("hello");
  });
});

// ── Task click navigation ───────────────────────────────────────

describe("DashboardView – navigation", () => {
  it("renders KanbanBoard with tasks", () => {
    const tasks = [createTask({ id: "1", title: "Task One" })];
    const data = createPagedResponse(tasks);
    renderWithProviders(<DashboardView initialTasks={data} />);

    // Dynamic component (KanbanBoard stub) should be rendered
    expect(screen.getByTestId("dynamic-component")).toBeInTheDocument();
  });

  it("navigates to task page via handleTaskClick", () => {
    const tasks = [createTask({ id: "task-42", title: "Clickable" })];
    const data = createPagedResponse(tasks);
    renderWithProviders(<DashboardView initialTasks={data} />);

    // The dynamic component stub captures onTaskClick
    expect(capturedOnTaskClick).toBeTruthy();

    // Simulate clicking a task
    capturedOnTaskClick!(createTask({ id: "task-42" }));
    expect(mockPush).toHaveBeenCalledWith("/tasks/task-42");
  });

  it("SSE toast action navigates to task", async () => {
    const tasks = [
      createTask({ id: "nav-1", status: "IN_PROGRESS", title: "Nav Task" }),
    ];
    const data = createPagedResponse(tasks);
    renderWithProviders(<DashboardView initialTasks={data} />);

    capturedSseCallback!(
      new MessageEvent("task-update", {
        data: JSON.stringify({
          id: "nav-1",
          status: "COMPLETED",
          title: "Nav Task",
        }),
      }),
    );

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalled();
    });

    // Extract and invoke the action's onClick
    const call = mockToastSuccess.mock.calls[0];
    const action = call[1]?.action as { onClick: () => void };
    expect(action).toBeDefined();
    action.onClick();
    expect(mockPush).toHaveBeenCalledWith("/tasks/nav-1");
  });
});
