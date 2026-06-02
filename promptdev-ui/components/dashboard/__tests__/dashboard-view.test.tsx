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

// Mock next/dynamic to just render a placeholder
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const Stub = () => <div data-testid="dynamic-component" />;
    Stub.displayName = "DynamicStub";
    return Stub;
  },
}));

// Mock SSE subscription
vi.mock("@/lib/sse-client", () => ({
  createSseSubscription: vi.fn(() => vi.fn()),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ResizeObserver mock for Radix UI Select
globalThis.ResizeObserver = class ResizeObserver {
  observe() { /* noop */ }
  unobserve() { /* noop */ }
  disconnect() { /* noop */ }
} as unknown as typeof ResizeObserver;

Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

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

function createPagedResponse(
  tasks: Task[],
): PagedResponse<Task> {
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

describe("DashboardView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTasks.mockResolvedValue(createPagedResponse([]));
  });

  it("renders empty state when no tasks and no filters", () => {
    const emptyData = createPagedResponse([]);
    renderWithProviders(<DashboardView initialTasks={emptyData} />);
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Create your first task/),
    ).toBeInTheDocument();
  });

  it("renders stats bar with task counts", () => {
    const tasks = [
      createTask({ id: "1", status: "IN_PROGRESS" }),
      createTask({ id: "2", status: "COMPLETED" }),
      createTask({ id: "3", status: "FAILED" }),
    ];
    const data = createPagedResponse(tasks);
    renderWithProviders(<DashboardView initialTasks={data} />);
    expect(screen.getByText("3 tasks")).toBeInTheDocument();
    expect(screen.getByText(/1 running/)).toBeInTheDocument();
    expect(screen.getByText(/1 completed/)).toBeInTheDocument();
    expect(screen.getByText(/1 failed/)).toBeInTheDocument();
  });

  it("renders search input", () => {
    const tasks = [createTask()];
    const data = createPagedResponse(tasks);
    renderWithProviders(<DashboardView initialTasks={data} />);
    expect(
      screen.getByPlaceholderText("Search tasks..."),
    ).toBeInTheDocument();
  });

  it("renders status and workspace filter selects", () => {
    const tasks = [createTask()];
    const data = createPagedResponse(tasks);
    renderWithProviders(<DashboardView initialTasks={data} />);
    const triggers = screen.getAllByRole("combobox");
    // Status filter and workspace filter
    expect(triggers.length).toBeGreaterThanOrEqual(2);
  });

  it("shows error state when query fails", async () => {
    mockGetTasks.mockRejectedValue(new Error("Server error"));
    renderWithProviders(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load tasks")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /retry/i }),
    ).toBeInTheDocument();
  });

  it("shows Clear button when search query is active", async () => {
    const user = userEvent.setup();
    const tasks = [createTask()];
    const data = createPagedResponse(tasks);
    // Always return task data so the filter bar stays visible
    mockGetTasks.mockResolvedValue(data);
    renderWithProviders(<DashboardView initialTasks={data} />);

    const search = screen.getByPlaceholderText("Search tasks...");
    await user.type(search, "t");

    // searchQuery (non-debounced) controls Clear visibility immediately
    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: /clear/i }),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("hides failed count when there are no failures", () => {
    const tasks = [
      createTask({ id: "1", status: "COMPLETED" }),
      createTask({ id: "2", status: "COMPLETED" }),
    ];
    const data = createPagedResponse(tasks);
    renderWithProviders(<DashboardView initialTasks={data} />);
    expect(screen.getByText("2 tasks")).toBeInTheDocument();
    expect(screen.queryByText(/failed/)).not.toBeInTheDocument();
  });
});
