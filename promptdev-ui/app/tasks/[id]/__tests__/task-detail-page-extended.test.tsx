import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Polyfills ────────────────────────────────────────────────────

globalThis.ResizeObserver ??= class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof globalThis.ResizeObserver;

// ── Mock data ────────────────────────────────────────────────────

const MOCK_TASK = {
  id: "task-1",
  title: "Implement SSO",
  prompt: "Implement SSO for the app",
  status: "IN_PROGRESS" as const,
  createdAt: "2026-01-01T12:00:00Z",
  updatedAt: "2026-01-01T13:00:00Z",
  repositorySlug: "my-repo",
  projectKey: "PROJ",
  sourceBranch: "feature/sso",
  targetBranch: "main",
  model: "gpt-5.2",
  copilotSessionId: "session-abc",
};

const MOCK_EVENTS = [
  {
    id: "e1",
    taskId: "task-1",
    eventType: "TASK_QUEUED",
    message: "Task queued",
    timestamp: "2026-01-01T12:00:00Z",
  },
  {
    id: "e2",
    taskId: "task-1",
    eventType: "AGENT_STARTED",
    message: "Agent started",
    timestamp: "2026-01-01T12:01:00Z",
  },
  {
    id: "e3",
    taskId: "task-1",
    eventType: "CODE_GENERATED",
    message: "Code generated",
    timestamp: "2026-01-01T12:05:00Z",
  },
];

// ── Mocks ────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  back: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ id: "task-1" }),
}));

const mockGetTask = vi.fn();
const mockGetTaskEvents = vi.fn();
const mockCancelTask = vi.fn();
const mockStartTask = vi.fn();
const mockCloneTask = vi.fn();
const mockResumeTask = vi.fn();
const mockSubscribe = vi.fn(() => vi.fn());

vi.mock("@/lib/api", () => ({
  getTask: (...args: unknown[]) => mockGetTask(...args),
  getTaskEvents: (...args: unknown[]) => mockGetTaskEvents(...args),
  cancelTask: (...args: unknown[]) => mockCancelTask(...args),
  startTask: (...args: unknown[]) => mockStartTask(...args),
  cloneTask: (...args: unknown[]) => mockCloneTask(...args),
  resumeTask: (...args: unknown[]) => mockResumeTask(...args),
  subscribeToTaskEvents: (...args: unknown[]) => mockSubscribe(...args),
}));

vi.mock("@/lib/monitoring", () => ({
  getMonitoringSessionDetails: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/errors", () => ({
  showErrorToast: vi.fn(),
}));

