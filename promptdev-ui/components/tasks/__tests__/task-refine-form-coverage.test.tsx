/**
 * Coverage: task-refine-form.tsx lines 138, 184
 * Line 138: Input rendered in editing state
 * Line 184: iterative max-iterations Input rendered when iterative=true
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/api", () => ({
  updateTask: vi.fn().mockResolvedValue({}),
  startTask: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/errors", () => ({ showErrorToast: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/copilot/models", () => ({
  COPILOT_MODELS: [{ id: "gpt-4", name: "GPT-4" }],
}));

import { TaskRefineForm } from "../task-refine-form";
import type { Task } from "@/lib/api";

const baseTask: Task = {
  id: "t1",
  title: "Test",
  prompt: "do it",
  status: "PENDING",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  modelId: "gpt-4",
  workspaceType: "BITBUCKET",
  repositorySlug: "repo",
  sourceBranch: "feat",
  targetBranch: "main",
  currentAttempt: 1,
  maxAttempts: 3,
  iterative: true,
  maxIterations: 5,
  reviewEnabled: true,
};

function renderWith(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("task-refine-form.tsx branch coverage", () => {
  it("line 138: renders title input in editing mode", () => {
    renderWith(<TaskRefineForm task={baseTask} onStarted={vi.fn()} />);
    // Click "Refine" to enter editing mode
    fireEvent.click(screen.getByRole("button", { name: /refine/i }));
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it("line 184: renders max iterations input when iterative is true", () => {
    renderWith(<TaskRefineForm task={baseTask} onStarted={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /refine/i }));
    // iterative is true by default from task, so max iterations input should show
    expect(screen.getByLabelText(/max iterations/i)).toBeInTheDocument();
  });

  it("renders non-editing state with Start button", () => {
    renderWith(<TaskRefineForm task={baseTask} onStarted={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /start task/i }),
    ).toBeInTheDocument();
  });
});
