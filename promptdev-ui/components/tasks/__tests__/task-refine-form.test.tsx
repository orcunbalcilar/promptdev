import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TaskRefineForm } from "../task-refine-form";
import type { Task } from "@/lib/api";

const mockUpdateTask = vi.fn();
const mockStartTask = vi.fn();

vi.mock("@/lib/api", () => ({
  updateTask: (...args: unknown[]) => mockUpdateTask(...args),
  startTask: (...args: unknown[]) => mockStartTask(...args),
}));

vi.mock("@/lib/copilot/models", () => ({
  COPILOT_MODELS: [
    { id: "gpt-5.2", name: "GPT-5.2" },
    { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5" },
  ],
  DEFAULT_MODEL_ID: "gpt-5.2",
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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

function makePendingJiraTask(overrides?: Partial<Task>): Task {
  return {
    id: "task-jira-1",
    title: "[PROJ-123] Fix authentication bug",
    prompt: "## Jira Issue: PROJ-123\n\nFix the authentication flow",
    repositorySlug: "backend-api",
    workspaceType: "BITBUCKET",
    sourceBranch: "promptdev/task-jira-1",
    targetBranch: "main",
    status: "PENDING",
    currentAttempt: 0,
    maxAttempts: 3,
    modelId: "gpt-5.2",
    jiraIssueKey: "PROJ-123",
    iterative: true,
    maxIterations: 1,
    reviewEnabled: true,
    createdAt: "2026-02-20T10:00:00Z",
    updatedAt: "2026-02-20T10:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateTask.mockResolvedValue({ id: "task-jira-1", status: "PENDING" });
  mockStartTask.mockResolvedValue({ id: "task-jira-1", status: "QUEUED" });
});

describe("TaskRefineForm", () => {
  it("should show refinement banner for pending Jira task", () => {
    const task = makePendingJiraTask();
    renderWithProviders(<TaskRefineForm task={task} onStarted={vi.fn()} />);

    expect(
      screen.getByText("This Jira task is awaiting refinement"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refine/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start task/i }),
    ).toBeInTheDocument();
  });

  it("should show edit form when Refine is clicked", async () => {
    const user = userEvent.setup();
    const task = makePendingJiraTask();
    renderWithProviders(<TaskRefineForm task={task} onStarted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /refine/i }));

    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Prompt")).toBeInTheDocument();
    expect(screen.getByLabelText("AI Model")).toBeInTheDocument();
    expect(screen.getByText("Refine Task Before Starting")).toBeInTheDocument();
  });

  it("should populate form fields with task data", async () => {
    const user = userEvent.setup();
    const task = makePendingJiraTask();
    renderWithProviders(<TaskRefineForm task={task} onStarted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /refine/i }));

    const titleInput = screen.getByLabelText("Title");
    const promptInput = screen.getByLabelText("Prompt");

    expect(titleInput).toHaveValue("[PROJ-123] Fix authentication bug");
    expect((promptInput as HTMLTextAreaElement).value).toContain(
      "Jira Issue: PROJ-123",
    );
  });

  it("should call startTask without update for direct start", async () => {
    const user = userEvent.setup();
    const onStarted = vi.fn();
    const task = makePendingJiraTask();
    renderWithProviders(<TaskRefineForm task={task} onStarted={onStarted} />);

    await user.click(screen.getByRole("button", { name: /start task/i }));

    await waitFor(() => {
      expect(mockStartTask).toHaveBeenCalledWith("task-jira-1");
    });
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it("should call updateTask when Save is clicked", async () => {
    const user = userEvent.setup();
    const task = makePendingJiraTask();
    renderWithProviders(<TaskRefineForm task={task} onStarted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /refine/i }));

    const promptInput = screen.getByLabelText("Prompt");
    await user.clear(promptInput);
    await user.type(promptInput, "Refined prompt text");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(
        "task-jira-1",
        expect.objectContaining({
          prompt: "Refined prompt text",
        }),
      );
    });
  });

  it("should close editing form when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const task = makePendingJiraTask();
    renderWithProviders(<TaskRefineForm task={task} onStarted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /refine/i }));
    expect(screen.getByText("Refine Task Before Starting")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(
      screen.queryByText("Refine Task Before Starting"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("This Jira task is awaiting refinement"),
    ).toBeInTheDocument();
  });
});
