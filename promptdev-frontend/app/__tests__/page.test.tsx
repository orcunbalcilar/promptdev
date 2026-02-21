import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api", () => ({
  API_BASE_URL: "/api",
  getTasks: vi.fn(),
}));

vi.mock("@/components/tasks/create-task-dialog", () => ({
  CreateTaskDialog: () => <button>New Task</button>,
}));

vi.mock("@/components/dashboard/kanban-board", () => ({
  KanbanBoard: ({
    tasks,
    onTaskClick,
  }: {
    tasks: { id: string; title: string }[];
    onTaskClick: (t: { id: string; title: string }) => void;
  }) => (
    <div data-testid="kanban-board" data-task-count={tasks.length}>
      {tasks.map((t) => (
        <button
          key={t.id}
          onClick={() => onTaskClick(t)}
          data-testid={`task-${t.id}`}
        >
          {t.title}
        </button>
      ))}
    </div>
  ),
}));

// Mock Radix Select with native HTML selects for jsdom compatibility
vi.mock("@/components/ui/select", () => {
  let selectCounter = 0;
  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (v: string) => void;
      children: React.ReactNode;
    }) => {
      const id = `mock-select-${selectCounter++}`;
      return (
        <select
          aria-label={id}
          data-testid={id}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
        >
          {children}
        </select>
      );
    },
    SelectTrigger: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    SelectValue: ({ placeholder }: { placeholder: string }) => (
      <option value="" disabled>
        {placeholder}
      </option>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    SelectItem: ({
      value,
      children,
    }: {
      value: string;
      children: React.ReactNode;
    }) => <option value={value}>{children}</option>,
  };
});

import { getTasks } from "@/lib/api";
import Dashboard from "../page";

const mockGetTasks = getTasks as ReturnType<typeof vi.fn>;

const mockTasks = [
  {
    id: "1",
    title: "Frontend Fix",
    prompt: "Fix the login button",
    status: "PENDING",
    createdAt: new Date().toISOString(),
    workspaceType: "BITBUCKET",
  },
  {
    id: "2",
    title: "Backend API",
    prompt: "Add user endpoint",
    status: "IN_PROGRESS",
    createdAt: new Date().toISOString(),
    workspaceType: "LOCAL",
  },
  {
    id: "3",
    title: "Review Code",
    prompt: "Review PR 123",
    status: "COMPLETED",
    createdAt: new Date().toISOString(),
    workspaceType: "BITBUCKET",
  },
];

const successResponse = {
  content: mockTasks,
  totalElements: 3,
  totalPages: 1,
  number: 0,
  size: 100,
};
const emptyResponse = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 100,
};

const mockEventSourceConstructor = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockEventSourceConstructor.mockClear();
  globalThis.EventSource = vi.fn().mockImplementation(function (
    this: Record<string, unknown>,
    url: string,
  ) {
    mockEventSourceConstructor(url);
    this.url = url;
    this.addEventListener = vi.fn();
    this.close = vi.fn();
    this.onerror = null;
    return this;
  }) as unknown as typeof EventSource;
});

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

