/**
 * Coverage completion for scheduled-jobs components:
 * - job-card.tsx lines 45 (toggle onSuccess), 140 (history items), 203 (historyOpen)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockToggleScheduledJob = vi.fn().mockResolvedValue({});
const mockDeleteScheduledJob = vi.fn().mockResolvedValue({});
const mockRunScheduledJobNow = vi.fn().mockResolvedValue({});
const mockGetScheduledJobHistory = vi.fn().mockResolvedValue([]);

vi.mock("@/lib/api", () => ({
  toggleScheduledJob: (...a: unknown[]) => mockToggleScheduledJob(...a),
  deleteScheduledJob: (...a: unknown[]) => mockDeleteScheduledJob(...a),
  runScheduledJobNow: (...a: unknown[]) => mockRunScheduledJobNow(...a),
  getScheduledJobHistory: (...a: unknown[]) => mockGetScheduledJobHistory(...a),
}));

vi.mock("@/lib/errors", () => ({
  showErrorToast: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { JobCard } from "../job-card";
import { toast } from "sonner";

function renderWith(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const baseJob = {
  id: "j1",
  name: "Test Job",
  description: "A test job",
  promptTemplate: "Fix bugs",
  cronExpression: "0 9 * * 1",
  enabled: true,
  workspaceType: "BITBUCKET" as const,
  workspaceRef: "my-repo",
  sourceBranch: "main",
  targetBranch: "main",
  modelId: "gpt-4",
  maxIterations: 3,
  jobType: "MAINTENANCE" as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("job-card.tsx branch coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetScheduledJobHistory.mockResolvedValue([]);
  });

  it("line 45: toggle mutation onSuccess path", async () => {
    mockToggleScheduledJob.mockResolvedValue({});
    renderWith(<JobCard job={baseJob} />);

    // The toggle button text is "Disable" (since job.enabled=true)
    const toggleBtn = screen.getByRole("button", { name: /disable/i });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(mockToggleScheduledJob).toHaveBeenCalledWith("j1");
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("line 140: renders history items when available", async () => {
    mockGetScheduledJobHistory.mockResolvedValue([
      {
        id: "t1",
        title: "Task 1",
        status: "COMPLETED",
        createdAt: new Date().toISOString(),
      },
    ]);

    renderWith(<JobCard job={baseJob} />);

    // Click to expand history — it's a plain <button type="button"> with text "History"
    const historyBtn = screen.getByText("History");
    fireEvent.click(historyBtn);

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument();
    });
  });

  it("line 203: toggles history panel open/close", async () => {
    renderWith(<JobCard job={baseJob} />);

    const historyBtn = screen.getByText("History");

    // Open
    fireEvent.click(historyBtn);
    await waitFor(() => {
      expect(screen.getByText(/no executions yet/i)).toBeInTheDocument();
    });

    // Close
    fireEvent.click(historyBtn);
    await waitFor(() => {
      expect(screen.queryByText(/no executions yet/i)).not.toBeInTheDocument();
    });
  });
});
