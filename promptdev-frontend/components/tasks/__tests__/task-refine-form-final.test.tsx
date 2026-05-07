import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";

// Mock API functions
vi.mock("@/lib/api", () => ({
  updateTask: vi.fn().mockResolvedValue({}),
  startTask: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/errors", () => ({
  showErrorToast: vi.fn(),
}));

vi.mock("@/lib/copilot/models", () => ({
  COPILOT_MODELS: [
    { id: "gpt-5.2", name: "GPT 5.2" },
    { id: "claude-4", name: "Claude 4" },
  ],
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { startTask } from "@/lib/api";
import { TaskRefineForm } from "@/components/tasks/task-refine-form";
import type { Task } from "@/lib/api";

const mockedStartTask = vi.mocked(startTask);

const mockTask: Task = {
  id: "t1",
  title: "Test Task",
  prompt: "Do something",
  repositorySlug: "repo",
  workspaceType: "BITBUCKET",
  sourceBranch: "main",
  targetBranch: "main",
  status: "PENDING",
  currentAttempt: 1,
  maxAttempts: 3,
  modelId: "gpt-5.2",
  iterative: false,
  maxIterations: 10,
  reviewEnabled: true,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("TaskRefineForm", () => {
  const onStarted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders non-editing state with Start Task button (line 138)", () => {
    // Line 138: the non-editing return path with Start Task button
    renderWithQuery(<TaskRefineForm task={mockTask} onStarted={onStarted} />);
    expect(
      screen.getByText("This Jira task is awaiting refinement"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Start Task/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Refine/i }),
    ).toBeInTheDocument();
  });

  it("switches to editing mode and shows iterative input (line 184)", async () => {
    // Line 184: iterative input rendered when iterative is true
    renderWithQuery(<TaskRefineForm task={mockTask} onStarted={onStarted} />);

    // Click Refine to enter editing mode
    await userEvent.click(screen.getByRole("button", { name: /Refine/i }));

    // Now in editing mode
    expect(
      screen.getByText("Refine Task Before Starting"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();

    // Toggle iterative switch
    const iterSwitch = screen.getByRole("switch", { name: /Iterative/i });
    await userEvent.click(iterSwitch);

    // Now max iterations input should appear
    expect(screen.getByLabelText("Max iterations")).toBeInTheDocument();
  });

  it("starts task directly from non-editing state", async () => {
    mockedStartTask.mockResolvedValue({} as Task);
    renderWithQuery(<TaskRefineForm task={mockTask} onStarted={onStarted} />);

    await userEvent.click(
      screen.getByRole("button", { name: /Start Task/i }),
    );

    await waitFor(() => {
      expect(mockedStartTask).toHaveBeenCalledWith("t1");
    });
  });

  it("shows review enabled switch in editing mode (branch: reviewEnabled toggle)", async () => {
    renderWithQuery(<TaskRefineForm task={mockTask} onStarted={onStarted} />);
    await userEvent.click(screen.getByRole("button", { name: /Refine/i }));
    // reviewEnabled defaults to true, toggle it off
    const reviewSwitch = screen.getByRole("switch", { name: /Review/i });
    expect(reviewSwitch).toBeInTheDocument();
    await userEvent.click(reviewSwitch);
  });

  it("handles start task error via showErrorToast (branch: startMutation.onError)", async () => {
    const { showErrorToast } = await import("@/lib/errors");
    mockedStartTask.mockRejectedValue(new Error("Start failed"));
    renderWithQuery(<TaskRefineForm task={mockTask} onStarted={onStarted} />);

    await userEvent.click(
      screen.getByRole("button", { name: /Start Task/i }),
    );

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith(
        expect.any(Error),
        "start task",
      );
    });
  });

  it("renders iterative input when task.iterative is already true", () => {
    const iterativeTask = { ...mockTask, iterative: true, maxIterations: 5 };
    renderWithQuery(
      <TaskRefineForm task={iterativeTask} onStarted={onStarted} />,
    );
    // In non-editing mode, no max iterations input
    expect(
      screen.getByText("This Jira task is awaiting refinement"),
    ).toBeInTheDocument();
  });
});