describe("Dashboard", () => {
  it("shows loading state initially", () => {
    mockGetTasks.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithProviders(<Dashboard />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error state when API call fails", async () => {
    mockGetTasks.mockRejectedValue(new Error("Network error"));
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load tasks")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Please check if the server is running."),
    ).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("shows empty state when no tasks", async () => {
    mockGetTasks.mockResolvedValue(emptyResponse);
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    });
    expect(screen.getByText(/Create your first task/)).toBeInTheDocument();
  });

  it("renders KanbanBoard when tasks are loaded", async () => {
    mockGetTasks.mockResolvedValue(successResponse);
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("kanban-board")).toBeInTheDocument();
    });
    expect(screen.getByTestId("kanban-board")).toHaveAttribute(
      "data-task-count",
      "3",
    );
    expect(screen.getByText("Frontend Fix")).toBeInTheDocument();
    expect(screen.getByText("Backend API")).toBeInTheDocument();
    expect(screen.getByText("Review Code")).toBeInTheDocument();
  });

  it("shows search input when tasks exist", async () => {
    mockGetTasks.mockResolvedValue(successResponse);
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search tasks..."),
      ).toBeInTheDocument();
    });
  });

  it("filters tasks by search query (title match)", async () => {
    const user = userEvent.setup();
    mockGetTasks.mockResolvedValue(successResponse);
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("kanban-board")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("Search tasks..."), "Frontend");

    await waitFor(() => {
      expect(screen.getByTestId("kanban-board")).toHaveAttribute(
        "data-task-count",
        "1",
      );
    });
    expect(screen.getByText("Frontend Fix")).toBeInTheDocument();
    expect(screen.queryByText("Backend API")).not.toBeInTheDocument();
  });

  it("filters tasks by search query (prompt match)", async () => {
    const user = userEvent.setup();
    mockGetTasks.mockResolvedValue(successResponse);
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("kanban-board")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("Search tasks..."), "PR 123");

    await waitFor(() => {
      expect(screen.getByTestId("kanban-board")).toHaveAttribute(
        "data-task-count",
        "1",
      );
    });
    expect(screen.getByText("Review Code")).toBeInTheDocument();
    expect(screen.queryByText("Frontend Fix")).not.toBeInTheDocument();
  });

  it("filters tasks by status group", async () => {
    const user = userEvent.setup();
    mockGetTasks.mockResolvedValue(successResponse);
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("kanban-board")).toBeInTheDocument();
    });

    // Use native select - first select is status filter
    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], "Pending");

    await waitFor(() => {
      expect(screen.getByTestId("kanban-board")).toHaveAttribute(
        "data-task-count",
        "1",
      );
    });
    expect(screen.getByText("Frontend Fix")).toBeInTheDocument();
    expect(screen.queryByText("Backend API")).not.toBeInTheDocument();
  });

  it("filters tasks by workspace type", async () => {
    const user = userEvent.setup();
    mockGetTasks.mockResolvedValue(successResponse);
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("kanban-board")).toBeInTheDocument();
    });

    // Use native select - second select is workspace filter
    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[1], "LOCAL");

    await waitFor(() => {
      expect(screen.getByTestId("kanban-board")).toHaveAttribute(
        "data-task-count",
        "1",
      );
    });
    expect(screen.getByText("Backend API")).toBeInTheDocument();
    expect(screen.queryByText("Frontend Fix")).not.toBeInTheDocument();
  });

  it("shows Clear filters button when filters are active", async () => {
    const user = userEvent.setup();
    mockGetTasks.mockResolvedValue(successResponse);
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("kanban-board")).toBeInTheDocument();
    });

    // No clear button initially
    expect(screen.queryByText("Clear filters")).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search tasks..."), "test");

    await waitFor(() => {
      expect(screen.getByText("Clear")).toBeInTheDocument();
    });
  });

  it("clears all filters when Clear filters is clicked", async () => {
    const user = userEvent.setup();
    mockGetTasks.mockResolvedValue(successResponse);
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("kanban-board")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("Search tasks..."), "Frontend");

    await waitFor(() => {
      expect(screen.getByTestId("kanban-board")).toHaveAttribute(
        "data-task-count",
        "1",
      );
    });

    await user.click(screen.getByText("Clear"));

    await waitFor(() => {
      expect(screen.getByTestId("kanban-board")).toHaveAttribute(
        "data-task-count",
        "3",
      );
    });
    expect(screen.getByPlaceholderText("Search tasks...")).toHaveValue("");
  });

  it("navigates to task detail page when task is clicked", async () => {
    const user = userEvent.setup();
    mockGetTasks.mockResolvedValue(successResponse);
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("task-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("task-1"));

    expect(mockPush).toHaveBeenCalledWith("/tasks/1");
  });

  it("shows navigation buttons (Scheduled Jobs, Monitoring, Settings, Copilot Agent)", async () => {
    mockGetTasks.mockResolvedValue(successResponse);
    renderWithProviders(<Dashboard />);

    expect(screen.getByText("Jobs")).toBeInTheDocument();
    expect(screen.getByText("Monitor")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Copilot")).toBeInTheDocument();
  });

  it("shows Refresh button", async () => {
    mockGetTasks.mockResolvedValue(successResponse);
    renderWithProviders(<Dashboard />);

    expect(screen.getByTitle("Refresh")).toBeInTheDocument();
  });

  it("creates SSE connection to /stream/tasks", async () => {
    mockGetTasks.mockResolvedValue(successResponse);
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(mockEventSourceConstructor).toHaveBeenCalledWith(
        "/api/stream/tasks",
      );
    });
  });

  it("reconnects SSE with exponential backoff on error", async () => {
    mockGetTasks.mockResolvedValue(successResponse);
    renderWithProviders(<Dashboard />);

    // Wait for initial SSE connection
    await waitFor(() => {
      expect(mockEventSourceConstructor).toHaveBeenCalledTimes(1);
    });

    // Get the EventSource instance and trigger an error
    const esMock = globalThis.EventSource as unknown as ReturnType<
      typeof vi.fn
    >;
    const firstInstance = esMock.mock.results[0].value;
    firstInstance.onerror?.();

    // First reconnect after ~1s (initial delay)
    await waitFor(
      () => {
        expect(mockEventSourceConstructor).toHaveBeenCalledTimes(2);
      },
      { timeout: 3000 },
    );

    // Trigger another error
    const secondInstance = esMock.mock.results[1].value;
    secondInstance.onerror?.();

    // Second reconnect takes ~2s (doubled delay)
    await waitFor(
      () => {
        expect(mockEventSourceConstructor).toHaveBeenCalledTimes(3);
      },
      { timeout: 5000 },
    );
  });

  it("resets SSE backoff delay on successful connection", async () => {
    mockGetTasks.mockResolvedValue(successResponse);
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(mockEventSourceConstructor).toHaveBeenCalledTimes(1);
    });

    // First error
    const esMock = globalThis.EventSource as unknown as ReturnType<
      typeof vi.fn
    >;
    const firstInstance = esMock.mock.results[0].value;
    firstInstance.onerror?.();

    await waitFor(
      () => {
        expect(mockEventSourceConstructor).toHaveBeenCalledTimes(2);
      },
      { timeout: 3000 },
    );

    // Simulate successful connection (onopen) — resets delay to 1s
    const secondInstance = esMock.mock.results[1].value;
    secondInstance.onopen?.();

    // Another error — delay should be reset to 1s (not 2s)
    secondInstance.onerror?.();

    await waitFor(
      () => {
        expect(mockEventSourceConstructor).toHaveBeenCalledTimes(3);
      },
      { timeout: 3000 },
    );
  });
});
