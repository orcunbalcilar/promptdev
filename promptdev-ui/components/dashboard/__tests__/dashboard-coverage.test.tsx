/**
 * Coverage completion for dashboard components:
 * - dashboard-view.tsx line 159 (error state refetch button)
 * - kanban-board.tsx line 20 (STATUS_GROUP_STYLES fallback)
 * - task-card.tsx line 212 (PR link stopPropagation)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ──────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/useBackendUser", () => ({
  useBackendUser: () => ({ backendUserId: "u1", isLoading: false }),
}));

const mockGetTasks = vi.fn();

vi.mock("@/lib/api", () => ({
  getTasks: (...args: unknown[]) => mockGetTasks(...args),
  API_BASE_URL: "http://localhost:8080",
}));

vi.mock("@/lib/sse-client", () => ({
  createSseSubscription: () => () => {},
}));

vi.mock("@/lib/query-policies", () => ({
  realtimeQueryOptions: { staleTime: 0, gcTime: 0, refetchOnWindowFocus: false },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("use-debounce", () => ({
  useDebounce: (v: unknown) => [v],
}));

vi.mock("@/lib/task-statuses", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    STATUS_GROUPS: [
      ...(actual.STATUS_GROUPS as Array<{ label: string; statuses: string[] }>),
      { label: "UNKNOWN_GROUP", statuses: ["UNKNOWN"] },
    ],
  };
});

import { KanbanBoard } from "../kanban-board";
import { TaskCard } from "../task-card";
import { DashboardView } from "../dashboard-view";
import type { Task } from "@/lib/api";

const baseTask: Task = {
  id: "t1",
  title: "Test Task",
  prompt: "do something",
  status: "IN_PROGRESS",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  modelId: "gpt-4",
  workspaceType: "BITBUCKET",
  repositorySlug: "my-repo",
  sourceBranch: "feature/test",
  targetBranch: "main",
  currentAttempt: 1,
  maxAttempts: 3,
};

function renderWithQC(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("kanban-board.tsx branch coverage", () => {
  it("line 20: STATUS_GROUP_STYLES fallback to empty string for unknown group", () => {
    render(<KanbanBoard tasks={[]} />);
    expect(screen.getByText("UNKNOWN_GROUP")).toBeInTheDocument();
  });
});

describe("task-card.tsx branch coverage", () => {
  it("line 212: PR link click calls stopPropagation", () => {
    const onClick = vi.fn();
    render(
      <TaskCard
        task={{ ...baseTask, pullRequestUrl: "https://bb.example.com/pr/1" }}
        onClick={onClick}
      />,
    );
    const prLink = screen.getByTitle("Open Pull Request");
    fireEvent.click(prLink);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("dashboard-view.tsx branch coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("line 159: renders error state with retry button", async () => {
    mockGetTasks.mockRejectedValue(new Error("Server down"));
    renderWithQC(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load tasks")).toBeInTheDocument();
    });

    // Verify retry button is present
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
