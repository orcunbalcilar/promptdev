import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TaskRefineForm } from "../task-refine-form";
import type { Task } from "@/lib/api";

// ── Mocks ──────────────────────────────────────────────────────

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

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/errors", () => ({
  showErrorToast: vi.fn(),
}));

import { showErrorToast } from "@/lib/errors";

// ── Helpers ────────────────────────────────────────────────────

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function makePendingTask(overrides?: Partial<Task>): Task {
  return {
    id: "task-1",
    title: "Fix bug",
    prompt: "Fix the auth flow",
    repositorySlug: "repo",
    workspaceType: "BITBUCKET",
    sourceBranch: "feature",
    targetBranch: "main",
    status: "PENDING",
    currentAttempt: 0,
    maxAttempts: 3,
    modelId: "gpt-5.2",
    jiraIssueKey: "PROJ-1",
    iterative: false,
    maxIterations: 10,
    reviewEnabled: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateTask.mockResolvedValue({ id: "task-1", status: "PENDING" });
  mockStartTask.mockResolvedValue({ id: "task-1", status: "QUEUED" });
});

// ── Tests ──────────────────────────────────────────────────────

describe("TaskRefineForm – uncovered paths", () => {
  it("uses fallback modelId when task.modelId is undefined (line 35)", async () => {
    const user = userEvent.setup();
    const task = makePendingTask({ modelId: undefined });
    renderWithProviders(<TaskRefineForm task={task} onStarted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /refine/i }));
    // The model selector should default to "gpt-5.2"
    // getAllByText for Radix Select duplicates
    const modelTexts = screen.getAllByText("GPT-5.2");
    expect(modelTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("calls showErrorToast on save mutation error (line 57 onError)", async () => {
    const user = userEvent.setup();
    mockUpdateTask.mockRejectedValueOnce(new Error("Save failed"));
    const task = makePendingTask();
    renderWithProviders(<TaskRefineForm task={task} onStarted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /refine/i }));
    const promptInput = screen.getByLabelText("Prompt");
    await user.clear(promptInput);
    await user.type(promptInput, "new prompt");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith(
        expect.any(Error),
        "update task",
      );
    });
  });

  it("calls showErrorToast on start mutation error (line 69 onError)", async () => {
    const user = userEvent.setup();
    mockStartTask.mockRejectedValueOnce(new Error("Start failed"));
    const task = makePendingTask();
    const onStarted = vi.fn();
    renderWithProviders(<TaskRefineForm task={task} onStarted={onStarted} />);

    await user.click(screen.getByRole("button", { name: /start task/i }));

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith(
        expect.any(Error),
        "start task",
      );
    });
    expect(onStarted).not.toHaveBeenCalled();
  });

  it("calls Save & Start which saves first then starts (lines 75-78 handleSaveAndStart)", async () => {
    const user = userEvent.setup();
    const onStarted = vi.fn();
    const task = makePendingTask();
    renderWithProviders(<TaskRefineForm task={task} onStarted={onStarted} />);

    // Enter editing mode
    await user.click(screen.getByRole("button", { name: /refine/i }));

    // Change prompt to trigger save
    const promptInput = screen.getByLabelText("Prompt");
    await user.clear(promptInput);
    await user.type(promptInput, "refined prompt");

    // Click Save & Start
    await user.click(screen.getByRole("button", { name: /save & start/i }));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(
        "task-1",
        expect.objectContaining({ prompt: "refined prompt" }),
      );
    });
    await waitFor(() => {
      expect(mockStartTask).toHaveBeenCalledWith("task-1");
    });
    await waitFor(() => {
      expect(onStarted).toHaveBeenCalled();
    });
  });

  it("shows iterative max iterations input when iterative is toggled on (line 138, 184)", async () => {
    const user = userEvent.setup();
    // Task starts with iterative: false, so the input is hidden
    const task = makePendingTask({ iterative: false });
    renderWithProviders(<TaskRefineForm task={task} onStarted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /refine/i }));

    // Max iterations input should not be visible
    expect(screen.queryByLabelText("Max iterations")).not.toBeInTheDocument();

    // Toggle iterative switch on
    const iterSwitch = screen.getByRole("switch", { name: /iterative/i });
    await user.click(iterSwitch);

    // Now the max iterations input should appear
    const iterInput = await screen.findByLabelText("Max iterations");
    expect(iterInput).toBeInTheDocument();
    expect(iterInput).toHaveValue(10);
  });

  it("saves with changed iterative and review fields", async () => {
    const user = userEvent.setup();
    const task = makePendingTask({ iterative: false, reviewEnabled: true });
    renderWithProviders(<TaskRefineForm task={task} onStarted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /refine/i }));

    // Toggle iterative on
    await user.click(screen.getByRole("switch", { name: /iterative/i }));
    // Toggle review off
    await user.click(screen.getByRole("switch", { name: /auto review/i }));

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(
        "task-1",
        expect.objectContaining({
          iterative: true,
          reviewEnabled: false,
        }),
      );
    });
  });
});