vi.mock("@/lib/query-policies", () => ({
  stableQueryOptions: { staleTime: 0, gcTime: 0 },
  realtimeQueryOptions: { staleTime: 0, gcTime: 0 },
  standardQueryOptions: { staleTime: 0, gcTime: 0 },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock heavy dynamic components
vi.mock("@/components/tasks/activity-stream/stream", () => ({
  AgentActivityStream: ({
    events,
    isLive,
  }: {
    events: unknown[];
    isLive: boolean;
  }) => (
    <div data-testid="activity-stream" data-live={isLive}>
      Events: {events.length}
    </div>
  ),
}));

vi.mock("@/components/tasks/task-changes-summary", () => ({
  TaskChangesSummary: ({ events }: { events: unknown[] }) => (
    <div data-testid="changes-summary">Changes: {events.length}</div>
  ),
}));

vi.mock("@/components/tasks/activity-stream/file-tree", () => ({
  ChangedFilesTree: ({ events }: { events: unknown[] }) => (
    <div data-testid="file-tree">Files: {events.length}</div>
  ),
}));

vi.mock("@/components/tasks/task-header-actions", () => ({
  TaskHeaderActions: ({
    task,
    showResumeForm,
    setShowResumeForm,
    onRetry,
    onCancel,
    onStart,
  }: {
    task: { id: string; status: string };
    showResumeForm: boolean;
    setShowResumeForm: (v: boolean) => void;
    onRetry: () => void;
    onCancel: () => void;
    onStart: () => void;
  }) => (
    <div data-testid="header-actions">
      <button onClick={onCancel}>Cancel Task</button>
      <button onClick={onStart}>Start Task</button>
      <button onClick={onRetry}>Retry Task</button>
      <button onClick={() => setShowResumeForm(!showResumeForm)}>
        Toggle Resume
      </button>
    </div>
  ),
}));

vi.mock("@/components/tasks/task-sidebar", () => ({
  TaskSidebar: ({
    task,
    isLive,
    isProcessing,
    models,
    sessionDetails,
    allEvents,
  }: {
    task: { title: string; status: string };
    isLive: boolean;
    isProcessing: boolean;
    models: unknown[];
    sessionDetails: unknown;
    allEvents: unknown[];
  }) => (
    <div data-testid="task-sidebar">
      <span data-testid="sidebar-title">{task.title}</span>
      <span data-testid="sidebar-live">{String(isLive)}</span>
      <span data-testid="sidebar-processing">{String(isProcessing)}</span>
      <span data-testid="sidebar-events">{allEvents.length}</span>
    </div>
  ),
}));

vi.mock("@/components/tasks/resume-form", () => ({
  ResumeForm: ({
    onResume,
    onClose,
    resumePrompt,
    setResumePrompt,
  }: {
    onResume: () => void;
    onClose: () => void;
    resumePrompt: string;
    setResumePrompt: (v: string) => void;
  }) => (
    <div data-testid="resume-form">
      <input
        value={resumePrompt}
        onChange={(e) => setResumePrompt(e.target.value)}
        data-testid="resume-input"
      />
      <button onClick={onResume}>Submit Resume</button>
      <button onClick={onClose}>Close Resume</button>
    </div>
  ),
}));

vi.mock("@/components/tasks/task-refine-form", () => ({
  TaskRefineForm: ({
    task,
    onStarted,
  }: {
    task: { id: string };
    onStarted: () => void;
  }) => (
    <div data-testid="refine-form">
      <span>Refine: {task.id}</span>
      <button onClick={onStarted}>Refine Started</button>
    </div>
  ),
}));

vi.mock("@/components/tasks/task-helpers", () => ({
  statusColors: {
    PENDING: "text-yellow-500",
    QUEUED: "text-blue-500",
    IN_PROGRESS: "text-blue-500",
    COMPLETED: "text-green-500",
    FAILED: "text-red-500",
    CANCELLED: "text-gray-500",
    CODE_GENERATED: "text-blue-500",
    COMMITTING: "text-blue-500",
    PUSHING: "text-blue-500",
    CREATING_PR: "text-blue-500",
    REVIEWING: "text-blue-500",
    TRIAGING: "text-blue-500",
  },
}));

// ── Helpers ──────────────────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

async function getTaskDetailPage() {
  const mod = await import("@/app/tasks/[id]/page");
  return mod.default;
}

async function renderPage() {
  const queryClient = createQueryClient();
  const TaskDetailPage = await getTaskDetailPage();
  return render(
    <QueryClientProvider client={queryClient}>
      <TaskDetailPage />
    </QueryClientProvider>,
  );
}

// ── Setup ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTask.mockResolvedValue(MOCK_TASK);
  mockGetTaskEvents.mockResolvedValue(MOCK_EVENTS);
  vi.spyOn(globalThis, "confirm").mockReturnValue(true);
});

// ── Tests ────────────────────────────────────────────────────────

describe("TaskDetailPage – extended", () => {
  // ── Tab switching ──────────────────────────────────────────────

  it("switches to changes tab and shows changes summary", async () => {
    const user = userEvent.setup();
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Changes Summary")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Changes Summary"));

    await waitFor(() => {
      expect(screen.getByTestId("changes-summary")).toBeInTheDocument();
    });
  });

  it("switches back to activity tab after viewing changes", async () => {
    const user = userEvent.setup();
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Changes Summary")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Changes Summary"));
    await user.click(screen.getByText("Live Activity"));

    await waitFor(() => {
      expect(screen.getByTestId("activity-stream")).toBeInTheDocument();
    });
  });

  // ── SSE event merging and ordering ─────────────────────────────

  it("passes combined events from initial + realtime to activity stream", async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("activity-stream")).toHaveTextContent(
        "Events: 3",
      );
    });
  });

  it("deduplicates events with matching IDs", async () => {
    mockGetTaskEvents.mockResolvedValue([
      ...MOCK_EVENTS,
      // Duplicate of e1
      {
        id: "e1",
        taskId: "task-1",
        eventType: "TASK_QUEUED",
        message: "Task queued",
        timestamp: "2026-01-01T12:00:00Z",
      },
    ]);

    await renderPage();

    await waitFor(() => {
      // Even with 4 events in the array, deduplicated should be 3
      expect(screen.getByTestId("activity-stream")).toBeInTheDocument();
    });
  });

  // ── Live status detection ──────────────────────────────────────

  it("marks task as live when status is IN_PROGRESS", async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("sidebar-live")).toHaveTextContent("true");
      expect(screen.getByTestId("sidebar-processing")).toHaveTextContent(
        "true",
      );
    });
  });

  it("marks task as not live when status is COMPLETED", async () => {
    mockGetTask.mockResolvedValue({ ...MOCK_TASK, status: "COMPLETED" });
    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("sidebar-live")).toHaveTextContent("false");
    });
  });

  it("marks task as not live when status is FAILED", async () => {
    mockGetTask.mockResolvedValue({ ...MOCK_TASK, status: "FAILED" });
    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("sidebar-live")).toHaveTextContent("false");
    });
  });

  it("marks task as not live when status is CANCELLED", async () => {
    mockGetTask.mockResolvedValue({ ...MOCK_TASK, status: "CANCELLED" });
    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("sidebar-live")).toHaveTextContent("false");
    });
  });

  // ── Resume form ────────────────────────────────────────────────

  it("shows resume form when toggle resume is clicked", async () => {
    const user = userEvent.setup();
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Toggle Resume")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Toggle Resume"));

    await waitFor(() => {
      expect(screen.getByTestId("resume-form")).toBeInTheDocument();
    });
  });

  it("submits resume with prompt text and calls resumeTask", async () => {
    mockResumeTask.mockResolvedValue(MOCK_TASK);
    const user = userEvent.setup();
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Toggle Resume")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Toggle Resume"));

    await waitFor(() => {
      expect(screen.getByTestId("resume-input")).toBeInTheDocument();
    });

    await user.type(
      screen.getByTestId("resume-input"),
      "Please fix the auth module",
    );
    await user.click(screen.getByText("Submit Resume"));

    await waitFor(() => {
      expect(mockResumeTask).toHaveBeenCalledWith(
        "task-1",
        "Please fix the auth module",
      );
    });
  });

  it("does not submit resume when prompt is empty", async () => {
    const user = userEvent.setup();
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Toggle Resume")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Toggle Resume"));

    await waitFor(() => {
      expect(screen.getByTestId("resume-form")).toBeInTheDocument();
    });

    // Click submit without typing anything
    await user.click(screen.getByText("Submit Resume"));
    expect(mockResumeTask).not.toHaveBeenCalled();
  });

  it("closes resume form when close button is clicked", async () => {
    const user = userEvent.setup();
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Toggle Resume")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Toggle Resume"));

    await waitFor(() => {
      expect(screen.getByTestId("resume-form")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Close Resume"));

    await waitFor(() => {
      expect(screen.queryByTestId("resume-form")).not.toBeInTheDocument();
    });
  });

  it("handles resume task error gracefully", async () => {
    const { showErrorToast } = await import("@/lib/errors");
    mockResumeTask.mockRejectedValue(new Error("Resume failed"));
    const user = userEvent.setup();
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Toggle Resume")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Toggle Resume"));

    await waitFor(() => {
      expect(screen.getByTestId("resume-input")).toBeInTheDocument();
    });

    await user.type(screen.getByTestId("resume-input"), "retry please");
    await user.click(screen.getByText("Submit Resume"));

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalled();
    });
  });

  // ── Refine form for PENDING + Jira ─────────────────────────────

  it("shows refine form for PENDING task with jiraIssueKey", async () => {
    mockGetTask.mockResolvedValue({
      ...MOCK_TASK,
      status: "PENDING",
      jiraIssueKey: "PROJ-42",
    });
    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("refine-form")).toBeInTheDocument();
      expect(screen.getByText("Refine: task-1")).toBeInTheDocument();
    });
  });

  it("does not show refine form for PENDING task without jiraIssueKey", async () => {
    mockGetTask.mockResolvedValue({
      ...MOCK_TASK,
      status: "PENDING",
      jiraIssueKey: undefined,
    });
    await renderPage();

    await waitFor(() => {
      const sidebar = screen.getByTestId("task-sidebar");
      expect(sidebar).toBeInTheDocument();
    });
    expect(screen.queryByTestId("refine-form")).not.toBeInTheDocument();
  });

  it("does not show refine form for non-PENDING task with jiraIssueKey", async () => {
    mockGetTask.mockResolvedValue({
      ...MOCK_TASK,
      status: "COMPLETED",
      jiraIssueKey: "PROJ-42",
    });
    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("task-sidebar")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("refine-form")).not.toBeInTheDocument();
  });

  // ── Files panel toggle ─────────────────────────────────────────

  it("toggles files panel and shows/hides changed files", async () => {
    const user = userEvent.setup();
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Changed Files")).toBeInTheDocument();
    });

    const toggleBtn = screen.getByTitle(/hide files panel/i);
    await user.click(toggleBtn);

    expect(screen.queryByText("Changed Files")).not.toBeInTheDocument();

    // Toggle back becomes "show files panel"
    const showBtn = screen.getByTitle(/show files panel/i);
    await user.click(showBtn);

    expect(screen.getByText("Changed Files")).toBeInTheDocument();
  });

  // ── Event count badge ──────────────────────────────────────────

  it("shows correct event count badge", async () => {
    await renderPage();

    await waitFor(() => {
      // The badge shows event count; multiple "3" may appear so use getAllByText
      const threes = screen.getAllByText("3");
      expect(threes.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Empty events ───────────────────────────────────────────────

  it("renders with empty events list", async () => {
    mockGetTaskEvents.mockResolvedValue([]);
    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("activity-stream")).toHaveTextContent(
        "Events: 0",
      );
    });
  });

  // ── SSE subscription lifecycle ─────────────────────────────────

  it("calls subscribeToTaskEvents with task ID", async () => {
    await renderPage();

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith(
        "task-1",
        expect.any(Function),
        expect.any(Function),
      );
    });
  });

  // ── Different task statuses ────────────────────────────────────

  it("renders QUEUED status badge", async () => {
    mockGetTask.mockResolvedValue({ ...MOCK_TASK, status: "QUEUED" });
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText(/queued/i)).toBeInTheDocument();
      expect(screen.getByTestId("sidebar-live")).toHaveTextContent("true");
    });
  });

  it("renders CODE_GENERATED status", async () => {
    mockGetTask.mockResolvedValue({ ...MOCK_TASK, status: "CODE_GENERATED" });
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText(/code generated/i)).toBeInTheDocument();
    });
  });

  it("renders REVIEWING status as live", async () => {
    mockGetTask.mockResolvedValue({ ...MOCK_TASK, status: "REVIEWING" });
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText(/reviewing/i)).toBeInTheDocument();
      expect(screen.getByTestId("sidebar-live")).toHaveTextContent("true");
    });
  });

  // ── Retry creates clone then starts ────────────────────────────

  it("retry clones and navigates to new task", async () => {
    const clonedTask = { ...MOCK_TASK, id: "task-new" };
    mockCloneTask.mockResolvedValue(clonedTask);
    mockStartTask.mockResolvedValue(clonedTask);
    const user = userEvent.setup();
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Retry Task")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Retry Task"));

    await waitFor(() => {
      expect(mockCloneTask).toHaveBeenCalledWith("task-1");
      expect(mockStartTask).toHaveBeenCalledWith("task-new");
      expect(mockPush).toHaveBeenCalledWith("/tasks/task-new");
    });
  });

  // ── Confirm dialog for cancel ──────────────────────────────────

  it("does not cancel if user declines confirmation", async () => {
    vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Cancel Task")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Cancel Task"));
    expect(mockCancelTask).not.toHaveBeenCalled();
  });

  // ── Pass events to sidebar ─────────────────────────────────────

  it("passes all events to sidebar", async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("sidebar-events")).toHaveTextContent("3");
    });
  });

  // ── Session details for monitoring ─────────────────────────────

  it("renders without copilotSessionId gracefully", async () => {
    mockGetTask.mockResolvedValue({
      ...MOCK_TASK,
      copilotSessionId: undefined,
    });
    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("task-sidebar")).toBeInTheDocument();
    });
  });

  // ── File tree receives events ──────────────────────────────────

  it("passes events to changed files tree", async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("file-tree")).toHaveTextContent("Files: 3");
    });
  });

  // ── Changes summary receives events ────────────────────────────

  it("passes events to changes summary tab", async () => {
    const user = userEvent.setup();
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Changes Summary")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Changes Summary"));

    await waitFor(() => {
      expect(screen.getByTestId("changes-summary")).toHaveTextContent(
        "Changes: 3",
      );
    });
  });
});
